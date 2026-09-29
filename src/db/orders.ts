import fs from 'fs';
import path from 'path';
import { Order } from '../types/index.ts';
import { normalizeBDPhoneNumber } from '../utils/phoneUtils.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');

function getOrdersFilePath(isEnvPreview?: boolean): string {
  return path.join(SERVER_STORE_DIR, isEnvPreview ? 'preview_server_orders.json' : 'server_orders.json');
}

export function getAllOrdersFromStore(isEnvPreview?: boolean): Order[] {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const filePath = getOrdersFilePath(isEnvPreview);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[Server Orders] Error reading orders file:', err);
  }
  return [];
}

export function saveOrderToStore(order: Order, isEnvPreview?: boolean): Order {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const sanitizedOrder: Order = {
      ...order,
      customerMobile: normalizeBDPhoneNumber(order.customerMobile || (order as any).customerPhone || ''),
      deliveryMobile: normalizeBDPhoneNumber(order.deliveryMobile || order.customerMobile || ''),
    };
    const filePath = getOrdersFilePath(isEnvPreview);
    const current = getAllOrdersFromStore(isEnvPreview);
    const idx = current.findIndex((o) => o.id === order.id);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...sanitizedOrder, updatedAt: new Date().toISOString() };
    } else {
      current.unshift(sanitizedOrder);
    }
    fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
    return sanitizedOrder;
  } catch (err) {
    console.error('[Server Orders] Error writing orders file:', err);
  }
  return order;
}

export function updateOrderInStore(orderId: string, updates: Partial<Order>, isEnvPreview?: boolean): Order | null {
  try {
    const filePath = getOrdersFilePath(isEnvPreview);
    const current = getAllOrdersFromStore(isEnvPreview);
    const idx = current.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      const sanitizedUpdates: Partial<Order> = { ...updates };
      if (updates.customerMobile) {
        sanitizedUpdates.customerMobile = normalizeBDPhoneNumber(updates.customerMobile);
      }
      if (updates.deliveryMobile) {
        sanitizedUpdates.deliveryMobile = normalizeBDPhoneNumber(updates.deliveryMobile);
      }
      const updated = {
        ...current[idx],
        ...sanitizedUpdates,
        updatedAt: new Date().toISOString(),
      };
      current[idx] = updated;
      fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
      return updated;
    }
  } catch (err) {
    console.error('[Server Orders] Error updating orders file:', err);
  }
  return null;
}

export function deleteOrderFromStore(orderId: string, isEnvPreview?: boolean): boolean {
  try {
    const filePath = getOrdersFilePath(isEnvPreview);
    const current = getAllOrdersFromStore(isEnvPreview);
    const filtered = current.filter((o) => o.id !== orderId);
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Server Orders] Error deleting order from store:', err);
    return false;
  }
}

export function getCustomerOrdersFromStore(identifier: string, isEnvPreview?: boolean): Order[] {
  if (!identifier) return [];
  const cleanId = identifier.trim().toLowerCase();
  const cleanPhone = identifier.replace(/\D/g, '');
  const allOrders = getAllOrdersFromStore(isEnvPreview);

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
