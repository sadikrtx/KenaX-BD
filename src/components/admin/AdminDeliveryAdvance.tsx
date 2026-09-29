import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  CheckCircle,
  Clock,
  Search,
  Filter,
  DollarSign,
  User,
  Phone,
  MapPin,
  Calendar,
  Copy,
  Check,
  Eye,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Download,
  ShoppingBag,
  ArrowUpRight,
  TrendingUp,
  X,
  FileText,
  BadgePercent,
  Sparkles,
  Truck,
  RefreshCw,
  Zap,
  CheckCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { Order, UserRole, StaffUser, SiteSettings } from '../../types';
import { ClickableOrderId } from '../common/ClickableOrderId';

interface AdminDeliveryAdvanceProps {
  orders: Order[];
  onVerifyPayment: (orderId: string) => void;
  onUpdateOrderStatus?: (
    orderId: string,
    status: any,
    courier?: string,
    tracking?: string
  ) => void;
  onOpenInvoice?: (order: Order) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  settings?: SiteSettings;
}

export const AdminDeliveryAdvance: React.FC<AdminDeliveryAdvanceProps> = ({
  orders,
  onVerifyPayment,
  onUpdateOrderStatus,
  onOpenInvoice,
  currentRole,
  currentStaff,
  settings,
}) => {
  // Navigation tab / view filter: 'all' | 'delivery' | 'full' | 'pending' | 'verified'
  const [activeTab, setActiveTab] = useState<'all' | 'delivery' | 'full' | 'pending' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'amount_desc' | 'amount_asc'>('newest');
  const [copiedTrxId, setCopiedTrxId] = useState<string | null>(null);

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Helper functions to categorize orders
  const isDeliveryAdvanceOrder = (o: Order): boolean => {
    if (o.paymentOptionType === 'delivery_only') return true;
    if (o.paymentMethod === 'Delivery Charge Only') return true;
    if (
      o.paymentOptionType !== 'full' &&
      o.paymentOptionType !== 'cod' &&
      o.paidAmount !== undefined &&
      o.paidAmount > 0 &&
      o.paidAmount === o.deliveryCharge &&
      o.deliveryCharge > 0
    ) {
      return true;
    }
    return false;
  };

  const isFullAdvanceOrder = (o: Order): boolean => {
    if (o.paymentOptionType === 'full') return true;
    if (
      o.paidAmount !== undefined &&
      o.paidAmount >= o.totalAmount &&
      o.totalAmount > 0
    ) {
      return true;
    }
    if (
      o.paymentMethod !== 'Cash on Delivery' &&
      o.paymentMethod !== 'Delivery Charge Only' &&
      o.paymentOptionType !== 'delivery_only' &&
      o.paymentOptionType !== 'cod' &&
      (o.transactionId || (o.paidAmount && o.paidAmount > (o.deliveryCharge || 0)))
    ) {
      return true;
    }
    return false;
  };

  const isAnyAdvanceOrder = (o: Order): boolean => {
    return isDeliveryAdvanceOrder(o) || isFullAdvanceOrder(o);
  };

  // Base list of all advance payment orders
  const allAdvanceOrders = useMemo(() => {
    return orders.filter((o) => isAnyAdvanceOrder(o));
  }, [orders]);

  // Delivery advance orders list
  const deliveryAdvanceOrders = useMemo(() => {
    return orders.filter((o) => isDeliveryAdvanceOrder(o));
  }, [orders]);

  // Full advance orders list
  const fullAdvanceOrders = useMemo(() => {
    return orders.filter((o) => isFullAdvanceOrder(o));
  }, [orders]);

  // Verification status groups
  const verifiedOrders = useMemo(() => {
    return allAdvanceOrders.filter(
      (o) => o.paymentStatus === 'Verified' || o.paymentStatus === 'Paid'
    );
  }, [allAdvanceOrders]);

  const pendingOrders = useMemo(() => {
    return allAdvanceOrders.filter(
      (o) =>
        o.paymentStatus === 'Pending Verification' ||
        o.paymentStatus === 'Pending' ||
        (o.paymentStatus !== 'Verified' && o.paymentStatus !== 'Paid' && o.orderStatus !== 'Cancelled')
    );
  }, [allAdvanceOrders]);

  // Total Verified Delivery Advance Amount
  const totalVerifiedDeliveryAdvance = useMemo(() => {
    return deliveryAdvanceOrders
      .filter((o) => o.paymentStatus === 'Verified' || o.paymentStatus === 'Paid')
      .reduce((sum, o) => {
        const amt = o.paidAmount && o.paidAmount > 0 ? o.paidAmount : (o.deliveryCharge || 0);
        return sum + amt;
      }, 0);
  }, [deliveryAdvanceOrders]);

  // Total Verified Full Advance Amount
  const totalVerifiedFullAdvance = useMemo(() => {
    return fullAdvanceOrders
      .filter((o) => o.paymentStatus === 'Verified' || o.paymentStatus === 'Paid')
      .reduce((sum, o) => sum + (o.paidAmount && o.paidAmount > 0 ? o.paidAmount : o.totalAmount), 0);
  }, [fullAdvanceOrders]);

  // Total Combined Verified Advance Amount
  const totalCombinedVerifiedAdvance = useMemo(() => {
    return totalVerifiedDeliveryAdvance + totalVerifiedFullAdvance;
  }, [totalVerifiedDeliveryAdvance, totalVerifiedFullAdvance]);

  // Total Pending Advance Amount
  const totalPendingAdvanceAmount = useMemo(() => {
    return pendingOrders.reduce((sum, o) => {
      if (isDeliveryAdvanceOrder(o)) {
        return sum + (o.paidAmount && o.paidAmount > 0 ? o.paidAmount : (o.deliveryCharge || 0));
      }
      return sum + (o.paidAmount && o.paidAmount > 0 ? o.paidAmount : o.totalAmount);
    }, 0);
  }, [pendingOrders]);

  // Total Remaining Due on Delivery (COD Collection via courier for partial/advance orders)
  const totalRemainingDue = useMemo(() => {
    return verifiedOrders.reduce((sum, o) => {
      if (isFullAdvanceOrder(o)) return sum; // Full advance has 0 due
      const due =
        o.dueAmount !== undefined
          ? o.dueAmount
          : Math.max(0, o.totalAmount - (o.paidAmount || o.deliveryCharge || 0));
      return sum + due;
    }, 0);
  }, [verifiedOrders]);

  // Filtered & Sorted orders for the display table / card list
  const filteredOrders = useMemo(() => {
    return allAdvanceOrders.filter((o) => {
      // Tab filter
      if (activeTab === 'delivery' && !isDeliveryAdvanceOrder(o)) return false;
      if (activeTab === 'full' && !isFullAdvanceOrder(o)) return false;
      if (
        activeTab === 'pending' &&
        o.paymentStatus !== 'Pending Verification' &&
        o.paymentStatus !== 'Pending' &&
        (o.paymentStatus === 'Verified' || o.paymentStatus === 'Paid')
      ) {
        return false;
      }
      if (
        activeTab === 'verified' &&
        o.paymentStatus !== 'Verified' &&
        o.paymentStatus !== 'Paid'
      ) {
        return false;
      }

      // Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matches =
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.customerMobile && o.customerMobile.includes(q)) ||
          (o.deliveryMobile && o.deliveryMobile.includes(q)) ||
          (o.senderMobileNumber && o.senderMobileNumber.includes(q)) ||
          (o.transactionId && o.transactionId.toLowerCase().includes(q)) ||
          (o.district && o.district.toLowerCase().includes(q)) ||
          (o.division && o.division.toLowerCase().includes(q)) ||
          (o.paymentMethod && o.paymentMethod.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Gateway filter
      if (gatewayFilter !== 'all') {
        if (!o.paymentMethod.toLowerCase().includes(gatewayFilter.toLowerCase())) {
          return false;
        }
      }

      // Date filter
      if (dateFilter !== 'all' && o.createdAt) {
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        if (dateFilter === 'today') {
          const isToday =
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (orderDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'month') {
          const isMonth =
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear();
          if (!isMonth) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'amount_desc') {
        const aAmt = a.paidAmount || (isDeliveryAdvanceOrder(a) ? a.deliveryCharge : a.totalAmount);
        const bAmt = b.paidAmount || (isDeliveryAdvanceOrder(b) ? b.deliveryCharge : b.totalAmount);
        return bAmt - aAmt;
      }
      if (sortBy === 'amount_asc') {
        const aAmt = a.paidAmount || (isDeliveryAdvanceOrder(a) ? a.deliveryCharge : a.totalAmount);
        const bAmt = b.paidAmount || (isDeliveryAdvanceOrder(b) ? b.deliveryCharge : b.totalAmount);
        return aAmt - bAmt;
      }
      return 0;
    });
  }, [allAdvanceOrders, activeTab, searchQuery, gatewayFilter, dateFilter, sortBy]);

  const handleCopyTrxId = (trxId: string) => {
    navigator.clipboard.writeText(trxId);
    setCopiedTrxId(trxId);
    setTimeout(() => setCopiedTrxId(null), 2000);
  };

  const handleDirectVerify = async (orderId: string) => {
    setVerifyingId(orderId);
    try {
      await onVerifyPayment(orderId);
      if (selectedOrder && selectedOrder.id === orderId) {
        const isDelivery = isDeliveryAdvanceOrder(selectedOrder);
        const paidAmt = isDelivery
          ? (selectedOrder.paidAmount || selectedOrder.deliveryCharge)
          : selectedOrder.totalAmount;
        const dueAmt = isDelivery
          ? Math.max(0, selectedOrder.totalAmount - (selectedOrder.paidAmount || selectedOrder.deliveryCharge))
          : 0;

        setSelectedOrder({
          ...selectedOrder,
          paymentStatus: 'Verified',
          paymentVerifiedAt: new Date().toISOString(),
          paidAmount: paidAmt,
          dueAmount: dueAmt,
        });
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;
    const headers = [
      'Order ID',
      'Customer Name',
      'Contact Mobile',
      'Advance Type',
      'Advance Paid (BDT)',
      'Total Order Amount (BDT)',
      'Due Amount (BDT)',
      'Payment Gateway',
      'Sender Mobile',
      'TrxID',
      'Payment Status',
      'Verified At',
      'Order Status',
      'Address',
      'District',
      'Order Date',
    ];

    const rows = filteredOrders.map((o) => {
      const isDeliv = isDeliveryAdvanceOrder(o);
      const advancePaid = o.paidAmount && o.paidAmount > 0 ? o.paidAmount : (isDeliv ? o.deliveryCharge : o.totalAmount);
      const due = isDeliv
        ? (o.dueAmount !== undefined ? o.dueAmount : Math.max(0, o.totalAmount - advancePaid))
        : 0;

      return [
        o.id,
        `"${o.customerName.replace(/"/g, '""')}"`,
        `"${o.customerMobile || o.deliveryMobile || ''}"`,
        isDeliv ? 'Delivery Advance' : 'Full Advance',
        advancePaid,
        o.totalAmount,
        due,
        `"${o.paymentMethod || ''}"`,
        `"${o.senderMobileNumber || ''}"`,
        `"${o.transactionId || ''}"`,
        o.paymentStatus,
        o.paymentVerifiedAt ? new Date(o.paymentVerifiedAt).toLocaleString('en-US') : 'Unverified',
        o.orderStatus,
        `"${(o.fullAddress || '').replace(/"/g, '""')}"`,
        `"${o.district || ''}"`,
        new Date(o.createdAt).toLocaleString('en-US'),
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kenax-advance-payments-ledger-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGatewayTheme = (method: string) => {
    const m = (method || '').toLowerCase();
    if (m.includes('bkash')) {
      return {
        bg: 'bg-pink-50 text-pink-700 border-pink-200',
        badge: 'bg-pink-600 text-white',
        text: 'text-pink-700 font-bold',
      };
    }
    if (m.includes('nagad')) {
      return {
        bg: 'bg-orange-50 text-orange-700 border-orange-200',
        badge: 'bg-orange-600 text-white',
        text: 'text-orange-700 font-bold',
      };
    }
    if (m.includes('rocket')) {
      return {
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        badge: 'bg-purple-600 text-white',
        text: 'text-purple-700 font-bold',
      };
    }
    return {
      bg: 'bg-sky-50 text-sky-700 border-sky-200',
      badge: 'bg-sky-600 text-white',
      text: 'text-sky-700 font-bold',
    };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-5 sm:p-7 text-white shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center shadow-inner">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-sm sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 whitespace-nowrap">
                  <span>Advance Payment Management</span>
                  <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                    Live
                  </span>
                </h1>
                <p className="hidden sm:block text-xs text-slate-300">
                  Track Delivery Advances, Full Upfront Pre-payments, Pending TrxID verifications, and Customer Ledgers.
                </p>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={filteredOrders.length === 0}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Download className="w-4 h-4" />
              <span>Export Ledger (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. TOP METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Combined Verified Advance */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                Total Verified Advance
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white">
                Confirmed
              </span>
            </div>
            <div className="mt-3">
              <p className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-baseline gap-1">
                <span>৳</span>
                <span>{totalCombinedVerifiedAdvance.toLocaleString('en-BD')}</span>
              </p>
              <p className="text-xs text-emerald-100 mt-1 font-medium">
                Verified collections ({verifiedOrders.length} Orders)
              </p>
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-white/15 flex items-center justify-between text-[11px] text-emerald-100">
            <span>Realized Upfront Cash</span>
            <span className="font-bold">{verifiedOrders.length} Paid</span>
          </div>
        </div>

        {/* Card 2: Delivery Advance Collections */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-indigo-600" />
                Delivery Advance
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {deliveryAdvanceOrders.length} Orders
              </span>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-indigo-900 tracking-tight flex items-baseline gap-1">
                <span>৳</span>
                <span>{totalVerifiedDeliveryAdvance.toLocaleString('en-BD')}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Advance delivery fees verified upfront
              </p>
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>COD Due to Collect</span>
            <span className="font-bold text-purple-700">৳{totalRemainingDue.toLocaleString('en-BD')}</span>
          </div>
        </div>

        {/* Card 3: Full Advance Pre-Payments (100% Paid) */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Full Advance (100%)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {fullAdvanceOrders.length} Orders
              </span>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-emerald-700 tracking-tight flex items-baseline gap-1">
                <span>৳</span>
                <span>{totalVerifiedFullAdvance.toLocaleString('en-BD')}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                100% full upfront payment collected
              </p>
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Courier Collection</span>
            <span className="font-bold text-emerald-700">৳0 Due (Paid)</span>
          </div>
        </div>

        {/* Card 4: Pending Verification */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                Pending Verification
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  pendingOrders.length > 0
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {pendingOrders.length} Awaiting
              </span>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-amber-600 tracking-tight flex items-baseline gap-1">
                <span>৳</span>
                <span>{totalPendingAdvanceAmount.toLocaleString('en-BD')}</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                TrxIDs submitted by users awaiting review
              </p>
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Action Required</span>
            <button
              onClick={() => setActiveTab('pending')}
              className="text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Review Queue</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS & FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* View Mode Segmented Controls */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                All Advance ({allAdvanceOrders.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('delivery')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'delivery'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Delivery Advance ({deliveryAdvanceOrders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('full')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'full'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Full Advance ({fullAdvanceOrders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Verification ({pendingOrders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('verified')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'verified'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:text-teal-800 dark:hover:text-teal-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Verified ({verifiedOrders.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 self-start lg:self-auto text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{filteredOrders.length}</span> records shown
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            {/* Search Input */}
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name, phone, order ID, TrxID, district..."
                className="w-full pl-10 pr-8 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-800/80"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Gateway, Date, and Sort Filters in a single line on mobile (grid-cols-3), and distributed on desktop (sm:col-span-7) */}
            <div className="grid grid-cols-3 sm:col-span-7 gap-2">
              <div className="min-w-0">
                <select
                  value={gatewayFilter}
                  onChange={(e) => setGatewayFilter(e.target.value)}
                  className="w-full px-2 sm:px-3 py-2.5 rounded-2xl border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-700 bg-white cursor-pointer truncate"
                >
                  <option value="all">All Payment Gateways</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>

              <div className="min-w-0">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="w-full px-2 sm:px-3 py-2.5 rounded-2xl border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-700 bg-white cursor-pointer truncate"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">Past 7 Days</option>
                  <option value="month">This Month</option>
                </select>
              </div>

              <div className="min-w-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-2 sm:px-3 py-2.5 rounded-2xl border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-700 bg-white cursor-pointer truncate"
                >
                  <option value="newest">Newest First</option>
                  <option value="amount_desc">Highest Amount</option>
                  <option value="amount_asc">Lowest Amount</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 3. ADVANCE ORDERS LIST (TABLE ON DESKTOP / CARDS ON MOBILE) */}
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CreditCard className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Advance Payment Records Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No customer records match your current filters. Try changing your search query or tab selection.
            </p>
            {(searchQuery || gatewayFilter !== 'all' || dateFilter !== 'all' || activeTab !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setGatewayFilter('all');
                  setDateFilter('all');
                  setActiveTab('all');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1020px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3.5 px-4 min-w-[190px]">Customer & Contact</th>
                    <th className="py-3.5 px-4 w-[130px]">Order & Date</th>
                    <th className="py-3.5 px-4 w-[160px]">Advance Type</th>
                    <th className="py-3.5 px-4 w-[140px] text-emerald-700">Advance Paid</th>
                    <th className="py-3.5 px-4 w-[140px]">Total / COD Due</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Gateway & TrxID</th>
                    <th className="py-3.5 px-4 w-[140px]">Verification</th>
                    <th className="py-3.5 px-4 w-[120px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((o) => {
                    const isVerified = o.paymentStatus === 'Verified' || o.paymentStatus === 'Paid';
                    const isDeliv = isDeliveryAdvanceOrder(o);
                    const isFull = isFullAdvanceOrder(o);
                    const advanceAmount =
                      o.paidAmount && o.paidAmount > 0
                        ? o.paidAmount
                        : isDeliv
                        ? o.deliveryCharge
                        : o.totalAmount;
                    const dueAmount = isDeliv
                      ? o.dueAmount !== undefined
                        ? o.dueAmount
                        : Math.max(0, o.totalAmount - advanceAmount)
                      : 0;
                    const gwStyle = getGatewayTheme(o.paymentMethod);

                    return (
                      <tr
                        key={o.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => setSelectedOrder(o)}
                      >
                        {/* Customer Info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {o.customerName ? o.customerName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {o.customerName}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{o.customerMobile || o.deliveryMobile}</span>
                              </p>
                              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                <span>{o.district || o.division}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Order ID & Date */}
                        <td className="py-3.5 px-4 font-mono">
                          <ClickableOrderId orderId={o.id} className="text-indigo-700 bg-indigo-50 border-indigo-200" />
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(o.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </td>

                        {/* Advance Type */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isFull ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              <span>Full Advance (100%)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300">
                              <Truck className="w-3 h-3 text-indigo-600" />
                              <span>Delivery Advance</span>
                            </span>
                          )}
                        </td>

                        {/* Advance Paid */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-black">
                            <span>৳{advanceAmount.toLocaleString('en-BD')}</span>
                          </div>
                          <span className="block text-[10px] text-emerald-600 font-medium mt-0.5">
                            {isFull ? '100% Upfront Paid' : 'Delivery Charge Only'}
                          </span>
                        </td>

                        {/* Total & Due */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-bold text-slate-900">
                            ৳{o.totalAmount.toLocaleString('en-BD')}
                          </p>
                          {isFull ? (
                            <p className="text-[10px] font-bold text-emerald-600 mt-0.5">
                              ৳0 Due (Paid in Full)
                            </p>
                          ) : (
                            <p className="text-[11px] font-semibold text-purple-700 mt-0.5">
                              Due: ৳{dueAmount.toLocaleString('en-BD')}
                            </p>
                          )}
                        </td>

                        {/* Gateway & TrxID */}
                        <td className="py-3.5 px-4 text-[11px]" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${gwStyle.bg}`}>
                              {o.paymentMethod}
                            </span>
                            {o.transactionId && (
                              <button
                                type="button"
                                onClick={() => handleCopyTrxId(o.transactionId!)}
                                className="text-slate-400 hover:text-indigo-600 transition-colors p-0.5"
                                title="Copy TrxID"
                              >
                                {copiedTrxId === o.transactionId ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                          <p className="font-mono font-bold text-slate-800 mt-1">
                            {o.transactionId || <span className="text-slate-400 italic">No TrxID</span>}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Sender: {o.senderMobileNumber || o.customerMobile}
                          </p>
                        </td>

                        {/* Verification Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isVerified ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Verified</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                <span>Pending Review</span>
                              </>
                            )}
                          </span>
                          {isVerified && o.paymentVerifiedAt && (
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {new Date(o.paymentVerifiedAt).toLocaleDateString()}
                            </p>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {!isVerified ? (
                              <button
                                type="button"
                                disabled={verifyingId === o.id}
                                onClick={() => handleDirectVerify(o.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>{verifyingId === o.id ? 'Verifying...' : 'Verify'}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-bold px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg inline-flex items-center gap-1">
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>Approved</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedOrder(o)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="View Customer & Advance Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {filteredOrders.map((o) => {
                const isVerified = o.paymentStatus === 'Verified' || o.paymentStatus === 'Paid';
                const isDeliv = isDeliveryAdvanceOrder(o);
                const isFull = isFullAdvanceOrder(o);
                const advanceAmount =
                  o.paidAmount && o.paidAmount > 0
                    ? o.paidAmount
                    : isDeliv
                    ? o.deliveryCharge
                    : o.totalAmount;
                const dueAmount = isDeliv
                  ? o.dueAmount !== undefined
                    ? o.dueAmount
                    : Math.max(0, o.totalAmount - advanceAmount)
                  : 0;
                const gwStyle = getGatewayTheme(o.paymentMethod);

                return (
                  <div
                    key={o.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3"
                    onClick={() => setSelectedOrder(o)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ClickableOrderId orderId={o.id} className="text-indigo-700 bg-indigo-50 border-indigo-200" />
                        {isFull ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                            Full Advance
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                            Delivery Advance
                          </span>
                        )}
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{o.customerName}</h4>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">{o.customerMobile}</p>
                        <p className="text-[10px] text-slate-400">{o.district || o.division}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          ৳{advanceAmount.toLocaleString('en-BD')}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Total: ৳{o.totalAmount.toLocaleString('en-BD')}
                        </p>
                        {!isFull && dueAmount > 0 && (
                          <p className="text-[10px] text-purple-700 font-bold">
                            Due: ৳{dueAmount.toLocaleString('en-BD')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Gateway & TrxID row */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs" onClick={(e) => e.stopPropagation()}>
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${gwStyle.bg}`}>
                          {o.paymentMethod}
                        </span>
                        <p className="font-mono text-[11px] font-bold text-slate-800 mt-1">
                          Trx: {o.transactionId || 'N/A'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {o.transactionId && (
                          <button
                            type="button"
                            onClick={() => handleCopyTrxId(o.transactionId!)}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600"
                          >
                            {copiedTrxId === o.transactionId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {!isVerified && (
                          <button
                            type="button"
                            disabled={verifyingId === o.id}
                            onClick={() => handleDirectVerify(o.id)}
                            className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                          >
                            {verifyingId === o.id ? '...' : 'Verify'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 4. CUSTOMER INFORMATION & ADVANCE DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>Customer & Advance Payment Record</span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-white/20 text-white font-mono">
                      #{selectedOrder.id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    {isFullAdvanceOrder(selectedOrder)
                      ? 'Full Advance Pre-Payment Record'
                      : 'Delivery Charge Advance Record'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Advance Status Alert Banner */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  selectedOrder.paymentStatus === 'Verified' || selectedOrder.paymentStatus === 'Paid'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {selectedOrder.paymentStatus === 'Verified' || selectedOrder.paymentStatus === 'Paid' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-xs font-black">
                      {selectedOrder.paymentStatus === 'Verified' || selectedOrder.paymentStatus === 'Paid'
                        ? 'Advance Payment Verified & Added to Accounting'
                        : 'Advance Payment Awaiting TrxID Verification'}
                    </h4>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {selectedOrder.paymentStatus === 'Verified' || selectedOrder.paymentStatus === 'Paid'
                        ? `Payment of ৳${(
                            selectedOrder.paidAmount ||
                            (isDeliveryAdvanceOrder(selectedOrder)
                              ? selectedOrder.deliveryCharge
                              : selectedOrder.totalAmount)
                          ).toLocaleString('en-BD')} was verified on ${
                            selectedOrder.paymentVerifiedAt
                              ? new Date(selectedOrder.paymentVerifiedAt).toLocaleString('en-US')
                              : 'Approved'
                          }`
                        : `Customer submitted TrxID "${selectedOrder.transactionId || 'N/A'}". Verification confirms advance funds.`}
                    </p>
                  </div>
                </div>

                {!(selectedOrder.paymentStatus === 'Verified' || selectedOrder.paymentStatus === 'Paid') && (
                  <button
                    type="button"
                    disabled={verifyingId === selectedOrder.id}
                    onClick={() => handleDirectVerify(selectedOrder.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{verifyingId === selectedOrder.id ? 'Verifying...' : 'Verify & Approve Now'}</span>
                  </button>
                )}
              </div>

              {/* Customer Profile Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Customer Contact & Shipping Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Customer Full Name</label>
                    <p className="text-xs font-black text-slate-900 mt-0.5">{selectedOrder.customerName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Mobile Number</label>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs font-black text-indigo-700 font-mono">{selectedOrder.customerMobile}</p>
                      <a
                        href={`tel:${selectedOrder.customerMobile}`}
                        className="p-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-[10px] font-bold inline-flex items-center gap-1"
                      >
                        <Phone className="w-2.5 h-2.5" />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Email Address</label>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{selectedOrder.customerEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">District / Division</label>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                      {selectedOrder.district}, {selectedOrder.division} {selectedOrder.upazila ? `(${selectedOrder.upazila})` : ''}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Full Delivery Address</label>
                    <p className="text-xs text-slate-800 font-medium mt-0.5 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
                      {selectedOrder.fullAddress}
                    </p>
                  </div>
                  {selectedOrder.deliveryInstructions && (
                    <div className="sm:col-span-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Delivery Instructions</label>
                      <p className="text-xs text-slate-600 italic mt-0.5">
                        "{selectedOrder.deliveryInstructions}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment & Financial Snapshot */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Advance Payment Financial Breakdown</span>
                </h4>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Advance Paid</span>
                    <p className="text-lg font-black text-emerald-800 mt-0.5">
                      ৳{(
                        selectedOrder.paidAmount ||
                        (isDeliveryAdvanceOrder(selectedOrder)
                          ? selectedOrder.deliveryCharge
                          : selectedOrder.totalAmount)
                      ).toLocaleString('en-BD')}
                    </p>
                    <span className="text-[9px] text-emerald-600">
                      {isFullAdvanceOrder(selectedOrder) ? '100% Upfront' : 'Delivery Fee'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Order Total</span>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      ৳{selectedOrder.totalAmount.toLocaleString('en-BD')}
                    </p>
                    <span className="text-[9px] text-slate-400">Total Billed</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-center">
                    <span className="text-[10px] font-bold text-purple-700 uppercase">Due on Delivery</span>
                    <p className="text-lg font-black text-purple-800 mt-0.5">
                      ৳{(
                        isFullAdvanceOrder(selectedOrder)
                          ? 0
                          : selectedOrder.dueAmount !== undefined
                          ? selectedOrder.dueAmount
                          : Math.max(0, selectedOrder.totalAmount - (selectedOrder.paidAmount || selectedOrder.deliveryCharge))
                      ).toLocaleString('en-BD')}
                    </p>
                    <span className="text-[9px] text-purple-600">COD Payable</span>
                  </div>
                </div>

                {/* Gateway & TrxID Info Card (Prominent Sender & TrxID Highlight) */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 border-2 border-indigo-200/80 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                    <span className="text-slate-600 font-bold">পেমেন্ট গেটওয়ে (Payment Method):</span>
                    <span className="font-extrabold text-indigo-900 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200">
                      {selectedOrder.paymentMethod}
                    </span>
                  </div>

                  {/* Sender Mobile Number */}
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-indigo-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        টাকা পাঠানোর সেন্ডার নাম্বার (Sender Mobile)
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900 mt-0.5 block">
                        {selectedOrder.senderMobileNumber || selectedOrder.customerMobile || 'N/A'}
                      </span>
                    </div>
                    {(selectedOrder.senderMobileNumber || selectedOrder.customerMobile) && (
                      <button
                        type="button"
                        onClick={() => handleCopyTrxId(selectedOrder.senderMobileNumber || selectedOrder.customerMobile!)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200"
                        title="কপি করুন"
                      >
                        {copiedTrxId === (selectedOrder.senderMobileNumber || selectedOrder.customerMobile) ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">কপি হয়েছে</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>কপি</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Transaction ID (TrxID) */}
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-indigo-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        পেমেন্ট ট্রানজেকশন আইডি (TrxID)
                      </span>
                      <span className="font-mono font-black text-sm text-indigo-700 mt-0.5 block">
                        {selectedOrder.transactionId || 'No TrxID Provided'}
                      </span>
                    </div>
                    {selectedOrder.transactionId && (
                      <button
                        type="button"
                        onClick={() => handleCopyTrxId(selectedOrder.transactionId!)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        title="TrxID কপি করুন"
                      >
                        {copiedTrxId === selectedOrder.transactionId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-white" />
                            <span>কপি হয়েছে</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>TrxID কপি</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-indigo-100 text-[11px]">
                    <span className="text-slate-500 font-medium">কুরিয়ার ডেলিভারি পার্টনার:</span>
                    <span className="font-bold text-slate-800">{selectedOrder.courierName || 'Steadfast Courier'}</span>
                  </div>
                </div>
              </div>

              {/* Ordered Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ordered Items ({selectedOrder.items?.length || 0})</span>
                </h4>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={item.productImage || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                          alt={item.productName}
                          className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{item.productName}</p>
                          {item.variant && (
                            <p className="text-[10px] text-slate-500">{item.variant}</p>
                          )}
                          <p className="text-[10px] text-slate-400">
                            Qty: {item.quantity} × ৳{item.price.toLocaleString('en-BD')}
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-slate-900 shrink-0">
                        ৳{item.total.toLocaleString('en-BD')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <div>
                {onOpenInvoice && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenInvoice(selectedOrder);
                      setSelectedOrder(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>View Full Invoice</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
