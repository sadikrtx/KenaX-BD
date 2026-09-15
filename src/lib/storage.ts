/**
 * Utility for safe browser storage operations with automatic quota management.
 */

export function sanitizeForCache<T>(data: T, maxItems = 40): T {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.slice(0, maxItems).map((item) => sanitizeForCache(item, maxItems)) as unknown as T;
  }
  if (typeof data === 'object') {
    const copy: any = {};
    for (const k of Object.keys(data as any)) {
      const val = (data as any)[k];
      if (typeof val === 'string' && val.startsWith('data:') && val.length > 500) {
        // Strip heavy base64 strings from localStorage caches
        copy[k] = '';
      } else if (typeof val === 'object' && val !== null) {
        copy[k] = sanitizeForCache(val, maxItems);
      } else {
        copy[k] = val;
      }
    }
    return copy as T;
  }
  return data;
}

export function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    const isQuota =
      err &&
      (err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014 ||
        (err as any).number === -2147024882);

    console.warn(`[Storage] localStorage.setItem failed for key "${key}" (QuotaExceeded: ${Boolean(isQuota)}). Recovering...`);

    try {
      // 1. Clear volatile non-critical caches to instantly free up space
      localStorage.removeItem('kenax_cart_activities_cache');
      localStorage.removeItem('kenax_activity_logs_cache');
      localStorage.removeItem('kenax_stock_logs_cache');
      localStorage.removeItem('kenax_notifs_cache');

      // Try re-saving
      localStorage.setItem(key, value);
      return;
    } catch (e2) {
      // 2. If it still fails, sanitize the value by stripping large base64 strings and truncating long arrays
      try {
        const parsed = JSON.parse(value);
        const sanitized = sanitizeForCache(parsed, 30);
        localStorage.setItem(key, JSON.stringify(sanitized));
        console.log(`[Storage] Saved sanitized version for "${key}" successfully.`);
        return;
      } catch (e3) {
        // 3. If still failing, also clear older caches
        try {
          localStorage.removeItem('kenax_orders_cache');
          localStorage.removeItem('kenax_customers_cache');
          const parsed = JSON.parse(value);
          const sanitized = sanitizeForCache(parsed, 15);
          localStorage.setItem(key, JSON.stringify(sanitized));
        } catch {
          console.warn(`[Storage] Could not persist "${key}" in localStorage. State remains active in memory.`);
        }
      }
    }
  }
}

/**
 * Dedicated safe writer for real-time Cart Activities cache.
 * Strips bulky base64 images and caps items to prevent quota overflow.
 */
export function safeSetCartActivitiesCache(activities: any[]): void {
  if (!Array.isArray(activities)) return;
  try {
    const cleanList = activities.slice(0, 30).map((act) => {
      if (!act || typeof act !== 'object') return act;
      return {
        ...act,
        items: Array.isArray(act.items)
          ? act.items.map((it: any) => ({
              ...it,
              // Strip heavy base64 strings, retain clean remote image URLs
              image: typeof it.image === 'string' && it.image.startsWith('data:') ? '' : it.image,
            }))
          : [],
      };
    });
    safeSetLocalStorage('kenax_cart_activities_cache', JSON.stringify(cleanList));
  } catch (err) {
    console.warn('[Storage] safeSetCartActivitiesCache error ignored:', err);
  }
}

// ----------------------------------------------------
// INDEXEDDB MULTI-GIGABYTE MEDIA & IMAGE STORE
// ----------------------------------------------------
const IDB_NAME = 'kenax_db_store';
const IDB_VERSION = 1;
const IDB_STORE_NAME = 'media_keyval';

let idbPromise: Promise<IDBDatabase | null> | null = null;

function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!idbPromise) {
    idbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db = e.target?.result as IDBDatabase;
          if (db && !db.objectStoreNames.contains(IDB_STORE_NAME)) {
            db.createObjectStore(IDB_STORE_NAME);
          }
        };
        req.onsuccess = (e: any) => {
          resolve(e.target?.result as IDBDatabase);
        };
        req.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }
  return idbPromise;
}

export async function getIdbItem(key: string): Promise<string | null> {
  try {
    const db = await getIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readonly');
        const store = tx.objectStore(IDB_STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as string) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function setIdbItem(key: string, value: string): Promise<void> {
  try {
    const db = await getIDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(IDB_STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {}
}

export async function removeIdbItem(key: string): Promise<void> {
  try {
    const db = await getIDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
        const store = tx.objectStore(IDB_STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {}
}


