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
  // Super admin permission check: only super_admin can inspect other staff dashboards
  const isSuperAdmin = currentRole === 'super_admin';

  // Staff Selection (Super Admin can switch to inspect; staff are strictly locked to their own view)
  const [selectedStaffId, setSelectedStaffId] = useState<string>('me');
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

  // Selected Target Staff Profile: non-super-admins are strictly locked to their own profile
  const effectiveStaff = useMemo(() => {
    if (!isSuperAdmin || selectedStaffId === 'me') {
      return superAdminProfile;
    }
    if (selectedStaffId === 'all') {
      return {
        id: 'all',
        name: 'All Staff (Combined Team)',
        role: 'team',
        email: 'team@kenax.com',
      };
    }
    const found = staffList.find((s) => s.id === selectedStaffId);
    if (found) {
      return {
        id: found.id,
        name: found.name,
        role: found.role,
        email: found.email,
      };
    }
    return superAdminProfile;
  }, [isSuperAdmin, selectedStaffId, staffList, superAdminProfile]);

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

  // Team Member Breakdown for Super Admin Overview
  const teamPerformanceSummary = useMemo(() => {
    const allMembers = [
      superAdminProfile,
      ...staffList.filter((s) => s.id !== superAdminProfile.id),
    ];

    return allMembers.map((member) => {
      const confOrders = orders.filter((o) => isOrderConfirmedByStaff(o, member));
      const delOrders = confOrders.filter((o) => o.orderStatus === 'Delivered');
      const procOrders = confOrders.filter((o) => isOrderInProcessing(o));
      const cancOrders = confOrders.filter((o) => isOrderCancelled(o));
      const retOrders = confOrders.filter((o) => isOrderReturned(o));
      const rev = delOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
      const total = confOrders.length;
      const succRate = total > 0 ? ((delOrders.length / total) * 100).toFixed(1) : '0.0';
      const cRate = total > 0 ? ((cancOrders.length / total) * 100).toFixed(1) : '0.0';
      const rRate = total > 0 ? ((retOrders.length / total) * 100).toFixed(1) : '0.0';

      return {
        id: member.id,
        name: member.name,
        role: member.role,
        confirmedCount: total,
        deliveredCount: delOrders.length,
        processingCount: procOrders.length,
        cancelledCount: cancOrders.length,
        returnedCount: retOrders.length,
        deliveredRevenue: rev,
        successRate: succRate,
        cancelRate: cRate,
        returnRate: rRate,
      };
    });
  }, [orders, staffList, superAdminProfile]);

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
    setActionSuccessMsg(`Order #${selectedOrderForAction.id} marked as ${actionTargetStatus}!`);
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
      return 'Super Admin';
    }
    return 'Pending Review';
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
                  {effectiveStaff.role.replace('_', ' ')}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {isSuperAdmin ? 'Super Admin Authorized' : 'Personal Dashboard'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-1 text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>{effectiveStaff.name}</span>
                <span className="text-slate-400 font-normal">|</span>
                <span className="text-blue-600 dark:text-blue-400">My Dashboard</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                {isSuperAdmin && selectedStaffId !== 'me'
                  ? `Inspecting order handling throughput and performance for ${effectiveStaff.name}`
                  : 'Personal order confirmation, processing throughput & delivered revenue ledger'}
              </p>
            </div>
          </div>

          {/* Right Controls: Staff Switcher (Super Admin Only) & Time Filter */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Staff Selector (Super Admin Exclusive Inspection Control) */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 shadow-xs">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider leading-none">
                    Inspect Staff Dashboard:
                  </span>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer mt-0.5"
                  >
                    <option value="me" className="dark:bg-slate-800 dark:text-white">My Handled Orders (Super Admin)</option>
                    <option value="all" className="dark:bg-slate-800 dark:text-white">All Staff Combined (Team Overview)</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id} className="dark:bg-slate-800 dark:text-white">
                        {s.name} ({s.role.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Time Range Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 text-xs">
              {(
                [
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: '7days', label: '7 Days' },
                  { id: '30days', label: '30 Days' },
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
                  {tr.label}
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
                Delivered Revenue
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-2">
                Revenue from confirmed orders now successfully delivered
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
              <span>{staffDeliveredOrders.length} delivered orders</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-200 dark:border-emerald-800">
                {deliverySuccessRate}% Success
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Confirmed Orders & Value */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                Total Confirmed
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-2">
                Total value of all orders confirmed by this staff member
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
              <span>{staffConfirmedOrders.length} confirmed orders</span>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Attributed Ledger</span>
            </div>
          </div>
        </div>

        {/* KPI 3: In-Transit / Processing Orders */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Processing & Shipping
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-2">
                Orders currently in transit or packaging at fulfillment
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-blue-50 dark:border-blue-950/60">
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
              {staffProcessingOrders.length}{' '}
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Orders</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span>Pipeline: ৳{processingTotalAmount.toLocaleString()}</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-extrabold border border-blue-200 dark:border-blue-800">
                {processingRate}% Processing
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Pending Queue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Pending Queue
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-2">
                New unconfirmed orders available to verify and claim
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {pendingPoolOrders.length}{' '}
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Pending</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span>Queue Value: ৳{pendingPoolTotalAmount.toLocaleString()}</span>
              <a
                href="#recent-incoming-queue"
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 cursor-pointer flex items-center gap-1"
              >
                <span>View Queue</span>
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
              <span>Order Handling & Delivery to Customer</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              Conversion throughput from order confirmation to final customer receipt
            </p>
          </div>

          {/* Metric Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-slate-700 dark:text-slate-200">Delivery Success:</span>
              <span className="font-black text-emerald-700 dark:text-emerald-300">{deliverySuccessRate}%</span>
              <span className="text-[10px] text-slate-400">({staffDeliveredOrders.length})</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="font-bold text-slate-700 dark:text-slate-200">Return Rate:</span>
              <span className="font-black text-amber-700 dark:text-amber-300">{returnRate}%</span>
              <span className="text-[10px] text-slate-400">({staffReturnedOrders.length})</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="font-bold text-slate-700 dark:text-slate-200">Cancel Rate:</span>
              <span className="font-black text-rose-700 dark:text-rose-300">{cancelRate}%</span>
              <span className="text-[10px] text-slate-400">({staffCancelledOrders.length})</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="font-bold text-slate-700 dark:text-slate-200">Processing:</span>
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
              title={`Delivered: ${staffDeliveredOrders.length} orders (${deliverySuccessRate}%)`}
            />
            <div
              style={{ width: `${Math.min(100, Math.max(0, Number(processingRate)))}%` }}
              className="bg-blue-600 h-full transition-all duration-500"
              title={`Processing / In-Transit: ${staffProcessingOrders.length} orders (${processingRate}%)`}
            />
            <div
              style={{ width: `${Math.min(100, Math.max(0, Number(returnRate)))}%` }}
              className="bg-amber-500 h-full transition-all duration-500"
              title={`Returned: ${staffReturnedOrders.length} orders (${returnRate}%)`}
            />
            <div
              style={{ width: `${Math.min(100, Math.max(0, Number(cancelRate)))}%` }}
              className="bg-rose-500 h-full transition-all duration-500"
              title={`Cancelled: ${staffCancelledOrders.length} orders (${cancelRate}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-1 pt-1 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Delivered ({deliverySuccessRate}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Processing ({processingRate}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Returned ({returnRate}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Cancelled ({cancelRate}%)</span>
            </div>
            <div className="text-slate-400 dark:text-slate-500 font-normal">
              Total Handled: {totalHandledCount}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Super Admin Staff Performance Table (Only Super Admin Can View & Inspect Other Staff) */}
      {isSuperAdmin && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Staff Order Handling Ledger & Attribution (Super Admin Inspection)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Live performance comparison: delivered revenue, cancellations, and return rates per team member
              </p>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {teamPerformanceSummary.length} Active Staff Accounts
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Confirmed</th>
                  <th className="py-3 px-4 text-blue-600">Processing</th>
                  <th className="py-3 px-4 text-emerald-600">Delivered</th>
                  <th className="py-3 px-4 text-rose-600">Cancelled</th>
                  <th className="py-3 px-4 text-amber-600">Returned</th>
                  <th className="py-3 px-4">Success Rate</th>
                  <th className="py-3 px-4">Return Rate</th>
                  <th className="py-3 px-4">Delivered Revenue</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {teamPerformanceSummary.map((staff) => {
                  const isSelected =
                    effectiveStaff.id === staff.id ||
                    (selectedStaffId === 'me' && staff.id === superAdminProfile.id);

                  return (
                    <tr
                      key={staff.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div>{staff.name}</div>
                            {staff.id === superAdminProfile.id && (
                              <span className="text-[10px] font-semibold text-blue-600">
                                (Super Admin - You)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {staff.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {staff.confirmedCount}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-blue-600">
                        {staff.processingCount}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600">
                        {staff.deliveredCount}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-rose-600">
                        {staff.cancelledCount}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-600">
                        {staff.returnedCount}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-emerald-700">
                          {staff.successRate}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-amber-700">
                          {staff.returnRate}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        ৳{staff.deliveredRevenue.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            if (staff.id === superAdminProfile.id) {
                              setSelectedStaffId('me');
                            } else {
                              setSelectedStaffId(staff.id);
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected ? 'Active View' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Orders Explorer: Handled Orders with 3 Clean Outcome Tabs (Delivered, Cancelled, Returned) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header with Title, Search, and 3 Outcome Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Handled Orders (হ্যান্ডেল করা অর্ডার)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Orders handled by <strong className="text-slate-800 dark:text-slate-200">{effectiveStaff.name}</strong> ({effectiveStaff.role.replace('_', ' ')}) classified by final fulfillment outcome
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order ID, customer, phone, courier..."
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
              <span>Delivered (ডেলিভারিড)</span>
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
                ({deliverySuccessRate}% Success)
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
              <span>Cancelled (ক্যানসেল)</span>
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
                ({cancelRate}% Cancel)
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
              <span>Returned (রিটার্ন)</span>
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
                ({returnRate}% Return Rate)
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
                <b>Delivered Orders:</b> Orders confirmed by {effectiveStaff.name} that were successfully received by customers. Total Realized Revenue:{' '}
                <strong className="text-emerald-700 font-bold">৳{deliveredRevenue.toLocaleString()}</strong> ({deliverySuccessRate}% Delivery Success).
              </span>
            )}
            {handledTab === 'cancelled' && (
              <span>
                <b>Cancelled Orders:</b> Orders that were cancelled from pending or after confirmation. Total Cancelled Value:{' '}
                <strong className="text-rose-700 font-bold">৳{cancelledTotalAmount.toLocaleString()}</strong> ({cancelRate}% Cancel Rate).
              </span>
            )}
            {handledTab === 'returned' && (
              <span>
                <b>Returned Orders:</b> Orders dispatched to courier that returned undelivered. Total Returned Value:{' '}
                <strong className="text-amber-700 font-bold">৳{returnedTotalAmount.toLocaleString()}</strong> ({returnRate}% Return Rate).
              </span>
            )}
          </div>
          <span className="font-bold text-slate-700">
            {currentDisplayedOrders.length} {handledTab} order(s)
          </span>
        </div>

        {/* Orders List: Responsive Table for Desktop & Cards for Mobile */}
        {currentDisplayedOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">
              No {handledTab} orders found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {handledTab === 'delivered' && 'No delivered orders recorded for this staff member yet.'}
              {handledTab === 'cancelled' && 'Great! No cancelled orders on record for this staff member.'}
              {handledTab === 'returned' && 'Excellent! Zero returned parcels on record for this staff member.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Order ID & Date</th>
                    <th className="py-3 px-4">Handled By</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Items & Destination</th>
                    <th className="py-3 px-4">Amount & Payment</th>
                    <th className="py-3 px-4">Status & Courier</th>
                    <th className="py-3 px-4 text-right">Actions</th>
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
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
                            <span>#{order.id}</span>
                            <button
                              onClick={() => handleCopy(order.id, `ord-${order.id}`)}
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                              title="Copy Order ID"
                            >
                              {copiedId === `ord-${order.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>
                              {new Date(order.createdAt).toLocaleDateString('en-US', {
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
                              Pending Claim
                            </span>
                          ) : (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <UserCheck className="w-3 h-3" />
                                {handlerName}
                              </span>
                              {order.confirmedAt && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {new Date(order.confirmedAt).toLocaleDateString('en-US', {
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
                            {order.deliveryName || order.customerName || 'Customer'}
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
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          </div>
                        </td>

                        {/* 4. Items & Destination */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="text-slate-900 dark:text-white font-bold">
                            {order.items?.length || 1} item(s)
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-[180px]">
                            {order.items?.map((it) => it.productName || it.name).join(', ')}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 mt-1 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {order.district || order.division || 'Bangladesh'}
                            </span>
                          </div>
                        </td>

                        {/* 5. Amount & Payment */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-black text-slate-900 dark:text-white text-sm">
                            ৳{(order.totalAmount || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                            {order.paymentMethod || 'Cash on Delivery'}
                          </div>
                          {isDelivered && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 mt-1 border border-emerald-200 dark:border-emerald-800">
                              <Check className="w-2.5 h-2.5" />
                              Delivered Revenue
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
                              {order.orderStatus}
                            </span>
                          </div>
                          {order.courierName && (
                            <div className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold mt-1">
                              Courier: {order.courierName}
                            </div>
                          )}
                          {order.trackingNumber && (
                            <div className="text-[10px] text-blue-700 dark:text-blue-400 font-mono font-bold mt-0.5">
                              Track: {order.trackingNumber}
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
                                <span>Confirm & Claim</span>
                              </button>
                            )}

                            {order.orderStatus === 'Confirmed' && (
                              <button
                                onClick={() => handleOpenActionModal(order, 'Processing')}
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>To Processing</span>
                              </button>
                            )}

                            {isProcessing && (
                              <button
                                onClick={() => handleOpenActionModal(order, 'Delivered')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Delivered</span>
                              </button>
                            )}

                            {onPrintInvoice && (
                              <button
                                onClick={() => onPrintInvoice(order)}
                                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="Print Invoice"
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
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white text-xs">
                        <span>#{order.id}</span>
                        <button
                          onClick={() => handleCopy(order.id, `ord-${order.id}`)}
                          className="text-slate-400 p-0.5"
                        >
                          {copiedId === `ord-${order.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
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
                        {order.orderStatus}
                      </span>
                    </div>

                    {/* Handled By & Date */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {isPending ? (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">Unassigned (Pending)</span>
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
                          {order.deliveryName || order.customerName || 'Customer'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {order.deliveryMobile || order.customerMobile}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {order.district || order.division || 'Bangladesh'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`tel:${order.deliveryMobile || order.customerMobile}`}
                          className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
                          title="Call Customer"
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
                          title="WhatsApp"
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
                          {order.items?.length || 1} item(s) • {order.paymentMethod || 'COD'}
                        </div>
                      </div>
                      {isDelivered && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          Revenue Realized
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
                          <span>Confirm & Claim</span>
                        </button>
                      )}

                      {order.orderStatus === 'Confirmed' && (
                        <button
                          onClick={() => handleOpenActionModal(order, 'Processing')}
                          className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>To Processing</span>
                        </button>
                      )}

                      {isProcessing && (
                        <button
                          onClick={() => handleOpenActionModal(order, 'Delivered')}
                          className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Delivered</span>
                        </button>
                      )}

                      {onPrintInvoice && (
                        <button
                          onClick={() => onPrintInvoice(order)}
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
                          title="Invoice"
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
                <span>Recent Incoming Orders (রিসেন্ট পেন্ডিং অর্ডার কিউ)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                  {pendingPoolOrders.length} Pending
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Newly placed customer orders awaiting phone confirmation. Call customer and click "Confirm & Claim" to take ownership.
              </p>
            </div>
          </div>

          {pendingPoolOrders.length > 6 && (
            <button
              onClick={() => setShowAllPending(!showAllPending)}
              className="px-3 py-1.5 rounded-xl border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>{showAllPending ? 'Show Top 6 Only' : `Show All (${pendingPoolOrders.length}) Pending`}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {pendingPoolOrders.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-1.5" />
            <p className="font-bold text-slate-700">All caught up!</p>
            <p className="text-[11px] mt-0.5">No pending orders waiting for confirmation right now.</p>
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
                        {ord.orderStatus}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {ord.deliveryName || ord.customerName || 'Customer'}
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono mt-0.5 flex items-center gap-2">
                        <span>{custPhone}</span>
                        {custPhone && (
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${custPhone}`}
                              className="text-slate-400 hover:text-blue-600 p-0.5"
                              title="Call Customer"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                            <a
                              href={generateWhatsAppLink(custPhone, ord.customerName || ord.deliveryName, ord.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-emerald-600 p-0.5"
                              title="WhatsApp Customer"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {ord.district || ord.division || 'Bangladesh'} • {ord.items?.length || 1} item(s)
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
                      <span>Confirm & Claim</span>
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
              <span>Recent Activity Audit Trail</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Realtime Ledger</span>
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
                      {new Date(log.timestamp).toLocaleTimeString('en-US', {
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
                  Target: {log.targetId}
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
                  <span>Update Order Status & Courier</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order #{selectedOrderForAction.id} -{' '}
                  {selectedOrderForAction.customerName || selectedOrderForAction.deliveryName}
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
                Select New Status:
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
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Courier Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Courier Service:
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
                Courier Tracking ID (Optional):
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
                Staff Note (Optional):
              </label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={2}
                placeholder="e.g. Phone confirmed with customer, ready for pickup..."
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOrderStatus}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Status</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
