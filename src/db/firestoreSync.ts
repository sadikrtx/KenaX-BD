import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
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
import { Product } from '../types/index.ts';

let dbInstance: any = null;

function getDb() {
  if (dbInstance) return dbInstance;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('[Firestore Sync] firebase-applet-config.json not found');
      return null;
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const app = !getApps().length ? initializeApp(config) : getApp();
    dbInstance = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
    return dbInstance;
  } catch (err) {
    console.error('[Firestore Sync] Failed to initialize Firestore on server:', err);
    return null;
  }
}

export async function syncFirestoreWithServerStore(): Promise<void> {
  const db = getDb();
  if (!db) return;

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
      console.warn('[Firestore Sync] deletedCustomers read fallback:', err.message);
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
      console.warn('[Firestore Sync] deletedStaff read fallback:', err.message);
    }

    // Gather deleted product tombstones
    const deletedProductIds = new Set<string>();
    try {
      const delProdSnap = await getDocs(collection(db, 'deletedProducts'));
      delProdSnap.forEach((d) => {
        deletedProductIds.add(d.id);
        recordDeletedProductIdInStore(d.id);
        deleteProductFromSQL(d.id).catch(() => {});
      });
    } catch (err: any) {
      console.warn('[Firestore Sync] deletedProducts read fallback:', err.message);
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
              deleteProductFromSQL(data.id).catch(() => {});
            } else {
              saveProductToSQL({ ...data, id: d.id });
            }
          }
        });
      }
    } catch (err: any) {
      console.warn('[Firestore Sync] Product sync error:', err.message);
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
      console.warn('[Firestore Sync] Customer sync error:', err.message);
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
      console.warn('[Firestore Sync] Order sync error:', err.message);
    }

    // 3. Sync Staff
    try {
      const staffSnap = await getDocs(collection(db, 'staff'));
      staffSnap.forEach((d) => {
        const data = d.data();
        if (deletedStaffIds.has(d.id) || (data && data.id && deletedStaffIds.has(data.id))) {
          deleteDoc(doc(db, 'staff', d.id)).catch(() => {});
          deleteStaffFromStore(d.id);
        } else if (data) {
          saveStaffToStore({ id: d.id, ...data } as any);
        }
      });
      console.log(`[Firestore Sync] Synced ${staffSnap.size} staff from Firestore.`);
    } catch (err: any) {
      console.warn('[Firestore Sync] Staff sync error:', err.message);
    }

    // Push local valid items that might not be in Firestore yet
    const currentCust = getAllCustomersFromStore();
    for (const c of currentCust) {
      if (c && c.id && !c.id.startsWith('staff-cust-') && !deletedCustomerIds.has(c.id)) {
        writeCustomerToFirestore(c).catch(() => {});
      }
    }

    const currentOrders = getAllOrdersFromStore();
    for (const o of currentOrders) {
      if (o && o.id) {
        writeOrderToFirestore(o).catch(() => {});
      }
    }

    const currentStaff = getAllStaffFromStore();
    for (const s of currentStaff) {
      if (s && s.id && !deletedStaffIds.has(s.id)) {
        writeStaffToFirestore(s).catch(() => {});
      }
    }
  } catch (err: any) {
    console.error('[Firestore Sync] Global sync error:', err.message);
  }
}

export async function writeCustomerToFirestore(customer: any): Promise<void> {
  const db = getDb();
  if (!db || !customer || !customer.id || customer.id.startsWith('staff-cust-')) return;
  try {
    await setDoc(doc(db, 'customers', customer.id), { ...customer, isV2Account: true }, { merge: true });
  } catch (err: any) {
    console.warn('[Firestore Sync] writeCustomerToFirestore error:', err.message);
  }
}

export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  const db = getDb();
  if (!db || !customerId) return;
  try {
    await deleteDoc(doc(db, 'customers', customerId));
    await setDoc(doc(db, 'deletedCustomers', customerId), {
      id: customerId,
      deletedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[Firestore Sync] deleteCustomerFromFirestore error:', err.message);
  }
}

export async function writeOrderToFirestore(order: any): Promise<void> {
  const db = getDb();
  if (!db || !order || !order.id) return;
  try {
    await setDoc(doc(db, 'orders', order.id), order, { merge: true });
  } catch (err: any) {
    console.warn('[Firestore Sync] writeOrderToFirestore error:', err.message);
  }
}

export async function writeStaffToFirestore(staff: any): Promise<void> {
  const db = getDb();
  if (!db || !staff || !staff.id) return;
  try {
    await setDoc(doc(db, 'staff', staff.id), staff, { merge: true });
  } catch (err: any) {
    console.warn('[Firestore Sync] writeStaffToFirestore error:', err.message);
  }
}

export async function deleteStaffFromFirestore(staffId: string): Promise<void> {
  const db = getDb();
  if (!db || !staffId) return;
  try {
    await deleteDoc(doc(db, 'staff', staffId));
  } catch (err: any) {
    console.warn('[Firestore Sync] deleteStaffFromFirestore error:', err.message);
  }
}

export async function writeProductToFirestore(product: any): Promise<void> {
  const db = getDb();
  if (!db || !product || !product.id) return;
  try {
    const cleanProduct = JSON.parse(JSON.stringify(product));
    await setDoc(doc(db, 'products', product.id), cleanProduct, { merge: true });
    // If it was in deletedProducts, remove the tombstone
    await deleteDoc(doc(db, 'deletedProducts', product.id)).catch(() => {});
  } catch (err: any) {
    console.warn('[Firestore Sync] writeProductToFirestore error:', err.message);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const db = getDb();
  if (!db || !productId) return;
  try {
    await deleteDoc(doc(db, 'products', productId));
    await setDoc(doc(db, 'deletedProducts', productId), {
      id: productId,
      deletedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[Firestore Sync] deleteProductFromFirestore error:', err.message);
  }
}

