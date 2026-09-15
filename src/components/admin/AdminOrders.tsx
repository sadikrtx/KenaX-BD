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
} from 'lucide-react';
import { Order, OrderStatus, UserRole, StaffUser, Product, OrderItem } from '../../types';
import { getOptimizedImageUrl, handleImageError } from '../../utils/imageOptimizer';
import {
  generateWhatsAppDirectLink,
  formatWhatsAppMessage,
  DEFAULT_WHATSAPP_TEMPLATES,
} from '../../lib/whatsappService';

interface AdminOrdersProps {
  orders: Order[];
  products?: Product[];
  onUpdateOrderStatus: (
    orderId: string,
    newStatus: OrderStatus,
    courierName?: string,
    trackingNumber?: string
  ) => void;
  onVerifyPayment: (orderId: string) => void;
  onPrintInvoice: (order: Order) => void;
  onAddOrder?: (newOrder: Order) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  orders,
  products = [],
  onUpdateOrderStatus,
  onVerifyPayment,
  onPrintInvoice,
  onAddOrder,
  currentRole,
  currentStaff,
}) => {
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<
    'all' | 'pending' | 'confirmed' | 'processing' | 'delivered' | 'cancelled' | 'rejected' | 'my_orders'
  >('all');
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
  const getOrderOriginalCost = (order: Order): number => {
    if (!order.items || order.items.length === 0) return 0;
    return order.items.reduce((sum, item) => {
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

  const paymentGatewaysInfo: Record<
    'bKash' | 'Nagad' | 'Rocket',
    { name: string; number: string; type: string; themeColor: string; bgBadge: string; borderActive: string }
  > = {
    bKash: {
      name: 'bKash',
      number: '01712-345678',
      type: 'Personal (Send Money)',
      themeColor: 'text-pink-600',
      bgBadge: 'bg-pink-50 text-pink-700 border-pink-200',
      borderActive: 'border-pink-500 bg-pink-50/50 text-pink-900',
    },
    Nagad: {
      name: 'Nagad',
      number: '01812-345678',
      type: 'Personal (Send Money)',
      themeColor: 'text-orange-600',
      bgBadge: 'bg-orange-50 text-orange-700 border-orange-200',
      borderActive: 'border-orange-500 bg-orange-50/50 text-orange-900',
    },
    Rocket: {
      name: 'Rocket',
      number: '01912-345678-9',
      type: 'Personal (Send Money)',
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
  const [statusNote, setStatusNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Moderator specific stats & isolation rules
  const isModeratorRole = currentRole === 'moderator' || currentStaff?.role === 'moderator';

  // Strict moderator attribution to THIS staff member
  const myModeratorOrders = orders.filter((o) => {
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

  const myApprovedRevenue = myApprovedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const myRejectedOrders = myModeratorOrders.filter((o) => o.orderStatus === 'Cancelled');

  const filteredOrders = orders.filter((order) => {
    // Moderator isolation rule:
    // A moderator can see all Pending/Payment Verification orders, AND all orders created/handled by themselves.
    // They CANNOT access non-pending orders handled/created by other moderators.
    if (isModeratorRole && currentStaff) {
      const isPending = order.orderStatus === 'Pending' || order.orderStatus === 'Payment Verification';
      const isMine =
        (order.handledByStaffId && order.handledByStaffId === currentStaff.id) ||
        (order.createdByStaffId && order.createdByStaffId === currentStaff.id) ||
        (order.handledByStaffName && order.handledByStaffName === currentStaff.name) ||
        (order.createdByStaffName && order.createdByStaffName === currentStaff.name);

      if (!isPending && !isMine) {
        return false;
      }
    }

    // 1. Scope filter
    if (scopeFilter === 'pending') {
      const isPending = order.orderStatus === 'Pending' || order.orderStatus === 'Payment Verification';
      if (!isPending) return false;
    } else if (scopeFilter === 'confirmed') {
      if (order.orderStatus !== 'Confirmed') return false;
    } else if (scopeFilter === 'processing') {
      const isProc = order.orderStatus === 'Processing' || order.orderStatus === 'Packed' || order.orderStatus === 'Shipped' || order.orderStatus === 'Out for Delivery';
      if (!isProc) return false;
    } else if (scopeFilter === 'delivered') {
      if (order.orderStatus !== 'Delivered') return false;
    } else if (scopeFilter === 'cancelled') {
      if (order.orderStatus !== 'Cancelled') return false;
    } else if (scopeFilter === 'rejected') {
      const isRej = order.orderStatus === 'Cancelled' || order.orderStatus === 'Rejected' || order.paymentStatus === 'Rejected';
      if (!isRej) return false;
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
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerMobile.includes(searchQuery);

    // 3. Status filter
    const matchesStatus =
      statusFilter === 'all' ||
      order.orderStatus.toLowerCase() === statusFilter.toLowerCase() ||
      (statusFilter === 'rejected' && (order.orderStatus === 'Cancelled' || order.orderStatus === 'Rejected' || order.paymentStatus === 'Rejected'));

    // 4. Payment filter
    const matchesPayment =
      paymentFilter === 'all' || order.paymentMethod.toLowerCase() === paymentFilter.toLowerCase();

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
    return orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
    setStatusNote('');
    setErrorMessage(null);
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    // Strict rule: Order cancellation is NOT allowed if already Delivered
    if (selectedOrder.orderStatus === 'Delivered' && editingStatus === 'Cancelled') {
      setErrorMessage('Order cannot be cancelled because it has already been delivered to the customer.');
      return;
    }

    onUpdateOrderStatus(selectedOrder.id, editingStatus, courierName, trackingNumber);

    // Update local modal state with staff attribution
    setSelectedOrder({
      ...selectedOrder,
      orderStatus: editingStatus,
      courierName,
      trackingNumber,
      handledByStaffId: currentStaff?.id || selectedOrder.handledByStaffId,
      handledByStaffName: currentStaff?.name || selectedOrder.handledByStaffName,
      handledByStaffRole: currentStaff?.role || selectedOrder.handledByStaffRole,
    });
    setErrorMessage(null);
  };

  const getStatusPill = (status: OrderStatus) => {
    switch (status) {
      case 'Delivered':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Delivered</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">Cancelled</span>;
      case 'Shipped':
      case 'Out for Delivery':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800">{status}</span>;
      case 'Packed':
      case 'Processing':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">{status}</span>;
      case 'Payment Verification':
      case 'Pending':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">{status}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const countPending = orders.filter(
    (o) => o.orderStatus === 'Pending' || o.orderStatus === 'Payment Verification'
  ).length;
  const countConfirmed = orders.filter((o) => o.orderStatus === 'Confirmed').length;
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

  return (
    <div className="space-y-6">
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
              <p className="text-2xl font-black text-sky-300 mt-0.5">৳{myApprovedRevenue.toLocaleString()}</p>
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
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Scope Filters (All, Pending, Confirmed, Processing, Delivered, Rejected, Cancelled, My Orders) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {/* 1. All Orders */}
            <button
              onClick={() => setScopeFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                scopeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>All Orders</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  scopeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {orders.length}
              </span>
            </button>

            {/* 1.5. Rejected Orders Tab */}
            <button
              onClick={() => setScopeFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                scopeFilter === 'rejected'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Rejected</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  scopeFilter === 'rejected' ? 'bg-white/20 text-white' : 'bg-rose-200/80 text-rose-900'
                }`}
              >
                {countRejected}
              </span>
            </button>

            {/* 2. Pending Orders */}
            <button
              onClick={() => setScopeFilter('pending')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                scopeFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  scopeFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-200/80 text-amber-900'
                }`}
              >
                {countPending}
              </span>
            </button>

            {/* 3. Confirmed Orders */}
            <button
              onClick={() => setScopeFilter('confirmed')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                scopeFilter === 'confirmed'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
              }`}
            >
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>Confirmed</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  scopeFilter === 'confirmed' ? 'bg-white/20 text-white' : 'bg-teal-200/80 text-teal-900'
                }`}
              >
                {countConfirmed}
              </span>
            </button>

            {/* 4. Processing Orders */}
            <button
              onClick={() => setScopeFilter('processing')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                scopeFilter === 'processing'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Processing</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  scopeFilter === 'processing' ? 'bg-white/20 text-white' : 'bg-indigo-200/80 text-indigo-900'
                }`}
              >
                {countProcessing}
              </span>
            </button>

            {/* 5. Delivered Orders */}
            <button
              onClick={() => setScopeFilter('delivered')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                scopeFilter === 'delivered'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Delivered</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  scopeFilter === 'delivered' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-900'
                }`}
              >
                {countDelivered}
              </span>
            </button>

            {/* 6. Cancelled Orders */}
            {countCancelled > 0 && (
              <button
                onClick={() => setScopeFilter('cancelled')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  scopeFilter === 'cancelled'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelled</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    scopeFilter === 'cancelled' ? 'bg-white/20 text-white' : 'bg-rose-200/80 text-rose-900'
                  }`}
                >
                  {countCancelled}
                </span>
              </button>
            )}

            {/* 7. My Handled Orders */}
            {currentStaff && (
              <button
                onClick={() => setScopeFilter('my_orders')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  scopeFilter === 'my_orders'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>My Handled ({myModeratorOrders.length})</span>
              </button>
            )}
          </div>

          {/* New Order Creation Button for Admin, Moderator, Manager */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Manual Order</span>
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
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Filters - Kept strictly in one line */}
          <div className="flex items-center gap-2 overflow-x-auto shrink-0 pb-0.5 md:pb-0">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer shrink-0"
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
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer shrink-0"
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

      {/* 2. Orders Table / Mobile Card List */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        {/* Desktop Table (Unchanged) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4 min-w-[140px]">
                  <div className="flex items-center gap-1.5">
                    <span>Amount & Cost</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-tight">
                      🔒 Staff
                    </span>
                  </div>
                </th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No orders found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const orderCost = getOrderOriginalCost(order);
                  const profit = order.totalAmount - orderCost;
                  const { time, date } = formatOrderDateTime(order.createdAt);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={(e) => handleCopyOrderId(order.id, e)}
                          title="Click to copy Order ID"
                          className="font-mono font-bold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer text-left inline-flex items-center gap-1 focus:outline-hidden"
                        >
                          #{order.id}
                          {copiedOrderId === order.id && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 animate-pulse">
                              Copied!
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] whitespace-nowrap">
                        <div className="flex flex-col leading-tight">
                          <span className="font-bold text-slate-800 text-[11px]">{time}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{date}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{order.customerName}</p>
                        <p className="text-[11px] text-slate-400">{order.customerMobile}</p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] text-slate-400 font-medium">By:</span>
                          <span className="text-[10px] font-bold text-slate-700">
                            {order.createdByStaffName || 'Website Store'}
                          </span>
                          {order.createdByStaffRole && (
                            <span
                              className={`px-1.5 py-0.2 rounded-md text-[8px] font-extrabold uppercase tracking-tight ${
                                order.createdByStaffRole === 'super_admin'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : order.createdByStaffRole === 'manager'
                                  ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {order.createdByStaffRole === 'super_admin'
                                ? 'Super Admin'
                                : order.createdByStaffRole === 'manager'
                                ? 'Manager'
                                : 'Moderator'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {order.customerDivision || 'Dhaka'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} items
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 text-xs">
                              ৳{order.totalAmount.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                              Sell
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                            <span className="text-amber-800 font-bold" title="Original Cost Price">
                              Cost: ৳{orderCost.toLocaleString()}
                            </span>
                            <span
                              className={`text-[10px] font-bold ${
                                profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                              title="Estimated Margin"
                            >
                              ({profit >= 0 ? '+' : ''}৳{profit.toLocaleString()})
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-semibold text-slate-800">{order.paymentMethod}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              order.paymentStatus === 'Verified' || order.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusPill(order.orderStatus)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
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
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 border border-emerald-200"
                            title="Send WhatsApp Message to Customer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>
                          <button
                            onClick={() => openOrderDetails(order)}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => onPrintInvoice(order)}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 border border-sky-200/60"
                            title="Invoice / Download / Print"
                          >
                            <Printer className="w-3.5 h-3.5" />
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

        {/* Mobile Cards (Zero Horizontal Scrolling, Clean & Compact) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No orders found matching your search and filter criteria.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const orderCost = getOrderOriginalCost(order);
              const profit = order.totalAmount - orderCost;
              const { time, date } = formatOrderDateTime(order.createdAt);
              const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);

              return (
                <div key={order.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  {/* Row 1: Order ID + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => handleCopyOrderId(order.id, e)}
                        className="font-mono font-bold text-sky-700 text-xs flex items-center gap-1 truncate"
                      >
                        #{order.id}
                        {copiedOrderId === order.id && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                            Copied!
                          </span>
                        )}
                      </button>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {date} {time}
                      </span>
                    </div>
                    <div className="shrink-0">
                      {getStatusPill(order.orderStatus)}
                    </div>
                  </div>

                  {/* Row 2: Customer & Location Card */}
                  <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-slate-900 text-xs truncate">{order.customerName}</p>
                      <span className="text-[11px] text-slate-500 shrink-0">{order.customerDivision || 'Dhaka'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="font-medium text-slate-700">{order.customerMobile}</span>
                      <span className="text-[10px] text-slate-400 truncate">
                        By: <strong className="text-slate-700">{order.createdByStaffName || 'Store'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Row 3: Items, Amount & Payment */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 text-sm">৳{order.totalAmount.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500 font-medium">({totalItems} items)</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Cost: ৳{orderCost.toLocaleString()}{' '}
                        <span className={profit >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                          ({profit >= 0 ? '+' : ''}৳{profit.toLocaleString()})
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-semibold text-slate-800 block">{order.paymentMethod}</span>
                      <span
                        className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                          order.paymentStatus === 'Verified' || order.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Row 4: Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
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
                      className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1 border border-emerald-200"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                    <button
                      onClick={() => openOrderDetails(order)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center gap-1 border border-sky-100"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                    <button
                      onClick={() => onPrintInvoice(order)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1"
                      title="Print Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Invoice</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Comprehensive Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">Order #{selectedOrder.id}</h3>
                  {getStatusPill(selectedOrder.orderStatus)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-GB')}
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
                  <span>WhatsApp Message</span>
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
                  <div className="hidden sm:block overflow-x-auto">
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
                                <p className="font-bold text-slate-900">
                                  {item.productName || item.name || 'Item'}
                                </p>
                                {item.variantName && (
                                  <p className="text-[11px] text-slate-400">
                                    Variant: {item.variantName}
                                  </p>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                ৳{item.price.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right text-amber-800 font-bold">
                                ৳{itemCost.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold">{qty}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                ৳{lineSelling.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-amber-800">
                                <div>৳{lineCost.toLocaleString()}</div>
                                <span
                                  className={`text-[10px] block font-semibold ${
                                    lineMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {lineMargin >= 0 ? '+' : ''}৳{lineMargin.toLocaleString()}
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
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {item.productName || item.name || 'Item'}
                              </p>
                              {item.variantName && (
                                <p className="text-[11px] text-slate-400 truncate">
                                  Variant: {item.variantName}
                                </p>
                              )}
                            </div>
                            <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-xs shrink-0">
                              Qty: {qty}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-200/60">
                            <div>
                              <span className="text-slate-500 block">Unit: ৳{item.price.toLocaleString()}</span>
                              <span className="font-black text-slate-900 block">Total: ৳{lineSelling.toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-amber-800 font-semibold block">Cost: ৳{lineCost.toLocaleString()}</span>
                              <span className={`font-bold block ${lineMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                Margin: {lineMargin >= 0 ? '+' : ''}৳{lineMargin.toLocaleString()}
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
                            ৳{modalOrderCost.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Est. Net Profit:</span>
                          <span
                            className={`font-black ${
                              modalNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {modalNetProfit >= 0 ? '+' : ''}৳{modalNetProfit.toLocaleString()} ({modalProfitPercent}%)
                          </span>
                        </div>
                      </div>

                      {/* Customer Billing Summary */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal:</span>
                          <span className="font-medium">
                            ৳{selectedOrder.subtotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Delivery Charge:</span>
                          <span className="font-medium">
                            ৳{selectedOrder.deliveryCharge.toLocaleString()}
                          </span>
                        </div>
                        {selectedOrder.discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-600 font-medium">
                            <span>Coupon Discount ({selectedOrder.couponCode}):</span>
                            <span>-৳{selectedOrder.discountAmount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-black text-slate-900 text-sm pt-1.5 border-t border-slate-200">
                          <span>Grand Total:</span>
                          <span className="text-sky-700">
                            ৳{selectedOrder.totalAmount.toLocaleString()}
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

              {/* Update Status & Courier Form */}
              <form onSubmit={handleStatusSubmit} className="p-4 rounded-xl border-2 border-sky-100 bg-sky-50/40 space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-sky-600" />
                  Update Order & Courier Status
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Order Status
                    </label>
                    <select
                      value={editingStatus}
                      onChange={(e) => setEditingStatus(e.target.value as OrderStatus)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold text-slate-800"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Payment Verification">Payment Verification</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Processing">Processing</option>
                      <option value="Packed">Packed</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Courier Partner
                    </label>
                    <select
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                    >
                      <option value="Steadfast Courier">Steadfast Courier</option>
                      <option value="Pathao Courier">Pathao Courier</option>
                      <option value="RedX Logistics">RedX Logistics</option>
                      <option value="Sundarban Courier">Sundarban Courier</option>
                      <option value="eCourier">eCourier</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Consignment / Tracking ID
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. STF-893241"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Order Progression</span>
                  </button>
                </div>
              </form>
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
                                👉 Please send <strong>৳{calculateTotal().toLocaleString()}</strong> (Full Order Amount) to this number via Send Money.
                              </>
                            ) : (
                              <>
                                👉 Please send delivery charge <strong>৳{delivCharge.toLocaleString()}</strong> to this number via Send Money.
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
                      <strong>Cash on Delivery:</strong> No advance payment required. The customer will pay the full amount of ৳{calculateTotal().toLocaleString()} to the courier upon delivery.
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
                  <span className="font-bold">৳{calculateSubtotal().toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Delivery Charge:</span>
                  <span className="font-bold">৳{delivCharge.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2 text-emerald-400">
                    <span>Discount:</span>
                    <span className="font-bold">-৳{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm pt-1">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">Total Bill</span>
                    <span className="text-xl font-black text-white">৳{calculateTotal().toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 block font-bold">Advance Paid: ৳{calculateAdvancePaid().toLocaleString()}</span>
                    <span className="text-[10px] text-amber-300 block font-bold">Due Amount: ৳{calculateDueAmount().toLocaleString()}</span>
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
                      ? `Pay ৳${calculateTotal().toLocaleString()} & Create Order`
                      : paymentOptionType === 'delivery_only'
                      ? `Pay ৳${delivCharge.toLocaleString()} & Create Order`
                      : 'Create & Save Order'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
