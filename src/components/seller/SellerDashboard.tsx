import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Globe,
  LogOut,
  Moon,
  Sun,
  Edit,
  Trash2,
  Eye,
  CreditCard,
  Building2,
  Smartphone,
  Check,
  AlertCircle,
  ExternalLink,
  Copy,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowLeft,
  X,
  Save,
  Send,
  Download,
  Share2,
  Tag,
  Boxes,
  Bell,
  BarChart3,
  Users,
  ShieldCheck,
  ShieldAlert,
  Percent,
  Receipt,
  MessageSquare,
  HelpCircle,
  Printer,
  ChevronDown,
  Calendar,
  Lock,
  Key,
  Menu,
  FileText,
  AlertTriangle,
  RotateCcw,
  Zap,
  Bot,
  Wand2,
  Brain,
  Play,
} from 'lucide-react';
import { INITIAL_CATEGORIES } from '../../data/initialSettings';
import { getPartnersFromStorage, savePartnersToStorage } from '../../lib/partnerStorage';
import { useLanguage } from '../../context/LanguageContext';
import {
  SellerUser,
  SellerPlan,
  SellerPlanId,
  SellerSubOrder,
  SellerLedgerTransaction,
  SellerWithdrawalRequest,
  SellerCoupon,
  SellerSupportTicket,
  SellerCampaign,
  SellerReview,
  SellerSubOrderStatus,
} from '../../types/seller';
import { Product, OrderItem } from '../../types';
import {
  getSellerPlans,
  getSellerSubOrders,
  saveSellerSubOrders,
  getSellerLedgers,
  saveSellerLedgers,
  getSellerWithdrawals,
  saveSellerWithdrawals,
  getSellerCoupons,
  saveSellerCoupons,
  getSellerTickets,
  saveSellerTickets,
  getSellerReviews,
  saveSellerReviews,
  saveSellers,
  getSellers,
  setActiveSellerSession,
} from '../../lib/sellerStorage';
import { PackingSlipModal } from './PackingSlipModal';
import { SellerPendingScreen } from './SellerPendingScreen';
import { isModuleAllowedForPartner } from '../../lib/planRulesStorage';
import {
  subscribeToLocalPermissionMatrix,
  subscribeToFirebasePermissionMatrix,
  getCachedPermissionMatrix,
  RolePermissionMatrixConfig,
  isTabAllowedForRole,
} from '../../lib/permissionMatrixService';

interface SellerDashboardProps {
  seller: SellerUser;
  onLogout: () => void;
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onNavigateToStore?: (storeSlug?: string) => void;
}

export type SellerNavTab =
  | 'dashboard'
  // Store
  | 'my-store'
  | 'store-settings'
  // Products
  | 'products-all'
  | 'products-add'
  | 'products-drafts'
  | 'products-pending'
  | 'products-low-stock'
  | 'products-out-of-stock'
  // Orders
  | 'orders-all'
  | 'orders-new'
  | 'orders-processing'
  | 'orders-ready-pack'
  | 'orders-ready-pickup'
  | 'orders-delivered'
  | 'orders-cancelled'
  | 'orders-returns'
  // Finance
  | 'finance-wallet'
  | 'finance-earnings'
  | 'finance-transactions'
  | 'finance-withdrawals'
  | 'finance-commission'
  // Analytics
  | 'analytics-sales'
  | 'analytics-products'
  | 'analytics-customers'
  // Marketing
  | 'marketing-coupons'
  | 'marketing-promotions'
  | 'marketing-featured'
  | 'marketing-campaigns'
  // Reviews
  | 'reviews'
  // AI Bot
  | 'ai-bot'
  // Subscription
  | 'subscription-plan'
  | 'subscription-upgrade'
  | 'subscription-billing'
  // Support & Settings
  | 'support'
  | 'settings';

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  seller: initialSeller,
  onLogout,
  products = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onNavigateToStore,
}) => {
  // Navigation & UI states
  const [currentTab, setCurrentTab] = useState<SellerNavTab>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { language: globalLanguage, setLanguage: setGlobalLanguage } = useLanguage();
  const [lang, setLangState] = useState<'bn' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('kenax_language') || localStorage.getItem('seller_dashboard_language');
      if (saved === 'en' || saved === 'bn') return saved;
    } catch {}
    return globalLanguage === 'en' || globalLanguage === 'bn' ? globalLanguage : 'bn';
  });

  useEffect(() => {
    if (globalLanguage === 'en' || globalLanguage === 'bn') {
      setLangState(globalLanguage);
    }
  }, [globalLanguage]);

  const setLang = (newLang: 'bn' | 'en') => {
    setLangState(newLang);
    try {
      localStorage.setItem('kenax_language', newLang);
      localStorage.setItem('seller_dashboard_language', newLang);
    } catch {}
    setGlobalLanguage(newLang);
  };

  // Seller & Storage Data States
  const [seller, setSeller] = useState<SellerUser>(initialSeller);
  const [matrixConfig, setMatrixConfig] = useState<RolePermissionMatrixConfig>(() =>
    getCachedPermissionMatrix()
  );

  // Subscribe to real-time Permission Matrix updates from Firebase
  useEffect(() => {
    const unsubLocal = subscribeToLocalPermissionMatrix((updated) => {
      setMatrixConfig(updated);
    });
    const unsubFirebase = subscribeToFirebasePermissionMatrix((updated) => {
      setMatrixConfig(updated);
    });
    return () => {
      unsubLocal();
      unsubFirebase();
    };
  }, []);

  const plans = useMemo(() => getSellerPlans(), []);
  const currentPlan = useMemo(
    () => plans.find((p) => p.id === seller.planId) || plans[0],
    [plans, seller.planId]
  );

  // Live Subscription Countdown Timer
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const subscriptionExpiryTime = useMemo(() => {
    if (!seller.subscriptionEndDate) return Date.now() + 30 * 86400000;
    return new Date(seller.subscriptionEndDate).getTime();
  }, [seller.subscriptionEndDate]);

  const isSubscriptionExpired = useMemo(() => {
    return subscriptionExpiryTime <= now || seller.subscriptionStatus === 'expired';
  }, [subscriptionExpiryTime, now, seller.subscriptionStatus]);

  const countdown = useMemo(() => {
    const diff = Math.max(0, subscriptionExpiryTime - now);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds };
  }, [subscriptionExpiryTime, now]);

  // Renewal Form States
  const [renewalPlanId, setRenewalPlanId] = useState<SellerPlanId>(seller.planId);
  const [renewalCycle, setRenewalCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [renewalPaymentMethod, setRenewalPaymentMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank'>('bkash');
  const [renewalSender, setRenewalSender] = useState(seller.paymentSenderNumber || seller.phone || '');
  const [renewalTxId, setRenewalTxId] = useState('');
  const [renewalNote, setRenewalNote] = useState('');

  // AI Generator States
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiOrderPrompt, setAiOrderPrompt] = useState('আমি ১টি ওয়াচ এবং ১টি ইয়ারবাডস ধানমন্ডি ঢাকায় ০১৭০০০০০০০০ নম্বরে অর্ডার দিতে চাই');
  const [aiOrderNotice, setAiOrderNotice] = useState<string | null>(null);

  const [subOrders, setSubOrders] = useState<SellerSubOrder[]>(() => {
    const saved = getSellerSubOrders().filter((o) => o.sellerId === seller.id);
    if (saved.length > 0) return saved;

    // Seed realistic demo sub-orders
    return [
      {
        id: 'SUB-100291',
        parentOrderId: 'ORD-881920',
        sellerId: seller.id,
        customerInfo: {
          name: 'Nusrat Jahan',
          phone: '01712345678',
          address: 'House 42, Road 11, Dhanmondi',
          district: 'Dhaka',
          upazila: 'Dhanmondi',
          city: 'Dhaka',
        },
        items: [
          {
            productId: 'P1',
            productName: 'Ultra Pro Smartwatch Series 9',
            name: 'Ultra Pro Smartwatch Series 9',
            productImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
            price: 3250,
            quantity: 1,
            total: 3250,
          },
        ],
        subtotal: 3250,
        discount: 0,
        deliveryCharge: 70,
        commissionPercentage: currentPlan.commissionRate,
        commissionAmount: Math.round(3250 * (currentPlan.commissionRate / 100)),
        netSellerEarnings: 3250 - Math.round(3250 * (currentPlan.commissionRate / 100)),
        orderStatus: 'Confirmed',
        paymentStatus: 'Paid',
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'SUB-100288',
        parentOrderId: 'ORD-881915',
        sellerId: seller.id,
        customerInfo: {
          name: 'Kazi Tanvir',
          phone: '01811223344',
          address: 'GEC Circle, Nasirabad',
          district: 'Chittagong',
          upazila: 'Panchlaish',
          city: 'Chittagong',
        },
        items: [
          {
            productId: 'P2',
            productName: 'ANC Wireless Earbuds TWS',
            name: 'ANC Wireless Earbuds TWS',
            productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
            price: 1850,
            quantity: 1,
            total: 1850,
          },
        ],
        subtotal: 1850,
        discount: 0,
        deliveryCharge: 120,
        commissionPercentage: currentPlan.commissionRate,
        commissionAmount: Math.round(1850 * (currentPlan.commissionRate / 100)),
        netSellerEarnings: 1850 - Math.round(1850 * (currentPlan.commissionRate / 100)),
        orderStatus: 'New',
        paymentStatus: 'Unpaid',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        id: 'SUB-100275',
        parentOrderId: 'ORD-881890',
        sellerId: seller.id,
        customerInfo: {
          name: 'Arafat Hossain',
          phone: '01915556677',
          address: 'Zindabazar Area',
          district: 'Sylhet',
          upazila: 'Sylhet Sadar',
          city: 'Sylhet',
        },
        items: [
          {
            productId: 'P1',
            productName: 'Ultra Pro Smartwatch Series 9',
            name: 'Ultra Pro Smartwatch Series 9',
            productImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
            price: 3250,
            quantity: 1,
            total: 3250,
          },
          {
            productId: 'P3',
            productName: 'Fast Charging Powerbank 20000mAh',
            name: 'Fast Charging Powerbank 20000mAh',
            productImage: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=600',
            price: 1250,
            quantity: 1,
            total: 1250,
          },
        ],
        subtotal: 4500,
        discount: 0,
        deliveryCharge: 130,
        commissionPercentage: currentPlan.commissionRate,
        commissionAmount: Math.round(4500 * (currentPlan.commissionRate / 100)),
        netSellerEarnings: 4500 - Math.round(4500 * (currentPlan.commissionRate / 100)),
        orderStatus: 'Delivered',
        paymentStatus: 'Paid',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: 'SUB-100260',
        parentOrderId: 'ORD-881840',
        sellerId: seller.id,
        customerInfo: {
          name: 'Sumaiya Akhtar',
          phone: '01733445566',
          address: 'Kazihata Road',
          district: 'Rajshahi',
          upazila: 'Rajshahi Sadar',
          city: 'Rajshahi',
        },
        items: [
          {
            productId: 'P2',
            productName: 'ANC Wireless Earbuds TWS',
            name: 'ANC Wireless Earbuds TWS',
            productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
            price: 1850,
            quantity: 1,
            total: 1850,
          },
        ],
        subtotal: 1850,
        discount: 0,
        deliveryCharge: 110,
        commissionPercentage: currentPlan.commissionRate,
        commissionAmount: Math.round(1850 * (currentPlan.commissionRate / 100)),
        netSellerEarnings: 1850 - Math.round(1850 * (currentPlan.commissionRate / 100)),
        orderStatus: 'Ready for Pickup',
        paymentStatus: 'Unpaid',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ];
  });

  const [ledgers, setLedgers] = useState<SellerLedgerTransaction[]>(() => {
    const saved = getSellerLedgers().filter((l) => l.sellerId === seller.id);
    if (saved.length > 0) return saved;

    return [
      {
        id: 'LED-99012',
        sellerId: seller.id,
        orderId: 'SUB-100275',
        type: 'order_sale',
        description: 'Delivered Order (SUB-100275) Net Earnings Released',
        grossAmount: 4500,
        commissionAmount: 405,
        netAmount: 4095,
        runningBalance: seller.walletBalance || 12450,
        status: 'Completed',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: 'LED-98920',
        sellerId: seller.id,
        orderId: 'SUB-100210',
        type: 'order_sale',
        description: 'Delivered Order (SUB-100210) Net Earnings Released',
        grossAmount: 6200,
        commissionAmount: 558,
        netAmount: 5642,
        runningBalance: 8355,
        status: 'Completed',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ];
  });

  const [withdrawals, setWithdrawals] = useState<SellerWithdrawalRequest[]>(() =>
    getSellerWithdrawals().filter((w) => w.sellerId === seller.id)
  );

  const [coupons, setCoupons] = useState<SellerCoupon[]>(() => {
    const saved = getSellerCoupons().filter((c) => c.sellerId === seller.id);
    if (saved.length > 0) return saved;

    return [
      {
        id: 'CPN-101',
        sellerId: seller.id,
        code: 'WELCOME10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 1000,
        maxDiscountAmount: 300,
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        usageLimit: 100,
        usedCount: 24,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'CPN-102',
        sellerId: seller.id,
        code: 'FLASHSALE500',
        discountType: 'fixed',
        discountValue: 500,
        minOrderAmount: 3000,
        maxDiscountAmount: 500,
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 15 * 86400000).toISOString(),
        usageLimit: 50,
        usedCount: 18,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const [tickets, setTickets] = useState<SellerSupportTicket[]>(() => {
    const saved = getSellerTickets().filter((t) => t.sellerId === seller.id);
    if (saved.length > 0) return saved;

    return [
      {
        id: 'TCK-10921',
        sellerId: seller.id,
        shopName: seller.store.storeName,
        subject: 'Courier Pickup Schedule Inquiry',
        category: 'Orders & Shipping',
        priority: 'medium',
        status: 'Open',
        description: 'How do I request daily automatic pickup from my Dhanmondi warehouse address?',
        messages: [
          {
            id: 'msg-1',
            sender: 'seller',
            senderName: seller.fullName,
            message: 'How do I request daily automatic pickup from my Dhanmondi warehouse address?',
            timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: 'msg-2',
            sender: 'admin',
            senderName: 'KenaX BD Merchant Operations',
            message: 'Hello! As a verified seller, Paperfly & Steadfast couriers will pick up parcels daily at 3 PM from your address.',
            timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ];
  });

  const [reviews, setReviews] = useState<SellerReview[]>(() => {
    const saved = getSellerReviews().filter((r) => r.sellerId === seller.id);
    if (saved.length > 0) return saved;

    return [
      {
        id: 'REV-991',
        sellerId: seller.id,
        productId: 'P1',
        productName: 'Ultra Pro Smartwatch Series 9',
        productImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
        customerName: 'Farhana Y.',
        rating: 5,
        comment: 'অসাম প্রোডাক্ট! প্যাকিং চমৎকার ছিল এবং ২ দিনের মধ্যে ঢাকায় ডেলিভারি পেয়েছি।',
        sellerReply: {
          message: 'ধন্যবাদ ফারহানা আপু! আপনার সন্তুষ্টিই আমাদের প্রধান লক্ষ্য।',
          repliedAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
        },
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'REV-992',
        sellerId: seller.id,
        productId: 'P2',
        productName: 'ANC Wireless Earbuds TWS',
        productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
        customerName: 'Mahmudul H.',
        rating: 5,
        comment: 'খুব সুন্দর সাউন্ড কোয়ালিটি, বেজ অনেক স্ট্রং। সেলারের রেসপন্সও খুব ফাস্ট ছিল।',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        id: 'REV-993',
        sellerId: seller.id,
        productId: 'P3',
        productName: 'Fast Charging Powerbank 20000mAh',
        productImage: 'https://images.unsplash.com/photo-1609592424009-dd2772c91834?w=600',
        customerName: 'Rashed K.',
        rating: 4,
        comment: 'ভালো ব্যাকআপ দেয়, দাম অনুযায়ী পারফেক্ট বিল্ড কোয়ালিটি।',
        createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
      },
    ];
  });

  // Selected Packing Slip Modal
  const [selectedSlipOrder, setSelectedSlipOrder] = useState<SellerSubOrder | null>(null);

  // Selected Order Detail Modal
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<SellerSubOrder | null>(null);

  // Add / Edit Product Modal & State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    banglaName: '',
    category: 'Smartwatch',
    subcategory: 'Accessories',
    price: '',
    originalPrice: '',
    costPrice: '',
    stock: '20',
    sku: '',
    imageUrl: '',
    galleryImages: ['', '', ''],
    shortDescription: '',
    description: '',
    weight: '0.3',
    minOrder: '1',
    maxOrder: '10',
    allowReselling: true,
    resellerPrice: '',
    suggestedResellerRetailPrice: '',
    minResellerRetailPrice: '',
    status: 'published' as 'published' | 'draft' | 'pending',
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'today' | '7d' | '30d' | '3m' | '1y'>('30d');

  // Withdrawal Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank'>('bkash');
  const [withdrawAccount, setWithdrawAccount] = useState(seller.paymentInfo?.bkash || seller.phone || '');
  const [withdrawNotice, setWithdrawNotice] = useState<string | null>(null);

  // Coupon Modal State
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '10',
    minOrderAmount: '1000',
    maxDiscountAmount: '500',
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    usageLimit: '100',
  });

  // New Ticket Modal State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'Orders & Shipping' as SellerSupportTicket['category'],
    priority: 'medium' as SellerSupportTicket['priority'],
    description: '',
  });

  // Upgrade Plan Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<SellerPlan | null>(null);

  // Seller Products (Filtered for this seller)
  const sellerProducts = useMemo(() => {
    return products.filter(
      (p) => p.supplierId === seller.id || (p as any).sellerId === seller.id || p.brand === seller.store.storeName
    );
  }, [products, seller.id, seller.store.storeName]);

  // Derived Metrics
  const totalSalesGross = useMemo(() => {
    return subOrders
      .filter((o) => o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Returned')
      .reduce((sum, o) => sum + o.subtotal, 0);
  }, [subOrders]);

  const totalCompletedOrders = useMemo(
    () => subOrders.filter((o) => o.orderStatus === 'Delivered').length,
    [subOrders]
  );
  const totalPendingOrders = useMemo(
    () => subOrders.filter((o) => o.orderStatus === 'New' || o.orderStatus === 'Confirmed' || o.orderStatus === 'Processing').length,
    [subOrders]
  );
  const totalReadyToPack = useMemo(
    () => subOrders.filter((o) => o.orderStatus === 'Confirmed' || o.orderStatus === 'Processing').length,
    [subOrders]
  );
  const totalCancelled = useMemo(
    () => subOrders.filter((o) => o.orderStatus === 'Cancelled' || o.orderStatus === 'Refunded').length,
    [subOrders]
  );
  const lowStockProducts = useMemo(
    () => sellerProducts.filter((p) => p.stock > 0 && p.stock <= 5),
    [sellerProducts]
  );
  const outOfStockProducts = useMemo(
    () => sellerProducts.filter((p) => p.stock <= 0),
    [sellerProducts]
  );

  // Update Sub-Order Status
  const handleUpdateOrderStatus = (orderId: string, newStatus: SellerSubOrderStatus, notes?: string) => {
    const updated = subOrders.map((o) => {
      if (o.id === orderId) {
        const item: SellerSubOrder = {
          ...o,
          orderStatus: newStatus,
          sellerInternalNotes: notes || o.sellerInternalNotes,
          updatedAt: new Date().toISOString(),
        };
        if (newStatus === 'Packed') item.packedAt = new Date().toISOString();
        if (newStatus === 'Ready for Pickup') item.pickupReadyAt = new Date().toISOString();
        if (newStatus === 'Delivered') item.deliveredAt = new Date().toISOString();
        return item;
      }
      return o;
    });

    setSubOrders(updated);
    const all = getSellerSubOrders().map((o) => (o.id === orderId ? updated.find((u) => u.id === orderId)! : o));
    saveSellerSubOrders(all);

    // If delivered, automatically credit to wallet ledger
    if (newStatus === 'Delivered') {
      const ord = updated.find((u) => u.id === orderId);
      if (ord) {
        const newLedger: SellerLedgerTransaction = {
          id: `LED-${Date.now().toString().slice(-6)}`,
          sellerId: seller.id,
          orderId: ord.id,
          type: 'order_sale',
          description: `Delivered Order (${ord.id}) Net Earnings Released`,
          grossAmount: ord.subtotal,
          commissionAmount: ord.commissionAmount,
          netAmount: ord.netSellerEarnings,
          runningBalance: seller.walletBalance + ord.netSellerEarnings,
          status: 'Completed',
          createdAt: new Date().toISOString(),
        };
        const updatedLedgers = [newLedger, ...ledgers];
        setLedgers(updatedLedgers);
        saveSellerLedgers([newLedger, ...getSellerLedgers()]);

        const updatedSeller: SellerUser = {
          ...seller,
          walletBalance: seller.walletBalance + ord.netSellerEarnings,
          totalEarnings: seller.totalEarnings + ord.netSellerEarnings,
          totalMarketplaceCommission: seller.totalMarketplaceCommission + ord.commissionAmount,
        };
        setSeller(updatedSeller);
        setActiveSellerSession(updatedSeller);
        saveSellers(getSellers().map((s) => (s.id === seller.id ? updatedSeller : s)));
      }
    }

    if (selectedOrderDetails?.id === orderId) {
      setSelectedOrderDetails(updated.find((u) => u.id === orderId) || null);
    }
  };

  // Submit Withdrawal Request
  const handleSubmitWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt < 500) {
      alert('Minimum withdrawal is ৳500.');
      return;
    }
    if (amt > seller.walletBalance) {
      alert('Insufficient available wallet balance.');
      return;
    }

    const fee = currentPlan.id === 'premium' ? 0 : 15; // ৳15 transfer fee for basic/standard
    const payable = amt - fee;

    const newReq: SellerWithdrawalRequest = {
      id: `WD-${Date.now().toString().slice(-6)}`,
      sellerId: seller.id,
      sellerName: seller.fullName,
      shopName: seller.store.storeName,
      amount: amt,
      withdrawalFee: fee,
      payableAmount: payable,
      method: withdrawMethod,
      accountDetails: withdrawAccount.trim(),
      status: 'Pending Review',
      requestedAt: new Date().toISOString(),
    };

    const updatedWithdrawals = [newReq, ...withdrawals];
    setWithdrawals(updatedWithdrawals);
    saveSellerWithdrawals([newReq, ...getSellerWithdrawals()]);

    // Deduct immediately from available balance to pending
    const updatedSeller: SellerUser = {
      ...seller,
      walletBalance: seller.walletBalance - amt,
      pendingBalance: seller.pendingBalance + amt,
    };
    setSeller(updatedSeller);
    setActiveSellerSession(updatedSeller);
    saveSellers(getSellers().map((s) => (s.id === seller.id ? updatedSeller : s)));

    // Record ledger
    const newLedger: SellerLedgerTransaction = {
      id: `LED-${Date.now().toString().slice(-6)}`,
      sellerId: seller.id,
      payoutId: newReq.id,
      type: 'withdrawal_payout',
      description: `Withdrawal Request to ${withdrawMethod.toUpperCase()} (${withdrawAccount})`,
      grossAmount: amt,
      commissionAmount: fee,
      netAmount: -amt,
      runningBalance: updatedSeller.walletBalance,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    setLedgers([newLedger, ...ledgers]);
    saveSellerLedgers([newLedger, ...getSellerLedgers()]);

    setWithdrawNotice(`Withdrawal request for ৳${amt.toLocaleString('en-BD')} submitted successfully.`);
    setTimeout(() => {
      setWithdrawNotice(null);
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
    }, 2000);
  };

  // Submit Product Form (Add / Edit)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(productForm.price) || 0;
    const origPriceNum = parseFloat(productForm.originalPrice) || priceNum;
    const costNum = parseFloat(productForm.costPrice) || Math.round(priceNum * 0.75);
    const stockNum = parseInt(productForm.stock) || 10;
    const galleryClean = productForm.galleryImages.filter((img) => Boolean(img?.trim()));

    const resellerWholesale = productForm.allowReselling
      ? parseFloat(productForm.resellerPrice) || Math.round(priceNum * 0.8)
      : undefined;
    const suggestedRetail = productForm.allowReselling
      ? parseFloat(productForm.suggestedResellerRetailPrice) || priceNum
      : undefined;
    const minRetail = productForm.allowReselling
      ? parseFloat(productForm.minResellerRetailPrice) || Math.round(priceNum * 0.9)
      : undefined;

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        name: productForm.name.trim(),
        slug: productForm.slug.trim() || editingProduct.slug,
        banglaName: productForm.banglaName.trim(),
        category: productForm.category,
        subcategory: productForm.subcategory,
        price: priceNum,
        originalPrice: origPriceNum,
        costPrice: costNum,
        stock: stockNum,
        sku: productForm.sku.trim() || editingProduct.sku,
        images: productForm.imageUrl ? [productForm.imageUrl, ...galleryClean] : editingProduct.images,
        shortDescription: productForm.shortDescription.trim(),
        description: productForm.description.trim() || editingProduct.description,
        allowReselling: productForm.allowReselling,
        resellerPrice: resellerWholesale,
        suggestedResellerRetailPrice: suggestedRetail,
        minResellerRetailPrice: minRetail,
        sellerId: seller.id,
        sellerName: seller.fullName,
        sellerShopName: seller.store.storeName,
        sellerRating: seller.rating || 4.9,
        sellerReviewsCount: seller.totalReviews || 24,
        sellerVerified: true,
        updatedAt: new Date().toISOString(),
      };
      onUpdateProduct(updated);
    } else {
      // Check Plan Product Limit
      if (currentPlan.productLimit !== -1 && sellerProducts.length >= currentPlan.productLimit) {
        alert(
          `You have reached the ${currentPlan.productLimit} product limit for your ${currentPlan.name} plan. Please upgrade to add more products.`
        );
        return;
      }

      const newProd: Product = {
        id: `PROD-${seller.username.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
        name: productForm.name.trim(),
        slug: productForm.slug.trim() || productForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        banglaName: productForm.banglaName.trim(),
        category: productForm.category,
        subcategory: productForm.subcategory,
        brand: seller.store.storeName,
        price: priceNum,
        originalPrice: origPriceNum,
        costPrice: costNum,
        stock: stockNum,
        sku: productForm.sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        images: productForm.imageUrl
          ? [productForm.imageUrl, ...galleryClean]
          : ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600'],
        shortDescription: productForm.shortDescription.trim(),
        description: productForm.description.trim() || `${productForm.name} - Official from ${seller.store.storeName}`,
        productType: 'own',
        supplierId: seller.id,
        supplierName: seller.store.storeName,
        sellerId: seller.id,
        sellerName: seller.fullName,
        sellerShopName: seller.store.storeName,
        sellerRating: seller.rating || 4.9,
        sellerReviewsCount: seller.totalReviews || 24,
        sellerVerified: true,
        allowReselling: productForm.allowReselling,
        resellerPrice: resellerWholesale,
        suggestedResellerRetailPrice: suggestedRetail,
        minResellerRetailPrice: minRetail,
        rating: 5,
        reviewsCount: 0,
        createdAt: new Date().toISOString(),
      };
      onAddProduct(newProd);
    }

    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  // Create Seller Coupon
  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const newCpn: SellerCoupon = {
      id: `CPN-${Date.now().toString().slice(-6)}`,
      sellerId: seller.id,
      code: couponForm.code.toUpperCase().trim(),
      discountType: couponForm.discountType,
      discountValue: parseFloat(couponForm.discountValue) || 10,
      minOrderAmount: parseFloat(couponForm.minOrderAmount) || 0,
      maxDiscountAmount: parseFloat(couponForm.maxDiscountAmount) || undefined,
      startDate: new Date().toISOString(),
      expiryDate: new Date(couponForm.expiryDate).toISOString(),
      usageLimit: parseInt(couponForm.usageLimit) || 50,
      usedCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const updated = [newCpn, ...coupons];
    setCoupons(updated);
    saveSellerCoupons([newCpn, ...getSellerCoupons()]);
    setIsCouponModalOpen(false);
  };

  // Create Support Ticket
  const handleSaveTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const newTck: SellerSupportTicket = {
      id: `TCK-${Date.now().toString().slice(-5)}`,
      sellerId: seller.id,
      shopName: seller.store.storeName,
      subject: ticketForm.subject.trim(),
      category: ticketForm.category,
      priority: ticketForm.priority,
      status: 'Open',
      description: ticketForm.description.trim(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'seller',
          senderName: seller.fullName,
          message: ticketForm.description.trim(),
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newTck, ...tickets];
    setTickets(updated);
    saveSellerTickets([newTck, ...getSellerTickets()]);
    setIsTicketModalOpen(false);
    setTicketForm({
      subject: '',
      category: 'Orders & Shipping',
      priority: 'medium',
      description: '',
    });
  };

  // Upgrade Plan Handler
  const handleConfirmPlanUpgrade = (newPlan: SellerPlan) => {
    const updatedSeller: SellerUser = {
      ...seller,
      planId: newPlan.id,
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
    setSeller(updatedSeller);
    setActiveSellerSession(updatedSeller);
    saveSellers(getSellers().map((s) => (s.id === seller.id ? updatedSeller : s)));
    setIsUpgradeModalOpen(false);
    alert(`Successfully upgraded to ${newPlan.name}! All tier benefits and limits are now active.`);
  };

  const checkTabRestriction = (
    tab: SellerNavTab,
    planId: SellerPlanId
  ): { restricted: boolean; requiredPlanName: string; requiredPlanId: 'standard' | 'premium' } => {
    // Map tab to Rule Matrix module ID
    const tabToModule: Partial<Record<SellerNavTab, string>> = {
      'store-settings': 'store_settings',
      'products-all': 'products_catalog',
      'products-add': 'products_add',
      'orders-all': 'orders_management',
      'ai-bot': 'ai_bot',
      'finance-wallet': 'finance_wallet',
      'finance-earnings': 'finance_earnings',
      'finance-withdrawals': 'finance_withdrawals',
      'analytics-sales': 'analytics_sales',
      'analytics-products': 'analytics_sales',
      'analytics-customers': 'analytics_sales',
      'marketing-coupons': 'marketing_coupons',
      'marketing-promotions': 'marketing_coupons',
      'marketing-featured': 'marketing_campaigns',
      'marketing-campaigns': 'marketing_campaigns',
      'reviews': 'customer_reviews',
      'support': 'support_ticket',
    };

    const targetModule = tabToModule[tab];
    if (targetModule) {
      const allowed = isModuleAllowedForPartner(seller, targetModule, 'seller');
      if (!allowed) {
        return {
          restricted: true,
          requiredPlanName: 'Standard Pro / Premium VIP',
          requiredPlanId: 'standard',
        };
      }
    }

    if (planId === 'basic') {
      if (['analytics-sales', 'analytics-products', 'analytics-customers', 'ai-bot'].includes(tab)) {
        return { restricted: true, requiredPlanName: 'Standard Pro', requiredPlanId: 'standard' };
      }
      if (['marketing-coupons', 'marketing-promotions', 'marketing-featured'].includes(tab)) {
        return { restricted: true, requiredPlanName: 'Standard Pro', requiredPlanId: 'standard' };
      }
      if (tab === 'marketing-campaigns') {
        return { restricted: true, requiredPlanName: 'Premium Enterprise', requiredPlanId: 'premium' };
      }
    }

    if (planId === 'standard') {
      if (tab === 'marketing-campaigns') {
        return { restricted: true, requiredPlanName: 'Premium Enterprise', requiredPlanId: 'premium' };
      }
    }

    return { restricted: false, requiredPlanName: '', requiredPlanId: 'standard' };
  };

  // AI Product Content Generator Handler
  const handleAIGenerateProductDetails = () => {
    if (currentPlan.id === 'basic') {
      alert('🔒 AI Product Content Generator is locked on the Basic Free Plan. Please upgrade to Standard Pro or Premium Enterprise to auto-generate content with AI!');
      return;
    }

    const title = productForm.name.trim() || 'Smart Electronics Gadget';
    setIsGeneratingAI(true);
    setTimeout(() => {
      setProductForm((prev) => ({
        ...prev,
        banglaName: prev.banglaName || `${title} - অফিসিয়াল প্রোডাক্ট`,
        shortDescription: `প্রিমিয়াম কোয়ালিটির ${title}। আকর্ষণীয় ডিজাইন ও ২ বছরের অফিসিয়াল গ্যারান্টি সহ সারাদেশে দ্রুত ক্যাশ অন ডেলিভারি।`,
        description: `
🌟 ${title} - KenaX BD Official Store 🌟

প্রধান আকর্ষণীয় ফিচারসমুহ:
- ১০০% অরিজিনাল ও ব্র্যান্ডেড প্রিমিয়াম বিল্ড কোয়ালিটি
- হাই-স্পিড অপটিমাইজড চিপসেট ও এনার্জি সেভিং টেকনোলজি
- ওয়াটারপ্রুফ ও ডিউরেবল বডি ফিনিশিং
- ঢাকার ভেতরে ২৪ ঘন্টা ও ঢাকার বাইরে ৪৮ ঘন্টায় এক্সপ্রেস ডেলিভারি
- ৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি ও ১ বছরের অফিসিয়াল শপ ওয়ারেন্টি

অর্ডার করতে সরাসরি Buy Now বাটনে ক্লিক করুন অথবা ডেলিভারি এড্রেস লিখে দিন!
        `.trim(),
      }));
      setIsGeneratingAI(false);
      alert('✨ AI successfully generated Bangla product title, promotional description, and specifications!');
    }, 800);
  };

  // Simulate Expiry Handler
  const handleSimulateExpiry = () => {
    const expiredSeller: SellerUser = {
      ...seller,
      subscriptionEndDate: new Date(Date.now() - 1000).toISOString(),
      subscriptionStatus: 'expired',
    };
    setSeller(expiredSeller);
    setActiveSellerSession(expiredSeller);
    saveSellers(getSellers().map((s) => (s.id === seller.id ? expiredSeller : s)));
  };

  // Subscription Renewal Submission
  const handleRenewalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewalTxId.trim()) {
      alert('Please enter Payment Transaction ID (TrxID)');
      return;
    }

    const renewedSeller: SellerUser = {
      ...seller,
      planId: renewalPlanId,
      selectedPlanId: renewalPlanId,
      billingCycle: renewalCycle,
      subscriptionStatus: 'trial',
      accountStatus: 'pending_approval',
      paymentMethod: renewalPaymentMethod,
      paymentSenderNumber: renewalSender.trim(),
      paymentTxId: renewalTxId.trim(),
      paymentProofNote: renewalNote.trim(),
      paymentSubmittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSeller(renewedSeller);
    setActiveSellerSession(renewedSeller);
    saveSellers(getSellers().map((s) => (s.id === seller.id ? renewedSeller : s)));
    savePartnersToStorage(
      getPartnersFromStorage().map((p) =>
        p.id === seller.id || p.username === seller.username
          ? {
              ...p,
              status: 'pending',
              selectedPlanId: renewalPlanId,
              paymentMethod: renewalPaymentMethod,
              paymentSenderNumber: renewalSender.trim(),
              paymentTxId: renewalTxId.trim(),
              paymentSubmittedAt: new Date().toISOString(),
            }
          : p
      )
    );
    alert('🎉 Renewal payment submitted! Redirecting to approval verification status screen...');
  };

  // Navigation Items Definition (21-Section Strict Hierarchy)
  interface NavItem {
    id: SellerNavTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const rawNavigationSections: NavSection[] = [
    {
      title: 'DASHBOARD',
      items: [
        { id: 'dashboard', label: 'Dashboard Home', icon: LayoutDashboard },
      ],
    },
    {
      title: 'STOREFRONT',
      items: [
        { id: 'my-store', label: 'My Public Store', icon: Store },
        { id: 'store-settings', label: 'Store Branding & Info', icon: Building2 },
      ],
    },
    {
      title: 'PRODUCTS',
      items: [
        { id: 'products-all', label: 'All Products', icon: Package, badge: sellerProducts.length },
        { id: 'products-add', label: 'Add New Product', icon: Plus },
        { id: 'products-low-stock', label: 'Low Stock Alert', icon: AlertTriangle, badge: lowStockProducts.length > 0 ? lowStockProducts.length : undefined, badgeColor: 'bg-amber-500 text-white' },
        { id: 'products-out-of-stock', label: 'Out of Stock', icon: XCircle, badge: outOfStockProducts.length > 0 ? outOfStockProducts.length : undefined, badgeColor: 'bg-rose-500 text-white' },
      ],
    },
    {
      title: 'ORDERS & PACKAGING',
      items: [
        { id: 'orders-all', label: 'All Orders', icon: ShoppingBag, badge: subOrders.length },
        { id: 'orders-ready-pack', label: 'Ready to Pack', icon: Boxes, badge: totalReadyToPack > 0 ? totalReadyToPack : undefined, badgeColor: 'bg-indigo-600 text-white animate-pulse' },
        { id: 'orders-ready-pickup', label: 'Ready for Pickup', icon: Truck },
        { id: 'orders-delivered', label: 'Delivered Orders', icon: CheckCircle2, badgeColor: 'bg-emerald-600 text-white' },
        { id: 'orders-returns', label: 'Returns & Refunds', icon: RotateCcw },
      ],
    },
    {
      title: 'FINANCE & WALLET',
      items: [
        { id: 'finance-wallet', label: 'Wallet Overview', icon: DollarSign, badge: `৳${seller.walletBalance.toLocaleString('en-BD')}`, badgeColor: 'bg-emerald-500 text-white font-mono' },
        { id: 'finance-earnings', label: 'Earnings Breakdown', icon: Receipt },
        { id: 'finance-transactions', label: 'Ledger History', icon: FileText },
        { id: 'finance-withdrawals', label: 'Payout History', icon: CreditCard },
        { id: 'finance-commission', label: 'Commission Rates', icon: Percent },
      ],
    },
    {
      title: 'GROWTH & MARKETING',
      items: [
        { id: 'analytics-sales', label: 'Sales Analytics', icon: BarChart3 },
        { id: 'ai-bot', label: 'AI Bot & Order Assistant', icon: Bot, badge: 'AI', badgeColor: 'bg-indigo-600 text-white font-mono' },
        { id: 'marketing-coupons', label: 'Coupons & Promos', icon: Tag, badge: coupons.length },
        { id: 'marketing-campaigns', label: 'Flash Campaigns', icon: Zap },
        { id: 'reviews', label: 'Customer Reviews', icon: MessageSquare, badge: reviews.length },
      ],
    },
    {
      title: 'ACCOUNT & SYSTEM',
      items: [
        { id: 'subscription-plan', label: 'My Subscription', icon: Sparkles, badge: currentPlan.name.split(' ')[0], badgeColor: 'bg-sky-600 text-white' },
        { id: 'support', label: 'Support & Tickets', icon: HelpCircle, badge: tickets.filter((t) => t.status === 'Open').length > 0 ? 'Help' : undefined },
        { id: 'settings', label: 'Account Settings', icon: Lock },
      ],
    },
  ];

  // Dynamically filter navigation sections based on Firebase Permission Matrix
  const navigationSections: NavSection[] = useMemo(() => {
    return rawNavigationSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          // Dashboard home is always accessible
          if (item.id === 'dashboard') return true;
          return isTabAllowedForRole('seller', item.id, matrixConfig);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [
    sellerProducts.length,
    lowStockProducts.length,
    outOfStockProducts.length,
    subOrders.length,
    totalReadyToPack,
    seller.walletBalance,
    coupons.length,
    reviews.length,
    currentPlan.name,
    tickets,
    matrixConfig,
  ]);

  // 1. Pending Approval check
  if (seller.accountStatus === 'pending_approval') {
    return (
      <SellerPendingScreen
        seller={seller}
        onLogout={onLogout}
        onStatusUpdated={(updated) => setSeller(updated)}
      />
    );
  }

  // 2. Subscription Expired Lock Screen
  if (isSubscriptionExpired) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-6 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>

          <div className="text-center space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 uppercase tracking-wider border border-rose-500/30">
              🚨 Subscription Expired / মেয়াদ উত্তীর্ণ
            </span>
            <h2 className="text-2xl font-black text-white">
              আপনার {currentPlan.name} সাবস্ক্রিপশন মেয়াদ শেষ হয়ে গেছে
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              আপনার স্টোরের সকল প্রোডাক্ট ({sellerProducts.length}টি), কাস্টমার অর্ডার ডাটা ও শপ সেটিংস সম্পূর্ণ নিরাপদ রয়েছে। ড্যাশবোর্ড সচল করতে পেমেন্ট সম্পন্ন করে নবায়ন সাবমিট করুন।
            </p>
          </div>

          <form onSubmit={handleRenewalSubmit} className="space-y-4 text-xs bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Select Subscription Plan</label>
              <select
                value={renewalPlanId}
                onChange={(e) => setRenewalPlanId(e.target.value as SellerPlanId)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-bold"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ৳{p.monthlyPrice}/mo ({p.commissionRate}% Commission)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Payment Method</label>
                <select
                  value={renewalPaymentMethod}
                  onChange={(e) => setRenewalPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-bold capitalize"
                >
                  <option value="bkash">bKash (01719143897)</option>
                  <option value="nagad">Nagad (01887713212)</option>
                  <option value="rocket">Rocket (01912345678)</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-300 mb-1">Sender Mobile Number</label>
                <input
                  type="text"
                  required
                  value={renewalSender}
                  onChange={(e) => setRenewalSender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Transaction ID (TrxID) *</label>
              <input
                type="text"
                required
                placeholder="e.g. Trx9981240A"
                value={renewalTxId}
                onChange={(e) => setRenewalTxId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-sky-400 font-mono font-bold text-sm"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="submit"
                className="w-full flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-lg cursor-pointer"
              >
                Submit Renewal Payment →
              </button>
              <button
                type="button"
                onClick={() => {
                  const renewedSeller: SellerUser = {
                    ...seller,
                    accountStatus: 'active',
                    subscriptionStatus: 'active',
                    subscriptionStartDate: new Date().toISOString(),
                    subscriptionEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
                  };
                  setSeller(renewedSeller);
                  setActiveSellerSession(renewedSeller);
                  saveSellers(getSellers().map((s) => (s.id === seller.id ? renewedSeller : s)));
                  alert('⚡ Instant Demo Renewal Approved! Access restored for 30 days.');
                }}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                ⚡ Instant Demo Renew
              </button>
            </div>
          </form>

          <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-800">
            <span>Shop: {seller.store.storeName}</span>
            <button onClick={onLogout} className="text-rose-400 hover:underline font-bold cursor-pointer">
              Logout Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* ================= FIXED DESKTOP / DRAWER MOBILE SIDEBAR ================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-sky-500/20">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm text-white truncate leading-tight">
                {seller.store.storeName}
              </h2>
              <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                {currentPlan.name}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsMobileNavOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-xs">
          {navigationSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  const restriction = checkTabRestriction(item.id, seller.planId);

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'products-add') {
                          setEditingProduct(null);
                          setProductForm({
                            name: '',
                            slug: '',
                            banglaName: '',
                            category: 'Smartwatch',
                            subcategory: 'Accessories',
                            price: '',
                            originalPrice: '',
                            costPrice: '',
                            stock: '20',
                            sku: '',
                            imageUrl: '',
                            galleryImages: ['', '', ''],
                            shortDescription: '',
                            description: '',
                            weight: '0.3',
                            minOrder: '1',
                            maxOrder: '10',
                            allowReselling: true,
                            resellerPrice: '',
                            suggestedResellerRetailPrice: '',
                            minResellerRetailPrice: '',
                            status: 'published',
                          });
                          setIsProductModalOpen(true);
                        } else if (item.id === 'my-store') {
                          if (onNavigateToStore) onNavigateToStore(seller.store.storeSlug);
                        } else {
                          setCurrentTab(item.id);
                        }
                        setIsMobileNavOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {restriction.restricted ? (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" />
                          <span>PRO</span>
                        </span>
                      ) : item.badge !== undefined ? (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400')
                          }`}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Account & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-800 text-sky-400 font-bold flex items-center justify-center text-xs">
              {seller.fullName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-white truncate">{seller.fullName}</p>
              <p className="text-[10px] text-slate-400 truncate">Verified Seller</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {isMobileNavOpen && (
        <div
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ================= MAIN CONTENT WRAPPER ================= */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white capitalize">
                  {currentTab.replace('-', ' ')}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Verified Shop</span>
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Store Preview */}
            <button
              onClick={() => {
                if (onNavigateToStore) onNavigateToStore(seller.store.storeSlug);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 border border-transparent dark:border-slate-700 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>View Store</span>
            </button>

            {/* Quick Add Product */}
            <button
              onClick={() => {
                setEditingProduct(null);
                setProductForm({
                  name: '',
                  slug: '',
                  banglaName: '',
                  category: 'Smartwatch',
                  subcategory: 'Accessories',
                  price: '',
                  originalPrice: '',
                  costPrice: '',
                  stock: '20',
                  sku: '',
                  imageUrl: '',
                  galleryImages: ['', '', ''],
                  shortDescription: '',
                  description: '',
                  weight: '0.3',
                  minOrder: '1',
                  maxOrder: '10',
                  allowReselling: true,
                  resellerPrice: '',
                  suggestedResellerRetailPrice: '',
                  minResellerRetailPrice: '',
                  status: 'published',
                });
                setIsProductModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Product</span>
            </button>

            {/* Subscription Countdown Chip */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 font-extrabold text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>
                {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
              </span>
              <button
                onClick={handleSimulateExpiry}
                title="Simulate Expiry (Test Lock Screen)"
                className="ml-1 text-[10px] text-rose-600 dark:text-rose-400 underline font-bold cursor-pointer hover:opacity-80"
              >
                [Expire]
              </button>
            </div>

            {/* Wallet Quick Chip */}
            <button
              onClick={() => setCurrentTab('finance-wallet')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>৳{seller.walletBalance.toLocaleString('en-BD')}</span>
            </button>
          </div>
        </header>

        {/* Dashboard Body Main View Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Permission Matrix Role-Based Restriction Gate */}
          {currentTab !== 'dashboard' && !isTabAllowedForRole('seller', currentTab, matrixConfig) ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-amber-500/30 dark:border-amber-500/20 shadow-xl text-center space-y-5 max-w-xl mx-auto my-8 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 uppercase tracking-wider border border-amber-500/30">
                  Feature Restricted by Admin
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white capitalize">
                  {currentTab.replace('-', ' ')} মডিউলটি সাময়িকভাবে স্থগিত
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  অ্যাডমিন কর্তৃক রোল পারমিশন পলিসির কারণে এই ড্যাশবোর্ড ট্যাবটি বর্তমানে বন্ধ রাখা হয়েছে। কোনো প্রশ্ন থাকলে হেল্পডেস্কে যোগাযোগ করুন।
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="px-6 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-lg cursor-pointer transition-all inline-flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Return to Dashboard (ড্যাশবোর্ড হোমে ফিরুন)</span>
                </button>
              </div>
            </div>
          ) : checkTabRestriction(currentTab, seller.planId).restricted ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 max-w-2xl mx-auto my-8 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 uppercase tracking-wider border border-amber-500/30">
                  {checkTabRestriction(currentTab, seller.planId).requiredPlanName} Feature
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white capitalize">
                  Unlock {currentTab.replace('-', ' ')}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Your current <strong className="text-slate-900 dark:text-white font-bold">{currentPlan.name}</strong> plan does not include access to this feature. Upgrade to <strong className="text-sky-600 dark:text-sky-400 font-bold">{checkTabRestriction(currentTab, seller.planId).requiredPlanName}</strong> to unlock full store analytics, marketing tools, and growth features.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Upgrade Plan Now</span>
                </button>
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ================= 1. DASHBOARD HOME ================= */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Top Seller Welcome Banner */}
              <div className="p-6 rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-white border border-slate-700 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500 text-slate-950 uppercase tracking-wider">
                      {currentPlan.name} Plan Active
                    </span>
                    <span className="text-slate-400 text-xs">
                      • {currentPlan.commissionRate}% Marketplace Commission Rate
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black mt-2">
                    Welcome back, {seller.fullName}! 👋
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                    Here is your live marketplace performance overview. You have{' '}
                    <strong className="text-amber-400">{totalReadyToPack} orders</strong> ready to be packed and{' '}
                    <strong className="text-emerald-400">৳{seller.walletBalance.toLocaleString('en-BD')}</strong> available in your wallet.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => setCurrentTab('orders-ready-pack')}
                    className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Pack Orders ({totalReadyToPack})</span>
                  </button>
                  <button
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Request Payout</span>
                  </button>
                </div>
              </div>

              {/* 10 Key Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {/* Total Sales */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gross Sales</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                    ৳{totalSalesGross.toLocaleString('en-BD')}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-bold mt-1">Live Store Revenue</span>
                </div>

                {/* Available Balance */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-900/60 shadow-2xs flex flex-col justify-between bg-emerald-50/20">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Available Wallet</span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                    ৳{seller.walletBalance.toLocaleString('en-BD')}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1">Instant Withdrawal</span>
                </div>

                {/* Pending Orders */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Orders</span>
                  <p className="text-xl sm:text-2xl font-black text-amber-600 mt-2">{totalPendingOrders}</p>
                  <span className="text-[10px] text-slate-500 mt-1">{totalReadyToPack} Ready to pack</span>
                </div>

                {/* Completed Orders */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Completed Orders</span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-2">{totalCompletedOrders}</p>
                  <span className="text-[10px] text-slate-500 mt-1">Delivered to customer</span>
                </div>

                {/* Total Products */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Products</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">{sellerProducts.length}</p>
                  <span className="text-[10px] text-sky-600 font-bold mt-1">Limit: {currentPlan.productLimit === -1 ? 'Unlimited' : currentPlan.productLimit}</span>
                </div>

                {/* Low Stock */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Low Stock Alert</span>
                  <p className="text-xl sm:text-2xl font-black text-amber-600 mt-2">{lowStockProducts.length}</p>
                  <span className="text-[10px] text-slate-500 mt-1">Stock ≤ 5 units</span>
                </div>

                {/* Out of Stock */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Out of Stock</span>
                  <p className="text-xl sm:text-2xl font-black text-rose-600 mt-2">{outOfStockProducts.length}</p>
                  <span className="text-[10px] text-slate-500 mt-1">Needs restock</span>
                </div>

                {/* Pending Balance */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">In Transit Escrow</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                    ৳{seller.pendingBalance.toLocaleString('en-BD')}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1">Released upon delivery</span>
                </div>

                {/* Total Commission */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Platform Commission</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                    ৳{seller.totalMarketplaceCommission.toLocaleString('en-BD')}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1">Tier: {currentPlan.commissionRate}%</span>
                </div>

                {/* Total Withdrawn */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Withdrawn</span>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
                    ৳{seller.totalWithdrawn.toLocaleString('en-BD')}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-bold mt-1">Paid to bank/bKash</span>
                </div>
              </div>

              {/* 2-Column Analytics Chart & Ready to Pack Queue */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sales Chart Section (8 cols) */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        Sales, Commission & Net Earnings Trend
                      </h3>
                      <p className="text-[11px] text-slate-500">Automated financial ledger analytics</p>
                    </div>

                    {/* Period Switcher */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
                      {(['today', '7d', '30d', '3m', '1y'] as const).map((period) => (
                        <button
                          key={period}
                          onClick={() => setAnalyticsPeriod(period)}
                          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer uppercase ${
                            analyticsPeriod === period
                              ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Simulated Visual Multi-bar Performance Graphic */}
                  <div className="h-56 flex items-end justify-between gap-2 pt-6 px-2">
                    {[
                      { label: 'Week 1', gross: 24000, net: 22560, fee: 1440 },
                      { label: 'Week 2', gross: 38500, net: 36190, fee: 2310 },
                      { label: 'Week 3', gross: 42000, net: 39480, fee: 2520 },
                      { label: 'Week 4', gross: 55000, net: 51700, fee: 3300 },
                      { label: 'Today', gross: 18500, net: 17390, fee: 1110 },
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="text-[10px] font-bold text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          ৳{bar.net.toLocaleString('en-BD')}
                        </div>
                        <div className="w-full max-w-[40px] bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                          <div
                            className="bg-sky-500 group-hover:bg-sky-400 transition-all rounded-t-xl"
                            style={{ height: `${Math.min(100, (bar.net / 55000) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 mt-1">{bar.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-sky-500" />
                        <span>Net Seller Profit ({100 - currentPlan.commissionRate}%)</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-md bg-slate-300 dark:bg-slate-700" />
                        <span>Marketplace Fee ({currentPlan.commissionRate}%)</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ready to Pack Queue (4 cols) */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-indigo-500" />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Ready to Pack Queue</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {totalReadyToPack} Pending
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-72">
                    {subOrders
                      .filter((o) => o.orderStatus === 'Confirmed' || o.orderStatus === 'Processing')
                      .slice(0, 4)
                      .map((ord) => (
                        <div
                          key={ord.id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sky-600">#{ord.id}</span>
                            <span className="font-extrabold text-slate-900 dark:text-white">৳{ord.subtotal.toLocaleString('en-BD')}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate">
                            {ord.items.map((it) => `${it.name} (x${it.quantity})`).join(', ')}
                          </p>
                          <div className="flex items-center justify-between pt-1 text-[10px]">
                            <span className="text-slate-400">To: {ord.customerInfo.city}</span>
                            <button
                              onClick={() => {
                                handleUpdateOrderStatus(ord.id, 'Packed');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors cursor-pointer"
                            >
                              Mark Packed ✓
                            </button>
                          </div>
                        </div>
                      ))}

                    {totalReadyToPack === 0 && (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        All orders are packaged and ready for pickup! 🎉
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentTab('orders-ready-pack')}
                    className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold text-center transition-colors cursor-pointer"
                  >
                    Open Packaging Workflow Center →
                  </button>
                </div>
              </div>

              {/* Recent Orders Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Recent Customer Sub-Orders
                  </h3>
                  <button
                    onClick={() => setCurrentTab('orders-all')}
                    className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Orders ({subOrders.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Sub-Order ID</th>
                        <th className="px-4 py-3">Customer Details</th>
                        <th className="px-4 py-3">Items Ordered</th>
                        <th className="px-4 py-3">Gross Subtotal</th>
                        <th className="px-4 py-3">Marketplace Fee ({currentPlan.commissionRate}%)</th>
                        <th className="px-4 py-3">Net Earnings</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {subOrders.slice(0, 5).map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-sky-600">#{ord.id}</td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900 dark:text-white">{ord.customerInfo.name}</p>
                            <p className="text-[11px] text-slate-400">{ord.customerInfo.phone}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                            {ord.items.map((it) => `${it.name} (x${it.quantity})`).join(', ')}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white font-mono">
                            ৳{ord.subtotal.toLocaleString('en-BD')}
                          </td>
                          <td className="px-4 py-3 text-rose-600 font-mono">-৳{ord.commissionAmount.toLocaleString('en-BD')}</td>
                          <td className="px-4 py-3 font-extrabold text-emerald-600 font-mono">
                            ৳{ord.netSellerEarnings.toLocaleString('en-BD')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                ord.orderStatus === 'Delivered'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : ord.orderStatus === 'Ready for Pickup'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                  : ord.orderStatus === 'Packed'
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {ord.orderStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedSlipOrder(ord)}
                                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                                title="Print Packing Slip"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setSelectedOrderDetails(ord)}
                                className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 font-bold hover:bg-sky-100 cursor-pointer"
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 2. PRODUCTS (ALL / LOW STOCK / OUT OF STOCK / DRAFTS / PENDING) ================= */}
          {(currentTab === 'products-all' ||
            currentTab === 'products-low-stock' ||
            currentTab === 'products-out-of-stock' ||
            currentTab === 'products-drafts' ||
            currentTab === 'products-pending') && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search product name, category, SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({
                        name: '',
                        slug: '',
                        banglaName: '',
                        category: 'Smartwatch',
                        subcategory: 'Accessories',
                        price: '',
                        originalPrice: '',
                        costPrice: '',
                        stock: '20',
                        sku: '',
                        imageUrl: '',
                        galleryImages: ['', '', ''],
                        shortDescription: '',
                        description: '',
                        weight: '0.3',
                        minOrder: '1',
                        maxOrder: '10',
                        allowReselling: true,
                        resellerPrice: '',
                        suggestedResellerRetailPrice: '',
                        minResellerRetailPrice: '',
                        status: 'published',
                      });
                      setIsProductModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload New Product</span>
                  </button>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sellerProducts
                  .filter((p) => {
                    if (currentTab === 'products-low-stock') return p.stock > 0 && p.stock <= 5;
                    if (currentTab === 'products-out-of-stock') return p.stock <= 0;
                    if (currentTab === 'products-drafts') return p.status === 'draft';
                    if (currentTab === 'products-pending') return p.status === 'pending';
                    return true;
                  })
                  .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((prod) => (
                    <div
                      key={prod.id}
                      className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between group hover:border-sky-500 transition-all"
                    >
                      <div>
                        <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3">
                          <img
                            src={prod.images?.[0]}
                            alt={prod.name}
                            className="w-full h-full object-contain p-2"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                            {prod.category}
                          </span>
                          <span
                            className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              prod.stock > 5 ? 'bg-emerald-500 text-white' : prod.stock > 0 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                            }`}
                          >
                            Stock: {prod.stock}
                          </span>
                        </div>

                        <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2">
                          {prod.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 font-mono">
                          <span className="text-base font-black text-sky-600 dark:text-sky-400">
                            ৳{prod.price.toLocaleString('en-BD')}
                          </span>
                          {prod.originalPrice > prod.price && (
                            <span className="text-xs text-slate-400 line-through">
                              ৳{prod.originalPrice.toLocaleString('en-BD')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className="text-slate-400 font-mono">SKU: {prod.sku}</span>
                          {prod.allowReselling !== false ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800 text-[10px]">
                              Wholesale: ৳{prod.resellerPrice || Math.round(prod.price * 0.8)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Direct Only</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            setEditingProduct(prod);
                            setProductForm({
                              name: prod.name,
                              slug: prod.slug || '',
                              banglaName: prod.banglaName || '',
                              category: prod.category || 'Smartwatch',
                              subcategory: prod.subcategory || '',
                              price: prod.price.toString(),
                              originalPrice: (prod.originalPrice || prod.price).toString(),
                              costPrice: (prod.costPrice || '').toString(),
                              stock: prod.stock.toString(),
                              sku: prod.sku,
                              imageUrl: prod.images?.[0] || '',
                              galleryImages: [prod.images?.[1] || '', prod.images?.[2] || '', prod.images?.[3] || ''],
                              shortDescription: prod.shortDescription || '',
                              description: prod.description || '',
                              weight: '0.3',
                              minOrder: '1',
                              maxOrder: '10',
                              allowReselling: prod.allowReselling !== false,
                              resellerPrice: (prod.resellerPrice || Math.round(prod.price * 0.8)).toString(),
                              suggestedResellerRetailPrice: (prod.suggestedResellerRetailPrice || prod.price).toString(),
                              minResellerRetailPrice: (prod.minResellerRetailPrice || Math.round(prod.price * 0.9)).toString(),
                              status: 'published',
                            });
                            setIsProductModalOpen(true);
                          }}
                          className="flex-1 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this product from your store catalogue?')) {
                              onDeleteProduct(prod.id);
                            }
                          }}
                          className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ================= 3. READY TO PACK WORKFLOW ================= */}
          {currentTab === 'orders-ready-pack' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-5 rounded-3xl bg-linear-to-r from-indigo-900 to-slate-900 text-white border border-indigo-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-400 text-indigo-950 uppercase">
                    Packaging & Courier Handover Hub
                  </span>
                  <h2 className="text-base sm:text-lg font-bold mt-1">Merchant Packaging Workflow</h2>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Verify order contents, print the official packing slip, seal the parcel, and mark "Packed" for courier pickup.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subOrders
                  .filter((o) => o.orderStatus === 'Confirmed' || o.orderStatus === 'Processing' || o.orderStatus === 'New')
                  .map((ord) => (
                    <div
                      key={ord.id}
                      className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <span className="font-mono font-bold text-sky-600 text-sm">#{ord.id}</span>
                          <p className="text-[11px] text-slate-400">Order: #{ord.parentOrderId}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Needs Packaging
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="space-y-2">
                        {ord.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.name} <span className="text-sky-600">x{item.quantity}</span>
                            </span>
                            <span className="font-mono text-slate-600 dark:text-slate-400">৳{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                        <p><strong>Customer:</strong> {ord.customerInfo.name} ({ord.customerInfo.phone})</p>
                        <p><strong>Address:</strong> {ord.customerInfo.address}, {ord.customerInfo.city}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => setSelectedSlipOrder(ord)}
                          className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Slip</span>
                        </button>
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'Packed')}
                          className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Packed</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ================= 4. ALL ORDERS ================= */}
          {(currentTab === 'orders-all' ||
            currentTab === 'orders-new' ||
            currentTab === 'orders-processing' ||
            currentTab === 'orders-ready-pickup' ||
            currentTab === 'orders-delivered' ||
            currentTab === 'orders-cancelled' ||
            currentTab === 'orders-returns') && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Seller Order Management</h3>
                  <span className="text-xs text-slate-500">{subOrders.length} Sub-Orders</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Sub-Order ID</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Products</th>
                        <th className="px-4 py-3">Subtotal</th>
                        <th className="px-4 py-3">Marketplace Commission</th>
                        <th className="px-4 py-3">Net Profit</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {subOrders
                        .filter((o) => {
                          if (currentTab === 'orders-new') return o.orderStatus === 'New';
                          if (currentTab === 'orders-processing') return o.orderStatus === 'Processing' || o.orderStatus === 'Confirmed';
                          if (currentTab === 'orders-ready-pickup') return o.orderStatus === 'Packed' || o.orderStatus === 'Ready for Pickup';
                          if (currentTab === 'orders-delivered') return o.orderStatus === 'Delivered';
                          if (currentTab === 'orders-cancelled') return o.orderStatus === 'Cancelled';
                          if (currentTab === 'orders-returns') return o.orderStatus === 'Returned' || o.orderStatus === 'Refunded';
                          return true;
                        })
                        .map((ord) => (
                          <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 font-mono font-bold text-sky-600">#{ord.id}</td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900 dark:text-white">{ord.customerInfo.name}</p>
                              <p className="text-[11px] text-slate-400">{ord.customerInfo.phone}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                              {ord.items.map((it) => `${it.name} (x${it.quantity})`).join(', ')}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-white font-mono">
                              ৳{ord.subtotal.toLocaleString('en-BD')}
                            </td>
                            <td className="px-4 py-3 text-rose-600 font-mono">-৳{ord.commissionAmount.toLocaleString('en-BD')}</td>
                            <td className="px-4 py-3 font-extrabold text-emerald-600 font-mono">
                              ৳{ord.netSellerEarnings.toLocaleString('en-BD')}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  ord.orderStatus === 'Delivered'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : ord.orderStatus === 'Ready for Pickup'
                                    ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {ord.orderStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedSlipOrder(ord)}
                                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                                  title="Print Packing Slip"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setSelectedOrderDetails(ord)}
                                  className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 font-bold hover:bg-sky-100 cursor-pointer"
                                >
                                  View
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 5.1 FINANCE: WALLET OVERVIEW ================= */}
          {currentTab === 'finance-wallet' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-6 rounded-3xl bg-linear-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border border-emerald-700/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-emerald-950 uppercase tracking-wider">
                    Official Seller Balance
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black mt-2">
                    ৳{seller.walletBalance.toLocaleString('en-BD')}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
                    <span>Withdrawn: ৳{seller.totalWithdrawn.toLocaleString('en-BD')}</span>
                    <span>•</span>
                    <span>Escrow Pending: ৳{seller.pendingBalance.toLocaleString('en-BD')}</span>
                    <span>•</span>
                    <span>All Time Net Earnings: ৳{seller.totalEarnings.toLocaleString('en-BD')}</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Request Cashout (৳)</span>
                </button>
              </div>

              {/* Linked Accounts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">bKash Payout Account</span>
                  <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {seller.paymentInfo?.bkash || seller.phone || 'Not Configured'}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold block">Personal / Merchant Agent</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Nagad Payout Account</span>
                  <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {seller.paymentInfo?.nagad || seller.phone || 'Not Configured'}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold block">Active Gateway</span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Bank Account</span>
                  <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {seller.paymentInfo?.bankAccount ? `${seller.paymentInfo.bankName || 'Bank'} (${seller.paymentInfo.bankAccount})` : 'Not Linked'}
                  </p>
                  <span className="text-[10px] text-slate-400 block">EFT / BEFTN Direct</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= 5.2 FINANCE: EARNINGS BREAKDOWN ================= */}
          {currentTab === 'finance-earnings' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400">Total Gross Orders Volume</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">৳{totalSalesGross.toLocaleString('en-BD')}</p>
                  <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Live Customer Revenue</span>
                </div>
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400">Marketplace Fee ({currentPlan.commissionRate}%)</span>
                  <p className="text-2xl font-black text-rose-600 mt-1">৳{seller.totalMarketplaceCommission.toLocaleString('en-BD')}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">{currentPlan.name} Commission Tier</span>
                </div>
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400">Net Seller Earnings</span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">৳{seller.totalEarnings.toLocaleString('en-BD')}</p>
                  <span className="text-[10px] text-emerald-500 font-bold mt-1 block">Net Profit Margin: {100 - currentPlan.commissionRate}%</span>
                </div>
              </div>

              {/* Profit Margin Bar */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Earnings Distribution Overview</h3>
                <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${100 - currentPlan.commissionRate}%` }} />
                  <div className="bg-rose-500 h-full" style={{ width: `${currentPlan.commissionRate}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 pt-1">
                  <span>Net Seller Profit ({100 - currentPlan.commissionRate}%)</span>
                  <span>Platform Fee ({currentPlan.commissionRate}%)</span>
                </div>
              </div>
            </div>
          )}

          {/* ================= 5.3 FINANCE: TRANSACTIONS LEDGER ================= */}
          {currentTab === 'finance-transactions' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Financial Ledger & Audit Log</h3>
                  <span className="text-xs text-slate-500">{ledgers.length} Ledger Records</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Txn ID</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Gross (৳)</th>
                        <th className="px-4 py-3">Fee (৳)</th>
                        <th className="px-4 py-3">Net Credit / Debit</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {ledgers.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">{l.id}</td>
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{l.description}</td>
                          <td className="px-4 py-3 font-mono">৳{l.grossAmount.toLocaleString('en-BD')}</td>
                          <td className="px-4 py-3 font-mono text-rose-600">-৳{l.commissionAmount.toLocaleString('en-BD')}</td>
                          <td
                            className={`px-4 py-3 font-extrabold font-mono ${
                              l.netAmount > 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {l.netAmount > 0 ? `+৳${l.netAmount.toLocaleString('en-BD')}` : `-৳${Math.abs(l.netAmount).toLocaleString('en-BD')}`}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {l.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-[11px]">{new Date(l.createdAt).toLocaleDateString('en-GB')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 5.4 FINANCE: WITHDRAWALS PAYOUT HISTORY ================= */}
          {currentTab === 'finance-withdrawals' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Withdrawal & Payout Log</h3>
                  <p className="text-xs text-slate-500">Track requested cashouts, processing status, and bank/bKash transfer proofs</p>
                </div>
                <button
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Request Cashout</span>
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Request ID</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3">Destination Account</th>
                        <th className="px-4 py-3">Requested Amount</th>
                        <th className="px-4 py-3">Transfer Fee</th>
                        <th className="px-4 py-3">Payable BDT</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {withdrawals.length > 0 ? (
                        withdrawals.map((w) => (
                          <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 font-mono font-bold text-sky-600">{w.id}</td>
                            <td className="px-4 py-3 font-bold uppercase">{w.method}</td>
                            <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">{w.accountDetails}</td>
                            <td className="px-4 py-3 font-bold font-mono">৳{w.amount.toLocaleString('en-BD')}</td>
                            <td className="px-4 py-3 text-rose-600 font-mono">-৳{w.withdrawalFee}</td>
                            <td className="px-4 py-3 font-extrabold text-emerald-600 font-mono">৳{w.payableAmount.toLocaleString('en-BD')}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  w.status === 'Paid' || w.status === 'Approved'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : w.status === 'Rejected'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {w.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-[11px]">{new Date(w.requestedAt).toLocaleDateString('en-GB')}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                            No cashout requests found. Click "Request Cashout" above to withdraw earnings to bKash or Bank!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 5.5 FINANCE: COMMISSION RATES & SAVINGS ================= */}
          {currentTab === 'finance-commission' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                    Tier Fee Comparison
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Platform Commission Rate Structure</h3>
                  <p className="text-xs text-slate-500">Your current plan ({currentPlan.name}) charges {currentPlan.commissionRate}% marketplace fee per completed sub-order.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {plans.map((p) => (
                    <div
                      key={p.id}
                      className={`p-5 rounded-2xl border-2 space-y-3 ${
                        seller.planId === p.id
                          ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</h4>
                        {seller.planId === p.id && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-600 text-white">
                            Current Plan
                          </span>
                        )}
                      </div>

                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{p.commissionRate}% Fee</p>

                      <ul className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px]">
                        <li>✓ Keep {100 - p.commissionRate}% of gross sales</li>
                        <li>✓ {p.productLimit === -1 ? 'Unlimited' : p.productLimit} Products Upload</li>
                        <li>✓ {p.supportLevel.replace(/_/g, ' ')} support</li>
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= 6. AI BOT & ORDER ASSISTANT ================= */}
          {currentTab === 'ai-bot' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-6 rounded-3xl bg-linear-to-r from-indigo-950 via-slate-900 to-sky-950 text-white border border-indigo-700/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-sky-400" />
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-400 text-sky-950 uppercase tracking-wider">
                      AI Order Intake & Assistant Bot
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black mt-2">Seller Multi-Channel AI Assistant</h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Automate customer order placement, generate product descriptions in Bengali, and handle inquiry chats via AI.
                  </p>
                </div>

                <span className="px-4 py-2 rounded-2xl bg-indigo-600/80 border border-indigo-400 text-white font-extrabold text-xs">
                  {currentPlan.name} Tier AI Active
                </span>
              </div>

              {/* AI Features Matrix by Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Basic Free Tier</span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Manual Store Mode</h4>
                  <p className="text-slate-500 text-[11px]">AI Bot is locked. Products & orders must be added manually.</p>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 shadow-2xs space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-500">Standard Pro Tier</span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">AI Content Copywriter</h4>
                  <p className="text-slate-500 text-[11px]">Auto-generate Bengali titles, bullet specs, and SEO descriptions for products.</p>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-sky-300 dark:border-sky-800 shadow-2xs space-y-2">
                  <span className="text-[10px] font-extrabold uppercase text-sky-500">Premium Enterprise Tier</span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">AI Full Order Intake Bot</h4>
                  <p className="text-slate-500 text-[11px]">Automatically parses customer chat orders & creates sub-orders in real-time!</p>
                </div>
              </div>

              {/* Interactive AI Order Intake Simulator */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">AI Customer Order Intake Simulator</h3>
                  </div>
                  <span className="text-[11px] text-slate-400">Test AI parsing customer text into a live Sub-Order</span>
                </div>

                {aiOrderNotice && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                    {aiOrderNotice}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Paste or type customer chat message in Bengali or English:
                  </label>
                  <textarea
                    rows={3}
                    value={aiOrderPrompt}
                    onChange={(e) => setAiOrderPrompt(e.target.value)}
                    placeholder="e.g. আমি ১টি ওয়াচ আর ইয়ারবাডস ধানমন্ডি ঢাকায় ০১৭০০০০০০০০ নম্বরে নিতে চাই"
                    className="w-full p-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium"
                  />

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-[11px] text-slate-500">AI parses items, quantity, phone, and district automatically.</p>
                    <button
                      onClick={() => {
                        if (currentPlan.id !== 'premium') {
                          alert('⚡ AI Order Intake Bot requires Premium Enterprise Plan. Upgrade to unlock full multi-channel automated order taking!');
                          return;
                        }

                        const newSubOrder: SellerSubOrder = {
                          id: `SUB-AI-${Date.now().toString().slice(-5)}`,
                          parentOrderId: `ORD-AI-${Date.now().toString().slice(-4)}`,
                          sellerId: seller.id,
                          customerInfo: {
                            name: 'AI Auto-Intake Customer',
                            phone: '01700000000',
                            address: 'Dhanmondi, Dhaka',
                            city: 'Dhaka',
                            district: 'Dhaka',
                          },
                          items: [
                            {
                              productId: 'P1',
                              productName: 'Ultra Pro Smartwatch Series 9',
                              name: 'Ultra Pro Smartwatch Series 9',
                              productImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
                              price: 3250,
                              quantity: 1,
                              total: 3250,
                            },
                          ],
                          subtotal: 3250,
                          discount: 0,
                          deliveryCharge: 70,
                          commissionPercentage: currentPlan.commissionRate,
                          commissionAmount: Math.round(3250 * (currentPlan.commissionRate / 100)),
                          netSellerEarnings: 3250 - Math.round(3250 * (currentPlan.commissionRate / 100)),
                          orderStatus: 'New',
                          paymentStatus: 'Unpaid',
                          createdAt: new Date().toISOString(),
                        };

                        const updated = [newSubOrder, ...subOrders];
                        setSubOrders(updated);
                        saveSellerSubOrders([newSubOrder, ...getSellerSubOrders()]);
                        setAiOrderNotice(`🎉 AI Bot successfully recognized order details and generated New Sub-Order #${newSubOrder.id}! Check the Orders tab.`);
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bot className="w-4 h-4" />
                      <span>Test AI Auto-Order Creation</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= 6. SUBSCRIPTION ================= */}
          {(currentTab === 'subscription-plan' || currentTab === 'subscription-upgrade') && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                      Current Subscription
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{currentPlan.name}</h2>
                    <p className="text-xs text-slate-500">
                      Renews on: {new Date(seller.subscriptionEndDate).toLocaleDateString('en-GB')}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-900 dark:text-white">
                      ৳{currentPlan.monthlyPrice.toLocaleString('en-BD')}/mo
                    </p>
                    <p className="text-xs text-emerald-600 font-bold">{currentPlan.commissionRate}% Marketplace Commission</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500">Product Limit</p>
                    <p className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                      {currentPlan.productLimit === -1 ? 'Unlimited Products' : `${sellerProducts.length} / ${currentPlan.productLimit} Used`}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500">Support Priority</p>
                    <p className="font-bold text-sm text-slate-900 dark:text-white mt-1 capitalize">
                      {currentPlan.supportLevel.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500">Promotions & Coupons</p>
                    <p className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                      {currentPlan.couponToolsEnabled ? 'Enabled ✓' : 'Disabled in Basic'}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Change or Upgrade Seller Plan</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= 7. SUPPORT TICKETS ================= */}
          {currentTab === 'support' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Seller Support & Help Center</h3>
                  <p className="text-[11px] text-slate-500">Direct assistance from KenaX BD marketplace operations</p>
                </div>
                <button
                  onClick={() => setIsTicketModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Submit Support Ticket</span>
                </button>
              </div>

              <div className="space-y-3">
                {tickets.map((tck) => (
                  <div
                    key={tck.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sky-600 text-xs">#{tck.id}</span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{tck.subject}</h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {tck.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300">{tck.description}</p>

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      {tck.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`p-3 rounded-2xl text-xs ${
                            m.sender === 'admin'
                              ? 'bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-slate-800 dark:text-slate-200'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>{m.senderName}</span>
                            <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p>{m.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= 8. STORE SETTINGS & BRANDING ================= */}
          {(currentTab === 'store-settings' || currentTab === 'settings') && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 animate-in fade-in duration-150">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Store Profile & Logistics Settings</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Store Name</label>
                  <input
                    type="text"
                    value={seller.store.storeName}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Public URL Slug</label>
                  <input
                    type="text"
                    value={`kenaxbd.com/store/${seller.store.storeSlug}`}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Pickup Address</label>
                  <input
                    type="text"
                    value={seller.store.address}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">District / Thana</label>
                  <input
                    type="text"
                    value={`${seller.store.upazila}, ${seller.store.district}`}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= 9. ANALYTICS (SALES / PRODUCTS / CUSTOMERS) ================= */}
          {(currentTab === 'analytics-sales' ||
            currentTab === 'analytics-products' ||
            currentTab === 'analytics-customers') && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400">Total Gross Sales</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">৳{(totalSalesGross + 28500).toLocaleString('en-BD')}</p>
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 mt-1">
                    <TrendingUp className="w-3 h-3" /> +18.4% this month
                  </span>
                </div>
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400">Net Seller Payout</span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">৳{Math.round((totalSalesGross + 28500) * (1 - currentPlan.commissionRate / 100)).toLocaleString('en-BD')}</p>
                  <span className="text-[10px] text-slate-400 mt-1">After {currentPlan.commissionRate}% fee</span>
                </div>
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400">Conversion Rate</span>
                  <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">4.2%</p>
                  <span className="text-[10px] text-emerald-500 font-bold mt-1">Top 10% in Category</span>
                </div>
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <span className="text-xs font-bold text-slate-400">Repeat Customers</span>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">38%</p>
                  <span className="text-[10px] text-slate-400 mt-1">Loyal Buyers</span>
                </div>
              </div>

              {/* District Sales Breakdown */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Regional Customer Demographics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { city: 'Dhaka Division', share: '54%', orders: '142 Orders', bg: 'bg-sky-500' },
                    { city: 'Chittagong Division', share: '22%', orders: '58 Orders', bg: 'bg-emerald-500' },
                    { city: 'Sylhet Division', share: '14%', orders: '36 Orders', bg: 'bg-indigo-500' },
                    { city: 'Rajshahi & Khulna', share: '10%', orders: '26 Orders', bg: 'bg-amber-500' },
                  ].map((d, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{d.city}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${d.bg}`} />
                      </div>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{d.share}</p>
                      <span className="text-[10px] text-slate-400">{d.orders}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= 10. MARKETING & COUPONS ================= */}
          {(currentTab === 'marketing-coupons' ||
            currentTab === 'marketing-promotions' ||
            currentTab === 'marketing-featured' ||
            currentTab === 'marketing-campaigns') && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Coupons Header */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Store Coupons & Promotional Campaigns</h3>
                  <p className="text-xs text-slate-500">Create discount codes and participate in marketplace mega flash sales</p>
                </div>

                <button
                  onClick={() => setIsCouponModalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Discount Coupon</span>
                </button>
              </div>

              {/* Coupons Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Active Discount Codes</h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Coupon Code</th>
                        <th className="px-4 py-3">Discount</th>
                        <th className="px-4 py-3">Min Order</th>
                        <th className="px-4 py-3">Usage</th>
                        <th className="px-4 py-3">Expiry Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {coupons.map((cpn) => (
                        <tr key={cpn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3 font-mono font-black text-sky-600 text-sm">{cpn.code}</td>
                          <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                            {cpn.discountType === 'percentage' ? `${cpn.discountValue}% OFF` : `৳${cpn.discountValue} OFF`}
                          </td>
                          <td className="px-4 py-3 font-mono">৳{cpn.minOrderAmount}</td>
                          <td className="px-4 py-3 font-bold">{cpn.usedCount} / {cpn.usageLimit}</td>
                          <td className="px-4 py-3 text-slate-400">{new Date(cpn.expiryDate).toLocaleDateString('en-GB')}</td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              ● Active
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(cpn.code);
                                alert(`Copied coupon code ${cpn.code} to clipboard!`);
                              }}
                              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] cursor-pointer"
                            >
                              Copy Code
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= 11. REVIEWS ================= */}
          {currentTab === 'reviews' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Customer Feedback & Ratings</h3>
                  <p className="text-xs text-slate-500">View product reviews left by verified buyers</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <span className="text-2xl font-black">4.9</span>
                    <div className="text-[11px]">
                      <p className="font-bold">★★★★★</p>
                      <p className="text-slate-400">{reviews.length} Verified Reviews</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-sky-600 font-bold flex items-center justify-center text-xs">
                          {rev.customerName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">{rev.customerName}</h4>
                          <span className="text-[10px] text-amber-500 font-black">{'★'.repeat(rev.rating)}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(rev.createdAt).toLocaleDateString('en-GB')}</span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 italic">"{rev.comment}"</p>

                    {rev.sellerReply ? (
                      <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-xs space-y-1">
                        <span className="font-bold text-sky-600 text-[10px] block">Your Store Response:</span>
                        <p className="text-slate-800 dark:text-slate-200">{rev.sellerReply.message}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const reply = prompt(`Reply to ${rev.customerName}:`);
                          if (reply) {
                            setReviews(
                              reviews.map((r) =>
                                r.id === rev.id
                                  ? { ...r, sellerReply: { message: reply, repliedAt: new Date().toISOString() } }
                                  : r
                              )
                            );
                          }
                        }}
                        className="text-xs font-bold text-sky-600 hover:underline cursor-pointer"
                      >
                        + Add Seller Reply
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= 12. SUBSCRIPTION BILLING & INVOICES ================= */}
          {currentTab === 'subscription-billing' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Subscription Payment Receipts & Invoices</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Invoice #</th>
                        <th className="px-4 py-3">Plan Name</th>
                        <th className="px-4 py-3">Billing Cycle</th>
                        <th className="px-4 py-3">Amount Paid</th>
                        <th className="px-4 py-3">Date Paid</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-mono font-bold text-sky-600">INV-2026-0901</td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{currentPlan.name}</td>
                        <td className="px-4 py-3 capitalize">{seller.billingCycle || 'Monthly'}</td>
                        <td className="px-4 py-3 font-mono font-bold">
                          {currentPlan.monthlyPrice === 0 ? '৳০ (Free)' : `৳${currentPlan.monthlyPrice.toLocaleString('en-BD')}`}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{new Date(seller.subscriptionStartDate || seller.createdAt).toLocaleDateString('en-GB')}</td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Paid ✓
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => alert(`Downloading Invoice INV-2026-0901 for ${seller.store.storeName}...`)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 cursor-pointer"
                            title="Download PDF Invoice"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
            </>
          )}
        </main>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Packing Slip Modal */}
      {selectedSlipOrder && (
        <PackingSlipModal
          order={selectedSlipOrder}
          seller={seller}
          onClose={() => setSelectedSlipOrder(null)}
        />
      )}

      {/* 2. Withdrawal Request Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Request Wallet Payout</h3>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {withdrawNotice && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                {withdrawNotice}
              </div>
            )}

            <form onSubmit={handleSubmitWithdrawal} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payout Amount (৳ BDT) *
                </label>
                <input
                  type="number"
                  required
                  min="500"
                  max={seller.walletBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Available Balance: ৳{seller.walletBalance.toLocaleString('en-BD')}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payout Method *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bkash', 'nagad', 'bank'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setWithdrawMethod(m);
                        if (m === 'bkash') setWithdrawAccount(seller.paymentInfo?.bkash || seller.phone || '');
                        if (m === 'nagad') setWithdrawAccount(seller.paymentInfo?.nagad || seller.phone || '');
                        if (m === 'bank') setWithdrawAccount(seller.paymentInfo?.bankAccount || '');
                      }}
                      className={`py-2 rounded-xl border font-bold capitalize transition-colors cursor-pointer ${
                        withdrawMethod === m
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Account Details / Number *
                </label>
                <input
                  type="text"
                  required
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  placeholder="Enter destination account number"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs cursor-pointer"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Product Add / Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingProduct ? 'Edit Store Product' : 'Upload New Product to KenaX BD'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">Product Title *</label>
                  <button
                    type="button"
                    onClick={handleAIGenerateProductDetails}
                    disabled={isGeneratingAI}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Wand2 className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingAI ? 'Generating...' : '✨ AI Auto-Generate Details'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Digital Printed Three Pieces / Smartwatch Series 9"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => {
                      const newCatName = e.target.value;
                      const activeCatObj = INITIAL_CATEGORIES.find((c) => c.name === newCatName);
                      let firstSub = 'General';
                      if (activeCatObj && activeCatObj.subcategories && activeCatObj.subcategories.length > 0) {
                        const s = activeCatObj.subcategories[0];
                        firstSub = typeof s === 'string' ? s : s.name;
                      }
                      setProductForm({ ...productForm, category: newCatName, subcategory: firstSub });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    {INITIAL_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subcategory</label>
                  <select
                    value={productForm.subcategory}
                    onChange={(e) => setProductForm({ ...productForm, subcategory: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    {(() => {
                      const activeCatObj = INITIAL_CATEGORIES.find((c) => c.name === productForm.category);
                      if (!activeCatObj || !activeCatObj.subcategories) {
                        return <option value="General Subcategory">General Subcategory</option>;
                      }
                      return activeCatObj.subcategories.map((sub, idx) => {
                        const subName = typeof sub === 'string' ? sub : sub.name;
                        return (
                          <option key={idx} value={subName}>
                            {subName}
                          </option>
                        );
                      });
                    })()}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Selling Price (৳) *</label>
                  <input
                    type="number"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="3250"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Original Price (৳)</label>
                  <input
                    type="number"
                    value={productForm.originalPrice}
                    onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                    placeholder="4000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">SKU</label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    placeholder="SKU-AUTO"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Product Main Image URL</label>
                <input
                  type="url"
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Description</label>
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Key features, specifications, and warranty details..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Reseller Marketplace Distribution Settings */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      🛍️ Reseller Marketplace Distribution (রিসেলার দিয়ে বিক্রি করান)
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.allowReselling}
                      onChange={(e) => setProductForm({ ...productForm, allowReselling: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <span className="font-bold text-[11px] text-emerald-700 dark:text-emerald-300">
                      Allow Reselling
                    </span>
                  </label>
                </div>

                {productForm.allowReselling && (
                  <div className="space-y-3 pt-2 border-t border-emerald-200 dark:border-emerald-900/60">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      হাজার হাজার রিসেলার আপনার এই পণ্যটি তাদের কাস্টমারদের কাছে বিক্রি করবে। আপনি পাইকারি মূল্য নির্ধারণ করে দিন:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-emerald-800 dark:text-emerald-300 mb-1 text-[11px]">
                          Wholesale Price for Resellers (৳) *
                        </label>
                        <input
                          type="number"
                          value={productForm.resellerPrice}
                          onChange={(e) => setProductForm({ ...productForm, resellerPrice: e.target.value })}
                          placeholder={productForm.price ? Math.round(parseFloat(productForm.price) * 0.8).toString() : '2600'}
                          className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                        />
                        <span className="text-[10px] text-slate-400">রিসেলারের জন্য ক্রয় মূল্য</span>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                          Suggested Retail Price (৳)
                        </label>
                        <input
                          type="number"
                          value={productForm.suggestedResellerRetailPrice}
                          onChange={(e) => setProductForm({ ...productForm, suggestedResellerRetailPrice: e.target.value })}
                          placeholder={productForm.price || '3250'}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <span className="text-[10px] text-slate-400">প্রস্তাবিত খুচরা বিক্রয় মূল্য</span>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                          Minimum Price Limit (৳)
                        </label>
                        <input
                          type="number"
                          value={productForm.minResellerRetailPrice}
                          onChange={(e) => setProductForm({ ...productForm, minResellerRetailPrice: e.target.value })}
                          placeholder={productForm.price ? Math.round(parseFloat(productForm.price) * 0.9).toString() : '2900'}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <span className="text-[10px] text-slate-400">সর্বনিম্ন বিক্রয় মূল্য</span>
                      </div>
                    </div>

                    {/* Live Margin Calculation Preview */}
                    {productForm.price && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-[11px] text-emerald-300">
                        <span>
                          💰 <strong>আপনার নিশ্চিত পাইকারি আয়:</strong> ৳{productForm.resellerPrice || Math.round(parseFloat(productForm.price) * 0.8)} / ইউনিট
                        </span>
                        <span className="font-bold">
                          রিসেলার লাভ: ~৳{(parseFloat(productForm.suggestedResellerRetailPrice || productForm.price) - (parseFloat(productForm.resellerPrice) || Math.round(parseFloat(productForm.price) * 0.8)))}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Publish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Plan Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Upgrade Your Seller Plan</h3>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border-2 flex flex-col justify-between ${
                    seller.planId === p.id
                      ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</h4>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">৳{p.monthlyPrice}/mo</p>
                    <p className="text-xs text-emerald-600 font-bold mt-0.5">{p.commissionRate}% Commission</p>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {p.productLimit === -1 ? 'Unlimited' : p.productLimit} Products
                    </p>
                  </div>

                  <button
                    disabled={seller.planId === p.id}
                    onClick={() => handleConfirmPlanUpgrade(p)}
                    className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      seller.planId === p.id
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-sky-600 hover:bg-sky-500 text-white shadow-xs'
                    }`}
                  >
                    {seller.planId === p.id ? 'Current Plan' : 'Select Plan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Support Ticket Modal */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Submit New Support Ticket</h3>
              <button
                onClick={() => setIsTicketModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  placeholder="e.g. Courier Pickup Schedule Request"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Orders & Shipping">Orders & Shipping</option>
                  <option value="Payment & Payout">Payment & Payout</option>
                  <option value="Products & Catalog">Products & Catalog</option>
                  <option value="Account & Verification">Account & Verification</option>
                  <option value="Technical">Technical</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description *</label>
                <textarea
                  rows={4}
                  required
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  placeholder="Describe your issue or request in detail..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
