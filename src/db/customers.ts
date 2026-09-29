import fs from 'fs';
import path from 'path';
import { CustomerRecord } from '../types/index.ts';
import { normalizeBDPhoneNumber } from '../utils/phoneUtils.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');

function getCustomersFilePath(isEnvPreview?: boolean): string {
  return path.join(SERVER_STORE_DIR, isEnvPreview ? 'preview_server_customers.json' : 'server_customers.json');
}

export function getAllCustomersFromStore(isEnvPreview?: boolean): CustomerRecord[] {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const filePath = getCustomersFilePath(isEnvPreview);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.filter((c) => c && c.id && !c.id.startsWith('staff-cust-'));
    }
  } catch (err) {
    console.warn('[Server Customers] Error reading customers file:', err);
  }
  return [];
}

export function saveCustomerToStore(customer: CustomerRecord, isEnvPreview?: boolean): CustomerRecord {
  if (!customer || !customer.id || customer.id.startsWith('staff-cust-')) {
    // Never persist temporary staff storefront sessions as customers
    return customer;
  }
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const filePath = getCustomersFilePath(isEnvPreview);
    const current = getAllCustomersFromStore(isEnvPreview);
    const idx = current.findIndex((c) => c.id === customer.id || (customer.email && c.email?.toLowerCase() === customer.email.toLowerCase()));
    const sanitizedCustomer: CustomerRecord = {
      ...customer,
      mobile: normalizeBDPhoneNumber(customer.mobile || (customer as any).phone || ''),
      isV2Account: true,
    };
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...sanitizedCustomer };
    } else {
      current.unshift(sanitizedCustomer);
    }
    fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
    return sanitizedCustomer;
  } catch (err) {
    console.error('[Server Customers] Error writing customers file:', err);
  }
  return customer;
}

export function deleteCustomerFromStore(customerId: string, isEnvPreview?: boolean): boolean {
  try {
    const filePath = getCustomersFilePath(isEnvPreview);
    const current = getAllCustomersFromStore(isEnvPreview);
    const filtered = current.filter((c) => c.id !== customerId);
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Server Customers] Error deleting customer from store:', err);
    return false;
  }
}

export function findCustomerInStore(identifier: string, isEnvPreview?: boolean): CustomerRecord | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  const cleanPhone = identifier.replace(/\D/g, '');
  const all = getAllCustomersFromStore(isEnvPreview);

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
