import React, { useState } from 'react';
import {
  Users,
  Building2,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Clock,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle,
  Eye,
  Plus,
  RefreshCw,
} from 'lucide-react';
import type {
  Dealer,
  DealerTransaction,
  DealerPayment,
  DealerDocument,
  DealerOverviewStats,
} from '../../../types/dealer';
import { calculateDealerBalance } from '../../../lib/dealerStorage';

import { useLanguage } from '../../../context/LanguageContext';

interface DealerDashboardViewProps {
  stats: DealerOverviewStats;
  dealers: Dealer[];
  transactions: DealerTransaction[];
  payments: DealerPayment[];
  documents: DealerDocument[];
  onOpenNewTransaction: () => void;
  onOpenNewPayment: () => void;
  onOpenNewDocument: () => void;
  onViewDealerProfile: (dealerId: string) => void;
  onViewTransaction: (txnId: string) => void;
  onPreviewDocument: (doc: DealerDocument) => void;
}

export const DealerDashboardView: React.FC<DealerDashboardViewProps> = ({
  stats,
  dealers,
  transactions,
  payments,
  documents,
  onOpenNewTransaction,
  onOpenNewPayment,
  onOpenNewDocument,
  onViewDealerProfile,
  onViewTransaction,
  onPreviewDocument,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [dateRange, setDateRange] = useState<'30' | '90' | '365' | 'all'>('30');

  // Filtered transactions by date range
  const now = new Date();
  const filteredTxns = transactions.filter((t) => {
    if (dateRange === 'all') return true;
    const diffDays = (now.getTime() - new Date(t.transactionDate).getTime()) / (1000 * 3600 * 24);
    return diffDays <= Number(dateRange);
  });

  // Calculate top dealers by purchase value
  const topDealers = dealers
    .map((d) => {
      const bal = calculateDealerBalance(d.id);
      return {
        dealer: d,
        balance: bal,
      };
    })
    .sort((a, b) => b.balance.totalPurchases - a.balance.totalPurchases)
    .slice(0, 5);

  // Overdue transactions
  const overdueTxns = transactions
    .filter(
      (t) =>
        t.remainingAmount > 0 &&
        t.paymentDueDate &&
        new Date(t.paymentDueDate) < now
    )
    .slice(0, 5);

  // Recent transactions
  const recentTxns = transactions.slice(0, 6);

  // Recent documents
  const recentDocs = documents.slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Quick Action Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 border border-indigo-900/40">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {isBn ? 'গোপনীয় অভ্যন্তরীণ ওয়ার্কস্পেস' : 'Confidential Internal Workspace'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {isBn ? 'লাইভ ব্যালেন্স • কেনাক্স বিডি' : 'Live Balance • KenaX BD'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {isBn ? 'ডিলার ম্যানেজমেন্ট ও অ্যাকাউন্টস লেজার' : 'Dealer Management & Accounts Ledger'}
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            {isBn
              ? 'পাইকারি ডিলার সম্পর্ক, পারচেজ রসিদ, ইনভয়েস ফাইল এবং পেমেন্ট সেটেলমেন্ট রিয়েল-টাইমে ট্র্যাক করুন।'
              : 'Track wholesale dealer relationships, purchases, invoice attachments, and payment settlements in real time.'}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenNewTransaction}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? 'পারচেজ রেকর্ড' : 'Record Purchase'}</span>
          </button>
          <button
            onClick={onOpenNewPayment}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>{isBn ? 'পেমেন্ট রেকর্ড' : 'Record Payment'}</span>
          </button>
          <button
            onClick={onOpenNewDocument}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{isBn ? 'ইনভয়েস আপলোড' : 'Upload Invoice'}</span>
          </button>
        </div>
      </div>

      {/* 2. Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Purchases */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">{isBn ? 'মোট পারচেজ' : 'Total Purchases'}</span>
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            ৳{stats.totalPurchaseValue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>{transactions.length} {isBn ? 'মোট ট্রানজেকশন' : 'total transactions'}</span>
          </div>
        </div>

        {/* Total Paid to Dealers */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">{isBn ? 'মোট পরিশোধিত' : 'Total Paid'}</span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            ৳{stats.totalPaidToDealers.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>{payments.filter((p) => p.verificationStatus !== 'reversed').length} {isBn ? 'টি পেমেন্ট রেকর্ড' : 'recorded payments'}</span>
          </div>
        </div>

        {/* Net Outstanding Payable */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">{isBn ? 'মোট বকেয়া (দেওনা)' : 'Accounts Payable'}</span>
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
            ৳{stats.totalOutstandingPayable.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>৳{stats.overduePayables.toLocaleString('en-IN')} {isBn ? 'ওভারডিউ' : 'overdue'}</span>
          </div>
        </div>

        {/* Registered Active Dealers */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">{isBn ? 'সক্রিয় ডিলার' : 'Active Dealers'}</span>
            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {stats.activeDealers} <span className="text-xs text-slate-400 font-normal">/ {stats.totalDealers}</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>{stats.transactionsThisMonth} {isBn ? 'এই মাসের ট্রানজেকশন' : 'transactions this month'}</span>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Top Dealers & Overdue Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top 5 Dealers by Purchase Volume (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <span>Top Wholesale Dealers by Purchase Volume</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Calculated from all verified transactions and active credit accounts
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">Top 5</span>
          </div>

          {topDealers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No dealer transactions recorded yet. Record your first purchase above.
            </div>
          ) : (
            <div className="space-y-3">
              {topDealers.map(({ dealer, balance }) => (
                <div
                  key={dealer.id}
                  onClick={() => onViewDealerProfile(dealer.id)}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{dealer.shopName || dealer.name}</span>
                      <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {dealer.id}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {dealer.name} &bull; {dealer.district || 'Dhaka'} &bull; Terms: {dealer.paymentTerms.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-xs font-mono text-slate-900 dark:text-white">
                      ৳{balance.totalPurchases.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] font-bold">
                      {balance.netOutstandingPayable > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          Due: ৳{balance.netOutstandingPayable.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">Settled / Clear</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue / Due Soon Invoices Card (1 col) */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Overdue &amp; Pending Dues</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bills requiring payment settlement
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600">
              {overdueTxns.length}
            </span>
          </div>

          {overdueTxns.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 opacity-60" />
              <span className="font-bold text-slate-700 dark:text-slate-300">No overdue balances!</span>
              <p className="text-[11px] text-slate-400">All dealer invoices are settled or within terms.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {overdueTxns.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onViewTransaction(t.id)}
                  className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 hover:bg-rose-100/50 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                      {t.dealerShopName || t.dealerName}
                    </div>
                    <div className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3" />
                      <span>Due: {t.paymentDueDate ? new Date(t.paymentDueDate).toLocaleDateString('en-GB') : 'Immediate'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-black text-xs text-rose-600 dark:text-rose-400">
                      ৳{t.remainingAmount.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">#{t.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Split: Recent Transactions & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Dealer Transactions */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Recent Dealer Transactions
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Latest purchase orders and credit movements
              </p>
            </div>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
              {transactions.length} total
            </span>
          </div>

          {recentTxns.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 text-[10px] font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-2">Txn ID / Date</th>
                    <th className="pb-2">Dealer</th>
                    <th className="pb-2 text-right">Amount (৳)</th>
                    <th className="pb-2 text-right">Due (৳)</th>
                    <th className="pb-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentTxns.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => onViewTransaction(t.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    >
                      <td className="py-2.5">
                        <div className="font-bold text-slate-900 dark:text-white font-mono">{t.id}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(t.transactionDate).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {t.dealerShopName || t.dealerName}
                        </div>
                        <div className="text-[10px] text-slate-400">{t.items.length} items</div>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ৳{t.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold">
                        {t.remainingAmount > 0 ? (
                          <span className="text-rose-600">৳{t.remainingAmount.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-emerald-600">৳0</span>
                        )}
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            t.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : t.status === 'partially_paid'
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}
                        >
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recently Uploaded Documents */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Recently Added Invoices &amp; Bills
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Archived bills and vendor paperwork
              </p>
            </div>
            <button
              onClick={onOpenNewDocument}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
            >
              + Upload
            </button>
          </div>

          {recentDocs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No invoice files uploaded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onPreviewDocument(doc)}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50/40 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                        {doc.title || doc.fileName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {doc.dealerShopName || doc.dealerName} &bull;{' '}
                        {new Date(doc.uploadedAt).toLocaleDateString('en-GB')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {doc.invoiceTotal !== undefined && (
                      <span className="text-xs font-mono font-bold text-emerald-600">
                        ৳{doc.invoiceTotal.toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                      <Eye className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
