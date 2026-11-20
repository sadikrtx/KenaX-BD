/**
 * Account- & Role-Scoped In-Memory Cache for Admin Panel Data
 *
 * Phase 2 + Phase 3 Capabilities:
 * - Prevents repeated Firestore fetches when switching between Admin tabs.
 * - Caches paginated pages separately via deterministic page keys.
 * - Deduplicates concurrent in-flight requests for the same cache key.
 * - Invalidates all affected pages + count entries on create/update/delete or real-time mutations.
 * - Notifies registered cursor stores on invalidation/clearAll so DocumentSnapshot cursors never go stale.
 * - Enforces TTL expiration so stale financial/inventory data never persists indefinitely.
 * - Strictly isolates entries by `${staffId}:${role}` scope so switching accounts,
 *   changing roles, or logging out immediately purges prior account/role data.
 */

export interface AdminCacheEntry<T> {
  data: T;
  fetchedAt: number;
  ttlMs: number;
}

type InvalidationListener = (scopeKey: string | null, collection: string | null) => void;

const DEFAULT_TTL_MS = 90_000; // 90 seconds
const DEFAULT_PAGE_TTL_MS = 60_000; // 60 seconds for paginated pages

class AdminDataCache {
  private scopes = new Map<string, Map<string, AdminCacheEntry<unknown>>>();
  private inFlight = new Map<string, Promise<unknown>>();
  private activeScope: string | null = null;
  private invalidationListeners = new Set<InvalidationListener>();

  /**
   * Subscribe to collection invalidations or full cache clears (used by pagination cursor registry).
   */
  public onInvalidate(listener: InvalidationListener): () => void {
    this.invalidationListeners.add(listener);
    return () => {
      this.invalidationListeners.delete(listener);
    };
  }

  private emitInvalidate(scopeKey: string | null, collection: string | null): void {
    this.invalidationListeners.forEach((listener) => {
      try {
        listener(scopeKey, collection);
      } catch {
        // Never allow a listener error to break cache invalidation
      }
    });
  }

  /**
   * Build a deterministic cache scope for the currently authenticated staff member + role.
   */
  public makeScope(staffId?: string | null, role?: string | null): string {
    return `${staffId || 'anonymous'}:${role || 'guest'}`;
  }

  /**
   * Build a deterministic cache key for a paginated collection page.
   */
  public makePageKey(
    collection: string,
    page: number,
    pageSize: number,
    filterSig: string = 'default'
  ): string {
    return `${collection}:page:${page}:size:${pageSize}:${filterSig}`;
  }

  /**
   * Enforce strict single-account isolation: if the active staff account or role changes,
   * discard all cached entries belonging to any previous account/role.
   */
  public enforceScope(scopeKey: string): void {
    if (this.activeScope && this.activeScope !== scopeKey) {
      const prevScope = this.activeScope;
      this.scopes.delete(prevScope);
      for (const inflightKey of Array.from(this.inFlight.keys())) {
        if (!inflightKey.startsWith(`${scopeKey}::`)) {
          this.inFlight.delete(inflightKey);
        }
      }
      this.emitInvalidate(prevScope, null);
    }
    this.activeScope = scopeKey;
  }

  public get<T>(scopeKey: string, key: string): { data: T; isFresh: boolean; fetchedAt: number } | null {
    this.enforceScope(scopeKey);
    const bucket = this.scopes.get(scopeKey);
    if (!bucket) return null;
    const entry = bucket.get(key) as AdminCacheEntry<T> | undefined;
    if (!entry) return null;
    const isFresh = Date.now() - entry.fetchedAt < entry.ttlMs;
    return {
      data: entry.data,
      isFresh,
      fetchedAt: entry.fetchedAt,
    };
  }

  public set<T>(scopeKey: string, key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    this.enforceScope(scopeKey);
    let bucket = this.scopes.get(scopeKey);
    if (!bucket) {
      bucket = new Map();
      this.scopes.set(scopeKey, bucket);
    }
    bucket.set(key, {
      data,
      fetchedAt: Date.now(),
      ttlMs,
    });
  }

  /**
   * Read a cached paginated page for a collection within the active account/role scope.
   */
  public getPage<T>(
    scopeKey: string,
    collection: string,
    page: number,
    pageSize: number,
    filterSig: string = 'default'
  ): { data: T; isFresh: boolean; fetchedAt: number } | null {
    const key = this.makePageKey(collection, page, pageSize, filterSig);
    return this.get<T>(scopeKey, key);
  }

  /**
   * Store a paginated page for a collection within the active account/role scope.
   */
  public setPage<T>(
    scopeKey: string,
    collection: string,
    page: number,
    pageSize: number,
    data: T,
    ttlMs: number = DEFAULT_PAGE_TTL_MS,
    filterSig: string = 'default'
  ): void {
    const key = this.makePageKey(collection, page, pageSize, filterSig);
    this.set(scopeKey, key, data, ttlMs);
  }

  /**
   * Fetch or return a cached paginated page with in-flight request deduplication.
   */
  public async getOrFetchPage<T>(
    scopeKey: string,
    collection: string,
    page: number,
    pageSize: number,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_PAGE_TTL_MS,
    filterSig: string = 'default'
  ): Promise<T> {
    const key = this.makePageKey(collection, page, pageSize, filterSig);
    return this.getOrFetch(scopeKey, key, fetcher, ttlMs);
  }

  public invalidate(scopeKey: string, keys: string | string[]): void {
    const bucket = this.scopes.get(scopeKey);
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const k of keyList) {
      if (bucket) bucket.delete(k);
      this.inFlight.delete(`${scopeKey}::${k}`);
    }
  }

  /**
   * Invalidate a collection's base cache entry, its total count cache, all paginated pages,
   * and all search results for that collection, and reset any stored pagination cursors.
   */
  public invalidateCollection(scopeKey: string, collection: string): void {
    const bucket = this.scopes.get(scopeKey);
    const prefix = `${collection}:`;
    if (bucket) {
      bucket.delete(collection);
      for (const k of Array.from(bucket.keys())) {
        if (k.startsWith(prefix)) {
          bucket.delete(k);
        }
      }
    }
    const inflightBase = `${scopeKey}::${collection}`;
    const inflightPrefix = `${scopeKey}::${prefix}`;
    for (const k of Array.from(this.inFlight.keys())) {
      if (k === inflightBase || k.startsWith(inflightPrefix)) {
        this.inFlight.delete(k);
      }
    }
    this.emitInvalidate(scopeKey, collection);
  }

  /**
   * Returns fresh cached data immediately if available; otherwise runs `fetcher` once
   * (deduplicating concurrent calls) and caches the result.
   */
  public async getOrFetch<T>(
    scopeKey: string,
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL_MS
  ): Promise<T> {
    this.enforceScope(scopeKey);
    const existing = this.get<T>(scopeKey, key);
    if (existing && existing.isFresh) {
      return existing.data;
    }

    const compositeKey = `${scopeKey}::${key}`;
    const pending = this.inFlight.get(compositeKey) as Promise<T> | undefined;
    if (pending) {
      return pending;
    }

    const request = Promise.resolve()
      .then(() => fetcher())
      .then((result) => {
        // Only write to cache if scope did not change while request was in flight
        if (this.activeScope === scopeKey) {
          this.set(scopeKey, key, result, ttlMs);
        }
        return result;
      })
      .finally(() => {
        this.inFlight.delete(compositeKey);
      });

    this.inFlight.set(compositeKey, request);
    return request;
  }

  public clearAll(): void {
    this.scopes.clear();
    this.inFlight.clear();
    this.activeScope = null;
    this.emitInvalidate(null, null);
  }
}

export const adminDataCache = new AdminDataCache();
