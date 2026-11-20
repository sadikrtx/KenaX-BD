/**
 * Reusable Firestore Cursor Pagination & Targeted Single-Field Search Engine
 *
 * Phase 3 Design Principles:
 * 1. Uses Firestore native `orderBy()`, `limit(pageSize + 1)`, and `startAfter(DocumentSnapshot)`
 *    cursors — zero full-collection downloads for paginated admin tables.
 * 2. Uses ONLY single-field Firestore queries (`orderBy(field)` or `where(field, '==', val)`)
 *    backed by Firestore automatic single-field indexes so queries NEVER fail with
 *    `FAILED_PRECONDITION` missing-composite-index errors.
 * 3. Integrates with `adminDataCache` to cache individual pages per `${staffId}:${role}` scope
 *    and automatically clears cursors + cached pages on any create/update/delete or account switch.
 * 4. Uses `getCountFromServer()` for accurate total document counts (1 index read per 1,000 docs)
 *    so paginated views never silently misrepresent a single page as the full dataset total.
 * 5. Handles empty collections, deleted cursor documents, quota-exceeded mode, and legacy docs
 *    missing the sort field gracefully without throwing.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { db, isQuotaExceededFlag, isQuotaExceededError, markQuotaExceeded, normalizeOrderRecord } from './firebase';
import { adminDataCache } from './adminCache';
import { getEnvCollectionName } from '../utils/envHelper';
import type { ActivityLog, StockLog, CustomerRecord, Order, Product } from '../types';

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalCount: number | null;
  fromCache: boolean;
  source: 'firestore' | 'fallback';
}

interface CursorStackKeyParams {
  scopeKey: string;
  collectionKey: string;
  pageSize: number;
  filterSig: string;
}

function makeCursorStackKey({ scopeKey, collectionKey, pageSize, filterSig }: CursorStackKeyParams): string {
  return `${scopeKey}::${collectionKey}::${pageSize}::${filterSig}`;
}

/**
 * In-memory registry of last DocumentSnapshot per page number, scoped by account/role + collection.
 * Automatically cleared whenever `adminDataCache.invalidateCollection()` or `clearAll()` is called.
 */
const cursorStacks = new Map<string, Map<number, DocumentSnapshot>>();

adminDataCache.onInvalidate((scopeKey, collectionKey) => {
  if (!scopeKey && !collectionKey) {
    cursorStacks.clear();
    return;
  }
  for (const key of Array.from(cursorStacks.keys())) {
    const matchesScope = !scopeKey || key.startsWith(`${scopeKey}::`);
    const matchesCol = !collectionKey || key.includes(`::${collectionKey}::`);
    if (matchesScope && matchesCol) {
      cursorStacks.delete(key);
    }
  }
});

export function resetPaginationCursors(scopeKey: string, collectionKey: string): void {
  for (const key of Array.from(cursorStacks.keys())) {
    if (key.startsWith(`${scopeKey}::${collectionKey}::`)) {
      cursorStacks.delete(key);
    }
  }
}

/**
 * Get the true server-side total document count using Firestore aggregation (`getCountFromServer`),
 * cached per account/role scope for 60 seconds.
 */
export async function getCollectionTotalCount(
  firestoreCollection: string,
  cacheCollectionKey: string,
  scopeKey: string,
  ttlMs: number = 60_000
): Promise<number | null> {
  if (isQuotaExceededFlag) return null;

  const countCacheKey = `${cacheCollectionKey}:count`;
  const existing = adminDataCache.get<number | null>(scopeKey, countCacheKey);
  if (existing && existing.isFresh) {
    return existing.data;
  }

  try {
    const snap = await getCountFromServer(collection(db, firestoreCollection));
    const count = snap.data().count;
    adminDataCache.set(scopeKey, countCacheKey, count, ttlMs);
    return count;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded(err);
    }
    return null;
  }
}

export interface GenericCursorPageOptions<T> {
  scopeKey: string;
  firestoreCollection: string;
  cacheCollectionKey: string;
  page: number;
  pageSize: number;
  orderField: string;
  orderDirection?: 'asc' | 'desc';
  filterSig?: string;
  ttlMs?: number;
  forceRefresh?: boolean;
  /** Optional item transform / filter (return null to omit tombstoned or legacy-fake docs). */
  mapDoc?: (docSnap: DocumentSnapshot) => T | null;
  /** Optional fallback items if Firestore is offline or quota-exceeded. */
  fallbackItems?: T[];
}

/**
 * Core cursor-based Firestore page fetcher.
 * - Fetches `pageSize + 1` documents to determine `hasNextPage` accurately without an extra query.
 * - Supports safe Next and Previous navigation via cached per-page `DocumentSnapshot` cursors.
 * - Re-uses cached page data if fresh unless `forceRefresh` is true.
 * - Safely handles deleted cursor documents or missing cursors by resetting cleanly to page 1.
 */
export async function fetchFirestoreCursorPage<T>(
  options: GenericCursorPageOptions<T>
): Promise<PaginatedResult<T>> {
  const {
    scopeKey,
    firestoreCollection,
    cacheCollectionKey,
    page: requestedPage,
    pageSize,
    orderField,
    orderDirection = 'desc',
    filterSig = 'default',
    ttlMs = 60_000,
    forceRefresh = false,
    mapDoc,
    fallbackItems,
  } = options;

  const safePageSize = Math.max(1, Math.min(200, pageSize));
  const safePage = Math.max(1, requestedPage);

  if (forceRefresh) {
    adminDataCache.invalidateCollection(scopeKey, cacheCollectionKey);
  }

  // 1. Return cached page immediately if fresh
  if (!forceRefresh) {
    const cached = adminDataCache.getPage<PaginatedResult<T>>(
      scopeKey,
      cacheCollectionKey,
      safePage,
      safePageSize,
      filterSig
    );
    if (cached && cached.isFresh) {
      return { ...cached.data, fromCache: true };
    }
  }

  // Helper to serve sliced fallback data when offline or quota-exceeded
  const buildFallbackResult = (): PaginatedResult<T> => {
    const list = fallbackItems || [];
    const total = list.length;
    const maxPage = Math.max(1, Math.ceil(total / safePageSize));
    const effectivePage = Math.min(safePage, maxPage);
    const startIdx = (effectivePage - 1) * safePageSize;
    const slice = list.slice(startIdx, startIdx + safePageSize);
    return {
      items: slice,
      page: effectivePage,
      pageSize: safePageSize,
      hasNextPage: startIdx + safePageSize < total,
      hasPrevPage: effectivePage > 1,
      totalCount: total,
      fromCache: false,
      source: 'fallback',
    };
  };

  if (isQuotaExceededFlag) {
    return buildFallbackResult();
  }

  const stackKey = makeCursorStackKey({
    scopeKey,
    collectionKey: cacheCollectionKey,
    pageSize: safePageSize,
    filterSig,
  });
  let pageCursors = cursorStacks.get(stackKey);
  if (!pageCursors) {
    pageCursors = new Map<number, DocumentSnapshot>();
    cursorStacks.set(stackKey, pageCursors);
  }

  // Resolve effective page & starting cursor.
  // If user requested page > 1 without an existing cursor for page - 1 (e.g. after cache invalidation
  // or deleted cursor), fall back safely to page 1 rather than throwing or returning empty results.
  let effectivePage = safePage;
  let startCursor: DocumentSnapshot | undefined;
  if (effectivePage > 1) {
    startCursor = pageCursors.get(effectivePage - 1);
    if (!startCursor) {
      effectivePage = 1;
    }
  }

  try {
    const colRef = collection(db, firestoreCollection);
    const constraints: QueryConstraint[] = [orderBy(orderField, orderDirection)];
    if (startCursor) {
      constraints.push(startAfter(startCursor));
    }
    constraints.push(limit(safePageSize + 1));

    const [snapshot, totalCount] = await Promise.all([
      getDocs(query(colRef, ...constraints)),
      getCollectionTotalCount(firestoreCollection, cacheCollectionKey, scopeKey, ttlMs),
    ]);

    let docs = snapshot.docs;

    // Edge case: if cursor was invalidated/deleted mid-pagination causing empty page > 1 while docs exist,
    // reset cleanly to page 1.
    if (docs.length === 0 && effectivePage > 1 && (totalCount === null || totalCount > 0)) {
      pageCursors.clear();
      effectivePage = 1;
      const retrySnap = await getDocs(
        query(colRef, orderBy(orderField, orderDirection), limit(safePageSize + 1))
      );
      docs = retrySnap.docs;
    }

    // Edge case: legacy collection where docs exist (`totalCount > 0`) but lack `orderField`.
    // Fall back to bounded unordered query on page 1 so existing data is never hidden.
    if (docs.length === 0 && effectivePage === 1 && totalCount !== null && totalCount > 0) {
      const legacySnap = await getDocs(query(colRef, limit(safePageSize + 1)));
      docs = legacySnap.docs;
    }

    const hasNextPage = docs.length > safePageSize;
    const pageDocs = hasNextPage ? docs.slice(0, safePageSize) : docs;

    if (pageDocs.length > 0) {
      pageCursors.set(effectivePage, pageDocs[pageDocs.length - 1]);
    }

    const items: T[] = [];
    for (const d of pageDocs) {
      const mapped = mapDoc ? mapDoc(d) : (d.data() as T);
      if (mapped !== null && mapped !== undefined) {
        items.push(mapped);
      }
    }

    const result: PaginatedResult<T> = {
      items,
      page: effectivePage,
      pageSize: safePageSize,
      hasNextPage,
      hasPrevPage: effectivePage > 1,
      totalCount,
      fromCache: false,
      source: 'firestore',
    };

    adminDataCache.setPage(scopeKey, cacheCollectionKey, effectivePage, safePageSize, result, ttlMs, filterSig);
    return result;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded(err);
    } else {
      console.warn(`[KenaX BD] Cursor pagination fallback for ${firestoreCollection}:`, err);
    }
    return buildFallbackResult();
  }
}

// ---------------------------------------------------------------------------
// 1. ACTIVITY LOGS PAGINATION
// ---------------------------------------------------------------------------
const LEGACY_FAKE_LOG_IDS = new Set(['log-1', 'log-2', 'log-3']);

function isLegacyFakeLog(log: any): boolean {
  if (!log) return true;
  if (LEGACY_FAKE_LOG_IDS.has(log.id)) return true;
  if (log.staffName === 'Rafiqul Islam' && log.targetId === 'KB-2025-1002') return true;
  if (log.staffName === 'Tanjila Akter' && log.targetId === 'prod-2') return true;
  if (log.staffName === 'Sabbir Ahmed' && log.targetId === 'KB-2025-1004') return true;
  return false;
}

export async function fetchActivityLogsPage(
  scopeKey: string,
  page: number,
  pageSize: number = 25,
  options?: { forceRefresh?: boolean; fallbackItems?: ActivityLog[] }
): Promise<PaginatedResult<ActivityLog>> {
  return fetchFirestoreCursorPage<ActivityLog>({
    scopeKey,
    firestoreCollection: 'activityLogs',
    cacheCollectionKey: 'activityLogs',
    page,
    pageSize,
    orderField: 'timestamp',
    orderDirection: 'desc',
    ttlMs: 45_000,
    forceRefresh: options?.forceRefresh,
    fallbackItems: options?.fallbackItems,
    mapDoc: (d) => {
      const data = d.data() as ActivityLog;
      if (!data || isLegacyFakeLog(data)) return null;
      return data;
    },
  });
}

// ---------------------------------------------------------------------------
// 2. STOCK LOGS PAGINATION (inventoryLogs)
// ---------------------------------------------------------------------------
export async function fetchStockLogsPage(
  scopeKey: string,
  page: number,
  pageSize: number = 25,
  options?: { forceRefresh?: boolean; fallbackItems?: StockLog[] }
): Promise<PaginatedResult<StockLog>> {
  return fetchFirestoreCursorPage<StockLog>({
    scopeKey,
    firestoreCollection: 'inventoryLogs',
    cacheCollectionKey: 'stockLogs',
    page,
    pageSize,
    orderField: 'timestamp',
    orderDirection: 'desc',
    ttlMs: 45_000,
    forceRefresh: options?.forceRefresh,
    fallbackItems: options?.fallbackItems,
    mapDoc: (d) => {
      const data = d.data() as StockLog;
      return data && data.id ? data : null;
    },
  });
}

// ---------------------------------------------------------------------------
// 3. CUSTOMERS PAGINATION & TARGETED SINGLE-FIELD SEARCH
// ---------------------------------------------------------------------------
export async function fetchCustomersPage(
  scopeKey: string,
  page: number,
  pageSize: number = 25,
  options?: { forceRefresh?: boolean; fallbackItems?: CustomerRecord[] }
): Promise<PaginatedResult<CustomerRecord>> {
  const colName = getEnvCollectionName('customers');
  return fetchFirestoreCursorPage<CustomerRecord>({
    scopeKey,
    firestoreCollection: colName,
    cacheCollectionKey: 'customers',
    page,
    pageSize,
    orderField: 'createdAt',
    orderDirection: 'desc',
    ttlMs: 60_000,
    forceRefresh: options?.forceRefresh,
    fallbackItems: options?.fallbackItems,
    mapDoc: (d) => {
      const data = d.data() as CustomerRecord;
      if (!data || !data.id) return null;
      return data;
    },
  });
}

/**
 * Targeted single-field Firestore customer search (mobile / email / ID) — avoids downloading entire collection.
 * Uses only automatic single-field indexes (`where('mobile', '==', ...)` / `where('email', '==', ...)`).
 */
export async function searchCustomersInFirestore(
  scopeKey: string,
  rawQuery: string
): Promise<CustomerRecord[]> {
  const trimmed = rawQuery.trim();
  if (!trimmed || isQuotaExceededFlag) return [];

  const searchKey = `customers:search:${trimmed.toLowerCase()}`;
  const cached = adminDataCache.get<CustomerRecord[]>(scopeKey, searchKey);
  if (cached && cached.isFresh) return cached.data;

  const colName = getEnvCollectionName('customers');
  const colRef = collection(db, colName);
  const foundMap = new Map<string, CustomerRecord>();

  const queries: Promise<void>[] = [];

  // Exact document ID match
  queries.push(
    getDoc(doc(db, colName, trimmed))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as CustomerRecord;
          if (data?.id) foundMap.set(data.id, data);
        }
      })
      .catch(() => {})
  );

  // Email exact match (single-field index)
  if (trimmed.includes('@')) {
    queries.push(
      getDocs(query(colRef, where('email', '==', trimmed.toLowerCase()), limit(20)))
        .then((snap) => {
          snap.forEach((d) => {
            const data = d.data() as CustomerRecord;
            if (data?.id) foundMap.set(data.id, data);
          });
        })
        .catch(() => {})
    );
  }

  // BD Mobile exact match variants (01..., +8801..., 8801...)
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 10) {
    const local11 = digits.startsWith('880') && digits.length >= 13
      ? '0' + digits.slice(3, 13)
      : digits.length === 10
      ? '0' + digits
      : digits.slice(-11);
    const mobileVariants = Array.from(new Set([trimmed, local11, `88${local11}`, `+88${local11}`]));
    for (const variant of mobileVariants) {
      queries.push(
        getDocs(query(colRef, where('mobile', '==', variant), limit(20)))
          .then((snap) => {
            snap.forEach((d) => {
              const data = d.data() as CustomerRecord;
              if (data?.id) foundMap.set(data.id, data);
            });
          })
          .catch(() => {})
      );
    }
  }

  await Promise.allSettled(queries);
  const results = Array.from(foundMap.values());
  adminDataCache.set(scopeKey, searchKey, results, 30_000);
  return results;
}

// ---------------------------------------------------------------------------
// 4. ORDERS PAGINATION & TARGETED SINGLE-FIELD SEARCH
// ---------------------------------------------------------------------------
export async function fetchOrdersPage(
  scopeKey: string,
  page: number,
  pageSize: number = 25,
  options?: { forceRefresh?: boolean; fallbackItems?: Order[] }
): Promise<PaginatedResult<Order>> {
  const colName = getEnvCollectionName('orders');
  return fetchFirestoreCursorPage<Order>({
    scopeKey,
    firestoreCollection: colName,
    cacheCollectionKey: 'orders',
    page,
    pageSize,
    orderField: 'createdAt',
    orderDirection: 'desc',
    ttlMs: 30_000,
    forceRefresh: options?.forceRefresh,
    fallbackItems: options?.fallbackItems,
    mapDoc: (d) => {
      const data = d.data();
      return data ? normalizeOrderRecord(data, d.id) : null;
    },
  });
}

/**
 * Targeted single-field Firestore order search (Order ID, Tracking Number, Customer Mobile, Delivery Mobile).
 * Zero composite indexes required; zero full-collection scans.
 */
export async function searchOrdersInFirestore(
  scopeKey: string,
  rawQuery: string
): Promise<Order[]> {
  const trimmed = rawQuery.trim();
  if (!trimmed || isQuotaExceededFlag) return [];

  const searchKey = `orders:search:${trimmed.toLowerCase()}`;
  const cached = adminDataCache.get<Order[]>(scopeKey, searchKey);
  if (cached && cached.isFresh) return cached.data;

  const colName = getEnvCollectionName('orders');
  const colRef = collection(db, colName);
  const foundMap = new Map<string, Order>();

  const upper = trimmed.toUpperCase();
  const idCandidates = Array.from(new Set([trimmed, upper, upper.startsWith('KB-') ? upper : `KB-${upper}`]));

  const tasks: Promise<void>[] = [];

  for (const idCandidate of idCandidates) {
    tasks.push(
      getDoc(doc(db, colName, idCandidate))
        .then((snap) => {
          if (snap.exists()) {
            const normalized = normalizeOrderRecord(snap.data(), snap.id);
            if (normalized.id) foundMap.set(normalized.id, normalized);
          }
        })
        .catch(() => {})
    );
  }

  // Tracking number exact match (single-field auto-index)
  tasks.push(
    getDocs(query(colRef, where('trackingNumber', '==', trimmed), limit(15)))
      .then((snap) => {
        snap.forEach((d) => {
          const normalized = normalizeOrderRecord(d.data(), d.id);
          if (normalized.id) foundMap.set(normalized.id, normalized);
        });
      })
      .catch(() => {})
  );

  // Mobile number exact match variants (single-field auto-index)
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 10) {
    const local11 = digits.startsWith('880') && digits.length >= 13
      ? '0' + digits.slice(3, 13)
      : digits.length === 10
      ? '0' + digits
      : digits.slice(-11);
    const mobileVariants = Array.from(new Set([trimmed, local11, `+88${local11}`]));
    for (const variant of mobileVariants) {
      tasks.push(
        getDocs(query(colRef, where('customerMobile', '==', variant), limit(25)))
          .then((snap) => {
            snap.forEach((d) => {
              const normalized = normalizeOrderRecord(d.data(), d.id);
              if (normalized.id) foundMap.set(normalized.id, normalized);
            });
          })
          .catch(() => {})
      );
      tasks.push(
        getDocs(query(colRef, where('deliveryMobile', '==', variant), limit(25)))
          .then((snap) => {
            snap.forEach((d) => {
              const normalized = normalizeOrderRecord(d.data(), d.id);
              if (normalized.id) foundMap.set(normalized.id, normalized);
            });
          })
          .catch(() => {})
      );
    }
  }

  await Promise.allSettled(tasks);
  const results = Array.from(foundMap.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
  adminDataCache.set(scopeKey, searchKey, results, 30_000);
  return results;
}

// ---------------------------------------------------------------------------
// 5. PRODUCTS PAGINATION & TARGETED SINGLE-FIELD SEARCH
// ---------------------------------------------------------------------------
export async function fetchProductsPage(
  scopeKey: string,
  page: number,
  pageSize: number = 30,
  options?: { forceRefresh?: boolean; fallbackItems?: Product[] }
): Promise<PaginatedResult<Product>> {
  const colName = getEnvCollectionName('products');
  return fetchFirestoreCursorPage<Product>({
    scopeKey,
    firestoreCollection: colName,
    cacheCollectionKey: 'products',
    page,
    pageSize,
    orderField: 'createdAt',
    orderDirection: 'desc',
    ttlMs: 60_000,
    forceRefresh: options?.forceRefresh,
    fallbackItems: options?.fallbackItems,
    mapDoc: (d) => {
      const data = d.data() as Product;
      if (!data || !data.id) return null;
      return data;
    },
  });
}

/**
 * Targeted single-field Firestore product lookup by exact SKU, ID, or Category.
 */
export async function searchProductsInFirestore(
  scopeKey: string,
  rawQuery: string
): Promise<Product[]> {
  const trimmed = rawQuery.trim();
  if (!trimmed || isQuotaExceededFlag) return [];

  const searchKey = `products:search:${trimmed.toLowerCase()}`;
  const cached = adminDataCache.get<Product[]>(scopeKey, searchKey);
  if (cached && cached.isFresh) return cached.data;

  const colName = getEnvCollectionName('products');
  const colRef = collection(db, colName);
  const foundMap = new Map<string, Product>();

  const tasks: Promise<void>[] = [
    getDoc(doc(db, colName, trimmed))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as Product;
          if (data?.id) foundMap.set(data.id, data);
        }
      })
      .catch(() => {}),
    getDocs(query(colRef, where('sku', '==', trimmed), limit(20)))
      .then((snap) => {
        snap.forEach((d) => {
          const data = d.data() as Product;
          if (data?.id) foundMap.set(data.id, data);
        });
      })
      .catch(() => {}),
    getDocs(query(colRef, where('sku', '==', trimmed.toUpperCase()), limit(20)))
      .then((snap) => {
        snap.forEach((d) => {
          const data = d.data() as Product;
          if (data?.id) foundMap.set(data.id, data);
        });
      })
      .catch(() => {}),
  ];

  await Promise.allSettled(tasks);
  const results = Array.from(foundMap.values());
  adminDataCache.set(scopeKey, searchKey, results, 30_000);
  return results;
}
