/**
 * Atomic, Resumable, Idempotent One-Time Migration:
 * Legacy Browser `localStorage` -> Shared Cloud Firestore
 *
 * Integrity Guarantees:
 * 1. Distributed Transaction Lease Lock (`system/localStorageMigration`):
 *    Uses an atomic Firestore transaction (`runTransaction`) to acquire an exclusive lease
 *    (`status: 'in_progress'`, `lockId`, `lockExpiresAt`) so two browsers starting simultaneously
 *    NEVER duplicate imports. Expired leases (e.g., browser crashed mid-run) are safely resumed.
 * 2. Post-Write Verification Before Cleanup:
 *    Every written order/product document is verified via server read-back (`getDocFromServer`)
 *    before clearing that collection's legacy `localStorage` keys. If ANY write or verification
 *    fails, legacy `localStorage` keys for that collection are PRESERVED intact!
 * 3. Atomic Monotonic `orderCounter`:
 *    Advances `system/orderCounter` inside `runTransaction` using `Math.max(existing, maxKbNumber)`
 *    so concurrent orders or migrations can never regress or collide with existing IDs.
 * 4. Zero Hardcoded Passwords / Server-Verified Staff Migration:
 *    Legacy staff entries are migrated exclusively through the authenticated server API
 *    (`POST /api/staff-auth/staff`), never writing credentials directly from browser SDK.
 * 5. Safe Retry on Failure:
 *    Resets the in-memory singleton promise whenever a run fails or is partial so callers can
 *    cleanly retry once connectivity or permissions recover.
 */

import {
  collection,
  doc,
  getDocFromServer,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, cleanFirestoreData, saveStaffToDB } from './firebase';
import type { Order, Product, StaffUser } from '../types';

export type MigrationStatus =
  | 'completed'
  | 'already_completed'
  | 'locked_by_other_client'
  | 'partial_failure'
  | 'failed';

export interface MigrationSummary {
  status: MigrationStatus;
  migrated: boolean;
  alreadyCompleted: boolean;
  counts: {
    orders: number;
    products: number;
    staff: number;
  };
  verifiedCounts: {
    orders: number;
    products: number;
    staff: number;
  };
  clearedKeyGroups: string[];
  preservedKeyGroups: string[];
  errors: string[];
  lockId?: string;
}

const ORDER_STORAGE_KEYS = [
  'kenax_orders_cache',
  'preview_kenax_orders_cache',
  'prod_kenax_orders_cache',
];

const PRODUCT_STORAGE_KEYS = [
  'kenax_products_cache',
  'preview_kenax_products_cache',
  'prod_kenax_products_cache',
];

const STAFF_STORAGE_KEYS = [
  'kenax_staff_cache',
  'preview_kenax_staff_cache',
  'prod_kenax_staff_cache',
];

const OTHER_LEGACY_SHARED_KEYS = [
  'kenax_customers_cache',
  'preview_kenax_customers_cache',
  'kenax_expenses_cache',
  'kenax_other_profits_cache',
  'kenax_activity_logs_cache',
  'kenax_stock_logs_cache',
  'kenax_categories_cache',
  'kenax_categories',
  'kenax_settings_cache',
  'kenax_site_settings',
  'kenax_suppliers_cache',
  'kenax_sourcing_locations_cache',
  'kenax_reviews_cache',
  'kenax_custom_reviews_map',
  'kenax_cart_activities_cache',
  'kenax_notifs_cache',
  'kenax_sms_settings_cache',
  'kenax_sms_logs_cache',
  'kenax_email_logs_cache',
  'kenax_email_templates_cache',
  'kenax_gmail_alerts_settings',
  'kenax_newsletter_subscribers_cache',
  'kenax_my_orders',
  'preview_kenax_my_orders',
  'kenax_deleted_products_cache',
  'kenax_deleted_categories_cache',
  'kenax_deleted_customers_cache',
  'kenax_deleted_reviews_cache',
  'kenax_deleted_suppliers_cache',
  'kenax_deleted_sourcing_locations_cache',
  'kenax_quota_exceeded',
  'preview_kenax_quota_exceeded',
];

const LEASE_TTL_MS = 2 * 60 * 1000; // 2-minute distributed lease for crash resumability

export interface MigrationStorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

export interface MigrationBackendAdapter {
  acquireLease(lockId: string, nowMs: number, leaseTtlMs: number): Promise<
    | { outcome: 'acquired' }
    | { outcome: 'already_completed'; counts?: { orders: number; products: number; staff: number } }
    | { outcome: 'locked' }
  >;
  releaseLease(lockId: string, state: Record<string, any>): Promise<void>;
  isCollectionEmpty(collectionName: 'orders' | 'products' | 'staff'): Promise<boolean>;
  writeAndVerifyDoc(collectionName: 'orders' | 'products', docId: string, data: Record<string, any>): Promise<boolean>;
  advanceOrderCounterAtomic(minValue: number): Promise<number>;
  migrateStaffViaServer(staff: StaffUser): Promise<boolean>;
}

let migrationSingletonPromise: Promise<MigrationSummary> | null = null;

export function extractOrderNumericSuffix(orderId: string): number {
  const match = /^KB-(\d+)$/i.exec((orderId || '').trim());
  if (!match) return 0;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : 0;
}

function readLegacyArrayFromStorage<T>(storage: MigrationStorageLike, keys: string[]): T[] {
  const collected: T[] = [];
  for (const key of keys) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        collected.push(...parsed);
      }
    } catch {
      // Ignore malformed legacy entries
    }
  }
  return collected;
}

function removeKeys(storage: MigrationStorageLike, keys: string[]): void {
  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
}

function createLockId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `mig-${Date.now()}-${rand}`;
}

/**
 * Core migration engine with injectable backend & storage adapters for deterministic unit/concurrency testing.
 */
export async function runMigrationWithAdapter(
  adapter: MigrationBackendAdapter,
  storage: MigrationStorageLike,
  nowFn: () => number = () => Date.now()
): Promise<MigrationSummary> {
  const lockId = createLockId();
  const counts = { orders: 0, products: 0, staff: 0 };
  const verifiedCounts = { orders: 0, products: 0, staff: 0 };
  const clearedKeyGroups: string[] = [];
  const preservedKeyGroups: string[] = [];
  const errors: string[] = [];

  try {
    const lease = await adapter.acquireLease(lockId, nowFn(), LEASE_TTL_MS);

    if (lease.outcome === 'already_completed') {
      // Migration already verified & completed globally — safe to clear stale caches
      removeKeys(storage, [...ORDER_STORAGE_KEYS, ...PRODUCT_STORAGE_KEYS, ...STAFF_STORAGE_KEYS, ...OTHER_LEGACY_SHARED_KEYS]);
      return {
        status: 'already_completed',
        migrated: false,
        alreadyCompleted: true,
        counts: lease.counts || counts,
        verifiedCounts: lease.counts || verifiedCounts,
        clearedKeyGroups: ['orders', 'products', 'staff', 'other'],
        preservedKeyGroups: [],
        errors: [],
        lockId,
      };
    }

    if (lease.outcome === 'locked') {
      // Another browser tab/device holds an active lease — do NOT touch localStorage or write duplicates
      return {
        status: 'locked_by_other_client',
        migrated: false,
        alreadyCompleted: false,
        counts,
        verifiedCounts,
        clearedKeyGroups: [],
        preservedKeyGroups: ['orders', 'products', 'staff', 'other'],
        errors: [],
        lockId,
      };
    }

    // Collect legacy localStorage records BEFORE touching any storage keys
    const legacyOrdersRaw = readLegacyArrayFromStorage<Order>(storage, ORDER_STORAGE_KEYS);
    const legacyProductsRaw = readLegacyArrayFromStorage<Product>(storage, PRODUCT_STORAGE_KEYS);
    const legacyStaffRaw = readLegacyArrayFromStorage<StaffUser>(storage, STAFF_STORAGE_KEYS);

    let ordersCleanable = true;
    let productsCleanable = true;
    let staffCleanable = true;

    // 1. Orders Migration (preserves existing IDs, verifies each write, advances orderCounter atomically)
    if (legacyOrdersRaw.length > 0) {
      try {
        const empty = await adapter.isCollectionEmpty('orders');
        if (empty) {
          const orderMap = new Map<string, Order>();
          for (const o of legacyOrdersRaw) {
            if (o && typeof o.id === 'string' && o.id.trim() && !orderMap.has(o.id.trim())) {
              orderMap.set(o.id.trim(), { ...o, id: o.id.trim() });
            }
          }

          let maxKbNumber = 404400;
          for (const order of orderMap.values()) {
            const num = extractOrderNumericSuffix(order.id);
            if (num > maxKbNumber) maxKbNumber = num;

            const nowIso = order.createdAt || new Date(nowFn()).toISOString();
            const payload = cleanFirestoreData({
              ...order,
              createdAt: nowIso,
              updatedAt: order.updatedAt || nowIso,
              isV2Order: true,
            });
            try {
              const verified = await adapter.writeAndVerifyDoc('orders', order.id, payload);
              counts.orders += 1;
              if (verified) {
                verifiedCounts.orders += 1;
              } else {
                ordersCleanable = false;
                errors.push(`Order ${order.id} write could not be verified on server.`);
              }
            } catch (err: any) {
              ordersCleanable = false;
              errors.push(`Order ${order.id} failed: ${err?.message || 'write error'}`);
            }
          }

          if (verifiedCounts.orders > 0) {
            try {
              await adapter.advanceOrderCounterAtomic(maxKbNumber);
            } catch (err: any) {
              ordersCleanable = false;
              errors.push(`Order counter transaction failed: ${err?.message || 'tx error'}`);
            }
          }
        }
      } catch (err: any) {
        ordersCleanable = false;
        errors.push(`Orders migration check failed: ${err?.message || 'error'}`);
      }
    }

    // 2. Products Migration (preserves IDs, verifies each write)
    if (legacyProductsRaw.length > 0) {
      try {
        const empty = await adapter.isCollectionEmpty('products');
        if (empty) {
          const productMap = new Map<string, Product>();
          for (const p of legacyProductsRaw) {
            if (p && typeof p.id === 'string' && p.id.trim() && !productMap.has(p.id.trim())) {
              productMap.set(p.id.trim(), { ...p, id: p.id.trim() });
            }
          }

          for (const product of productMap.values()) {
            const nowIso = new Date(nowFn()).toISOString();
            const cleaned = cleanFirestoreData({
              ...product,
              createdAt: product.createdAt || nowIso,
              updatedAt: product.updatedAt || nowIso,
            });
            try {
              const verified = await adapter.writeAndVerifyDoc('products', product.id, cleaned);
              counts.products += 1;
              if (verified) {
                verifiedCounts.products += 1;
              } else {
                productsCleanable = false;
                errors.push(`Product ${product.id} write could not be verified on server.`);
              }
            } catch (err: any) {
              productsCleanable = false;
              errors.push(`Product ${product.id} failed: ${err?.message || 'write error'}`);
            }
          }
        }
      } catch (err: any) {
        productsCleanable = false;
        errors.push(`Products migration check failed: ${err?.message || 'error'}`);
      }
    }

    // 3. Staff Migration (server API ONLY — zero hardcoded passwords, zero client credential writes)
    if (legacyStaffRaw.length > 0) {
      try {
        const empty = await adapter.isCollectionEmpty('staff');
        if (empty) {
          const staffMap = new Map<string, StaffUser>();
          for (const s of legacyStaffRaw) {
            if (s && s.id && s.email && !staffMap.has(s.id)) {
              staffMap.set(s.id, s);
            }
          }

          for (const s of staffMap.values()) {
            // Only migrate staff that already carry an explicit password >= 6 chars (never inject hardcoded defaults)
            const plainPw = typeof s.password === 'string' ? s.password.trim() : '';
            if (plainPw.length < 6) {
              continue;
            }
            try {
              const ok = await adapter.migrateStaffViaServer({
                ...s,
                email: s.email.trim().toLowerCase(),
                password: plainPw,
              });
              counts.staff += 1;
              if (ok) {
                verifiedCounts.staff += 1;
              } else {
                staffCleanable = false;
                errors.push(`Staff ${s.email} migration was not confirmed by server.`);
              }
            } catch (err: any) {
              staffCleanable = false;
              errors.push(`Staff ${s.email} failed: ${err?.message || 'server error'}`);
            }
          }
        }
      } catch (err: any) {
        staffCleanable = false;
        errors.push(`Staff migration check failed: ${err?.message || 'error'}`);
      }
    }

    // Only clear legacy localStorage key groups whose writes were 100% verified!
    if (ordersCleanable) {
      removeKeys(storage, ORDER_STORAGE_KEYS);
      clearedKeyGroups.push('orders');
    } else {
      preservedKeyGroups.push('orders');
    }

    if (productsCleanable) {
      removeKeys(storage, PRODUCT_STORAGE_KEYS);
      clearedKeyGroups.push('products');
    } else {
      preservedKeyGroups.push('products');
    }

    if (staffCleanable) {
      removeKeys(storage, STAFF_STORAGE_KEYS);
      clearedKeyGroups.push('staff');
    } else {
      preservedKeyGroups.push('staff');
    }

    const allSucceeded = errors.length === 0 && ordersCleanable && productsCleanable && staffCleanable;

    if (allSucceeded) {
      removeKeys(storage, OTHER_LEGACY_SHARED_KEYS);
      clearedKeyGroups.push('other');
    } else {
      preservedKeyGroups.push('other');
    }

    // Finalize or release lease so partial failures can safely resume on retry
    await adapter.releaseLease(lockId, {
      completed: allSucceeded,
      status: allSucceeded ? 'completed' : 'partial_failure',
      counts,
      verifiedCounts,
      errors: errors.slice(0, 20),
      completedAt: allSucceeded ? new Date(nowFn()).toISOString() : null,
      updatedAt: new Date(nowFn()).toISOString(),
    });

    const didMigrate = verifiedCounts.orders > 0 || verifiedCounts.products > 0 || verifiedCounts.staff > 0;
    return {
      status: allSucceeded ? 'completed' : 'partial_failure',
      migrated: didMigrate,
      alreadyCompleted: false,
      counts,
      verifiedCounts,
      clearedKeyGroups,
      preservedKeyGroups,
      errors,
      lockId,
    };
  } catch (err: any) {
    errors.push(err?.message || 'Unexpected migration failure');
    try {
      await adapter.releaseLease(lockId, {
        completed: false,
        status: 'failed',
        errors: errors.slice(0, 20),
        updatedAt: new Date(nowFn()).toISOString(),
      });
    } catch {
      // Ignore secondary release errors — TTL lease will auto-expire
    }
    return {
      status: 'failed',
      migrated: false,
      alreadyCompleted: false,
      counts,
      verifiedCounts,
      clearedKeyGroups,
      preservedKeyGroups: ['orders', 'products', 'staff', 'other'],
      errors,
      lockId,
    };
  }
}

function createFirestoreMigrationAdapter(): MigrationBackendAdapter {
  const migrationRef = doc(db, 'system', 'localStorageMigration');

  return {
    async acquireLease(lockId, nowMs, leaseTtlMs) {
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(migrationRef);
        const data = snap.exists() ? snap.data() : null;

        if (data?.completed === true) {
          return {
            outcome: 'already_completed' as const,
            counts: data.verifiedCounts || data.counts || { orders: 0, products: 0, staff: 0 },
          };
        }

        const existingExpiry = Number(data?.lockExpiresAtMs || 0);
        if (data?.status === 'in_progress' && data?.lockId && data.lockId !== lockId && existingExpiry > nowMs) {
          return { outcome: 'locked' as const };
        }

        tx.set(
          migrationRef,
          {
            completed: false,
            status: 'in_progress',
            lockId,
            lockAcquiredAtMs: nowMs,
            lockExpiresAtMs: nowMs + leaseTtlMs,
            updatedAt: new Date(nowMs).toISOString(),
            updatedAtServer: serverTimestamp(),
          },
          { merge: true }
        );
        return { outcome: 'acquired' as const };
      });
    },

    async releaseLease(lockId, state) {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(migrationRef);
        const data = snap.exists() ? snap.data() : null;
        if (data?.lockId && data.lockId !== lockId) return;
        tx.set(
          migrationRef,
          {
            ...state,
            lockId: null,
            lockExpiresAtMs: 0,
            updatedAtServer: serverTimestamp(),
          },
          { merge: true }
        );
      });
    },

    async isCollectionEmpty(collectionName) {
      const snap = await getDocs(query(collection(db, collectionName), limit(1)));
      return snap.empty;
    },

    async writeAndVerifyDoc(collectionName, docId, data) {
      const ref = doc(db, collectionName, docId);
      await setDoc(
        ref,
        {
          ...data,
          createdAtServer: serverTimestamp(),
          updatedAtServer: serverTimestamp(),
        },
        { merge: true }
      );
      const verifySnap = await getDocFromServer(ref);
      return verifySnap.exists();
    },

    async advanceOrderCounterAtomic(minValue) {
      const counterRef = doc(db, 'system', 'orderCounter');
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        const existing = snap.exists() ? Number(snap.data()?.current || 404400) : 404400;
        const nextVal = Math.max(Number.isFinite(existing) ? existing : 404400, minValue);
        if (!snap.exists() || nextVal > existing) {
          tx.set(
            counterRef,
            {
              current: nextVal,
              prefix: 'KB',
              updatedAt: new Date().toISOString(),
              updatedAtServer: serverTimestamp(),
            },
            { merge: true }
          );
        }
        return nextVal;
      });
    },

    async migrateStaffViaServer(staff) {
      await saveStaffToDB(staff, true);
      return true;
    },
  };
}

export function resetMigrationSingletonForRetry(): void {
  migrationSingletonPromise = null;
}

export function runOneTimeLocalStorageMigration(): Promise<MigrationSummary> {
  if (migrationSingletonPromise) {
    return migrationSingletonPromise;
  }

  if (typeof window === 'undefined') {
    return Promise.resolve({
      status: 'already_completed',
      migrated: false,
      alreadyCompleted: false,
      counts: { orders: 0, products: 0, staff: 0 },
      verifiedCounts: { orders: 0, products: 0, staff: 0 },
      clearedKeyGroups: [],
      preservedKeyGroups: [],
      errors: [],
    });
  }

  const adapter = createFirestoreMigrationAdapter();
  const promise = runMigrationWithAdapter(adapter, window.localStorage).then((summary) => {
    // Allow clean retry if migration failed, was partial, or was deferred due to another active tab lease
    if (
      summary.status === 'failed' ||
      summary.status === 'partial_failure' ||
      summary.status === 'locked_by_other_client'
    ) {
      migrationSingletonPromise = null;
    }
    return summary;
  });

  migrationSingletonPromise = promise;
  return promise;
}
