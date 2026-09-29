import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  DollarSign,
  ChevronRight,
  Phone,
  Printer,
  Copy,
  Plus,
  ArrowUpRight,
  Package,
  AlertCircle,
  MapPin,
  Calendar,
  ShieldCheck,
  RotateCcw,
  XCircle,
  Check,
  Layers,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { ResellerUser } from '../../types/reseller';

interface ResellerActiveSalesPanelProps {
  orders: Order[];
  reseller: ResellerUser;
  lang?: 'bn' | 'en';
  onCreateOrderClick: () => void;
  onOpenInvoiceModal: (order: Order) => void;
  onNavigateToCatalog: () => void;
}

export const ResellerActiveSalesPanel: React.FC<ResellerActiveSalesPanelProps> = ({
  orders,
  reseller,
  lang = 'bn',
  onCreateOrderClick,
  onOpenInvoiceModal,
  onNavigateToCatalog,
}) => {
  const isBn = lang === 'bn';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'confirmed' | 'processing' | 'picked_ready' | 'shipped' | 'delivered' | 'returned' | 'cancelled'
  >('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter reseller orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerMobile.includes(searchQuery) ||
        (o.items && o.items[0]?.name.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchStatus = true;
      if (statusFilter === 'pending') {
        matchStatus = o.orderStatus === 'Pending';
      } else if (statusFilter === 'confirmed') {
        matchStatus = o.orderStatus === 'Confirmed';
      } else if (statusFilter === 'processing') {
        matchStatus = o.orderStatus === 'Processing';
      } else if (statusFilter === 'picked_ready') {
        matchStatus = (o as any).statusStage === 'picked' || (o as any).statusStage === 'ready';
      } else if (statusFilter === 'shipped') {
        matchStatus = o.orderStatus === 'Shipped';
      } else if (statusFilter === 'delivered') {
        matchStatus = o.orderStatus === 'Delivered';
      } else if (statusFilter === 'returned') {
        matchStatus = o.orderStatus === 'Returned';
      } else if (statusFilter === 'cancelled') {
        matchStatus = o.orderStatus === 'Cancelled';
      }

      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Aggregate stats
  const totalSalesAmount = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [orders]);

  const totalEarnedProfit = useMemo(() => {
    return orders.reduce((sum, o) => {
      const profit = (o as any).resellerProfit || Math.round(o.totalAmount * 0.15);
      return sum + profit;
    }, 0);
  }, [orders]);

  const deliveredCount = orders.filter((o) => o.orderStatus === 'Delivered').length;
  const inTransitCount = orders.filter((o) => o.orderStatus === 'Shipped' || o.orderStatus === 'Processing' || o.orderStatus === 'Confirmed').length;
  const pendingCount = orders.filter((o) => o.orderStatus === 'Pending').length;
  const confirmedCount = orders.filter((o) => o.orderStatus === 'Confirmed').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {isBn ? 'অ্যাক্টিভ সেলস ও অর্ডার ম্যানেজমেন্ট' : 'Active Sales & Order Tracking'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {isBn ? 'ড্রপশিপিং লাইভ ট্র্যাকিং' : 'Live Dropshipping'}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {isBn
              ? 'কাস্টমারদের জন্য প্লেস করা অর্ডার ট্র্যাক করুন, কুরিয়ার ও প্যাকেজিং স্ট্যাটাস দেখুন এবং নিট প্রফিট বুঝে নিন।'
              : 'Track dropship customer orders, check packaging and courier progress, and view verified profits.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateOrderClick}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isBn ? 'নতুন ড্রপশিপ অর্ডার তৈরি করুন' : 'Create Dropship Order'}</span>
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">
            <span>{isBn ? 'সর্বমোট অর্ডার' : 'Total Orders'}</span>
            <ShoppingBag className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{orders.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {isBn ? `পেন্ডিং: ${pendingCount} • কনফার্মড: ${confirmedCount}` : `Pending: ${pendingCount} • Confirmed: ${confirmedCount}`}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">
            <span>{isBn ? 'প্রসেসিং ও কুরিয়ারে' : 'In Transit / Processing'}</span>
            <Truck className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">{inTransitCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {isBn ? 'ডেলিভারি প্রক্রিয়ায় রয়েছে' : 'Active dispatch flow'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">
            <span>{isBn ? 'সফলভাবে ডেলিভারড' : 'Delivered & Earned'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{deliveredCount}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {isBn ? 'ওয়ালেটে প্রফিট জমা হয়েছে' : 'Profits credited to wallet'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">
            <span>{isBn ? 'মোট উপার্জিত লাভ' : 'Total Reseller Profit'}</span>
            <DollarSign className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            ৳{totalEarnedProfit.toLocaleString('en-BD')}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {isBn ? `মোট সেলস: ৳${totalSalesAmount.toLocaleString('en-BD')}` : `Total Sales: ৳${totalSalesAmount.toLocaleString('en-BD')}`}
          </p>
        </div>
      </div>

      {/* Read-Only Status Notice */}
      <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>
          {isBn ? (
            <>
              <strong>লাইভ অটোমেশন ট্র্যাকিং:</strong> অর্ডারের কনফার্মেশন, প্যাকেজিং, পিকিং ও ডেলিভারি স্ট্যাটাস কেনাবেচা বিডি সেন্ট্রাল অটোমেশন দ্বারা পরিচালিত হয়।
            </>
          ) : (
            <>
              <strong>Central Tracking:</strong> Order confirmation, packing, picking, and delivery stages are automated by the KenaX BD logistics hub.
            </>
          )}
        </span>
      </div>

      {/* Filter and Search Bar with Distinct Pending & Confirmed Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isBn ? 'কাস্টমারের নাম, ফোন বা অর্ডার আইডি খুঁজুন...' : 'Search customer name, phone, or order ID...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        {/* Separate Filters for Pending, Confirmed, Picked & Ready, etc. */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none pb-1 md:pb-0">
          {[
            { id: 'all', labelBn: 'সব অর্ডার', labelEn: 'All' },
            { id: 'pending', labelBn: 'পেন্ডিং', labelEn: 'Pending' },
            { id: 'confirmed', labelBn: 'কনফার্মড', labelEn: 'Confirmed' },
            { id: 'processing', labelBn: 'প্রসেসিং', labelEn: 'Processing' },
            { id: 'picked_ready', labelBn: 'পিকড ও রেডি', labelEn: 'Picked & Ready' },
            { id: 'shipped', labelBn: 'কুরিয়ারে', labelEn: 'In Courier' },
            { id: 'delivered', labelBn: 'ডেলিভারড', labelEn: 'Delivered' },
            { id: 'returned', labelBn: 'রিটার্নড', labelEn: 'Returned' },
            { id: 'cancelled', labelBn: 'বাতিল', labelEn: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
              }`}
            >
              {isBn ? tab.labelBn : tab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <ShoppingBag className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {isBn ? 'কোনো অর্ডার পাওয়া যায়নি' : 'No orders found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? isBn ? 'আপনার সার্চ কিওয়ার্ড পরিবর্তন করে পুনরায় চেষ্টা করুন।' : 'Try changing your search terms or filter selection.'
              : isBn ? 'হোলসেল ক্যাটালগ থেকে আপনার প্রথম ড্রপশিপিং অর্ডার তৈরি করুন!' : 'Browse our wholesale catalog to create your first dropshipping order!'}
          </p>
          <button
            type="button"
            onClick={onNavigateToCatalog}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span>{isBn ? 'হোলসেল ক্যাটালগ ব্রাউজ করুন' : 'Browse Wholesale Catalog'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const item = order.items && order.items[0];
            const profit = (order as any).resellerProfit || Math.round(order.totalAmount * 0.15);
            const courier = order.courierName || 'KenaX Steadfast Express';

            // Calculate active pipeline stage (1 to 6)
            // 1: Order Placed, 2: Confirmed, 3: Processing, 4: Picked, 5: Ready for Courier, 6: In Transit, 7: Delivered
            let stageNumber = 1;
            if (order.orderStatus === 'Confirmed') stageNumber = 2;
            if (order.orderStatus === 'Processing') stageNumber = 3;
            if ((order as any).statusStage === 'picked') stageNumber = 4;
            if ((order as any).statusStage === 'ready') stageNumber = 5;
            if (order.orderStatus === 'Shipped') stageNumber = 6;
            if (order.orderStatus === 'Delivered') stageNumber = 7;

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 hover:border-emerald-500/50 transition-all shadow-xs"
              >
                {/* Header: ID, Date, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                      #{order.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(order.id, order.id)}
                      className="text-slate-500 hover:text-slate-300 text-[10px] flex items-center gap-1 cursor-pointer"
                      title={isBn ? 'অর্ডার আইডি কপি করুন' : 'Copy Order ID'}
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedId === order.id ? (isBn ? 'কপি হয়েছে' : 'Copied!') : (isBn ? 'কপি' : 'Copy')}</span>
                    </button>
                    <span className="text-[11px] text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wide ${
                        order.orderStatus === 'Delivered'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : order.orderStatus === 'Cancelled'
                          ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : order.orderStatus === 'Returned'
                          ? 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                          : order.orderStatus === 'Shipped'
                          ? 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                          : order.orderStatus === 'Confirmed'
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {isBn
                        ? order.orderStatus === 'Pending'
                          ? 'পেন্ডিং'
                          : order.orderStatus === 'Confirmed'
                          ? 'কনফার্মড'
                          : order.orderStatus === 'Processing'
                          ? 'প্রসেসিং'
                          : order.orderStatus === 'Shipped'
                          ? 'কুরিয়ারে শিপড'
                          : order.orderStatus === 'Delivered'
                          ? 'ডেলিভারড'
                          : order.orderStatus === 'Returned'
                          ? 'রিটার্নড'
                          : 'বাতিল'
                        : order.orderStatus}
                    </span>

                    <button
                      type="button"
                      onClick={() => onOpenInvoiceModal(order)}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title={isBn ? 'হোয়াইট-লেবেল ইনভয়েস প্রিন্ট করুন' : 'Print White-label Invoice'}
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">{isBn ? 'ইনভয়েস রসিদ' : 'Invoice Slip'}</span>
                    </button>
                  </div>
                </div>

                {/* Main Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Product Info */}
                  <div className="md:col-span-5 flex items-center gap-3">
                    {item?.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 rounded-2xl object-cover bg-slate-950 border border-slate-800 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-slate-600" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-xs truncate">{item?.name || 'Retail Product'}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isBn ? 'পরিমাণ:' : 'Qty:'} <strong>{item?.quantity || 1}</strong> • {isBn ? 'কালার:' : 'Color:'} {item?.selectedColor || (isBn ? 'স্ট্যান্ডার্ড' : 'Default')}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {isBn ? 'কুরিয়ার পার্টনার:' : 'Courier:'} {courier}
                      </p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="md:col-span-4 text-xs space-y-1">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span>{order.customerName}</span>
                      <a
                        href={`tel:${order.customerMobile}`}
                        className="text-emerald-400 hover:text-emerald-300 p-0.5"
                        title={isBn ? 'কাস্টমারকে কল করুন' : 'Call Customer'}
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">{order.customerMobile}</p>
                    <p className="text-[10px] text-slate-500 truncate max-w-xs">
                      {order.fullAddress || `${order.area || ''}, ${order.district}`}
                    </p>
                  </div>

                  {/* Financials & Reseller Profit */}
                  <div className="md:col-span-3 text-right bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">
                      {isBn ? 'কাস্টমার COD মূল্য' : 'Customer COD Price'}
                    </p>
                    <p className="text-sm font-black text-white tabular-nums">
                      ৳{order.totalAmount.toLocaleString('en-BD')}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1 pt-1 border-t border-slate-800/60">
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {isBn ? 'আপনার প্রফিট:' : 'Your Profit:'}
                      </span>
                      <span className="text-xs font-black text-emerald-400 tabular-nums">
                        +৳{profit.toLocaleString('en-BD')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Complete 6/7-Stage Delivery Pipeline Tracker */}
                {order.orderStatus !== 'Cancelled' && order.orderStatus !== 'Returned' && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <p className="text-[10px] font-bold text-slate-400 mb-1.5">
                      {isBn ? 'ডেলিভারি পাইপলাইন স্ট্যাটাস:' : 'Delivery Pipeline Stage:'}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px] text-center font-bold">
                      {/* Stage 1: Order Placed */}
                      <div
                        className={`p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 ${
                          stageNumber >= 1
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-slate-950 text-slate-500'
                        }`}
                      >
                        <span>1. {isBn ? 'প্লেসড' : 'Placed'}</span>
                      </div>

                      {/* Stage 2: Confirmed */}
                      <div
                        className={`p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 ${
                          stageNumber >= 2
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-slate-950 text-slate-500'
                        }`}
                      >
                        <span>2. {isBn ? 'কনফার্মড' : 'Confirmed'}</span>
                      </div>

                      {/* Stage 3: Processing */}
                      <div
                        className={`p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 ${
                          stageNumber >= 3
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-slate-950 text-slate-500'
                        }`}
                      >
                        <span>3. {isBn ? 'প্রসেসিং' : 'Processing'}</span>
                      </div>

                      {/* Stage 4: Picked & Ready */}
                      <div
                        className={`p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 ${
                          stageNumber >= 4
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-slate-950 text-slate-500'
                        }`}
                      >
                        <span>4. {isBn ? 'পিকড ও রেডি' : 'Picked/Ready'}</span>
                      </div>

                      {/* Stage 5: In Transit */}
                      <div
                        className={`p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 ${
                          stageNumber >= 6
                            ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
                            : 'bg-slate-950 text-slate-500'
                        }`}
                      >
                        <span>5. {isBn ? 'কুরিয়ারে শিপড' : 'In Transit'}</span>
                      </div>

                      {/* Stage 6: Delivered */}
                      <div
                        className={`p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 ${
                          stageNumber >= 7
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-950 text-slate-500'
                        }`}
                      >
                        <span>6. {isBn ? 'ডেলিভারড' : 'Delivered'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
