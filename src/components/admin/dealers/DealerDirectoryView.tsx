import React, { useState } from 'react';
import {
  Users,
  Building2,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Archive,
  RotateCcw,
  Printer,
  Phone,
  MapPin,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import type { Dealer, DealerStatus, DealerCategory } from '../../../types/dealer';
import { calculateDealerBalance, generateDealerStatementHtml } from '../../../lib/dealerStorage';

import { useLanguage } from '../../../context/LanguageContext';

interface DealerDirectoryViewProps {
  dealers: Dealer[];
  onOpenAddDealer: () => void;
  onEditDealer: (dealer: Dealer) => void;
  onViewProfile: (dealerId: string) => void;
  onArchiveDealer: (dealerId: string) => void;
  onUnarchiveDealer: (dealerId: string) => void;
}

export const DealerDirectoryView: React.FC<DealerDirectoryViewProps> = ({
  dealers,
  onOpenAddDealer,
  onEditDealer,
  onViewProfile,
  onArchiveDealer,
  onUnarchiveDealer,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DealerStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DealerCategory>('all');

  const filteredDealers = dealers.filter((d) => {
    // Status
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    // Category
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = d.name?.toLowerCase().includes(q);
      const matchShop = d.shopName?.toLowerCase().includes(q);
      const matchPhone = d.primaryPhone?.includes(q) || d.alternativePhone?.includes(q);
      const matchId = d.id?.toLowerCase().includes(q);
      const matchDist = d.district?.toLowerCase().includes(q) || d.businessAddress?.toLowerCase().includes(q);
      return matchName || matchShop || matchPhone || matchId || matchDist;
    }
    return true;
  });

  const handlePrintStatement = (dealer: Dealer, e: React.MouseEvent) => {
    e.stopPropagation();
    const html = generateDealerStatementHtml(dealer);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. Header & Controls */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" />
            <span>{isBn ? `ডিলার ডিরেক্টরি (${dealers.length} টি নিবন্ধিত)` : `Dealer Directory (${dealers.length} Registered)`}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isBn
              ? 'আপনার অভ্যন্তরীণ পাইকারি ডিলার, ইম্পোর্টার এবং সাপ্লাই ভেন্ডরদের বিবরণ তথ্য'
              : 'Manage your internal wholesale suppliers, import partners & corporate vendors'}
          </p>
        </div>

        <button
          onClick={onOpenAddDealer}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isBn ? 'নতুন ডিলার যোগ করুন' : 'Add New Dealer'}</span>
        </button>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isBn ? 'প্রতিষ্ঠানের নাম, যোগাযোগের ব্যক্তি, ফোন, আইডি দিয়ে খুঁজুন...' : 'Search by business name, contact person, mobile number, ID or district...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold"
          >
            <option value="all">{isBn ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
            <option value="active">{isBn ? 'শুধু সক্রিয়' : 'Active Only'}</option>
            <option value="inactive">{isBn ? 'নিষ্ক্রিয়' : 'Inactive'}</option>
            <option value="archived">{isBn ? 'আর্কাইভকৃত' : 'Archived'}</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold"
          >
            <option value="all">{isBn ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
            <option value="VIP">VIP</option>
            <option value="Priority">Priority</option>
            <option value="Wholesale">Wholesale</option>
            <option value="General">General</option>
            <option value="New">New</option>
          </select>
        </div>
      </div>

      {/* 3. Dealer Directory Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {filteredDealers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
              {isBn ? 'কোনো ডিলার পাওয়া যায়নি' : 'No dealers found'}
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? (isBn ? 'অনুগ্রহ করে ফিল্টার পরিবর্তন করুন।' : 'Try clearing your search query or filters.') : (isBn ? 'আপনার প্রথম ডিলার যোগ করুন।' : 'Add your first wholesale dealer to start recording purchases.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">{isBn ? 'ডিলার / প্রতিষ্ঠান' : 'Dealer / Business'}</th>
                  <th className="py-3 px-4">{isBn ? 'যোগাযোগ' : 'Contact'}</th>
                  <th className="py-3 px-4">{isBn ? 'টাইপ ও পেমেন্ট শর্ত' : 'Type & Terms'}</th>
                  <th className="py-3 px-4 text-right">{isBn ? 'মোট পারচেজ' : 'Total Purchases'}</th>
                  <th className="py-3 px-4 text-right">{isBn ? 'মোট দেওনা / বকেয়া' : 'Net Payable / Due'}</th>
                  <th className="py-3 px-4 text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="py-3 px-4 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDealers.map((dealer) => {
                  const bal = calculateDealerBalance(dealer.id);

                  return (
                    <tr
                      key={dealer.id}
                      onClick={() => onViewProfile(dealer.id)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
                            {dealer.shopName?.charAt(0) || 'D'}
                          </span>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white line-clamp-1 flex items-center gap-1.5">
                              <span>{dealer.shopName || dealer.name}</span>
                              {dealer.category === 'VIP' && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500/20 text-amber-600 border border-amber-500/30">
                                  VIP
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1">
                              <span className="font-mono text-slate-400">ID: {dealer.id}</span>
                              <span>&bull;</span>
                              <span>{dealer.name}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{dealer.primaryPhone}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 line-clamp-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{dealer.businessAddress || dealer.district || 'Dhaka'}</span>
                        </div>
                      </td>

                      {/* Type & Terms */}
                      <td className="py-3.5 px-4">
                        <div className="capitalize font-bold text-slate-800 dark:text-slate-200">
                          {dealer.businessType.replace('_', ' ')}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          {dealer.paymentTerms.replace('_', ' ')}
                        </div>
                      </td>

                      {/* Total Purchases */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                        ৳{bal.totalPurchases.toLocaleString('en-IN')}
                      </td>

                      {/* Net Payable / Due */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold">
                        {bal.netOutstandingPayable > 0 ? (
                          <div className="text-rose-600 dark:text-rose-400">
                            ৳{bal.netOutstandingPayable.toLocaleString('en-IN')}
                            <div className="text-[9px] text-rose-500 font-sans font-bold">
                              Payable (দেনা)
                            </div>
                          </div>
                        ) : bal.netOutstandingReceivable > 0 ? (
                          <div className="text-sky-600 dark:text-sky-400">
                            ৳{bal.netOutstandingReceivable.toLocaleString('en-IN')}
                            <div className="text-[9px] text-sky-500 font-sans font-bold">
                              Receivable (পাওনা)
                            </div>
                          </div>
                        ) : (
                          <span className="text-emerald-600 text-xs">Settled (পরিশোধিত)</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            dealer.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : dealer.status === 'archived'
                              ? 'bg-slate-500/10 text-slate-500'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          {dealer.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            title="Print Ledger Statement"
                            onClick={(e) => handlePrintStatement(dealer, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Edit Dealer"
                            onClick={() => onEditDealer(dealer)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {dealer.status === 'archived' ? (
                            <button
                              title="Restore Dealer"
                              onClick={() => onUnarchiveDealer(dealer.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              title="Archive Dealer"
                              onClick={() => onArchiveDealer(dealer.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            title="View Full Profile"
                            onClick={() => onViewProfile(dealer.id)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
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
