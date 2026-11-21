import React, { useState, useEffect, Suspense } from 'react';
import {
  AdminSidebar,
  AdminTab,
} from './admin/AdminSidebar';
import { AdminHeader } from './admin/AdminHeader';
import { AdminSectionSkeleton } from './admin/AdminSectionSkeleton';
import type { PluginManagerSubTab } from './admin/AdminPlugins';
import { PluginProvider } from '../context/PluginContext';
import { adminDataCache } from '../lib/adminCache';
import { getCollectionTotalCount } from '../lib/firestorePagination';
import { getEnvCollectionName } from '../utils/envHelper';

// Lazy-loaded Admin Sub-Modules (Zero overhead until opened)
const AdminOrderSettings = React.lazy(() => import('./admin/AdminOrderSettings'));
const AdminPlugins = React.lazy(() => import('./admin/AdminPlugins'));
const AdminOverview = React.lazy(() => import('./admin/AdminOverview').then(m => ({ default: m.AdminOverview })));
const AdminOrders = React.lazy(() => import('./admin/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminProducts = React.lazy(() => import('./admin/AdminProducts').then(m => ({ default: m.AdminProducts })));
const SellingPriceCalculator = React.lazy(() => import('./admin/SellingPriceCalculator').then(m => ({ default: m.SellingPriceCalculator })));
const AdminLandingPages = React.lazy(() => import('./admin/AdminLandingPages').then(m => ({ default: m.AdminLandingPages })));
const AdminCategories = React.lazy(() => import('./admin/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminInventory = React.lazy(() => import('./admin/AdminInventory').then(m => ({ default: m.AdminInventory })));
const AdminCustomers = React.lazy(() => import('./admin/AdminCustomers').then(m => ({ default: m.AdminCustomers })));
const AdminDelivery = React.lazy(() => import('./admin/AdminDelivery').then(m => ({ default: m.AdminDelivery })));
const AdminCourierFraudChecker = React.lazy(() => import('./admin/AdminCourierFraudChecker').then(m => ({ default: m.AdminCourierFraudChecker })));
const AdminPayments = React.lazy(() => import('./admin/AdminPayments').then(m => ({ default: m.AdminPayments })));
const AdminDeliveryAdvance = React.lazy(() => import('./admin/AdminDeliveryAdvance').then(m => ({ default: m.AdminDeliveryAdvance })));
const AdminCoupons = React.lazy(() => import('./admin/AdminCoupons').then(m => ({ default: m.AdminCoupons })));
const AdminOfferPopupManager = React.lazy(() => import('./admin/AdminOfferPopupManager').then(m => ({ default: m.AdminOfferPopupManager })));
const AdminReviews = React.lazy(() => import('./admin/AdminReviews').then(m => ({ default: m.AdminReviews })));
const AdminStaff = React.lazy(() => import('./admin/AdminStaff').then(m => ({ default: m.AdminStaff })));
const AdminActivityLogs = React.lazy(() => import('./admin/AdminActivityLogs').then(m => ({ default: m.AdminActivityLogs })));
const AdminReports = React.lazy(() => import('./admin/AdminReports').then(m => ({ default: m.AdminReports })));
const AdminCosts = React.lazy(() => import('./admin/AdminCosts').then(m => ({ default: m.AdminCosts })));
const AdminPerformanceOverview = React.lazy(() => import('./admin/AdminPerformanceOverview').then(m => ({ default: m.AdminPerformanceOverview })));
const AdminMyDashboard = React.lazy(() => import('./admin/AdminMyDashboard').then(m => ({ default: m.AdminMyDashboard })));
const AdminSettings = React.lazy(() => import('./admin/AdminSettings').then(m => ({ default: m.AdminSettings })));
const AdminMusePermissions = React.lazy(() => import('./admin/AdminMusePermissions').then(m => ({ default: m.AdminMusePermissions })));
const AdminPaymentGateways = React.lazy(() => import('./admin/AdminPaymentGateways').then(m => ({ default: m.AdminPaymentGateways })));
const AdminCartActivities = React.lazy(() => import('./admin/AdminCartActivities').then(m => ({ default: m.AdminCartActivities })));
const AdminWishlistActivities = React.lazy(() => import('./admin/AdminWishlistActivities').then(m => ({ default: m.AdminWishlistActivities })));
const AdminGmailAlerts = React.lazy(() => import('./admin/AdminGmailAlerts').then(m => ({ default: m.AdminGmailAlerts })));
const AdminSEOSettings = React.lazy(() => import('./admin/AdminSEOSettings').then(m => ({ default: m.AdminSEOSettings })));
const AdminPoliciesSettings = React.lazy(() => import('./admin/AdminPoliciesSettings').then(m => ({ default: m.AdminPoliciesSettings })));
const AdminGoogleSheets = React.lazy(() => import('./admin/AdminGoogleSheets').then(m => ({ default: m.AdminGoogleSheets })));
const AdminSMSGateway = React.lazy(() => import('./admin/AdminSMSGateway').then(m => ({ default: m.AdminSMSGateway })));
const AdminWhatsAppAutomation = React.lazy(() => import('./admin/AdminWhatsAppAutomation').then(m => ({ default: m.AdminWhatsAppAutomation })));
const AdminTelegramBot = React.lazy(() => import('./admin/AdminTelegramBot').then(m => ({ default: m.AdminTelegramBot })));
const AdminChatBot = React.lazy(() => import('./admin/AdminChatBot').then(m => ({ default: m.AdminChatBot })));
const AdminDropshipping = React.lazy(() => import('./admin/AdminDropshipping').then(m => ({ default: m.AdminDropshipping })));
const AdminDealers = React.lazy(() => import('./admin/AdminDealers').then(m => ({ default: m.AdminDealers })));
const AdminAdvertiser = React.lazy(() => import('./admin/AdminAdvertiser').then(m => ({ default: m.AdminAdvertiser })));
const AdminFacebookAds = React.lazy(() => import('./admin/AdminFacebookAds').then(m => ({ default: m.AdminFacebookAds })));
const AdminTikTokAds = React.lazy(() => import('./admin/AdminTikTokAds').then(m => ({ default: m.AdminTikTokAds })));
const AdminGoogleAds = React.lazy(() => import('./admin/AdminGoogleAds').then(m => ({ default: m.AdminGoogleAds })));
const InvoiceModal = React.lazy(() => import('./admin/InvoiceModal').then(m => ({ default: m.InvoiceModal })));
const AdminLoginModal = React.lazy(() => import('./admin/AdminLoginModal').then(m => ({ default: m.AdminLoginModal })));
import {
  triggerOrderStatusChangeWorkflow,
  triggerSuperAdminAuditAlert,
} from '../lib/emailService';
import {
  triggerTelegramOrderStatusChange,
  triggerTelegramNewProductWorkflow,
  triggerTelegramProductDiscountWorkflow,
  triggerTelegramCouponWorkflow,
} from '../lib/telegramBotService';
import { triggerWhatsAppEvent } from '../lib/whatsappService';

import {
  Product,
  Order,
  SiteSettings,
  UserRole,
  OrderStatus,
  StaffUser,
  ActivityLog,
  StockLog,
  AdminNotification,
  CustomerRecord,
  Coupon,
  Review,
  Category,
  CartActivity,
  ExpenseRecord,
  OtherProfitRecord,
  isDemoOtherProfit,
  Supplier,
  SourcingLocation,
} from '../types';
import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '../lib/permissions';
import { safeSetLocalStorage } from '../lib/storage';
import {
  loadStaffSession,
  saveStaffSession,
  clearStaffSession,
  stripStaffSecrets,
} from '../lib/passwordHash';

import {
  INITIAL_CUSTOMERS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_STOCK_LOGS,
  INITIAL_COUPONS,
  INITIAL_CATEGORIES,
  INITIAL_EXPENSES,
  INITIAL_OTHER_PROFITS,
  INITIAL_REVIEWS,
} from '../data/initialSettings';

import {
  getStaffFromDB,
  saveStaffToDB,
  deleteStaffFromDB,
  changeStaffPasswordInDB,
  signOutStaffAuth,
  getCustomersFromDB,
  saveCustomerToDB,
  updateCustomerInDB,
  deleteCustomerFromDB,
  subscribeToCustomers,
  mergeCustomersLists,
  getActivityLogsFromDB,
  logActivityToDB,
  subscribeToActivityLogs,
  getNotificationsFromDB,
  markNotificationReadInDB,
  getStockLogsFromDB,
  logStockAdjustmentToDB,
  saveOrderToDB,
  updateOrderInDB,
  generateNextOrderId,
  getCartActivitiesFromDB,
  subscribeToCartActivities,
  updateCartActivityStatusInDB,
  deleteCartActivityFromDB,
  saveCategoryToDB,
  deleteCategoryFromDB,
  getExpensesFromDB,
  saveExpenseToDB,
  deleteExpenseFromDB,
  subscribeToExpenses,
  getOtherProfitsFromDB,
  saveOtherProfitToDB,
  deleteOtherProfitFromDB,
  subscribeToOtherProfits,
  getReviewsFromDB,
  saveReviewToDB,
  deleteReviewFromDB,
  subscribeToReviews,
  getSuppliersFromDB,
  saveSupplierToDB,
  updateSupplierInDB,
  deleteSupplierFromDB,
  subscribeToSuppliers,
  getSourcingLocationsFromDB,
  saveSourcingLocationToDB,
  updateSourcingLocationInDB,
  deleteSourcingLocationFromDB,
  subscribeToSourcingLocations,
} from '../lib/firebase';

interface AdminPortalProps {
  products: Product[];
  orders: Order[];
  settings: SiteSettings;
  categories?: Category[];
  onAddCategory?: (category: Category) => void;
  onUpdateCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onReorderCategories?: (categories: Category[]) => void;
  cartActivities?: CartActivity[];
  onUpdateCartActivityStatus?: (cartId: string, status: 'active' | 'converted' | 'abandoned') => void;
  onRefreshCartActivities?: () => void;
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    courier?: string,
    tracking?: string,
    staff?: { id?: string; name?: string; role?: string },
    adminNotes?: string,
    trackingUrl?: string
  ) => void;
  onUpdateOrder?: (orderId: string, updates: Partial<Order>) => void;
  onAddOrder?: (newOrder: Order) => void;
  onUpdateSettings: (settings: Partial<SiteSettings> | SiteSettings) => void | Promise<void>;
  currentRole: UserRole;
  currentStaff?: StaffUser | null;
  onNavigateToStore?: () => void;
  onRoleChange?: (newRole: UserRole) => void;
  onLogout?: () => void;
  initialTab?: AdminTab;
  initialSettingsSubTab?: 'hero' | 'nav_items' | 'tag_banners' | 'promo_grid' | 'promo' | 'profile' | 'delivery' | 'footer' | 'seo' | 'system';
  staffList?: StaffUser[];
  onUpdateStaffList?: (newList: StaffUser[]) => void;
  onUpdateCurrentStaff?: (staff: StaffUser) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  products,
  orders,
  settings,
  categories: passedCategories,
  onAddCategory: passedOnAddCategory,
  onUpdateCategory: passedOnUpdateCategory,
  onDeleteCategory: passedOnDeleteCategory,
  onReorderCategories: passedOnReorderCategories,
  cartActivities,
  onUpdateCartActivityStatus,
  onRefreshCartActivities,
  onUpdateProduct,
  onAddProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  onUpdateOrder,
  onAddOrder,
  onUpdateSettings,
  currentRole,
  currentStaff: externalStaff,
  onNavigateToStore,
  onRoleChange,
  onLogout,
  initialTab = 'overview',
  initialSettingsSubTab,
  staffList: passedStaffList,
  onUpdateStaffList,
  onUpdateCurrentStaff,
}) => {
  // Navigation & View States
  const [currentTab, setCurrentTab] = useState<AdminTab>(() => {
    try {
      const removedTabs = new Set([
        'admin-reseller-orders',
        'partners',
        'admin-sellers',
        'partner-login-portal',
        'admin-seller-approvals',
        'admin-seller-renewals',
        'admin-seller-plans',
        'admin-partner-payouts',
        'admin-resellers',
        'admin-reseller-approvals',
        'admin-reseller-subscriptions',
        'admin-reseller-renewals',
        'admin-reseller-plans',
        'admin-reseller-payouts',
        'permission-matrix',
      ]);
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (urlTab && !removedTabs.has(urlTab)) return urlTab as AdminTab;
      const savedTab = localStorage.getItem('kenax_admin_active_tab');
      if (savedTab) {
        if (removedTabs.has(savedTab)) {
          localStorage.setItem('kenax_admin_active_tab', 'overview');
          return 'overview';
        }
        return savedTab as AdminTab;
      }
    } catch {}
    return initialTab || 'overview';
  });
  const [ordersInitialSearch, setOrdersInitialSearch] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kenax_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('kenax_admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedCustomerForAdmin, setSelectedCustomerForAdmin] = useState<CustomerRecord | null>(null);

  // Sync initialTab prop when passed explicitly
  useEffect(() => {
    if (initialTab && initialTab !== currentTab) {
      setCurrentTab(initialTab);
    }
  }, [initialTab]);

  // Always scroll to top when switching admin tabs & persist active tab across refreshes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;

    try {
      localStorage.setItem('kenax_admin_active_tab', currentTab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', currentTab);
      url.searchParams.set('view', 'admin');
      window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString() + '#admin');
    } catch {}
  }, [currentTab]);

  // Cart Activities state (hydrated live from Cloud Firestore)
  const [internalCartActivities, setInternalCartActivities] = useState<CartActivity[]>([]);

  const hasParentCartSync = Boolean(onRefreshCartActivities);

  const loadCartActivities = async () => {
    const items = await getCartActivitiesFromDB();
    setInternalCartActivities(items || []);
  };

  // Reuse App.tsx's single real-time cartActivities subscription when provided; only subscribe locally if mounted standalone
  useEffect(() => {
    if (hasParentCartSync) return;

    let isMounted = true;
    let snapshotReceived = false;
    const unsub = subscribeToCartActivities((liveCarts) => {
      snapshotReceived = true;
      if (isMounted && liveCarts) {
        setInternalCartActivities(liveCarts);
      }
    });
    const fallbackTimer = window.setTimeout(() => {
      if (isMounted && !snapshotReceived) {
        loadCartActivities().catch(() => {});
      }
    }, 1500);
    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      unsub();
    };
  }, [hasParentCartSync]);

  const rawCartsList = hasParentCartSync
    ? cartActivities || []
    : cartActivities && cartActivities.length > 0
      ? cartActivities
      : internalCartActivities;
  const activeCartsList = rawCartsList.filter((c) => c && c.items && c.items.length > 0 && (c.totalItems === undefined || c.totalItems > 0));
  const liveCartsCount = activeCartsList.filter((c) => c.status === 'active').length;

  const handleRefreshCartActivities = () => {
    if (onRefreshCartActivities) {
      onRefreshCartActivities();
    } else {
      loadCartActivities();
    }
  };

  const handleUpdateCartStatus = async (
    cartId: string,
    status: 'active' | 'converted' | 'abandoned' | 'contacted',
    extra?: { notes?: string; lastFollowUpBy?: string; lastFollowUpAt?: string }
  ) => {
    if (onUpdateCartActivityStatus) {
      onUpdateCartActivityStatus(cartId, status as any);
    }
    await updateCartActivityStatusInDB(cartId, status, extra);
    setInternalCartActivities((prev) =>
      prev.map((c) =>
        c.id === cartId
          ? {
              ...c,
              status,
              updatedAt: new Date().toISOString(),
              ...(extra || {}),
            }
          : c
      )
    );
  };

  const handleDeleteCartActivity = async (cartId: string) => {
    await deleteCartActivityFromDB(cartId);
    setInternalCartActivities((prev) => prev.filter((c) => c.id !== cartId));
  };

  const handleConvertCartToManualOrder = async (cart: CartActivity) => {
    const newOrderId = await generateNextOrderId('KB');
    const deliveryFee = settings.insideDhakaDeliveryFee || 70;
    const cartItemsList = Array.isArray(cart?.items) ? cart.items : [];
    const itemsTotal = cartItemsList.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0);

    const newOrder: Order = {
      id: newOrderId,
      customerId: cart.userId || `cust-${Date.now()}`,
      customerName: cart.customerName || 'Customer',
      customerEmail: cart.customerEmail || 'support@kenax.com.bd',
      customerMobile: cart.customerPhone || '01700000000',
      deliveryName: cart.customerName || 'Customer',
      deliveryMobile: cart.customerPhone || '01700000000',
      division: 'Dhaka',
      district: 'Dhaka',
      upazila: 'Dhaka Sadar',
      area: 'Dhaka City',
      fullAddress: cart.customerLocation || 'Address via Cart Follow-up (Dhaka)',
      items: cartItemsList.map((it) => ({
        productId: it.productId,
        productName: it.name,
        productImage: it.image,
        quantity: it.quantity,
        price: it.price,
        total: it.price * it.quantity,
      })),
      subtotal: itemsTotal,
      deliveryCharge: deliveryFee,
      discount: 0,
      totalAmount: itemsTotal + deliveryFee,
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'Pending Verification',
      orderStatus: 'Pending',
      timeline: [
        {
          status: 'Pending',
          timestamp: new Date().toISOString(),
          note: `Order converted from live Cart Activity #${cart.id.slice(-6)} by ${currentStaff?.name || 'Admin'}`,
          updatedBy: currentStaff?.name || 'Staff Admin',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      orderSource: 'manual',
      isAiBotOrder: false,
      source: 'Cart Conversion (Admin)',
      sourceChannel: 'Cart Conversion (Admin)',
      createdByStaffId: currentStaff?.id,
      createdByStaffName: currentStaff?.name,
      createdByStaffRole: activeRole,
    };

    if (onAddOrder) {
      onAddOrder(newOrder);
    }
    await saveOrderToDB(newOrder);
    handleUpdateCartStatus(cart.id, 'converted', {
      notes: `Converted to Order #${newOrderId} by ${currentStaff?.name || 'Admin'}`,
      lastFollowUpBy: currentStaff?.name || 'Admin',
      lastFollowUpAt: new Date().toISOString(),
    });
    recordAuditLog(
      'Cart Converted to Order',
      'orders',
      newOrderId,
      `Converted cart #${cart.id} for ${cart.customerName} into new Order #${newOrderId} (৳${newOrder.totalAmount})`
    );
  };

  // Active Authenticated Staff (hydrated exclusively from Cloud Firestore & passwordless session)
  const [staffList, setStaffList] = useState<StaffUser[]>(() => {
    if (passedStaffList && passedStaffList.length > 0) return passedStaffList.map(stripStaffSecrets);
    return [];
  });

  useEffect(() => {
    if (passedStaffList && passedStaffList.length > 0) {
      setStaffList(passedStaffList.map(stripStaffSecrets));
    }
  }, [passedStaffList]);

  const [authenticatedStaff, setAuthenticatedStaff] = useState<StaffUser | null>(() => {
    if (externalStaff) return stripStaffSecrets(externalStaff);
    return loadStaffSession();
  });

  const [currentStaff, setCurrentStaff] = useState<StaffUser | null>(() => {
    return externalStaff ? stripStaffSecrets(externalStaff) : authenticatedStaff;
  });

  useEffect(() => {
    if (externalStaff) {
      const clean = stripStaffSecrets(externalStaff);
      setCurrentStaff(clean);
      setAuthenticatedStaff(clean);
    }
  }, [externalStaff]);

  // Strict check: Only an active, non-removed Super Admin account gets Quick Role Tester
  const isSuperAdminAccount =
    authenticatedStaff?.role === 'super_admin' &&
    authenticatedStaff.isActive !== false &&
    authenticatedStaff.status !== 'suspended' &&
    !authenticatedStaff.isRemoved;

  // Change Password Modal State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentStaffPassword, setCurrentStaffPassword] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [confirmStaffPassword, setConfirmStaffPassword] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<string | null>(null);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff) return;
    if (!currentStaffPassword) {
      setPasswordChangeMsg('Please enter your current password.');
      return;
    }
    if (newStaffPassword.length < 6) {
      setPasswordChangeMsg('New password must be at least 6 characters.');
      return;
    }
    if (newStaffPassword !== confirmStaffPassword) {
      setPasswordChangeMsg('New passwords do not match.');
      return;
    }
    try {
      await changeStaffPasswordInDB(currentStaffPassword, newStaffPassword);
      const safeSession = stripStaffSecrets(currentStaff);
      setCurrentStaff(safeSession);
      saveStaffSession(safeSession);
      setPasswordChangeMsg('Password updated securely! All account data preserved.');
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPasswordChangeMsg(null);
        setCurrentStaffPassword('');
        setNewStaffPassword('');
        setConfirmStaffPassword('');
      }, 1500);
    } catch (err: any) {
      setPasswordChangeMsg(err?.message || 'Failed to update password.');
    }
  };

  // Effective Role — NEVER defaults to 'super_admin' when unauthenticated
  const activeRole: UserRole = currentStaff?.role || currentRole || 'customer';

  // Sub-entity states (hydrated from Cloud Firestore, never stale browser localStorage caches)
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [totalCustomersCount, setTotalCustomersCount] = useState<number | null>(null);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    return INITIAL_COUPONS.map((c) => ({
      id: c.id,
      code: c.code,
      discountPercent: c.discountType === 'percentage' ? c.discountValue : 10,
      discountAmount: c.discountType === 'fixed' ? c.discountValue : undefined,
      minPurchase: c.minSpend,
      maxDiscount: c.maxDiscount,
      validUntil: c.expiryDate,
      isActive: c.isActive,
      usageCount: c.usedCount,
    }));
  });

  const [internalCategories, setInternalCategories] = useState<Category[]>(INITIAL_CATEGORIES);

  const categories = passedCategories && passedCategories.length > 0 ? passedCategories : internalCategories;

  const handlePersistCategories = (updatedCats: Category[]) => {
    setInternalCategories(updatedCats);
  };

  const [reviews, setReviews] = useState<Review[]>([]);

  // Helper to filter out legacy demo/placeholder records
  const isDemoExpense = (e: any) =>
    e?.id === 'EXP-1001' ||
    e?.id === 'EXP-1002' ||
    e?.id === 'EXP-1003' ||
    (typeof e?.title === 'string' && (e.title.includes('Batch #12') || e.title.includes('Security Poly Bags')));

  // Expenses State (Cloud Firestore Single Source of Truth)
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);

  // Other Profits State (Cloud Firestore Single Source of Truth)
  const [otherProfits, setOtherProfits] = useState<OtherProfitRecord[]>([]);

  // Dropshipping Suppliers state (Cloud Firestore Single Source of Truth)
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Wholesalers & Sourcing Locations (Cloud Firestore Single Source of Truth)
  const [sourcingLocations, setSourcingLocations] = useState<SourcingLocation[]>([]);
  const [targetProductForEdit, setTargetProductForEdit] = useState<Product | null>(null);
  const [targetSupplierForNewProduct, setTargetSupplierForNewProduct] = useState<Supplier | null>(null);

  // Invoice modal state
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Account- & Role-Scoped In-Memory Cache Scope (isolates cached data across account/role switches)
  const cacheScope = adminDataCache.makeScope(
    currentStaff?.id || currentStaff?.email || authenticatedStaff?.id || 'staff',
    activeRole
  );

  useEffect(() => {
    adminDataCache.enforceScope(cacheScope);
  }, [cacheScope]);

  // Tab requirement flags for demand-driven data loading & scoped Firestore listeners
  const needsLiveCustomers =
    currentTab === 'customers' ||
    currentTab === 'wishlist-activities' ||
    currentTab === 'gmail-alerts';
  const needsOverviewSummaryCache = currentTab === 'overview';
  const needsLiveExpenses = currentTab === 'costs' || currentTab === 'reports';
  const needsLiveOtherProfits = currentTab === 'costs';
  const needsLiveSuppliers = currentTab === 'products' || currentTab === 'dropshipping';
  const needsLiveSourcing = currentTab === 'dropshipping';
  const needsLiveReviews = currentTab === 'reviews' || currentTab === 'performance';
  const needsLiveActivityLogs =
    currentTab === 'logs' ||
    currentTab === 'performance' ||
    currentTab === 'my-dashboard' ||
    currentTab === 'costs' ||
    currentTab === 'orders' ||
    currentTab === 'confirmed-orders';
  const needsStockLogs = currentTab === 'inventory';
  const needsStaffFallback =
    (currentTab === 'staff' || currentTab === 'roles') &&
    (!passedStaffList || passedStaffList.length === 0);

  // 1. Deferred non-blocking header notifications (never blocks initial Dashboard render)
  useEffect(() => {
    let isMounted = true;
    const timer = window.setTimeout(() => {
      adminDataCache
        .getOrFetch(cacheScope, 'notifications', () => getNotificationsFromDB(), 90_000)
        .then((dbNotifs) => {
          if (isMounted && dbNotifs && dbNotifs.length > 0) {
            setNotifications(dbNotifs);
          }
        })
        .catch(() => {});
    }, 400);
    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [cacheScope]);

  // 2. Staff fallback (only if parent App.tsx did not already supply live staffList)
  useEffect(() => {
    if (!needsStaffFallback) return;
    let isMounted = true;
    adminDataCache
      .getOrFetch(cacheScope, 'staff', () => getStaffFromDB(), 120_000)
      .then((dbStaff) => {
        if (isMounted && dbStaff && dbStaff.length > 0) {
          setStaffList(dbStaff);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [cacheScope, needsStaffFallback]);

  // 3. Overview non-blocking cached KPI hydration (server customer count via getCountFromServer, expenses, otherProfits)
  // Avoids downloading the entire customers collection or opening 7+ heavy real-time listeners on initial Dashboard login
  useEffect(() => {
    if (!needsOverviewSummaryCache) return;
    let isMounted = true;

    const cachedCust = adminDataCache.get<CustomerRecord[]>(cacheScope, 'customers');
    if (cachedCust?.data) setCustomers(cachedCust.data);
    const cachedExp = adminDataCache.get<ExpenseRecord[]>(cacheScope, 'expenses');
    if (cachedExp?.data) setExpenses(cachedExp.data);
    const cachedProfits = adminDataCache.get<OtherProfitRecord[]>(cacheScope, 'otherProfits');
    if (cachedProfits?.data) setOtherProfits(cachedProfits.data);

    const timer = window.setTimeout(() => {
      Promise.all([
        getCollectionTotalCount(getEnvCollectionName('customers'), 'customers', cacheScope, 120_000)
          .then((count) => {
            if (isMounted && count !== null) setTotalCustomersCount(count);
          })
          .catch(() => {}),
        adminDataCache
          .getOrFetch(
            cacheScope,
            'expenses',
            async () => (await getExpensesFromDB()).filter((e) => !isDemoExpense(e)),
            90_000
          )
          .then((validExpenses) => {
            if (isMounted && validExpenses) {
              setExpenses(validExpenses);
            }
          })
          .catch(() => {}),
        adminDataCache
          .getOrFetch(
            cacheScope,
            'otherProfits',
            async () => (await getOtherProfitsFromDB()).filter((p) => !isDemoOtherProfit(p)),
            90_000
          )
          .then((validProfits) => {
            if (isMounted && validProfits) {
              setOtherProfits(validProfits);
            }
          })
          .catch(() => {}),
      ]);
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [cacheScope, needsOverviewSummaryCache]);

  // 4. Tab-Demand Live Customers Listener (customers, wishlist-activities, gmail-alerts)
  useEffect(() => {
    if (!needsLiveCustomers) return;
    let isMounted = true;
    let snapshotReceived = false;

    const cached = adminDataCache.get<CustomerRecord[]>(cacheScope, 'customers');
    if (cached?.data && cached.data.length > 0) {
      setCustomers(cached.data);
    }

    const unsubscribe = subscribeToCustomers((freshCusts) => {
      snapshotReceived = true;
      if (isMounted && freshCusts && freshCusts.length > 0) {
        setCustomers(freshCusts);
        adminDataCache.set(cacheScope, 'customers', freshCusts, 120_000);
      }
    });

    const fallbackTimer = window.setTimeout(() => {
      if (isMounted && !snapshotReceived) {
        adminDataCache
          .getOrFetch(cacheScope, 'customers', () => getCustomersFromDB(), 120_000)
          .then((dbCust) => {
            if (isMounted && dbCust && dbCust.length > 0) setCustomers(dbCust);
          })
          .catch(() => {});
      }
    }, 1500);

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [cacheScope, needsLiveCustomers]);

  // 5. Tab-Demand Live Expenses Listener (costs, reports)
  useEffect(() => {
    if (!needsLiveExpenses) return;
    let isMounted = true;
    let snapshotReceived = false;

    const cached = adminDataCache.get<ExpenseRecord[]>(cacheScope, 'expenses');
    if (cached?.data) setExpenses(cached.data);

    const unsubscribe = subscribeToExpenses((freshExpenses) => {
      snapshotReceived = true;
      if (isMounted && freshExpenses) {
        const validExpenses = freshExpenses.filter((e) => !isDemoExpense(e));
        setExpenses(validExpenses);
        adminDataCache.set(cacheScope, 'expenses', validExpenses, 90_000);
      }
    });

    const fallbackTimer = window.setTimeout(() => {
      if (isMounted && !snapshotReceived) {
        adminDataCache
          .getOrFetch(
            cacheScope,
            'expenses',
            async () => (await getExpensesFromDB()).filter((e) => !isDemoExpense(e)),
            90_000
          )
          .then((valid) => {
            if (isMounted && valid) {
              setExpenses(valid);
            }
          })
          .catch(() => {});
      }
    }, 1500);

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [cacheScope, needsLiveExpenses]);

  // 6. Tab-Demand Live Other Profits Listener (costs)
  useEffect(() => {
    if (!needsLiveOtherProfits) return;
    let isMounted = true;
    let snapshotReceived = false;

    const cached = adminDataCache.get<OtherProfitRecord[]>(cacheScope, 'otherProfits');
    if (cached?.data) setOtherProfits(cached.data);

    const unsubscribe = subscribeToOtherProfits((freshProfits) => {
      snapshotReceived = true;
      if (isMounted && freshProfits) {
        const cleanProfits = freshProfits.filter((p) => !isDemoOtherProfit(p));
        setOtherProfits(cleanProfits);
        adminDataCache.set(cacheScope, 'otherProfits', cleanProfits, 90_000);
      }
    });

    const fallbackTimer = window.setTimeout(() => {
      if (isMounted && !snapshotReceived) {
        adminDataCache
          .getOrFetch(
            cacheScope,
            'otherProfits',
            async () => (await getOtherProfitsFromDB()).filter((p) => !isDemoOtherProfit(p)),
            90_000
          )
          .then((valid) => {
            if (isMounted && valid) {
              setOtherProfits(valid);
            }
          })
          .catch(() => {});
      }
    }, 1500);

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [cacheScope, needsLiveOtherProfits]);

  // 7. Tab-Demand Live Suppliers Listener (products, dropshipping)
  useEffect(() => {
    if (!needsLiveSuppliers) return;
    let isMounted = true;
    let snapshotReceived = false;

    const cached = adminDataCache.get<Supplier[]>(cacheScope, 'suppliers');
    if (cached?.data && cached.data.length > 0) setSuppliers(cached.data);

    const unsubscribe = subscribeToSuppliers((freshSuppliers) => {
      snapshotReceived = true;
      if (isMounted && freshSuppliers) {
        setSuppliers(freshSuppliers);
        adminDataCache.set(cacheScope, 'suppliers', freshSuppliers, 120_000);
      }
    });

    const fallbackTimer = window.setTimeout(() => {
      if (isMounted && !snapshotReceived) {
        adminDataCache
          .getOrFetch(cacheScope, 'suppliers', () => getSuppliersFromDB(), 120_000)
          .then((dbSuppliers) => {
            if (isMounted && dbSuppliers && dbSuppliers.length > 0) {
              setSuppliers(dbSuppliers);
            }
          })
          .catch(() => {});
      }
    }, 1500);

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [cacheScope, needsLiveSuppliers]);

  // 8. Tab-Demand Live Sourcing Locations Listener (dropshipping only)
  useEffect(() => {
    if (!needsLiveSourcing) return;
    let isMounted = true;
    let snapshotReceived = false;

    const cached = adminDataCache.get<SourcingLocation[]>(cacheScope, 'sourcingLocations');
    if (cached?.data && cached.data.length > 0) setSourcingLocations(cached.data);

    const unsubscribe = subscribeToSourcingLocations((freshLocs) => {
      snapshotReceived = true;
      if (isMounted && freshLocs) {
        setSourcingLocations(freshLocs);
        adminDataCache.set(cacheScope, 'sourcingLocations', freshLocs, 120_000);
      }
    });

    const fallbackTimer = window.setTimeout(() => {
      if (isMounted && !snapshotReceived) {
        adminDataCache
          .getOrFetch(cacheScope, 'sourcingLocations', () => getSourcingLocationsFromDB(), 120_000)
          .then((dbSourcing) => {
            if (isMounted && dbSourcing && dbSourcing.length > 0) {
              setSourcingLocations(dbSourcing);
            }
          })
          .catch(() => {});
      }
    }, 1500);

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [cacheScope, needsLiveSourcing]);

  // 9. Tab-Demand Live Reviews Listener (reviews, performance)
  useEffect(() => {
    if (!needsLiveReviews) return;
    let isMounted = true;
    let snapshotReceived = false;

    const cached = adminDataCache.get<Review[]>(cacheScope, 'reviews');
    if (cached?.data && cached.data.length > 0) setReviews(cached.data);

    const unsubscribe = subscribeToReviews((freshReviews) => {
      snapshotReceived = true;
      if (isMounted && freshReviews && freshReviews.length > 0) {
        setReviews(freshReviews);
        adminDataCache.set(cacheScope, 'reviews', freshReviews, 120_000);
      }
    });

    const fallbackTimer = window.setTimeout(() => {
      if (isMounted && !snapshotReceived) {
        adminDataCache
          .getOrFetch(cacheScope, 'reviews', () => getReviewsFromDB(), 120_000)
          .then((dbReviews) => {
            if (isMounted && dbReviews && dbReviews.length > 0) {
              setReviews(dbReviews);
            }
          })
          .catch(() => {});
      }
    }, 1500);

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [cacheScope, needsLiveReviews]);

  // 10. Tab-Demand Live Activity Logs Listener (logs, performance, my-dashboard, costs, orders)
  useEffect(() => {
    if (!needsLiveActivityLogs) return;
    let isMounted = true;
    let snapshotReceived = false;

    const cached = adminDataCache.get<ActivityLog[]>(cacheScope, 'activityLogs');
    if (cached?.data && cached.data.length > 0) setActivityLogs(cached.data);

    // Fetch persistent server activity logs only when an activity-log tab is opened (deduplicated via cache)
    adminDataCache
      .getOrFetch(
        cacheScope,
        'serverActivityLogs',
        async () => {
          const res = await fetch('/api/activity-logs');
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          return res.ok && ct.includes('application/json') ? ((await res.json()) as ActivityLog[]) : [];
        },
        60_000
      )
      .then((serverLogs) => {
        if (isMounted && Array.isArray(serverLogs) && serverLogs.length > 0) {
          setActivityLogs((prev) => {
            const byId = new Map<string, ActivityLog>();
            [...serverLogs, ...prev].forEach((item) => {
              if (item && item.id) byId.set(item.id, item);
            });
            const merged = Array.from(byId.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            adminDataCache.set(cacheScope, 'activityLogs', merged, 60_000);
            return merged;
          });
        }
      })
      .catch(() => {});

    const unsubscribe = subscribeToActivityLogs((freshLogs) => {
      snapshotReceived = true;
      if (isMounted && Array.isArray(freshLogs)) {
        setActivityLogs(freshLogs);
        adminDataCache.set(cacheScope, 'activityLogs', freshLogs, 60_000);
      }
    });

    const fallbackTimer = window.setTimeout(() => {
      if (isMounted && !snapshotReceived) {
        adminDataCache
          .getOrFetch(cacheScope, 'activityLogs', () => getActivityLogsFromDB(), 60_000)
          .then((dbLogs) => {
            if (isMounted && dbLogs && dbLogs.length > 0) setActivityLogs(dbLogs);
          })
          .catch(() => {});
      }
    }, 1500);

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [cacheScope, needsLiveActivityLogs]);

  // 11. Tab-Demand Stock Logs Loader (inventory tab only + live Firestore refresh on adjustment)
  useEffect(() => {
    let isMounted = true;
    const handleStockLogsUpdated = () => {
      adminDataCache.invalidateCollection(cacheScope, 'stockLogs');
      getStockLogsFromDB()
        .then((dbStockLogs) => {
          if (isMounted && Array.isArray(dbStockLogs)) {
            setStockLogs(dbStockLogs);
          }
        })
        .catch(() => {});
    };
    window.addEventListener('kenax_stock_logs_updated', handleStockLogsUpdated);

    if (needsStockLogs) {
      adminDataCache
        .getOrFetch(cacheScope, 'stockLogs', () => getStockLogsFromDB(), 60_000)
        .then((dbStockLogs) => {
          if (isMounted && dbStockLogs && dbStockLogs.length > 0) {
            setStockLogs(dbStockLogs);
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
      window.removeEventListener('kenax_stock_logs_updated', handleStockLogsUpdated);
    };
  }, [cacheScope, needsStockLogs]);

  // Centralized Audit Logger
  const recordAuditLog = (
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
  ) => {
    const normalizedModule =
      module.charAt(0).toUpperCase() + module.slice(1);
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      staffId: currentStaff?.id || 'staff-root',
      staffName: currentStaff?.name || 'System Admin',
      staffEmail: meta?.staffEmail || currentStaff?.email || undefined,
      staffRole: activeRole,
      action,
      module: normalizedModule,
      targetId,
      orderId: meta?.orderId || (module.toLowerCase() === 'orders' ? targetId : undefined),
      productId: meta?.productId || (module.toLowerCase() === 'products' || module.toLowerCase() === 'inventory' ? targetId : undefined),
      fromStatus: meta?.fromStatus,
      toStatus: meta?.toStatus,
      source: meta?.source || 'admin',
      details,
      timestamp: new Date().toISOString(),
    };

    setActivityLogs((prev) => [newLog, ...prev]);
    adminDataCache.invalidateCollection(cacheScope, 'activityLogs');
    adminDataCache.invalidate(cacheScope, 'serverActivityLogs');
    logActivityToDB(newLog);
  };

  // Expenses Handlers with Immediate Firestore Sync & Audit Logging
  const handleAddExpense = (expense: ExpenseRecord) => {
    const next = [expense, ...expenses];
    setExpenses(next);
    adminDataCache.set(cacheScope, 'expenses', next, 90_000);
    saveExpenseToDB(expense);

    recordAuditLog(
      'Expense Recorded',
      'costs',
      expense.id,
      `Added ${expense.category.replace('_', ' ')} expense: "${expense.title}" of ৳${expense.amount.toLocaleString()} paid via ${expense.paymentMethod || 'Cash'}${expense.courier ? ` to ${expense.courier}` : ''}${expense.orderId ? ` (Linked Order: ${expense.orderId})` : ''}`
    );
  };

  const handleUpdateExpense = (updated: ExpenseRecord) => {
    const next = expenses.map((e) => (e.id === updated.id ? updated : e));
    setExpenses(next);
    adminDataCache.set(cacheScope, 'expenses', next, 90_000);
    saveExpenseToDB(updated);

    recordAuditLog(
      'Expense Updated',
      'costs',
      updated.id,
      `Updated expense "${updated.title}" amount to ৳${updated.amount.toLocaleString()} (${updated.category.replace('_', ' ')})`
    );
  };

  const handleDeleteExpense = (expenseId: string) => {
    const target = expenses.find((e) => e.id === expenseId);
    const next = expenses.filter((e) => e.id !== expenseId);
    setExpenses(next);
    adminDataCache.set(cacheScope, 'expenses', next, 90_000);
    deleteExpenseFromDB(expenseId);

    if (target) {
      recordAuditLog(
        'Expense Deleted',
        'costs',
        expenseId,
        `Removed expense record: "${target.title}" (৳${target.amount.toLocaleString()})`
      );
    }
  };

  // Other Profits Handlers with Immediate Firestore Sync & Audit Logging
  const handleAddOtherProfit = (profit: OtherProfitRecord) => {
    const next = [profit, ...otherProfits];
    setOtherProfits(next);
    adminDataCache.set(cacheScope, 'otherProfits', next, 90_000);
    saveOtherProfitToDB(profit);

    recordAuditLog(
      'Other Profit Recorded',
      'costs',
      profit.id,
      `Added extra non-order profit: "${profit.title}" of ৳${profit.amount.toLocaleString()} (Category: ${profit.sourceCategory})`
    );
  };

  const handleUpdateOtherProfit = (updated: OtherProfitRecord) => {
    const next = otherProfits.map((p) => (p.id === updated.id ? updated : p));
    setOtherProfits(next);
    adminDataCache.set(cacheScope, 'otherProfits', next, 90_000);
    saveOtherProfitToDB(updated);

    recordAuditLog(
      'Other Profit Updated',
      'costs',
      updated.id,
      `Updated other profit "${updated.title}" amount to ৳${updated.amount.toLocaleString()} (${updated.sourceCategory})`
    );
  };

  const handleDeleteOtherProfit = (profitId: string) => {
    const target = otherProfits.find((p) => p.id === profitId);
    const next = otherProfits.filter((p) => p.id !== profitId);
    setOtherProfits(next);
    adminDataCache.set(cacheScope, 'otherProfits', next, 90_000);
    deleteOtherProfitFromDB(profitId);

    if (target) {
      recordAuditLog(
        'Other Profit Deleted',
        'costs',
        profitId,
        `Removed other profit record: "${target.title}" (৳${target.amount.toLocaleString()})`
      );
    }
  };

  // Orders Handler with Audit
  const handleUpdateOrderStatus = (
    orderId: string,
    newStatus: OrderStatus,
    courierName?: string,
    trackingNumber?: string,
    staff?: { id?: string; name?: string; role?: string },
    adminNotes?: string,
    trackingUrl?: string
  ) => {
    const activeStaff = staff || (currentStaff ? {
      id: currentStaff.id,
      name: currentStaff.name,
      role: currentStaff.role,
    } : undefined);

    const targetOrder = orders.find((o) => o.id === orderId);
    const prevStatus = targetOrder?.orderStatus || 'Pending';
    const prevCourier = targetOrder?.courierName || '';

    onUpdateOrderStatus(orderId, newStatus, courierName, trackingNumber, activeStaff, adminNotes, trackingUrl);

    const courierNote =
      courierName && courierName !== prevCourier
        ? ` | Courier: ${prevCourier || 'None'} → ${courierName}`
        : courierName
        ? ` | Courier: ${courierName}`
        : '';

    recordAuditLog(
      newStatus === 'Returned' || newStatus === 'Refunded'
        ? `Return / Refund Processed (${newStatus})`
        : 'Order Status Updated',
      'Orders',
      orderId,
      `Order #${orderId}: ${prevStatus} → ${newStatus} by ${activeStaff?.name || 'Staff'} (${activeStaff?.role || 'Admin'})${courierNote}${trackingNumber ? ` | Tracking: ${trackingNumber}` : ''}${adminNotes ? ` | Note: ${adminNotes}` : ''}`,
      {
        orderId,
        fromStatus: prevStatus,
        toStatus: newStatus,
      }
    );

    // Automated Email Notification & Staff Audit Workflow
    if (targetOrder) {
      const isCompletingOrder = newStatus === 'Completed';
      const updatedOrderSnapshot: Order = {
        ...targetOrder,
        orderStatus: newStatus,
        paymentStatus: isCompletingOrder ? 'Paid' : targetOrder.paymentStatus,
        paidAmount: isCompletingOrder ? targetOrder.totalAmount : targetOrder.paidAmount,
        dueAmount: isCompletingOrder ? 0 : targetOrder.dueAmount,
        courierName: courierName || targetOrder.courierName,
        trackingNumber: trackingNumber || targetOrder.trackingNumber,
      };

      // 1. Send Customer Email update for Confirmed, Processing, Picked, Completed, etc.
      triggerOrderStatusChangeWorkflow(
        updatedOrderSnapshot,
        newStatus,
        currentStaff,
        courierName,
        trackingNumber
      ).catch((err) => console.error('[Order Status Email Workflow Error]:', err));

      // 2. If action taken by Moderator or Manager, send audit trail directly to sadikrtx3060@gmail.com
      if (currentStaff && (activeRole === 'moderator' || activeRole === 'manager')) {
        triggerSuperAdminAuditAlert(
          currentStaff,
          `Order Status Changed to ${newStatus}`,
          'Order',
          `Order #${orderId} for ${targetOrder.customerName} (${targetOrder.customerMobile || 'N/A'}) changed from ${targetOrder.orderStatus} to ${newStatus}. Courier: ${courierName || 'N/A'}. Tracking: ${trackingNumber || 'N/A'}`
        ).catch((err) => console.error('[Super Admin Audit Alert Error]:', err));
      }

      // 3. Telegram Bot Automation:
      //    - Notifies Super Admin with Staff Information (who changed what status)
      //    - Notifies Customer without Staff Information (clean order status update)
      triggerTelegramOrderStatusChange({
        order: updatedOrderSnapshot,
        prevStatus: targetOrder.orderStatus,
        newStatus,
        staffUser: currentStaff,
        courierName,
        trackingNumber,
      }).catch((tgErr) => console.error('[Telegram Order Status Alert Error]:', tgErr));

      // 4. WhatsApp Automation Workflow:
      //    - Notifies Customer of order status update (if configured)
      //    - Notifies Pinned Admin (01887713212) with Staff Activity details & transition (e.g. Confirmed ➡️ Processing)
      triggerWhatsAppEvent({
        event: 'order_status_changed',
        order: updatedOrderSnapshot,
        staff: currentStaff
          ? { name: currentStaff.name, role: currentStaff.role, id: currentStaff.id }
          : activeStaff
          ? { name: activeStaff.name, role: activeStaff.role, id: activeStaff.id }
          : { name: 'Admin Staff', role: activeRole },
        statusChange: {
          oldStatus: targetOrder.orderStatus,
          newStatus: newStatus,
        },
      }).catch((waErr) => console.error('[WhatsApp Order Status Alert Error]:', waErr));
    }
  };

  // Payment Verification Handler
  const handleVerifyPayment = (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const isDeliveryOnly = targetOrder.paymentOptionType === 'delivery_only' || targetOrder.paymentMethod === 'Delivery Charge Only';
    const isCOD = targetOrder.paymentOptionType === 'cod' || targetOrder.paymentMethod === 'Cash on Delivery';

    const verifiedAdvanceAmount = isDeliveryOnly
      ? (targetOrder.paidAmount !== undefined && targetOrder.paidAmount > 0 ? targetOrder.paidAmount : targetOrder.deliveryCharge)
      : targetOrder.totalAmount;
    const remainingDue = isDeliveryOnly
      ? (targetOrder.dueAmount !== undefined ? targetOrder.dueAmount : Math.max(0, targetOrder.totalAmount - verifiedAdvanceAmount))
      : 0;

    const activeStaff = currentStaff || {
      name: 'Admin Staff',
      role: activeRole,
      id: 'staff-admin',
    };

    const updatedOrder: Order = {
      ...targetOrder,
      paymentStatus: 'Verified',
      paidAmount: verifiedAdvanceAmount,
      dueAmount: remainingDue,
      paymentVerifiedAt: new Date().toISOString(),
      orderStatus: targetOrder.orderStatus === 'Payment Verification' ? 'Confirmed' : targetOrder.orderStatus,
      handledByStaffId: activeStaff.id,
      handledByStaffName: activeStaff.name,
      handledByStaffRole: activeStaff.role,
      timeline: [
        ...targetOrder.timeline,
        {
          status: 'Payment Verification',
          timestamp: new Date().toISOString(),
          note: isDeliveryOnly
            ? `Delivery advance of ৳${verifiedAdvanceAmount.toLocaleString()} verified by ${activeStaff.name} (${activeStaff.role}). Remaining due on delivery: ৳${remainingDue.toLocaleString()}`
            : isCOD
            ? `Cash on Delivery bill of ৳${targetOrder.totalAmount.toLocaleString()} verified as Collected & Paid by ${activeStaff.name} (${activeStaff.role}). Due: ৳0`
            : `Full payment of ৳${targetOrder.totalAmount.toLocaleString()} verified by ${activeStaff.name} (${activeStaff.role}). Due: ৳0`,
        },
      ],
    };

    updateOrderInDB(updatedOrder.id, updatedOrder);
    onUpdateOrderStatus(orderId, updatedOrder.orderStatus);

    // 1. Audit Log in admin activity logs
    recordAuditLog(
      'Payment Verified',
      'payments',
      orderId,
      `স্টাফ ${activeStaff.name} (${activeStaff.role}) কাস্টমার ${targetOrder.customerName}-এর অর্ডার #${orderId} এর ${isDeliveryOnly ? 'ডেলিভারি অগ্রিম' : 'ফুল পেমেন্ট'} ৳${verifiedAdvanceAmount.toLocaleString()} (${targetOrder.paymentMethod}, TrxID: ${targetOrder.transactionId || 'N/A'}) সফলভাবে ভেরিফাই ও অনুমোদন করেছেন।`
    );

    // 2. Alert to Admin / Super Admin (Email alert with staff details):
    // "স্টাফ এই উনার প্রোডাক্টটা অ্যাডভান্স করছে এবং অ্যাডভান্সটা ভেরিফাইড করছে।"
    const paymentLabel = isDeliveryOnly ? 'ডেলিভারি চার্জ অগ্রিম (Delivery Advance)' : isCOD ? 'ক্যাশ অন ডেলিভারি (COD)' : 'সম্পূর্ণ অগ্রিম (Full Payment)';
    triggerSuperAdminAuditAlert(
      currentStaff,
      `Payment Verified by Staff: ${activeStaff.name}`,
      'Payment',
      `স্টাফ ${activeStaff.name} (${activeStaff.role}) কাস্টমার ${targetOrder.customerName} (${targetOrder.customerMobile || targetOrder.deliveryMobile})-এর অর্ডার #${orderId} এর ${paymentLabel} ৳${verifiedAdvanceAmount.toLocaleString()} (${targetOrder.paymentMethod}, TrxID: ${targetOrder.transactionId || 'N/A'}) সফলভাবে ভেরিফাই ও অনুমোদন করেছেন। অবশিষ্ট ডিউ: ৳${remainingDue.toLocaleString()}`
    ).catch((err) => console.error('[Payment Super Admin Audit Alert Error]:', err));

    // 3. Notification to Customer & Pinned Admin via WhatsApp Event:
    // "আর কাস্টমারের কাছে যাবে যে তার পেমেন্টটা ভেরিফাই করা হয়েছে।"
    triggerWhatsAppEvent({
      event: 'payment_received' as any,
      order: updatedOrder,
      staff: activeStaff,
      customerPhone: targetOrder.customerMobile || targetOrder.deliveryMobile,
      customVariables: {
        '{{staffName}}': activeStaff.name,
        '{{staffRole}}': activeStaff.role,
        '{{paymentMethod}}': targetOrder.paymentMethod || 'bKash / Nagad',
        '{{trxId}}': targetOrder.transactionId || 'N/A',
        '{{paidAmount}}': String(verifiedAdvanceAmount),
        '{{dueAmount}}': String(remainingDue),
      },
    }).catch((waErr) => console.error('[WhatsApp Payment Verified Alert Error]:', waErr));
  };

  // Stock Adjustment Handler
  const handleAdjustStock = async (
    productId: string,
    changeAmount: number,
    reason: string
  ) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const prevStock = prod.stock;
    const newStock = Math.max(0, prevStock + changeAmount);

    onUpdateProduct({
      ...prod,
      stock: newStock,
    });

    const stockEntry = await logStockAdjustmentToDB({
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      staffId: currentStaff?.id || 'staff-root',
      staffName: currentStaff?.name || 'Admin',
      staffRole: activeRole,
      previousStock: prevStock,
      newStock,
      quantityChanged: changeAmount,
      reason,
    });

    setStockLogs((prev) => {
      const next = [stockEntry, ...prev.filter((l) => l.id !== stockEntry.id)];
      adminDataCache.invalidateCollection(cacheScope, 'stockLogs');
      adminDataCache.set(cacheScope, 'stockLogs', next, 60_000);
      return next;
    });
    adminDataCache.invalidateCollection(cacheScope, 'products');

    recordAuditLog(
      'Stock Adjusted',
      'Inventory',
      prod.sku || prod.id,
      `${changeAmount > 0 ? '+' : ''}${changeAmount} units for ${prod.name} (${prod.sku}). Stock: ${prevStock} → ${newStock}. Reason: ${reason}`,
      { productId: prod.id }
    );
  };

  // Customer block toggle
  const handleToggleCustomerStatus = (customerId: string, blockReason?: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    const newBlockedState = !cust.isBlocked;
    const updated = {
      ...cust,
      isBlocked: newBlockedState,
      blockReason: newBlockedState ? blockReason || 'Manual restriction' : undefined,
    };

    setCustomers((prev) => prev.map((c) => (c.id === customerId ? updated : c)));
    adminDataCache.invalidateCollection(cacheScope, 'customers');
    saveCustomerToDB(updated);

    recordAuditLog(
      newBlockedState ? 'Customer Blocked' : 'Customer Unblocked',
      'customers',
      cust.mobile,
      `${newBlockedState ? 'Blocked' : 'Unblocked'} customer ${cust.name} (${cust.mobile}). Reason: ${blockReason || 'Admin Action'}`
    );
  };

  // Customer Password Reset by Admin
  const handleResetCustomerPassword = async (customerId: string, newPassword: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    const updated: CustomerRecord = {
      ...cust,
      password: newPassword,
    };

    setCustomers((prev) => prev.map((c) => (c.id === customerId ? updated : c)));
    adminDataCache.invalidateCollection(cacheScope, 'customers');
    await updateCustomerInDB(customerId, { password: newPassword });

    // Update active logged in customer cache if this customer is currently active
    const cachedCustomer = localStorage.getItem('kenax_current_customer');
    if (cachedCustomer) {
      try {
        const parsed = JSON.parse(cachedCustomer);
        if (parsed.id === customerId) {
          parsed.password = newPassword;
          safeSetLocalStorage('kenax_current_customer', JSON.stringify(parsed));
        }
      } catch {}
    }

    recordAuditLog(
      'Customer Password Reset',
      'customers',
      cust.mobile,
      `Admin (${currentStaff?.name || 'Super Admin'}) reset password for customer ${cust.name} (${cust.mobile})`
    );
  };

  // Customer Profile Edit by Admin
  const handleEditCustomer = async (customerId: string, updatedData: Partial<CustomerRecord>) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    const mergedCustomer: CustomerRecord = {
      ...cust,
      ...updatedData,
    };

    setCustomers((prev) => prev.map((c) => (c.id === customerId ? mergedCustomer : c)));
    adminDataCache.invalidateCollection(cacheScope, 'customers');
    await updateCustomerInDB(customerId, updatedData);

    recordAuditLog(
      'Customer Profile Updated',
      'customers',
      mergedCustomer.mobile,
      `Admin (${currentStaff?.name || 'Super Admin'}) updated profile details for customer ${mergedCustomer.name} (${mergedCustomer.mobile})`
    );
  };

  // Customer Account Deletion by Admin
  // CRITICAL REQUIREMENT: Customer profile is removed, but all orders/money receipts remain 100% intact and visible to admin!
  const handleDeleteCustomer = async (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    const custMobile = cust.mobile;
    const custName = cust.name;
    const totalOrdersCount = orders.filter((o) => o.customerMobile === custMobile || o.customerId === customerId).length;

    // Delete customer record from state and database
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    adminDataCache.invalidateCollection(cacheScope, 'customers');
    await deleteCustomerFromDB(customerId);

    // CRITICAL: All orders remain intact in state and in Firestore!
    recordAuditLog(
      'Customer Account Deleted',
      'customers',
      custMobile,
      `Admin (${currentStaff?.name || 'Super Admin'}) deleted customer account for ${custName} (${custMobile}). All ${totalOrdersCount} orders and transaction history were preserved for store records.`
    );
  };

  // Notifications
  const handleMarkNotificationRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
    adminDataCache.invalidate(cacheScope, 'notifications');
    markNotificationReadInDB(notifId);
  };

  // Staff Management (Cloud Firestore Single Source of Truth + SHA-256 hashed passwords)
  const handleAddStaff = async (newStaff: StaffUser) => {
    const safeForUi = stripStaffSecrets(newStaff);
    setStaffList((prev) => {
      const next = [safeForUi, ...prev.filter((s) => s.id !== safeForUi.id)];
      if (onUpdateStaffList) onUpdateStaffList(next);
      return next;
    });
    await saveStaffToDB(newStaff);
    recordAuditLog(
      'New Staff Account Created',
      'staff',
      newStaff.email,
      `Created staff account for ${newStaff.name} with role ${newStaff.role}`
    );
  };

  const handleUpdateStaff = async (updatedStaff: StaffUser) => {
    const safeForUi = stripStaffSecrets(updatedStaff);
    setStaffList((prev) => {
      const next = prev.map((s) => (s.id === safeForUi.id ? safeForUi : s));
      if (onUpdateStaffList) onUpdateStaffList(next);
      return next;
    });

    // If the updated staff is currently active or super admin, sync passwordless session metadata only
    const isCurrentActive =
      currentStaff?.id === safeForUi.id ||
      (currentStaff?.email && safeForUi.email && currentStaff.email.toLowerCase() === safeForUi.email.toLowerCase()) ||
      authenticatedStaff?.id === safeForUi.id ||
      (authenticatedStaff?.email && safeForUi.email && authenticatedStaff.email.toLowerCase() === safeForUi.email.toLowerCase());

    if (isCurrentActive) {
      setCurrentStaff(safeForUi);
      setAuthenticatedStaff(safeForUi);
      saveStaffSession(safeForUi);
      if (onUpdateCurrentStaff) {
        onUpdateCurrentStaff(safeForUi);
      }
    }

    const prevStaff = staffList.find((s) => s.id === safeForUi.id);
    const changes: string[] = [];
    if (prevStaff && prevStaff.role !== safeForUi.role) {
      changes.push(`Role: ${prevStaff.role} → ${safeForUi.role}`);
    }
    if (prevStaff && prevStaff.isActive !== safeForUi.isActive) {
      changes.push(`Status: ${safeForUi.isActive ? 'Active' : 'Suspended'}`);
    }
    if (prevStaff && prevStaff.status !== safeForUi.status && safeForUi.status) {
      changes.push(`Account Status: ${prevStaff.status || 'active'} → ${safeForUi.status}`);
    }

    await saveStaffToDB(updatedStaff);
    recordAuditLog(
      prevStaff && prevStaff.role !== safeForUi.role
        ? 'Staff Role Changed'
        : prevStaff && (prevStaff.isActive !== safeForUi.isActive || prevStaff.status !== safeForUi.status)
        ? safeForUi.isActive === false || safeForUi.status === 'suspended'
          ? 'Staff Suspended'
          : 'Staff Activated'
        : 'Staff Account Updated',
      'Staff',
      safeForUi.email,
      changes.length > 0
        ? `Updated ${safeForUi.name} (${safeForUi.email}): ${changes.join(', ')}`
        : `Updated profile/phone/permissions for ${safeForUi.name} (${safeForUi.email})`
    );
  };

  const handleDeleteStaff = async (staffId: string) => {
    const target = staffList.find((s) => s.id === staffId);
    if (!target) return;

    // Hard permanent delete in Cloud Firestore
    setStaffList((prev) => {
      const next = prev.filter((s) => s.id !== staffId);
      if (onUpdateStaffList) onUpdateStaffList(next);
      return next;
    });

    await deleteStaffFromDB(staffId, target.email);

    recordAuditLog(
      'Staff Member Deleted',
      'staff',
      target.email,
      `Super Admin (${currentStaff?.name || 'Super Admin'}) permanently deleted staff account for ${target.name} (${target.email}, role: ${target.role}). Login revoked and account purged.`
    );
  };

  const handleRestoreStaff = async (staffId: string) => {
    const target = staffList.find((s) => s.id === staffId);
    if (!target) return;

    const restoredStaff: StaffUser = {
      ...stripStaffSecrets(target),
      isRemoved: false,
      status: 'active',
      isActive: true,
      removedAt: undefined,
      removedBy: undefined,
    };

    setStaffList((prev) => {
      const next = prev.map((s) => (s.id === staffId ? restoredStaff : s));
      if (onUpdateStaffList) onUpdateStaffList(next);
      return next;
    });

    await saveStaffToDB(restoredStaff);

    recordAuditLog(
      'Staff Member Restored',
      'staff',
      restoredStaff.email,
      `Restored access for staff user ${restoredStaff.name} (${restoredStaff.role}).`
    );
  };

  const handleToggleStaffStatus = (staffId: string) => {
    const target = staffList.find((s) => s.id === staffId);
    if (!target) return;
    const updated = { ...stripStaffSecrets(target), isActive: !target.isActive };
    handleUpdateStaff(updated);
  };

  // Dropshipping & Supplier Management (Cloud Firestore + in-memory cache only)
  const handleAddSupplier = async (supplier: Supplier) => {
    setSuppliers((prev) => {
      const next = [supplier, ...prev.filter((s) => s.id !== supplier.id)];
      adminDataCache.set(cacheScope, 'suppliers', next, 120_000);
      return next;
    });
    await saveSupplierToDB(supplier);
    recordAuditLog(
      'Supplier Added',
      'products',
      supplier.name,
      `Registered sourcing supplier ${supplier.name} for dropshipping`
    );
  };

  const handleUpdateSupplier = async (supplier: Supplier) => {
    setSuppliers((prev) => {
      const next = prev.map((s) => (s.id === supplier.id ? supplier : s));
      adminDataCache.set(cacheScope, 'suppliers', next, 120_000);
      return next;
    });
    await updateSupplierInDB(supplier);
    recordAuditLog(
      'Supplier Updated',
      'products',
      supplier.name,
      `Updated supplier info for ${supplier.name}`
    );
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    const supp = suppliers.find((s) => s.id === supplierId);
    setSuppliers((prev) => {
      const next = prev.filter((s) => s.id !== supplierId);
      adminDataCache.set(cacheScope, 'suppliers', next, 120_000);
      return next;
    });
    await deleteSupplierFromDB(supplierId);
    if (supp) {
      recordAuditLog(
        'Supplier Deleted',
        'products',
        supp.name,
        `Removed supplier ${supp.name} from dropshipping directory`
      );
    }
  };

  // Sourcing Location Handlers (Own Stock Wholesalers)
  const handleAddSourcingLocation = async (location: SourcingLocation) => {
    setSourcingLocations((prev) => {
      const next = [location, ...prev.filter((l) => l.id !== location.id)];
      adminDataCache.set(cacheScope, 'sourcingLocations', next, 120_000);
      return next;
    });
    await saveSourcingLocationToDB(location);
    recordAuditLog(
      'Wholesaler Registered',
      'products',
      location.vendorName,
      `Registered new wholesale sourcing location ${location.vendorName} (${location.marketName || location.address})`
    );
  };

  const handleUpdateSourcingLocation = async (location: SourcingLocation) => {
    setSourcingLocations((prev) => {
      const exists = prev.some((l) => l.id === location.id);
      const next = exists
        ? prev.map((l) => (l.id === location.id ? location : l))
        : [location, ...prev];
      adminDataCache.set(cacheScope, 'sourcingLocations', next, 120_000);
      return next;
    });
    await updateSourcingLocationInDB(location);
    recordAuditLog(
      'Wholesaler Updated',
      'products',
      location.vendorName,
      `Updated wholesaler sourcing details for ${location.vendorName}`
    );
  };

  const handleDeleteSourcingLocation = async (locationId: string) => {
    const loc = sourcingLocations.find((l) => l.id === locationId);
    setSourcingLocations((prev) => {
      const next = prev.filter((l) => l.id !== locationId);
      adminDataCache.set(cacheScope, 'sourcingLocations', next, 120_000);
      return next;
    });
    await deleteSourcingLocationFromDB(locationId);
    if (loc) {
      recordAuditLog(
        'Wholesaler Deleted',
        'products',
        loc.vendorName,
        `Deleted wholesale sourcing location ${loc.vendorName} from directory`
      );
    }
  };

  const handleEditProductFromSupplier = (product: Product) => {
    setTargetProductForEdit(product);
    setCurrentTab('products');
  };

  const handleAddProductForSupplier = (supplier: Supplier) => {
    setTargetSupplierForNewProduct(supplier);
    setCurrentTab('products');
  };

  // Quick Role switch: ONLY available to Super Admin account to preview manager/moderator permissions
  // Ensures the Super Admin tests the role using THEIR OWN identity without switching to or exposing other staff members' accounts
  const handleRoleChange = (newRole: UserRole) => {
    if (!isSuperAdminAccount) return;

    if (onRoleChange) onRoleChange(newRole);

    if (currentStaff) {
      const testingPermissions =
        newRole === 'super_admin'
          ? ['*']
          : DEFAULT_ROLE_PERMISSIONS[newRole as 'manager' | 'moderator'] || [];

      setCurrentStaff({
        ...currentStaff,
        id: authenticatedStaff?.id || currentStaff.id,
        name: authenticatedStaff?.name || currentStaff.name,
        email: authenticatedStaff?.email || currentStaff.email,
        phone: authenticatedStaff?.phone || currentStaff.phone,
        role: newRole,
        permissions: testingPermissions,
      });
    }
  };

  // Automatically reset tab to overview if tested role does not have permission to view current tab
  useEffect(() => {
    if (activeRole === 'super_admin') return;
    const permissions = DEFAULT_ROLE_PERMISSIONS[activeRole as 'manager' | 'moderator'] || [];

    const tabPermissionMap: Record<string, string> = {
      overview: 'reports.view',
      performance: 'performance.view',
      'my-dashboard': 'my_dashboard.view',
      orders: 'orders.view',
      'cart-activities': 'orders.cart_activities',
      'wishlist-activities': 'orders.wishlist_activities',
      payments: 'payments.view',
      'payment-gateways': 'payments.gateways',
      'delivery-advance': 'payments.verify',
      costs: 'costs.view',
      reports: 'reports.view',
      products: 'products.view',
      advertiser: 'marketing.view',
      dropshipping: 'suppliers.view',
      dealers: 'suppliers.view',
      categories: 'categories.manage',
      inventory: 'inventory.view',
      coupons: 'coupons.view',
      customers: 'customers.view',
      reviews: 'reviews.view',
      delivery: 'delivery.view',
      staff: 'staff.view',
      roles: 'roles.view',
      'chat-bot': 'chatbot.ai',
      'telegram-bot': 'chatbot.telegram',
      'whatsapp-automation': 'chatbot.whatsapp',
      'sms-gateway': 'chatbot.sms',
      'gmail-alerts': 'chatbot.email',
      'seo-settings': 'seo.manage',
      logs: 'logs.view',
      settings: 'settings.view',
      plugins: 'plugins.view',
      'plugins-installed': 'plugins.view',
      'plugins-add-new': 'plugins.install',
      'plugins-store': 'plugins.view',
      'plugins-upload': 'plugins.install',
      'plugins-settings': 'plugins.settings',
      'plugins-updates': 'plugins.manage',
      'plugins-logs': 'plugins.view',
    };

    if (currentTab === 'integration-settings' || currentTab === 'muse-permissions') {
      setCurrentTab('overview');
      return;
    }

    const reqPerm = tabPermissionMap[currentTab];
    if (reqPerm && !hasPermission(activeRole, permissions, reqPerm)) {
      setCurrentTab('overview');
    }
  }, [activeRole, currentTab]);

  // Computed counts for badges
  const pendingOrdersCount = orders.filter((o) => {
    const s = (o.orderStatus || (o as any).status || 'Pending').toString().trim().toLowerCase();
    return s === 'pending' || s === 'payment verification' || s === 'unconfirmed';
  }).length;

  const confirmedOrdersCount = orders.filter((o) => {
    const s = (o.orderStatus || (o as any).status || '').toString().trim().toLowerCase();
    return (
      s === 'confirmed' ||
      s === 'processing' ||
      s === 'packed' ||
      s === 'picked' ||
      s === 'shipped' ||
      s === 'out for delivery' ||
      s === 'out_for_delivery' ||
      s === 'delivered'
    );
  }).length;

  const lowStockCount = products.filter((p) => p.stock <= 10).length;

  // Direct Logout Handler - Clears Firebase Auth, session tokens, and in-memory admin cache completely
  const handleDirectLogout = () => {
    adminDataCache.clearAll();
    setCurrentStaff(null);
    setAuthenticatedStaff(null);
    signOutStaffAuth().catch(() => {
      clearStaffSession();
    });
    setIsLoginModalOpen(false);

    if (onLogout) {
      onLogout();
    } else if (onNavigateToStore) {
      onNavigateToStore();
    }
  };

  const activeSkeletonVariant: 'dashboard' | 'table' | 'settings' | 'cards' =
    currentTab === 'overview' || currentTab === 'performance' || currentTab === 'my-dashboard'
      ? 'dashboard'
      : currentTab === 'settings' ||
          currentTab === 'storage-settings' ||
          currentTab === 'integration-settings' ||
          currentTab === 'muse-permissions' ||
          currentTab === 'order-settings' ||
          currentTab === 'seo-settings' ||
          currentTab === 'policies'
        ? 'settings'
        : currentTab.startsWith('plugins') ||
            currentTab === 'get-offers' ||
            currentTab === 'coupons' ||
            currentTab === 'categories' ||
            currentTab === 'payment-gateways'
          ? 'cards'
          : 'table';

  return (
    <PluginProvider
      actorName={currentStaff?.name || 'Super Admin'}
      actorRole={activeRole}
      onAuditLog={recordAuditLog}
    >
    <div className="admin-portal-root min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Fixed Desktop / Drawer Mobile Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentRole={activeRole}
        currentStaff={currentStaff}
        onLogout={handleDirectLogout}
        onNavigateToStore={() => {
          if (onNavigateToStore) onNavigateToStore();
        }}
        pendingOrdersCount={pendingOrdersCount}
        confirmedOrdersCount={confirmedOrdersCount}
        lowStockCount={lowStockCount}
        liveCartsCount={liveCartsCount}
        liveWishlistsCount={customers.filter((c) => c.wishlist && c.wishlist.length > 0).length}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onRoleChange={handleRoleChange}
        isSuperAdminAccount={isSuperAdminAccount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* Main Content Area (Offset by 20/64 for sidebar on lg screens with smooth transition) */}
      <div
        className={`${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        } flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out`}
      >
        {/* Top Header */}
        <AdminHeader
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={handleToggleSidebarCollapse}
          notifications={notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          currentStaff={currentStaff}
          currentRole={activeRole}
          onLogout={handleDirectLogout}
          onNavigateToStore={() => {
            if (onNavigateToStore) onNavigateToStore();
          }}
          onOpenAddProduct={() => setCurrentTab('products')}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          isSuperAdminAccount={isSuperAdminAccount}
          onRoleChange={handleRoleChange}
        />

        {/* Tab Body */}
        <main className="flex-1 min-w-0 p-2 sm:p-4 lg:p-5 w-full max-w-[99%] 2xl:max-w-[1720px] mx-auto">
          <Suspense fallback={<AdminSectionSkeleton variant={activeSkeletonVariant} />}>
            {currentTab === 'overview' && (
            <AdminOverview
              orders={orders}
              products={products}
              customers={customers}
              activityLogs={activityLogs}
              expenses={expenses}
              otherProfits={otherProfits}
              onAddExpense={handleAddExpense}
              onSelectTab={setCurrentTab}
              onViewOrder={(order) => {
                setCurrentTab('orders');
              }}
              onPrintInvoice={(order) => setSelectedInvoiceOrder(order)}
              currentRole={activeRole}
              currentStaff={currentStaff}
              lowStockThreshold={settings.lowStockThreshold ?? 5}
              totalCustomersCount={totalCustomersCount}
            />
          )}

          {currentTab === 'performance' && (
            <AdminPerformanceOverview
              staffList={staffList}
              orders={orders}
              reviews={reviews}
              activityLogs={activityLogs}
              currentRole={activeRole}
              currentStaff={currentStaff}
            />
          )}

          {currentTab === 'my-dashboard' && (
            <AdminMyDashboard
              orders={orders}
              staffList={staffList}
              currentStaff={currentStaff}
              currentRole={activeRole}
              activityLogs={activityLogs}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onPrintInvoice={(order) => setSelectedInvoiceOrder(order)}
              onSelectTab={setCurrentTab}
            />
          )}

          {currentTab === 'costs' && (
            <AdminCosts
              expenses={expenses}
              orders={orders}
              otherProfits={otherProfits}
              onAddExpense={handleAddExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              onAddOtherProfit={handleAddOtherProfit}
              onUpdateOtherProfit={handleUpdateOtherProfit}
              onDeleteOtherProfit={handleDeleteOtherProfit}
              activityLogs={activityLogs}
              currentRole={activeRole}
              currentStaff={currentStaff}
            />
          )}

          {(currentTab === 'orders' || currentTab === 'confirmed-orders') && (
            <AdminOrders
              key={`${currentTab}_${ordersInitialSearch}`}
              orders={orders}
              products={products}
              staffList={staffList}
              initialScope={currentTab === 'confirmed-orders' ? 'confirmed' : 'pending'}
              isConfirmedOrdersTab={currentTab === 'confirmed-orders'}
              initialSearchQuery={currentTab === 'orders' ? ordersInitialSearch : ''}
              onNavigateToOrdersWithSearch={(searchIp) => {
                setOrdersInitialSearch(searchIp);
                setCurrentTab('orders');
              }}
              onUpdateOrderStatus={(orderId, status, courier, tracking, staff, adminNotes, trackingUrl) => {
                adminDataCache.invalidateCollection(cacheScope, 'orders');
                handleUpdateOrderStatus(orderId, status, courier, tracking, staff, adminNotes, trackingUrl);
              }}
              onUpdateOrder={(orderId, updates) => {
                adminDataCache.invalidateCollection(cacheScope, 'orders');
                if (onUpdateOrder) onUpdateOrder(orderId, updates);
              }}
              onVerifyPayment={(orderId) => {
                adminDataCache.invalidateCollection(cacheScope, 'orders');
                handleVerifyPayment(orderId);
              }}
              onPrintInvoice={(order) => setSelectedInvoiceOrder(order)}
              onAddOrder={(newOrd) => {
                adminDataCache.invalidateCollection(cacheScope, 'orders');
                if (onAddOrder) onAddOrder(newOrd);
                recordAuditLog('Manual Order Created', 'orders', newOrd.id, `Created manual order ${newOrd.id} for ${newOrd.customerName} (৳${newOrd.totalAmount})`);
              }}
              currentRole={activeRole}
              currentStaff={currentStaff}
              settings={settings}
              activityLogs={activityLogs}
              onRecordAudit={recordAuditLog}
              cacheScope={cacheScope}
            />
          )}

          {currentTab === 'cart-activities' && (
            <AdminCartActivities
              cartActivities={activeCartsList}
              products={products}
              currentRole={activeRole}
              currentStaff={currentStaff}
              onRefresh={handleRefreshCartActivities}
              onUpdateStatus={handleUpdateCartStatus}
              onDeleteCart={handleDeleteCartActivity}
              onConvertToOrder={handleConvertCartToManualOrder}
            />
          )}

          {currentTab === 'wishlist-activities' && (
            <AdminWishlistActivities
              customers={customers}
              products={products}
              currentRole={activeRole}
              onRefresh={() => {
                getCustomersFromDB().then((data) => {
                  if (data && data.length > 0) setCustomers(data);
                });
              }}
              onSelectCustomer={(cust) => {
                setSelectedCustomerForAdmin(cust);
                setCurrentTab('customers');
              }}
            />
          )}

          {currentTab === 'products' && (
            <AdminProducts
              products={products}
              categories={categories}
              onAddProduct={(p) => {
                adminDataCache.invalidateCollection(cacheScope, 'products');
                onAddProduct(p);
                recordAuditLog(
                  'Product Created',
                  'Products',
                  p.sku || p.id,
                  `Created product ${p.name} (${p.sku}) at ৳${p.price}, Stock: ${p.stock}`,
                  { productId: p.id }
                );
                triggerTelegramNewProductWorkflow({
                  product: p,
                  staffUser: currentStaff,
                  supplierName: p.supplierName,
                }).catch((err) => console.error('[Telegram New Product Error]:', err));
              }}
              onUpdateProduct={(p) => {
                adminDataCache.invalidateCollection(cacheScope, 'products');
                const prevProd = products.find((old) => old.id === p.id || old.sku === p.sku);
                const prevPrice = prevProd?.price ?? p.price;
                const prevStock = prevProd?.stock ?? p.stock;
                const diffParts: string[] = [];
                if (prevProd && prevPrice !== p.price) {
                  diffParts.push(`Price: ৳${prevPrice} → ৳${p.price}`);
                }
                if (prevProd && prevStock !== p.stock) {
                  diffParts.push(`Stock: ${prevStock} → ${p.stock}`);
                }
                onUpdateProduct(p);
                recordAuditLog(
                  'Product Updated',
                  'Products',
                  p.sku || p.id,
                  diffParts.length > 0
                    ? `Updated ${p.name} (${p.sku}): ${diffParts.join(' | ')}`
                    : `Updated pricing/specs for ${p.name} (${p.sku})`,
                  { productId: p.id }
                );
                if (prevProd && p.price < prevPrice) {
                  triggerTelegramProductDiscountWorkflow({
                    product: p,
                    previousPrice: prevPrice,
                    staffUser: currentStaff,
                  }).catch((err) => console.error('[Telegram Discount Alert Error]:', err));
                }
              }}
              onDeleteProduct={(id) => {
                adminDataCache.invalidateCollection(cacheScope, 'products');
                const prod = products.find((p) => p.id === id);
                onDeleteProduct(id);
                if (prod) {
                  recordAuditLog(
                    'Product Deleted',
                    'Products',
                    prod.sku || prod.id,
                    `Removed product ${prod.name} (${prod.sku}) from catalog`,
                    { productId: prod.id }
                  );
                }
              }}
              currentRole={activeRole}
              currentStaff={currentStaff}
              suppliers={suppliers}
              onAddSupplier={handleAddSupplier}
              targetProductForEdit={targetProductForEdit}
              targetSupplierForNewProduct={targetSupplierForNewProduct}
              onClearTargetProductForEdit={() => setTargetProductForEdit(null)}
              onClearTargetSupplierForNewProduct={() => setTargetSupplierForNewProduct(null)}
              cacheScope={cacheScope}
            />
          )}

          {currentTab === 'price-calculator' && (
            <SellingPriceCalculator mode="standalone" />
          )}

          {currentTab === 'landing-pages' && (
            <AdminLandingPages
              products={products}
              categories={categories}
              onUpdateProduct={(prod) => {
                onUpdateProduct(prod);
                recordAuditLog(
                  prod.landingPage?.enabled ? 'Landing Page Enabled' : 'Landing Page Updated',
                  'products',
                  prod.sku || prod.name,
                  `Updated landing page config for product: ${prod.name}`
                );
              }}
              currentRole={activeRole}
              currentStaff={currentStaff}
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          )}

          {currentTab === 'dropshipping' && (
            <AdminDropshipping
              products={products}
              orders={orders}
              suppliers={suppliers}
              onAddSupplier={handleAddSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              sourcingLocationsList={sourcingLocations}
              onAddSourcingLocation={handleAddSourcingLocation}
              onUpdateSourcingLocation={handleUpdateSourcingLocation}
              onDeleteSourcingLocation={handleDeleteSourcingLocation}
              onEditProduct={handleEditProductFromSupplier}
              onAddProductForSupplier={handleAddProductForSupplier}
              currentRole={activeRole}
              currentStaff={currentStaff}
            />
          )}

          {currentTab === 'dealers' && (
            <AdminDealers
              products={products}
              currentRole={activeRole}
              currentStaff={currentStaff}
            />
          )}

          {currentTab === 'categories' && (
            <AdminCategories
              categories={categories}
              products={products}
              onAddCategory={(c) => {
                const next = [...categories, c];
                handlePersistCategories(next);
                saveCategoryToDB(c);
                if (passedOnAddCategory) passedOnAddCategory(c);
                recordAuditLog('Category Added', 'products', c.name, `Created store category ${c.name}`);
              }}
              onUpdateCategory={(c) => {
                const next = categories.map((cat) => (cat.id === c.id ? c : cat));
                handlePersistCategories(next);
                saveCategoryToDB(c);
                if (passedOnUpdateCategory) passedOnUpdateCategory(c);
                recordAuditLog('Category Updated', 'products', c.name, `Updated category ${c.name}`);
              }}
              onReorderCategories={(newCats) => {
                handlePersistCategories(newCats);
                newCats.forEach((c) => saveCategoryToDB(c));
                if (passedOnReorderCategories) passedOnReorderCategories(newCats);
                recordAuditLog('Categories Reordered', 'products', 'Storefront Navigation', `Reordered category priorities (${newCats.length} categories)`);
              }}
              onDeleteCategory={(id) => {
                const next = categories.filter((c) => c.id !== id);
                handlePersistCategories(next);
                deleteCategoryFromDB(id);
                if (passedOnDeleteCategory) passedOnDeleteCategory(id);
                recordAuditLog('Category Deleted', 'products', id, `Removed category ID ${id}`);
              }}
              currentRole={activeRole}
              currentStaff={currentStaff}
            />
          )}

          {(currentTab === 'facebook-ads' || currentTab === 'advertiser') && (
            <AdminFacebookAds
              siteSettings={settings}
              onUpdateSettings={onUpdateSettings}
              products={products}
              orders={orders}
              currentRole={activeRole}
              onRecordAudit={recordAuditLog}
            />
          )}

          {currentTab === 'tiktok-ads' && (
            <AdminTikTokAds
              siteSettings={settings}
              onUpdateSettings={onUpdateSettings}
              products={products}
              orders={orders}
              currentRole={activeRole}
              onRecordAudit={recordAuditLog}
            />
          )}

          {currentTab === 'google-ads' && (
            <AdminGoogleAds
              siteSettings={settings}
              onUpdateSettings={onUpdateSettings}
              products={products}
              orders={orders}
              currentRole={activeRole}
              onRecordAudit={recordAuditLog}
            />
          )}

          {currentTab === 'inventory' && (
            <AdminInventory
              products={products}
              orders={orders}
              stockLogs={stockLogs}
              onAdjustStock={handleAdjustStock}
              currentRole={activeRole}
              currentStaff={currentStaff}
              lowStockThreshold={settings.lowStockThreshold ?? 5}
              onNavigateToOrdersWithSearch={(orderIdOrQuery) => {
                setOrdersInitialSearch(orderIdOrQuery);
                setCurrentTab('orders');
              }}
              cacheScope={cacheScope}
            />
          )}

          {currentTab === 'customers' && (
            <AdminCustomers
              customers={customers}
              orders={orders}
              onToggleCustomerStatus={handleToggleCustomerStatus}
              onResetCustomerPassword={handleResetCustomerPassword}
              onEditCustomer={handleEditCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              currentRole={activeRole}
              currentStaff={currentStaff}
              initialSelectedCustomer={selectedCustomerForAdmin}
              onCloseCustomerModal={() => setSelectedCustomerForAdmin(null)}
              cacheScope={cacheScope}
            />
          )}

          {currentTab === 'delivery' && (
            <AdminDelivery
              orders={orders}
              onUpdateDelivery={(orderId, courier, tracking, status) => {
                handleUpdateOrderStatus(orderId, status, courier, tracking);
              }}
              currentRole={activeRole}
              currentStaff={currentStaff}
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          )}

          {currentTab === 'courier-fraud' && (
            <AdminCourierFraudChecker
              siteSettings={settings}
              onUpdateSettings={onUpdateSettings}
              canManageSettings={activeRole === 'super_admin' || activeRole === 'manager'}
            />
          )}

          {currentTab === 'order-settings' && (
            <AdminOrderSettings
              settings={settings}
              onUpdateSettings={async (newSet) => {
                await onUpdateSettings(newSet);
                recordAuditLog(
                  'Order Settings Updated',
                  'settings',
                  'order-settings',
                  'Updated order verification, fraud prevention, and security rules'
                );
              }}
              canManageSettings={activeRole === 'super_admin' || activeRole === 'manager' || activeRole === 'admin'}
            />
          )}

          {currentTab === 'payments' && (
            <AdminPayments
              orders={orders}
              onVerifyPayment={handleVerifyPayment}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              currentRole={activeRole}
              currentStaff={currentStaff}
              settings={settings}
            />
          )}

          {currentTab === 'delivery-advance' && (
            <AdminDeliveryAdvance
              orders={orders}
              onVerifyPayment={handleVerifyPayment}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onOpenInvoice={(ord) => setSelectedInvoiceOrder(ord)}
              currentRole={activeRole}
              currentStaff={currentStaff}
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          )}

          {currentTab === 'payment-gateways' && (
            <AdminPaymentGateways
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              onRecordAudit={recordAuditLog}
            />
          )}

          {currentTab === 'coupons' && (
            <AdminCoupons
              coupons={coupons}
              onAddCoupon={(c) => {
                setCoupons((prev) => [c, ...prev]);
                recordAuditLog('Coupon Created', 'coupons', c.code, `Created coupon ${c.code} (${c.discountPercent}% discount)`);
                triggerTelegramCouponWorkflow({
                  coupon: c,
                  action: 'create',
                  staffUser: currentStaff,
                }).catch((err) => console.error('[Telegram Coupon Workflow Error]:', err));
              }}
              onDeleteCoupon={(id) => {
                const cpn = coupons.find((c) => c.id === id);
                setCoupons((prev) => prev.filter((c) => c.id !== id));
                if (cpn) {
                  recordAuditLog('Coupon Deleted', 'coupons', cpn.code, `Deleted promo coupon ${cpn.code}`);
                }
              }}
              currentRole={activeRole}
              currentStaff={currentStaff}
            />
          )}

          {currentTab === 'get-offers' && (
            <AdminOfferPopupManager
              settings={settings}
              onUpdateSettings={async (newSet) => {
                await onUpdateSettings(newSet);
                recordAuditLog(
                  'Offer Popup Updated',
                  'settings',
                  'offer-popup',
                  `Updated Visitor Offer Popup configuration (Status: ${newSet.offerPopup?.enabled ? 'Active' : 'Disabled'})`
                );
              }}
              categories={categories}
              products={products}
            />
          )}

          {currentTab === 'reviews' && (
            <AdminReviews
              reviews={reviews}
              products={products}
              onApproveReview={async (id) => {
                const target = reviews.find((r) => r.id === id);
                if (target) {
                  const updated = { ...target, status: 'approved' as const };
                  setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
                  adminDataCache.invalidate(cacheScope, 'reviews');
                  await saveReviewToDB(updated);
                }
                recordAuditLog('Review Approved', 'reviews', id, `Approved public display for review #${id}`);
              }}
              onHideReview={async (id) => {
                const target = reviews.find((r) => r.id === id);
                if (target) {
                  const updated = { ...target, status: 'hidden' as const };
                  setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
                  adminDataCache.invalidate(cacheScope, 'reviews');
                  await saveReviewToDB(updated);
                }
                recordAuditLog('Review Hidden', 'reviews', id, `Hidden review #${id}`);
              }}
              onDeleteReview={async (id) => {
                setReviews((prev) => prev.filter((r) => r.id !== id));
                adminDataCache.invalidate(cacheScope, 'reviews');
                await deleteReviewFromDB(id);
                recordAuditLog('Review Deleted', 'reviews', id, `Permanently removed review #${id}`);
              }}
              onUpdateReview={async (updated) => {
                setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                adminDataCache.invalidate(cacheScope, 'reviews');
                await saveReviewToDB(updated).catch((e) => console.warn('[Review DB Sync]', e));
                recordAuditLog('Review Edited', 'reviews', updated.id, `Edited review content/rating/photos for #${updated.id}`);
              }}
              onAddDemoReview={async (newDemo) => {
                setReviews((prev) => [newDemo, ...prev]);
                adminDataCache.invalidate(cacheScope, 'reviews');
                await saveReviewToDB(newDemo);
                recordAuditLog('Demo Review Created', 'reviews', newDemo.id, `Added demo review for ${newDemo.productName}`);
              }}
              currentRole={activeRole}
              currentStaff={currentStaff}
            />
          )}

          {currentTab === 'staff' && (
            <AdminStaff
              staffList={staffList}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
              onRestoreStaff={handleRestoreStaff}
              onToggleStaffStatus={handleToggleStaffStatus}
              currentRole={activeRole}
              currentStaff={currentStaff}
            />
          )}

          {currentTab === 'roles' && (
            <AdminStaff
              staffList={staffList}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
              onRestoreStaff={handleRestoreStaff}
              onToggleStaffStatus={handleToggleStaffStatus}
              currentRole={activeRole}
              currentStaff={currentStaff}
            />
          )}

          {currentTab === 'reports' && (
            <AdminReports
              orders={orders}
              products={products}
              expenses={expenses}
              currentRole={activeRole}
            />
          )}

          {currentTab === 'logs' && (
            <AdminActivityLogs
              logs={activityLogs}
              currentRole={activeRole}
              currentStaff={currentStaff}
              cacheScope={cacheScope}
            />
          )}

          {currentTab === 'chat-bot' && (
            <AdminChatBot
              currentRole={activeRole}
              currentStaff={currentStaff}
              siteSettings={settings}
              onUpdateSettings={async (newSet) => {
                await onUpdateSettings(newSet);
                recordAuditLog(
                  'Chat Bot Settings Updated',
                  'settings',
                  'site-settings-chatbot',
                  'Updated KenaX AI Bot configuration and official contact channels'
                );
              }}
              orders={orders}
              products={products}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onPrintInvoice={(order) => setSelectedInvoiceOrder(order)}
              onNavigateToConfirmedOrders={() => setCurrentTab('confirmed-orders')}
              onNavigateToOrders={() => setCurrentTab('orders')}
            />
          )}

          {currentTab === 'telegram-bot' && (
            <AdminTelegramBot
              currentRole={activeRole}
              currentStaff={currentStaff}
              orders={orders}
              products={products}
              onRecordAudit={recordAuditLog}
            />
          )}

          {currentTab === 'whatsapp-automation' && (
            <AdminWhatsAppAutomation
              currentRole={activeRole}
              currentStaff={currentStaff}
              orders={orders}
              onRecordAudit={recordAuditLog}
            />
          )}

          {currentTab === 'sms-gateway' && (
            <AdminSMSGateway
              currentRole={activeRole}
              currentStaff={currentStaff}
              orders={orders}
              onRecordAudit={recordAuditLog}
            />
          )}

          {currentTab === 'gmail-alerts' && (
            <AdminGmailAlerts
              currentRole={activeRole}
              currentStaff={currentStaff}
              orders={orders}
              customers={customers}
            />
          )}

          {currentTab === 'seo-settings' && (
            <AdminSEOSettings
              siteSettings={settings}
              onUpdateSettings={async (newSet) => {
                await onUpdateSettings(newSet);
                recordAuditLog(
                  'SEO Settings Updated',
                  'settings',
                  'site-settings-seo',
                  'Updated SEO meta title, description, keywords, and Open Graph cards'
                );
              }}
              canEdit={hasPermission(activeRole, currentStaff?.permissions, 'settings.view')}
            />
          )}

          {currentTab === 'policies' && (
            <AdminPoliciesSettings
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              onRecordAudit={recordAuditLog}
            />
          )}

          {currentTab === 'google-sheets' && (
            <AdminGoogleSheets
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          )}

          {currentTab === 'settings' && (
            <AdminSettings
              settings={settings}
              onUpdateSettings={(newSettings) => {
                onUpdateSettings(newSettings);
                recordAuditLog(
                  'Store Settings Updated',
                  'settings',
                  'site-settings',
                  `Updated hotline, delivery rates (Dhaka: ৳${newSettings.deliveryInsideDhaka ?? settings.deliveryInsideDhaka}, Outside: ৳${newSettings.deliveryOutsideDhaka ?? settings.deliveryOutsideDhaka})`
                );
              }}
              currentRole={activeRole}
              currentStaff={currentStaff}
              onRecordAuditLog={recordAuditLog}
              initialSubTab={initialSettingsSubTab}
            />
          )}

          {currentTab === 'storage-settings' && (
            <AdminSettings
              key="storage-settings"
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              currentRole={activeRole}
              currentStaff={currentStaff}
              onRecordAuditLog={recordAuditLog}
              initialSubTab="storage"
            />
          )}

          {currentTab === 'integration-settings' && activeRole === 'super_admin' && (
            <AdminSettings
              key="muse-integration"
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              currentRole={activeRole}
              currentStaff={currentStaff}
              onRecordAuditLog={recordAuditLog}
              initialSubTab="integration"
            />
          )}

          {currentTab === 'muse-permissions' && activeRole === 'super_admin' && (
            <AdminMusePermissions
              currentUserRole={activeRole}
              currentStaff={currentStaff}
              onRecordAuditLog={recordAuditLog}
            />
          )}

          {(currentTab === 'plugins' ||
            currentTab === 'plugins-installed' ||
            currentTab === 'plugins-add-new' ||
            currentTab === 'plugins-store' ||
            currentTab === 'plugins-upload' ||
            currentTab === 'plugins-settings' ||
            currentTab === 'plugins-updates' ||
            currentTab === 'plugins-logs') && (
            <AdminPlugins
              currentRole={activeRole}
              currentStaff={currentStaff}
              initialSubTab={
                currentTab === 'plugins-add-new'
                  ? 'add-new'
                  : currentTab === 'plugins-store'
                  ? 'store'
                  : currentTab === 'plugins-upload'
                  ? 'upload'
                  : currentTab === 'plugins-settings'
                  ? 'settings'
                  : currentTab === 'plugins-updates'
                  ? 'updates'
                  : currentTab === 'plugins-logs'
                  ? 'logs'
                  : ('installed' as PluginManagerSubTab)
              }
              onSelectAdminTab={(tab) => setCurrentTab(tab)}
            />
          )}
          </Suspense>
        </main>
      </div>

      {/* Printable Invoice Modal (Mounted lazily only when an invoice is opened) */}
      {selectedInvoiceOrder && (
        <Suspense fallback={null}>
          <InvoiceModal
            order={selectedInvoiceOrder}
            products={products}
            settings={settings}
            onClose={() => setSelectedInvoiceOrder(null)}
          />
        </Suspense>
      )}

      {/* Staff Login / Role Switcher Modal (Mounted lazily only when opened) */}
      {isLoginModalOpen && (
        <Suspense fallback={null}>
          <AdminLoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onLoginSuccess={(staff) => {
              const safeStaff = stripStaffSecrets(staff);
              adminDataCache.clearAll();
              setAuthenticatedStaff(safeStaff);
              setCurrentStaff(safeStaff);
              saveStaffSession(safeStaff);
              if (onRoleChange) onRoleChange(safeStaff.role);
              recordAuditLog(
                'Staff Logged In',
                'staff',
                safeStaff.email,
                `${safeStaff.name} logged into Admin Portal as ${safeStaff.role}`
              );
              setIsLoginModalOpen(false);
            }}
            staffList={staffList}
          />
        </Suspense>
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">🔑</span>
                <h3 className="font-bold text-base text-white">Change Staff Password</h3>
              </div>
              <button
                onClick={() => setIsChangePasswordOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4">
              {passwordChangeMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${passwordChangeMsg.includes('success') ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                  {passwordChangeMsg}
                </div>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 mb-2">
                Changing password for: <b className="text-slate-900 dark:text-white">{currentStaff?.name}</b> ({currentStaff?.email})
                <span className="block text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">Your dashboard, role, permissions, and all data remain fully intact and secure.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={currentStaffPassword}
                  onChange={(e) => setCurrentStaffPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={confirmStaffPassword}
                  onChange={(e) => setConfirmStaffPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PluginProvider>
  );
};

export default AdminPortal;
