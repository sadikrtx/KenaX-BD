import { Product, Supplier, Order, OrderItem, SourcingLocation } from '../../../types';
import {
  OWN_STOCK_SUPPLIER_ID,
  SourcingLocationSummary,
  SoldProductEntry,
  OrderEventEntry,
  SupplierAnalyticsItem,
  DropshippingAnalyticsData,
} from './types';

export const findSupplierForProduct = (
  product: Product | undefined,
  suppliers: Supplier[]
): Supplier | undefined => {
  if (!product) return undefined;
  if (product.supplierId) {
    const match = suppliers.find((s) => s.id === product.supplierId);
    if (match) return match;
  }
  if (product.supplierName) {
    const normName = product.supplierName.trim().toLowerCase();
    const match = suppliers.find(
      (s) =>
        s.name.trim().toLowerCase() === normName ||
        s.name.trim().toLowerCase().includes(normName) ||
        normName.includes(s.name.trim().toLowerCase())
    );
    if (match) return match;
  }
  if (product.supplierUrl) {
    const match = suppliers.find((s) => {
      if (!s.websiteUrl) return false;
      try {
        const suppHost = new URL(s.websiteUrl).hostname.replace(/^www\./, '');
        const prodHost = new URL(product.supplierUrl!).hostname.replace(/^www\./, '');
        return suppHost === prodHost || product.supplierUrl!.includes(suppHost);
      } catch {
        return false;
      }
    });
    if (match) return match;
  }
  return undefined;
};

export const extractSourcingLocations = (
  products: Product[],
  registeredLocations: SourcingLocation[] = []
): SourcingLocationSummary[] => {
  const map = new Map<string, SourcingLocationSummary>();

  // 1. Populate all registered sourcing locations / wholesalers
  registeredLocations.forEach((loc) => {
    const key = loc.id;
    map.set(key, {
      id: loc.id,
      vendorName: loc.vendorName,
      marketName: loc.marketName,
      address: loc.address,
      phone: loc.phone,
      secondaryPhone: loc.secondaryPhone,
      contactPerson: loc.contactPerson,
      memo: loc.memo,
      productCategories: loc.productCategories,
      status: loc.status || 'active',
      productCount: 0,
      products: [],
    });
  });

  // 2. Map own-stock products to their registered or custom sourcing locations
  products.forEach((p) => {
    if (p.productType !== 'own') return;
    const address = (p.sourcingAddress || '').trim() || 'Dhaka Local Wholesale Market';
    const phone = (p.sourcingPhone || '').trim() || 'N/A';
    const vendorName = (p.sourcingVendorName || '').trim() || 'Direct Wholesaler';
    const memo = (p.sourcingMemo || '').trim();

    let matchedKey: string | null = null;
    for (const [key, entry] of map.entries()) {
      if (
        (p.sourcingLocationId && entry.id === p.sourcingLocationId) ||
        (vendorName && entry.vendorName && entry.vendorName.trim().toLowerCase() === vendorName.trim().toLowerCase()) ||
        (phone !== 'N/A' && entry.phone && entry.phone.replace(/[^0-9]/g, '') === phone.replace(/[^0-9]/g, ''))
      ) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      const entry = map.get(matchedKey)!;
      entry.productCount += 1;
      entry.products.push(p);
    } else {
      const customKey = `${address}|${phone}|${vendorName}`;
      if (!map.has(customKey)) {
        map.set(customKey, {
          id: `loc-custom-${Math.abs(customKey.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0))}`,
          address,
          phone,
          vendorName,
          memo,
          productCount: 0,
          products: [],
        });
      }
      const entry = map.get(customKey)!;
      entry.productCount += 1;
      entry.products.push(p);
    }
  });

  return Array.from(map.values());
};

export const computeDropshippingAnalytics = (
  products: Product[],
  orders: Order[],
  suppliers: Supplier[],
  orderStatusFilter: 'all' | 'delivered' | 'active',
  registeredLocations: SourcingLocation[] = []
): DropshippingAnalyticsData => {
  const effectiveOrders = (orders || []).filter((order) => {
    if (!order || !order.items || order.items.length === 0) return false;
    const status = (order.status || '').toLowerCase();
    if (orderStatusFilter === 'delivered') {
      return status === 'delivered';
    }
    if (orderStatusFilter === 'active') {
      return status !== 'cancelled' && status !== 'rejected' && status !== 'returned';
    }
    return true;
  });

  // Identify own-stock products
  const ownStockProducts = products.filter((p) => p.productType === 'own');
  const ownSourcingLocations = extractSourcingLocations(products, registeredLocations);

  // Own stock virtual supplier
  const ownStockSupplier: Supplier = {
    id: OWN_STOCK_SUPPLIER_ID,
    name: 'Own Stock (In-House Inventory)',
    notes: 'Direct physical stock stored and fulfilled in-house from local wholesale markets & vendors.',
    status: 'active',
    address: ownSourcingLocations[0]?.address || 'In-House Warehouse, Dhaka',
    personalPhone: ownSourcingLocations[0]?.phone !== 'N/A' ? ownSourcingLocations[0]?.phone : undefined,
    managerPhone: ownSourcingLocations[1]?.phone !== 'N/A' ? ownSourcingLocations[1]?.phone : undefined,
  };

  // Supplier accumulators
  interface Acc {
    supplier: Supplier;
    isOwnStock?: boolean;
    orderIds: Set<string>;
    unitsSold: number;
    totalCost: number;
    totalRevenue: number;
    totalProfit: number;
    productsMap: Map<string, SoldProductEntry>;
    orderEventsMap: Map<string, OrderEventEntry>;
    sourcingLocations?: SourcingLocationSummary[];
    totalInStockCount?: number;
  }

  const suppMap = new Map<string, Acc>();

  // Initialize dropshipping suppliers
  suppliers.forEach((s) => {
    suppMap.set(s.id, {
      supplier: s,
      isOwnStock: false,
      orderIds: new Set(),
      unitsSold: 0,
      totalCost: 0,
      totalRevenue: 0,
      totalProfit: 0,
      productsMap: new Map(),
      orderEventsMap: new Map(),
    });
  });

  // Initialize Own Stock accumulator
  suppMap.set(OWN_STOCK_SUPPLIER_ID, {
    supplier: ownStockSupplier,
    isOwnStock: true,
    orderIds: new Set(),
    unitsSold: 0,
    totalCost: 0,
    totalRevenue: 0,
    totalProfit: 0,
    productsMap: new Map(),
    orderEventsMap: new Map(),
    sourcingLocations: ownSourcingLocations,
    totalInStockCount: ownStockProducts.reduce((acc, p) => acc + (Number(p.stock) || 0), 0),
  });

  let globalUnits = 0;
  let globalCost = 0;
  let globalRevenue = 0;
  let globalProfit = 0;
  const globalOrderIds = new Set<string>();
  const allSoldProductsMap = new Map<string, SoldProductEntry>();

  // Process orders
  effectiveOrders.forEach((order) => {
    (order.items || []).forEach((item: OrderItem) => {
      const prod = products.find(
        (p) => p.id === item.productId || p.name === item.name || p.name === item.productName
      );

      const isOwn = prod?.productType === 'own';
      let finalSupplier: Supplier | undefined;

      if (isOwn) {
        finalSupplier = ownStockSupplier;
      } else {
        finalSupplier = findSupplierForProduct(prod, suppliers) || (prod?.productType === 'dropshipping' ? suppliers[0] : undefined);
      }

      if (finalSupplier && suppMap.has(finalSupplier.id)) {
        globalOrderIds.add(order.id);
        const qty = Number(item.quantity) || 1;
        const sellingUnitPrice = Number(item.price) || Number(prod?.price) || 0;
        const costUnitPrice =
          prod?.costPrice && Number(prod.costPrice) > 0
            ? Number(prod.costPrice)
            : Math.round(sellingUnitPrice * 0.7);

        const lineRev = sellingUnitPrice * qty;
        const lineCost = costUnitPrice * qty;
        const lineProfit = lineRev - lineCost;
        const profitPerUnit = sellingUnitPrice - costUnitPrice;

        globalUnits += qty;
        globalCost += lineCost;
        globalRevenue += lineRev;
        globalProfit += lineProfit;

        const acc = suppMap.get(finalSupplier.id)!;
        acc.orderIds.add(order.id);
        acc.unitsSold += qty;
        acc.totalCost += lineCost;
        acc.totalRevenue += lineRev;
        acc.totalProfit += lineProfit;

        const prodKey = prod?.id || item.productId || item.name || 'unknown';
        const effectiveProduct: Product = prod || {
          id: item.productId,
          name: item.name || item.productName || 'Product',
          price: sellingUnitPrice,
          costPrice: costUnitPrice,
          originalPrice: sellingUnitPrice,
          stock: 10,
          sku: isOwn ? 'OWN-ITEM' : 'DS-ITEM',
          images: item.productImage ? [item.productImage] : [],
          category: isOwn ? 'In-House' : 'Dropshipping',
          brand: finalSupplier.name,
          description: '',
          productType: isOwn ? 'own' : 'dropshipping',
          rating: 5,
          reviewsCount: 1,
          supplierId: finalSupplier.id,
          supplierName: finalSupplier.name,
        };

        const soldEntry: SoldProductEntry = {
          product: effectiveProduct,
          supplier: finalSupplier,
          isOwnStock: isOwn,
          unitsSold: qty,
          costPrice: costUnitPrice,
          sellingPrice: sellingUnitPrice,
          profitPerUnit,
          totalCost: lineCost,
          totalRevenue: lineRev,
          totalProfit: lineProfit,
          sourcingAddress: prod?.sourcingAddress,
          sourcingPhone: prod?.sourcingPhone,
          sourcingVendorName: prod?.sourcingVendorName,
          sourcingMemo: prod?.sourcingMemo,
        };

        if (!acc.productsMap.has(prodKey)) {
          acc.productsMap.set(prodKey, { ...soldEntry, unitsSold: 0, totalCost: 0, totalRevenue: 0, totalProfit: 0 });
        }
        const pEntry = acc.productsMap.get(prodKey)!;
        pEntry.unitsSold += qty;
        pEntry.totalCost += lineCost;
        pEntry.totalRevenue += lineRev;
        pEntry.totalProfit += lineProfit;

        if (!allSoldProductsMap.has(prodKey)) {
          allSoldProductsMap.set(prodKey, { ...soldEntry, unitsSold: 0, totalCost: 0, totalRevenue: 0, totalProfit: 0 });
        }
        const gEntry = allSoldProductsMap.get(prodKey)!;
        gEntry.unitsSold += qty;
        gEntry.totalCost += lineCost;
        gEntry.totalRevenue += lineRev;
        gEntry.totalProfit += lineProfit;

        if (!acc.orderEventsMap.has(order.id)) {
          acc.orderEventsMap.set(order.id, {
            orderId: order.id,
            orderNumber: (order as any).orderNumber || order.id.slice(-6).toUpperCase(),
            customerName: order.customerName || 'Customer',
            customerPhone: (order as any).customerPhone || (order as any).recipientPhone || 'N/A',
            createdAt: order.createdAt || new Date().toISOString(),
            status: order.status || 'Confirmed',
            items: [],
            orderRevenue: 0,
            orderCost: 0,
            orderProfit: 0,
          });
        }
        const oEntry = acc.orderEventsMap.get(order.id)!;
        oEntry.items.push({
          productId: effectiveProduct.id,
          name: effectiveProduct.name,
          qty,
          sellingPrice: sellingUnitPrice,
          costPrice: costUnitPrice,
          profit: lineProfit,
        });
        oEntry.orderRevenue += lineRev;
        oEntry.orderCost += lineCost;
        oEntry.orderProfit += lineProfit;
      }
    });
  });

  // If zero live sales, populate demonstration numbers so the admin sees the UI working
  const isSampleData = globalUnits === 0 && (suppliers.length > 0 || ownStockProducts.length > 0);

  if (isSampleData) {
    // Populate demo sales for suppliers
    suppliers.forEach((s, sIdx) => {
      const acc = suppMap.get(s.id)!;
      const linkedProds = products.filter((p) => p.supplierId === s.id || p.supplierName === s.name);
      const sampleProds = linkedProds.length > 0 ? linkedProds : products.filter((p) => p.productType === 'dropshipping').slice(sIdx * 2, sIdx * 2 + 2);

      sampleProds.forEach((prod, pIdx) => {
        const qty = 3 + ((sIdx + pIdx) % 4);
        const sellPrice = prod.price || 950;
        const costPrice = prod.costPrice || Math.round(sellPrice * 0.7);
        const lineRev = sellPrice * qty;
        const lineCost = costPrice * qty;
        const lineProfit = lineRev - lineCost;
        const profitPerUnit = sellPrice - costPrice;

        globalUnits += qty;
        globalCost += lineCost;
        globalRevenue += lineRev;
        globalProfit += lineProfit;

        acc.orderIds.add(`demo-order-${s.id}-${pIdx}`);
        globalOrderIds.add(`demo-order-${s.id}-${pIdx}`);
        acc.unitsSold += qty;
        acc.totalCost += lineCost;
        acc.totalRevenue += lineRev;
        acc.totalProfit += lineProfit;

        acc.productsMap.set(prod.id, {
          product: prod,
          supplier: s,
          isOwnStock: false,
          unitsSold: qty,
          costPrice,
          sellingPrice: sellPrice,
          profitPerUnit,
          totalCost: lineCost,
          totalRevenue: lineRev,
          totalProfit: lineProfit,
        });

        allSoldProductsMap.set(prod.id, {
          product: prod,
          supplier: s,
          isOwnStock: false,
          unitsSold: qty,
          costPrice,
          sellingPrice: sellPrice,
          profitPerUnit,
          totalCost: lineCost,
          totalRevenue: lineRev,
          totalProfit: lineProfit,
        });

        acc.orderEventsMap.set(`demo-order-${s.id}-${pIdx}`, {
          orderId: `ORD-${84920 + pIdx * 17}`,
          orderNumber: `#KX-${84920 + pIdx * 17}`,
          customerName: pIdx % 2 === 0 ? 'Tanvir Ahmed' : 'Sadia Rahman',
          customerPhone: pIdx % 2 === 0 ? '01712-345678' : '01890-123456',
          createdAt: new Date(Date.now() - (pIdx + 1) * 86400000).toISOString(),
          status: pIdx % 2 === 0 ? 'Delivered' : 'Processing',
          items: [
            {
              productId: prod.id,
              name: prod.name,
              qty,
              sellingPrice: sellPrice,
              costPrice,
              profit: lineProfit,
            },
          ],
          orderRevenue: lineRev,
          orderCost: lineCost,
          orderProfit: lineProfit,
        });
      });
    });

    // Populate demo sales for Own Stock (On Stock)
    const ownAcc = suppMap.get(OWN_STOCK_SUPPLIER_ID)!;
    const demoOwnProds = ownStockProducts.length > 0 ? ownStockProducts : products.slice(0, 2);

    demoOwnProds.forEach((prod, pIdx) => {
      const qty = 5 + pIdx * 2;
      const sellPrice = prod.price || 1200;
      const costPrice = prod.costPrice || 850;
      const lineRev = sellPrice * qty;
      const lineCost = costPrice * qty;
      const lineProfit = lineRev - lineCost;
      const profitPerUnit = sellPrice - costPrice;

      globalUnits += qty;
      globalCost += lineCost;
      globalRevenue += lineRev;
      globalProfit += lineProfit;

      ownAcc.orderIds.add(`demo-order-own-${pIdx}`);
      globalOrderIds.add(`demo-order-own-${pIdx}`);
      ownAcc.unitsSold += qty;
      ownAcc.totalCost += lineCost;
      ownAcc.totalRevenue += lineRev;
      ownAcc.totalProfit += lineProfit;

      ownAcc.productsMap.set(prod.id, {
        product: prod,
        supplier: ownStockSupplier,
        isOwnStock: true,
        unitsSold: qty,
        costPrice,
        sellingPrice: sellPrice,
        profitPerUnit,
        totalCost: lineCost,
        totalRevenue: lineRev,
        totalProfit: lineProfit,
        sourcingAddress: prod.sourcingAddress || 'Islampur Cloth Wholesale Market, Shop #28, Dhaka',
        sourcingPhone: prod.sourcingPhone || '01712-894521',
        sourcingVendorName: prod.sourcingVendorName || 'Haji Fabrics & Wholesale',
        sourcingMemo: prod.sourcingMemo || 'Memo #4829 - Direct Cash Purchase',
      });

      allSoldProductsMap.set(`own-${prod.id}`, {
        product: prod,
        supplier: ownStockSupplier,
        isOwnStock: true,
        unitsSold: qty,
        costPrice,
        sellingPrice: sellPrice,
        profitPerUnit,
        totalCost: lineCost,
        totalRevenue: lineRev,
        totalProfit: lineProfit,
        sourcingAddress: prod.sourcingAddress || 'Islampur Cloth Wholesale Market, Shop #28, Dhaka',
        sourcingPhone: prod.sourcingPhone || '01712-894521',
        sourcingVendorName: prod.sourcingVendorName || 'Haji Fabrics & Wholesale',
        sourcingMemo: prod.sourcingMemo || 'Memo #4829 - Direct Cash Purchase',
      });

      ownAcc.orderEventsMap.set(`demo-order-own-${pIdx}`, {
        orderId: `ORD-${91000 + pIdx * 11}`,
        orderNumber: `#KX-${91000 + pIdx * 11}`,
        customerName: pIdx === 0 ? 'Mahmudul Hasan' : 'Nusrat Jahan',
        customerPhone: pIdx === 0 ? '01755-123987' : '01911-554433',
        createdAt: new Date(Date.now() - (pIdx + 1) * 43200000).toISOString(),
        status: 'Delivered',
        items: [
          {
            productId: prod.id,
            name: prod.name,
            qty,
            sellingPrice: sellPrice,
            costPrice,
            profit: lineProfit,
          },
        ],
        orderRevenue: lineRev,
        orderCost: lineCost,
        orderProfit: lineProfit,
      });
    });
  }

  // Format array:
  // Sort so Shopbase is first, followed immediately by Own Stock (On Stock), then other suppliers!
  const rawList = Array.from(suppMap.values()).map((acc) => {
    const margin = acc.totalRevenue > 0 ? Math.round((acc.totalProfit / acc.totalRevenue) * 100) : 0;
    const avgProfit = acc.unitsSold > 0 ? Math.round(acc.totalProfit / acc.unitsSold) : 0;

    return {
      supplier: acc.supplier,
      isOwnStock: acc.isOwnStock,
      ordersCount: acc.orderIds.size,
      unitsSold: acc.unitsSold,
      totalCost: acc.totalCost,
      totalRevenue: acc.totalRevenue,
      totalProfit: acc.totalProfit,
      profitMargin: margin,
      avgProfitPerUnit: avgProfit,
      products: Array.from(acc.productsMap.values()),
      orderEvents: Array.from(acc.orderEventsMap.values()),
      sourcingLocations: acc.sourcingLocations,
      totalInStockCount: acc.totalInStockCount,
    };
  });

  // Shopbase first, Own Stock right beside it, then others!
  const shopbase = rawList.find((item) => item.supplier.name.toLowerCase().includes('shopbase'));
  const ownStock = rawList.find((item) => item.isOwnStock);
  const others = rawList.filter(
    (item) => item !== shopbase && item !== ownStock
  );

  const supplierList: SupplierAnalyticsItem[] = [];
  if (shopbase) supplierList.push(shopbase);
  if (ownStock) supplierList.push(ownStock);
  others.forEach((s) => supplierList.push(s));
  // If shopbase wasn't found by name, ensure ownStock is at the front
  if (!shopbase && ownStock && !supplierList.includes(ownStock)) {
    supplierList.unshift(ownStock);
  }

  const overallMargin = globalRevenue > 0 ? Math.round((globalProfit / globalRevenue) * 100) : 0;

  return {
    isSampleData,
    totalOrdersCount: globalOrderIds.size,
    totalUnitsSold: globalUnits,
    totalCost: globalCost,
    totalRevenue: globalRevenue,
    totalProfit: globalProfit,
    overallMargin,
    supplierList,
    allSoldProducts: Array.from(allSoldProductsMap.values()),
    ownStockSummary: ownStock,
  };
};
