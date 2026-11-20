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
  Phone,
} from 'lucide-react';
import { Order, UserRole, StaffUser, SiteSettings } from '../../types';
import { getOptimizedImageUrl, NEUTRAL_PRODUCT_PLACEHOLDER } from '../../utils/imageOptimizer';
import { ClickableOrderId } from '../common/ClickableOrderId';
import { OrderSourceBadge } from '../common/OrderSourceBadge';
import { OrderTimeBadge } from '../common/OrderTimeBadge';
import { useLanguage } from '../../context/LanguageContext';
import { SaasBarChart, SaasDonutChart, SaasLineAreaChart, CollapsibleAnalyticsPanel } from './charts/AdminCharts';

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
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // Navigation tabs for COD Payments only: 'all' | 'pending' | 'delivered' | 'cancelled'
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'delivered' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const safeOrders = Array.isArray(orders) ? orders : [];

  // Helper to strictly identify Cash on Delivery (COD) orders
  // (Excludes Full Advance & Delivery Advance orders)
  const isAdvanceOrder = (o: Order): boolean => {
    if (o.paymentOptionType === 'delivery_only' || o.paymentOptionType === 'full') return true;
    const methodLower = (o.paymentMethod || '').toLowerCase();
    if (
      methodLower.includes('delivery charge') ||
      methodLower.includes('advance') ||
      methodLower.includes('delivery only')
    )
      return true;
    if (o.paymentMethod && o.paymentMethod !== 'Cash on Delivery' && (o.transactionId || o.senderMobileNumber))
      return true;
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

  const totalCodDeliveryCharge = useMemo(() => {
    return codOrders.reduce((sum, o) => sum + (o.deliveryCharge || 0), 0);
  }, [codOrders]);

  const deliveredCollectedOrders = useMemo(() => {
    return codOrders.filter(
      (o) => o.orderStatus === 'Delivered' || o.orderStatus === 'Completed' || o.paymentStatus === 'Paid'
    );
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
      (o) =>
        o.orderStatus === 'Cancelled' ||
        o.orderStatus === 'Returned' ||
        o.orderStatus === 'Rejected' ||
        o.orderStatus === 'Fake Order'
    ).length;
  }, [codOrders]);

  const codAnalytics = useMemo(() => {
    const cancelledValue = codOrders
      .filter(
        (o) =>
          o.orderStatus === 'Cancelled' ||
          o.orderStatus === 'Returned' ||
          o.orderStatus === 'Rejected' ||
          o.orderStatus === 'Fake Order'
      )
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const statusSlices = [
      { id: 'delivered', label: isBn ? 'আদায় সম্পন্ন' : 'Collected / Paid', value: deliveredCollectedTotal, color: '#059669' },
      { id: 'pending', label: isBn ? 'ডেলিভারিতে বাকি' : 'Pending Collection', value: pendingDeliveryTotal, color: '#D97706' },
      { id: 'cancelled', label: isBn ? 'বাতিল / রিটার্ন' : 'Cancelled / Returned', value: cancelledValue, color: '#E11D48' },
    ];

    const dailyMap = new Map<string, { label: string; ts: number; amount: number; count: number }>();
    codOrders.forEach((o) => {
      const dt = o.createdAt ? new Date(o.createdAt) : null;
      if (!dt || isNaN(dt.getTime())) return;
      const key = dt.toISOString().slice(0, 10);
      const label = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const prev = dailyMap.get(key) || { label, ts: dt.getTime(), amount: 0, count: 0 };
      prev.amount += o.totalAmount || 0;
      prev.count += 1;
      dailyMap.set(key, prev);
    });

    const dailyTrend = Array.from(dailyMap.values())
      .sort((a, b) => a.ts - b.ts)
      .slice(-10)
      .map((d) => ({
        label: d.label,
        primary: d.amount,
        secondary: d.count,
      }));

    const districtMap = new Map<string, { value: number; count: number }>();
    codOrders.forEach((o) => {
      const rawLoc =
        o.district ||
        (typeof o.deliveryAddress === 'object' ? (o.deliveryAddress as any)?.district : '') ||
        o.division ||
        'Dhaka';
      const loc = (rawLoc || 'Dhaka').trim() || 'Dhaka';
      const prev = districtMap.get(loc) || { value: 0, count: 0 };
      prev.value += o.totalAmount || 0;
      prev.count += 1;
      districtMap.set(loc, prev);
    });

    const regionBars = Array.from(districtMap.entries())
      .map(([label, d]) => ({
        id: label,
        label,
        value: d.value,
        hint: `${d.count} ${isBn ? 'টি' : 'orders'}`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return { statusSlices, dailyTrend, regionBars };
  }, [codOrders, deliveredCollectedTotal, pendingDeliveryTotal, isBn]);

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
          const nameMatch = (o.customerName || o.deliveryName || '').toLowerCase().includes(q);
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

  // Mark COD collected / Complete Order
  const handleMarkCollected = (order: Order) => {
    if (onUpdateOrderStatus) {
      const activeStaff = currentStaff
        ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
        : undefined;
      onUpdateOrderStatus(order.id, 'Completed', order.courierName, order.trackingNumber, activeStaff);
      const msg = isBn
        ? `ক্যাশ অন ডেলিভারি অর্ডার #${order.id} এর টাকা (৳${order.totalAmount}) সংগ্রহ সম্পন্ন হয়েছে!`
        : `Cash on delivery order #${order.id} payment (৳${order.totalAmount}) has been marked as collected!`;
      setNotificationMsg(msg);
      setTimeout(() => setNotificationMsg(null), 4000);
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, orderStatus: 'Completed', paymentStatus: 'Paid', dueAmount: 0 } : null
        );
      }
    }
  };

  // Format product title & preview items
  const renderProductInfo = (order: Order) => {
    const items = order.items || [];
    if (items.length === 0) {
      return (
        <span className="text-slate-400 italic text-xs">
          {isBn ? 'কোনো পণ্যের তথ্য নেই' : 'No product data'}
        </span>
      );
    }

    const firstItem = items[0];
    const firstImg = firstItem.productImage || firstItem.image || NEUTRAL_PRODUCT_PLACEHOLDER;
    const title = firstItem.productName || firstItem.name || (isBn ? 'পণ্য' : 'Product');
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
              {isBn ? 'পরিমাণ:' : 'Qty:'} {firstItem.quantity || 1}
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
                +{remainingCount} {isBn ? 'আরও' : 'more'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 w-full overflow-x-hidden">
      {/* Top Banner / Notification Alert */}
      {notificationMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-white" />
            <span>{notificationMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* Header Title and Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {isBn ? 'ক্যাশ অন ডেলিভারি পেমেন্টস' : 'Cash on Delivery Payments'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isBn
                  ? 'ক্যাশ অন ডেলিভারি অর্ডারসমূহের বিল ও কালেকশন ব্যবস্থাপনা'
                  : 'Manage billing and payment collections for cash on delivery shipments'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            <span>
              {isBn ? `মোট ${totalCodCount}টি অর্ডার` : `Total ${totalCodCount} Orders`}
            </span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/80 text-sky-800 dark:text-sky-300 font-bold text-xs flex items-center gap-1.5">
            <span>
              {isBn ? `ডেলিভারি চার্জ: ৳${totalCodDeliveryCharge.toLocaleString()}` : `Delivery: ৳${totalCodDeliveryCharge.toLocaleString()}`}
            </span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>
              {isBn ? `আদায় সম্পূর্ণ: ৳${deliveredCollectedTotal.toLocaleString()}` : `Collected: ৳${deliveredCollectedTotal.toLocaleString()}`}
            </span>
          </span>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {isBn ? 'মোট ক্যাশ অন ডেলিভারি' : 'Total COD Orders'}
          </span>
          <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {totalCodCount} <span className="text-xs font-normal text-slate-500">{isBn ? 'টি' : ''}</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            {isBn ? 'সর্বমোট বিল:' : 'Total Value:'} ৳{totalCodValue.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {isBn ? 'মোট ডেলিভারি চার্জ' : 'Total Delivery Charge'}
          </span>
          <p className="text-lg sm:text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
            ৳{totalCodDeliveryCharge.toLocaleString()}
          </p>
          <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-0.5 block truncate">
            {isBn ? 'ক্যাশ অন ডেলিভারি শিপিং' : 'COD Shipping Charge'}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {isBn ? 'ক্যাশ আদায় সম্পূর্ণ' : 'COD Collected Total'}
          </span>
          <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ৳{deliveredCollectedTotal.toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block truncate">
            {isBn
              ? `${deliveredCollectedOrders.length}টি অর্ডার পেইড / কমপ্লিট`
              : `${deliveredCollectedOrders.length} orders collected`}
          </span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {isBn ? 'চলমান / ডেলিভারিতে বাকি' : 'In Transit / Pending Due'}
          </span>
          <p className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            ৳{pendingDeliveryTotal.toLocaleString()}
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 block truncate">
            {isBn
              ? `${pendingDeliveryOrders.length}টি পার্সেল চলমান`
              : `${pendingDeliveryOrders.length} parcels in transit`}
          </span>
        </div>
      </div>

      <CollapsibleAnalyticsPanel
        title={isBn ? 'ক্যাশ অন ডেলিভারি অ্যানালিটিক্স ও চার্ট' : 'COD Payment & Collection Analytics'}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SaasDonutChart
            title={isBn ? 'COD কালেকশন অবস্থা' : 'COD Collection Split'}
            subtitle={isBn ? 'স্লাইসে ক্লিক করে ফিল্টার করুন' : 'Click slice to filter status'}
            data={codAnalytics.statusSlices}
            valueFormat="currency"
            centerLabel={isBn ? 'মোট COD' : 'COD Value'}
            onSelectSlice={(item) => {
              if (item.id === 'delivered' || item.id === 'pending' || item.id === 'cancelled') {
                setActiveTab((prev) => (prev === item.id ? 'all' : (item.id as 'delivered' | 'pending' | 'cancelled')));
              }
            }}
          />
          <SaasLineAreaChart
            title={isBn ? 'দৈনিক COD বিলিং ট্রেন্ড' : 'Daily COD Billing Trend'}
            subtitle={isBn ? 'সর্বশেষ অ্যাক্টিভ দিনসমূহ' : 'Billing volume & order count'}
            data={codAnalytics.dailyTrend}
            primaryLabel={isBn ? 'বিলিং (৳)' : 'Amount (৳)'}
            secondaryLabel={isBn ? 'অর্ডার' : 'Orders'}
            primaryFormat="currency"
            secondaryFormat="number"
            primaryColor="#D97706"
            secondaryColor="#059669"
          />
          <SaasBarChart
            title={isBn ? 'জেলা / অঞ্চল অনুযায়ী COD' : 'Top Regions by COD Value'}
            subtitle={isBn ? 'অঞ্চলভিত্তিক মোট প্রাপ্য' : 'Click bar to search region'}
            data={codAnalytics.regionBars}
            valueFormat="currency"
            orientation="horizontal"
            barColor="#EA580C"
          />
        </div>
      </CollapsibleAnalyticsPanel>

      {/* Search & Navigation Tab Filters */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs - Scrollable with hidden scrollbar */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isBn ? `সকল (${totalCodCount})` : `All (${totalCodCount})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isBn ? `অপেক্ষমাণ (${pendingDeliveryOrders.length})` : `Pending (${pendingDeliveryOrders.length})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('delivered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'delivered'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isBn ? `আদায় সম্পন্ন (${deliveredCollectedOrders.length})` : `Collected (${deliveredCollectedOrders.length})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cancelled')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isBn ? `বাতিল / রিটার্ন (${cancelledCodCount})` : `Cancelled (${cancelledCodCount})`}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBn ? 'অর্ডার আইডি, কাস্টমার, ফোন...' : 'Search Order ID, name, phone...'}
              className="w-full pl-9 pr-7 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-amber-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. DESKTOP VIEW: Full Table (Hidden on Mobile)                 */}
      {/* ============================================================== */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-[150px]">{isBn ? 'অর্ডার আইডি ও তারিখ' : 'Order ID & Date'}</th>
                <th className="py-3 px-4 w-[220px]">{isBn ? 'গ্রাহকের বিবরণ' : 'Customer Info'}</th>
                <th className="py-3 px-4 min-w-[220px]">{isBn ? 'পণ্য সামগ্রী' : 'Ordered Items'}</th>
                <th className="py-3 px-4 w-[160px] text-right">{isBn ? 'বিল ও মাধ্যম' : 'Bill & Method'}</th>
                <th className="py-3 px-4 w-[150px] text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                <th className="py-3 px-4 w-[130px] text-center">{isBn ? 'অ্যাকশন' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <DollarSign className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-bold">
                        {isBn ? 'কোনো ক্যাশ অন ডেলিভারি অর্ডার পাওয়া যায়নি' : 'No Cash on Delivery orders found'}
                      </p>
                      <p className="text-[11px]">
                        {isBn ? 'অন্য কোনো ফিল্টার প্রয়োগ করে দেখুন' : 'Try adjusting your search or tab filters'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isCompleted =
                    order.orderStatus === 'Completed' ||
                    order.orderStatus === 'Delivered' ||
                    order.paymentStatus === 'Paid';
                  const isCancelled =
                    order.orderStatus === 'Cancelled' ||
                    order.orderStatus === 'Returned' ||
                    order.orderStatus === 'Rejected' ||
                    order.orderStatus === 'Fake Order';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* 1. Order ID & Date & Source */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5">
                          {/* Order ID: Click directly to copy without any separate copy button */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <ClickableOrderId
                              orderId={order.id}
                              className="font-mono font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 text-xs cursor-pointer inline-flex items-center"
                            />
                            <OrderSourceBadge order={order} compact />
                          </div>
                          <div>
                            <OrderTimeBadge dateStr={order.createdAt} />
                          </div>
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
                            {order.customerName || order.deliveryName || (isBn ? 'গ্রাহক' : 'Customer')}
                          </p>
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Smartphone className="w-3 h-3 text-slate-400 shrink-0" />
                            <a
                              href={`tel:${order.customerMobile || order.deliveryMobile}`}
                              className="font-mono font-medium text-xs hover:text-sky-600 hover:underline"
                            >
                              {order.customerMobile || order.deliveryMobile || 'N/A'}
                            </a>
                          </div>
                          <p
                            className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 flex items-center gap-1"
                            title={order.fullAddress || order.deliveryAddress || order.division}
                          >
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {order.district ? `${order.district}, ` : ''}
                              {order.division || 'Dhaka'}
                            </span>
                          </p>
                        </div>
                      </td>

                      {/* 3. Products Info */}
                      <td className="py-3.5 px-4 align-top">{renderProductInfo(order)}</td>

                      {/* 4. Bill & Payment Method */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="space-y-1">
                          <p className="font-black text-slate-900 dark:text-white text-sm">
                            ৳{Number(order.totalAmount || 0).toLocaleString()}
                          </p>
                          <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[10px] border border-amber-200 dark:border-amber-800/60">
                            {isBn ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery'}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {isBn ? 'চার্জ:' : 'Delivery:'} ৳{order.deliveryCharge || 60}
                          </p>
                        </div>
                      </td>

                      {/* 5. Delivery & Collection Status */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
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
                              ? (isBn ? '✓ আদায় সম্পন্ন' : '✓ Paid & Collected')
                              : isCancelled
                              ? (isBn ? '✕ বাতিল' : '✕ Cancelled')
                              : (isBn ? '⏳ সংগ্রাহ্য' : '⏳ Due on Delivery')}
                          </span>
                        </div>
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title={isBn ? 'বিস্তারিত দেখুন' : 'View Details'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {onOpenInvoice && (
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(order)}
                              className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 hover:bg-sky-100 transition-colors cursor-pointer"
                              title={isBn ? 'ইনভয়েস' : 'Invoice'}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isCompleted && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleMarkCollected(order)}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                              title={isBn ? 'ক্যাশ আদায় সম্পন্ন চিহ্নিত করুন' : 'Mark cash collected'}
                            >
                              <CheckCheck className="w-3 h-3" />
                              <span>{isBn ? 'আদায়' : 'Collect'}</span>
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

      {/* ============================================================== */}
      {/* 2. MOBILE VIEW: 100% Responsive Cards (Zero Horizontal Scroll) */}
      {/* ============================================================== */}
      <div className="md:hidden space-y-3 w-full">
        {filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
            <DollarSign className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
              {isBn ? 'কোনো ক্যাশ অন ডেলিভারি অর্ডার পাওয়া যায়নি' : 'No Cash on Delivery orders found'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isCompleted =
              order.orderStatus === 'Completed' ||
              order.orderStatus === 'Delivered' ||
              order.paymentStatus === 'Paid';
            const isCancelled =
              order.orderStatus === 'Cancelled' ||
              order.orderStatus === 'Returned' ||
              order.orderStatus === 'Rejected' ||
              order.orderStatus === 'Fake Order';
            const firstItem = order.items?.[0];
            const firstImg = firstItem?.productImage || firstItem?.image || NEUTRAL_PRODUCT_PLACEHOLDER;
            const itemTitle = firstItem?.productName || firstItem?.name || (isBn ? 'পণ্য' : 'Product');
            const remainingCount = (order.items?.length || 1) - 1;

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-3 shadow-2xs w-full overflow-hidden"
              >
                {/* Header Row: Order ID (Click to Copy) + Source + Status */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <ClickableOrderId
                      orderId={order.id}
                      className="font-mono font-black text-amber-600 dark:text-amber-400 hover:text-amber-700 text-xs shrink-0 cursor-pointer"
                    />
                    <OrderSourceBadge order={order} compact />
                    <OrderTimeBadge dateStr={order.createdAt} />
                  </div>

                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : isCancelled
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                    }`}
                  >
                    {order.orderStatus || 'Pending'}
                  </span>
                </div>

                {/* Customer Information */}
                <div className="flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900 dark:text-white truncate">
                      {order.customerName || order.deliveryName || (isBn ? 'গ্রাহক' : 'Customer')}
                    </p>
                    <a
                      href={`tel:${order.customerMobile || order.deliveryMobile}`}
                      className="font-mono text-slate-600 dark:text-slate-400 hover:text-sky-600 flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{order.customerMobile || order.deliveryMobile || 'N/A'}</span>
                    </a>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      ৳{Number(order.totalAmount || 0).toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                      {isCompleted
                        ? (isBn ? '✓ আদায় হয়েছে' : '✓ Paid')
                        : isCancelled
                        ? (isBn ? '✕ বাতিল' : '✕ Cancelled')
                        : (isBn ? '⏳ বাকি ক্যাশ' : '⏳ Due COD')}
                    </span>
                  </div>
                </div>

                {/* Product Preview */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                  <img
                    src={getOptimizedImageUrl(firstImg, 80)}
                    alt={itemTitle}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = NEUTRAL_PRODUCT_PLACEHOLDER;
                    }}
                    className="w-9 h-9 rounded-lg object-cover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {itemTitle}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                      <span>{isBn ? 'পরিমাণ:' : 'Qty:'} {firstItem?.quantity || 1}</span>
                      {firstItem?.selectedColor && <span>• {firstItem.selectedColor}</span>}
                      {firstItem?.selectedSize && <span>• {firstItem.selectedSize}</span>}
                      {remainingCount > 0 && (
                        <span className="text-sky-600 font-bold">
                          (+{remainingCount} {isBn ? 'আরও' : 'more'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Address & Delivery Charge Info */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <span className="truncate max-w-[200px] flex items-center gap-1" title={order.fullAddress || order.deliveryAddress}>
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{order.fullAddress || order.deliveryAddress || `${order.district || ''}, ${order.division || 'Dhaka'}`}</span>
                  </span>
                  <span className="shrink-0 font-medium">
                    {isBn ? 'ডেলিভারি চার্জ:' : 'Delivery Fee:'} ৳{order.deliveryCharge || 60}
                  </span>
                </div>

                {/* Mobile Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isBn ? 'বিস্তারিত' : 'View'}</span>
                  </button>

                  {onOpenInvoice ? (
                    <button
                      type="button"
                      onClick={() => onOpenInvoice(order)}
                      className="py-1.5 px-2 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer border border-sky-200 dark:border-sky-800"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{isBn ? 'ইনভয়েস' : 'Invoice'}</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {!isCompleted && !isCancelled ? (
                    <button
                      type="button"
                      onClick={() => handleMarkCollected(order)}
                      className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>{isBn ? 'আদায়' : 'Collect'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {isCompleted ? (isBn ? '✓ পরিশোধিত' : '✓ Paid') : (isBn ? 'বাতিল' : 'Cancelled')}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. Order Quick Details Modal                                   */}
      {/* ============================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{isBn ? 'অর্ডার বিবরণ' : 'Order Details'}</span>
                    <ClickableOrderId
                      orderId={selectedOrder.id}
                      className="font-mono font-bold text-amber-600 dark:text-amber-400"
                    />
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isBn
                      ? 'ক্যাশ অন ডেলিভারি (ডেলিভারির সময়ে সংগৃহীত হবে)'
                      : 'Cash on Delivery (Payment collected at doorstep)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Details */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isBn ? 'গ্রাহকের নাম:' : 'Customer Name:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedOrder.customerName || selectedOrder.deliveryName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isBn ? 'মোবাইল নম্বর:' : 'Phone Number:'}</span>
                <a
                  href={`tel:${selectedOrder.customerMobile || selectedOrder.deliveryMobile}`}
                  className="font-mono font-bold text-slate-900 dark:text-white hover:text-sky-600 hover:underline"
                >
                  {selectedOrder.customerMobile || selectedOrder.deliveryMobile}
                </a>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isBn ? 'ডেলিভারি ঠিকানা:' : 'Delivery Address:'}</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-right max-w-[240px]">
                  {selectedOrder.fullAddress || selectedOrder.deliveryAddress || selectedOrder.division}
                </span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 space-y-2 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-slate-700 dark:text-slate-300">{isBn ? 'পেমেন্ট মাধ্যম:' : 'Payment Method:'}</span>
                <span className="text-amber-800 dark:text-amber-300">
                  {isBn ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isBn ? 'সাবটোটাল:' : 'Subtotal:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  ৳{selectedOrder.subtotal?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isBn ? 'ডেলিভারি চার্জ:' : 'Delivery Fee:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  ৳{selectedOrder.deliveryCharge?.toLocaleString() || 60}
                </span>
              </div>
              {selectedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>{isBn ? 'ছাড়:' : 'Discount:'}</span>
                  <span>-৳{selectedOrder.discountAmount?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-amber-200/60 dark:border-amber-800/60 text-sm font-black text-slate-900 dark:text-white">
                <span>{isBn ? 'সর্বমোট আদায়যোগ্য ক্যাশ:' : 'Total Payable Cash:'}</span>
                <span className="text-amber-700 dark:text-amber-400">
                  ৳{selectedOrder.totalAmount?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions in Modal */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {onOpenInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    const ord = selectedOrder;
                    setSelectedOrder(null);
                    onOpenInvoice(ord);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isBn ? 'ইনভয়েস' : 'Invoice'}</span>
                </button>
              )}
              {selectedOrder.orderStatus !== 'Completed' && selectedOrder.orderStatus !== 'Delivered' && (
                <button
                  type="button"
                  onClick={() => {
                    handleMarkCollected(selectedOrder);
                    setSelectedOrder(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{isBn ? 'আদায় সম্পন্ন মার্ক করুন' : 'Mark Cash Collected'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
