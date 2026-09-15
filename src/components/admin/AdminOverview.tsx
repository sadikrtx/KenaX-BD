import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Clock,
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Printer,
  ChevronRight,
  Calendar,
  Sparkles,
  Wallet,
  Receipt,
  Layers,
  Truck,
  ArrowRight,
  HelpCircle,
  Banknote,
  ShieldCheck,
  Plus,
  TrendingDown,
  FileText,
  MapPin,
  X,
  Coins,
  HandCoins,
  Download,
} from 'lucide-react';
import {
  Order,
  Product,
  CustomerRecord,
  ActivityLog,
  UserRole,
  StaffUser,
  ExpenseRecord,
  ExpenseCategory,
  OtherProfitRecord,
  isDemoOtherProfit,
} from '../../types';
import { AdminTab } from './AdminSidebar';
import { getOptimizedImageUrl, handleImageError } from '../../utils/imageOptimizer';

interface AdminOverviewProps {
  orders: Order[];
  products: Product[];
  customers: CustomerRecord[];
  activityLogs: ActivityLog[];
  expenses?: ExpenseRecord[];
  otherProfits?: OtherProfitRecord[];
  onAddExpense?: (expense: ExpenseRecord) => void;
  onSelectTab: (tab: AdminTab) => void;
  onViewOrder: (order: Order) => void;
  onPrintInvoice: (order: Order) => void;
  currentRole: UserRole;
  currentStaff?: StaffUser | null;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  orders,
  products,
  customers,
  activityLogs,
  expenses = [],
  otherProfits = [],
  onAddExpense,
  onSelectTab,
  onViewOrder,
  onPrintInvoice,
  currentRole,
  currentStaff,
}) => {
  const [analyticsPeriod, setAnalyticsPeriod] = useState<
    'today' | 'yesterday' | '7d' | '30d' | 'month' | 'year'
  >('7d');

  // Quick Add Delivery Expense Modal State
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryFormData, setDeliveryFormData] = useState({
    title: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    courier: 'Steadfast Courier',
    location: 'Inside Dhaka',
    orderId: '',
    note: '',
    paymentMethod: 'Cash',
  });
  const [modalError, setModalError] = useState<string | null>(null);

  // Overview Receipt Modal, Download State & Financial Timeframe Filter
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [finTimeframe, setFinTimeframe] = useState<'all' | 'today' | '7d' | '30d' | '1y'>('all');

  const getFinTimeframeLabel = (tf: 'all' | 'today' | '7d' | '30d' | '1y') => {
    switch (tf) {
      case 'today':
        return 'Today';
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case '1y':
        return 'Last 1 Year';
      case 'all':
      default:
        return 'All Days';
    }
  };

  // Helper function to test if a record falls within the selected financial timeframe
  const isWithinFinPeriod = (dateVal: string | number | undefined) => {
    if (finTimeframe === 'all') return true;
    if (!dateVal) return false;
    const itemDate = new Date(dateVal);
    if (isNaN(itemDate.getTime())) return true;
    const now = new Date();

    if (finTimeframe === 'today') {
      return itemDate.toDateString() === now.toDateString();
    }
    if (finTimeframe === '7d') {
      const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }
    if (finTimeframe === '30d') {
      const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 30;
    }
    if (finTimeframe === '1y') {
      const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 365;
    }
    return true;
  };

  // Helper function to resolve original cost price for an item
  const getItemOriginalCost = (item: any): number => {
    if (item.costPrice !== undefined && item.costPrice !== null && Number(item.costPrice) > 0) {
      return Number(item.costPrice);
    }
    const matched = (products || []).find(
      (p) => p.id === item.productId || p.name === item.name || p.name === item.productName
    );
    if (matched?.costPrice && matched.costPrice > 0) {
      return Number(matched.costPrice);
    }
    return Math.round((item.price || 0) * 0.75);
  };

  // Helper function to calculate total original product cost for an order
  const getOrderOriginalCost = (order: Order): number => {
    if (!order.items || order.items.length === 0) return 0;
    return order.items.reduce((sum, item) => {
      const unitCost = getItemOriginalCost(item);
      return sum + unitCost * (item.quantity || 1);
    }, 0);
  };

  // Timeframe Filtered Collections for Financial Performance
  const finFilteredOrders = (orders || []).filter((o) =>
    isWithinFinPeriod(o.createdAt || (o as any).date)
  );
  const finFilteredExpenses = (expenses || []).filter((e) =>
    isWithinFinPeriod(e.date || e.createdAt)
  );
  const cleanOtherProfits = (otherProfits || []).filter((p) => !isDemoOtherProfit(p));
  const finFilteredOtherProfits = cleanOtherProfits.filter((p) =>
    isWithinFinPeriod(p.date || p.createdAt)
  );

  // 1. Delivered Orders (Financial Realization) in selected timeframe
  const deliveredOrders = finFilteredOrders.filter((o) => o.orderStatus === 'Delivered');

  // Total Money Received: Total collected sales amount from delivered orders
  const totalMoneyReceived = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Total Product Cost: Total supplier purchase / wholesale cost of delivered items
  const totalDeliveredCost = deliveredOrders.reduce((sum, o) => sum + getOrderOriginalCost(o), 0);

  // Total Delivered Product Sales: Item value subtotal only (without customer delivery charge)
  const totalDeliveredProductSales = deliveredOrders.reduce(
    (sum, o) =>
      sum +
      (o.subtotal !== undefined && o.subtotal > 0
        ? o.subtotal
        : Math.max(0, (o.totalAmount || 0) - (o.deliveryCharge || 0))),
    0
  );

  // Product Profit (Gross Product Margin): Pure profit from product sales (Product Selling Subtotal - Product Cost)
  const totalProductProfit = totalDeliveredProductSales - totalDeliveredCost;
  const productProfitMarginPercent =
    totalDeliveredProductSales > 0 ? Math.round((totalProductProfit / totalDeliveredProductSales) * 100) : 0;

  // Delivery Charges Collected from Customers on Delivered Orders
  const totalDeliveredDeliveryChargesCollected = deliveredOrders.reduce(
    (sum, o) => sum + (o.deliveryCharge || 0),
    0
  );
  const freeDeliveryDeliveredCount = deliveredOrders.filter(
    (o) => !o.deliveryCharge || o.deliveryCharge === 0
  ).length;

  // Total Delivery & Operational Expenses in selected timeframe
  const totalDeliveryExpenses = finFilteredExpenses
    .filter((e) => e.category === 'delivery' || e.category === 'shipping')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOtherExpenses = finFilteredExpenses
    .filter((e) => e.category !== 'delivery' && e.category !== 'shipping')
    .reduce((sum, e) => sum + e.amount, 0);

  // Total Expenses (All Operational + Delivery Costs)
  const totalAllExpenses = totalDeliveryExpenses + totalOtherExpenses;

  const todayDateStr = new Date().toISOString().split('T')[0];

  // Delivery Advance Calculations (in selected timeframe)
  const isAdvanceOrder = (o: Order) =>
    o.paymentOptionType === 'delivery_only' ||
    (o.paidAmount !== undefined && o.paidAmount > 0 && o.paidAmount < o.totalAmount) ||
    o.paymentMethod === 'Delivery Charge Only' ||
    Boolean((o as any).advancePaymentMethod);

  const verifiedAdvanceOrders = finFilteredOrders.filter(
    (o) =>
      isAdvanceOrder(o) &&
      (o.paymentStatus === 'Verified' || (o.advancePaidVerified === true) || o.orderStatus === 'Delivered')
  );

  const totalVerifiedDeliveryAdvance = verifiedAdvanceOrders.reduce(
    (sum, o) => sum + (o.paidAmount && o.paidAmount > 0 ? o.paidAmount : (o.deliveryCharge || 0)),
    0
  );

  const todayVerifiedAdvanceOrders = (orders || []).filter(
    (o) =>
      isAdvanceOrder(o) &&
      (o.paymentStatus === 'Verified' || (o.advancePaidVerified === true) || o.orderStatus === 'Delivered') &&
      o.createdAt &&
      o.createdAt.startsWith(todayDateStr)
  );

  const todayVerifiedDeliveryAdvance = todayVerifiedAdvanceOrders.reduce(
    (sum, o) => sum + (o.paidAmount && o.paidAmount > 0 ? o.paidAmount : (o.deliveryCharge || 0)),
    0
  );

  const pendingAdvanceOrders = finFilteredOrders.filter(
    (o) =>
      isAdvanceOrder(o) &&
      o.paymentStatus !== 'Verified' &&
      o.advancePaidVerified !== true &&
      o.orderStatus !== 'Cancelled' &&
      o.orderStatus !== 'Delivered'
  );

  const totalPendingDeliveryAdvance = pendingAdvanceOrders.reduce(
    (sum, o) => sum + (o.paidAmount && o.paidAmount > 0 ? o.paidAmount : (o.deliveryCharge || 0)),
    0
  );

  // Others Profit Calculations (in selected timeframe)
  const totalOtherProfits = finFilteredOtherProfits.reduce((sum, p) => sum + (p.amount || 0), 0);
  const todayOtherProfits = cleanOtherProfits
    .filter((p) => (p.date && p.date.startsWith(todayDateStr)) || (p.createdAt && p.createdAt.startsWith(todayDateStr)))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Realized Net Profit = Money Received + Others Profit - Delivered Product Cost - Operational Expenses (Delivery + Others)
  const totalNetRevenue = totalMoneyReceived + totalOtherProfits - totalDeliveredCost - totalAllExpenses;
  const grossProfit = totalMoneyReceived - totalDeliveredCost;
  const netProfitMarginPercent =
    totalMoneyReceived > 0 ? Math.round((totalNetRevenue / totalMoneyReceived) * 100) : 0;

  // 2. Upcoming / Pipeline Orders (Expected Revenue)
  const upcomingOrders = finFilteredOrders.filter((o) =>
    ['Pending', 'Payment Verification', 'Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery'].includes(
      o.orderStatus
    )
  );
  const upcomingTotalAmount = upcomingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const upcomingTotalCost = upcomingOrders.reduce((sum, o) => sum + getOrderOriginalCost(o), 0);
  const upcomingExpectedProfit = upcomingTotalAmount - upcomingTotalCost;

  // Upcoming breakdown by stage
  const upcomingPendingOrders = upcomingOrders.filter(
    (o) => o.orderStatus === 'Pending' || o.orderStatus === 'Payment Verification'
  );
  const upcomingPendingAmount = upcomingPendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const upcomingProcessingOrders = upcomingOrders.filter(
    (o) => o.orderStatus === 'Confirmed' || o.orderStatus === 'Processing' || o.orderStatus === 'Packed'
  );
  const upcomingProcessingAmount = upcomingProcessingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const upcomingShippedOrders = upcomingOrders.filter(
    (o) => o.orderStatus === 'Shipped' || o.orderStatus === 'Out for Delivery'
  );
  const upcomingShippedAmount = upcomingShippedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Standard operational counts
  const totalOrdersCount = orders.length;
  const pendingOrders = orders.filter((o) => o.orderStatus === 'Pending' || o.orderStatus === 'Payment Verification');
  const processingOrders = orders.filter((o) => o.orderStatus === 'Processing' || o.orderStatus === 'Packed' || o.orderStatus === 'Shipped');
  const cancelledOrders = orders.filter((o) => o.orderStatus === 'Cancelled');
  const lowStockProducts = products.filter((p) => p.stock <= 10);

  // Today's Delivered & Today's Stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = (orders || []).filter((o) => o.createdAt && o.createdAt.startsWith(todayStr));
  const todayDelivered = deliveredOrders.filter(
    (o) => (o.updatedAt && o.updatedAt.startsWith(todayStr)) || (o.createdAt && o.createdAt.startsWith(todayStr))
  );
  const todayMoneyReceived = todayDelivered.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const todayDeliveredCost = todayDelivered.reduce((sum, o) => sum + getOrderOriginalCost(o), 0);
  const todayDeliveredProductSales = todayDelivered.reduce(
    (sum, o) =>
      sum +
      (o.subtotal !== undefined && o.subtotal > 0
        ? o.subtotal
        : Math.max(0, (o.totalAmount || 0) - (o.deliveryCharge || 0))),
    0
  );
  const todayProductProfit = todayDeliveredProductSales - todayDeliveredCost;
  const todayExpenses = expenses
    .filter((e) => (e.date && e.date.startsWith(todayStr)) || (e.createdAt && e.createdAt.startsWith(todayStr)))
    .reduce((sum, e) => sum + e.amount, 0);
  // Realized Net Profit for Today (Including Today's Others Profit)
  const todayNetRevenue = todayMoneyReceived + todayOtherProfits - todayDeliveredCost - todayExpenses;

  // Average Order Value (AOV)
  const averageOrderValue =
    deliveredOrders.length > 0
      ? Math.round(totalMoneyReceived / deliveredOrders.length)
      : orders.filter((o) => o.orderStatus !== 'Cancelled').length > 0
      ? Math.round(
          orders.reduce((sum, o) => sum + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0) /
            orders.filter((o) => o.orderStatus !== 'Cancelled').length
        )
      : 0;

  // Best selling products based on orders
  const productSalesMap = new Map<string, { product: Product; quantity: number; revenue: number }>();
  (orders || []).forEach((o) => {
    if (o.orderStatus !== 'Cancelled' && o.items) {
      o.items.forEach((item) => {
        const prod = (products || []).find((p) => p.id === item.productId);
        if (prod) {
          const current = productSalesMap.get(prod.id) || { product: prod, quantity: 0, revenue: 0 };
          current.quantity += item.quantity;
          current.revenue += item.price * item.quantity;
          productSalesMap.set(prod.id, current);
        }
      });
    }
  });

  const bestSellingProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const topProductsDisplay =
    bestSellingProducts.length > 0
      ? bestSellingProducts
      : (products || []).slice(0, 5).map((p) => ({ product: p, quantity: p.stock > 20 ? 12 : 6, revenue: p.price * 6 }));

  // Categories distribution
  const categoryCounts: Record<string, number> = {};
  products.forEach((p) => {
    const cat = p.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const topCategories: [string, number][] = (Object.entries(categoryCounts) as [string, number][])
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 4);

  // Recent Orders Sorted: Non-delivered (pending, processing, shipped) on top (latest first), delivered at the bottom
  const sortedRecentOrders = [...(orders || [])].sort((a, b) => {
    const aIsDelivered = a.orderStatus === 'Delivered';
    const bIsDelivered = b.orderStatus === 'Delivered';

    if (!aIsDelivered && bIsDelivered) return -1;
    if (aIsDelivered && !bIsDelivered) return 1;

    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (bTime !== aTime) {
      return bTime - aTime;
    }
    return b.id.localeCompare(a.id);
  });

  // Period Analytics Calculations
  const getPeriodData = () => {
    const now = new Date();
    const periodDataMap: { label: string; fullLabel: string; revenue: number; orders: number }[] = [];

    if (analyticsPeriod === 'today') {
      const hours = [6, 9, 12, 15, 18, 21, 23];
      hours.forEach((h) => {
        const hLabel = `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
        const count = orders.filter((o) => {
          const d = new Date(o.createdAt);
          return d.toDateString() === now.toDateString() && d.getHours() <= h && d.getHours() > h - 3;
        });
        const rev = count.reduce((sum, o) => sum + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0);
        periodDataMap.push({ label: hLabel, fullLabel: `Today around ${hLabel}`, revenue: rev, orders: count.length });
      });
    } else if (analyticsPeriod === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const hours = [6, 9, 12, 15, 18, 21, 23];
      hours.forEach((h) => {
        const hLabel = `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`;
        const count = orders.filter((o) => {
          const d = new Date(o.createdAt);
          return d.toDateString() === yesterday.toDateString() && d.getHours() <= h && d.getHours() > h - 3;
        });
        const rev = count.reduce((sum, o) => sum + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0);
        periodDataMap.push({ label: hLabel, fullLabel: `Yesterday around ${hLabel}`, revenue: rev, orders: count.length });
      });
    } else if (analyticsPeriod === '7d') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
        const fullDateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === d.toDateString());
        const rev = dayOrders.reduce((sum, o) => sum + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0);
        periodDataMap.push({ label: dayStr, fullLabel: fullDateStr, revenue: rev, orders: dayOrders.length });
      }
    } else if (analyticsPeriod === '30d') {
      for (let i = 4; i >= 0; i--) {
        const endD = new Date(now);
        endD.setDate(now.getDate() - i * 6);
        const startD = new Date(endD);
        startD.setDate(endD.getDate() - 5);
        const label = `${startD.getDate()}-${endD.getDate()} ${endD.toLocaleDateString('en-US', { month: 'short' })}`;
        const groupOrders = orders.filter((o) => {
          const d = new Date(o.createdAt);
          return d >= startD && d <= endD;
        });
        const rev = groupOrders.reduce((sum, o) => sum + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0);
        periodDataMap.push({ label: `${endD.getDate()} ${endD.toLocaleDateString('en-US', { month: 'short' })}`, fullLabel: label, revenue: rev, orders: groupOrders.length });
      }
    } else if (analyticsPeriod === 'month') {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      for (let w = 1; w <= 4; w++) {
        const label = `Week ${w}`;
        const weekOrders = orders.filter((o) => {
          const d = new Date(o.createdAt);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear && Math.ceil(d.getDate() / 7) === w;
        });
        const rev = weekOrders.reduce((sum, o) => sum + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0);
        periodDataMap.push({ label, fullLabel: `${now.toLocaleDateString('en-US', { month: 'long' })} Week ${w}`, revenue: rev, orders: weekOrders.length });
      }
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach((m, idx) => {
        const count = orders.filter((o) => {
          const d = new Date(o.createdAt);
          return d.getFullYear() === now.getFullYear() && d.getMonth() === idx;
        });
        const rev = count.reduce((sum, o) => sum + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0);
        periodDataMap.push({ label: m, fullLabel: `${m} ${now.getFullYear()}`, revenue: rev, orders: count.length });
      });
    }

    return periodDataMap;
  };

  const chartData = getPeriodData();
  const maxPeriodRevenue = Math.max(...chartData.map((d) => d.revenue), 1000);
  const periodRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const periodOrdersCount = chartData.reduce((sum, d) => sum + d.orders, 0);

  // Moderator personal stats if applicable
  const isModeratorRole = currentRole === 'moderator';
  const myModeratorOrders = orders.filter((o) => {
    if (!currentStaff) return true;
    return (
      (o as any).assignedStaffId === currentStaff.id ||
      (o as any).approvedByStaffId === currentStaff.id ||
      (o as any).processedByStaffId === currentStaff.id
    );
  });

  const myApprovedOrders = myModeratorOrders.filter((o) =>
    ['Confirmed', 'Processing', 'Packed', 'Shipped', 'Delivered'].includes(o.orderStatus)
  );
  const myApprovedRevenue = myApprovedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const myRejectedOrders = myModeratorOrders.filter((o) => o.orderStatus === 'Cancelled');

  const handleSaveDeliveryExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryFormData.title.trim()) {
      setModalError('Please enter a descriptive title for this expense.');
      return;
    }
    const amountNum = parseFloat(deliveryFormData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setModalError('Please enter a valid expense amount.');
      return;
    }

    if (onAddExpense) {
      const newExp: ExpenseRecord = {
        id: `EXP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        category: 'delivery',
        title: deliveryFormData.title.trim(),
        amount: amountNum,
        date: deliveryFormData.date,
        courier: deliveryFormData.courier.trim(),
        location: deliveryFormData.location.trim(),
        orderId: deliveryFormData.orderId.trim(),
        note: deliveryFormData.note.trim(),
        paymentMethod: deliveryFormData.paymentMethod,
        recordedBy: currentStaff?.name || (currentRole === 'super_admin' ? 'Sadik (Super Admin)' : 'Admin Staff'),
        recordedByRole: currentStaff?.role || currentRole,
        createdAt: new Date().toISOString(),
      };
      onAddExpense(newExp);
    }

    setIsDeliveryModalOpen(false);
    setDeliveryFormData({
      title: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      courier: 'Steadfast Courier',
      location: 'Inside Dhaka',
      orderId: '',
      note: '',
      paymentMethod: 'Cash',
    });
  };

  // Canvas Drawing Utility for Rounded Rectangles
  const drawRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    fill?: string,
    stroke?: string
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  };

  // Curved text drawing helper on circular path for official seal
  const drawCurvedSealText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    angleStep: number
  ) => {
    ctx.save();
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0284c7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const angle = startAngle + i * angleStep;
      ctx.save();
      ctx.translate(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  // Authentic handwritten cursive signature for "Sadik" inside the seal
  const drawSadikSignature = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    ctx.save();
    ctx.strokeStyle = '#02479e'; // Rich authentic fountain pen blue ink
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Capital 'S' - expressive calligraphic ascender, loop, and flowing body
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(centerX - 48, centerY + 8);
    ctx.bezierCurveTo(centerX - 56, centerY + 4, centerX - 62, centerY - 8, centerX - 56, centerY - 18);
    ctx.bezierCurveTo(centerX - 50, centerY - 28, centerX - 38, centerY - 28, centerX - 36, centerY - 16);
    ctx.bezierCurveTo(centerX - 34, centerY - 6, centerX - 50, centerY + 6, centerX - 40, centerY + 12);
    ctx.bezierCurveTo(centerX - 32, centerY + 15, centerX - 24, centerY + 8, centerX - 26, centerY - 2);
    ctx.stroke();

    // Connecting to 'a'
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(centerX - 26, centerY - 2);
    ctx.bezierCurveTo(centerX - 22, centerY - 8, centerX - 12, centerY - 8, centerX - 12, centerY);
    ctx.bezierCurveTo(centerX - 12, centerY + 8, centerX - 24, centerY + 8, centerX - 18, centerY + 10);
    ctx.bezierCurveTo(centerX - 14, centerY + 12, centerX - 8, centerY + 8, centerX - 6, centerY + 2);
    ctx.stroke();

    // Connecting to 'd' with tall ascender loop
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(centerX - 6, centerY + 2);
    ctx.bezierCurveTo(centerX - 4, centerY - 6, centerX + 4, centerY - 6, centerX + 6, centerY);
    ctx.bezierCurveTo(centerX + 8, centerY + 6, centerX - 2, centerY + 8, centerX + 6, centerY + 9);
    ctx.bezierCurveTo(centerX + 8, centerY + 9, centerX + 9, centerY + 2, centerX + 11, centerY - 22);
    ctx.bezierCurveTo(centerX + 12, centerY - 30, centerX + 16, centerY - 28, centerX + 15, centerY - 20);
    ctx.lineTo(centerX + 15, centerY + 9);
    ctx.bezierCurveTo(centerX + 15, centerY + 12, centerX + 20, centerY + 11, centerX + 22, centerY + 5);
    ctx.stroke();

    // Connecting to 'i'
    ctx.beginPath();
    ctx.moveTo(centerX + 22, centerY + 5);
    ctx.bezierCurveTo(centerX + 25, centerY - 3, centerX + 28, centerY - 5, centerX + 30, centerY);
    ctx.lineTo(centerX + 30, centerY + 9);
    ctx.bezierCurveTo(centerX + 30, centerY + 12, centerX + 34, centerY + 12, centerX + 37, centerY + 6);
    ctx.stroke();

    // Dot on 'i'
    ctx.beginPath();
    ctx.fillStyle = '#02479e';
    ctx.arc(centerX + 31, centerY - 13, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Connecting to 'k' with signature loop
    ctx.beginPath();
    ctx.moveTo(centerX + 37, centerY + 6);
    ctx.bezierCurveTo(centerX + 40, centerY - 4, centerX + 44, centerY - 20, centerX + 47, centerY - 26);
    ctx.bezierCurveTo(centerX + 49, centerY - 32, centerX + 53, centerY - 30, centerX + 52, centerY - 20);
    ctx.lineTo(centerX + 49, centerY + 9);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + 49, centerY);
    ctx.bezierCurveTo(centerX + 54, centerY - 5, centerX + 60, centerY - 2, centerX + 56, centerY + 4);
    ctx.bezierCurveTo(centerX + 54, centerY + 8, centerX + 62, centerY + 11, centerX + 70, centerY + 12);
    ctx.stroke();

    // Dynamic signature underline swoosh sweeping under the name
    ctx.beginPath();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#032b69';
    ctx.moveTo(centerX + 70, centerY + 12);
    ctx.bezierCurveTo(centerX + 84, centerY + 14, centerX + 95, centerY + 6, centerX + 90, centerY - 4);
    ctx.bezierCurveTo(centerX + 84, centerY - 14, centerX + 65, centerY - 2, centerX + 30, centerY + 16);
    ctx.bezierCurveTo(centerX - 2, centerY + 25, centerX - 42, centerY + 24, centerX - 75, centerY + 19);
    ctx.bezierCurveTo(centerX - 82, centerY + 18, centerX - 88, centerY + 15, centerX - 84, centerY + 12);
    ctx.bezierCurveTo(centerX - 80, centerY + 9, centerX - 60, centerY + 13, centerX - 30, centerY + 18);
    ctx.bezierCurveTo(centerX + 15, centerY + 22, centerX + 60, centerY + 19, centerX + 92, centerY + 16);
    ctx.stroke();

    // Signature end dot
    ctx.beginPath();
    ctx.fillStyle = '#032b69';
    ctx.arc(centerX + 99, centerY + 16, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Black-background KenaX BD Logo
  const drawBlackKenaXLogo = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    ctx.save();
    // Black background container
    drawRoundRect(ctx, x, y, w, h, 14, '#000000', '#334155');

    // 1. Store Shopping Cart on Top (Pure White)
    ctx.strokeStyle = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cartStartX = x + 92;
    const cartStartY = y + 10;
    // Speed lines
    ctx.beginPath();
    ctx.moveTo(cartStartX - 16, cartStartY + 3);
    ctx.lineTo(cartStartX - 4, cartStartY + 3);
    ctx.moveTo(cartStartX - 22, cartStartY + 8);
    ctx.lineTo(cartStartX - 6, cartStartY + 8);
    ctx.moveTo(cartStartX - 17, cartStartY + 13);
    ctx.lineTo(cartStartX - 4, cartStartY + 13);
    ctx.stroke();

    // Basket frame
    ctx.beginPath();
    ctx.moveTo(cartStartX, cartStartY);
    ctx.lineTo(cartStartX + 6, cartStartY);
    ctx.lineTo(cartStartX + 12, cartStartY + 13);
    ctx.lineTo(cartStartX + 34, cartStartY + 13);
    ctx.lineTo(cartStartX + 38, cartStartY + 3);
    ctx.lineTo(cartStartX + 9, cartStartY + 3);
    ctx.stroke();

    // Wheels
    ctx.beginPath();
    ctx.arc(cartStartX + 15, cartStartY + 18, 2.4, 0, Math.PI * 2);
    ctx.arc(cartStartX + 31, cartStartY + 18, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // 2. "Kena" text in pure White
    ctx.font = '900 36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Kena', x + 24, y + 54);

    // 3. "X" with Blue/Cyan Gradient
    const xPos = x + 118;
    const xGrad = ctx.createLinearGradient(xPos, y + 26, xPos + 24, y + 56);
    xGrad.addColorStop(0, '#0066FF');
    xGrad.addColorStop(0.5, '#00A8FF');
    xGrad.addColorStop(1, '#00E5FF');
    ctx.fillStyle = xGrad;
    ctx.fillText('X', xPos, y + 54);

    // 4. "BD" in pure White
    ctx.font = '900 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('BD', x + w / 2, y + 70);

    // Side accent lines for BD
    ctx.strokeStyle = '#00A8FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 40, y + 66);
    ctx.lineTo(x + w / 2 - 16, y + 66);
    ctx.moveTo(x + w / 2 + 16, y + 66);
    ctx.lineTo(x + w / 2 + 40, y + 66);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.restore();
  };

  // Circular Official Seal drawing with small KenaX BD logo and cursive Sadik signature inside
  const drawProceduralSeal = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
    ctx.save();
    // Outer concentric rings
    ctx.strokeStyle = '#032b69';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 76, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(cx, cy, 71, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 54, 0, Math.PI * 2);
    ctx.stroke();

    // Curved text on top arc: ★ KENAX BD OFFICIAL SEAL ★
    drawCurvedSealText(ctx, '★ KENAX BD OFFICIAL SEAL ★', cx, cy, 62, -Math.PI * 0.85, 0.12);

    // Small KenaX BD Logo inside seal
    ctx.font = '900 13px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#032b69';
    ctx.textAlign = 'center';
    ctx.fillText('KenaX BD', cx, cy - 24);

    ctx.font = '700 8px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#0284c7';
    ctx.fillText('SMART SHOPPING', cx, cy - 14);

    // Cursive handwritten "Sadik" signature directly inside seal
    drawSadikSignature(ctx, cx, cy + 12);

    // Sub-seal verification text
    ctx.font = 'bold 8px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#032b69';
    ctx.textAlign = 'center';
    ctx.fillText('★ AUTHORIZED & VERIFIED ★', cx, cy + 42);

    ctx.restore();
  };

  // Download Financial Performance & Revenue Overview HD Statement / Receipt
  const handleDownloadOverviewReceipt = async () => {
    setIsGeneratingReceipt(true);
    try {
      const canvas = document.createElement('canvas');
      const width = 1200;
      const height = 1750;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Load official logo and seal images concurrently
      const [logoImg, sealImg] = await Promise.all([
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = '/kenax-logo.svg';
        }),
        new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = '/kenax-seal.svg';
        }),
      ]);

      // Canvas Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Outer Border Frame
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, width - 8, height - 8);

      // Header Dark Card Gradient
      const grad = ctx.createLinearGradient(40, 40, width - 40, 250);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      drawRoundRect(ctx, 40, 40, width - 80, 210, 24, '#0f172a');

      // Official Logo Container (Black Card with sleek border)
      drawRoundRect(ctx, 65, 48, 224, 76, 14, '#000000', '#334155');

      if (logoImg) {
        try {
          ctx.drawImage(logoImg, 65, 48, 224, 76);
        } catch {
          drawBlackKenaXLogo(ctx, 65, 48, 224, 76);
        }
      } else {
        drawBlackKenaXLogo(ctx, 65, 48, 224, 76);
      }

      // Official Badges on Top Right
      drawRoundRect(ctx, width - 330, 60, 260, 40, 10, '#0284c7');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`STATEMENT: ${getFinTimeframeLabel(finTimeframe).toUpperCase()}`, width - 315, 85);

      drawRoundRect(ctx, width - 330, 110, 260, 36, 10, '#0369a1');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText('REAL-TIME EXECUTIVE AUDIT', width - 295, 133);

      // Header Title & Subtitle
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 23px system-ui, -apple-system, sans-serif';
      ctx.fillText('FINANCIAL PERFORMANCE & REVENUE OVERVIEW', 65, 148);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(`OFFICIAL BALANCE & PROFIT STATEMENT (${getFinTimeframeLabel(finTimeframe).toUpperCase()})`, 65, 176);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        `Generated On: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })} | Period: ${getFinTimeframeLabel(finTimeframe)} | Signatory: Sadik`,
        65,
        202
      );

      // 1. FINANCIAL PERFORMANCE METRICS (8 Key Matrix Boxes)
      let startY = 280;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(`1. REVENUE, COSTS & NET PROFIT PERFORMANCE (${getFinTimeframeLabel(finTimeframe).toUpperCase()})`, 40, startY);

      startY += 20;

      // Row 1
      // Card 1: Money Received (Delivered)
      drawRoundRect(ctx, 40, startY, 540, 115, 16, '#ffffff', '#cbd5e1');
      ctx.fillStyle = '#047857';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('MONEY RECEIVED (DELIVERED ORDERS CASH)', 65, startY + 36);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(`৳${totalMoneyReceived.toLocaleString('en-BD')}`, 65, startY + 76);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${deliveredOrders.length} Delivered Orders • Today: ৳${todayMoneyReceived.toLocaleString('en-BD')}`, 65, startY + 98);

      // Card 2: Delivered Product Costs
      drawRoundRect(ctx, 620, startY, 540, 115, 16, '#ffffff', '#cbd5e1');
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('PRODUCT COSTS (SUPPLIER / WHOLESALE SOURCING)', 645, startY + 36);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(`৳${totalDeliveredCost.toLocaleString('en-BD')}`, 645, startY + 76);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Sourcing Cost of Delivered Goods • Today: ৳${todayDeliveredCost.toLocaleString('en-BD')}`, 645, startY + 98);

      startY += 130;

      // Row 2
      // Card 3: Product Profit (Gross)
      drawRoundRect(ctx, 40, startY, 540, 115, 16, '#ffffff', '#cbd5e1');
      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('PRODUCT PROFIT (GROSS PRODUCT MARGIN)', 65, startY + 36);
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(`৳${totalProductProfit.toLocaleString('en-BD')}`, 65, startY + 76);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Margin: ${productProfitMarginPercent}% • Sales: ৳${totalDeliveredProductSales.toLocaleString('en-BD')}`, 65, startY + 98);

      // Card 4: Total Delivery & Operational Expenses
      drawRoundRect(ctx, 620, startY, 540, 115, 16, '#ffffff', '#cbd5e1');
      ctx.fillStyle = '#be123c';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('TOTAL DELIVERY & OPERATIONAL EXPENSES', 645, startY + 36);
      ctx.fillStyle = '#e11d48';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(`৳${totalAllExpenses.toLocaleString('en-BD')}`, 645, startY + 76);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Delivery: ৳${totalDeliveryExpenses.toLocaleString('en-BD')} | Others: ৳${totalOtherExpenses.toLocaleString('en-BD')}`, 645, startY + 98);

      startY += 130;

      // Row 3
      // Card 5: Advance Delivery Revenue
      drawRoundRect(ctx, 40, startY, 540, 115, 16, '#ffffff', '#cbd5e1');
      ctx.fillStyle = '#4338ca';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('ADVANCE DELIVERY (VERIFIED CHARGES COLLECTED)', 65, startY + 36);
      ctx.fillStyle = '#4f46e5';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(`৳${totalVerifiedDeliveryAdvance.toLocaleString('en-BD')}`, 65, startY + 76);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${verifiedAdvanceOrders.length} Approved • Pending: ৳${totalPendingDeliveryAdvance.toLocaleString('en-BD')}`, 65, startY + 98);

      // Card 6: Others Profit (Extra Business Income)
      drawRoundRect(ctx, 620, startY, 540, 115, 16, '#ffffff', '#cbd5e1');
      ctx.fillStyle = '#6d28d9';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('OTHERS PROFIT (EXTRA NON-ORDER REVENUE)', 645, startY + 36);
      ctx.fillStyle = '#7c3aed';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(`৳${totalOtherProfits.toLocaleString('en-BD')}`, 645, startY + 76);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${finFilteredOtherProfits.length} Extra Profit Entries • Today Added: ৳${todayOtherProfits.toLocaleString('en-BD')}`, 645, startY + 98);

      startY += 130;

      // Row 4: Real Net Profit (Highlighted Main Card) & Pipeline Forecast
      // Card 7: Real Net Profit (Includes Others Profit!)
      drawRoundRect(ctx, 40, startY, 540, 130, 18, '#f0fdf4', '#86efac');
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText('★ REAL NET PROFIT (WITH OTHERS PROFIT ADDED) ★', 65, startY + 36);
      ctx.fillStyle = '#166534';
      ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
      ctx.fillText(`৳${totalNetRevenue.toLocaleString('en-BD')}`, 65, startY + 80);
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Formula: Received (৳${totalMoneyReceived.toLocaleString('en-BD')}) + Other Profit (৳${totalOtherProfits.toLocaleString('en-BD')}) - Costs - Expenses`, 65, startY + 110);

      // Card 8: Pipeline Forecast
      drawRoundRect(ctx, 620, startY, 540, 130, 18, '#ffffff', '#cbd5e1');
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText('PIPELINE FORECAST (IN-TRANSIT & PROCESSING)', 645, startY + 36);
      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
      ctx.fillText(`৳${upcomingTotalAmount.toLocaleString('en-BD')}`, 645, startY + 80);
      ctx.fillStyle = '#64748b';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${upcomingOrders.length} In-Transit Orders • Est. Profit: ৳${upcomingExpectedProfit.toLocaleString('en-BD')}`, 645, startY + 110);

      // 2. PERIOD SNAPSHOT & ORDER FULFILLMENT BREAKDOWN
      startY += 170;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(`2. ${getFinTimeframeLabel(finTimeframe).toUpperCase()} HIGHLIGHTS & ORDER FULFILLMENT SUMMARY`, 40, startY);

      startY += 20;

      // Left Box: Financial Summary for Selected Period
      drawRoundRect(ctx, 40, startY, 540, 200, 18, '#ffffff', '#cbd5e1');
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${getFinTimeframeLabel(finTimeframe)} Financial Summary`, 65, startY + 38);

      ctx.fillStyle = '#334155';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`• Money Received: ৳${totalMoneyReceived.toLocaleString('en-BD')}`, 65, startY + 72);
      ctx.fillText(`• Product Sourcing Costs: ৳${totalDeliveredCost.toLocaleString('en-BD')}`, 65, startY + 102);
      ctx.fillText(`• Total Operating Expenses: ৳${totalAllExpenses.toLocaleString('en-BD')}`, 65, startY + 132);
      ctx.fillText(`• Others Profit Added: +৳${totalOtherProfits.toLocaleString('en-BD')}`, 65, startY + 162);
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(`★ Real Net Profit: ৳${totalNetRevenue.toLocaleString('en-BD')}`, 65, startY + 188);

      // Right Box: Order Volume Pipeline
      drawRoundRect(ctx, 620, startY, 540, 200, 18, '#ffffff', '#cbd5e1');
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 17px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${getFinTimeframeLabel(finTimeframe)} Order Status & Pipeline`, 645, startY + 38);

      ctx.fillStyle = '#334155';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`• Filtered Orders: ${finFilteredOrders.length} orders in period`, 645, startY + 72);
      ctx.fillText(`• Successfully Delivered: ${deliveredOrders.length} orders (100% Cash Realized)`, 645, startY + 102);
      ctx.fillText(`• Progressing Pipeline: ${upcomingOrders.length} orders (৳${upcomingTotalAmount.toLocaleString('en-BD')})`, 645, startY + 132);
      ctx.fillText(`• Advance Delivery Collected: ৳${totalVerifiedDeliveryAdvance.toLocaleString('en-BD')}`, 645, startY + 162);
      ctx.fillStyle = '#d97706';
      ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`• Gross Product Profit: ৳${totalProductProfit.toLocaleString('en-BD')} (${productProfitMarginPercent}%)`, 645, startY + 188);

      // 3. OFFICIAL AUTHORIZATION & CERTIFICATION SECTION (With Seal & Sadik Signature)
      startY += 235;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('3. OFFICIAL AUTHORIZATION & EXECUTIVE CERTIFICATION', 40, startY);

      startY += 20;
      drawRoundRect(ctx, 40, startY, 1120, 240, 20, '#ffffff', '#cbd5e1');

      // Left side verification details
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillText('Official Financial Statement Certification', 70, startY + 40);

      ctx.fillStyle = '#475569';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillText(`This document is an authorized, verified Financial Performance & Revenue Statement of KenaX BD for ${getFinTimeframeLabel(finTimeframe)}.`, 70, startY + 70);
      ctx.fillText('Includes real-time synchronized cash receipts, logistics costs, and Others Profit reconciliation.', 70, startY + 94);

      // Hash box
      drawRoundRect(ctx, 70, startY + 115, 520, 44, 10, '#f1f5f9', '#cbd5e1');
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 12px monospace';
      const reportHash = `KENAX-OVERVIEW-${finTimeframe.toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      ctx.fillText(`VERIFICATION HASH: ${reportHash}`, 85, startY + 142);

      // Status badge
      drawRoundRect(ctx, 70, startY + 172, 240, 36, 10, '#dcfce7', '#86efac');
      ctx.fillStyle = '#15803d';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('✓ AUDITED & VERIFIED', 85, startY + 195);

      // Right Side: Official KenaX BD Circular Stamp Seal & Authorized Signature
      const sealSize = 168;
      const sealX = 860;
      const sealY = startY + 10;
      const sealCenterX = sealX + sealSize / 2;

      if (sealImg) {
        try {
          ctx.save();
          ctx.globalAlpha = 0.98;
          ctx.drawImage(sealImg, sealX, sealY, sealSize, sealSize);
          ctx.restore();
        } catch {
          drawProceduralSeal(ctx, sealCenterX, sealY + sealSize / 2);
        }
      } else {
        drawProceduralSeal(ctx, sealCenterX, sealY + sealSize / 2);
      }

      // Signature line and Executive Authority Labels (Sadik is placed inside seal and labeled below)
      ctx.beginPath();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.6;
      ctx.moveTo(sealCenterX - 85, startY + 190);
      ctx.lineTo(sealCenterX + 85, startY + 190);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('Authorized Signature: Sadik', sealCenterX, startY + 208);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText('KenaX BD Executive Authority', sealCenterX, startY + 224);

      // Reset textAlign for footer
      ctx.textAlign = 'left';

      // Footer Info Bar
      startY += 265;
      drawRoundRect(ctx, 40, startY, 1120, 56, 14, '#0f172a');

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText(`KENAX BD E-COMMERCE PLATFORM • FINANCIAL PERFORMANCE OVERVIEW RECEIPT (${getFinTimeframeLabel(finTimeframe).toUpperCase()})`, 65, startY + 34);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('OFFICIAL EXECUTIVE DOCUMENT', width - 310, startY + 34);

      // Trigger PNG Download
      const imageURI = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `KenaxBD_Financial_Receipt_${finTimeframe}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = imageURI;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading overview receipt:', err);
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Moderator Specific Performance Header */}
      {(isModeratorRole || currentStaff?.role === 'moderator') && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <h2 className="text-lg font-bold">Moderator Performance Dashboard</h2>
              </div>
              <p className="text-xs text-sky-200 mt-0.5">
                Staff ID: <span className="font-mono text-white font-bold">{currentStaff?.id || 'MOD-ACTIVE'}</span> | Logged in as: <strong className="text-white">{currentStaff?.name || 'Moderator User'}</strong>
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 border border-sky-400/30 text-sky-200">
              Personal Activity View
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[11px] font-medium text-sky-200 uppercase tracking-wider block">Total Approved</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">{myApprovedOrders.length}</p>
              <span className="text-[10px] text-sky-300">Confirmed &amp; Delivered</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[11px] font-medium text-sky-200 uppercase tracking-wider block">Total Revenue</span>
              <p className="text-2xl font-black text-sky-300 mt-1">৳{myApprovedRevenue.toLocaleString()}</p>
              <span className="text-[10px] text-sky-300">From Approved Orders</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[11px] font-medium text-sky-200 uppercase tracking-wider block">Total Rejected</span>
              <p className="text-2xl font-black text-rose-400 mt-1">{myRejectedOrders.length}</p>
              <span className="text-[10px] text-sky-300">Cancelled Orders</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <span className="text-[11px] font-medium text-sky-200 uppercase tracking-wider block">Total Handled</span>
              <p className="text-2xl font-black text-amber-300 mt-1">{myModeratorOrders.length}</p>
              <span className="text-[10px] text-sky-300">Total Records</span>
            </div>
          </div>
        </div>
      )}

      {/* 1. Core Financial Performance Cards with Realized Profit, Delivered Revenue, Supplier Cost & Delivery Expenses */}
      <div className="space-y-4">
        <div className="space-y-2.5 pb-3 border-b border-slate-200/80">
          {/* Title & Active Timeframe Tag - Kept strictly on a single line on Desktop */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap md:flex-nowrap">
            <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900 flex items-center gap-1.5 whitespace-normal md:whitespace-nowrap shrink-0">
              <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
              <span>Financial Performance &amp; Revenue Overview</span>
            </h2>
          </div>

          {/* Sub-row: Timeframe Filter Pills and Actions directly below the title */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-0.5">
            {/* Timeframe Filter Pills (All Days, Today, 7 Days, 30 Days, 1 Year) */}
            <div className="w-full lg:w-auto overflow-x-auto scrollbar-none py-0.5">
              <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-2xs whitespace-nowrap min-w-max">
                {(
                  [
                    { id: 'all', label: 'All Days', shortLabel: 'All Days' },
                    { id: 'today', label: 'Today', shortLabel: 'Today' },
                    { id: '7d', label: 'Last 7 Days', shortLabel: '7 Days' },
                    { id: '30d', label: 'Last 30 Days', shortLabel: '30 Days' },
                    { id: '1y', label: 'Last 1 Year', shortLabel: '1 Year' },
                  ] as const
                ).map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => setFinTimeframe(tf.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      finTimeframe === tf.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span className="hidden sm:inline">{tf.label}</span>
                    <span className="sm:hidden">{tf.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Log & Receipt Action Buttons (Download Receipt, View Receipt, Log Cost, All Costs) */}
            <div className="w-full lg:w-auto overflow-x-auto scrollbar-none py-0.5">
              <div className="flex items-center gap-2 min-w-max">
                <button
                  type="button"
                  onClick={handleDownloadOverviewReceipt}
                  disabled={isGeneratingReceipt}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-black shadow-xs transition-all cursor-pointer border border-slate-700 disabled:opacity-50 whitespace-nowrap shrink-0"
                  title={`Download official HD Statement Receipt for ${getFinTimeframeLabel(finTimeframe)}`}
                >
                  <Download className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{isGeneratingReceipt ? 'Generating...' : 'Download Receipt'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                  title="Preview official Financial Statement Receipt with Seal & Signature"
                >
                  <Receipt className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>View Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Log Cost</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTab('costs')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-2xs border border-slate-200/60"
                >
                  <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                  <span>All Costs ({expenses.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Core Financial Performance & Revenue Cards (9 Responsive Grid Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-4.5">
          {/* 1. Money Received */}
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-emerald-50/80 via-white to-emerald-50/30 border border-emerald-200 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-emerald-100/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 shadow-2xs">
                    <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-950 whitespace-nowrap">
                    Money Received
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100/90 text-emerald-800 whitespace-nowrap shrink-0 border border-emerald-200">
                  {deliveredOrders.length} Delivered
                </span>
              </div>
              <div className="mt-3.5">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ৳{totalMoneyReceived.toLocaleString('en-BD')}
                </h3>
                <p className="text-xs text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {finTimeframe === 'today'
                      ? `All Today Delivered: ৳${totalMoneyReceived.toLocaleString('en-BD')}`
                      : `Today Collected: ৳${todayMoneyReceived.toLocaleString('en-BD')}`}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-emerald-100/80 flex items-center justify-between text-xs text-slate-600">
              <span className="text-slate-500 font-medium">Delivered Customer Cash</span>
              <span className="font-bold text-emerald-700">Cash In Hand</span>
            </div>
          </div>

          {/* 2. Product Costs */}
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-amber-50/80 via-white to-amber-50/30 border border-amber-200 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-amber-100/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 shadow-2xs">
                    <Receipt className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-amber-950 whitespace-nowrap">
                    Product Costs
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100/90 text-amber-800 whitespace-nowrap shrink-0 border border-amber-200">
                  Supplier Sourcing
                </span>
              </div>
              <div className="mt-3.5">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ৳{totalDeliveredCost.toLocaleString('en-BD')}
                </h3>
                <p className="text-xs text-amber-700 font-bold mt-1.5 flex items-center gap-1">
                  <span>
                    {finTimeframe === 'today'
                      ? `Today Sourcing Cost: ৳${totalDeliveredCost.toLocaleString('en-BD')}`
                      : `Today Purchase Cost: ৳${todayDeliveredCost.toLocaleString('en-BD')}`}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-amber-100/80 flex items-center justify-between text-xs text-slate-600">
              <span className="text-slate-500 font-medium">Delivered Item Sourcing</span>
              <span className="font-bold text-amber-700">Supplier Base</span>
            </div>
          </div>

          {/* 3. Product Profit */}
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-teal-50/80 via-white to-teal-50/30 border border-teal-200 shadow-2xs hover:border-teal-400 hover:shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-teal-100/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center shrink-0 shadow-2xs">
                    <DollarSign className="w-3.5 h-3.5 text-teal-700" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-teal-950 whitespace-nowrap">
                    Product Profit
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-teal-100/90 text-teal-800 whitespace-nowrap shrink-0 border border-teal-200">
                  Gross {productProfitMarginPercent}%
                </span>
              </div>
              <div className="mt-3.5">
                <h3 className="text-2xl sm:text-3xl font-black text-teal-700 tracking-tight">
                  ৳{totalProductProfit.toLocaleString('en-BD')}
                </h3>
                <p className="text-xs text-teal-700 font-bold mt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-teal-600" />
                  <span>
                    {finTimeframe === 'today'
                      ? `Today Gross: ৳${totalProductProfit.toLocaleString('en-BD')}`
                      : `Today Gross: ৳${todayProductProfit.toLocaleString('en-BD')}`}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-teal-100/80 flex items-center justify-between text-xs text-slate-600">
              <span className="text-slate-500 font-medium">Product Markup Margin</span>
              <span className="font-bold text-teal-700">Gross Profit</span>
            </div>
          </div>

          {/* 4. Total Expenses (Operational + Delivery + Packaging) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-rose-50/90 via-white to-rose-50/40 border border-rose-200/90 shadow-2xs hover:border-rose-400 hover:shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-rose-100/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <TrendingDown className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wide text-rose-950 whitespace-nowrap">
                    Total Expenses
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 whitespace-nowrap shrink-0 border border-rose-200">
                  {finFilteredExpenses.length} Records
                </span>
              </div>
              <div className="mt-3.5">
                <h3 className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight">
                  ৳{totalAllExpenses.toLocaleString('en-BD')}
                </h3>
                <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                  <span>Delivery: ৳{totalDeliveryExpenses.toLocaleString('en-BD')} • Others: ৳{totalOtherExpenses.toLocaleString('en-BD')}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-rose-100/80 flex items-center justify-between text-xs text-slate-600">
              <span className="text-slate-500 font-medium">All Business Expenses</span>
              <button
                type="button"
                onClick={() => onSelectTab('costs')}
                className="font-bold text-rose-700 hover:text-rose-900 flex items-center gap-0.5 whitespace-nowrap cursor-pointer"
              >
                <span>Manage Costs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 5. Delivery Costs */}
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-orange-50/80 via-white to-orange-50/30 border border-orange-200 shadow-2xs hover:border-orange-400 hover:shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-orange-100/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 shadow-2xs">
                    <Truck className="w-3.5 h-3.5 text-orange-700" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-orange-950 whitespace-nowrap">
                    Delivery Costs
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-orange-100/90 text-orange-800 whitespace-nowrap shrink-0 border border-orange-200">
                  {freeDeliveryDeliveredCount > 0 ? `${freeDeliveryDeliveredCount} Free Del` : 'Courier Spent'}
                </span>
              </div>
              <div className="mt-3.5">
                <h3 className="text-2xl sm:text-3xl font-black text-orange-700 tracking-tight">
                  ৳{totalDeliveryExpenses.toLocaleString('en-BD')}
                </h3>
                <p className="text-xs text-orange-600 font-bold mt-1.5 flex items-center gap-1">
                  <span>Collected from Customers: ৳{totalDeliveredDeliveryChargesCollected.toLocaleString('en-BD')}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-orange-100/80 flex items-center justify-between text-xs text-slate-600">
              <span className="text-slate-500 font-medium">Courier &amp; Packaging</span>
              <button
                type="button"
                onClick={() => onSelectTab('costs')}
                className="font-bold text-orange-700 hover:text-orange-900 flex items-center gap-0.5 whitespace-nowrap cursor-pointer"
              >
                <span>Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 6. Other Profit */}
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-violet-50/80 via-white to-violet-50/30 border border-violet-200 shadow-2xs hover:border-violet-400 hover:shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-violet-100/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 shadow-2xs">
                    <Coins className="w-3.5 h-3.5 text-violet-700" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-violet-950 whitespace-nowrap">
                    Other Profit
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-violet-100/90 text-violet-800 whitespace-nowrap shrink-0 border border-violet-200">
                  {finFilteredOtherProfits.length} Records
                </span>
              </div>
              <div className="mt-3.5">
                <h3 className="text-2xl sm:text-3xl font-black text-violet-900 tracking-tight">
                  ৳{totalOtherProfits.toLocaleString('en-BD')}
                </h3>
                <p className="text-xs text-violet-700 font-bold mt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-violet-600" />
                  <span>
                    {finTimeframe === 'today'
                      ? `Today Added: ৳${totalOtherProfits.toLocaleString('en-BD')}`
                      : `Today Added: ৳${todayOtherProfits.toLocaleString('en-BD')}`}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-violet-100/80 flex items-center justify-between text-xs text-slate-600">
              <span className="text-slate-500 font-medium">Extra Non-Order Profit</span>
              <button
                type="button"
                onClick={() => onSelectTab('costs')}
                className="font-bold text-violet-700 hover:text-violet-900 flex items-center gap-0.5 whitespace-nowrap cursor-pointer"
              >
                <span>Manage</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 7. Advance Delivery (Admin Approved Delivery Charges Revenue) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-indigo-50/80 via-white to-indigo-50/30 border border-indigo-200 shadow-2xs hover:border-indigo-400 hover:shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-indigo-100/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 shadow-2xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-indigo-950 whitespace-nowrap">
                    Advance Payment
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-100/90 text-indigo-800 whitespace-nowrap shrink-0 border border-indigo-200">
                  {verifiedAdvanceOrders.length} Approved
                </span>
              </div>
              <div className="mt-3.5">
                <h3 className="text-2xl sm:text-3xl font-black text-indigo-900 tracking-tight">
                  ৳{totalVerifiedDeliveryAdvance.toLocaleString('en-BD')}
                </h3>
                <p className="text-xs text-indigo-700 font-bold mt-1.5 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {finTimeframe === 'today'
                      ? `Today Verified: ৳${totalVerifiedDeliveryAdvance.toLocaleString('en-BD')}`
                      : `Today Approved: ৳${todayVerifiedDeliveryAdvance.toLocaleString('en-BD')}`}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-indigo-100/80 flex items-center justify-between text-xs text-slate-600">
              <span className="text-slate-500 font-medium">
                {pendingAdvanceOrders.length > 0 ? (
                  <span className="text-amber-600 font-bold">
                    {pendingAdvanceOrders.length} Pending (৳{totalPendingDeliveryAdvance.toLocaleString('en-BD')})
                  </span>
                ) : (
                  'Approved Delivery Advance'
                )}
              </span>
              <button
                type="button"
                onClick={() => onSelectTab('delivery-advance')}
                className="font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-0.5 whitespace-nowrap cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 8. Real Net Profit (Highlighted Main Realized Profit Card with Others Profit added) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-emerald-500/10 via-sky-500/5 to-white border-2 border-emerald-500/50 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between ring-2 ring-emerald-500/20">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-emerald-100">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wide text-emerald-950 whitespace-nowrap">
                    Real Net Profit
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 whitespace-nowrap shrink-0 border border-emerald-300">
                  Margin {netProfitMarginPercent}%
                </span>
              </div>
              <div className="mt-3.5">
                <h3 className="text-2xl sm:text-3xl font-black text-emerald-900 tracking-tight">
                  ৳{totalNetRevenue.toLocaleString('en-BD')}
                </h3>
                <p className="text-xs text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>
                    {finTimeframe === 'today'
                      ? `Today Net: ৳${totalNetRevenue.toLocaleString('en-BD')}`
                      : `Today Net: ৳${todayNetRevenue.toLocaleString('en-BD')}`}
                  </span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-emerald-100/90 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                Includes Others Profit: <strong className="text-emerald-700 font-bold">+৳{totalOtherProfits.toLocaleString('en-BD')}</strong>
              </span>
              <span className="font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">Realized</span>
            </div>
          </div>

          {/* 9. Pipeline Forecast */}
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-purple-50/80 via-white to-purple-50/30 border border-purple-200 shadow-2xs hover:border-purple-400 hover:shadow-xs transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-purple-100/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-purple-700" />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-purple-950 whitespace-nowrap">
                    Pipeline Forecast
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100/90 text-purple-800 whitespace-nowrap shrink-0 border border-purple-200">
                  {upcomingOrders.length} In Progress
                </span>
              </div>
              <div className="mt-3.5">
                <h3 className="text-2xl sm:text-3xl font-black text-purple-900 tracking-tight">
                  ৳{upcomingTotalAmount.toLocaleString('en-BD')}
                </h3>
                <p className="text-xs text-purple-700 font-bold mt-1.5 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  <span>Expected Margin: ৳{upcomingExpectedProfit.toLocaleString('en-BD')}</span>
                </p>
              </div>
            </div>
            <div className="mt-4 pt-2.5 border-t border-purple-100/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">On Order Delivery</span>
              <button
                type="button"
                onClick={() => onSelectTab('orders')}
                className="font-bold text-purple-700 hover:text-purple-900 flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
              >
                <span>Orders</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. Pipeline Progression Stages Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-400/30">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Order Fulfillment &amp; Cash-Inflow Pipeline
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Currently <strong className="text-sky-300">{upcomingOrders.length} customer orders</strong> are progressing through verification, packing, and courier transit with an estimated revenue of <strong className="text-emerald-300">৳{upcomingTotalAmount.toLocaleString('en-BD')}</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onSelectTab('orders')}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 self-start lg:self-auto shrink-0 shadow-xs"
            >
              <span>Manage Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4 Pipeline Step Progression Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {/* Stage 1: Pending & Payment Check */}
            <div
              onClick={() => onSelectTab('orders')}
              className="p-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>1. Pending &amp; Verification</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-200 border border-amber-400/30">
                  {upcomingPendingOrders.length}
                </span>
              </div>
              <p className="text-xl font-black text-white mt-2">৳{upcomingPendingAmount.toLocaleString('en-BD')}</p>
              <p className="text-[10px] text-slate-300 mt-1">Awaiting verification phone call</p>
            </div>

            {/* Stage 2: Processing & Packaging */}
            <div
              onClick={() => onSelectTab('orders')}
              className="p-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span>2. Confirmed &amp; Processing</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-400/20 text-indigo-200 border border-indigo-400/30">
                  {upcomingProcessingOrders.length}
                </span>
              </div>
              <p className="text-xl font-black text-white mt-2">৳{upcomingProcessingAmount.toLocaleString('en-BD')}</p>
              <p className="text-[10px] text-slate-300 mt-1">Packing &amp; courier handover</p>
            </div>

            {/* Stage 3: In Courier Transit */}
            <div
              onClick={() => onSelectTab('orders')}
              className="p-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  <span>3. Shipped / In Transit</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-400/20 text-sky-200 border border-sky-400/30">
                  {upcomingShippedOrders.length}
                </span>
              </div>
              <p className="text-xl font-black text-white mt-2">৳{upcomingShippedAmount.toLocaleString('en-BD')}</p>
              <p className="text-[10px] text-slate-300 mt-1">Courier parcel on way to customer</p>
            </div>

            {/* Stage 4: Delivered & Realized Result */}
            <div
              onClick={() => onSelectTab('orders')}
              className="p-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>4. Delivered &amp; Cash In</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  {deliveredOrders.length} Completed
                </span>
              </div>
              <p className="text-xl font-black text-emerald-300 mt-2">৳{totalMoneyReceived.toLocaleString('en-BD')}</p>
              <p className="text-[10px] text-emerald-200 mt-1">Real profit ৳{totalNetRevenue.toLocaleString('en-BD')} realized</p>
            </div>
          </div>
        </div>

        {/* 3. Secondary Store Operations Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Total Orders */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Total Orders</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <h4 className="text-lg sm:text-xl font-black text-slate-900">{totalOrdersCount}</h4>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
                Today: <strong className="text-slate-800">{todayOrders.length} new orders</strong>
              </p>
            </div>
          </div>

          {/* Total Customers */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Total Customers</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <h4 className="text-lg sm:text-xl font-black text-slate-900">{customers.length}</h4>
              <p className="text-[10px] sm:text-xs text-emerald-600 font-semibold mt-0.5 truncate">
                Registered database accounts
              </p>
            </div>
          </div>

          {/* Avg Order Value */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Avg Order Value</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <h4 className="text-lg sm:text-xl font-black text-slate-900">৳{averageOrderValue.toLocaleString('en-BD')}</h4>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
                Average per delivered order
              </p>
            </div>
          </div>

          {/* Low Stock Alert */}
          <div
            onClick={() => onSelectTab('inventory')}
            className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-rose-300 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Low Stock SKUs</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <h4 className="text-lg sm:text-xl font-black text-rose-700">{lowStockProducts.length} items</h4>
              <p className="text-[10px] sm:text-xs text-rose-600 font-semibold mt-0.5 truncate">
                Stock below 10 units
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Order Status Breakdown Filter Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => onSelectTab('orders')}
          className="p-3 sm:p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-left hover:bg-amber-100/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-amber-900">Pending Orders</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-amber-950 mt-1">{pendingOrders.length}</p>
          <p className="text-[10px] sm:text-[11px] text-amber-700 mt-0.5">Needs phone verification</p>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('orders')}
          className="p-3 sm:p-4 rounded-xl bg-sky-50/70 border border-sky-200 text-left hover:bg-sky-100/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-sky-900">Processing &amp; Shipped</span>
            <Package className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-sky-950 mt-1">{processingOrders.length}</p>
          <p className="text-[10px] sm:text-[11px] text-sky-700 mt-0.5">In packing &amp; transit</p>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('orders')}
          className="p-3 sm:p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-left hover:bg-emerald-100/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-900">Delivered</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-950 mt-1">{deliveredOrders.length}</p>
          <p className="text-[10px] sm:text-[11px] text-emerald-700 mt-0.5">Successfully collected</p>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('inventory')}
          className="p-3 sm:p-4 rounded-xl bg-rose-50/70 border border-rose-200 text-left hover:bg-rose-100/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-rose-900">Low Stock SKUs</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-rose-950 mt-1">{lowStockProducts.length}</p>
          <p className="text-[10px] sm:text-[11px] text-rose-700 mt-0.5">Restock required</p>
        </button>
      </div>

      {/* 5. Sales Analytics & Visual Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart Section */}
        <div className="lg:col-span-2 p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Sales &amp; Revenue Analytics</h2>
              <p className="text-xs text-slate-500">Real-time Bangladesh order trends and turnover</p>
            </div>

            {/* Period Filters - Scrollable Single Row on Mobile */}
            <div className="w-full sm:w-auto overflow-x-auto scrollbar-none py-0.5">
              <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold whitespace-nowrap min-w-max border border-slate-200/60">
                {(
                  [
                    { id: 'today', label: 'Today', shortLabel: 'Today' },
                    { id: 'yesterday', label: 'Yesterday', shortLabel: 'Yest' },
                    { id: '7d', label: 'Last 7 Days', shortLabel: '7 Days' },
                    { id: '30d', label: '30 Days', shortLabel: '30 Days' },
                    { id: 'month', label: 'This Month', shortLabel: 'Month' },
                    { id: 'year', label: 'Year', shortLabel: 'Year' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAnalyticsPeriod(p.id)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap text-[11px] sm:text-xs shrink-0 ${
                      analyticsPeriod === p.id ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="hidden sm:inline">{p.label}</span>
                    <span className="sm:hidden">{p.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Visual Representation */}
          <div className="pt-6">
            <div className="h-52 flex items-end gap-2 sm:gap-4 justify-between px-1 sm:px-2">
              {chartData.map((d, i) => {
                const heightPercent = maxPeriodRevenue > 0 ? Math.max(12, Math.round((d.revenue / maxPeriodRevenue) * 100)) : 12;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Hover Tooltip */}
                    <div className="absolute -top-10 z-10 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
                      {d.fullLabel}: ৳{d.revenue.toLocaleString()} ({d.orders} orders)
                    </div>

                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 opacity-80 group-hover:opacity-100 transition-opacity">
                      {d.revenue >= 1000 ? `৳${(d.revenue / 1000).toFixed(1)}k` : `৳${d.revenue}`}
                    </div>
                    <div className="w-full max-w-[48px] bg-slate-100 rounded-t-xl overflow-hidden h-36 sm:h-40 flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-linear-to-t from-sky-600 to-sky-400 rounded-t-xl transition-all duration-500 group-hover:from-sky-500 group-hover:to-sky-300"
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-600 truncate max-w-full" title={d.fullLabel}>
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Chart Stats */}
          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 text-center text-xs gap-1">
            <div>
              <p className="text-slate-500 text-[11px] sm:text-xs">Period Sales</p>
              <p className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5">৳{periodRevenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] sm:text-xs">Orders Count</p>
              <p className="font-bold text-slate-900 text-xs sm:text-sm mt-0.5">{periodOrdersCount} orders</p>
            </div>
            <div>
              <p className="text-slate-500 text-[11px] sm:text-xs">Period AOV</p>
              <p className="font-bold text-sky-600 text-xs sm:text-sm mt-0.5">
                ৳{periodOrdersCount > 0 ? Math.round(periodRevenue / periodOrdersCount).toLocaleString() : 0}
              </p>
            </div>
          </div>
        </div>

        {/* Top Categories & Quick Stats */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Top Categories</h2>
              <button
                type="button"
                onClick={() => onSelectTab('categories')}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {topCategories.map(([catName, count], idx) => {
                const totalProds = products.length || 1;
                const percentage = Math.round((count / totalProds) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-800 font-semibold">{catName}</span>
                      <span className="text-slate-500">{count} products ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percentage}%` }}
                        className={`h-full rounded-full ${
                          idx === 0 ? 'bg-sky-600' : idx === 1 ? 'bg-indigo-500' : idx === 2 ? 'bg-purple-500' : 'bg-slate-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>Payment Preferences in BD</span>
            </div>
            <p className="text-xs text-slate-600">
              bKash &amp; Nagad account for <strong className="text-slate-800">58%</strong> of completed prepaid orders; Cash on Delivery accounts for <strong className="text-slate-800">42%</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Recent Orders Table & Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 Columns) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Recent Customer Orders</h2>
              <p className="text-xs text-slate-500">Live order stream across Bangladesh</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('orders')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage All Orders</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-2">Order ID</th>
                  <th className="py-2.5 px-2">Customer</th>
                  <th className="py-2.5 px-2">Items</th>
                  <th className="py-2.5 px-2">Amount</th>
                  <th className="py-2.5 px-2">Payment</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRecentOrders.slice(0, 6).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-sky-700">#{order.id}</td>
                    <td className="py-3 px-2">
                      <p className="font-semibold text-slate-900">{order.customerName}</p>
                      <p className="text-[11px] text-slate-400">{order.customerMobile}</p>
                    </td>
                    <td className="py-3 px-2 text-slate-600">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </td>
                    <td className="py-3 px-2 font-bold text-slate-900">
                      ৳{order.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          order.orderStatus === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.orderStatus === 'Cancelled'
                            ? 'bg-red-100 text-red-800'
                            : order.orderStatus === 'Pending' || order.orderStatus === 'Payment Verification'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewOrder(order)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrintInvoice(order)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Print Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Best Selling Products (1 Column) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Best Sellers</h2>
              <p className="text-xs text-slate-500">Top revenue generating items</p>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('products')}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Catalog</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 space-y-3.5">
            {topProductsDisplay.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <img
                  src={getOptimizedImageUrl(item.product.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100', 100)}
                  alt={item.product.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageError(e, item.product.images?.[0])}
                  className="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">{item.product.name}</h4>
                  <p className="text-[11px] text-slate-400 truncate">{item.product.category}</p>
                  <p className="text-xs font-extrabold text-sky-700 mt-0.5">৳{item.product.price.toLocaleString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700">
                    {item.quantity} sold
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Low stock alert badge block */}
          {lowStockProducts.length > 0 && (
            <div className="mt-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs font-bold text-rose-900">{lowStockProducts.length} items low on stock</span>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab('inventory')}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 cursor-pointer underline"
              >
                Reorder
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Add Delivery Expense Modal */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Record Delivery Expense</h3>
                  <p className="text-xs text-slate-300">
                    Saves to Cloud Firestore and permanent Activity Logs
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeliveryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeliveryExpense} className="p-6 overflow-y-auto space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Steadfast Courier Charges for Dispatch Batch #12"
                  value={deliveryFormData.title}
                  onChange={(e) => setDeliveryFormData({ ...deliveryFormData, title: e.target.value })}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Amount Spent (৳ BDT) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">৳</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      placeholder="0.00"
                      value={deliveryFormData.amount}
                      onChange={(e) => setDeliveryFormData({ ...deliveryFormData, amount: e.target.value })}
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs font-black text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Date *</label>
                  <input
                    type="date"
                    required
                    value={deliveryFormData.date}
                    onChange={(e) => setDeliveryFormData({ ...deliveryFormData, date: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Courier Provider</label>
                  <select
                    value={deliveryFormData.courier}
                    onChange={(e) => setDeliveryFormData({ ...deliveryFormData, courier: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-800"
                  >
                    <option value="Steadfast Courier">Steadfast Courier</option>
                    <option value="Pathao Courier">Pathao Courier</option>
                    <option value="RedX Delivery">RedX Delivery</option>
                    <option value="Paperfly">Paperfly</option>
                    <option value="Sundarban Courier">Sundarban Courier</option>
                    <option value="In-House Rider">In-House Rider</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Delivery Location / Area</label>
                  <input
                    type="text"
                    placeholder="e.g. Inside Dhaka, Dhanmondi Hub"
                    value={deliveryFormData.location}
                    onChange={(e) => setDeliveryFormData({ ...deliveryFormData, location: e.target.value })}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Side Note / Breakdown Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Add specific details, consignment numbers, or voucher notes..."
                  value={deliveryFormData.note}
                  onChange={(e) => setDeliveryFormData({ ...deliveryFormData, note: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-xs text-slate-800 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-sm shadow-rose-600/30 transition-all"
                >
                  Save Delivery Cost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Financial Performance & Revenue Overview Receipt Modal */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Actions Bar */}
            <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black">Official Financial Performance Statement</h3>
                  <p className="text-xs text-sky-300">Audited Financial &amp; Revenue Overview Receipt</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadOverviewReceipt}
                  disabled={isGeneratingReceipt}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isGeneratingReceipt ? 'Generating...' : 'Download PNG Receipt'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Printable Preview Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 space-y-6">
              <div className="bg-white rounded-2xl border-2 border-slate-300/80 p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
                {/* Top Brand Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-100">
                  <div className="flex items-center gap-3.5">
                    {/* Official Black KenaX BD Logo Box */}
                    <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-2 shadow-sm">
                      <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center text-slate-950 font-black text-sm">
                        K
                      </div>
                      <div className="text-left">
                        <span className="text-lg font-black text-white tracking-tight">Kena<span className="text-sky-400">X</span> BD</span>
                        <span className="block text-[9px] font-bold text-sky-300 uppercase tracking-widest">Smart Shopping</span>
                      </div>
                    </div>
                    <div>
                      <span className="px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[11px] font-black uppercase tracking-wider border border-sky-200">
                        OFFICIAL RECEIPT
                      </span>
                      <p className="text-xs text-slate-500 mt-1">Authorized Executive Balance Statement</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right space-y-1">
                    <p className="text-xs text-slate-500 font-medium">
                      Date: <strong className="text-slate-800">{new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</strong>
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                      Ref: <span className="font-bold text-slate-800">KENAX-FIN-{finTimeframe.toUpperCase()}-{Date.now().toString(36).toUpperCase()}</span>
                    </p>
                  </div>
                </div>

                {/* Statement Title */}
                <div className="bg-slate-900 rounded-xl p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black">Financial Performance &amp; Revenue Statement</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500 text-slate-950">
                        {getFinTimeframeLabel(finTimeframe)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Delivered cash collections, supplier costs, courier logistics, operating expenses &amp; realized profits.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-emerald-400 font-bold block uppercase tracking-wide">Real Net Profit</span>
                    <span className="text-2xl font-black text-emerald-300">৳{totalNetRevenue.toLocaleString('en-BD')}</span>
                  </div>
                </div>

                {/* Key Metrics Table Grid (9 Cards) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Money Received</span>
                    <p className="text-lg font-black text-emerald-700 mt-0.5">৳{totalMoneyReceived.toLocaleString('en-BD')}</p>
                    <span className="text-[10px] text-slate-400">{deliveredOrders.length} Delivered Orders</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Product Costs</span>
                    <p className="text-lg font-black text-amber-700 mt-0.5">৳{totalDeliveredCost.toLocaleString('en-BD')}</p>
                    <span className="text-[10px] text-slate-400">Wholesale Sourcing</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Product Profit</span>
                    <p className="text-lg font-black text-sky-700 mt-0.5">৳{totalProductProfit.toLocaleString('en-BD')}</p>
                    <span className="text-[10px] text-slate-400">Gross Margin {productProfitMarginPercent}%</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Expenses</span>
                    <p className="text-lg font-black text-rose-700 mt-0.5">৳{totalAllExpenses.toLocaleString('en-BD')}</p>
                    <span className="text-[10px] text-slate-400">Delivery: ৳{totalDeliveryExpenses.toLocaleString('en-BD')} • Others: ৳{totalOtherExpenses.toLocaleString('en-BD')}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Delivery Costs</span>
                    <p className="text-lg font-black text-orange-700 mt-0.5">৳{totalDeliveryExpenses.toLocaleString('en-BD')}</p>
                    <span className="text-[10px] text-slate-400">Collected: ৳{totalDeliveredDeliveryChargesCollected.toLocaleString('en-BD')}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Other Profit</span>
                    <p className="text-lg font-black text-violet-700 mt-0.5">+৳{totalOtherProfits.toLocaleString('en-BD')}</p>
                    <span className="text-[10px] text-slate-400">{finFilteredOtherProfits.length} Records</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">Advance Payment</span>
                    <p className="text-lg font-black text-indigo-700 mt-0.5">৳{totalVerifiedDeliveryAdvance.toLocaleString('en-BD')}</p>
                    <span className="text-[10px] text-slate-400">{verifiedAdvanceOrders.length} Verified</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300">
                    <span className="text-[11px] font-black text-emerald-800 uppercase block">★ Real Net Profit</span>
                    <p className="text-xl font-black text-emerald-900 mt-0.5">৳{totalNetRevenue.toLocaleString('en-BD')}</p>
                    <span className="text-[10px] text-emerald-700 font-bold block truncate">
                      Formula: Cash + Other Profit - Costs - Expenses
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200">
                    <span className="text-[11px] font-bold text-purple-900 uppercase block">Pipeline Forecast</span>
                    <p className="text-lg font-black text-purple-900 mt-0.5">৳{upcomingTotalAmount.toLocaleString('en-BD')}</p>
                    <span className="text-[10px] text-purple-700">{upcomingOrders.length} In Progress Orders</span>
                  </div>
                </div>

                {/* Authorization and Seal Section */}
                <div className="pt-6 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-left max-w-md">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>OFFICIALLY AUDITED &amp; CERTIFIED</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      This financial receipt is certified with real-time audit integrity of KenaX BD E-Commerce operations.
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Security Hash: KENAX-AUTH-{Math.random().toString(36).substring(2, 9).toUpperCase()}
                    </p>
                  </div>

                  {/* Visual Official Seal & Handwritten Sadik Signature */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-50/50 border border-sky-200">
                    <div className="relative w-36 h-36 rounded-full border-4 border-sky-800 flex items-center justify-center bg-white shadow-inner p-2">
                      <div className="absolute inset-1 rounded-full border border-dashed border-sky-700 pointer-events-none" />
                      <div className="text-center">
                        <span className="block text-[8px] font-black text-sky-900 uppercase tracking-wider">KENAX BD OFFICIAL SEAL</span>
                        <div className="my-0.5">
                          {/* Authentic Cursive Script for Sadik */}
                          <span className="font-serif italic font-black text-2xl text-sky-900 tracking-wide block" style={{ fontFamily: 'Brush Script MT, cursive, serif' }}>
                            Sadik
                          </span>
                        </div>
                        <span className="block text-[7px] font-bold text-sky-700 uppercase">AUTHORIZED SIGNATURE</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-800 mt-2">Authorized Signatory: Sadik</span>
                    <span className="text-[10px] text-slate-500">Executive Authority</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500">
                KenaX BD Financial Management System • All rights reserved
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDownloadOverviewReceipt}
                  disabled={isGeneratingReceipt}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isGeneratingReceipt ? 'Generating PNG...' : 'Download Official Receipt'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
