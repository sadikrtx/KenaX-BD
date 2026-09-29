import React, { useState, useMemo } from 'react';
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
  Copy,
  MessageSquare,
  Package,
  Boxes,
  Send,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Bot,
  Sparkles,
  ShoppingBag,
  Store,
  GraduationCap,
  TrendingUp,
  Share2,
  Check,
  RefreshCw,
  Mail,
  Info,
} from 'lucide-react';
import { SiWhatsapp, SiTelegram } from 'react-icons/si';
import {
  Order,
  OrderStatus,
  UserRole,
  StaffUser,
  Product,
  OrderItem,
  SiteSettings,
  CourierFraudReport,
} from '../../types';
import { getOptimizedImageUrl, handleImageError } from '../../utils/imageOptimizer';
import { CartItemImage } from '../CartItemImage';
import {
  generateWhatsAppDirectLink,
  formatWhatsAppMessage,
} from '../../lib/whatsappService';
import {
  checkCourierFraud,
  normalizePhoneForCourier,
} from '../../lib/courierFraudService';
import { getResellers } from '../../lib/resellerStorage';
import { ResellerUser } from '../../types/reseller';

interface AdminResellerOrdersProps {
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
  onVerifyPayment?: (orderId: string) => void;
  onOpenInvoice?: (order: Order) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  settings?: SiteSettings;
  onRecordAudit?: (action: string, module: string, targetId: string, details: string) => void;
}

export const AdminResellerOrders: React.FC<AdminResellerOrdersProps> = ({
  orders,
  products = [],
  onUpdateOrderStatus,
  onVerifyPayment,
  onOpenInvoice,
  currentRole,
  currentStaff,
  settings,
  onRecordAudit,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResellerFilter, setSelectedResellerFilter] = useState<string>('all');
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState<string>('all');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [copiedTextNotice, setCopiedTextNotice] = useState<string | null>(null);

  // Shipped Dispatch prompt modal state
  const [shippedPromptOrder, setShippedPromptOrder] = useState<Order | null>(null);
  const [shippedPromptCourier, setShippedPromptCourier] = useState<string>('Steadfast Courier');
  const [shippedPromptTracking, setShippedPromptTracking] = useState<string>('');

  // Single Message Dispatch Modal State
  const [messagingModalOrder, setMessagingModalOrder] = useState<Order | null>(null);
  const [messageRecipientType, setMessageRecipientType] = useState<'customer' | 'reseller'>('customer');
  const [customMessageDraft, setCustomMessageDraft] = useState<string>('');
  const [sendSuccessNotice, setSendSuccessNotice] = useState<string | null>(null);

  // Fraud check states
  const [fraudReports, setFraudReports] = useState<Record<string, CourierFraudReport>>({});
  const [checkingFraudFor, setCheckingFraudFor] = useState<string | null>(null);
  const [selectedFraudReport, setSelectedFraudReport] = useState<{ report: CourierFraudReport; order: Order } | null>(null);

  // Expanded card IDs
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  // Stored resellers for enriching info
  const storedResellers = useMemo(() => {
    try {
      return getResellers();
    } catch {
      return [];
    }
  }, []);

  const getResellerDetails = (order: Order) => {
    const rawResellerId = (order as any).resellerId || '';
    const rawStoreName = (order as any).resellerStoreName || (order as any).businessName || '';
    
    // Find matching reseller in registered list
    const matched = storedResellers.find(
      (r) =>
        (rawResellerId && r.id === rawResellerId) ||
        (rawStoreName && r.businessName?.toLowerCase() === rawStoreName.toLowerCase()) ||
        (r.phone && (order as any).advancePaymentSender === r.phone)
    );

    const storeName =
      rawStoreName ||
      matched?.businessName ||
      (order.notes?.match(/\[Dropship:\s*([^|\]]+)/)?.[1]?.trim()) ||
      'Reseller Partner Store';

    const studentName =
      (order as any).resellerStudentName ||
      (order as any).resellerName ||
      matched?.fullName ||
      matched?.username ||
      'Verified Dropshipper';

    const resellerPhone =
      (order as any).resellerPhone ||
      (order as any).advancePaymentSender ||
      matched?.phone ||
      'N/A';

    const resellerProfit =
      Number((order as any).resellerProfit) ||
      Number((order as any).netProfit) ||
      (order.notes?.match(/Reseller Profit:\s*৳?(\d+)/)?.[1] ? Number(order.notes.match(/Reseller Profit:\s*৳?(\d+)/)?.[1]) : 0);

    const baseCost =
      Number((order as any).basePrice) ||
      Number((order as any).wholesaleCost) ||
      (order.items?.[0]?.costPrice ? order.items.reduce((s, it) => s + (it.costPrice || 0) * it.quantity, 0) : 0);

    return {
      id: rawResellerId || matched?.id || 'reseller-partner',
      storeName,
      studentName,
      phone: resellerPhone,
      email: matched?.email || 'reseller@kenaxbd.com',
      profit: resellerProfit,
      baseCost,
      isVip: matched?.isVIP || false,
      planId: matched?.planId || 'standard',
    };
  };

  // Helper to test if an order belongs to Reseller dropship
  const isResellerOrder = (o: Order) => {
    return Boolean(
      (o as any).resellerId ||
      (o as any).resellerStoreName ||
      (o as any).isResellerOrder ||
      (o.notes && o.notes.includes('[Dropship:'))
    );
  };

  // Filter reseller orders
  const resellerOrders = useMemo(() => {
    return orders.filter(isResellerOrder);
  }, [orders]);

  // Distinct Reseller Stores for dropdown filter
  const distinctResellerStores = useMemo(() => {
    const map = new Map<string, string>();
    resellerOrders.forEach((o) => {
      const info = getResellerDetails(o);
      if (info.storeName) {
        map.set(info.storeName, `${info.storeName} (${info.studentName})`);
      }
    });
    return Array.from(map.entries()).map(([storeName, label]) => ({ storeName, label }));
  }, [resellerOrders]);

  // Filtered list based on active tab, search, and filters
  const filteredOrders = useMemo(() => {
    return resellerOrders.filter((order) => {
      const lowerStatus = (order.orderStatus || 'Pending').toLowerCase();
      const isPending =
        lowerStatus === 'pending' ||
        lowerStatus === 'payment verification' ||
        lowerStatus === 'unconfirmed';

      // 1. Tab Status Filter
      if (activeTab === 'pending') {
        if (!isPending) return false;
      } else if (activeTab === 'confirmed') {
        if (lowerStatus !== 'confirmed') return false;
      } else if (activeTab === 'processing') {
        if (lowerStatus !== 'processing' && lowerStatus !== 'packed' && lowerStatus !== 'picked') return false;
      } else if (activeTab === 'shipped') {
        if (lowerStatus !== 'shipped' && lowerStatus !== 'out for delivery' && lowerStatus !== 'out_for_delivery') return false;
      } else if (activeTab === 'delivered') {
        if (lowerStatus !== 'delivered' && lowerStatus !== 'completed') return false;
      } else if (activeTab === 'cancelled') {
        if (lowerStatus !== 'cancelled' && lowerStatus !== 'rejected' && lowerStatus !== 'returned') return false;
      }

      // 2. Reseller Filter
      if (selectedResellerFilter !== 'all') {
        const info = getResellerDetails(order);
        if (info.storeName !== selectedResellerFilter) return false;
      }

      // 3. Advance Payment Filter
      if (advanceStatusFilter !== 'all') {
        const isAdvancePaid = Boolean(
          (order as any).advancePaymentAmount > 0 ||
          (order as any).deliveryPaymentStatus === 'COD Verified' ||
          (order.paidAmount && order.paidAmount > 0)
        );
        if (advanceStatusFilter === 'paid' && !isAdvancePaid) return false;
        if (advanceStatusFilter === 'pending' && isAdvancePaid) return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const info = getResellerDetails(order);
        const matchId = (order.id || '').toLowerCase().includes(q);
        const matchCust = (order.customerName || '').toLowerCase().includes(q);
        const matchPhone = (order.customerMobile || order.deliveryMobile || '').includes(q);
        const matchStore = info.storeName.toLowerCase().includes(q);
        const matchStudent = info.studentName.toLowerCase().includes(q);
        const matchDistrict = (order.district || '').toLowerCase().includes(q);
        const matchAddress = (order.fullAddress || '').toLowerCase().includes(q);

        if (!matchId && !matchCust && !matchPhone && !matchStore && !matchStudent && !matchDistrict && !matchAddress) {
          return false;
        }
      }

      return true;
    });
  }, [resellerOrders, activeTab, selectedResellerFilter, advanceStatusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let pendingCount = 0;
    let confirmedCount = 0;
    let shippedCount = 0;
    let deliveredCount = 0;
    let totalSales = 0;
    let totalResellerProfit = 0;

    resellerOrders.forEach((o) => {
      const s = (o.orderStatus || 'Pending').toLowerCase();
      const info = getResellerDetails(o);
      const isPend = s === 'pending' || s === 'payment verification' || s === 'unconfirmed';

      if (isPend) pendingCount++;
      else if (s === 'confirmed' || s === 'processing' || s === 'packed') confirmedCount++;
      else if (s === 'shipped' || s === 'out for delivery' || s === 'out_for_delivery') shippedCount++;
      else if (s === 'delivered' || s === 'completed') deliveredCount++;

      totalSales += o.totalAmount || 0;
      totalResellerProfit += info.profit;
    });

    return {
      total: resellerOrders.length,
      pendingCount,
      confirmedCount,
      shippedCount,
      deliveredCount,
      totalSales,
      totalResellerProfit,
    };
  }, [resellerOrders]);

  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedTextNotice(`${label} কপি করা হয়েছে!`);
      setTimeout(() => setCopiedTextNotice(null), 2000);
    } catch {}
  };

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
      setSelectedFraudReport({ report: rep, order });
    } catch (err) {
      console.error('Fraud check error:', err);
    } finally {
      setCheckingFraudFor(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedOrderIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30">
          <CheckCircle className="w-3.5 h-3.5" /> কনফার্মড
        </span>
      );
    }
    if (s === 'processing' || s === 'packed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
          <Sparkles className="w-3.5 h-3.5" /> প্রসেসিং ও প্যাকিং
        </span>
      );
    }
    if (s === 'shipped' || s === 'out for delivery' || s === 'out_for_delivery') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
          <Truck className="w-3.5 h-3.5" /> কুরিয়ারে ট্রানজিট
        </span>
      );
    }
    if (s === 'delivered' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle className="w-3.5 h-3.5" /> সফল ডেলিভারি
        </span>
      );
    }
    if (s === 'cancelled' || s === 'rejected' || s === 'returned') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <XCircle className="w-3.5 h-3.5" /> বাতিল / ফেরত
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
        <Clock className="w-3.5 h-3.5" /> পেন্ডিং অ্যাপ্রুভাল
      </span>
    );
  };

  // Generate clean unified single-message template text
  const generateCustomerTemplateMessage = (order: Order) => {
    const info = getResellerDetails(order);
    const itemsSummary = (order.items || [])
      .map(
        (it, idx) =>
          `  ${idx + 1}. ${it.productName || it.name} (পরিমাণ: ${it.quantity}টি${
            it.selectedColor ? `, রঙ: ${it.selectedColor}` : ''
          }${it.selectedSize ? `, সাইজ: ${it.selectedSize}` : ''})`
      )
      .join('\n');

    const dueAmount =
      (order as any).remainingCodAmount !== undefined
        ? (order as any).remainingCodAmount
        : order.totalAmount - (order.paidAmount || 0);

    return `🛍️ *${info.storeName} — আপনার অর্ডারটি নিশ্চিত করা হয়েছে!*
━━━━━━━━━━━━━━━━━━━━━━━━━━
প্রিয় *${order.customerName}*,

*${info.storeName}* (পরিচালনায়: ${info.studentName})-এ অর্ডার করার জন্য আপনাকে আন্তরিক ধন্যবাদ। আপনার অর্ডারটি প্যাকেজিং শেষে দ্রুততম সময়ে কুরিয়ারে হস্তান্তর করা হবে।

📦 *অর্ডার আইডি:* #${order.id}
📱 *মোবাইল নম্বর:* ${order.customerMobile || order.deliveryMobile}
📍 *ডেলিভারি ঠিকানা:* ${order.fullAddress}, ${order.district}

🛒 *অর্ডারকৃত পণ্যসমূহ:*
${itemsSummary}

💰 *মোট বিল (ক্যাশ অন ডেলিভারি):* ৳${(order.totalAmount || 0).toLocaleString()}
💵 *ডেলিভারি ম্যানকে প্রদেয়:* ৳${dueAmount.toLocaleString()}

🚚 *কুরিয়ার:* ${order.courierName || 'Steadfast Courier'}${
      order.trackingNumber ? ` (ট্র্যাকিং কোড: ${order.trackingNumber})` : ''
    }

যেকোনো প্রয়োজনে আমাদের হেল্পলাইনে যোগাযোগ করতে পারেন।
🏪 *${info.storeName}*
📞 হেল্পলাইন: ${info.phone}`;
  };

  const generateResellerAlertMessage = (order: Order) => {
    const info = getResellerDetails(order);
    const dueAmount =
      (order as any).remainingCodAmount !== undefined
        ? (order as any).remainingCodAmount
        : order.totalAmount - (order.paidAmount || 0);

    return `🚀 *[রিসেলার ড্রপশিপ অর্ডার আপডেট]*
━━━━━━━━━━━━━━━━━━━━━━━━━━
🏪 *আপনার স্টোর:* ${info.storeName}
🎓 *রিসেলার/স্টুডেন্ট:* ${info.studentName}
📦 *অর্ডার আইডি:* #${order.id}
⚡ *বর্তমান স্ট্যাটাস:* ${order.orderStatus}

👤 *কাস্টমার তথ্য:*
• নাম: ${order.customerName}
• মোবাইল: ${order.customerMobile || order.deliveryMobile}
• জেলা: ${order.district}

💰 *আর্থিক হিসাব:*
• কাস্টমার সেলিং প্রাইস: ৳${order.totalAmount}
• মোট প্রফিট মার্জিন: ৳${info.profit} (ডেলিভারি সম্পন্ন হলে ওয়ালেটে জমা হবে)
• কুরিয়ার ক্যাশ কালেকশন: ৳${dueAmount}

🚚 *কুরিয়ার:* ${order.courierName || 'Steadfast Courier'}${
      order.trackingNumber ? `\n🔗 *ট্র্যাকিং নম্বর:* ${order.trackingNumber}` : ''
    }

ধন্যবাদ, আপনার ড্রপশিপিং যাত্রার সাথে থাকতে পেরে আমরা আনন্দিত!`;
  };

  // Open Message Modal
  const openMessagingModal = (order: Order, recipient: 'customer' | 'reseller' = 'customer') => {
    setMessagingModalOrder(order);
    setMessageRecipientType(recipient);
    if (recipient === 'customer') {
      setCustomMessageDraft(generateCustomerTemplateMessage(order));
    } else {
      setCustomMessageDraft(generateResellerAlertMessage(order));
    }
  };

  const handleSendWhatsApp = () => {
    if (!messagingModalOrder) return;
    const phone =
      messageRecipientType === 'customer'
        ? messagingModalOrder.customerMobile || messagingModalOrder.deliveryMobile
        : getResellerDetails(messagingModalOrder).phone;

    if (!phone) return;
    const clean = normalizePhoneForCourier(phone);
    const intlPhone = clean.startsWith('0') ? `88${clean}` : `880${clean}`;
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(customMessageDraft)}`, '_blank');

    setSendSuccessNotice('WhatsApp সফলভাবে চালু হয়েছে!');
    if (onRecordAudit) {
      onRecordAudit(
        'WhatsApp Message Sent',
        'reseller_orders',
        messagingModalOrder.id,
        `Sent ${messageRecipientType} notification via WhatsApp for Order #${messagingModalOrder.id}`
      );
    }
    setTimeout(() => setSendSuccessNotice(null), 2500);
  };

  const handleSendEmail = () => {
    if (!messagingModalOrder) return;
    const info = getResellerDetails(messagingModalOrder);
    const email =
      messageRecipientType === 'customer'
        ? messagingModalOrder.customerEmail || 'customer@gmail.com'
        : info.email;

    const subject = encodeURIComponent(`Order Update #${messagingModalOrder.id} - ${info.storeName}`);
    const body = encodeURIComponent(customMessageDraft);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');

    setSendSuccessNotice('ইমেইল ক্লায়েন্ট খোলা হয়েছে!');
    setTimeout(() => setSendSuccessNotice(null), 2500);
  };

  // Confirm Reseller Order
  const handleConfirmOrder = (order: Order) => {
    const activeStaff = currentStaff
      ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
      : undefined;

    onUpdateOrderStatus(
      order.id,
      'Confirmed',
      order.courierName || 'Steadfast Courier',
      order.trackingNumber,
      activeStaff,
      `রিসেলার অর্ডার কনফার্ম করেছেন অ্যাডমিন (${currentStaff?.name || 'Admin'})। স্টোর: ${getResellerDetails(order).storeName}`
    );

    if (onRecordAudit) {
      onRecordAudit(
        'Reseller Order Confirmed',
        'reseller_orders',
        order.id,
        `Confirmed reseller order #${order.id} by ${currentStaff?.name || 'Admin'}`
      );
    }
  };

  // Submit Shipped status with courier & tracking
  const handleSubmitShipped = () => {
    if (!shippedPromptOrder) return;
    const activeStaff = currentStaff
      ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
      : undefined;

    onUpdateOrderStatus(
      shippedPromptOrder.id,
      'Shipped',
      shippedPromptCourier,
      shippedPromptTracking.trim() || undefined,
      activeStaff,
      `কুরিয়ারে হস্তান্তর: ${shippedPromptCourier}${shippedPromptTracking ? ` (Tracking: ${shippedPromptTracking})` : ''}`
    );

    if (onRecordAudit) {
      onRecordAudit(
        'Reseller Order Shipped',
        'reseller_orders',
        shippedPromptOrder.id,
        `Handed over to ${shippedPromptCourier} with tracking ${shippedPromptTracking}`
      );
    }

    setShippedPromptOrder(null);
    setShippedPromptTracking('');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {copiedTextNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-5 h-5 text-white" />
          <span>{copiedTextNotice}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 border border-slate-800 p-4 sm:p-6 lg:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] sm:text-xs font-black uppercase tracking-wider">
              <Boxes className="w-3.5 h-3.5" /> Dropship Hub • রিসেলার অর্ডার ম্যানেজমেন্ট
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-2 sm:gap-3">
              রিসেলার অর্ডার হাব <span className="text-emerald-400 text-base sm:text-xl">({resellerOrders.length}টি অর্ডার)</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              রিসেলার ও ড্রপশিপারদের প্লেস করা সকল কাস্টমার অর্ডার এখানে সরাসরি পেন্ডিংয়ে জমা হয়। এক ক্লিকে অর্ডার কনফার্ম, কুরিয়ার বুকিং ও কাস্টমারকে সিঙ্গেল মেসেজ পাঠান।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setActiveTab('pending');
              }}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-bold transition-all shadow-lg cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              পেন্ডিং রিভিউ ({stats.pendingCount})
            </button>
            <button
              onClick={() => {
                const csvContent =
                  'data:text/csv;charset=utf-8,' +
                  ['Order ID,Reseller Store,Student Name,Customer Name,Phone,District,Selling Price,Profit,Status']
                    .concat(
                      filteredOrders.map((o) => {
                        const inf = getResellerDetails(o);
                        return `"${o.id}","${inf.storeName}","${inf.studentName}","${o.customerName}","${o.customerMobile}","${o.district}","${o.totalAmount}","${inf.profit}","${o.orderStatus}"`;
                      })
                    )
                    .join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', `reseller_orders_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              এক্সপোর্ট CSV
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-slate-800/80">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 block uppercase">মোট অর্ডার</span>
            <div className="text-lg sm:text-2xl font-black text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-amber-950/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-amber-500/30">
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 block uppercase">পেন্ডিং রিভিউ</span>
            <div className="text-lg sm:text-2xl font-black text-amber-300 mt-0.5">{stats.pendingCount}</div>
          </div>
          <div className="bg-teal-950/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-teal-500/30">
            <span className="text-[10px] sm:text-[11px] font-bold text-teal-400 block uppercase">কনফার্মড</span>
            <div className="text-lg sm:text-2xl font-black text-teal-300 mt-0.5">{stats.confirmedCount}</div>
          </div>
          <div className="bg-sky-950/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-sky-500/30">
            <span className="text-[10px] sm:text-[11px] font-bold text-sky-400 block uppercase">কুরিয়ারে</span>
            <div className="text-lg sm:text-2xl font-black text-sky-300 mt-0.5">{stats.shippedCount}</div>
          </div>
          <div className="bg-emerald-950/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-emerald-500/30">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 block uppercase">ডেলিভারড</span>
            <div className="text-lg sm:text-2xl font-black text-emerald-300 mt-0.5">{stats.deliveredCount}</div>
          </div>
          <div className="bg-purple-950/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-purple-500/30">
            <span className="text-[10px] sm:text-[11px] font-bold text-purple-400 block uppercase">রিসেলার লাভ</span>
            <div className="text-lg sm:text-2xl font-black text-purple-300 mt-0.5">৳{stats.totalResellerProfit.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'pending', label: '⏳ পেন্ডিং অর্ডার', count: stats.pendingCount, activeColor: 'bg-amber-500 text-slate-950 font-black' },
          { id: 'confirmed', label: '✅ কনফার্মড', count: stats.confirmedCount, activeColor: 'bg-teal-600 text-white font-bold' },
          { id: 'processing', label: '📦 প্রসেসিং ও প্যাকিং', activeColor: 'bg-indigo-600 text-white font-bold' },
          { id: 'shipped', label: '🚚 কুরিয়ারে ট্রানজিট', count: stats.shippedCount, activeColor: 'bg-sky-600 text-white font-bold' },
          { id: 'delivered', label: '🎉 সফল ডেলিভারি', count: stats.deliveredCount, activeColor: 'bg-emerald-600 text-white font-bold' },
          { id: 'cancelled', label: '❌ বাতিল ও রিটার্ন', activeColor: 'bg-rose-600 text-white font-bold' },
          { id: 'all', label: '📋 সকল ড্রপশিপ অর্ডার', count: stats.total, activeColor: 'bg-slate-800 text-white font-bold' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm whitespace-nowrap transition-all border cursor-pointer shrink-0 ${
                isActive
                  ? `${tab.activeColor} border-transparent shadow-lg scale-102`
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xl flex flex-col md:flex-row items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="অর্ডার আইডি, ফোন, স্টোর, স্টুডেন্ট বা জেলা দিয়ে খুঁজুন..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-slate-800 px-2 py-0.5 rounded-lg"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Reseller Store Selector */}
          <select
            value={selectedResellerFilter}
            onChange={(e) => setSelectedResellerFilter(e.target.value)}
            className="flex-1 md:flex-none bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">🏬 সকল স্টোর ({distinctResellerStores.length})</option>
            {distinctResellerStores.map((s) => (
              <option key={s.storeName} value={s.storeName}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Advance Payment Filter */}
          <select
            value={advanceStatusFilter}
            onChange={(e) => setAdvanceStatusFilter(e.target.value)}
            className="flex-1 md:flex-none bg-slate-950 border border-slate-800 rounded-xl sm:rounded-2xl px-3 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">💳 সকল পেমেন্ট</option>
            <option value="paid">✅ অগ্রিম পেইড</option>
            <option value="pending">⏳ ফুল COD</option>
          </select>
        </div>
      </div>

      {/* Orders List / Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 text-slate-400 mx-auto flex items-center justify-center">
            <Boxes className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-white">কোনো রিসেলার অর্ডার পাওয়া যায়নি</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {searchQuery
              ? 'আপনার সার্চ ফিল্টারের সাথে মিলে এমন কোনো অর্ডার খুঁজে পাওয়া যায়নি।'
              : 'বর্তমানে এই স্ট্যাটাসে কোনো রিসেলার ড্রপশিপ অর্ডার নেই।'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const info = getResellerDetails(order);
            const isExpanded = !!expandedOrderIds[order.id];
            const isPending =
              (order.orderStatus || 'Pending').toLowerCase() === 'pending' ||
              (order.orderStatus || 'Pending').toLowerCase() === 'payment verification';

            const remainingCod =
              (order as any).remainingCodAmount !== undefined
                ? (order as any).remainingCodAmount
                : order.totalAmount - (order.paidAmount || 0);

            const hasAdvance = Boolean(
              (order as any).advancePaymentAmount > 0 ||
              (order.paidAmount && order.paidAmount > 0) ||
              (order as any).deliveryPaymentStatus === 'COD Verified'
            );

            return (
              <div
                key={order.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 sm:p-6 transition-all shadow-xl space-y-5"
              >
                {/* Header Row: Reseller Store Branding + Customer Info + Status */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-white">#{order.id}</span>
                      <button
                        onClick={() => handleCopy(order.id, 'অর্ডার আইডি')}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                        title="কপি আইডি"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Reseller Store Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black shadow-sm">
                      <Store className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{info.storeName}</span>
                    </div>

                    {/* Student / Reseller Name */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{info.studentName}</span>
                    </div>

                    {/* Order Date */}
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(order.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                    {getStatusBadge(order.orderStatus)}

                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <span>{isExpanded ? 'সংক্ষেপ' : 'বিস্তারিত'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Main Card Content: 3-Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Col 1: Customer Delivery Details */}
                  <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-400 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-400" /> কাস্টমার তথ্য
                      </span>
                      <button
                        onClick={(e) => handleCheckFraud(order, e)}
                        disabled={checkingFraudFor === order.id}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-black transition-all"
                        title="কুরিয়ার ডেলিভারি সাকসেস রেট চেক করুন"
                      >
                        {checkingFraudFor === order.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-3 h-3" />
                        )}
                        <span>ফ্রড চেক</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="font-bold text-white text-sm">{order.customerName}</div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-emerald-400 font-bold">{order.customerMobile || order.deliveryMobile}</span>
                        <button
                          onClick={() => handleCopy(order.customerMobile || order.deliveryMobile, 'মোবাইল নম্বর')}
                          className="text-slate-400 hover:text-white"
                          title="কপি করুন"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-start gap-2 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-relaxed">
                          {order.fullAddress}, {order.district}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Col 2: Reseller Profit & Financial Breakdown */}
                  <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                    <span className="text-xs font-black uppercase text-purple-400 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> রিসেলার প্রফিট ও মার্জিন
                    </span>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">রিসেলারের দোকানের নাম:</span>
                        <span className="font-bold text-white">{info.storeName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">স্টুডেন্ট / সেলার:</span>
                        <span className="font-bold text-indigo-300">{info.studentName}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">রিসেলার প্রফিট (Net Margin):</span>
                        <span className="font-black text-emerald-400 text-sm">৳{info.profit.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                        <span className="text-slate-400">কাস্টমার মোট COD বিল:</span>
                        <span className="font-black text-white">৳{(order.totalAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Col 3: Courier & Payment Summary */}
                  <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
                    <span className="text-xs font-black uppercase text-sky-400 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-sky-400" /> কুরিয়ার ও পেমেন্ট
                    </span>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">কুরিয়ার পার্টনার:</span>
                        <span className="font-bold text-white">{order.courierName || 'Steadfast Courier'}</span>
                      </div>
                      {order.trackingNumber && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">ট্র্যাকিং কোড:</span>
                          <span className="font-mono font-bold text-sky-300">{order.trackingNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">অগ্রিম ডেলিভারি ফি:</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            hasAdvance
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {hasAdvance ? 'অগ্রিম পরিশোধিত' : 'ফুল ক্যাশ অন ডেলিভারি'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-400">কুরিয়ার ক্যাশ কালেকশন:</span>
                        <span className="font-black text-amber-400 text-sm">৳{remainingCod.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ordered Items Preview */}
                <div className="bg-slate-950/40 rounded-2xl p-3 border border-slate-800/60">
                  <div className="flex flex-wrap items-center gap-3">
                    {(order.items || []).map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs"
                      >
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                          {it.productImage ? (
                            <img
                              src={getOptimizedImageUrl(it.productImage, 60)}
                              alt={it.productName}
                              className="w-full h-full object-cover"
                              onError={handleImageError}
                            />
                          ) : (
                            <Package className="w-4 h-4 m-1.5 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-white line-clamp-1">{it.productName || it.name}</span>
                          <span className="text-[11px] text-slate-400">
                            পরিমাণ: {it.quantity}টি | বিক্রয়মূল্য: ৳{it.price}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="pt-4 border-t border-slate-800 space-y-4 animate-in fade-in duration-200">
                    {/* Advance Payment Details if available */}
                    {(order as any).advancePaymentAmount > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-amber-400" />
                            <span className="font-bold text-amber-300 text-sm">
                              রিসেলার কর্তৃক অগ্রিম ডেলিভারি ফি পেইড: ৳{(order as any).advancePaymentAmount}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            মেথড: <b>{(order as any).advancePaymentMethod || 'bKash'}</b> | TrxID: <code>{(order as any).advancePaymentTrxId || 'N/A'}</code> | সেন্ডার: <code>{(order as any).advancePaymentSender || 'N/A'}</code>
                          </p>
                        </div>
                        {onVerifyPayment && (
                          <button
                            onClick={() => onVerifyPayment(order.id)}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md"
                          >
                            পেমেন্ট ভেরিফাই করুন
                          </button>
                        )}
                      </div>
                    )}

                    {/* Timeline History */}
                    {order.timeline && order.timeline.length > 0 && (
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2">
                        <span className="text-xs font-black uppercase text-slate-400">অর্ডার টাইমলাইন</span>
                        <div className="space-y-1.5">
                          {order.timeline.map((evt, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                              <div>
                                <span className="font-bold text-white">{evt.status}</span> — {evt.note || 'স্ট্যাটাস আপডেট'}
                                <span className="text-slate-500 text-[10px] ml-2">
                                  ({new Date(evt.timestamp).toLocaleString('bn-BD')})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Quick Confirm Button if Pending */}
                    {isPending && (
                      <button
                        onClick={() => handleConfirmOrder(order)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm transition-all shadow-lg cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        অর্ডার কনফার্ম করুন
                      </button>
                    )}

                    {/* Handover to Courier / Shipped */}
                    {order.orderStatus === 'Confirmed' && (
                      <button
                        onClick={() => {
                          setShippedPromptOrder(order);
                          setShippedPromptCourier(order.courierName || 'Steadfast Courier');
                          setShippedPromptTracking(order.trackingNumber || '');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md"
                      >
                        <Truck className="w-4 h-4" />
                        কুরিয়ারে পাঠান
                      </button>
                    )}

                    {/* Mark Delivered */}
                    {(order.orderStatus === 'Shipped' || order.orderStatus === 'Out for Delivery') && (
                      <button
                        onClick={() => {
                          const activeStaff = currentStaff
                            ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
                            : undefined;
                          onUpdateOrderStatus(
                            order.id,
                            'Delivered',
                            order.courierName,
                            order.trackingNumber,
                            activeStaff,
                            `সফল ডেলিভারি সম্পন্ন! রিসেলার প্রফিট ৳${info.profit} ক্রেডিটেড।`
                          );
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition-all cursor-pointer shadow-md"
                      >
                        <CheckCircle className="w-4 h-4" />
                        ডেলিভার্ড মার্ক করুন
                      </button>
                    )}

                    {/* Status Changer Select */}
                    <div className="relative">
                      <select
                        value={order.orderStatus}
                        onChange={(e) => {
                          const newStatus = e.target.value as OrderStatus;
                          if (newStatus === 'Shipped') {
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
                            newStatus,
                            order.courierName,
                            order.trackingNumber,
                            activeStaff,
                            `Status updated to ${newStatus} by ${currentStaff?.name || 'Admin'}`
                          );
                        }}
                        className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="Pending">⏳ Pending</option>
                        <option value="Confirmed">✅ Confirmed</option>
                        <option value="Processing">📦 Processing</option>
                        <option value="Packed">🎁 Packed</option>
                        <option value="Shipped">🚚 Shipped</option>
                        <option value="Delivered">🎉 Delivered</option>
                        <option value="Cancelled">❌ Cancelled</option>
                        <option value="Returned">🔄 Returned</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Unified Single Message Dispatcher Button */}
                    <button
                      onClick={() => openMessagingModal(order, 'customer')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-black transition-all cursor-pointer shadow-md"
                      title="কাস্টমার ও রিসেলারকে ব্র্যান্ডেড সিঙ্গেল মেসেজ পাঠান"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>মেসেজ পাঠান</span>
                    </button>

                    {/* View / Print White-Label Customer Invoice */}
                    {onOpenInvoice && (
                      <button
                        onClick={() => onOpenInvoice(order)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
                        title="ইনভয়েস প্রিন্ট স্লিপ"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-400" />
                        <span>ইনভয়েস</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shipped Prompt Modal */}
      {shippedPromptOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-400" /> কুরিয়ারে প্রেরণ নিশ্চিত করুন
              </h3>
              <p className="text-xs text-slate-400">
                অর্ডার #{shippedPromptOrder.id} কুরিয়ার পার্টনারে হস্তান্তর করছেন।
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">কুরিয়ার নির্বাচন করুন</label>
                <select
                  value={shippedPromptCourier}
                  onChange={(e) => setShippedPromptCourier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="Steadfast Courier">Steadfast Courier</option>
                  <option value="Pathao Courier">Pathao Courier</option>
                  <option value="RedX Logistics">RedX Logistics</option>
                  <option value="Paperfly">Paperfly</option>
                  <option value="Sundarban Courier">Sundarban Courier</option>
                  <option value="In-House Delivery">In-House Delivery</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">কুরিয়ার ট্র্যাকিং নম্বর / কনসাইনমেন্ট আইডি (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={shippedPromptTracking}
                  onChange={(e) => setShippedPromptTracking(e.target.value)}
                  placeholder="যেমন: STF1092837"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShippedPromptOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                বাতিল
              </button>
              <button
                onClick={handleSubmitShipped}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black shadow-lg"
              >
                কুরিয়ারে পাঠান
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Single-Message Modal (Customer & Reseller) */}
      {messagingModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-5 animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-black">
                  <MessageSquare className="w-3 h-3" /> হোয়াইট-লেবেল সিঙ্গেল মেসেজ সেন্ডার
                </div>
                <h3 className="text-lg font-black text-white">
                  ব্র্যান্ডেড নোটিফিকেশন মেসেজ (অর্ডার #{messagingModalOrder.id})
                </h3>
              </div>
              <button
                onClick={() => setMessagingModalOrder(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Recipient Toggle: Customer vs Reseller */}
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={() => {
                  setMessageRecipientType('customer');
                  setCustomMessageDraft(generateCustomerTemplateMessage(messagingModalOrder));
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  messageRecipientType === 'customer'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                কাস্টমার মেসেজ ({getResellerDetails(messagingModalOrder).storeName} ব্র্যান্ডেড)
              </button>
              <button
                onClick={() => {
                  setMessageRecipientType('reseller');
                  setCustomMessageDraft(generateResellerAlertMessage(messagingModalOrder));
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                  messageRecipientType === 'reseller'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                রিসেলার অ্যালার্ট ({getResellerDetails(messagingModalOrder).studentName})
              </button>
            </div>

            {/* Notice */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {messageRecipientType === 'customer'
                  ? `কাস্টমারকে শুধুমাত্র একটি সুন্দর টেম্পলেটে রিসেলারের স্টোরের নাম (${getResellerDetails(messagingModalOrder).storeName}) এবং স্টুডেন্ট নাম (${getResellerDetails(messagingModalOrder).studentName}) দিয়ে মেসেজ পাঠানো হবে।`
                  : `রিসেলারকে তার স্টুডেন্ট নাম ও ড্রপশিপ প্রফিট মার্জিন সহ স্ট্যাটাস আপডেট জানানো হবে।`}
              </span>
            </div>

            {/* Editable Template Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold">মেসেজ কন্টেন্ট প্রিভিউ ও এডিট:</span>
                <button
                  onClick={() => {
                    if (messageRecipientType === 'customer') {
                      setCustomMessageDraft(generateCustomerTemplateMessage(messagingModalOrder));
                    } else {
                      setCustomMessageDraft(generateResellerAlertMessage(messagingModalOrder));
                    }
                  }}
                  className="text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> রিসেট টেম্পলেট
                </button>
              </div>
              <textarea
                rows={10}
                value={customMessageDraft}
                onChange={(e) => setCustomMessageDraft(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            {/* Status notice */}
            {sendSuccessNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2">
                <Check className="w-4 h-4" /> {sendSuccessNotice}
              </div>
            )}

            {/* Dispatch Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleCopy(customMessageDraft, 'টেমপ্লেট মেসেজ')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                <Copy className="w-3.5 h-3.5" /> কপি টেক্সট
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSendEmail}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-bold transition-all"
                >
                  <Mail className="w-4 h-4" />
                  ইমেইলে পাঠান
                </button>
                <button
                  onClick={handleSendWhatsApp}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg transition-all"
                >
                  <SiWhatsapp className="w-4 h-4" />
                  WhatsApp এ সেন্ড করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courier Fraud Report Modal */}
      {selectedFraudReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> কুরিয়ার ডেলিভারি সাকসেস রিপোর্ট
              </h3>
              <button
                onClick={() => setSelectedFraudReport(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">কাস্টমার ফোন:</span>
                <span className="font-mono font-bold text-white">
                  {selectedFraudReport.order.customerMobile || selectedFraudReport.order.deliveryMobile}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">ডেলিভারি সাকসেস রেট:</span>
                <span className="font-black text-emerald-400 text-base">
                  {selectedFraudReport.report.successRate ?? 100}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">মোট সফল ডেলিভারি:</span>
                <span className="font-bold text-white">
                  {selectedFraudReport.report.deliveredOrders ?? 0}টি
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">মোট রিটার্ন / ফেইলড:</span>
                <span className="font-bold text-rose-400">
                  {selectedFraudReport.report.returnedOrders ?? selectedFraudReport.report.cancelledOrders ?? 0}টি
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedFraudReport(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
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
