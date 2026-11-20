import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Building2,
  TrendingUp,
  Plus,
  CreditCard,
  FileText,
  Wallet,
  Receipt,
  RotateCcw,
  BarChart3,
  Download,
  Settings,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Trash2,
  Printer,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  RefreshCw,
} from 'lucide-react';
import type {
  Dealer,
  DealerTransaction,
  DealerPayment,
  DealerDocument,
  DealerReturnAdjustment,
} from '../../types/dealer';
import type { Product, UserRole, StaffUser } from '../../types';
import {
  getDealers,
  addDealer,
  updateDealer,
  archiveDealer,
  unarchiveDealer,
  getDealerTransactions,
  addDealerTransaction,
  getDealerPayments,
  recordDealerPayment,
  getDealerDocuments,
  addDealerDocument,
  getDealerReturns,
  calculateDealerOverviewStats,
  generateDealerStatementHtml,
  exportDealerTransactionsCsv,
  reverseDealerPayment,
} from '../../lib/dealerStorage';

import { DealerDashboardView } from './dealers/DealerDashboardView';
import { DealerDirectoryView } from './dealers/DealerDirectoryView';
import { DealerProfileView } from './dealers/DealerProfileView';
import { DealerModal } from './dealers/DealerModal';
import { DealerTransactionModal } from './dealers/DealerTransactionModal';
import { DealerPaymentModal } from './dealers/DealerPaymentModal';
import { DealerDocumentModal } from './dealers/DealerDocumentModal';
import { DocumentPreviewModal } from './dealers/DocumentPreviewModal';

import { useLanguage } from '../../context/LanguageContext';
import { SaasBarChart, SaasDonutChart, CollapsibleAnalyticsPanel } from './charts/AdminCharts';

export interface AdminDealersProps {
  products?: Product[];
  currentRole?: UserRole;
  currentStaff?: StaffUser | null;
}

export const AdminDealers: React.FC<AdminDealersProps> = ({
  products = [],
  currentRole = 'admin',
  currentStaff = null,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'directory' | 'profile' | 'transactions' | 'payments' | 'documents' | 'reports' | 'settings'
  >('dashboard');

  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [transactions, setTransactions] = useState<DealerTransaction[]>([]);
  const [payments, setPayments] = useState<DealerPayment[]>([]);
  const [documents, setDocuments] = useState<DealerDocument[]>([]);
  const [returns, setReturns] = useState<DealerReturnAdjustment[]>([]);

  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);

  // Modals
  const [isDealerModalOpen, setIsDealerModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);

  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [modalDealerIdForTxn, setModalDealerIdForTxn] = useState<string | undefined>(undefined);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [modalDealerIdForPayment, setModalDealerIdForPayment] = useState<string | undefined>(undefined);
  const [modalTxnIdForPayment, setModalTxnIdForPayment] = useState<string | undefined>(undefined);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [modalDealerIdForDoc, setModalDealerIdForDoc] = useState<string | undefined>(undefined);
  const [modalTxnIdForDoc, setModalTxnIdForDoc] = useState<string | undefined>(undefined);

  const [previewDoc, setPreviewDoc] = useState<DealerDocument | null>(null);

  // Filters for All Transactions view
  const [txnSearchQuery, setTxnSearchQuery] = useState('');
  const [txnDealerFilter, setTxnDealerFilter] = useState('all');
  const [txnTypeFilter, setTxnTypeFilter] = useState('all');

  // Load initial data
  const loadData = () => {
    setDealers(getDealers());
    setTransactions(getDealerTransactions());
    setPayments(getDealerPayments());
    setDocuments(getDealerDocuments());
    setReturns(getDealerReturns());
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => calculateDealerOverviewStats(), [dealers, transactions, payments]);

  const dealerAnalytics = useMemo(() => {
    const activeDealers = dealers.filter((d) => d.status !== 'archived');
    const totalPurchased = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalPaid = payments.filter((p) => !p.reversedAt).reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalDue = Math.max(0, totalPurchased - totalPaid);

    const ledgerSlices = [
      { label: isBn ? 'পরিশোধিত (Paid)' : 'Paid Amount', value: totalPaid, color: '#059669' },
      { label: isBn ? 'বকেয়া (Payable Due)' : 'Outstanding Due', value: totalDue, color: '#E11D48' },
    ];

    const dealerSpendMap = new Map<string, { name: string; purchased: number; paid: number }>();
    activeDealers.forEach((d) => {
      dealerSpendMap.set(d.id, { name: d.shopName || d.name, purchased: 0, paid: 0 });
    });
    transactions.forEach((t) => {
      const entry = dealerSpendMap.get(t.dealerId) || { name: t.dealerName || t.dealerId, purchased: 0, paid: 0 };
      entry.purchased += t.totalAmount || 0;
      dealerSpendMap.set(t.dealerId, entry);
    });
    payments
      .filter((p) => !p.reversedAt)
      .forEach((p) => {
        const entry = dealerSpendMap.get(p.dealerId);
        if (entry) entry.paid += p.amount || 0;
      });

    const topDealerBars = Array.from(dealerSpendMap.entries())
      .map(([id, d]) => ({
        id,
        label: d.name,
        value: d.purchased,
        secondaryValue: d.paid,
      }))
      .filter((d) => d.value > 0 || d.secondaryValue > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { ledgerSlices, topDealerBars };
  }, [dealers, transactions, payments, isBn]);

  const selectedDealer = useMemo(
    () => dealers.find((d) => d.id === selectedDealerId) || null,
    [dealers, selectedDealerId]
  );

  // Handlers for Dealer Profile
  const handleViewDealerProfile = (dealerId: string) => {
    setSelectedDealerId(dealerId);
    setActiveTab('profile');
  };

  // Dealer Add / Edit / Archive
  const handleSaveDealer = (dealerData: Omit<Dealer, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingDealer) {
      updateDealer(editingDealer.id, dealerData);
    } else {
      addDealer(dealerData);
    }
    setIsDealerModalOpen(false);
    setEditingDealer(null);
    loadData();
  };

  const handleArchiveDealer = (dealerId: string) => {
    archiveDealer(dealerId);
    loadData();
  };

  const handleUnarchiveDealer = (dealerId: string) => {
    unarchiveDealer(dealerId);
    loadData();
  };

  // Transaction Save
  const handleSaveTransaction = (txnData: Omit<DealerTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    addDealerTransaction(txnData);
    setIsTxnModalOpen(false);
    loadData();
  };

  // Payment Save
  const handleSavePayment = (paymentData: Omit<DealerPayment, 'id' | 'createdAt'>) => {
    recordDealerPayment(paymentData);
    setIsPaymentModalOpen(false);
    loadData();
  };

  const handleReversePayment = (paymentId: string) => {
    if (confirm('Are you sure you want to reverse this payment entry? This will update the dealer due balance.')) {
      reverseDealerPayment(paymentId, 'Manual Admin reversal', currentStaff?.name || 'Admin');
      loadData();
    }
  };

  // Document Save
  const handleSaveDocument = (docData: Omit<DealerDocument, 'id' | 'uploadedAt'>) => {
    addDealerDocument(docData);
    setIsDocModalOpen(false);
    loadData();
  };

  // Filtered Transactions List for 'transactions' tab
  const filteredAllTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (txnDealerFilter !== 'all' && t.dealerId !== txnDealerFilter) return false;
      if (txnTypeFilter !== 'all' && t.transactionType !== txnTypeFilter) return false;
      if (txnSearchQuery.trim()) {
        const q = txnSearchQuery.toLowerCase();
        const dealerName = t.dealerName?.toLowerCase() || '';
        const ref = t.referenceNumber?.toLowerCase() || '';
        const id = t.id.toLowerCase();
        return id.includes(q) || dealerName.includes(q) || ref.includes(q);
      }
      return true;
    });
  }, [transactions, txnDealerFilter, txnTypeFilter, txnSearchQuery]);

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Building2 className="w-64 h-64 text-emerald-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 tracking-wide uppercase">
                {isBn ? 'অভ্যন্তরীণ ম্যানেজমেন্ট ওয়ার্কস্পেস' : 'Internal Management Workspace'}
              </span>
              <span className="text-slate-400 text-xs">{isBn ? 'কেনাক্স বিডি একাউন্টস' : 'KenaX BD Accounts'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              {isBn ? 'ডিলার ব্যবস্থাপনা ও লেজার' : 'Dealer Management & Ledger'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              {isBn
                ? 'কেনাক্স বিডি ডিলারদের অভ্যন্তরীণ হিসাববিজ্ঞান: পারচেজ, ইনভয়েস, পেমেন্ট এবং ট্রানজেকশন লেজার।'
                : 'Internal bookkeeping for KenaX BD dealers: purchases, invoices, payments, payables, and transactions ledger.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setEditingDealer(null);
                setIsDealerModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? 'নতুন ডিলার যোগ করুন' : 'Add Dealer'}</span>
            </button>
            <button
              onClick={() => {
                setModalDealerIdForTxn(selectedDealerId || undefined);
                setIsTxnModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition"
            >
              <Receipt className="w-4 h-4" />
              <span>{isBn ? 'নতুন পারচেজ প্রবেশ' : 'New Purchase'}</span>
            </button>
            <button
              onClick={() => {
                setModalDealerIdForPayment(selectedDealerId || undefined);
                setIsPaymentModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 flex items-center gap-2 transition"
            >
              <Wallet className="w-4 h-4" />
              <span>{isBn ? 'পেমেন্ট রেকর্ড করুন' : 'Record Payment'}</span>
            </button>
          </div>
        </div>

        {/* Inner Tabs Navigation */}
        <div className="flex items-center gap-1 mt-6 pt-4 border-t border-white/10 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'dashboard'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{isBn ? 'ওভারভিউ ড্যাশবোর্ড' : 'Overview Dashboard'}</span>
          </button>

          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'directory'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isBn ? `ডিলার ডিরেক্টরি (${dealers.length})` : `Dealer Directory (${dealers.length})`}</span>
          </button>

          {selectedDealer && (
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
                activeTab === 'profile'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-500" />
              <span>{isBn ? `প্রোফাইল: ${selectedDealer.shopName || selectedDealer.name}` : `Profile: ${selectedDealer.shopName || selectedDealer.name}`}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'transactions'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>{isBn ? `ট্রানজেকশন তালিকা (${transactions.length})` : `Transactions (${transactions.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'payments'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>{isBn ? `পেমেন্ট লেজার (${payments.length})` : `Payments Ledger (${payments.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'documents'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{isBn ? `ইনভয়েস ও ফাইলসমূহ (${documents.length})` : `Invoices & Files (${documents.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'reports'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>{isBn ? 'স্টেটমেন্ট ও এক্সপোর্ট' : 'Statements & Export'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <CollapsibleAnalyticsPanel
          title={isBn ? 'ডিলার পেমেন্ট ও পারচেজ চার্ট' : 'Dealer Payables & Purchase Analytics'}
          defaultOpen={true}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SaasDonutChart
              title={isBn ? 'মোট পরিশোধ বনাম বকেয়া অনুপাত' : 'Paid vs Outstanding Payable Split'}
              subtitle={isBn ? 'সর্বমোট ডিলার হিসাবের সারাংশ' : 'Aggregate dealer settlement progress'}
              data={dealerAnalytics.ledgerSlices}
              valueFormat="currency"
              centerLabel={isBn ? 'মোট পারচেজ' : 'Total Billed'}
              emptyText={isBn ? 'এখনও কোনো ডিলার লেনদেন নেই' : 'No dealer transactions recorded yet'}
            />
            <SaasBarChart
              title={isBn ? 'শীর্ষ ডিলার পারচেজ বনাম পেমেন্ট' : 'Top Dealers: Purchases vs Paid'}
              subtitle={isBn ? 'বারে ক্লিক করে ডিলার প্রোফাইল দেখুন' : 'Click a dealer bar to open ledger profile'}
              data={dealerAnalytics.topDealerBars}
              valueFormat="currency"
              secondaryFormat="currency"
              primaryLabel={isBn ? 'পারচেজ' : 'Purchased'}
              secondaryLabel={isBn ? 'পরিশোধিত' : 'Paid'}
              barColor="#0284C7"
              secondaryColor="#059669"
              emptyText={isBn ? 'চার্ট দেখানোর জন্য পারচেজ যুক্ত করুন' : 'Record dealer purchases to populate chart'}
              onSelectBar={(item) => {
                if (item.id) handleViewDealerProfile(item.id);
              }}
            />
          </div>
        </CollapsibleAnalyticsPanel>
      )}

      {/* Main Content Areas based on activeTab */}
      {activeTab === 'dashboard' && (
        <DealerDashboardView
          stats={stats}
          dealers={dealers}
          transactions={transactions}
          payments={payments}
          documents={documents}
          onOpenNewTransaction={() => {
            setModalDealerIdForTxn(undefined);
            setIsTxnModalOpen(true);
          }}
          onOpenNewPayment={() => {
            setModalDealerIdForPayment(undefined);
            setIsPaymentModalOpen(true);
          }}
          onOpenNewDocument={() => {
            setModalDealerIdForDoc(undefined);
            setIsDocModalOpen(true);
          }}
          onViewDealerProfile={handleViewDealerProfile}
          onViewTransaction={(txnId) => {
            setActiveTab('transactions');
            setTxnSearchQuery(txnId);
          }}
          onPreviewDocument={(doc) => setPreviewDoc(doc)}
        />
      )}

      {activeTab === 'directory' && (
        <DealerDirectoryView
          dealers={dealers}
          onOpenAddDealer={() => {
            setEditingDealer(null);
            setIsDealerModalOpen(true);
          }}
          onEditDealer={(dealer) => {
            setEditingDealer(dealer);
            setIsDealerModalOpen(true);
          }}
          onViewProfile={handleViewDealerProfile}
          onArchiveDealer={handleArchiveDealer}
          onUnarchiveDealer={handleUnarchiveDealer}
        />
      )}

      {activeTab === 'profile' && selectedDealer && (
        <DealerProfileView
          dealer={selectedDealer}
          transactions={transactions.filter((t) => t.dealerId === selectedDealer.id)}
          payments={payments.filter((p) => p.dealerId === selectedDealer.id)}
          documents={documents.filter((d) => d.dealerId === selectedDealer.id)}
          returns={returns.filter((r) => r.dealerId === selectedDealer.id)}
          onBack={() => setActiveTab('directory')}
          onOpenNewTransaction={(dlrId) => {
            setModalDealerIdForTxn(dlrId);
            setIsTxnModalOpen(true);
          }}
          onOpenNewPayment={(dlrId) => {
            setModalDealerIdForPayment(dlrId);
            setIsPaymentModalOpen(true);
          }}
          onOpenNewDocument={(dlrId) => {
            setModalDealerIdForDoc(dlrId);
            setIsDocModalOpen(true);
          }}
          onPreviewDocument={(doc) => setPreviewDoc(doc)}
          onReversePayment={handleReversePayment}
        />
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-500" />
                Dealer Transactions Ledger
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                All recorded purchases, bills, returns, and debit/credit adjustments
              </p>
            </div>

            <button
              onClick={() => {
                setModalDealerIdForTxn(undefined);
                setIsTxnModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Transaction</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search transaction ID, dealer, reference..."
                value={txnSearchQuery}
                onChange={(e) => setTxnSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm"
              />
            </div>

            <select
              value={txnDealerFilter}
              onChange={(e) => setTxnDealerFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium"
            >
              <option value="all">All Dealers</option>
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.shopName || d.name}
                </option>
              ))}
            </select>

            <select
              value={txnTypeFilter}
              onChange={(e) => setTxnTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium"
            >
              <option value="all">All Transaction Types</option>
              <option value="purchase">Purchase from Dealer</option>
              <option value="sale_to_dealer">Sale to Dealer</option>
              <option value="return_outward">Return Outward</option>
              <option value="adjustment_credit">Credit Adjustment</option>
              <option value="adjustment_debit">Debit Adjustment</option>
            </select>
          </div>

          {/* Transactions Table */}
          {filteredAllTransactions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300">No Transactions Found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try adjusting your search filters or add a new dealer transaction entry.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/50">
                    <th className="p-3">Txn ID & Date</th>
                    <th className="p-3">Dealer</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Ref / Invoice</th>
                    <th className="p-3 text-right">Total (BDT)</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Due Balance</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredAllTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">
                          {t.id}
                        </span>
                        <span className="text-xs text-slate-400">{t.transactionDate}</span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleViewDealerProfile(t.dealerId)}
                          className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline text-left block"
                        >
                          {t.dealerName || 'Dealer'}
                        </button>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-xs uppercase">
                          {t.transactionType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                        {t.referenceNumber || (t as any).purchaseBillNumber || 'N/A'}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                        ৳{t.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        ৳{t.amountPaid.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                        ৳{t.remainingAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                            t.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : t.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
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

      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                Payments & Disbursements Ledger
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Record of all payments made to dealers or received from dealers
              </p>
            </div>

            <button
              onClick={() => {
                setModalDealerIdForPayment(undefined);
                setIsPaymentModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          </div>

          {/* Payments Table */}
          {payments.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <Wallet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300">No Payment Records Yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Record payment vouchers or bank transfer details to update dealer dues.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold bg-slate-50 dark:bg-slate-800/50">
                    <th className="p-3">Payment ID & Date</th>
                    <th className="p-3">Dealer</th>
                    <th className="p-3">Direction</th>
                    <th className="p-3">Method & Ref</th>
                    <th className="p-3 text-right">Amount (BDT)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">
                          {p.id}
                        </span>
                        <span className="text-xs text-slate-400">{p.paymentDate}</span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleViewDealerProfile(p.dealerId)}
                          className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline text-left block"
                        >
                          {p.dealerName || 'Dealer'}
                        </button>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-bold ${
                            p.paymentDirection === 'paid_to_dealer'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {p.paymentDirection === 'paid_to_dealer' ? 'Paid to Dealer' : 'Received'}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        <span className="block font-bold text-slate-800 dark:text-slate-200">
                          {p.paymentMethod}
                        </span>
                        <span className="text-xs text-slate-400">{p.transactionReference || 'N/A'}</span>
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 dark:text-white text-base">
                        ৳{p.amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                            p.verificationStatus === 'verified'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : p.verificationStatus === 'reversed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {p.verificationStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {p.verificationStatus !== 'reversed' && (
                          <button
                            onClick={() => handleReversePayment(p.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 transition"
                            title="Reverse Payment"
                          >
                            Reverse
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

      {activeTab === 'documents' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                Invoices & Document Repository
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uploaded dealer invoices, bills, receipts, delivery challans, and proof of payments
              </p>
            </div>

            <button
              onClick={() => {
                setModalDealerIdForDoc(undefined);
                setIsDocModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300">No Uploaded Documents</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload dealer PDF invoices or scanned bill photos to attach them securely to dealer records.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs uppercase">
                        {doc.documentType.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-400">{doc.uploadedAt.split('T')[0]}</span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {doc.title || doc.fileName}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-1">
                      Dealer: <strong>{doc.dealerName || 'Dealer'}</strong>
                    </p>

                    {doc.invoiceNumber && (
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                        Invoice #: <strong>{doc.invoiceNumber}</strong>
                      </p>
                    )}

                    {doc.invoiceTotal ? (
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Amount: ৳{doc.invoiceTotal.toLocaleString()}
                      </p>
                    ) : null}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="flex-1 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 hover:bg-slate-100 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <a
                      href={doc.fileUrl}
                      download={doc.fileName || 'invoice'}
                      className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition"
                      title="Download File"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-500" />
              Dealer Account Statements & Reports
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate printable PDF statements or export complete transaction ledgers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dealer Wise Statement Generator */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>Generate Individual Dealer Statement</span>
              </h3>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                  Select Dealer:
                </label>
                <select
                  id="reportDealerSelect"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold"
                >
                  {dealers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.shopName || d.name} ({d.id})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    const sel = (document.getElementById('reportDealerSelect') as HTMLSelectElement)?.value;
                    const dlr = dealers.find((d) => d.id === sel);
                    if (dlr) {
                      const html = generateDealerStatementHtml(dlr);
                      const win = window.open('', '_blank');
                      if (win) {
                        win.document.write(html);
                        win.document.close();
                      }
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Account Statement (PDF)</span>
                </button>
              </div>
            </div>

            {/* CSV Export Tool */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-500" />
                <span>Export Transaction Ledger (CSV)</span>
              </h3>

              <p className="text-xs text-slate-500">
                Download full Excel/CSV transaction data including item details, unit prices, sub-totals, discounts, delivery charges, and payments.
              </p>

              <button
                onClick={() => exportDealerTransactionsCsv()}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                <span>Export All Transactions to CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isDealerModalOpen && (
        <DealerModal
          dealer={editingDealer}
          existingDealers={dealers}
          onSave={handleSaveDealer}
          onClose={() => {
            setIsDealerModalOpen(false);
            setEditingDealer(null);
          }}
        />
      )}

      {isTxnModalOpen && (
        <DealerTransactionModal
          dealers={dealers}
          products={products}
          selectedDealerId={modalDealerIdForTxn}
          onSave={handleSaveTransaction}
          onClose={() => setIsTxnModalOpen(false)}
        />
      )}

      {isPaymentModalOpen && (
        <DealerPaymentModal
          dealers={dealers}
          transactions={transactions}
          selectedDealerId={modalDealerIdForPayment}
          selectedTransactionId={modalTxnIdForPayment}
          onSave={handleSavePayment}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {isDocModalOpen && (
        <DealerDocumentModal
          dealers={dealers}
          transactions={transactions}
          selectedDealerId={modalDealerIdForDoc}
          selectedTransactionId={modalTxnIdForDoc}
          onSave={handleSaveDocument}
          onClose={() => setIsDocModalOpen(false)}
        />
      )}

      {previewDoc && (
        <DocumentPreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
};
