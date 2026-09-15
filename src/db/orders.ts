import fs from 'fs';
import path from 'path';
import { Order } from '../types/index.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');
const SERVER_ORDERS_FILE = path.join(SERVER_STORE_DIR, 'server_orders.json');

export function getAllOrdersFromStore(): Order[] {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    if (!fs.existsSync(SERVER_ORDERS_FILE)) {
      fs.writeFileSync(SERVER_ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const content = fs.readFileSync(SERVER_ORDERS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[Server Orders] Error reading server_orders.json:', err);
  }
  return [];
}

export function saveOrderToStore(order: Order): Order {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const current = getAllOrdersFromStore();
    const idx = current.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...order, updatedAt: new Date().toISOString() };
    } else {
      current.unshift(order);
    }
    fs.writeFileSync(SERVER_ORDERS_FILE, JSON.stringify(current, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server Orders] Error writing server_orders.json:', err);
  }
  return order;
}

export function updateOrderInStore(orderId: string, updates: Partial<Order>): Order | null {
  try {
    const current = getAllOrdersFromStore();
    const idx = current.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      const updated = {
        ...current[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      current[idx] = updated;
      fs.writeFileSync(SERVER_ORDERS_FILE, JSON.stringify(current, null, 2), 'utf-8');
      return updated;
    }
  } catch (err) {
    console.error('[Server Orders] Error updating server_orders.json:', err);
  }
  return null;
}

export function deleteOrderFromStore(orderId: string): boolean {
  try {
    const current = getAllOrdersFromStore();
    const filtered = current.filter((o) => o.id !== orderId);
    fs.writeFileSync(SERVER_ORDERS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Server Orders] Error deleting order from store:', err);
    return false;
  }
}

export function getCustomerOrdersFromStore(identifier: string): Order[] {
  if (!identifier) return [];
  const cleanId = identifier.trim().toLowerCase();
  const cleanPhone = identifier.replace(/\D/g, '');
  const allOrders = getAllOrdersFromStore();

  return allOrders.filter((o) => {
    if (!o) return false;
    if (o.id && o.id.toLowerCase() === cleanId) return true;
    if (o.customerId && o.customerId.toLowerCase() === cleanId) return true;
    if (o.customerEmail && o.customerEmail.toLowerCase() === cleanId) return true;
    if (cleanPhone.length >= 7) {
      const oPhone = (o.customerMobile || (o as any).customerPhone || '').replace(/\D/g, '');
      const dPhone = (o.deliveryMobile || '').replace(/\D/g, '');
      if (oPhone.includes(cleanPhone) || dPhone.includes(cleanPhone) || cleanPhone.includes(oPhone)) return true;
    }
    return false;
  });
}
