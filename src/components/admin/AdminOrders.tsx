import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  CreditCard,
  AlertCircle,
  ExternalLink,
  X,
  Plus,
  ShoppingBag,
  Trash2,
  Check,
  UserCheck,
  Copy,
  User,
  Phone,
  MapPin,
  ShieldAlert,
  ShieldX,
  Link2,
  Zap,
  Edit3,
  Package,
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { useLanguage } from '../../context/LanguageContext';
import { hasPermission } from '../../lib/permissions';
import type {
  Order,
  OrderStatus,
  UserRole,
  StaffUser,
  Product,
  OrderItem,
  SiteSettings,
  CourierFraudReport,
  IpGeoLocation,
  ActivityLog,
} from '../../types/index.ts';
import { getOptimizedImageUrl, handleImageError } from '../../utils/imageOptimizer';
import {
  checkCourierFraud,
  formatAdvanceDeliveryMessage,
  normalizePhoneForCourier,
} from '../../lib/courierFraudService';
import { dispatchFakeOrderAlerts } from '../../lib/fakeOrderAlertService';
import { AdminEditOrderModal } from './AdminEditOrderModal';
import { AdminIpSecurityModal } from './AdminIpSecurityModal';
import { OrderLocationMapModal } from './OrderLocationMapModal';
import { getIpVersion } from '../../utils/ipUtils';
import {
  SUPPORTED_COURIERS,
  resolveCourierTrackingUrl,
  getCourierPortalUrl,
} from '../../utils/courierUtils';

import {
  type OrderTabId,
  type OrderColumnId,
  type OrderFiltersState,
  ESSENTIAL_ORDER_COLUMNS,
  DEFAULT_VISIBLE_ORDER_COLUMNS,
  INITIAL_ORDER_FILTERS,
  sanitizeVisibleOrderColumns,
  computeOrderStatusCounts,
  computeDuplicateMaps,
  applyOrderFilters,
  validateStatusTransition,
  exportOrdersToCsv,
  getOrderTabBucket,
} from './orders/orderHelpers';
import { OrderStatusTabs } from './orders/OrderStatusTabs';
import { OrderFilterToolbar } from './orders/OrderFilterToolbar';
import { OrderBulkActionBar } from './orders/OrderBulkActionBar';
import { OrderTable } from './orders/OrderTable';
import { OrderDetailsPage } from './orders/OrderDetailsPage';
import { BatchInvoiceModal } from './orders/BatchInvoiceModal';
import {
  SaasDonutChart,
  SaasLineAreaChart,
  CollapsibleAnalyticsPanel,
  SAAS_CHART_COLORS,
} from './charts/AdminCharts';

interface AdminOrdersProps {
  orders: Order[];
  products?: Product[];
  staffList?: StaffUser[];
  onUpdateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    courierName?: string,
    trackingNumber?: string,
    handledByStaff?: { id?: string; name?: string; role?: string },
    adminNotes?: string,
    trackingUrl?: string
  ) => void;
  onUpdateOrder?: (orderId: string, updates: Partial<Order>) => void;
  onVerifyPayment: (orderId: string) => void;
  onPrintInvoice: (order: Order) => void;
  onAddOrder?: (newOrder: Order) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  initialScope?:
    | 'all'
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'delivered'
    | 'cancelled'
    | 'rejected'
    | 'fake_order'
    | 'my_orders';
  settings?: SiteSettings;
  isConfirmedOrdersTab?: boolean;
  initialSearchQuery?: string;
  onNavigateToOrdersWithSearch?: (searchQuery: string) => void;
  activityLogs?: ActivityLog[];
  onRecordAudit?: (
    action: string,
    module: string,
    targetId: string,
    details: string,
    meta?: {
      orderId?: string;
      productId?: string;
      fromStatus?: string;
      toStatus?: string;
      staffEmail?: string;
      source?: string;
    }
  ) => void;
}

const COLUMNS_STORAGE_KEY = 'kenax_admin_order_columns_v2';

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  orders = [],
  products = [],
  staffList = [],
  onUpdateOrderStatus,
  onUpdateOrder,
  onVerifyPayment,
  onPrintInvoice,
  onAddOrder,
  currentRole,
  currentStaff,
  initialScope,
  settings,
  isConfirmedOrdersTab = false,
  initialSearchQuery = '',
  onNavigateToOrdersWithSearch,
  activityLogs = [],
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const isConfirmedOrdersSection = isConfirmedOrdersTab || initialScope === 'confirmed';

  // RBAC capabilities
  const isSuperAdmin = currentRole === 'super_admin' || currentStaff?.role === 'super_admin';
  const isModeratorRole = currentRole === 'moderator' || currentStaff?.role === 'moderator';
  const staffCustomPerms = currentStaff?.permissions;

  const canCreateOrder = hasPermission(currentRole, staffCustomPerms, 'orders.create');
  const canEditOrder = hasPermission(currentRole, staffCustomPerms, 'orders.edit');
  const canChangeStatus = hasPermission(currentRole, staffCustomPerms, 'orders.status');
  const canCancelOrder = hasPermission(currentRole, staffCustomPerms, 'orders.cancel');
  const canVerifyPayment = hasPermission(currentRole, staffCustomPerms, 'payments.verify');
  const canMarkSpam =
    isSuperAdmin ||
    currentRole === 'admin' ||
    currentRole === 'manager' ||
    hasPermission(currentRole, staffCustomPerms, 'orders.manage');
  const canViewIpIntelligence =
    isSuperAdmin ||
    currentRole === 'admin' ||
    currentRole === 'manager' ||
    currentStaff?.role === 'admin' ||
    currentStaff?.role === 'manager';

  // Core UI state
  const resolveInitialTab = (): OrderTabId => {
    if (initialSearchQuery) return 'all';
    if (isConfirmedOrdersSection) return 'confirmed';
    if (initialScope === 'processing') return 'processing';
    if (initialScope === 'delivered') return 'delivered';
    if (initialScope === 'cancelled' || initialScope === 'rejected') return 'cancelled';
    if (initialScope === 'fake_order') return 'spam';
    return 'all';
  };

  const [activeTab, setActiveTab] = useState<OrderTabId>(resolveInitialTab);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [filters, setFilters] = useState<OrderFiltersState>(INITIAL_ORDER_FILTERS);
  const [ipFilterOverride, setIpFilterOverride] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'totalAmount' | 'id'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Column visibility (persisted in localStorage, always preserving essential columns)
  const [visibleColumns, setVisibleColumns] = useState<OrderColumnId[]>(() => {
    try {
      const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeVisibleOrderColumns(parsed);
        }
      }
    } catch {}
    return DEFAULT_VISIBLE_ORDER_COLUMNS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
    } catch {}
  }, [visibleColumns]);

  const handleToggleColumn = (colId: OrderColumnId) => {
    if (ESSENTIAL_ORDER_COLUMNS.includes(colId)) return;
    setVisibleColumns((prev) => {
      const next = prev.includes(colId)
        ? prev.filter((id) => id !== colId)
        : [...prev, colId];
      return sanitizeVisibleOrderColumns(next);
    });
  };

  const handleResetColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_ORDER_COLUMNS);
  };

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
      setActiveTab('all');
      setFilters(INITIAL_ORDER_FILTERS);
      setIpFilterOverride('all');
      setCurrentPage(1);
    }
  }, [initialSearchQuery]);

  // Scoped base orders (Reseller exclusion + Moderator isolation)
  const scopedOrders = useMemo(() => {
    return (orders || []).filter((order) => {
      if (!order) return false;
      const isResellerOrder = Boolean(
        (order as any).resellerId ||
          (order as any).resellerStoreName ||
          (order as any).isResellerOrder ||
          (order.notes && order.notes.includes('[Dropship:'))
      );
      if (isResellerOrder) return false;

      if (isModeratorRole && currentStaff) {
        const bucket = getOrderTabBucket(order);
        const isMine =
          (order.handledByStaffId && order.handledByStaffId === currentStaff.id) ||
          (order.createdByStaffId && order.createdByStaffId === currentStaff.id) ||
          (order.handledByStaffName && order.handledByStaffName === currentStaff.name) ||
          (order.createdByStaffName && order.createdByStaffName === currentStaff.name);
        if (bucket !== 'pending' && !isMine) return false;
      }

      return true;
    });
  }, [orders, isModeratorRole, currentStaff]);

  // Courier fraud checks map
  const [fraudReports, setFraudReports] = useState<Record<string, CourierFraudReport>>({});
  const [checkingFraudFor, setCheckingFraudFor] = useState<string | null>(null);
  const [selectedFraudModalReport, setSelectedFraudModalReport] = useState<{
    report: CourierFraudReport;
    order: Order;
  } | null>(null);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; tone?: 'success' | 'error' } | null>(null);
  const showSaveNotification = useCallback((text: string, tone: 'success' | 'error' = 'success') => {
    setToastMessage({ text, tone });
    setTimeout(() => {
      setToastMessage((curr) => (curr?.text === text ? null : curr));
    }, 3600);
  }, []);

  // Confirmation Modal for critical operations (no browser alert/confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    tone: 'danger' | 'primary';
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Server query sync state for paginated endpoint verification
  const [serverQueryInfo, setServerQueryInfo] = useState<{
    orders: Order[];
    total: number;
    page: number;
    totalPages: number;
    counts: Record<OrderTabId, number>;
    active: boolean;
  } | null>(null);

  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      status: activeTab,
      search: searchQuery.trim(),
      payment: filters.payment,
      channel: filters.channel,
      address: filters.address,
      onlinePayment: filters.onlinePayment,
      adNetwork: filters.adNetwork,
      siteUpdate: filters.siteUpdate,
      duplicates: filters.duplicates,
      orderCheck: filters.orderCheck,
      sortBy,
      sortDir,
      page: String(currentPage),
      limit: String(rowsPerPage),
      role: String(currentRole || 'super_admin'),
      staffId: String(currentStaff?.id || ''),
      staffName: String(currentStaff?.name || ''),
    });

    fetch(`/api/orders/manage?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.orders)) return;
        setServerQueryInfo({
          orders: data.orders,
          total: data.total ?? data.orders.length,
          page: data.page ?? currentPage,
          totalPages: data.totalPages ?? 1,
          counts: data.counts,
          active: true,
        });
      })
      .catch(() => {
        // Keep client fallback seamlessly
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    searchQuery,
    filters,
    sortBy,
    sortDir,
    currentPage,
    rowsPerPage,
    currentRole,
    currentStaff?.id,
    currentStaff?.name,
    orders.length,
    refreshTick,
  ]);

  // Client computed duplicate map, status counts & filtered list (always synced with live React state)
  const duplicateMaps = useMemo(() => computeDuplicateMaps(scopedOrders), [scopedOrders]);
  const clientStatusCounts = useMemo(() => computeOrderStatusCounts(scopedOrders), [scopedOrders]);

  const filteredOrders = useMemo(() => {
    const list = applyOrderFilters(
      scopedOrders,
      activeTab,
      searchQuery,
      filters,
      duplicateMaps,
      fraudReports,
      ipFilterOverride
    );

    const sorted = [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'totalAmount') {
        return ((a.totalAmount || 0) - (b.totalAmount || 0)) * dir;
      }
      if (sortBy === 'id') {
        return String(a.id || '').localeCompare(String(b.id || '')) * dir;
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (bTime !== aTime) return (aTime - bTime) * dir;
      return String(a.id || '').localeCompare(String(b.id || '')) * dir;
    });

    return sorted;
  }, [
    scopedOrders,
    activeTab,
    searchQuery,
    filters,
    duplicateMaps,
    fraudReports,
    ipFilterOverride,
    sortBy,
    sortDir,
  ]);

  // Use server counts if server matches scopedOrders count, else use live React state counts
  const effectiveCounts = useMemo(() => {
    if (serverQueryInfo?.counts && serverQueryInfo.counts.all === scopedOrders.length) {
      return serverQueryInfo.counts;
    }
    return clientStatusCounts;
  }, [serverQueryInfo, scopedOrders.length, clientStatusCounts]);

  const totalFilteredRows = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredRows / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage;
    return filteredOrders.slice(start, start + rowsPerPage);
  }, [filteredOrders, safeCurrentPage, rowsPerPage]);

  // Background check courier success rate for visible page orders
  useEffect(() => {
    const pageSlice = paginatedOrders.slice(0, 15);
    pageSlice.forEach((order) => {
      const phone = order.customerMobile || order.deliveryMobile;
      if (phone && !fraudReports[order.id] && !order.courierCheckSummary) {
        checkCourierFraud(phone, {
          apiKey: settings?.steadfastApiKey,
          secretKey: settings?.steadfastSecretKey,
        })
          .then((rep) => {
            setFraudReports((prev) => (prev[order.id] ? prev : { ...prev, [order.id]: rep }));
          })
          .catch(() => {});
      }
    });
  }, [paginatedOrders, settings?.steadfastApiKey, settings?.steadfastSecretKey]);

  // Row selection & Bulk operations
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [batchPrintOrders, setBatchPrintOrders] = useState<Order[]>([]);

  // Clear invalid selections when page/filter changes
  useEffect(() => {
    setSelectedOrderIds((prev) => prev.filter((id) => scopedOrders.some((o) => o.id === id)));
  }, [scopedOrders]);

  const handleToggleSelectAll = () => {
    const pageIds = paginatedOrders.map((o) => o.id);
    const allChecked = pageIds.length > 0 && pageIds.every((id) => selectedOrderIds.includes(id));
    if (allChecked) {
      setSelectedOrderIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectRow = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Order Details Drawer State
  const [drawerOrder, setDrawerOrder] = useState<Order | null>(null);
  const [drawerFocus, setDrawerFocus] = useState<'overview' | 'notes' | 'timeline'>('overview');

  // Keep drawerOrder synced when orders update
  useEffect(() => {
    if (!drawerOrder) return;
    const latest = orders.find((o) => o.id === drawerOrder.id);
    if (latest) setDrawerOrder(latest);
  }, [orders, drawerOrder?.id]);

  const handleOpenOrderDrawer = (
    order: Order,
    focus: 'overview' | 'notes' | 'timeline' = 'overview'
  ) => {
    setDrawerFocus(focus);
    setDrawerOrder(order);
  };

  // Handlers for Staff Assignment, Status Change, Fulfillment Change, Internal Notes
  const handleAssignStaff = async (order: Order, staff: StaffUser | null) => {
    const staffId = staff?.id || '';
    const staffName = staff?.name || '';
    const staffRole = staff?.role || '';

    if (onUpdateOrder) {
      onUpdateOrder(order.id, {
        handledByStaffId: staffId,
        handledByStaffName: staffName,
        handledByStaffRole: staffRole,
      });
    }

    try {
      await fetch(`/api/orders/${encodeURIComponent(order.id)}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          staffName,
          staffRole,
          actorName: currentStaff?.name || 'Admin',
        }),
      });
      setRefreshTick((t) => t + 1);
    } catch {}

    showSaveNotification(
      staff
        ? `Order #${order.id} assigned to ${staff.name}.`
        : `Order #${order.id} unassigned.`
    );
  };

  const executeStatusChange = (order: Order, nextStatus: OrderStatus) => {
    const activeStaff = currentStaff
      ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
      : undefined;

    onUpdateOrderStatus(
      order.id,
      nextStatus,
      order.courierName,
      order.trackingNumber,
      activeStaff
    );

    if (nextStatus === 'Spam' || nextStatus === 'Fake Order') {
      dispatchFakeOrderAlerts({
        order: { ...order, isFakeOrder: true, orderStatus: nextStatus },
        staff: currentStaff,
        note: `Marked as ${nextStatus} by Staff`,
      }).catch(() => {});
    }

    setRefreshTick((t) => t + 1);
    showSaveNotification(`Order #${order.id} updated to "${nextStatus}".`);
  };

  const handleChangeStatus = (order: Order, nextStatus: OrderStatus) => {
    if (!canChangeStatus) {
      showSaveNotification('You do not have permission to change order status.', 'error');
      return;
    }

    const validation = validateStatusTransition(order, nextStatus, isSuperAdmin);
    if (!validation.allowed) {
      showSaveNotification(validation.reason || 'Status transition not allowed.', 'error');
      return;
    }

    if (validation.requiresConfirmation) {
      setConfirmDialog({
        title: `Confirm ${nextStatus}`,
        description: `Are you sure you want to mark order #${order.id} as "${nextStatus}"? This action updates order status and timeline.`,
        confirmLabel: `Yes, Mark ${nextStatus}`,
        tone: 'danger',
        onConfirm: () => {
          executeStatusChange(order, nextStatus);
          setConfirmDialog(null);
        },
      });
      return;
    }

    executeStatusChange(order, nextStatus);
  };

  const handleChangeFulfillment = (order: Order, nextFulfillment: string) => {
    if (!onUpdateOrder) return;
    onUpdateOrder(order.id, {
      fulfillmentStatus: nextFulfillment,
    });
    setRefreshTick((t) => t + 1);
    showSaveNotification(`Order #${order.id} fulfillment set to "${nextFulfillment}".`);
  };

  const handleAddInternalNote = async (order: Order, note: string) => {
    const entry = {
      id: `note-${Date.now()}`,
      note,
      authorName: currentStaff?.name || 'Admin',
      authorRole: currentStaff?.role || currentRole || 'admin',
      createdAt: new Date().toISOString(),
    };
    const nextList = [entry, ...(order.internalNotesList || [])];

    if (onUpdateOrder) {
      onUpdateOrder(order.id, {
        internalNotesList: nextList,
        adminNotes: note,
      });
    }

    try {
      await fetch(`/api/orders/${encodeURIComponent(order.id)}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note,
          authorName: entry.authorName,
          authorRole: entry.authorRole,
        }),
      });
      setRefreshTick((t) => t + 1);
    } catch {}

    showSaveNotification(`Internal note added to #${order.id}.`);
  };

  const handleUnfakeOrder = (order: Order) => {
    if (!isSuperAdmin) {
      showSaveNotification('Only Super Admin can restore Spam / Fake orders.', 'error');
      return;
    }
    const activeStaff = currentStaff
      ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
      : { id: 'super_admin', name: 'Super Admin', role: 'super_admin' };
    onUpdateOrderStatus(
      order.id,
      'Pending',
      order.courierName,
      order.trackingNumber,
      activeStaff,
      'Restored from Spam / Fake Order to Valid Order by Super Admin'
    );
    setRefreshTick((t) => t + 1);
    showSaveNotification(`Order #${order.id} restored to Pending.`);
  };

  // Bulk handlers using /api/orders/bulk + local App state sync
  const runBulkAction = async (
    payload: {
      action: 'assign_staff' | 'change_status' | 'mark_spam';
      status?: OrderStatus;
      staffId?: string;
      staffName?: string;
      staffRole?: string;
    }
  ) => {
    if (selectedOrderIds.length === 0) return;
    setIsBulkBusy(true);
    try {
      const res = await fetch('/api/orders/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          ...payload,
          actorName: currentStaff?.name || 'Admin',
          actorRole: currentStaff?.role || currentRole || 'super_admin',
        }),
      });
      const data = await res.json();

      const updatedIds: string[] = Array.isArray(data?.updatedIds) ? data.updatedIds : selectedOrderIds;
      const skipped: Array<{ id: string; reason: string }> = Array.isArray(data?.skipped) ? data.skipped : [];

      // Sync React App state immediately
      updatedIds.forEach((id) => {
        const ord = scopedOrders.find((o) => o.id === id);
        if (!ord) return;
        if (payload.action === 'assign_staff' && onUpdateOrder) {
          onUpdateOrder(id, {
            handledByStaffId: payload.staffId || '',
            handledByStaffName: payload.staffName || '',
            handledByStaffRole: payload.staffRole || '',
          });
        } else if (payload.action === 'change_status' || payload.action === 'mark_spam') {
          const target = payload.action === 'mark_spam' ? 'Spam' : (payload.status || 'Confirmed');
          onUpdateOrderStatus(
            id,
            target,
            ord.courierName,
            ord.trackingNumber,
            currentStaff ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role } : undefined
          );
        }
      });

      setSelectedOrderIds([]);
      setRefreshTick((t) => t + 1);

      if (skipped.length > 0) {
        showSaveNotification(
          `Updated ${updatedIds.length} orders. Skipped ${skipped.length} (${skipped[0].reason}).`
        );
      } else {
        showSaveNotification(`Successfully updated ${updatedIds.length} selected orders.`);
      }
    } catch (err) {
      console.error('Bulk order update failed:', err);
      showSaveNotification('Bulk order update failed. Please try again.', 'error');
    } finally {
      setIsBulkBusy(false);
    }
  };

  const handleBulkAssignStaff = (staff: StaffUser | null) => {
    runBulkAction({
      action: 'assign_staff',
      staffId: staff?.id || '',
      staffName: staff?.name || '',
      staffRole: staff?.role || '',
    });
  };

  const handleBulkChangeStatus = (nextStatus: OrderStatus) => {
    const isCritical = ['Cancelled', 'Spam', 'Fake Order', 'Returned', 'Failed Delivery'].includes(nextStatus);
    if (isCritical) {
      setConfirmDialog({
        title: `Bulk Change to ${nextStatus}`,
        description: `Apply "${nextStatus}" to ${selectedOrderIds.length} selected orders? Delivered orders will be automatically protected and skipped.`,
        confirmLabel: `Confirm ${nextStatus}`,
        tone: 'danger',
        onConfirm: () => {
          setConfirmDialog(null);
          runBulkAction({ action: 'change_status', status: nextStatus });
        },
      });
      return;
    }
    runBulkAction({ action: 'change_status', status: nextStatus });
  };

  const handleBulkMarkSpam = () => {
    setConfirmDialog({
      title: 'Mark Selected Orders as Spam',
      description: `Mark ${selectedOrderIds.length} selected order(s) as Spam? Delivered orders will be protected and skipped.`,
      confirmLabel: 'Mark as Spam',
      tone: 'danger',
      onConfirm: () => {
        setConfirmDialog(null);
        runBulkAction({ action: 'mark_spam' });
      },
    });
  };

  const handleBulkExport = () => {
    const selected = scopedOrders.filter((o) => selectedOrderIds.includes(o.id));
    exportOrdersToCsv(selected, 'kenax-selected-orders');
    showSaveNotification(`Exported ${selected.length} orders to CSV.`);
  };

  const handleBulkPrintInvoices = () => {
    const selected = scopedOrders.filter((o) => selectedOrderIds.includes(o.id));
    if (selected.length === 1) {
      onPrintInvoice(selected[0]);
      return;
    }
    setBatchPrintOrders(selected);
  };

  // Courier Fraud & Check handler
  const handleCheckFraud = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const phone = order.customerMobile || order.deliveryMobile;
    if (!phone) {
      showSaveNotification('Customer phone number missing for courier check.', 'error');
      return;
    }

    setCheckingFraudFor(order.id);
    try {
      const rep = await checkCourierFraud(phone, {
        apiKey: settings?.steadfastApiKey,
        secretKey: settings?.steadfastSecretKey,
      });
      setFraudReports((prev) => ({ ...prev, [order.id]: rep }));
      if (onUpdateOrder) {
        onUpdateOrder(order.id, {
          courierCheckStatus:
            rep.riskLevel === 'safe'
              ? 'verified'
              : rep.riskLevel === 'high_risk'
              ? 'risky'
              : 'unverified',
          courierCheckSummary: {
            successRate: rep.successRate,
            totalOrders: rep.totalOrders,
            deliveredOrders: rep.deliveredOrders,
            cancelledOrders: rep.cancelledOrders,
            returnedOrders: rep.returnedOrders,
            riskLevel: rep.riskLevel,
            checkedAt: new Date().toISOString(),
          },
        });
      }
      setSelectedFraudModalReport({ report: rep, order });
    } catch (err) {
      console.error('Fraud check error:', err);
      showSaveNotification('Failed to fetch courier check data.', 'error');
    } finally {
      setCheckingFraudFor(null);
    }
  };

  const handleSendAdvanceFeeWhatsApp = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const phone = order.customerMobile || order.deliveryMobile;
    if (!phone) return;
    const cleanPhone = normalizePhoneForCourier(phone);
    const intlPhone = cleanPhone.startsWith('0') ? `88${cleanPhone}` : `880${cleanPhone}`;
    const amount = settings?.advanceDeliveryFeeAmount || 120;
    const msg = formatAdvanceDeliveryMessage(order.customerName, amount, order.id, {
      siteName: settings?.siteName || 'KenaX BD',
      bkash: settings?.whatsappNumber || '01719143897',
      nagad: settings?.whatsappNumber || '01719143897',
    });
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  // IP & Map helpers (preserved cleanly)
  const getOrderEffectiveIp = (ord?: Order | null): string => {
    if (!ord) return '';
    const raw = (ord.customerIp || '').trim();
    return raw && raw !== 'N/A' && raw !== 'unknown' && raw !== 'undefined' && raw !== 'null' ? raw : '';
  };

  const handleFilterByIp = (ipToFilter: string) => {
    const cleanIp = ipToFilter.trim();
    if (!cleanIp) return;
    if (isConfirmedOrdersSection && onNavigateToOrdersWithSearch) {
      onNavigateToOrdersWithSearch(cleanIp);
      return;
    }
    setSearchQuery(cleanIp);
    setActiveTab('all');
    setFilters(INITIAL_ORDER_FILTERS);
    setIpFilterOverride('all');
    setCurrentPage(1);
    setDrawerOrder(null);
    setIsIpModalOpen(false);
    showSaveNotification(`Filtered orders by IP: ${cleanIp}`);
  };

  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [ipBlockModalTarget, setIpBlockModalTarget] = useState<string | null>(null);
  const [ipBlockReasonSelection, setIpBlockReasonSelection] = useState('Fake Orders / Fraud Investigation');
  const [ipCustomReasonText, setIpCustomReasonText] = useState('');
  const [mapModalData, setMapModalData] = useState<{
    isOpen: boolean;
    ip: string;
    orderId?: string;
    customerName?: string;
    deliveryAddress?: string;
    geoData?: IpGeoLocation | null;
  }>({ isOpen: false, ip: '' });

  const handleOpenLocationMap = async (order: Order) => {
    const effectiveIp = getOrderEffectiveIp(order);
    const addr =
      order.fullAddress ||
      (typeof order.deliveryAddress === 'string' ? order.deliveryAddress : '') ||
      `${order.district || ''}, ${order.division || ''}`;

    if (order.ipGeoData || order.ipCity || (order.ipLatitude && order.ipLongitude)) {
      setMapModalData({
        isOpen: true,
        ip: effectiveIp,
        orderId: order.id,
        customerName: order.deliveryName || order.customerName,
        deliveryAddress: addr,
        geoData: order.ipGeoData || {
          ip: effectiveIp,
          ipVersion: (order.ipVersion as any) || getIpVersion(effectiveIp),
          country: order.ipCountry,
          region: order.ipRegion,
          city: order.ipCity,
          latitude: order.ipLatitude,
          longitude: order.ipLongitude,
          isp: order.ipIsp,
          connectionType: order.ipConnectionType,
          accuracyStatus: order.ipLocationAccuracy || 'approximate',
          detectionSource: order.ipCaptureSource,
          isTrustedProxy: order.isTrustedProxy,
          proxyType: order.ipProxyType,
        },
      });
      return;
    }

    try {
      const res = await fetch(`/api/admin/ip-lookup/${encodeURIComponent(effectiveIp)}`);
      const data = await res.json();
      const geo = data.geo || null;
      if (geo && onUpdateOrder) {
        onUpdateOrder(order.id, {
          ipCountry: geo.country,
          ipRegion: geo.region,
          ipCity: geo.city,
          ipLatitude: geo.latitude,
          ipLongitude: geo.longitude,
          ipIsp: geo.isp,
          ipConnectionType: geo.connectionType,
          ipLocationAccuracy: geo.accuracyStatus,
          ipGeoData: geo,
        });
      }
      setMapModalData({
        isOpen: true,
        ip: effectiveIp,
        orderId: order.id,
        customerName: order.deliveryName || order.customerName,
        deliveryAddress: addr,
        geoData: geo,
      });
    } catch {
      setMapModalData({
        isOpen: true,
        ip: effectiveIp,
        orderId: order.id,
        customerName: order.deliveryName || order.customerName,
        deliveryAddress: addr,
        geoData: null,
      });
    }
  };

  // Edit Order Modal
  const [editingOrderModal, setEditingOrderModal] = useState<Order | null>(null);

  // Quick Complete Incomplete Order Modal State
  const [quickCompleteOrder, setQuickCompleteOrder] = useState<Order | null>(null);
  const [completeName, setCompleteName] = useState('');
  const [completeMobile, setCompleteMobile] = useState('');
  const [completeAddress, setCompleteAddress] = useState('');
  const [completeDistrict, setCompleteDistrict] = useState('');
  const [completeDivision, setCompleteDivision] = useState('Dhaka');
  const [completeDeliveryCharge, setCompleteDeliveryCharge] = useState<number>(70);
  const [completeNotes, setCompleteNotes] = useState('');

  const handleOpenQuickComplete = (order: Order) => {
    setQuickCompleteOrder(order);
    setCompleteName(order.deliveryName || order.customerName || '');
    setCompleteMobile(order.deliveryMobile || order.customerMobile || order.phone || '');
    setCompleteAddress(order.fullAddress || order.deliveryAddress || order.address || '');
    setCompleteDistrict(order.district || '');
    setCompleteDivision(order.division || 'Dhaka');
    setCompleteDeliveryCharge(
      order.deliveryCharge || (order.district?.toLowerCase().includes('dhaka') ? 70 : 130)
    );
    setCompleteNotes(order.deliveryInstructions || order.adminNotes || '');
  };

  const handleSaveQuickComplete = (targetStatus: 'Pending' | 'Confirmed' = 'Confirmed') => {
    if (!quickCompleteOrder) return;
    const finalName = completeName.trim() || 'Customer';
    const finalMobile = completeMobile.trim();
    const finalAddress = completeAddress.trim();
    const finalDistrict = completeDistrict.trim() || 'Dhaka';
    const finalDivision = completeDivision.trim() || 'Dhaka';
    const baseSubtotal =
      quickCompleteOrder.subtotal ||
      (quickCompleteOrder.items || []).reduce((s, i) => s + i.price * i.quantity, 0);
    const newTotal = baseSubtotal + completeDeliveryCharge - (quickCompleteOrder.discount || 0);

    if (onUpdateOrder) {
      onUpdateOrder(quickCompleteOrder.id, {
        customerName: finalName,
        deliveryName: finalName,
        customerMobile: finalMobile,
        deliveryMobile: finalMobile,
        phone: finalMobile,
        mobile: finalMobile,
        fullAddress: finalAddress,
        deliveryAddress: finalAddress,
        shippingAddress: finalAddress,
        district: finalDistrict,
        division: finalDivision,
        deliveryCharge: completeDeliveryCharge,
        totalAmount: newTotal,
        isIncompleteOrder: false,
        incompleteReason: undefined,
        missingFields: [],
        adminNotes: completeNotes || quickCompleteOrder.adminNotes,
      });
    }

    onUpdateOrderStatus(
      quickCompleteOrder.id,
      targetStatus,
      quickCompleteOrder.courierName,
      quickCompleteOrder.trackingNumber,
      currentStaff ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role } : undefined,
      `Incomplete order details completed & saved as ${targetStatus}`
    );

    showSaveNotification(`Order #${quickCompleteOrder.id} updated and moved to ${targetStatus}.`);
    setQuickCompleteOrder(null);
  };

  // 1-Click Courier Booking Modal State
  const [bookingModalOrder, setBookingModalOrder] = useState<Order | null>(null);
  const [bookingTargetStatus, setBookingTargetStatus] = useState<OrderStatus>('In Transit');
  const [bookingCourier, setBookingCourier] = useState('Steadfast Courier');
  const [bookingTrackingId, setBookingTrackingId] = useState('');
  const [bookingTrackingUrl, setBookingTrackingUrl] = useState('');
  const [bookingCopiedField, setBookingCopiedField] = useState<string | null>(null);

  const handleOpenBookingModal = (order: Order, targetStatus: OrderStatus = 'In Transit') => {
    setBookingModalOrder(order);
    setBookingTargetStatus(targetStatus);
    const initialCourier = order.courierName || 'Steadfast Courier';
    const initialTracking = order.trackingNumber || '';
    setBookingCourier(initialCourier);
    setBookingTrackingId(initialTracking);
    setBookingTrackingUrl(
      order.trackingUrl ||
        (initialTracking ? resolveCourierTrackingUrl(initialCourier, initialTracking) : '')
    );
  };

  const handleConfirmCourierBooking = (shouldAdvanceStatus: boolean = true) => {
    if (!bookingModalOrder) return;
    const finalTracking = bookingTrackingId.trim();
    const finalUrl =
      bookingTrackingUrl.trim() || resolveCourierTrackingUrl(bookingCourier, finalTracking);
    const nextStatus: OrderStatus = shouldAdvanceStatus
      ? bookingTargetStatus || 'In Transit'
      : bookingModalOrder.orderStatus;
    const activeStaff = currentStaff
      ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
      : undefined;

    onUpdateOrderStatus(
      bookingModalOrder.id,
      nextStatus,
      bookingCourier,
      finalTracking,
      activeStaff,
      `Courier booked via ${bookingCourier}. Tracking: ${finalTracking}`,
      finalUrl
    );

    if (onUpdateOrder) {
      onUpdateOrder(bookingModalOrder.id, {
        fulfillmentStatus: shouldAdvanceStatus ? 'Shipped' : bookingModalOrder.fulfillmentStatus,
      });
    }

    showSaveNotification(
      shouldAdvanceStatus
        ? `Order #${bookingModalOrder.id} booked with ${bookingCourier} & updated to ${nextStatus}.`
        : `Courier info saved for #${bookingModalOrder.id}.`
    );
    setBookingModalOrder(null);
  };

  const handleCopyBookingInfo = (order: Order) => {
    const text = `Recipient: ${order.deliveryName || order.customerName}\nPhone: ${order.deliveryMobile || order.customerMobile}\nAddress: ${order.fullAddress || ''}, ${order.upazila || ''}, ${order.district || ''}\nCOD Amount: ৳${order.totalAmount}\nInvoice: #${order.id}\nNote: ${order.deliveryInstructions || 'Standard Express Delivery'}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setBookingCopiedField('all');
    setTimeout(() => setBookingCopiedField(null), 2500);
    showSaveNotification('Booking info copied to clipboard.');
  };

  // Manual Order Creation Modal State (preserved cleanly)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custDivision, setCustDivision] = useState('Dhaka');
  const [custDistrict, setCustDistrict] = useState('Dhaka');
  const [paymentOptionType, setPaymentOptionType] = useState<'cod' | 'full' | 'delivery_only'>('cod');
  const [payMethod, setPayMethod] = useState<'Cash on Delivery' | 'bKash' | 'Nagad' | 'Rocket'>('Cash on Delivery');
  const [senderMobileNumber, setSenderMobileNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [copiedPaymentNumber, setCopiedPaymentNumber] = useState<string | null>(null);
  const [delivCharge, setDelivCharge] = useState<number>(70);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [initialOrderStatus, setInitialOrderStatus] = useState<OrderStatus>('Confirmed');
  const [manualOrderError, setManualOrderError] = useState<string | null>(null);

  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [orderItems, setOrderItems] = useState<
    Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
      image: string;
      selectedVariant?: string;
      selectedColor?: string;
      selectedSize?: string;
    }>
  >([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');

  const activeSelectedProduct = products.find((p) => p.id === selectedProductId);

  const availableColors: string[] = useMemo(() => {
    if (!activeSelectedProduct) return [];
    const list: string[] = [];
    if (activeSelectedProduct.colors && activeSelectedProduct.colors.length > 0) {
      activeSelectedProduct.colors.forEach((c) => {
        const name = typeof c === 'string' ? c : c.name || c.colorName;
        if (name && !list.includes(name)) list.push(name);
      });
    }
    const colorVar = activeSelectedProduct.variations?.find(
      (v) => v.type === 'color' || v.name.toLowerCase() === 'color'
    );
    if (colorVar) {
      (colorVar.options || colorVar.values || []).forEach((opt) => {
        if (opt && !list.includes(opt)) list.push(opt);
      });
    }
    return list;
  }, [activeSelectedProduct]);

  const availableSizes: string[] = useMemo(() => {
    if (!activeSelectedProduct) return [];
    const list: string[] = [];
    if (activeSelectedProduct.sizes && activeSelectedProduct.sizes.length > 0) {
      activeSelectedProduct.sizes.forEach((s) => {
        if (s && !list.includes(s)) list.push(s);
      });
    }
    const sizeVar = activeSelectedProduct.variations?.find(
      (v) => v.type === 'size' || v.name.toLowerCase() === 'size'
    );
    if (sizeVar) {
      (sizeVar.options || sizeVar.values || []).forEach((opt) => {
        if (opt && !list.includes(opt)) list.push(opt);
      });
    }
    return list;
  }, [activeSelectedProduct]);

  useEffect(() => {
    if (activeSelectedProduct) {
      setSelectedColor(availableColors.length > 0 ? availableColors[0] : '');
      setSelectedSize(availableSizes.length > 0 ? availableSizes[0] : '');
    } else {
      setSelectedColor('');
      setSelectedSize('');
    }
  }, [selectedProductId, availableColors, availableSizes]);

  const bkashGw = settings?.paymentGateways?.find((g) => g.id === 'bkash' || g.name.toLowerCase().includes('bkash'));
  const nagadGw = settings?.paymentGateways?.find((g) => g.id === 'nagad' || g.name.toLowerCase().includes('nagad'));
  const rocketGw = settings?.paymentGateways?.find((g) => g.id === 'rocket' || g.name.toLowerCase().includes('rocket'));

  const paymentGatewaysInfo: Record<
    'bKash' | 'Nagad' | 'Rocket',
    { name: string; number: string; type: string; themeColor: string; borderActive: string }
  > = {
    bKash: {
      name: bkashGw?.name || 'bKash',
      number: bkashGw?.accountNumber || settings?.bkashNumber || '01712-345678',
      type: `${bkashGw?.accountType || settings?.bkashType || 'Personal'} (${bkashGw?.txType || 'Send Money'})`,
      themeColor: 'text-pink-600',
      borderActive: 'border-pink-500 bg-pink-50/50 text-pink-900',
    },
    Nagad: {
      name: nagadGw?.name || 'Nagad',
      number: nagadGw?.accountNumber || settings?.nagadNumber || '01812-345678',
      type: `${nagadGw?.accountType || settings?.nagadType || 'Merchant'} (${nagadGw?.txType || 'Payment'})`,
      themeColor: 'text-orange-600',
      borderActive: 'border-orange-500 bg-orange-50/50 text-orange-900',
    },
    Rocket: {
      name: rocketGw?.name || 'Rocket',
      number: rocketGw?.accountNumber || settings?.rocketNumber || '01912-345678-9',
      type: `${rocketGw?.accountType || 'Personal'} (${rocketGw?.txType || 'Send Money'})`,
      themeColor: 'text-purple-600',
      borderActive: 'border-purple-500 bg-purple-50/50 text-purple-900',
    },
  };

  const handleSelectPaymentOptionType = (type: 'cod' | 'full' | 'delivery_only') => {
    setPaymentOptionType(type);
    if (type === 'cod') {
      setPayMethod('Cash on Delivery');
    } else if (payMethod === 'Cash on Delivery') {
      setPayMethod('bKash');
    }
  };

  const handleCopyPaymentNumber = (num: string) => {
    const cleanNum = num.replace(/[^0-9]/g, '');
    navigator.clipboard.writeText(cleanNum).catch(() => {});
    setCopiedPaymentNumber(num);
    setTimeout(() => setCopiedPaymentNumber(null), 2000);
  };

  const searchedProducts = products.filter((p) => {
    if (!productSearchQuery.trim()) return false;
    const q = productSearchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const handleAddProductToOrder = () => {
    if (!activeSelectedProduct) return;
    setManualOrderError(null);
    const variantParts: string[] = [];
    if (selectedColor) variantParts.push(`Color: ${selectedColor}`);
    if (selectedSize) variantParts.push(`Size: ${selectedSize}`);
    const combinedVariant = variantParts.length > 0 ? variantParts.join(' | ') : undefined;

    let itemImage =
      activeSelectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30';
    if (selectedColor && activeSelectedProduct.colors) {
      const matchingColorObj = activeSelectedProduct.colors.find(
        (c) => typeof c === 'object' && (c.name === selectedColor || c.colorName === selectedColor) && c.imageUrl
      );
      if (matchingColorObj?.imageUrl) itemImage = matchingColorObj.imageUrl;
    }

    const existingIdx = orderItems.findIndex(
      (item) => item.productId === activeSelectedProduct.id && item.selectedVariant === combinedVariant
    );
    if (existingIdx > -1) {
      const updated = [...orderItems];
      updated[existingIdx].quantity += selectedQty;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: activeSelectedProduct.id,
          name: activeSelectedProduct.name,
          price: activeSelectedProduct.price,
          quantity: selectedQty,
          image: itemImage,
          selectedVariant: combinedVariant,
          selectedColor: selectedColor || undefined,
          selectedSize: selectedSize || undefined,
        },
      ]);
    }
    setProductSearchQuery('');
    setSelectedProductId('');
    setSelectedQty(1);
    setSelectedColor('');
    setSelectedSize('');
  };

  const calculateSubtotal = () =>
    (orderItems || []).reduce((sum, item) => sum + (item?.price || 0) * (item?.quantity || 1), 0);
  const calculateTotal = () => Math.max(0, calculateSubtotal() + delivCharge - discountAmount);
  const calculateAdvancePaid = () => {
    const total = calculateTotal();
    if (paymentOptionType === 'full') return total;
    if (paymentOptionType === 'delivery_only') return delivCharge;
    return 0;
  };
  const calculateDueAmount = () => Math.max(0, calculateTotal() - calculateAdvancePaid());

  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      setManualOrderError('Please select at least 1 product to create this order.');
      return;
    }
    if (!custName.trim() || !custMobile.trim() || !custAddress.trim()) {
      setManualOrderError('Please fill in the customer name, mobile number, and delivery address.');
      return;
    }
    setManualOrderError(null);

    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const nowISO = new Date().toISOString();
    const formattedItems: OrderItem[] = orderItems.map((item) => ({
      productId: item.productId,
      productName: item.name,
      productImage: item.image,
      price: item.price,
      quantity: item.quantity,
      total: item.price * item.quantity,
      variant: item.selectedVariant,
      selectedColor: item.selectedColor,
      selectedSize: item.selectedSize,
    }));

    const computedPaid = calculateAdvancePaid();
    const computedDue = calculateDueAmount();
    const staffName = currentStaff?.name || 'Super Admin';
    const staffRole = currentStaff?.role || currentRole || 'super_admin';

    const newOrder: Order = {
      id: orderId,
      customerId: 'cust-manual-' + Date.now(),
      customerName: custName.trim(),
      customerMobile: custMobile.trim(),
      customerEmail: 'customer@kenaxbd.com',
      deliveryName: custName.trim(),
      deliveryMobile: custMobile.trim(),
      division: custDivision,
      district: custDistrict,
      upazila: custDistrict,
      area: custDistrict,
      fullAddress: custAddress.trim(),
      items: formattedItems,
      subtotal: calculateSubtotal(),
      deliveryCharge: delivCharge,
      discount: discountAmount,
      totalAmount: calculateTotal(),
      paymentMethod: payMethod,
      paymentOptionType,
      senderMobileNumber: senderMobileNumber.trim() || undefined,
      transactionId: transactionId.trim() || undefined,
      paidAmount: computedPaid,
      dueAmount: computedDue,
      paymentStatus:
        paymentOptionType === 'full' || paymentOptionType === 'delivery_only'
          ? transactionId.trim()
            ? 'Verified'
            : 'Pending Verification'
          : 'Paid on Delivery',
      orderStatus: initialOrderStatus,
      fulfillmentStatus: 'Unfulfilled',
      timeline: [
        {
          status: initialOrderStatus,
          timestamp: nowISO,
          note: `Manual order created by ${staffName} (${staffRole}). Advance: ৳${computedPaid}, Due: ৳${computedDue}.`,
          updatedBy: staffName,
        },
      ],
      createdAt: nowISO,
      updatedAt: nowISO,
      orderSource: 'manual',
      isAiBotOrder: false,
      source: 'Admin Manual Entry',
      sourceChannel: 'Admin Manual Entry',
      createdByStaffId: currentStaff?.id || 'staff-root',
      createdByStaffName: staffName,
      createdByStaffRole: staffRole,
      handledByStaffId: currentStaff?.id || 'staff-root',
      handledByStaffName: staffName,
      handledByStaffRole: staffRole,
    };

    if (onAddOrder) onAddOrder(newOrder);

    setIsCreateModalOpen(false);
    setCustName('');
    setCustMobile('');
    setCustAddress('');
    setOrderItems([]);
    setDiscountAmount(0);
    setSenderMobileNumber('');
    setTransactionId('');
    setProductSearchQuery('');
    setPaymentOptionType('cod');
    setPayMethod('Cash on Delivery');
    showSaveNotification(`Order #${newOrder.id} created successfully and assigned to ${staffName}!`);
  };

  // Handler wrappers for filters & pagination
  const handleSelectTab = (tabId: OrderTabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof OrderFiltersState, value: string) => {
    setFilters((prev) => {
      if (value === 'all') {
        return { ...prev, [key]: 'all' };
      }
      const existing = prev[key] === 'all' ? [] : prev[key].split(',').filter(Boolean);
      const next = existing.includes(value)
        ? existing.filter((item) => item !== value)
        : [...existing, value];
      return {
        ...prev,
        [key]: next.length === 0 ? 'all' : next.join(','),
      };
    });
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setFilters(INITIAL_ORDER_FILTERS);
    setIpFilterOverride('all');
    setCurrentPage(1);
  };

  const handleToggleSort = (field: 'createdAt' | 'totalAmount' | 'id') => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-3.5">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[160] px-4 py-2.5 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.tone === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toastMessage.tone === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {drawerOrder ? (
        <OrderDetailsPage
          order={drawerOrder}
          allOrders={scopedOrders}
          activityLogs={activityLogs}
          focusSection={drawerFocus}
          staffList={staffList}
          fraudReport={fraudReports[drawerOrder.id]}
          checkingFraud={checkingFraudFor === drawerOrder.id}
          canEditOrder={canEditOrder}
          canChangeStatus={canChangeStatus}
          canCancelOrder={canCancelOrder}
          canMarkSpam={canMarkSpam}
          canVerifyPayment={canVerifyPayment}
          canViewIpIntelligence={canViewIpIntelligence}
          isSuperAdmin={isSuperAdmin}
          isBn={isBn}
          onBack={() => setDrawerOrder(null)}
          onEditOrder={(order) => setEditingOrderModal(order)}
          onAssignStaff={handleAssignStaff}
          onChangeStatus={handleChangeStatus}
          onChangeFulfillment={handleChangeFulfillment}
          onVerifyPayment={onVerifyPayment}
          onCheckCourier={(order) => handleCheckFraud(order)}
          onOpenCourierBooking={(order) => handleOpenBookingModal(order)}
          onOpenLocationMap={handleOpenLocationMap}
          onFilterByIp={handleFilterByIp}
          onRequestBlockIp={(ip) => setIpBlockModalTarget(ip)}
          onPrintInvoice={onPrintInvoice}
          onUnfakeOrder={handleUnfakeOrder}
          onAddInternalNote={handleAddInternalNote}
          onFilterByCustomerPhone={(phone) => {
            setSearchQuery(phone);
            setActiveTab('all');
            setCurrentPage(1);
            setDrawerOrder(null);
          }}
        />
      ) : (
        <>
          {/* Clean Page Top Header Bar outside the table card so the toolbar stays uncluttered and single-line */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {isConfirmedOrdersSection
                ? isBn
                  ? 'কনফার্মড অর্ডার'
                  : 'Confirmed Orders'
                : isBn
                ? 'অর্ডার ম্যানেজমেন্ট'
                : 'Orders Management'}
            </h1>

            <div className="flex items-center gap-2">
              {canViewIpIntelligence && (
                <button
                  type="button"
                  onClick={() => setIsIpModalOpen(true)}
                  title={isBn ? 'আইপি ট্র্যাকিং ও সিকিউরিটি' : 'IP Tracking & Security'}
                  className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                  <span>IP Security</span>
                </button>
              )}

              {canCreateOrder && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="h-8 px-3.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'অর্ডার তৈরি' : 'Create Order'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Live Visual Analytics for Orders */}
          <CollapsibleAnalyticsPanel
            title={isBn ? 'অর্ডার চার্ট ও বিশ্লেষণ (পাই ও গ্রাফ)' : 'Order Charts & Visual Analytics'}
            defaultOpen={false}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <SaasDonutChart
                title={isBn ? 'অর্ডার স্ট্যাটাস বিভাজন' : 'Status Distribution'}
                subtitle={`${scopedOrders.length} ${isBn ? 'টি অর্ডার' : 'orders'}`}
                centerLabel={isBn ? 'মোট' : 'Total'}
                onSelectSlice={(s) => {
                  if (s.id) handleSelectTab(s.id as OrderTabId);
                }}
                data={[
                  { id: 'pending', label: isBn ? 'অপেক্ষমাণ' : 'Pending', value: scopedOrders.filter((o) => getOrderTabBucket(o) === 'pending').length, color: '#D97706' },
                  { id: 'confirmed', label: isBn ? 'নিশ্চিত' : 'Confirmed', value: scopedOrders.filter((o) => getOrderTabBucket(o) === 'confirmed').length, color: '#0284C7' },
                  { id: 'processing', label: isBn ? 'প্রক্রিয়াধীন' : 'Processing', value: scopedOrders.filter((o) => getOrderTabBucket(o) === 'processing').length, color: '#2563EB' },
                  { id: 'in_transit', label: isBn ? 'ট্রানজিটে' : 'In Transit', value: scopedOrders.filter((o) => getOrderTabBucket(o) === 'in_transit').length, color: '#7C3AED' },
                  { id: 'delivered', label: isBn ? 'ডেলিভার্ড' : 'Delivered', value: scopedOrders.filter((o) => getOrderTabBucket(o) === 'delivered').length, color: '#059669' },
                  { id: 'cancelled', label: isBn ? 'বাতিল / ফেরত' : 'Cancelled / Returned', value: scopedOrders.filter((o) => ['cancelled', 'returned', 'failed_delivery', 'spam'].includes(getOrderTabBucket(o))).length, color: '#E11D48' },
                ]}
              />

              <SaasDonutChart
                title={isBn ? 'অর্ডার সোর্স চ্যানেল' : 'Order Channel Share'}
                subtitle={isBn ? 'উৎস অনুযায়ী' : 'By acquisition channel'}
                centerLabel={isBn ? 'চ্যানেল' : 'Channels'}
                data={(() => {
                  const map = new Map<string, number>();
                  scopedOrders.forEach((o) => {
                    const ch = (o.sourceChannel || o.source || o.orderSource || 'Website').trim();
                    map.set(ch, (map.get(ch) || 0) + 1);
                  });
                  return Array.from(map.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6)
                    .map(([label, value], idx) => ({
                      label,
                      value,
                      color: SAAS_CHART_COLORS[idx % SAAS_CHART_COLORS.length],
                    }));
                })()}
              />

              <SaasLineAreaChart
                title={isBn ? 'দৈনিক অর্ডার ও বিক্রয় গ্রাফ' : 'Daily Orders & Revenue'}
                subtitle={isBn ? 'তারিখ ভিত্তিক' : 'Grouped by order date'}
                primaryLabel={isBn ? 'বিক্রয় (৳)' : 'Revenue'}
                secondaryLabel={isBn ? 'অর্ডার' : 'Orders'}
                primaryFormat="currency"
                secondaryFormat="number"
                data={(() => {
                  const byDay = new Map<string, { primary: number; secondary: number; sortKey: number }>();
                  scopedOrders.forEach((o) => {
                    if (!o.createdAt) return;
                    const dt = new Date(o.createdAt);
                    if (isNaN(dt.getTime())) return;
                    const key = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const cur = byDay.get(key) || { primary: 0, secondary: 0, sortKey: new Date(dt.toDateString()).getTime() };
                    cur.primary += o.orderStatus !== 'Cancelled' ? (o.totalAmount || 0) : 0;
                    cur.secondary += 1;
                    byDay.set(key, cur);
                  });
                  return Array.from(byDay.entries())
                    .sort((a, b) => a[1].sortKey - b[1].sortKey)
                    .slice(-10)
                    .map(([label, v]) => ({ label, primary: v.primary, secondary: v.secondary }));
                })()}
              />
            </div>
          </CollapsibleAnalyticsPanel>

          {/* Main Clean White Card Container matching Reference Screenshot */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* 1. Top Horizontal Scrollable Status Bar (13 Operational Statuses + Live Counts) */}
            <OrderStatusTabs
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
              counts={effectiveCounts}
              isBn={isBn}
            />

            {/* 2. Single-Line Search + 8 Compact Multi-Select Filter Buttons + Columns */}
            <OrderFilterToolbar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearAllFilters={handleClearAllFilters}
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
              onResetColumns={handleResetColumns}
              isBn={isBn}
            />

            {/* 3. Contextual Bulk Action Bar */}
            <OrderBulkActionBar
              selectedCount={selectedOrderIds.length}
              staffList={staffList}
              canMarkSpam={canMarkSpam}
              isBusy={isBulkBusy}
              onClearSelection={() => setSelectedOrderIds([])}
              onBulkAssignStaff={handleBulkAssignStaff}
              onBulkChangeStatus={handleBulkChangeStatus}
              onBulkExport={handleBulkExport}
              onBulkPrintInvoices={handleBulkPrintInvoices}
              onBulkMarkSpam={handleBulkMarkSpam}
            />

        {/* 4. Data Table or Clean Empty State */}
        {paginatedOrders.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-3">
            <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Package className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {isBn ? 'কোনো অর্ডার পাওয়া যায়নি' : 'No orders match the current view'}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Try adjusting your search query, status tab, or active filters to see matching orders.
              </p>
            </div>
            {(searchQuery || Object.values(filters).some((v) => v !== 'all') || activeTab !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  handleClearAllFilters();
                  setActiveTab('all');
                }}
                className="h-8 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Reset Filters & View All Orders
              </button>
            )}
          </div>
        ) : (
          <OrderTable
            orders={paginatedOrders}
            duplicateMaps={duplicateMaps}
            visibleColumns={visibleColumns}
            selectedOrderIds={selectedOrderIds}
            onToggleSelectAll={handleToggleSelectAll}
            onToggleSelectRow={handleToggleSelectRow}
            sortBy={sortBy}
            sortDir={sortDir}
            onToggleSort={handleToggleSort}
            staffList={staffList}
            fraudReports={fraudReports}
            checkingFraudFor={checkingFraudFor}
            canEditOrder={canEditOrder}
            canChangeStatus={canChangeStatus}
            canCancelOrder={canCancelOrder}
            canMarkSpam={canMarkSpam}
            canVerifyPayment={canVerifyPayment}
            isSuperAdmin={isSuperAdmin}
            isBn={isBn}
            onOpenOrderDrawer={handleOpenOrderDrawer}
            onEditOrder={(order) => setEditingOrderModal(order)}
            onAssignStaff={handleAssignStaff}
            onChangeStatus={handleChangeStatus}
            onChangeFulfillment={handleChangeFulfillment}
            onVerifyPayment={onVerifyPayment}
            onCheckCourier={handleCheckFraud}
            onOpenCourierBooking={(order) => handleOpenBookingModal(order)}
            onPrintInvoice={onPrintInvoice}
            onUnfakeOrder={handleUnfakeOrder}
            onQuickCompleteOrder={handleOpenQuickComplete}
          />
        )}

        {/* 5. Footer Pagination & Rows Per Page Controls matching Reference Screenshot */}
        <div className="px-4 sm:px-5 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="tabular-nums font-medium">
            {paginatedOrders.length} of {totalFilteredRows} row(s) showing.
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Rows Per Page */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value) || 10);
                  setCurrentPage(1);
                }}
                aria-label="Rows per page"
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Page Navigation */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 text-xs font-medium tabular-nums text-slate-700 dark:text-slate-200">
                  Page {safeCurrentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
          </div>
        </>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[150] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {confirmDialog.description}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="h-9 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`h-9 px-4 rounded-lg text-xs font-semibold text-white cursor-pointer ${
                  confirmDialog.tone === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#EA580C] hover:bg-[#C2410C]'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Invoice Modal */}
      {batchPrintOrders.length > 0 && (
        <BatchInvoiceModal
          orders={batchPrintOrders}
          settings={settings}
          onClose={() => setBatchPrintOrders([])}
          onPrintSingle={(ord) => {
            setBatchPrintOrders([]);
            onPrintInvoice(ord);
          }}
        />
      )}

      {/* Manual Order Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[115] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  <span>Create Manual Order</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Staff: <strong>{currentStaff?.name || 'Super Admin'}</strong> ({currentStaff?.role || currentRole})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setManualOrderError(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {manualOrderError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="flex-1">{manualOrderError}</span>
                  <button type="button" onClick={() => setManualOrderError(null)}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#EA580C]" />
                  <span>1. Customer Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="e.g. Anik Rahman"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={custMobile}
                      onChange={(e) => setCustMobile(e.target.value)}
                      placeholder="e.g. 01700000000"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Delivery Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="House no, road no, area details..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Division</label>
                    <select
                      value={custDivision}
                      onChange={(e) => {
                        setCustDivision(e.target.value);
                        setDelivCharge(e.target.value === 'Dhaka' ? 70 : 130);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                    >
                      <option value="Dhaka">Dhaka</option>
                      <option value="Chittagong">Chittagong</option>
                      <option value="Rajshahi">Rajshahi</option>
                      <option value="Khulna">Khulna</option>
                      <option value="Barisal">Barisal</option>
                      <option value="Sylhet">Sylhet</option>
                      <option value="Rangpur">Rangpur</option>
                      <option value="Mymensingh">Mymensingh</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">District</label>
                    <input
                      type="text"
                      value={custDistrict}
                      onChange={(e) => setCustDistrict(e.target.value)}
                      placeholder="District"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-[#EA580C]" />
                    <span>2. Select Products *</span>
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {orderItems.length} Selected
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      placeholder="Search product by name, SKU or category..."
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                    />
                    {productSearchQuery.trim().length > 0 && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {searchedProducts.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">No matching products</div>
                        ) : (
                          searchedProducts.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProductId(p.id);
                                setProductSearchQuery('');
                              }}
                              className="w-full p-2.5 hover:bg-slate-50 flex items-center justify-between text-left text-xs cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={getOptimizedImageUrl(p.images?.[0] || '', 100)}
                                  alt={p.name}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => handleImageError(e, p.images?.[0])}
                                  className="w-8 h-8 rounded object-cover"
                                />
                                <div>
                                  <p className="font-semibold text-slate-800">{p.name}</p>
                                  <p className="text-[10px] text-slate-400">৳{p.price} · Stock: {p.stock}</p>
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold text-[#EA580C]">Select</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {products.length > 0 && (
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                    >
                      <option value="">-- Choose a product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (৳{p.price} - Stock: {p.stock})
                        </option>
                      ))}
                    </select>
                  )}

                  {activeSelectedProduct && (
                    <div className="flex flex-wrap items-end gap-2 pt-1">
                      <div className="w-24">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={selectedQty}
                          onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-full h-9 px-2 rounded-lg border border-slate-300 text-xs text-center font-bold bg-white"
                        />
                      </div>
                      {availableColors.length > 0 && (
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Color</label>
                          <select
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-300 text-xs bg-white"
                          >
                            {availableColors.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {availableSizes.length > 0 && (
                        <div className="flex-1 min-w-[90px]">
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Size</label>
                          <select
                            value={selectedSize}
                            onChange={(e) => setSelectedSize(e.target.value)}
                            className="w-full h-9 px-2 rounded-lg border border-slate-300 text-xs bg-white"
                          >
                            {availableSizes.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleAddProductToOrder}
                        className="h-9 px-4 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item</span>
                      </button>
                    </div>
                  )}

                  {orderItems.length > 0 && (
                    <div className="divide-y divide-slate-200 pt-2 border-t border-slate-200">
                      {orderItems.map((item, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <img
                              src={getOptimizedImageUrl(item.image, 100)}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              onError={(e) => handleImageError(e, item.image)}
                              className="w-8 h-8 rounded object-cover"
                            />
                            <div>
                              <p className="font-semibold text-slate-900">{item.name}</p>
                              <p className="text-[11px] text-slate-500">
                                ৳{item.price} × {item.quantity} {item.selectedVariant ? `(${item.selectedVariant})` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">৳{item.price * item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => setOrderItems((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#EA580C]" />
                  <span>3. Payment & Status</span>
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {(['full', 'delivery_only', 'cod'] as const).map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => handleSelectPaymentOptionType(plan)}
                      className={`p-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                        paymentOptionType === plan
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {plan === 'full' ? 'Full Advance' : plan === 'delivery_only' ? 'Delivery Charge' : 'Cash on Delivery'}
                    </button>
                  ))}
                </div>

                {(paymentOptionType === 'full' || paymentOptionType === 'delivery_only') && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      {(['bKash', 'Nagad', 'Rocket'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPayMethod(m)}
                          className={`p-2 rounded-lg border font-semibold cursor-pointer ${
                            payMethod === m ? paymentGatewaysInfo[m].borderActive : 'bg-white border-slate-300'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    {payMethod !== 'Cash on Delivery' && (
                      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                        <span className="font-mono font-bold">
                          {paymentGatewaysInfo[payMethod].number}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyPaymentNumber(paymentGatewaysInfo[payMethod].number)}
                          className="text-xs font-semibold text-[#EA580C] cursor-pointer"
                        >
                          {copiedPaymentNumber ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="tel"
                        value={senderMobileNumber}
                        onChange={(e) => setSenderMobileNumber(e.target.value)}
                        placeholder="Sender Mobile"
                        className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction ID"
                        className="px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white uppercase"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Delivery (৳)</label>
                    <input
                      type="number"
                      value={delivCharge}
                      onChange={(e) => setDelivCharge(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Discount (৳)</label>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Initial Status</label>
                    <select
                      value={initialOrderStatus}
                      onChange={(e) => setInitialOrderStatus(e.target.value as OrderStatus)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-semibold"
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Pending">Pending</option>
                      <option value="Follow Up">Follow Up</option>
                      <option value="Processing">Processing</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Total Bill</span>
                  <p className="text-lg font-bold tabular-nums">৳{calculateTotal().toLocaleString()}</p>
                </div>
                <div className="text-right tabular-nums">
                  <p className="text-emerald-400">Advance: ৳{calculateAdvancePaid().toLocaleString()}</p>
                  <p className="text-amber-300">Due: ৳{calculateDueAmount().toLocaleString()}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={orderItems.length === 0}
                  className="px-5 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Create & Save Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Courier Fraud Check Report Modal */}
      {selectedFraudModalReport && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                    selectedFraudModalReport.report.riskLevel === 'safe'
                      ? 'bg-emerald-500'
                      : selectedFraudModalReport.report.riskLevel === 'moderate'
                      ? 'bg-amber-500'
                      : selectedFraudModalReport.report.riskLevel === 'high_risk'
                      ? 'bg-rose-600'
                      : 'bg-slate-500'
                  }`}
                >
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Courier Parcel History Report
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedFraudModalReport.order.customerName} ({selectedFraudModalReport.report.phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFraudModalReport(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm capitalize">
                  {selectedFraudModalReport.report.riskLevel.replace('_', ' ')} Risk
                </span>
                <span className="text-lg font-bold font-mono">
                  {selectedFraudModalReport.report.successRate}% Success
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {selectedFraudModalReport.report.riskReason}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Total Parcels</div>
                <div className="text-lg font-bold font-mono">{selectedFraudModalReport.report.totalOrders}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-[10px] font-semibold text-emerald-800 uppercase">Delivered</div>
                <div className="text-lg font-bold text-emerald-700 font-mono">
                  {selectedFraudModalReport.report.deliveredOrders}
                </div>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <div className="text-[10px] font-semibold text-rose-800 uppercase">Returned/Cancelled</div>
                <div className="text-lg font-bold text-rose-700 font-mono">
                  {selectedFraudModalReport.report.cancelledOrders || selectedFraudModalReport.report.returnedOrders || 0}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={(e) => handleSendAdvanceFeeWhatsApp(selectedFraudModalReport.order, e)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer"
              >
                <SiWhatsapp className="w-4 h-4" />
                <span>Request Advance Fee via WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFraudModalReport(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Courier Booking Modal */}
      {bookingModalOrder && (
        <div className="fixed inset-0 z-[125] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Courier Booking & Tracking — #{bookingModalOrder.id}</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {bookingModalOrder.deliveryName || bookingModalOrder.customerName} · COD ৳
                  {(bookingModalOrder.totalAmount || 0).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBookingModalOrder(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 space-y-2.5 border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Recipient Info
                </p>
                <p><strong>Name:</strong> {bookingModalOrder.deliveryName || bookingModalOrder.customerName}</p>
                <p><strong>Phone:</strong> {bookingModalOrder.deliveryMobile || bookingModalOrder.customerMobile}</p>
                <p>
                  <strong>Address:</strong> {bookingModalOrder.fullAddress || bookingModalOrder.deliveryAddress}{' '}
                  {bookingModalOrder.district}
                </p>
                <button
                  type="button"
                  onClick={() => handleCopyBookingInfo(bookingModalOrder)}
                  className="w-full py-2 rounded-lg bg-slate-900 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {bookingCopiedField === 'all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{bookingCopiedField === 'all' ? 'Copied All Info' : 'Copy All Parcel Details'}</span>
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Courier Partner
                  </label>
                  <select
                    value={bookingCourier}
                    onChange={(e) => {
                      const c = e.target.value;
                      setBookingCourier(c);
                      if (bookingTrackingId) {
                        setBookingTrackingUrl(resolveCourierTrackingUrl(c, bookingTrackingId));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                  >
                    {SUPPORTED_COURIERS.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <a
                  href={getCourierPortalUrl(bookingCourier)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-between font-semibold text-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#EA580C]" />
                    Open {bookingCourier} Merchant Portal
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Consignment / Tracking ID
                  </label>
                  <input
                    type="text"
                    value={bookingTrackingId}
                    onChange={(e) => {
                      const id = e.target.value.trim();
                      setBookingTrackingId(id);
                      if (id) setBookingTrackingUrl(resolveCourierTrackingUrl(bookingCourier, id));
                    }}
                    placeholder="e.g. STF-89123"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tracking URL
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Link2 className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={bookingTrackingUrl}
                        onChange={(e) => setBookingTrackingUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleConfirmCourierBooking(true)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Mark {bookingTargetStatus}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmCourierBooking(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Save Info Only
                </button>
              </div>
              <button
                type="button"
                onClick={() => setBookingModalOrder(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Complete Incomplete Order Modal */}
      {quickCompleteOrder && (
        <div className="fixed inset-0 z-[125] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">Complete Order #{quickCompleteOrder.id}</h3>
              </div>
              <button type="button" onClick={() => setQuickCompleteOrder(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Name</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={completeName}
                    onChange={(e) => setCompleteName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={completeMobile}
                    onChange={(e) => setCompleteMobile(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Delivery Address</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <textarea
                    rows={2}
                    value={completeAddress}
                    onChange={(e) => setCompleteAddress(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    value={completeDistrict}
                    onChange={(e) => setCompleteDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delivery Charge (৳)</label>
                  <input
                    type="number"
                    value={completeDeliveryCharge}
                    onChange={(e) => setCompleteDeliveryCharge(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveQuickComplete('Confirmed')}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Save & Confirm</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveQuickComplete('Pending')}
                  className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Save as Pending</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setQuickCompleteOrder(null)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Order Modal */}
      {editingOrderModal && (
        <AdminEditOrderModal
          order={editingOrderModal}
          products={products}
          currentStaff={currentStaff}
          settings={settings}
          onClose={() => setEditingOrderModal(null)}
          onSave={async (orderId, updates) => {
            if (onUpdateOrder) {
              await onUpdateOrder(orderId, updates);
            }
            setEditingOrderModal(null);
            setRefreshTick((t) => t + 1);
            showSaveNotification(`Order #${orderId} updated successfully.`);
          }}
        />
      )}

      {/* IP Security & Tracking Modal */}
      <AdminIpSecurityModal
        isOpen={isIpModalOpen}
        onClose={() => setIsIpModalOpen(false)}
        orders={orders}
        currentStaffName={currentStaff?.name || 'Admin'}
        onFilterOrdersByIp={(ip) => handleFilterByIp(ip)}
      />

      {/* Quick Block IP Modal */}
      {ipBlockModalTarget && (
        <div className="fixed inset-0 z-[140] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <ShieldX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Confirm Block Customer IP
                </h3>
                <p className="font-mono text-xs font-bold text-rose-600">{ipBlockModalTarget}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Blocking this IP will prevent any new checkouts from this network address.
            </p>
            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 dark:text-slate-300 block">Reason</label>
              <select
                value={ipBlockReasonSelection}
                onChange={(e) => setIpBlockReasonSelection(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
              >
                <option value="Fake Orders / Fraud Investigation">Fake Orders / Fraud Investigation</option>
                <option value="Spam Orders / Bot Activity">Spam Orders / Bot Activity</option>
                <option value="Multiple COD Return & Refusal">Multiple COD Return & Refusal</option>
                <option value="Payment Verification Abuse">Payment Verification Abuse</option>
                <option value="custom">Other / Custom Reason</option>
              </select>
              {ipBlockReasonSelection === 'custom' && (
                <input
                  type="text"
                  value={ipCustomReasonText}
                  onChange={(e) => setIpCustomReasonText(e.target.value)}
                  placeholder="Specify reason..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIpBlockModalTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const finalReason =
                    ipBlockReasonSelection === 'custom'
                      ? ipCustomReasonText || 'Custom Security Reason'
                      : ipBlockReasonSelection;
                  try {
                    await fetch('/api/ip-management/block', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ip: ipBlockModalTarget,
                        reason: finalReason,
                        blockedBy: currentStaff?.name || 'Admin',
                      }),
                    });
                    const matchingOrders = orders.filter(
                      (o) => getOrderEffectiveIp(o) === ipBlockModalTarget
                    );
                    matchingOrders.forEach((m) => {
                      if (onUpdateOrder) {
                        onUpdateOrder(m.id, { ipStatus: 'Blocked', ipBlockReason: finalReason });
                      }
                    });
                    showSaveNotification(`IP ${ipBlockModalTarget} has been blocked.`);
                  } catch {
                    showSaveNotification('Failed to block IP.', 'error');
                  }
                  setIpBlockModalTarget(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldX className="w-3.5 h-3.5" />
                <span>Confirm Block IP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Order Location Map Modal */}
      <OrderLocationMapModal
        isOpen={mapModalData.isOpen}
        onClose={() => setMapModalData((prev) => ({ ...prev, isOpen: false }))}
        ip={mapModalData.ip}
        orderId={mapModalData.orderId}
        customerName={mapModalData.customerName}
        deliveryAddress={mapModalData.deliveryAddress}
        geoData={mapModalData.geoData}
        onRefreshGeo={async () => {
          if (!mapModalData.ip) return;
          try {
            const res = await fetch(`/api/admin/ip-lookup/${encodeURIComponent(mapModalData.ip)}`);
            const data = await res.json();
            if (data.geo) {
              setMapModalData((prev) => ({ ...prev, geoData: data.geo }));
              if (mapModalData.orderId && onUpdateOrder) {
                onUpdateOrder(mapModalData.orderId, {
                  ipCountry: data.geo.country,
                  ipRegion: data.geo.region,
                  ipCity: data.geo.city,
                  ipLatitude: data.geo.latitude,
                  ipLongitude: data.geo.longitude,
                  ipIsp: data.geo.isp,
                  ipConnectionType: data.geo.connectionType,
                  ipLocationAccuracy: data.geo.accuracyStatus,
                  ipGeoData: data.geo,
                });
              }
            }
          } catch {}
        }}
      />
    </div>
  );
};
