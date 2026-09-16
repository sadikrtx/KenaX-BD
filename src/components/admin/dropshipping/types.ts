import { Product, Supplier, Order, SourcingLocation } from '../../../types';

export type { SourcingLocation };
export const OWN_STOCK_SUPPLIER_ID = 'own-stock';

export interface SourcingLocationSummary {
  id?: string;
  vendorName: string;
  marketName?: string;
  address: string;
  phone: string;
  secondaryPhone?: string;
  contactPerson?: string;
  memo?: string;
  productCategories?: string;
  status?: 'active' | 'inactive';
  productCount: number;
  products: Product[];
}

export interface SoldProductEntry {
  product: Product;
  supplier: Supplier;
  isOwnStock?: boolean;
  unitsSold: number;
  costPrice: number;
  sellingPrice: number;
  profitPerUnit: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  // Sourcing metadata for own-stock items
  sourcingAddress?: string;
  sourcingPhone?: string;
  sourcingVendorName?: string;
  sourcingMemo?: string;
}

export interface OrderEventItem {
  productId: string;
  name: string;
  qty: number;
  sellingPrice: number;
  costPrice: number;
  profit: number;
}

export interface OrderEventEntry {
  orderId: string;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  status: string;
  items: OrderEventItem[];
  orderRevenue: number;
  orderCost: number;
  orderProfit: number;
}

export interface SupplierAnalyticsItem {
  supplier: Supplier;
  isOwnStock?: boolean;
  ordersCount: number;
  unitsSold: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  avgProfitPerUnit: number;
  products: SoldProductEntry[];
  orderEvents: OrderEventEntry[];
  sourcingLocations?: SourcingLocationSummary[];
  totalInStockCount?: number;
}

export interface DropshippingAnalyticsData {
  isSampleData: boolean;
  totalOrdersCount: number;
  totalUnitsSold: number;
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  overallMargin: number;
  supplierList: SupplierAnalyticsItem[];
  allSoldProducts: SoldProductEntry[];
  ownStockSummary?: SupplierAnalyticsItem;
}
