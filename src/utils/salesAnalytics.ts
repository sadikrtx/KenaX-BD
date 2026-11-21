import type { Order, Product } from '../types/index.ts';

export type OrderStatusBucket =
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

export interface TopSellerMetric {
  productId: string;
  productName: string;
  sku: string;
  unitsSold: number;
  revenue: number;
}

export interface StoreSalesSummary {
  totalOrders: number;
  validOrdersCount: number;
  cancelledOrdersCount: number;
  spamOrdersCount: number;
  returnedOrdersCount: number;
  failedDeliveryOrdersCount: number;
  grossSales: number;
  netProductSales: number;
  deliveryCollected: number;
  discountsGiven: number;
  cancelledRevenueLoss: number;
  returnedRevenueLoss: number;
  totalPaidAmount: number;
  pendingCOD: number;
  pendingCODOrdersCount: number;
  averageOrderValue: number;
  ordersByStatus: Record<OrderStatusBucket, number>;
  salesByPaymentMethod: Record<string, { orders: number; total: number }>;
  salesByChannel: Record<string, { orders: number; total: number }>;
  topSellers: TopSellerMetric[];
  calculatedAt: string;
}

export interface InventorySkuMetric {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  price: number;
  salePrice: number;
  physicalStock: number;
  reserved: number;
  available: number;
  deliveredUnits: number;
  totalSold: number;
  stockValue: number;
  lowStock: boolean;
  verifyStock: boolean;
}

export function normalizeStatusKey(raw?: string): string {
  return String(raw || 'Pending').trim().toLowerCase();
}

export function getCanonicalOrderBucket(order: Order | any): OrderStatusBucket {
  if (!order) return 'pending';
  const raw = normalizeStatusKey(order.orderStatus || order.status);
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

export function isCancelledOrSpamOrder(order: Order | any): boolean {
  const bucket = getCanonicalOrderBucket(order);
  return bucket === 'cancelled' || bucket === 'spam';
}

export function isNonRevenueOrder(order: Order | any): boolean {
  const bucket = getCanonicalOrderBucket(order);
  return bucket === 'cancelled' || bucket === 'spam' || bucket === 'returned' || bucket === 'failed_delivery';
}

/**
 * Deduplicate orders by canonical ID (keeping the entry with the most recent `updatedAt` or `createdAt`)
 * so duplicate imports or concurrent snapshots never double-count revenue or reserved inventory.
 */
export function deduplicateOrdersById<T extends { id?: string; updatedAt?: string; createdAt?: string } = Order>(orders: T[] = []): T[] {
  const map = new Map<string, T>();
  const anonymous: T[] = [];

  for (const order of orders || []) {
    if (!order) continue;
    const id = String(order.id || '').trim();
    if (!id) {
      anonymous.push(order);
      continue;
    }
    const existing = map.get(id);
    if (!existing) {
      map.set(id, order);
      continue;
    }
    const existingTs = new Date(existing.updatedAt || existing.createdAt || 0).getTime() || 0;
    const incomingTs = new Date(order.updatedAt || order.createdAt || 0).getTime() || 0;
    if (incomingTs >= existingTs) {
      map.set(id, order);
    }
  }

  return [...Array.from(map.values()), ...anonymous];
}

export function resolveOrderSalesChannel(order: Order | any): string {
  const explicitSource = String(order?.orderSource || order?.source || '').trim().toLowerCase();
  const attr = order?.attribution || {};
  const ft = attr.firstTouch || {};
  const lt = attr.lastTouch || {};
  const utmSource = String(order?.adNetwork || lt.utm_source || ft.utm_source || '').trim().toLowerCase();
  const utmMedium = String(lt.utm_medium || ft.utm_medium || '').trim().toLowerCase();

  if (explicitSource.includes('whatsapp') || utmSource.includes('whatsapp')) return 'WhatsApp';
  if (explicitSource.includes('messenger') || utmSource.includes('messenger')) return 'Facebook Messenger';
  if (explicitSource.includes('telegram')) return 'Telegram';
  if (explicitSource.includes('chatbot') || order?.isAiBotOrder) return 'Website ChatBot';
  if (
    attr.fbclid ||
    lt.fbclid ||
    ft.fbclid ||
    utmSource.includes('facebook') ||
    utmSource.includes('meta') ||
    utmSource.includes('fb') ||
    utmSource.includes('instagram') ||
    utmMedium.includes('cpc') && utmSource.includes('fb')
  ) {
    return 'Facebook Ads';
  }
  if (attr.ttclid || lt.ttclid || ft.ttclid || utmSource.includes('tiktok')) return 'TikTok Ads';
  if (attr.gclid || lt.gclid || ft.gclid || utmSource.includes('google')) return 'Google Ads';
  if (explicitSource === 'manual' || explicitSource === 'admin') return 'Phone / Manual';
  return 'Website';
}

export function getOrderItemsList(order: Order | any): Array<{
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}> {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items.map((item: any) => ({
      productId: String(item.productId || item.id || ''),
      productName: String(item.productName || item.name || 'Product'),
      sku: String(item.sku || ''),
      quantity: Math.max(1, Number(item.quantity) || 1),
      unitPrice: Number(item.price ?? item.unitPrice ?? 0) || 0,
    }));
  }
  if (order?.productId || order?.productName) {
    return [
      {
        productId: String(order.productId || ''),
        productName: String(order.productName || 'Product'),
        sku: String(order.sku || ''),
        quantity: Math.max(1, Number(order.quantity) || 1),
        unitPrice: Number(order.price ?? order.totalAmount ?? 0) || 0,
      },
    ];
  }
  return [];
}

export function getOrderSubtotalAmount(order: Order | any): number {
  const items = getOrderItemsList(order);
  if (items.length > 0) {
    const itemsSum = items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    if (itemsSum > 0) return itemsSum;
  }
  if (order?.subtotal !== undefined && Number(order.subtotal) > 0) {
    return Number(order.subtotal);
  }
  const total = Number(order?.totalAmount ?? order?.total ?? 0) || 0;
  const delivery = Number(order?.deliveryCharge ?? 0) || 0;
  return Math.max(0, total - delivery);
}

/**
 * Single canonical definition of Pending COD:
 * Non-cancelled, non-spam, non-returned orders whose payment is NOT marked Paid
 * and that have a remaining unpaid COD due balance (either paymentMethod is Cash on Delivery
 * or paymentOptionType is 'cod' / 'delivery_only').
 */
export function getOrderPendingCODAmount(order: Order | any): number {
  const bucket = getCanonicalOrderBucket(order);
  if (bucket === 'cancelled' || bucket === 'spam' || bucket === 'returned' || bucket === 'failed_delivery') {
    return 0;
  }

  const payStatus = normalizeStatusKey(order?.paymentStatus);
  if (payStatus === 'paid' || payStatus === 'paid on delivery' && bucket === 'delivered') {
    // Only consider fully settled when explicitly marked Paid
    if (payStatus === 'paid') return 0;
  }

  const total = Number(order?.totalAmount ?? order?.total ?? 0) || 0;
  const paid = Number(order?.paidAmount ?? 0) || 0;
  const explicitDue = order?.dueAmount !== undefined && order?.dueAmount !== null ? Number(order.dueAmount) : null;

  const payMethod = normalizeStatusKey(order?.paymentMethod);
  const payOption = normalizeStatusKey(order?.paymentOptionType);
  const isCodOrder =
    payMethod.includes('cash') ||
    payMethod.includes('cod') ||
    payOption === 'cod' ||
    payOption === 'delivery_only';

  if (!isCodOrder) return 0;

  if (payStatus === 'paid') return 0;
  if (explicitDue !== null && Number.isFinite(explicitDue)) {
    return Math.max(0, explicitDue);
  }
  return Math.max(0, total - paid);
}

export function computeStoreSalesSummary(
  orders: Order[] = [],
  products: Product[] = []
): StoreSalesSummary {
  const uniqueOrders = deduplicateOrdersById(orders);

  const ordersByStatus: Record<OrderStatusBucket, number> = {
    all: uniqueOrders.length,
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

  let grossSales = 0;
  let netProductSales = 0;
  let deliveryCollected = 0;
  let discountsGiven = 0;
  let cancelledRevenueLoss = 0;
  let returnedRevenueLoss = 0;
  let totalPaidAmount = 0;
  let pendingCOD = 0;
  let pendingCODOrdersCount = 0;
  let validOrdersCount = 0;

  const salesByPaymentMethod: Record<string, { orders: number; total: number }> = {};
  const salesByChannel: Record<string, { orders: number; total: number }> = {};
  const sellerMap = new Map<string, TopSellerMetric>();

  for (const order of uniqueOrders) {
    const bucket = getCanonicalOrderBucket(order);
    ordersByStatus[bucket] = (ordersByStatus[bucket] || 0) + 1;

    const total = Number(order.totalAmount ?? (order as any).total ?? 0) || 0;

    if (bucket === 'cancelled' || bucket === 'spam') {
      cancelledRevenueLoss += total;
      continue;
    }

    if (bucket === 'returned' || bucket === 'failed_delivery') {
      returnedRevenueLoss += total;
      continue;
    }

    validOrdersCount += 1;
    const delivery = Number(order.deliveryCharge ?? 0) || 0;
    const subtotal = getOrderSubtotalAmount(order);
    const discount = Number(order.discountAmount ?? order.discount ?? 0) || 0;

    grossSales += total;
    netProductSales += subtotal;
    deliveryCollected += delivery;
    discountsGiven += discount;

    const payStatus = normalizeStatusKey(order.paymentStatus);
    if (payStatus === 'paid') {
      totalPaidAmount += total;
    } else if (Number(order.paidAmount) > 0) {
      totalPaidAmount += Math.min(total, Number(order.paidAmount));
    }

    const codDue = getOrderPendingCODAmount(order);
    if (codDue > 0) {
      pendingCOD += codDue;
      pendingCODOrdersCount += 1;
    }

    const pmKey = String(order.paymentMethod || 'Cash on Delivery').trim() || 'Cash on Delivery';
    if (!salesByPaymentMethod[pmKey]) {
      salesByPaymentMethod[pmKey] = { orders: 0, total: 0 };
    }
    salesByPaymentMethod[pmKey].orders += 1;
    salesByPaymentMethod[pmKey].total += total;

    const chKey = resolveOrderSalesChannel(order);
    if (!salesByChannel[chKey]) {
      salesByChannel[chKey] = { orders: 0, total: 0 };
    }
    salesByChannel[chKey].orders += 1;
    salesByChannel[chKey].total += total;

    const items = getOrderItemsList(order);
    for (const item of items) {
      const matchedProduct = products.find(
        (p) =>
          (item.productId && p.id === item.productId) ||
          (item.sku && p.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
          (item.productName && p.name && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
      );

      const key = matchedProduct?.id || item.sku || item.productName;
      const existing = sellerMap.get(key) || {
        productId: matchedProduct?.id || item.productId || key,
        productName: matchedProduct?.name || item.productName,
        sku: matchedProduct?.sku || item.sku || 'N/A',
        unitsSold: 0,
        revenue: 0,
      };
      existing.unitsSold += item.quantity;
      existing.revenue += item.unitPrice * item.quantity;
      sellerMap.set(key, existing);
    }
  }

  const topSellers = Array.from(sellerMap.values())
    .sort((a, b) => (b.unitsSold !== a.unitsSold ? b.unitsSold - a.unitsSold : b.revenue - a.revenue))
    .slice(0, 10);

  const averageOrderValue = validOrdersCount > 0 ? Math.round(grossSales / validOrdersCount) : 0;

  return {
    totalOrders: uniqueOrders.length,
    validOrdersCount,
    cancelledOrdersCount: ordersByStatus.cancelled,
    spamOrdersCount: ordersByStatus.spam,
    returnedOrdersCount: ordersByStatus.returned,
    failedDeliveryOrdersCount: ordersByStatus.failed_delivery,
    grossSales,
    netProductSales,
    deliveryCollected,
    discountsGiven,
    cancelledRevenueLoss,
    returnedRevenueLoss,
    totalPaidAmount,
    pendingCOD,
    pendingCODOrdersCount,
    averageOrderValue,
    ordersByStatus,
    salesByPaymentMethod,
    salesByChannel,
    topSellers,
    calculatedAt: new Date().toISOString(),
  };
}

export function computeInventoryMetrics(
  products: Product[] = [],
  orders: Order[] = [],
  lowStockThreshold = 5
): InventorySkuMetric[] {
  const uniqueOrders = deduplicateOrdersById(orders);
  const threshold = Math.max(0, Number.isFinite(lowStockThreshold) ? lowStockThreshold : 5);
  const statsMap = new Map<string, { reserved: number; delivered: number; totalSold: number }>();

  for (const p of products) {
    statsMap.set(p.id, { reserved: 0, delivered: 0, totalSold: 0 });
  }

  for (const order of uniqueOrders) {
    const bucket = getCanonicalOrderBucket(order);
    const isCancelledOrReturned =
      bucket === 'cancelled' || bucket === 'spam' || bucket === 'returned' || bucket === 'failed_delivery';
    const isDelivered = bucket === 'delivered';
    const isReserved = !isDelivered && !isCancelledOrReturned;

    const items = getOrderItemsList(order);
    for (const item of items) {
      const matched = products.find(
        (p) =>
          (item.productId && p.id === item.productId) ||
          (item.sku && p.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
          (item.productName && p.name && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
      );
      if (!matched) continue;
      const entry = statsMap.get(matched.id) || { reserved: 0, delivered: 0, totalSold: 0 };
      if (isReserved) {
        entry.reserved += item.quantity;
        entry.totalSold += item.quantity;
      } else if (isDelivered) {
        entry.delivered += item.quantity;
        entry.totalSold += item.quantity;
      }
      statsMap.set(matched.id, entry);
    }
  }

  return products.map((p) => {
    const st = statsMap.get(p.id) || { reserved: 0, delivered: 0, totalSold: 0 };
    const physicalStock = Math.max(0, Number(p.stock) || 0);
    const available = Math.max(0, physicalStock - st.reserved);
    const unitCostOrPrice = Number(p.costPrice && p.costPrice > 0 ? p.costPrice : p.price) || 0;
    return {
      productId: p.id,
      productName: p.name,
      sku: p.sku || p.id,
      category: p.category || 'General',
      price: Number(p.originalPrice && p.originalPrice > p.price ? p.originalPrice : p.price) || 0,
      salePrice: Number(p.price) || 0,
      physicalStock,
      reserved: st.reserved,
      available,
      deliveredUnits: st.delivered,
      totalSold: st.totalSold,
      stockValue: available * unitCostOrPrice,
      lowStock: available <= threshold,
      verifyStock: physicalStock === 999,
    };
  });
}
