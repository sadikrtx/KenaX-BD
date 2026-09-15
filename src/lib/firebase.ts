import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  disableNetwork,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { safeSetLocalStorage, safeSetCartActivitiesCache, getIdbItem, setIdbItem } from './storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { Product, Order, Category, WebsiteSettings, DeliveryZone, Coupon, OrderItem, HeroBannerItem, Review } from '../types';
import { INITIAL_PRODUCTS, DEMO_PRODUCT_IDS } from '../data/initialProducts';
import {
  INITIAL_CATEGORIES,
  INITIAL_WEBSITE_SETTINGS,
  INITIAL_DELIVERY_ZONES,
  INITIAL_COUPONS,
  INITIAL_ORDERS,
  INITIAL_STAFF,
  INITIAL_CUSTOMERS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_STOCK_LOGS,
  INITIAL_OTHER_PROFITS,
  INITIAL_REVIEWS,
} from '../data/initialSettings';
import {
  StaffUser,
  ActivityLog,
  StockLog,
  AdminNotification,
  CustomerRecord,
  EmailLog,
  EmailTemplate,
  GmailAlertSettings,
  ExpenseRecord,
  OtherProfitRecord,
  isDemoOtherProfit,
  SMSSettings,
  SMSLog,
} from '../types';
import { NEUTRAL_PRODUCT_PLACEHOLDER } from '../utils/imageOptimizer';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Set Firestore log level to silent early to prevent benign grpc/stream timeout noise
try {
  setLogLevel('silent');
} catch {}

// Filter benign internal Firestore idle stream recycling logs from polluting console
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    try {
      const msg = args
        .map((a) => {
          if (a === null || a === undefined) return '';
          if (typeof a === 'string') return a;
          if (a instanceof Error) return a.message + ' ' + (a.stack || '');
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(' ');
      if (
        msg.includes('Disconnecting idle stream') ||
        msg.includes('Timed out waiting for new targets') ||
        msg.includes("RPC 'Listen' stream") ||
        msg.includes('GrpcConnection RPC') ||
        (msg.includes('@firebase/firestore') && msg.includes('CANCELLED'))
      ) {
        return;
      }
    } catch {}
    originalConsoleError.apply(console, args);
  };
}

// Initialize Firestore with specific Database ID & robust long polling settings
const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
function createFirestoreInstance() {
  try {
    const firestoreSettings = {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false,
    };
    if (dbId) {
      return initializeFirestore(app, firestoreSettings, dbId);
    }
    return initializeFirestore(app, firestoreSettings);
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}
export const db = createFirestoreInstance();

export const auth = getAuth(app);

// Quota Exceeded Guard & Fallback Circuit Breaker
export let isQuotaExceededFlag = false;
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem('kenax_quota_exceeded') === 'true') {
      isQuotaExceededFlag = true;
      disableNetwork(db).catch(() => {});
    }
  } catch {}
}

export function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || err.name || '');
  const msg = String(err.message || err.toString?.() || '');
  return (
    code === 'resource-exhausted' ||
    code === '429' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('daily write units')
  );
}

export function markQuotaExceeded(err?: any) {
  if (!isQuotaExceededFlag) {
    isQuotaExceededFlag = true;
    try {
      localStorage.setItem('kenax_quota_exceeded', 'true');
      localStorage.setItem('kenax_seeded_flag', 'true');
    } catch {}
    disableNetwork(db).catch(() => {});
    console.warn(
      '[KenaX BD] Firestore free daily write quota reached (resource-exhausted). Automatically operating in high-speed LocalStorage fallback mode.'
    );
  } else {
    disableNetwork(db).catch(() => {});
  }
}

// Test connection on boot according to skill guidelines
export async function testConnection() {
  if (isQuotaExceededFlag) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[KenaX BD] Connected to Cloud Firestore successfully.');
  } catch (error: any) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded(error);
      return;
    }
    if (
      error?.code === 'unavailable' ||
      (error instanceof Error &&
        (error.message.includes('offline') || error.message.includes('Could not reach')))
    ) {
      console.warn('[KenaX BD] Firestore offline/connection check: operating seamlessly with local cache fallback.');
    } else {
      console.log('[KenaX BD] Firestore initialized.');
    }
  }
}
testConnection();

// Helper to normalize phone numbers for robust matching (e.g. +88017XXXXXXXX -> 017XXXXXXXX)
export function normalizePhoneNumber(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length === 13) {
    return digits.slice(2); // '017XXXXXXXX'
  }
  return digits;
}

// Helper to merge and deduplicate orders safely
export function mergeOrdersLists(existing: Order[], incoming: Order[]): Order[] {
  const map = new Map<string, Order>();

  const isValidOrder = (o: Order) => {
    if (!o || !o.id) return false;
    if (o.isV2Order === true) return true;
    return false;
  };

  // 1. Put existing
  (existing || []).forEach((o) => {
    if (o && isValidOrder(o)) map.set(o.id, o);
  });
  // 2. Put incoming (overwrites with fresher version if present)
  (incoming || []).forEach((o) => {
    if (o && isValidOrder(o)) {
      const prev = map.get(o.id);
      if (!prev) {
        map.set(o.id, o);
      } else {
        // Compare updated timestamps if available
        const prevTime = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
        const nextTime = new Date(o.updatedAt || o.createdAt || 0).getTime();
        if (nextTime >= prevTime) {
          map.set(o.id, { ...prev, ...o });
        }
      }
    }
  });
  const result = Array.from(map.values());
  result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return result;
}

// Helper to merge and deduplicate cart items safely
export function mergeCartItems(local: OrderItem[] = [], remote: OrderItem[] = []): OrderItem[] {
  const map = new Map<string, OrderItem>();
  const getKey = (i: OrderItem) => `${i.productId}_${i.selectedSize || ''}_${i.selectedColor || ''}`;
  (remote || []).forEach((item) => {
    if (item && item.productId) map.set(getKey(item), { ...item });
  });
  (local || []).forEach((item) => {
    if (item && item.productId) {
      const key = getKey(item);
      if (map.has(key)) {
        const existing = map.get(key)!;
        map.set(key, { ...existing, quantity: Math.max(existing.quantity, item.quantity) });
      } else {
        map.set(key, { ...item });
      }
    }
  });
  return Array.from(map.values());
}

// Helper to merge and deduplicate wishlist items safely
export function mergeWishlist(local: Product[] = [], remote: Product[] = []): Product[] {
  const map = new Map<string, Product>();
  (remote || []).forEach((p) => {
    if (p && p.id) map.set(p.id, { ...p });
  });
  (local || []).forEach((p) => {
    if (p && p.id) map.set(p.id, { ...p });
  });
  return Array.from(map.values());
}

// Helper to merge and deduplicate customers lists safely without losing registered accounts
export function mergeCustomersLists(base: CustomerRecord[] = INITIAL_CUSTOMERS, incoming: CustomerRecord[] = []): CustomerRecord[] {
  const map = new Map<string, CustomerRecord>();

  const isLegacyCustomer = (cust: CustomerRecord) => {
    if (!cust) return true;
    if (cust.id && cust.id.startsWith('staff-cust-')) return true;
    if (cust.email && (cust.email.trim().toLowerCase() === 'moderator@kenaxbd.com' || cust.email.trim().toLowerCase() === 'admin@kenaxbd.com')) return true;
    if (!cust.isV2Account && (!cust.mobile && !cust.email)) return true;
    return false;
  };

  // 1. Process base list
  (base || []).forEach((c) => {
    if (c && !isLegacyCustomer(c)) {
      const primaryKey = c.id || `cust-${Date.now()}`;
      map.set(primaryKey, c);
      if (c.email) map.set(`email_${c.email.trim().toLowerCase()}`, c);
      if (c.mobile) map.set(`mobile_${normalizePhoneNumber(c.mobile)}`, c);
    }
  });

  // 2. Process incoming list (merges or appends)
  (incoming || []).forEach((c) => {
    if (c && !isLegacyCustomer(c)) {
      const keyById = c.id ? c.id : null;
      const keyByEmail = c.email ? `email_${c.email.trim().toLowerCase()}` : null;
      const keyByMobile = c.mobile ? `mobile_${normalizePhoneNumber(c.mobile)}` : null;

      const existing = (keyById && map.get(keyById)) || (keyByEmail && map.get(keyByEmail)) || (keyByMobile && map.get(keyByMobile));

      if (existing) {
        const merged: CustomerRecord = {
          ...existing,
          ...c,
          name: c.name || existing.name,
          email: c.email || existing.email,
          mobile: c.mobile || existing.mobile,
          password: c.password || existing.password,
          totalOrders: Math.max(existing.totalOrders || 0, c.totalOrders || 0),
          totalSpent: Math.max(existing.totalSpent || 0, c.totalSpent || 0),
          orderIds: Array.from(new Set([...(existing.orderIds || []), ...(c.orderIds || [])])),
          addresses: (c.addresses && c.addresses.length > 0) ? c.addresses : existing.addresses,
          savedAddresses: (c.savedAddresses && c.savedAddresses.length > 0) ? c.savedAddresses : existing.savedAddresses,
          cart: (c.cart && c.cart.length > 0) ? c.cart : existing.cart,
          wishlist: (c.wishlist && c.wishlist.length > 0) ? c.wishlist : existing.wishlist,
          isBlocked: c.isBlocked !== undefined ? c.isBlocked : existing.isBlocked,
          registeredAt: existing.registeredAt || c.registeredAt || new Date().toISOString(),
          isV2Account: true,
        };

        map.set(merged.id, merged);
        if (merged.email) map.set(`email_${merged.email.trim().toLowerCase()}`, merged);
        if (merged.mobile) map.set(`mobile_${normalizePhoneNumber(merged.mobile)}`, merged);
      } else {
        const newCust = { ...c, isV2Account: true };
        if (!newCust.id) newCust.id = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        map.set(newCust.id, newCust);
        if (newCust.email) map.set(`email_${newCust.email.trim().toLowerCase()}`, newCust);
        if (newCust.mobile) map.set(`mobile_${normalizePhoneNumber(newCust.mobile)}`, newCust);
      }
    }
  });

  // 3. Extract unique customer records by ID
  const uniqueMap = new Map<string, CustomerRecord>();
  for (const cust of map.values()) {
    if (cust && cust.id && !isLegacyCustomer(cust)) {
      uniqueMap.set(cust.id, cust);
    }
  }

  const result = Array.from(uniqueMap.values());
  result.sort((a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime());
  return result;
}

// Helper to merge and deduplicate categories safely so all store categories always show
export function mergeCategoriesLists(baseList: Category[] = INITIAL_CATEGORIES, incomingList: Category[] = []): Category[] {
  const map = new Map<string, Category>();
  let deletedIds = new Set<string>();
  try {
    const rawDeleted = localStorage.getItem('kenax_deleted_category_ids');
    if (rawDeleted) {
      deletedIds = new Set(JSON.parse(rawDeleted));
    }
  } catch {}

  // 1. Add base categories (INITIAL_CATEGORIES) if not explicitly deleted
  (baseList || INITIAL_CATEGORIES || []).forEach((c) => {
    if (c && c.id && !deletedIds.has(c.id)) {
      map.set(c.id, { ...c });
    }
  });

  // 2. Add or update incoming categories (from Firestore or local cache)
  (incomingList || []).forEach((c) => {
    if (c && c.id && !deletedIds.has(c.id)) {
      const existing = map.get(c.id);
      if (!existing) {
        map.set(c.id, { ...c });
      } else {
        // Merge subcategories intelligently: preserve nested subSubcategories from template if incoming has empty tags
        const incomingSubs = c.subcategories || [];
        const mergedSubs = incomingSubs.map((subItem: any, sIdx: number) => {
          const subName = typeof subItem === 'string' ? subItem : subItem.name;
          const baseSub = (existing.subcategories || []).find((b: any) =>
            (typeof b === 'string' ? b : b.name) === subName
          );
          const baseSubSubs = baseSub && typeof baseSub !== 'string' ? (baseSub.subSubcategories || []) : [];

          if (typeof subItem === 'string') {
            return {
              id: `sub-${c.id}-${sIdx}`,
              name: subItem,
              icon: 'Layers',
              subSubcategories: baseSubSubs,
            };
          }
          return {
            ...subItem,
            subSubcategories:
              subItem.subSubcategories && subItem.subSubcategories.length > 0
                ? subItem.subSubcategories
                : baseSubSubs,
          };
        });

        map.set(c.id, {
          ...existing,
          ...c,
          subcategories: mergedSubs.length > 0 ? mergedSubs : existing.subcategories,
        });
      }
    }
  });

  const list = Array.from(map.values());
  list.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  return list;
}

// Helper to compress image data URL or File to lightweight, high-performance base64 data URL
export function compressImage(input: File | string, maxWidth = 1200, maxHeight = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    if (!input) {
      resolve('');
      return;
    }

    const processDataUrl = (dataUrl: string) => {
      if (!dataUrl || !dataUrl.startsWith('data:image')) {
        resolve(dataUrl || '');
        return;
      }

      // If already lightweight base64 (<120KB), return directly
      if (dataUrl.length < 120000) {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Convert to high-efficiency JPEG
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };

    if (typeof input === 'string') {
      processDataUrl(input);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = (e.target?.result as string) || '';
      processDataUrl(result);
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(input);
  });
}

// Helper to merge and deduplicate products safely without losing any products
export function mergeProductsLists(
  baseList: Product[] = INITIAL_PRODUCTS,
  incomingList: Product[] = [],
  explicitDeletedSet?: Set<string>
): Product[] {
  const map = new Map<string, Product>();
  let deletedIds = new Set<string>();
  try {
    const rawDeleted = localStorage.getItem('kenax_deleted_product_ids');
    if (rawDeleted) {
      const parsed = JSON.parse(rawDeleted);
      if (Array.isArray(parsed)) parsed.forEach((id) => deletedIds.add(id));
    }
  } catch {}

  if (explicitDeletedSet) {
    explicitDeletedSet.forEach((id) => deletedIds.add(id));
  }

  // 1. Add base products (e.g. INITIAL_PRODUCTS) if not explicitly deleted
  (baseList || INITIAL_PRODUCTS || []).forEach((p) => {
    if (p && p.id && !deletedIds.has(p.id)) {
      map.set(p.id, { ...p });
    }
  });

  // 2. Add or update incoming products (from Firestore, Cloud SQL, or local cache)
  (incomingList || []).forEach((p) => {
    if (p && p.id && !deletedIds.has(p.id)) {
      const existing = map.get(p.id);
      if (!existing) {
        map.set(p.id, { ...p });
      } else {
        const prevTime = new Date(existing.updatedAt || existing.createdAt || '2000-01-01').getTime();
        const nextTime = new Date(p.updatedAt || p.createdAt || '2000-01-01').getTime();
        const validPrev = isNaN(prevTime) ? 0 : prevTime;
        const validNext = isNaN(nextTime) ? 0 : nextTime;

        if (validNext >= validPrev || (!existing.updatedAt && p.updatedAt)) {
          map.set(p.id, { ...existing, ...p });
        } else {
          map.set(p.id, { ...p, ...existing });
        }
      }
    }
  });

  return Array.from(map.values());
}

// Automatically and permanently purge demo products from local caches, cart, wishlist, and Firestore
export function purgeDemoProducts() {
  if (typeof window === 'undefined') return;
  try {
    const demoSet = new Set(DEMO_PRODUCT_IDS);

    // 1. Record demo IDs in deleted list
    const rawDel = localStorage.getItem('kenax_deleted_product_ids');
    const delList: string[] = rawDel ? JSON.parse(rawDel) : [];
    DEMO_PRODUCT_IDS.forEach((id) => {
      if (!delList.includes(id)) delList.push(id);
    });
    safeSetLocalStorage('kenax_deleted_product_ids', JSON.stringify(delList));

    // 2. Clean products cache
    const rawCache = localStorage.getItem('kenax_products_cache');
    if (rawCache) {
      const parsed: Product[] = JSON.parse(rawCache);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((p) => p && p.id && !demoSet.has(p.id));
        safeSetLocalStorage('kenax_products_cache', JSON.stringify(filtered));
      }
    }

    // 3. Clean cart
    const rawCart = localStorage.getItem('kenax_cart');
    if (rawCart) {
      const parsed = JSON.parse(rawCart);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((item: any) => item && !demoSet.has(item.productId));
        safeSetLocalStorage('kenax_cart', JSON.stringify(filtered));
      }
    }

    // 4. Clean wishlist
    const rawWish = localStorage.getItem('kenax_wishlist');
    if (rawWish) {
      const parsed = JSON.parse(rawWish);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((p: any) => p && !demoSet.has(p.id || p.productId));
        safeSetLocalStorage('kenax_wishlist', JSON.stringify(filtered));
      }
    }

    // 5. Asynchronously remove demo products from Firestore & server
    DEMO_PRODUCT_IDS.forEach((id) => {
      fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
      if (!isQuotaExceededFlag) {
        deleteDoc(doc(db, 'products', id)).catch(() => {});
        setDoc(doc(db, 'deletedProducts', id), { id, deletedAt: new Date().toISOString() }).catch(() => {});
      }
    });
  } catch (err) {
    console.warn('[KenaX BD] Notice during demo products purge:', err);
  }
}
purgeDemoProducts();

// Push all default catalog data to Firestore
export async function seedAllDataToFirestore(force = false): Promise<{ success: boolean; message: string }> {
  // Always mark seeded flag as true to avoid looping seed calls across renders
  safeSetLocalStorage('kenax_seeded_flag', 'true');

  if (isQuotaExceededFlag || (typeof window !== 'undefined' && localStorage.getItem('kenax_quota_exceeded') === 'true')) {
    console.log('[KenaX BD] Quota limit active. Operating seamlessly with local catalog cache.');
    return { success: true, message: 'Quota active. Operating with local catalog cache.' };
  }

  try {
    // Check if Cloud DB is already initialized in Firestore
    if (!force) {
      try {
        const seedDoc = await getDoc(doc(db, 'system', 'seedInfo'));
        if (seedDoc.exists() && seedDoc.data()?.seeded) {
          console.log('[KenaX BD] Cloud database is already seeded. Skipping auto-reseed.');
          return { success: true, message: 'Database already seeded.' };
        }
        const settingsSnap = await getDoc(doc(db, 'websiteSettings', INITIAL_WEBSITE_SETTINGS.id));
        if (settingsSnap.exists()) {
          console.log('[KenaX BD] Website settings exist in Cloud Firestore. Marking seeded.');
          await setDoc(doc(db, 'system', 'seedInfo'), { seeded: true, seededAt: new Date().toISOString() }, { merge: true }).catch((e) => {
            if (isQuotaExceededError(e)) markQuotaExceeded(e);
          });
          return { success: true, message: 'Database already seeded.' };
        }
      } catch (e) {
        if (isQuotaExceededError(e)) {
          markQuotaExceeded(e);
          return { success: true, message: 'Quota limit reached. Using local catalog.' };
        }
        console.warn('[KenaX BD] Error checking seed status:', e);
      }
    }

    if (isQuotaExceededFlag) return { success: true, message: 'Quota limit reached.' };

    console.log('[KenaX BD] Seeding database with initial catalog...');

    // Fetch existing products from Firestore first to guarantee no admin-added product is lost
    let existingFirestoreProds: Product[] = [];
    try {
      const snap = await getDocs(collection(db, 'products'));
      if (!snap.empty) {
        snap.forEach((d) => {
          if (d.data()) existingFirestoreProds.push(d.data() as Product);
        });
      }
    } catch (e) {
      if (isQuotaExceededError(e)) {
        markQuotaExceeded(e);
        return { success: true, message: 'Quota limit reached.' };
      }
      console.warn('[KenaX BD] Pre-seed fetch error:', e);
    }

    if (isQuotaExceededFlag) return { success: true, message: 'Quota limit reached.' };

    // 1. Seed Products (ONLY if Firestore products collection is completely empty)
    if (existingFirestoreProds.length === 0) {
      let deletedSet = new Set<string>();
      try {
        const delSnap = await getDocs(collection(db, 'deletedProducts'));
        delSnap.forEach((d) => deletedSet.add(d.id));
      } catch {}

      for (const product of INITIAL_PRODUCTS) {
        if (isQuotaExceededFlag) break;
        if (deletedSet.has(product.id)) continue;
        try {
          await setDoc(doc(db, 'products', product.id), cleanFirestoreData(product), { merge: true });
        } catch (err) {
          if (isQuotaExceededError(err)) { markQuotaExceeded(err); break; }
        }
      }
    }

    // 2. Seed Categories
    for (const cat of INITIAL_CATEGORIES) {
      if (isQuotaExceededFlag) break;
      try {
        await setDoc(doc(db, 'categories', cat.id), cleanFirestoreData(cat), { merge: true });
      } catch (err) {
        if (isQuotaExceededError(err)) { markQuotaExceeded(err); break; }
      }
    }

    // 3. Seed Website Settings
    if (!isQuotaExceededFlag) {
      try {
        await setDoc(doc(db, 'websiteSettings', INITIAL_WEBSITE_SETTINGS.id), INITIAL_WEBSITE_SETTINGS, { merge: true });
      } catch (err) {
        if (isQuotaExceededError(err)) markQuotaExceeded(err);
      }
    }

    // 4. Seed Delivery Zones
    for (const zone of INITIAL_DELIVERY_ZONES) {
      if (isQuotaExceededFlag) break;
      try {
        await setDoc(doc(db, 'deliveryZones', zone.id), zone, { merge: true });
      } catch (err) {
        if (isQuotaExceededError(err)) { markQuotaExceeded(err); break; }
      }
    }

    // 5. Seed Coupons
    for (const coupon of INITIAL_COUPONS) {
      if (isQuotaExceededFlag) break;
      try {
        await setDoc(doc(db, 'coupons', coupon.id), coupon, { merge: true });
      } catch (err) {
        if (isQuotaExceededError(err)) { markQuotaExceeded(err); break; }
      }
    }

    // 6. Seed Sample Orders
    for (const order of INITIAL_ORDERS) {
      if (isQuotaExceededFlag) break;
      try {
        await setDoc(doc(db, 'orders', order.id), order, { merge: true });
      } catch (err) {
        if (isQuotaExceededError(err)) { markQuotaExceeded(err); break; }
      }
    }

    // 7. Seed Initial Customers
    for (const customer of INITIAL_CUSTOMERS) {
      if (isQuotaExceededFlag) break;
      try {
        await setDoc(doc(db, 'customers', customer.id), customer, { merge: true });
      } catch (err) {
        if (isQuotaExceededError(err)) { markQuotaExceeded(err); break; }
      }
    }

    // 8. Seed Initial Activity Logs
    for (const log of INITIAL_ACTIVITY_LOGS) {
      if (isQuotaExceededFlag) break;
      try {
        await setDoc(doc(db, 'activityLogs', log.id), cleanFirestoreData(log), { merge: true });
      } catch (err) {
        if (isQuotaExceededError(err)) { markQuotaExceeded(err); break; }
      }
    }

    // Cache locally as well without wiping custom products
    let existingProds: Product[] = [];
    try {
      const rawProds = localStorage.getItem('kenax_products_cache');
      if (rawProds) existingProds = JSON.parse(rawProds);
    } catch {}
    const mergedProds = mergeProductsLists(INITIAL_PRODUCTS, [...existingFirestoreProds, ...existingProds]);

    let existingCats: Category[] = [];
    try {
      const rawCats = localStorage.getItem('kenax_categories_cache');
      if (rawCats) existingCats = JSON.parse(rawCats);
    } catch {}
    const mergedCats = mergeCategoriesLists(INITIAL_CATEGORIES, existingCats);

    let existingOrders: Order[] = [];
    try {
      const rawOrders = localStorage.getItem('kenax_orders_cache');
      if (rawOrders) existingOrders = JSON.parse(rawOrders);
    } catch {}
    const mergedOrders = mergeOrdersLists(INITIAL_ORDERS, existingOrders);

    let existingCusts: CustomerRecord[] = [];
    try {
      const rawCusts = localStorage.getItem('kenax_customers_cache');
      if (rawCusts) existingCusts = JSON.parse(rawCusts);
    } catch {}
    const mergedCusts = mergeCustomersLists(INITIAL_CUSTOMERS, existingCusts);

    safeSetLocalStorage('kenax_products_cache', JSON.stringify(mergedProds));
    safeSetLocalStorage('kenax_categories_cache', JSON.stringify(mergedCats));
    safeSetLocalStorage('kenax_categories', JSON.stringify(mergedCats));
    safeSetLocalStorage('kenax_orders_cache', JSON.stringify(mergedOrders));
    safeSetLocalStorage('kenax_settings_cache', JSON.stringify(INITIAL_WEBSITE_SETTINGS));
    safeSetLocalStorage('kenax_customers_cache', JSON.stringify(mergedCusts));
    safeSetLocalStorage('kenax_activity_logs_cache', JSON.stringify(INITIAL_ACTIVITY_LOGS));

    if (!isQuotaExceededFlag) {
      try {
        await setDoc(doc(db, 'system', 'seedInfo'), { seeded: true, seededAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        if (isQuotaExceededError(err)) markQuotaExceeded(err);
      }
    }

    return {
      success: true,
      message: `Database successfully populated with ${mergedProds.length} products, ${mergedCats.length} categories, delivery zones, and orders!`,
    };
  } catch (error: any) {
    if (isQuotaExceededError(error)) {
      markQuotaExceeded(error);
    } else {
      console.error('[KenaX BD] Seeding error:', error);
    }
    let existingProds: Product[] = [];
    try {
      const rawProds = localStorage.getItem('kenax_products_cache');
      if (rawProds) existingProds = JSON.parse(rawProds);
    } catch {}
    const mergedProds = mergeProductsLists(INITIAL_PRODUCTS, existingProds);

    let existingCats: Category[] = [];
    try {
      const rawCats = localStorage.getItem('kenax_categories_cache');
      if (rawCats) existingCats = JSON.parse(rawCats);
    } catch {}
    const mergedCats = mergeCategoriesLists(INITIAL_CATEGORIES, existingCats);

    let existingOrders: Order[] = [];
    try {
      const rawOrders = localStorage.getItem('kenax_orders_cache');
      if (rawOrders) existingOrders = JSON.parse(rawOrders);
    } catch {}

    let existingCusts: CustomerRecord[] = [];
    try {
      const rawCusts = localStorage.getItem('kenax_customers_cache');
      if (rawCusts) existingCusts = JSON.parse(rawCusts);
    } catch {}

    safeSetLocalStorage('kenax_products_cache', JSON.stringify(mergedProds));
    safeSetLocalStorage('kenax_categories_cache', JSON.stringify(mergedCats));
    safeSetLocalStorage('kenax_categories', JSON.stringify(mergedCats));
    safeSetLocalStorage('kenax_orders_cache', JSON.stringify(mergeOrdersLists(INITIAL_ORDERS, existingOrders)));
    safeSetLocalStorage('kenax_settings_cache', JSON.stringify(INITIAL_WEBSITE_SETTINGS));
    safeSetLocalStorage('kenax_customers_cache', JSON.stringify(mergeCustomersLists(INITIAL_CUSTOMERS, existingCusts)));
    safeSetLocalStorage('kenax_seeded_flag', 'true');

    return {
      success: true,
      message: `Data stored successfully into store persistence (Local & Cloud Sync fallback).`,
    };
  }
}

// Memory cache for resolved image media strings
const imageMediaMemoryCache = new Map<string, string>();

// Preload any key media into memory cache asynchronously from IndexedDB
if (typeof window !== 'undefined') {
  try {
    // Also warm up imageMediaMemoryCache from localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('kenax_img_media_')) {
        const id = k.replace('kenax_img_media_', '');
        const val = localStorage.getItem(k);
        if (val && val.startsWith('data:image')) {
          imageMediaMemoryCache.set(id, val);
        }
      }
    }
  } catch {}
}

// Helper to save 100% original base64 image data to Firestore (chunked into 600KB pieces if >600KB)
export async function saveOriginalImageMedia(mediaId: string, base64Data: string): Promise<string> {
  if (!base64Data || !base64Data.startsWith('data:image')) {
    return base64Data;
  }

  // 1. In-memory cache
  imageMediaMemoryCache.set(mediaId, base64Data);

  // 2. High-capacity IndexedDB storage (Multi-GB capability, unaffected by localStorage quotas)
  try {
    await setIdbItem(`kenax_img_media_${mediaId}`, base64Data);
  } catch {}

  // 3. LocalStorage for synchronous instant access if space allows
  try {
    safeSetLocalStorage(`kenax_img_media_${mediaId}`, base64Data);
  } catch {}

  const CHUNK_SIZE = 600000; // ~600KB
  if (base64Data.length <= CHUNK_SIZE) {
    try {
      await setDoc(doc(db, 'productImageMedia', mediaId), {
        id: mediaId,
        data: base64Data,
        isChunked: false,
        updatedAt: new Date().toISOString(),
      });
      return `media://productImageMedia/${mediaId}`;
    } catch (err) {
      console.warn('[KenaX BD] Error saving image media to Firestore:', err);
      return `media://productImageMedia/${mediaId}`;
    }
  }

  // Chunked upload for heavy/4K high-res images (> 600KB base64)
  const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
  try {
    const metaRef = doc(db, 'productImageMedia', mediaId);
    await setDoc(metaRef, {
      id: mediaId,
      isChunked: true,
      totalChunks,
      length: base64Data.length,
      updatedAt: new Date().toISOString(),
    });

    for (let i = 0; i < totalChunks; i++) {
      const chunkStr = base64Data.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkRef = doc(db, 'productImageMedia', mediaId, 'chunks', `chunk_${i}`);
      await setDoc(chunkRef, {
        index: i,
        data: chunkStr,
      });
    }
    return `media://productImageMedia/${mediaId}`;
  } catch (err) {
    console.warn('[KenaX BD] Error saving chunked image media to Firestore:', err);
    return `media://productImageMedia/${mediaId}`;
  }
}

const DEFAULT_FALLBACK_PRODUCT_IMAGE = NEUTRAL_PRODUCT_PLACEHOLDER;

// Helper to synchronously get resolved image media if already cached in memory or localStorage
export function getSynchronouslyResolvedMedia(mediaUrl: string): string | null {
  if (!mediaUrl || typeof mediaUrl !== 'string' || !mediaUrl.startsWith('media://')) {
    return mediaUrl || null;
  }
  const mediaId = mediaUrl.replace('media://productImageMedia/', '').replace('media://', '');
  if (imageMediaMemoryCache.has(mediaId)) {
    return imageMediaMemoryCache.get(mediaId)!;
  }
  try {
    const cached = localStorage.getItem(`kenax_img_media_${mediaId}`);
    if (cached) {
      imageMediaMemoryCache.set(mediaId, cached);
      return cached;
    }
  } catch {}
  return null;
}

// Helper to resolve a media reference e.g. "media://productImageMedia/{mediaId}" or "media://{mediaId}" to 100% original base64
export async function resolveOriginalImageMedia(mediaUrl: string, productId?: string): Promise<string> {
  if (!mediaUrl || typeof mediaUrl !== 'string' || !mediaUrl.startsWith('media://')) {
    return mediaUrl || NEUTRAL_PRODUCT_PLACEHOLDER;
  }

  const mediaId = mediaUrl.replace('media://productImageMedia/', '').replace('media://', '');

  // 1. Memory Cache
  if (imageMediaMemoryCache.has(mediaId)) {
    return imageMediaMemoryCache.get(mediaId)!;
  }

  // 2. LocalStorage Cache
  try {
    const cached = localStorage.getItem(`kenax_img_media_${mediaId}`);
    if (cached && cached.startsWith('data:image')) {
      imageMediaMemoryCache.set(mediaId, cached);
      return cached;
    }
  } catch {}

  // 3. IndexedDB Cache (High capacity client-side storage)
  try {
    const idbCached = await getIdbItem(`kenax_img_media_${mediaId}`);
    if (idbCached && idbCached.startsWith('data:image')) {
      imageMediaMemoryCache.set(mediaId, idbCached);
      try {
        safeSetLocalStorage(`kenax_img_media_${mediaId}`, idbCached);
      } catch {}
      return idbCached;
    }
  } catch {}

  // 4. Firestore Cloud Fetch
  if (!isQuotaExceededFlag) {
    try {
      const docRef = doc(db, 'productImageMedia', mediaId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        let fullBase64 = '';
        if (!data.isChunked) {
          fullBase64 = data.data || '';
        } else {
          const totalChunks = data.totalChunks || 0;
          const chunks: string[] = [];
          for (let i = 0; i < totalChunks; i++) {
            const chunkRef = doc(db, 'productImageMedia', mediaId, 'chunks', `chunk_${i}`);
            const chunkSnap = await getDoc(chunkRef);
            if (chunkSnap.exists()) {
              chunks.push(chunkSnap.data().data || '');
            }
          }
          fullBase64 = chunks.join('');
        }

        if (fullBase64) {
          imageMediaMemoryCache.set(mediaId, fullBase64);
          try {
            setIdbItem(`kenax_img_media_${mediaId}`, fullBase64);
            safeSetLocalStorage(`kenax_img_media_${mediaId}`, fullBase64);
          } catch {}
          return fullBase64;
        }
      }
    } catch (err) {
      console.warn(`[KenaX BD] Failed to fetch image media ${mediaId} from Firestore:`, err);
    }
  }

  // 5. Ultimate Fallback: return neutral placeholder
  return NEUTRAL_PRODUCT_PLACEHOLDER;
}

// Batch resolve all media URLs in a product object
export async function resolveProductOriginalImages(product: Product): Promise<Product> {
  if (!product) return product;

  let resolvedImages = product.images;
  if (Array.isArray(product.images)) {
    resolvedImages = await Promise.all(
      product.images.map(async (img) => {
        if (typeof img === 'string' && img.startsWith('media://')) {
          return await resolveOriginalImageMedia(img, product.id);
        }
        return img || NEUTRAL_PRODUCT_PLACEHOLDER;
      })
    );
  }

  let resolvedColors = product.colors;
  if (Array.isArray(product.colors)) {
    resolvedColors = await Promise.all(
      product.colors.map(async (c) => {
        if (c.imageUrl && c.imageUrl.startsWith('media://')) {
          const resolvedUrl = await resolveOriginalImageMedia(c.imageUrl, product.id);
          return { ...c, imageUrl: resolvedUrl };
        }
        return c;
      })
    );
  }

  return {
    ...product,
    images: resolvedImages,
    colors: resolvedColors,
  };
}

export async function fetchServerProducts(): Promise<Product[]> {
  try {
    const res = await fetch('/api/products');
    if (res.ok) {
      const serverProducts = await res.json();
      if (Array.isArray(serverProducts) && serverProducts.length > 0) {
        return serverProducts;
      }
    }
  } catch (e) {
    console.warn('[KenaX BD] Could not fetch products from server /api/products:', e);
  }
  return [];
}

export async function fetchServerDeletedIds(): Promise<string[]> {
  try {
    const res = await fetch('/api/products/deleted-ids');
    if (res.ok) {
      const ids = await res.json();
      if (Array.isArray(ids)) return ids;
    }
  } catch (e) {}
  return [];
}

// Fetch products from Firestore & Central Server API
export async function getProductsFromDB(): Promise<Product[]> {
  const [serverItems, serverDeletedIds] = await Promise.all([
    fetchServerProducts(),
    fetchServerDeletedIds(),
  ]);

  let cachedItems: Product[] = [];
  try {
    const cached = localStorage.getItem('kenax_products_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) cachedItems = parsed;
    }
  } catch {}

  let firestoreItems: Product[] = [];
  let firestoreDeletedIds: string[] = [];

  if (!isQuotaExceededFlag) {
    try {
      const deletedSnap = await getDocs(collection(db, 'deletedProducts'));
      if (!deletedSnap.empty) {
        deletedSnap.forEach((d) => firestoreDeletedIds.push(d.id));
      }
    } catch (err) {
      if (isQuotaExceededError(err)) markQuotaExceeded(err);
      else console.warn('[KenaX BD] Firestore deletedProducts fetch error:', err);
    }

    try {
      const colRef = collection(db, 'products');
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Product;
          if (data && data.id) {
            firestoreItems.push(data);
          }
        });
      }
    } catch (err) {
      if (isQuotaExceededError(err)) markQuotaExceeded(err);
      else console.warn('[KenaX BD] Firestore products fetch error:', err);
    }
  }

  let localDeletedIds: string[] = [];
  try {
    const rawDel = localStorage.getItem('kenax_deleted_product_ids');
    if (rawDel) localDeletedIds = JSON.parse(rawDel);
  } catch {}

  const allDeletedSet = new Set([
    ...localDeletedIds,
    ...firestoreDeletedIds,
    ...serverDeletedIds,
  ]);

  // Authoritative merging: Always merge INITIAL_PRODUCTS baseline with cached, server, and firestore items
  let activeSources: Product[] = [...INITIAL_PRODUCTS, ...cachedItems, ...serverItems, ...firestoreItems];

  const filteredSources = activeSources.filter((p) => p && p.id && !allDeletedSet.has(p.id));
  const rawMerged = mergeProductsLists(INITIAL_PRODUCTS, filteredSources, allDeletedSet);
  safeSetLocalStorage('kenax_deleted_product_ids', JSON.stringify(Array.from(allDeletedSet)));

  // Background sync any newly merged items to server storage if missing
  if (rawMerged.length > serverItems.length) {
    fetch('/api/products/batch-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: rawMerged }),
    }).catch(() => {});
  }

  const merged = await Promise.all(rawMerged.map((p) => resolveProductOriginalImages(p)));
  safeSetLocalStorage('kenax_products_cache', JSON.stringify(merged));

  return merged;
}

// Save or Update Product in DB
export async function saveProductToDB(product: Product): Promise<void> {
  const productId = product.id;

  // 0. Remove from deleted tombstones if being created or updated
  try {
    const rawDel = localStorage.getItem('kenax_deleted_product_ids');
    if (rawDel) {
      const delList: string[] = JSON.parse(rawDel);
      const filtered = delList.filter((id) => id !== productId);
      safeSetLocalStorage('kenax_deleted_product_ids', JSON.stringify(filtered));
    }
  } catch {}

  // 1. Immediately update local cache with product as incoming/latest
  try {
    const cached = localStorage.getItem('kenax_products_cache');
    const currentProducts: Product[] = cached ? JSON.parse(cached) : INITIAL_PRODUCTS;
    const updated = mergeProductsLists(currentProducts, [product]);
    safeSetLocalStorage('kenax_products_cache', JSON.stringify(updated));
  } catch (e) {
    console.error('[KenaX BD] Local cache update error in saveProductToDB:', e);
  }

  // 2. Sync to central server API (persists 100% full resolution images & enables instant cross-device sync)
  try {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
  } catch (err) {
    console.warn('[KenaX BD] Central server saveProductToDB non-blocking error:', err);
  }

  if (isQuotaExceededFlag) return;

  // 3. Process images: compress base64 and preserve directly in doc if < 350KB, or chunk if large
  let cloudImages = product.images || [];
  if (Array.isArray(product.images)) {
    cloudImages = await Promise.all(
      product.images.map(async (img, idx) => {
        if (!img) return '';
        if (typeof img === 'string' && img.startsWith('data:image')) {
          const compressed = await compressImage(img, 900, 900, 0.78);
          if (compressed.length < 350000) {
            return compressed;
          }
          const mediaId = `img_${productId}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
          return await saveOriginalImageMedia(mediaId, compressed);
        }
        return img;
      })
    );
  }

  let cloudColors = product.colors;
  if (Array.isArray(product.colors)) {
    cloudColors = await Promise.all(
      product.colors.map(async (color, idx) => {
        if (color.imageUrl && color.imageUrl.startsWith('data:image')) {
          const compressed = await compressImage(color.imageUrl, 900, 900, 0.78);
          if (compressed.length < 350000) {
            return { ...color, imageUrl: compressed };
          }
          const mediaId = `img_${productId}_color_${idx}_${Math.random().toString(36).substring(2, 7)}`;
          const mediaUrl = await saveOriginalImageMedia(mediaId, compressed);
          return { ...color, imageUrl: mediaUrl };
        }
        return color;
      })
    );
  }

  const cloudProduct: Product = {
    ...product,
    images: cloudImages,
    colors: cloudColors,
    updatedAt: product.updatedAt || new Date().toISOString(),
  };

  const cleaned = cleanFirestoreData(cloudProduct);

  try {
    const docRef = doc(db, 'products', cloudProduct.id);
    await setDoc(docRef, cleaned, { merge: true });
    await deleteDoc(doc(db, 'deletedProducts', cloudProduct.id)).catch(() => {});
    console.log(`[KenaX BD] Successfully saved product ${cloudProduct.id} to Cloud Firestore.`);
  } catch (err) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded(err);
    } else {
      console.error('[KenaX BD] Firestore saveProductToDB error:', err);
    }
  }
}

// Delete Product from DB
export async function deleteProductFromDB(productId: string): Promise<void> {
  if (!productId) return;

  // 1. Record in local deleted product IDs tombstone
  try {
    const rawDel = localStorage.getItem('kenax_deleted_product_ids');
    const delList: string[] = rawDel ? JSON.parse(rawDel) : [];
    if (!delList.includes(productId)) {
      delList.push(productId);
      safeSetLocalStorage('kenax_deleted_product_ids', JSON.stringify(delList));
    }
  } catch {}

  // 2. Local products cache update
  try {
    const cached = localStorage.getItem('kenax_products_cache');
    if (cached) {
      const currentProducts: Product[] = JSON.parse(cached);
      const filtered = currentProducts.filter((p) => p && p.id !== productId);
      safeSetLocalStorage('kenax_products_cache', JSON.stringify(filtered));
    }
  } catch {}

  // 3. Remove deleted item from active cart and wishlist if present
  try {
    const cartRaw = localStorage.getItem('kenax_cart');
    if (cartRaw) {
      const cartItems: any[] = JSON.parse(cartRaw);
      const filteredCart = cartItems.filter((it) => it && it.productId !== productId);
      safeSetLocalStorage('kenax_cart', JSON.stringify(filteredCart));
    }
  } catch {}

  try {
    const wishRaw = localStorage.getItem('kenax_wishlist');
    if (wishRaw) {
      const wishItems: any[] = JSON.parse(wishRaw);
      const filteredWish = wishItems.filter((it) => it && (it.id !== productId && it.productId !== productId));
      safeSetLocalStorage('kenax_wishlist', JSON.stringify(filteredWish));
    }
  } catch {}

  // 4. Dispatch instant UI deletion event across components
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('kenax_product_deleted', { detail: productId }));
    } catch {}
  }

  // 5. Permanent delete from Cloud SQL / Central Server Store
  fetch(`/api/products/${encodeURIComponent(productId)}`, { method: 'DELETE' }).catch((err) => {
    console.warn('[KenaX BD] Cloud SQL deleteProductFromDB non-blocking error:', err);
  });

  if (isQuotaExceededFlag) return;

  // 6. Delete doc from Firestore products & record in deletedProducts collection
  try {
    await deleteDoc(doc(db, 'products', productId));
    await setDoc(doc(db, 'deletedProducts', productId), { id: productId, deletedAt: new Date().toISOString() });
    console.log(`[KenaX BD] Successfully deleted product ${productId} from Cloud Firestore.`);
  } catch (err) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded(err);
    } else {
      console.warn('[KenaX BD] Firestore deleteProductFromDB error:', err);
    }
  }
}

// Subscribe to real-time products updates from Cloud Firestore
export function subscribeToProducts(onProductsChanged: (products: Product[]) => void): Unsubscribe {
  if (isQuotaExceededFlag) return () => {};
  try {
    const colRef = collection(db, 'products');
    return onSnapshot(
      colRef,
      async (snapshot) => {
        let firestoreDeletedIds: string[] = [];
        try {
          const deletedSnap = await getDocs(collection(db, 'deletedProducts'));
          if (!deletedSnap.empty) {
            deletedSnap.forEach((d) => firestoreDeletedIds.push(d.id));
          }
        } catch {}

        const deletedSet = new Set(firestoreDeletedIds);
        const firestoreItems: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Product;
          if (data && data.id && !deletedSet.has(data.id)) {
            firestoreItems.push(data);
          }
        });

        let cachedItems: Product[] = [];
        try {
          const cached = localStorage.getItem('kenax_products_cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) cachedItems = parsed;
          }
        } catch {}

        const serverItems = await fetchServerProducts();

        let localDeletedIds: string[] = [];
        try {
          const rawDel = localStorage.getItem('kenax_deleted_product_ids');
          if (rawDel) localDeletedIds = JSON.parse(rawDel);
        } catch {}

        const serverDeletedIds = await fetchServerDeletedIds();

        const allDeletedSet = new Set([
          ...localDeletedIds,
          ...firestoreDeletedIds,
          ...serverDeletedIds,
        ]);

        let activeSources: Product[] = [];
        if (firestoreItems.length > 0) {
          activeSources = [...cachedItems, ...serverItems, ...firestoreItems];
        } else if (serverItems.length > 0) {
          activeSources = [...cachedItems, ...serverItems];
        } else if (cachedItems.length > 0) {
          activeSources = [...cachedItems];
        } else {
          activeSources = [...INITIAL_PRODUCTS];
        }

        const allSources = activeSources.filter((p) => p && p.id && !allDeletedSet.has(p.id));

        const rawProducts = mergeProductsLists([], allSources, allDeletedSet);
        safeSetLocalStorage('kenax_deleted_product_ids', JSON.stringify(Array.from(allDeletedSet)));

        const fullyResolved = await Promise.all(rawProducts.map((p) => resolveProductOriginalImages(p)));
        if (fullyResolved.length > 0) {
          safeSetLocalStorage('kenax_products_cache', JSON.stringify(fullyResolved));
          onProductsChanged(fullyResolved);
        }
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          markQuotaExceeded(error);
        } else {
          console.warn('[KenaX BD] Products real-time listener error:', error);
        }
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToProducts setup failed:', e);
    return () => {};
  }
}

// ----------------------------------------------------
// ORDERS OPERATIONS (PERSISTENCE & CLOUD SYNC)
// ----------------------------------------------------

// Central Server Orders Helper
export async function fetchServerOrders(): Promise<Order[]> {
  try {
    const res = await fetch('/api/orders');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {}
  return [];
}

// Create new Order in Cloud Firestore + Central Server Storage + Local Persistent Cache + Customer Record Linking
export async function saveOrderToDB(order: Order): Promise<void> {
  order.isV2Order = true;
  const cleaned = cleanFirestoreData(order);

  // 1. Immediately update local permanent order cache
  try {
    const cached = localStorage.getItem('kenax_orders_cache');
    const currentOrders: Order[] = cached ? JSON.parse(cached) : [];
    const updatedOrders = mergeOrdersLists(currentOrders, [order]);
    safeSetLocalStorage('kenax_orders_cache', JSON.stringify(updatedOrders));

    // Also track in personal order history list
    const myOrdersRaw = localStorage.getItem('kenax_my_orders');
    const myOrders: string[] = myOrdersRaw ? JSON.parse(myOrdersRaw) : [];
    if (!myOrders.includes(order.id)) {
      myOrders.unshift(order.id);
      safeSetLocalStorage('kenax_my_orders', JSON.stringify(myOrders));
    }
  } catch (e) {
    console.error('[KenaX BD] Error updating local orders cache:', e);
  }

  // 1.1 Persist to Server Storage (Cloud backend persistence across devices)
  try {
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    }).catch((e) => console.warn('[KenaX BD] Server order sync error:', e));
  } catch {}

  // 2. Write to Cloud Firestore Orders Collection with Timeout Protection (1.5s max wait)
  if (!isQuotaExceededFlag) {
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      await Promise.race([
        setDoc(doc(db, 'orders', order.id), cleaned, { merge: true }),
        timeoutPromise,
      ]);
      console.log(`[KenaX BD] Order #${order.id} permanently saved to Cloud Firestore.`);
    } catch (err) {
      if (isQuotaExceededError(err)) {
        markQuotaExceeded(err);
      } else {
        console.warn('[KenaX BD] Firestore saveOrderToDB error (cached locally):', err);
      }
    }
  }

  // 3. Link Order to Customer Document in Firestore and local customers cache
  try {
    const custEmail = (order.customerEmail || '').trim().toLowerCase();
    const custPhone = normalizePhoneNumber(order.customerMobile || order.deliveryMobile);

    const allCustomers = await getCustomersFromDB();
    const targetCustomer = allCustomers.find((c) => {
      if (order.customerId && order.customerId !== 'cust-guest' && c.id === order.customerId) return true;
      if (custEmail && c.email && c.email.trim().toLowerCase() === custEmail) return true;
      if (custPhone && c.mobile && normalizePhoneNumber(c.mobile) === custPhone) return true;
      return false;
    });

    if (targetCustomer) {
      const existingOrderIds = targetCustomer.orderIds || [];
      const updatedOrderIds = existingOrderIds.includes(order.id)
        ? existingOrderIds
        : [order.id, ...existingOrderIds];

      const updatedCustomer: CustomerRecord = {
        ...targetCustomer,
        orderIds: updatedOrderIds,
        totalOrders: (targetCustomer.totalOrders || 0) + 1,
        ordersCount: ((targetCustomer.ordersCount || targetCustomer.totalOrders) || 0) + 1,
        totalSpent: (targetCustomer.totalSpent || 0) + (order.totalAmount || 0),
        lastOrderDate: order.createdAt || new Date().toISOString(),
      };
      await saveCustomerToDB(updatedCustomer);

      // Sync active customer in localStorage if active
      try {
        const activeCustRaw = localStorage.getItem('kenax_current_customer');
        if (activeCustRaw) {
          const activeCust = JSON.parse(activeCustRaw);
          if (activeCust && (activeCust.id === targetCustomer.id || activeCust.id === order.customerId)) {
            localStorage.setItem(
              'kenax_current_customer',
              JSON.stringify({
                ...activeCust,
                ...updatedCustomer,
              })
            );
          }
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[KenaX BD] Linking order to customer record error:', err);
  }

  // 4. Trigger simulated background email & sheets sync
  try {
    fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: order.customerEmail,
        subject: `Order Confirmed #${order.id} - KenaX BD`,
        template: 'Order Confirmation',
        data: order,
      }),
    }).catch(() => {});

    fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Orders',
        records: [order],
      }),
    }).catch(() => {});
  } catch {}
}

// Fetch all Orders from Cloud Firestore + Central Server and merge with local cache
export async function getOrdersFromDB(): Promise<Order[]> {
  const serverOrders = await fetchServerOrders();

  let remoteItems: Order[] = [];
  if (!isQuotaExceededFlag) {
    try {
      const colRef = collection(db, 'orders');
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Order;
          if (data && data.isV2Order) {
            remoteItems.push(data);
          }
        });
      }
    } catch (err) {
      if (isQuotaExceededError(err)) {
        markQuotaExceeded(err);
      } else {
        console.warn('[KenaX BD] Firestore getOrdersFromDB fallback:', err);
      }
    }
  }

  let localOrders: Order[] = [];
  try {
    const cached = localStorage.getItem('kenax_orders_cache');
    if (cached) localOrders = JSON.parse(cached);
  } catch {}

  const merged = mergeOrdersLists(localOrders, [...serverOrders, ...remoteItems]);
  safeSetLocalStorage('kenax_orders_cache', JSON.stringify(merged));
  return merged;
}

// Subscribe to real-time order updates from Firestore
export function subscribeToOrders(onOrdersChanged: (orders: Order[]) => void): Unsubscribe {
  if (isQuotaExceededFlag) return () => {};
  try {
    const colRef = collection(db, 'orders');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const remoteOrders: Order[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Order;
          if (data && data.isV2Order) {
            remoteOrders.push(data);
          }
        });
        let localOrders: Order[] = [];
        try {
          const cached = localStorage.getItem('kenax_orders_cache');
          if (cached) localOrders = JSON.parse(cached);
        } catch {}
        const merged = mergeOrdersLists(localOrders, remoteOrders);
        safeSetLocalStorage('kenax_orders_cache', JSON.stringify(merged));
        onOrdersChanged(merged);
      },
      (error) => {
        if (isQuotaExceededError(error)) {
          markQuotaExceeded(error);
        } else {
          console.warn('[KenaX BD] Orders real-time listener error:', error);
        }
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToOrders setup failed:', e);
    return () => {};
  }
}

// Fetch specific Customer's Orders from Cloud Firestore (queries by customerId, email, mobile)
export async function fetchCustomerOrdersFromDB(
  customer: Partial<CustomerRecord> | { id?: string; email?: string; mobile?: string }
): Promise<Order[]> {
  const allCurrent = await getOrdersFromDB();
  const cId = customer.id;
  const cEmail = customer.email ? customer.email.trim().toLowerCase() : '';
  const cPhone = normalizePhoneNumber(customer.mobile);

  // Also match order IDs tracked on this device's browser
  let localMyOrders: string[] = [];
  try {
    const raw = localStorage.getItem('kenax_my_orders');
    localMyOrders = raw ? JSON.parse(raw) : [];
  } catch {}

  const custOrderIds = (customer as any)?.orderIds || [];

  const matched = allCurrent.filter((o) => {
    if (!o) return false;
    // Match local device tracking
    if (localMyOrders.includes(o.id)) return true;
    // Match orderIds array
    if (custOrderIds.includes(o.id)) return true;
    // Match ID
    if (cId && cId !== 'cust-guest' && o.customerId === cId) return true;
    // Match Email
    if (cEmail && o.customerEmail && o.customerEmail.trim().toLowerCase() === cEmail) return true;
    // Match Customer Mobile
    if (cPhone) {
      const oPhone = normalizePhoneNumber(o.customerMobile || (o as any).customerPhone);
      const dPhone = normalizePhoneNumber(o.deliveryMobile);
      if (oPhone === cPhone || dPhone === cPhone) return true;
      if (cPhone.length >= 10 && (oPhone.endsWith(cPhone.slice(-10)) || dPhone.endsWith(cPhone.slice(-10)))) return true;
    }
    return false;
  });

  return matched;
}

// Fetch single order from Cloud Firestore directly (for tracking / lookup)
export async function fetchSingleOrderFromDB(orderIdOrQuery: string): Promise<Order | null> {
  const cleanQ = orderIdOrQuery.trim().toUpperCase();
  const digitsQ = orderIdOrQuery.replace(/\D/g, '');

  // 1. Check local cache first
  const cached = localStorage.getItem('kenax_orders_cache');
  if (cached) {
    try {
      const orders: Order[] = JSON.parse(cached);
      const found = orders.find((o) => {
        const oId = (o.id || '').toUpperCase();
        const trk = (o.trackingNumber || '').toUpperCase();
        const oPhone = normalizePhoneNumber(o.customerMobile || (o as any).customerPhone);
        const dPhone = normalizePhoneNumber(o.deliveryMobile);
        return (
          oId === cleanQ ||
          oId === `KB-${cleanQ}` ||
          cleanQ === oId.replace(/^KB-/, '') ||
          trk === cleanQ ||
          (digitsQ.length >= 7 && (oPhone.includes(digitsQ) || dPhone.includes(digitsQ)))
        );
      });
      if (found) return found;
    } catch {}
  }

  // 2. Direct Firestore Doc lookup
  try {
    const docRef = doc(db, 'orders', orderIdOrQuery.trim());
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const order = snap.data() as Order;
      return order;
    }
  } catch {}

  // 3. Firestore query scan if by tracking number or custom ID format
  try {
    const colRef = collection(db, 'orders');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      let foundOrder: Order | null = null;
      snapshot.forEach((d) => {
        const o = d.data() as Order;
        const oId = (o.id || '').toUpperCase();
        const trk = (o.trackingNumber || '').toUpperCase();
        const oPhone = normalizePhoneNumber(o.customerMobile || (o as any).customerPhone);
        const dPhone = normalizePhoneNumber(o.deliveryMobile);
        if (
          oId === cleanQ ||
          oId === `KB-${cleanQ}` ||
          cleanQ === oId.replace(/^KB-/, '') ||
          trk === cleanQ ||
          (digitsQ.length >= 7 && (oPhone.includes(digitsQ) || dPhone.includes(digitsQ)))
        ) {
          foundOrder = o;
        }
      });
      if (foundOrder) return foundOrder;
    }
  } catch (err) {
    console.warn('[KenaX BD] fetchSingleOrderFromDB query error:', err);
  }

  return null;
}

// Update Order status and tracking in Cloud Firestore & Central Server & Local Cache
export async function updateOrderInDB(orderId: string, updates: Partial<Order>): Promise<void> {
  const payload = {
    ...updates,
    updatedAt: new Date().toISOString(),
    isV2Order: true,
  };

  // 1. Sync to central server store (Cloud persistence across devices)
  fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => console.warn('[KenaX BD] Server updateOrderInDB error:', err));

  // 2. Sync to Cloud Firestore
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      ...payload,
    });
  } catch (err) {
    console.warn('[KenaX BD] Firestore updateOrderInDB fallback:', err);
  }

  // 3. Update local orders cache
  const cached = localStorage.getItem('kenax_orders_cache');
  let orders: Order[] = cached ? JSON.parse(cached) : [];
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx >= 0) {
    orders[idx] = { ...orders[idx], ...payload };
    safeSetLocalStorage('kenax_orders_cache', JSON.stringify(orders));
  }
}

// ----------------------------------------------------
// STAFF OPERATIONS
// ----------------------------------------------------
export async function getStaffFromDB(): Promise<StaffUser[]> {
  const REMOVED_STAFF_EMAILS = new Set(['admin@kenaxbd.com', 'manager@kenaxbd.com', 'moderator@kenaxbd.com', 'sadikrtx3060@gmail.com']);
  
  // 1. Gather deleted staff set from local storage and Firestore
  const deletedStaffIds = new Set<string>();
  const deletedStaffEmails = new Set<string>();
  try {
    const cachedDeleted = localStorage.getItem('kenax_deleted_staff_cache');
    if (cachedDeleted) {
      const parsed = JSON.parse(cachedDeleted);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (typeof item === 'string') deletedStaffIds.add(item);
          else if (item && typeof item === 'object') {
            if (item.id) deletedStaffIds.add(item.id);
            if (item.email) deletedStaffEmails.add(item.email.toLowerCase());
          }
        });
      }
    }
  } catch {}

  try {
    const deletedSnap = await getDocs(collection(db, 'deletedStaff'));
    if (deletedSnap && !deletedSnap.empty) {
      const deletedList: { id: string; email?: string }[] = [];
      deletedSnap.forEach((docSnap) => {
        deletedStaffIds.add(docSnap.id);
        const data = docSnap.data();
        if (data?.email) {
          deletedStaffEmails.add(data.email.toLowerCase());
          deletedList.push({ id: docSnap.id, email: data.email.toLowerCase() });
        } else {
          deletedList.push({ id: docSnap.id });
        }
      });
      safeSetLocalStorage('kenax_deleted_staff_cache', JSON.stringify(deletedList));
    }
  } catch {}

  try {
    const colRef = collection(db, 'staff');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const items: StaffUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as StaffUser;
        const isPermanentlyDeleted =
          deletedStaffIds.has(docSnap.id) ||
          (data && data.id && deletedStaffIds.has(data.id)) ||
          (data && data.email && deletedStaffEmails.has(data.email.toLowerCase()));

        if (isPermanentlyDeleted || (data && data.email && REMOVED_STAFF_EMAILS.has(data.email.toLowerCase())) || data?.role === 'moderator') {
          deleteDoc(doc(db, 'staff', docSnap.id)).catch(() => {});
        } else if (data && data.email) {
          items.push(data);
        }
      });
      
      // Ensure default initial staff exist in the list only if NOT deleted by admin
      const mergedList = [...items];
      for (const initial of INITIAL_STAFF) {
        const isDeleted =
          deletedStaffIds.has(initial.id) ||
          deletedStaffEmails.has(initial.email.toLowerCase()) ||
          REMOVED_STAFF_EMAILS.has(initial.email.toLowerCase());

        if (!isDeleted) {
          const exists = mergedList.some((s) => s.id === initial.id || s.email.toLowerCase() === initial.email.toLowerCase());
          if (!exists) {
            mergedList.push(initial);
            try {
              setDoc(doc(db, 'staff', initial.id), initial).catch(() => {});
            } catch {}
          }
        }
      }

      const cleanList = mergedList.filter(
        (s) =>
          s &&
          s.email &&
          !REMOVED_STAFF_EMAILS.has(s.email.toLowerCase()) &&
          !deletedStaffIds.has(s.id) &&
          !deletedStaffEmails.has(s.email.toLowerCase()) &&
          s.role !== 'moderator'
      );
      safeSetLocalStorage('kenax_staff_cache', JSON.stringify(cleanList));
      return cleanList;
    } else {
      // First time initialization in Firestore - only for non-deleted staff
      for (const initial of INITIAL_STAFF) {
        const isDeleted =
          deletedStaffIds.has(initial.id) ||
          deletedStaffEmails.has(initial.email.toLowerCase()) ||
          REMOVED_STAFF_EMAILS.has(initial.email.toLowerCase());
        if (!isDeleted) {
          try {
            await setDoc(doc(db, 'staff', initial.id), initial);
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn('[KenaX BD] Firestore getStaffFromDB fallback:', err);
  }

  const cached = localStorage.getItem('kenax_staff_cache');
  if (cached) {
    try {
      const parsed: StaffUser[] = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const clean = parsed.filter(
          (s) =>
            s &&
            s.email &&
            !REMOVED_STAFF_EMAILS.has(s.email.toLowerCase()) &&
            !deletedStaffIds.has(s.id) &&
            !deletedStaffEmails.has(s.email.toLowerCase()) &&
            s.role !== 'moderator'
        );
        return clean;
      }
    } catch {}
  }
  return INITIAL_STAFF.filter(
    (s) => !deletedStaffIds.has(s.id) && !deletedStaffEmails.has(s.email.toLowerCase())
  );
}

export async function saveStaffToDB(staff: StaffUser): Promise<void> {
  // If restoring or registering a staff, remove from deleted tombstones
  try {
    const cachedDeleted = localStorage.getItem('kenax_deleted_staff_cache');
    if (cachedDeleted) {
      const parsed = JSON.parse(cachedDeleted);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((item) => {
          if (typeof item === 'string') return item !== staff.id;
          return item.id !== staff.id && item.email !== staff.email?.toLowerCase();
        });
        safeSetLocalStorage('kenax_deleted_staff_cache', JSON.stringify(filtered));
      }
    }
    await deleteDoc(doc(db, 'deletedStaff', staff.id));
  } catch {}

  try {
    await setDoc(doc(db, 'staff', staff.id), staff);
  } catch (err) {
    console.warn('[KenaX BD] Firestore saveStaffToDB fallback:', err);
  }

  // Sync to central server store
  fetch('/api/staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(staff),
  }).catch(() => {});

  const cached = localStorage.getItem('kenax_staff_cache');
  let list: StaffUser[] = cached ? JSON.parse(cached) : INITIAL_STAFF;
  const idx = list.findIndex((s) => s.id === staff.id);
  if (idx >= 0) {
    list[idx] = staff;
  } else {
    list.push(staff);
  }
  safeSetLocalStorage('kenax_staff_cache', JSON.stringify(list));
}

export async function deleteStaffFromDB(staffId: string, staffEmail?: string): Promise<void> {
  // 1. Delete from central server store
  fetch(`/api/staff/${encodeURIComponent(staffId)}`, {
    method: 'DELETE',
  }).catch(() => {});

  // 2. Delete from Firestore staff collection
  try {
    await deleteDoc(doc(db, 'staff', staffId));
  } catch (err) {
    console.warn('[KenaX BD] Firestore deleteStaffFromDB error:', err);
  }

  // 2. Add permanent tombstone to deletedStaff collection in Firestore
  try {
    await setDoc(doc(db, 'deletedStaff', staffId), {
      id: staffId,
      email: (staffEmail || '').toLowerCase(),
      deletedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[KenaX BD] Firestore record deletedStaff error:', err);
  }

  // 3. Update local deleted staff cache
  try {
    const cachedDeleted = localStorage.getItem('kenax_deleted_staff_cache');
    const list: { id: string; email?: string }[] = cachedDeleted ? JSON.parse(cachedDeleted) : [];
    if (!list.some((item) => item.id === staffId || (staffEmail && item.email === staffEmail.toLowerCase()))) {
      list.push({ id: staffId, email: (staffEmail || '').toLowerCase() });
      safeSetLocalStorage('kenax_deleted_staff_cache', JSON.stringify(list));
    }
  } catch {}

  // 4. Clean local staff cache
  const cached = localStorage.getItem('kenax_staff_cache');
  if (cached) {
    try {
      let list: StaffUser[] = JSON.parse(cached);
      list = list.filter((s) => s.id !== staffId && (!staffEmail || s.email.toLowerCase() !== staffEmail.toLowerCase()));
      safeSetLocalStorage('kenax_staff_cache', JSON.stringify(list));
    } catch {}
  }

  // 5. Invalidate active staff session if this staff is currently signed in
  try {
    const activeStaffRaw = localStorage.getItem('kenax_admin_session');
    if (activeStaffRaw) {
      const active = JSON.parse(activeStaffRaw);
      if (active && (active.id === staffId || (staffEmail && active.email?.toLowerCase() === staffEmail.toLowerCase()))) {
        localStorage.removeItem('kenax_admin_session');
      }
    }
  } catch {}
}

// ----------------------------------------------------
// CUSTOMERS OPERATIONS
// ----------------------------------------------------
// Fetch single customer record directly from Firestore (for fresh profile sync across devices)
export async function fetchCustomerRecordFromDB(customerId: string): Promise<CustomerRecord | null> {
  if (!customerId) return null;

  // Check if customer was deleted
  try {
    const cachedDeleted = localStorage.getItem('kenax_deleted_customers_cache');
    if (cachedDeleted) {
      const deletedIds: string[] = JSON.parse(cachedDeleted);
      if (Array.isArray(deletedIds) && deletedIds.includes(customerId)) {
        return null;
      }
    }
  } catch {}

  try {
    const docRef = doc(db, 'customers', customerId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as CustomerRecord;
      if (data && data.isV2Account) {
        return data;
      } else {
        deleteDoc(docRef).catch(() => {});
        return null;
      }
    }
  } catch (err) {
    console.warn('[KenaX BD] fetchCustomerRecordFromDB fallback check:', err);
  }

  // Fallback to local cache or all customers scan
  const allCusts = await getCustomersFromDB();
  return allCusts.find((c) => c.id === customerId) || null;
}

// Central Server Customers Helper
export async function fetchServerCustomers(): Promise<CustomerRecord[]> {
  try {
    const res = await fetch('/api/customers');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {}
  return [];
}

export async function getCustomersFromDB(): Promise<CustomerRecord[]> {
  // 1. Gather deleted customers tombstone set
  const deletedCustomerIds = new Set<string>();
  try {
    const cachedDeleted = localStorage.getItem('kenax_deleted_customers_cache');
    if (cachedDeleted) {
      const parsed: string[] = JSON.parse(cachedDeleted);
      if (Array.isArray(parsed)) parsed.forEach((id) => deletedCustomerIds.add(id));
    }
  } catch {}

  try {
    const deletedSnap = await getDocs(collection(db, 'deletedCustomers'));
    if (deletedSnap && !deletedSnap.empty) {
      deletedSnap.forEach((d) => deletedCustomerIds.add(d.id));
      safeSetLocalStorage('kenax_deleted_customers_cache', JSON.stringify(Array.from(deletedCustomerIds)));
    }
  } catch {}

  // 2. Fetch customers from central server
  const serverCustomers = await fetchServerCustomers();

  // 3. Read local cached customers and purge any deleted items
  let localCache: CustomerRecord[] = [];
  try {
    const cached = localStorage.getItem('kenax_customers_cache');
    if (cached) {
      const parsed: CustomerRecord[] = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        localCache = parsed.filter((c) => c && c.id && !deletedCustomerIds.has(c.id));
      }
    }
  } catch {}

  try {
    const colRef = collection(db, 'customers');
    const snapshot = await getDocs(colRef);
    if (snapshot) {
      const dbItems: CustomerRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CustomerRecord;
        if (deletedCustomerIds.has(docSnap.id) || (data && data.id && deletedCustomerIds.has(data.id))) {
          // Permanently cleanup deleted customer document from Firestore
          deleteDoc(doc(db, 'customers', docSnap.id)).catch(() => {});
        } else if (data && data.isV2Account) {
          dbItems.push(data);
        } else {
          // Permanently delete legacy customer document from Firestore
          deleteDoc(doc(db, 'customers', docSnap.id)).catch(() => {});
        }
      });

      const cleanLocal = localCache.filter((c) => c && c.id && !deletedCustomerIds.has(c.id));
      const cleanDb = [...dbItems, ...serverCustomers].filter((c) => c && c.id && !deletedCustomerIds.has(c.id));
      const merged = mergeCustomersLists(cleanLocal, cleanDb).filter((c) => c && c.id && !deletedCustomerIds.has(c.id));
      safeSetLocalStorage('kenax_customers_cache', JSON.stringify(merged));

      return merged;
    }
  } catch (err) {
    console.warn('[KenaX BD] Firestore getCustomersFromDB fallback to local/server cache:', err);
  }

  const cleanList = mergeCustomersLists(localCache, serverCustomers).filter((c) => c && c.id && !deletedCustomerIds.has(c.id));
  safeSetLocalStorage('kenax_customers_cache', JSON.stringify(cleanList));
  return cleanList;
}

export async function updateCustomerInDB(
  customerId: string,
  updates: Partial<CustomerRecord>
): Promise<void> {
  if (!customerId) return;
  if (customerId.startsWith('staff-cust-')) {
    // For staff preview, only update local active customer session if active
    const activeCustomerRaw = localStorage.getItem('kenax_current_customer');
    if (activeCustomerRaw) {
      try {
        const activeCust: CustomerRecord = JSON.parse(activeCustomerRaw);
        if (activeCust.id === customerId) {
          safeSetLocalStorage('kenax_current_customer', JSON.stringify({ ...activeCust, ...updates }));
        }
      } catch {}
    }
    return;
  }

  // Sync to central server store
  fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: customerId, ...updates, isV2Account: true }),
  }).catch((err) => console.warn('[KenaX BD] Server update customer error:', err));

  try {
    await setDoc(doc(db, 'customers', customerId), updates, { merge: true });
  } catch (err) {
    console.warn('[KenaX BD] Firestore updateCustomerInDB fallback:', err);
  }

  let localCache: CustomerRecord[] = [];
  try {
    const cached = localStorage.getItem('kenax_customers_cache');
    if (cached) localCache = JSON.parse(cached);
  } catch {}

  const idx = localCache.findIndex((c) => c.id === customerId);
  if (idx >= 0) {
    localCache[idx] = { ...localCache[idx], ...updates, isV2Account: true };
  }
  const merged = mergeCustomersLists(INITIAL_CUSTOMERS, localCache);
  safeSetLocalStorage('kenax_customers_cache', JSON.stringify(merged));

  // Also sync active logged-in customer if ID matches
  const activeCustomerRaw = localStorage.getItem('kenax_current_customer');
  if (activeCustomerRaw) {
    try {
      const activeCust: CustomerRecord = JSON.parse(activeCustomerRaw);
      if (activeCust.id === customerId) {
        const mergedActive = { ...activeCust, ...updates, isV2Account: true };
        safeSetLocalStorage('kenax_current_customer', JSON.stringify(mergedActive));
      }
    } catch {}
  }
}

export async function deleteCustomerFromDB(customerId: string): Promise<void> {
  // 1. Delete from central server store immediately
  fetch(`/api/customers/${encodeURIComponent(customerId)}`, {
    method: 'DELETE',
  }).catch((err) => console.warn('[KenaX BD] Server deleteCustomerFromDB error:', err));

  // 2. Add to local deleted tombstones set immediately
  try {
    const cachedDeleted = localStorage.getItem('kenax_deleted_customers_cache');
    const deletedIds: string[] = cachedDeleted ? JSON.parse(cachedDeleted) : [];
    if (!deletedIds.includes(customerId)) {
      deletedIds.push(customerId);
      safeSetLocalStorage('kenax_deleted_customers_cache', JSON.stringify(deletedIds));
    }
  } catch {}

  // 3. Remove from local customer cache
  try {
    const cached = localStorage.getItem('kenax_customers_cache');
    if (cached) {
      const list: CustomerRecord[] = JSON.parse(cached);
      const filtered = list.filter((c) => c.id !== customerId);
      safeSetLocalStorage('kenax_customers_cache', JSON.stringify(filtered));
    }
  } catch {}

  // 4. Clear active customer session if it matches
  try {
    const activeRaw = localStorage.getItem('kenax_current_customer');
    if (activeRaw) {
      const activeCust = JSON.parse(activeRaw);
      if (activeCust.id === customerId) {
        localStorage.removeItem('kenax_current_customer');
      }
    }
  } catch {}

  // 5. Delete document from Firestore customers collection
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (err) {
    console.warn('[KenaX BD] Firestore deleteCustomerFromDB fallback:', err);
  }

  // 6. Add tombstone to Firestore deletedCustomers collection
  try {
    await setDoc(doc(db, 'deletedCustomers', customerId), {
      id: customerId,
      deletedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[KenaX BD] Firestore record deletedCustomers error:', err);
  }

  // CRITICAL REQUIREMENT: ORDERS ARE KEPT 100% INTACT!
  // Pending orders and past order histories are NEVER deleted. They remain securely in Firestore orders collection.
}

export async function saveCustomerToDB(customer: CustomerRecord): Promise<void> {
  if (!customer || !customer.id) return;
  if (customer.id.startsWith('staff-cust-')) {
    // Never persist staff storefront preview sessions to database
    try {
      safeSetLocalStorage('kenax_current_customer', JSON.stringify(customer));
    } catch {}
    return;
  }

  const customerWithV2: CustomerRecord = {
    ...customer,
    isV2Account: true,
  };
  const cleaned: any = cleanFirestoreData(customerWithV2);

  // Strip excessive base64 images from cart items to avoid Firestore size limit and performance degradation
  if (cleaned && Array.isArray(cleaned.cart)) {
    cleaned.cart = cleaned.cart.map((item: any) => ({
      ...item,
      productImage: item.productImage && item.productImage.startsWith('data:') ? '' : item.productImage,
    }));
  }

  // If newly registering or recreating, remove this customer ID from deleted tombstones
  try {
    const cachedDeleted = localStorage.getItem('kenax_deleted_customers_cache');
    if (cachedDeleted) {
      const parsed: string[] = JSON.parse(cachedDeleted);
      const filtered = parsed.filter((id) => id !== customer.id);
      safeSetLocalStorage('kenax_deleted_customers_cache', JSON.stringify(filtered));
    }
    await deleteDoc(doc(db, 'deletedCustomers', customer.id));
  } catch {}

  // 1. Immediately update local customers cache with safe merging
  let localCache: CustomerRecord[] = [];
  try {
    const cached = localStorage.getItem('kenax_customers_cache');
    if (cached) localCache = JSON.parse(cached);
  } catch {}

  const filteredLocal = localCache.filter((c) => c.id !== customer.id);
  const merged = mergeCustomersLists(filteredLocal, [cleaned]);
  safeSetLocalStorage('kenax_customers_cache', JSON.stringify(merged));

  // 2. Immediately sync active customer in localStorage if active
  const activeCustomerRaw = localStorage.getItem('kenax_current_customer');
  if (activeCustomerRaw) {
    try {
      const activeCust: CustomerRecord = JSON.parse(activeCustomerRaw);
      if (activeCust.id === customer.id || (activeCust.email && activeCust.email.toLowerCase() === customer.email.toLowerCase())) {
        safeSetLocalStorage('kenax_current_customer', JSON.stringify({ ...activeCust, ...cleaned }));
      }
    } catch {}
  } else {
    safeSetLocalStorage('kenax_current_customer', JSON.stringify(cleaned));
  }

  // 3. Save directly to Firestore with merge: true
  try {
    await setDoc(doc(db, 'customers', customer.id), cleaned, { merge: true });
  } catch (err) {
    console.warn('[KenaX BD] Firestore saveCustomerToDB fallback:', err);
  }

  // 4. Save to central server store for cross-device cloud persistence
  fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleaned),
  }).catch((err) => console.warn('[KenaX BD] Server saveCustomerToDB fallback:', err));
}

// Helper to clean object for Firestore to avoid "Unsupported field value: undefined" errors
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned;
  }
  return obj;
}

// ----------------------------------------------------
// ACTIVITY LOGS (PERMANENT AUDIT TRAIL)
// ----------------------------------------------------

/**
 * Flushes any pending activity logs queued during offline or connection disruptions
 */
export async function syncPendingActivityLogs(): Promise<void> {
  try {
    const pendingRaw = localStorage.getItem('kenax_pending_activity_logs');
    if (!pendingRaw) return;
    const pendingLogs: ActivityLog[] = JSON.parse(pendingRaw);
    if (!Array.isArray(pendingLogs) || pendingLogs.length === 0) return;

    const remaining: ActivityLog[] = [];
    for (const log of pendingLogs) {
      try {
        const cleaned = cleanFirestoreData(log);
        await setDoc(doc(db, 'activityLogs', log.id), cleaned, { merge: true });
      } catch (err) {
        console.warn(`[KenaX BD] Failed to flush pending log #${log.id} to Firestore:`, err);
        remaining.push(log);
      }
    }
    if (remaining.length > 0) {
      safeSetLocalStorage('kenax_pending_activity_logs', JSON.stringify(remaining));
    } else {
      localStorage.removeItem('kenax_pending_activity_logs');
    }
  } catch (err) {
    console.warn('[KenaX BD] syncPendingActivityLogs error:', err);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[KenaX BD] Online detected - Flushing pending activity logs to Cloud Firestore...');
    syncPendingActivityLogs().catch(() => {});
  });
}

export async function getActivityLogsFromDB(): Promise<ActivityLog[]> {
  // Always attempt to flush any pending offline logs first
  await syncPendingActivityLogs().catch(() => {});

  try {
    const colRef = collection(db, 'activityLogs');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const items: ActivityLog[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as ActivityLog));
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      safeSetLocalStorage('kenax_activity_logs_cache', JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.warn('[KenaX BD] Firestore getActivityLogsFromDB fallback:', err);
  }

  const cached = localStorage.getItem('kenax_activity_logs_cache');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return INITIAL_ACTIVITY_LOGS;
}

export async function logActivityToDB(
  log: Omit<ActivityLog, 'id' | 'timestamp'> | ActivityLog
): Promise<ActivityLog> {
  const logId = (log as ActivityLog).id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = (log as ActivityLog).timestamp || new Date().toISOString();

  const newLog: ActivityLog = {
    ...log,
    id: logId,
    timestamp,
    ipAddress: (log as any).ipAddress || (log as any).ip || '103.145.118.24',
  };

  const cleaned = cleanFirestoreData(newLog);

  // 1. Instantly update local cache
  try {
    const cached = localStorage.getItem('kenax_activity_logs_cache');
    let logs: ActivityLog[] = cached ? JSON.parse(cached) : INITIAL_ACTIVITY_LOGS;
    const existingIndex = logs.findIndex((l) => l.id === newLog.id);
    if (existingIndex >= 0) {
      logs[existingIndex] = newLog;
    } else {
      logs.unshift(newLog);
    }
    safeSetLocalStorage('kenax_activity_logs_cache', JSON.stringify(logs));
  } catch (e) {
    console.error('[KenaX BD] Cache error in logActivityToDB:', e);
  }

  // 2. Persist permanently to Cloud Firestore
  try {
    await setDoc(doc(db, 'activityLogs', newLog.id), cleaned, { merge: true });
    // Flush any pending logs as well
    syncPendingActivityLogs().catch(() => {});
  } catch (err) {
    console.warn('[KenaX BD] Firestore logActivityToDB offline fallback (queued in pending):', err);
    try {
      const pendingRaw = localStorage.getItem('kenax_pending_activity_logs');
      const pendingList: ActivityLog[] = pendingRaw ? JSON.parse(pendingRaw) : [];
      if (!pendingList.some((p) => p.id === newLog.id)) {
        pendingList.push(newLog);
        safeSetLocalStorage('kenax_pending_activity_logs', JSON.stringify(pendingList));
      }
    } catch {}
  }

  return newLog;
}

export function subscribeToActivityLogs(onLogsChanged: (logs: ActivityLog[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'activityLogs');
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const items: ActivityLog[] = [];
          snapshot.forEach((docSnap) => items.push(docSnap.data() as ActivityLog));
          items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          safeSetLocalStorage('kenax_activity_logs_cache', JSON.stringify(items));
          onLogsChanged(items);
        }
      },
      (error) => {
        console.warn('[KenaX BD] Activity logs real-time listener error:', error);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToActivityLogs setup failed:', e);
    return () => {};
  }
}

// ----------------------------------------------------
// INVENTORY LOGS (STOCK ADJUSTMENTS)
// ----------------------------------------------------
export async function getStockLogsFromDB(): Promise<StockLog[]> {
  try {
    const colRef = collection(db, 'inventoryLogs');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const items: StockLog[] = [];
      snapshot.forEach((doc) => items.push(doc.data() as StockLog));
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      safeSetLocalStorage('kenax_stock_logs_cache', JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.warn('[KenaX BD] Firestore getStockLogsFromDB fallback:', err);
  }

  const cached = localStorage.getItem('kenax_stock_logs_cache');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }
  return INITIAL_STOCK_LOGS;
}

export async function logStockAdjustmentToDB(
  log: Omit<StockLog, 'id' | 'timestamp'>
): Promise<StockLog> {
  const newLog: StockLog = {
    ...log,
    id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'inventoryLogs', newLog.id), newLog);
  } catch (err) {
    console.warn('[KenaX BD] Firestore logStockAdjustmentToDB fallback:', err);
  }

  const cached = localStorage.getItem('kenax_stock_logs_cache');
  let logs: StockLog[] = cached ? JSON.parse(cached) : INITIAL_STOCK_LOGS;
  logs.unshift(newLog);
  safeSetLocalStorage('kenax_stock_logs_cache', JSON.stringify(logs.slice(0, 200)));
  return newLog;
}

// ----------------------------------------------------
// ADMIN NOTIFICATIONS
// ----------------------------------------------------
export async function getNotificationsFromDB(): Promise<AdminNotification[]> {
  const cached = localStorage.getItem('kenax_notifs_cache');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }
  return INITIAL_NOTIFICATIONS;
}

export async function markNotificationReadInDB(notifId: string): Promise<void> {
  const cached = localStorage.getItem('kenax_notifs_cache');
  let list: AdminNotification[] = cached ? JSON.parse(cached) : INITIAL_NOTIFICATIONS;
  list = list.map((n) => (n.id === notifId ? { ...n, isRead: true } : n));
  safeSetLocalStorage('kenax_notifs_cache', JSON.stringify(list));
}

export async function addNotificationToDB(
  notif: Omit<AdminNotification, 'id' | 'createdAt'>
): Promise<AdminNotification> {
  const newNotif: AdminNotification = {
    ...notif,
    id: `notif-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const cached = localStorage.getItem('kenax_notifs_cache');
  let list: AdminNotification[] = cached ? JSON.parse(cached) : INITIAL_NOTIFICATIONS;
  list.unshift(newNotif);
  safeSetLocalStorage('kenax_notifs_cache', JSON.stringify(list));
  return newNotif;
}

// ----------------------------------------------------
// CART ACTIVITIES (LIVE CART TRACKING)
// ----------------------------------------------------
export async function getCartActivitiesFromDB(): Promise<import('../types').CartActivity[]> {
  try {
    const colRef = collection(db, 'cartActivities');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const items: import('../types').CartActivity[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as import('../types').CartActivity;
        if (data && data.items && data.items.length > 0) {
          items.push(data);
        }
      });
      items.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      safeSetCartActivitiesCache(items);
      return items;
    }
  } catch (err) {
    console.warn('[KenaX BD] Firestore getCartActivitiesFromDB fallback:', err);
  }

  const cached = localStorage.getItem('kenax_cart_activities_cache');
  if (cached) {
    try {
      const list: import('../types').CartActivity[] = JSON.parse(cached);
      return list.filter((c) => c && c.items && c.items.length > 0);
    } catch {}
  }
  return [];
}

export function subscribeToCartActivities(
  onData: (items: import('../types').CartActivity[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const colRef = collection(db, 'cartActivities');
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const items: import('../types').CartActivity[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as import('../types').CartActivity;
          if (data && data.items && data.items.length > 0) {
            items.push(data);
          }
        });
        items.sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        );
        safeSetCartActivitiesCache(items);
        onData(items);
      },
      (error) => {
        console.warn('[KenaX BD] subscribeToCartActivities onSnapshot error:', error);
        if (onError) onError(error);
      }
    );
    return unsub;
  } catch (err) {
    console.warn('[KenaX BD] subscribeToCartActivities init error:', err);
    return () => {};
  }
}

export async function saveCartActivityToDB(cart: import('../types').CartActivity): Promise<void> {
  cart.isV2Activity = true;
  try {
    await setDoc(doc(db, 'cartActivities', cart.id), cart);
  } catch (err) {
    console.warn('[KenaX BD] Firestore saveCartActivityToDB fallback:', err);
  }

  try {
    const cached = localStorage.getItem('kenax_cart_activities_cache');
    let list: import('../types').CartActivity[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      list[idx] = cart;
    } else {
      list.unshift(cart);
    }
    safeSetCartActivitiesCache(list);
  } catch (e) {
    console.warn('[KenaX BD] saveCartActivityToDB local cache error:', e);
  }
}

export async function updateCartActivityStatusInDB(
  cartId: string,
  status: 'active' | 'converted' | 'abandoned' | 'contacted',
  extra?: { notes?: string; lastFollowUpBy?: string; lastFollowUpAt?: string }
): Promise<void> {
  const updateData: any = {
    status,
    updatedAt: new Date().toISOString(),
    ...(extra || {}),
  };
  try {
    await updateDoc(doc(db, 'cartActivities', cartId), updateData);
  } catch (err) {
    console.warn('[KenaX BD] Firestore updateCartActivityStatusInDB fallback:', err);
  }

  try {
    const cached = localStorage.getItem('kenax_cart_activities_cache');
    let list: import('../types').CartActivity[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex((c) => c.id === cartId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updateData };
      safeSetCartActivitiesCache(list);
    }
  } catch (e) {
    console.warn('[KenaX BD] updateCartActivityStatusInDB local cache error:', e);
  }
}

export async function deleteCartActivityFromDB(cartId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'cartActivities', cartId));
  } catch (err) {
    console.warn('[KenaX BD] Firestore deleteCartActivityFromDB fallback:', err);
  }

  const cached = localStorage.getItem('kenax_cart_activities_cache');
  if (cached) {
    try {
      const list: import('../types').CartActivity[] = JSON.parse(cached);
      safeSetCartActivitiesCache(list.filter((c) => c.id !== cartId));
    } catch {}
  }
}

// ----------------------------------------------------
// HERO BANNER VIDEO CHUNKED FIRESTORE STORAGE
// ----------------------------------------------------
const VIDEO_CHUNK_SIZE = 700000; // ~700KB per chunk to safely stay within Firestore 1MB document limit

export async function saveHeroVideoToFirestore(slideId: string, videoDataUrl: string): Promise<void> {
  if (!slideId || !videoDataUrl) return;
  try {
    const totalChunks = Math.ceil(videoDataUrl.length / VIDEO_CHUNK_SIZE);
    
    // 1. Write meta document
    const metaRef = doc(db, 'heroBannerVideos', slideId);
    await setDoc(metaRef, {
      slideId,
      totalChunks,
      length: videoDataUrl.length,
      updatedAt: new Date().toISOString(),
    });

    // 2. Write chunk sub-documents
    for (let i = 0; i < totalChunks; i++) {
      const chunkData = videoDataUrl.substring(i * VIDEO_CHUNK_SIZE, (i + 1) * VIDEO_CHUNK_SIZE);
      const chunkRef = doc(db, 'heroBannerVideos', slideId, 'chunks', `chunk_${i}`);
      await setDoc(chunkRef, {
        index: i,
        data: chunkData,
      });
    }
    console.log(`[KenaX BD] Successfully saved hero banner video (${totalChunks} chunks) to Firestore for slide: ${slideId}`);
  } catch (err) {
    console.error(`[KenaX BD] Error saving hero video to Firestore for slide ${slideId}:`, err);
  }
}

export async function loadHeroVideoFromFirestore(slideId: string): Promise<string | null> {
  if (!slideId) return null;
  try {
    const metaRef = doc(db, 'heroBannerVideos', slideId);
    const metaSnap = await getDoc(metaRef);
    if (!metaSnap.exists()) return null;

    const { totalChunks } = metaSnap.data();
    if (!totalChunks || totalChunks <= 0) return null;

    const chunkPromises = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkRef = doc(db, 'heroBannerVideos', slideId, 'chunks', `chunk_${i}`);
      chunkPromises.push(getDoc(chunkRef));
    }

    const chunkSnaps = await Promise.all(chunkPromises);
    let fullDataUrl = '';
    for (const cSnap of chunkSnaps) {
      if (cSnap.exists()) {
        fullDataUrl += cSnap.data().data || '';
      }
    }

    return fullDataUrl || null;
  } catch (err) {
    console.error(`[KenaX BD] Error loading hero video from Firestore for slide ${slideId}:`, err);
    return null;
  }
}

export async function deleteHeroVideoFromFirestore(slideId: string): Promise<void> {
  if (!slideId) return;
  try {
    const metaRef = doc(db, 'heroBannerVideos', slideId);
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) {
      const { totalChunks } = metaSnap.data();
      if (totalChunks && totalChunks > 0) {
        for (let i = 0; i < totalChunks; i++) {
          const chunkRef = doc(db, 'heroBannerVideos', slideId, 'chunks', `chunk_${i}`);
          await deleteDoc(chunkRef);
        }
      }
      await deleteDoc(metaRef);
    }
    console.log(`[KenaX BD] Permanently deleted hero video for slide: ${slideId}`);
  } catch (err) {
    console.error(`[KenaX BD] Error deleting hero video from Firestore for slide ${slideId}:`, err);
  }
}

export async function hydrateHeroVideosInSettings(settings: WebsiteSettings): Promise<WebsiteSettings> {
  if (!settings || !settings.heroBanners || !Array.isArray(settings.heroBanners)) {
    return settings;
  }

  const updatedBanners = [...settings.heroBanners];
  let changed = false;

  for (let i = 0; i < updatedBanners.length; i++) {
    const slide = updatedBanners[i];
    if (slide.mediaType === 'video') {
      if (
        slide.videoUrl?.startsWith('firestore_video:') ||
        slide.videoUrl === 'data_video_stored_in_db' ||
        !slide.videoUrl ||
        !slide.videoUrl.startsWith('data:video')
      ) {
        const fullVideo = await loadHeroVideoFromFirestore(slide.id);
        if (fullVideo) {
          updatedBanners[i] = { ...slide, videoUrl: fullVideo };
          changed = true;
        }
      }
    }
  }

  return changed ? { ...settings, heroBanners: updatedBanners } : settings;
}

// ----------------------------------------------------
// WEBSITE SETTINGS OPERATIONS
// ----------------------------------------------------
export async function getSettingsFromDB(): Promise<WebsiteSettings> {
  try {
    const docRef = doc(db, 'websiteSettings', INITIAL_WEBSITE_SETTINGS.id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      let data = snap.data() as WebsiteSettings;
      data = await hydrateHeroVideosInSettings(data);
      safeSetLocalStorage('kenax_settings_cache', JSON.stringify(data));
      safeSetLocalStorage('kenax_site_settings', JSON.stringify(data));
      try {
        await setIdbItem('kenax_settings_backup', JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn('[KenaX BD] Firestore getSettingsFromDB fallback:', err);
  }

  try {
    const idbData = await getIdbItem('kenax_settings_backup');
    if (idbData) {
      return JSON.parse(idbData);
    }
  } catch {}

  const cached = localStorage.getItem('kenax_settings_cache') || localStorage.getItem('kenax_site_settings');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }
  return INITIAL_WEBSITE_SETTINGS;
}

export async function saveSettingsToDB(settings: any): Promise<void> {
  let fullMergedSettings = settings;
  try {
    // Merge with existing settings from DB/cache so partial updates never wipe other fields
    const currentSettings = await getSettingsFromDB().catch(() => INITIAL_WEBSITE_SETTINGS);
    fullMergedSettings = {
      ...currentSettings,
      ...settings,
      id: settings.id || currentSettings.id || INITIAL_WEBSITE_SETTINGS.id,
      tagCollectionBanners: {
        ...(currentSettings.tagCollectionBanners || {}),
        ...(settings.tagCollectionBanners || {}),
      },
    };

    const settingsToSave = JSON.parse(JSON.stringify(fullMergedSettings));

    // If hero banners contain device video data URLs, save video data in chunked Firestore collection
    if (settingsToSave.heroBanners && Array.isArray(settingsToSave.heroBanners)) {
      for (const slide of settingsToSave.heroBanners) {
        if (slide.mediaType === 'video' && slide.videoUrl && slide.videoUrl.startsWith('data:video')) {
          await saveHeroVideoToFirestore(slide.id, slide.videoUrl);
          // Store lightweight reference inside websiteSettings doc so doc size stays tiny and fast
          slide.videoUrl = `firestore_video:${slide.id}`;
        }
      }
    }

    const cleaned = cleanFirestoreData(settingsToSave);
    const docId = settingsToSave.id || INITIAL_WEBSITE_SETTINGS.id;
    
    // Use Promise.race with 4000ms timeout so Firestore save never hangs the UI
    const writePromise = setDoc(doc(db, 'websiteSettings', docId), cleaned, { merge: true });
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 4000));
    await Promise.race([writePromise, timeoutPromise]);
    console.log('[KenaX BD] Website settings permanently saved & synced.');
  } catch (err) {
    console.warn('[KenaX BD] Firestore saveSettingsToDB fallback:', err);
  }

  safeSetLocalStorage('kenax_settings_cache', JSON.stringify(fullMergedSettings));
  safeSetLocalStorage('kenax_site_settings', JSON.stringify(fullMergedSettings));
  try {
    await setIdbItem('kenax_settings_backup', JSON.stringify(fullMergedSettings));
  } catch {}
}

export async function saveHeroBannersToDB(heroBanners: HeroBannerItem[]): Promise<void> {
  try {
    const currentSettings = await getSettingsFromDB();
    const updatedSettings = {
      ...currentSettings,
      heroBanners,
    };
    await saveSettingsToDB(updatedSettings);
  } catch (err) {
    console.warn('[KenaX BD] Error in saveHeroBannersToDB:', err);
  }
}

export function subscribeToSettings(onSettingsChanged: (settings: WebsiteSettings) => void): Unsubscribe {
  try {
    const docRef = doc(db, 'websiteSettings', INITIAL_WEBSITE_SETTINGS.id);
    return onSnapshot(
      docRef,
      async (snap) => {
        if (snap.exists()) {
          let data = snap.data() as WebsiteSettings;
          data = await hydrateHeroVideosInSettings(data);
          safeSetLocalStorage('kenax_settings_cache', JSON.stringify(data));
          onSettingsChanged(data);
        }
      },
      (error) => {
        console.warn('[KenaX BD] Settings real-time listener error:', error);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToSettings setup failed:', e);
    return () => {};
  }
}

// ----------------------------------------------------
// CATEGORIES OPERATIONS
// ----------------------------------------------------
export async function getCategoriesFromDB(): Promise<Category[]> {
  let firestoreItems: Category[] = [];
  let firestoreDeletedIds: string[] = [];

  try {
    const deletedSnap = await getDocs(collection(db, 'deletedCategories'));
    if (!deletedSnap.empty) {
      deletedSnap.forEach((d) => firestoreDeletedIds.push(d.id));
    }
  } catch {}

  // Update local deleted category IDs
  if (firestoreDeletedIds.length > 0) {
    try {
      const rawDeleted = localStorage.getItem('kenax_deleted_category_ids');
      const localDeleted: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
      const combinedDeleted = Array.from(new Set([...localDeleted, ...firestoreDeletedIds]));
      safeSetLocalStorage('kenax_deleted_category_ids', JSON.stringify(combinedDeleted));
    } catch {}
  }

  try {
    const colRef = collection(db, 'categories');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      snapshot.forEach((docSnap) => {
        firestoreItems.push(docSnap.data() as Category);
      });
    }
  } catch (err) {
    console.warn('[KenaX BD] Firestore getCategoriesFromDB fallback:', err);
  }

  // Check local cache
  let cachedCategories: Category[] = [];
  try {
    const cached = localStorage.getItem('kenax_categories_cache');
    if (cached) {
      cachedCategories = JSON.parse(cached);
    }
  } catch {}

  // Merge default INITIAL_CATEGORIES + cached categories + live firestore categories
  const merged = mergeCategoriesLists(INITIAL_CATEGORIES, [...cachedCategories, ...firestoreItems]);

  // Ensure ALL INITIAL_CATEGORIES exist in Firestore if missing
  if (firestoreItems.length < INITIAL_CATEGORIES.length) {
    INITIAL_CATEGORIES.forEach((cat) => {
      if (!firestoreItems.some((fc) => fc.id === cat.id)) {
        setDoc(doc(db, 'categories', cat.id), cleanFirestoreData(cat), { merge: true }).catch(() => {});
      }
    });
  }

  if (merged.length > 0) {
    safeSetLocalStorage('kenax_categories_cache', JSON.stringify(merged));
    safeSetLocalStorage('kenax_categories', JSON.stringify(merged));
  }

  return merged;
}

export async function saveCategoryToDB(category: Category): Promise<void> {
  const cleaned = cleanFirestoreData(category);
  try {
    await setDoc(doc(db, 'categories', category.id), cleaned, { merge: true });
    await deleteDoc(doc(db, 'deletedCategories', category.id));
  } catch (err) {
    console.warn('[KenaX BD] Firestore saveCategoryToDB fallback:', err);
  }
  try {
    const rawDeleted = localStorage.getItem('kenax_deleted_category_ids');
    if (rawDeleted) {
      const deletedList: string[] = JSON.parse(rawDeleted);
      const filtered = deletedList.filter((id) => id !== category.id);
      safeSetLocalStorage('kenax_deleted_category_ids', JSON.stringify(filtered));
    }

    const cached = localStorage.getItem('kenax_categories_cache');
    let list: Category[] = cached ? JSON.parse(cached) : INITIAL_CATEGORIES;
    const idx = list.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      list[idx] = category;
    } else {
      list.push(category);
    }
    safeSetLocalStorage('kenax_categories_cache', JSON.stringify(list));
    safeSetLocalStorage('kenax_categories', JSON.stringify(list));
  } catch {}
}

export async function deleteCategoryFromDB(categoryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
    await setDoc(doc(db, 'deletedCategories', categoryId), { id: categoryId, deletedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('[KenaX BD] Firestore deleteCategoryFromDB fallback:', err);
  }
  try {
    const rawDeleted = localStorage.getItem('kenax_deleted_category_ids');
    const deletedList: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
    if (!deletedList.includes(categoryId)) {
      deletedList.push(categoryId);
      safeSetLocalStorage('kenax_deleted_category_ids', JSON.stringify(deletedList));
    }

    const cached = localStorage.getItem('kenax_categories_cache');
    if (cached) {
      const list: Category[] = JSON.parse(cached);
      const filtered = list.filter((c) => c.id !== categoryId);
      safeSetLocalStorage('kenax_categories_cache', JSON.stringify(filtered));
      safeSetLocalStorage('kenax_categories', JSON.stringify(filtered));
    }
  } catch {}
}

export function subscribeToCategories(onCategoriesChanged: (categories: Category[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'categories');
    return onSnapshot(
      colRef,
      async (snapshot) => {
        const firestoreItems: Category[] = [];
        snapshot.forEach((docSnap) => {
          firestoreItems.push(docSnap.data() as Category);
        });

        let firestoreDeletedIds: string[] = [];
        try {
          const deletedSnap = await getDocs(collection(db, 'deletedCategories'));
          if (!deletedSnap.empty) {
            deletedSnap.forEach((d) => firestoreDeletedIds.push(d.id));
          }
        } catch {}

        if (firestoreDeletedIds.length > 0) {
          try {
            const rawDeleted = localStorage.getItem('kenax_deleted_category_ids');
            const localDeleted: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
            const combinedDeleted = Array.from(new Set([...localDeleted, ...firestoreDeletedIds]));
            safeSetLocalStorage('kenax_deleted_category_ids', JSON.stringify(combinedDeleted));
          } catch {}
        }

        let cachedCategories: Category[] = [];
        try {
          const cached = localStorage.getItem('kenax_categories_cache');
          if (cached) {
            cachedCategories = JSON.parse(cached);
          }
        } catch {}

        // Merge with INITIAL_CATEGORIES and cached categories, excluding deleted IDs
        const merged = mergeCategoriesLists(INITIAL_CATEGORIES, [...cachedCategories, ...firestoreItems]);

        if (merged.length > 0) {
          safeSetLocalStorage('kenax_categories_cache', JSON.stringify(merged));
          safeSetLocalStorage('kenax_categories', JSON.stringify(merged));
          onCategoriesChanged(merged);
        }
      },
      (error) => {
        console.warn('[KenaX BD] Categories real-time listener error:', error);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToCategories setup failed:', e);
    return () => {};
  }
}

export function subscribeToCustomers(onCustomersChanged: (customers: CustomerRecord[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'customers');
    return onSnapshot(
      colRef,
      async (snapshot) => {
        const deletedCustomerIds = new Set<string>();
        try {
          const cachedDeleted = localStorage.getItem('kenax_deleted_customers_cache');
          if (cachedDeleted) {
            const parsed = JSON.parse(cachedDeleted);
            if (Array.isArray(parsed)) parsed.forEach((id) => deletedCustomerIds.add(id));
          }
        } catch {}

        try {
          const deletedSnap = await getDocs(collection(db, 'deletedCustomers'));
          if (deletedSnap && !deletedSnap.empty) {
            deletedSnap.forEach((d) => deletedCustomerIds.add(d.id));
            safeSetLocalStorage('kenax_deleted_customers_cache', JSON.stringify(Array.from(deletedCustomerIds)));
          }
        } catch {}

        const dbItems: CustomerRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as CustomerRecord;
          if (deletedCustomerIds.has(docSnap.id) || (data && data.id && deletedCustomerIds.has(data.id))) {
            deleteDoc(doc(db, 'customers', docSnap.id)).catch(() => {});
          } else if (data && data.id) {
            dbItems.push(data);
          }
        });

        // Invalidate active customer session if active user was deleted remotely
        try {
          const activeRaw = localStorage.getItem('kenax_current_customer');
          if (activeRaw) {
            const activeCust = JSON.parse(activeRaw);
            if (activeCust && (deletedCustomerIds.has(activeCust.id) || !dbItems.some((c) => c.id === activeCust.id))) {
              // Check if they are truly not in the db
              if (deletedCustomerIds.has(activeCust.id)) {
                localStorage.removeItem('kenax_current_customer');
              }
            }
          }
        } catch {}

        let localCache: CustomerRecord[] = [];
        try {
          const cached = localStorage.getItem('kenax_customers_cache');
          if (cached) localCache = JSON.parse(cached);
        } catch {}

        const cleanLocal = localCache.filter((c) => c && c.id && !deletedCustomerIds.has(c.id));
        const cleanDb = dbItems.filter((c) => c && c.id && !deletedCustomerIds.has(c.id));
        const merged = mergeCustomersLists(cleanLocal, cleanDb).filter((c) => c && c.id && !deletedCustomerIds.has(c.id));
        safeSetLocalStorage('kenax_customers_cache', JSON.stringify(merged));
        onCustomersChanged(merged);
      },
      (error) => {
        console.warn('[KenaX BD] Customers real-time listener error:', error);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToCustomers setup failed:', e);
    return () => {};
  }
}

// ----------------------------------------------------
// EMAIL LOGS & GMAIL ALERTS FIRESTORE STORAGE
// ----------------------------------------------------

/**
 * Flushes any pending email logs queued during offline or connection disruptions
 */
export async function syncPendingEmailLogs(): Promise<void> {
  try {
    const pendingRaw = localStorage.getItem('kenax_pending_email_logs');
    if (!pendingRaw) return;
    const pendingLogs: EmailLog[] = JSON.parse(pendingRaw);
    if (!Array.isArray(pendingLogs) || pendingLogs.length === 0) return;

    const remaining: EmailLog[] = [];
    for (const log of pendingLogs) {
      try {
        const cleaned = cleanFirestoreData(log);
        await setDoc(doc(db, 'emailLogs', log.id), cleaned, { merge: true });
      } catch (err) {
        console.warn(`[KenaX BD] Failed to flush pending email log #${log.id} to Firestore:`, err);
        remaining.push(log);
      }
    }
    if (remaining.length > 0) {
      safeSetLocalStorage('kenax_pending_email_logs', JSON.stringify(remaining));
    } else {
      localStorage.removeItem('kenax_pending_email_logs');
    }
  } catch (err) {
    console.warn('[KenaX BD] syncPendingEmailLogs error:', err);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncPendingEmailLogs().catch(() => {});
  });
}

export async function getEmailLogsFromDB(): Promise<EmailLog[]> {
  // Always flush any pending offline logs first
  await syncPendingEmailLogs().catch(() => {});

  try {
    const colRef = collection(db, 'emailLogs');
    const snap = await getDocs(colRef);
    const list: EmailLog[] = [];
    snap.forEach((d) => {
      const data = d.data() as EmailLog;
      if (data && data.id) list.push(data);
    });
    list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    safeSetLocalStorage('kenax_email_logs_cache', JSON.stringify(list.slice(0, 300)));
    return list;
  } catch (err) {
    console.warn('[KenaX BD] getEmailLogsFromDB failed, falling back to cache:', err);
    try {
      const cached = localStorage.getItem('kenax_email_logs_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }
}

export async function saveEmailLogToDB(log: EmailLog): Promise<void> {
  // Always cache locally first so UI updates immediately and offline data is never lost
  try {
    const cached = localStorage.getItem('kenax_email_logs_cache');
    const list: EmailLog[] = cached ? JSON.parse(cached) : [];
    const updated = [log, ...list.filter((l) => l.id !== log.id)].slice(0, 300);
    safeSetLocalStorage('kenax_email_logs_cache', JSON.stringify(updated));
  } catch {}

  try {
    const cleaned = cleanFirestoreData(log);
    const docRef = doc(db, 'emailLogs', log.id);
    await setDoc(docRef, cleaned, { merge: true });
    // Flush any pending logs as well
    syncPendingEmailLogs().catch(() => {});
  } catch (err) {
    console.warn('[KenaX BD] saveEmailLogToDB offline fallback (queued in pending):', err);
    try {
      const pendingRaw = localStorage.getItem('kenax_pending_email_logs');
      const pendingList: EmailLog[] = pendingRaw ? JSON.parse(pendingRaw) : [];
      if (!pendingList.some((p) => p.id === log.id)) {
        pendingList.push(log);
        safeSetLocalStorage('kenax_pending_email_logs', JSON.stringify(pendingList));
      }
    } catch {}
  }
}

export function subscribeToEmailLogs(callback: (logs: EmailLog[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'emailLogs');
    return onSnapshot(
      colRef,
      (snap) => {
        const list: EmailLog[] = [];
        snap.forEach((d) => {
          const data = d.data() as EmailLog;
          if (data && data.id) list.push(data);
        });
        list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        try {
          safeSetLocalStorage('kenax_email_logs_cache', JSON.stringify(list.slice(0, 300)));
        } catch {}
        callback(list);
      },
      (err) => {
        console.warn('[KenaX BD] subscribeToEmailLogs error:', err);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToEmailLogs setup failed:', e);
    return () => {};
  }
}

export async function getEmailTemplatesFromDB(): Promise<Record<string, EmailTemplate> | null> {
  try {
    const docRef = doc(db, 'websiteSettings', 'emailTemplates');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Record<string, EmailTemplate>;
    }
    return null;
  } catch (err) {
    console.warn('[KenaX BD] getEmailTemplatesFromDB failed:', err);
    return null;
  }
}

export async function saveEmailTemplatesToDB(templates: Record<string, EmailTemplate>): Promise<void> {
  try {
    const docRef = doc(db, 'websiteSettings', 'emailTemplates');
    await setDoc(docRef, templates, { merge: true });
    safeSetLocalStorage('kenax_email_templates_cache', JSON.stringify(templates));
  } catch (err) {
    console.warn('[KenaX BD] saveEmailTemplatesToDB failed:', err);
    safeSetLocalStorage('kenax_email_templates_cache', JSON.stringify(templates));
  }
}

export async function getGmailAlertSettingsFromDB(): Promise<GmailAlertSettings | null> {
  try {
    const docRef = doc(db, 'websiteSettings', 'gmailAlerts');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as GmailAlertSettings;
    }
    return null;
  } catch (err) {
    console.warn('[KenaX BD] getGmailAlertSettingsFromDB failed:', err);
    return null;
  }
}

export async function saveGmailAlertSettingsToDB(settings: GmailAlertSettings): Promise<void> {
  try {
    const docRef = doc(db, 'websiteSettings', 'gmailAlerts');
    await setDoc(docRef, settings, { merge: true });
    safeSetLocalStorage('kenax_gmail_alerts_settings', JSON.stringify(settings));
  } catch (err) {
    console.warn('[KenaX BD] saveGmailAlertSettingsToDB failed:', err);
    safeSetLocalStorage('kenax_gmail_alerts_settings', JSON.stringify(settings));
  }
}

// ----------------------------------------------------
// EXPENSES & DELIVERY COST ENTRIES
// ----------------------------------------------------
export const INITIAL_EXPENSES: ExpenseRecord[] = [];

export async function getExpensesFromDB(): Promise<ExpenseRecord[]> {
  try {
    const colRef = collection(db, 'expenses');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const items: ExpenseRecord[] = [];
      snapshot.forEach((docSnap) => items.push(docSnap.data() as ExpenseRecord));
      items.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
      safeSetLocalStorage('kenax_expenses_cache', JSON.stringify(items));
      return items;
    } else {
      safeSetLocalStorage('kenax_expenses_cache', JSON.stringify([]));
      return [];
    }
  } catch (err) {
    console.warn('[KenaX BD] getExpensesFromDB fallback:', err);
  }

  const cached = localStorage.getItem('kenax_expenses_cache');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export async function saveExpenseToDB(expense: ExpenseRecord): Promise<ExpenseRecord> {
  const expenseId = expense.id || `EXP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();
  const cleaned: ExpenseRecord = cleanFirestoreData({
    ...expense,
    id: expenseId,
    createdAt: expense.createdAt || nowIso,
    updatedAt: nowIso,
  });

  // 1. Instant Cache Update
  try {
    const cached = localStorage.getItem('kenax_expenses_cache');
    let list: ExpenseRecord[] = cached ? JSON.parse(cached) : [];
    const existingIndex = list.findIndex((e) => e.id === cleaned.id);
    if (existingIndex >= 0) {
      list[existingIndex] = cleaned;
    } else {
      list.unshift(cleaned);
    }
    safeSetLocalStorage('kenax_expenses_cache', JSON.stringify(list));
  } catch (e) {
    console.error('[KenaX BD] Expense cache error:', e);
  }

  // 2. Cloud Firestore Persistence
  try {
    await setDoc(doc(db, 'expenses', cleaned.id), cleaned, { merge: true });
  } catch (err) {
    console.warn('[KenaX BD] saveExpenseToDB firestore fallback:', err);
  }

  return cleaned;
}

export async function deleteExpenseFromDB(expenseId: string): Promise<boolean> {
  // 1. Cache Update
  try {
    const cached = localStorage.getItem('kenax_expenses_cache');
    if (cached) {
      let list: ExpenseRecord[] = JSON.parse(cached);
      list = list.filter((e) => e.id !== expenseId);
      safeSetLocalStorage('kenax_expenses_cache', JSON.stringify(list));
    }
  } catch (e) {
    console.error('[KenaX BD] Delete expense cache error:', e);
  }

  // 2. Cloud Firestore Deletion
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
    return true;
  } catch (err) {
    console.warn('[KenaX BD] deleteExpenseFromDB firestore fallback:', err);
    return false;
  }
}

export function subscribeToExpenses(onExpensesChanged: (expenses: ExpenseRecord[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'expenses');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: ExpenseRecord[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => items.push(docSnap.data() as ExpenseRecord));
          items.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
        }
        safeSetLocalStorage('kenax_expenses_cache', JSON.stringify(items));
        onExpensesChanged(items);
      },
      (error) => {
        console.warn('[KenaX BD] subscribeToExpenses error:', error);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToExpenses setup failed:', e);
    return () => {};
  }
}

// ----------------------------------------------------
// OTHERS PROFIT / EXTRA INCOME OPERATIONS
// ----------------------------------------------------
export async function getOtherProfitsFromDB(): Promise<OtherProfitRecord[]> {
  try {
    const colRef = collection(db, 'other_profits');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const items: OtherProfitRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as OtherProfitRecord;
        if (isDemoOtherProfit(data)) {
          // Asynchronously purge demo record from Firestore
          deleteDoc(doc(db, 'other_profits', docSnap.id)).catch(() => {});
        } else {
          items.push(data);
        }
      });
      items.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
      safeSetLocalStorage('kenax_other_profits_cache', JSON.stringify(items));
      return items;
    } else {
      safeSetLocalStorage('kenax_other_profits_cache', JSON.stringify([]));
      return [];
    }
  } catch (err) {
    console.warn('[KenaX BD] getOtherProfitsFromDB fallback:', err);
  }

  const cached = localStorage.getItem('kenax_other_profits_cache');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter((p) => !isDemoOtherProfit(p));
        safeSetLocalStorage('kenax_other_profits_cache', JSON.stringify(clean));
        return clean;
      }
    } catch {}
  }
  return [];
}

export async function saveOtherProfitToDB(record: OtherProfitRecord): Promise<OtherProfitRecord> {
  const profitId = record.id || `PRF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();
  const cleaned: OtherProfitRecord = cleanFirestoreData({
    ...record,
    id: profitId,
    createdAt: record.createdAt || nowIso,
    updatedAt: nowIso,
  });

  // 1. Instant Cache Update
  try {
    const cached = localStorage.getItem('kenax_other_profits_cache');
    let list: OtherProfitRecord[] = cached ? JSON.parse(cached) : [];
    const existingIndex = list.findIndex((p) => p.id === cleaned.id);
    if (existingIndex >= 0) {
      list[existingIndex] = cleaned;
    } else {
      list.unshift(cleaned);
    }
    safeSetLocalStorage('kenax_other_profits_cache', JSON.stringify(list));
  } catch (e) {
    console.error('[KenaX BD] Other profit cache error:', e);
  }

  // 2. Cloud Firestore Persistence
  try {
    await setDoc(doc(db, 'other_profits', cleaned.id), cleaned, { merge: true });
  } catch (err) {
    console.warn('[KenaX BD] saveOtherProfitToDB firestore fallback:', err);
  }

  return cleaned;
}

export async function deleteOtherProfitFromDB(profitId: string): Promise<boolean> {
  // 1. Cache Update
  try {
    const cached = localStorage.getItem('kenax_other_profits_cache');
    if (cached) {
      let list: OtherProfitRecord[] = JSON.parse(cached);
      list = list.filter((p) => p.id !== profitId);
      safeSetLocalStorage('kenax_other_profits_cache', JSON.stringify(list));
    }
  } catch (e) {
    console.error('[KenaX BD] Delete other profit cache error:', e);
  }

  // 2. Cloud Firestore Deletion
  try {
    await deleteDoc(doc(db, 'other_profits', profitId));
    return true;
  } catch (err) {
    console.warn('[KenaX BD] deleteOtherProfitFromDB firestore fallback:', err);
    return false;
  }
}

export function subscribeToOtherProfits(onProfitsChanged: (profits: OtherProfitRecord[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'other_profits');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: OtherProfitRecord[] = [];
        if (!snapshot.empty) {
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as OtherProfitRecord;
            if (isDemoOtherProfit(data)) {
              deleteDoc(doc(db, 'other_profits', docSnap.id)).catch(() => {});
            } else {
              items.push(data);
            }
          });
          items.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
        }
        safeSetLocalStorage('kenax_other_profits_cache', JSON.stringify(items));
        onProfitsChanged(items);
      },
      (error) => {
        console.warn('[KenaX BD] subscribeToOtherProfits error:', error);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToOtherProfits setup failed:', e);
    return () => {};
  }
}

// ==========================================
// SMS Settings & SMS Logs Firestore Helpers
// ==========================================

export async function getSMSSettingsFromDB(): Promise<SMSSettings | null> {
  try {
    const cached = localStorage.getItem('kenax_sms_settings_cache');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('[KenaX BD] Failed reading SMS settings cache:', e);
  }

  try {
    const snap = await getDoc(doc(db, 'settings', 'sms'));
    if (snap.exists()) {
      const data = snap.data() as SMSSettings;
      safeSetLocalStorage('kenax_sms_settings_cache', JSON.stringify(data));
      return data;
    }
  } catch (err) {
    console.warn('[KenaX BD] getSMSSettingsFromDB error:', err);
  }
  return null;
}

export async function saveSMSSettingsToDB(settings: SMSSettings): Promise<boolean> {
  try {
    safeSetLocalStorage('kenax_sms_settings_cache', JSON.stringify(settings));
    await setDoc(doc(db, 'settings', 'sms'), settings, { merge: true });
    return true;
  } catch (err) {
    console.warn('[KenaX BD] saveSMSSettingsToDB error:', err);
    return false;
  }
}

export async function getSMSLogsFromDB(): Promise<SMSLog[]> {
  try {
    const cached = localStorage.getItem('kenax_sms_logs_cache');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  try {
    const snap = await getDocs(collection(db, 'sms_logs'));
    const logs: SMSLog[] = [];
    snap.forEach((d) => logs.push(d.data() as SMSLog));
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    safeSetLocalStorage('kenax_sms_logs_cache', JSON.stringify(logs));
    return logs;
  } catch (err) {
    console.warn('[KenaX BD] getSMSLogsFromDB error:', err);
    return [];
  }
}

export async function saveSMSLogToDB(log: SMSLog): Promise<boolean> {
  try {
    const cached = localStorage.getItem('kenax_sms_logs_cache');
    const list: SMSLog[] = cached ? JSON.parse(cached) : [];
    const next = [log, ...list.filter((l) => l.id !== log.id)].slice(0, 100);
    safeSetLocalStorage('kenax_sms_logs_cache', JSON.stringify(next));

    await setDoc(doc(db, 'sms_logs', log.id), log);
    return true;
  } catch (err) {
    console.warn('[KenaX BD] saveSMSLogToDB error:', err);
    return false;
  }
}

export function subscribeToSMSLogs(onLogsChanged: (logs: SMSLog[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'sms_logs');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: SMSLog[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as SMSLog);
        });
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        safeSetLocalStorage('kenax_sms_logs_cache', JSON.stringify(items));
        onLogsChanged(items);
      },
      (error) => {
        console.warn('[KenaX BD] subscribeToSMSLogs error:', error);
      }
    );
  } catch (e) {
    return () => {};
  }
}

// ----------------------------------------------------
// PRODUCT REVIEWS & MODERATION (REAL + DEMO REVIEWS)
// ----------------------------------------------------
export async function getReviewsFromDB(): Promise<Review[]> {
  try {
    const colRef = collection(db, 'reviews');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      const items: Review[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Review;
        if (data && data.id) items.push(data);
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.warn('[KenaX BD] Firestore getReviewsFromDB fallback:', err);
  }

  const cached = localStorage.getItem('kenax_reviews_cache');
  if (cached) {
    try {
      const list: Review[] = JSON.parse(cached);
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {}
  }
  return INITIAL_REVIEWS;
}

export function subscribeToReviews(
  onReviewsChanged: (reviews: Review[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  try {
    const colRef = collection(db, 'reviews');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: Review[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Review;
          if (data && data.id) items.push(data);
        });
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(items));
        onReviewsChanged(items);
      },
      (error) => {
        console.warn('[KenaX BD] subscribeToReviews listener error:', error);
        if (onError) onError(error);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToReviews setup error:', e);
    return () => {};
  }
}

export async function saveReviewToDB(review: Review): Promise<void> {
  const cleaned = cleanFirestoreData(review);
  try {
    await setDoc(doc(db, 'reviews', review.id), cleaned, { merge: true });
  } catch (err) {
    console.warn('[KenaX BD] Firestore saveReviewToDB fallback:', err);
  }

  try {
    const cached = localStorage.getItem('kenax_reviews_cache');
    let list: Review[] = cached ? JSON.parse(cached) : INITIAL_REVIEWS;
    const idx = list.findIndex((r) => r.id === review.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...review };
    } else {
      list.unshift(review);
    }
    safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(list));
  } catch (e) {
    console.warn('[KenaX BD] saveReviewToDB local cache error:', e);
  }
}

export async function updateReviewInDB(review: Review): Promise<void> {
  await saveReviewToDB(review);
}

export async function deleteReviewFromDB(reviewId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch (err) {
    console.warn('[KenaX BD] Firestore deleteReviewFromDB fallback:', err);
  }

  try {
    const cached = localStorage.getItem('kenax_reviews_cache');
    if (cached) {
      const list: Review[] = JSON.parse(cached);
      const filtered = list.filter((r) => r.id !== reviewId);
      safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(filtered));
    }
  } catch (e) {}
}





