import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Wallet,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  Printer,
  Download,
  Calendar,
  Clock,
  Eye,
  Trash2,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import type {
  Dealer,
  DealerTransaction,
  DealerPayment,
  DealerDocument,
  DealerReturnAdjustment,
} from '../../../types/dealer';
import {
  calculateDealerBalance,
  generateDealerStatementHtml,
  exportDealerTransactionsCsv,
} from '../../../lib/dealerStorage';

import { useLanguage } from '../../../context/LanguageContext';

interface DealerProfileViewProps {
  dealer: Dealer;
  transactions: DealerTransaction[];
  payments: DealerPayment[];
  documents: DealerDocument[];
  returns: DealerReturnAdjustment[];
  onBack: () => void;
  onOpenNewTransaction: (dealerId: string) => void;
  onOpenNewPayment: (dealerId: string) => void;
  onOpenNewDocument: (dealerId: string) => void;
  onPreviewDocument: (doc: DealerDocument) => void;
  onReversePayment: (paymentId: string) => void;
}

export const DealerProfileView: React.FC<DealerProfileViewProps> = ({
  dealer,
  transactions,
  payments,
  documents,
  returns,
  onBack,
  onOpenNewTransaction,
  onOpenNewPayment,
  onOpenNewDocument,
  onPreviewDocument,
  onReversePayment,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'documents' | 'payments' | 'reports'>('overview');

  const balance = calculateDealerBalance(dealer.id);

  const handlePrintStatement = () => {
    const html = generateDealerStatementHtml(dealer);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handleExportCsv = () => {
    exportDealerTransactionsCsv(dealer.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0 mt-1"
              title="Back to Directory"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {dealer.shopName || dealer.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {dealer.id}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {dealer.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {dealer.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                <span>Contact: <strong>{dealer.name}</strong></span>
                <span>&bull;</span>
                <span className="font-mono">Phone: <strong>{dealer.primaryPhone}</strong></span>
                <span>&bull;</span>
                <span>Location: {dealer.businessAddress || dealer.district || 'Dhaka'}</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => onOpenNewTransaction(dealer.id)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? 'পারচেজ প্রবেশ' : 'Record Purchase'}</span>
            </button>
            <button
              onClick={() => onOpenNewPayment(dealer.id)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isBn ? 'পেমেন্ট প্রবেশ' : 'Record Payment'}</span>
            </button>
            <button
              onClick={() => onOpenNewDocument(dealer.id)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBn ? 'ইনভয়েস যুক্ত করুন' : 'Attach Invoice'}</span>
            </button>
            <button
              onClick={handlePrintStatement}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print Official Statement"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isBn ? 'স্টেটমেন্ট' : 'Statement'}</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export Transactions CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2. Balance Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {isBn ? 'মোট পারচেজ' : 'Total Purchases'}
            </span>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
              ৳{balance.totalPurchases.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {isBn ? 'মোট পরিশোধিত' : 'Total Paid to Dealer'}
            </span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              ৳{balance.totalPaidToDealer.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {isBn ? 'মোট বকেয়া (দেওনা)' : 'Net Payable'}
            </span>
            <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
              ৳{balance.netOutstandingPayable.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {isBn ? 'ক্রেডিট লিমিট ও ব্যবহার' : 'Credit Limit & Usage'}
            </span>
            <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
              {balance.creditLimit > 0 ? (
                <span>
                  ৳{balance.netOutstandingPayable.toLocaleString('en-IN')} / ৳{balance.creditLimit.toLocaleString('en-IN')}
                </span>
              ) : (
                <span className="text-slate-400">{isBn ? 'লিমিট সেট নেই' : 'No Limit Set'}</span>
              )}
            </div>
            {balance.creditLimit > 0 && (
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full ${
                    balance.creditUtilizationPercent > 80 ? 'bg-rose-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${balance.creditUtilizationPercent}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 rounded-2xl shadow-2xs text-xs font-bold gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          {isBn ? '১. ডিলার ওভারভিউ' : 'A. Dealer Overview'}
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`py-3.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'transactions'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>{isBn ? '২. ট্রানজেকশনসমূহ' : 'B. Transactions'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
            {transactions.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`py-3.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'documents'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>{isBn ? '৩. ইনভয়েস ও ডকুমেন্ট' : 'C. Invoices & Documents'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
            {documents.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`py-3.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'payments'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>{isBn ? '৪. পেমেন্ট হিসাব' : 'D. Payments'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
            {payments.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          E. Reports &amp; Statements
        </button>
      </div>

      {/* 4. Tab Content */}

      {/* Tab A: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Dealer Information */}
          <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 text-xs">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span>Full Dealer &amp; Commercial Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Business Name</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {dealer.shopName || dealer.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Person</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {dealer.contactPerson || dealer.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Mobile</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                  {dealer.primaryPhone}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Alternative Phone</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {dealer.alternativePhone || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                <span className="text-slate-800 dark:text-slate-200">{dealer.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Business Type</span>
                <span className="capitalize font-bold text-slate-800 dark:text-slate-200">
                  {dealer.businessType.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Terms</span>
                <span className="uppercase font-bold text-slate-800 dark:text-slate-200">
                  {dealer.paymentTerms.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Trade License #</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {dealer.tradeLicenseNumber || 'N/A'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                Business Address
              </span>
              <p className="text-slate-700 dark:text-slate-300">
                {dealer.businessAddress || 'N/A'}, {dealer.district || ''}
              </p>
            </div>

            {dealer.notes && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  Internal Notes
                </span>
                <p className="text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                  "{dealer.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Banking & MFS Details */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 text-xs">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>Settlement &amp; Bank Accounts</span>
            </h3>

            {dealer.bankAccountDetails?.bankName ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {dealer.bankAccountDetails.bankName}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Branch: {dealer.bankAccountDetails.branchName || 'Main Branch'}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Title: <strong>{dealer.bankAccountDetails.accountName || dealer.shopName}</strong>
                </div>
                <div className="font-mono font-bold text-sm text-slate-900 dark:text-white pt-1 border-t border-emerald-200 dark:border-emerald-900">
                  A/C: {dealer.bankAccountDetails.accountNumber}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 rounded-2xl bg-slate-50 dark:bg-slate-800/40">
                No bank account details provided.
              </div>
            )}

            {/* MFS numbers */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Mobile Banking (MFS)
              </span>
              <div className="space-y-1.5">
                {dealer.mfsDetails?.bkash && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-pink-50 dark:bg-pink-950/20 border border-pink-200/60">
                    <span className="font-bold text-pink-700">bKash</span>
                    <span className="font-mono font-bold">{dealer.mfsDetails.bkash}</span>
                  </div>
                )}
                {dealer.mfsDetails?.nagad && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200/60">
                    <span className="font-bold text-orange-700">Nagad</span>
                    <span className="font-mono font-bold">{dealer.mfsDetails.nagad}</span>
                  </div>
                )}
                {dealer.mfsDetails?.rocket && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/60">
                    <span className="font-bold text-indigo-700">Rocket</span>
                    <span className="font-mono font-bold">{dealer.mfsDetails.rocket}</span>
                  </div>
                )}
                {!dealer.mfsDetails?.bkash && !dealer.mfsDetails?.nagad && !dealer.mfsDetails?.rocket && (
                  <span className="text-slate-400 text-[11px] block">No MFS numbers saved.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab B: Transactions */}
      {activeTab === 'transactions' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Chronological Transaction History ({transactions.length})
            </h3>
            <button
              onClick={() => onOpenNewTransaction(dealer.id)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Purchase</span>
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No transactions recorded for this dealer yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[10px] font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Txn ID / Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Line Items</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Total (৳)</th>
                    <th className="py-3 px-4 text-right">Paid (৳)</th>
                    <th className="py-3 px-4 text-right">Due (৳)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-bold font-mono text-slate-900 dark:text-white">{t.id}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(t.transactionDate).toLocaleDateString('en-GB')}
                        </div>
                        {t.referenceNumber && (
                          <div className="text-[10px] text-indigo-600 font-mono">Ref: {t.referenceNumber}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 capitalize font-semibold text-slate-800 dark:text-slate-200">
                        {t.transactionType.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {t.items.map((it, i) => (
                            <div key={i} className="text-[11px] text-slate-700 dark:text-slate-300">
                              {it.productName} &times; <strong>{it.quantity} {it.unit}</strong> @ ৳{it.unitPrice}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        ৳{t.subtotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ৳{t.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        ৳{t.amountPaid.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {t.remainingAmount > 0 ? (
                          <span className="text-rose-600">৳{t.remainingAmount.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-emerald-600">৳0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
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
      )}

      {/* Tab C: Documents & Invoices */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Dealer Invoices, Bills &amp; Paperwork ({documents.length})
            </h3>
            <button
              onClick={() => onOpenNewDocument(dealer.id)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              No documents or invoice copies uploaded for this dealer yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <FileText className="w-4 h-4" />
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600">
                        {doc.documentType.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white line-clamp-1">
                        {doc.title || doc.fileName}
                      </h4>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-GB')} by {doc.uploadedBy}
                      </div>
                    </div>

                    {doc.invoiceNumber && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        Invoice #: <strong className="font-mono">{doc.invoiceNumber}</strong>
                        {doc.invoiceTotal !== undefined && (
                          <span> &bull; ৳{doc.invoiceTotal.toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </span>
                    <button
                      onClick={() => onPreviewDocument(doc)}
                      className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab D: Payments */}
      {activeTab === 'payments' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Payment Transactions &amp; Settlement Vouchers ({payments.length})
            </h3>
            <button
              onClick={() => onOpenNewPayment(dealer.id)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No payments recorded for this dealer yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 text-[10px] font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Payment ID / Date</th>
                    <th className="py-3 px-4">Direction</th>
                    <th className="py-3 px-4">Method &amp; Ref</th>
                    <th className="py-3 px-4 text-right">Amount (৳)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-bold font-mono text-slate-900 dark:text-white">{p.id}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(p.paymentDate).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            p.paymentDirection === 'paid_to_dealer'
                              ? 'text-emerald-600'
                              : 'text-sky-600'
                          }`}
                        >
                          {p.paymentDirection === 'paid_to_dealer' ? 'Paid to Dealer' : 'Received'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{p.paymentMethod}</div>
                        {p.transactionReference && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ref: {p.transactionReference}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-sm text-emerald-600">
                        ৳{p.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            p.verificationStatus === 'verified'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : p.verificationStatus === 'reversed'
                              ? 'bg-rose-500/10 text-rose-600 line-through'
                              : 'bg-amber-500/10 text-amber-600'
                          }`}
                        >
                          {p.verificationStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.verificationStatus !== 'reversed' && (
                          <button
                            title="Reverse / Correct Payment"
                            onClick={() => onReversePayment(p.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reverse</span>
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

      {/* Tab E: Reports & Statements */}
      {activeTab === 'reports' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Official Account Statement Generator
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate formatted internal ledger statements for accounting reconciliation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintStatement}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Open Printable PDF Statement</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Account Position Summary
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">Gross Purchases</span>
                <div className="text-base font-extrabold font-mono mt-1">
                  ৳{balance.totalPurchases.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">Total Settled (Paid)</span>
                <div className="text-base font-extrabold font-mono text-emerald-600 mt-1">
                  ৳{balance.totalPaidToDealer.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">Net Due (Outstanding)</span>
                <div className="text-base font-extrabold font-mono text-rose-600 mt-1">
                  ৳{balance.netOutstandingPayable.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
