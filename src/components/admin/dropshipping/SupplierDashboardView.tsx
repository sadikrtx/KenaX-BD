import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  MapPin,
  Phone,
  Building2,
  Boxes,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Product, Supplier } from '../../../types';
import {
  DropshippingAnalyticsData,
  SupplierAnalyticsItem,
  SoldProductEntry,
  OWN_STOCK_SUPPLIER_ID,
} from './types';

interface SupplierDashboardViewProps {
  analytics: DropshippingAnalyticsData;
  orderStatusFilter: 'all' | 'delivered' | 'active';
  setOrderStatusFilter: (f: 'all' | 'delivered' | 'active') => void;
  onSelectSupplierForDetail: (supplierId: string) => void;
  onEditProduct?: (product: Product) => void;
  onAddProductForSupplier?: (supplier: Supplier) => void;
}

export const SupplierDashboardView: React.FC<SupplierDashboardViewProps> = ({
  analytics,
  orderStatusFilter,
  setOrderStatusFilter,
  onSelectSupplierForDetail,
  onEditProduct,
  onAddProductForSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'all' | 'dropshipping' | 'own'>('all');

  const filteredSuppliers = analytics.supplierList.filter((item) => {
    if (sourceTypeFilter === 'own' && !item.isOwnStock) return false;
    if (sourceTypeFilter === 'dropshipping' && item.isOwnStock) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const nameMatch = item.supplier.name.toLowerCase().includes(q);
    const prodMatch = item.products.some((p) => p.product.name.toLowerCase().includes(q));
    const locMatch = item.sourcingLocations?.some(
      (loc) => loc.address.toLowerCase().includes(q) || loc.phone.includes(q) || (loc.vendorName && loc.vendorName.toLowerCase().includes(q))
    );
    return nameMatch || prodMatch || !!locMatch;
  });

  const filteredAllProducts = analytics.allSoldProducts.filter((entry) => {
    if (sourceTypeFilter === 'own' && !entry.isOwnStock) return false;
    if (sourceTypeFilter === 'dropshipping' && entry.isOwnStock) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      entry.product.name.toLowerCase().includes(q) ||
      entry.supplier.name.toLowerCase().includes(q) ||
      (entry.sourcingAddress && entry.sourcingAddress.toLowerCase().includes(q)) ||
      (entry.sourcingPhone && entry.sourcingPhone.includes(q)) ||
      (entry.sourcingVendorName && entry.sourcingVendorName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {analytics.isSampleData && (
        <div className="rounded-2xl p-4 bg-indigo-50/80 border border-indigo-100 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-2">
              <span>Demonstration Analytics Active</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-semibold">
                Preview Mode
              </span>
            </h4>
            <p className="text-[11px] text-indigo-700/90 mt-0.5">
              Live orders will automatically update these metrics. Currently displaying sample wholesale costs, retail revenues, and profit margins for Shopbase dropshipping and On Stock in-house inventory.
            </p>
          </div>
        </div>
      )}

      {/* Top Financial KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cost Price */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Cost Price
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ৳{analytics.totalCost.toLocaleString('en-BD')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Wholesale purchase & sourcing costs</span>
            </p>
          </div>
        </div>

        {/* Final Selling Price */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Final Selling Price
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ৳{analytics.totalRevenue.toLocaleString('en-BD')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Customer retail order sales value
            </p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-xs bg-linear-to-br from-white to-emerald-50/20 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Our Net Profit
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700 tracking-tight flex items-baseline gap-2">
              <span>+৳{analytics.totalProfit.toLocaleString('en-BD')}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                +{analytics.overallMargin}%
              </span>
            </div>
            <p className="text-[11px] text-emerald-700/80 mt-1">
              Total earnings after deducting wholesale costs
            </p>
          </div>
        </div>

        {/* Total Sourced Units Sold */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Units Sourced & Sold
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {analytics.totalUnitsSold.toLocaleString()} <span className="text-sm font-semibold text-slate-500">pcs</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Across {analytics.totalOrdersCount} customer orders
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by supplier, source, address, phone, or product name..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Source Type Filter */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setSourceTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                sourceTypeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Sources
            </button>
            <button
              onClick={() => setSourceTypeFilter('dropshipping')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                sourceTypeFilter === 'dropshipping'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dropshipping
            </button>
            <button
              onClick={() => setSourceTypeFilter('own')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                sourceTypeFilter === 'own'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              On Stock
            </button>
          </div>

          {/* Order Status Filter */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setOrderStatusFilter('all')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                orderStatusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => setOrderStatusFilter('delivered')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                orderStatusFilter === 'delivered'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Delivered
            </button>
            <button
              onClick={() => setOrderStatusFilter('active')}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                orderStatusFilter === 'active'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
          </div>
        </div>
      </div>

      {/* Supplier & Source Performance Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Supplier & Inventory Source Cards (Click to inspect breakdown)
            </h3>
            <p className="text-xs text-slate-500">
              Showing {filteredSuppliers.length} active inventory sources (Shopbase dropship & On Stock in-house)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((item) => {
            const isOwn = item.isOwnStock;
            const costRatio =
              item.totalRevenue > 0 ? Math.round((item.totalCost / item.totalRevenue) * 100) : 0;
            const profitRatio =
              item.totalRevenue > 0 ? Math.round((item.totalProfit / item.totalRevenue) * 100) : 0;

            return (
              <div
                key={item.supplier.id}
                onClick={() => onSelectSupplierForDetail(item.supplier.id)}
                className={`group rounded-2xl p-5 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                  isOwn
                    ? 'bg-linear-to-b from-white to-emerald-50/20 border-emerald-200 hover:border-emerald-400'
                    : 'bg-white border-slate-200/80 hover:border-indigo-300'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isOwn
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {isOwn ? <Package className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {item.supplier.name}
                        </h4>
                        {/* On Stock Badge or Dropship Badge */}
                        {isOwn ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            On Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                            Dropshipping
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {item.unitsSold} pcs sold • {item.ordersCount} orders
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-black shrink-0 ${
                      isOwn
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                    }`}
                  >
                    +{item.profitMargin}% Margin
                  </span>
                </div>

                {/* Sourcing details teaser for On Stock */}
                {isOwn && item.sourcingLocations && item.sourcingLocations.length > 0 && (
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-950 flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="truncate">
                      <span className="font-bold">Primary Sourcing: </span>
                      <span className="truncate">{item.sourcingLocations[0].address}</span>
                      {item.sourcingLocations[0].phone !== 'N/A' && (
                        <span className="text-emerald-700 ml-1 font-mono">({item.sourcingLocations[0].phone})</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Financial Summary Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Cost Price</div>
                    <div className="text-xs font-black text-slate-800 mt-0.5">
                      ৳{item.totalCost.toLocaleString('en-BD')}
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Selling Price</div>
                    <div className="text-xs font-black text-slate-800 mt-0.5">
                      ৳{item.totalRevenue.toLocaleString('en-BD')}
                    </div>
                  </div>

                  <div
                    className={`p-2 rounded-xl border ${
                      isOwn ? 'bg-emerald-50/80 border-emerald-200' : 'bg-indigo-50/60 border-indigo-100'
                    }`}
                  >
                    <div
                      className={`text-[10px] font-bold uppercase ${
                        isOwn ? 'text-emerald-800' : 'text-indigo-800'
                      }`}
                    >
                      Our Net Profit
                    </div>
                    <div
                      className={`text-xs font-black mt-0.5 ${
                        isOwn ? 'text-emerald-800' : 'text-indigo-900'
                      }`}
                    >
                      +৳{item.totalProfit.toLocaleString('en-BD')}
                    </div>
                  </div>
                </div>

                {/* Visual Ratio Bar */}
                <div className="mt-3.5">
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
                    <div style={{ width: `${costRatio}%` }} className="bg-amber-400" title={`Cost: ${costRatio}%`} />
                    <div style={{ width: `${profitRatio}%` }} className="bg-emerald-500" title={`Profit: ${profitRatio}%`} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-medium">
                    <span className="text-amber-700 font-semibold">Cost: {costRatio}%</span>
                    <span className="text-emerald-700 font-semibold">Net Profit: {profitRatio}%</span>
                  </div>
                </div>

                {/* Card CTA */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                  <span className="flex items-center gap-1">
                    <span>{isOwn ? 'View In-House Stock & Sourcing' : 'View Sold Products & Analytics'}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium group-hover:text-slate-600 flex items-center gap-1">
                    {item.products.length} products
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consolidated Table of All Sourced and Sold Products */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Consolidated Sourced & Sold Products (Cost vs. Selling Breakdown)
            </h3>
            <p className="text-xs text-slate-500">
              Wholesale cost, final retail selling price, per-unit markup, and cumulative net profit
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 text-slate-700 w-fit">
            {filteredAllProducts.length} Products Analyzed
          </span>
        </div>

        {filteredAllProducts.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-200">
            <Boxes className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-700">No products match your filter</h4>
            <p className="text-[11px] text-slate-400 mt-1">Try clearing your search query or switching source filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-3">Sourcing Type / Vendor</th>
                  <th className="py-3 px-3 text-right">Cost Price</th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3 text-right text-emerald-700">Unit Profit</th>
                  <th className="py-3 px-3 text-center">Units Sold</th>
                  <th className="py-3 px-3 text-right">Total Cost</th>
                  <th className="py-3 px-3 text-right">Total Sales</th>
                  <th className="py-3 px-3 text-right text-emerald-700 font-black">Net Profit</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAllProducts.map((entry) => {
                  const isOwn = entry.isOwnStock;
                  const marginPct =
                    entry.totalRevenue > 0
                      ? Math.round((entry.totalProfit / entry.totalRevenue) * 100)
                      : 0;

                  return (
                    <tr key={`${entry.supplier.id}-${entry.product.id}`} className="hover:bg-slate-50/60 transition-colors">
                      {/* Product */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          <img
                            src={
                              entry.product.images && entry.product.images[0]
                                ? entry.product.images[0]
                                : '/placeholder.png'
                            }
                            alt={entry.product.name}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', '/placeholder.png');
                            }}
                          />
                          <div className="truncate">
                            <div className="font-bold text-slate-900 truncate" title={entry.product.name}>
                              {entry.product.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              SKU: {entry.product.sku || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Source & Sourcing Address / Vendor Phone */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isOwn ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              On Stock
                            </span>
                            {entry.sourcingAddress && (
                              <div className="text-[10px] text-slate-600 flex items-center gap-1 truncate max-w-[180px]" title={entry.sourcingAddress}>
                                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span className="truncate">{entry.sourcingAddress}</span>
                              </div>
                            )}
                            {entry.sourcingPhone && (
                              <div className="text-[10px] text-indigo-700 font-mono flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 shrink-0" />
                                <a href={`tel:${entry.sourcingPhone}`} className="hover:underline">
                                  {entry.sourcingPhone}
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                              {entry.supplier.name}
                            </span>
                            {entry.product.supplierUrl && (
                              <div className="text-[10px]">
                                <a
                                  href={entry.product.supplierUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                                >
                                  <span>Source Link</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Cost Price */}
                      <td className="py-3 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                        ৳{entry.costPrice.toLocaleString('en-BD')}
                      </td>

                      {/* Final Selling */}
                      <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                        ৳{entry.sellingPrice.toLocaleString('en-BD')}
                      </td>

                      {/* Profit Per Unit */}
                      <td className="py-3 px-3 text-right font-black text-emerald-700 whitespace-nowrap">
                        +৳{entry.profitPerUnit.toLocaleString('en-BD')}
                      </td>

                      {/* Units Sold */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-800 text-[11px]">
                          {entry.unitsSold} pcs
                        </span>
                      </td>

                      {/* Total Cost */}
                      <td className="py-3 px-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                        ৳{entry.totalCost.toLocaleString('en-BD')}
                      </td>

                      {/* Total Sales */}
                      <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                        ৳{entry.totalRevenue.toLocaleString('en-BD')}
                      </td>

                      {/* Net Profit */}
                      <td className="py-3 px-3 text-right font-black text-emerald-700 whitespace-nowrap">
                        <div>+৳{entry.totalProfit.toLocaleString('en-BD')}</div>
                        <div className="text-[10px] text-emerald-600 font-semibold">{marginPct}% margin</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectSupplierForDetail(entry.supplier.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors cursor-pointer"
                            title="View source statistics"
                          >
                            {isOwn ? 'On Stock Details' : 'Supplier Details'}
                          </button>
                          {onEditProduct && (
                            <button
                              onClick={() => onEditProduct(entry.product)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
