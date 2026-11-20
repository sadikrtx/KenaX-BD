import React, { useState, useMemo } from 'react';
import {
  Boxes,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  Search,
  History,
  RotateCcw,
  Sparkles,
  Save,
  X,
  Truck,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Sliders,
  ExternalLink,
  Target,
  FileText,
  PackageCheck,
  Tag,
  Clock,
  User,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Product, StockLog, UserRole, StaffUser, Order } from '../../types';
import { getOptimizedImageUrl, handleImageError } from '../../utils/imageOptimizer';
import { PluginSlotRenderer } from './PluginSlotRenderer';
import { SaasDonutChart, SaasBarChart } from './charts/AdminCharts';

interface AdminInventoryProps {
  products: Product[];
  orders?: Order[];
  stockLogs: StockLog[];
  onAdjustStock: (
    productId: string,
    changeAmount: number,
    reason: string
  ) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  lowStockThreshold?: number;
  onNavigateToOrdersWithSearch?: (query: string) => void;
}

export const AdminInventory: React.FC<AdminInventoryProps> = ({
  products,
  orders = [],
  stockLogs,
  onAdjustStock,
  currentRole,
  currentStaff,
  lowStockThreshold = 5,
  onNavigateToOrdersWithSearch,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'logs'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [inlineStockDrafts, setInlineStockDrafts] = useState<Record<string, string>>({});

  // Logs sub-tab filter states
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<'all' | 'delivery' | 'add' | 'remove' | 'restore'>('all');

  // Modal for adjustment
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentMode, setAdjustmentMode] = useState<'add' | 'remove' | 'exact'>('add');
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [exactTargetStock, setExactTargetStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Supplier Container Shipment Arrival');
  const [customReason, setCustomReason] = useState('');
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  // Derive unique categories from products
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Calculate live Reserved and Delivered counts for all products from real orders
  const { productStats, totalReservedOverall, totalDeliveredOverall } = useMemo(() => {
    const stats: Record<string, { reserved: number; delivered: number }> = {};

    products.forEach((p) => {
      stats[p.id] = { reserved: 0, delivered: 0 };
    });

    let reservedSum = 0;
    let deliveredSum = 0;

    orders.forEach((order) => {
      const s = (order.orderStatus || (order as any).status || '').toLowerCase();
      const isDelivered = s === 'delivered' || s === 'completed';
      const isCancelledOrReturned = s === 'cancelled' || s === 'rejected' || s === 'fake order' || s === 'returned';
      const isReserved = !isDelivered && !isCancelledOrReturned;

      const items = (order.items && order.items.length > 0)
        ? order.items
        : (order as any).productId
        ? [{
            productId: (order as any).productId,
            sku: (order as any).sku,
            productName: (order as any).productName,
            quantity: (order as any).quantity || 1,
          }]
        : [];

      items.forEach((item: any) => {
        const qty = item.quantity || 1;
        // Match product by ID, SKU, or Name
        const matched = products.find(
          (p) =>
            p.id === item.productId ||
            (item.sku && p.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) ||
            (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
        );

        if (matched) {
          if (!stats[matched.id]) {
            stats[matched.id] = { reserved: 0, delivered: 0 };
          }

          if (isReserved) {
            stats[matched.id].reserved += qty;
            reservedSum += qty;
          } else if (isDelivered) {
            stats[matched.id].delivered += qty;
            deliveredSum += qty;
          }
        }
      });
    });

    return { productStats: stats, totalReservedOverall: reservedSum, totalDeliveredOverall: deliveredSum };
  }, [products, orders]);

  // Total summary metrics using dynamic lowStockThreshold (default 5)
  const totalUnits = useMemo(() => products.reduce((sum, p) => sum + p.stock, 0), [products]);
  const lowStockCount = useMemo(
    () =>
      products.filter((p) => {
        const avail = Math.max(0, p.stock - (productStats[p.id]?.reserved || 0));
        return avail > 0 && avail <= lowStockThreshold;
      }).length,
    [products, productStats, lowStockThreshold]
  );
  const outOfStockCount = useMemo(
    () =>
      products.filter((p) => {
        const avail = Math.max(0, p.stock - (productStats[p.id]?.reserved || 0));
        return avail === 0;
      }).length,
    [products, productStats]
  );
  const inStockCount = useMemo(
    () =>
      products.filter((p) => {
        const avail = Math.max(0, p.stock - (productStats[p.id]?.reserved || 0));
        return avail > lowStockThreshold;
      }).length,
    [products, productStats, lowStockThreshold]
  );
  const verifyStockCount = useMemo(() => products.filter((p) => p.stock === 999).length, [products]);

  const handleInlineStockSave = (product: Product) => {
    const raw = inlineStockDrafts[product.id];
    if (raw === undefined) return;
    const parsed = Math.max(0, Math.round(Number(raw)));
    if (!Number.isFinite(parsed) || parsed === product.stock) {
      setInlineStockDrafts((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      return;
    }
    const delta = parsed - product.stock;
    onAdjustStock(product.id, delta, `Inline Inventory Stock Update (${product.stock} → ${parsed})`);
    setInlineStockDrafts((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    showToast(`Updated ${product.name} stock: ${product.stock} → ${parsed}`);
  };

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.category && p.category.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;

      const avail = Math.max(0, p.stock - (productStats[p.id]?.reserved || 0));
      if (stockFilter === 'low') return avail > 0 && avail <= lowStockThreshold;
      if (stockFilter === 'out') return avail === 0;
      if (stockFilter === 'in') return avail > lowStockThreshold;
      if (stockFilter === 'verify999') return p.stock === 999;
      return true;
    });
  }, [products, searchQuery, stockFilter, categoryFilter, productStats, lowStockThreshold]);

  // Filtered Stock Logs
  const filteredStockLogs = useMemo(() => {
    return stockLogs.filter((log) => {
      const query = logSearchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        log.sku.toLowerCase().includes(query) ||
        log.productName.toLowerCase().includes(query) ||
        (log.reason && log.reason.toLowerCase().includes(query)) ||
        (log.staffName && log.staffName.toLowerCase().includes(query)) ||
        (log.orderId && log.orderId.toLowerCase().includes(query));

      if (!matchesQuery) return false;

      if (logTypeFilter === 'delivery') {
        const isDelivery =
          (log.reason && log.reason.toLowerCase().includes('ডেলিভারি')) ||
          (log.reason && log.reason.toLowerCase().includes('delivered')) ||
          Boolean(log.orderId);
        return isDelivery && log.quantityChanged < 0;
      }

      if (logTypeFilter === 'add') {
        return log.quantityChanged > 0 && !log.reason?.toLowerCase().includes('রিস্টোর') && !log.reason?.toLowerCase().includes('restored');
      }

      if (logTypeFilter === 'remove') {
        return log.quantityChanged < 0 && !log.reason?.toLowerCase().includes('ডেলিভারি') && !log.reason?.toLowerCase().includes('delivered');
      }

      if (logTypeFilter === 'restore') {
        return (
          (log.reason && log.reason.toLowerCase().includes('রিস্টোর')) ||
          (log.reason && log.reason.toLowerCase().includes('restored')) ||
          (log.reason && log.reason.toLowerCase().includes('ফেরত'))
        );
      }

      return true;
    });
  }, [stockLogs, logSearchQuery, logTypeFilter]);

  const handleOpenAdjustModal = (product: Product, prefillMode: 'add' | 'remove' | 'exact' = 'add') => {
    setSelectedProduct(product);
    setAdjustmentMode(prefillMode);
    setAdjustQty(10);
    setExactTargetStock(product.stock);
    setAdjustReason(
      prefillMode === 'add'
        ? 'Supplier Container Shipment Arrival'
        : prefillMode === 'remove'
        ? 'Damaged in transit / Defective write-off'
        : 'Physical Warehouse Count Reconciliation'
    );
    setCustomReason('');
  };

  const calculateStockDiff = (): { diff: number; resultingStock: number; isSubmittingInvalid: boolean } => {
    if (!selectedProduct) return { diff: 0, resultingStock: 0, isSubmittingInvalid: true };

    const current = selectedProduct.stock;
    if (adjustmentMode === 'add') {
      const q = Math.max(1, adjustQty);
      return { diff: q, resultingStock: current + q, isSubmittingInvalid: q <= 0 };
    }
    if (adjustmentMode === 'remove') {
      const q = Math.max(1, adjustQty);
      const res = Math.max(0, current - q);
      return { diff: -q, resultingStock: res, isSubmittingInvalid: q <= 0 };
    }
    // Exact Mode: user inputs target stock number directly
    const target = Math.max(0, exactTargetStock);
    const diff = target - current;
    return { diff, resultingStock: target, isSubmittingInvalid: diff === 0 };
  };

  const { diff: calculatedDiff, resultingStock: calculatedResultingStock, isSubmittingInvalid } = calculateStockDiff();

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || isSubmittingInvalid) return;

    const finalReason =
      adjustReason === 'Other'
        ? (customReason.trim() || 'Manual stock audit adjustment')
        : adjustReason;

    const previousStockVal = selectedProduct.stock;
    onAdjustStock(selectedProduct.id, calculatedDiff, finalReason);

    showToast(
      `স্টক সফলভাবে আপডেট হয়েছে! ${selectedProduct.name} (${selectedProduct.sku}): ${previousStockVal} ➔ ${calculatedResultingStock} (${calculatedDiff > 0 ? `+${calculatedDiff}` : calculatedDiff} units)`
    );

    setSelectedProduct(null);
  };

  const handleViewProductHistory = (product: Product) => {
    setActiveSubTab('logs');
    setLogSearchQuery(product.sku);
    setLogTypeFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-bold">{notificationToast}</p>
        </div>
      )}

      {/* Extension Slot: Inventory Manager -> Stock & Product Management */}
      <PluginSlotRenderer
        slot="admin.inventory.toolbar"
        userRole={currentRole}
        products={products}
        orders={orders}
      />

      {/* 1. Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total in Stock</span>
            <Boxes className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5">{totalUnits.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{products.length} Active SKUs</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Healthy Stock</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">{inStockCount}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">&gt; 10 units buffer</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">{lowStockCount}</p>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">Reorder required</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Out of Stock</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5">{outOfStockCount}</p>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">0 units available</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Reserved Orders</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5">{totalReservedOverall.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Awaiting delivery</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Delivered Units</span>
            <Truck className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 mt-1.5">{totalDeliveredOverall.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Deducted from stock</p>
        </div>
      </div>

      {/* 2. Sub-tab Navigation (Inventory vs History Logs) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeSubTab === 'inventory'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Inventory SKU List</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeSubTab === 'inventory' ? 'bg-sky-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {filteredProducts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeSubTab === 'logs'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Stock Adjustment History</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeSubTab === 'logs' ? 'bg-sky-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {stockLogs.length}
            </span>
          </button>
        </div>

        {activeSubTab === 'logs' && logSearchQuery && (
          <button
            onClick={() => {
              setLogSearchQuery('');
              setLogTypeFilter('all');
            }}
            className="text-xs text-sky-600 dark:text-sky-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Filter ({logSearchQuery})</span>
          </button>
        )}
      </div>

      {activeSubTab === 'inventory' ? (
        <>
          {/* Inventory Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SaasDonutChart
              title="Warehouse Stock Health"
              subtitle="Click slice to filter SKU status"
              centerLabel="SKUs"
              onSelectSlice={(s) => {
                if (s.id) setStockFilter(stockFilter === s.id ? 'all' : s.id);
              }}
              data={[
                { id: 'in', label: 'Healthy Stock (>10)', value: inStockCount, color: '#059669' },
                { id: 'low', label: 'Low Stock (1–10)', value: lowStockCount, color: '#D97706' },
                { id: 'out', label: 'Out of Stock (0)', value: outOfStockCount, color: '#E11D48' },
              ]}
            />

            <SaasBarChart
              title="Physical vs Reserved Units by Category"
              subtitle="On-hand units compared to active order reservations"
              primaryLabel="Physical Stock"
              secondaryLabel="Reserved"
              barColor="#0284C7"
              secondaryColor="#EA580C"
              data={(() => {
                const map = new Map<string, { phys: number; res: number }>();
                products.forEach((p) => {
                  const cat = p.category || 'General';
                  const cur = map.get(cat) || { phys: 0, res: 0 };
                  cur.phys += p.stock || 0;
                  cur.res += productStats[p.id]?.reserved || 0;
                  map.set(cat, cur);
                });
                return Array.from(map.entries())
                  .sort((a, b) => b[1].phys - a[1].phys)
                  .slice(0, 7)
                  .map(([label, v]) => ({
                    label: label.length > 12 ? `${label.slice(0, 11)}…` : label,
                    value: v.phys,
                    secondaryValue: v.res,
                  }));
              })()}
            />
          </div>

          {/* Search & Stock Filter Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU, product name, or category..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500 truncate"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Stock Status Filter */}
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer"
              >
                <option value="all">All Stock Status ({products.length})</option>
                <option value="in">In Stock (&gt;{lowStockThreshold})</option>
                <option value="low">Low Stock (≤{lowStockThreshold})</option>
                <option value="out">Out of Stock (0)</option>
                {verifyStockCount > 0 && (
                  <option value="verify999">Verify Stock — 999 ({verifyStockCount})</option>
                )}
              </select>
            </div>
          </div>

          {/* Table / Card List */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            {/* Desktop View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                    <th className="py-3.5 px-4">Product & SKU</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Physical Stock</th>
                    <th className="py-3.5 px-4 text-center" title="Quantity in pending, confirmed, processing, shipped orders">
                      Reserved (Orders)
                    </th>
                    <th className="py-3.5 px-4 text-center" title="Physical Stock minus Reserved">
                      Available to Sell
                    </th>
                    <th className="py-3.5 px-4 text-center" title="Total units delivered to customers">
                      Delivered
                    </th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                        No products match your inventory filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const stats = productStats[p.id] || { reserved: 0, delivered: 0 };
                      const available = Math.max(0, p.stock - stats.reserved);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={getOptimizedImageUrl(p.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=80', 100)}
                                alt={p.name}
                                referrerPolicy="no-referrer"
                                onError={(e) => handleImageError(e, p.images?.[0])}
                                className="w-10 h-10 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{p.name}</p>
                                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                                  #{p.sku}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                              {p.category || 'General'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                value={inlineStockDrafts[p.id] !== undefined ? inlineStockDrafts[p.id] : String(p.stock)}
                                onChange={(e) =>
                                  setInlineStockDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleInlineStockSave(p);
                                  }
                                }}
                                aria-label={`Physical stock for ${p.name}`}
                                className={`w-16 px-2 py-1 rounded-lg border text-center text-xs font-black bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 ${
                                  p.stock === 999
                                    ? 'border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/30'
                                    : 'border-slate-200 dark:border-slate-700'
                                }`}
                              />
                              {inlineStockDrafts[p.id] !== undefined && Number(inlineStockDrafts[p.id]) !== p.stock && (
                                <button
                                  type="button"
                                  onClick={() => handleInlineStockSave(p)}
                                  title="Save inline stock"
                                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${stats.reserved > 0 ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'text-slate-400 dark:text-slate-500'}`}>
                              {stats.reserved}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`text-sm font-black ${available > lowStockThreshold ? 'text-emerald-600 dark:text-emerald-400' : available > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {available}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400">
                              <Truck className="w-3.5 h-3.5" />
                              <span>{stats.delivered}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                  available > lowStockThreshold
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : available > 0
                                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                }`}
                              >
                                {available > lowStockThreshold ? 'In Stock' : available > 0 ? 'Low Stock' : 'Out of Stock'}
                              </span>
                              {p.stock === 999 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                  <AlertTriangle className="w-3 h-3" />
                                  Verify stock
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleViewProductHistory(p)}
                                title="View stock history for this product"
                                className="px-2.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                              >
                                <History className="w-3.5 h-3.5 text-slate-500" />
                                <span>History</span>
                              </button>

                              <button
                                onClick={() => handleOpenAdjustModal(p, 'add')}
                                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Adjust Stock</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View: High-density, Clean Product Cards */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                  No products found in inventory.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const stats = productStats[p.id] || { reserved: 0, delivered: 0 };
                  const available = Math.max(0, p.stock - stats.reserved);

                  return (
                    <div key={p.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Top Row: SKU + Category + Stock Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">#{p.sku}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                            {p.category || 'General'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {p.stock === 999 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                              <AlertTriangle className="w-3 h-3" />
                              Verify stock
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                              available > lowStockThreshold
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : available > 0
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {available > lowStockThreshold ? 'In Stock' : available > 0 ? 'Low Stock' : 'Out of Stock'}
                          </span>
                        </div>
                      </div>

                      {/* Product Thumbnail & Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getOptimizedImageUrl(p.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=80', 100)}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => handleImageError(e, p.images?.[0])}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                        <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug line-clamp-2">
                          {p.name}
                        </p>
                      </div>

                      {/* Stock Multi-Metrics Grid + Inline Quick Stock Edit */}
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-center items-center">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Total</span>
                          <div className="inline-flex items-center gap-1 mt-0.5">
                            <input
                              type="number"
                              min={0}
                              value={inlineStockDrafts[p.id] !== undefined ? inlineStockDrafts[p.id] : String(p.stock)}
                              onChange={(e) =>
                                setInlineStockDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                              }
                              className="w-14 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-black text-slate-900 dark:text-white text-xs"
                            />
                            {inlineStockDrafts[p.id] !== undefined && Number(inlineStockDrafts[p.id]) !== p.stock && (
                              <button
                                type="button"
                                onClick={() => handleInlineStockSave(p)}
                                className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-indigo-500 block">Reserved</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">{stats.reserved}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-emerald-500 block">Available</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">{available}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-teal-500 block">Delivered</span>
                          <span className="font-bold text-teal-600 dark:text-teal-400 text-xs">{stats.delivered}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleViewProductHistory(p)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-slate-500" />
                          <span>History</span>
                        </button>

                        <button
                          onClick={() => handleOpenAdjustModal(p, 'add')}
                          className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Adjust Stock</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : (
        /* 3. Stock Adjustment Audit Logs Tab */
        <div className="space-y-4">
          {/* Logs Search & Filter Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Search by SKU, product name, order ID (#ORD-), staff, reason..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500 truncate"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setLogTypeFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                  logTypeFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                All Entries ({stockLogs.length})
              </button>

              <button
                onClick={() => setLogTypeFilter('delivery')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shrink-0 ${
                  logTypeFilter === 'delivery'
                    ? 'bg-teal-600 text-white'
                    : 'bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Order Deliveries (-)</span>
              </button>

              <button
                onClick={() => setLogTypeFilter('add')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shrink-0 ${
                  logTypeFilter === 'add'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Restock / Add (+)</span>
              </button>

              <button
                onClick={() => setLogTypeFilter('remove')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shrink-0 ${
                  logTypeFilter === 'remove'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Manual Deductions (-)</span>
              </button>

              <button
                onClick={() => setLogTypeFilter('restore')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shrink-0 ${
                  logTypeFilter === 'restore'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Returns / Restores (+)</span>
              </button>
            </div>
          </div>

          {/* Logs Table / Cards */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Product Name & SKU</th>
                    <th className="py-3.5 px-4">Source / Staff</th>
                    <th className="py-3.5 px-4 text-center">Previous Stock</th>
                    <th className="py-3.5 px-4 text-center">Stock Change</th>
                    <th className="py-3.5 px-4 text-center">New Stock</th>
                    <th className="py-3.5 px-4 text-center">Flow Calculation</th>
                    <th className="py-3.5 px-4">Reason / Order Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStockLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                        No stock adjustment log entries match the filter.
                      </td>
                    </tr>
                  ) : (
                    filteredStockLogs.map((log) => {
                      const isOrderDelivery =
                        (log.reason && log.reason.toLowerCase().includes('ডেলিভারি')) ||
                        (log.reason && log.reason.toLowerCase().includes('delivered')) ||
                        Boolean(log.orderId);

                      const isPositive = log.quantityChanged > 0;

                      // Extract order id if present in reason or field
                      const orderIdMatch = log.orderId || log.reason?.match(/#([a-zA-Z0-9_-]+)/)?.[1];

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px] font-medium">
                            {new Date(log.timestamp).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{log.productName}</p>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-semibold">#{log.sku}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            {isOrderDelivery ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-bold">
                                <Truck className="w-3.5 h-3.5" />
                                <span>Order Delivery</span>
                              </div>
                            ) : (
                              <div>
                                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">{log.staffName || 'Admin'}</p>
                                <span className="text-[10px] text-slate-400 capitalize">{log.staffRole || 'Staff'}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-600 dark:text-slate-400 text-xs">
                            {log.previousStock}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-black ${
                                isPositive
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                              }`}
                            >
                              {isPositive ? (
                                <TrendingUp className="w-3 h-3 shrink-0" />
                              ) : (
                                <TrendingDown className="w-3 h-3 shrink-0" />
                              )}
                              <span>{isPositive ? `+${log.quantityChanged}` : log.quantityChanged}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center font-black text-slate-900 dark:text-white text-sm">
                            {log.newStock}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold">
                              <span>{log.previousStock}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="text-sky-600 dark:text-sky-400">{log.newStock}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{log.reason}</span>
                              {orderIdMatch && onNavigateToOrdersWithSearch && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToOrdersWithSearch(orderIdMatch)}
                                  className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 text-[10px] font-bold border border-sky-200 dark:border-sky-800 inline-flex items-center gap-1 cursor-pointer shrink-0"
                                >
                                  <span>View Order</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStockLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                  No stock adjustment logs found.
                </div>
              ) : (
                filteredStockLogs.map((log) => {
                  const isOrderDelivery =
                    (log.reason && log.reason.toLowerCase().includes('ডেলিভারি')) ||
                    (log.reason && log.reason.toLowerCase().includes('delivered')) ||
                    Boolean(log.orderId);
                  const isPositive = log.quantityChanged > 0;
                  const orderIdMatch = log.orderId || log.reason?.match(/#([a-zA-Z0-9_-]+)/)?.[1];

                  return (
                    <div key={log.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Top Row: SKU + Date + Change Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">#{log.sku}</span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleDateString('en-GB')}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-black shrink-0 ${
                            isPositive
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{isPositive ? `+${log.quantityChanged}` : log.quantityChanged}</span>
                        </span>
                      </div>

                      {/* Product Name */}
                      <p className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1">{log.productName}</p>

                      {/* Stock Flow Card */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Stock Flow</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {log.previousStock} <span className="text-slate-400">➔</span> <strong className="text-slate-900 dark:text-white text-sm">{log.newStock}</strong>
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Staff / Source</span>
                          {isOrderDelivery ? (
                            <span className="text-teal-600 dark:text-teal-400 font-bold inline-flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              <span>Delivered</span>
                            </span>
                          ) : (
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                              {log.staffName || 'Admin'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reason & Order Link */}
                      {log.reason && (
                        <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate flex-1">
                            {log.reason}
                          </p>
                          {orderIdMatch && onNavigateToOrdersWithSearch && (
                            <button
                              type="button"
                              onClick={() => onNavigateToOrdersWithSearch(orderIdMatch)}
                              className="px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 hover:bg-sky-100 text-[10px] font-bold border border-sky-200 dark:border-sky-800 inline-flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <span>Order</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Smart Stock Adjustment Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Boxes className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Product Stock Adjustment</h3>
                  <p className="text-[11px] text-slate-400">Smart Inventory Calculation & Audit Logging</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              {/* Product Info Banner */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <img
                  src={getOptimizedImageUrl(selectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=80', 100)}
                  alt={selectedProduct.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageError(e, selectedProduct.images?.[0])}
                  className="w-12 h-12 rounded-xl object-cover bg-white dark:bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-700"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{selectedProduct.name}</p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    SKU: {selectedProduct.sku} • Category: {selectedProduct.category || 'General'}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-slate-600 dark:text-slate-300">
                      Current Stock: <strong className="font-black text-slate-900 dark:text-white">{selectedProduct.stock} units</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Mode Toggle: Add (+) vs Remove (-) vs Exact Target Count */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Adjustment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentMode('add');
                      setAdjustReason('Supplier Container Shipment Arrival');
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      adjustmentMode === 'add'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Stock (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentMode('remove');
                      setAdjustReason('Damaged in transit / Defective write-off');
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      adjustmentMode === 'remove'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Remove (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentMode('exact');
                      setExactTargetStock(selectedProduct.stock);
                      setAdjustReason('Physical Warehouse Count Reconciliation');
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      adjustmentMode === 'exact'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Exact Audit</span>
                  </button>
                </div>
              </div>

              {/* Quantity / Exact Target Input */}
              {adjustmentMode === 'exact' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Physical Count (New Total Stock)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={exactTargetStock}
                    onChange={(e) => setExactTargetStock(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-extrabold text-slate-900 dark:text-white dark:bg-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    System automatically calculates the difference from current stock ({selectedProduct.stock} units).
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {adjustmentMode === 'add' ? 'Units to Add' : 'Units to Remove'}
                    </label>
                    {/* Quick increment buttons */}
                    <div className="flex items-center gap-1">
                      {[1, 5, 10, 25, 50, 100].map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => setAdjustQty((prev) => (prev || 0) + step)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          +{step}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-extrabold text-slate-900 dark:text-white dark:bg-slate-800"
                  />
                </div>
              )}

              {/* LIVE CALCULATION DISPLAY ("কতটার পর অ্যাডজাস্ট করছে") */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-sky-50/50 dark:from-slate-800/80 dark:to-sky-950/30 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block">
                  Live Stock Movement & Calculation
                </span>

                <div className="flex items-center justify-between text-xs">
                  <div className="text-center sm:text-left">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Previous Stock (আগের)</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">{selectedProduct.stock}</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs">
                    <span className={`text-xs font-black ${calculatedDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {calculatedDiff > 0 ? `+${calculatedDiff}` : calculatedDiff}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  <div className="text-center sm:text-right">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">New Stock (অ্যাডজাস্টমেন্ট পর)</span>
                    <span className="text-base font-black text-sky-600 dark:text-sky-400">{calculatedResultingStock} units</span>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <span>কতটার পর কত হবে:</span>
                  <strong className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedProduct.stock} ➔ {calculatedResultingStock} ({calculatedDiff > 0 ? `+${calculatedDiff}` : calculatedDiff})
                  </strong>
                </div>
              </div>

              {/* Adjustment Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason for Adjustment
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer"
                >
                  <option value="Supplier Container Shipment Arrival">Supplier Container Shipment Arrival (নতুন চালান রিসিভ)</option>
                  <option value="Physical Warehouse Count Reconciliation">Physical Warehouse Count Reconciliation (ফিজিক্যাল অডিট সংশোধন)</option>
                  <option value="Customer Return Restocking">Customer Return Restocking (কাস্টমার রিটার্ন স্টক যুক্ত)</option>
                  <option value="Damaged in transit / Defective write-off">Damaged in transit / Defective write-off (ড্যামেজ বা নষ্ট পণ্য বাদ)</option>
                  <option value="Marketing Samples Dispatched">Marketing Samples Dispatched (মার্কেটিং স্যাম্পল বিতরণ)</option>
                  <option value="Offline Outlet Transfer">Offline Outlet Transfer (আউটলেট ট্রান্সফার)</option>
                  <option value="Other">Other (Custom Details / নিজস্ব কারণ)</option>
                </select>
              </div>

              {adjustReason === 'Other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Specify Reason / Internal Note
                  </label>
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter specific audit reason..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white dark:bg-slate-800"
                  />
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvalid}
                  className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all ${
                    isSubmittingInvalid
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-sky-600 hover:bg-sky-700 active:scale-98'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>Confirm & Save Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
