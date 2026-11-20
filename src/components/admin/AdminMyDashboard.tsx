import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Truck,
  BadgeCheck,
  XCircle,
  UserCheck,
  Calendar,
  ChevronRight,
  Eye,
  Phone,
  MapPin,
  Sparkles,
  ArrowUpRight,
  Activity,
  Copy,
  Printer,
  Search,
  User,
  RefreshCw,
  TrendingUp,
  Package,
  Layers,
  Check,
  AlertCircle,
  DollarSign,
  Percent,
  Ban,
  Users,
  ChevronDown,
  Filter,
  ShieldAlert,
  ArrowDownRight,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import { StaffUser, Order, OrderStatus, UserRole, ActivityLog } from '../../types';
import { ClickableOrderId } from '../common/ClickableOrderId';
import { SaasDonutChart, SaasBarChart } from './charts/AdminCharts';

interface AdminMyDashboardProps {
  orders: Order[];
  staffList: StaffUser[];
  currentStaff: StaffUser | null;
  currentRole: UserRole;
  activityLogs: ActivityLog[];
  onUpdateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    courierName?: string,
    trackingNumber?: string,
    staff?: { id?: string; name?: string; role?: string },
    notes?: string
  ) => void;
  onPrintInvoice?: (order: Order) => void;
  onSelectTab?: (tab: any) => void;
}

import { useLanguage } from '../../context/LanguageContext';

type TimeRangeFilter = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month';
type HandledTab = 'delivered' | 'cancelled' | 'returned';

export const AdminMyDashboard: React.FC<AdminMyDashboardProps> = ({
  orders,
  staffList,
  currentStaff,
  currentRole,
  activityLogs,
  onUpdateOrderStatus,
  onPrintInvoice,
  onSelectTab,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  // Super admin permission check
  const isSuperAdmin = currentRole === 'super_admin';

  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('all');
  const [handledTab, setHandledTab] = useState<HandledTab>('delivered');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllPending, setShowAllPending] = useState(false);

  // Quick Action / Confirm Modal State
  const [selectedOrderForAction, setSelectedOrderForAction] = useState<Order | null>(null);
  const [actionTargetStatus, setActionTargetStatus] = useState<OrderStatus>('Confirmed');
  const [actionCourier, setActionCourier] = useState('Steadfast Courier');
  const [actionTracking, setActionTracking] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Active Super Admin or Current Staff profile
  const superAdminProfile = useMemo(() => {
    if (currentStaff) {
      return {
        id: currentStaff.id,
        name: currentStaff.name,
        role: currentStaff.role || currentRole,
        email: currentStaff.email,
      };
    }
    return {
      id: 'admin-root',
      name: 'Super Admin',
      role: 'super_admin',
      email: 'admin@kenax.com',
    };
  }, [currentStaff, currentRole]);

  // Staff Profile: strictly locked to the logged-in staff member for their personal dashboard
  const effectiveStaff = useMemo(() => {
    return superAdminProfile;
  }, [superAdminProfile]);

  const getRoleLabel = (role: string) => {
    if (!isBn) return role.replace(/_/g, ' ').toUpperCase();
    switch (role.toLowerCase()) {
      case 'super_admin':
        return 'সুপার অ্যাডমিন';
      case 'admin':
        return 'অ্যাডমিন';
      case 'manager':
        return 'ম্যানেজার';
      case 'moderator':
        return 'মডারেটর';
      case 'staff':
        return 'স্টাফ';
      case 'accounts':
        return 'অ্যাকাউন্টস';
      default:
        return role.replace(/_/g, ' ');
    }
  };

  const getOrderStatusLabel = (status: OrderStatus) => {
    if (!isBn) return status;
    switch (status) {
      case 'Pending':
        return 'অপেক্ষমাণ';
      case 'Payment Verification':
        return 'পেমেন্ট যাচাই';
      case 'Confirmed':
        return 'নিশ্চিতকৃত';
      case 'Processing':
        return 'প্রক্রিয়াধীন';
      case 'Delivered':
        return 'ডেলিভারি সম্পন্ন';
      case 'Cancelled':
        return 'বাতিলকৃত';
      case 'Returned':
        return 'ফেরতকৃত';
      default:
        return status;
    }
  };

  // Date range filter helper
  const isWithinTimeRange = (dateStr?: string): boolean => {
    if (!dateStr || timeRange === 'all') return true;
    const target = new Date(dateStr).getTime();
    if (isNaN(target)) return true;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (timeRange === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return target >= todayStart.getTime();
    }
    if (timeRange === 'yesterday') {
      const yestStart = new Date();
      yestStart.setDate(yestStart.getDate() - 1);
      yestStart.setHours(0, 0, 0, 0);
      const yestEnd = new Date(yestStart);
      yestEnd.setHours(23, 59, 59, 999);
      return target >= yestStart.getTime() && target <= yestEnd.getTime();
    }
    if (timeRange === '7days') {
      return target >= now - 7 * oneDay;
    }
    if (timeRange === '30days') {
      return target >= now - 30 * oneDay;
    }
    if (timeRange === 'this_month') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      return target >= startOfMonth.getTime();
    }
    return true;
  };

  /**
   * Attribution Logic:
   * "যে অর্ডারটা একবার কনফার্ম মানে প্যানেল থেকে কনফার্ম করছে এই অর্ডারটা আরকি যে কনফার্ম করছে তার নামে এই অর্ডারটা হয়ে যাবে আরকি।"
   * An order belongs to a staff member if:
   * 1. confirmedByStaffId / confirmedByStaffName matches, OR
   * 2. timeline event for Confirmed/Processing/Delivered has updatedBy matching staff name, OR
   * 3. handledByStaffId / handledByStaffName matches and status has progressed past Pending.
   */
  const isOrderConfirmedByStaff = (o: Order, staffTarget: { id: string; name: string }): boolean => {
    if (staffTarget.id === 'all') {
      // For 'all', any order that is confirmed or beyond pending
      return o.orderStatus !== 'Pending' && o.orderStatus !== 'Payment Verification';
    }

    // 1. Direct confirmedBy field
    if (o.confirmedByStaffId && o.confirmedByStaffId === staffTarget.id) return true;
    if (
      o.confirmedByStaffName &&
      o.confirmedByStaffName.trim().toLowerCase() === staffTarget.name.trim().toLowerCase()
    ) {
      return true;
    }

    // 2. Timeline confirmation entry
    if (o.timeline && Array.isArray(o.timeline)) {
      const hasConfirmTimeline = o.timeline.some((t) => {
        const isConfirmStatus =
          t.status === 'Confirmed' ||
          t.status === 'Processing' ||
          t.status === 'Packed' ||
          t.status === 'Shipped' ||
          t.status === 'Out for Delivery' ||
          t.status === 'Delivered';
        if (!isConfirmStatus) return false;
        if (!t.updatedBy) return false;
        const u = t.updatedBy.trim().toLowerCase();
        const s = staffTarget.name.trim().toLowerCase();
        return u.includes(s) || s.includes(u);
      });
      if (hasConfirmTimeline) return true;
    }

    // 3. Handled or Created by staff with status beyond pending
    const isById =
      (o.handledByStaffId && o.handledByStaffId === staffTarget.id) ||
      (o.createdByStaffId && o.createdByStaffId === staffTarget.id);
    const isByName =
      (o.handledByStaffName &&
        o.handledByStaffName.trim().toLowerCase() === staffTarget.name.trim().toLowerCase()) ||
      (o.createdByStaffName &&
        o.createdByStaffName.trim().toLowerCase() === staffTarget.name.trim().toLowerCase());

    const isPastPending =
      o.orderStatus !== 'Pending' && o.orderStatus !== 'Payment Verification';

    if ((isById || isByName) && isPastPending) return true;

    // Default unassigned confirmed orders to Super Admin when viewing Super Admin profile
    if (
      (staffTarget.id === superAdminProfile.id ||
        staffTarget.id === 'admin-root' ||
        staffTarget.name.toLowerCase().includes('admin')) &&
      !o.confirmedByStaffName &&
      !o.createdByStaffName &&
      !o.handledByStaffName &&
      isPastPending
    ) {
      return true;
    }

    return false;
  };

  // Helper: check if order is in Processing pipeline
  const isOrderInProcessing = (o: Order): boolean => {
    return (
      o.orderStatus === 'Processing' ||
      o.orderStatus === 'Packed' ||
      o.orderStatus === 'Shipped' ||
      o.orderStatus === 'Out for Delivery'
    );
  };

  // Helper: check if order is Cancelled
  const isOrderCancelled = (o: Order): boolean => {
    return o.orderStatus === 'Cancelled' || o.orderStatus === 'Rejected';
  };

  // Helper: check if order is Returned
  const isOrderReturned = (o: Order): boolean => {
    return o.orderStatus === 'Returned';
  };

  // 1. Confirmed Orders by Target Staff
  const staffConfirmedOrders = useMemo(() => {
    return orders
      .filter((o) => isOrderConfirmedByStaff(o, effectiveStaff))
      .filter((o) => isWithinTimeRange(o.confirmedAt || o.updatedAt || o.createdAt));
  }, [orders, effectiveStaff, timeRange]);

  // 2. Processing Orders by Target Staff (BLUE focus indicator)
  const staffProcessingOrders = useMemo(() => {
    return staffConfirmedOrders
      .filter((o) => isOrderInProcessing(o))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [staffConfirmedOrders]);

  // 3. Delivered Orders by Target Staff
  // "আর টাকার হিসাবটা তখন উঠবে যখন ডেলিভারি হয়ে যাবে। ডেলিভারি অর্ডারটা যখন ডেলিভারিড হবে তখন তার ড্যাশবোর্ডে যে ম্যানেজার কিংবা অ্যাডমিন কিংবা যে মডারেটর প্যানেল থেকে কনফার্ম করছে তার নামে অর্ডারটা হবে আরকি।"
  const staffDeliveredOrders = useMemo(() => {
    return staffConfirmedOrders.filter((o) => o.orderStatus === 'Delivered');
  }, [staffConfirmedOrders]);

  // 4. Cancelled Orders by Target Staff (Cancelled or Rejected)
  const staffCancelledOrders = useMemo(() => {
    return staffConfirmedOrders.filter((o) => isOrderCancelled(o));
  }, [staffConfirmedOrders]);

  // 5. Returned Orders by Target Staff (Returned from transit/customer)
  const staffReturnedOrders = useMemo(() => {
    return staffConfirmedOrders.filter((o) => isOrderReturned(o));
  }, [staffConfirmedOrders]);

  // 6. Pending Pool (Queue awaiting initial review / phone confirmation)
  const pendingPoolOrders = useMemo(() => {
    return orders
      .filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Payment Verification')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  // Financial Metrics:
  // Revenue ONLY accrues when order is Delivered!
  const deliveredRevenue = useMemo(() => {
    return staffDeliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [staffDeliveredOrders]);

  const confirmedTotalAmount = useMemo(() => {
    return staffConfirmedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [staffConfirmedOrders]);

  const processingTotalAmount = useMemo(() => {
    return staffProcessingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [staffProcessingOrders]);

  const pendingPoolTotalAmount = useMemo(() => {
    return pendingPoolOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [pendingPoolOrders]);

  const cancelledTotalAmount = useMemo(() => {
    return staffCancelledOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [staffCancelledOrders]);

  const returnedTotalAmount = useMemo(() => {
    return staffReturnedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [staffReturnedOrders]);

  // Rates for "Order Handling & Delivery to Customer":
  // Delivery Success Rate, Return Rate, and Cancel Rate
  const totalHandledCount = staffConfirmedOrders.length;

  const deliverySuccessRate = useMemo(() => {
    if (totalHandledCount === 0) return '0.0';
    return ((staffDeliveredOrders.length / totalHandledCount) * 100).toFixed(1);
  }, [totalHandledCount, staffDeliveredOrders]);

  const cancelRate = useMemo(() => {
    if (totalHandledCount === 0) return '0.0';
    return ((staffCancelledOrders.length / totalHandledCount) * 100).toFixed(1);
  }, [totalHandledCount, staffCancelledOrders]);

  const returnRate = useMemo(() => {
    if (totalHandledCount === 0) return '0.0';
    return ((staffReturnedOrders.length / totalHandledCount) * 100).toFixed(1);
  }, [totalHandledCount, staffReturnedOrders]);

  const processingRate = useMemo(() => {
    if (totalHandledCount === 0) return '0.0';
    return ((staffProcessingOrders.length / totalHandledCount) * 100).toFixed(1);
  }, [totalHandledCount, staffProcessingOrders]);

  // Recent activity logs for target staff
  const staffRecentLogs = useMemo(() => {
    if (effectiveStaff.id === 'all') {
      return activityLogs.slice(0, 6);
    }
    return activityLogs
      .filter(
        (l) =>
          (l.staffId && l.staffId === effectiveStaff.id) ||
          (l.staffName && l.staffName.trim().toLowerCase() === effectiveStaff.name.trim().toLowerCase())
      )
      .slice(0, 6);
  }, [activityLogs, effectiveStaff]);

  // Copy helper
  const handleCopy = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Open quick action modal
  const handleOpenActionModal = (order: Order, defaultTarget: OrderStatus = 'Confirmed') => {
    setSelectedOrderForAction(order);
    setActionTargetStatus(defaultTarget);
    setActionCourier(order.courierName || 'Steadfast Courier');
    setActionTracking(order.trackingNumber || '');
    setActionNote('');
    setIsActionModalOpen(true);
  };

  // Execute quick action
  const handleSaveOrderStatus = () => {
    if (!selectedOrderForAction) return;
    onUpdateOrderStatus(
      selectedOrderForAction.id,
      actionTargetStatus,
      actionCourier,
      actionTracking,
      {
        id: superAdminProfile.id,
        name: superAdminProfile.name,
        role: superAdminProfile.role,
      },
      actionNote
    );

    setIsActionModalOpen(false);
    setActionSuccessMsg(
      isBn
        ? `অর্ডার #${selectedOrderForAction.id} সফলভাবে "${getOrderStatusLabel(actionTargetStatus)}" করা হয়েছে!`
        : `Order #${selectedOrderForAction.id} marked as ${actionTargetStatus}!`
    );
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Helper: get display name of staff who handled the order
  const getOrderHandlerName = (order: Order): string => {
    if (order.confirmedByStaffName) return order.confirmedByStaffName;
    if (order.createdByStaffName) return order.createdByStaffName;
    if (order.handledByStaffName) return order.handledByStaffName;
    if (order.timeline && Array.isArray(order.timeline)) {
      const confirmEvent = order.timeline.find(
        (t) =>
          (t.status === 'Confirmed' || t.status === 'Processing' || t.status === 'Delivered') &&
          t.updatedBy
      );
      if (confirmEvent?.updatedBy) return confirmEvent.updatedBy;
    }
    if (order.orderStatus !== 'Pending' && order.orderStatus !== 'Payment Verification') {
      return isBn ? 'সুপার অ্যাডমিন' : 'Super Admin';
    }
    return isBn ? 'অপেক্ষমাণ পর্যালোচনা' : 'Pending Review';
  };

  // Helper: generate WhatsApp link with greeting and order details
  const generateWhatsAppLink = (mobile?: string, customerName?: string, orderId?: string) => {
    if (!mobile) return '#';
    const cleanNumber = mobile.replace(/[^0-9]/g, '');
    const formattedPhone = cleanNumber.startsWith('880')
      ? cleanNumber
      : cleanNumber.startsWith('0')
      ? '88' + cleanNumber
      : '880' + cleanNumber;
    const msg = encodeURIComponent(
      `Hello ${customerName || 'Customer'}, this is from KENAX regarding your Order #${orderId}.`
    );
    return `https://wa.me/${formattedPhone}?text=${msg}`;
  };

  // Filter current displayed orders strictly by handledTab ('delivered' | 'cancelled' | 'returned')
  const currentDisplayedOrders = useMemo(() => {
    let list: Order[] = [];
    if (handledTab === 'delivered') {
      list = staffDeliveredOrders;
    } else if (handledTab === 'cancelled') {
      list = staffCancelledOrders;
    } else if (handledTab === 'returned') {
      list = staffReturnedOrders;
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.deliveryName && o.deliveryName.toLowerCase().includes(q)) ||
        (o.customerMobile && o.customerMobile.includes(q)) ||
        (o.deliveryMobile && o.deliveryMobile.includes(q)) ||
        (o.district && o.district.toLowerCase().includes(q)) ||
        (o.courierName && o.courierName.toLowerCase().includes(q)) ||
        (o.trackingNumber && o.trackingNumber.toLowerCase().includes(q)) ||
        (o.confirmedByStaffName && o.confirmedByStaffName.toLowerCase().includes(q)) ||
        (o.createdByStaffName && o.createdByStaffName.toLowerCase().includes(q)) ||
        (o.handledByStaffName && o.handledByStaffName.toLowerCase().includes(q))
    );
  }, [
    handledTab,
    staffDeliveredOrders,
    staffCancelledOrders,
    staffReturnedOrders,
    searchQuery,
  ]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl bg-emerald-600 text-white shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 1. Header Banner with Staff Switcher & Date Range (White style with clean borders) */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md border border-blue-700 shrink-0">
              {effectiveStaff.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {getRoleLabel(effectiveStaff.role)}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {isSuperAdmin
                    ? isBn
                      ? 'সুপার অ্যাডমিন অনুমোদিত'
                      : 'Super Admin Authorized'
                    : isBn
                    ? 'ব্যক্তিগত ড্যাশবোর্ড'
                    : 'Personal Dashboard'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1 text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{effectiveStaff.name}</span>
                <span className="text-slate-400 font-normal">|</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {isBn ? 'আমার ড্যাশবোর্ড' : 'My Dashboard'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {isBn
                  ? 'ব্যক্তিগত অর্ডার নিশ্চিতকরণ, প্রক্রিয়াকরণ ও ডেলিভারি আয়ের হিসাব'
                  : 'Personal order confirmation, processing throughput & delivered revenue ledger'}
              </p>
            </div>
          </div>

          {/* Right Controls: Time Filter */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Time Range Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 text-xs">
              {(
                [
                  { id: 'all', labelEn: 'All Time', labelBn: 'সর্বমোট' },
                  { id: 'today', labelEn: 'Today', labelBn: 'আজ' },
                  { id: 'yesterday', labelEn: 'Yesterday', labelBn: 'গতকাল' },
                  { id: '7days', labelEn: '7 Days', labelBn: '৭ দিন' },
                  { id: '30days', labelEn: '30 Days', labelBn: '৩০ দিন' },
                ] as const
              ).map((tr) => (
                <button
                  key={tr.id}
                  onClick={() => setTimeRange(tr.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    timeRange === tr.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isBn ? tr.labelBn : tr.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Performance Indicators (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Delivered Revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {isBn ? 'ডেলিভারি রাজস্ব' : 'Delivered Revenue'}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-2">
                {isBn
                  ? 'নিশ্চিত অর্ডারের সফল ডেলিভারি থেকে প্রাপ্ত মোট আয়'
                  : 'Revenue from confirmed orders now successfully delivered'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              ৳{deliveredRevenue.toLocaleString()}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span>
                {staffDeliveredOrders.length}{' '}
                {isBn ? 'টি ডেলিভারিকৃত অর্ডার' : 'delivered orders'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-200 dark:border-emerald-800">
                {deliverySuccessRate}% {isBn ? 'সফল' : 'Success'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Confirmed Orders & Value */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                {isBn ? 'মোট নিশ্চিতকৃত' : 'Total Confirmed'}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-2">
                {isBn
                  ? 'এই স্টাফের মাধ্যমে নিশ্চিত সমস্ত অর্ডারের মোট মূল্য'
                  : 'Total value of all orders confirmed by this staff member'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
              <BadgeCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              ৳{confirmedTotalAmount.toLocaleString()}
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span>
                {staffConfirmedOrders.length}{' '}
                {isBn ? 'টি নিশ্চিতকৃত অর্ডার' : 'confirmed orders'}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                {isBn ? 'নির্ধারিত হিসাব' : 'Attributed Ledger'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: In-Transit / Processing Orders */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {isBn ? 'প্রক্রিয়াধীন ও শিপিং' : 'Processing & Shipping'}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-2">
                {isBn
                  ? 'বর্তমানে ট্রানজিট বা প্যাকেজিংয়ে থাকা সক্রিয় অর্ডার'
                  : 'Orders currently in transit or packaging at fulfillment'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-blue-50 dark:border-blue-950/60">
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
              {staffProcessingOrders.length}{' '}
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {isBn ? 'টি অর্ডার' : 'Orders'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span>
                {isBn ? 'পাইপলাইন:' : 'Pipeline:'} ৳{processingTotalAmount.toLocaleString()}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold border border-blue-200 dark:border-blue-800">
                {processingRate}% {isBn ? 'প্রক্রিয়াধীন' : 'Processing'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Pending Queue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {isBn ? 'অপেক্ষমাণ কিউ' : 'Pending Queue'}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-2">
                {isBn
                  ? 'যাচাই ও গ্রহণের জন্য অপেক্ষমাণ নতুন কাস্টমার অর্ডার'
                  : 'New unconfirmed orders available to verify and claim'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {pendingPoolOrders.length}{' '}
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {isBn ? 'টি অপেক্ষমাণ' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span>
                {isBn ? 'কিউ মূল্য:' : 'Queue Value:'} ৳{pendingPoolTotalAmount.toLocaleString()}
              </span>
              <a
                href="#recent-incoming-queue"
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 cursor-pointer flex items-center gap-1"
              >
                <span>{isBn ? 'কিউ দেখুন' : 'View Queue'}</span>
                <span>&darr;</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 3. "Order Handling & Delivery to Customer" Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>
                {isBn
                  ? 'অর্ডার পরিচালনা ও গ্রাহকের ডেলিভারি'
                  : 'Order Handling & Delivery to Customer'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              {isBn
                ? 'অর্ডার নিশ্চিতকরণ থেকে গ্রাহকের প্রাপ্তি পর্যন্ত অগ্রগতি'
                : 'Conversion throughput from order confirmation to final customer receipt'}
            </p>
          </div>

          {/* Metric Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {isBn ? 'ডেলিভারি সাফল্য:' : 'Delivery Success:'}
              </span>
              <span className="font-black text-emerald-700 dark:text-emerald-300">{deliverySuccessRate}%</span>
              <span className="text-[10px] text-slate-400">({staffDeliveredOrders.length})</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {isBn ? 'ফেরতের হার:' : 'Return Rate:'}
              </span>
              <span className="font-black text-amber-700 dark:text-amber-300">{returnRate}%</span>
              <span className="text-[10px] text-slate-400">({staffReturnedOrders.length})</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {isBn ? 'বাতিলের হার:' : 'Cancel Rate:'}
              </span>
              <span className="font-black text-rose-700 dark:text-rose-300">{cancelRate}%</span>
              <span className="text-[10px] text-slate-400">({staffCancelledOrders.length})</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {isBn ? 'প্রক্রিয়াধীন:' : 'Processing:'}
              </span>
              <span className="font-black text-blue-600 dark:text-blue-300">{processingRate}%</span>
              <span className="text-[10px] text-slate-400">({staffProcessingOrders.length})</span>
            </div>
          </div>
        </div>

        {/* Multi-segment Funnel Bar */}
        <div className="mt-5 space-y-2">
          <div className="h-4 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex w-full border border-slate-200 dark:border-slate-700">
            <div
              style={{ width: `${Math.min(100, Math.max(0, Number(deliverySuccessRate)))}%` }}
              className="bg-emerald-500 h-full transition-all duration-500"
              title={`${isBn ? 'ডেলিভারি সম্পন্ন' : 'Delivered'}: ${staffDeliveredOrders.length} (${deliverySuccessRate}%)`}
            />
            <div
              style={{ width: `${Math.min(100, Math.max(0, Number(processingRate)))}%` }}
              className="bg-blue-600 h-full transition-all duration-500"
              title={`${isBn ? 'প্রক্রিয়াধীন' : 'Processing / In-Transit'}: ${staffProcessingOrders.length} (${processingRate}%)`}
            />
            <div
              style={{ width: `${Math.min(100, Math.max(0, Number(returnRate)))}%` }}
              className="bg-amber-500 h-full transition-all duration-500"
              title={`${isBn ? 'ফেরতকৃত' : 'Returned'}: ${staffReturnedOrders.length} (${returnRate}%)`}
            />
            <div
              style={{ width: `${Math.min(100, Math.max(0, Number(cancelRate)))}%` }}
              className="bg-rose-500 h-full transition-all duration-500"
              title={`${isBn ? 'বাতিলকৃত' : 'Cancelled'}: ${staffCancelledOrders.length} (${cancelRate}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-1 pt-1 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{isBn ? 'ডেলিভারি সম্পন্ন' : 'Delivered'} ({deliverySuccessRate}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>{isBn ? 'প্রক্রিয়াধীন' : 'Processing'} ({processingRate}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>{isBn ? 'ফেরতকৃত' : 'Returned'} ({returnRate}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>{isBn ? 'বাতিলকৃত' : 'Cancelled'} ({cancelRate}%)</span>
            </div>
            <div className="text-slate-400 dark:text-slate-500 font-normal">
              {isBn ? 'মোট পরিচালিত:' : 'Total Handled:'} {totalHandledCount}
            </div>
          </div>
        </div>
      </div>

      {/* 3B. Personal Visual Charts (Outcome Mix + Pipeline Value) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SaasDonutChart
          title={isBn ? 'ব্যক্তিগত অর্ডার ফলাফল বিভাজন' : 'My Order Outcome Distribution'}
          subtitle={`${totalHandledCount} ${isBn ? 'টি পরিচালিত অর্ডার' : 'handled orders'}`}
          centerLabel={isBn ? 'মোট' : 'Handled'}
          onSelectSlice={(slice) => {
            if (slice.id === 'delivered' || slice.id === 'cancelled' || slice.id === 'returned') {
              setHandledTab(slice.id);
            }
          }}
          data={[
            { id: 'delivered', label: isBn ? 'ডেলিভারি সম্পন্ন' : 'Delivered', value: staffDeliveredOrders.length, color: '#059669' },
            { id: 'processing', label: isBn ? 'প্রক্রিয়াধীন' : 'Processing', value: staffProcessingOrders.length, color: '#2563EB' },
            { id: 'returned', label: isBn ? 'ফেরতকৃত' : 'Returned', value: staffReturnedOrders.length, color: '#D97706' },
            { id: 'cancelled', label: isBn ? 'বাতিলকৃত' : 'Cancelled', value: staffCancelledOrders.length, color: '#E11D48' },
          ]}
        />

        <SaasBarChart
          title={isBn ? 'অবস্থা অনুযায়ী অর্ডার মূল্য (৳)' : 'Order Value by Stage'}
          subtitle={isBn ? 'ডেলিভারি আয় বনাম পাইপলাইন' : 'Delivered revenue vs active pipeline'}
          valueFormat="currency"
          data={[
            { label: isBn ? 'ডেলিভারি' : 'Delivered', value: deliveredRevenue, color: '#059669' },
            { label: isBn ? 'প্রক্রিয়াধীন' : 'Processing', value: processingTotalAmount, color: '#2563EB' },
            { label: isBn ? 'অপেক্ষমাণ' : 'Pending Queue', value: pendingPoolTotalAmount, color: '#D97706' },
            { label: isBn ? 'ফেরত' : 'Returned', value: returnedTotalAmount, color: '#EA580C' },
            { label: isBn ? 'বাতিল' : 'Cancelled', value: cancelledTotalAmount, color: '#E11D48' },
          ]}
        />
      </div>

      {/* 4. Orders Explorer: Handled Orders with 3 Clean Outcome Tabs (Delivered, Cancelled, Returned) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header with Title, Search, and 3 Outcome Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>{isBn ? 'সম্পাদিত অর্ডারসমূহ' : 'Handled Orders'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isBn ? (
                  <span>
                    <strong className="text-slate-800 dark:text-slate-200">{effectiveStaff.name}</strong> কর্তৃক পরিচালিত অর্ডারসমূহ ফলাফল অনুযায়ী শ্রেণীবদ্ধ
                  </span>
                ) : (
                  <span>
                    Orders handled by <strong className="text-slate-800 dark:text-slate-200">{effectiveStaff.name}</strong> ({effectiveStaff.role.replace(/_/g, ' ')}) classified by final fulfillment outcome
                  </span>
                )}
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isBn ? 'অর্ডার আইডি, গ্রাহকের নাম, ফোন দিয়ে খুঁজুন...' : 'Search order ID, customer, phone, courier...'}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* The 3 Specific Tabs: Delivered, Cancelled, Returned */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {/* Tab 1: Delivered */}
            <button
              onClick={() => setHandledTab('delivered')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2.5 ${
                handledTab === 'delivered'
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isBn ? 'ডেলিভারি সম্পন্ন' : 'Delivered'}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  handledTab === 'delivered'
                    ? 'bg-white/25 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {staffDeliveredOrders.length}
              </span>
              <span
                className={`text-[10px] font-extrabold ${
                  handledTab === 'delivered' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                ({deliverySuccessRate}% {isBn ? 'সফল' : 'Success'})
              </span>
            </button>

            {/* Tab 2: Cancelled */}
            <button
              onClick={() => setHandledTab('cancelled')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2.5 ${
                handledTab === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300'
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>{isBn ? 'বাতিলকৃত' : 'Cancelled'}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  handledTab === 'cancelled'
                    ? 'bg-white/25 text-white'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                }`}
              >
                {staffCancelledOrders.length}
              </span>
              <span
                className={`text-[10px] font-extrabold ${
                  handledTab === 'cancelled' ? 'text-rose-100' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                ({cancelRate}% {isBn ? 'বাতিল' : 'Cancelled'})
              </span>
            </button>

            {/* Tab 3: Returned */}
            <button
              onClick={() => setHandledTab('returned')}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2.5 ${
                handledTab === 'returned'
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isBn ? 'ফেরতকৃত' : 'Returned'}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  handledTab === 'returned'
                    ? 'bg-white/25 text-white'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                }`}
              >
                {staffReturnedOrders.length}
              </span>
              <span
                className={`text-[10px] font-extrabold ${
                  handledTab === 'returned' ? 'text-amber-100' : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                ({returnRate}% {isBn ? 'ফেরত' : 'Returned'})
              </span>
            </button>
          </div>
        </div>

        {/* View Helper Notice */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            {handledTab === 'delivered' && (
              <span>
                <b>{isBn ? 'ডেলিভারি সম্পন্ন অর্ডার:' : 'Delivered Orders:'}</b>{' '}
                {isBn
                  ? `${effectiveStaff.name} কর্তৃক নিশ্চিতকৃত সফলভাবে গ্রাহকের কাছে পৌঁছানো অর্ডার। মোট বাস্তবায়িত আয়: `
                  : `Orders confirmed by ${effectiveStaff.name} that were successfully received by customers. Total Realized Revenue: `}
                <strong className="text-emerald-700 font-bold">৳{deliveredRevenue.toLocaleString()}</strong>{' '}
                ({deliverySuccessRate}% {isBn ? 'ডেলিভারি সাফল্য' : 'Delivery Success'}).
              </span>
            )}
            {handledTab === 'cancelled' && (
              <span>
                <b>{isBn ? 'বাতিলকৃত অর্ডার:' : 'Cancelled Orders:'}</b>{' '}
                {isBn
                  ? `পেন্ডিং থেকে বা নিশ্চিতকরণের পরে বাতিল হওয়া অর্ডার। মোট বাতিলকৃত মূল্য: `
                  : `Orders that were cancelled from pending or after confirmation. Total Cancelled Value: `}
                <strong className="text-rose-700 font-bold">৳{cancelledTotalAmount.toLocaleString()}</strong>{' '}
                ({cancelRate}% {isBn ? 'বাতিলের হার' : 'Cancel Rate'}).
              </span>
            )}
            {handledTab === 'returned' && (
              <span>
                <b>{isBn ? 'ফেরতকৃত অর্ডার:' : 'Returned Orders:'}</b>{' '}
                {isBn
                  ? `কুরিয়ারে প্রেরণের পর ডেলিভারি না হয়ে ফেরত আসা অর্ডার। মোট ফেরত মূল্য: `
                  : `Orders dispatched to courier that returned undelivered. Total Returned Value: `}
                <strong className="text-amber-700 font-bold">৳{returnedTotalAmount.toLocaleString()}</strong>{' '}
                ({returnRate}% {isBn ? 'ফেরতের হার' : 'Return Rate'}).
              </span>
            )}
          </div>
          <span className="font-bold text-slate-700">
            {currentDisplayedOrders.length}{' '}
            {isBn
              ? handledTab === 'delivered'
                ? 'টি ডেলিভারিকৃত অর্ডার'
                : handledTab === 'cancelled'
                ? 'টি বাতিলকৃত অর্ডার'
                : 'টি ফেরতকৃত অর্ডার'
              : `${handledTab} order(s)`}
          </span>
        </div>

        {/* Orders List: Responsive Table for Desktop & Cards for Mobile */}
        {currentDisplayedOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">
              {isBn
                ? `কোনো ${handledTab === 'delivered' ? 'ডেলিভারিকৃত' : handledTab === 'cancelled' ? 'বাতিলকৃত' : 'ফেরতকৃত'} অর্ডার পাওয়া যায়নি`
                : `No ${handledTab} orders found`}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {handledTab === 'delivered' &&
                (isBn
                  ? 'এই স্টাফের জন্য এখনো কোনো ডেলিভারিকৃত অর্ডার নেই।'
                  : 'No delivered orders recorded for this staff member yet.')}
              {handledTab === 'cancelled' &&
                (isBn
                  ? 'চমৎকার! এই স্টাফের কোনো বাতিলকৃত অর্ডার নেই।'
                  : 'Great! No cancelled orders on record for this staff member.')}
              {handledTab === 'returned' &&
                (isBn
                  ? 'দারুণ! এই স্টাফের কোনো ফেরত আসা পার্সেল নেই।'
                  : 'Excellent! Zero returned parcels on record for this staff member.')}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">{isBn ? 'অর্ডার আইডি ও তারিখ' : 'Order ID & Date'}</th>
                    <th className="py-3 px-4">{isBn ? 'পরিচালনাকারী' : 'Handled By'}</th>
                    <th className="py-3 px-4">{isBn ? 'গ্রাহকের বিবরণ' : 'Customer Details'}</th>
                    <th className="py-3 px-4">{isBn ? 'আইটেম ও গন্তব্য' : 'Items & Destination'}</th>
                    <th className="py-3 px-4">{isBn ? 'মূল্য ও পেমেন্ট' : 'Amount & Payment'}</th>
                    <th className="py-3 px-4">{isBn ? 'স্ট্যাটাস ও কুরিয়ার' : 'Status & Courier'}</th>
                    <th className="py-3 px-4 text-right">{isBn ? 'পদক্ষেপ' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                  {currentDisplayedOrders.map((order) => {
                    const isDelivered = order.orderStatus === 'Delivered';
                    const isProcessing = isOrderInProcessing(order);
                    const isPending =
                      order.orderStatus === 'Pending' || order.orderStatus === 'Payment Verification';
                    const isCancelled = isOrderCancelled(order);
                    const isReturned = isOrderReturned(order);
                    const handlerName = getOrderHandlerName(order);

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors">
                        {/* 1. Order ID & Date */}
                        <td className="py-3.5 px-4 align-top">
                          <ClickableOrderId
                            orderId={order.id}
                            className="font-mono font-bold text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 text-xs cursor-pointer inline-flex items-center"
                          />
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>
                              {new Date(order.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </td>

                        {/* 2. Handled By Staff */}
                        <td className="py-3.5 px-4 align-top">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3" />
                              {isBn ? 'গ্রহণের অপেক্ষায়' : 'Pending Claim'}
                            </span>
                          ) : (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <UserCheck className="w-3 h-3" />
                                {handlerName}
                              </span>
                              {order.confirmedAt && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {new Date(order.confirmedAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 3. Customer Details */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {order.deliveryName || order.customerName || (isBn ? 'গ্রাহক' : 'Customer')}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 mt-1 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <a
                              href={`tel:${order.deliveryMobile || order.customerMobile}`}
                              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                            >
                              {order.deliveryMobile || order.customerMobile}
                            </a>
                            <a
                              href={generateWhatsAppLink(
                                order.deliveryMobile || order.customerMobile,
                                order.deliveryName || order.customerName,
                                order.id
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 p-0.5"
                              title={isBn ? 'হোয়াটসঅ্যাপে চ্যাট করুন' : 'Chat on WhatsApp'}
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          </div>
                        </td>

                        {/* 4. Items & Destination */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="text-slate-900 dark:text-white font-bold">
                            {order.items?.length || 1} {isBn ? 'টি পণ্য' : 'item(s)'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-[180px]">
                            {order.items?.map((it) => it.productName || it.name).join(', ')}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {order.district || order.division || (isBn ? 'বাংলাদেশ' : 'Bangladesh')}
                            </span>
                          </div>
                        </td>

                        {/* 5. Amount & Payment */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-black text-slate-900 dark:text-white text-sm">
                            ৳{(order.totalAmount || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {order.paymentMethod || (isBn ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery')}
                          </div>
                          {isDelivered && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 mt-1 border border-emerald-200 dark:border-emerald-800">
                              <Check className="w-2.5 h-2.5" />
                              {isBn ? 'অর্জিত আয়' : 'Delivered Revenue'}
                            </span>
                          )}
                        </td>

                        {/* 6. Status & Courier */}
                        <td className="py-3.5 px-4 align-top">
                          <div>
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                                isDelivered
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : isReturned
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : isCancelled
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                  : isProcessing
                                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : isPending
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {getOrderStatusLabel(order.orderStatus)}
                            </span>
                          </div>
                          {order.courierName && (
                            <div className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold mt-1">
                              {isBn ? 'কুরিয়ার:' : 'Courier:'} {order.courierName}
                            </div>
                          )}
                          {order.trackingNumber && (
                            <div className="text-[10px] text-blue-700 dark:text-blue-400 font-mono font-bold mt-0.5">
                              {isBn ? 'ট্র্যাকিং:' : 'Track:'} {order.trackingNumber}
                            </div>
                          )}
                        </td>

                        {/* 7. Action Button */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {isPending && (
                              <button
                                onClick={() => handleOpenActionModal(order, 'Confirmed')}
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                              >
                                <BadgeCheck className="w-3.5 h-3.5" />
                                <span>{isBn ? 'নিশ্চিত ও গ্রহণ' : 'Confirm & Claim'}</span>
                              </button>
                            )}

                            {order.orderStatus === 'Confirmed' && (
                              <button
                                onClick={() => handleOpenActionModal(order, 'Processing')}
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>{isBn ? 'প্রক্রিয়াধীন করুন' : 'To Processing'}</span>
                              </button>
                            )}

                            {isProcessing && (
                              <button
                                onClick={() => handleOpenActionModal(order, 'Delivered')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isBn ? 'ডেলিভারি সম্পন্ন' : 'Mark Delivered'}</span>
                              </button>
                            )}

                            {onPrintInvoice && (
                              <button
                                onClick={() => onPrintInvoice(order)}
                                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title={isBn ? 'চালান প্রিন্ট' : 'Print Invoice'}
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {currentDisplayedOrders.map((order) => {
                const isDelivered = order.orderStatus === 'Delivered';
                const isProcessing = isOrderInProcessing(order);
                const isPending =
                  order.orderStatus === 'Pending' || order.orderStatus === 'Payment Verification';
                const isCancelled = isOrderCancelled(order);
                const isReturned = isOrderReturned(order);
                const handlerName = getOrderHandlerName(order);

                return (
                  <div key={order.id} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-2">
                      <ClickableOrderId
                        orderId={order.id}
                        className="font-mono font-bold text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 text-xs cursor-pointer inline-flex items-center"
                      />
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          isDelivered
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : isReturned
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : isCancelled
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : isProcessing
                            ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            : isPending
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {getOrderStatusLabel(order.orderStatus)}
                      </span>
                    </div>

                    {/* Handled By & Date */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        {new Date(order.createdAt).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {isPending ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          {isBn ? 'অনির্ধারিত (অপেক্ষমাণ)' : 'Unassigned (Pending)'}
                        </span>
                      ) : (
                        <span className="text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          {handlerName}
                        </span>
                      )}
                    </div>

                    {/* Customer & Call */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {order.deliveryName || order.customerName || (isBn ? 'গ্রাহক' : 'Customer')}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {order.deliveryMobile || order.customerMobile}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {order.district || order.division || (isBn ? 'বাংলাদেশ' : 'Bangladesh')}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`tel:${order.deliveryMobile || order.customerMobile}`}
                          className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
                          title={isBn ? 'কল করুন' : 'Call Customer'}
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <a
                          href={generateWhatsAppLink(
                            order.deliveryMobile || order.customerMobile,
                            order.deliveryName || order.customerName,
                            order.id
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 cursor-pointer"
                          title={isBn ? 'হোয়াটসঅ্যাপ' : 'WhatsApp'}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {/* Items & Amount */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          ৳{(order.totalAmount || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          {order.items?.length || 1} {isBn ? 'টি পণ্য' : 'item(s)'} • {order.paymentMethod || (isBn ? 'ক্যাশ অন ডেলিভারি' : 'COD')}
                        </div>
                      </div>
                      {isDelivered && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          {isBn ? 'অর্জিত আয়' : 'Revenue Realized'}
                        </span>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {isPending && (
                        <button
                          onClick={() => handleOpenActionModal(order, 'Confirmed')}
                          className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <BadgeCheck className="w-3.5 h-3.5" />
                          <span>{isBn ? 'নিশ্চিত ও গ্রহণ' : 'Confirm & Claim'}</span>
                        </button>
                      )}

                      {order.orderStatus === 'Confirmed' && (
                        <button
                          onClick={() => handleOpenActionModal(order, 'Processing')}
                          className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>{isBn ? 'প্রক্রিয়াধীন করুন' : 'To Processing'}</span>
                        </button>
                      )}

                      {isProcessing && (
                        <button
                          onClick={() => handleOpenActionModal(order, 'Delivered')}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isBn ? 'ডেলিভারি সম্পন্ন' : 'Mark Delivered'}</span>
                        </button>
                      )}

                      {onPrintInvoice && (
                        <button
                          onClick={() => onPrintInvoice(order)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
                          title={isBn ? 'চালান' : 'Invoice'}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Dedicated Section Below Handled Orders: Recent Incoming Pending Orders Queue */}
      <div id="recent-incoming-queue" className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>{isBn ? 'নতুন অপেক্ষমাণ অর্ডারসমূহ' : 'Recent Incoming Orders'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                  {pendingPoolOrders.length} {isBn ? 'টি অপেক্ষমাণ' : 'Pending'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isBn
                  ? 'গ্রাহকদের সদ্য করা নতুন অর্ডার যা ফোনে নিশ্চিতকরণের অপেক্ষায় রয়েছে। গ্রাহককে কল করে "নিশ্চিত ও গ্রহণ" করুন।'
                  : 'Newly placed customer orders awaiting phone confirmation. Call customer and click "Confirm & Claim" to take ownership.'}
              </p>
            </div>
          </div>

          {pendingPoolOrders.length > 6 && (
            <button
              onClick={() => setShowAllPending(!showAllPending)}
              className="px-3 py-1.5 rounded-xl border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>
                {showAllPending
                  ? isBn
                    ? 'প্রথম ৬টি দেখুন'
                    : 'Show Top 6 Only'
                  : isBn
                  ? `সবগুলো (${pendingPoolOrders.length}টি) দেখুন`
                  : `Show All (${pendingPoolOrders.length}) Pending`}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {pendingPoolOrders.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-1.5" />
            <p className="font-bold text-slate-700">
              {isBn ? 'সব অর্ডার সম্পন্ন!' : 'All caught up!'}
            </p>
            <p className="text-[11px] mt-0.5">
              {isBn
                ? 'বর্তমানে নিশ্চিতকরণের জন্য কোনো নতুন অপেক্ষমাণ অর্ডার নেই।'
                : 'No pending orders waiting for confirmation right now.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(showAllPending ? pendingPoolOrders : pendingPoolOrders.slice(0, 6)).map((ord) => {
              const custPhone = ord.deliveryMobile || ord.customerMobile;
              return (
                <div
                  key={ord.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 flex flex-col justify-between gap-3 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 text-xs">#{ord.id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {getOrderStatusLabel(ord.orderStatus)}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {ord.deliveryName || ord.customerName || (isBn ? 'গ্রাহক' : 'Customer')}
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono mt-0.5 flex items-center gap-2">
                        <span>{custPhone}</span>
                        {custPhone && (
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${custPhone}`}
                              className="text-slate-400 hover:text-blue-600 p-0.5"
                              title={isBn ? 'গ্রাহককে কল করুন' : 'Call Customer'}
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                            <a
                              href={generateWhatsAppLink(custPhone, ord.customerName || ord.deliveryName, ord.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-emerald-600 p-0.5"
                              title={isBn ? 'হোয়াটসঅ্যাপে যোগাযোগ' : 'WhatsApp Customer'}
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {ord.district || ord.division || (isBn ? 'বাংলাদেশ' : 'Bangladesh')} • {ord.items?.length || 1} {isBn ? 'টি পণ্য' : 'item(s)'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <span className="font-black text-slate-900 text-xs">
                      ৳{(ord.totalAmount || 0).toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleOpenActionModal(ord, 'Confirmed')}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <BadgeCheck className="w-3.5 h-3.5" />
                      <span>{isBn ? 'নিশ্চিত ও গ্রহণ' : 'Confirm & Claim'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Recent Audit Logs Trail */}
      {staffRecentLogs.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>{isBn ? 'সাম্প্রতিক কার্যকলাপ অডিট ট্রেইল' : 'Recent Activity Audit Trail'}</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              {isBn ? 'রিয়েলটাইম লেজার' : 'Realtime Ledger'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffRecentLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">
                      {log.action}
                    </span>
                    <span>
                      {new Date(log.timestamp).toLocaleTimeString(isBn ? 'bn-BD' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-2 line-clamp-2">
                    {log.details}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 mt-2 font-mono">
                  {isBn ? 'টার্গেট:' : 'Target:'} {log.targetId}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Quick Status Update & Courier Modal */}
      {isActionModalOpen && selectedOrderForAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <BadgeCheck className="w-5 h-5 text-blue-600" />
                  <span>
                    {isBn ? 'অর্ডার স্ট্যাটাস ও কুরিয়ার পরিবর্তন' : 'Update Order Status & Courier'}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isBn ? 'অর্ডার #' : 'Order #'}{selectedOrderForAction.id} -{' '}
                  {selectedOrderForAction.customerName || selectedOrderForAction.deliveryName || (isBn ? 'গ্রাহক' : 'Customer')}
                </p>
              </div>
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Target Status Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isBn ? 'নতুন স্ট্যাটাস নির্বাচন করুন:' : 'Select New Status:'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {(['Confirmed', 'Processing', 'Delivered', 'Cancelled'] as OrderStatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setActionTargetStatus(st)}
                      className={`py-2 px-2.5 rounded-xl font-bold transition-all cursor-pointer text-center text-xs ${
                        actionTargetStatus === st
                          ? st === 'Confirmed'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : st === 'Processing'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : st === 'Delivered'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {getOrderStatusLabel(st)}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Courier Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isBn ? 'কুরিয়ার সার্ভিস:' : 'Courier Service:'}
              </label>
              <select
                value={actionCourier}
                onChange={(e) => setActionCourier(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Steadfast Courier">Steadfast Courier</option>
                <option value="Pathao Courier">Pathao Courier</option>
                <option value="RedX Logistics">RedX Logistics</option>
                <option value="Paperfly">Paperfly</option>
                <option value="Sundarban Courier">Sundarban Courier</option>
                <option value="SA Paribahan">SA Paribahan</option>
              </select>
            </div>

            {/* Tracking Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isBn ? 'কুরিয়ার ট্র্যাকিং আইডি (ঐচ্ছিক):' : 'Courier Tracking ID (Optional):'}
              </label>
              <input
                type="text"
                value={actionTracking}
                onChange={(e) => setActionTracking(e.target.value)}
                placeholder="e.g. STF-8492038"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isBn ? 'স্টাফ নোট (ঐচ্ছিক):' : 'Staff Note (Optional):'}
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={2}
                placeholder={
                  isBn
                    ? 'যেমন: ফোনে গ্রাহকের সাথে নিশ্চিত করা হয়েছে, পার্সেল পিকআপের জন্য প্রস্তুত...'
                    : 'e.g. Phone confirmed with customer, ready for pickup...'
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveOrderStatus}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isBn ? 'স্ট্যাটাস সংরক্ষণ' : 'Save Status'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
