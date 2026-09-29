import React, { useState } from 'react';
import {
  Truck,
  Search,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  MapPin,
  RefreshCw,
  Phone,
  Calendar,
  ShieldCheck,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Order } from '../../types';

interface ResellerDeliveryCourierPanelProps {
  orders: Order[];
  onNavigateToTab: (tab: any) => void;
}

export const ResellerDeliveryCourierPanel: React.FC<ResellerDeliveryCourierPanelProps> = ({
  orders = [],
  onNavigateToTab,
}) => {
  const [searchTracking, setSearchTracking] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'in_transit' | 'delivered' | 'pending'>('all');

  // Courier consignment entries
  const consignments = [
    {
      consignmentId: 'ST-9948210',
      courier: 'Steadfast Courier (অফিসিয়াল)',
      orderId: 'ORD-RES-8821',
      recipientName: 'তানিম আহমেদ',
      recipientPhone: '01811223344',
      district: 'ঢাকা (উত্তরা)',
      codAmount: 1950,
      deliveryCharge: 60,
      status: 'in_transit',
      statusBn: 'কুরিয়ারে ট্রানজিটে আছে',
      bookingDate: '২৬ মার্চ ২০২৬, সকাল ১০:৩০',
      estimatedDelivery: '২৭ মার্চ ২০২৬ (২৪ ঘণ্টার মধ্যে)',
      lastLocation: 'উত্তরা হাব, ঢাকা',
    },
    {
      consignmentId: 'ST-9947812',
      courier: 'Steadfast Courier (অফিসিয়াল)',
      orderId: 'ORD-RES-8815',
      recipientName: 'ফারজানা আক্তার',
      recipientPhone: '01722334455',
      district: 'চট্টগ্রাম (জিইসি)',
      codAmount: 2400,
      deliveryCharge: 120,
      status: 'delivered',
      statusBn: 'সফলভাবে ডেলিভার্ড ও টাকা সংগ্রহ সম্পন্ন',
      bookingDate: '২৪ মার্চ ২০২৬',
      estimatedDelivery: '২৫ মার্চ ২০২৬',
      lastLocation: 'চট্টগ্রাম সেন্ট্রাল হাব',
    },
    {
      consignmentId: 'ST-9946501',
      courier: 'Steadfast Courier (অফিসিয়াল)',
      orderId: 'ORD-RES-8802',
      recipientName: 'জুনায়েদ হোসেন',
      recipientPhone: '01933445566',
      district: 'রাজশাহী (সাহেব বাজার)',
      codAmount: 1650,
      deliveryCharge: 120,
      status: 'in_transit',
      statusBn: 'ডেলিভারিম্যানের কাছে ডেলিভারির জন্য বের হয়েছে',
      bookingDate: '২৫ মার্চ ২০২৬',
      estimatedDelivery: '২৬ মার্চ ২০২৬ (আজকের মধ্যে)',
      lastLocation: 'রাজশাহী রাইডার হাব',
    },
  ];

  const filteredConsignments = consignments.filter((c) => {
    const matchSearch =
      c.consignmentId.toLowerCase().includes(searchTracking.toLowerCase()) ||
      c.recipientPhone.includes(searchTracking) ||
      c.recipientName.toLowerCase().includes(searchTracking.toLowerCase()) ||
      c.orderId.toLowerCase().includes(searchTracking.toLowerCase());

    const matchStatus = selectedStatusFilter === 'all' || c.status === selectedStatusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150 text-xs">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border border-sky-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-[11px] font-black uppercase flex items-center gap-1.5 w-fit">
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              <span>স্টিরডফাস্ট কুরিয়ার ডেলিভারি ও পার্সেল ট্র্যাকিং</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              লাইভ কুরিয়ার বুকিং ও ডেলিভারি হাব
            </h1>
            <p className="text-slate-300 text-xs max-w-2xl">
              আপনার রিসেলিং অর্ডারের প্রতিটি পার্সেলের রিয়েল-টাইম ট্র্যাকিং, কনসাইনমেন্ট নাম্বার এবং ডেলিভারি স্ট্যাটাস দেখুন।
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('courier-checker')}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>কাস্টমার ফ্রড চেকার খুলুন</span>
          </button>
        </div>

        {/* Courier Summary KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">মোট পার্সেল ট্রানজিট</div>
              <div className="text-lg font-black text-sky-400 font-mono">২ টি পার্সেল</div>
            </div>
            <Truck className="w-6 h-6 text-sky-400" />
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">ডেলিভারি সাকসেস রেট</div>
              <div className="text-lg font-black text-emerald-400 font-mono">৯৮.২%</div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">গড় ডেলিভারি সময়</div>
              <div className="text-lg font-black text-amber-400 font-mono">২৪ থেকে ৪৮ ঘণ্টা</div>
            </div>
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Filter and Tracking Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="কনসাইনমেন্ট আইডি, ফোন বা অর্ডার নং দিয়ে খুঁজুন..."
            value={searchTracking}
            onChange={(e) => setSearchTracking(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-sky-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
              selectedStatusFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500'
            }`}
          >
            সব পার্সেল
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('in_transit')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
              selectedStatusFilter === 'in_transit'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500'
            }`}
          >
            ট্রানজিটে আছে
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('delivered')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
              selectedStatusFilter === 'delivered'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500'
            }`}
          >
            ডেলিভার্ড
          </button>
        </div>
      </div>

      {/* Consignments List */}
      <div className="space-y-3">
        {filteredConsignments.map((item) => (
          <div
            key={item.consignmentId}
            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-sky-400 transition-all space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {item.consignmentId}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                      {item.courier}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    অর্ডার রেফারেন্স: <strong className="font-mono">{item.orderId}</strong>
                  </div>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${
                  item.status === 'delivered'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                }`}
              >
                {item.statusBn}
              </span>
            </div>

            {/* Consignment Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">গ্রাহক</div>
                <div className="font-bold text-slate-900 dark:text-white">{item.recipientName}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{item.recipientPhone}</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">গন্তব্য জেলা</div>
                <div className="font-bold text-slate-900 dark:text-white">{item.district}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">হাব: {item.lastLocation}</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">ক্যাশ অন ডেলিভারি (COD)</div>
                <div className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                  ৳{item.codAmount.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">ডেলিভারি চার্জ: ৳{item.deliveryCharge}</div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">ডেলিভারি প্রত্যাশিত সময়</div>
                <div className="font-bold text-slate-900 dark:text-white">{item.estimatedDelivery}</div>
                <div className="text-[10px] text-slate-400">বুকিং: {item.bookingDate}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
