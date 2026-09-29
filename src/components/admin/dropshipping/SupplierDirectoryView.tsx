import React, { useState } from 'react';
import {
  Building2,
  Package,
  Plus,
  Search,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Phone,
  Globe,
  MapPin,
  FileText,
  Boxes,
  Edit2,
  Trash2,
  Copy,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { Product, Supplier } from '../../../types';
import {
  OWN_STOCK_SUPPLIER_ID,
  SourcingLocationSummary,
} from './types';

interface SupplierDirectoryViewProps {
  suppliers: Supplier[];
  products: Product[];
  selectedSupplierId: string | null;
  setSelectedSupplierId: (id: string | null) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (supplier: Supplier, e?: React.MouseEvent) => void;
  onRequestDelete: (supplier: Supplier, e?: React.MouseEvent) => void;
  onEditProduct?: (product: Product) => void;
  onAddProductForSupplier?: (supplier: Supplier) => void;
  sourcingLocations: SourcingLocationSummary[];
  onOpenAddSourcingModal?: () => void;
  onOpenEditSourcingModal?: (location: SourcingLocationSummary) => void;
  onDeleteSourcingLocation?: (locationId: string) => void;
}

export const SupplierDirectoryView: React.FC<SupplierDirectoryViewProps> = ({
  suppliers,
  products,
  selectedSupplierId,
  setSelectedSupplierId,
  onOpenAddModal,
  onOpenEditModal,
  onRequestDelete,
  onEditProduct,
  onAddProductForSupplier,
  sourcingLocations,
  onOpenAddSourcingModal,
  onOpenEditSourcingModal,
  onDeleteSourcingLocation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
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

  const ownProducts = products.filter((p) => p.productType === 'own');
  const ownStockSupplier: Supplier = {
    id: OWN_STOCK_SUPPLIER_ID,
    name: 'Own Stock (In-House Inventory)',
    notes: 'Direct physical inventory sourced from local wholesale markets and vendors.',
    status: 'active',
    address: sourcingLocations[0]?.address || 'In-House Warehouse, Dhaka',
    personalPhone: sourcingLocations[0]?.phone !== 'N/A' ? sourcingLocations[0]?.phone : undefined,
    managerPhone: sourcingLocations[1]?.phone !== 'N/A' ? sourcingLocations[1]?.phone : undefined,
  };

  // Map products count per supplier
  const supplierProductMap = new Map<string, Product[]>();
  suppliers.forEach((s) => supplierProductMap.set(s.id, []));
  products.forEach((p) => {
    if (p.productType !== 'own' && p.supplierId && supplierProductMap.has(p.supplierId)) {
      supplierProductMap.get(p.supplierId)!.push(p);
    }
  });

  const activeSupplier =
    selectedSupplierId === OWN_STOCK_SUPPLIER_ID
      ? ownStockSupplier
      : suppliers.find((s) => s.id === selectedSupplierId);

  const activeSupplierProducts =
    selectedSupplierId === OWN_STOCK_SUPPLIER_ID
      ? ownProducts
      : activeSupplier
      ? supplierProductMap.get(activeSupplier.id) || []
      : [];

  const filteredSuppliers = suppliers.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q)) ||
      (s.whatsapp && s.whatsapp.includes(q)) ||
      (s.managerPhone && s.managerPhone.includes(q)) ||
      (s.websiteUrl && s.websiteUrl.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* If a supplier is selected: render deep profile */}
      {activeSupplier ? (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedSupplierId(null)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Suppliers Directory</span>
          </button>

          {/* Supplier Header Banner */}
          <div
            className={`rounded-2xl p-6 border shadow-xs ${
              activeSupplier.id === OWN_STOCK_SUPPLIER_ID
                ? 'bg-gradient-to-r from-white via-emerald-50/40 to-emerald-100/20 dark:from-slate-900 dark:via-emerald-950/40 dark:to-slate-900 border-emerald-200 dark:border-emerald-800'
                : 'bg-gradient-to-r from-white via-slate-50 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    activeSupplier.id === OWN_STOCK_SUPPLIER_ID
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {activeSupplier.id === OWN_STOCK_SUPPLIER_ID ? (
                    <Package className="w-7 h-7" />
                  ) : (
                    <Building2 className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">{activeSupplier.name}</h2>
                    {activeSupplier.id === OWN_STOCK_SUPPLIER_ID ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-black uppercase flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        On Stock • In-House Inventory
                      </span>
                    ) : (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          activeSupplier.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {activeSupplier.status === 'active' ? 'Active Partner' : 'Inactive'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                    {activeSupplier.notes ||
                      (activeSupplier.id === OWN_STOCK_SUPPLIER_ID
                        ? 'Direct in-house inventory sourced from local wholesale markets & vendors.'
                        : 'Wholesale partner providing fulfilled dropshipping items.')}
                  </p>
                </div>
              </div>

              {activeSupplier.id !== OWN_STOCK_SUPPLIER_ID && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => onOpenEditModal(activeSupplier, e)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={(e) => onRequestDelete(activeSupplier, e)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Contact info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800">
              {/* WhatsApp / Sourcing Phone */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {activeSupplier.id === OWN_STOCK_SUPPLIER_ID ? 'Primary Vendor Phone' : 'WhatsApp'}
                  </span>
                </div>
                <div className="mt-2">
                  {activeSupplier.whatsapp || activeSupplier.personalPhone ? (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                        {activeSupplier.whatsapp || activeSupplier.personalPhone}
                      </div>
                      <a
                        href={
                          activeSupplier.whatsapp
                            ? getWhatsAppLink(activeSupplier.whatsapp)
                            : `tel:${getCleanPhone(activeSupplier.personalPhone)}`
                        }
                        target={activeSupplier.whatsapp ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold"
                      >
                        {activeSupplier.whatsapp ? 'Open WhatsApp' : 'Direct Call'}
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Not specified</span>
                  )}
                </div>
              </div>

              {/* Manager Phone */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    {activeSupplier.id === OWN_STOCK_SUPPLIER_ID ? 'Secondary Contact' : 'Manager Phone'}
                  </span>
                </div>
                <div className="mt-2">
                  {activeSupplier.managerPhone || activeSupplier.ceoPhone ? (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                        {activeSupplier.managerPhone || activeSupplier.ceoPhone}
                      </div>
                      <a
                        href={`tel:${getCleanPhone(activeSupplier.managerPhone || activeSupplier.ceoPhone)}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold"
                      >
                        Direct Call
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Not specified</span>
                  )}
                </div>
              </div>

              {/* Website or Portal */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    Website / Portal
                  </span>
                </div>
                <div className="mt-2">
                  {activeSupplier.websiteUrl ? (
                    <a
                      href={activeSupplier.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{activeSupplier.websiteUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      {activeSupplier.id === OWN_STOCK_SUPPLIER_ID ? 'In-House Inventory' : 'No website'}
                    </span>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Office / Warehouse
                  </span>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                    {activeSupplier.address || 'Address not registered'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sourcing Locations Grid for Own Stock */}
          {activeSupplier.id === OWN_STOCK_SUPPLIER_ID && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Recorded Sourcing Locations & Wholesalers ({sourcingLocations.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Wholesale markets, shop addresses, and vendor contact numbers registered for in-house products
                  </p>
                </div>

                {onOpenAddSourcingModal && (
                  <button
                    onClick={onOpenAddSourcingModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register New Wholesaler</span>
                  </button>
                )}
              </div>

              {sourcingLocations.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 text-center border border-dashed border-slate-200 dark:border-slate-700 mt-2">
                  <MapPin className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No sourcing locations registered yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click 'Register New Wholesaler' above to add suppliers & shop contacts.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {sourcingLocations.map((loc, idx) => (
                    <div key={loc.id || idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-2 relative group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {loc.vendorName && loc.vendorName !== 'Direct Wholesaler' ? loc.vendorName : loc.address}
                              </span>
                              {loc.marketName && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold">
                                  {loc.marketName}
                                </span>
                              )}
                            </div>
                            {loc.vendorName && loc.vendorName !== 'Direct Wholesaler' && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">{loc.address}</div>
                            )}
                            {loc.contactPerson && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Contact: {loc.contactPerson}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-bold shrink-0">
                            {loc.productCount} Products
                          </span>
                          <div className="flex items-center gap-1">
                            {onOpenEditSourcingModal && (
                              <button
                                onClick={() => onOpenEditSourcingModal(loc)}
                                className="p-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-0.5"
                                title="Edit Wholesaler"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                                <span>Edit</span>
                              </button>
                            )}
                            {onDeleteSourcingLocation && loc.id && (
                              <button
                                onClick={() => onDeleteSourcingLocation(loc.id!)}
                                className="p-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Wholesaler"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {loc.phone && loc.phone !== 'N/A' && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700 flex-wrap gap-1">
                          <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px] flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            {loc.phone}
                          </span>
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${getCleanPhone(loc.phone)}`}
                              className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 shadow-2xs"
                            >
                              Call
                            </a>
                            <a
                              href={getWhatsAppLink(loc.secondaryPhone || loc.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold hover:bg-emerald-100"
                            >
                              WhatsApp
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Linked Products Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Products for {activeSupplier.name} ({activeSupplierProducts.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Wholesale cost, customer retail price, profit markup, and current warehouse stock
                </p>
              </div>

              {onAddProductForSupplier && (
                <button
                  onClick={() => onAddProductForSupplier(activeSupplier)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer ${
                    activeSupplier.id === OWN_STOCK_SUPPLIER_ID
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {activeSupplier.id === OWN_STOCK_SUPPLIER_ID
                      ? 'Add New Own Stock Product'
                      : `Add Product for ${activeSupplier.name}`}
                  </span>
                </button>
              )}
            </div>

            {activeSupplierProducts.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-700">
                <Boxes className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">No products mapped yet</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Add products linked to this source using the button above or from the Products management tab.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Product</th>
                      {activeSupplier.id === OWN_STOCK_SUPPLIER_ID && (
                        <th className="py-3 px-3">Sourcing Address & Phone</th>
                      )}
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3 text-right">Selling Price</th>
                      <th className="py-3 px-3 text-right">Wholesale Cost</th>
                      <th className="py-3 px-3 text-center">Profit Markup</th>
                      <th className="py-3 px-3 text-center">Stock</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeSupplierProducts.map((product) => {
                      const cost = product.costPrice || 0;
                      const sell = product.price || 0;
                      const profit = sell - cost;
                      const marginPercent =
                        sell > 0 && cost > 0 ? Math.round((profit / sell) * 100) : null;

                      return (
                        <tr key={product.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5 min-w-[200px]">
                              <img
                                src={
                                  product.images && product.images[0]
                                    ? product.images[0]
                                    : '/placeholder.png'
                                }
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800"
                                onError={(e) => {
                                  (e.target as HTMLElement).setAttribute('src', '/placeholder.png');
                                }}
                              />
                              <div className="truncate">
                                <div className="font-bold text-slate-900 dark:text-white truncate" title={product.name}>
                                  {product.name}
                                </div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                  SKU: {product.sku || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {activeSupplier.id === OWN_STOCK_SUPPLIER_ID && (
                            <td className="py-2.5 px-3 min-w-[200px]">
                              <div className="space-y-0.5">
                                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                                  {product.sourcingAddress || 'Local Wholesale Market'}
                                </div>
                                {product.sourcingPhone && (
                                  <a
                                    href={`tel:${product.sourcingPhone}`}
                                    className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold hover:underline inline-flex items-center gap-1"
                                  >
                                    <Phone className="w-2.5 h-2.5" />
                                    <span>{product.sourcingPhone}</span>
                                  </a>
                                )}
                              </div>
                            </td>
                          )}

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                              {product.category || 'General'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                            ৳{product.price?.toLocaleString()}
                          </td>

                          <td className="py-2.5 px-3 text-right font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {cost > 0 ? `৳${cost.toLocaleString()}` : <span className="text-slate-400">N/A</span>}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {marginPercent !== null ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                +{marginPercent}% (৳{profit})
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {product.stockStatus === 'out_of_stock' || product.stock === 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold">
                                Out of Stock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                                In Stock ({product.stock})
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {onEditProduct && (
                              <button
                                onClick={() => onEditProduct(product)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                            )}
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
      ) : (
        /* Directory Cards Grid (Shopbase and On Stock side-by-side!) */
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search suppliers by name, phone, website, or address..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({suppliers.length + 1})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    statusFilter === 'inactive'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Inactive
                </button>
              </div>

              <button
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Supplier</span>
              </button>
            </div>
          </div>

          {/* Directory Cards Grid: Own Stock and Shopbase right beside each other! */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* OWN STOCK (IN-HOUSE INVENTORY) CARD */}
            <div
              onClick={() => setSelectedSupplierId(OWN_STOCK_SUPPLIER_ID)}
              className="group bg-gradient-to-b from-white to-emerald-50/20 dark:from-slate-900 dark:to-emerald-950/20 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        Own Stock (In-House)
                      </h4>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-black uppercase tracking-wide mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        On Stock
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold shrink-0">
                    {ownProducts.length} Items In Stock
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">
                  Direct physical stock sourced from local wholesale markets & vendors.
                </p>

                {/* Sourcing details overview */}
                <div className="mt-4 pt-3 border-t border-emerald-100/80 dark:border-emerald-900/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Sourcing Locations:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-[11px]">
                      {sourcingLocations.length} Registered
                    </span>
                  </div>

                  {sourcingLocations[0] && (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Vendor Contact:
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                        {sourcingLocations[0].phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-800 dark:group-hover:text-emerald-300">
                <span>View Sourcing Details & Products</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* DROPSHIPPING SUPPLIER CARDS */}
            {filteredSuppliers.map((supplier) => {
              const count = (supplierProductMap.get(supplier.id) || []).length;

              return (
                <div
                  key={supplier.id}
                  onClick={() => setSelectedSupplierId(supplier.id)}
                  className="group bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {supplier.name}
                          </h4>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                              supplier.status === 'active'
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {supplier.status === 'active' ? 'Active Partner' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold shrink-0">
                        {count} Products
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">
                      {supplier.notes || 'Wholesale supplier registered for dropshipping fulfillment.'}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      {supplier.whatsapp && (
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            WhatsApp:
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px] truncate max-w-[170px]">
                            {supplier.whatsapp}
                          </span>
                        </div>
                      )}

                      {(supplier.managerPhone || supplier.ceoPhone) && (
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            Manager / CEO:
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px] truncate max-w-[170px]">
                            {supplier.managerPhone || supplier.ceoPhone}
                          </span>
                        </div>
                      )}

                      {supplier.websiteUrl && (
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            Website:
                          </span>
                          <a
                            href={supplier.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[170px] flex items-center gap-1"
                          >
                            <span className="truncate">{supplier.websiteUrl.replace(/^https?:\/\//, '')}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        </div>
                      )}

                      {supplier.address && (
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-1">
                          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            Location:
                          </span>
                          <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                            {supplier.address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => onOpenEditModal(supplier, e)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/80 hover:text-indigo-700 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Edit Supplier Profile"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => onRequestDelete(supplier, e)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/80 transition-colors cursor-pointer"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                      <span>Details</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
