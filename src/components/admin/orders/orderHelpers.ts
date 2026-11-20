import type { Order, OrderStatus, CourierFraudReport } from '../../../types/index.ts';
import { getOrderSourceInfo } from '../../../utils/orderSourceTimeUtils';

export type OrderTabId =
  | 'all'
  | 'pending'
  | 'follow_up'
  | 'confirmed'
  | 'processing'
  | 'ready_to_ship'
  | 'in_transit'
  | 'delivered'
  | 'hold'
  | 'cancelled'
  | 'spam'
  | 'returned'
  | 'failed_delivery';

export interface OrderStatusTabConfig {
  id: OrderTabId;
  label: string;
  labelBn: string;
  defaultStatus?: OrderStatus;
}

export const ORDER_STATUS_TABS: OrderStatusTabConfig[] = [
  { id: 'all', label: 'All', labelBn: 'সকল' },
  { id: 'pending', label: 'Pending', labelBn: 'পেন্ডিং', defaultStatus: 'Pending' },
  { id: 'follow_up', label: 'Follow Up', labelBn: 'ফলো আপ', defaultStatus: 'Follow Up' },
  { id: 'confirmed', label: 'Confirmed', labelBn: 'কনফার্মড', defaultStatus: 'Confirmed' },
  { id: 'processing', label: 'Processing', labelBn: 'প্রসেসিং', defaultStatus: 'Processing' },
  { id: 'ready_to_ship', label: 'Ready to Ship', labelBn: 'রেডি টু শিপ', defaultStatus: 'Ready to Ship' },
  { id: 'in_transit', label: 'In Transit', labelBn: 'ইন ট্রানজিট', defaultStatus: 'In Transit' },
  { id: 'delivered', label: 'Delivered', labelBn: 'ডেলিভার্ড', defaultStatus: 'Delivered' },
  { id: 'hold', label: 'Hold', labelBn: 'হোল্ড', defaultStatus: 'Hold' },
  { id: 'cancelled', label: 'Cancelled', labelBn: 'বাতিল', defaultStatus: 'Cancelled' },
  { id: 'spam', label: 'Spam', labelBn: 'স্প্যাম', defaultStatus: 'Spam' },
  { id: 'returned', label: 'Returned', labelBn: 'রিটার্নড', defaultStatus: 'Returned' },
  { id: 'failed_delivery', label: 'Failed Delivery', labelBn: 'ডেলিভারি ব্যর্থ', defaultStatus: 'Failed Delivery' },
];

export const SELECTABLE_ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Follow Up',
  'Confirmed',
  'Processing',
  'Ready to Ship',
  'Packed',
  'In Transit',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Completed',
  'Hold',
  'Cancelled',
  'Spam',
  'Returned',
  'Failed Delivery',
];

export const CRITICAL_STATUS_SET = new Set([
  'cancelled',
  'rejected',
  'spam',
  'fake order',
  'returned',
  'refunded',
  'failed delivery',
]);

export function isCriticalStatus(status: string): boolean {
  return CRITICAL_STATUS_SET.has((status || '').toLowerCase().trim());
}

export function validateStatusTransition(
  order: Order,
  nextStatus: OrderStatus,
  isSuperAdmin: boolean
): { allowed: boolean; reason?: string; requiresConfirmation: boolean } {
  const current = (order.orderStatus || (order as any).status || 'Pending').toLowerCase().trim();
  const target = (nextStatus || '').toLowerCase().trim();

  if ((current === 'delivered' || current === 'completed') && (target === 'cancelled' || target === 'spam' || target === 'fake order')) {
    return {
      allowed: false,
      reason: 'Delivered orders cannot be changed to Cancelled or Spam.',
      requiresConfirmation: false,
    };
  }

  if ((current === 'spam' || current === 'fake order' || order.isFakeOrder) && !isSuperAdmin && target !== 'spam' && target !== 'fake order') {
    return {
      allowed: false,
      reason: 'Only Super Admin can restore a Spam / Fake order.',
      requiresConfirmation: false,
    };
  }

  return {
    allowed: true,
    requiresConfirmation: isCriticalStatus(nextStatus) && current !== target,
  };
}

export function getOrderTabBucket(order: Order | any): OrderTabId {
  if (!order) return 'pending';
  const raw = (order.orderStatus || order.status || 'Pending').toString().trim().toLowerCase();
  if (order.isFakeOrder || raw === 'spam' || raw === 'fake order' || raw === 'fake') return 'spam';
  if (raw === 'pending' || raw === 'payment verification' || raw === 'unconfirmed' || raw === 'incomplete') return 'pending';
  if (raw === 'follow up' || raw === 'followup' || raw === 'follow_up') return 'follow_up';
  if (raw === 'confirmed') return 'confirmed';
  if (raw === 'processing') return 'processing';
  if (raw === 'ready to ship' || raw === 'ready_to_ship' || raw === 'packed' || raw === 'picked') return 'ready_to_ship';
  if (raw === 'in transit' || raw === 'in_transit' || raw === 'shipped' || raw === 'out for delivery' || raw === 'out_for_delivery') return 'in_transit';
  if (raw === 'delivered' || raw === 'completed') return 'delivered';
  if (raw === 'hold' || raw === 'on hold' || raw === 'on_hold') return 'hold';
  if (raw === 'cancelled' || raw === 'canceled' || raw === 'rejected') return 'cancelled';
  if (raw === 'returned' || raw === 'refunded') return 'returned';
  if (raw === 'failed delivery' || raw === 'failed_delivery') return 'failed_delivery';
  return 'pending';
}

export function computeOrderStatusCounts(orders: Order[]): Record<OrderTabId, number> {
  const counts: Record<OrderTabId, number> = {
    all: orders.length,
    pending: 0,
    follow_up: 0,
    confirmed: 0,
    processing: 0,
    ready_to_ship: 0,
    in_transit: 0,
    delivered: 0,
    hold: 0,
    cancelled: 0,
    spam: 0,
    returned: 0,
    failed_delivery: 0,
  };

  for (const order of orders) {
    const bucket = getOrderTabBucket(order);
    counts[bucket] = (counts[bucket] || 0) + 1;
  }

  return counts;
}

export function getOrderStatusPillStyle(status: string): string {
  const s = (status || 'Pending').toLowerCase().trim();
  if (s === 'delivered' || s === 'completed') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (s === 'confirmed') {
    return 'bg-teal-50 text-teal-700 border-teal-200';
  }
  if (s === 'processing') {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }
  if (s === 'ready to ship' || s === 'packed' || s === 'picked') {
    return 'bg-violet-50 text-violet-700 border-violet-200';
  }
  if (s === 'in transit' || s === 'shipped' || s === 'out for delivery' || s === 'out_for_delivery') {
    return 'bg-sky-50 text-sky-700 border-sky-200';
  }
  if (s === 'follow up') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (s === 'hold') {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  if (s === 'pending' || s === 'payment verification' || s === 'incomplete') {
    return 'bg-orange-50 text-orange-700 border-orange-200';
  }
  if (s === 'cancelled' || s === 'rejected' || s === 'failed delivery') {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  if (s === 'spam' || s === 'fake order') {
    return 'bg-purple-50 text-purple-700 border-purple-200';
  }
  if (s === 'returned' || s === 'refunded') {
    return 'bg-slate-100 text-slate-700 border-slate-300';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

export function resolveFulfillmentStatus(order: Order): { label: string; badgeClass: string } {
  const explicit = (order.fulfillmentStatus || '').trim();
  const os = (order.orderStatus || '').toLowerCase().trim();

  if (explicit) {
    const el = explicit.toLowerCase();
    if (el === 'fulfilled') return { label: 'Fulfilled', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (el === 'shipped') return { label: 'Shipped', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' };
    if (el === 'packed') return { label: 'Packed', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' };
    if (el === 'returned') return { label: 'Returned', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (el === 'failed') return { label: 'Failed', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
    return { label: explicit, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
  }

  if (os === 'delivered' || os === 'completed') {
    return { label: 'Fulfilled', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (os === 'in transit' || os === 'shipped' || os === 'out for delivery' || os === 'out_for_delivery') {
    return { label: 'In Transit', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' };
  }
  if (os === 'ready to ship' || os === 'packed' || os === 'picked') {
    return { label: 'Packed', badgeClass: 'bg-violet-50 text-violet-700 border-violet-200' };
  }
  if (os === 'returned' || os === 'refunded') {
    return { label: 'Returned', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (os === 'failed delivery') {
    return { label: 'Failed', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (os === 'processing') {
    return { label: 'Processing', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  }
  return { label: 'Unfulfilled', badgeClass: 'bg-slate-50 text-slate-600 border-slate-200' };
}

export function extractOrderAdNetwork(order: Order): { key: 'meta' | 'tiktok' | 'google' | 'organic'; label: string } {
  const attr = order.attribution || {};
  const ft = attr.firstTouch || {};
  const lt = attr.lastTouch || {};
  const src = String(order.adNetwork || lt.utm_source || ft.utm_source || '').toLowerCase();

  if (attr.fbclid || lt.fbclid || ft.fbclid || src.includes('facebook') || src.includes('meta') || src.includes('ig') || src.includes('instagram')) {
    return { key: 'meta', label: 'Meta Ads' };
  }
  if (attr.ttclid || lt.ttclid || ft.ttclid || src.includes('tiktok')) {
    return { key: 'tiktok', label: 'TikTok Ads' };
  }
  if (attr.gclid || lt.gclid || ft.gclid || src.includes('google')) {
    return { key: 'google', label: 'Google Ads' };
  }
  return { key: 'organic', label: 'Organic / Direct' };
}

export function normalizePhoneKey(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function computeDuplicateMaps(orders: Order[]): {
  phoneCounts: Record<string, number>;
  ipCounts: Record<string, number>;
} {
  const phoneCounts: Record<string, number> = {};
  const ipCounts: Record<string, number> = {};

  for (const o of orders) {
    const phoneKey = normalizePhoneKey(o.customerMobile || o.deliveryMobile || o.phone);
    if (phoneKey.length >= 8) {
      phoneCounts[phoneKey] = (phoneCounts[phoneKey] || 0) + 1;
    }
    const ip = String(o.customerIp || '').trim();
    if (ip && ip !== 'N/A' && ip !== 'unknown' && ip !== 'undefined') {
      ipCounts[ip] = (ipCounts[ip] || 0) + 1;
    }
  }

  return { phoneCounts, ipCounts };
}

export interface OrderFiltersState {
  payment: string;
  channel: string;
  address: string;
  onlinePayment: string;
  adNetwork: string;
  siteUpdate: string;
  duplicates: string;
  orderCheck: string;
}

export const INITIAL_ORDER_FILTERS: OrderFiltersState = {
  payment: 'all',
  channel: 'all',
  address: 'all',
  onlinePayment: 'all',
  adNetwork: 'all',
  siteUpdate: 'all',
  duplicates: 'all',
  orderCheck: 'all',
};

export function applyOrderFilters(
  orders: Order[],
  tab: OrderTabId,
  searchQuery: string,
  filters: OrderFiltersState,
  duplicateMaps: { phoneCounts: Record<string, number>; ipCounts: Record<string, number> },
  fraudReports: Record<string, CourierFraudReport>,
  ipFilterOverride: string = 'all'
): Order[] {
  const q = searchQuery.trim().toLowerCase();

  return orders.filter((order) => {
    if (tab !== 'all' && getOrderTabBucket(order) !== tab) {
      return false;
    }

    if (q) {
      const itemsText = (order.items || [])
        .map((i) => `${i.productName || i.name || ''} ${i.sku || ''}`)
        .join(' ')
        .toLowerCase();
      const haystack = [
        order.id,
        order.siteOrderNumber,
        order.courierOrderId,
        order.trackingNumber,
        order.customerName,
        order.deliveryName,
        order.customerMobile,
        order.deliveryMobile,
        order.phone,
        order.customerEmail,
        order.customerIp,
        order.district,
        order.division,
        order.fullAddress,
        order.deliveryAddress,
        itemsText,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.payment !== 'all') {
      const selected = filters.payment.split(',').filter(Boolean);
      const pm = (order.paymentMethod || '').toLowerCase();
      const matched = selected.some((val) => {
        if (val === 'cod') return pm.includes('cash');
        if (val === 'bkash') return pm.includes('bkash');
        if (val === 'nagad') return pm.includes('nagad');
        if (val === 'rocket') return pm.includes('rocket');
        return pm.includes(val);
      });
      if (!matched) return false;
    }

    if (filters.channel !== 'all') {
      const selected = filters.channel.split(',').filter(Boolean);
      const srcInfo = getOrderSourceInfo(order);
      if (!selected.includes(srcInfo.sourceKey)) return false;
    }

    if (filters.address !== 'all') {
      const selected = filters.address.split(',').filter(Boolean);
      const div = (order.division || order.customerDivision || '').toLowerCase();
      const dist = (order.district || order.customerDistrict || '').toLowerCase();
      const fullAddr = String(order.fullAddress || order.deliveryAddress || order.address || '').trim();
      const isDhaka = div.includes('dhaka') || dist.includes('dhaka') || div.includes('ঢাকা') || dist.includes('ঢাকা');
      const matched = selected.some((val) => {
        if (val === 'dhaka') return isDhaka;
        if (val === 'outside_dhaka') return !isDhaka;
        if (val === 'incomplete') return fullAddr.length < 6;
        return false;
      });
      if (!matched) return false;
    }

    if (filters.onlinePayment !== 'all') {
      const selected = filters.onlinePayment.split(',').filter(Boolean);
      const ps = (order.paymentStatus || '').toLowerCase();
      const pm = (order.paymentMethod || '').toLowerCase();
      const isOnline = !pm.includes('cash');
      const matched = selected.some((val) => {
        if (val === 'paid') return ps === 'paid' || ps === 'verified';
        if (val === 'pending_verification') return ps.includes('pending') || ps.includes('submitted');
        if (val === 'unpaid') return ps !== 'paid' && ps !== 'verified';
        if (val === 'online_only') return isOnline;
        return false;
      });
      if (!matched) return false;
    }

    if (filters.adNetwork !== 'all') {
      const selected = filters.adNetwork.split(',').filter(Boolean);
      const net = extractOrderAdNetwork(order);
      if (!selected.includes(net.key)) return false;
    }

    if (filters.siteUpdate !== 'all') {
      const selected = filters.siteUpdate.split(',').filter(Boolean);
      const hasSync = Boolean(order.siteOrderNumber || order.courierOrderId || order.trackingNumber);
      const isEdited =
        Boolean(order.updatedAt && order.createdAt) &&
        new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime() > 60_000;
      const isInc = Boolean(order.isIncompleteOrder || (order.orderStatus || '').toLowerCase() === 'incomplete');
      const matched = selected.some((val) => {
        if (val === 'synced') return hasSync;
        if (val === 'edited') return isEdited;
        if (val === 'incomplete') return isInc;
        return false;
      });
      if (!matched) return false;
    }

    if (filters.duplicates !== 'all') {
      const selected = filters.duplicates.split(',').filter(Boolean);
      const pKey = normalizePhoneKey(order.customerMobile || order.deliveryMobile || order.phone);
      const ip = String(order.customerIp || '').trim();
      const isDupPhone = pKey.length >= 8 && (duplicateMaps.phoneCounts[pKey] || 0) > 1;
      const isDupIp = Boolean(ip && (duplicateMaps.ipCounts[ip] || 0) > 1);
      const matched = selected.some((val) => {
        if (val === 'duplicate_phone') return isDupPhone;
        if (val === 'duplicate_ip') return isDupIp;
        if (val === 'any_duplicate') return isDupPhone || isDupIp;
        return false;
      });
      if (!matched) return false;
    }

    if (filters.orderCheck !== 'all') {
      const selected = filters.orderCheck.split(',').filter(Boolean);
      const rep = fraudReports[order.id];
      const risk = (rep?.riskLevel || order.courierCheckSummary?.riskLevel || order.courierCheckStatus || 'no_data').toLowerCase();
      const ipStat = (order.ipStatus || 'active').toLowerCase();
      const matched = selected.some((val) => {
        if (val === 'safe') return risk === 'safe' || risk === 'verified';
        if (val === 'moderate') return risk === 'moderate';
        if (val === 'high_risk') return risk === 'high_risk' || risk === 'risky';
        if (val === 'no_data') return risk === 'no_data' || (!rep && !order.courierCheckSummary);
        if (val === 'ip_blocked') return ipStat === 'blocked';
        return false;
      });
      if (!matched) return false;
    }

    if (ipFilterOverride !== 'all') {
      const ipStat = (order.ipStatus || 'Active').toLowerCase();
      if (ipFilterOverride === 'blocked' && ipStat !== 'blocked') return false;
      if (ipFilterOverride === 'active' && ipStat !== 'active') return false;
    }

    return true;
  });
}

export type OrderColumnId =
  | 'order_number'
  | 'order_date'
  | 'customer'
  | 'products'
  | 'total_amount'
  | 'payment_method'
  | 'payment_status'
  | 'assignee'
  | 'order_status'
  | 'fulfillment_status'
  | 'courier'
  | 'courier_check'
  | 'delivery_address'
  | 'channel'
  | 'tracking_number'
  | 'actions';

export interface OrderColumnDef {
  id: OrderColumnId;
  label: string;
  essential?: boolean;
}

export const ESSENTIAL_ORDER_COLUMNS: OrderColumnId[] = [
  'order_number',
  'customer',
  'products',
  'actions',
];

export const ORDER_COLUMNS: OrderColumnDef[] = [
  { id: 'order_number', label: 'Order Number', essential: true },
  { id: 'order_date', label: 'Order Date' },
  { id: 'customer', label: 'Customer', essential: true },
  { id: 'products', label: 'Products', essential: true },
  { id: 'total_amount', label: 'Total Amount' },
  { id: 'payment_method', label: 'Payment Method' },
  { id: 'payment_status', label: 'Payment Status' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'order_status', label: 'Order Status' },
  { id: 'fulfillment_status', label: 'Fulfillment Status' },
  { id: 'courier', label: 'Courier' },
  { id: 'courier_check', label: 'Courier Check' },
  { id: 'delivery_address', label: 'Delivery Address' },
  { id: 'channel', label: 'Source / Channel' },
  { id: 'tracking_number', label: 'Tracking Number' },
  { id: 'actions', label: 'Actions', essential: true },
];

export const DEFAULT_VISIBLE_ORDER_COLUMNS: OrderColumnId[] = [
  'order_number',
  'customer',
  'products',
  'assignee',
  'order_status',
  'fulfillment_status',
  'courier_check',
  'actions',
];

export function sanitizeVisibleOrderColumns(cols: unknown): OrderColumnId[] {
  const validIds = new Set(ORDER_COLUMNS.map((c) => c.id));
  const rawList = Array.isArray(cols)
    ? cols.filter((id): id is OrderColumnId => typeof id === 'string' && validIds.has(id as OrderColumnId))
    : [...DEFAULT_VISIBLE_ORDER_COLUMNS];

  const merged = new Set<OrderColumnId>([...rawList, ...ESSENTIAL_ORDER_COLUMNS]);
  return ORDER_COLUMNS.map((c) => c.id).filter((id) => merged.has(id));
}

export function getStaffInitials(name?: string): string {
  const clean = (name || '').trim();
  if (!clean) return '—';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function formatRelativeAge(dateStr?: string, isBn: boolean = false): string {
  if (!dateStr) return isBn ? 'অজানা' : 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diffMs = Math.max(0, Date.now() - d.getTime());
  const secs = Math.floor(diffMs / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (secs < 45) return isBn ? 'এইমাত্র' : 'Just now';
  if (mins < 60) return isBn ? `${mins} মিনিট আগে` : `${mins} ${mins === 1 ? 'min' : 'mins'} ago`;
  if (hours < 24) return isBn ? `${hours} ঘণ্টা আগে` : `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (days < 30) return isBn ? `${days} দিন আগে` : `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatExactDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function exportOrdersToCsv(orders: Order[], filenamePrefix = 'kenax-orders'): void {
  const headers = [
    'Order ID',
    'Created At',
    'Customer Name',
    'Customer Phone',
    'Products',
    'Total Amount (BDT)',
    'Payment Method',
    'Payment Status',
    'Assignee',
    'Order Status',
    'Fulfillment Status',
    'Courier',
    'Tracking Number',
    'Delivery Address',
    'Channel',
  ];

  const escapeCell = (val: unknown) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = orders.map((o) => {
    const productsSummary = (o.items || [])
      .map((i) => `${i.productName || i.name || 'Item'} (x${i.quantity || 1})`)
      .join('; ');
    const srcInfo = getOrderSourceInfo(o);
    const fulfillment = resolveFulfillmentStatus(o);
    const addressText = o.fullAddress || o.deliveryAddress || `${o.district || ''} ${o.division || ''}`.trim();

    return [
      o.id,
      formatExactDateTime(o.createdAt),
      o.deliveryName || o.customerName || '',
      o.deliveryMobile || o.customerMobile || o.phone || '',
      productsSummary,
      o.totalAmount || 0,
      o.paymentMethod || '',
      o.paymentStatus || '',
      o.handledByStaffName || 'Unassigned',
      o.orderStatus || 'Pending',
      fulfillment.label,
      o.courierName || '',
      o.trackingNumber || '',
      addressText,
      srcInfo.shortLabelEn,
    ]
      .map(escapeCell)
      .join(',');
  });

  const csvContent = [headers.map(escapeCell).join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
