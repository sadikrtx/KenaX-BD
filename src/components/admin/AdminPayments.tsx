import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  Smartphone,
  Package,
  User,
  MapPin,
  Eye,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  RefreshCw,
  X,
  FileText,
  Truck,
  Sparkles,
  ArrowRight,
  Send,
  Building2,
  CheckCheck,
  BadgeAlert,
} from 'lucide-react';
import { Order, UserRole, StaffUser, SiteSettings } from '../../types';
import { getOptimizedImageUrl, NEUTRAL_PRODUCT_PLACEHOLDER } from '../../utils/imageOptimizer';

interface AdminPaymentsProps {
  orders: Order[];
  onVerifyPayment: (orderId: string) => void;
  onUpdateOrderStatus?: (
    orderId: string,
    status: any,
    courier?: string,
    tracking?: string,
    staff?: { id?: string; name?: string; role?: string }
  ) => void;
  onOpenInvoice?: (order: Order) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  settings?: SiteSettings;
}

export const AdminPayments: React.FC<AdminPaymentsProps> = ({
  orders,
  onVerifyPayment,
  onUpdateOrderStatus,
  onOpenInvoice,
  currentRole,
  currentStaff,
  settings,
}) => {
  // Navigation tabs for COD Payments only: 'all' | 'pending' | 'delivered' | 'cancelled'
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'delivered' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const safeOrders = Array.isArray(orders) ? orders : [];

  // Helper to strictly identify Cash on Delivery (COD) orders
  // (Excludes Full Advance & Delivery Advance orders)
  const isAdvanceOrder = (o: Order): boolean => {
    if (o.paymentOptionType === 'delivery_only' || o.paymentOptionType === 'full') return true;
    const methodLower = (o.paymentMethod || '').toLowerCase();
    if (methodLower.includes('delivery charge') || methodLower.includes('advance') || methodLower.includes('delivery only')) return true;
    if (o.paymentMethod && o.paymentMethod !== 'Cash on Delivery' && (o.transactionId || o.senderMobileNumber)) return true;
    if (o.paidAmount && o.paidAmount > 0) return true;
    return false;
  };

  const isCODOrder = (o: Order): boolean => {
    return !isAdvanceOrder(o);
  };

  // Base list of strictly Cash on Delivery orders
  const codOrders = useMemo(() => {
    return safeOrders.filter((o) => isCODOrder(o));
  }, [safeOrders]);

  // Metrics calculation
  const totalCodCount = codOrders.length;
  
  const totalCodValue = useMemo(() => {
    return codOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [codOrders]);

  const deliveredCollectedOrders = useMemo(() => {
    return codOrders.filter((o) => o.orderStatus === 'Delivered' || o.orderStatus === 'Completed' || o.paymentStatus === 'Paid');
  }, [codOrders]);

  const deliveredCollectedTotal = useMemo(() => {
    return deliveredCollectedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [deliveredCollectedOrders]);

  const pendingDeliveryOrders = useMemo(() => {
    return codOrders.filter(
      (o) =>
        o.orderStatus !== 'Delivered' &&
        o.orderStatus !== 'Completed' &&
        o.orderStatus !== 'Cancelled' &&
        o.orderStatus !== 'Returned' &&
        o.orderStatus !== 'Rejected' &&
        o.orderStatus !== 'Fake Order'
    );
  }, [codOrders]);

  const pendingDeliveryTotal = useMemo(() => {
    return pendingDeliveryOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [pendingDeliveryOrders]);

  const cancelledCodCount = useMemo(() => {
    return codOrders.filter(
      (o) => o.orderStatus === 'Cancelled' || o.orderStatus === 'Returned' || o.orderStatus === 'Rejected' || o.orderStatus === 'Fake Order'
    ).length;
  }, [codOrders]);

  // Filtered orders based on active tab and search query
  const filteredOrders = useMemo(() => {
    return codOrders
      .filter((o) => {
        if (!o) return false;

        // Search match: Order ID, Customer Name, Mobile, Product Title
        const q = searchQuery.trim().toLowerCase();
        let matchesSearch = true;
        if (q) {
          const idMatch = (o.id || '').toLowerCase().includes(q);
          const nameMatch = (o.customerName || '').toLowerCase().includes(q);
          const phoneMatch = (o.customerMobile || o.deliveryMobile || '').includes(q);
          const productMatch = (o.items || []).some((item) =>
            (item.productName || item.name || '').toLowerCase().includes(q)
          );
          matchesSearch = idMatch || nameMatch || phoneMatch || productMatch;
        }

        // Tab filter
        let matchesTab = true;
        if (activeTab === 'pending') {
          matchesTab =
            o.orderStatus !== 'Delivered' &&
            o.orderStatus !== 'Completed' &&
            o.orderStatus !== 'Cancelled' &&
            o.orderStatus !== 'Returned' &&
            o.orderStatus !== 'Rejected' &&
            o.orderStatus !== 'Fake Order';
        } else if (activeTab === 'delivered') {
          matchesTab = o.orderStatus === 'Delivered' || o.orderStatus === 'Completed' || o.paymentStatus === 'Paid';
        } else if (activeTab === 'cancelled') {
          matchesTab =
            o.orderStatus === 'Cancelled' ||
            o.orderStatus === 'Returned' ||
            o.orderStatus === 'Rejected' ||
            o.orderStatus === 'Fake Order';
        }

        return matchesSearch && matchesTab;
      })
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [codOrders, searchQuery, activeTab]);

  // Copy to clipboard helper
  const handleCopyText = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Mark COD collected / Complete Order
  const handleMarkCollected = (order: Order) => {
    if (onUpdateOrderStatus) {
      const activeStaff = currentStaff
        ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
        : undefined;
      onUpdateOrderStatus(
        order.id,
        'Completed',
        order.courierName,
        order.trackingNumber,
        activeStaff
      );
      setNotificationMsg(`✅ ক্যাশ অন ডেলিভারি অর্ডার #${order.id} এর টাকা (৳${order.totalAmount}) সংগ্রহ সম্পন্ন হয়েছে!`);
      setTimeout(() => setNotificationMsg(null), 4000);
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: 'Completed', paymentStatus: 'Paid', dueAmount: 0 } : null));
      }
    }
  };

  // Format product title & preview items
  const renderProductInfo = (order: Order) => {
    const items = order.items || [];
    if (items.length === 0) {
      return <span className="text-slate-400 italic text-xs">No product data</span>;
    }

    const firstItem = items[0];
    const firstImg = firstItem.productImage || firstItem.image || NEUTRAL_PRODUCT_PLACEHOLDER;
    const title = firstItem.productName || firstItem.name || 'Product';
    const remainingCount = items.length - 1;

    return (
      <div className="flex items-center gap-2.5 min-w-0 max-w-[260px]">
        <img
          src={getOptimizedImageUrl(firstImg, 100)}
          alt={title}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = NEUTRAL_PRODUCT_PLACEHOLDER;
          }}
          className="w-10 h-10 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 shadow-2xs"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug truncate" title={title}>
            {title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
              Qty: {firstItem.quantity || 1}
            </span>
            {firstItem.selectedSize && (
              <span className="font-medium text-slate-600 dark:text-slate-400">
                {firstItem.selectedSize}
              </span>
            )}
            {firstItem.selectedColor && (
              <span className="font-medium text-slate-600 dark:text-slate-400">
                {firstItem.selectedColor}
              </span>
            )}
            {remainingCount > 0 && (
              <span className="font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 px-1.5 py-0.2 rounded-full border border-sky-200 dark:border-sky-800 text-[9px]">
                +{remainingCount} more
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Banner / Notification Alert */}
      {notificationMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-white" />
            <span>{notificationMsg}</span>
          </div>
          <button
            onClick={() => setNotificationMsg(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* Header Title and Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Cash on Delivery (ক্যাশ অন ডেলিভারি পেমেন্টস)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                শুধুমাত্র ক্যাশ অন ডেলিভারি অর্ডারসমূহের বিল ও কালেকশন ম্যানেজমেন্ট (অ্যাডভান্স পেমেন্টের জন্য "Advance Payment" ট্যাব দেখুন)
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            <span>মোট {totalCodCount}টি COD অর্ডার</span>
          </span>
        </div>
      </div>

      {/* Top Metrics Cards (Cash on Delivery Specific) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            মোট COD অর্ডার
          </span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalCodCount} <span className="text-xs font-normal text-slate-500">টি</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">সর্বমোট বিল: ৳{totalCodValue.toLocaleString('en-BD')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            ডেলিভারিতে আদায় সম্পন্ন
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ৳{deliveredCollectedTotal.toLocaleString('en-BD')}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
            {deliveredCollectedOrders.length}টি অর্ডার ডেলিভারি ও পেইড
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            ডেলিভারিতে চলমান / পাওনা
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            ৳{pendingDeliveryTotal.toLocaleString('en-BD')}
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 block">
            {pendingDeliveryOrders.length}টি পার্সেল ডেলিভারিতে
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            বাতিল / রিটার্নড
          </span>
          <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {cancelledCodCount} <span className="text-xs font-normal text-slate-500">টি</span>
          </p>
          <span className="text-[10px] text-rose-500 mt-0.5 block">ক্যাশ কালেকশন হয়নি</span>
        </div>
      </div>

      {/* Search & Navigation Tab Filters */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              সকল COD ({totalCodCount})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              ডেলিভারি অপেক্ষমাণ ({pendingDeliveryOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('delivered')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'delivered'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              ক্যাশ আদায় সম্পন্ন ({deliveredCollectedOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              বাতিল / রিটার্ন ({cancelledCodCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px] flex-1 md:max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="অর্ডার আইডি, কাস্টমার, ফোন..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders Table (Wide Desktop Visibility & Responsive Overflow Container) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-[150px]">অর্ডার আইডি ও তারিখ</th>
                <th className="py-3 px-4 w-[220px]">কাস্টমার বিবরণ</th>
                <th className="py-3 px-4 min-w-[240px]">পণ্য সামগ্রী</th>
                <th className="py-3 px-4 w-[160px] text-right">বিল ও পেমেন্ট মেথড</th>
                <th className="py-3 px-4 w-[160px] text-center">ডেলিভারি ও ক্যাশ স্ট্যাটাস</th>
                <th className="py-3 px-4 w-[150px] text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <DollarSign className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-bold">কোনো ক্যাশ অন ডেলিভারি অর্ডার পাওয়া যায়নি</p>
                      <p className="text-[11px]">অন্য কোনো সার্চ বা ফিল্টার প্রয়োগ করে দেখুন</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isCompleted = order.orderStatus === 'Completed' || order.orderStatus === 'Delivered' || order.paymentStatus === 'Paid';
                  const isCancelled = order.orderStatus === 'Cancelled' || order.orderStatus === 'Returned' || order.orderStatus === 'Rejected';

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* 1. Order ID & Date */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 text-xs cursor-pointer"
                          >
                            <span>#{order.id}</span>
                            <Eye className="w-3 h-3 opacity-60" />
                          </button>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {order.createdAt
                                ? new Date(order.createdAt).toLocaleDateString('bn-BD', {
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'Recent'}
                            </span>
                          </p>
                          {order.courierName && (
                            <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {order.courierName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Customer Information */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {order.customerName || order.deliveryName || 'Customer'}
                          </p>
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Smartphone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-mono font-medium text-xs">
                              {order.customerMobile || order.deliveryMobile || 'N/A'}
                            </span>
                            <button
                              onClick={() => handleCopyText(order.customerMobile || order.deliveryMobile || '', `phone-${order.id}`)}
                              className="text-slate-400 hover:text-slate-600 ml-1 p-0.5"
                              title="Copy Phone"
                            >
                              {copiedId === `phone-${order.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 flex items-center gap-1" title={order.fullAddress || order.division}>
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{order.division || 'Dhaka'}, {order.district || ''}</span>
                          </p>
                        </div>
                      </td>

                      {/* 3. Products Info */}
                      <td className="py-3.5 px-4 align-top">
                        {renderProductInfo(order)}
                      </td>

                      {/* 4. Bill & Payment Method (Explicit Cash on Delivery) */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="space-y-1">
                          <p className="font-black text-slate-900 dark:text-white text-sm">
                            ৳{Number(order.totalAmount || 0).toLocaleString('en-BD')}
                          </p>
                          <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[10px] border border-amber-200 dark:border-amber-800/60">
                            Cash on Delivery (ক্যাশ অন ডেলিভারি)
                          </span>
                          <p className="text-[10px] text-slate-400">
                            কুরিয়ার চার্জ: ৳{order.deliveryCharge || 60}
                          </p>
                        </div>
                      </td>

                      {/* 5. Delivery & Collection Status */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : isCancelled
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            }`}
                          >
                            {order.orderStatus || 'Pending'}
                          </span>

                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            {isCompleted
                              ? '✓ ক্যাশ আদায় সম্পন্ন'
                              : isCancelled
                              ? '✕ পেমেন্ট বাতিল'
                              : '⏳ ডেলিভারিতে সংগ্রাহ্য'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="বিস্তারিত দেখুন"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {onOpenInvoice && (
                            <button
                              onClick={() => onOpenInvoice(order)}
                              className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition-colors cursor-pointer"
                              title="ইনভয়েস প্রিন্ট"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isCompleted && !isCancelled && (
                            <button
                              onClick={() => handleMarkCollected(order)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                              title="ক্যাশ আদায় ও সম্পন্ন হিসেবে মার্ক করুন"
                            >
                              <CheckCheck className="w-3 h-3" />
                              <span>আদায়</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Quick Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    COD অর্ডার বিবরণ #{selectedOrder.id}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    ক্যাশ অন ডেলিভারি (পেমেন্ট ডেলিভারির সময়ে সংগৃহীত হবে)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Details */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">কাস্টমার নাম:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedOrder.customerName || selectedOrder.deliveryName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">মোবাইল নাম্বার:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedOrder.customerMobile || selectedOrder.deliveryMobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">ডেলিভারি ঠিকানা:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-right max-w-[240px]">{selectedOrder.fullAddress || selectedOrder.division}</span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 space-y-2 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-slate-700 dark:text-slate-300">পেমেন্ট মেথড:</span>
                <span className="text-amber-800 dark:text-amber-300">Cash on Delivery (ক্যাশ অন ডেলিভারি)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">সাবটোটাল:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">৳{selectedOrder.subtotal || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">ডেলিভারি চার্জ:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">৳{selectedOrder.deliveryCharge || 60}</span>
              </div>
              {selectedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>ডিসকাউন্ট:</span>
                  <span>-৳{selectedOrder.discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-amber-200/60 dark:border-amber-800/60 text-sm font-black text-slate-900 dark:text-white">
                <span>সর্বমোট সংগ্রহযোগ্য ক্যাশ:</span>
                <span className="text-amber-700 dark:text-amber-400">৳{selectedOrder.totalAmount}</span>
              </div>
            </div>

            {/* Actions in Modal */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {onOpenInvoice && (
                <button
                  onClick={() => {
                    const ord = selectedOrder;
                    setSelectedOrder(null);
                    onOpenInvoice(ord);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>ইনভয়েস প্রিন্ট</span>
                </button>
              )}
              {selectedOrder.orderStatus !== 'Completed' && selectedOrder.orderStatus !== 'Delivered' && (
                <button
                  onClick={() => {
                    handleMarkCollected(selectedOrder);
                    setSelectedOrder(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>ক্যাশ আদায় সম্পন্ন মার্ক করুন</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
