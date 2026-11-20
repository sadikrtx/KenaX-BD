import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  Printer,
  Download,
  Edit3,
  Phone,
  MessageSquare,
  MapPin,
  Truck,
  CreditCard,
  Clock,
  StickyNote,
  ShieldAlert,
  ShieldX,
  User,
  Package,
  ExternalLink,
  CheckCircle,
  XCircle,
  Ban,
  RotateCcw,
  Zap,
  Globe,
  Send,
  Loader2,
} from 'lucide-react';
import type { Order, OrderStatus, StaffUser, CourierFraudReport, ActivityLog } from '../../../types/index.ts';
import { getOptimizedImageUrl, handleImageError } from '../../../utils/imageOptimizer';
import { getOrderSourceInfo } from '../../../utils/orderSourceTimeUtils';
import {
  generateWhatsAppDirectLink,
  formatWhatsAppMessage,
  DEFAULT_WHATSAPP_TEMPLATES,
} from '../../../lib/whatsappService';
import { resolveCourierTrackingUrl } from '../../../utils/courierUtils';
import {
  SELECTABLE_ORDER_STATUSES,
  getOrderStatusPillStyle,
  resolveFulfillmentStatus,
  formatExactDateTime,
  formatRelativeAge,
  normalizePhoneKey,
  exportOrdersToCsv,
} from './orderHelpers';

interface OrderDetailsPageProps {
  order: Order;
  allOrders: Order[];
  activityLogs?: ActivityLog[];
  focusSection?: 'overview' | 'notes' | 'timeline';
  staffList: StaffUser[];
  fraudReport?: CourierFraudReport;
  checkingFraud?: boolean;
  canEditOrder: boolean;
  canChangeStatus: boolean;
  canCancelOrder: boolean;
  canMarkSpam: boolean;
  canVerifyPayment: boolean;
  canViewIpIntelligence: boolean;
  isSuperAdmin: boolean;
  isBn?: boolean;
  onBack: () => void;
  onEditOrder: (order: Order) => void;
  onAssignStaff: (order: Order, staff: StaffUser | null) => void;
  onChangeStatus: (order: Order, nextStatus: OrderStatus) => void;
  onChangeFulfillment: (order: Order, nextFulfillment: string) => void;
  onVerifyPayment: (orderId: string) => void;
  onCheckCourier: (order: Order) => void;
  onOpenCourierBooking: (order: Order) => void;
  onOpenLocationMap: (order: Order) => void;
  onFilterByIp: (ip: string) => void;
  onRequestBlockIp: (ip: string) => void;
  onPrintInvoice: (order: Order) => void;
  onUnfakeOrder: (order: Order) => void;
  onAddInternalNote: (order: Order, note: string) => Promise<void>;
  onFilterByCustomerPhone: (phone: string) => void;
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

export const OrderDetailsPage: React.FC<OrderDetailsPageProps> = ({
  order,
  allOrders,
  activityLogs = [],
  focusSection = 'overview',
  staffList,
  fraudReport,
  checkingFraud = false,
  canEditOrder,
  canChangeStatus,
  canCancelOrder,
  canMarkSpam,
  canVerifyPayment,
  canViewIpIntelligence,
  isSuperAdmin,
  isBn = false,
  onBack,
  onEditOrder,
  onAssignStaff,
  onChangeStatus,
  onChangeFulfillment,
  onVerifyPayment,
  onCheckCourier,
  onOpenCourierBooking,
  onOpenLocationMap,
  onFilterByIp,
  onRequestBlockIp,
  onPrintInvoice,
  onUnfakeOrder,
  onAddInternalNote,
  onFilterByCustomerPhone,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const notesSectionRef = useRef<HTMLDivElement>(null);
  const timelineSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNoteInput('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (focusSection === 'notes') {
      setTimeout(() => notesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 140);
    } else if (focusSection === 'timeline') {
      setTimeout(() => timelineSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 140);
    }
  }, [order.id, focusSection]);

  const phone = order.deliveryMobile || order.customerMobile || order.phone || '';
  const customerName = order.deliveryName || order.customerName || 'Guest Customer';
  const phoneKey = normalizePhoneKey(phone);
  const customerOrders = phoneKey.length >= 8
    ? allOrders.filter((o) => normalizePhoneKey(o.deliveryMobile || o.customerMobile || o.phone) === phoneKey)
    : allOrders.filter((o) => o.customerId && o.customerId === order.customerId);
  const customerDeliveredCount = customerOrders.filter(
    (o) => (o.orderStatus || '').toLowerCase() === 'delivered' || (o.orderStatus || '').toLowerCase() === 'completed'
  ).length;
  const customerLifetimeSpend = customerOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const fulfillment = resolveFulfillmentStatus(order);
  const srcInfo = getOrderSourceInfo(order);
  const effectiveIp = (order.customerIp || '').trim();
  const hasRealIp = Boolean(effectiveIp && effectiveIp !== 'N/A' && effectiveIp !== 'unknown');
  const isPendingPaymentVerify =
    (order.paymentStatus || '').toLowerCase().includes('pending') &&
    !(order.paymentMethod || '').toLowerCase().includes('cash');
  const isSpamOrFake =
    order.orderStatus === 'Spam' ||
    order.orderStatus === 'Fake Order' ||
    Boolean(order.isFakeOrder);
  const isDelivered =
    (order.orderStatus || '').toLowerCase() === 'delivered' ||
    (order.orderStatus || '').toLowerCase() === 'completed';

  const storedFraud = fraudReport || order.courierCheckSummary;

  const handleSaveNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    setSavingNote(true);
    try {
      await onAddInternalNote(order, noteInput.trim());
      setNoteInput('');
    } finally {
      setSavingNote(false);
    }
  };

  const trackingHref =
    order.trackingUrl ||
    (order.trackingNumber ? resolveCourierTrackingUrl(order.courierName || '', order.trackingNumber) : '');

  const deliveryAddressText =
    order.fullAddress ||
    (typeof order.deliveryAddress === 'string' ? order.deliveryAddress : '') ||
    [order.district, order.division].filter(Boolean).join(', ') ||
    'Not specified';

  return (
    <div className="space-y-4">
      {/* Top Page Header & Breadcrumb Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isBn ? 'অর্ডার তালিকা' : 'Back to Orders'}</span>
          </button>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {order.id}
              </h1>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(order.id).catch(() => {});
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 1500);
                }}
                title="Copy Order ID"
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getOrderStatusPillStyle(
                  order.orderStatus
                )}`}
              >
                {order.orderStatus || 'Pending'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                {srcInfo.shortLabelEn}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Placed {formatRelativeAge(order.createdAt, isBn)} · {formatExactDateTime(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(order.orderStatus === 'Pending' ||
            order.orderStatus === 'Follow Up' ||
            order.orderStatus === 'Payment Verification') &&
            canChangeStatus && (
              <button
                type="button"
                onClick={() => onChangeStatus(order, 'Confirmed')}
                className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm Order</span>
              </button>
            )}

          <button
            type="button"
            onClick={() => onPrintInvoice(order)}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => exportOrdersToCsv([order], `order-${order.id}`)}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {canEditOrder && (
            <button
              type="button"
              onClick={() => onEditOrder(order)}
              className="h-9 px-3.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Balanced 2-Column Clean SaaS Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* LEFT COLUMN (2/3): Ordered Products, Payment, Courier & Timeline */}
        <div className="lg:col-span-2 space-y-4">
          {/* Card 1: Ordered Products Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Package className="w-4 h-4" />
                <span>Ordered Products ({order.items?.length || 0})</span>
              </h2>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                Total Units: {(order.items || []).reduce((acc, i) => acc + (i.quantity || 1), 0)}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(order.items || []).map((item, idx) => {
                const img =
                  item.selectedColorImage ||
                  item.productImage ||
                  item.image ||
                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120';
                const variantLabel =
                  item.variant ||
                  [item.selectedColor, item.selectedSize].filter(Boolean).join(' · ') ||
                  'Default';
                return (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={getOptimizedImageUrl(img, 140)}
                        alt={item.productName || item.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImageError(e, img)}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {item.productName || item.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Variant: {variantLabel} {item.sku ? `· SKU: ${item.sku}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 text-xs tabular-nums">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        ৳{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        ৳{(item.price || 0).toLocaleString()} × {item.quantity || 1}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium">৳{(order.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Delivery Charge</span>
                <span className="tabular-nums font-medium">৳{(order.deliveryCharge || 0).toLocaleString()}</span>
              </div>
              {(order.discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                  <span className="tabular-nums font-medium">-৳{(order.discount || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Total Payable</span>
                <span className="tabular-nums">৳{(order.totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Payment Information */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4" />
                <span>Payment Information</span>
              </h2>
              {canVerifyPayment && isPendingPaymentVerify && (
                <button
                  type="button"
                  onClick={() => onVerifyPayment(order.id)}
                  className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Verify Payment
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[11px] text-slate-500">Method</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {order.paymentMethod || 'Cash on Delivery'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[11px] text-slate-500">Status</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {order.paymentStatus || 'Pending'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[11px] text-slate-500">Paid</p>
                <p className="font-semibold text-emerald-600 tabular-nums mt-0.5">
                  ৳{(order.paidAmount || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[11px] text-slate-500">Due (COD)</p>
                <p className="font-semibold text-amber-700 tabular-nums mt-0.5">
                  ৳{(order.dueAmount ?? order.totalAmount ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            {(order.transactionId || order.senderMobileNumber) && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex flex-wrap gap-5">
                {order.senderMobileNumber && (
                  <span>
                    Sender: <strong className="font-mono">{order.senderMobileNumber}</strong>
                  </span>
                )}
                {order.transactionId && (
                  <span>
                    TrxID: <strong className="font-mono">{order.transactionId}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Card 3: Courier Info & Fraud Check */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                <span>Courier & Parcel Check</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCheckCourier(order)}
                  disabled={checkingFraud}
                  className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {checkingFraud ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  <span>Courier Check</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCourierBooking(order)}
                  className="h-8 px-3 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>1-Click Booking</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[11px] text-slate-500">Courier Partner</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                  {order.courierName || 'Not assigned'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[11px] text-slate-500">Tracking Number</p>
                <p className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                  {order.trackingNumber || '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[11px] text-slate-500">Live Tracking</p>
                <div className="mt-0.5">
                  {trackingHref ? (
                    <a
                      href={trackingHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[#EA580C] hover:underline"
                    >
                      <span>Track Parcel</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-400">Unavailable</span>
                  )}
                </div>
              </div>
            </div>

            {storedFraud && storedFraud.totalOrders > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-2">
                <span>
                  Success Rate: <strong>{storedFraud.successRate}%</strong> ({storedFraud.deliveredOrders}/{storedFraud.totalOrders} delivered)
                </span>
                <span className="capitalize font-semibold">{storedFraud.riskLevel.replace('_', ' ')}</span>
              </div>
            )}
          </div>

          {/* Card 4: Order Timeline & Activity History */}
          <OrderActivityTimelineCard
            order={order}
            activityLogs={activityLogs}
            timelineRef={timelineSectionRef}
          />
        </div>

        {/* RIGHT COLUMN (1/3): Operations, Customer Info, Delivery & IP, Internal Notes */}
        <div className="space-y-4">
          {/* Card 5: Order Operations */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Order Operations
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Order Status
                </label>
                <select
                  value={order.orderStatus || 'Pending'}
                  disabled={!canChangeStatus}
                  onChange={(e) => onChangeStatus(order, e.target.value as OrderStatus)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white cursor-pointer disabled:opacity-60"
                >
                  {SELECTABLE_ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Fulfillment Status
                </label>
                <select
                  value={fulfillment.label}
                  disabled={!canChangeStatus}
                  onChange={(e) => onChangeFulfillment(order, e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white cursor-pointer disabled:opacity-60"
                >
                  {FULFILLMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Assigned Staff (OC)
                </label>
                <select
                  value={order.handledByStaffId || ''}
                  onChange={(e) => {
                    const selected = staffList.find((s) => s.id === e.target.value) || null;
                    onAssignStaff(order, selected);
                  }}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {staffList
                    .filter((s) => s.status !== 'suspended')
                    .map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.role})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Danger / Moderation Actions */}
            {(canCancelOrder || canMarkSpam || (isSpamOrFake && isSuperAdmin)) && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                {canCancelOrder && order.orderStatus !== 'Cancelled' && !isDelivered && (
                  <button
                    type="button"
                    onClick={() => onChangeStatus(order, 'Cancelled')}
                    className="flex-1 h-8 px-3 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                )}

                {isSpamOrFake ? (
                  isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => onUnfakeOrder(order)}
                      className="flex-1 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Order</span>
                    </button>
                  )
                ) : (
                  canMarkSpam && (
                    <button
                      type="button"
                      onClick={() => onChangeStatus(order, 'Spam')}
                      className="flex-1 h-8 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Mark Spam</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Card 6: Customer Information */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>Customer Information</span>
              </h2>
              {phone && (
                <button
                  type="button"
                  onClick={() => onFilterByCustomerPhone(phone)}
                  className="text-xs font-medium text-[#EA580C] hover:underline cursor-pointer"
                >
                  All ({customerOrders.length})
                </button>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {customerName}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mt-0.5 tabular-nums">
                <span>{phone || 'No phone provided'}</span>
                {phone && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(phone).catch(() => {});
                      setCopiedPhone(true);
                      setTimeout(() => setCopiedPhone(false), 1500);
                    }}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Copy Phone"
                  >
                    {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
              {order.customerEmail && !order.customerEmail.includes('guest@') && (
                <p className="text-xs text-slate-500 mt-0.5">{order.customerEmail}</p>
              )}
            </div>

            {phone && (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${phone}`}
                  className="flex-1 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>
                <a
                  href={generateWhatsAppDirectLink(
                    phone,
                    formatWhatsAppMessage(DEFAULT_WHATSAPP_TEMPLATES.order_confirmed.message, { order })
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[10.5px] text-slate-500">Orders</p>
                <p className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {customerOrders.length}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[10.5px] text-slate-500">Delivered</p>
                <p className="font-semibold text-emerald-600 tabular-nums">
                  {customerDeliveredCount}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                <p className="text-[10.5px] text-slate-500">Spend</p>
                <p className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  ৳{customerLifetimeSpend.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Card 7: Delivery Address & IP */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>Delivery Address</span>
              </h2>
              <button
                type="button"
                onClick={() => onOpenLocationMap(order)}
                className="text-xs font-medium text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Open Map</span>
              </button>
            </div>

            <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-white leading-relaxed">{deliveryAddressText}</p>
              <p className="text-slate-500">
                {[order.upazila || order.area, order.district, order.division].filter(Boolean).join(', ')}
              </p>
              {(order.deliveryInstructions || order.customerNotes) && (
                <p className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 text-amber-900 dark:text-amber-300 text-[11.5px] mt-1.5">
                  Customer Note: {order.deliveryInstructions || order.customerNotes}
                </p>
              )}
            </div>

            {canViewIpIntelligence && hasRealIp && (
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono text-slate-700 dark:text-slate-300">{effectiveIp}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      (order.ipStatus || '').toLowerCase() === 'blocked'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {order.ipStatus || 'Active'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onFilterByIp(effectiveIp)}
                    className="text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Filter IP
                  </button>
                  {(order.ipStatus || '').toLowerCase() !== 'blocked' && (
                    <button
                      type="button"
                      onClick={() => onRequestBlockIp(effectiveIp)}
                      className="text-[11px] font-medium text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldX className="w-3 h-3" />
                      <span>Block</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Card 8: Internal Staff Notes */}
          <div
            ref={notesSectionRef}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <StickyNote className="w-4 h-4" />
              <span>Internal Staff Notes</span>
            </h2>

            <form onSubmit={handleSaveNoteSubmit} className="flex gap-2">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Write an internal note..."
                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
              <button
                type="submit"
                disabled={savingNote || !noteInput.trim()}
                className="h-9 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
              >
                {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Add</span>
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {(order.internalNotesList || []).map((n) => (
                <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
                  <p className="text-slate-800 dark:text-slate-200">{n.note}</p>
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    {n.authorName} · {formatExactDateTime(n.createdAt)}
                  </p>
                </div>
              ))}
              {order.adminNotes && !(order.internalNotesList || []).some((n) => n.note === order.adminNotes) && (
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
                  <p className="text-slate-800 dark:text-slate-200">{order.adminNotes}</p>
                  <p className="text-[10.5px] text-slate-400 mt-1">Admin Note</p>
                </div>
              )}
              {!order.adminNotes && (!order.internalNotesList || order.internalNotesList.length === 0) && (
                <p className="text-xs text-slate-400">No internal notes recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface OrderActivityTimelineCardProps {
  order: Order;
  activityLogs: ActivityLog[];
  timelineRef: React.RefObject<HTMLDivElement | null>;
}

const OrderActivityTimelineCard: React.FC<OrderActivityTimelineCardProps> = ({
  order,
  activityLogs,
  timelineRef,
}) => {
  const [serverLogs, setServerLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/activity-logs?orderId=${encodeURIComponent(order.id)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) {
          setServerLogs(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [order.id, order.orderStatus, order.updatedAt]);

  type UnifiedEntry = {
    id: string;
    title: string;
    transition?: string;
    note?: string;
    actor?: string;
    actorRole?: string;
    isMuse?: boolean;
    timestamp: string;
  };

  const entries: UnifiedEntry[] = [];
  const seenKeys = new Set<string>();

  const combinedLogs = [...serverLogs, ...activityLogs].filter(
    (l) => l && (l.orderId === order.id || l.targetId === order.id)
  );

  combinedLogs.forEach((log) => {
    const tsKey = `${Math.floor(new Date(log.timestamp || 0).getTime() / 5000)}|${log.toStatus || log.action}`;
    if (seenKeys.has(log.id) || seenKeys.has(tsKey)) return;
    seenKeys.add(log.id);
    seenKeys.add(tsKey);
    entries.push({
      id: log.id,
      title: log.action || (log.toStatus ? `Status → ${log.toStatus}` : 'Order Activity'),
      transition: log.fromStatus && log.toStatus ? `${log.fromStatus} → ${log.toStatus}` : undefined,
      note: log.details,
      actor: log.staffName,
      actorRole: log.staffRole,
      isMuse: log.staffRole === 'integration' || log.source === 'muse_integration' || (log.staffName || '').toLowerCase().includes('muse'),
      timestamp: log.timestamp,
    });
  });

  const timelineList = Array.isArray(order.timeline) ? order.timeline : [];
  timelineList.forEach((evt, idx) => {
    const tsKey = `${Math.floor(new Date(evt.timestamp || 0).getTime() / 5000)}|${evt.status}`;
    if (seenKeys.has(tsKey)) return;
    seenKeys.add(tsKey);
    entries.push({
      id: `tl-${idx}-${evt.timestamp}`,
      title: evt.status || 'Order Update',
      note: evt.note,
      actor: evt.updatedBy,
      isMuse: (evt.updatedBy || '').toLowerCase().includes('muse'),
      timestamp: evt.timestamp,
    });
  });

  if (entries.length === 0) {
    entries.push({
      id: 'initial-order',
      title: order.orderStatus || 'Pending',
      note: 'Order created',
      timestamp: order.createdAt,
    });
  }

  entries.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

  return (
    <div
      ref={timelineRef}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>Order Activity & Timeline</span>
        </h2>
        <span className="text-[11px] font-semibold text-slate-400">
          {entries.length} {entries.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      <div className="space-y-3">
        {entries.map((evt) => (
          <div key={evt.id} className="flex items-start gap-2.5 text-xs">
            <span
              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                evt.isMuse ? 'bg-emerald-500' : 'bg-[#EA580C]'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-900 dark:text-white">{evt.title}</span>
                  {evt.transition && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      {evt.transition}
                    </span>
                  )}
                  {evt.isMuse && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                      Muse AI
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {formatExactDateTime(evt.timestamp)}
                </span>
              </div>
              {evt.note && <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{evt.note}</p>}
              {evt.actor && (
                <p className="text-[10.5px] text-slate-400 mt-0.5">
                  By {evt.actor}
                  {evt.actorRole ? ` (${evt.actorRole.replace('_', ' ')})` : ''}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

