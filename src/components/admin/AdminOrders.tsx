import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Printer,
  ChevronDown,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  CreditCard,
  AlertCircle,
  DollarSign,
  Calendar,
  ExternalLink,
  Save,
  X,
  Sparkles,
  Plus,
  ShoppingBag,
  Trash2,
  Check,
  UserCheck,
  BadgeCheck,
  Copy,
  MessageSquare,
  Lock,
  Unlock,
  Package,
  Send,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Bot,
  RotateCcw,
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { Order, OrderStatus, UserRole, StaffUser, Product, OrderItem, SiteSettings, DEFAULT_ORDER_STEP_NAMES, CourierFraudReport } from '../../types';
import { getOptimizedImageUrl, handleImageError } from '../../utils/imageOptimizer';
import { CartItemImage } from '../CartItemImage';
import {
  generateWhatsAppDirectLink,
  formatWhatsAppMessage,
  DEFAULT_WHATSAPP_TEMPLATES,
} from '../../lib/whatsappService';
import { checkCourierFraud, formatAdvanceDeliveryMessage, normalizePhoneForCourier } from '../../lib/courierFraudService';
import { dispatchFakeOrderAlerts } from '../../lib/fakeOrderAlertService';

interface AdminOrdersProps {
  orders: Order[];
  products?: Product[];
  onUpdateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    courierName?: string,
    trackingNumber?: string,
    handledByStaff?: { id?: string; name?: string; role?: string },
    adminNotes?: string
  ) => void;
  onVerifyPayment: (orderId: string) => void;
  onPrintInvoice: (order: Order) => void;
  onAddOrder?: (newOrder: Order) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  initialScope?: 'all' | 'pending' | 'confirmed' | 'processing' | 'delivered' | 'cancelled' | 'rejected' | 'fake_order' | 'my_orders';
  settings?: SiteSettings;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  orders = [],
  products = [],
  onUpdateOrderStatus,
  onVerifyPayment,
  onPrintInvoice,
  onAddOrder,
  currentRole,
  currentStaff,
  initialScope,
  settings,
}) => {
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<
    'all' | 'pending' | 'confirmed' | 'processing' | 'delivered' | 'cancelled' | 'rejected' | 'fake_order' | 'my_orders'
  >((initialScope as any) || 'pending');

  useEffect(() => {
    if (initialScope) {
      setScopeFilter(initialScope);
    } else {
      setScopeFilter('pending');
    }
  }, [initialScope]);

  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [lockedNoticeOrderId, setLockedNoticeOrderId] = useState<string | null>(null);

  // Confirmed Orders sub-stage filtering, shipped dispatch modal & Super Admin unlock states
  const [confirmedStageFilter, setConfirmedStageFilter] = useState<string>('Confirmed');
  const [shippedPromptOrder, setShippedPromptOrder] = useState<Order | null>(null);
  const [shippedPromptCourier, setShippedPromptCourier] = useState<string>('Steadfast Courier');
  const [shippedPromptTracking, setShippedPromptTracking] = useState<string>('');
  const [superAdminUnlockedOrderIds, setSuperAdminUnlockedOrderIds] = useState<Record<string, boolean>>({});

  // Courier Fraud & Delivery Success Rate States
  const [fraudReports, setFraudReports] = useState<Record<string, CourierFraudReport>>({});
  const [checkingFraudFor, setCheckingFraudFor] = useState<string | null>(null);
  const [selectedFraudModalReport, setSelectedFraudModalReport] = useState<{ report: CourierFraudReport; order: Order } | null>(null);

  const handleCheckFraud = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const phone = order.customerMobile || order.deliveryMobile;
    if (!phone) return;
    
    setCheckingFraudFor(order.id);
    try {
      const rep = await checkCourierFraud(phone, {
        apiKey: settings?.steadfastApiKey,
        secretKey: settings?.steadfastSecretKey,
      });
      setFraudReports((prev) => ({ ...prev, [order.id]: rep }));
      setSelectedFraudModalReport({ report: rep, order });
    } catch (err) {
      console.error('Fraud check error:', err);
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
    const msg = formatAdvanceDeliveryMessage(
      order.customerName,
      amount,
      order.id,
      {
        siteName: settings?.siteName || 'KenaX BD',
        bkash: settings?.whatsappNumber || '01719143897',
        nagad: settings?.whatsappNumber || '01719143897',
      }
    );
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const toggleOrderExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedOrderIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const CONFIRMED_TAB_STEPS: {
    status: OrderStatus;
    num: number;
    title: string;
    desc: string;
    icon: React.ElementType;
  }[] = [
    { status: 'Confirmed', num: 1, title: 'Confirmed', desc: 'Order Confirmed', icon: CheckCircle },
    { status: 'Processing', num: 2, title: 'Processing', desc: 'Processing Order', icon: Sparkles },
    { status: 'Packed', num: 3, title: 'Packed', desc: 'Packed & Picked', icon: ShoppingBag },
    { status: 'Shipped', num: 4, title: 'Shipped', desc: 'In Transit', icon: Truck },
    { status: 'Out for Delivery', num: 5, title: 'Out for Delivery', desc: 'On the Way', icon: Truck },
    { status: 'Delivered', num: 6, title: 'Delivered', desc: 'Delivered to Customer', icon: BadgeCheck },
    { status: 'Completed', num: 7, title: 'Completed', desc: 'Order Completed', icon: CheckCircle },
    { status: 'Returned', num: 8, title: 'Returned', desc: 'Order Returned', icon: XCircle },
  ];

  const getConfirmedStepNum = (status: string): number => {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed') return 1;
    if (s === 'processing') return 2;
    if (s === 'packed' || s === 'picked') return 3;
    if (s === 'shipped') return 4;
    if (s === 'out for delivery' || s === 'out_for_delivery') return 5;
    if (s === 'delivered') return 6;
    if (s === 'completed') return 7;
    if (s === 'returned') return 8;
    return 1;
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed') return 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-700 font-extrabold';
    if (s === 'processing') return 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-700 font-extrabold';
    if (s === 'packed' || s === 'picked') return 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-700 font-extrabold';
    if (s === 'shipped') return 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-700 font-extrabold';
    if (s === 'out for delivery' || s === 'out_for_delivery') return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700 font-extrabold';
    if (s === 'delivered') return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700 font-extrabold';
    if (s === 'completed') return 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-600 dark:text-white dark:border-emerald-500 font-extrabold';
    if (s === 'returned') return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700 font-extrabold';
    return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 font-bold';
  };

  const isAiOrder = (ord: Order | any) => {
    if (!ord) return false;
    const ordSrc = ((ord as any).orderSource || '').toLowerCase().trim();
    if (ordSrc === 'chatbot' || ordSrc === 'ai_bot') {
      return true;
    }
    if (ordSrc === 'manual' || ordSrc === 'website' || ordSrc === 'landing_page' || ordSrc === 'admin') {
      return false;
    }
    // Legacy fallback only if orderSource is completely unset
    return ord.isAiBotOrder === true && (ord as any).createdByStaffName === 'Ordered by KenaX Bot';
  };

  const COURIER_PARTNERS = [
    'Steadfast Courier',
    'Pathao Courier',
    'RedX Logistics',
    'Sundarban Courier',
    'eCourier',
    'Paperfly',
    'Karatoa Courier',
    'In-House Delivery',
  ];

  const handleConfirmedStepClick = (order: Order, targetStep: typeof CONFIRMED_TAB_STEPS[number]) => {
    const currentNum = getConfirmedStepNum(order.orderStatus);
    
    // Allow transitioning to Returned (step 8) from any confirmed stage including Delivered (step 6) or Completed (step 7)
    // Or allow transitioning between Delivered (6) and Completed (7)
    const isSpecialAllowed = 
      (targetStep.status === 'Returned' && order.orderStatus !== 'Returned') ||
      (targetStep.status === 'Delivered' && (order.orderStatus === 'Shipped' || order.orderStatus === 'Out for Delivery' || order.orderStatus === 'Completed')) ||
      (targetStep.status === 'Completed' && (order.orderStatus === 'Delivered' || order.orderStatus === 'Out for Delivery' || order.orderStatus === 'Shipped'));

    if (targetStep.num <= currentNum && !isSpecialAllowed) {
      setLockedNoticeOrderId(order.id);
      setTimeout(() => {
        setLockedNoticeOrderId((curr) => (curr === order.id ? null : curr));
      }, 3500);
      return;
    }

    // Intercept Shipped transition to prompt for courier & tracking ID
    if (targetStep.status === 'Shipped') {
      setShippedPromptOrder(order);
      setShippedPromptCourier(order.courierName || 'Steadfast Courier');
      setShippedPromptTracking(order.trackingNumber || '');
      return;
    }

    const activeStaff = currentStaff
      ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
      : undefined;

    onUpdateOrderStatus(
      order.id,
      targetStep.status,
      order.courierName,
      order.trackingNumber,
      activeStaff
    );
    showSaveNotification(`Auto-saved! Status changed to "${targetStep.title}"`);
  };

  const handleConfirmShippedModal = () => {
    if (!shippedPromptOrder) return;
    const activeStaff = currentStaff
      ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
      : undefined;

    onUpdateOrderStatus(
      shippedPromptOrder.id,
      'Shipped',
      shippedPromptCourier,
      shippedPromptTracking,
      activeStaff
    );
    showSaveNotification(`Order #${shippedPromptOrder.id} status changed to Shipped! Courier & tracking locked.`);
    setShippedPromptOrder(null);
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showSaveNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3800);
  };
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const formatOrderDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { time: '--:--', date: dateStr };

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const time = `${hours}:${minutes}`;

    const day = d.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);

    const date = `${day} ${month} ${year}`;
    return { time, date };
  };

  const handleCopyOrderId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(id);
      setCopiedOrderId(id);
      setTimeout(() => setCopiedOrderId(null), 1500);
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };

  // Helper function to resolve the original cost price for an item
  const getItemOriginalCost = (item: any): number => {
    if (item.costPrice !== undefined && item.costPrice !== null && Number(item.costPrice) > 0) {
      return Number(item.costPrice);
    }
    const matched = products.find(
      (p) => p.id === item.productId || p.name === item.name || p.name === item.productName
    );
    if (matched?.costPrice && matched.costPrice > 0) {
      return Number(matched.costPrice);
    }
    // Standard default internal estimation (75% of price if unspecified)
    return Math.round((item.price || 0) * 0.75);
  };

  // Helper function to calculate total original cost for an order
  const getOrderOriginalCost = (order?: Order | null): number => {
    if (!order || !order.items || !Array.isArray(order.items) || order.items.length === 0) return 0;
    return (order.items || []).reduce((sum, item) => {
      if (!item) return sum;
      const unitCost = getItemOriginalCost(item);
      return sum + unitCost * (item.quantity || 1);
    }, 0);
  };

  // Manual Order Creation Modal State
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

  const bkashGw = settings?.paymentGateways?.find((g) => g.id === 'bkash' || g.name.toLowerCase().includes('bkash'));
  const nagadGw = settings?.paymentGateways?.find((g) => g.id === 'nagad' || g.name.toLowerCase().includes('nagad'));
  const rocketGw = settings?.paymentGateways?.find((g) => g.id === 'rocket' || g.name.toLowerCase().includes('rocket'));

  const paymentGatewaysInfo: Record<
    'bKash' | 'Nagad' | 'Rocket',
    { name: string; number: string; type: string; themeColor: string; bgBadge: string; borderActive: string }
  > = {
    bKash: {
      name: bkashGw?.name || 'bKash',
      number: bkashGw?.accountNumber || settings?.bkashNumber || '01712-345678',
      type: `${bkashGw?.accountType || settings?.bkashType || 'Personal'} (${bkashGw?.txType || 'Send Money'})`,
      themeColor: 'text-pink-600',
      bgBadge: 'bg-pink-50 text-pink-700 border-pink-200',
      borderActive: 'border-pink-500 bg-pink-50/50 text-pink-900',
    },
    Nagad: {
      name: nagadGw?.name || 'Nagad',
      number: nagadGw?.accountNumber || settings?.nagadNumber || '01812-345678',
      type: `${nagadGw?.accountType || settings?.nagadType || 'Merchant'} (${nagadGw?.txType || 'Payment'})`,
      themeColor: 'text-orange-600',
      bgBadge: 'bg-orange-50 text-orange-700 border-orange-200',
      borderActive: 'border-orange-500 bg-orange-50/50 text-orange-900',
    },
    Rocket: {
      name: rocketGw?.name || 'Rocket',
      number: rocketGw?.accountNumber || settings?.rocketNumber || '01912-345678-9',
      type: `${rocketGw?.accountType || 'Personal'} (${rocketGw?.txType || 'Send Money'})`,
      themeColor: 'text-purple-600',
      bgBadge: 'bg-purple-50 text-purple-700 border-purple-200',
      borderActive: 'border-purple-500 bg-purple-50/50 text-purple-900',
    },
  };

  const handleCopyPaymentNumber = (num: string) => {
    const cleanNum = num.replace(/[^0-9]/g, '');
    navigator.clipboard.writeText(cleanNum);
    setCopiedPaymentNumber(num);
    setTimeout(() => {
      setCopiedPaymentNumber(null);
    }, 2000);
  };

  const handleSelectPaymentOptionType = (type: 'cod' | 'full' | 'delivery_only') => {
    setPaymentOptionType(type);
    if (type === 'cod') {
      setPayMethod('Cash on Delivery');
    } else {
      if (payMethod === 'Cash on Delivery') {
        setPayMethod('bKash');
      }
    }
  };

  // Selected Products for manual order & search state
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
  const [selectedVariant, setSelectedVariant] = useState<string>('');

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
      const opts = colorVar.options || colorVar.values || [];
      opts.forEach((opt) => {
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
      const opts = sizeVar.options || sizeVar.values || [];
      opts.forEach((opt) => {
        if (opt && !list.includes(opt)) list.push(opt);
      });
    }
    return list;
  }, [activeSelectedProduct]);

  // Sync default color & size when selected product changes
  useEffect(() => {
    if (activeSelectedProduct) {
      setSelectedColor(availableColors.length > 0 ? availableColors[0] : '');
      setSelectedSize(availableSizes.length > 0 ? availableSizes[0] : '');
    } else {
      setSelectedColor('');
      setSelectedSize('');
    }
  }, [selectedProductId, availableColors, availableSizes]);

  // Status edit modal inside order details
  const [editingStatus, setEditingStatus] = useState<OrderStatus>('Confirmed');
  const [courierName, setCourierName] = useState('Steadfast Courier');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderNotesInput, setOrderNotesInput] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Moderator specific stats & isolation rules
  const isModeratorRole = currentRole === 'moderator' || currentStaff?.role === 'moderator';

  // Strict moderator attribution to THIS staff member
  const myModeratorOrders = (orders || []).filter((o) => {
    if (!currentStaff) return false;
    const isById = (o.handledByStaffId && o.handledByStaffId === currentStaff.id) || (o.createdByStaffId && o.createdByStaffId === currentStaff.id);
    const isByName = (o.handledByStaffName && o.handledByStaffName === currentStaff.name) || (o.createdByStaffName && o.createdByStaffName === currentStaff.name);
    return isById || isByName;
  });

  const myApprovedOrders = myModeratorOrders.filter(
    (o) =>
      o.orderStatus === 'Confirmed' ||
      o.orderStatus === 'Processing' ||
      o.orderStatus === 'Packed' ||
      o.orderStatus === 'Shipped' ||
      o.orderStatus === 'Delivered'
  );

  const myApprovedRevenue = (myApprovedOrders || []).reduce((sum, o) => sum + (o?.totalAmount || 0), 0);
  const myRejectedOrders = myModeratorOrders.filter((o) => o.orderStatus === 'Cancelled');

  const filteredOrders = (orders || []).filter((order) => {
    if (!order) return false;
    // Reseller Dropship orders belong in dedicated Reseller Orders Hub and are isolated from main store orders
    const isResellerOrder = Boolean(
      (order as any).resellerId ||
      (order as any).resellerStoreName ||
      (order as any).isResellerOrder ||
      (order.notes && order.notes.includes('[Dropship:'))
    );
    if (isResellerOrder) {
      return false;
    }

    const rawStatus = (order.orderStatus || (order as any).status || 'Pending').toString().trim();
    const lowerStatus = rawStatus.toLowerCase();
    const isPendingOrder =
      lowerStatus === 'pending' ||
      lowerStatus === 'payment verification' ||
      lowerStatus === 'unconfirmed';

    // Moderator isolation rule:
    // A moderator can see all Pending/Payment Verification orders, AND all orders created/handled by themselves.
    // They CANNOT access non-pending orders handled/created by other moderators.
    if (isModeratorRole && currentStaff) {
      const isMine =
        (order.handledByStaffId && order.handledByStaffId === currentStaff.id) ||
        (order.createdByStaffId && order.createdByStaffId === currentStaff.id) ||
        (order.handledByStaffName && order.handledByStaffName === currentStaff.name) ||
        (order.createdByStaffName && order.createdByStaffName === currentStaff.name);

      if (!isPendingOrder && !isMine) {
        return false;
      }
    }

    // 1. Scope filter
    if (scopeFilter === 'pending') {
      if (!isPendingOrder) return false;
    } else if (scopeFilter === 'confirmed') {
      // Must have been explicitly confirmed (or progressed) - NOT pending!
      const isConfirmedProgression =
        !isPendingOrder &&
        (lowerStatus === 'confirmed' ||
          lowerStatus === 'processing' ||
          lowerStatus === 'packed' ||
          lowerStatus === 'picked' ||
          lowerStatus === 'shipped' ||
          lowerStatus === 'out for delivery' ||
          lowerStatus === 'out_for_delivery' ||
          lowerStatus === 'delivered' ||
          lowerStatus === 'completed' ||
          lowerStatus === 'returned');
      if (!isConfirmedProgression) return false;

      // Sub-stage filter for Confirmed Orders Directory
      if (confirmedStageFilter !== 'all') {
        const lowerStage = confirmedStageFilter.toLowerCase();
        if (lowerStage === 'packed' || lowerStage === 'picked') {
          if (lowerStatus !== 'packed' && lowerStatus !== 'picked') return false;
        } else {
          if (lowerStatus !== lowerStage) return false;
        }
      }
    } else if (scopeFilter === 'processing') {
      const isProc = lowerStatus === 'processing' || lowerStatus === 'packed' || lowerStatus === 'shipped' || lowerStatus === 'out for delivery' || lowerStatus === 'out_for_delivery';
      if (!isProc) return false;
    } else if (scopeFilter === 'delivered') {
      if (lowerStatus !== 'delivered') return false;
    } else if (scopeFilter === 'cancelled') {
      if (lowerStatus !== 'cancelled') return false;
    } else if (scopeFilter === 'rejected') {
      const isRej = lowerStatus === 'cancelled' || lowerStatus === 'rejected' || ((order.paymentStatus || '').toLowerCase() === 'rejected');
      if (!isRej) return false;
    } else if (scopeFilter === 'fake_order') {
      const isFake = lowerStatus === 'fake order' || lowerStatus === 'fake' || Boolean(order.isFakeOrder);
      if (!isFake) return false;
    } else if (scopeFilter === 'my_orders') {
      if (currentStaff) {
        const isMine =
          (order.handledByStaffId && order.handledByStaffId === currentStaff.id) ||
          (order.createdByStaffId && order.createdByStaffId === currentStaff.id) ||
          (order.handledByStaffName && order.handledByStaffName === currentStaff.name) ||
          (order.createdByStaffName && order.createdByStaffName === currentStaff.name);
        if (!isMine) return false;
      }
    }

    // 2. Search filter
    const matchesSearch =
      (order.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerMobile || '').includes(searchQuery);

    // 3. Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      lowerStatus === statusFilter.toLowerCase() ||
      (statusFilter.toLowerCase() === 'pending' && isPendingOrder) ||
      (statusFilter.toLowerCase() === 'confirmed' && lowerStatus === 'confirmed') ||
      (statusFilter.toLowerCase() === 'rejected' && (lowerStatus === 'cancelled' || lowerStatus === 'rejected' || ((order.paymentStatus || '').toLowerCase() === 'rejected'))) ||
      (statusFilter.toLowerCase() === 'fake order' && (lowerStatus === 'fake order' || lowerStatus === 'fake' || Boolean(order.isFakeOrder)));

    // 4. Payment filter
    const matchesPayment =
      paymentFilter === 'all' || (order.paymentMethod || '').toLowerCase() === paymentFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPayment;
  }).sort((a, b) => {
    // Priority 1: Non-delivered orders stay on top, delivered orders go to the very bottom
    const aIsDelivered = a.orderStatus === 'Delivered';
    const bIsDelivered = b.orderStatus === 'Delivered';

    if (!aIsDelivered && bIsDelivered) return -1; // non-delivered 'a' comes first (top)
    if (aIsDelivered && !bIsDelivered) return 1;  // delivered 'a' goes down (bottom)

    // Priority 2: Within each group, latest / newest order comes first (descending timestamp)
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (bTime !== aTime) {
      return bTime - aTime;
    }

    return b.id.localeCompare(a.id);
  });

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
    const combinedVariant = variantParts.length > 0 ? variantParts.join(' | ') : (selectedVariant || undefined);

    let itemImage = activeSelectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30';
    if (selectedColor && activeSelectedProduct.colors) {
      const matchingColorObj = activeSelectedProduct.colors.find(
        (c) => typeof c === 'object' && (c.name === selectedColor || c.colorName === selectedColor) && c.imageUrl
      );
      if (matchingColorObj?.imageUrl) {
        itemImage = matchingColorObj.imageUrl;
      }
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

    // Reset selection & search query
    setProductSearchQuery('');
    setSelectedProductId('');
    setSelectedQty(1);
    setSelectedColor('');
    setSelectedSize('');
    setSelectedVariant('');
  };

  const handleRemoveProductFromOrder = (index: number) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return (orderItems || []).reduce((sum, item) => sum + (item?.price || 0) * (item?.quantity || 1), 0);
  };

  const calculateTotal = () => {
    return Math.max(0, calculateSubtotal() + delivCharge - discountAmount);
  };

  const calculateAdvancePaid = () => {
    const total = calculateTotal();
    if (paymentOptionType === 'full') {
      return total;
    } else if (paymentOptionType === 'delivery_only') {
      return delivCharge;
    }
    return 0; // COD
  };

  const calculateDueAmount = () => {
    return Math.max(0, calculateTotal() - calculateAdvancePaid());
  };

  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) {
      setManualOrderError('Please select at least 1 product to create this order.');
      return;
    }
    if (!custName.trim() || !custMobile.trim() || !custAddress.trim()) {
      setManualOrderError('Please fill in the customer name, mobile number, and complete delivery address.');
      return;
    }
    setManualOrderError(null);

    const orderId = 'KB-' + Math.floor(100000 + Math.random() * 900000);
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
      paymentOptionType: paymentOptionType,
      senderMobileNumber: senderMobileNumber.trim() || undefined,
      transactionId: transactionId.trim() || undefined,
      paidAmount: computedPaid,
      dueAmount: computedDue,
      paymentStatus:
        paymentOptionType === 'full'
          ? (transactionId.trim() ? 'Verified' : 'Pending Verification')
          : paymentOptionType === 'delivery_only'
          ? (transactionId.trim() ? 'Verified' : 'Pending Verification')
          : 'Paid on Delivery',
      orderStatus: initialOrderStatus,
      timeline: [
        {
          status: initialOrderStatus,
          timestamp: nowISO,
          note: `Manual order created by staff ${staffName} (${staffRole})${
            transactionId.trim() ? ` [TrxID: ${transactionId.trim()}, Sender: ${senderMobileNumber.trim() || 'N/A'}]` : ''
          }. Advance: ৳${computedPaid}, Due: ৳${computedDue}.`,
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

    if (onAddOrder) {
      onAddOrder(newOrder);
    }

    // Reset Form & Close
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
    alert(`Order #${newOrder.id} created successfully and assigned to ${staffName}!`);
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setEditingStatus(order.orderStatus);
    setCourierName(order.courierName || 'Steadfast Courier');
    setTrackingNumber(order.trackingNumber || '');
    setOrderNotesInput(order.adminNotes || '');
    setStatusNote('');
    setErrorMessage(null);
  };

  const handleSaveOrderNotes = () => {
    if (!selectedOrder) return;
    onUpdateOrderStatus(
      selectedOrder.id,
      selectedOrder.orderStatus,
      courierName,
      trackingNumber,
      currentStaff ? {
        id: currentStaff.id,
        name: currentStaff.name,
        role: currentStaff.role,
      } : undefined,
      orderNotesInput
    );
    setSelectedOrder({
      ...selectedOrder,
      adminNotes: orderNotesInput,
    });
    showSaveNotification(`Order #${selectedOrder.id} internal notes saved successfully!`);
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    // Strict rule: Order cancellation is NOT allowed if already Delivered
    if (selectedOrder.orderStatus === 'Delivered' && editingStatus === 'Cancelled') {
      setErrorMessage('Order cannot be cancelled because it has already been delivered to the customer.');
      return;
    }

    onUpdateOrderStatus(
      selectedOrder.id,
      editingStatus,
      courierName,
      trackingNumber,
      currentStaff ? {
        id: currentStaff.id,
        name: currentStaff.name,
        role: currentStaff.role,
      } : undefined,
      orderNotesInput
    );

    const isCompletedOrDelivered = editingStatus === 'Completed' || editingStatus === 'Delivered';
    const isReturned = editingStatus === 'Returned';
    // Update local modal state with staff attribution
    setSelectedOrder({
      ...selectedOrder,
      orderStatus: editingStatus,
      paymentStatus: isCompletedOrDelivered ? 'Paid' : isReturned ? 'Unpaid' : selectedOrder.paymentStatus,
      paidAmount: isCompletedOrDelivered ? selectedOrder.totalAmount : isReturned ? 0 : selectedOrder.paidAmount,
      dueAmount: isCompletedOrDelivered ? 0 : isReturned ? selectedOrder.totalAmount : selectedOrder.dueAmount,
      courierName,
      trackingNumber,
      adminNotes: orderNotesInput,
      handledByStaffId: currentStaff?.id || selectedOrder.handledByStaffId,
      handledByStaffName: currentStaff?.name || selectedOrder.handledByStaffName,
      handledByStaffRole: currentStaff?.role || selectedOrder.handledByStaffRole,
    });
    setErrorMessage(null);
    showSaveNotification(
      `Order #${selectedOrder.id} status progression successfully saved as "${editingStatus}"!`
    );
  };

  const handleConfirmPendingOrder = () => {
    if (!selectedOrder) return;
    const newStatus: OrderStatus = 'Confirmed';
    onUpdateOrderStatus(
      selectedOrder.id,
      newStatus,
      courierName,
      trackingNumber,
      currentStaff ? {
        id: currentStaff.id,
        name: currentStaff.name,
        role: currentStaff.role,
      } : undefined,
      orderNotesInput
    );
    setSelectedOrder({
      ...selectedOrder,
      orderStatus: newStatus,
      adminNotes: orderNotesInput,
      handledByStaffId: currentStaff?.id || selectedOrder.handledByStaffId,
      handledByStaffName: currentStaff?.name || selectedOrder.handledByStaffName,
      handledByStaffRole: currentStaff?.role || selectedOrder.handledByStaffRole,
    });
    setEditingStatus(newStatus);
    showSaveNotification(`Order #${selectedOrder.id} confirmed and moved to Confirmed Orders tab!`);
  };

  const handleCancelPendingOrder = () => {
    if (!selectedOrder) return;
    const newStatus: OrderStatus = 'Cancelled';
    onUpdateOrderStatus(
      selectedOrder.id,
      newStatus,
      courierName,
      trackingNumber,
      currentStaff ? {
        id: currentStaff.id,
        name: currentStaff.name,
        role: currentStaff.role,
      } : undefined,
      orderNotesInput
    );
    setSelectedOrder({
      ...selectedOrder,
      orderStatus: newStatus,
      adminNotes: orderNotesInput,
      handledByStaffId: currentStaff?.id || selectedOrder.handledByStaffId,
      handledByStaffName: currentStaff?.name || selectedOrder.handledByStaffName,
      handledByStaffRole: currentStaff?.role || selectedOrder.handledByStaffRole,
    });
    setEditingStatus(newStatus);
    showSaveNotification(`Order #${selectedOrder.id} has been cancelled.`);
  };

  const handleMarkFakeOrder = () => {
    if (!selectedOrder) return;
    const newStatus: OrderStatus = 'Fake Order';
    onUpdateOrderStatus(
      selectedOrder.id,
      newStatus,
      courierName,
      trackingNumber,
      currentStaff ? {
        id: currentStaff.id,
        name: currentStaff.name,
        role: currentStaff.role,
      } : undefined,
      orderNotesInput ? `${orderNotesInput} (Marked as Fake Order)` : 'Marked as Fake Order by Admin'
    );
    setSelectedOrder({
      ...selectedOrder,
      orderStatus: newStatus,
      isFakeOrder: true,
      adminNotes: orderNotesInput ? `${orderNotesInput} (Marked as Fake Order)` : 'Marked as Fake Order',
      handledByStaffId: currentStaff?.id || selectedOrder.handledByStaffId,
      handledByStaffName: currentStaff?.name || selectedOrder.handledByStaffName,
      handledByStaffRole: currentStaff?.role || selectedOrder.handledByStaffRole,
    });
    setEditingStatus(newStatus);
    dispatchFakeOrderAlerts({
      order: { ...selectedOrder, isFakeOrder: true, orderStatus: newStatus },
      staff: currentStaff,
      note: orderNotesInput ? `${orderNotesInput} (Marked as Fake Order)` : 'Marked as Fake Order by Admin',
    }).catch(() => {});
    showSaveNotification(`Order #${selectedOrder.id} has been marked as a Fake Order.`);
  };

  const isSuperAdmin = currentRole === 'super_admin' || currentStaff?.role === 'super_admin';

  const handleUnfakeOrder = (order: Order) => {
    if (!isSuperAdmin) {
      showSaveNotification('⚠️ শুধুমাত্র সুপার অ্যাডমিন কোনো ফেক অর্ডার আনফেক বা রিয়েল করতে পারবেন।');
      return;
    }

    const activeStaff = currentStaff
      ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
      : { id: 'super_admin', name: 'Super Admin', role: 'super_admin' };

    const restoredStatus: OrderStatus = 'Pending';
    onUpdateOrderStatus(
      order.id,
      restoredStatus,
      order.courierName,
      order.trackingNumber,
      activeStaff,
      'Restored from Fake Order to Valid Real Order by Super Admin'
    );

    if (selectedOrder && selectedOrder.id === order.id) {
      setSelectedOrder({
        ...selectedOrder,
        orderStatus: restoredStatus,
        isFakeOrder: false,
        adminNotes: 'Restored to Real Order by Super Admin',
      });
      setEditingStatus(restoredStatus);
    }

    showSaveNotification(`অর্ডার #${order.id} সফলভাবে আনফেক করা হয়েছে এবং রিয়েল অর্ডার হিসেবে ফিরিয়ে আনা হয়েছে!`);
  };

  const getStatusPill = (status: OrderStatus) => {
    switch (status) {
      case 'Fake Order':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 inline-flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
            Fake Order
          </span>
        );
      case 'Delivered':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Delivered</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">Cancelled</span>;
      case 'Shipped':
      case 'Out for Delivery':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">{status}</span>;
      case 'Packed':
      case 'Processing':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">{status}</span>;
      case 'Payment Verification':
      case 'Pending':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">{status}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">{status}</span>;
    }
  };

  const countPending = orders.filter((o) => {
    const s = (o.orderStatus || (o as any).status || 'Pending').toString().trim().toLowerCase();
    return s === 'pending' || s === 'payment verification' || s === 'unconfirmed';
  }).length;
  const countConfirmed = orders.filter((o) => {
    const s = (o.orderStatus || (o as any).status || '').toString().trim().toLowerCase();
    const isPend = s === 'pending' || s === 'payment verification' || s === 'unconfirmed';
    return (
      !isPend &&
      (s === 'confirmed' ||
        s === 'processing' ||
        s === 'packed' ||
        s === 'picked' ||
        s === 'shipped' ||
        s === 'out for delivery' ||
        s === 'out_for_delivery' ||
        s === 'delivered' ||
        s === 'completed' ||
        s === 'returned')
    );
  }).length;
  const countConfirmedOnly = orders.filter((o) => {
    const s = (o.orderStatus || (o as any).status || '').toString().trim().toLowerCase();
    return s === 'confirmed';
  }).length;
  const countProcessingOnly = orders.filter((o) => {
    const s = (o.orderStatus || (o as any).status || '').toString().trim().toLowerCase();
    return s === 'processing';
  }).length;
  const countPickedOnly = orders.filter((o) => {
    const s = (o.orderStatus || (o as any).status || '').toString().trim().toLowerCase();
    return s === 'packed' || s === 'picked';
  }).length;
  const countShippedOnly = orders.filter((o) => o.orderStatus === 'Shipped').length;
  const countOutForDeliveryOnly = orders.filter((o) => o.orderStatus === 'Out for Delivery').length;
  const countDeliveredOnly = orders.filter((o) => o.orderStatus === 'Delivered').length;
  const countCompletedOnly = orders.filter((o) => o.orderStatus === 'Completed').length;
  const countReturnedOnly = orders.filter((o) => o.orderStatus === 'Returned').length;
  const countProcessing = orders.filter(
    (o) =>
      o.orderStatus === 'Processing' ||
      o.orderStatus === 'Packed' ||
      o.orderStatus === 'Shipped' ||
      o.orderStatus === 'Out for Delivery'
  ).length;
  const countDelivered = orders.filter((o) => o.orderStatus === 'Delivered').length;
  const countCancelled = orders.filter((o) => o.orderStatus === 'Cancelled').length;
  const countRejected = orders.filter(
    (o) => o.orderStatus === 'Cancelled' || o.orderStatus === 'Rejected' || o.paymentStatus === 'Rejected'
  ).length;
  const countFake = orders.filter(
    (o) => o.orderStatus === 'Fake Order' || o.orderStatus === 'Fake' || Boolean(o.isFakeOrder)
  ).length;

  const stepNamesMap = settings?.customOrderStepNames || DEFAULT_ORDER_STEP_NAMES;

  const PROG_STEPS: { status: OrderStatus; num: number; title: string; descBn: string; icon: React.ElementType }[] = [
    { status: 'Pending', num: 1, title: stepNamesMap['Pending']?.title || 'Pending', descBn: 'Order Placed', icon: Clock },
    { status: 'Payment Verification', num: 2, title: stepNamesMap['Payment Verification']?.title || 'Payment Check', descBn: 'Payment Check', icon: CreditCard },
    { status: 'Confirmed', num: 3, title: stepNamesMap['Confirmed']?.title || 'Confirmed', descBn: 'Confirmed', icon: CheckCircle },
    { status: 'Processing', num: 4, title: stepNamesMap['Processing']?.title || 'Processing', descBn: 'Processing', icon: Sparkles },
    { status: 'Packed', num: 5, title: stepNamesMap['Packed']?.title || 'Packed / Picked', descBn: 'Picked', icon: ShoppingBag },
    { status: 'Shipped', num: 6, title: stepNamesMap['Shipped']?.title || 'Shipped', descBn: 'Shipped', icon: Truck },
    { status: 'Out for Delivery', num: 7, title: stepNamesMap['Out for Delivery']?.title || 'Out for Delivery', descBn: 'On the Way', icon: Truck },
    { status: 'Delivered', num: 8, title: stepNamesMap['Delivered']?.title || 'Delivered', descBn: 'Delivered', icon: BadgeCheck },
    { status: 'Completed', num: 9, title: stepNamesMap['Completed']?.title || 'Completed', descBn: 'Completed', icon: CheckCircle },
  ];

  const getStepNumber = (status: OrderStatus): number => {
    switch (status) {
      case 'Pending': return 1;
      case 'Payment Verification': return 2;
      case 'Confirmed': return 3;
      case 'Processing': return 4;
      case 'Packed': return 5;
      case 'Shipped': return 6;
      case 'Out for Delivery': return 7;
      case 'Delivered': return 8;
      case 'Completed': return 9;
      default: return 1;
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Save Notification Toast / Popup */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900 text-white border-2 border-emerald-500/80 shadow-2xl rounded-2xl p-4 flex items-center gap-3.5 max-w-md">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <CheckCircle className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                <span>অর্ডার স্ট্যাটাস সফলভাবে সেভ হয়েছে!</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </h5>
              <p className="text-xs text-slate-200 mt-0.5 font-medium leading-relaxed">
                {toastMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* 0. Moderator Specific Performance Stats Banner */}
      {(isModeratorRole || currentStaff?.role === 'moderator') && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 text-white shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h3 className="text-base font-bold">Moderator Performance Summary</h3>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                Staff ID: <span className="font-mono text-white font-bold">{currentStaff?.id || 'MOD-101'}</span> | Name: <strong className="text-white">{currentStaff?.name || 'Moderator'}</strong>
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
              Isolated Dashboard View
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[10px] font-bold text-sky-200 uppercase tracking-wider block">Approved Orders</span>
              <p className="text-2xl font-black text-emerald-400 mt-0.5">{myApprovedOrders.length}</p>
              <span className="text-[10px] text-sky-300">Confirmed / Delivered</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[10px] font-bold text-sky-200 uppercase tracking-wider block">Total Revenue</span>
              <p className="text-2xl font-black text-sky-300 mt-0.5">৳{myApprovedRevenue?.toLocaleString()}</p>
              <span className="text-[10px] text-sky-300">Handled Revenue</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[10px] font-bold text-sky-200 uppercase tracking-wider block">Total Rejected</span>
              <p className="text-2xl font-black text-rose-400 mt-0.5">{myRejectedOrders.length}</p>
              <span className="text-[10px] text-sky-300">Cancelled / Rejected</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[10px] font-bold text-sky-200 uppercase tracking-wider block">Total Processed</span>
              <p className="text-2xl font-black text-amber-300 mt-0.5">{myModeratorOrders.length}</p>
              <span className="text-[10px] text-sky-300">My Handled Orders</span>
            </div>
          </div>
        </div>
      )}

      {/* 1. Header Filters, Scope Selector & Manual Order Creation Button */}
      <div className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div
          className={`flex ${
            scopeFilter === 'confirmed'
              ? 'items-center justify-between gap-2'
              : 'flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3'
          } pb-3 border-b border-slate-100 dark:border-slate-800`}
        >
          {scopeFilter === 'confirmed' ? (
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold shrink-0 border border-teal-200 dark:border-teal-800 shadow-2xs">
                <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="min-w-0 flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                  Confirmed Orders
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800 shadow-2xs whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
                  <span>{countConfirmed} {countConfirmed === 1 ? 'Order' : 'Orders'}</span>
                </span>
              </div>
            </div>
          ) : (
            /* Scope Filters (All, Pending, Delivered, Rejected, My Handled) */
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {/* 1. All Orders */}
              <button
                onClick={() => setScopeFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  scopeFilter === 'all'
                    ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>All Orders</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    scopeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {orders.length}
                </span>
              </button>

              {/* 2. Pending Orders (Right next to All Orders) */}
              <button
                onClick={() => setScopeFilter('pending')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  scopeFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    scopeFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  {countPending}
                </span>
              </button>

              {/* 3. Delivered Orders */}
              <button
                onClick={() => setScopeFilter('delivered')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  scopeFilter === 'delivered'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Delivered</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    scopeFilter === 'delivered' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  {countDelivered}
                </span>
              </button>

              {/* 4. Rejected Orders */}
              <button
                onClick={() => setScopeFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  scopeFilter === 'rejected'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Rejected</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    scopeFilter === 'rejected' ? 'bg-white/20 text-white' : 'bg-rose-200/80 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  {countRejected}
                </span>
              </button>

              {/* 5. Fake Orders (Right next to Rejected Orders) */}
              <button
                type="button"
                onClick={() => setScopeFilter('fake_order')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  scopeFilter === 'fake_order'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Fake Order (ফেক অর্ডার)</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    scopeFilter === 'fake_order' ? 'bg-white/20 text-white' : 'bg-purple-200/80 dark:bg-purple-900/80 text-purple-900 dark:text-purple-200'
                  }`}
                >
                  {countFake}
                </span>
              </button>

              {/* 5. My Handled Orders */}
              {currentStaff && (
                <button
                  onClick={() => setScopeFilter('my_orders')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    scopeFilter === 'my_orders'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/50'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>My Handled ({myModeratorOrders.length})</span>
                </button>
              )}
            </div>
          )}

          {/* New Order Creation Button for Admin, Moderator, Manager */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">+ Create Manual Order</span>
            <span className="sm:hidden">+ Create Order</span>
          </button>
        </div>

        {/* Search & Status/Payment Filters in one single line */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID (#KB-...), customer name, mobile..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Filters - Kept strictly in one line */}
          <div className="flex items-center gap-2 overflow-x-auto shrink-0 pb-0.5 md:pb-0 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer shrink-0"
            >
              <option value="all">All Statuses ({orders.length})</option>
              <option value="pending">Pending</option>
              <option value="payment verification">Payment Verification</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="rejected">Rejected / Cancelled</option>
              <option value="cancelled">Cancelled</option>
              <option value="fake order">Fake Order (ফেক অর্ডার)</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer shrink-0"
            >
              <option value="all">All Payments</option>
              <option value="cash on delivery">Cash on Delivery (COD)</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
            </select>
          </div>
        </div>
      </div>

      {/* Confirmed Orders Progression Stage Cards: Positioned directly below Search Bar and right above the Orders Panel */}
      {scopeFilter === 'confirmed' && (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {/* 0. All */}
            <button
              type="button"
              onClick={() => setConfirmedStageFilter('all')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer min-h-[74px] ${
                confirmedStageFilter === 'all'
                  ? 'bg-slate-900 dark:bg-slate-700 border-slate-900 dark:border-slate-600 text-white shadow-sm ring-2 ring-slate-400'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:border-slate-300'
              }`}
            >
              <Package className={`w-4 h-4 ${confirmedStageFilter === 'all' ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`} />
              <span className="text-[11px] font-bold mt-1 leading-tight">All</span>
              <span
                className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  confirmedStageFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {countConfirmed}
              </span>
            </button>

            {/* 1. Confirmed */}
            <button
              type="button"
              onClick={() => setConfirmedStageFilter('Confirmed')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer min-h-[74px] ${
                confirmedStageFilter === 'Confirmed'
                  ? 'bg-teal-700 border-teal-700 text-white shadow-sm ring-2 ring-teal-300'
                  : 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/50 hover:border-teal-300'
              }`}
            >
              <CheckCircle className={`w-4 h-4 ${confirmedStageFilter === 'Confirmed' ? 'text-white' : 'text-teal-600 dark:text-teal-400'}`} />
              <span className="text-[11px] font-bold mt-1 leading-tight">Confirmed</span>
              <span
                className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  confirmedStageFilter === 'Confirmed' ? 'bg-white/20 text-white' : 'bg-teal-200 dark:bg-teal-900/80 text-teal-900 dark:text-teal-200'
                }`}
              >
                {countConfirmedOnly}
              </span>
            </button>

            {/* 2. Processing */}
            <button
              type="button"
              onClick={() => setConfirmedStageFilter('Processing')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer min-h-[74px] ${
                confirmedStageFilter === 'Processing'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                  : 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:border-indigo-300'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${confirmedStageFilter === 'Processing' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
              <span className="text-[11px] font-bold mt-1 leading-tight">Processing</span>
              <span
                className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  confirmedStageFilter === 'Processing' ? 'bg-white/20 text-white' : 'bg-indigo-200 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200'
                }`}
              >
                {countProcessingOnly}
              </span>
            </button>

            {/* 3. Picked */}
            <button
              type="button"
              onClick={() => setConfirmedStageFilter('Packed')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer min-h-[74px] ${
                confirmedStageFilter === 'Packed'
                  ? 'bg-purple-600 border-purple-600 text-white shadow-sm ring-2 ring-purple-300'
                  : 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:border-purple-300'
              }`}
            >
              <ShoppingBag className={`w-4 h-4 ${confirmedStageFilter === 'Packed' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
              <span className="text-[11px] font-bold mt-1 leading-tight">Picked</span>
              <span
                className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  confirmedStageFilter === 'Packed' ? 'bg-white/20 text-white' : 'bg-purple-200 dark:bg-purple-900/80 text-purple-900 dark:text-purple-200'
                }`}
              >
                {countPickedOnly}
              </span>
            </button>

            {/* 4. Shipped */}
            <button
              type="button"
              onClick={() => setConfirmedStageFilter('Shipped')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer min-h-[74px] ${
                confirmedStageFilter === 'Shipped'
                  ? 'bg-sky-600 border-sky-600 text-white shadow-sm ring-2 ring-sky-300'
                  : 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/50 hover:border-sky-300'
              }`}
            >
              <Truck className={`w-4 h-4 ${confirmedStageFilter === 'Shipped' ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`} />
              <span className="text-[11px] font-bold mt-1 leading-tight">Shipped</span>
              <span
                className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  confirmedStageFilter === 'Shipped' ? 'bg-white/20 text-white' : 'bg-sky-200 dark:bg-sky-900/80 text-sky-900 dark:text-sky-200'
                }`}
              >
                {countShippedOnly}
              </span>
            </button>

            {/* 5. Out for Delivery */}
            <button
              type="button"
              onClick={() => setConfirmedStageFilter('Out for Delivery')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer min-h-[74px] ${
                confirmedStageFilter === 'Out for Delivery'
                  ? 'bg-amber-600 border-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                  : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-300'
              }`}
            >
              <Truck className={`w-4 h-4 ${confirmedStageFilter === 'Out for Delivery' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
              <span className="text-[11px] font-bold mt-1 leading-tight">Out for Delivery</span>
              <span
                className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  confirmedStageFilter === 'Out for Delivery' ? 'bg-white/20 text-white' : 'bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200'
                }`}
              >
                {countOutForDeliveryOnly}
              </span>
            </button>

            {/* 6. Delivered */}
            <button
              type="button"
              onClick={() => setConfirmedStageFilter('Delivered')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer min-h-[74px] ${
                confirmedStageFilter === 'Delivered'
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-300'
              }`}
            >
              <BadgeCheck className={`w-4 h-4 ${confirmedStageFilter === 'Delivered' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
              <span className="text-[11px] font-bold mt-1 leading-tight">Delivered</span>
              <span
                className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  confirmedStageFilter === 'Delivered' ? 'bg-white/20 text-white' : 'bg-emerald-200 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {countDeliveredOnly}
              </span>
            </button>

            {/* 7. Completed */}
            <button
              type="button"
              onClick={() => setConfirmedStageFilter('Completed')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer min-h-[74px] ${
                confirmedStageFilter === 'Completed'
                  ? 'bg-teal-800 border-teal-800 text-white shadow-sm ring-2 ring-teal-300'
                  : 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-950 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/50 hover:border-teal-300'
              }`}
            >
              <CheckCircle className={`w-4 h-4 ${confirmedStageFilter === 'Completed' ? 'text-white' : 'text-teal-700 dark:text-teal-400'}`} />
              <span className="text-[11px] font-bold mt-1 leading-tight">Completed</span>
              <span
                className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  confirmedStageFilter === 'Completed' ? 'bg-white/20 text-white' : 'bg-teal-200 dark:bg-teal-900/80 text-teal-950 dark:text-teal-200'
                }`}
              >
                {countCompletedOnly}
              </span>
            </button>

            {/* 8. Returned */}
            <button
              type="button"
              onClick={() => setConfirmedStageFilter('Returned')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer min-h-[74px] ${
                confirmedStageFilter === 'Returned'
                  ? 'bg-rose-700 border-rose-700 text-white shadow-sm ring-2 ring-rose-300'
                  : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50 hover:border-rose-300'
              }`}
            >
              <XCircle className={`w-4 h-4 ${confirmedStageFilter === 'Returned' ? 'text-white' : 'text-rose-600 dark:text-rose-400'}`} />
              <span className="text-[11px] font-bold mt-1 leading-tight">Returned</span>
              <span
                className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  confirmedStageFilter === 'Returned' ? 'bg-white/20 text-white' : 'bg-rose-200 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200'
                }`}
              >
                {countReturnedOnly}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Orders List View (Accordion Cards for Confirmed Tab, Standard Table/Cards for Others) */}
      {scopeFilter === 'confirmed' ? (
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No confirmed orders found matching your search and filter criteria.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isExpanded = Boolean(expandedOrderIds[order.id]);
              const firstItem = order.items?.[0];
              const totalQty = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

              return (
                <div
                  key={order.id}
                  onClick={() => toggleOrderExpand(order.id)}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all cursor-pointer select-none overflow-hidden ${
                    isExpanded
                      ? 'border-sky-300 dark:border-sky-500 ring-2 ring-sky-100 dark:ring-sky-950/60 shadow-md'
                      : 'border-slate-200 dark:border-slate-800 hover:border-sky-200 dark:hover:border-slate-700 shadow-2xs'
                  }`}
                >
                  {/* Card Header (Collapsed Summary) */}
                  <div className="p-3.5 sm:p-4 space-y-3">
                    {/* Row 1: Order ID + Super Admin Staff Attribution + Date/Time + Status Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span
                          onClick={(e) => handleCopyOrderId(order.id, e)}
                          className="font-mono text-xs font-extrabold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-800 shrink-0 cursor-pointer flex items-center gap-1 transition-colors"
                          title="Click to copy Order ID"
                        >
                          #{order.id}
                          {copiedOrderId === order.id ? (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                          ) : (
                            <Copy className="w-3 h-3 text-sky-400" />
                          )}
                        </span>

                        {/* AI Bot Badge ONLY if order is created via AI Bot */}
                        {isAiOrder(order) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                            <Bot className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            <span>Ordered by KenaX Bot</span>
                          </span>
                        )}

                        {/* Staff Handler Badge - Only if handled/created by actual staff */}
                        {order.createdByStaffName && order.createdByStaffName !== 'Ordered by KenaX Bot' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shrink-0">
                            <ShieldCheck className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                            <span>{order.createdByStaffName}</span>
                          </span>
                        )}

                        <span className="text-[11px] text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {formatOrderDateTime(order.createdAt).date} • {formatOrderDateTime(order.createdAt).time}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Live Status Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-xl border text-[11px] sm:text-xs capitalize tracking-tight flex items-center gap-1.5 shadow-2xs font-bold ${getStatusBadgeStyle(
                            order.orderStatus
                          )}`}
                          title={`Current Order Status: ${order.orderStatus}`}
                        >
                          <span className="w-2 h-2 rounded-full bg-current animate-pulse shrink-0" />
                          <span>{order.orderStatus}</span>
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Product Thumbnail + Customer Details + Amount & Payment */}
                    <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap bg-slate-50/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      {/* Left: Product Thumbnail & Title & Customer info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <CartItemImage
                            item={firstItem}
                            product={products.find((p) => p.id === firstItem?.productId)}
                            sizeClassName="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0 shadow-2xs border border-slate-100 dark:border-slate-700"
                          />
                          {order.items && order.items.length > 1 && (
                            <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md shadow-xs border border-white">
                              +{order.items.length - 1}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                            {firstItem?.productName || firstItem?.name || 'Ordered Item'}
                          </p>
                          {/* Customer Name, Phone & Division */}
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mt-1 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              {order.customerName}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <a
                              href={`tel:${order.customerMobile || order.deliveryMobile}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-mono text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 font-bold flex items-center gap-1"
                            >
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              {order.customerMobile || order.deliveryMobile}
                            </a>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {order.customerDivision || order.division || 'Dhaka'}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            {/* Live Courier Fraud / Success Rate Trigger Badge */}
                            <button
                              type="button"
                              onClick={(e) => handleCheckFraud(order, e)}
                              disabled={checkingFraudFor === order.id}
                              title="Steadfast লাইভ কুরিয়ার ডেলিভারি সাকসেস রেট ও রিটার্ন হিস্ট্রি দেখুন"
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer border ${
                                fraudReports[order.id]
                                  ? fraudReports[order.id].riskLevel === 'safe'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                                    : fraudReports[order.id].riskLevel === 'moderate'
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                                    : fraudReports[order.id].riskLevel === 'high_risk'
                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 animate-pulse'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                              }`}
                            >
                              <ShieldAlert className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              <span>
                                {checkingFraudFor === order.id
                                  ? 'যাচাই হচ্ছে...'
                                  : fraudReports[order.id]
                                  ? fraudReports[order.id].totalOrders > 0
                                    ? `${fraudReports[order.id].successRate}% Success (${fraudReports[order.id].deliveredOrders}/${fraudReports[order.id].totalOrders})`
                                    : 'নতুন ক্রেতা (০ পার্সেল)'
                                  : 'কুরিয়ার ফ্রড চেক'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Payment Method / Status */}
                      <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 dark:border-slate-700 pt-2 sm:pt-0 w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end gap-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                            ৳{order.totalAmount?.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            ({totalQty} {totalQty === 1 ? 'item' : 'items'})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{order.paymentMethod}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                              order.paymentStatus === 'Verified' || order.paymentStatus === 'Paid'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* High Risk Courier Warning Alert inside Order Card */}
                    {fraudReports[order.id] && fraudReports[order.id].riskLevel === 'high_risk' && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between gap-2 text-rose-950 dark:text-rose-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldX className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span className="font-bold">
                            হাই-রিস্ক কাস্টমার! ডেলিভারি রেট মাত্র {fraudReports[order.id].successRate}% ({fraudReports[order.id].cancelledOrders || fraudReports[order.id].returnedOrders || 0}টি পার্সেল রিটার্ন)।
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleSendAdvanceFeeWhatsApp(order, e)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                        >
                          <SiWhatsapp className="w-3.5 h-3.5" />
                          <span>অগ্রিম ডেলিভারি ফি চান</span>
                        </button>
                      </div>
                    )}

                    {/* Row 3: Action Buttons: View Details, Shipped, Invoice, WhatsApp & 8 Steps Expand */}
                    <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap flex-1">
                        {/* 1. View Details Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openOrderDetails(order);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>

                        {/* 2. Unfake Action for Fake Order OR Shipped / Dispatch Action Button */}
                        {order.orderStatus === 'Fake Order' || Boolean(order.isFakeOrder) ? (
                          isSuperAdmin ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnfakeOrder(order);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all"
                              title="Restore this fake order to a real/valid order (Super Admin Only)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Unfake (রিয়েল অর্ডার)</span>
                            </button>
                          ) : (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-not-allowed"
                              title="শুধুমাত্র সুপার অ্যাডমিন এই ফেক অর্ডার আনফেক বা রিয়েল করতে পারবেন (Only Super Admin can unfake)"
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>Unfake (Super Admin)</span>
                            </div>
                          )
                        ) : order.orderStatus === 'Shipped' ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                            title={`Courier: ${order.courierName || 'Steadfast Courier'} | Tracking: ${order.trackingNumber || 'N/A'}`}
                          >
                            <Truck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                            <span>Shipped</span>
                            {order.courierName && (
                              <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-normal hidden sm:inline">
                                ({order.courierName.split(' ')[0]})
                              </span>
                            )}
                          </div>
                        ) : order.orderStatus === 'Delivered' || order.orderStatus === 'Completed' ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                          >
                            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Delivered</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShippedPromptOrder(order);
                              setShippedPromptCourier(order.courierName || 'Steadfast Courier');
                              setShippedPromptTracking(order.trackingNumber || '');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all"
                            title="Dispatch order and mark as Shipped with courier & tracking"
                          >
                            <Truck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Ship Order</span>
                          </button>
                        )}

                        {/* 3. Invoice Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPrintInvoice(order);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all"
                          title="Print or Download Official Invoice"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                          <span>Invoice</span>
                        </button>

                        {/* 4. WhatsApp Direct */}
                        <a
                          href={generateWhatsAppDirectLink(
                            order.deliveryMobile || order.customerMobile,
                            formatWhatsAppMessage(
                              DEFAULT_WHATSAPP_TEMPLATES[
                                order.orderStatus === 'Shipped'
                                  ? 'order_shipped'
                                  : order.orderStatus === 'Delivered'
                                  ? 'order_delivered'
                                  : 'order_confirmed'
                              ].message,
                              { order }
                            )
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                          title="Contact customer on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      </div>

                      {/* Expand / 8 Steps Toggle */}
                      <div
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0 ${
                          isExpanded
                            ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <span className="text-[11px]">{isExpanded ? 'Hide Steps' : '8 Steps'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {/* Accordion Expanded Body */}
                  {isExpanded && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="p-3.5 sm:p-5 bg-slate-50/70 dark:bg-slate-950/60 border-t border-slate-200/80 dark:border-slate-800 space-y-4"
                    >
                      {/* Locked Warning Alert */}
                      {lockedNoticeOrderId === order.id && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-bounce">
                          <Lock className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                          <span>This step is locked! Backward status change is not allowed.</span>
                        </div>
                      )}

                      {/* 8-Step Interactive Progress Tracker */}
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            Order Progression (Click step to Auto-Save)
                          </span>
                          <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                            Current Status: {order.orderStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                          {CONFIRMED_TAB_STEPS.map((step) => {
                            const currentNum = getConfirmedStepNum(order.orderStatus);
                            const isPassed = step.num < currentNum;
                            const isCurrent = step.num === currentNum;
                            const isLocked = step.num <= currentNum;
                            const IconComp = step.icon;

                            return (
                              <button
                                key={step.num}
                                type="button"
                                onClick={() => handleConfirmedStepClick(order, step)}
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[76px] ${
                                  isCurrent
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-md ring-2 ring-sky-300'
                                    : isPassed
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 opacity-85'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-slate-700/50 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                                    isCurrent ? 'bg-white/20 text-white' : isPassed ? 'bg-emerald-200 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    #{step.num}
                                  </span>
                                  {isLocked ? (
                                    <Lock className={`w-3.5 h-3.5 ${isCurrent ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                                  ) : (
                                    <IconComp className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                  )}
                                </div>

                                <div className="mt-2">
                                  <p className={`text-xs font-bold leading-tight ${isCurrent ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                                    {step.title}
                                  </p>
                                  <p className={`text-[9px] mt-0.5 truncate ${isCurrent ? 'text-sky-100' : isLocked ? 'text-slate-400 dark:text-slate-500' : 'text-sky-600 dark:text-sky-400 font-semibold'}`}>
                                    {isLocked ? 'Locked' : 'Click to Set'}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Compact Courier & Tracking Info with Super Admin Unlock Feature */}
                      {(() => {
                        const currentStepNum = getConfirmedStepNum(order.orderStatus);
                        const isShipped = currentStepNum === 4;
                        const isOutForDeliveryOrBeyond = currentStepNum >= 5;
                        const isUnlockedBySuperAdmin = Boolean(superAdminUnlockedOrderIds[order.id]);

                        const isCourierLocked = isOutForDeliveryOrBeyond || (isShipped && !isUnlockedBySuperAdmin);
                        const canSuperAdminUnlock = currentRole === 'super_admin' && isShipped;

                        const currentCourier = order.courierName || 'Steadfast Courier';
                        const courierOptions = COURIER_PARTNERS.includes(currentCourier)
                          ? COURIER_PARTNERS
                          : [currentCourier, ...COURIER_PARTNERS];

                        return (
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <div className="flex items-center justify-between mb-1 gap-1.5 flex-wrap">
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Courier Partner
                                </label>
                                {isOutForDeliveryOrBeyond ? (
                                  <span className="text-[9px] font-extrabold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5 text-slate-600 dark:text-slate-400" />
                                    Locked (Out for Delivery)
                                  </span>
                                ) : isShipped ? (
                                  <div className="flex items-center gap-1.5">
                                    {isUnlockedBySuperAdmin ? (
                                      <span className="text-[9px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                        <Unlock className="w-2.5 h-2.5 text-emerald-700 dark:text-emerald-400" />
                                        Unlocked (Super Admin)
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                        <Lock className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" />
                                        Locked (Shipped)
                                      </span>
                                    )}

                                    {/* Super Admin Unlock / Lock Button - strictly English 'Unlock' / 'Lock' */}
                                    {canSuperAdminUnlock && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSuperAdminUnlockedOrderIds((prev) => ({
                                            ...prev,
                                            [order.id]: !prev[order.id],
                                          }));
                                          showSaveNotification(
                                            !isUnlockedBySuperAdmin
                                              ? `Order #${order.id} Courier & Tracking unlocked`
                                              : `Order #${order.id} Courier & Tracking locked`
                                          );
                                        }}
                                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs ${
                                          isUnlockedBySuperAdmin
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                            : 'bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                                        }`}
                                        title="Only Super Admin has permission to unlock locked shipped orders"
                                      >
                                        {isUnlockedBySuperAdmin ? (
                                          <>
                                            <Lock className="w-2.5 h-2.5" />
                                            <span>Lock</span>
                                          </>
                                        ) : (
                                          <>
                                            <Unlock className="w-2.5 h-2.5" />
                                            <span>Unlock</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                              <select
                                value={currentCourier}
                                disabled={isCourierLocked}
                                onChange={(e) => {
                                  const newCourier = e.target.value;
                                  const activeStaff = currentStaff ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role } : undefined;
                                  onUpdateOrderStatus(order.id, order.orderStatus, newCourier, order.trackingNumber, activeStaff);
                                  showSaveNotification(`Courier partner changed to "${newCourier}"`);
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                                  isCourierLocked
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed font-medium'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 font-bold focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-200 cursor-pointer hover:border-sky-300'
                                }`}
                              >
                                {courierOptions.map((cName) => (
                                  <option key={cName} value={cName}>
                                    {cName}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1 gap-1.5 flex-wrap">
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Tracking / Consignment ID
                                </label>
                                {isOutForDeliveryOrBeyond ? (
                                  <span className="text-[9px] font-extrabold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5 text-slate-600 dark:text-slate-400" />
                                    Locked (Out for Delivery)
                                  </span>
                                ) : isShipped ? (
                                  <span className="text-[9px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" />
                                    {isUnlockedBySuperAdmin ? 'Editable' : 'Locked (Shipped)'}
                                  </span>
                                ) : null}
                              </div>
                              <input
                                type="text"
                                defaultValue={order.trackingNumber || ''}
                                disabled={isCourierLocked}
                                onBlur={(e) => {
                                  if (!isCourierLocked && e.target.value !== order.trackingNumber) {
                                    const activeStaff = currentStaff ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role } : undefined;
                                    onUpdateOrderStatus(order.id, order.orderStatus, order.courierName, e.target.value, activeStaff);
                                    showSaveNotification('Tracking ID updated!');
                                  }
                                }}
                                placeholder="e.g. STF-98213"
                                className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                                  isCourierLocked
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white border-slate-300 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-sky-200'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1040px]">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-2.5 px-2.5 w-[140px]">Order ID</th>
                  <th className="py-2.5 px-2.5 w-[80px]">Date</th>
                  <th className="py-2.5 px-2.5 min-w-[125px]">Customer</th>
                  <th className="py-2.5 px-2.5 w-[75px]">Location</th>
                  <th className="py-2.5 px-2.5 w-[55px]">Items</th>
                  <th className="py-2.5 px-2.5 w-[100px]">
                    <div className="flex items-center gap-1">
                      <span>Amount</span>
                      <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[8px] font-black uppercase">
                        Staff
                      </span>
                    </div>
                  </th>
                  <th className="py-2.5 px-2.5 min-w-[125px]">Payment</th>
                  <th className="py-2.5 px-2.5 w-[85px] text-center">Status</th>
                  <th className="py-2.5 px-2.5 min-w-[310px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      No orders found matching your search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const orderCost = getOrderOriginalCost(order);
                    const profit = order.totalAmount - orderCost;
                    const { time, date } = formatOrderDateTime(order.createdAt);
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            {order.items && order.items.length > 0 && (
                              <div
                                onClick={() => openOrderDetails(order)}
                                title={order.items.map((i) => i.productName || i.name).filter(Boolean).join(', ')}
                                className="relative shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                              >
                                <CartItemImage
                                  item={order.items[0]}
                                  product={products.find((p) => p.id === order.items[0].productId)}
                                  sizeClassName="w-9 h-9 rounded-lg shrink-0 shadow-2xs dark:border dark:border-slate-700"
                                />
                                {order.items.length > 1 && (
                                  <span
                                    title={`${order.items.length} products in this order`}
                                    className="absolute -bottom-1 -right-1 bg-slate-900 dark:bg-slate-800 text-white text-[8px] font-black px-1 rounded-sm shadow-xs border border-white/80 dark:border-slate-700"
                                  >
                                    +{order.items.length - 1}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyOrderId(order.id, e)}
                                  title="Click to copy Order ID"
                                  className="font-mono font-bold text-sky-700 dark:text-sky-400 hover:text-sky-900 dark:hover:text-sky-300 hover:underline cursor-pointer text-left inline-flex items-center gap-0.5 text-xs focus:outline-hidden"
                                >
                                  #{order.id}
                                  {copiedOrderId === order.id && (
                                    <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 animate-pulse">
                                      Copied!
                                    </span>
                                  )}
                                </button>
                                {isAiOrder(order) && (
                                  <span className="px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[8px] font-bold inline-flex items-center gap-0.5 shrink-0">
                                    <Bot className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                    <span>AI Bot</span>
                                  </span>
                                )}
                              </div>
                              {order.items?.[0] && (
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[110px]">
                                  {order.items[0].productName || order.items[0].name}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] whitespace-nowrap">
                          <div className="flex flex-col leading-tight">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">{time}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{date}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]">{order.customerName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{order.customerMobile}</p>
                          <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                            {/* Live Courier Fraud Check Trigger Button & Badge */}
                            <button
                              type="button"
                              onClick={(e) => handleCheckFraud(order, e)}
                              disabled={checkingFraudFor === order.id}
                              title="Steadfast লাইভ কুরিয়ার ডেলিভারি সাকসেস রেট ও রিটার্ন রেকর্ড যাচাই করুন"
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black flex items-center gap-0.5 transition-all cursor-pointer border ${
                                fraudReports[order.id]
                                  ? fraudReports[order.id].riskLevel === 'safe'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100'
                                    : fraudReports[order.id].riskLevel === 'moderate'
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-100'
                                    : fraudReports[order.id].riskLevel === 'high_risk'
                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 hover:bg-rose-100 animate-pulse'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                              }`}
                            >
                              <ShieldAlert className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                              <span>
                                {checkingFraudFor === order.id
                                  ? 'যাচাই...'
                                  : fraudReports[order.id]
                                  ? fraudReports[order.id].totalOrders > 0
                                    ? `${fraudReports[order.id].successRate}%`
                                    : 'নতুন'
                                  : 'ফ্রড চেক'}
                              </span>
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {order.customerDivision || 'Dhaka'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {(order.items || []).reduce((s, i) => s + (i.quantity || 1), 0)} pcs
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="font-black text-slate-900 dark:text-white text-xs">
                                ৳{order.totalAmount?.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                              Cost: ৳{orderCost?.toLocaleString()}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {(() => {
                            const isFull = order.paymentOptionType === 'full' || (order.paidAmount !== undefined && order.paidAmount >= order.totalAmount && order.totalAmount > 0);
                            const isDeliv = order.paymentOptionType === 'delivery_only' || order.paymentMethod === 'Delivery Charge Only' || (!isFull && order.paidAmount !== undefined && order.paidAmount > 0);
                            const advanceAmt = order.paidAmount && order.paidAmount > 0 ? order.paidAmount : isDeliv ? order.deliveryCharge : isFull ? order.totalAmount : 0;
                            
                            if (isFull) {
                              return (
                                <div className="flex flex-col items-start leading-tight">
                                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                                    Full Adv ({order.paymentMethod || 'Prepaid'})
                                  </span>
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-semibold">
                                    ৳{advanceAmt.toLocaleString()} Paid
                                  </span>
                                </div>
                              );
                            } else if (isDeliv) {
                              const due = order.dueAmount !== undefined ? order.dueAmount : Math.max(0, order.totalAmount - advanceAmt);
                              return (
                                <div className="flex flex-col items-start leading-tight">
                                  <span className="font-bold text-indigo-700 dark:text-indigo-400 text-[11px]">
                                    Deliv Adv
                                  </span>
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-300">
                                    Paid: ৳{advanceAmt} • Due: ৳{due}
                                  </span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex flex-col items-start leading-tight">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                                    Cash on Delivery
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                    Due: ৳{order.totalAmount?.toLocaleString()}
                                  </span>
                                </div>
                              );
                            }
                          })()}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap min-w-[120px]">
                          {getStatusPill(order.orderStatus)}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap min-w-[320px]">
                          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                            {/* 1. Fast Confirm / Reject for Pending Orders */}
                            {((order.orderStatus || (order as any).status || '').toLowerCase() === 'pending' ||
                              (order.orderStatus || '').toLowerCase() === 'payment verification' ||
                              (order.orderStatus || '').toLowerCase() === 'unconfirmed') && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const activeStaff = currentStaff
                                      ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
                                      : undefined;
                                    onUpdateOrderStatus(order.id, 'Confirmed', order.courierName, order.trackingNumber, activeStaff);
                                    showSaveNotification(`অর্ডার #${order.id} সফলভাবে কনফার্ম করা হয়েছে!`);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                                  title="অর্ডার কনফার্ম করুন (Confirm Order)"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Confirm</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const activeStaff = currentStaff
                                      ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
                                      : undefined;
                                    onUpdateOrderStatus(order.id, 'Cancelled', order.courierName, order.trackingNumber, activeStaff, 'Rejected / Cancelled by Admin');
                                    showSaveNotification(`অর্ডার #${order.id} বাতিল / রিজেক্ট করা হয়েছে!`);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-[11px] transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                                  title="অর্ডার রিজেক্ট করুন (Reject Order)"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {/* 2. Fake Order / Unfake Action Button */}
                            {order.orderStatus === 'Fake Order' || Boolean(order.isFakeOrder) ? (
                              isSuperAdmin ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnfakeOrder(order);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px] transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                                  title="Restore this fake order to real order"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Unfake</span>
                                </button>
                              ) : (
                                <span
                                  className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-[11px] flex items-center gap-1 shrink-0"
                                  title="Fake Order"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>Fake</span>
                                </span>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const activeStaff = currentStaff
                                    ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
                                    : undefined;
                                  onUpdateOrderStatus(order.id, 'Fake Order', order.courierName, order.trackingNumber, activeStaff, 'Marked as Fake Order by Admin');
                                  showSaveNotification(`অর্ডার #${order.id} ফেক অর্ডার (Fake Order) হিসেবে মার্ক করা হয়েছে!`);
                                }}
                                className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-[11px] transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                                title="ফেক অর্ডার মার্ক করুন (Mark as Fake Order)"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Fake</span>
                              </button>
                            )}

                            {/* 3. WhatsApp Direct Chat Button */}
                            <a
                              href={generateWhatsAppDirectLink(
                                order.deliveryMobile || order.customerMobile,
                                formatWhatsAppMessage(
                                  DEFAULT_WHATSAPP_TEMPLATES[
                                    order.orderStatus === 'Shipped'
                                      ? 'order_shipped'
                                      : order.orderStatus === 'Delivered'
                                      ? 'order_delivered'
                                      : order.orderStatus === 'Confirmed'
                                      ? 'order_confirmed'
                                      : 'order_placed'
                                  ].message,
                                  { order }
                                )
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-emerald-200 dark:border-emerald-800 shrink-0"
                              title="Send WhatsApp Message to Customer"
                            >
                              <SiWhatsapp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>WhatsApp</span>
                            </a>

                            {/* 4. View Details Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openOrderDetails(order);
                              }}
                              className="px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold text-[11px] transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                              title="অর্ডারের সম্পূর্ণ বিবরণ দেখুন (View Details)"
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                              <span>View</span>
                            </button>

                            {/* 5. Invoice Print Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPrintInvoice(order);
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-700 shrink-0"
                              title="Invoice / Download / Print"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>Invoice</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (Zero Horizontal Scrolling, Clean, Professional & Compact) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                No orders found matching your search and filter criteria.
              </div>
            ) : (
              filteredOrders.map((order) => {
                const orderCost = getOrderOriginalCost(order);
                const profit = order.totalAmount - orderCost;
                const { time, date } = formatOrderDateTime(order.createdAt);
                const totalItems = (order.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
                const firstItem = order.items?.[0];

                return (
                  <div key={order.id} className="p-3.5 space-y-3 bg-white dark:bg-slate-900 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Section 1: Order Information, Super Admin Attribution & Live Status */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <button
                          type="button"
                          onClick={(e) => handleCopyOrderId(order.id, e)}
                          className="font-mono font-extrabold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/80 hover:bg-sky-100 dark:hover:bg-sky-900/80 px-2 py-0.5 rounded-lg border border-sky-100 dark:border-sky-800 text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                          title="Click to copy Order ID"
                        >
                          #{order.id}
                          {copiedOrderId === order.id ? (
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                              Copied!
                            </span>
                          ) : (
                            <Copy className="w-3 h-3 text-sky-400" />
                          )}
                        </button>

                        {/* AI Bot Badge ONLY if order is created via AI Bot */}
                        {isAiOrder(order) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                            <Bot className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            <span>Ordered by KenaX Bot</span>
                          </span>
                        )}

                        {/* Staff Attribution - Only if handled/created by actual staff */}
                        {order.createdByStaffName && order.createdByStaffName !== 'Ordered by KenaX Bot' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shrink-0">
                            <ShieldCheck className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                            <span>{order.createdByStaffName}</span>
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {date} • {time}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {getStatusPill(order.orderStatus)}
                      </div>
                    </div>

                    {/* Section 2: Customer Name, Phone Number & City/Division */}
                    <div className="bg-slate-50/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/70 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                          <p className="font-extrabold text-slate-900 dark:text-white text-xs truncate">
                            {order.customerName}
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 shrink-0">
                          <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          {order.customerDivision || order.division || 'Dhaka'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <a
                          href={`tel:${order.customerMobile || order.deliveryMobile}`}
                          className="font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1.5"
                        >
                          <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                          <span>{order.customerMobile || order.deliveryMobile}</span>
                        </a>
                        {order.deliveryAddress && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-400 truncate max-w-[170px]" title={order.deliveryAddress}>
                            {order.deliveryAddress}
                          </span>
                        )}
                      </div>

                      {/* Courier Fraud Check Button for Mobile Cards */}
                      <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => handleCheckFraud(order, e)}
                          disabled={checkingFraudFor === order.id}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer border ${
                            fraudReports[order.id]
                              ? fraudReports[order.id].riskLevel === 'safe'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                : fraudReports[order.id].riskLevel === 'moderate'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                : fraudReports[order.id].riskLevel === 'high_risk'
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 animate-pulse'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                              : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                          }`}
                        >
                          <ShieldAlert className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>
                            {checkingFraudFor === order.id
                              ? 'যাচাই হচ্ছে...'
                              : fraudReports[order.id]
                              ? fraudReports[order.id].totalOrders > 0
                                ? `${fraudReports[order.id].successRate}% (${fraudReports[order.id].deliveredOrders}/${fraudReports[order.id].totalOrders})`
                                : 'নতুন ক্রেতা (০ পার্সেল)'
                              : 'কুরিয়ার ফ্রড চেক'}
                          </span>
                        </button>
                        {fraudReports[order.id]?.riskLevel === 'high_risk' && (
                          <button
                            type="button"
                            onClick={(e) => handleSendAdvanceFeeWhatsApp(order, e)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-600 text-white flex items-center gap-1 cursor-pointer"
                          >
                            <SiWhatsapp className="w-2.5 h-2.5" />
                            <span>অগ্রিম ফি চান</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Section 3: Ordered Items (Quality/Product) & Amount & Payment */}
                    <div className="flex items-center justify-between gap-2 text-xs bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                      {/* Left: Product Thumbnail & Item title */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {firstItem && (
                          <div
                            onClick={() => openOrderDetails(order)}
                            className="relative shrink-0 cursor-pointer active:scale-95 transition-transform"
                          >
                            <CartItemImage
                              item={firstItem}
                              product={products.find((p) => p.id === firstItem.productId)}
                              sizeClassName="w-11 h-11 rounded-lg shrink-0 shadow-2xs border border-slate-100 dark:border-slate-700 object-cover"
                            />
                            {order.items && order.items.length > 1 && (
                              <span className="absolute -bottom-1 -right-1 bg-slate-900 dark:bg-slate-800 text-white text-[9px] font-black px-1 rounded-sm shadow-xs border border-white/80 dark:border-slate-700">
                                +{order.items.length - 1}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                            {firstItem?.productName || firstItem?.name || 'Ordered Product'}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">
                            <span>Qty: <strong className="text-slate-700 dark:text-slate-200">{totalItems}</strong></span>
                            {order.courierName && (
                              <>
                                <span>•</span>
                                <span className="text-cyan-700 dark:text-cyan-400 font-semibold truncate">{order.courierName.split(' ')[0]}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Total Order Amount & Payment Status */}
                      <div className="text-right shrink-0">
                        <div className="font-black text-slate-900 dark:text-white text-sm">
                          ৳{order.totalAmount?.toLocaleString()}
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{order.paymentMethod}</span>
                          <span
                            className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              order.paymentStatus === 'Verified' || order.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Action Buttons (Confirm/Ship, View Details, Invoice, WhatsApp) */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {/* Confirm Action Button for Pending Orders */}
                      {((order.orderStatus || (order as any).status || '').toLowerCase() === 'pending' ||
                        (order.orderStatus || '').toLowerCase() === 'payment verification' ||
                        (order.orderStatus || '').toLowerCase() === 'unconfirmed') ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const activeStaff = currentStaff
                                ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
                                : undefined;
                              onUpdateOrderStatus(order.id, 'Confirmed', order.courierName, order.trackingNumber, activeStaff);
                              showSaveNotification(`অর্ডার #${order.id} সফলভাবে কনফার্ম করা হয়েছে এবং Confirmed Orders-এ পাঠানো হয়েছে!`);
                            }}
                            className="flex-1 py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                            title="অর্ডার কনফার্ম করুন"
                          >
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Confirm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const activeStaff = currentStaff
                                ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
                                : undefined;
                              onUpdateOrderStatus(order.id, 'Cancelled', order.courierName, order.trackingNumber, activeStaff, 'Rejected by Admin');
                              showSaveNotification(`অর্ডার #${order.id} রিজেক্ট করা হয়েছে!`);
                            }}
                            className="py-2 px-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                            title="অর্ডার রিজেক্ট করুন"
                          >
                            <X className="w-3.5 h-3.5 shrink-0" />
                            <span>Reject</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const activeStaff = currentStaff
                                ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
                                : undefined;
                              onUpdateOrderStatus(order.id, 'Fake Order', order.courierName, order.trackingNumber, activeStaff, 'Marked as Fake Order by Admin');
                              showSaveNotification(`অর্ডার #${order.id} ফেক অর্ডার হিসেবে মার্ক করা হয়েছে!`);
                            }}
                            className="py-2 px-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                            title="ফেক অর্ডার মার্ক করুন"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>Fake</span>
                          </button>
                        </>
                      ) : order.orderStatus === 'Fake Order' || Boolean(order.isFakeOrder) ? (
                        isSuperAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleUnfakeOrder(order)}
                            className="flex-1 py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                            title="Restore to real order (Super Admin Only)"
                          >
                            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                            <span>Unfake (রিয়েল করুন)</span>
                          </button>
                        ) : (
                          <div
                            className="flex-1 py-2 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold text-xs flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700 cursor-not-allowed"
                            title="শুধুমাত্র সুপার অ্যাডমিন আনফেক করতে পারবেন"
                          >
                            <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span>Unfake (Super Admin)</span>
                          </div>
                        )
                      ) : order.orderStatus === 'Shipped' ? (
                        <div
                          className="flex-1 py-2 px-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs"
                          title={`Courier: ${order.courierName || 'Steadfast Courier'} | Tracking: ${order.trackingNumber || 'N/A'}`}
                        >
                          <Truck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                          <span>Shipped</span>
                        </div>
                      ) : order.orderStatus === 'Delivered' || order.orderStatus === 'Completed' ? (
                        <div className="flex-1 py-2 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs">
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Delivered</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShippedPromptOrder(order);
                            setShippedPromptCourier(order.courierName || 'Steadfast Courier');
                            setShippedPromptTracking(order.trackingNumber || '');
                          }}
                          className="flex-1 py-2 px-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-1 border border-indigo-200 dark:border-indigo-800 shadow-2xs cursor-pointer active:scale-95 transition-all"
                          title="Dispatch order and mark as Shipped with courier & tracking"
                        >
                          <Truck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>Ship</span>
                        </button>
                      )}

                      {/* View Details Action Button */}
                      <button
                        type="button"
                        onClick={() => openOrderDetails(order)}
                        className="flex-1 py-2 px-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center gap-1 border border-sky-200 dark:border-sky-800 shadow-2xs cursor-pointer active:scale-95 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5 shrink-0" />
                        <span>View Details</span>
                      </button>

                      {/* Invoice Button */}
                      <button
                        type="button"
                        onClick={() => onPrintInvoice(order)}
                        className="py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                        title="Print / Download Invoice"
                      >
                        <Printer className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">Invoice</span>
                      </button>

                      {/* WhatsApp Direct Button */}
                      <a
                        href={generateWhatsAppDirectLink(
                          order.deliveryMobile || order.customerMobile,
                          formatWhatsAppMessage(
                            DEFAULT_WHATSAPP_TEMPLATES[
                              order.orderStatus === 'Shipped'
                                ? 'order_shipped'
                                : order.orderStatus === 'Delivered'
                                ? 'order_delivered'
                                : order.orderStatus === 'Confirmed'
                                ? 'order_confirmed'
                                : 'order_placed'
                            ].message,
                            { order }
                          )
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1 border border-emerald-200 dark:border-emerald-800 shadow-2xs cursor-pointer active:scale-95 transition-all"
                        title="Contact customer on WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      {/* 3. Comprehensive Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base">Order #{selectedOrder.id}</h3>
                  {isAiOrder(selectedOrder) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 shrink-0">
                      <Bot className="w-3 h-3 text-indigo-300" />
                      <span>Ordered by KenaX Bot</span>
                    </span>
                  )}
                  {getStatusPill(selectedOrder.orderStatus)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt)?.toLocaleString('en-GB')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={generateWhatsAppDirectLink(
                    selectedOrder.deliveryMobile || selectedOrder.customerMobile,
                    formatWhatsAppMessage(
                      DEFAULT_WHATSAPP_TEMPLATES[
                        selectedOrder.orderStatus === 'Shipped'
                          ? 'order_shipped'
                          : selectedOrder.orderStatus === 'Delivered'
                          ? 'order_delivered'
                          : selectedOrder.orderStatus === 'Confirmed'
                          ? 'order_confirmed'
                          : 'order_placed'
                      ].message,
                      { order: selectedOrder }
                    )
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent('https://kenaxbd.ai.studio')}&text=${encodeURIComponent(
                    `🎉 Order #${selectedOrder.id} - Delivered!\n\nDear ${selectedOrder.customerName}, thank you for shopping with KenaX BD! Please leave an authentic product review on our website:\n👉 https://kenaxbd.ai.studio`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  title="Share Telegram Message / Review Link with Customer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Telegram</span>
                </a>
                <button
                  onClick={() => onPrintInvoice(selectedOrder)}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Invoice / Download</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
              {/* Error Banner */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Customer & Delivery Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
                    Customer Information
                  </h4>
                  <p className="font-bold text-sm text-slate-900">{selectedOrder.customerName}</p>
                  <p className="text-slate-600 mt-0.5">Mobile: <strong className="text-slate-800">{selectedOrder.customerMobile}</strong></p>
                  {selectedOrder.customerEmail && (
                    <p className="text-slate-600">Email: {selectedOrder.customerEmail}</p>
                  )}
                  <p className="text-slate-500 mt-1">
                    Division: <span className="font-semibold text-slate-700">{selectedOrder.customerDivision || 'Dhaka'}</span>
                  </p>
                  
                  {/* Courier Fraud Check in Customer Information Modal */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCheckFraud(selectedOrder)}
                      disabled={checkingFraudFor === selectedOrder.id}
                      title="Steadfast ও কুরিয়ার ডেলিভারি সাকসেস রেট ও রিটার্ন রেকর্ড যাচাই করুন"
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        fraudReports[selectedOrder.id]
                          ? fraudReports[selectedOrder.id].riskLevel === 'safe'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : fraudReports[selectedOrder.id].riskLevel === 'moderate'
                            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                            : fraudReports[selectedOrder.id].riskLevel === 'high_risk'
                            ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 animate-pulse'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        {checkingFraudFor === selectedOrder.id
                          ? 'যাচাই করা হচ্ছে...'
                          : fraudReports[selectedOrder.id]
                          ? fraudReports[selectedOrder.id].totalOrders > 0
                            ? `কুরিয়ার সাকসেস: ${fraudReports[selectedOrder.id].successRate}% (${fraudReports[selectedOrder.id].deliveredOrders}/${fraudReports[selectedOrder.id].totalOrders})`
                            : 'নতুন কাস্টমার (পূর্ববর্তী রেকর্ড নেই)'
                          : 'কুরিয়ার ফ্রড চেক করুন'}
                      </span>
                    </button>
                    {fraudReports[selectedOrder.id]?.riskLevel === 'high_risk' && (
                      <button
                        type="button"
                        onClick={() => handleSendAdvanceFeeWhatsApp(selectedOrder)}
                        className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <SiWhatsapp className="w-3 h-3" />
                        <span>অগ্রিম ডেলিভারি চার্জ চান</span>
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
                    Delivery Address
                  </h4>
                  <p className="text-slate-800 font-medium leading-relaxed">
                    {selectedOrder.fullAddress || (typeof selectedOrder.deliveryAddress === 'object' ? (selectedOrder.deliveryAddress as any)?.fullAddress : selectedOrder.deliveryAddress) || `${selectedOrder.division || selectedOrder.customerDivision || 'Dhaka'}, Bangladesh`}
                  </p>
                  <p className="text-slate-500 mt-1">
                    District: <strong className="text-slate-700">{selectedOrder.district || (typeof selectedOrder.deliveryAddress === 'object' ? (selectedOrder.deliveryAddress as any)?.district : selectedOrder.deliveryAddress) || 'Dhaka'}</strong> • Thana:{' '}
                    <strong className="text-slate-700">{selectedOrder.upazila || (typeof selectedOrder.deliveryAddress === 'object' ? (selectedOrder.deliveryAddress as any)?.upazila : '') || 'Sadar'}</strong>
                  </p>
                </div>
              </div>

              {/* Order Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Ordered Items ({selectedOrder.items.length})
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    🔒 Staff Cost Visible
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Item</th>
                          <th className="py-2.5 px-3 text-right">Selling Price</th>
                          <th className="py-2.5 px-3 text-right text-amber-800">
                            Original Cost 🔒
                          </th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Total Selling</th>
                          <th className="py-2.5 px-3 text-right text-amber-800">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(selectedOrder.items || []).map((item: any, i: number) => {
                          const itemCost = getItemOriginalCost(item);
                          const qty = item.quantity || 1;
                          const lineSelling = item.price * qty;
                          const lineCost = itemCost * qty;
                          const lineMargin = lineSelling - lineCost;
                          return (
                            <tr key={i} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-3">
                                  <CartItemImage
                                    item={item}
                                    product={products.find((p) => p.id === item.productId)}
                                    sizeClassName="w-11 h-11 rounded-lg shrink-0 shadow-2xs"
                                  />
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 leading-snug">
                                      {item.productName || item.name || 'Item'}
                                    </p>
                                    {(item.variant || item.variantName || item.selectedColor || item.selectedSize) && (
                                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                        {item.selectedColor && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                            Color: {item.selectedColor}
                                          </span>
                                        )}
                                        {item.selectedSize && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                            Size: {item.selectedSize}
                                          </span>
                                        )}
                                        {!item.selectedColor && !item.selectedSize && (item.variant || item.variantName) && (
                                          <span className="text-[11px] text-slate-500">
                                            Variant: {item.variant || item.variantName}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                ৳{item.price?.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right text-amber-800 font-bold">
                                ৳{itemCost?.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold">{qty}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                ৳{lineSelling?.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-amber-800">
                                <div>৳{lineCost?.toLocaleString()}</div>
                                <span
                                  className={`text-[10px] block font-semibold ${
                                    lineMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {lineMargin >= 0 ? '+' : ''}৳{lineMargin?.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Compact Cards View */}
                  <div className="sm:hidden divide-y divide-slate-100 p-2.5 space-y-2">
                    {(selectedOrder.items || []).map((item: any, i: number) => {
                      const itemCost = getItemOriginalCost(item);
                      const qty = item.quantity || 1;
                      const lineSelling = item.price * qty;
                      const lineCost = itemCost * qty;
                      const lineMargin = lineSelling - lineCost;
                      return (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-2 text-xs">
                          <div className="flex items-start gap-2.5">
                            <CartItemImage
                              item={item}
                              product={products.find((p) => p.id === item.productId)}
                              sizeClassName="w-11 h-11 rounded-lg shrink-0 shadow-2xs"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-bold text-slate-900 text-xs leading-snug">
                                  {item.productName || item.name || 'Item'}
                                </p>
                                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-xs shrink-0">
                                  Qty: {qty}
                                </span>
                              </div>
                              {(item.variant || item.variantName || item.selectedColor || item.selectedSize) && (
                                <div className="flex items-center gap-1 flex-wrap mt-1">
                                  {item.selectedColor && (
                                    <span className="inline-flex items-center text-[9px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                      Color: {item.selectedColor}
                                    </span>
                                  )}
                                  {item.selectedSize && (
                                    <span className="inline-flex items-center text-[9px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                      Size: {item.selectedSize}
                                    </span>
                                  )}
                                  {!item.selectedColor && !item.selectedSize && (item.variant || item.variantName) && (
                                    <p className="text-[10px] text-slate-400">
                                      Variant: {item.variant || item.variantName}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-200/60">
                            <div>
                              <span className="text-slate-500 block">Unit: ৳{item.price?.toLocaleString()}</span>
                              <span className="font-black text-slate-900 block">Total: ৳{lineSelling?.toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-amber-800 font-semibold block">Cost: ৳{lineCost?.toLocaleString()}</span>
                              <span className={`font-bold block ${lineMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                Margin: {lineMargin >= 0 ? '+' : ''}৳{lineMargin?.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Subtotal & Profit Summary */}
                {(() => {
                  const modalOrderCost = getOrderOriginalCost(selectedOrder);
                  const modalNetProfit = selectedOrder.totalAmount - modalOrderCost;
                  const modalProfitPercent =
                    modalOrderCost > 0
                      ? Math.round((modalNetProfit / modalOrderCost) * 100)
                      : 0;

                  return (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                      {/* Cost & Margin Box (Staff Only) */}
                      <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-1.5">
                        <div className="flex items-center justify-between border-b border-amber-200/60 pb-1.5">
                          <span className="font-bold text-amber-900 flex items-center gap-1">
                            <span>🔒 Original Cost & Profit Analysis</span>
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-200/60 px-1.5 py-0.2 rounded">
                            Staff Only
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-700 pt-1">
                          <span>Total Sourcing Cost:</span>
                          <span className="font-bold text-amber-900">
                            ৳{modalOrderCost?.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Est. Net Profit:</span>
                          <span
                            className={`font-black ${
                              modalNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {modalNetProfit >= 0 ? '+' : ''}৳{modalNetProfit?.toLocaleString()} ({modalProfitPercent}%)
                          </span>
                        </div>
                      </div>

                      {/* Customer Billing Summary */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal:</span>
                          <span className="font-medium">
                            ৳{selectedOrder.subtotal?.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Delivery Charge:</span>
                          <span className="font-medium">
                            ৳{selectedOrder.deliveryCharge?.toLocaleString()}
                          </span>
                        </div>
                        {selectedOrder.discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-600 font-medium">
                            <span>Coupon Discount ({selectedOrder.couponCode}):</span>
                            <span>-৳{selectedOrder.discountAmount?.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-black text-slate-900 text-sm pt-1.5 border-t border-slate-200">
                          <span>Grand Total:</span>
                          <span className="text-sky-700">
                            ৳{selectedOrder.totalAmount?.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Payment Verification Block */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-sky-600" />
                    Payment Details ({selectedOrder.paymentMethod})
                  </h4>
                  <p className="text-slate-600 mt-1">
                    Status:{' '}
                    <strong
                      className={
                        selectedOrder.paymentStatus === 'Verified' || selectedOrder.paymentStatus === 'Paid'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }
                    >
                      {selectedOrder.paymentStatus}
                    </strong>
                    {selectedOrder.transactionId && (
                      <span> • TrxID: <strong className="font-mono text-slate-900">{selectedOrder.transactionId}</strong></span>
                    )}
                  </p>
                  {selectedOrder.senderMobileNumber && (
                    <p className="text-slate-500">Sender Mobile: {selectedOrder.senderMobileNumber}</p>
                  )}
                </div>

                {selectedOrder.paymentStatus !== 'Verified' && selectedOrder.paymentStatus !== 'Paid' && (
                  <button
                    onClick={() => {
                      onVerifyPayment(selectedOrder.id);
                      setSelectedOrder({ ...selectedOrder, paymentStatus: 'Verified' });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    Approve Payment
                  </button>
                )}
              </div>

              {/* Internal Order Notes / Staff Comments */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                    <span>Internal Order Notes / Staff Comments</span>
                  </label>
                  <span className="text-[10px] text-amber-700 font-semibold">Saved with status transitions</span>
                </div>
                <textarea
                  value={orderNotesInput}
                  onChange={(e) => setOrderNotesInput(e.target.value)}
                  placeholder="Leave internal notes for status transitions, customer call remarks, special delivery instructions..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 text-xs text-slate-800 bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveOrderNotes}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Internal Note</span>
                  </button>
                </div>
              </div>

              {/* Update Status & Courier Form */}
              <div className="p-4 rounded-xl border-2 border-sky-100 bg-sky-50/40 space-y-4">
                {selectedOrder.orderStatus === 'Fake Order' || Boolean(selectedOrder.isFakeOrder) ? (
                  <div className="p-4 rounded-2xl border-2 border-purple-300 dark:border-purple-800 bg-purple-50/90 dark:bg-purple-950/50 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800 pb-2">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-purple-950 dark:text-purple-200 flex items-center gap-2">
                        <ShieldAlert className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                        <span>চিহ্নিত ফেক অর্ডার (Fake Order Management)</span>
                      </h4>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-700 text-white">
                        Fake Order
                      </span>
                    </div>

                    <p className="text-xs text-purple-900 dark:text-purple-300">
                      এই অর্ডারটি স্টাফ কর্তৃক <strong>'ফেক অর্ডার'</strong> হিসেবে চিহ্নিত ও তালিকাভুক্ত করা হয়েছে।
                    </p>

                    {isSuperAdmin ? (
                      <div className="pt-2 border-t border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-slate-700 dark:text-slate-300">
                          <strong className="text-emerald-700 dark:text-emerald-400">সুপার অ্যাডমিন অনুমতি:</strong> আপনি এই অর্ডারটি আনফেক (রিয়েল অর্ডার) হিসেবে ফিরিয়ে আনতে পারেন।
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnfakeOrder(selectedOrder)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shrink-0"
                          title="Restore to real order"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>আনফেক / রিয়েল অর্ডার করুন</span>
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-purple-200 dark:border-purple-800 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 font-semibold">
                        <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>শুধুমাত্র সুপার অ্যাডমিন এই ফেক অর্ডার আনফেক বা রিয়েল করতে পারবেন। মডারেটর বা ম্যানেজারদের এই অনুমতি নেই।</span>
                      </div>
                    )}
                  </div>
                ) : scopeFilter !== 'confirmed' ? (
                  <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/80 space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                        <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                        <span>Pending Order Confirmation</span>
                      </h4>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                        {selectedOrder.orderStatus}
                      </span>
                    </div>

                    {((selectedOrder.orderStatus || (selectedOrder as any).status || '').toLowerCase() === 'pending' ||
                    (selectedOrder.orderStatus || '').toLowerCase() === 'payment verification' ||
                    (selectedOrder.orderStatus || '').toLowerCase() === 'unconfirmed') ? (
                      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={handleConfirmPendingOrder}
                          className="w-full sm:w-auto flex-1 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Confirm Order</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelPendingOrder}
                          className="px-4 py-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4 text-rose-600" />
                          <span>Cancel Order</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleMarkFakeOrder}
                          className="px-4 py-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-purple-300 dark:border-purple-800 shadow-xs"
                          title="Mark this order as Fake Order"
                        >
                          <ShieldAlert className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                          <span>Fake Order (ফেক অর্ডার)</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-300 text-xs">
                        <div className="flex items-center gap-2 font-medium">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>This order is confirmed and can be managed step-by-step from the progression form below.</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleMarkFakeOrder}
                          className="px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-extrabold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 border border-purple-300 shadow-xs"
                          title="Mark this order as Fake Order"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                          <span>Fake Order (ফেক অর্ডার)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleStatusSubmit} className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-sky-100 pb-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-sky-600" />
                        Order Progression & Courier Handling
                      </h4>
                      <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-teal-600 text-white shadow-2xs">
                        Current Step: {getStepNumber(selectedOrder.orderStatus)} / 9 ({selectedOrder.orderStatus})
                      </span>
                    </div>

                    {/* Visual Stepper */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>Click next step to advance order:</span>
                        <span className="text-[10px] font-semibold text-slate-500">Steps 3 to 9</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-7 gap-1.5 p-2 bg-slate-900 rounded-xl shadow-inner border border-slate-800">
                        {PROG_STEPS.filter((s) => s.num >= 3).map((s) => {
                          const currentNum = getStepNumber(selectedOrder.orderStatus);
                          const isCompleted = s.num < currentNum;
                          const isCurrent = s.num === currentNum;
                          const isLocked = s.num <= currentNum;
                          const StepIcon = s.icon;

                          return (
                            <button
                              key={s.status}
                              type="button"
                              onClick={() => {
                                if (isLocked) {
                                  showSaveNotification(
                                    `Order #${selectedOrder.id} is already at or past stage ${currentNum} (${selectedOrder.orderStatus}). Bypassing backwards is locked.`
                                  );
                                  return;
                                }
                                const oldStatus = selectedOrder.orderStatus;
                                const newStatus = s.status;
                                onUpdateOrderStatus(
                                  selectedOrder.id,
                                  newStatus,
                                  courierName,
                                  trackingNumber,
                                  currentStaff ? {
                                    id: currentStaff.id,
                                    name: currentStaff.name,
                                    role: currentStaff.role,
                                  } : undefined
                                );
                                const isStepCompletedOrDelivered = newStatus === 'Completed' || newStatus === 'Delivered';
                                const isStepReturned = newStatus === 'Returned';
                                setSelectedOrder({
                                  ...selectedOrder,
                                  orderStatus: newStatus,
                                  paymentStatus: isStepCompletedOrDelivered ? 'Paid' : isStepReturned ? 'Unpaid' : selectedOrder.paymentStatus,
                                  paidAmount: isStepCompletedOrDelivered ? selectedOrder.totalAmount : isStepReturned ? 0 : selectedOrder.paidAmount,
                                  dueAmount: isStepCompletedOrDelivered ? 0 : isStepReturned ? selectedOrder.totalAmount : selectedOrder.dueAmount,
                                  courierName,
                                  trackingNumber,
                                  handledByStaffId: currentStaff?.id || selectedOrder.handledByStaffId,
                                  handledByStaffName: currentStaff?.name || selectedOrder.handledByStaffName,
                                  handledByStaffRole: currentStaff?.role || selectedOrder.handledByStaffRole,
                                });
                                setEditingStatus(newStatus);
                                showSaveNotification(
                                  `Order #${selectedOrder.id} status advanced: ${oldStatus} ➔ ${newStatus}!`
                                );
                              }}
                              className={`relative p-2 rounded-lg flex flex-col items-center text-center transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-teal-500 text-white shadow-md ring-2 ring-teal-300 ring-offset-1 ring-offset-slate-900 scale-102 z-10'
                                  : isCompleted
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900'
                                  : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-center w-5 h-5 rounded text-xs font-black mb-1">
                                {isCompleted ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : isCurrent ? (
                                  <Lock className="w-3.5 h-3.5 text-amber-300" />
                                ) : (
                                  <StepIcon className="w-3.5 h-3.5 text-slate-300" />
                                )}
                              </div>
                              <span className="text-[10px] font-black leading-tight truncate w-full">{s.title}</span>
                              <span className={`text-[8px] font-medium mt-0.5 truncate w-full ${isCurrent ? 'text-teal-100' : 'text-slate-400'}`}>
                                {s.descBn}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Order Status Dropdown
                        </label>
                        <select
                          value={editingStatus}
                          onChange={(e) => setEditingStatus(e.target.value as OrderStatus)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold text-slate-800"
                        >
                          <option value="Confirmed">Confirmed</option>
                          <option value="Processing">Processing</option>
                          <option value="Packed">Packed / Picked</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Returned">Returned</option>
                          <option value="Fake Order">Fake Order (ফেক অর্ডার)</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Courier Partner
                          </label>
                          {getConfirmedStepNum(selectedOrder.orderStatus) >= 4 && (
                            <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-amber-700" />
                              Locked (Shipped)
                            </span>
                          )}
                        </div>
                        <select
                          value={courierName}
                          disabled={getConfirmedStepNum(selectedOrder.orderStatus) >= 4}
                          onChange={(e) => setCourierName(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                            getConfirmedStepNum(selectedOrder.orderStatus) >= 4
                              ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-sky-200 cursor-pointer'
                          }`}
                        >
                          {COURIER_PARTNERS.concat(
                            COURIER_PARTNERS.includes(courierName) ? [] : [courierName]
                          ).map((cName) => (
                            <option key={cName} value={cName}>
                              {cName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Consignment / Tracking ID
                          </label>
                          {getConfirmedStepNum(selectedOrder.orderStatus) >= 4 && (
                            <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-amber-700" />
                              Locked (Shipped)
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={trackingNumber}
                          disabled={getConfirmedStepNum(selectedOrder.orderStatus) >= 4}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="e.g. STF-893241"
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${
                            getConfirmedStepNum(selectedOrder.orderStatus) >= 4
                              ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-sky-200'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Progression & Courier Info</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Manual Order Creation Modal (Accessible by Admin, Moderator, Manager) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto border border-slate-200">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  <span>Create Manual Order</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Order Creator Staff: <strong>{currentStaff?.name || 'Super Admin'}</strong> ({currentStaff?.role || currentRole || 'super_admin'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setManualOrderError(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrderSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Error Notice */}
              {manualOrderError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs font-semibold animate-pulse">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>{manualOrderError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManualOrderError(null)}
                    className="text-rose-500 hover:text-rose-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Customer Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-sky-600" />
                  1. Customer Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="e.g. Anik Rahman"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={custMobile}
                      onChange={(e) => setCustMobile(e.target.value)}
                      placeholder="e.g. 01700000000"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Delivery Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="House no, road no, area details..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Division</label>
                    <select
                      value={custDivision}
                      onChange={(e) => {
                        setCustDivision(e.target.value);
                        if (e.target.value === 'Dhaka') {
                          setDelivCharge(70);
                        } else {
                          setDelivCharge(130);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
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
                    <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
                    <input
                      type="text"
                      value={custDistrict}
                      onChange={(e) => setCustDistrict(e.target.value)}
                      placeholder="District / Upazila"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Product Search & Selection */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-sky-600" />
                    2. Select Products (Mandatory *)
                  </h4>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    orderItems.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {orderItems.length > 0 ? `${orderItems.length} Products Selected` : '0 Selected (Required)'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Search Product by Name or SKU
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        placeholder="Type product name, category or code..."
                        className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    {/* Search Suggestions Dropdown */}
                    {productSearchQuery.trim().length > 0 && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {searchedProducts.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 text-center">
                            No products matching "{productSearchQuery}"
                          </div>
                        ) : (
                          searchedProducts.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProductId(p.id);
                                setProductSearchQuery('');
                                setManualOrderError(null);
                              }}
                              className="w-full p-2.5 hover:bg-sky-50 transition-colors flex items-center justify-between text-left text-xs cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={getOptimizedImageUrl(p.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30', 100)}
                                  alt={p.name}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => handleImageError(e, p.images?.[0])}
                                  className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                                />
                                <div>
                                  <p className="font-bold text-slate-800 group-hover:text-sky-700">{p.name}</p>
                                  <p className="text-[10px] text-slate-400">
                                    Price: <strong className="text-slate-700">৳{p.price}</strong> | Stock: {p.stock}
                                  </p>
                                </div>
                              </div>
                              <span className="px-2 py-1 rounded-lg bg-sky-100 text-sky-800 text-[10px] font-bold group-hover:bg-sky-600 group-hover:text-white transition-colors">
                                Select
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Or select from catalog dropdown */}
                  {products.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Or Pick Directly from Catalog
                      </label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => {
                          setSelectedProductId(e.target.value);
                          setManualOrderError(null);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                      >
                        <option value="">-- Choose a product to configure --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (৳{p.price} - Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Single Line Controls for Selected Product: Qty, Color, Size, Add Item */}
                  {activeSelectedProduct && (
                    <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={getOptimizedImageUrl(activeSelectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30', 100)}
                            alt={activeSelectedProduct.name}
                            referrerPolicy="no-referrer"
                            onError={(e) => handleImageError(e, activeSelectedProduct.images?.[0])}
                            className="w-7 h-7 rounded-lg object-cover border border-sky-300 shrink-0"
                          />
                          <p className="text-xs font-bold text-sky-950 truncate max-w-[280px]">
                            {activeSelectedProduct.name} (৳{activeSelectedProduct.price})
                          </p>
                        </div>
                        <span className="text-[10px] text-sky-700 font-semibold shrink-0">
                          Stock: {activeSelectedProduct.stock}
                        </span>
                      </div>

                      {/* Single Line Controls: Quantity + Color + Size + Add Button */}
                      <div className="flex flex-wrap sm:flex-nowrap items-end gap-2.5 pt-1">
                        {/* 1. Add Qty */}
                        <div className="w-24 shrink-0">
                          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={activeSelectedProduct.stock > 0 ? activeSelectedProduct.stock : 999}
                            value={selectedQty}
                            onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full h-9 px-2.5 rounded-xl border border-slate-300 text-xs bg-white text-center font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                          />
                        </div>

                        {/* 2. Color Selection (if product has colors) */}
                        {availableColors.length > 0 && (
                          <div className="flex-1 min-w-[110px]">
                            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Color *
                            </label>
                            <select
                              value={selectedColor}
                              onChange={(e) => setSelectedColor(e.target.value)}
                              className="w-full h-9 px-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                            >
                              {availableColors.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* 3. Size Selection (if product has sizes) */}
                        {availableSizes.length > 0 && (
                          <div className="flex-1 min-w-[95px]">
                            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                              Size *
                            </label>
                            <select
                              value={selectedSize}
                              onChange={(e) => setSelectedSize(e.target.value)}
                              className="w-full h-9 px-2.5 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                            >
                              {availableSizes.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* 4. Add Button (On the same row) */}
                        <button
                          type="button"
                          onClick={handleAddProductToOrder}
                          className="h-9 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Add Item</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Added Items List */}
                  {orderItems.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <p className="text-[11px] font-bold text-slate-700">Added Items ({orderItems.length}):</p>
                      <div className="divide-y divide-slate-200">
                        {orderItems.map((item, idx) => (
                          <div key={idx} className="py-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={getOptimizedImageUrl(item.image, 100)}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                onError={(e) => handleImageError(e, item.image)}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                              />
                              <div>
                                <p className="font-bold text-slate-900">{item.name}</p>
                                <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-500">
                                  <span>৳{item.price} × {item.quantity}</span>
                                  {item.selectedVariant && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 font-semibold">
                                      {item.selectedVariant}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-900">৳{item.price * item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveProductFromOrder(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment & Delivery */}
              <div className="space-y-3.5 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  3. Payment & Delivery Options
                </h4>

                {/* 3 Payment Plan Options: Full Advance, Delivery Charge, Cash on Delivery */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Payment Plan *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectPaymentOptionType('full')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        paymentOptionType === 'full'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Full Advance
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPaymentOptionType('delivery_only')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        paymentOptionType === 'delivery_only'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Delivery Charge
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPaymentOptionType('cod')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        paymentOptionType === 'cod'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Cash on Delivery
                    </button>
                  </div>
                </div>

                {/* Delivery Charge & Discount inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Delivery Charge (BDT) *
                    </label>
                    <input
                      type="number"
                      value={delivCharge}
                      onChange={(e) => setDelivCharge(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Discount (BDT)
                    </label>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Conditional Payment Methods & Send Money Instructions */}
                {(paymentOptionType === 'full' || paymentOptionType === 'delivery_only') && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        Select Payment Method *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['bKash', 'Nagad', 'Rocket'] as const).map((method) => {
                          const gw = paymentGatewaysInfo[method];
                          const isSelected = payMethod === method;
                          return (
                            <button
                              key={method}
                              type="button"
                              onClick={() => setPayMethod(method)}
                              className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                isSelected
                                  ? `${gw.borderActive} ring-2 ring-sky-300 shadow-xs`
                                  : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span className={`text-xs font-black ${isSelected ? gw.themeColor : 'text-slate-800'}`}>
                                {gw.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">Personal</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Payment Channel Details & Instruction */}
                    {payMethod !== 'Cash on Delivery' && paymentGatewaysInfo[payMethod as 'bKash' | 'Nagad' | 'Rocket'] && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-black ${paymentGatewaysInfo[payMethod as 'bKash' | 'Nagad' | 'Rocket'].themeColor}`}>
                                {paymentGatewaysInfo[payMethod as 'bKash' | 'Nagad' | 'Rocket'].name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                {paymentGatewaysInfo[payMethod as 'bKash' | 'Nagad' | 'Rocket'].type}
                              </span>
                            </div>
                            <p className="text-sm font-black text-slate-900 tracking-wider mt-0.5">
                              {paymentGatewaysInfo[payMethod as 'bKash' | 'Nagad' | 'Rocket'].number}
                            </p>
                          </div>

                          {/* Copy Number Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyPaymentNumber(paymentGatewaysInfo[payMethod as 'bKash' | 'Nagad' | 'Rocket'].number)}
                            className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white border border-sky-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                          >
                            {copiedPaymentNumber === paymentGatewaysInfo[payMethod as 'bKash' | 'Nagad' | 'Rocket'].number ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Number</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Send Money Instruction Amount */}
                        <div className="p-2.5 rounded-lg bg-sky-50/80 border border-sky-100 text-xs text-sky-950 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
                          <span>
                            {paymentOptionType === 'full' ? (
                              <>
                                👉 Please send <strong>৳{calculateTotal()?.toLocaleString()}</strong> (Full Order Amount) to this number via Send Money.
                              </>
                            ) : (
                              <>
                                👉 Please send delivery charge <strong>৳{delivCharge?.toLocaleString()}</strong> to this number via Send Money.
                              </>
                            )}
                          </span>
                        </div>

                        {/* Transaction ID & Sender Mobile Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Sender Mobile Number
                            </label>
                            <input
                              type="tel"
                              value={senderMobileNumber}
                              onChange={(e) => setSenderMobileNumber(e.target.value)}
                              placeholder="01XXXXXXXXX"
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Transaction ID (TrxID)
                            </label>
                            <input
                              type="text"
                              value={transactionId}
                              onChange={(e) => setTransactionId(e.target.value)}
                              placeholder="e.g. 8N7A6910"
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-900 font-semibold uppercase focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* COD Info Notice */}
                {paymentOptionType === 'cod' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Cash on Delivery:</strong> No advance payment required. The customer will pay the full amount of ৳{calculateTotal()?.toLocaleString()} to the courier upon delivery.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Initial Order Status</label>
                  <select
                    value={initialOrderStatus}
                    onChange={(e) => setInitialOrderStatus(e.target.value as OrderStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-bold text-sky-800 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                  </select>
                </div>
              </div>

              {/* Order Total & Payment Summary Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Order Subtotal ({orderItems.length} items):</span>
                  <span className="font-bold">৳{calculateSubtotal()?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Delivery Charge:</span>
                  <span className="font-bold">৳{delivCharge?.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2 text-emerald-400">
                    <span>Discount:</span>
                    <span className="font-bold">-৳{discountAmount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm pt-1">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">Total Bill</span>
                    <span className="text-xl font-black text-white">৳{calculateTotal()?.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 block font-bold">Advance Paid: ৳{calculateAdvancePaid()?.toLocaleString()}</span>
                    <span className="text-[10px] text-amber-300 block font-bold">Due Amount: ৳{calculateDueAmount()?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-800">
                  Created by staff: <strong className="text-white">{currentStaff?.name || 'Super Admin'}</strong> ({currentStaff?.role || currentRole || 'super_admin'})
                </div>
              </div>

              {/* Form Buttons with dynamic text */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setManualOrderError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={orderItems.length === 0}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5 ${
                    orderItems.length === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60 shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-lg'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {orderItems.length === 0
                      ? 'Select Product First'
                      : paymentOptionType === 'full'
                      ? `Pay ৳${calculateTotal()?.toLocaleString()} & Create Order`
                      : paymentOptionType === 'delivery_only'
                      ? `Pay ৳${delivCharge?.toLocaleString()} & Create Order`
                      : 'Create & Save Order'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shipped Confirmation & Courier/Tracking Dispatch Modal */}
      {shippedPromptOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold shrink-0 border border-sky-200">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Order Shipped Confirmation
                  </h4>
                  <p className="text-xs text-slate-500">
                    Order #{shippedPromptOrder.id} - {shippedPromptOrder.customerName || shippedPromptOrder.deliveryName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShippedPromptOrder(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Locking Policy:</strong> Once the order is marked as <strong>Shipped</strong>, Courier Partner and Tracking ID will be locked. Only <strong>Super Admin</strong> can unlock it.
                </div>
              </div>
            </div>

            {/* Courier Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Courier Partner:
              </label>
              <select
                value={shippedPromptCourier}
                onChange={(e) => setShippedPromptCourier(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {COURIER_PARTNERS.map((cName) => (
                  <option key={cName} value={cName}>
                    {cName}
                  </option>
                ))}
              </select>
            </div>

            {/* Tracking / Consignment ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tracking / Consignment ID (Optional):
              </label>
              <input
                type="text"
                value={shippedPromptTracking}
                onChange={(e) => setShippedPromptTracking(e.target.value)}
                placeholder="e.g. STF-98213"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                If not available now, you can leave it empty and confirm. It will be locked once shipped.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShippedPromptOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmShippedModal}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Truck className="w-4 h-4" />
                <span>Confirm & Ship</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Courier Fraud & Delivery Success Modal */}
      {selectedFraudModalReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 ${
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
                  <h4 className="text-base font-black text-slate-900">
                    কুরিয়ার পার্সেল হিস্ট্রি রিপোর্ট
                  </h4>
                  <p className="text-xs text-slate-500">
                    {selectedFraudModalReport.order.customerName} ({selectedFraudModalReport.report.phone})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFraudModalReport(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Assessment Box */}
            <div
              className={`p-4 rounded-2xl border space-y-2 ${
                selectedFraudModalReport.report.riskLevel === 'safe'
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : selectedFraudModalReport.report.riskLevel === 'moderate'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                  : selectedFraudModalReport.report.riskLevel === 'high_risk'
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm uppercase tracking-wide">
                  {selectedFraudModalReport.report.riskLevel === 'safe' && '🟢 নিরাপদ বায়ার (Safe)'}
                  {selectedFraudModalReport.report.riskLevel === 'moderate' && '🟡 মাঝারি ঝুঁকি (Moderate)'}
                  {selectedFraudModalReport.report.riskLevel === 'high_risk' && '🔴 উচ্চ ঝুঁকি (High Return Risk)'}
                  {selectedFraudModalReport.report.riskLevel === 'unknown' && '⚪ নতুন বা আনভেরিফাইড'}
                </span>
                <span className="text-xl font-black font-mono">
                  {selectedFraudModalReport.report.successRate}% Success
                </span>
              </div>
              <p className="text-xs font-semibold leading-relaxed">
                {selectedFraudModalReport.report.riskReason}
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <div className="text-[10px] font-bold text-slate-500">মোট পার্সেল</div>
                <div className="text-lg font-black text-slate-900 font-mono">
                  {selectedFraudModalReport.report.totalOrders}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <div className="text-[10px] font-bold text-emerald-800">ডেলিভারি রিসিভড</div>
                <div className="text-lg font-black text-emerald-700 font-mono">
                  {selectedFraudModalReport.report.deliveredOrders}
                </div>
              </div>
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-center">
                <div className="text-[10px] font-bold text-rose-800">রিটার্ন / বাতিল</div>
                <div className="text-lg font-black text-rose-700 font-mono">
                  {selectedFraudModalReport.report.cancelledOrders || selectedFraudModalReport.report.returnedOrders || 0}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={(e) => handleSendAdvanceFeeWhatsApp(selectedFraudModalReport.order, e)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <SiWhatsapp className="w-4 h-4" />
                <span>WhatsApp-এ অগ্রিম ডেলিভারি চার্জ চান</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFraudModalReport(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
