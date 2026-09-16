import React, { useState } from 'react';
import {
  Store,
  Plus,
  Search,
  MapPin,
  Phone,
  MessageCircle,
  Edit2,
  Trash2,
  Package,
  Boxes,
  Copy,
  Check,
  User,
  Tag,
  Building2,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { SourcingLocationSummary } from './types';
import { Product } from '../../../types';

interface WholesalerRegisterViewProps {
  sourcingLocations: SourcingLocationSummary[];
  onOpenAddModal: () => void;
  onOpenEditModal: (location: SourcingLocationSummary) => void;
  onDeleteLocation: (locationId: string) => void;
  onEditProduct?: (product: Product) => void;
}

export const WholesalerRegisterView: React.FC<WholesalerRegisterViewProps> = ({
  sourcingLocations,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteLocation,
  onEditProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  // Extract unique markets
  const markets = Array.from(
    new Set(
      sourcingLocations
        .map((loc) => loc.marketName?.trim())
        .filter((m): m is string => Boolean(m && m.length > 0))
    )
  );

  // Filtered locations
  const filtered = sourcingLocations.filter((loc) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      loc.vendorName.toLowerCase().includes(term) ||
      loc.address.toLowerCase().includes(term) ||
      loc.phone.includes(term) ||
      (loc.contactPerson && loc.contactPerson.toLowerCase().includes(term)) ||
      (loc.marketName && loc.marketName.toLowerCase().includes(term)) ||
      (loc.productCategories && loc.productCategories.toLowerCase().includes(term));

    const matchesMarket =
      selectedMarket === 'all' ||
      (loc.marketName && loc.marketName.toLowerCase() === selectedMarket.toLowerCase());

    return matchesSearch && matchesMarket;
  });

  const totalProductsSourced = sourcingLocations.reduce((acc, curr) => acc + curr.productCount, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Store className="w-3.5 h-3.5" />
              <span>Wholesalers & Sourcing Registry</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Wholesalers & Sourcing Register
            </h2>
            <p className="text-sm text-emerald-100/80 leading-relaxed">
              Register and manage physical wholesale shops, vendor contacts, and market locations where you source your in-house inventory.
            </p>
          </div>

          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-950/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Register New Wholesaler</span>
          </button>
        </div>

        {/* Quick Stats Grid inside banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-medium text-emerald-200/70 uppercase tracking-wider block">
              Total Wholesalers
            </span>
            <span className="text-xl sm:text-2xl font-black mt-1 block">
              {sourcingLocations.length}
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10">
            <span className="text-[11px] font-medium text-emerald-200/70 uppercase tracking-wider block">
              Sourced Products
            </span>
            <span className="text-xl sm:text-2xl font-black mt-1 block text-emerald-300">
              {totalProductsSourced}
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-medium text-emerald-200/70 uppercase tracking-wider block">
              Wholesale Markets
            </span>
            <span className="text-xl sm:text-2xl font-black mt-1 block text-teal-300">
              {markets.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search wholesaler, market, phone, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>

        {/* Market Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedMarket('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedMarket === 'all'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Markets ({sourcingLocations.length})
          </button>
          {markets.map((m) => {
            const count = sourcingLocations.filter(
              (l) => l.marketName?.toLowerCase() === m.toLowerCase()
            ).length;
            return (
              <button
                key={m}
                onClick={() => setSelectedMarket(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedMarket.toLowerCase() === m.toLowerCase()
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {m} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Wholesaler Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Store className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">
              {searchTerm || selectedMarket !== 'all'
                ? 'No matching wholesalers found'
                : 'No wholesalers registered yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchTerm || selectedMarket !== 'all'
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Register your wholesale vendors, market shop numbers, and contact persons to organize in-house sourcing.'}
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register First Wholesaler</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((loc, idx) => (
            <div
              key={loc.id || `loc-${idx}`}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                {/* Header with Title and Market */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                        {loc.vendorName && loc.vendorName !== 'Direct Wholesaler'
                          ? loc.vendorName
                          : loc.address}
                      </h4>
                      {loc.marketName && (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 mt-1">
                          {loc.marketName}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black shrink-0">
                    {loc.productCount} Sourced
                  </span>
                </div>

                {/* Info Fields */}
                <div className="space-y-2 pt-1 text-xs">
                  {loc.vendorName && loc.vendorName !== 'Direct Wholesaler' && (
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{loc.address}</span>
                    </div>
                  )}

                  {loc.contactPerson && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Contact: <strong className="text-slate-800">{loc.contactPerson}</strong></span>
                    </div>
                  )}

                  {loc.productCategories && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Categories: <span className="text-slate-700 font-medium">{loc.productCategories}</span></span>
                    </div>
                  )}
                </div>

                {/* Phone & WhatsApp box */}
                {loc.phone && loc.phone !== 'N/A' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-mono font-bold text-xs text-slate-900">{loc.phone}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(loc.phone, `wholesaler-phone-${idx}`)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                        title="Copy number"
                      >
                        {copiedKey === `wholesaler-phone-${idx}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                      <a
                        href={`tel:${getCleanPhone(loc.phone)}`}
                        className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold text-center transition-colors shadow-2xs"
                      >
                        Call
                      </a>
                      <a
                        href={getWhatsAppLink(loc.secondaryPhone || loc.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold text-center transition-colors inline-flex items-center justify-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                )}

                {loc.memo && (
                  <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 text-[11px] text-amber-900">
                    <span className="font-bold">Memo: </span>
                    <span>{loc.memo}</span>
                  </div>
                )}

                {/* Sourced Products Preview */}
                {loc.products && loc.products.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Sourced Items ({loc.products.length}):
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {loc.products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onEditProduct && onEditProduct(p)}
                          className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                          title="Click to view/edit product"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenEditModal(loc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  {loc.id && (
                    <button
                      type="button"
                      onClick={() => onDeleteLocation(loc.id!)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Wholesaler"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <span className="text-[10px] font-semibold text-slate-400">
                  {loc.id ? 'Registered' : 'Product Sourced'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
