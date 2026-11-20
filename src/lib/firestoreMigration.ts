/**
 * Safe, Idempotent One-Time Migration: Legacy Browser `localStorage` -> Shared Cloud Firestore
 *
 * Behavior:
 * 1. Runs at most ONCE across the shared database (tracked via `system/localStorageMigration` in Firestore
 *    and an in-memory promise guard so concurrent mounts never double-run).
 * 2. Checks whether Firestore collections (`orders`, `products`, `staff`) are empty.
 *    ONLY if a Firestore collection is empty AND the current browser has legacy `localStorage` data,
 *    imports those records idempotently using `setDoc(..., { merge: true })` so re-runs never duplicate.
 * 3. Hashes any legacy plaintext staff passwords with SHA-256 (`passwordHash`) before writing to Firestore
 *    and NEVER writes plaintext `password` to Firestore.
 * 4. Advances `system/orderCounter` past the highest numeric `KB-######` order number migrated.
 * 5. Cleans up legacy shared-data `localStorage` keys so the app exclusively uses Cloud Firestore as its
 *    single source of truth while keeping per-visitor local state (cart, wishlist, UI prefs, passwordless staff session).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, cleanFirestoreData, ensureInitialStaffSeeded } from './firebase';
import { hashStaffPassword, isPasswordHash } from './passwordHash';
import type { Order, Product, StaffUser } from '../types';

export interface MigrationSummary {
  migrated: boolean;
  alreadyCompleted: boolean;
  counts: {
    orders: number;
    products: number;
    staff: number;
  };
}

const LEGACY_SHARED_STORAGE_KEYS = [
  'kenax_orders_cache',
  'preview_kenax_orders_cache',
  'prod_kenax_orders_cache',
  'kenax_products_cache',
  'preview_kenax_products_cache',
  'prod_kenax_products_cache',
  'kenax_staff_cache',
  'preview_kenax_staff_cache',
  'prod_kenax_staff_cache',
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
  'kenax_quota_exceeded',
  'preview_kenax_quota_exceeded',
];

let migrationSingletonPromise: Promise<MigrationSummary> | null = null;

function readLegacyArrayFromStorage<T>(keys: string[]): T[] {
  if (typeof window === 'undefined') return [];
  const collected: T[] = [];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
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

function cleanupLegacySharedStorageKeys(): void {
  if (typeof window === 'undefined') return;
  for (const key of LEGACY_SHARED_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
}

function extractOrderNumericSuffix(orderId: string): number {
  const match = /^KB-(\d+)$/i.exec((orderId || '').trim());
  if (!match) return 0;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : 0;
}

async function isCollectionEmpty(collectionName: string): Promise<boolean> {
  const snap = await getDocs(query(collection(db, collectionName), limit(1)));
  return snap.empty;
}

export function runOneTimeLocalStorageMigration(): Promise<MigrationSummary> {
  if (migrationSingletonPromise) {
    return migrationSingletonPromise;
  }

  migrationSingletonPromise = (async (): Promise<MigrationSummary> => {
    const emptySummary: MigrationSummary = {
      migrated: false,
      alreadyCompleted: false,
      counts: { orders: 0, products: 0, staff: 0 },
    };

    if (typeof window === 'undefined') {
      return emptySummary;
    }

    try {
      const migrationRef = doc(db, 'system', 'localStorageMigration');
      const migrationSnap = await getDoc(migrationRef);
      if (migrationSnap.exists() && migrationSnap.data()?.completed === true) {
        // Migration already finished globally; just ensure no stale shared caches linger locally
        cleanupLegacySharedStorageKeys();
        return {
          migrated: false,
          alreadyCompleted: true,
          counts: migrationSnap.data()?.counts || { orders: 0, products: 0, staff: 0 },
        };
      }

      // Collect any legacy localStorage records BEFORE cleaning keys
      const legacyOrdersRaw = readLegacyArrayFromStorage<Order>([
        'kenax_orders_cache',
        'preview_kenax_orders_cache',
        'prod_kenax_orders_cache',
      ]);
      const legacyProductsRaw = readLegacyArrayFromStorage<Product>([
        'kenax_products_cache',
        'preview_kenax_products_cache',
        'prod_kenax_products_cache',
      ]);
      const legacyStaffRaw = readLegacyArrayFromStorage<StaffUser>([
        'kenax_staff_cache',
        'preview_kenax_staff_cache',
        'prod_kenax_staff_cache',
      ]);

      const counts = { orders: 0, products: 0, staff: 0 };

      // 1. Orders: import ONLY if Firestore `orders` is empty and legacy orders exist
      if (legacyOrdersRaw.length > 0 && (await isCollectionEmpty('orders'))) {
        const orderMap = new Map<string, Order>();
        for (const o of legacyOrdersRaw) {
          if (o && o.id && typeof o.id === 'string' && !orderMap.has(o.id)) {
            orderMap.set(o.id, o);
          }
        }

        let maxKbNumber = 404400;
        for (const order of orderMap.values()) {
          const num = extractOrderNumericSuffix(order.id);
          if (num > maxKbNumber) maxKbNumber = num;

          const nowIso = order.createdAt || new Date().toISOString();
          const payload = cleanFirestoreData({
            ...order,
            createdAt: nowIso,
            updatedAt: order.updatedAt || nowIso,
            isV2Order: true,
          });
          await setDoc(
            doc(db, 'orders', order.id),
            {
              ...payload,
              createdAtServer: serverTimestamp(),
              updatedAtServer: serverTimestamp(),
            },
            { merge: true }
          );
          counts.orders += 1;
        }

        // Advance shared order counter past any migrated KB-###### number
        const counterRef = doc(db, 'system', 'orderCounter');
        const counterSnap = await getDoc(counterRef);
        const existingCounter = counterSnap.exists() ? Number(counterSnap.data()?.current || 404400) : 404400;
        if (maxKbNumber > existingCounter) {
          await setDoc(
            counterRef,
            { current: maxKbNumber, updatedAt: serverTimestamp() },
            { merge: true }
          );
        }
      }

      // 2. Products: import ONLY if Firestore `products` is empty and legacy products exist
      if (legacyProductsRaw.length > 0 && (await isCollectionEmpty('products'))) {
        const productMap = new Map<string, Product>();
        for (const p of legacyProductsRaw) {
          if (p && p.id && typeof p.id === 'string' && !productMap.has(p.id)) {
            productMap.set(p.id, p);
          }
        }

        for (const product of productMap.values()) {
          const cleaned = cleanFirestoreData({
            ...product,
            createdAt: product.createdAt || new Date().toISOString(),
            updatedAt: product.updatedAt || new Date().toISOString(),
          });
          await setDoc(
            doc(db, 'products', product.id),
            {
              ...cleaned,
              updatedAtServer: serverTimestamp(),
            },
            { merge: true }
          );
          counts.products += 1;
        }
      }

      // 3. Staff: import ONLY if Firestore `staff` is empty and legacy staff exist (ALWAYS SHA-256 hashed!)
      if (legacyStaffRaw.length > 0 && (await isCollectionEmpty('staff'))) {
        const staffMap = new Map<string, StaffUser>();
        for (const s of legacyStaffRaw) {
          if (s && s.id && s.email && !staffMap.has(s.id)) {
            staffMap.set(s.id, s);
          }
        }

        for (const s of staffMap.values()) {
          const { password: rawPlainPassword, passwordHash: existingHash, ...safeFields } = s;
          let finalHash = existingHash && isPasswordHash(existingHash) ? existingHash : '';
          if (!finalHash) {
            const plainToHash =
              rawPlainPassword && rawPlainPassword.trim()
                ? rawPlainPassword.trim()
                : s.role === 'super_admin'
                ? 'sadik@1234'
                : '123456';
            finalHash = await hashStaffPassword(plainToHash);
          }

          const cleaned = cleanFirestoreData({
            ...safeFields,
            email: s.email.trim().toLowerCase(),
            passwordHash: finalHash,
            isActive: s.isActive !== false,
            createdAt: s.createdAt || new Date().toISOString(),
          });
          await setDoc(
            doc(db, 'staff', s.id),
            {
              ...cleaned,
              updatedAtServer: serverTimestamp(),
            },
            { merge: true }
          );
          counts.staff += 1;
        }
      }

      // Ensure baseline hashed Super Admin / staff exist if staff collection is still empty
      await ensureInitialStaffSeeded().catch(() => {});

      // Mark migration complete globally so it never runs again
      await setDoc(
        migrationRef,
        {
          completed: true,
          migratedAt: serverTimestamp(),
          counts,
        },
        { merge: true }
      );

      // Remove legacy shared caches from localStorage so Firestore is strictly authoritative
      cleanupLegacySharedStorageKeys();

      const didMigrate = counts.orders > 0 || counts.products > 0 || counts.staff > 0;
      if (didMigrate) {
        console.log('[KenaX BD] One-time localStorage -> Cloud Firestore migration completed:', counts);
      }

      return {
        migrated: didMigrate,
        alreadyCompleted: false,
        counts,
      };
    } catch (err) {
      console.warn('[KenaX BD] One-time migration skipped/deferred due to error:', err);
      return emptySummary;
    }
  })();

  return migrationSingletonPromise;
}
