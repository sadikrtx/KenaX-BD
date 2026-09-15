import React, { useState } from 'react';
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
} from 'lucide-react';
import { Product, StockLog, UserRole, StaffUser } from '../../types';

interface AdminInventoryProps {
  products: Product[];
  stockLogs: StockLog[];
  onAdjustStock: (
    productId: string,
    changeAmount: number,
    reason: string
  ) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
}

export const AdminInventory: React.FC<AdminInventoryProps> = ({
  products,
  stockLogs,
  onAdjustStock,
  currentRole,
  currentStaff,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'logs'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('all');

  // Modal for adjustment
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState('Supplier Container Shipment Arrival');
  const [customReason, setCustomReason] = useState('');

  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const inStockCount = products.filter((p) => p.stock > 10).length;

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (stockFilter === 'low') return matchesSearch && p.stock > 0 && p.stock <= 10;
    if (stockFilter === 'out') return matchesSearch && p.stock === 0;
    if (stockFilter === 'in') return matchesSearch && p.stock > 10;
    return matchesSearch;
  });

  const handleOpenAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentType('add');
    setAdjustQty(10);
    setAdjustReason('Supplier Container Shipment Arrival');
    setCustomReason('');
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || adjustQty <= 0) return;

    const diff = adjustmentType === 'add' ? adjustQty : -adjustQty;
    const finalReason = adjustReason === 'Other' ? (customReason.trim() || 'Manual adjustment') : adjustReason;

    onAdjustStock(selectedProduct.id, diff, finalReason);
    setSelectedProduct(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Units in Hub</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalUnits.toLocaleString()}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{products.length} active SKUs</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Healthy In Stock</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{inStockCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">&gt; 10 units threshold</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Warning</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{lowStockCount}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">Needs reordering soon</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Out of Stock</span>
          <p className="text-2xl font-black text-rose-600 mt-1">{outOfStockCount}</p>
          <p className="text-[11px] text-rose-700 mt-0.5">Orders temporarily halted</p>
        </div>
      </div>

      {/* 2. Sub-tab Navigation (Inventory vs History Logs) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('inventory')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
            activeSubTab === 'inventory'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Inventory SKU Status</span>
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
            activeSubTab === 'logs'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Stock Adjustment History ({stockLogs.length})</span>
        </button>
      </div>

      {activeSubTab === 'inventory' ? (
        <>
          {/* Search & Stock Filter */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU, product..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 truncate"
              />
            </div>

            <div className="shrink-0">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="px-2.5 sm:px-3 py-2 rounded-xl border border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-700 bg-white cursor-pointer"
              >
                <option value="all">All Inventory ({products.length})</option>
                <option value="in">In Stock (&gt;10)</option>
                <option value="low">Low Stock (≤10)</option>
                <option value="out">Out of Stock (0)</option>
              </select>
            </div>
          </div>

          {/* Table / Card List */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
            {/* Desktop View (Unchanged table layout) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3.5 px-4">SKU</th>
                    <th className="py-3.5 px-4">Product Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Available Stock</th>
                    <th className="py-3.5 px-4 text-center">Reserved</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Adjustment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const reserved = p.stock > 0 ? Math.min(3, Math.floor(p.stock * 0.1)) : 0;
                    const available = Math.max(0, p.stock - reserved);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {p.sku}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={p.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=80'}
                              alt={p.name}
                              className="w-8 h-8 rounded-lg object-cover bg-slate-100 shrink-0"
                            />
                            <span className="font-bold text-slate-900 truncate max-w-xs">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {p.category}
                        </td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-slate-900 text-sm">
                          {p.stock}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                          {reserved}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.stock > 10
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.stock > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {p.stock > 10 ? 'In Stock' : p.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenAdjustModal(p)}
                            className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Adjust Stock</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View: Clean, Zero Horizontal Scroll Compact Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No products found in inventory.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const reserved = p.stock > 0 ? Math.min(3, Math.floor(p.stock * 0.1)) : 0;
                  const available = Math.max(0, p.stock - reserved);

                  return (
                    <div key={p.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                      {/* Top Row: SKU + Category + Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-mono font-bold text-slate-800 text-xs">#{p.sku}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 truncate max-w-[120px]">
                            {p.category}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            p.stock > 10
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.stock > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.stock > 10 ? 'In Stock' : p.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                        </span>
                      </div>

                      {/* Product Thumbnail & Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=80'}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                        />
                        <p className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                          {p.name}
                        </p>
                      </div>

                      {/* Stock Counts & Adjust Button */}
                      <div className="flex items-center justify-between gap-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                            <span className="font-extrabold text-slate-900 text-sm">{p.stock}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Available</span>
                            <span className="font-bold text-emerald-700 text-xs">{available}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Reserved</span>
                            <span className="font-medium text-slate-500 text-xs">{reserved}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenAdjustModal(p)}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs shrink-0"
                        >
                          <span>Adjust</span>
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
        /* 3. Stock Adjustment Audit Logs */
        <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Product SKU</th>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4 text-center">Prev Stock</th>
                  <th className="py-3.5 px-4 text-center">Change</th>
                  <th className="py-3.5 px-4 text-center">New Stock</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {new Date(log.timestamp).toLocaleString('en-GB')}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-bold text-slate-900">{log.sku}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-xs">{log.productName}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{log.staffName}</p>
                      <span className="text-[10px] text-slate-400 capitalize">{log.staffRole}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                      {log.previousStock}
                    </td>
                    <td className="py-3.5 px-4 text-center font-extrabold">
                      <span
                        className={
                          log.quantityChanged > 0
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }
                      >
                        {log.quantityChanged > 0 ? `+${log.quantityChanged}` : log.quantityChanged}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-slate-900">
                      {log.newStock}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {log.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Audit Logs Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {stockLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                No audit log entries recorded yet.
              </div>
            ) : (
              stockLogs.map((log) => (
                <div key={log.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-slate-900 text-xs">#{log.sku}</span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {new Date(log.timestamp).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                        log.quantityChanged > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {log.quantityChanged > 0 ? `+${log.quantityChanged}` : log.quantityChanged}
                    </span>
                  </div>

                  <p className="font-bold text-slate-900 text-xs truncate">{log.productName}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-2 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Stock Flow</span>
                      <span className="font-semibold text-slate-800 text-xs">
                        {log.previousStock} → <span className="font-black text-slate-900">{log.newStock}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Staff</span>
                      <span className="font-semibold text-slate-800 text-xs truncate block">{log.staffName}</span>
                    </div>
                  </div>

                  {log.reason && (
                    <p className="text-[11px] text-slate-500 italic bg-white p-1.5 rounded border border-slate-100">
                      Note: {log.reason}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base">Adjust Product Stock</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-800">{selectedProduct.name}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  SKU: {selectedProduct.sku} • Current Stock: <strong className="text-slate-900">{selectedProduct.stock} units</strong>
                </p>
              </div>

              {/* Adjustment Mode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Action Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('add')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      adjustmentType === 'add'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Stock (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('remove')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      adjustmentType === 'remove'
                        ? 'bg-rose-50 border-rose-500 text-rose-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <span>Remove Stock (-)</span>
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Adjustment</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white"
                >
                  <option value="Supplier Container Shipment Arrival">Supplier Container Shipment Arrival</option>
                  <option value="Physical Warehouse Count Reconciliation">Physical Warehouse Count Reconciliation</option>
                  <option value="Damaged in transit / Defective write-off">Damaged in transit / Defective write-off</option>
                  <option value="Customer Return Restocking">Customer Return Restocking</option>
                  <option value="Marketing Samples Dispatched">Marketing Samples Dispatched</option>
                  <option value="Other">Other (Custom Reason)</option>
                </select>
              </div>

              {adjustReason === 'Other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specify Reason</label>
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter details..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              )}

              {/* Projected Stock */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex justify-between items-center">
                <span>Resulting Stock:</span>
                <span className="font-extrabold text-sm text-slate-900">
                  {adjustmentType === 'add'
                    ? selectedProduct.stock + adjustQty
                    : Math.max(0, selectedProduct.stock - adjustQty)}{' '}
                  units
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Confirm Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
