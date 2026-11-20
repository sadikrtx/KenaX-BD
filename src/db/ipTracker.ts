import fs from 'fs';
import path from 'path';
import { normalizeIp, isValidIp } from '../utils/ipUtils.ts';
import { getAllOrdersFromStore } from './orders.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');

export type IpStatus = 'Active' | 'Blocked' | 'Suspicious' | 'Whitelisted';

export interface IpActivityHistory {
  action: 'blocked' | 'unblocked' | 'order_placed' | 'checkout_attempt' | 'note_added';
  timestamp: string;
  actor?: string; // staff name or 'System'
  reason?: string;
  details?: string;
  orderId?: string;
}

export interface IpRecord {
  ip: string;
  status: IpStatus;
  blockReason?: string;
  blockedAt?: string;
  blockedBy?: string;
  unblockedAt?: string;
  unblockedBy?: string;
  firstSeen: string;
  lastSeen: string;
  totalOrders: number;
  orderIds: string[];
  customerIds: string[];
  customerNames: string[];
  customerPhones: string[];
  customerEmails: string[];
  locations: string[];
  riskScore?: number; // 0 - 100
  notes?: string;
  history: IpActivityHistory[];
  updatedAt?: string;
}

export interface IpSummaryStats {
  totalIps: number;
  totalActive: number;
  totalBlocked: number;
  totalSuspicious: number;
  totalOrdersTracked: number;
}

function getIpFilePath(isEnvPreview?: boolean): string {
  return path.join(SERVER_STORE_DIR, isEnvPreview ? 'preview_server_ip_records.json' : 'server_ip_records.json');
}

export function getAllIpRecords(isEnvPreview?: boolean): IpRecord[] {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const filePath = getIpFilePath(isEnvPreview);
    if (!fs.existsSync(filePath)) {
      // Rebuild initial records from existing orders if fresh
      const initial = rebuildIpRecordsFromOrders(isEnvPreview);
      return initial;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[IP Tracker] Error reading IP records file:', err);
  }
  return [];
}

export function saveAllIpRecords(records: IpRecord[], isEnvPreview?: boolean): void {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const filePath = getIpFilePath(isEnvPreview);
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
  } catch (err) {
    console.error('[IP Tracker] Error saving IP records file:', err);
  }
}

export function getIpRecord(ip: string, isEnvPreview?: boolean): IpRecord | null {
  if (!ip) return null;
  const cleanIp = normalizeIp(ip);
  const records = getAllIpRecords(isEnvPreview);
  return records.find((r) => r.ip === cleanIp) || null;
}

export function isIpBlocked(ip: string, isEnvPreview?: boolean): boolean {
  if (!ip) return false;
  const cleanIp = normalizeIp(ip);
  const record = getIpRecord(cleanIp, isEnvPreview);
  return record?.status === 'Blocked';
}

/**
 * Records an order activity against an IP address.
 * Automatically updates firstSeen, lastSeen, total orders count, customer names, phones, and order history.
 */
export function recordIpOrderActivity(rawIp: string, order: any, isEnvPreview?: boolean): IpRecord {
  const ip = normalizeIp(rawIp || order.customerIp || '127.0.0.1');
  const records = getAllIpRecords(isEnvPreview);
  const now = new Date().toISOString();

  let record = records.find((r) => r.ip === ip);

  const customerName = (order.customerName || order.deliveryName || '').trim();
  const customerPhone = (order.customerMobile || order.deliveryMobile || order.phone || '').trim();
  const customerEmail = (order.customerEmail || '').trim();
  const customerId = (order.customerId || '').trim();
  const location = (order.district || order.division || order.fullAddress || '').trim();

  const historyItem: IpActivityHistory = {
    action: 'order_placed',
    timestamp: now,
    actor: order.createdByStaffName || 'Customer Checkout',
    details: `Order #${order.id} placed for ৳${order.totalAmount || order.total || 0}`,
    orderId: order.id,
  };

  if (record) {
    if (!record.orderIds.includes(order.id)) {
      record.orderIds.unshift(order.id);
      record.totalOrders = record.orderIds.length;
    }
    if (customerName && !record.customerNames.includes(customerName)) {
      record.customerNames.push(customerName);
    }
    if (customerPhone && !record.customerPhones.includes(customerPhone)) {
      record.customerPhones.push(customerPhone);
    }
    if (customerEmail && !record.customerEmails.includes(customerEmail)) {
      record.customerEmails.push(customerEmail);
    }
    if (customerId && !record.customerIds.includes(customerId)) {
      record.customerIds.push(customerId);
    }
    if (location && !record.locations.includes(location)) {
      record.locations.push(location);
    }

    record.lastSeen = now;
    record.updatedAt = now;
    if (!record.history) record.history = [];
    record.history.unshift(historyItem);
    // Keep max 50 history logs per IP
    if (record.history.length > 50) {
      record.history = record.history.slice(0, 50);
    }

    // Adjust risk score if multiple distinct customer names from single IP
    if (record.customerNames.length > 4) {
      record.riskScore = Math.min(100, (record.riskScore || 20) + 25);
    }
  } else {
    record = {
      ip,
      status: 'Active',
      firstSeen: order.createdAt || now,
      lastSeen: now,
      totalOrders: 1,
      orderIds: [order.id],
      customerIds: customerId ? [customerId] : [],
      customerNames: customerName ? [customerName] : [],
      customerPhones: customerPhone ? [customerPhone] : [],
      customerEmails: customerEmail ? [customerEmail] : [],
      locations: location ? [location] : [],
      riskScore: 10,
      history: [historyItem],
      updatedAt: now,
    };
    records.unshift(record);
  }

  saveAllIpRecords(records, isEnvPreview);
  return record;
}

/**
 * Blocks an IP address with a reason and recording staff actor.
 */
export function blockIp(rawIp: string, reason: string = 'Fraud / Suspicious Order', blockedBy: string = 'Admin', isEnvPreview?: boolean): IpRecord {
  const ip = normalizeIp(rawIp);
  const records = getAllIpRecords(isEnvPreview);
  const now = new Date().toISOString();

  let record = records.find((r) => r.ip === ip);

  const historyItem: IpActivityHistory = {
    action: 'blocked',
    timestamp: now,
    actor: blockedBy,
    reason,
    details: `IP ${ip} was blocked by ${blockedBy}. Reason: ${reason}`,
  };

  if (record) {
    record.status = 'Blocked';
    record.blockReason = reason;
    record.blockedAt = now;
    record.blockedBy = blockedBy;
    record.riskScore = 95;
    record.updatedAt = now;
    if (!record.history) record.history = [];
    record.history.unshift(historyItem);
  } else {
    record = {
      ip,
      status: 'Blocked',
      blockReason: reason,
      blockedAt: now,
      blockedBy,
      firstSeen: now,
      lastSeen: now,
      totalOrders: 0,
      orderIds: [],
      customerIds: [],
      customerNames: [],
      customerPhones: [],
      customerEmails: [],
      locations: [],
      riskScore: 95,
      history: [historyItem],
      updatedAt: now,
    };
    records.unshift(record);
  }

  saveAllIpRecords(records, isEnvPreview);
  return record;
}

/**
 * Unblocks an IP address.
 */
export function unblockIp(rawIp: string, unblockedBy: string = 'Admin', isEnvPreview?: boolean): IpRecord {
  const ip = normalizeIp(rawIp);
  const records = getAllIpRecords(isEnvPreview);
  const now = new Date().toISOString();

  let record = records.find((r) => r.ip === ip);

  const historyItem: IpActivityHistory = {
    action: 'unblocked',
    timestamp: now,
    actor: unblockedBy,
    details: `IP ${ip} was unblocked by ${unblockedBy}.`,
  };

  if (record) {
    record.status = 'Active';
    record.unblockedAt = now;
    record.unblockedBy = unblockedBy;
    record.riskScore = Math.max(10, (record.riskScore || 90) - 50);
    record.updatedAt = now;
    if (!record.history) record.history = [];
    record.history.unshift(historyItem);
  } else {
    record = {
      ip,
      status: 'Active',
      firstSeen: now,
      lastSeen: now,
      totalOrders: 0,
      orderIds: [],
      customerIds: [],
      customerNames: [],
      customerPhones: [],
      customerEmails: [],
      locations: [],
      riskScore: 10,
      history: [historyItem],
      updatedAt: now,
    };
    records.unshift(record);
  }

  saveAllIpRecords(records, isEnvPreview);
  return record;
}

/**
 * Deletes an IP record from the system.
 */
export function deleteIpRecord(rawIp: string, isEnvPreview?: boolean): boolean {
  const ip = normalizeIp(rawIp);
  const records = getAllIpRecords(isEnvPreview);
  const filtered = records.filter((r) => r.ip !== ip);
  if (filtered.length !== records.length) {
    saveAllIpRecords(filtered, isEnvPreview);
    return true;
  }
  return false;
}

/**
 * Calculates aggregate summary statistics for the IP dashboard.
 */
export function getIpSummaryStats(isEnvPreview?: boolean): IpSummaryStats {
  const records = getAllIpRecords(isEnvPreview);
  const totalIps = records.length;
  const totalBlocked = records.filter((r) => r.status === 'Blocked').length;
  const totalActive = records.filter((r) => r.status === 'Active' || r.status === 'Whitelisted').length;
  const totalSuspicious = records.filter((r) => r.status === 'Suspicious' || (r.riskScore && r.riskScore >= 60)).length;
  const totalOrdersTracked = records.reduce((sum, r) => sum + (r.totalOrders || 0), 0);

  return {
    totalIps,
    totalActive,
    totalBlocked,
    totalSuspicious,
    totalOrdersTracked,
  };
}

/**
 * Rebuilds the IP database from existing server orders.
 */
export function rebuildIpRecordsFromOrders(isEnvPreview?: boolean): IpRecord[] {
  const orders = getAllOrdersFromStore(isEnvPreview);
  const map = new Map<string, IpRecord>();

  // Ensure current records block status is preserved
  const filePath = getIpFilePath(isEnvPreview);
  let existingRecords: IpRecord[] = [];
  if (fs.existsSync(filePath)) {
    try {
      existingRecords = JSON.parse(fs.readFileSync(filePath, 'utf-8')) || [];
    } catch {}
  }

  for (const ex of existingRecords) {
    if (ex && ex.ip) {
      map.set(ex.ip, ex);
    }
  }

  for (const order of orders) {
    const rawIp = order.customerIp || '103.145.118.24'; // Realistic default BD ISP IP for sample baseline
    const ip = normalizeIp(rawIp);

    const customerName = (order.customerName || order.deliveryName || '').trim();
    const customerPhone = (order.customerMobile || order.deliveryMobile || order.phone || '').trim();
    const customerEmail = (order.customerEmail || '').trim();
    const customerId = (order.customerId || '').trim();
    const location = (order.district || order.division || order.fullAddress || '').trim();
    const createdAt = order.createdAt || new Date().toISOString();

    let rec = map.get(ip);
    if (!rec) {
      rec = {
        ip,
        status: order.orderStatus === 'Fake Order' || order.isFakeOrder ? 'Suspicious' : 'Active',
        firstSeen: createdAt,
        lastSeen: createdAt,
        totalOrders: 0,
        orderIds: [],
        customerIds: [],
        customerNames: [],
        customerPhones: [],
        customerEmails: [],
        locations: [],
        riskScore: order.orderStatus === 'Fake Order' ? 80 : 15,
        history: [],
      };
      map.set(ip, rec);
    }

    if (!rec.orderIds.includes(order.id)) {
      rec.orderIds.push(order.id);
      rec.totalOrders = rec.orderIds.length;
    }
    if (customerName && !rec.customerNames.includes(customerName)) rec.customerNames.push(customerName);
    if (customerPhone && !rec.customerPhones.includes(customerPhone)) rec.customerPhones.push(customerPhone);
    if (customerEmail && !rec.customerEmails.includes(customerEmail)) rec.customerEmails.push(customerEmail);
    if (customerId && !rec.customerIds.includes(customerId)) rec.customerIds.push(customerId);
    if (location && !rec.locations.includes(location)) rec.locations.push(location);

    if (new Date(createdAt).getTime() < new Date(rec.firstSeen).getTime()) {
      rec.firstSeen = createdAt;
    }
    if (new Date(createdAt).getTime() > new Date(rec.lastSeen).getTime()) {
      rec.lastSeen = createdAt;
    }
  }

  const result = Array.from(map.values());
  saveAllIpRecords(result, isEnvPreview);
  return result;
}
