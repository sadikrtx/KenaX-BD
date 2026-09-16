import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Package,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ExternalLink,
  Phone,
  MessageCircle,
  Globe,
  MapPin,
  FileText,
  Boxes,
  Copy,
  Check,
  Calendar,
  User,
  Plus,
  Edit2,
  Trash2,
  Tag,
} from 'lucide-react';
import { Product, Supplier } from '../../../types';
import { SupplierAnalyticsItem, SourcingLocationSummary, OWN_STOCK_SUPPLIER_ID } from './types';

interface SupplierDeepDiveViewProps {
  analyticsItem: SupplierAnalyticsItem;
  onBack: () => void;
  onEditProduct?: (product: Product) => void;
  onAddProductForSupplier?: (supplier: Supplier) => void;
  onOpenEditSupplier?: (supplier: Supplier) => void;
  onOpenAddSourcingModal?: () => void;
  onOpenEditSourcingModal?: (location: SourcingLocationSummary) => void;
  onDeleteSourcingLocation?: (locationId: string) => void;
}

export const SupplierDeepDiveView: React.FC<SupplierDeepDiveViewProps> = ({
  analyticsItem,
  onBack,
  onEditProduct,
  onAddProductForSupplier,
  onOpenEditSupplier,
  onOpenAddSourcingModal,
  onOpenEditSourcingModal,
  onDeleteSourcingLocation,
}) => {
  const [subTab, setSubTab] = useState<'products' | 'sourcing' | 'orders'>('products');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isOwn = analyticsItem.isOwnStock;
  const supplier = analyticsItem.supplier;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/[^0-9+]/g, '');
  };

  const getWhatsAppLink = (phone?: string) => {
    if (!phone) return '';
    const digits = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${digits}`;
  };

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Overview Dashboard</span>
        </button>

        {!isOwn && onOpenEditSupplier && (
          <button
            onClick={() => onOpenEditSupplier(supplier)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-indigo-700 hover:bg-indigo-50/60 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Supplier Profile</span>
          </button>
        )}
      </div>

      {/* Header Banner */}
      <div
        className={`rounded-2xl p-6 border shadow-xs ${
          isOwn
            ? 'bg-linear-to-r from-white via-emerald-50/30 to-emerald-100/20 border-emerald-200'
            : 'bg-linear-to-r from-white via-indigo-50/20 to-slate-50 border-slate-200/80'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                isOwn ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
              }`}
            >
              {isOwn ? <Package className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900">{supplier.name}</h2>
                {isOwn ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    On Stock • In-House Inventory
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                    Dropshipping Partner
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                {supplier.notes ||
                  (isOwn
                    ? 'Direct physical stock sourced from local markets and vendors.'
                    : 'Wholesale dropshipping partner providing fulfilled items on demand.')}
              </p>

              {/* Contact Chips for Suppliers */}
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                {supplier.whatsapp && (
                  <a
                    href={getWhatsAppLink(supplier.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>WhatsApp: {supplier.whatsapp}</span>
                  </a>
                )}
                {(supplier.managerPhone || supplier.personalPhone) && (
                  <a
                    href={`tel:${getCleanPhone(supplier.managerPhone || supplier.personalPhone)}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call: {supplier.managerPhone || supplier.personalPhone}</span>
                  </a>
                )}
                {supplier.websiteUrl && (
                  <a
                    href={supplier.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                  >
                    <Globe className="w-3 h-3" />
                    <span>Website</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white border border-slate-200 text-center min-w-[110px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Cost Price</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                ৳{analyticsItem.totalCost.toLocaleString('en-BD')}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 text-center min-w-[110px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Final Sales</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                ৳{analyticsItem.totalRevenue.toLocaleString('en-BD')}
              </div>
            </div>
            <div
              className={`p-3 rounded-xl border text-center min-w-[120px] ${
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
                className={`text-sm font-black mt-0.5 ${
                  isOwn ? 'text-emerald-800' : 'text-indigo-900'
                }`}
              >
                +৳{analyticsItem.totalProfit.toLocaleString('en-BD')}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200 text-center min-w-[100px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Profit Margin</div>
              <div className="text-sm font-black text-emerald-700 mt-0.5">
                +{analyticsItem.profitMargin}%
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-200/80">
          <button
            onClick={() => setSubTab('products')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              subTab === 'products'
                ? isOwn
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Sold Products Breakdown ({analyticsItem.products.length})
          </button>

          {isOwn && (
            <button
              onClick={() => setSubTab('sourcing')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                subTab === 'sourcing'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Sourcing Locations & Contacts ({analyticsItem.sourcingLocations?.length || 0})</span>
            </button>
          )}

          <button
            onClick={() => setSubTab('orders')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
              subTab === 'orders'
                ? isOwn
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Orders & Transactions ({analyticsItem.orderEvents.length})
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Sold Products Table */}
      {subTab === 'products' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Products Sold for {supplier.name} ({analyticsItem.products.length})
              </h3>
              <p className="text-xs text-slate-500">
                Item wholesale purchase cost, final customer selling price, and net earnings per unit
              </p>
            </div>

            {onAddProductForSupplier && (
              <button
                onClick={() => onAddProductForSupplier(supplier)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer ${
                  isOwn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isOwn ? 'Add New Own Stock Product' : `Add Product for ${supplier.name}`}</span>
              </button>
            )}
          </div>

          {analyticsItem.products.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-200">
              <Boxes className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-700">No sold products recorded</h4>
              <p className="text-[11px] text-slate-400 mt-1">Products will appear here as orders are placed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Product</th>
                    {isOwn && <th className="py-3 px-3">Sourcing Address & Contact</th>}
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
                  {analyticsItem.products.map((entry) => (
                    <tr key={entry.product.id} className="hover:bg-slate-50/60 transition-colors">
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

                      {/* Sourcing Address & Vendor Phone (For Own Stock) */}
                      {isOwn && (
                        <td className="py-3 px-3 min-w-[220px]">
                          <div className="space-y-1">
                            <div className="flex items-start gap-1 text-[11px] font-semibold text-slate-800">
                              <MapPin className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">
                                {entry.sourcingAddress || 'Dhaka Local Wholesale Market'}
                              </span>
                            </div>
                            {entry.sourcingPhone && (
                              <div className="flex items-center gap-2 text-[10px]">
                                <a
                                  href={`tel:${entry.sourcingPhone}`}
                                  className="text-emerald-700 font-bold font-mono hover:underline inline-flex items-center gap-1"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{entry.sourcingPhone}</span>
                                </a>
                                <button
                                  onClick={() => handleCopy(entry.sourcingPhone!, `phone-${entry.product.id}`)}
                                  className="text-slate-400 hover:text-slate-600 p-0.5"
                                  title="Copy phone"
                                >
                                  {copiedKey === `phone-${entry.product.id}` ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              </div>
                            )}
                            {entry.sourcingVendorName && (
                              <div className="text-[10px] text-slate-500">
                                Vendor: <span className="font-medium text-slate-700">{entry.sourcingVendorName}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      )}

                      <td className="py-3 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                        ৳{entry.costPrice.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                        ৳{entry.sellingPrice.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700 whitespace-nowrap">
                        +৳{entry.profitPerUnit.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap font-bold text-slate-800">
                        {entry.unitsSold} pcs
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                        ৳{entry.totalCost.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                        ৳{entry.totalRevenue.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700 whitespace-nowrap">
                        +৳{entry.totalProfit.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {onEditProduct && (
                          <button
                            onClick={() => onEditProduct(entry.product)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 2: Sourcing Locations & Contacts Directory (Own Stock) */}
      {subTab === 'sourcing' && isOwn && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Registered Sourcing Locations & Wholesalers
                </h3>
                <p className="text-xs text-slate-500">
                  Physical wholesale markets, vendor shops, and sourcing addresses for in-house inventory
                </p>
              </div>

              {onOpenAddSourcingModal && (
                <button
                  onClick={onOpenAddSourcingModal}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New Wholesaler</span>
                </button>
              )}
            </div>

            {(!analyticsItem.sourcingLocations || analyticsItem.sourcingLocations.length === 0) ? (
              <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-200 mt-4 space-y-3">
                <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <h4 className="text-xs font-bold text-slate-700">No sourcing locations registered yet</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Click 'Register New Wholesaler' above to add wholesale market shops, vendors, and contact numbers.
                </p>
                {onOpenAddSourcingModal && (
                  <button
                    onClick={onOpenAddSourcingModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-2xs hover:bg-emerald-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Wholesaler</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {analyticsItem.sourcingLocations.map((loc, idx) => (
                  <div
                    key={loc.id || `loc-${idx}`}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-black text-slate-900 leading-snug">
                              {loc.vendorName && loc.vendorName !== 'Direct Wholesaler'
                                ? loc.vendorName
                                : loc.address}
                            </h4>
                            {loc.marketName && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                {loc.marketName}
                              </span>
                            )}
                          </div>

                          {loc.vendorName && loc.vendorName !== 'Direct Wholesaler' && (
                            <p className="text-[11px] text-slate-600 font-medium mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{loc.address}</span>
                            </p>
                          )}

                          {loc.contactPerson && (
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>Contact: {loc.contactPerson}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                          {loc.productCount} Products Sourced
                        </span>

                        <div className="flex items-center gap-1 mt-1">
                          {onOpenEditSourcingModal && (
                            <button
                              onClick={() => onOpenEditSourcingModal(loc)}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-[11px] font-bold shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Edit wholesaler details"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span className="text-[10px]">Edit</span>
                            </button>
                          )}
                          {onDeleteSourcingLocation && loc.id && (
                            <button
                              onClick={() => onDeleteSourcingLocation(loc.id!)}
                              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-2xs cursor-pointer"
                              title="Remove sourcing location"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact Phone & WhatsApp Bar */}
                    {loc.phone && loc.phone !== 'N/A' && (
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs font-mono font-bold text-slate-900">{loc.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${getCleanPhone(loc.phone)}`}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
                          >
                            Call
                          </a>
                          <a
                            href={getWhatsAppLink(loc.secondaryPhone || loc.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                          <button
                            onClick={() => handleCopy(loc.phone, `loc-phone-${idx}`)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="Copy number"
                          >
                            {copiedKey === `loc-phone-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {loc.productCategories && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-slate-700">Categories:</span>
                        <span className="text-slate-600">{loc.productCategories}</span>
                      </div>
                    )}

                    {loc.memo && (
                      <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                        <span className="font-semibold text-slate-700">Memo: </span>
                        <span>{loc.memo}</span>
                      </div>
                    )}

                    {/* Sourced Products from this location */}
                    {loc.products && loc.products.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Sourced Products ({loc.products.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {loc.products.map((p) => (
                            <span
                              key={p.id}
                              className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-medium"
                            >
                              {p.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 3: Orders Log */}
      {subTab === 'orders' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Orders Containing Products from {supplier.name} ({analyticsItem.orderEvents.length})
            </h3>
            <p className="text-xs text-slate-500">
              Customer details, items fulfilled, wholesale costs, and order profit contribution
            </p>
          </div>

          {analyticsItem.orderEvents.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center border border-dashed border-slate-200">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-700">No orders found</h4>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Order Number</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-4">Items Sourced</th>
                    <th className="py-3 px-3 text-right">Wholesale Cost</th>
                    <th className="py-3 px-3 text-right">Selling Total</th>
                    <th className="py-3 px-3 text-right text-emerald-700 font-black">Our Profit</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analyticsItem.orderEvents.map((evt) => (
                    <tr key={evt.orderId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {evt.orderNumber || evt.orderId}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {new Date(evt.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{evt.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{evt.customerPhone}</div>
                      </td>
                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="space-y-1">
                          {evt.items.map((it, iIdx) => (
                            <div key={iIdx} className="text-[11px] text-slate-700 flex items-center justify-between gap-2">
                              <span className="truncate">{it.name}</span>
                              <span className="font-bold text-slate-900 shrink-0">x{it.qty}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-600 whitespace-nowrap">
                        ৳{evt.orderCost.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                        ৳{evt.orderRevenue.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-700 whitespace-nowrap">
                        +৳{evt.orderProfit.toLocaleString('en-BD')}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          {evt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
