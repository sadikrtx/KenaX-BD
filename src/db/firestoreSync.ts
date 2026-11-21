import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, setLogLevel, collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

try {
  setLogLevel('silent');
} catch {}
import fs from 'fs';
import path from 'path';
import { saveCustomerToStore, getAllCustomersFromStore, deleteCustomerFromStore } from './customers.ts';
import { saveOrderToStore, getAllOrdersFromStore } from './orders.ts';
import { saveStaffToStore, getAllStaffFromStore, deleteStaffFromStore } from './staff.ts';
import {
  saveProductToSQL,
  deleteProductFromSQL,
  recordDeletedProductIdInStore,
  getAllProductsFromSQL,
  getDeletedProductIdsFromStore,
} from './products.ts';
import type { Product } from '../types/index.ts';

let dbInstance: any = null;
let quotaExceededLogged = false;

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || err.name || '').toLowerCase();
  const msg = String(err.message || err.toString?.() || '');
  return (
    code === 'permission-denied' ||
    code === 'unauthenticated' ||
    code === 'resource-exhausted' ||
    code === '7' ||
    code === '429' ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('permission-denied') ||
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('resource-exhausted') ||
    msg.includes('429') ||
    msg.includes('Free daily read units')
  );
}

function handleFirestoreUnavailable(err: any): boolean {
  if (isQuotaError(err)) {
    if (!quotaExceededLogged) {
      quotaExceededLogged = true;
      console.info('[Firestore Sync] Operating in high-speed local server store mode.');
    }
    return true;
  }
  return false;
}

function getDb() {
  if (quotaExceededLogged) return null;
  if (dbInstance) return dbInstance;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.info('[Firestore Sync] firebase-applet-config.json not found');
      return null;
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const app = !getApps().length ? initializeApp(config) : getApp();
    dbInstance = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
    return dbInstance;
  } catch (err) {
    console.info('[Firestore Sync] Operating with local server store.');
    return null;
  }
}

export async function syncFirestoreWithServerStore(): Promise<void> {
  const db = getDb();
  if (!db || quotaExceededLogged) return;

  try {
    console.log('[Firestore Sync] Synchronizing Firestore collections with server store...');

    // Gather deleted customer tombstones first
    const deletedCustomerIds = new Set<string>();
    try {
      const delSnap = await getDocs(collection(db, 'deletedCustomers'));
      delSnap.forEach((d) => {
        deletedCustomerIds.add(d.id);
        deleteCustomerFromStore(d.id);
      });
    } catch (err: any) {
      if (handleFirestoreUnavailable(err)) return;
      console.info('[Firestore Sync] deletedCustomers read fallback:', err.message);
    }

    // Gather deleted staff tombstones first
    const deletedStaffIds = new Set<string>();
    try {
      const delStaffSnap = await getDocs(collection(db, 'deletedStaff'));
      delStaffSnap.forEach((d) => {
        deletedStaffIds.add(d.id);
        deleteStaffFromStore(d.id);
      });
    } catch (err: any) {
      if (handleFirestoreUnavailable(err)) return;
      console.info('[Firestore Sync] deletedStaff read fallback:', err.message);
    }

    // Gather deleted product tombstones
    const deletedProductIds = new Set<string>();
    try {
      const [delProdSnap1, delProdSnap2] = await Promise.all([
        getDocs(collection(db, 'deletedProducts')).catch((e) => {
          handleFirestoreUnavailable(e);
          return { forEach: () => {} } as any;
        }),
        getDocs(collection(db, 'preview_deletedProducts')).catch((e) => {
          handleFirestoreUnavailable(e);
          return { forEach: () => {} } as any;
        }),
      ]);
      if (quotaExceededLogged) return;
      delProdSnap1.forEach((d: any) => {
        deletedProductIds.add(d.id);
        recordDeletedProductIdInStore(d.id);
        deleteProductFromSQL(d.id).catch(() => {});
      });
      delProdSnap2.forEach((d: any) => {
        deletedProductIds.add(d.id);
        recordDeletedProductIdInStore(d.id);
        deleteProductFromSQL(d.id).catch(() => {});
      });
    } catch (err: any) {
      if (handleFirestoreUnavailable(err)) return;
      console.info('[Firestore Sync] deletedProducts read fallback:', err.message);
    }

    // 1. Sync Products from Firestore to Server Store
    try {
      const prodSnap = await getDocs(collection(db, 'products'));
      if (!prodSnap.empty) {
        console.log(`[Firestore Sync] Found ${prodSnap.size} products in Firestore.`);
        prodSnap.forEach((d) => {
          const data = d.data() as Product;
          if (data && data.id) {
            if (deletedProductIds.has(data.id) || deletedProductIds.has(d.id)) {
              deleteDoc(doc(db, 'products', d.id)).catch(() => {});
              deleteDoc(doc(db, 'preview_products', d.id)).catch(() => {});
              deleteProductFromSQL(data.id).catch(() => {});
            } else {
              saveProductToSQL({ ...data, id: d.id });
            }
          }
        });
      }
    } catch (err: any) {
      if (handleFirestoreUnavailable(err)) return;
      console.info('[Firestore Sync] Product sync notice:', err.message);
    }

    // 2. Sync Customers
    try {
      const custSnap = await getDocs(collection(db, 'customers'));
      custSnap.forEach((d) => {
        const data = d.data();
        if (d.id.startsWith('staff-cust-') || (data && data.id && data.id.startsWith('staff-cust-'))) {
          // Permanently purge staff masquerade accounts from customers collection
          deleteDoc(doc(db, 'customers', d.id)).catch(() => {});
        } else if (deletedCustomerIds.has(d.id) || (data && data.id && deletedCustomerIds.has(data.id))) {
          deleteDoc(doc(db, 'customers', d.id)).catch(() => {});
          deleteCustomerFromStore(d.id);
        } else if (data) {
          saveCustomerToStore({ id: d.id, ...data, isV2Account: true } as any);
        }
      });
      console.log(`[Firestore Sync] Synced ${custSnap.size} customers from Firestore.`);
    } catch (err: any) {
      if (handleFirestoreUnavailable(err)) return;
      console.info('[Firestore Sync] Customer sync notice:', err.message);
    }

    // 2. Sync Orders
    try {
      const orderSnap = await getDocs(collection(db, 'orders'));
      orderSnap.forEach((d) => {
        const data = d.data();
        if (data) {
          saveOrderToStore({ id: d.id, ...data } as any);
        }
      });
      console.log(`[Firestore Sync] Synced ${orderSnap.size} orders from Firestore.`);
    } catch (err: any) {
      if (handleFirestoreUnavailable(err)) return;
      console.info('[Firestore Sync] Order sync notice:', err.message);
    }

    // 3. Sync Staff from both 'staff' and 'preview_staff' collections
    try {
      const staffSnap1 = await getDocs(collection(db, 'staff'));
      staffSnap1.forEach((d) => {
        const data = d.data();
        if (deletedStaffIds.has(d.id) || (data && data.id && deletedStaffIds.has(data.id))) {
          deleteDoc(doc(db, 'staff', d.id)).catch(() => {});
          deleteStaffFromStore(d.id);
        } else if (data) {
          saveStaffToStore({ id: d.id, ...data } as any);
        }
      });

      const staffSnap2 = await getDocs(collection(db, 'preview_staff'));
      staffSnap2.forEach((d) => {
        const data = d.data();
        if (deletedStaffIds.has(d.id) || (data && data.id && deletedStaffIds.has(data.id))) {
          deleteDoc(doc(db, 'preview_staff', d.id)).catch(() => {});
          deleteStaffFromStore(d.id);
        } else if (data) {
          saveStaffToStore({ id: d.id, ...data } as any);
        }
      });
      console.log(`[Firestore Sync] Synced staff accounts from Firestore.`);
    } catch (err: any) {
      if (handleFirestoreUnavailable(err)) return;
      console.info('[Firestore Sync] Staff sync notice:', err.message);
    }

    if (quotaExceededLogged) return;

    // Push local valid items that might not be in Firestore yet
    const currentCust = getAllCustomersFromStore();
    for (const c of currentCust) {
      if (quotaExceededLogged) break;
      if (c && c.id && !c.id.startsWith('staff-cust-') && !deletedCustomerIds.has(c.id)) {
        await writeCustomerToFirestore(c).catch(() => {});
      }
    }

    const currentOrders = getAllOrdersFromStore();
    for (const o of currentOrders) {
      if (quotaExceededLogged) break;
      if (o && o.id) {
        await writeOrderToFirestore(o).catch(() => {});
      }
    }

    const currentStaff = getAllStaffFromStore();
    for (const s of currentStaff) {
      if (quotaExceededLogged) break;
      if (s && s.id && !deletedStaffIds.has(s.id)) {
        await writeStaffToFirestore(s).catch(() => {});
      }
    }
  } catch (err: any) {
    if (handleFirestoreUnavailable(err)) return;
    console.info('[Firestore Sync] Global sync fallback:', err.message);
  }
}

export async function writeCustomerToFirestore(customer: any, isEnvPreview?: boolean): Promise<void> {
  const db = getDb();
  if (!db || quotaExceededLogged || !customer || !customer.id || customer.id.startsWith('staff-cust-')) return;
  const colName = isEnvPreview ? 'preview_customers' : 'customers';
  try {
    await setDoc(doc(db, colName, customer.id), { ...customer, isV2Account: true }, { merge: true });
  } catch (err: any) {
    if (handleFirestoreUnavailable(err)) return;
    console.info('[Firestore Sync] writeCustomerToFirestore fallback:', err.message);
  }
}

export async function deleteCustomerFromFirestore(customerId: string, isEnvPreview?: boolean): Promise<void> {
  const db = getDb();
  if (!db || quotaExceededLogged || !customerId) return;
  const colName = isEnvPreview ? 'preview_customers' : 'customers';
  const delColName = isEnvPreview ? 'preview_deletedCustomers' : 'deletedCustomers';
  try {
    await deleteDoc(doc(db, colName, customerId));
    await setDoc(doc(db, delColName, customerId), {
      id: customerId,
      deletedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    if (handleFirestoreUnavailable(err)) return;
    console.info('[Firestore Sync] deleteCustomerFromFirestore fallback:', err.message);
  }
}

export async function writeOrderToFirestore(order: any, isEnvPreview?: boolean): Promise<void> {
  const db = getDb();
  if (!db || quotaExceededLogged || !order || !order.id) return;
  const colName = isEnvPreview ? 'preview_orders' : 'orders';
  try {
    await setDoc(doc(db, colName, order.id), order, { merge: true });
  } catch (err: any) {
    if (handleFirestoreUnavailable(err)) return;
    console.info('[Firestore Sync] writeOrderToFirestore fallback:', err.message);
  }
}

export async function writeStaffToFirestore(staff: any, _isEnvPreview?: boolean): Promise<void> {
  const db = getDb();
  if (!db || quotaExceededLogged || !staff || !staff.id) return;
  try {
    const sanitized = { ...staff };
    delete sanitized.password;
    delete sanitized.passwordHash;
    const results = await Promise.allSettled([
      setDoc(doc(db, 'staff', sanitized.id), sanitized, { merge: true }),
      setDoc(doc(db, 'preview_staff', sanitized.id), sanitized, { merge: true }),
    ]);
    for (const r of results) {
      if (r.status === 'rejected' && handleFirestoreUnavailable(r.reason)) return;
    }
  } catch (err: any) {
    if (handleFirestoreUnavailable(err)) return;
    console.info('[Firestore Sync] writeStaffToFirestore fallback:', err.message);
  }
}

export async function deleteStaffFromFirestore(staffId: string, _isEnvPreview?: boolean): Promise<void> {
  const db = getDb();
  if (!db || quotaExceededLogged || !staffId) return;
  try {
    const results = await Promise.allSettled([
      deleteDoc(doc(db, 'staff', staffId)),
      deleteDoc(doc(db, 'preview_staff', staffId)),
      setDoc(doc(db, 'deletedStaff', staffId), { id: staffId, deletedAt: new Date().toISOString() }),
      setDoc(doc(db, 'preview_deletedStaff', staffId), { id: staffId, deletedAt: new Date().toISOString() }),
    ]);
    for (const r of results) {
      if (r.status === 'rejected' && handleFirestoreUnavailable(r.reason)) return;
    }
  } catch (err: any) {
    if (handleFirestoreUnavailable(err)) return;
    console.info('[Firestore Sync] deleteStaffFromFirestore fallback:', err.message);
  }
}

export async function writeProductToFirestore(product: any, isEnvPreview?: boolean): Promise<void> {
  const db = getDb();
  if (!db || quotaExceededLogged || !product || !product.id) return;
  const colName = isEnvPreview ? 'preview_products' : 'products';
  const delColName = isEnvPreview ? 'preview_deletedProducts' : 'deletedProducts';
  try {
    const cleanProduct = JSON.parse(JSON.stringify(product));
    await setDoc(doc(db, colName, product.id), cleanProduct);
    // If it was in deletedProducts, remove the tombstone
    await deleteDoc(doc(db, delColName, product.id)).catch(() => {});
  } catch (err: any) {
    if (handleFirestoreUnavailable(err)) return;
    console.info('[Firestore Sync] writeProductToFirestore fallback:', err.message);
  }
}

export async function deleteProductFromFirestore(productId: string, _isEnvPreview?: boolean): Promise<void> {
  const db = getDb();
  if (!db || quotaExceededLogged || !productId) return;
  try {
    const results = await Promise.allSettled([
      deleteDoc(doc(db, 'products', productId)),
      deleteDoc(doc(db, 'preview_products', productId)),
      setDoc(doc(db, 'deletedProducts', productId), {
        id: productId,
        deletedAt: new Date().toISOString(),
      }),
      setDoc(doc(db, 'preview_deletedProducts', productId), {
        id: productId,
        deletedAt: new Date().toISOString(),
      }),
    ]);
    for (const r of results) {
      if (r.status === 'rejected' && handleFirestoreUnavailable(r.reason)) return;
    }
  } catch (err: any) {
    if (handleFirestoreUnavailable(err)) return;
    console.info('[Firestore Sync] deleteProductFromFirestore fallback:', err.message);
  }
}

