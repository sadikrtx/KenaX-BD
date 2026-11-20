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
  deleteField,
  runTransaction,
  serverTimestamp,
  Timestamp,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { safeSetLocalStorage, safeSetCartActivitiesCache, getIdbItem, setIdbItem } from './storage.ts';
import { getEnvCollectionName, getEnvStorageKey, getEnvApiHeaders, isPreviewEnvironment } from '../utils/envHelper.ts';
import {
  hashStaffPassword,
  verifyStaffPassword,
  stripStaffSecrets,
  isPasswordHash,
  saveStaffSession,
  clearStaffSession,
} from './passwordHash.ts';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import type { Product, Order, OrderStatus, Category, SubCategoryItem, WebsiteSettings, DeliveryZone, Coupon, OrderItem, HeroBannerItem, Review, Supplier, SourcingLocation } from '../types/index.ts';
import { INITIAL_PRODUCTS, PRODUCTION_PRODUCTS, DEMO_PRODUCT_IDS, isDemoProductId } from '../data/initialProducts.ts';
import { INITIAL_SUPPLIERS } from '../data/initialSuppliers.ts';
import { INITIAL_SOURCING_LOCATIONS } from '../data/initialSourcingLocations.ts';
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
} from '../data/initialSettings.ts';
import type {
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
  SMSSettings,
  SMSLog,
  NewsletterSubscriber,
} from '../types/index.ts';
import { isDemoOtherProfit } from '../types/index.ts';
import { NEUTRAL_PRODUCT_PLACEHOLDER } from '../utils/imageOptimizer.ts';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Set Firestore log level to silent early to prevent benign grpc/stream timeout noise
try {
  setLogLevel('silent');
} catch {}

// Filter benign internal Firestore idle stream recycling & fallback notices from polluting console
if (typeof window !== 'undefined') {
  const shouldSuppressFirestoreLog = (args: any[]): boolean => {
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
        return true;
      }
    } catch {}
    return false;
  };

  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    if (shouldSuppressFirestoreLog(args)) return;
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function (...args: any[]) {
    if (shouldSuppressFirestoreLog(args)) return;
    originalConsoleWarn.apply(console, args);
  };
}

// Initialize Firestore with specific Database ID & valid Firebase v11 auto-detect long polling
// NOTE: `experimentalForceLongPolling` and `experimentalAutoDetectLongPolling` are mutually exclusive in Firebase v11;
// passing both throws a validation error and silently drops the settings. Using `experimentalAutoDetectLongPolling: true`
// alone enables automatic fallback for restrictive proxies/iFrames without forcing unnecessary long-polling overhead.
// NOTE: `persistentLocalCache` is intentionally not enabled because the app coordinates dual preview/prod caches,
// an Express backend mirror, and a custom quota circuit breaker (`disableNetwork`), which avoids multi-tab IndexedDB lock contention.
const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
function createFirestoreInstance() {
  try {
    const firestoreSettings = {
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

// Lightweight 60s TTL tombstone caches to prevent nested `getDocs(deleted*)` scans on every onSnapshot emit
const TOMBSTONE_CACHE_TTL_MS = 60_000;
let deletedProductsCache: { ids: string[]; fetchedAt: number } | null = null;
let deletedCategoriesCache: { ids: string[]; fetchedAt: number } | null = null;
let deletedCustomersCache: { ids: string[]; fetchedAt: number } | null = null;

async function getCachedDeletedProductIds(): Promise<string[]> {
  if (deletedProductsCache && Date.now() - deletedProductsCache.fetchedAt < TOMBSTONE_CACHE_TTL_MS) {
    return deletedProductsCache.ids;
  }
  const ids: string[] = [];
  try {
    const deletedSnap = await getDocs(collection(db, 'deletedProducts'));
    if (!deletedSnap.empty) deletedSnap.forEach((d) => ids.push(d.id));
  } catch {}
  deletedProductsCache = { ids: Array.from(new Set(ids)), fetchedAt: Date.now() };
  return deletedProductsCache.ids;
}

async function getCachedDeletedCategoryIds(): Promise<string[]> {
  if (deletedCategoriesCache && Date.now() - deletedCategoriesCache.fetchedAt < TOMBSTONE_CACHE_TTL_MS) {
    return deletedCategoriesCache.ids;
  }
  const ids: string[] = [];
  if (!isQuotaExceededFlag) {
    try {
      const deletedSnap = await getDocs(collection(db, 'deletedCategories'));
      if (!deletedSnap.empty) deletedSnap.forEach((d) => ids.push(d.id));
    } catch {}
  }
  deletedCategoriesCache = { ids: Array.from(new Set(ids)), fetchedAt: Date.now() };
  return deletedCategoriesCache.ids;
}

async function getCachedDeletedCustomerIds(envCollectionName?: string): Promise<string[]> {
  if (deletedCustomersCache && Date.now() - deletedCustomersCache.fetchedAt < TOMBSTONE_CACHE_TTL_MS) {
    return deletedCustomersCache.ids;
  }
  const ids: string[] = [];
  if (!isQuotaExceededFlag) {
    try {
      const deletedSnap = await getDocs(collection(db, envCollectionName || 'deletedCustomers'));
      if (deletedSnap && !deletedSnap.empty) deletedSnap.forEach((d) => ids.push(d.id));
    } catch {}
  }
  deletedCustomersCache = { ids: Array.from(new Set(ids)), fetchedAt: Date.now() };
  return deletedCustomersCache.ids;
}

export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Clear any legacy localStorage quota-lock flags that previously disabled Firestore network
export let isQuotaExceededFlag = false;
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('kenax_quota_exceeded');
    localStorage.removeItem('preview_kenax_quota_exceeded');
  } catch {}
}

export function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || err.name || '').toLowerCase();
  const msg = String(err.message || err.toString?.() || '');
  // Only true quota exhaustion counts — NEVER disable Firestore on permission-denied or transient errors
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
  // Log quota warning without permanently disconnecting Firestore across sessions
  console.warn('[KenaX BD] Firestore quota warning:', err?.message || err?.code || err);
}

/**
 * Normalize Firestore Timestamp fields into ISO strings so dates/times agree across devices & timezones
 * without breaking existing string-based UI sorting or formatting.
 */
export function normalizeFirestoreTimestampValue(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (val instanceof Timestamp || typeof val?.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch {
      return undefined;
    }
  }
  if (typeof val === 'object' && typeof val.seconds === 'number') {
    try {
      return new Date(val.seconds * 1000).toISOString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function normalizeOrderRecord(raw: any, docId?: string): Order {
  const createdAt =
    normalizeFirestoreTimestampValue(raw?.createdAtServer) ||
    normalizeFirestoreTimestampValue(raw?.createdAt) ||
    new Date().toISOString();
  const updatedAt =
    normalizeFirestoreTimestampValue(raw?.updatedAtServer) ||
    normalizeFirestoreTimestampValue(raw?.updatedAt) ||
    createdAt;
  return {
    ...raw,
    id: raw?.id || docId || '',
    createdAt,
    updatedAt,
    isV2Order: true,
  } as Order;
}

/**
 * Generate a globally unique, sequential `KB-######` order number across ALL browsers and devices
 * using an atomic Cloud Firestore transaction on `system/orderCounter`.
 */
export async function generateNextOrderId(prefix: 'KB' | 'INC' = 'KB'): Promise<string> {
  const counterDocId = prefix === 'INC' ? 'incompleteOrderCounter' : 'orderCounter';
  const counterRef = doc(db, 'system', counterDocId);
  const baseStart = prefix === 'INC' ? 100000 : 404400;

  try {
    const nextNum = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      const current = snap.exists() ? Number(snap.data()?.current || baseStart) : baseStart;
      const safeCurrent = Number.isFinite(current) && current >= baseStart ? current : baseStart;
      const next = safeCurrent + 1;
      tx.set(
        counterRef,
        {
          current: next,
          prefix,
          updatedAt: new Date().toISOString(),
          updatedAtServer: serverTimestamp(),
        },
        { merge: true }
      );
      return next;
    });
    return `${prefix}-${String(nextNum).padStart(6, '0')}`;
  } catch (err) {
    console.warn('[KenaX BD] Firestore order counter transaction fallback:', err);
    // Collision-resistant fallback using timestamp tail + crypto random (never a per-browser localStorage counter)
    const rand = Math.floor(100 + Math.random() * 900);
    const timeTail = String(Date.now()).slice(-3);
    return `${prefix}-${timeTail}${rand}`;
  }
}

// Test connection on boot according to skill guidelines
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[KenaX BD] Connected to Cloud Firestore successfully.');
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    } else if (String(error?.code || '').includes('permission-denied')) {
      console.warn('[KenaX BD] Firestore connection check permission notice:', error?.message);
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

  const normalizeOrder = (o: Order): Order => {
    const rawStatus = (o.orderStatus || (o as any).status || 'Pending').toString().trim();
    const lower = rawStatus.toLowerCase();
    const normalizedStatus =
      lower === 'pending'
        ? 'Pending'
        : lower === 'confirmed'
        ? 'Confirmed'
        : lower === 'cancelled'
        ? 'Cancelled'
        : lower === 'delivered'
        ? 'Delivered'
        : lower === 'processing'
        ? 'Processing'
        : lower === 'shipped'
        ? 'Shipped'
        : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

    return {
      ...o,
      orderStatus: normalizedStatus as OrderStatus,
      status: normalizedStatus as any,
      isV2Order: true,
    };
  };

  const isValidOrder = (o: Order) => {
    if (!o || !o.id) return false;
    return true;
  };

  // 1. Put existing
  (existing || []).forEach((o) => {
    if (o && isValidOrder(o)) map.set(o.id, normalizeOrder(o));
  });
  // 2. Put incoming (overwrites with fresher version if present)
  (incoming || []).forEach((o) => {
    if (o && isValidOrder(o)) {
      const prev = map.get(o.id);
      const normalizedIncoming = normalizeOrder(o);
      if (!prev) {
        map.set(o.id, normalizedIncoming);
      } else {
        // Compare updated timestamps if available
        const prevTime = new Date(prev.updatedAt || prev.createdAt || 0).getTime();
        const nextTime = new Date(o.updatedAt || o.createdAt || 0).getTime();
        if (nextTime >= prevTime) {
          map.set(o.id, { ...prev, ...normalizedIncoming });
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

  // 2. Add or update incoming categories (from Firestore or local cache) - User edits take full priority
  (incomingList || []).forEach((c) => {
    if (c && c.id && !deletedIds.has(c.id)) {
      const normalizedSubs: SubCategoryItem[] = (c.subcategories || []).map((subItem: any, sIdx: number) => {
        if (typeof subItem === 'string') {
          return {
            id: `sub-${c.id}-${sIdx}`,
            name: subItem,
            icon: 'Layers',
            subSubcategories: [],
          };
        }
        return {
          id: subItem.id || `sub-${c.id}-${sIdx}`,
          name: subItem.name || '',
          icon: subItem.icon || 'Layers',
          subSubcategories: Array.isArray(subItem.subSubcategories) ? subItem.subSubcategories : [],
        };
      });

      const existing = map.get(c.id);
      map.set(c.id, {
        ...(existing || {}),
        ...c,
        subcategories: normalizedSubs,
      });
    }
  });

  const list = Array.from(map.values());
  list.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  return list;
}

// Helper to process and preserve high-performance, crystal-clear base64 data URLs without quality loss
export function compressImage(input: File | string, maxWidth = 2560, maxHeight = 2560, quality = 0.95): Promise<string> {
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

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Only scale down if image exceeds ultra-HD 2560px dimensions
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

        // Enable high-quality smoothing algorithms for sharp edges and color precision
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high-fidelity JPEG maintaining maximum clarity
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
  baseList?: Product[],
  incomingList: Product[] = [],
  explicitDeletedSet?: Set<string>
): Product[] {
  const defaultBase = INITIAL_PRODUCTS;
  const effectiveBase = baseList !== undefined ? baseList : defaultBase;
  const map = new Map<string, Product>();
  let deletedIds = new Set<string>();
  try {
    const rawDeleted = localStorage.getItem(getEnvStorageKey('kenax_deleted_product_ids'));
    if (rawDeleted) {
      const parsed = JSON.parse(rawDeleted);
      if (Array.isArray(parsed)) parsed.forEach((id) => deletedIds.add(id));
    }
  } catch {}

  if (explicitDeletedSet) {
    explicitDeletedSet.forEach((id) => deletedIds.add(id));
  }

  const isProduction = !isPreviewEnvironment();

  // 1. Add base products if not explicitly deleted
  (effectiveBase || []).forEach((p) => {
    if (p && p.id && !deletedIds.has(p.id)) {
      if (isProduction && isDemoProductId(p.id)) return; // Strictly isolate demo products from production website
      map.set(p.id, { ...p });
    }
  });

  // 2. Add or update incoming products (from Firestore, Cloud SQL, or local cache)
  (incomingList || []).forEach((p) => {
    if (p && p.id && !deletedIds.has(p.id)) {
      if (isProduction && isDemoProductId(p.id)) return; // Strictly isolate demo products from production website
      const existing = map.get(p.id);
      if (!existing) {
        map.set(p.id, { ...p });
      } else {
        const prevTime = new Date(existing.updatedAt || existing.createdAt || '2000-01-01').getTime();
        const nextTime = new Date(p.updatedAt || p.createdAt || '2000-01-01').getTime();
        const validPrev = isNaN(prevTime) ? 0 : prevTime;
        const validNext = isNaN(nextTime) ? 0 : nextTime;

        // When incoming p is newer or has updatedAt, p is the authoritative product state.
        // We set p directly so deleted fields (like cleared videoUrl, deleted sizes/colors) are not resurrected from existing.
        if (validNext >= validPrev || (!existing.updatedAt && p.updatedAt)) {
          map.set(p.id, { ...p });
        } else {
          map.set(p.id, { ...existing });
        }
      }
    }
  });

  return Array.from(map.values());
}

// Automatically and permanently purge demo products from local caches, cart, wishlist, and Firestore
export function purgeDemoProducts() {
  if (typeof window === 'undefined' || isPreviewEnvironment()) return;
  try {
    const isDemo = (id: string) => isDemoProductId(id);

    // 1. Record demo IDs in deleted list
    const rawDel = localStorage.getItem(getEnvStorageKey('kenax_deleted_product_ids'));
    const delList: string[] = rawDel ? JSON.parse(rawDel) : [];
    DEMO_PRODUCT_IDS.forEach((id) => {
      if (!delList.includes(id)) delList.push(id);
    });
    safeSetLocalStorage(getEnvStorageKey('kenax_deleted_product_ids'), JSON.stringify(delList));

    // 2. Clean products cache
    const rawCache = localStorage.getItem(getEnvStorageKey('kenax_products_cache'));
    if (rawCache) {
      const parsed: Product[] = JSON.parse(rawCache);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((p) => p && p.id && !isDemo(p.id));
        safeSetLocalStorage(getEnvStorageKey('kenax_products_cache'), JSON.stringify(filtered));
      }
    }

    // 3. Clean cart
    const rawCart = localStorage.getItem('kenax_cart');
    if (rawCart) {
      const parsed = JSON.parse(rawCart);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((item: any) => item && !isDemo(item.productId));
        safeSetLocalStorage('kenax_cart', JSON.stringify(filtered));
      }
    }

    // 4. Clean wishlist
    const rawWish = localStorage.getItem('kenax_wishlist');
    if (rawWish) {
      const parsed = JSON.parse(rawWish);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((p: any) => p && !isDemo(p.id || p.productId));
        safeSetLocalStorage('kenax_wishlist', JSON.stringify(filtered));
      }
    }

    // 5. Asynchronously remove demo products from Firestore & server
    DEMO_PRODUCT_IDS.forEach((id) => {
      fetch(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE', headers: getEnvApiHeaders() }).catch(() => {});
      if (!isQuotaExceededFlag) {
        deleteDoc(doc(db, getEnvCollectionName('products'), id)).catch((e) => {
          if (isQuotaExceededError(e)) markQuotaExceeded(e);
        });
        setDoc(doc(db, getEnvCollectionName('deletedProducts'), id), { id, deletedAt: new Date().toISOString() }).catch((e) => {
          if (isQuotaExceededError(e)) markQuotaExceeded(e);
        });
      }
    });
  } catch (err) {
    if (isQuotaExceededError(err)) markQuotaExceeded(err);
  }
}
purgeDemoProducts();

// Push initial baseline catalog data to Cloud Firestore ONLY when collections are empty
export async function seedAllDataToFirestore(force = false): Promise<{ success: boolean; message: string }> {
  try {
    if (!force) {
      const seedDoc = await getDoc(doc(db, 'system', 'seedInfo'));
      if (seedDoc.exists() && seedDoc.data()?.seeded) {
        await ensureInitialStaffSeeded().catch(() => {});
        return { success: true, message: 'Database already seeded.' };
      }
      const settingsSnap = await getDoc(doc(db, 'websiteSettings', INITIAL_WEBSITE_SETTINGS.id));
      if (settingsSnap.exists()) {
        await setDoc(doc(db, 'system', 'seedInfo'), { seeded: true, seededAt: new Date().toISOString() }, { merge: true }).catch(() => {});
        await ensureInitialStaffSeeded().catch(() => {});
        return { success: true, message: 'Database already seeded.' };
      }
    }

    // 1. Seed Products ONLY if Firestore products collection is empty
    const existingSnap = await getDocs(query(collection(db, 'products'), limit(1)));
    let seededProductsCount = 0;
    if (existingSnap.empty) {
      const deletedSet = new Set<string>(await getCachedDeletedProductIds());
      const isProd = !isPreviewEnvironment();
      for (const product of INITIAL_PRODUCTS) {
        if (deletedSet.has(product.id)) continue;
        if (isProd && isDemoProductId(product.id)) continue;
        await setDoc(doc(db, 'products', product.id), {
          ...cleanFirestoreData(product),
          updatedAtServer: serverTimestamp(),
        }, { merge: true });
        seededProductsCount += 1;
      }
    }

    // 2. Seed Categories ONLY if empty
    const catSnap = await getDocs(query(collection(db, 'categories'), limit(1)));
    if (catSnap.empty) {
      for (const cat of INITIAL_CATEGORIES) {
        await setDoc(doc(db, 'categories', cat.id), cleanFirestoreData(cat), { merge: true });
      }
    }

    // 3. Seed Website Settings ONLY if missing
    const settingsRef = doc(db, 'websiteSettings', INITIAL_WEBSITE_SETTINGS.id);
    const settingsDoc = await getDoc(settingsRef);
    if (!settingsDoc.exists()) {
      await setDoc(settingsRef, cleanFirestoreData(INITIAL_WEBSITE_SETTINGS), { merge: true });
    }

    // 4. Seed Delivery Zones & Coupons ONLY if empty
    const zonesSnap = await getDocs(query(collection(db, 'deliveryZones'), limit(1)));
    if (zonesSnap.empty) {
      for (const zone of INITIAL_DELIVERY_ZONES) {
        await setDoc(doc(db, 'deliveryZones', zone.id), cleanFirestoreData(zone), { merge: true });
      }
    }

    const couponsSnap = await getDocs(query(collection(db, 'coupons'), limit(1)));
    if (couponsSnap.empty) {
      for (const coupon of INITIAL_COUPONS) {
        await setDoc(doc(db, 'coupons', coupon.id), cleanFirestoreData(coupon), { merge: true });
      }
    }

    // 5. Ensure baseline staff exist with SHA-256 hashed passwords
    await ensureInitialStaffSeeded();

    await setDoc(doc(db, 'system', 'seedInfo'), { seeded: true, seededAt: new Date().toISOString() }, { merge: true });

    return {
      success: true,
      message: `Cloud Firestore initialized (${seededProductsCount} baseline products checked).`,
    };
  } catch (error: any) {
    console.error('[KenaX BD] Cloud Firestore seeding error:', error);
    return {
      success: false,
      message: error?.message || 'Cloud Firestore seeding encountered an error.',
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
      await setDoc(doc(db, getEnvCollectionName('productImageMedia'), mediaId), {
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
    const metaRef = doc(db, getEnvCollectionName('productImageMedia'), mediaId);
    await setDoc(metaRef, {
      id: mediaId,
      isChunked: true,
      totalChunks,
      length: base64Data.length,
      updatedAt: new Date().toISOString(),
    });

    for (let i = 0; i < totalChunks; i++) {
      const chunkStr = base64Data.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkRef = doc(db, getEnvCollectionName('productImageMedia'), mediaId, 'chunks', `chunk_${i}`);
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
      const docRef = doc(db, getEnvCollectionName('productImageMedia'), mediaId);
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
            const chunkRef = doc(db, getEnvCollectionName('productImageMedia'), mediaId, 'chunks', `chunk_${i}`);
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
    const res = await fetch('/api/products', { headers: getEnvApiHeaders() });
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
    const res = await fetch('/api/products/deleted-ids', { headers: getEnvApiHeaders() });
    if (res.ok) {
      const ids = await res.json();
      if (Array.isArray(ids)) return ids;
    }
  } catch (e) {}
  return [];
}

// Fetch products directly from Cloud Firestore (Single Source of Truth)
export async function getProductsFromDB(): Promise<Product[]> {
  const firestoreDeletedIds = await getCachedDeletedProductIds();
  const deletedSet = new Set<string>(firestoreDeletedIds);

  const firestoreItems: Product[] = [];
  try {
    const colRef = collection(db, 'products');
    const snapshot = await getDocs(colRef);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Product;
      const id = data?.id || docSnap.id;
      if (data && id && !deletedSet.has(id)) {
        firestoreItems.push({ ...data, id });
      }
    });
  } catch (err) {
    console.error('[KenaX BD] Firestore getProductsFromDB error:', err);
    throw err;
  }

  // If Firestore products collection is completely empty and has no deletion tombstones, seed baseline products once
  if (firestoreItems.length === 0 && deletedSet.size === 0) {
    const baseline = INITIAL_PRODUCTS.filter((p) => p && p.id && (!isDemoProductId(p.id) || isPreviewEnvironment()));
    await Promise.allSettled(
      baseline.map((p) =>
        setDoc(doc(db, 'products', p.id), cleanFirestoreData({ ...p, updatedAtServer: serverTimestamp() }), { merge: true })
      )
    );
    const resolvedSeed = await Promise.all(baseline.map((p) => resolveProductOriginalImages(p)));
    return resolvedSeed;
  }

  const resolved = await Promise.all(firestoreItems.map((p) => resolveProductOriginalImages(p)));
  return resolved.sort(
    (a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()
  );
}

// Save or Update Product directly in Cloud Firestore
export async function saveProductToDB(product: Product): Promise<void> {
  const productId = product.id;
  if (!productId) return;

  // Process images: preserve high quality base64 directly or chunk if large
  let cloudImages = product.images || [];
  if (Array.isArray(product.images)) {
    cloudImages = await Promise.all(
      product.images.map(async (img, idx) => {
        if (!img) return '';
        if (typeof img === 'string' && img.startsWith('data:image')) {
          const highRes = await compressImage(img, 2048, 2048, 0.94);
          if (highRes.length < 450000) {
            return highRes;
          }
          const mediaId = `img_${productId}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
          return await saveOriginalImageMedia(mediaId, highRes);
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
          const highRes = await compressImage(color.imageUrl, 2048, 2048, 0.94);
          if (highRes.length < 450000) {
            return { ...color, imageUrl: highRes };
          }
          const mediaId = `img_${productId}_color_${idx}_${Math.random().toString(36).substring(2, 7)}`;
          const mediaUrl = await saveOriginalImageMedia(mediaId, highRes);
          return { ...color, imageUrl: mediaUrl };
        }
        return color;
      })
    );
  }

  const nowIso = new Date().toISOString();
  const cloudProduct: Product = {
    ...product,
    id: productId,
    images: cloudImages,
    colors: cloudColors,
    createdAt: product.createdAt || nowIso,
    updatedAt: nowIso,
  };

  // Non-blocking mirror to Express backend if running
  try {
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getEnvApiHeaders() },
      body: JSON.stringify(cloudProduct),
    }).catch(() => {});
  } catch {}

  const cleaned = cleanFirestoreData(cloudProduct);
  deletedProductsCache = null;

  try {
    await setDoc(doc(db, 'products', cloudProduct.id), {
      ...cleaned,
      updatedAtServer: serverTimestamp(),
    });
    await deleteDoc(doc(db, 'deletedProducts', cloudProduct.id)).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `products/${cloudProduct.id}`);
  }
}

// Delete Product directly from Cloud Firestore
export async function deleteProductFromDB(productId: string): Promise<void> {
  if (!productId) return;

  // Remove deleted item from visitor's local cart/wishlist if present
  try {
    const cartRaw = localStorage.getItem('kenax_cart');
    if (cartRaw) {
      const cartItems: any[] = JSON.parse(cartRaw);
      safeSetLocalStorage('kenax_cart', JSON.stringify(cartItems.filter((it) => it && it.productId !== productId)));
    }
    const wishRaw = localStorage.getItem('kenax_wishlist');
    if (wishRaw) {
      const wishItems: any[] = JSON.parse(wishRaw);
      safeSetLocalStorage('kenax_wishlist', JSON.stringify(wishItems.filter((it) => it && it.id !== productId && it.productId !== productId)));
    }
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('kenax_product_deleted', { detail: productId }));
    } catch {}
  }

  fetch(`/api/products/${encodeURIComponent(productId)}`, { method: 'DELETE', headers: getEnvApiHeaders() }).catch(() => {});

  deletedProductsCache = null;
  try {
    await deleteDoc(doc(db, 'products', productId));
    await setDoc(doc(db, 'deletedProducts', productId), {
      id: productId,
      deletedAt: new Date().toISOString(),
      deletedAtServer: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
  }
}

// Subscribe to real-time products updates directly from Cloud Firestore (Single Source of Truth)
export function subscribeToProducts(onProductsChanged: (products: Product[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'products');
    return onSnapshot(
      colRef,
      async (snapshot) => {
        const firestoreDeletedIds = await getCachedDeletedProductIds();
        const deletedSet = new Set<string>(firestoreDeletedIds);

        const firestoreItems: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Product;
          const id = data?.id || docSnap.id;
          if (data && id && !deletedSet.has(id)) {
            firestoreItems.push({ ...data, id });
          }
        });

        const fullyResolved = await Promise.all(firestoreItems.map((p) => resolveProductOriginalImages(p)));
        fullyResolved.sort(
          (a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()
        );
        onProductsChanged(fullyResolved);
      },
      (error) => {
        console.error('[KenaX BD] Products real-time listener error:', error);
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
    const res = await fetch('/api/orders', { headers: getEnvApiHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {}
  return [];
}

// Create new Order directly in Cloud Firestore (Single Source of Truth) with server timestamps
export async function saveOrderToDB(order: Order): Promise<void> {
  order.isV2Order = true;
  const nowIso = order.createdAt || new Date().toISOString();
  const cleaned = cleanFirestoreData({
    ...order,
    createdAt: nowIso,
    updatedAt: order.updatedAt || nowIso,
    isV2Order: true,
  });

  // 1. Write authoritatively to Cloud Firestore `orders` collection with serverTimestamp()
  try {
    await setDoc(
      doc(db, 'orders', order.id),
      {
        ...cleaned,
        createdAtServer: serverTimestamp(),
        updatedAtServer: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `orders/${order.id}`);
  }

  // 2. Non-blocking mirror to Express backend if running
  try {
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getEnvApiHeaders() },
      body: JSON.stringify(order),
    }).catch(() => {});
  } catch {}

  // 3. Link Order to Customer Document in Cloud Firestore
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
        lastOrderDate: nowIso,
      };
      await saveCustomerToDB(updatedCustomer);
    }
  } catch (err) {
    console.warn('[KenaX BD] Linking order to customer record error:', err);
  }

  // 4. Dispatch custom event for immediate UI update in same tab
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kenax_order_placed', { detail: order }));
    }
  } catch {}

  // 5. Trigger background email & sheets sync
  try {
    fetch('/api/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getEnvApiHeaders() },
      body: JSON.stringify({
        to: order.customerEmail,
        subject: `Order Confirmed #${order.id} - KenaX BD`,
        template: 'Order Confirmation',
        data: order,
      }),
    }).catch(() => {});

    fetch('/api/sheets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getEnvApiHeaders() },
      body: JSON.stringify({
        type: 'Orders',
        records: [order],
      }),
    }).catch(() => {});
  } catch {}
}

// Fetch all Orders directly from Cloud Firestore (Single Source of Truth — never localStorage)
export async function getOrdersFromDB(): Promise<Order[]> {
  try {
    const colRef = collection(db, 'orders');
    const snapshot = await getDocs(colRef);
    const remoteItems: Order[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && (data.isV2Order || data.id || docSnap.id)) {
        remoteItems.push(normalizeOrderRecord(data, docSnap.id));
      }
    });
    return mergeOrdersLists([], remoteItems);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'orders');
  }
}

// Subscribe to real-time order updates directly from Cloud Firestore (Single Source of Truth)
export function subscribeToOrders(onOrdersChanged: (orders: Order[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'orders');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const remoteOrders: Order[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && (data.isV2Order || data.id || docSnap.id)) {
            remoteOrders.push(normalizeOrderRecord(data, docSnap.id));
          }
        });
        onOrdersChanged(mergeOrdersLists([], remoteOrders));
      },
      (error) => {
        console.error('[KenaX BD] Orders real-time listener error:', error);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToOrders setup failed:', e);
    return () => {};
  }
}

// Fetch specific Customer's Orders directly from Cloud Firestore using targeted single-field queries
export async function fetchCustomerOrdersFromDB(
  customer: Partial<CustomerRecord> | { id?: string; email?: string; mobile?: string }
): Promise<Order[]> {
  const cId = customer.id;
  const cEmail = customer.email ? customer.email.trim().toLowerCase() : '';
  const cPhone = normalizePhoneNumber(customer.mobile);
  const custOrderIds: string[] = Array.isArray((customer as any)?.orderIds) ? (customer as any).orderIds : [];
  const candidateMap = new Map<string, Order>();

  const matchesCustomer = (o: Order): boolean => {
    if (!o) return false;
    if (custOrderIds.includes(o.id)) return true;
    if (cId && cId !== 'cust-guest' && o.customerId === cId) return true;
    if (cEmail && o.customerEmail && o.customerEmail.trim().toLowerCase() === cEmail) return true;
    if (cPhone) {
      const oPhone = normalizePhoneNumber(o.customerMobile || (o as any).customerPhone);
      const dPhone = normalizePhoneNumber(o.deliveryMobile);
      if (oPhone === cPhone || dPhone === cPhone) return true;
      if (cPhone.length >= 10 && (oPhone.endsWith(cPhone.slice(-10)) || dPhone.endsWith(cPhone.slice(-10)))) return true;
    }
    return false;
  };

  const colRef = collection(db, 'orders');
  const queryTasks: Promise<void>[] = [];

  const addFromSnap = (snap: any) => {
    if (!snap || snap.empty) return;
    snap.forEach((docSnap: any) => {
      const normalized = normalizeOrderRecord(docSnap.data(), docSnap.id);
      if (normalized.id) candidateMap.set(normalized.id, normalized);
    });
  };

  if (cId && cId !== 'cust-guest') {
    queryTasks.push(
      getDocs(query(colRef, where('customerId', '==', cId), limit(100)))
        .then(addFromSnap)
        .catch(() => {})
    );
  }

  if (cEmail) {
    queryTasks.push(
      getDocs(query(colRef, where('customerEmail', '==', cEmail), limit(100)))
        .then(addFromSnap)
        .catch(() => {})
    );
    if (customer.email && customer.email.trim() !== cEmail) {
      queryTasks.push(
        getDocs(query(colRef, where('customerEmail', '==', customer.email.trim()), limit(100)))
          .then(addFromSnap)
          .catch(() => {})
      );
    }
  }

  if (cPhone) {
    const local11 = cPhone.startsWith('880') && cPhone.length >= 13 ? '0' + cPhone.slice(3, 13) : cPhone;
    const phoneVariants = Array.from(
      new Set([customer.mobile?.trim() || '', cPhone, local11, `+88${local11}`].filter(Boolean))
    );
    for (const variant of phoneVariants) {
      queryTasks.push(
        getDocs(query(colRef, where('customerMobile', '==', variant), limit(100)))
          .then(addFromSnap)
          .catch(() => {})
      );
      queryTasks.push(
        getDocs(query(colRef, where('deliveryMobile', '==', variant), limit(100)))
          .then(addFromSnap)
          .catch(() => {})
      );
    }
  }

  const directIds = Array.from(new Set(custOrderIds)).slice(0, 25);
  for (const orderId of directIds) {
    if (!orderId || candidateMap.has(orderId)) continue;
    queryTasks.push(
      getDoc(doc(db, 'orders', orderId))
        .then((snap) => {
          if (snap.exists()) {
            const normalized = normalizeOrderRecord(snap.data(), snap.id);
            if (normalized.id) candidateMap.set(normalized.id, normalized);
          }
        })
        .catch(() => {})
    );
  }

  await Promise.allSettled(queryTasks);

  return Array.from(candidateMap.values())
    .filter(matchesCustomer)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

// Fetch single order directly from Cloud Firestore (never localStorage)
export async function fetchSingleOrderFromDB(orderIdOrQuery: string): Promise<Order | null> {
  const rawQ = orderIdOrQuery.trim();
  const cleanQ = rawQ.toUpperCase();
  const digitsQ = rawQ.replace(/\D/g, '');

  const isOrderMatch = (o: Order): boolean => {
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
  };

  const colRef = collection(db, 'orders');

  // 1. Direct Firestore document lookups by exact ID & KB-prefixed ID
  const idCandidates = Array.from(new Set([rawQ, cleanQ, cleanQ.startsWith('KB-') ? cleanQ : `KB-${cleanQ}`]));
  for (const candidateId of idCandidates) {
    try {
      const snap = await getDoc(doc(db, 'orders', candidateId));
      if (snap.exists()) {
        return normalizeOrderRecord(snap.data(), snap.id);
      }
    } catch {}
  }

  // 2. Targeted single-field Firestore queries (trackingNumber, customerMobile, deliveryMobile)
  try {
    const targetedQueries: Promise<any>[] = [
      getDocs(query(colRef, where('trackingNumber', '==', rawQ), limit(10))).catch(() => null),
    ];
    if (cleanQ !== rawQ) {
      targetedQueries.push(getDocs(query(colRef, where('trackingNumber', '==', cleanQ), limit(10))).catch(() => null));
    }
    if (digitsQ.length >= 10) {
      const local11 = digitsQ.startsWith('880') && digitsQ.length >= 13
        ? '0' + digitsQ.slice(3, 13)
        : digitsQ.length === 10
        ? '0' + digitsQ
        : digitsQ.slice(-11);
      const phoneVariants = Array.from(new Set([rawQ, local11, `+88${local11}`]));
      for (const variant of phoneVariants) {
        targetedQueries.push(getDocs(query(colRef, where('customerMobile', '==', variant), limit(10))).catch(() => null));
        targetedQueries.push(getDocs(query(colRef, where('deliveryMobile', '==', variant), limit(10))).catch(() => null));
      }
    }

    const snapshots = await Promise.all(targetedQueries);
    for (const snap of snapshots) {
      if (snap && !snap.empty) {
        const foundDoc = snap.docs[0];
        if (foundDoc) return normalizeOrderRecord(foundDoc.data(), foundDoc.id);
      }
    }
  } catch (err) {
    console.warn('[KenaX BD] fetchSingleOrderFromDB targeted query error:', err);
  }

  // 3. Bounded recent orders fallback
  try {
    const recentSnap = await getDocs(query(colRef, orderBy('createdAt', 'desc'), limit(100)));
    if (!recentSnap.empty) {
      for (const d of recentSnap.docs) {
        const o = normalizeOrderRecord(d.data(), d.id);
        if (isOrderMatch(o)) return o;
      }
    }
  } catch (err) {
    console.warn('[KenaX BD] fetchSingleOrderFromDB bounded fallback error:', err);
  }

  return null;
}

// Update Order status and tracking directly in Cloud Firestore with serverTimestamp()
export async function updateOrderInDB(orderId: string, updates: Partial<Order>): Promise<void> {
  const nowIso = new Date().toISOString();
  const cleanedUpdates = cleanFirestoreData({
    ...updates,
    updatedAt: nowIso,
    isV2Order: true,
  });

  // 1. Authoritative Cloud Firestore update with serverTimestamp()
  try {
    await setDoc(
      doc(db, 'orders', orderId),
      {
        ...cleanedUpdates,
        updatedAtServer: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
  }

  // 2. Non-blocking mirror to Express backend if running
  try {
    fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getEnvApiHeaders() },
      body: JSON.stringify(cleanedUpdates),
    }).catch(() => {});
  } catch {}
}

// ----------------------------------------------------
// ----------------------------------------------------
// STAFF OPERATIONS (Permanent Multi-Device Persistence)
// ----------------------------------------------------
export async function fetchServerStaff(): Promise<StaffUser[]> {
  try {
    const res = await fetch('/api/staff', { headers: getEnvApiHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {}
  return [];
}

// Seed initial Super Admin / default staff accounts into Firestore ONLY if `staff` collection is completely empty
export async function ensureInitialStaffSeeded(): Promise<void> {
  try {
    const existingSnap = await getDocs(query(collection(db, 'staff'), limit(1)));
    if (!existingSnap.empty) return;

    const deletedIds = new Set<string>();
    const delSnap = await getDocs(collection(db, 'deletedStaff')).catch(() => null);
    if (delSnap && !delSnap.empty) {
      delSnap.forEach((d) => deletedIds.add(d.id));
    }

    for (const rawStaff of INITIAL_STAFF as any[]) {
      if (!rawStaff?.id || deletedIds.has(rawStaff.id)) continue;
      const plainPw =
        rawStaff.password || (rawStaff.role === 'super_admin' ? 'sadik@1234' : '123456');
      const passwordHash = await hashStaffPassword(plainPw);
      const docPayload = cleanFirestoreData({
        id: rawStaff.id,
        name: rawStaff.name,
        email: (rawStaff.email || '').trim().toLowerCase(),
        phone: rawStaff.phone || '',
        role: rawStaff.role,
        status: rawStaff.status || 'active',
        isActive: rawStaff.isActive !== false && rawStaff.status !== 'suspended',
        permissions: Array.isArray(rawStaff.permissions) ? rawStaff.permissions : [],
        createdAt: rawStaff.createdAt || new Date().toISOString(),
        lastLogin: rawStaff.lastLogin || new Date().toISOString(),
        passwordHash,
      });
      await setDoc(
        doc(db, 'staff', rawStaff.id),
        { ...docPayload, updatedAtServer: serverTimestamp() },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('[KenaX BD] ensureInitialStaffSeeded warning:', err);
  }
}

async function fetchRawStaffDocsFromFirestore(): Promise<{
  docs: StaffUser[];
  deletedIds: Set<string>;
  deletedEmails: Set<string>;
}> {
  const deletedIds = new Set<string>();
  const deletedEmails = new Set<string>();

  try {
    const delSnap = await getDocs(collection(db, 'deletedStaff'));
    delSnap.forEach((docSnap) => {
      deletedIds.add(docSnap.id);
      const d = docSnap.data();
      if (d?.email) deletedEmails.add(String(d.email).trim().toLowerCase());
    });
  } catch {}

  const snap = await getDocs(collection(db, 'staff'));
  const docs: StaffUser[] = [];
  snap.forEach((docSnap) => {
    const raw = docSnap.data() as StaffUser;
    const id = raw?.id || docSnap.id;
    const emailLower = (raw?.email || '').trim().toLowerCase();
    if (!id) return;
    if (deletedIds.has(id) || (emailLower && deletedEmails.has(emailLower))) return;
    docs.push({
      ...raw,
      id,
      email: emailLower || raw.email,
      isActive: raw.isActive !== false && raw.status !== 'suspended',
      status: raw.status || (raw.isActive === false ? 'suspended' : 'active'),
      createdAt:
        normalizeFirestoreTimestampValue((raw as any).createdAtServer) ||
        normalizeFirestoreTimestampValue(raw.createdAt) ||
        new Date().toISOString(),
      lastLogin:
        normalizeFirestoreTimestampValue((raw as any).lastLoginServer) ||
        normalizeFirestoreTimestampValue(raw.lastLogin),
    });
  });

  return { docs, deletedIds, deletedEmails };
}

// Fetch all Staff directly from Cloud Firestore (Single Source of Truth — strips secrets before returning)
export async function getStaffFromDB(): Promise<StaffUser[]> {
  try {
    await ensureInitialStaffSeeded();
    const { docs } = await fetchRawStaffDocsFromFirestore();
    return docs.map((s) => stripStaffSecrets(s) as StaffUser);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'staff');
  }
}

// Authenticate Staff credentials directly against Cloud Firestore `staff` collection (NEVER localStorage)
export async function authenticateStaffFromDB(
  identifier: string,
  plainPassword: string
): Promise<{ success: boolean; staff?: StaffUser; error?: string }> {
  const cleanInput = identifier.trim().toLowerCase();
  const cleanDigits = cleanInput.replace(/[\s\-\+\(\)]/g, '');
  const normalizedPhone = normalizePhoneNumber(cleanInput);

  if (!cleanInput || !plainPassword) {
    return { success: false, error: 'Please enter both Email/Mobile and Password.' };
  }

  try {
    await ensureInitialStaffSeeded();
    const { docs } = await fetchRawStaffDocsFromFirestore();

    let foundStaff = docs.find((s) => {
      const sEmail = (s.email || '').trim().toLowerCase();
      const sPhoneDigits = (s.phone || '').replace(/[\s\-\+\(\)]/g, '').toLowerCase();
      const sPhoneNorm = normalizePhoneNumber(s.phone);
      return (
        (sEmail && sEmail === cleanInput) ||
        (cleanDigits.length >= 7 && sPhoneDigits && sPhoneDigits === cleanDigits) ||
        (normalizedPhone.length >= 10 && sPhoneNorm && sPhoneNorm === normalizedPhone)
      );
    });

    const isSuperAdminAlias =
      cleanInput === 'super@kenaxbd.com' ||
      cleanInput === 'super@gmail.com' ||
      cleanInput === 'sadikrtx3060@gmail.com' ||
      cleanInput === 'admin' ||
      cleanInput === 'superadmin' ||
      cleanInput === 'super_admin' ||
      cleanDigits === '01700123456';

    if (!foundStaff && isSuperAdminAlias) {
      foundStaff = docs.find((s) => s.role === 'super_admin');
    }

    if (!foundStaff) {
      return {
        success: false,
        error: 'No authorized staff account found for this Email or Mobile Number.',
      };
    }

    if (foundStaff.isRemoved) {
      return {
        success: false,
        error:
          'এই অ্যাকাউন্টটি সরিয়ে দেওয়া হয়েছে (This account has been removed)। অনুগ্রহ করে সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।',
      };
    }

    if (foundStaff.isActive === false || foundStaff.status === 'suspended') {
      return {
        success: false,
        error: 'Your staff account has been suspended by the Super Admin.',
      };
    }

    const { valid, needsMigration } = await verifyStaffPassword(plainPassword, foundStaff);
    if (!valid) {
      return { success: false, error: 'Incorrect password. Access denied.' };
    }

    // Update lastLogin and migrate legacy plaintext password to SHA-256 passwordHash if needed
    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      lastLogin: nowIso,
      lastLoginServer: serverTimestamp(),
      updatedAt: nowIso,
      updatedAtServer: serverTimestamp(),
    };
    if (needsMigration) {
      updatePayload.passwordHash = await hashStaffPassword(plainPassword);
      updatePayload.password = deleteField();
    }
    await setDoc(doc(db, 'staff', foundStaff.id), updatePayload, { merge: true }).catch(() => {});

    const safeStaff = stripStaffSecrets({
      ...foundStaff,
      lastLogin: nowIso,
    }) as StaffUser;

    return { success: true, staff: safeStaff };
  } catch (err: any) {
    console.error('[KenaX BD] Firestore staff authentication error:', err);
    return {
      success: false,
      error: 'Unable to verify staff credentials with Cloud Firestore. Please check connection and try again.',
    };
  }
}

// Create or Update Staff directly in Cloud Firestore (ALWAYS hashes password into SHA-256 `passwordHash`, NEVER stores plaintext)
export async function saveStaffToDB(staff: StaffUser): Promise<void> {
  if (!staff || (!staff.id && !staff.email)) return;

  const staffId = staff.id || 'staff-' + Date.now();
  const cleanEmail = (staff.email || '').trim().toLowerCase();
  const nowIso = new Date().toISOString();

  // Preserve existing passwordHash from Firestore if updating role/profile without changing password
  let resolvedPasswordHash: string | undefined = staff.passwordHash && isPasswordHash(staff.passwordHash)
    ? staff.passwordHash
    : undefined;

  if (staff.password && staff.password.trim().length > 0) {
    resolvedPasswordHash = await hashStaffPassword(staff.password.trim());
  }

  if (!resolvedPasswordHash) {
    try {
      const existingSnap = await getDoc(doc(db, 'staff', staffId));
      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as StaffUser;
        if (existingData.passwordHash && isPasswordHash(existingData.passwordHash)) {
          resolvedPasswordHash = existingData.passwordHash;
        } else if (existingData.password) {
          resolvedPasswordHash = await hashStaffPassword(existingData.password);
        }
      }
    } catch {}
  }

  if (!resolvedPasswordHash) {
    resolvedPasswordHash = await hashStaffPassword(
      staff.role === 'super_admin' ? 'sadik@1234' : '123456'
    );
  }

  const sanitizedBase = stripStaffSecrets({
    ...staff,
    id: staffId,
    email: cleanEmail,
    status: staff.isActive === false ? 'suspended' : staff.status || 'active',
    isActive: staff.isActive !== false && staff.status !== 'suspended',
    createdAt: staff.createdAt || nowIso,
    updatedAt: nowIso,
  });

  const firestorePayload: Record<string, any> = {
    ...cleanFirestoreData(sanitizedBase),
    passwordHash: resolvedPasswordHash,
    password: deleteField(), // Mathematically ensure plaintext password is NEVER stored in Firestore
    updatedAtServer: serverTimestamp(),
  };

  try {
    await deleteDoc(doc(db, 'deletedStaff', staffId)).catch(() => {});
    await setDoc(doc(db, 'staff', staffId), firestorePayload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `staff/${staffId}`);
  }

  // Refresh active browser session metadata (WITHOUT any password or passwordHash) if this is the logged-in user
  try {
    const activeSessionRaw = localStorage.getItem('kenax_staff_session');
    if (activeSessionRaw) {
      const parsed = JSON.parse(activeSessionRaw);
      if (
        parsed?.id === staffId ||
        (parsed?.email && cleanEmail && parsed.email.toLowerCase() === cleanEmail)
      ) {
        saveStaffSession(sanitizedBase as StaffUser);
      }
    }
  } catch {}
}

// Delete Staff directly from Cloud Firestore & record tombstone
export async function deleteStaffFromDB(staffId: string, staffEmail?: string): Promise<void> {
  const lowerEmail = staffEmail ? staffEmail.trim().toLowerCase() : '';

  try {
    await deleteDoc(doc(db, 'staff', staffId));
    await setDoc(doc(db, 'deletedStaff', staffId), {
      id: staffId,
      email: lowerEmail,
      deletedAt: new Date().toISOString(),
      deletedAtServer: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `staff/${staffId}`);
  }

  // Clear active browser session if the deleted staff member was signed in on this browser
  try {
    const activeRaw = localStorage.getItem('kenax_staff_session');
    if (activeRaw) {
      const active = JSON.parse(activeRaw);
      if (active && (active.id === staffId || (lowerEmail && active.email?.toLowerCase() === lowerEmail))) {
        clearStaffSession();
      }
    }
  } catch {}
}

// Real-time Firestore listener for Staff collection (Single Source of Truth — strips secrets)
export function subscribeToStaff(callback: (staff: StaffUser[]) => void): () => void {
  try {
    // Ensure initial Super Admin exists if collection is brand-new
    ensureInitialStaffSeeded().catch(() => {});

    const unsub = onSnapshot(
      collection(db, 'staff'),
      async (snapshot) => {
        const deletedIds = new Set<string>();
        const deletedEmails = new Set<string>();
        try {
          const delSnap = await getDocs(collection(db, 'deletedStaff'));
          delSnap.forEach((d) => {
            deletedIds.add(d.id);
            const data = d.data();
            if (data?.email) deletedEmails.add(String(data.email).trim().toLowerCase());
          });
        } catch {}

        const list: StaffUser[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as StaffUser;
          const id = raw?.id || docSnap.id;
          const emailLower = (raw?.email || '').trim().toLowerCase();
          if (!id) return;
          if (deletedIds.has(id) || (emailLower && deletedEmails.has(emailLower))) return;
          list.push(
            stripStaffSecrets({
              ...raw,
              id,
              email: emailLower || raw.email,
              isActive: raw.isActive !== false && raw.status !== 'suspended',
              status: raw.status || (raw.isActive === false ? 'suspended' : 'active'),
              createdAt:
                normalizeFirestoreTimestampValue((raw as any).createdAtServer) ||
                normalizeFirestoreTimestampValue(raw.createdAt) ||
                new Date().toISOString(),
              lastLogin:
                normalizeFirestoreTimestampValue((raw as any).lastLoginServer) ||
                normalizeFirestoreTimestampValue(raw.lastLogin),
            }) as StaffUser
          );
        });
        callback(list);
      },
      (err) => {
        console.error('[KenaX BD] Staff real-time listener error:', err);
      }
    );
    return unsub;
  } catch {
    return () => {};
  }
}

// ----------------------------------------------------
// CUSTOMERS OPERATIONS
// ----------------------------------------------------
// Fetch single customer record directly from Firestore (for fresh profile sync across devices)
export async function fetchCustomerRecordFromDB(customerId: string): Promise<CustomerRecord | null> {
  if (!customerId) return null;

  // Check if customer was deleted
  try {
    const cachedDeleted = localStorage.getItem(getEnvStorageKey('kenax_deleted_customers_cache'));
    if (cachedDeleted) {
      const deletedIds: string[] = JSON.parse(cachedDeleted);
      if (Array.isArray(deletedIds) && deletedIds.includes(customerId)) {
        return null;
      }
    }
  } catch {}

  try {
    const docRef = doc(db, getEnvCollectionName('customers'), customerId);
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
    const res = await fetch('/api/customers', { headers: getEnvApiHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (err) {}
  return [];
}

export async function getCustomersFromDB(): Promise<CustomerRecord[]> {
  const deletedCustomerIds = new Set<string>();
  try {
    const cachedDeletedIds = await getCachedDeletedCustomerIds('deletedCustomers');
    cachedDeletedIds.forEach((id) => deletedCustomerIds.add(id));
  } catch {}

  try {
    const colRef = collection(db, 'customers');
    const snapshot = await getDocs(colRef);
    const dbItems: CustomerRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as CustomerRecord;
      const id = data?.id || docSnap.id;
      if (deletedCustomerIds.has(docSnap.id) || (id && deletedCustomerIds.has(id))) {
        deleteDoc(doc(db, 'customers', docSnap.id)).catch(() => {});
      } else if (data && (id || data.email)) {
        dbItems.push({ ...data, id });
      }
    });
    return mergeCustomersLists([], dbItems).filter((c) => c && c.id && !deletedCustomerIds.has(c.id));
  } catch (err) {
    console.error('[KenaX BD] Firestore getCustomersFromDB error:', err);
    return [];
  }
}

export async function updateCustomerInDB(
  customerId: string,
  updates: Partial<CustomerRecord>
): Promise<void> {
  if (!customerId) return;
  if (customerId.startsWith('staff-cust-')) return;

  const cleaned = cleanFirestoreData({
    ...updates,
    isV2Account: true,
    updatedAt: new Date().toISOString(),
  });

  try {
    await setDoc(
      doc(db, 'customers', customerId),
      { ...cleaned, updatedAtServer: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `customers/${customerId}`);
  }

  fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getEnvApiHeaders() },
    body: JSON.stringify({ id: customerId, ...cleaned }),
  }).catch(() => {});

  // Keep active logged-in customer session in sync if ID matches
  try {
    const activeCustomerRaw = localStorage.getItem('kenax_current_customer');
    if (activeCustomerRaw) {
      const activeCust: CustomerRecord = JSON.parse(activeCustomerRaw);
      if (activeCust.id === customerId) {
        const mergedActive: any = { ...activeCust, ...cleaned };
        delete mergedActive.password;
        safeSetLocalStorage('kenax_current_customer', JSON.stringify(mergedActive));
      }
    }
  } catch {}
}

export async function deleteCustomerFromDB(customerId: string): Promise<void> {
  fetch(`/api/customers/${encodeURIComponent(customerId)}`, {
    method: 'DELETE',
    headers: getEnvApiHeaders(),
  }).catch(() => {});

  // Clear active customer session if it matches
  try {
    const activeRaw = localStorage.getItem('kenax_current_customer');
    if (activeRaw) {
      const activeCust = JSON.parse(activeRaw);
      if (activeCust.id === customerId) {
        localStorage.removeItem('kenax_current_customer');
      }
    }
  } catch {}

  deletedCustomersCache = null;
  try {
    await deleteDoc(doc(db, 'customers', customerId));
    await setDoc(doc(db, 'deletedCustomers', customerId), {
      id: customerId,
      deletedAt: new Date().toISOString(),
      deletedAtServer: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `customers/${customerId}`);
  }
}

export async function saveCustomerToDB(customer: CustomerRecord): Promise<void> {
  if (!customer || !customer.id) return;
  if (customer.id.startsWith('staff-cust-')) return;

  const customerWithV2 = {
    ...customer,
    isV2Account: true,
    updatedAt: new Date().toISOString(),
  };
  const cleaned: any = cleanFirestoreData(customerWithV2);

  if (cleaned && Array.isArray(cleaned.cart)) {
    cleaned.cart = cleaned.cart.map((item: any) => ({
      ...item,
      productImage: item.productImage && item.productImage.startsWith('data:') ? '' : item.productImage,
    }));
  }

  deletedCustomersCache = null;
  try {
    await deleteDoc(doc(db, 'deletedCustomers', customer.id)).catch(() => {});
    await setDoc(
      doc(db, 'customers', customer.id),
      { ...cleaned, updatedAtServer: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `customers/${customer.id}`);
  }

  fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getEnvApiHeaders() },
    body: JSON.stringify(cleaned),
  }).catch(() => {});
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

const LEGACY_SAMPLE_ACTIVITY_IDS = new Set(['log-101', 'log-102', 'log-103', 'log-104', 'log-105']);

export function isLegacyFakeActivityLog(log: Partial<ActivityLog> | any): boolean {
  if (!log) return true;
  if (log.id && LEGACY_SAMPLE_ACTIVITY_IDS.has(String(log.id))) return true;
  const details = String(log.details || '').toLowerCase();
  const target = String(log.targetId || '').toLowerCase();
  const ts = String(log.timestamp || '');
  if (
    ts.startsWith('2025-02-') &&
    (details.includes('redmi note 13') ||
      details.includes('xiaomi redmi buds 5') ||
      details.includes('iphone 15') ||
      details.includes('galaxy s24') ||
      details.includes('bk9a77218x') ||
      details.includes('pth-ctg-9821') ||
      target === 'kb-89242' ||
      target === 'xia-rn13-8-256')
  ) {
    return true;
  }
  return false;
}

function mergeActivityLogLists(primary: ActivityLog[], secondary: ActivityLog[]): ActivityLog[] {
  const byId = new Map<string, ActivityLog>();
  [...primary, ...secondary].forEach((item) => {
    if (!item || isLegacyFakeActivityLog(item)) return;
    if (item.id) {
      byId.set(item.id, { ...(byId.get(item.id) || {}), ...item });
    }
  });
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function getActivityLogsFromDB(maxLimit: number = 100): Promise<ActivityLog[]> {
  await syncPendingActivityLogs().catch(() => {});

  try {
    const colRef = collection(db, 'activityLogs');
    let snapshot = await getDocs(query(colRef, orderBy('timestamp', 'desc'), limit(maxLimit)));
    if (snapshot.empty) {
      snapshot = await getDocs(query(colRef, limit(maxLimit)));
    }
    const items: ActivityLog[] = [];
    snapshot.forEach((docSnap) => {
      const raw = docSnap.data() as ActivityLog;
      if (!isLegacyFakeActivityLog(raw)) {
        items.push({
          ...raw,
          id: raw.id || docSnap.id,
          timestamp:
            normalizeFirestoreTimestampValue((raw as any).timestampServer) ||
            normalizeFirestoreTimestampValue(raw.timestamp) ||
            new Date().toISOString(),
        });
      }
    });
    return mergeActivityLogLists([], items);
  } catch (err) {
    console.error('[KenaX BD] Firestore getActivityLogsFromDB error:', err);
    return [];
  }
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

  try {
    fetch('/api/activity-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    }).catch(() => {});
  } catch {}

  try {
    await setDoc(
      doc(db, 'activityLogs', newLog.id),
      { ...cleaned, timestampServer: serverTimestamp() },
      { merge: true }
    );
    syncPendingActivityLogs().catch(() => {});
  } catch (err) {
    console.warn('[KenaX BD] Firestore logActivityToDB error:', err);
  }

  return newLog;
}

export function subscribeToActivityLogs(
  onLogsChanged: (logs: ActivityLog[]) => void,
  maxLimit: number = 100
): Unsubscribe {
  try {
    const colRef = collection(db, 'activityLogs');
    const boundedQuery = query(colRef, orderBy('timestamp', 'desc'), limit(maxLimit));
    return onSnapshot(
      boundedQuery,
      (snapshot) => {
        const items: ActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as ActivityLog;
          if (!isLegacyFakeActivityLog(raw)) {
            items.push({
              ...raw,
              id: raw.id || docSnap.id,
              timestamp:
                normalizeFirestoreTimestampValue((raw as any).timestampServer) ||
                normalizeFirestoreTimestampValue(raw.timestamp) ||
                new Date().toISOString(),
            });
          }
        });
        onLogsChanged(mergeActivityLogLists([], items));
      },
      (error) => {
        console.error('[KenaX BD] Activity logs real-time listener error:', error);
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
export async function getStockLogsFromDB(maxLimit: number = 100): Promise<StockLog[]> {
  try {
    const colRef = collection(db, 'inventoryLogs');
    let snapshot = await getDocs(query(colRef, orderBy('timestamp', 'desc'), limit(maxLimit)));
    if (snapshot.empty) {
      snapshot = await getDocs(query(colRef, limit(maxLimit)));
    }
    const items: StockLog[] = [];
    snapshot.forEach((docSnap) => {
      const raw = docSnap.data() as StockLog;
      if (raw) {
        items.push({
          ...raw,
          id: raw.id || docSnap.id,
          timestamp:
            normalizeFirestoreTimestampValue((raw as any).timestampServer) ||
            normalizeFirestoreTimestampValue(raw.timestamp) ||
            new Date().toISOString(),
        });
      }
    });
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items;
  } catch (err) {
    console.error('[KenaX BD] Firestore getStockLogsFromDB error:', err);
    return [];
  }
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
    await setDoc(doc(db, 'inventoryLogs', newLog.id), {
      ...cleanFirestoreData(newLog),
      timestampServer: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `inventoryLogs/${newLog.id}`);
  }

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kenax_stock_logs_updated', { detail: newLog }));
    }
  } catch {}
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
export async function getCartActivitiesFromDB(maxLimit: number = 100): Promise<import('../types').CartActivity[]> {
  try {
    const colRef = collection(db, 'cartActivities');
    let snapshot = await getDocs(query(colRef, orderBy('updatedAt', 'desc'), limit(maxLimit)));
    if (snapshot.empty) {
      snapshot = await getDocs(query(colRef, limit(maxLimit)));
    }
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
  onError?: (err: any) => void,
  maxLimit: number = 100
): () => void {
  if (isQuotaExceededFlag) return () => {};
  try {
    const colRef = collection(db, 'cartActivities');
    const boundedQuery = query(colRef, orderBy('updatedAt', 'desc'), limit(maxLimit));
    const unsub = onSnapshot(
      boundedQuery,
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
        if (isQuotaExceededError(error)) markQuotaExceeded(error);
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
// WEBSITE SETTINGS OPERATIONS (Cloud Firestore Single Source of Truth)
// ----------------------------------------------------
export async function getSettingsFromDB(): Promise<WebsiteSettings> {
  try {
    const docRef = doc(db, 'websiteSettings', INITIAL_WEBSITE_SETTINGS.id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      let data = snap.data() as WebsiteSettings;
      data = await hydrateHeroVideosInSettings(data);
      return data;
    }
  } catch (err) {
    console.error('[KenaX BD] Firestore getSettingsFromDB error:', err);
  }
  return INITIAL_WEBSITE_SETTINGS;
}

export async function saveSettingsToDB(settings: any): Promise<void> {
  let fullMergedSettings = settings;
  try {
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

    if (settingsToSave.heroBanners && Array.isArray(settingsToSave.heroBanners)) {
      for (const slide of settingsToSave.heroBanners) {
        if (slide.mediaType === 'video' && slide.videoUrl && slide.videoUrl.startsWith('data:video')) {
          await saveHeroVideoToFirestore(slide.id, slide.videoUrl);
          slide.videoUrl = `firestore_video:${slide.id}`;
        }
      }
    }

    const cleaned = cleanFirestoreData(settingsToSave);
    const docId = settingsToSave.id || INITIAL_WEBSITE_SETTINGS.id;
    await setDoc(
      doc(db, 'websiteSettings', docId),
      { ...cleaned, updatedAtServer: serverTimestamp() },
      { merge: true }
    );

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullMergedSettings),
    }).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `websiteSettings/${INITIAL_WEBSITE_SETTINGS.id}`);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kenax_settings_updated', { detail: fullMergedSettings }));
  }
}

export async function saveHeroBannersToDB(heroBanners: HeroBannerItem[]): Promise<void> {
  const baseSettings = await getSettingsFromDB().catch(() => INITIAL_WEBSITE_SETTINGS);
  await saveSettingsToDB({ ...baseSettings, heroBanners });
}

export async function saveOfferPopupSettingsToDB(offerPopup: any): Promise<void> {
  const baseSettings = await getSettingsFromDB().catch(() => INITIAL_WEBSITE_SETTINGS);
  await saveSettingsToDB({ ...baseSettings, offerPopup });
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
          onSettingsChanged(data);
        }
      },
      (error) => {
        console.error('[KenaX BD] Settings real-time listener error:', error);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToSettings setup failed:', e);
    return () => {};
  }
}

// ----------------------------------------------------
// CATEGORIES OPERATIONS (Cloud Firestore Single Source of Truth)
// ----------------------------------------------------
export async function getCategoriesFromDB(): Promise<Category[]> {
  const firestoreDeletedIds = await getCachedDeletedCategoryIds();
  const deletedSet = new Set<string>(firestoreDeletedIds);

  const firestoreItems: Category[] = [];
  try {
    const snapshot = await getDocs(collection(db, 'categories'));
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Category;
      const id = data?.id || docSnap.id;
      if (data && id && !deletedSet.has(id)) {
        firestoreItems.push({ ...data, id });
      }
    });
  } catch (err) {
    console.error('[KenaX BD] Firestore getCategoriesFromDB error:', err);
  }

  if (firestoreItems.length === 0 && deletedSet.size === 0) {
    await Promise.allSettled(
      INITIAL_CATEGORIES.map((cat) =>
        setDoc(doc(db, 'categories', cat.id), cleanFirestoreData(cat), { merge: true })
      )
    );
    return INITIAL_CATEGORIES;
  }

  return firestoreItems.sort((a, b) => ((a as any).order ?? (a as any).sortOrder ?? 999) - ((b as any).order ?? (b as any).sortOrder ?? 999));
}

export async function saveCategoryToDB(category: Category): Promise<void> {
  const cleaned = cleanFirestoreData(category);
  deletedCategoriesCache = null;
  try {
    await setDoc(doc(db, 'categories', category.id), { ...cleaned, updatedAtServer: serverTimestamp() }, { merge: true });
    await deleteDoc(doc(db, 'deletedCategories', category.id)).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `categories/${category.id}`);
  }
}

export async function deleteCategoryFromDB(categoryId: string): Promise<void> {
  deletedCategoriesCache = null;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
    await setDoc(doc(db, 'deletedCategories', categoryId), {
      id: categoryId,
      deletedAt: new Date().toISOString(),
      deletedAtServer: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}`);
  }
}

export function subscribeToCategories(onCategoriesChanged: (categories: Category[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'categories');
    return onSnapshot(
      colRef,
      async (snapshot) => {
        const firestoreDeletedIds = await getCachedDeletedCategoryIds();
        const deletedSet = new Set<string>(firestoreDeletedIds);

        const firestoreItems: Category[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Category;
          const id = data?.id || docSnap.id;
          if (data && id && !deletedSet.has(id)) {
            firestoreItems.push({ ...data, id });
          }
        });

        if (firestoreItems.length > 0) {
          firestoreItems.sort((a, b) => ((a as any).order ?? (a as any).sortOrder ?? 999) - ((b as any).order ?? (b as any).sortOrder ?? 999));
          onCategoriesChanged(firestoreItems);
        }
      },
      (error) => {
        console.error('[KenaX BD] Categories real-time listener error:', error);
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
          const cachedRemoteDeleted = await getCachedDeletedCustomerIds('deletedCustomers');
          cachedRemoteDeleted.forEach((id) => deletedCustomerIds.add(id));
        } catch {}

        const dbItems: CustomerRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as CustomerRecord;
          const id = data?.id || docSnap.id;
          if (deletedCustomerIds.has(docSnap.id) || (id && deletedCustomerIds.has(id))) {
            deleteDoc(doc(db, 'customers', docSnap.id)).catch(() => {});
          } else if (data && id) {
            dbItems.push({ ...data, id });
          }
        });

        try {
          const activeRaw = localStorage.getItem('kenax_current_customer');
          if (activeRaw) {
            const activeCust = JSON.parse(activeRaw);
            if (activeCust && deletedCustomerIds.has(activeCust.id)) {
              localStorage.removeItem('kenax_current_customer');
            }
          }
        } catch {}

        onCustomersChanged(mergeCustomersLists([], dbItems).filter((c) => c && c.id && !deletedCustomerIds.has(c.id)));
      },
      (error) => {
        console.error('[KenaX BD] Customers real-time listener error:', error);
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

export async function getEmailLogsFromDB(maxLimit: number = 150): Promise<EmailLog[]> {
  // Always flush any pending offline logs first
  await syncPendingEmailLogs().catch(() => {});

  try {
    const colRef = collection(db, 'emailLogs');
    let snap = await getDocs(query(colRef, orderBy('timestamp', 'desc'), limit(maxLimit)));
    if (snap.empty) {
      snap = await getDocs(query(colRef, limit(maxLimit)));
    }
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

export function subscribeToEmailLogs(callback: (logs: EmailLog[]) => void, maxLimit: number = 150): Unsubscribe {
  if (isQuotaExceededFlag) return () => {};
  try {
    const colRef = collection(db, 'emailLogs');
    const boundedQuery = query(colRef, orderBy('timestamp', 'desc'), limit(maxLimit));
    return onSnapshot(
      boundedQuery,
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
        if (isQuotaExceededError(err)) markQuotaExceeded(err);
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
  // 1. Immediately save to LocalStorage so UI is instantaneous and never hangs
  safeSetLocalStorage('kenax_gmail_alerts_settings', JSON.stringify(settings));

  // 2. Persist to Firestore with a 1.5s timeout race so it never blocks UI or hangs on Netlify
  try {
    const docRef = doc(db, 'websiteSettings', 'gmailAlerts');
    await Promise.race([
      setDoc(docRef, settings, { merge: true }),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch (err) {
    console.warn('[KenaX BD] saveGmailAlertSettingsToDB background sync notice:', err);
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
    const items: ExpenseRecord[] = [];
    snapshot.forEach((docSnap) => items.push({ ...(docSnap.data() as ExpenseRecord), id: docSnap.data()?.id || docSnap.id }));
    items.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    return items;
  } catch (err) {
    console.error('[KenaX BD] getExpensesFromDB error:', err);
    return [];
  }
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

  try {
    await setDoc(doc(db, 'expenses', cleaned.id), { ...cleaned, updatedAtServer: serverTimestamp() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `expenses/${cleaned.id}`);
  }

  return cleaned;
}

export async function deleteExpenseFromDB(expenseId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
    return true;
  } catch (err) {
    console.error('[KenaX BD] deleteExpenseFromDB error:', err);
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
        snapshot.forEach((docSnap) => items.push({ ...(docSnap.data() as ExpenseRecord), id: docSnap.data()?.id || docSnap.id }));
        items.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
        onExpensesChanged(items);
      },
      (error) => {
        console.error('[KenaX BD] subscribeToExpenses error:', error);
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
    const items: OtherProfitRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as OtherProfitRecord;
      if (isDemoOtherProfit(data)) {
        deleteDoc(doc(db, 'other_profits', docSnap.id)).catch(() => {});
      } else {
        items.push({ ...data, id: data.id || docSnap.id });
      }
    });
    items.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    return items;
  } catch (err) {
    console.error('[KenaX BD] getOtherProfitsFromDB error:', err);
    return [];
  }
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

  try {
    await setDoc(doc(db, 'other_profits', cleaned.id), { ...cleaned, updatedAtServer: serverTimestamp() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `other_profits/${cleaned.id}`);
  }

  return cleaned;
}

export async function deleteOtherProfitFromDB(profitId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'other_profits', profitId));
    return true;
  } catch (err) {
    console.error('[KenaX BD] deleteOtherProfitFromDB error:', err);
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
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as OtherProfitRecord;
          if (isDemoOtherProfit(data)) {
            deleteDoc(doc(db, 'other_profits', docSnap.id)).catch(() => {});
          } else {
            items.push({ ...data, id: data.id || docSnap.id });
          }
        });
        items.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
        onProfitsChanged(items);
      },
      (error) => {
        console.error('[KenaX BD] subscribeToOtherProfits error:', error);
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

export async function getSMSLogsFromDB(maxLimit: number = 100): Promise<SMSLog[]> {
  try {
    const cached = localStorage.getItem('kenax_sms_logs_cache');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  try {
    const colRef = collection(db, 'sms_logs');
    let snap = await getDocs(query(colRef, orderBy('timestamp', 'desc'), limit(maxLimit)));
    if (snap.empty) {
      snap = await getDocs(query(colRef, limit(maxLimit)));
    }
    const logs: SMSLog[] = [];
    snap.forEach((d) => logs.push(d.data() as SMSLog));
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    safeSetLocalStorage('kenax_sms_logs_cache', JSON.stringify(logs.slice(0, 100)));
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

export function subscribeToSMSLogs(onLogsChanged: (logs: SMSLog[]) => void, maxLimit: number = 100): Unsubscribe {
  if (isQuotaExceededFlag) return () => {};
  try {
    const colRef = collection(db, 'sms_logs');
    const boundedQuery = query(colRef, orderBy('timestamp', 'desc'), limit(maxLimit));
    return onSnapshot(
      boundedQuery,
      (snapshot) => {
        const items: SMSLog[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as SMSLog);
        });
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        safeSetLocalStorage('kenax_sms_logs_cache', JSON.stringify(items.slice(0, 100)));
        onLogsChanged(items);
      },
      (error) => {
        if (isQuotaExceededError(error)) markQuotaExceeded(error);
        console.warn('[KenaX BD] subscribeToSMSLogs error:', error);
      }
    );
  } catch (e) {
    return () => {};
  }
}

// ----------------------------------------------------
// PRODUCT REVIEWS & MODERATION (REAL + DEMO REVIEWS)
// Multi-Device, Cross-Browser, Permanent Cloud & Netlify Sync
// ----------------------------------------------------
const CLOUD_RUN_API_BASE = 'https://ais-pre-nziktgpe56nlsqktopppvl-693170375322.asia-southeast1.run.app';

export async function getReviewsFromDB(): Promise<Review[]> {
  const items: Review[] = [];

  // 1. Fetch from Cloud Firestore (Primary source of truth across all devices)
  try {
    const [snap1, snap2] = await Promise.all([
      getDocs(collection(db, 'reviews')).catch(() => ({ empty: true, forEach: () => {} } as any)),
      getDocs(collection(db, 'preview_reviews')).catch(() => ({ empty: true, forEach: () => {} } as any)),
    ]);

    const seenDocIds = new Set<string>();
    if (!snap1.empty) {
      snap1.forEach((docSnap: any) => {
        const data = docSnap.data() as Review;
        if (data && data.id && !seenDocIds.has(data.id)) {
          seenDocIds.add(data.id);
          items.push(data);
        }
      });
    }
    if (!snap2.empty) {
      snap2.forEach((docSnap: any) => {
        const data = docSnap.data() as Review;
        if (data && data.id && !seenDocIds.has(data.id)) {
          seenDocIds.add(data.id);
          items.push(data);
        }
      });
    }
  } catch (err) {
    console.warn('[KenaX BD] Firestore getReviewsFromDB fallback:', err);
  }

  // 2. Fetch from Local Node Server and Cloud Run Relay API (Essential for Netlify & Vercel deployments)
  try {
    const fetchPromises: Promise<any>[] = [
      fetch('/api/reviews').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ];

    if (
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1') &&
      !window.location.hostname.includes('run.app')
    ) {
      // Deployed on Netlify, GitHub Pages, or custom domain -> fetch from cloud relay
      fetchPromises.push(
        fetch(`${CLOUD_RUN_API_BASE}/api/reviews`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      );
    }

    const results = await Promise.all(fetchPromises);
    results.forEach((srvJson) => {
      if (srvJson?.success && Array.isArray(srvJson.reviews)) {
        srvJson.reviews.forEach((sr: Review) => {
          if (sr && sr.id) {
            const exIdx = items.findIndex((it) => it.id === sr.id);
            if (exIdx >= 0) {
              items[exIdx] = { ...items[exIdx], ...sr };
            } else {
              items.push(sr);
            }
          }
        });
      }
    });
  } catch {}

  // 3. Fetch from IndexedDB for high-capacity local offline store
  try {
    const idbRaw = await getIdbItem('kenax_reviews_idb');
    if (idbRaw) {
      const idbList: Review[] = JSON.parse(idbRaw);
      if (Array.isArray(idbList)) {
        idbList.forEach((ir) => {
          if (ir && ir.id && !items.some((it) => it.id === ir.id)) {
            items.push(ir);
          }
        });
      }
    }
  } catch {}

  // 4. Merge with local custom edited reviews dictionary (Guaranteed zero-loss on refresh)
  let deletedIds: string[] = [];
  try {
    const rawDeleted = localStorage.getItem('kenax_deleted_review_ids');
    if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
  } catch {}

  const valid = items.filter((r) => !deletedIds.includes(r.id));
  const existingIds = new Set(valid.map((r) => r.id));
  const combined = [...valid];

  let customMap: Record<string, Review> = {};
  if (typeof window !== 'undefined') {
    try {
      const customRaw = localStorage.getItem('kenax_custom_reviews_map');
      if (customRaw) customMap = JSON.parse(customRaw);
    } catch {}
  }

  // Apply custom edits over existing items
  combined.forEach((r, idx) => {
    if (customMap[r.id]) {
      combined[idx] = { ...r, ...customMap[r.id] };
    }
  });

  // Add any custom reviews that were not in items yet
  Object.keys(customMap).forEach((cId) => {
    if (!deletedIds.includes(cId) && !existingIds.has(cId)) {
      combined.push(customMap[cId]);
      existingIds.add(cId);
    }
  });

  // 5. Fill in initial demo reviews for missing IDs (Only if not customized or deleted)
  INITIAL_REVIEWS.forEach((initRev) => {
    if (!existingIds.has(initRev.id) && !deletedIds.includes(initRev.id) && !customMap[initRev.id]) {
      combined.push(initRev);
    }
  });

  // 6. Ensure all photos have high-speed Google Drive direct CDN format
  combined.forEach((r) => {
    if (Array.isArray(r.photos)) {
      r.photos = r.photos.map((p) => {
        if (typeof p === 'string' && p.trim()) {
          const trimmed = p.trim().replace(/^["']|["']$/g, '');
          const matchFileD = trimmed.match(/\/file(?:\/u\/\d+)?\/d\/([a-zA-Z0-9_-]+)/i);
          if (matchFileD && matchFileD[1]) return `https://lh3.googleusercontent.com/d/${matchFileD[1]}`;
          const matchOpenId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
          if (matchOpenId && matchOpenId[1]) return `https://lh3.googleusercontent.com/d/${matchOpenId[1]}`;
          const matchUc = trimmed.match(/\/uc\?.*id=([a-zA-Z0-9_-]+)/i);
          if (matchUc && matchUc[1]) return `https://lh3.googleusercontent.com/d/${matchUc[1]}`;
          return trimmed;
        }
        return p;
      });
    }
  });

  combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(combined));
  setIdbItem('kenax_reviews_idb', JSON.stringify(combined)).catch(() => {});
  return combined;
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

        const rawDeleted = typeof window !== 'undefined' ? localStorage.getItem('kenax_deleted_review_ids') : null;
        const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
        const valid = items.filter((r) => !deletedIds.includes(r.id));
        const existingIds = new Set(valid.map((r) => r.id));
        const combined = [...valid];

        let customMap: Record<string, Review> = {};
        if (typeof window !== 'undefined') {
          try {
            const customRaw = localStorage.getItem('kenax_custom_reviews_map');
            if (customRaw) customMap = JSON.parse(customRaw);
          } catch {}
        }

        // Apply custom edits
        combined.forEach((r, idx) => {
          if (customMap[r.id]) {
            combined[idx] = { ...r, ...customMap[r.id] };
          }
        });

        Object.keys(customMap).forEach((cId) => {
          if (!deletedIds.includes(cId) && !existingIds.has(cId)) {
            combined.push(customMap[cId]);
            existingIds.add(cId);
          }
        });

        INITIAL_REVIEWS.forEach((initRev) => {
          if (!existingIds.has(initRev.id) && !deletedIds.includes(initRev.id) && !customMap[initRev.id]) {
            combined.push(initRev);
          }
        });

        combined.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(combined));
        setIdbItem('kenax_reviews_idb', JSON.stringify(combined)).catch(() => {});
        onReviewsChanged(combined);
      },
      (error) => {
        console.warn('[KenaX BD] subscribeToReviews listener notice:', error);
        if (onError) onError(error);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToReviews setup error:', e);
    return () => {};
  }
}

async function compressImageToSafeSize(dataUri: string): Promise<string> {
  if (!dataUri || !dataUri.startsWith('data:image')) return dataUri;
  if (typeof window === 'undefined' || typeof document === 'undefined') return dataUri;
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const maxDim = 800;
          let width = img.width || 800;
          let height = img.height || 600;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.7);
            resolve(compressed);
          } else {
            resolve(dataUri);
          }
        } catch {
          resolve(dataUri);
        }
      };
      img.onerror = () => resolve(dataUri);
      img.src = dataUri;
    } catch {
      resolve(dataUri);
    }
  });
}

export async function saveReviewToDB(review: Review): Promise<void> {
  const safeReview = { ...review };
  if (Array.isArray(safeReview.photos)) {
    const processedPhotos: string[] = [];
    for (const p of safeReview.photos) {
      if (typeof p === 'string' && p.trim()) {
        const trimmed = p.trim().replace(/^["']|["']$/g, '');
        if (trimmed.startsWith('data:image')) {
          const comp = await compressImageToSafeSize(trimmed);
          processedPhotos.push(comp);
        } else {
          // Clean Google Drive URL to high-speed CDN direct format
          const matchFileD = trimmed.match(/\/file(?:\/u\/\d+)?\/d\/([a-zA-Z0-9_-]+)/i);
          const matchOpenId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
          const matchUc = trimmed.match(/\/uc\?.*id=([a-zA-Z0-9_-]+)/i);
          if (matchFileD && matchFileD[1]) {
            processedPhotos.push(`https://lh3.googleusercontent.com/d/${matchFileD[1]}`);
          } else if (matchOpenId && matchOpenId[1]) {
            processedPhotos.push(`https://lh3.googleusercontent.com/d/${matchOpenId[1]}`);
          } else if (matchUc && matchUc[1]) {
            processedPhotos.push(`https://lh3.googleusercontent.com/d/${matchUc[1]}`);
          } else {
            processedPhotos.push(trimmed);
          }
        }
      }
    }
    safeReview.photos = processedPhotos;
  }

  // Remove from deleted list if exists
  try {
    const rawDeleted = localStorage.getItem('kenax_deleted_review_ids');
    if (rawDeleted) {
      const deletedIds: string[] = JSON.parse(rawDeleted);
      const filtered = deletedIds.filter((id) => id !== review.id);
      safeSetLocalStorage('kenax_deleted_review_ids', JSON.stringify(filtered));
    }
  } catch {}

  const cleaned = cleanFirestoreData(safeReview);
  
  // 1. Direct Cloud Firestore Save (Dual write to reviews & preview_reviews for absolute multi-device permanence)
  try {
    setDoc(doc(db, 'reviews', review.id), cleaned, { merge: true }).catch((err) => {
      console.warn('[KenaX BD] Firestore reviews save fallback:', err);
    });
    setDoc(doc(db, 'preview_reviews', review.id), cleaned, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn('[KenaX BD] Firestore saveReviewToDB fallback:', err);
  }

  // 2. Central API Sync (Cross-server, Netlify, Vercel, Cloud Run relay)
  try {
    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleaned),
    }).catch(() => {});

    if (
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1') &&
      !window.location.hostname.includes('run.app')
    ) {
      fetch(`${CLOUD_RUN_API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaned),
      }).catch(() => {});
    }
  } catch {}

  // 3. Update Local Storage Custom Reviews Dictionary (Persistent against initial resets)
  try {
    const rawMap = localStorage.getItem('kenax_custom_reviews_map');
    const map = rawMap ? JSON.parse(rawMap) : {};
    map[review.id] = safeReview;
    safeSetLocalStorage('kenax_custom_reviews_map', JSON.stringify(map));
  } catch {}

  // 4. Update Local Storage Cache & IndexedDB
  try {
    const cached = localStorage.getItem('kenax_reviews_cache');
    let list: Review[] = cached ? JSON.parse(cached) : INITIAL_REVIEWS;
    const idx = list.findIndex((r) => r.id === review.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...safeReview };
    } else {
      list.unshift(safeReview);
    }
    safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(list));
    setIdbItem('kenax_reviews_idb', JSON.stringify(list)).catch(() => {});
  } catch (e) {
    console.warn('[KenaX BD] saveReviewToDB local cache error:', e);
  }
}

export async function updateReviewInDB(review: Review): Promise<void> {
  await saveReviewToDB(review);
}

export async function deleteReviewFromDB(reviewId: string): Promise<void> {
  // 1. Direct Cloud Firestore Delete
  try {
    deleteDoc(doc(db, 'reviews', reviewId)).catch(() => {});
    deleteDoc(doc(db, 'preview_reviews', reviewId)).catch(() => {});
    setDoc(doc(db, 'deletedReviews', reviewId), { id: reviewId, deletedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn('[KenaX BD] Firestore deleteReviewFromDB fallback:', err);
  }

  // 2. Central API Delete
  try {
    fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' }).catch(() => {});

    if (
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1') &&
      !window.location.hostname.includes('run.app')
    ) {
      fetch(`${CLOUD_RUN_API_BASE}/api/reviews/${reviewId}`, { method: 'DELETE' }).catch(() => {});
    }
  } catch {}

  // 3. Mark in deleted IDs and clean local cache & custom map
  try {
    const rawDeleted = localStorage.getItem('kenax_deleted_review_ids');
    const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
    if (!deletedIds.includes(reviewId)) {
      deletedIds.push(reviewId);
      safeSetLocalStorage('kenax_deleted_review_ids', JSON.stringify(deletedIds));
    }

    const rawMap = localStorage.getItem('kenax_custom_reviews_map');
    if (rawMap) {
      const map = JSON.parse(rawMap);
      delete map[reviewId];
      safeSetLocalStorage('kenax_custom_reviews_map', JSON.stringify(map));
    }

    const cached = localStorage.getItem('kenax_reviews_cache');
    if (cached) {
      const list: Review[] = JSON.parse(cached);
      const filtered = list.filter((r) => r.id !== reviewId);
      safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(filtered));
      setIdbItem('kenax_reviews_idb', JSON.stringify(filtered)).catch(() => {});
    }
  } catch (e) {}
}

// ==========================================
// DROPSHIPPING SUPPLIERS
// ==========================================

export async function getSuppliersFromDB(): Promise<Supplier[]> {
  try {
    const snap = await getDocs(collection(db, 'suppliers'));
    if (!snap.empty) {
      const fetched = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Supplier));

      // Check deleted list
      const rawDeleted = localStorage.getItem('kenax_deleted_supplier_ids');
      const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
      const valid = fetched.filter((s) => !deletedIds.includes(s.id));

      // Merge with initial if not deleted
      const existingIds = new Set(valid.map((s) => s.id));
      INITIAL_SUPPLIERS.forEach((initS) => {
        if (!existingIds.has(initS.id) && !deletedIds.includes(initS.id)) {
          valid.push(initS);
        }
      });

      safeSetLocalStorage('kenax_suppliers_cache', JSON.stringify(valid));
      return valid;
    }
  } catch (err) {
    console.warn('[KenaX BD] getSuppliersFromDB Firestore fallback:', err);
  }

  // Fallback to cache or initial
  try {
    const cached = localStorage.getItem('kenax_suppliers_cache');
    if (cached) {
      const list: Supplier[] = JSON.parse(cached);
      const rawDeleted = localStorage.getItem('kenax_deleted_supplier_ids');
      const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
      return list.filter((s) => !deletedIds.includes(s.id));
    }
  } catch (e) {}

  return [...INITIAL_SUPPLIERS];
}

export async function saveSupplierToDB(supplier: Supplier): Promise<void> {
  const cleaned = cleanFirestoreData(supplier);
  try {
    await setDoc(doc(db, 'suppliers', supplier.id), cleaned, { merge: true });
    await deleteDoc(doc(db, 'deletedSuppliers', supplier.id));
  } catch (err) {
    console.warn('[KenaX BD] Firestore saveSupplierToDB fallback:', err);
  }

  try {
    const rawDeleted = localStorage.getItem('kenax_deleted_supplier_ids');
    if (rawDeleted) {
      const deletedList: string[] = JSON.parse(rawDeleted);
      const filtered = deletedList.filter((id) => id !== supplier.id);
      safeSetLocalStorage('kenax_deleted_supplier_ids', JSON.stringify(filtered));
    }

    const cached = localStorage.getItem('kenax_suppliers_cache');
    let list: Supplier[] = cached ? JSON.parse(cached) : [...INITIAL_SUPPLIERS];
    const idx = list.findIndex((s) => s.id === supplier.id);
    if (idx >= 0) {
      list[idx] = supplier;
    } else {
      list.unshift(supplier);
    }
    safeSetLocalStorage('kenax_suppliers_cache', JSON.stringify(list));
  } catch (e) {
    console.warn('[KenaX BD] saveSupplierToDB local cache error:', e);
  }
}

export async function updateSupplierInDB(supplier: Supplier): Promise<void> {
  await saveSupplierToDB(supplier);
}

export async function deleteSupplierFromDB(supplierId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'suppliers', supplierId));
    await setDoc(doc(db, 'deletedSuppliers', supplierId), {
      deletedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[KenaX BD] Firestore deleteSupplierFromDB fallback:', err);
  }

  try {
    const rawDeleted = localStorage.getItem('kenax_deleted_supplier_ids');
    const deletedList: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
    if (!deletedList.includes(supplierId)) {
      deletedList.push(supplierId);
      safeSetLocalStorage('kenax_deleted_supplier_ids', JSON.stringify(deletedList));
    }

    const cached = localStorage.getItem('kenax_suppliers_cache');
    if (cached) {
      const list: Supplier[] = JSON.parse(cached);
      const filtered = list.filter((s) => s.id !== supplierId);
      safeSetLocalStorage('kenax_suppliers_cache', JSON.stringify(filtered));
    }
  } catch (e) {}
}

export function subscribeToSuppliers(callback: (suppliers: Supplier[]) => void): Unsubscribe {
  try {
    const q = collection(db, 'suppliers');
    return onSnapshot(
      q,
      (snap) => {
        const rawDeleted = localStorage.getItem('kenax_deleted_supplier_ids');
        const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
        const fetched = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Supplier));
        const valid = fetched.filter((s) => !deletedIds.includes(s.id));

        const existingIds = new Set(valid.map((s) => s.id));
        INITIAL_SUPPLIERS.forEach((initS) => {
          if (!existingIds.has(initS.id) && !deletedIds.includes(initS.id)) {
            valid.push(initS);
          }
        });

        safeSetLocalStorage('kenax_suppliers_cache', JSON.stringify(valid));
        callback(valid);
      },
      (err) => {
        console.warn('[KenaX BD] subscribeToSuppliers listener warning:', err);
        getSuppliersFromDB().then(callback);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToSuppliers setup error:', e);
    getSuppliersFromDB().then(callback);
    return () => {};
  }
}

// ==========================================
// SOURCING LOCATIONS & WHOLESALERS (ON STOCK)
// ==========================================
export async function getSourcingLocationsFromDB(): Promise<SourcingLocation[]> {
  try {
    const snap = await getDocs(collection(db, 'sourcingLocations'));
    if (!snap.empty) {
      const fetched = snap.docs.map((d) => ({ ...d.data(), id: d.id } as SourcingLocation));

      const rawDeleted = localStorage.getItem('kenax_deleted_sourcing_location_ids');
      const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
      const valid = fetched.filter((s) => !deletedIds.includes(s.id));

      const existingIds = new Set(valid.map((s) => s.id));
      INITIAL_SOURCING_LOCATIONS.forEach((initLoc) => {
        if (!existingIds.has(initLoc.id) && !deletedIds.includes(initLoc.id)) {
          valid.push(initLoc);
        }
      });

      safeSetLocalStorage('kenax_sourcing_locations_cache', JSON.stringify(valid));
      return valid;
    }
  } catch (err) {
    console.warn('[KenaX BD] getSourcingLocationsFromDB Firestore fallback:', err);
  }

  // Fallback to cache or initial
  try {
    const cached = localStorage.getItem('kenax_sourcing_locations_cache');
    if (cached) {
      const list: SourcingLocation[] = JSON.parse(cached);
      const rawDeleted = localStorage.getItem('kenax_deleted_sourcing_location_ids');
      const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
      return list.filter((s) => !deletedIds.includes(s.id));
    }
  } catch (e) {}

  return [...INITIAL_SOURCING_LOCATIONS];
}

export async function saveSourcingLocationToDB(location: SourcingLocation): Promise<void> {
  const cleaned = cleanFirestoreData(location);
  try {
    await setDoc(doc(db, 'sourcingLocations', location.id), cleaned, { merge: true });
    await deleteDoc(doc(db, 'deletedSourcingLocations', location.id));
  } catch (err) {
    console.warn('[KenaX BD] Firestore saveSourcingLocationToDB fallback:', err);
  }

  try {
    const rawDeleted = localStorage.getItem('kenax_deleted_sourcing_location_ids');
    if (rawDeleted) {
      const deletedList: string[] = JSON.parse(rawDeleted);
      const filtered = deletedList.filter((id) => id !== location.id);
      safeSetLocalStorage('kenax_deleted_sourcing_location_ids', JSON.stringify(filtered));
    }

    const cached = localStorage.getItem('kenax_sourcing_locations_cache');
    let list: SourcingLocation[] = cached ? JSON.parse(cached) : [...INITIAL_SOURCING_LOCATIONS];
    const idx = list.findIndex((s) => s.id === location.id);
    if (idx >= 0) {
      list[idx] = location;
    } else {
      list.unshift(location);
    }
    safeSetLocalStorage('kenax_sourcing_locations_cache', JSON.stringify(list));
  } catch (e) {
    console.warn('[KenaX BD] saveSourcingLocationToDB local cache error:', e);
  }
}

export async function updateSourcingLocationInDB(location: SourcingLocation): Promise<void> {
  await saveSourcingLocationToDB(location);
}

export async function deleteSourcingLocationFromDB(locationId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'sourcingLocations', locationId));
    await setDoc(doc(db, 'deletedSourcingLocations', locationId), {
      deletedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[KenaX BD] Firestore deleteSourcingLocationFromDB fallback:', err);
  }

  try {
    const rawDeleted = localStorage.getItem('kenax_deleted_sourcing_location_ids');
    const deletedList: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
    if (!deletedList.includes(locationId)) {
      deletedList.push(locationId);
      safeSetLocalStorage('kenax_deleted_sourcing_location_ids', JSON.stringify(deletedList));
    }

    const cached = localStorage.getItem('kenax_sourcing_locations_cache');
    if (cached) {
      const list: SourcingLocation[] = JSON.parse(cached);
      const filtered = list.filter((s) => s.id !== locationId);
      safeSetLocalStorage('kenax_sourcing_locations_cache', JSON.stringify(filtered));
    }
  } catch (e) {}
}

export function subscribeToSourcingLocations(callback: (locations: SourcingLocation[]) => void): Unsubscribe {
  try {
    const q = collection(db, 'sourcingLocations');
    return onSnapshot(
      q,
      (snap) => {
        const rawDeleted = localStorage.getItem('kenax_deleted_sourcing_location_ids');
        const deletedIds: string[] = rawDeleted ? JSON.parse(rawDeleted) : [];
        const fetched = snap.docs.map((d) => ({ ...d.data(), id: d.id } as SourcingLocation));
        const valid = fetched.filter((s) => !deletedIds.includes(s.id));

        const existingIds = new Set(valid.map((s) => s.id));
        INITIAL_SOURCING_LOCATIONS.forEach((initLoc) => {
          if (!existingIds.has(initLoc.id) && !deletedIds.includes(initLoc.id)) {
            valid.push(initLoc);
          }
        });

        safeSetLocalStorage('kenax_sourcing_locations_cache', JSON.stringify(valid));
        callback(valid);
      },
      (err) => {
        console.warn('[KenaX BD] subscribeToSourcingLocations listener warning:', err);
        getSourcingLocationsFromDB().then(callback);
      }
    );
  } catch (e) {
    console.warn('[KenaX BD] subscribeToSourcingLocations setup error:', e);
    getSourcingLocationsFromDB().then(callback);
    return () => {};
  }
}

// ----------------------------------------------------
// Newsletter Subscribers (Footer Email Signups)
// ----------------------------------------------------

const NEWSLETTER_CACHE_KEY = 'kenax_newsletter_subscribers_cache';

export async function saveNewsletterSubscriber(
  email: string,
  source: string = 'footer'
): Promise<{ success: boolean; message: string; subscriber?: NewsletterSubscriber }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'একটি সঠিক ইমেইল এড্রেস প্রদান করুন।' };
  }

  const subId = `sub_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
  const now = new Date().toISOString();

  const subscriber: NewsletterSubscriber = {
    id: subId,
    email: cleanEmail,
    subscribedAt: now,
    source,
    status: 'active',
  };

  try {
    const colRef = collection(db, 'newsletter_subscribers');
    await setDoc(doc(colRef, subId), subscriber);
  } catch (err) {
    console.warn('[KenaX BD] Firestore saveNewsletterSubscriber error, fallback to cache:', err);
  }

  // Update local cache
  try {
    const raw = localStorage.getItem(NEWSLETTER_CACHE_KEY);
    const list: NewsletterSubscriber[] = raw ? JSON.parse(raw) : [];
    const updated = [subscriber, ...list.filter((s) => s.id !== subId)];
    safeSetLocalStorage(NEWSLETTER_CACHE_KEY, JSON.stringify(updated));
  } catch {}

  return { success: true, message: 'ধন্যবাদ! আপনি সফলভাবে সাবস্ক্রাইব করেছেন।', subscriber };
}

export async function deleteNewsletterSubscriber(subscriberId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'newsletter_subscribers', subscriberId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[KenaX BD] deleteNewsletterSubscriber error:', err);
  }

  try {
    const raw = localStorage.getItem(NEWSLETTER_CACHE_KEY);
    if (raw) {
      const list: NewsletterSubscriber[] = JSON.parse(raw);
      const updated = list.filter((s) => s.id !== subscriberId);
      safeSetLocalStorage(NEWSLETTER_CACHE_KEY, JSON.stringify(updated));
    }
  } catch {}
  return true;
}

export async function getNewsletterSubscribersFromDB(): Promise<NewsletterSubscriber[]> {
  try {
    const colRef = collection(db, 'newsletter_subscribers');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ ...d.data(), id: d.id } as NewsletterSubscriber));
      items.sort((a, b) => new Date(b.subscribedAt || 0).getTime() - new Date(a.subscribedAt || 0).getTime());
      safeSetLocalStorage(NEWSLETTER_CACHE_KEY, JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.warn('[KenaX BD] getNewsletterSubscribersFromDB error, fallback to cache:', err);
  }

  try {
    const raw = localStorage.getItem(NEWSLETTER_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function subscribeToNewsletterSubscribers(callback: (subs: NewsletterSubscriber[]) => void): Unsubscribe {
  try {
    const colRef = collection(db, 'newsletter_subscribers');
    return onSnapshot(
      colRef,
      (snap) => {
        const items = snap.docs.map((d) => ({ ...d.data(), id: d.id } as NewsletterSubscriber));
        items.sort((a, b) => new Date(b.subscribedAt || 0).getTime() - new Date(a.subscribedAt || 0).getTime());
        safeSetLocalStorage(NEWSLETTER_CACHE_KEY, JSON.stringify(items));
        callback(items);
      },
      (err) => {
        console.warn('[KenaX BD] subscribeToNewsletterSubscribers snapshot error:', err);
        getNewsletterSubscribersFromDB().then(callback);
      }
    );
  } catch (err) {
    console.warn('[KenaX BD] subscribeToNewsletterSubscribers setup error:', err);
    getNewsletterSubscribersFromDB().then(callback);
    return () => {};
  }
}






