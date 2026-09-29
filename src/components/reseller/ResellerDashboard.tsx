import React, { useState, useMemo, useEffect } from 'react';
import {
  Boxes,
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
  Target,
  Users,
  User,
  Heart,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  Bell,
  Star,
  Receipt,
  UserPlus,
  BarChart3,
  Percent,
  Sliders,
  Calendar,
  Lock,
  MessageSquare,
  BadgeCheck,
  Menu,
  Trophy,
  Megaphone,
  Crown,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  subscribeToLocalPermissionMatrix,
  subscribeToFirebasePermissionMatrix,
  getCachedPermissionMatrix,
  RolePermissionMatrixConfig,
  isTabAllowedForRole,
} from '../../lib/permissionMatrixService';
import { ResellerActiveSalesPanel } from './ResellerActiveSalesPanel';
import { ResellerEarningsOverviewPanel } from './ResellerEarningsOverviewPanel';
import { ResellerProductCatalogPanel } from './ResellerProductCatalogPanel';
import { ResellerLandingPagePanel } from './ResellerLandingPagePanel';
import { ResellerCourierCheckerPanel } from './ResellerCourierCheckerPanel';
import { ResellerTargetRewardsPanel } from './ResellerTargetRewardsPanel';
import { ResellerLeaderboardPanel } from './ResellerLeaderboardPanel';
import { ResellerDeliveryCourierPanel } from './ResellerDeliveryCourierPanel';
import { ResellerCampaignsPanel } from './ResellerCampaignsPanel';
import { ResellerAnalyticsPanel } from './ResellerAnalyticsPanel';
import { ResellerProfilePanel } from './ResellerProfilePanel';
import { ResellerSubStorePanel } from './ResellerSubStorePanel';
import { ResellerAdsTrackerPanel } from './ResellerAdsTrackerPanel';
import { ResellerTeamChatModal } from './ResellerTeamChatModal';
import { ResellerInvoiceModal } from './ResellerInvoiceModal';
import { ResellerOrderProcessModal } from './ResellerOrderProcessModal';
import { ResellerPlanUpgradeModal } from './ResellerPlanUpgradeModal';
import { ResellerMembershipCountdown } from './ResellerMembershipCountdown';
import { ResellerSupportPanel } from './ResellerSupportPanel';
import {
  ResellerUser,
  ResellerPlan,
  ResellerCustomer,
  ResellerTransaction,
  ResellerWithdrawal,
  ResellerSupportTicket,
  ResellerNotification,
  ResellerPlanId,
  ResellerPaymentInfo,
  ResellerPlanUpgradeRequest,
} from '../../types/reseller';
import { Product, Order, OrderItem } from '../../types';
import {
  getResellerPlans,
  saveResellerPlans,
  getResellerCustomers,
  saveResellerCustomers,
  getResellerTransactions,
  saveResellerTransactions,
  getResellerWithdrawals,
  saveResellerWithdrawals,
  getResellerFavorites,
  saveResellerFavorites,
  getResellerNotifications,
  saveResellerNotifications,
  getResellers,
  saveResellers,
  setActiveResellerSession,
  getActiveResellerSession,
  getResellerPlanRequests,
} from '../../lib/resellerStorage';

export type ResellerNavTab =
  | 'dashboard'
  | 'target-rewards'
  | 'leaderboard'
  // Products
  | 'catalog'
  | 'my-products'
  | 'favorites'
  | 'recently-viewed'
  // Orders
  | 'orders-all'
  | 'orders-new'
  | 'orders-processing'
  | 'orders-shipped'
  | 'orders-delivered'
  | 'orders-cancelled'
  | 'orders-returns'
  // Customers
  | 'customers'
  | 'customers-add'
  // Finance
  | 'finance-profit'
  | 'finance-wallet'
  | 'finance-transactions'
  | 'finance-withdrawals'
  // Analytics
  | 'analytics'
  | 'analytics-sales'
  | 'analytics-profit'
  | 'analytics-customers'
  // Marketing & Tools
  | 'substore-builder'
  | 'ads-tracker'
  | 'marketing-share'
  | 'marketing-landing'
  | 'campaigns'
  | 'marketing-promotions'
  | 'marketing-referral'
  | 'courier-checker'
  | 'delivery-courier'
  // Membership
  | 'membership-plan'
  | 'membership-vip'
  // Support & Settings
  | 'support'
  | 'settings'
  | 'profile';

interface ResellerDashboardProps {
  reseller: ResellerUser;
  onLogout: () => void;
  products: Product[];
  orders: Order[];
  onPlaceOrder: (order: Order) => void;
  onNavigateToStore?: () => void;
}

export const ResellerDashboard: React.FC<ResellerDashboardProps> = ({
  reseller: initialReseller,
  onLogout,
  products = [],
  orders = [],
  onPlaceOrder,
  onNavigateToStore,
}) => {
  const [reseller, setReseller] = useState<ResellerUser>(initialReseller);
  const [currentTab, setCurrentTab] = useState<ResellerNavTab>('dashboard');
  const { language: globalLanguage, setLanguage: setGlobalLanguage } = useLanguage();
  const [lang, setLangState] = useState<'bn' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('kenax_language') || localStorage.getItem('reseller_dashboard_language');
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
      localStorage.setItem('reseller_dashboard_language', newLang);
    } catch {}
    setGlobalLanguage(newLang);
  };
  const [toastMsg, setToastMsg] = useState<string | null>(null);
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

  // Real-time synchronization when admin changes reseller plan or status
  useEffect(() => {
    const handleSync = () => {
      const active = getActiveResellerSession();
      if (active && (active.id === reseller.id || active.phone === reseller.phone)) {
        if (active.planId !== reseller.planId || active.isVIP !== reseller.isVIP) {
          setReseller(active);
          setToastMsg(
            lang === 'bn'
              ? `🎉 অভিনন্দন! আপনার মেম্বারশিপ প্ল্যান "${active.planId.toUpperCase()}" সফলভাবে আপগ্রেড ও সক্রিয় হয়েছে!`
              : `🎉 Congratulations! Your membership plan "${active.planId.toUpperCase()}" has been upgraded & activated!`
          );
        }
      }
      setPlanRequests(getResellerPlanRequests().filter((r) => r.resellerId === reseller.id));
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('reseller_plan_changed', handleSync as EventListener);
    window.addEventListener('reseller_plan_approved', handleSync as EventListener);
    window.addEventListener('reseller_plan_rejected', handleSync as EventListener);
    window.addEventListener('reseller_plan_request_created', handleSync as EventListener);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('reseller_plan_changed', handleSync as EventListener);
      window.removeEventListener('reseller_plan_approved', handleSync as EventListener);
      window.removeEventListener('reseller_plan_rejected', handleSync as EventListener);
      window.removeEventListener('reseller_plan_request_created', handleSync as EventListener);
      window.removeEventListener('focus', handleSync);
    };
  }, [reseller.id, reseller.phone, reseller.planId, reseller.isVIP, lang]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kenax_reseller_theme');
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('kenax_reseller_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('kenax_reseller_theme', 'light');
      }
    } catch {}
  }, [isDarkMode]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [profitSortFilter, setProfitSortFilter] = useState<'all' | 'high_profit' | 'low_price' | 'popular'>('all');
  const [chartRange, setChartRange] = useState<'7d' | '30d' | '3m' | '1y'>('30d');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Storage states
  const [customers, setCustomers] = useState<ResellerCustomer[]>(() =>
    getResellerCustomers().filter((c) => c.resellerId === reseller.id)
  );
  const [transactions, setTransactions] = useState<ResellerTransaction[]>(() =>
    getResellerTransactions().filter((t) => t.resellerId === reseller.id)
  );
  const [withdrawals, setWithdrawals] = useState<ResellerWithdrawal[]>(() =>
    getResellerWithdrawals().filter((w) => w.resellerId === reseller.id)
  );
  const [favorites, setFavorites] = useState<string[]>(() => getResellerFavorites(reseller.id));
  const [notifications, setNotifications] = useState<ResellerNotification[]>(() =>
    getResellerNotifications(reseller.id)
  );
  const [plans, setPlans] = useState<ResellerPlan[]>(() => getResellerPlans());
  const [planRequests, setPlanRequests] = useState<ResellerPlanUpgradeRequest[]>(() =>
    getResellerPlanRequests().filter((r) => r.resellerId === reseller.id)
  );

  // Modals
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<ResellerPlan | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<Product | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedProductForShare, setSelectedProductForShare] = useState<Product | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTeamChatOpen, setIsTeamChatOpen] = useState(false);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [isBalanceRevealed, setIsBalanceRevealed] = useState(false);

  // Seller Ratings & Reseller Reviews Modal
  const [selectedSellerForReviews, setSelectedSellerForReviews] = useState<{
    id: string;
    name: string;
    shopName: string;
    rating: number;
    reviewsCount: number;
    verified: boolean;
  } | null>(null);
  const [sellerReviewsList, setSellerReviewsList] = useState<Array<{
    id: string;
    sellerId: string;
    resellerName: string;
    resellerCity: string;
    rating: number;
    dispatchSpeed: number;
    qualityRating: number;
    comment: string;
    verifiedOrderCount: number;
    createdAt: string;
  }>>([
    {
      id: 'SR-01',
      sellerId: 'seller_apex',
      resellerName: 'তানভীর আহমেদ',
      resellerCity: 'ঢাকা',
      rating: 5,
      dispatchSpeed: 5,
      qualityRating: 5,
      comment: 'অসাধারণ সার্ভিস! অর্ডার প্লেস করার ৩ ঘণ্টার মধ্যে প্যাকিং করে পাঠিয়েছে। কাস্টমার খুব খুশি।',
      verifiedOrderCount: 42,
      createdAt: '১ দিন আগে',
    },
    {
      id: 'SR-02',
      sellerId: 'seller_apex',
      resellerName: 'মাহমুদুল হাসান',
      resellerCity: 'চট্টগ্রাম',
      rating: 5,
      dispatchSpeed: 4.8,
      qualityRating: 5,
      comment: 'পণ্যের কোয়ালিটি ১০০% অরিজিনাল। কাস্টমার রিটার্ন রেট ০%। নিয়মিত সেল করছি।',
      verifiedOrderCount: 28,
      createdAt: '৩ দিন আগে',
    },
    {
      id: 'SR-03',
      sellerId: 'SELLER-APEX',
      resellerName: 'রাকিবুল ইসলাম',
      resellerCity: 'রাজশাহী',
      rating: 4.9,
      dispatchSpeed: 5,
      qualityRating: 4.9,
      comment: 'প্যাকেজিং অনেক সুরক্ষিত ও প্রিমিয়াম ছিল। পাইকারি রেটও যথেষ্ট লাভজনক।',
      verifiedOrderCount: 19,
      createdAt: '৫ দিন আগে',
    },
  ]);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewDispatch, setNewReviewDispatch] = useState(5);
  const [newReviewQuality, setNewReviewQuality] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Profit Calculator Modal State
  const [calcBasePrice, setCalcBasePrice] = useState<number>(1500);
  const [calcSellingPrice, setCalcSellingPrice] = useState<number>(1950);
  const [calcDeliveryFee, setCalcDeliveryFee] = useState<number>(60);

  // Order Placement Form State
  const [orderCustomerMode, setOrderCustomerMode] = useState<'existing' | 'new'>('new');
  const [orderSelectedCustomerId, setOrderSelectedCustomerId] = useState<string>('');
  const [orderCustName, setOrderCustName] = useState('');
  const [orderCustPhone, setOrderCustPhone] = useState('');
  const [orderCustAddress, setOrderCustAddress] = useState('');
  const [orderCustCity, setOrderCustCity] = useState('Dhaka');
  const [orderDeliveryFee, setOrderDeliveryFee] = useState(60);
  const [orderSellingPrice, setOrderSellingPrice] = useState<number>(0);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderNotes, setOrderNotes] = useState('');

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustDistrict, setNewCustDistrict] = useState('Dhaka');
  const [newCustNotes, setNewCustNotes] = useState('');

  // Withdrawal Form State
  const [wdAmount, setWdAmount] = useState('');
  const [wdMethod, setWdMethod] = useState<'bkash' | 'nagad' | 'bank'>('bkash');
  const [wdAccount, setWdAccount] = useState(reseller.paymentInfo?.bkash || reseller.phone);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const currentPlan = useMemo(() => {
    return plans.find((p) => p.id === reseller.planId) || plans[0];
  }, [plans, reseller.planId]);

  // Reseller-Attributed Orders
  const myResellerOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        (o as any).resellerId === reseller.id ||
        (o as any).partnerId === reseller.id ||
        o.notes?.includes(reseller.username) ||
        o.notes?.includes(reseller.id)
    );
  }, [orders, reseller.id, reseller.username]);

  // Financial Metrics (Calculated safely)
  const totalResellerSales = useMemo(() => {
    return myResellerOrders
      .filter((o) => o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Returned')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [myResellerOrders]);

  const deliveredResellerOrders = useMemo(() => {
    return myResellerOrders.filter((o) => o.orderStatus === 'Delivered');
  }, [myResellerOrders]);

  const pendingResellerOrders = useMemo(() => {
    return myResellerOrders.filter((o) => ['Pending', 'Confirmed', 'Processing', 'Packed', 'Shipped'].includes(o.orderStatus));
  }, [myResellerOrders]);

  const cancelledResellerOrders = useMemo(() => {
    return myResellerOrders.filter((o) => o.orderStatus === 'Cancelled' || o.orderStatus === 'Returned');
  }, [myResellerOrders]);

  // Filtered Catalog Products
  const catalogProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  // Categories list
  const categoriesList = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Toggle Favorite
  const handleToggleFavorite = (productId: string) => {
    let next: string[];
    if (favorites.includes(productId)) {
      next = favorites.filter((id) => id !== productId);
      showToast('Product removed from Saved / Favorites.');
    } else {
      next = [...favorites, productId];
      showToast('Product added to your Saved / Favorites list!');
    }
    setFavorites(next);
    saveResellerFavorites(reseller.id, next);
  };

  // Open Order Placement Modal for Product
  const handleOpenOrderModal = (product: Product) => {
    setSelectedProductForOrder(product);
    const suggestedPrice = Math.round(product.price * 1.25);
    setOrderSellingPrice(suggestedPrice);
    setOrderQuantity(1);
    setIsOrderModalOpen(true);
  };

  // Handle Order Submit
  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForOrder) return;

    if (orderSellingPrice < selectedProductForOrder.price) {
      alert(`Selling price cannot be less than wholesale cost (৳${selectedProductForOrder.price}).`);
      return;
    }

    let customerName = orderCustName;
    let customerPhone = orderCustPhone;
    let customerAddress = orderCustAddress;
    let customerDistrict = orderCustCity;

    if (orderCustomerMode === 'existing' && orderSelectedCustomerId) {
      const found = customers.find((c) => c.id === orderSelectedCustomerId);
      if (found) {
        customerName = found.name;
        customerPhone = found.phone;
        customerAddress = found.address;
        customerDistrict = found.district;
      }
    } else if (orderCustomerMode === 'new' && orderCustName.trim()) {
      // Auto save new customer to directory
      const newCust: ResellerCustomer = {
        id: `CUST-RES-${Date.now().toString().slice(-6)}`,
        resellerId: reseller.id,
        name: orderCustName.trim(),
        phone: orderCustPhone.trim(),
        address: orderCustAddress.trim(),
        district: orderCustCity,
        totalOrders: 1,
        totalSpent: orderSellingPrice * orderQuantity + orderDeliveryFee,
        lastOrderDate: new Date().toISOString(),
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      const updatedCustomers = [newCust, ...customers];
      setCustomers(updatedCustomers);
      saveResellerCustomers(updatedCustomers);
    }

    const calculatedProfitPerItem = orderSellingPrice - selectedProductForOrder.price;
    const totalOrderProfit = calculatedProfitPerItem * orderQuantity;
    const orderId = `ORD-RES-${Date.now().toString().slice(-6)}`;

    const newOrder: Order = {
      id: orderId,
      customerId: orderSelectedCustomerId || `CUST-${Date.now().toString().slice(-4)}`,
      customerName,
      customerEmail: `${customerPhone}@customer.kenaxbd.com`,
      customerMobile: customerPhone,
      deliveryName: customerName,
      deliveryMobile: customerPhone,
      division: 'Dhaka',
      district: customerDistrict,
      upazila: customerDistrict,
      area: customerDistrict,
      fullAddress: customerAddress,
      items: [
        {
          productId: selectedProductForOrder.id,
          productName: selectedProductForOrder.name,
          name: selectedProductForOrder.name,
          productImage: selectedProductForOrder.images?.[0] || '',
          quantity: orderQuantity,
          price: orderSellingPrice,
          total: orderSellingPrice * orderQuantity,
          costPrice: selectedProductForOrder.price,
        },
      ],
      subtotal: orderSellingPrice * orderQuantity,
      deliveryCharge: orderDeliveryFee,
      discountAmount: 0,
      totalAmount: orderSellingPrice * orderQuantity + orderDeliveryFee,
      orderStatus: 'Pending',
      paymentStatus: 'Paid on Delivery',
      paymentMethod: 'Cash on Delivery',
      createdAt: new Date().toISOString(),
      timeline: [
        {
          status: 'Pending',
          timestamp: new Date().toISOString(),
          note: `Reseller drop-ship order created by ${reseller.businessName || reseller.fullName} (Profit: ৳${totalOrderProfit})`,
        },
      ],
      notes: `Reseller Order [ID: ${reseller.id} | User: ${reseller.username}]. Profit: ৳${totalOrderProfit}. ${orderNotes}`,
      ...( {
        resellerId: reseller.id,
        resellerProfit: totalOrderProfit,
        resellerSellingPrice: orderSellingPrice,
        basePrice: selectedProductForOrder.price,
      } as any ),
    };

    onPlaceOrder(newOrder);

    // Record pending transaction
    const newTxn: ResellerTransaction = {
      id: `TXN-RES-${Date.now().toString().slice(-6)}`,
      resellerId: reseller.id,
      orderId,
      type: 'profit_credit',
      amount: totalOrderProfit,
      balanceAfter: reseller.walletBalance,
      status: 'pending',
      description: `Pending profit for Order #${orderId} (${orderQuantity}x ${selectedProductForOrder.name})`,
      date: new Date().toISOString(),
    };
    const nextTxns = [newTxn, ...transactions];
    setTransactions(nextTxns);
    saveResellerTransactions(nextTxns);

    // Update reseller stats
    const updatedReseller: ResellerUser = {
      ...reseller,
      pendingProfit: reseller.pendingProfit + totalOrderProfit,
      totalSales: reseller.totalSales + newOrder.totalAmount,
    };
    setReseller(updatedReseller);
    setActiveResellerSession(updatedReseller);
    const all = getResellers().map((r) => (r.id === updatedReseller.id ? updatedReseller : r));
    saveResellers(all);

    setIsOrderModalOpen(false);
    showToast(`Order #${orderId} created successfully! Estimated Profit: ৳${totalOrderProfit}`);
  };

  // Add Customer Submit
  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    const newCust: ResellerCustomer = {
      id: `CUST-RES-${Date.now().toString().slice(-6)}`,
      resellerId: reseller.id,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: newCustEmail.trim(),
      address: newCustAddress.trim(),
      district: newCustDistrict,
      totalOrders: 0,
      totalSpent: 0,
      status: 'active',
      notes: newCustNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextCusts = [newCust, ...customers];
    setCustomers(nextCusts);
    saveResellerCustomers(nextCusts);

    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustAddress('');
    setNewCustNotes('');
    setIsCustomerModalOpen(false);
    showToast('Customer saved to your directory!');
  };

  // Submit Withdrawal Request
  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(wdAmount);
    if (!amountNum || amountNum < 500) {
      alert(lang === 'bn' ? 'সর্বনিম্ন ৫০০ টাকা উইথড্র করতে হবে।' : 'Minimum payout amount is ৳500.');
      return;
    }
    if (amountNum > reseller.walletBalance) {
      alert(lang === 'bn' ? 'আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই।' : 'Insufficient available balance.');
      return;
    }

    const newWd: ResellerWithdrawal = {
      id: `WD-RES-${Date.now().toString().slice(-6)}`,
      resellerId: reseller.id,
      resellerName: reseller.fullName,
      resellerPhone: reseller.phone,
      amount: amountNum,
      fee: 0,
      netAmount: amountNum,
      method: wdMethod,
      accountNumber: wdAccount,
      status: 'requested',
      requestedAt: new Date().toISOString(),
    };

    const nextWds = [newWd, ...withdrawals];
    setWithdrawals(nextWds);
    saveResellerWithdrawals(nextWds);

    // Ledger entry
    const newTxn: ResellerTransaction = {
      id: `TXN-RES-${Date.now().toString().slice(-6)}`,
      resellerId: reseller.id,
      type: 'withdrawal',
      amount: amountNum,
      balanceAfter: reseller.walletBalance - amountNum,
      status: 'pending',
      description: `Withdrawal request of ৳${amountNum} to ${wdMethod.toUpperCase()} (${wdAccount})`,
      date: new Date().toISOString(),
    };
    const nextTxns = [newTxn, ...transactions];
    setTransactions(nextTxns);
    saveResellerTransactions(nextTxns);

    // Update wallet balance
    const updatedReseller: ResellerUser = {
      ...reseller,
      walletBalance: reseller.walletBalance - amountNum,
      totalWithdrawn: reseller.totalWithdrawn + amountNum,
    };
    setReseller(updatedReseller);
    setActiveResellerSession(updatedReseller);
    const all = getResellers().map((r) => (r.id === updatedReseller.id ? updatedReseller : r));
    saveResellers(all);

    setWdAmount('');
    setIsWithdrawalModalOpen(false);
    showToast(`Withdrawal request of ৳${amountNum} submitted successfully!`);
  };

  // Copy product link / caption helper
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    showToast(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-emerald-500 selection:text-white ${
      isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Bar Header */}
      <header className={`h-14 sm:h-16 px-2.5 sm:px-6 border-b backdrop-blur-md flex items-center justify-between sticky top-0 z-30 transition-colors ${
        isDarkMode
          ? 'border-slate-800/80 bg-slate-900/95 text-white'
          : 'border-slate-200/90 bg-white/95 text-slate-900 shadow-xs'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className={`p-1.5 sm:p-2 rounded-xl cursor-pointer shrink-0 ${
              isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:text-slate-900'
            }`}
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-950/20 shrink-0">
            <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className={`text-xs sm:text-base font-black tracking-tight truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[220px] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {reseller.businessName || reseller.fullName}
              </h1>
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                {currentPlan.name.split(' ')[0]}
              </span>
              {reseller.isVIP && (
                <span className="hidden sm:inline-flex text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 items-center gap-0.5 shrink-0">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>VIP</span>
                </span>
              )}
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 truncate">
              ID: <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{reseller.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Header Balance Show / Reveal Widget */}
          <button
            type="button"
            onClick={() => setIsBalanceRevealed((prev) => !prev)}
            title={lang === 'bn' ? 'ব্যালেন্স দেখতে বা লুকাতে ক্লিক করুন' : 'Click to show / hide balance'}
            className={`px-2 sm:px-3 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs group ${
              isDarkMode
                ? 'bg-slate-800/90 hover:bg-slate-800 border-emerald-500/30 hover:border-emerald-500/60 text-slate-200'
                : 'bg-slate-50 hover:bg-slate-100 border-emerald-500/40 hover:border-emerald-600 text-slate-800'
            }`}
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-[11px] sm:text-xs">
              ৳
            </div>
            <div className="flex flex-col text-left">
              <span className="hidden sm:inline text-[8px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold leading-none">
                {isBalanceRevealed
                  ? (lang === 'bn' ? 'ব্যালেন্স' : 'Balance')
                  : (lang === 'bn' ? 'ট্যাপ করুন' : 'Tap')}
              </span>
              <span className="text-[11px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {isBalanceRevealed
                  ? `৳${(reseller.walletBalance || 0).toLocaleString('en-BD')}`
                  : (lang === 'bn' ? 'ব্যালেন্স' : 'Balance')}
              </span>
            </div>
            <Eye className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 group-hover:text-emerald-500 transition-transform ${isBalanceRevealed ? 'rotate-180 text-emerald-500' : ''}`} />
          </button>

          {/* Quick Create Order Button */}
          <button
            onClick={() => {
              if (products.length > 0) {
                handleOpenOrderModal(products[0]);
              }
            }}
            className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
            title={lang === 'bn' ? 'অর্ডার তৈরি করুন' : 'Create Order'}
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">{lang === 'bn' ? 'অর্ডার' : 'Order'}</span>
          </button>

          {/* Notifications Toggle */}
          <button
            onClick={() => setIsNotifDrawerOpen(!isNotifDrawerOpen)}
            className={`relative p-1.5 sm:p-2 rounded-xl cursor-pointer transition-colors ${
              isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.some((n) => !n.isRead) && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          {/* Profit Calculator Shortcut Button (Desktop Only) */}
          <button
            onClick={() => setIsCalculatorOpen(true)}
            className={`hidden md:flex px-3 py-1.5 rounded-xl text-xs font-bold border items-center gap-1.5 transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-500" />
            <span>{lang === 'bn' ? 'ক্যালকুলেটর' : 'Calculator'}</span>
          </button>

          {/* Day / Night Theme Toggle */}
          <button
            type="button"
            onClick={() => setIsDarkMode((prev) => !prev)}
            className={`p-1.5 sm:p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 shrink-0 ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border border-slate-200'
            }`}
            title={isDarkMode ? (lang === 'bn' ? 'ডে মোড করুন' : 'Switch to Light Mode') : (lang === 'bn' ? 'নাইট মোড করুন' : 'Switch to Dark Mode')}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-colors flex items-center gap-1 shrink-0 ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-emerald-700 border border-slate-200'
            }`}
            title={lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-500 sm:hidden" />
            <span>{lang === 'bn' ? 'বাং / EN' : 'EN / বাং'}</span>
          </button>

          {/* Logout (Desktop Only) */}
          <button
            onClick={onLogout}
            className={`hidden md:flex p-2 rounded-xl cursor-pointer transition-colors ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400'
                : 'bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-600 border border-slate-200'
            }`}
            title={lang === 'bn' ? 'লগ আউট' : 'Log Out'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <aside className={`w-64 border-r flex flex-col justify-between shrink-0 hidden md:flex transition-colors ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="p-3 space-y-5 overflow-y-auto no-scrollbar scrollbar-none">
            {/* Primary Section */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {lang === 'bn' ? 'কোর ড্যাশবোর্ড' : 'Core Dashboard'}
              </p>
              {isTabAllowedForRole('reseller', 'dashboard', matrixConfig, reseller.planId) && (
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    currentTab === 'dashboard'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'ড্যাশবোর্ড হোম' : 'Dashboard Home'}</span>
                </button>
              )}

              {isTabAllowedForRole('reseller', 'target-rewards', matrixConfig, reseller.planId) && (
                <button
                  onClick={() => setCurrentTab('target-rewards')}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    currentTab === 'target-rewards'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-500 dark:text-amber-400" />
                    <span>{lang === 'bn' ? '🎯 সেলস টার্গেট ও বোনাস' : 'Sales Target & Bonus'}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-amber-400/20 text-indigo-700 dark:text-amber-300 font-bold">
                    Reward
                  </span>
                </button>
              )}

              {isTabAllowedForRole('reseller', 'leaderboard', matrixConfig, reseller.planId) && (
                <button
                  onClick={() => setCurrentTab('leaderboard')}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    currentTab === 'leaderboard'
                      ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 font-black shadow-xs'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    <span>{lang === 'bn' ? '🏆 টপ লিডারবোর্ড' : 'Top Leaderboard'}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
                    Top 10
                  </span>
                </button>
              )}
            </div>

            {/* Products Section */}
            {(isTabAllowedForRole('reseller', 'catalog', matrixConfig, reseller.planId) ||
              isTabAllowedForRole('reseller', 'favorites', matrixConfig, reseller.planId)) && (
              <div className="space-y-1">
                <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Wholesale Catalog</p>
                {isTabAllowedForRole('reseller', 'catalog', matrixConfig, reseller.planId) && (
                  <button
                    onClick={() => setCurrentTab('catalog')}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      currentTab === 'catalog'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      <span>{lang === 'bn' ? 'হোলসেল ক্যাটালগ' : 'Product Catalog'}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-700 dark:text-slate-300 font-bold">{products.length}</span>
                  </button>
                )}

                {isTabAllowedForRole('reseller', 'favorites', matrixConfig, reseller.planId) && (
                  <button
                    onClick={() => setCurrentTab('favorites')}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      currentTab === 'favorites'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Heart className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                      <span>{lang === 'bn' ? 'সংরক্ষিত প্রোডাক্ট' : 'Saved & Favorites'}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-700 dark:text-slate-300 font-bold">{favorites.length}</span>
                  </button>
                )}
              </div>
            )}

            {/* Orders & Delivery Section */}
            {(isTabAllowedForRole('reseller', 'orders-all', matrixConfig, reseller.planId) ||
              isTabAllowedForRole('reseller', 'delivery-courier', matrixConfig, reseller.planId)) && (
              <div className="space-y-1">
                <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Active Sales & Delivery</p>
                {isTabAllowedForRole('reseller', 'orders-all', matrixConfig, reseller.planId) && (
                  <button
                    onClick={() => setCurrentTab('orders-all')}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      currentTab === 'orders-all' || currentTab === 'orders-processing' || currentTab === 'orders-delivered'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShoppingBag className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                      <span>{lang === 'bn' ? 'অ্যাক্টিভ সেলস ও পার্সেল' : 'Active Sales & Orders'}</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-700 dark:text-slate-300 font-bold">{myResellerOrders.length}</span>
                  </button>
                )}

                {isTabAllowedForRole('reseller', 'delivery-courier', matrixConfig, reseller.planId) && (
                  <button
                    onClick={() => setCurrentTab('delivery-courier')}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      currentTab === 'delivery-courier'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Truck className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                      <span>{lang === 'bn' ? '🚚 কুরিয়ার ট্র্যাকিং' : 'Courier Tracking'}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold">
                      Steadfast
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Customers CRM */}
            {isTabAllowedForRole('reseller', 'customers', matrixConfig, reseller.planId) && (
              <div className="space-y-1">
                <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">CRM & Customers</p>
                <button
                  onClick={() => setCurrentTab('customers')}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    currentTab === 'customers'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>{lang === 'bn' ? 'কাস্টমার ডিরেক্টরি' : 'My Customer List'}</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-700 dark:text-slate-300 font-bold">{customers.length}</span>
                </button>
              </div>
            )}

            {/* Finance, Wallet & Analytics */}
            {(isTabAllowedForRole('reseller', 'finance-profit', matrixConfig, reseller.planId) ||
              isTabAllowedForRole('reseller', 'finance-transactions', matrixConfig, reseller.planId) ||
              isTabAllowedForRole('reseller', 'analytics', matrixConfig, reseller.planId)) && (
              <div className="space-y-1">
                <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Earnings & Analytics</p>
                {isTabAllowedForRole('reseller', 'finance-profit', matrixConfig, reseller.planId) && (
                  <button
                    onClick={() => setCurrentTab('finance-profit')}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      currentTab === 'finance-profit' || currentTab === 'finance-wallet'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <DollarSign className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      <span>{lang === 'bn' ? 'উপার্জন ও ওয়ালেট' : 'Earnings & Wallet'}</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black">৳{reseller.walletBalance.toLocaleString('en-BD')}</span>
                  </button>
                )}

                {isTabAllowedForRole('reseller', 'analytics', matrixConfig, reseller.planId) && (
                  <button
                    onClick={() => setCurrentTab('analytics')}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                      currentTab === 'analytics'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    <span>{lang === 'bn' ? '📊 সেলস এনালিটিক্স' : 'Analytics & Report'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Marketing & Tools */}
            {(isTabAllowedForRole('reseller', 'marketing-share', matrixConfig, reseller.planId) ||
              isTabAllowedForRole('reseller', 'campaigns', matrixConfig, reseller.planId) ||
              isTabAllowedForRole('reseller', 'marketing-referral', matrixConfig, reseller.planId) ||
              isTabAllowedForRole('reseller', 'landing-page', matrixConfig, reseller.planId)) && (
              <div className="space-y-1">
                <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {lang === 'bn' ? 'মার্কেটিং ও গ্রোথ টুলস' : 'Marketing & Growth'}
                </p>

                {/* Sub-Store Website & Custom Invoice Logo */}
                {isTabAllowedForRole('reseller', 'substore-builder', matrixConfig, reseller.planId) && (
                  <button
                    onClick={() => setCurrentTab('substore-builder')}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      currentTab === 'substore-builder'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                      <span>{lang === 'bn' ? '🌐 আমার সাইট ও ইনভয়েস লোগো' : 'My Website & Invoice Logo'}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black uppercase">
                      VIP
                    </span>
                  </button>
                )}

                {/* Meta Facebook & TikTok Pixel Ads Tracker */}
                {isTabAllowedForRole('reseller', 'ads-tracker', matrixConfig, reseller.planId) && (
                  <button
                    onClick={() => setCurrentTab('ads-tracker')}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      currentTab === 'ads-tracker'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Target className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                      <span>{lang === 'bn' ? '🎯 মেটা/টিকটক পিক্সেল এডস' : 'Ads & Pixel Tracker'}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 font-black uppercase">
                      CAPI
                    </span>
                  </button>
                )}

                {isTabAllowedForRole('reseller', 'landing-page', matrixConfig, reseller.planId) && (
                  <button
                    onClick={() => setCurrentTab('marketing-landing')}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      currentTab === 'marketing-landing'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      <span>{lang === 'bn' ? 'ল্যান্ডিং পেজ ও বুস্টিং' : 'Landing Page & Boost'}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black uppercase">
                      VIP
                    </span>
                  </button>
                )}

                {isTabAllowedForRole('reseller', 'campaigns', matrixConfig, reseller.planId) && (
                  <button
                    onClick={() => setCurrentTab('campaigns')}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                      currentTab === 'campaigns'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Megaphone className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                    <span>{lang === 'bn' ? 'মেগা ক্যাম্পেইন হাব' : 'Campaign Hub'}</span>
                  </button>
                )}

                {isTabAllowedForRole('reseller', 'marketing-share', matrixConfig, reseller.planId) && (
                  <button
                    onClick={() => setCurrentTab('marketing-share')}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      currentTab === 'marketing-share'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Share2 className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                      <span>{lang === 'bn' ? 'সোশ্যাল পোস্ট ও শেয়ার' : 'Share & Promote'}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 font-bold">
                      {lang === 'bn' ? 'কামিং সুন' : 'Soon'}
                    </span>
                  </button>
                )}

                {isTabAllowedForRole('reseller', 'marketing-referral', matrixConfig, reseller.planId) && (
                  <button
                    onClick={() => setCurrentTab('marketing-referral')}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      currentTab === 'marketing-referral'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isDarkMode
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      <span>{lang === 'bn' ? 'রেফারেল উপার্জন' : 'Referral Earnings'}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 font-bold">
                      {lang === 'bn' ? 'কামিং সুন' : 'Soon'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Courier Fraud Checker Tool */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {lang === 'bn' ? 'নিরাপত্তা ও ভেরিফিকেশন' : 'Fraud Verification'}
              </p>
              {isTabAllowedForRole('reseller', 'courier-checker', matrixConfig, reseller.planId) && (
                <button
                  onClick={() => setCurrentTab('courier-checker')}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    currentTab === 'courier-checker'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                    <span>{lang === 'bn' ? 'কুরিয়ার ফ্রড চেকার' : 'Courier Fraud Checker'}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold">
                    Steadfast
                  </span>
                </button>
              )}

              <button
                onClick={() => setIsTeamChatOpen(true)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <span>{lang === 'bn' ? 'চ্যাট উইথ ক্যানাক্স বিডি টিম' : 'Chat with KenaX BD'}</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              </button>
            </div>

            {/* Membership & Plan & Profile */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {lang === 'bn' ? 'অ্যাকাউন্ট ও মেম্বারশিপ' : 'Account & Membership'}
              </p>
              {isTabAllowedForRole('reseller', 'membership-plan', matrixConfig, reseller.planId) && (
                <button
                  onClick={() => setCurrentTab('membership-plan')}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    currentTab === 'membership-plan'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <span>{lang === 'bn' ? `আমার প্ল্যান (${currentPlan.name.split(' ')[0]})` : `My Plan (${currentPlan.name.split(' ')[0]})`}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {lang === 'bn' ? 'আপগ্রেড' : 'Upgrade'}
                  </span>
                </button>
              )}

              <button
                onClick={() => setCurrentTab('profile')}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                  currentTab === 'profile' || currentTab === 'settings'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <span>{lang === 'bn' ? '👤 মাই প্রোফাইল ও অ্যাকাউন্ট' : '👤 My Profile & Account'}</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold">
                  Edit
                </span>
              </button>
            </div>
          </div>

          {/* Sidebar Footer User Card */}
          <div className={`p-3 border-t transition-colors ${
            isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
          }`}>
            <div
              onClick={() => setCurrentTab('profile')}
              className={`flex items-center justify-between cursor-pointer group p-1.5 rounded-xl transition-colors ${
                isDarkMode ? 'hover:bg-slate-900/60' : 'hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <img
                  src={reseller.profilePhoto}
                  alt={reseller.fullName}
                  className="w-8 h-8 rounded-full object-cover border border-slate-300 dark:border-slate-700 group-hover:border-indigo-500 transition-colors"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{reseller.fullName}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{reseller.phone}</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentTab('profile');
                }}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                }`}
                title={lang === 'bn' ? 'প্রোফাইল এডিট করুন' : 'Edit Profile'}
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Right Content Area (Mobile Tabs Bar + Main Content Body) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* MOBILE QUICK NAVIGATION TABS BAR (Visible on mobile/tablet < md so all tabs are visible & accessible) */}
          <div className={`md:hidden shrink-0 border-b overflow-x-auto scrollbar-none px-2.5 py-2 flex items-center gap-1.5 z-20 transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* 1. Dashboard Home */}
            <button
              type="button"
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'হোম' : 'Home'}</span>
            </button>

            {/* 2. Catalog */}
            {isTabAllowedForRole('reseller', 'catalog', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('catalog')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'catalog'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'ক্যাটালগ' : 'Catalog'}</span>
              </button>
            )}

            {/* 3. Orders */}
            {isTabAllowedForRole('reseller', 'orders-all', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('orders-all')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'orders-all' || currentTab === 'orders-processing' || currentTab === 'orders-delivered'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'অর্ডারস' : 'Orders'}</span>
              </button>
            )}

            {/* 4. Sub-Store Website Builder */}
            {isTabAllowedForRole('reseller', 'substore-builder', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('substore-builder')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'substore-builder'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'bn' ? '🌐 আমার সাইট' : 'My Website'}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-black">VIP</span>
              </button>
            )}

            {/* 5. Ads Tracker */}
            {isTabAllowedForRole('reseller', 'ads-tracker', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('ads-tracker')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'ads-tracker'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>{lang === 'bn' ? '🎯 এডস ট্র্যাকার' : 'Ads Tracker'}</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-black">CAPI</span>
              </button>
            )}

            {/* 6. Earnings & Wallet */}
            {isTabAllowedForRole('reseller', 'finance-profit', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('finance-profit')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'finance-profit' || currentTab === 'finance-wallet'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'bn' ? 'উপার্জন' : 'Earnings'}</span>
              </button>
            )}

            {/* 7. Analytics */}
            {isTabAllowedForRole('reseller', 'analytics', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('analytics')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'analytics'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{lang === 'bn' ? '📊 এনালিটিক্স' : 'Analytics'}</span>
              </button>
            )}

            {/* 8. Courier Tracking */}
            {isTabAllowedForRole('reseller', 'delivery-courier', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('delivery-courier')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'delivery-courier'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'bn' ? '🚚 কুরিয়ার' : 'Courier'}</span>
              </button>
            )}

            {/* 9. Courier Fraud Checker */}
            {isTabAllowedForRole('reseller', 'courier-checker', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('courier-checker')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'courier-checker'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'bn' ? '🛡️ ফ্রড চেকার' : 'Fraud'}</span>
              </button>
            )}

            {/* 10. Customers CRM */}
            {isTabAllowedForRole('reseller', 'customers', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('customers')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'customers'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'কাস্টমার' : 'CRM'}</span>
              </button>
            )}

            {/* 11. Target & Rewards */}
            {isTabAllowedForRole('reseller', 'target-rewards', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('target-rewards')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'target-rewards'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'bn' ? '🎯 টার্গেট' : 'Targets'}</span>
              </button>
            )}

            {/* 12. Leaderboard */}
            {isTabAllowedForRole('reseller', 'leaderboard', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('leaderboard')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'leaderboard'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'bn' ? '🏆 লিডারবোর্ড' : 'Top 10'}</span>
              </button>
            )}

            {/* 13. Campaigns */}
            {isTabAllowedForRole('reseller', 'campaigns', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('campaigns')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'campaigns'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5 text-purple-400" />
                <span>{lang === 'bn' ? 'ক্যাম্পেইন' : 'Campaigns'}</span>
              </button>
            )}

            {/* 14. Landing Page */}
            {isTabAllowedForRole('reseller', 'landing-page', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('marketing-landing')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'marketing-landing'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'bn' ? 'ল্যান্ডিং পেজ' : 'Landing'}</span>
              </button>
            )}

            {/* 15. Favorites */}
            {isTabAllowedForRole('reseller', 'favorites', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('favorites')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'favorites'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>{lang === 'bn' ? 'সংরক্ষিত' : 'Saved'}</span>
              </button>
            )}

            {/* 16. Membership Plan */}
            {isTabAllowedForRole('reseller', 'membership-plan', matrixConfig, reseller.planId) && (
              <button
                type="button"
                onClick={() => setCurrentTab('membership-plan')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                  currentTab === 'membership-plan'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'bn' ? 'প্ল্যান' : 'Plan'}</span>
              </button>
            )}

            {/* 17. Profile */}
            <button
              type="button"
              onClick={() => setCurrentTab('profile')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                currentTab === 'profile' || currentTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDarkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>{lang === 'bn' ? 'প্রোফাইল' : 'Profile'}</span>
            </button>

            {/* 18. Chat */}
            <button
              type="button"
              onClick={() => setIsTeamChatOpen(true)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer ${
                isDarkMode ? 'bg-slate-800 text-emerald-400 hover:bg-slate-700' : 'bg-slate-100 text-emerald-700 hover:bg-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>{lang === 'bn' ? 'টিম চ্যাট' : 'Chat'}</span>
            </button>
          </div>

          {/* Main Content Body */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-8 pb-24 md:pb-8 space-y-4 sm:space-y-6 scrollbar-none w-full max-w-full">
          {/* Permission Matrix Role-Based Restriction Gate */}
          {currentTab !== 'dashboard' && !isTabAllowedForRole('reseller', currentTab, matrixConfig) ? (
            <div className="p-6 sm:p-12 rounded-2xl sm:rounded-3xl bg-slate-900 border border-amber-500/30 shadow-xl text-center space-y-4 max-w-xl mx-auto my-6 animate-in fade-in duration-200">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div className="space-y-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-amber-500/20 text-amber-400 uppercase tracking-wider border border-amber-500/30">
                  Feature Restricted by Admin
                </span>
                <h2 className="text-base sm:text-xl font-black text-white capitalize">
                  {currentTab.replace('-', ' ')} মডিউলটি সাময়িকভাবে স্থগিত
                </h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  অ্যাডমিন কর্তৃক রোল পারমিশন পলিসির কারণে এই ড্যাশবোর্ড ট্যাবটি বর্তমানে বন্ধ রাখা হয়েছে।
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg cursor-pointer transition-all inline-flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>{lang === 'bn' ? 'ড্যাশবোর্ড হোমে ফিরুন' : 'Return to Dashboard'}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: DASHBOARD OVERVIEW */}
          {currentTab === 'dashboard' && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in">
              {/* Top Statistics Cards Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border space-y-0.5 sm:space-y-1 transition-colors shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className={`flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <span>{lang === 'bn' ? 'মোট লাভ' : 'Total Profit'}</span>
                    <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                  </div>
                  <p className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">৳{reseller.totalProfit.toLocaleString('en-BD')}</p>
                  <p className={`text-[9px] sm:text-[10px] truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{lang === 'bn' ? 'ডেলিভারি প্রফিট' : 'Delivered profit'}</p>
                </div>

                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border space-y-0.5 sm:space-y-1 transition-colors shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className={`flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <span>{lang === 'bn' ? 'বর্তমান ব্যালেন্স' : 'Balance'}</span>
                    <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-500" />
                  </div>
                  <p className="text-base sm:text-xl font-black text-sky-600 dark:text-sky-400 tabular-nums">৳{reseller.walletBalance.toLocaleString('en-BD')}</p>
                  <p className={`text-[9px] sm:text-[10px] truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{lang === 'bn' ? 'উত্তোলনযোগ্য' : 'Ready for payout'}</p>
                </div>

                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border space-y-0.5 sm:space-y-1 transition-colors shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className={`flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <span>{lang === 'bn' ? 'পেন্ডিং প্রফিট' : 'Pending Profit'}</span>
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                  </div>
                  <p className="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">৳{reseller.pendingProfit.toLocaleString('en-BD')}</p>
                  <p className={`text-[9px] sm:text-[10px] truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{lang === 'bn' ? 'চলমান পার্সেল' : 'In-transit parcels'}</p>
                </div>

                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border space-y-0.5 sm:space-y-1 transition-colors shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className={`flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <span>{lang === 'bn' ? 'মোট সেলস' : 'Total Sales'}</span>
                    <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                  </div>
                  <p className="text-base sm:text-xl font-black text-purple-600 dark:text-purple-400 tabular-nums">৳{reseller.totalSales.toLocaleString('en-BD')}</p>
                  <p className={`text-[9px] sm:text-[10px] truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{myResellerOrders.length} {lang === 'bn' ? 'টি অর্ডার' : 'orders'}</p>
                </div>

                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border space-y-0.5 sm:space-y-1 col-span-2 sm:col-span-1 transition-colors shadow-2xs ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className={`flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <span>{lang === 'bn' ? 'কাস্টমার সংখ্যা' : 'Customers'}</span>
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-500" />
                  </div>
                  <p className="text-base sm:text-xl font-black text-teal-600 dark:text-teal-400 tabular-nums">{customers.length}</p>
                  <p className={`text-[9px] sm:text-[10px] truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>{lang === 'bn' ? 'সংরক্ষিত বায়ার' : 'Saved contacts'}</p>
                </div>
              </div>

              {/* Action Banner: Wholesale & Order Placement */}
              <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-md">
                <div className="space-y-1 text-center sm:text-left w-full sm:w-auto">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-bold">
                      {lang === 'bn' ? 'জিরো ইনভেস্টমেন্ট' : 'Zero Investment'}
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-[10px] sm:text-xs text-slate-300 font-bold">
                      {lang === 'bn' ? 'ইনস্ট্যান্ট প্রফিট মার্জিন' : 'Instant Profit Margin'}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-base font-black text-white">
                    {lang === 'bn' ? 'হোলসেল পণ্য নির্বাচন করে সরাসরি ড্রপশিপিং করুন' : 'Find Products & Place Dropship Orders'}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                    {lang === 'bn'
                      ? 'মার্কেটপ্লেস পণ্য সিলেক্ট করে আপনার লাভসহ কাস্টমার অ্যাড্রেসে অর্ডার প্লেস করুন।'
                      : 'Select products, set your retail margin, and deliver directly to customer nationwide.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setCurrentTab('catalog')}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'হোলসেল ক্যাটালগ' : 'Wholesale Catalog'}</span>
                  </button>
                  <button
                    onClick={() => setIsWithdrawalModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer shrink-0"
                  >
                    {lang === 'bn' ? 'উত্তোলন ↗' : 'Withdraw ↗'}
                  </button>
                </div>
              </div>

              {/* Monthly Sales Target & Milestone Bonuses Widget */}
              <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/40 shadow-xl space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/30">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-black text-xs sm:text-sm text-white">
                          {lang === 'bn' ? 'মাসিক সেলস টার্গেট ও বোনাস' : 'Monthly Sales Target & Bonus'}
                        </h3>
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[9px] font-bold">
                          Bonus
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-300">
                        {lang === 'bn' ? 'টার্গেট পূরণ করে সরাসরি ওয়ালেটে ক্যাশ বোনাস পান।' : 'Hit targets and unlock cash bonuses.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setCurrentTab('target-rewards')}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-[11px] sm:text-xs shadow-md transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'টার্গেট হাব' : 'Target Hub'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentTab('leaderboard')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] sm:text-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lang === 'bn' ? 'লিডারবোর্ড' : 'Leaderboard'}</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                    <span className="text-slate-400">
                      {lang === 'bn' ? 'অগ্রগতি:' : 'Progress:'} <strong className="text-emerald-400 font-mono">৳{reseller.totalSales?.toLocaleString() || '৪৬,৮০০'}</strong> / ৳১,০০,০০০
                    </span>
                    <span className="font-mono font-bold text-amber-300">
                      {Math.min(100, Math.round(((reseller.totalSales || 46800) / 100000) * 100))}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(100, Math.round(((reseller.totalSales || 46800) / 100000) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* All Features & Services Quick Grid (Visible on Mobile & Desktop) */}
              <div className="bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 p-3.5 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-xs sm:text-sm font-black text-white">
                      {lang === 'bn' ? 'সকল ফিচার ও সার্ভিস পোর্টাল' : 'All Features & Quick Services'}
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {lang === 'bn' ? '১-ক্লিকে যেকোনো ফিচারে যান' : 'Direct 1-click access'}
                  </span>
                </div>

                <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
                  {/* 1. Wholesale Catalog */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('catalog')}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/90 hover:border-emerald-500/50 flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-white group-hover:text-emerald-400 transition-colors">
                        {lang === 'bn' ? 'হোলসেল ক্যাটালগ' : 'Product Catalog'}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {lang === 'bn' ? `${products.length}টি লাইভ প্রোডাক্ট` : `${products.length} items`}
                      </p>
                    </div>
                  </button>

                  {/* 2. Active Sales */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('orders-all')}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/90 hover:border-sky-500/50 flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-white group-hover:text-sky-400 transition-colors">
                        {lang === 'bn' ? 'সেলস ও অর্ডারস' : 'Sales & Orders'}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {lang === 'bn' ? `${myResellerOrders.length}টি অর্ডার ট্র্যাকিং` : `${myResellerOrders.length} orders`}
                      </p>
                    </div>
                  </button>

                  {/* 3. Sub-Store Website Builder */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('substore-builder')}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-400 flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer relative overflow-hidden"
                  >
                    <span className="absolute top-1.5 right-1.5 text-[8px] font-black px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 uppercase">
                      VIP
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                        {lang === 'bn' ? 'আমার ওয়েবসাইট' : 'My Website & Logo'}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {lang === 'bn' ? 'ইনভয়েস মেমো ব্র্যান্ডিং' : 'White-label invoices'}
                      </p>
                    </div>
                  </button>

                  {/* 4. Meta Pixel & Ads Tracker */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('ads-tracker')}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-indigo-500/30 hover:border-indigo-400 flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer relative overflow-hidden"
                  >
                    <span className="absolute top-1.5 right-1.5 text-[8px] font-black px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 uppercase">
                      CAPI
                    </span>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-white group-hover:text-indigo-400 transition-colors">
                        {lang === 'bn' ? 'এডস ট্র্যাকার' : 'Pixel Ads Tracker'}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {lang === 'bn' ? 'মেটা/টিকটক অ্যাডস' : 'Meta & TikTok CAPI'}
                      </p>
                    </div>
                  </button>

                  {/* 5. Earnings & Wallet */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('finance-profit')}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/90 hover:border-emerald-500/50 flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-white group-hover:text-emerald-400 transition-colors">
                        {lang === 'bn' ? 'উপার্জন ও ওয়ালেট' : 'Earnings & Wallet'}
                      </p>
                      <p className="text-[9px] text-emerald-400 font-bold truncate">
                        ৳{reseller.walletBalance.toLocaleString('en-BD')}
                      </p>
                    </div>
                  </button>

                  {/* 6. Sales Analytics */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('analytics')}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/90 hover:border-indigo-500/50 flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-white group-hover:text-indigo-400 transition-colors">
                        {lang === 'bn' ? 'সেলস এনালিটিক্স' : 'Sales Analytics'}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {lang === 'bn' ? 'পারফরম্যান্স রিপোর্ট' : 'Reports & graphs'}
                      </p>
                    </div>
                  </button>

                  {/* 7. Courier Tracking */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('delivery-courier')}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/90 hover:border-sky-500/50 flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-white group-hover:text-sky-400 transition-colors">
                        {lang === 'bn' ? 'কুরিয়ার ট্র্যাকিং' : 'Courier Tracking'}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {lang === 'bn' ? 'স্টিডফাস্ট লাইভ ট্র্যাকিং' : 'Steadfast live status'}
                      </p>
                    </div>
                  </button>

                  {/* 8. Courier Fraud Checker */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('courier-checker')}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/90 hover:border-sky-500/50 flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-white group-hover:text-sky-400 transition-colors">
                        {lang === 'bn' ? 'ফ্রড চেকার' : 'Fraud Checker'}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {lang === 'bn' ? 'কাস্টমার রিটার্ন রেট' : 'Check return risks'}
                      </p>
                    </div>
                  </button>

                  {/* 9. Target Rewards */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('target-rewards')}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-400 flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                        {lang === 'bn' ? 'টার্গেট ও বোনাস' : 'Target & Rewards'}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {lang === 'bn' ? 'ক্যাশ রিওয়ার্ড হাব' : 'Cash bonus tier'}
                      </p>
                    </div>
                  </button>

                  {/* 10. Leaderboard */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('leaderboard')}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-yellow-500/30 hover:border-yellow-400 flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-white group-hover:text-yellow-400 transition-colors">
                        {lang === 'bn' ? 'টপ লিডারবোর্ড' : 'Top Leaderboard'}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {lang === 'bn' ? 'রিসেলার র্যাংকিং' : 'Top 10 ranking'}
                      </p>
                    </div>
                  </button>

                  {/* 11. Customer CRM */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('customers')}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/90 hover:border-teal-500/50 flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-white group-hover:text-teal-400 transition-colors">
                        {lang === 'bn' ? 'কাস্টমার CRM' : 'Customer CRM'}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        {lang === 'bn' ? `${customers.length} জন কাস্টমার` : `${customers.length} clients`}
                      </p>
                    </div>
                  </button>

                  {/* 12. Membership Plan */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('membership-plan')}
                    className="p-2.5 sm:p-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-purple-500/30 hover:border-purple-400 flex flex-col items-start gap-1.5 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-white group-hover:text-purple-400 transition-colors">
                        {lang === 'bn' ? 'মেম্বারশিপ প্ল্যান' : 'Membership Plan'}
                      </p>
                      <p className="text-[9px] text-purple-300 font-bold truncate">
                        {currentPlan.name}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Orders & Top Selling Items Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                {/* Recent Orders Section */}
                <div className="lg:col-span-8 bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-white">{lang === 'bn' ? 'সাম্প্রতিক কাস্টমার অর্ডার' : 'Recent Customer Orders'}</h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-400">{lang === 'bn' ? 'পার্সেল ট্র্যাকিং ও প্রফিট মার্জিন' : 'Parcel tracking & profit margin'}</p>
                    </div>
                    <button
                      onClick={() => setCurrentTab('orders-all')}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{lang === 'bn' ? `সবগুলো (${myResellerOrders.length})` : `View All (${myResellerOrders.length})`}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {myResellerOrders.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2">
                      <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-400">{lang === 'bn' ? 'কোনো অর্ডার নেই' : 'No orders placed yet'}</p>
                      <button
                        onClick={() => setCurrentTab('catalog')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                      >
                        {lang === 'bn' ? 'রিসেলিং শুরু করুন' : 'Start Reselling Now'}
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Cards View (< md) */}
                      <div className="space-y-2.5 md:hidden">
                        {myResellerOrders.slice(0, 4).map((o) => {
                          const item = o.items[0];
                          const profit = (o as any).resellerProfit || Math.round(o.totalAmount * 0.15);
                          return (
                            <div
                              key={o.id}
                              className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[11px] font-black text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    #{o.id}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(o.createdAt).toLocaleDateString('en-GB')}
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    o.orderStatus === 'Delivered'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                      : o.orderStatus === 'Cancelled'
                                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                      : 'bg-sky-950 text-sky-300 border border-sky-800'
                                  }`}
                                >
                                  {o.orderStatus}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <div className="min-w-0 pr-2">
                                  <p className="font-bold text-white truncate">{o.customerName}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{item?.name || 'Product'}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-bold text-white tabular-nums">৳{o.totalAmount.toLocaleString('en-BD')}</p>
                                  <p className="text-[11px] font-black text-emerald-400 tabular-nums">+৳{profit.toLocaleString('en-BD')}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Table View (>= md) */}
                      <div className="hidden md:block overflow-x-auto scrollbar-none">
                        <table className="w-full text-left text-xs">
                          <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                            <tr>
                              <th className="pb-2">Order ID</th>
                              <th className="pb-2">Customer</th>
                              <th className="pb-2">Product</th>
                              <th className="pb-2 text-right">Customer Price</th>
                              <th className="pb-2 text-right">Your Profit</th>
                              <th className="pb-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {myResellerOrders.slice(0, 5).map((o) => {
                              const item = o.items[0];
                              const profit = (o as any).resellerProfit || Math.round(o.totalAmount * 0.15);

                              return (
                                <tr key={o.id} className="hover:bg-slate-800/40">
                                  <td className="py-2.5 font-mono text-slate-300">#{o.id}</td>
                                  <td className="py-2.5">
                                    <p className="font-bold text-white">{o.customerName}</p>
                                    <p className="text-[10px] text-slate-500">{o.customerMobile}</p>
                                  </td>
                                  <td className="py-2.5 text-slate-300 truncate max-w-[140px]">{item?.name || 'Product'}</td>
                                  <td className="py-2.5 text-right font-bold text-white tabular-nums">৳{o.totalAmount.toLocaleString('en-BD')}</td>
                                  <td className="py-2.5 text-right font-black text-emerald-400 tabular-nums">+৳{profit.toLocaleString('en-BD')}</td>
                                  <td className="py-2.5 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        o.orderStatus === 'Delivered'
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                          : o.orderStatus === 'Cancelled'
                                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                          : 'bg-sky-950 text-sky-300 border border-sky-800'
                                      }`}
                                    >
                                      {o.orderStatus}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* Top Wholesale Products to Resell */}
                <div className="lg:col-span-4 bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-white">{lang === 'bn' ? 'হাই মার্জিন পণ্য' : 'High Margin Picks'}</h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-400">{lang === 'bn' ? '২০%+ প্রফিট মার্জিন' : '20%+ profit ready'}</p>
                    </div>
                    <button
                      onClick={() => setCurrentTab('catalog')}
                      className="text-xs font-bold text-emerald-400 cursor-pointer"
                    >
                      {lang === 'bn' ? 'ক্যাটালগ ↗' : 'Catalog ↗'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                    {products.slice(0, 3).map((p) => {
                      const wholesaleCost = p.price;
                      const suggestedSelling = Math.round(p.price * 1.3);
                      const margin = suggestedSelling - wholesaleCost;

                      return (
                        <div
                          key={p.id}
                          className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2.5 hover:border-slate-700 transition-colors"
                        >
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover border border-slate-800 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                            <p className="text-[10px] text-slate-400">
                              Wholesale: <strong className="text-white">৳{wholesaleCost}</strong>
                            </p>
                            <p className="text-[10px] text-emerald-400 font-black tabular-nums">
                              +৳{margin} / item
                            </p>
                          </div>
                          <button
                            onClick={() => handleOpenOrderModal(p)}
                            className="px-2.5 py-1.5 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shrink-0 cursor-pointer shadow-xs"
                          >
                            {lang === 'bn' ? 'অর্ডার' : 'Resell'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SALES TARGETS & MILESTONE BONUSES */}
          {currentTab === 'target-rewards' && (
            <ResellerTargetRewardsPanel
              reseller={reseller}
              orders={orders}
              products={products}
              lang={lang}
              isDarkMode={isDarkMode}
              onUpdateReseller={(updated) => {
                setReseller(updated);
                setActiveResellerSession(updated);
                const all = getResellers().map((r) => (r.id === updated.id ? updated : r));
                saveResellers(all);
              }}
              onAddTransaction={(newTxn) => {
                const nextTxns = [newTxn, ...transactions];
                setTransactions(nextTxns);
                saveResellerTransactions(nextTxns);
              }}
              onNavigateToTab={setCurrentTab}
            />
          )}

          {/* TAB: TOP RESELLERS LEADERBOARD */}
          {currentTab === 'leaderboard' && (
            <ResellerLeaderboardPanel
              currentReseller={reseller}
              lang={lang}
              isDarkMode={isDarkMode}
              onNavigateToTab={setCurrentTab}
            />
          )}

          {/* TAB: COURIER BOOKING & PARCEL TRACKING */}
          {currentTab === 'delivery-courier' && (
            <ResellerDeliveryCourierPanel
              orders={orders}
              onNavigateToTab={setCurrentTab}
            />
          )}

          {/* TAB: CAMPAIGN & PROMOTIONAL MARKETING HUB */}
          {(currentTab === 'campaigns' || currentTab === 'marketing-promotions') && (
            <ResellerCampaignsPanel
              reseller={reseller}
              products={catalogProducts}
              onNavigateToTab={setCurrentTab}
            />
          )}

          {/* TAB: ADVANCED SALES & PROFIT ANALYTICS */}
          {currentTab === 'analytics' && (
            <ResellerAnalyticsPanel
              reseller={reseller}
              orders={orders}
              products={catalogProducts}
            />
          )}

          {/* TAB: SPECIALIZED PRODUCT CATALOG */}
          {(currentTab === 'catalog' || currentTab === 'my-products') && (
            <ResellerProductCatalogPanel
              products={catalogProducts}
              favorites={favorites}
              lang={lang}
              reseller={reseller}
              onToggleFavorite={handleToggleFavorite}
              onOpenOrderModal={handleOpenOrderModal}
              onOpenShareModal={(product) => {
                setSelectedProductForShare(product);
                setIsShareModalOpen(true);
              }}
              onOpenCalculator={() => setIsCalculatorOpen(true)}
              onOpenLandingPage={() => setCurrentTab('marketing-landing')}
              onSelectSellerReviews={setSelectedSellerForReviews}
            />
          )}

          {/* TAB: FAVORITES */}
          {currentTab === 'favorites' && (
            <ResellerProductCatalogPanel
              products={catalogProducts.filter((p) => favorites.includes(p.id))}
              favorites={favorites}
              lang={lang}
              reseller={reseller}
              onToggleFavorite={handleToggleFavorite}
              onOpenOrderModal={handleOpenOrderModal}
              onOpenShareModal={(product) => {
                setSelectedProductForShare(product);
                setIsShareModalOpen(true);
              }}
              onOpenCalculator={() => setIsCalculatorOpen(true)}
              onOpenLandingPage={() => setCurrentTab('marketing-landing')}
              onSelectSellerReviews={setSelectedSellerForReviews}
            />
          )}

          {/* TAB: SPECIALIZED ACTIVE SALES PANEL */}
          {(currentTab === 'orders-all' || currentTab === 'orders-processing' || currentTab === 'orders-delivered') && (
            <ResellerActiveSalesPanel
              orders={myResellerOrders}
              reseller={reseller}
              lang={lang}
              onCreateOrderClick={() => {
                if (products.length > 0) handleOpenOrderModal(products[0]);
              }}
              onOpenInvoiceModal={(ord) => setSelectedInvoiceOrder(ord)}
              onNavigateToCatalog={() => setCurrentTab('catalog')}
            />
          )}

          {/* TAB: SPECIALIZED EARNINGS OVERVIEW PANEL */}
          {(currentTab === 'finance-profit' || currentTab === 'finance-wallet' || currentTab === 'analytics-sales' || currentTab === 'analytics-profit') && (
            <ResellerEarningsOverviewPanel
              reseller={reseller}
              transactions={transactions}
              withdrawals={withdrawals}
              lang={lang}
              onRequestWithdrawalClick={() => setIsWithdrawalModalOpen(true)}
              onUpdatePaymentInfo={(info) => {
                const updated: ResellerUser = { ...reseller, paymentInfo: info };
                setReseller(updated);
                setActiveResellerSession(updated);
                const all = getResellers().map((r) => (r.id === updated.id ? updated : r));
                saveResellers(all);
              }}
            />
          )}

          {/* TAB: DEDICATED WHITE-LABEL SUB-STORE & INVOICE BRANDING BUILDER */}
          {currentTab === 'substore-builder' && (
            <ResellerSubStorePanel
              reseller={reseller}
              products={catalogProducts}
              lang={lang}
              onResellerUpdated={(updated) => {
                setReseller(updated);
                setActiveResellerSession(updated);
                const all = getResellers().map((r) => (r.id === updated.id ? updated : r));
                saveResellers(all);
              }}
              onUpgradePlanClick={() => setCurrentTab('membership-plan')}
            />
          )}

          {/* TAB: META FACEBOOK & TIKTOK PIXEL ADS TRACKER */}
          {currentTab === 'ads-tracker' && (
            <ResellerAdsTrackerPanel
              reseller={reseller}
              products={catalogProducts}
              lang={lang}
              onUpgradePlanClick={() => setCurrentTab('membership-plan')}
              isFeatureAllowed={isTabAllowedForRole('reseller', 'ads-tracker' as any, matrixConfig)}
            />
          )}

          {/* TAB: SINGLE PRODUCT LANDING PAGE & META BOOST GENERATOR */}
          {currentTab === 'marketing-landing' && (
            <ResellerLandingPagePanel
              reseller={reseller}
              products={catalogProducts}
              lang={lang}
              onOpenOrderModal={handleOpenOrderModal}
              onUpgradePlanClick={() => setCurrentTab('membership-plan')}
              isFeatureAllowed={isTabAllowedForRole('reseller', 'marketing-landing' as any, matrixConfig)}
            />
          )}

          {/* TAB: COURIER FRAUD & RELIABILITY CHECKER */}
          {currentTab === 'courier-checker' && (
            <ResellerCourierCheckerPanel lang={lang} />
          )}

          {/* TAB 3: CUSTOMER MANAGEMENT */}
          {currentTab === 'customers' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-3xl border border-slate-800">
                <div>
                  <h3 className="text-base font-black text-white">Customer Directory</h3>
                  <p className="text-xs text-slate-400">
                    Store and organize your regular buyers for fast 1-click drop-ship order placement.
                  </p>
                </div>
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-all cursor-pointer self-start"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add New Customer</span>
                </button>
              </div>

              {customers.length === 0 ? (
                <div className="p-12 text-center bg-slate-900 rounded-3xl border border-slate-800 space-y-3">
                  <Users className="w-10 h-10 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No customers added yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    When you place drop-ship orders or save customer contacts, they will appear here.
                  </p>
                  <button
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    Add Your First Customer
                  </button>
                </div>
              ) : (
                <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase text-slate-400 bg-slate-950/60 border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Customer Name</th>
                          <th className="px-4 py-3">Contact</th>
                          <th className="px-4 py-3">Delivery Address</th>
                          <th className="px-4 py-3 text-center">Total Orders</th>
                          <th className="px-4 py-3 text-right">Total Spent</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {customers.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-bold text-white">{c.name}</td>
                            <td className="px-4 py-3 text-slate-300 font-mono">{c.phone}</td>
                            <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{c.address}, {c.district}</td>
                            <td className="px-4 py-3 text-center font-bold">{c.totalOrders}</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-400">৳{c.totalSpent.toLocaleString('en-BD')}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setOrderCustomerMode('existing');
                                  setOrderSelectedCustomerId(c.id);
                                  if (products.length > 0) handleOpenOrderModal(products[0]);
                                }}
                                className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Create Order
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: TRANSACTIONS LEDGER */}
          {currentTab === 'finance-transactions' && (
            <ResellerEarningsOverviewPanel
              reseller={reseller}
              transactions={transactions}
              withdrawals={withdrawals}
              onRequestWithdrawalClick={() => setIsWithdrawalModalOpen(true)}
            />
          )}

          {/* TAB 5: MEMBERSHIP & PLANS (Active Purchase & VIP Upgrade System) */}
          {currentTab === 'membership-plan' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Active Pending Upgrade Request Notification Banner */}
              {planRequests.some((r) => r.status === 'pending') && (
                <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border border-amber-500/50 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold shrink-0 animate-pulse">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 font-black text-[10px] uppercase border border-amber-500/40">
                          {lang === 'bn' ? 'পেন্ডিং অনুমোদন' : 'Pending Verification'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          TrxID: {planRequests.find((r) => r.status === 'pending')?.transactionId}
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-black text-white mt-1">
                        {lang === 'bn'
                          ? `আপনার "${planRequests.find((r) => r.status === 'pending')?.targetPlanName}" প্ল্যানের পেমেন্ট রিকোয়েস্ট পর্যালোচনাধীন রয়েছে`
                          : `Upgrade request for "${planRequests.find((r) => r.status === 'pending')?.targetPlanName}" is under review`}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lang === 'bn'
                          ? 'অ্যাডমিন আপনার TrxID এবং পেমেন্ট ভেরিফাই করার সাথে সাথে স্বয়ংক্রিয়ভাবে ভিআইপি প্ল্যান সক্রিয় হয়ে যাবে। আপনার কোনো ডাটা পরিবর্তন বা মুছে যাবে না।'
                          : 'Admin will verify the TrxID and approve your VIP access shortly. All your existing data is preserved.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-amber-400 font-mono block">
                      ৳{planRequests.find((r) => r.status === 'pending')?.amount} ({planRequests.find((r) => r.status === 'pending')?.billingCycle})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {planRequests.find((r) => r.status === 'pending')?.paymentMethod.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {/* Current Active Plan & Live Countdown Target Timer */}
              <ResellerMembershipCountdown
                reseller={reseller}
                currentPlan={currentPlan}
                lang={lang}
                onUpgradeClick={(plan) => {
                  setSelectedPlanForUpgrade(plan || plans.find((p) => p.id === 'premium') || plans[0]);
                  setIsUpgradeModalOpen(true);
                }}
                onRenewClick={() => {
                  setSelectedPlanForUpgrade(currentPlan);
                  setIsUpgradeModalOpen(true);
                }}
              />

              {/* Plans Grid with Buy & Upgrade Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((p) => {
                  const isCurrent = reseller.planId === p.id;
                  const isPendingForThisPlan = planRequests.some(
                    (r) => r.status === 'pending' && r.targetPlanId === p.id
                  );
                  const isUpgradeEligible =
                    !isCurrent &&
                    (reseller.planId === 'basic' ||
                      (reseller.planId === 'standard' && p.id === 'premium'));

                  return (
                    <div
                      key={p.id}
                      className={`p-5 rounded-3xl border flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'bg-gradient-to-b from-emerald-950/60 to-slate-900 border-emerald-500 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-950/40 relative'
                          : isPendingForThisPlan
                          ? 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/60 ring-2 ring-amber-500/30 shadow-lg relative'
                          : p.id === 'premium'
                          ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/40 hover:border-indigo-400 relative'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>{lang === 'bn' ? 'আপনার বর্তমান প্ল্যান' : 'Your Current Plan'}</span>
                        </div>
                      )}

                      {!isCurrent && isPendingForThisPlan && (
                        <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3" />
                          <span>{lang === 'bn' ? 'অনুমোদন পেন্ডিং' : 'Pending Approval'}</span>
                        </div>
                      )}

                      {!isCurrent && !isPendingForThisPlan && p.id === 'premium' && (
                        <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          <span>{lang === 'bn' ? 'সর্বোচ্চ লাভ (VIP)' : 'Highest Profit'}</span>
                        </div>
                      )}

                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center pt-1">
                          <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                            {p.id === 'premium' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                            <span>{p.name}</span>
                          </h4>
                          {isCurrent ? (
                            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          ) : isPendingForThisPlan ? (
                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                              Pending
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                              Available
                            </span>
                          )}
                        </div>
                        <p className="text-xl font-black text-white font-mono">
                          {p.monthlyPrice === 0 ? (lang === 'bn' ? 'ফ্রি' : 'Free') : `৳${p.monthlyPrice.toLocaleString('en-BD')}/mo`}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {isCurrent
                            ? (lang === 'bn' ? '✓ এই প্ল্যানের সমস্ত সুবিধা আপনার অ্যাকাউন্টে সক্রিয় রয়েছে।' : '✓ All features of this plan are active on your account.')
                            : isPendingForThisPlan
                            ? (lang === 'bn' ? '⏳ আপনার পেমেন্ট ভেরিফিকেশন চলছে। অ্যাডমিন অ্যাপ্রুভ করলে এটি স্বয়ংক্রিয়ভাবে সক্রিয় হবে।' : '⏳ Payment verification in progress. Admin approval will activate this plan.')
                            : (lang === 'bn' ? '✓ অ্যাডমিন নম্বরে পেমেন্ট করে সরাসরি এই মেম্বারশিপে আপগ্রেড করুন।' : '✓ Send payment to official admin number to upgrade instantly.')}
                        </p>
                        <ul className="space-y-2 border-t border-slate-800 pt-3">
                          {p.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-300 text-[11px]">
                              <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isCurrent ? 'text-emerald-400 font-bold' : isPendingForThisPlan ? 'text-amber-400' : 'text-indigo-400'}`} />
                              <span className={isCurrent ? 'text-slate-200 font-medium' : 'text-slate-300'}>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-800">
                        {isCurrent ? (
                          <div className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>{lang === 'bn' ? 'সক্রিয় প্ল্যান' : 'Active Plan'}</span>
                          </div>
                        ) : isPendingForThisPlan ? (
                          <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 font-black text-xs flex items-center justify-center gap-2 shadow-md animate-pulse">
                            <Clock className="w-4 h-4 text-amber-400" />
                            <span>{lang === 'bn' ? '⏳ পেমেন্ট যাচাইধীন (পেন্ডিং)' : '⏳ Payment Under Review'}</span>
                          </div>
                        ) : isUpgradeEligible ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlanForUpgrade(p);
                              setIsUpgradeModalOpen(true);
                            }}
                            className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                              p.id === 'premium'
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-950/40'
                                : 'bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white shadow-indigo-950/40'
                            }`}
                          >
                            <Crown className="w-4 h-4" />
                            <span>{lang === 'bn' ? `${p.name} কিনুন ↗` : `Buy ${p.name} ↗`}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlanForUpgrade(p);
                              setIsUpgradeModalOpen(true);
                            }}
                            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>{lang === 'bn' ? 'প্ল্যানের বিবরণ দেখুন ↗' : 'View Plan Details ↗'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Zero Data Loss Guarantee & Support Footer */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    <strong className="text-white">
                      {lang === 'bn' ? '১০০% সুরক্ষিত ডাটা নিশ্চয়তা:' : '100% Data Protection Guarantee:'}
                    </strong>{' '}
                    {lang === 'bn'
                      ? 'প্ল্যান আপগ্রেড করলেও আপনার পূর্ববর্তী সমস্ত কাস্টমার লিস্ট, অর্ডারের হিস্ট্রি ও ওয়ালেট ব্যালেন্স সম্পূর্ণ অক্ষুণ্ণ রেখে নতুন VIP সুবিধার সাথে স্বয়ংক্রিয়ভাবে সমন্বয় করা হবে।'
                      : 'All existing customers, wallet balances, and order records are preserved 100% when upgrading.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTeamChatOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  {lang === 'bn' ? 'সাপোর্টে কথা বলুন' : 'Contact Support'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: MARKETING & PRODUCT SHARING (LOCKED - 'কামিং সুন') */}
          {currentTab === 'marketing-share' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Coming Soon Lock Banner */}
              <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 p-5 sm:p-6 rounded-3xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
                      <Lock className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'কামিং সুন' : 'Coming Soon'}</span>
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs font-bold text-amber-400">
                      {lang === 'bn' ? 'ফিচারটি বর্তমানে লক অবস্থায় রয়েছে' : 'Feature is currently locked'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mt-1">
                    {lang === 'bn' ? 'সোশ্যাল পোস্ট ও শেয়ার (অ্যাফিলিয়েট মার্কেটিং)' : 'Social Post & Share (Affiliate Marketing)'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    {lang === 'bn'
                      ? 'সোশ্যাল মিডিয়া অ্যাফিলিয়েট ট্র্যাকিং ও অটোমেটেড পোস্ট জেনারেটর ফিচারের কাজ চলমান রয়েছে। এটি লক অবস্থায় রয়েছে এবং পরবর্তীতে এটি উন্মুক্ত করা হবে।'
                      : 'Social post generator and affiliate tracking feature is currently locked for future updates.'}
                  </p>
                </div>

                <div className="text-right shrink-0 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    {lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-400 flex items-center justify-end gap-1 mt-0.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'কামিং সুন (লকড)' : 'Coming Soon'}</span>
                  </span>
                </div>
              </div>

              {/* Locked Preview Grid */}
              <div className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 opacity-60 pointer-events-none">
                  {products.slice(0, 6).map((product) => (
                    <div key={product.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                      <img src={product.images[0]} alt={product.name} className="w-full h-36 object-contain rounded-xl bg-slate-950 p-2" />
                      <h4 className="font-bold text-white text-xs truncate">{product.name}</h4>
                      <p className="text-xs text-emerald-400 font-black">Wholesale: ৳{product.price}</p>
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>🔒 কামিং সুন (লকড)</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: MARKETING REFERRAL EARNINGS (LOCKED - 'কামিং সুন' WITH CONDITIONS) */}
          {currentTab === 'marketing-referral' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Coming Soon Lock Banner */}
              <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 p-5 sm:p-6 rounded-3xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
                      <Lock className="w-3.5 h-3.5" />
                      <span>{lang === 'bn' ? 'কামিং সুন' : 'Coming Soon'}</span>
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs font-bold text-amber-400">
                      {lang === 'bn' ? 'ফিচারটি বর্তমানে লক অবস্থায় রয়েছে' : 'Feature is currently locked'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mt-1">
                    {lang === 'bn' ? 'রিসেলার রেফারেল উপার্জন প্রোগ্রাম' : 'Reseller Referral Earnings Program'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    {lang === 'bn'
                      ? 'নতুন রিসেলারদের যুক্ত করে প্যাসিভ ইনকাম করার এই ফিচারটি বর্তমানে লক অবস্থায় রাখা হয়েছে। পরবর্তীতে এই সেকশনটি উন্মুক্ত হলে নিচের নিয়ম ও শর্তাবলী অনুযায়ী রেফারেল কমিশন কার্যকর হবে।'
                      : 'Referral program is locked and coming soon. The following rules and criteria will govern the program once launched.'}
                  </p>
                </div>

                <div className="text-right shrink-0 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    {lang === 'bn' ? 'প্রোগ্রাম স্ট্যাটাস' : 'Status'}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-400 flex items-center justify-end gap-1 mt-0.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'কামিং সুন (লকড)' : 'Coming Soon'}</span>
                  </span>
                </div>
              </div>

              {/* Referral Conditions & Rules Section */}
              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-5">
                <div className="border-b border-slate-800 pb-3">
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{lang === 'bn' ? 'রেফারেল প্রোগ্রাম নীতিমালা ও শর্তাবলী' : 'Referral Program Terms & Guidelines'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {lang === 'bn'
                      ? 'রেফারেল আয়ের সুবিধা গ্রহণ করার জন্য এই শর্তগুলো পূরণ করা বাধ্যতামূলক হবে:'
                      : 'The following terms and prerequisites will apply to all participating resellers:'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Condition 1 */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center">
                        ১
                      </span>
                      <h5 className="text-xs font-bold text-slate-200">
                        {lang === 'bn' ? 'সক্রিয় রিসেলার অ্যাকাউন্ট' : 'Active Reseller Account'}
                      </h5>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-8 leading-relaxed">
                      {lang === 'bn'
                        ? 'রেফারেল কোড বা লিংক শেয়ার করতে হলে আপনার রিসেলার প্রোফাইলটি সম্পূর্ণ ভেরিফাইড এবং অন্তত ১টি ড্রপশিপিং অর্ডার সফলভাবে ডেলিভারি সম্পন্ন থাকতে হবে।'
                        : 'Your account must be fully verified with at least 1 completed order.'}
                    </p>
                  </div>

                  {/* Condition 2 */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center">
                        ২
                      </span>
                      <h5 className="text-xs font-bold text-slate-200">
                        {lang === 'bn' ? 'সফল ডেলিভারির ওপর কমিশন' : 'Commission on Successful Delivery'}
                      </h5>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-8 leading-relaxed">
                      {lang === 'bn'
                        ? 'আমন্ত্রিত রিসেলার যখন কাস্টমারের কাছে পার্সেল পাঠাবে এবং কুরিয়ার কর্তৃক "ডেলিভার্ড" নিশ্চিত হবে, তখনই শুধুমাত্র বোনাস বা কমিশন ওয়ালেটে যোগ হবে। রিটার্ন অর্ডারে কোনো কমিশন দেওয়া হবে না।'
                        : 'Commission is only credited when the referred reseller achieves a verified delivered order.'}
                    </p>
                  </div>

                  {/* Condition 3 */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center">
                        ৩
                      </span>
                      <h5 className="text-xs font-bold text-slate-200">
                        {lang === 'bn' ? 'স্বচ্ছ রেফারেল কমিশন রেট' : 'Transparent Commission Structure'}
                      </h5>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-8 leading-relaxed">
                      {lang === 'bn'
                        ? 'আপনার রেফার করা রিসেলারের প্রথম ১০টি অর্ডারে প্রতি অর্ডারে ৫০ টাকা ফ্ল্যাট বোনাস এবং পরবর্তীতে আজীবন তাদের প্রফিটের ৩% নেটওয়ার্ক কমিশন স্বয়ংক্রিয়ভাবে জমা হবে।'
                        : 'Flat bonus on first 10 delivered orders plus 3% recurring commission.'}
                    </p>
                  </div>

                  {/* Condition 4 */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center">
                        ৪
                      </span>
                      <h5 className="text-xs font-bold text-slate-200">
                        {lang === 'bn' ? 'স্প্যাম ও ডুপ্লিকেট রোধ (Anti-Fraud)' : 'Anti-Fraud & Zero Duplicate'}
                      </h5>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-8 leading-relaxed">
                      {lang === 'bn'
                        ? 'একই ব্যক্তি নিজের অন্য নাম্বার বা একই ডিভাইসে ডুপ্লিকেট অ্যাকাউন্ট খুলে রেফারেল কমিশন দাবি করলে সিস্টেম স্বয়ংক্রিয়ভাবে তা ফ্রড হিসেবে শনাক্ত করবে এবং উভয় অ্যাকাউন্ট ব্লক করা হবে।'
                        : 'Self-referral or fraudulent multi-accounting will lead to permanent account suspension.'}
                    </p>
                  </div>

                  {/* Condition 5 */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center">
                        ৫
                      </span>
                      <h5 className="text-xs font-bold text-slate-200">
                        {lang === 'bn' ? 'সহজ পেআউট ও উত্তোলন' : 'Instant Wallet Payouts'}
                      </h5>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-8 leading-relaxed">
                      {lang === 'bn'
                        ? 'রেফারেল থেকে অর্জিত সমস্ত ব্যালেন্স আপনার মূল ড্রপশিপিং ওয়ালেটে ক্রেডিট হবে এবং বিকাশ, নগদ অথবা ব্যাংক অ্যাকাউন্টে সরাসরি ক্যাশ আউট করতে পারবেন।'
                        : 'All referral earnings can be withdrawn directly via bKash, Nagad, or Bank Transfer.'}
                    </p>
                  </div>

                  {/* Condition 6 */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center">
                        ৬
                      </span>
                      <h5 className="text-xs font-bold text-slate-200">
                        {lang === 'bn' ? 'অ্যাডমিন অনুমোদন ও পরিবর্তন' : 'Admin Rights & Policies'}
                      </h5>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-8 leading-relaxed">
                      {lang === 'bn'
                        ? 'প্ল্যাটফর্মের সুবিধার্থে কর্তৃপক্ষ যে কোনো সময় রেফারেল বোনাসের পরিমাণ ও শর্তাবলী পরিমার্জন করার অধিকার সংরক্ষণ করে।'
                        : 'Platform management reserves the right to adjust referral commission rates.'}
                    </p>
                  </div>
                </div>

                {/* Disabled Referral Code Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 font-bold">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-300">
                        {lang === 'bn' ? 'রেফারেল লিংক ও কোড জেনারেটর (লকড)' : 'Referral Code Generator (Locked)'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {lang === 'bn'
                          ? 'ফিচারটি উন্মুক্ত হলে আপনার ইউনিক ইনভাইট লিংক ও কিউআর কোড এখানে পাওয়া যাবে।'
                          : 'Your unique invite link and QR code will appear here once released.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-700/60"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'কামিং সুন (লক করা)' : 'Coming Soon (Locked)'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MY PROFILE & ACCOUNT SETTINGS */}
          {(currentTab === 'profile' || currentTab === 'settings') && (
            <ResellerProfilePanel
              reseller={reseller}
              lang={lang}
              isDarkMode={isDarkMode}
              onUpdateReseller={(updated) => {
                setReseller(updated);
                setActiveResellerSession(updated);
                const all = getResellers().map((r) => (r.id === updated.id ? updated : r));
                saveResellers(all);
              }}
              showToast={showToast}
            />
          )}

          {/* TAB: CHAT WITH KENAX BD TEAM & CENTRAL SUPPORT DESK */}
          {currentTab === 'support' && (
            <ResellerSupportPanel
              reseller={reseller}
              lang={lang}
            />
          )}
            </>
          )}
        </main>
        </div>
      </div>

      {/* 2-STEP ADVANCE DELIVERY RESELLER ORDER PROCESS MODAL */}
      {isOrderModalOpen && selectedProductForOrder && (
        <ResellerOrderProcessModal
          isOpen={isOrderModalOpen}
          onClose={() => {
            setIsOrderModalOpen(false);
            setSelectedProductForOrder(null);
          }}
          product={selectedProductForOrder}
          reseller={reseller}
          customers={customers}
          orders={orders}
          lang={lang}
          onOrderPlaced={(newOrder, earnedProfit) => {
            onPlaceOrder(newOrder);

            // Record transaction
            const newTxn: ResellerTransaction = {
              id: `TXN-RES-${Date.now().toString().slice(-6)}`,
              resellerId: reseller.id,
              orderId: newOrder.id,
              type: 'profit_credit',
              amount: earnedProfit,
              balanceAfter: reseller.walletBalance,
              status: 'pending',
              description: `Pending profit for Order #${newOrder.id} (${newOrder.items?.[0]?.quantity || 1}x ${selectedProductForOrder.name})`,
              date: new Date().toISOString(),
            };
            const nextTxns = [newTxn, ...transactions];
            setTransactions(nextTxns);
            saveResellerTransactions(nextTxns);

            // Update reseller stats
            const updatedReseller: ResellerUser = {
              ...reseller,
              pendingProfit: reseller.pendingProfit + earnedProfit,
              totalSales: reseller.totalSales + newOrder.totalAmount,
            };
            setReseller(updatedReseller);
            setActiveResellerSession(updatedReseller);
            const all = getResellers().map((r) => (r.id === updatedReseller.id ? updatedReseller : r));
            saveResellers(all);

            setIsOrderModalOpen(false);
            setSelectedProductForOrder(null);
            showToast(`অর্ডার #${newOrder.id} সফলভাবে তৈরি হয়েছে! সম্ভাব্য লাভ: ৳${earnedProfit}`);
          }}
        />
      )}

      {/* MODAL 2: ADD NEW CUSTOMER */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Add Customer Contact</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Mahbub Alam"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Phone Number (Mobile) *</label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="01711223344"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Shipping Address</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="House 12, Road 4, Dhanmondi, Dhaka"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: WITHDRAWAL REQUEST */}
      {isWithdrawalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-black text-white text-sm">Withdraw Reseller Profits</h3>
              <button onClick={() => setIsWithdrawalModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60">
              <p className="text-slate-400 text-[11px]">Available Balance</p>
              <p className="text-2xl font-black text-emerald-400">৳{reseller.walletBalance.toLocaleString('en-BD')}</p>
            </div>

            <form onSubmit={handleWithdrawalSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Withdrawal Amount (Min ৳500) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                  <input
                    type="number"
                    min="500"
                    max={reseller.walletBalance}
                    required
                    value={wdAmount}
                    onChange={(e) => setWdAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bkash', 'nagad', 'bank'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWdMethod(m)}
                      className={`py-2 rounded-xl font-bold uppercase text-[11px] cursor-pointer ${
                        wdMethod === m ? 'bg-emerald-600 text-white' : 'bg-slate-950 border border-slate-800 text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {wdMethod === 'bank' ? 'Bank Account / Details' : `${wdMethod.toUpperCase()} Number`} *
                </label>
                <input
                  type="text"
                  required
                  value={wdAccount}
                  onChange={(e) => setWdAccount(e.target.value)}
                  placeholder="01799887766"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsWithdrawalModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg"
                >
                  Submit Payout Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: SHARE PRODUCT TOOL */}
      {isShareModalOpen && selectedProductForShare && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">Share & Promote Product</h3>
              <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <img src={selectedProductForShare.images[0]} alt={selectedProductForShare.name} className="w-12 h-12 rounded-xl object-contain bg-slate-900" />
              <div>
                <h4 className="font-bold text-white">{selectedProductForShare.name}</h4>
                <p className="text-[11px] text-emerald-400 font-bold">Wholesale: ৳{selectedProductForShare.price}</p>
              </div>
            </div>

            {/* Generated Social Media Caption */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Ready-to-Post Bangla Social Media Caption:</label>
              <textarea
                readOnly
                rows={4}
                value={`🔥 প্রিমিয়াম কোয়ালিটি ${selectedProductForShare.name}\n✅ ১০০% অথেন্টিক প্রোডাক্ট ও ফাস্ট হোম ডেলিভারি!\n💰 অফার প্রাইস: ৳${Math.round(selectedProductForShare.price * 1.3)}\n🚚 সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা।\nঅর্ডার করতে মেসেজ দিন বা কল করুন: ${reseller.phone}`}
                className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 text-white font-sans text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  handleCopyText(
                    `🔥 প্রিমিয়াম কোয়ালিটি ${selectedProductForShare.name}\n✅ ১০০% অথেন্টিক প্রোডাক্ট ও ফাস্ট হোম ডেলিভারি!\n💰 অফার প্রাইস: ৳${Math.round(selectedProductForShare.price * 1.3)}\n🚚 সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা।\nঅর্ডার করতে কল/মেসেজ: ${reseller.phone}`,
                    'Post Caption'
                  )
                }
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Post Caption</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/?product=${selectedProductForShare.id}&reseller=${reseller.referralCode}`;
                  handleCopyText(url, 'Affiliate Referral Link');
                }}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Copy Referral URL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PROFIT CALCULATOR */}
      {isCalculatorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Reseller Profit Calculator</h3>
              </div>
              <button onClick={() => setIsCalculatorOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Product Wholesale Cost (৳)</label>
                <input
                  type="number"
                  min="50"
                  step="50"
                  value={calcBasePrice}
                  onChange={(e) => setCalcBasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Your Selling Price to Customer (৳)</label>
                <input
                  type="number"
                  min={calcBasePrice}
                  step="50"
                  value={calcSellingPrice}
                  onChange={(e) => setCalcSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold text-emerald-400 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Delivery Charge (৳)</label>
                <input
                  type="number"
                  value={calcDeliveryFee}
                  onChange={(e) => setCalcDeliveryFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white font-bold"
                />
              </div>

              {/* Calculator Output */}
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Customer Collectable (Total):</span>
                  <span className="font-bold">৳{(calcSellingPrice + calcDeliveryFee).toLocaleString('en-BD')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Wholesale Base Deducted:</span>
                  <span>- ৳{calcBasePrice.toLocaleString('en-BD')}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-black text-base border-t border-emerald-800/60 pt-2">
                  <span>Your Net Profit:</span>
                  <span>+৳{(calcSellingPrice - calcBasePrice).toLocaleString('en-BD')}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsCalculatorOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
            >
              Close Calculator
            </button>
          </div>
        </div>
      )}

      {/* MODAL 6: SELLER RATINGS & RESELLER REVIEWS */}
      {selectedSellerForReviews && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    <span>{selectedSellerForReviews.shopName}</span>
                    <BadgeCheck className="w-4 h-4 text-sky-400" />
                  </h3>
                  <p className="text-[11px] text-slate-400">KenaX BD ভেরিফাইড মার্চেন্ট ও ভেন্ডর প্রোফাইল</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSellerForReviews(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scorecard Strip */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">সামগ্রিক রেটিং</span>
                <p className="text-xl font-black text-amber-400 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{selectedSellerForReviews.rating}</span>
                </p>
                <span className="text-[10px] text-slate-500">({selectedSellerForReviews.reviewsCount} রিভিউস)</span>
              </div>

              <div className="space-y-1 border-x border-slate-800 px-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">ডিসপ্যাচ স্পিড</span>
                <p className="text-xl font-black text-emerald-400">⚡ 4.9/5</p>
                <span className="text-[10px] text-emerald-500 font-bold">গড়ে ৬ ঘণ্টায় প্যাকিং</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">কোয়ালিটি স্কোর</span>
                <p className="text-xl font-black text-sky-400">🛡️ 100%</p>
                <span className="text-[10px] text-slate-500">জেনুইন নিশ্চয়তা</span>
              </div>
            </div>

            {/* Reseller Reviews Feed */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center justify-between">
                <span>অন্যান্য রিসেলারদের মতামত ({sellerReviewsList.length})</span>
                <span className="text-[11px] text-emerald-400">১০০% ভেরিফাইড রিসেলার রিভিউ</span>
              </h4>

              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {sellerReviewsList.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-300 font-bold flex items-center justify-center text-[10px] border border-emerald-800">
                          {rev.resellerName.slice(0, 1)}
                        </div>
                        <div>
                          <span className="font-bold text-white text-xs">{rev.resellerName}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">({rev.resellerCity})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{rev.rating}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">"{rev.comment}"</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                      <span>✓ {rev.verifiedOrderCount} টি সফল অর্ডার সম্পন্ন</span>
                      <span>{rev.createdAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit New Reseller Review Form */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="font-bold text-white text-xs">আপনার অভিজ্ঞতা ও রেটিং দিন</h4>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">ওভারঅল রেটিং</label>
                  <select
                    value={newReviewRating}
                    onChange={(e) => setNewReviewRating(parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                    <option value={4}>⭐⭐⭐⭐ (4/5)</option>
                    <option value={3}>⭐⭐⭐ (3/5)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">ডিসপ্যাচ স্পিড</label>
                  <select
                    value={newReviewDispatch}
                    onChange={(e) => setNewReviewDispatch(parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                  >
                    <option value={5}>⚡ খুব দ্রুত</option>
                    <option value={4}>👍 ভালো</option>
                    <option value={3}>⏱️ মাঝারি</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">প্যাকেজিং মান</label>
                  <select
                    value={newReviewQuality}
                    onChange={(e) => setNewReviewQuality(parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-xs"
                  >
                    <option value={5}>📦 প্রিমিয়াম</option>
                    <option value={4}>👌 স্ট্যান্ডার্ড</option>
                    <option value={3}>📦 সাধারণ</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <textarea
                  rows={2}
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  placeholder="অন্যান্য রিসেলারদের জন্য সেলারের পণ্যের মান বা সার্ভিস সম্পর্কে লিখুন..."
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!newReviewComment.trim()) {
                      alert('অনুগ্রহ করে রিভিউ মন্তব্য লিখুন।');
                      return;
                    }
                    setIsSubmittingReview(true);
                    const newRev = {
                      id: `SR-${Date.now()}`,
                      sellerId: selectedSellerForReviews.id,
                      resellerName: reseller.fullName,
                      resellerCity: reseller.district || 'ঢাকা',
                      rating: newReviewRating,
                      dispatchSpeed: newReviewDispatch,
                      qualityRating: newReviewQuality,
                      comment: newReviewComment.trim(),
                      verifiedOrderCount: myResellerOrders.length || 1,
                      createdAt: 'এইমাত্র',
                    };
                    setSellerReviewsList([newRev, ...sellerReviewsList]);
                    setNewReviewComment('');
                    setIsSubmittingReview(false);
                    showToast('সেলার রিভিউ সফলভাবে জমা হয়েছে!');
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>রিভিউ পোস্ট করুন</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: RESELLER WHITE-LABEL CUSTOMER INVOICE */}
      {selectedInvoiceOrder && (
        <ResellerInvoiceModal
          order={selectedInvoiceOrder}
          reseller={reseller}
          onClose={() => setSelectedInvoiceOrder(null)}
        />
      )}

      {/* MODAL 6: SUPPORT LIVE CHAT & TICKET SYSTEM */}
      <ResellerTeamChatModal
        isOpen={isTeamChatOpen}
        onClose={() => setIsTeamChatOpen(false)}
        reseller={reseller}
        lang={lang}
      />

      {/* MOBILE SLIDE-OVER NAVIGATION DRAWER */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Content */}
          <div className={`relative w-80 max-w-[88%] border-r p-4 flex flex-col justify-between h-full z-10 overflow-y-auto scrollbar-none animate-in slide-in-from-left duration-200 transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="space-y-4">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={reseller.profilePhoto}
                    alt={reseller.fullName}
                    className="w-9 h-9 rounded-full object-cover border border-slate-300 dark:border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {reseller.businessName || reseller.fullName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        {currentPlan.name.split(' ')[0]}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                        ৳{(reseller.walletBalance || 0).toLocaleString('en-BD')}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Mobile Action Bar (Theme, Lang, Calculator, Chat) */}
              <div className="grid grid-cols-4 gap-1.5 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsDarkMode((prev) => !prev)}
                  className="p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex flex-col items-center gap-1 transition-colors shadow-2xs"
                  title="Theme"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                  <span className="text-[9px] font-bold">{isDarkMode ? 'Light' : 'Dark'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 flex flex-col items-center gap-1 transition-colors"
                  title="Language"
                >
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span className="text-[9px] font-bold">{lang === 'bn' ? 'বাংলা' : 'EN'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsCalculatorOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 flex flex-col items-center gap-1 transition-colors"
                  title="Calculator"
                >
                  <Sliders className="w-4 h-4 text-sky-400" />
                  <span className="text-[9px] font-bold">{lang === 'bn' ? 'হিসাব' : 'Calc'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsTeamChatOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 flex flex-col items-center gap-1 transition-colors"
                  title="Chat"
                >
                  <MessageSquare className="w-4 h-4 text-teal-400" />
                  <span className="text-[9px] font-bold">{lang === 'bn' ? 'চ্যাট' : 'Chat'}</span>
                </button>
              </div>

              {/* Navigation Links in Mobile Drawer */}
              <div className="space-y-3 text-xs font-bold">
                {/* Core Section */}
                <div className="space-y-1">
                  <p className="px-2 text-[9px] uppercase font-black tracking-wider text-slate-500">{lang === 'bn' ? 'কোর ড্যাশবোর্ড' : 'Core'}</p>
                  {isTabAllowedForRole('reseller', 'dashboard', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors ${
                        currentTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>{lang === 'bn' ? 'ড্যাশবোর্ড হোম' : 'Dashboard Home'}</span>
                    </button>
                  )}

                  {isTabAllowedForRole('reseller', 'target-rewards', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('target-rewards');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'target-rewards'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>{lang === 'bn' ? '🎯 সেলস টার্গেট ও বোনাস' : 'Target & Bonus'}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold">
                        Reward
                      </span>
                    </button>
                  )}

                  {isTabAllowedForRole('reseller', 'leaderboard', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('leaderboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'leaderboard'
                          ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 font-black'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>{lang === 'bn' ? '🏆 টপ লিডারবোর্ড' : 'Leaderboard'}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                        Top 10
                      </span>
                    </button>
                  )}
                </div>

                {/* Products & Delivery */}
                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  <p className="px-2 text-[9px] uppercase font-black tracking-wider text-slate-500">{lang === 'bn' ? 'পণ্য ও ডেলিভারি' : 'Products & Sales'}</p>

                  {isTabAllowedForRole('reseller', 'catalog', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('catalog');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'catalog' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Package className="w-4 h-4 text-emerald-400" />
                        <span>{lang === 'bn' ? 'হোলসেল ক্যাটালগ' : 'Wholesale Catalog'}</span>
                      </div>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 font-bold">
                        {products.length}
                      </span>
                    </button>
                  )}

                  {isTabAllowedForRole('reseller', 'favorites', matrixConfig) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('favorites');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'favorites' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Heart className="w-4 h-4 text-rose-400" />
                        <span>{lang === 'bn' ? 'সংরক্ষিত প্রোডাক্ট' : 'Saved Products'}</span>
                      </div>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 font-bold">
                        {favorites.length}
                      </span>
                    </button>
                  )}

                  {isTabAllowedForRole('reseller', 'orders-all', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('orders-all');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'orders-all' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ShoppingBag className="w-4 h-4 text-sky-400" />
                        <span>{lang === 'bn' ? 'অ্যাক্টিভ সেলস' : 'Active Sales'}</span>
                      </div>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 font-bold">
                        {myResellerOrders.length}
                      </span>
                    </button>
                  )}

                  {isTabAllowedForRole('reseller', 'delivery-courier', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('delivery-courier');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'delivery-courier' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Truck className="w-4 h-4 text-sky-400" />
                        <span>{lang === 'bn' ? 'কুরিয়ার ট্র্যাকিং' : 'Courier Tracking'}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold">
                        Steadfast
                      </span>
                    </button>
                  )}

                  {isTabAllowedForRole('reseller', 'courier-checker', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('courier-checker');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'courier-checker' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-sky-400" />
                        <span>{lang === 'bn' ? 'কুরিয়ার ফ্রড চেকার' : 'Fraud Checker'}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold">
                        Check
                      </span>
                    </button>
                  )}
                </div>

                {/* Finance, Wallet & Analytics */}
                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  <p className="px-2 text-[9px] uppercase font-black tracking-wider text-slate-500">
                    {lang === 'bn' ? 'উপার্জন ও এনালিটিক্স' : 'Earnings & Analytics'}
                  </p>

                  {isTabAllowedForRole('reseller', 'finance-profit', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('finance-profit');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'finance-profit' || currentTab === 'finance-wallet' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span>{lang === 'bn' ? 'উপার্জন ও ওয়ালেট' : 'Earnings & Wallet'}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-black">
                        ৳{reseller.walletBalance.toLocaleString('en-BD')}
                      </span>
                    </button>
                  )}

                  {isTabAllowedForRole('reseller', 'analytics', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('analytics');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <BarChart3 className="w-4 h-4 text-indigo-400" />
                        <span>{lang === 'bn' ? '📊 সেলস এনালিটিক্স ও রিপোর্ট' : 'Analytics & Report'}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                        Live
                      </span>
                    </button>
                  )}

                  {isTabAllowedForRole('reseller', 'customers', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('customers');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'customers' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-teal-400" />
                        <span>{lang === 'bn' ? 'কাস্টমার ডিরেক্টরি' : 'Customer CRM'}</span>
                      </div>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 font-bold">
                        {customers.length}
                      </span>
                    </button>
                  )}
                </div>

                {/* VIP Marketing & Growth Tools */}
                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  <p className="px-2 text-[9px] uppercase font-black tracking-wider text-slate-500">
                    {lang === 'bn' ? 'মার্কেটিং ও গ্রোথ টুলস' : 'Marketing & VIP Tools'}
                  </p>

                  {/* Sub-Store Website & Custom Invoice Logo */}
                  {isTabAllowedForRole('reseller', 'substore-builder', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('substore-builder');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'substore-builder' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Store className="w-4 h-4 text-emerald-400" />
                        <span>{lang === 'bn' ? '🌐 আমার সাইট ও ইনভয়েস লোগো' : 'My Website & Invoice Logo'}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-black uppercase">
                        VIP
                      </span>
                    </button>
                  )}

                  {/* Meta Facebook & TikTok Pixel Ads Tracker */}
                  {isTabAllowedForRole('reseller', 'ads-tracker', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('ads-tracker');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'ads-tracker' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Target className="w-4 h-4 text-indigo-400" />
                        <span>{lang === 'bn' ? '🎯 মেটা/টিকটক পিক্সেল এডস' : 'Ads & Pixel Tracker'}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-black uppercase">
                        CAPI
                      </span>
                    </button>
                  )}

                  {/* Landing Page */}
                  {isTabAllowedForRole('reseller', 'landing-page', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('marketing-landing');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'marketing-landing' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Globe className="w-4 h-4 text-amber-400" />
                        <span>{lang === 'bn' ? 'ল্যান্ডিং পেজ ও বুস্টিং' : 'Landing Page & Boost'}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-black uppercase">
                        VIP
                      </span>
                    </button>
                  )}

                  {/* Campaigns */}
                  {isTabAllowedForRole('reseller', 'campaigns', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('campaigns');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors ${
                        currentTab === 'campaigns' ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Megaphone className="w-4 h-4 text-purple-400" />
                      <span>{lang === 'bn' ? 'মেগা ক্যাম্পেইন হাব' : 'Campaign Hub'}</span>
                    </button>
                  )}

                  {/* Share & Promote */}
                  {isTabAllowedForRole('reseller', 'marketing-share', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('marketing-share');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'marketing-share' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Share2 className="w-4 h-4 text-sky-400" />
                        <span>{lang === 'bn' ? 'সোশ্যাল পোস্ট ও শেয়ার' : 'Share & Promote'}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 border border-slate-700 font-bold">
                        {lang === 'bn' ? 'কামিং সুন' : 'Soon'}
                      </span>
                    </button>
                  )}

                  {/* Referral */}
                  {isTabAllowedForRole('reseller', 'marketing-referral', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('marketing-referral');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'marketing-referral' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>{lang === 'bn' ? 'রেফারেল উপার্জন' : 'Referral Earnings'}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 border border-slate-700 font-bold">
                        {lang === 'bn' ? 'কামিং সুন' : 'Soon'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Account & Membership */}
                <div className="space-y-1 pt-2 border-t border-slate-800/80">
                  <p className="px-2 text-[9px] uppercase font-black tracking-wider text-slate-500">
                    {lang === 'bn' ? 'অ্যাকাউন্ট ও মেম্বারশিপ' : 'Account & Membership'}
                  </p>

                  {isTabAllowedForRole('reseller', 'membership-plan', matrixConfig, reseller.planId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab('membership-plan');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        currentTab === 'membership-plan' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-4 h-4 text-amber-400" />
                        <span>{lang === 'bn' ? 'আমার মেম্বারশিপ প্ল্যান' : 'Membership Plan'}</span>
                      </div>
                      <span className="text-[9px] text-emerald-400 font-bold">{currentPlan.name.split(' ')[0]}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab('profile');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                      currentTab === 'profile' || currentTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-indigo-400" />
                      <span>{lang === 'bn' ? 'মাই প্রোফাইল ও সেটিংস' : 'My Profile & Settings'}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">Edit</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setCurrentTab('profile');
                  setIsMobileMenuOpen(false);
                }}
                className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <User className="w-4 h-4 text-indigo-400" />
                <span>{lang === 'bn' ? 'মাই প্রোফাইল' : 'Profile'}</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{lang === 'bn' ? 'লগ আউট' : 'Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-friendly, Compact, Zero Scrollbars) */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t flex items-center justify-around py-1.5 px-1 shadow-2xl safe-area-bottom transition-colors ${
        isDarkMode ? 'bg-slate-900/95 border-slate-800 text-slate-300' : 'bg-white/95 border-slate-200/90 text-slate-700 shadow-md'
      }`}>
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 min-w-[54px] py-1 cursor-pointer transition-colors ${
            currentTab === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400 font-black' : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span className="text-[10px]">{lang === 'bn' ? 'হোম' : 'Home'}</span>
        </button>

        {/* 2. Product Catalog */}
        <button
          type="button"
          onClick={() => setCurrentTab('catalog')}
          className={`flex flex-col items-center gap-0.5 min-w-[54px] py-1 cursor-pointer transition-colors ${
            currentTab === 'catalog' ? 'text-emerald-600 dark:text-emerald-400 font-black' : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="text-[10px]">{lang === 'bn' ? 'ক্যাটালগ' : 'Catalog'}</span>
        </button>

        {/* 3. Active Sales */}
        <button
          type="button"
          onClick={() => setCurrentTab('orders-all')}
          className={`relative flex flex-col items-center gap-0.5 min-w-[54px] py-1 cursor-pointer transition-colors ${
            currentTab === 'orders-all' || currentTab === 'orders-processing'
              ? 'text-emerald-600 dark:text-emerald-400 font-black'
              : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          {myResellerOrders.length > 0 && (
            <span className="absolute top-0.5 right-3 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
          <span className="text-[10px]">{lang === 'bn' ? 'অর্ডার' : 'Sales'}</span>
        </button>

        {/* 4. Earnings */}
        <button
          type="button"
          onClick={() => setCurrentTab('finance-profit')}
          className={`flex flex-col items-center gap-0.5 min-w-[54px] py-1 cursor-pointer transition-colors ${
            currentTab === 'finance-profit' || currentTab === 'finance-wallet'
              ? 'text-emerald-600 dark:text-emerald-400 font-black'
              : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span className="text-[10px]">{lang === 'bn' ? 'উপার্জন' : 'Earnings'}</span>
        </button>

        {/* 5. Menu Drawer */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center gap-0.5 min-w-[54px] py-1 cursor-pointer transition-colors ${
            isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px]">{lang === 'bn' ? 'মেনু' : 'Menu'}</span>
        </button>
      </nav>
      {/* RESELLER PLAN UPGRADE MODAL */}
      {isUpgradeModalOpen && selectedPlanForUpgrade && (
        <ResellerPlanUpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => {
            setIsUpgradeModalOpen(false);
            setSelectedPlanForUpgrade(null);
          }}
          targetPlan={selectedPlanForUpgrade}
          reseller={reseller}
          lang={lang}
          onSuccess={(req) => {
            setPlanRequests((prev) => [req, ...prev]);
            showToast(
              lang === 'bn'
                ? `🎉 ${req.targetPlanName} প্ল্যানের জন্য পেমেন্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে (TrxID: ${req.transactionId})!`
                : `🎉 Upgrade request for ${req.targetPlanName} submitted successfully!`
            );
          }}
        />
      )}
    </div>
  );
};

