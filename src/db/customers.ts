import fs from 'fs';
import path from 'path';
import { CustomerRecord } from '../types/index.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');
const SERVER_CUSTOMERS_FILE = path.join(SERVER_STORE_DIR, 'server_customers.json');

export function getAllCustomersFromStore(): CustomerRecord[] {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    if (!fs.existsSync(SERVER_CUSTOMERS_FILE)) {
      fs.writeFileSync(SERVER_CUSTOMERS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const content = fs.readFileSync(SERVER_CUSTOMERS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.filter((c) => c && c.id && !c.id.startsWith('staff-cust-'));
    }
  } catch (err) {
    console.warn('[Server Customers] Error reading server_customers.json:', err);
  }
  return [];
}

export function saveCustomerToStore(customer: CustomerRecord): CustomerRecord {
  if (!customer || !customer.id || customer.id.startsWith('staff-cust-')) {
    // Never persist temporary staff storefront sessions as customers
    return customer;
  }
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const current = getAllCustomersFromStore();
    const idx = current.findIndex((c) => c.id === customer.id || (customer.email && c.email?.toLowerCase() === customer.email.toLowerCase()));
    const sanitizedCustomer: CustomerRecord = {
      ...customer,
      isV2Account: true,
    };
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...sanitizedCustomer };
    } else {
      current.unshift(sanitizedCustomer);
    }
    fs.writeFileSync(SERVER_CUSTOMERS_FILE, JSON.stringify(current, null, 2), 'utf-8');
    return sanitizedCustomer;
  } catch (err) {
    console.error('[Server Customers] Error writing server_customers.json:', err);
  }
  return customer;
}

export function deleteCustomerFromStore(customerId: string): boolean {
  try {
    const current = getAllCustomersFromStore();
    const filtered = current.filter((c) => c.id !== customerId);
    fs.writeFileSync(SERVER_CUSTOMERS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Server Customers] Error deleting customer from store:', err);
    return false;
  }
}

export function findCustomerInStore(identifier: string): CustomerRecord | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  const cleanPhone = identifier.replace(/\D/g, '');
  const all = getAllCustomersFromStore();

  const found = all.find((c) => {
    if (!c) return false;
    if (c.id && c.id.toLowerCase() === clean) return true;
    if (c.email && c.email.toLowerCase() === clean) return true;
    if (c.name && c.name.toLowerCase() === clean) return true;
    if (c.name && c.name.toLowerCase().replace(/\s+/g, '') === clean.replace(/\s+/g, '')) return true;
    if (cleanPhone.length >= 7) {
      const phone = (c.mobile || (c as any).phone || '').replace(/\D/g, '');
      if (phone.endsWith(cleanPhone) || cleanPhone.endsWith(phone) || phone.includes(cleanPhone) || cleanPhone.includes(phone)) return true;
    }
    return false;
  });

  return found || null;
}
