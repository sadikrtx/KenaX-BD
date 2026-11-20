import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowUpDown,
  Copy,
  Check,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Edit3,
  UserPlus,
  RefreshCw,
  Truck,
  ShieldAlert,
  Printer,
  Download,
  MessageSquare,
  StickyNote,
  Clock,
  XCircle,
  Ban,
  RotateCcw,
  CheckCircle2,
  Store,
  Bot,
  Rocket,
  PenLine,
  Package,
  MapPin,
  Loader2,
  CreditCard,
} from 'lucide-react';
import type { Order, OrderStatus, StaffUser, CourierFraudReport } from '../../../types/index.ts';
import { getOptimizedImageUrl, handleImageError } from '../../../utils/imageOptimizer';
import { getOrderSourceInfo } from '../../../utils/orderSourceTimeUtils';
import { generateWhatsAppDirectLink, formatWhatsAppMessage, DEFAULT_WHATSAPP_TEMPLATES } from '../../../lib/whatsappService';
import {
  type OrderColumnId,
  ESSENTIAL_ORDER_COLUMNS,
  SELECTABLE_ORDER_STATUSES,
  getOrderStatusPillStyle,
  resolveFulfillmentStatus,
  getStaffInitials,
  formatRelativeAge,
  formatExactDateTime,
  normalizePhoneKey,
  exportOrdersToCsv,
} from './orderHelpers';

interface OrderTableProps {
  orders: Order[];
  allOrdersForCustomerCount?: Order[];
  duplicateMaps: { phoneCounts: Record<string, number>; ipCounts: Record<string, number> };
  visibleColumns: OrderColumnId[];
  selectedOrderIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectRow: (orderId: string) => void;
  sortBy: 'createdAt' | 'totalAmount' | 'id';
  sortDir: 'asc' | 'desc';
  onToggleSort: (field: 'createdAt' | 'totalAmount' | 'id') => void;
  staffList: StaffUser[];
  fraudReports: Record<string, CourierFraudReport>;
  checkingFraudFor: string | null;
  canEditOrder: boolean;
  canChangeStatus: boolean;
  canCancelOrder: boolean;
  canMarkSpam: boolean;
  canVerifyPayment: boolean;
  isSuperAdmin: boolean;
  isBn?: boolean;
  onOpenOrderDrawer: (order: Order, focusSection?: 'overview' | 'notes' | 'timeline') => void;
  onEditOrder: (order: Order) => void;
  onAssignStaff: (order: Order, staff: StaffUser | null) => void;
  onChangeStatus: (order: Order, nextStatus: OrderStatus) => void;
  onChangeFulfillment: (order: Order, nextFulfillment: string) => void;
  onVerifyPayment: (orderId: string) => void;
  onCheckCourier: (order: Order, e?: React.MouseEvent) => void;
  onOpenCourierBooking: (order: Order) => void;
  onPrintInvoice: (order: Order) => void;
  onUnfakeOrder: (order: Order) => void;
  onQuickCompleteOrder?: (order: Order) => void;
}

const FULFILLMENT_OPTIONS = [
  'Unfulfilled',
  'Processing',
  'Packed',
  'Shipped',
  'Fulfilled',
  'Returned',
  'Failed',
];

type RowPopoverType = 'assignee' | 'status' | 'fulfillment' | 'actions';

interface ActivePopoverState {
  orderId: string;
  type: RowPopoverType;
  top: number;
  left: number;
  maxHeight: number;
}

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  duplicateMaps,
  visibleColumns,
  selectedOrderIds,
  onToggleSelectAll,
  onToggleSelectRow,
  sortBy,
  sortDir,
  onToggleSort,
  staffList,
  fraudReports,
  checkingFraudFor,
  canEditOrder,
  canChangeStatus,
  canCancelOrder,
  canMarkSpam,
  canVerifyPayment,
  isSuperAdmin,
  isBn = false,
  onOpenOrderDrawer,
  onEditOrder,
  onAssignStaff,
  onChangeStatus,
  onChangeFulfillment,
  onVerifyPayment,
  onCheckCourier,
  onOpenCourierBooking,
  onPrintInvoice,
  onUnfakeOrder,
  onQuickCompleteOrder,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [openPopover, setOpenPopover] = useState<ActivePopoverState | null>(null);

  const tableRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const activeTriggerRef = useRef<HTMLElement | null>(null);

  const computeFixedCoords = useCallback(
    (triggerEl: HTMLElement, type: RowPopoverType) => {
      const rect = triggerEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const width = type === 'actions' ? 224 : type === 'assignee' ? 200 : type === 'status' ? 184 : 168;
      const alignRight = type === 'actions';
      let left = alignRight ? rect.right - width : rect.left;
      left = Math.max(12, Math.min(left, vw - width - 12));

      const spaceBelow = vh - rect.bottom - 14;
      const spaceAbove = rect.top - 14;
      const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(180, Math.min(340, openUpward ? spaceAbove : spaceBelow));
      const estimatedH = type === 'actions' ? 320 : 250;
      const top = openUpward
        ? Math.max(12, rect.top - Math.min(estimatedH, maxHeight) - 6)
        : rect.bottom + 6;

      return { top, left, maxHeight };
    },
    []
  );

  const toggleRowPopover = (
    orderId: string,
    type: RowPopoverType,
    triggerEl: HTMLElement | null
  ) => {
    if (openPopover && openPopover.orderId === orderId && openPopover.type === type) {
      setOpenPopover(null);
      activeTriggerRef.current = null;
      return;
    }
    if (!triggerEl) return;
    activeTriggerRef.current = triggerEl;
    const coords = computeFixedCoords(triggerEl, type);
    setOpenPopover({ orderId, type, ...coords });
  };

  useEffect(() => {
    if (!openPopover) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      if (activeTriggerRef.current && activeTriggerRef.current.contains(target)) return;
      setOpenPopover(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPopover(null);
    };

    const handleScrollOrResize = (e: Event) => {
      if (popoverRef.current && e.target instanceof Node && popoverRef.current.contains(e.target)) {
        return;
      }
      setOpenPopover(null);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openPopover]);

  const hasCol = (col: OrderColumnId) =>
    ESSENTIAL_ORDER_COLUMNS.includes(col) || visibleColumns.includes(col);

  const allSelectedOnPage =
    orders.length > 0 && orders.every((o) => selectedOrderIds.includes(o.id));
  const someSelectedOnPage =
    orders.some((o) => selectedOrderIds.includes(o.id)) && !allSelectedOnPage;

  const copyText = (value: string, trackerId: string, kind: 'id' | 'phone', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(value).catch(() => {});
    if (kind === 'id') {
      setCopiedId(trackerId);
      setTimeout(() => setCopiedId((prev) => (prev === trackerId ? null : prev)), 1500);
    } else {
      setCopiedPhoneId(trackerId);
      setTimeout(() => setCopiedPhoneId((prev) => (prev === trackerId ? null : prev)), 1500);
    }
  };

  const renderSourceBadge = (order: Order) => {
    const src = getOrderSourceInfo(order);
    if (src.sourceKey === 'chatbot') {
      return (
        <div
          title={src.badgeTitleEn}
          className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs"
        >
          <Bot className="w-4 h-4" />
        </div>
      );
    }
    if (src.sourceKey === 'landing_page') {
      return (
        <div
          title={src.badgeTitleEn}
          className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-2xs"
        >
          <Rocket className="w-4 h-4" />
        </div>
      );
    }
    if (src.sourceKey === 'manual') {
      return (
        <div
          title={src.badgeTitleEn}
          className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-2xs"
        >
          <PenLine className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div
        title={src.badgeTitleEn}
        className="w-8 h-8 rounded-lg bg-[#E91E8C] text-white flex items-center justify-center shrink-0 shadow-2xs"
      >
        <Store className="w-4 h-4" />
      </div>
    );
  };

  const activeOrder = openPopover
    ? orders.find((o) => o.id === openPopover.orderId) || null
    : null;
  const activePhone = activeOrder
    ? activeOrder.deliveryMobile || activeOrder.customerMobile || activeOrder.phone || ''
    : '';
  const activeFulfillment = activeOrder ? resolveFulfillmentStatus(activeOrder) : null;
  const activeIsPendingPaymentVerify = activeOrder
    ? (activeOrder.paymentStatus || '').toLowerCase().includes('pending') &&
      !(activeOrder.paymentMethod || '').toLowerCase().includes('cash')
    : false;

  return (
    <div ref={tableRef} className="w-full overflow-x-auto visible-x-scrollbar bg-white dark:bg-slate-900">
      <table className="w-max min-w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/80 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[12px] font-medium text-slate-600 dark:text-slate-400">
            <th className="w-10 py-2.5 pl-4 pr-2">
              <input
                type="checkbox"
                checked={allSelectedOnPage}
                ref={(el) => {
                  if (el) el.indeterminate = someSelectedOnPage;
                }}
                onChange={onToggleSelectAll}
                aria-label="Select all orders on page"
                className="w-4 h-4 rounded border-slate-300 text-[#EA580C] focus:ring-[#EA580C] cursor-pointer accent-[#EA580C]"
              />
            </th>

            {hasCol('order_number') && (
              <th className="py-2.5 px-3 min-w-[180px] whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onToggleSort('createdAt')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer font-medium"
                >
                  <span>Order</span>
                  <ArrowUpDown className={`w-3.5 h-3.5 ${sortBy === 'createdAt' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`} />
                  {sortBy === 'createdAt' && (
                    <span className="text-[10px] text-slate-400">({sortDir})</span>
                  )}
                </button>
              </th>
            )}

            {hasCol('order_date') && <th className="py-2.5 px-3 min-w-[145px] whitespace-nowrap">Order Date</th>}
            {hasCol('customer') && <th className="py-2.5 px-3 min-w-[175px] whitespace-nowrap">Customer</th>}
            {hasCol('products') && <th className="py-2.5 px-3 min-w-[235px] whitespace-nowrap">Products</th>}

            {hasCol('total_amount') && (
              <th className="py-2.5 px-3 min-w-[115px] whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onToggleSort('totalAmount')}
                  className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer font-medium"
                >
                  <span>Total Amount</span>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </th>
            )}

            {hasCol('payment_method') && <th className="py-2.5 px-3 min-w-[130px] whitespace-nowrap">Payment Method</th>}
            {hasCol('payment_status') && <th className="py-2.5 px-3 min-w-[120px] whitespace-nowrap">Payment Status</th>}
            {hasCol('assignee') && <th className="py-2.5 px-3 min-w-[75px] whitespace-nowrap">OC</th>}
            {hasCol('order_status') && <th className="py-2.5 px-3 min-w-[125px] whitespace-nowrap">Status</th>}
            {hasCol('fulfillment_status') && <th className="py-2.5 px-3 min-w-[115px] whitespace-nowrap">Fulfillment</th>}
            {hasCol('courier') && <th className="py-2.5 px-3 min-w-[125px] whitespace-nowrap">Courier</th>}
            {hasCol('courier_check') && <th className="py-2.5 px-3 min-w-[125px] whitespace-nowrap">Courier Check</th>}
            {hasCol('delivery_address') && <th className="py-2.5 px-3 min-w-[210px] whitespace-nowrap">Delivery Address</th>}
            {hasCol('channel') && <th className="py-2.5 px-3 min-w-[115px] whitespace-nowrap">Channel</th>}
            {hasCol('tracking_number') && <th className="py-2.5 px-3 min-w-[130px] whitespace-nowrap">Tracking #</th>}
            {hasCol('actions') && <th className="py-2.5 pl-2 pr-4 min-w-[90px] text-right whitespace-nowrap">Actions</th>}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-[13px]">
          {orders.map((order) => {
            const isSelected = selectedOrderIds.includes(order.id);
            const items = order.items || [];
            const firstItem = items[0];
            const itemCount = items.length;
            const totalUnits = items.reduce((acc, i) => acc + (i.quantity || 1), 0) || 1;
            const phone = order.deliveryMobile || order.customerMobile || order.phone || '';
            const customerName = order.deliveryName || order.customerName || 'Guest Customer';
            const phoneKey = normalizePhoneKey(phone);
            const isDupPhone = phoneKey.length >= 8 && (duplicateMaps.phoneCounts[phoneKey] || 0) > 1;
            const fulfillment = resolveFulfillmentStatus(order);
            const staffName = order.handledByStaffName || '';
            const staffInitials = getStaffInitials(staffName);
            const fraudRep = fraudReports[order.id];
            const storedRisk = order.courierCheckSummary;
            const effectiveRate = fraudRep?.successRate ?? storedRisk?.successRate;
            const effectiveRisk = fraudRep?.riskLevel ?? storedRisk?.riskLevel;
            const effectiveTotal = fraudRep?.totalOrders ?? storedRisk?.totalOrders;
            const isIncomplete = Boolean(order.isIncompleteOrder || (order.orderStatus || '').toLowerCase() === 'incomplete');

            const firstItemImage =
              firstItem?.selectedColorImage ||
              firstItem?.productImage ||
              firstItem?.image ||
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120';

            const variantText =
              firstItem?.variant ||
              [firstItem?.selectedColor, firstItem?.selectedSize].filter(Boolean).join(' / ') ||
              'Default';

            const allItemsTooltip = items
              .map((i) => `${i.productName || i.name || 'Item'} (×${i.quantity || 1})`)
              .join(', ');

            const extraItemNames = items
              .slice(1)
              .map((i) => `${i.productName || i.name || 'Item'} ×${i.quantity || 1}`)
              .join(', ');

            const deliveryAddr =
              order.fullAddress ||
              (typeof order.deliveryAddress === 'string' ? order.deliveryAddress : '') ||
              [order.district, order.division].filter(Boolean).join(', ') ||
              '—';

            const srcInfo = getOrderSourceInfo(order);

            return (
              <tr
                key={order.id}
                onClick={() => onOpenOrderDrawer(order, 'overview')}
                className={`group transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-orange-50/40 dark:bg-orange-950/20'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Selection checkbox */}
                <td className="py-3 pl-4 pr-2 align-middle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelectRow(order.id)}
                    aria-label={`Select order ${order.id}`}
                    className="w-4 h-4 rounded border-slate-300 text-[#EA580C] focus:ring-[#EA580C] cursor-pointer accent-[#EA580C]"
                  />
                </td>

                {/* Order # + Source icon + relative time */}
                {hasCol('order_number') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      {renderSourceBadge(order)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-900 dark:text-white tracking-tight text-[13px] truncate">
                            {order.id}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => copyText(order.id, order.id, 'id', e)}
                            title="Copy order number"
                            className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {copiedId === order.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {isIncomplete && onQuickCompleteOrder && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickCompleteOrder(order);
                              }}
                              className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-semibold hover:bg-orange-200 cursor-pointer"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                        <div
                          className="text-[11.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
                          title={formatExactDateTime(order.createdAt)}
                        >
                          <span>{formatRelativeAge(order.createdAt, isBn)}</span>
                          {order.siteOrderNumber && (
                            <span className="text-[10.5px] text-slate-400">· #{order.siteOrderNumber}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                )}

                {hasCol('order_date') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                    {formatExactDateTime(order.createdAt)}
                  </td>
                )}

                {/* Customer (Always Visible — Name + Phone combined cleanly) */}
                {hasCol('customer') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap">
                    <div className="min-w-[140px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-900 dark:text-white truncate max-w-[165px]">
                          {customerName}
                        </span>
                        {isDupPhone && (
                          <span
                            title="Multiple orders found with this phone number"
                            className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold"
                          >
                            Dup
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11.5px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                        <span>{phone || 'No phone'}</span>
                        {phone && (
                          <button
                            type="button"
                            onClick={(e) => copyText(phone, order.id, 'phone', e)}
                            title="Copy phone number"
                            className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {copiedPhoneId === order.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                )}

                {/* Products (Always Visible — Shows which product(s) were ordered) */}
                {hasCol('products') && (
                  <td className="py-3 px-3 align-middle" title={allItemsTooltip}>
                    <div className="flex items-center gap-2.5 min-w-[210px] max-w-[280px]">
                      <div className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {firstItem ? (
                          <img
                            src={getOptimizedImageUrl(firstItemImage, 120)}
                            alt={firstItem.productName || firstItem.name || 'Product'}
                            referrerPolicy="no-referrer"
                            onError={(e) => handleImageError(e, firstItemImage)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-slate-900 dark:text-white truncate text-[13px]">
                            {firstItem?.productName || firstItem?.name || (order as any).productName || 'Order Item'}
                          </p>
                          {itemCount > 1 && (
                            <span className="shrink-0 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10.5px] font-semibold">
                              +{itemCount - 1}
                            </span>
                          )}
                        </div>
                        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                          {itemCount > 1
                            ? `${variantText} · ×${firstItem?.quantity || 1} (+ ${extraItemNames})`
                            : `${variantText} · ×${firstItem?.quantity || totalUnits}`}
                        </p>
                      </div>
                    </div>
                  </td>
                )}

                {hasCol('total_amount') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap font-semibold text-slate-900 dark:text-white tabular-nums">
                    ৳{(order.totalAmount || 0).toLocaleString()}
                  </td>
                )}

                {hasCol('payment_method') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">
                    {order.paymentMethod || 'Cash on Delivery'}
                  </td>
                )}

                {hasCol('payment_status') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        (order.paymentStatus || '').toLowerCase() === 'paid' ||
                        (order.paymentStatus || '').toLowerCase() === 'verified'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : (order.paymentStatus || '').toLowerCase().includes('pending')
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {order.paymentStatus || 'Pending'}
                    </span>
                  </td>
                )}

                {/* OC / Assignee */}
                {hasCol('assignee') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => toggleRowPopover(order.id, 'assignee', e.currentTarget)}
                      title={staffName ? `Assigned to ${staffName}` : 'Assign staff'}
                      className="inline-flex items-center gap-1 rounded-full p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                          staffName
                            ? 'bg-orange-100 text-[#C2410C] dark:bg-orange-950/60 dark:text-orange-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {staffInitials}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </td>
                )}

                {/* Order Status Pill + Dropdown */}
                {hasCol('order_status') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={!canChangeStatus}
                      onClick={(e) => toggleRowPopover(order.id, 'status', e.currentTarget)}
                      className={`h-7 px-2.5 rounded-full border text-[11.5px] font-medium inline-flex items-center gap-1 whitespace-nowrap cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed ${getOrderStatusPillStyle(
                        order.orderStatus
                      )}`}
                    >
                      <span>{order.orderStatus || 'Pending'}</span>
                      {canChangeStatus && <ChevronDown className="w-3 h-3 opacity-70" />}
                    </button>
                  </td>
                )}

                {/* Fulfillment Status */}
                {hasCol('fulfillment_status') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={!canChangeStatus}
                      onClick={(e) => toggleRowPopover(order.id, 'fulfillment', e.currentTarget)}
                      className={`h-7 px-2.5 rounded-full border text-[11.5px] font-medium inline-flex items-center gap-1 whitespace-nowrap cursor-pointer ${fulfillment.badgeClass}`}
                    >
                      <span>{fulfillment.label}</span>
                    </button>
                  </td>
                )}

                {hasCol('courier') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">
                    {order.courierName || '—'}
                  </td>
                )}

                {/* Courier Check */}
                {hasCol('courier_check') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => onCheckCourier(order, e)}
                      disabled={checkingFraudFor === order.id}
                      className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:underline"
                    >
                      {checkingFraudFor === order.id ? (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Checking...
                        </span>
                      ) : effectiveTotal !== undefined && effectiveTotal > 0 ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            effectiveRisk === 'safe'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : effectiveRisk === 'moderate'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {effectiveRate}% ({fraudRep?.deliveredOrders ?? storedRisk?.deliveredOrders ?? 0}/{effectiveTotal})
                        </span>
                      ) : fraudRep && fraudRep.totalOrders === 0 ? (
                        <span className="text-slate-500 text-xs">No history</span>
                      ) : (
                        <span className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs">
                          No data
                        </span>
                      )}
                    </button>
                  </td>
                )}

                {hasCol('delivery_address') && (
                  <td className="py-3 px-3 align-middle max-w-[230px]">
                    <div className="flex items-start gap-1 text-xs text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="truncate" title={deliveryAddr}>
                        {deliveryAddr}
                      </span>
                    </div>
                  </td>
                )}

                {hasCol('channel') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap text-xs text-slate-700 dark:text-slate-300">
                    {srcInfo.shortLabelEn}
                  </td>
                )}

                {hasCol('tracking_number') && (
                  <td className="py-3 px-3 align-middle whitespace-nowrap text-xs font-mono text-slate-700 dark:text-slate-300">
                    {order.trackingNumber || '—'}
                  </td>
                )}

                {/* Actions Menu */}
                {hasCol('actions') && (
                  <td className="py-3 pl-2 pr-4 align-middle text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenOrderDrawer(order, 'overview')}
                        title="Open Order Details Page"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => toggleRowPopover(order.id, 'actions', e.currentTarget)}
                        title="More order actions"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Fixed-Position Row Popovers (Never Clipped by Horizontal Scroll or 1-Row Tables) */}
      {openPopover && activeOrder && (
        <div
          ref={popoverRef}
          style={{
            top: openPopover.top,
            left: openPopover.left,
            maxHeight: openPopover.maxHeight,
          }}
          onClick={(e) => e.stopPropagation()}
          className={`fixed z-[95] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl py-1.5 overflow-y-auto ${
            openPopover.type === 'actions'
              ? 'w-56'
              : openPopover.type === 'assignee'
              ? 'w-52'
              : openPopover.type === 'status'
              ? 'w-48'
              : 'w-44'
          }`}
        >
          {openPopover.type === 'assignee' && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Assign Staff
              </div>
              <button
                type="button"
                onClick={() => {
                  onAssignStaff(activeOrder, null);
                  setOpenPopover(null);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Unassigned
              </button>
              {staffList
                .filter((s) => s.status !== 'suspended')
                .map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      onAssignStaff(activeOrder, st);
                      setOpenPopover(null);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                      activeOrder.handledByStaffId === st.id || activeOrder.handledByStaffName === st.name
                        ? 'bg-orange-50 dark:bg-orange-950/40 text-[#EA580C] font-semibold'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{st.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase">{st.role}</span>
                  </button>
                ))}
            </>
          )}

          {openPopover.type === 'status' && canChangeStatus && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Order Status
              </div>
              {SELECTABLE_ORDER_STATUSES.map((st) => {
                const isCurrent = (activeOrder.orderStatus || '').toLowerCase() === st.toLowerCase();
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      onChangeStatus(activeOrder, st);
                      setOpenPopover(null);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                      isCurrent ? 'font-semibold text-[#EA580C] bg-orange-50/60' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{st}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-[#EA580C]" />}
                  </button>
                );
              })}
            </>
          )}

          {openPopover.type === 'fulfillment' && canChangeStatus && activeFulfillment && (
            <>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Fulfillment
              </div>
              {FULFILLMENT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChangeFulfillment(activeOrder, opt);
                    setOpenPopover(null);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer ${
                    activeFulfillment.label === opt ? 'font-semibold text-[#EA580C]' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>{opt}</span>
                  {activeFulfillment.label === opt && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </>
          )}

          {openPopover.type === 'actions' && (
            <div className="text-left text-xs">
              <button
                type="button"
                onClick={() => {
                  onOpenOrderDrawer(activeOrder, 'overview');
                  setOpenPopover(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Open Order Page</span>
              </button>

              {canEditOrder && (
                <button
                  type="button"
                  onClick={() => {
                    onEditOrder(activeOrder);
                    setOpenPopover(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Order</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  setOpenPopover((prev) => (prev ? { ...prev, type: 'assignee' } : null))
                }
                className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                <span>Assign Staff</span>
              </button>

              {canChangeStatus && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenPopover((prev) => (prev ? { ...prev, type: 'status' } : null))
                    }
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Change Order Status</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenPopover((prev) => (prev ? { ...prev, type: 'fulfillment' } : null))
                    }
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5 text-slate-500" />
                    <span>Update Fulfillment</span>
                  </button>

                  {(activeOrder.orderStatus === 'Pending' || activeOrder.orderStatus === 'Follow Up') && (
                    <button
                      type="button"
                      onClick={() => {
                        onChangeStatus(activeOrder, 'Confirmed');
                        setOpenPopover(null);
                      }}
                      className="w-full px-3 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 cursor-pointer font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Quick Confirm Order</span>
                    </button>
                  )}
                </>
              )}

              {canVerifyPayment && activeIsPendingPaymentVerify && (
                <button
                  type="button"
                  onClick={() => {
                    onVerifyPayment(activeOrder.id);
                    setOpenPopover(null);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 cursor-pointer font-medium"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Verify Payment</span>
                </button>
              )}

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                type="button"
                onClick={(e) => {
                  onCheckCourier(activeOrder, e);
                  setOpenPopover(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                <span>Check Courier Success Rate</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenCourierBooking(activeOrder);
                  setOpenPopover(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-slate-500" />
                <span>Courier Booking & Tracking</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onPrintInvoice(activeOrder);
                  setOpenPopover(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportOrdersToCsv([activeOrder], `invoice-${activeOrder.id}`);
                  setOpenPopover(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Invoice Data</span>
              </button>

              {activePhone && (
                <a
                  href={generateWhatsAppDirectLink(
                    activePhone,
                    formatWhatsAppMessage(DEFAULT_WHATSAPP_TEMPLATES.order_confirmed.message, { order: activeOrder })
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpenPopover(null)}
                  className="w-full px-3 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Contact Customer (WhatsApp)</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  onOpenOrderDrawer(activeOrder, 'notes');
                  setOpenPopover(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <StickyNote className="w-3.5 h-3.5 text-slate-500" />
                <span>Add Internal Note</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenOrderDrawer(activeOrder, 'timeline');
                  setOpenPopover(null);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>View Order Timeline</span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              {canCancelOrder &&
                activeOrder.orderStatus !== 'Cancelled' &&
                activeOrder.orderStatus !== 'Delivered' &&
                activeOrder.orderStatus !== 'Completed' && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeStatus(activeOrder, 'Cancelled');
                      setOpenPopover(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Order</span>
                  </button>
                )}

              {activeOrder.orderStatus === 'Spam' ||
              activeOrder.orderStatus === 'Fake Order' ||
              activeOrder.isFakeOrder ? (
                isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onUnfakeOrder(activeOrder);
                      setOpenPopover(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-emerald-700 hover:bg-emerald-50 cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Real Order</span>
                  </button>
                )
              ) : (
                canMarkSpam && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeStatus(activeOrder, 'Spam');
                      setOpenPopover(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Mark as Spam</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
