import React, { useState, useEffect, Suspense } from 'react';
import {
  AdminSidebar,
  AdminTab,
} from './admin/AdminSidebar';
import { AdminHeader } from './admin/AdminHeader';

// Lazy-loaded Admin Sub-Modules (Zero overhead until opened)
const AdminOverview = React.lazy(() => import('./admin/AdminOverview').then(m => ({ default: m.AdminOverview })));
const AdminOrders = React.lazy(() => import('./admin/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminProducts = React.lazy(() => import('./admin/AdminProducts').then(m => ({ default: m.AdminProducts })));
const AdminLandingPages = React.lazy(() => import('./admin/AdminLandingPages').then(m => ({ default: m.AdminLandingPages })));
const AdminCategories = React.lazy(() => import('./admin/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminInventory = React.lazy(() => import('./admin/AdminInventory').then(m => ({ default: m.AdminInventory })));
const AdminCustomers = React.lazy(() => import('./admin/AdminCustomers').then(m => ({ default: m.AdminCustomers })));
const AdminDelivery = React.lazy(() => import('./admin/AdminDelivery').then(m => ({ default: m.AdminDelivery })));
const AdminCourierFraudChecker = React.lazy(() => import('./admin/AdminCourierFraudChecker').then(m => ({ default: m.AdminCourierFraudChecker })));
const AdminPayments = React.lazy(() => import('./admin/AdminPayments').then(m => ({ default: m.AdminPayments })));
const AdminDeliveryAdvance = React.lazy(() => import('./admin/AdminDeliveryAdvance').then(m => ({ default: m.AdminDeliveryAdvance })));
const AdminCoupons = React.lazy(() => import('./admin/AdminCoupons').then(m => ({ default: m.AdminCoupons })));
const AdminReviews = React.lazy(() => import('./admin/AdminReviews').then(m => ({ default: m.AdminReviews })));
const AdminStaff = React.lazy(() => import('./admin/AdminStaff').then(m => ({ default: m.AdminStaff })));
const AdminActivityLogs = React.lazy(() => import('./admin/AdminActivityLogs').then(m => ({ default: m.AdminActivityLogs })));
const AdminReports = React.lazy(() => import('./admin/AdminReports').then(m => ({ default: m.AdminReports })));
const AdminCosts = React.lazy(() => import('./admin/AdminCosts').then(m => ({ default: m.AdminCosts })));
const AdminPerformanceOverview = React.lazy(() => import('./admin/AdminPerformanceOverview').then(m => ({ default: m.AdminPerformanceOverview })));
const AdminMyDashboard = React.lazy(() => import('./admin/AdminMyDashboard').then(m => ({ default: m.AdminMyDashboard })));
const AdminSettings = React.lazy(() => import('./admin/AdminSettings').then(m => ({ default: m.AdminSettings })));
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
const AdminAdvertiser = React.lazy(() => import('./admin/AdminAdvertiser').then(m => ({ default: m.AdminAdvertiser })));
const AdminPartners = React.lazy(() => import('./admin/AdminPartners').then(m => ({ default: m.AdminPartners })));
const AdminSellerManagement = React.lazy(() => import('./admin/AdminSellerManagement').then(m => ({ default: m.AdminSellerManagement })));
const AdminResellerManagement = React.lazy(() => import('./admin/AdminResellerManagement').then(m => ({ default: m.AdminResellerManagement })));
const PermissionMatrix = React.lazy(() => import('./admin/PermissionMatrix').then(m => ({ default: m.PermissionMatrix })));
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
  PartnerUser,
} from '../types';
import { hasPermission, DEFAULT_ROLE_PERMISSIONS } from '../lib/permissions';
import { safeSetLocalStorage } from '../lib/storage';

import {
  INITIAL_STAFF,
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
  saveOrderToDB,
  updateOrderInDB,
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
    staff?: { id?: string; name?: string; role?: string }
  ) => void;
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
  onNavigateToPartnerPortal?: (partner: PartnerUser) => void;
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
  onNavigateToPartnerPortal,
}) => {
  // Navigation & View States
  const [currentTab, setCurrentTab] = useState<AdminTab>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab') as AdminTab;
      if (urlTab) return urlTab;
      const savedTab = localStorage.getItem('kenax_admin_active_tab') as AdminTab;
      if (savedTab) return savedTab;
    } catch {}
    return initialTab || 'overview';
  });
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

  // Cart Activities state
  const [internalCartActivities, setInternalCartActivities] = useState<CartActivity[]>(() => {
    try {
      const cached = localStorage.getItem('kenax_cart_activities_cache');
      const list = cached ? JSON.parse(cached) : [];
      return Array.isArray(list) ? list.filter((c: any) => c && c.isV2Activity) : [];
    } catch {
      return [];
    }
  });

  const loadCartActivities = async () => {
    const items = await getCartActivitiesFromDB();
    setInternalCartActivities(items || []);
  };

  useEffect(() => {
    loadCartActivities();
    const unsub = subscribeToCartActivities((liveCarts) => {
      if (liveCarts) {
        setInternalCartActivities(liveCarts);
      }
    });
    return () => {
      unsub();
    };
  }, []);

  const rawCartsList = cartActivities && cartActivities.length > 0 ? cartActivities : internalCartActivities;
  const activeCartsList = rawCartsList.filter((c) => c && c.items && c.items.length > 0 && (c.totalItems === undefined || c.totalItems > 0));
  const liveCartsCount = activeCartsList.filter((c) => c.status === 'active').length;

  const handleRefreshCartActivities = () => {
    if (onRefreshCartActivities) onRefreshCartActivities();
    loadCartActivities();
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

  const handleConvertCartToManualOrder = (cart: CartActivity) => {
    const newOrderId = `ORD-${Date.now().toString().slice(-6)}`;
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
    saveOrderToDB(newOrder);
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

  // Active Authenticated Staff
  const [staffList, setStaffList] = useState<StaffUser[]>(() => {
    if (passedStaffList && passedStaffList.length > 0) return passedStaffList;
    try {
      const cached = localStorage.getItem('kenax_staff_cache') || localStorage.getItem('preview_kenax_staff_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_STAFF.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      password: (s as any).password || '123456',
      role: s.role as UserRole,
      permissions: s.permissions,
      isActive: s.status === 'active',
      createdAt: s.createdAt,
      lastLogin: s.lastLogin,
    }));
  });

  useEffect(() => {
    if (passedStaffList && passedStaffList.length > 0) {
      setStaffList(passedStaffList);
    }
  }, [passedStaffList]);

  const [authenticatedStaff, setAuthenticatedStaff] = useState<StaffUser | null>(() => {
    if (externalStaff) return externalStaff;
    const savedAuth = localStorage.getItem('kenax_authenticated_staff') || localStorage.getItem('kenax_current_staff');
    if (savedAuth) {
      try {
        return JSON.parse(savedAuth);
      } catch (e) {}
    }
    const superAdmin = INITIAL_STAFF.find((s) => s.role === 'super_admin');
    if (superAdmin) {
      return {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        phone: superAdmin.phone,
        password: (superAdmin as any).password || 'sadik@1234',
        role: superAdmin.role as UserRole,
        permissions: superAdmin.permissions,
        isActive: superAdmin.status === 'active',
        createdAt: superAdmin.createdAt,
        lastLogin: superAdmin.lastLogin,
      };
    }
    return {
      id: 'staff-super-2',
      name: 'Super Admin',
      email: 'super@kenaxbd.com',
      phone: '+880 1700-123456',
      password: 'sadik@1234',
      role: 'super_admin',
      permissions: ['*'],
      isActive: true,
      createdAt: new Date().toISOString(),
    };
  });

  const [currentStaff, setCurrentStaff] = useState<StaffUser | null>(() => {
    return externalStaff || authenticatedStaff;
  });

  useEffect(() => {
    if (externalStaff) {
      setCurrentStaff(externalStaff);
      setAuthenticatedStaff(externalStaff);
    }
  }, [externalStaff]);

  // Strict check: Only real Super Admin account gets access to the Quick Role Tester
  // Persists across role simulations (Super Admin -> Manager -> Moderator -> etc.)
  const isSuperAdminAccount =
    authenticatedStaff?.role === 'super_admin' ||
    authenticatedStaff?.email === 'super@kenaxbd.com' ||
    Boolean(authenticatedStaff?.permissions && authenticatedStaff.permissions.includes('*')) ||
    localStorage.getItem('kenax_authenticated_role') === 'super_admin';

  // Change Password Modal State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [confirmStaffPassword, setConfirmStaffPassword] = useState('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<string | null>(null);

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff) return;
    if (newStaffPassword.length < 4) {
      setPasswordChangeMsg('Password must be at least 4 characters.');
      return;
    }
    if (newStaffPassword !== confirmStaffPassword) {
      setPasswordChangeMsg('New passwords do not match.');
      return;
    }
    const updated = { ...currentStaff, password: newStaffPassword };
    setCurrentStaff(updated);
    try {
      localStorage.setItem('kenax_authenticated_staff', JSON.stringify(updated));
      localStorage.setItem('kenax_current_staff', JSON.stringify(updated));
      localStorage.setItem('kenax_admin_session', JSON.stringify(updated));
    } catch {}
    handleUpdateStaff(updated);
    setPasswordChangeMsg('Password updated successfully! All account data preserved.');
    setTimeout(() => {
      setIsChangePasswordOpen(false);
      setPasswordChangeMsg(null);
      setNewStaffPassword('');
      setConfirmStaffPassword('');
    }, 1500);
  };

  // Effective Role (prioritizes currentStaff role if logged in)
  const activeRole: UserRole = currentStaff?.role || currentRole || 'super_admin';

  // Ensure My Dashboard is strictly accessible by Super Admin only
  useEffect(() => {
    if (currentTab === 'my-dashboard' && activeRole !== 'super_admin') {
      setCurrentTab('overview');
    }
  }, [currentTab, activeRole]);

  // Sub-entity states
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => {
    let localCache: CustomerRecord[] = [];
    try {
      const cached = localStorage.getItem('kenax_customers_cache');
      if (cached) localCache = JSON.parse(cached);
    } catch {}
    return mergeCustomersLists(INITIAL_CUSTOMERS, localCache);
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    return INITIAL_ACTIVITY_LOGS.map((l: any) => ({
      id: l.id,
      staffId: l.staffId || 'staff-root',
      staffName: l.staffName,
      staffRole: l.staffRole as UserRole,
      action: l.action,
      module: l.module,
      targetId: l.targetId,
      details: l.details,
      timestamp: l.timestamp,
      ipAddress: l.ipAddress || l.ip || '103.145.118.24',
    }));
  });

  const [stockLogs, setStockLogs] = useState<StockLog[]>(() => {
    return INITIAL_STOCK_LOGS.map((sl: any) => ({
      id: sl.id,
      productId: sl.productId,
      productName: sl.productName,
      sku: sl.sku,
      staffId: sl.staffId || 'staff-root',
      staffName: sl.staffName,
      staffRole: sl.staffRole as UserRole,
      previousStock: sl.previousStock,
      newStock: sl.newStock,
      quantityChanged: sl.quantityChanged,
      reason: sl.reason,
      timestamp: sl.timestamp,
    }));
  });

  const [notifications, setNotifications] = useState<AdminNotification[]>(() => {
    return INITIAL_NOTIFICATIONS.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));
  });

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

  const [internalCategories, setInternalCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('kenax_categories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse categories', e);
      }
    }
    return INITIAL_CATEGORIES;
  });

  const categories = passedCategories && passedCategories.length > 0 ? passedCategories : internalCategories;

  const handlePersistCategories = (updatedCats: Category[]) => {
    setInternalCategories(updatedCats);
    safeSetLocalStorage('kenax_categories', JSON.stringify(updatedCats));
    safeSetLocalStorage('kenax_categories_cache', JSON.stringify(updatedCats));
  };

  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      const cached = localStorage.getItem('kenax_reviews_cache');
      let list = cached ? JSON.parse(cached) : INITIAL_REVIEWS;
      const customRaw = localStorage.getItem('kenax_custom_reviews_map');
      if (customRaw) {
        const customMap = JSON.parse(customRaw);
        list = list.map((r: Review) => customMap[r.id] ? { ...r, ...customMap[r.id] } : r);
      }
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {}
    return INITIAL_REVIEWS;
  });

  // Helper to filter out legacy demo/placeholder records
  const isDemoExpense = (e: any) =>
    e?.id === 'EXP-1001' ||
    e?.id === 'EXP-1002' ||
    e?.id === 'EXP-1003' ||
    (typeof e?.title === 'string' && (e.title.includes('Batch #12') || e.title.includes('Security Poly Bags')));

  // Expenses State (Cache + Firestore DB Sync)
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    try {
      const cached = localStorage.getItem('kenax_expenses_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((item) => !isDemoExpense(item));
          if (valid.length !== parsed.length) {
            safeSetLocalStorage('kenax_expenses_cache', JSON.stringify(valid));
          }
          return valid;
        }
      }
    } catch (e) {
      console.error('Failed to parse expenses cache', e);
    }
    return [];
  });

  // Other Profits State (Cache + Firestore DB Sync)
  const [otherProfits, setOtherProfits] = useState<OtherProfitRecord[]>(() => {
    try {
      const cached = localStorage.getItem('kenax_other_profits_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((item) => !isDemoOtherProfit(item));
          safeSetLocalStorage('kenax_other_profits_cache', JSON.stringify(valid));
          return valid;
        }
      }
    } catch (e) {
      console.error('Failed to parse other profits cache', e);
    }
    return [];
  });

  // Dropshipping Suppliers state & cross-tab targeting
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const cached = localStorage.getItem('kenax_suppliers_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Wholesalers & Sourcing Locations (Own Stock) State
  const [sourcingLocations, setSourcingLocations] = useState<SourcingLocation[]>(() => {
    try {
      const cached = localStorage.getItem('kenax_sourcing_locations_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [targetProductForEdit, setTargetProductForEdit] = useState<Product | null>(null);
  const [targetSupplierForNewProduct, setTargetSupplierForNewProduct] = useState<Supplier | null>(null);

  // Invoice modal state
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // Sync with Firestore on mount and establish real-time activity log listeners
  useEffect(() => {
    async function loadAdminData() {
      const dbStaff = await getStaffFromDB();
      if (dbStaff && dbStaff.length > 0) setStaffList(dbStaff);

      const dbCust = await getCustomersFromDB();
      if (dbCust && dbCust.length > 0) setCustomers(dbCust);

      const dbLogs = await getActivityLogsFromDB();
      if (dbLogs && dbLogs.length > 0) setActivityLogs(dbLogs);

      const dbNotifs = await getNotificationsFromDB();
      if (dbNotifs && dbNotifs.length > 0) setNotifications(dbNotifs);

      const dbExpenses = await getExpensesFromDB();
      const validDbExpenses = (dbExpenses || []).filter((e) => !isDemoExpense(e));
      setExpenses(validDbExpenses);
      safeSetLocalStorage('kenax_expenses_cache', JSON.stringify(validDbExpenses));

      const dbOtherProfits = await getOtherProfitsFromDB();
      const validDbProfits = (dbOtherProfits || []).filter((p) => !isDemoOtherProfit(p));
      setOtherProfits(validDbProfits);
      safeSetLocalStorage('kenax_other_profits_cache', JSON.stringify(validDbProfits));

      const dbSuppliers = await getSuppliersFromDB();
      if (dbSuppliers && dbSuppliers.length > 0) {
        setSuppliers(dbSuppliers);
        safeSetLocalStorage('kenax_suppliers_cache', JSON.stringify(dbSuppliers));
      }

      const dbSourcing = await getSourcingLocationsFromDB();
      if (dbSourcing && dbSourcing.length > 0) {
        setSourcingLocations(dbSourcing);
        safeSetLocalStorage('kenax_sourcing_locations_cache', JSON.stringify(dbSourcing));
      }

      const dbReviews = await getReviewsFromDB();
      if (dbReviews && dbReviews.length > 0) {
        setReviews(dbReviews);
        safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(dbReviews));
      }
    }
    loadAdminData();

    // Permanent Real-time Firestore sync for all staff activity logs & customer accounts across devices
    const unsubscribeLogs = subscribeToActivityLogs((freshLogs) => {
      if (freshLogs && freshLogs.length > 0) {
        setActivityLogs(freshLogs);
      }
    });

    const unsubscribeCustomers = subscribeToCustomers((freshCusts) => {
      if (freshCusts && freshCusts.length > 0) {
        setCustomers(freshCusts);
      }
    });

    const unsubscribeExpenses = subscribeToExpenses((freshExpenses) => {
      if (freshExpenses && freshExpenses.length > 0) {
        setExpenses(freshExpenses);
        safeSetLocalStorage('kenax_expenses_cache', JSON.stringify(freshExpenses));
      }
    });

    const unsubscribeOtherProfits = subscribeToOtherProfits((freshProfits) => {
      if (freshProfits) {
        const cleanProfits = freshProfits.filter((p) => !isDemoOtherProfit(p));
        setOtherProfits(cleanProfits);
        safeSetLocalStorage('kenax_other_profits_cache', JSON.stringify(cleanProfits));
      }
    });

    const unsubscribeSuppliers = subscribeToSuppliers((freshSuppliers) => {
      if (freshSuppliers) {
        setSuppliers(freshSuppliers);
        safeSetLocalStorage('kenax_suppliers_cache', JSON.stringify(freshSuppliers));
      }
    });

    const unsubscribeSourcing = subscribeToSourcingLocations((freshLocs) => {
      if (freshLocs) {
        setSourcingLocations(freshLocs);
        safeSetLocalStorage('kenax_sourcing_locations_cache', JSON.stringify(freshLocs));
      }
    });

    const unsubscribeReviews = subscribeToReviews((freshReviews) => {
      if (freshReviews && freshReviews.length > 0) {
        setReviews(freshReviews);
        safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(freshReviews));
      }
    });

    return () => {
      unsubscribeLogs();
      unsubscribeCustomers();
      unsubscribeExpenses();
      unsubscribeOtherProfits();
      unsubscribeSuppliers();
      unsubscribeSourcing();
      unsubscribeReviews();
    };
  }, []);

  // Centralized Audit Logger
  const recordAuditLog = (
    action: string,
    module: string,
    targetId: string,
    details: string
  ) => {
    const newLog: ActivityLog = {
      id: 'log-' + Date.now(),
      staffId: currentStaff?.id || 'staff-root',
      staffName: currentStaff?.name || 'System Admin',
      staffRole: activeRole,
      action,
      module,
      targetId,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: '103.145.118.24',
    };

    setActivityLogs((prev) => [newLog, ...prev]);
    logActivityToDB(newLog);
  };

  // Expenses Handlers with Immediate Firestore Sync & Audit Logging
  const handleAddExpense = (expense: ExpenseRecord) => {
    const next = [expense, ...expenses];
    setExpenses(next);
    safeSetLocalStorage('kenax_expenses_cache', JSON.stringify(next));
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
    safeSetLocalStorage('kenax_expenses_cache', JSON.stringify(next));
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
    safeSetLocalStorage('kenax_expenses_cache', JSON.stringify(next));
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
    safeSetLocalStorage('kenax_other_profits_cache', JSON.stringify(next));
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
    safeSetLocalStorage('kenax_other_profits_cache', JSON.stringify(next));
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
    safeSetLocalStorage('kenax_other_profits_cache', JSON.stringify(next));
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
    staff?: { id?: string; name?: string; role?: string }
  ) => {
    const activeStaff = staff || (currentStaff ? {
      id: currentStaff.id,
      name: currentStaff.name,
      role: currentStaff.role,
    } : undefined);

    onUpdateOrderStatus(orderId, newStatus, courierName, trackingNumber, activeStaff);

    recordAuditLog(
      `Order Status updated to ${newStatus}`,
      'orders',
      orderId,
      `Order #${orderId} marked as ${newStatus} by ${activeStaff?.name || 'Staff'} (${activeStaff?.role || 'Admin'}). Courier: ${courierName || 'Standard'}. Tracking: ${trackingNumber || 'N/A'}`
    );

    // Automated Email Notification & Staff Audit Workflow
    const targetOrder = orders.find((o) => o.id === orderId);
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
  const handleAdjustStock = (
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

    const stockEntry: StockLog = {
      id: 'stk-' + Date.now(),
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
      timestamp: new Date().toISOString(),
    };

    setStockLogs((prev) => [stockEntry, ...prev]);

    recordAuditLog(
      'Stock Adjusted',
      'inventory',
      prod.sku,
      `${changeAmount > 0 ? '+' : ''}${changeAmount} units for ${prod.name} (${prod.sku}). Stock: ${prevStock} ➔ ${newStock}. Reason: ${reason}`
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
    markNotificationReadInDB(notifId);
  };

  // Staff Management
  const handleAddStaff = (newStaff: StaffUser) => {
    setStaffList((prev) => {
      const next = [newStaff, ...prev];
      if (onUpdateStaffList) onUpdateStaffList(next);
      return next;
    });
    saveStaffToDB(newStaff);
    recordAuditLog(
      'New Staff Account Created',
      'staff',
      newStaff.email,
      `Created staff account for ${newStaff.name} with role ${newStaff.role}`
    );
  };

  const handleUpdateStaff = (updatedStaff: StaffUser) => {
    setStaffList((prev) => {
      const next = prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s));
      safeSetLocalStorage('kenax_staff_cache', JSON.stringify(next));
      safeSetLocalStorage('preview_kenax_staff_cache', JSON.stringify(next));
      if (onUpdateStaffList) onUpdateStaffList(next);
      return next;
    });

    // If the updated staff is currently active or super admin, sync active session states & local caches
    const isCurrentActive =
      currentStaff?.id === updatedStaff.id ||
      (currentStaff?.email && updatedStaff.email && currentStaff.email.toLowerCase() === updatedStaff.email.toLowerCase()) ||
      authenticatedStaff?.id === updatedStaff.id ||
      (authenticatedStaff?.email && updatedStaff.email && authenticatedStaff.email.toLowerCase() === updatedStaff.email.toLowerCase()) ||
      (updatedStaff.role === 'super_admin' && (currentStaff?.role === 'super_admin' || authenticatedStaff?.role === 'super_admin'));

    if (isCurrentActive) {
      setCurrentStaff(updatedStaff);
      setAuthenticatedStaff(updatedStaff);
      if (onUpdateCurrentStaff) {
        onUpdateCurrentStaff(updatedStaff);
      }
      try {
        const serialized = JSON.stringify(updatedStaff);
        safeSetLocalStorage('kenax_current_staff', serialized);
        safeSetLocalStorage('kenax_authenticated_staff', serialized);
        safeSetLocalStorage('preview_kenax_current_staff', serialized);
        safeSetLocalStorage('preview_kenax_authenticated_staff', serialized);
        safeSetLocalStorage('kenax_admin_session', serialized);
        safeSetLocalStorage('preview_kenax_admin_session', serialized);
      } catch {}
    }

    saveStaffToDB(updatedStaff);
    recordAuditLog(
      'Staff Account Updated',
      'staff',
      updatedStaff.email,
      `Updated profile/phone/permissions for ${updatedStaff.name}`
    );
  };

  const handleDeleteStaff = async (staffId: string) => {
    const target = staffList.find((s) => s.id === staffId);
    if (!target) return;

    // Hard permanent delete: purge account immediately and tombstone it in Firestore/local storage
    setStaffList((prev) => {
      const next = prev.filter((s) => s.id !== staffId);
      safeSetLocalStorage('kenax_staff_cache', JSON.stringify(next));
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
      ...target,
      isRemoved: false,
      status: 'active',
      isActive: true,
      removedAt: undefined,
      removedBy: undefined,
    };

    setStaffList((prev) => {
      const next = prev.map((s) => (s.id === staffId ? restoredStaff : s));
      safeSetLocalStorage('kenax_staff_cache', JSON.stringify(next));
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
    const updated = { ...target, isActive: !target.isActive };
    handleUpdateStaff(updated);
  };

  // Dropshipping & Supplier Management
  const handleAddSupplier = async (supplier: Supplier) => {
    setSuppliers((prev) => {
      const next = [supplier, ...prev.filter((s) => s.id !== supplier.id)];
      safeSetLocalStorage('kenax_suppliers_cache', JSON.stringify(next));
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
      safeSetLocalStorage('kenax_suppliers_cache', JSON.stringify(next));
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
      safeSetLocalStorage('kenax_suppliers_cache', JSON.stringify(next));
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
      safeSetLocalStorage('kenax_sourcing_locations_cache', JSON.stringify(next));
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
      safeSetLocalStorage('kenax_sourcing_locations_cache', JSON.stringify(next));
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
      safeSetLocalStorage('kenax_sourcing_locations_cache', JSON.stringify(next));
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
      partners: 'products.view',
      'admin-sellers': 'products.view',
      'admin-resellers': 'products.view',
      'admin-seller-plans': 'products.view',
      'admin-reseller-plans': 'products.view',
      'admin-partner-payouts': 'payments.view',
      advertiser: 'marketing.view',
      dropshipping: 'suppliers.view',
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
    };

    const reqPerm = tabPermissionMap[currentTab];
    if (reqPerm && !hasPermission(activeRole, permissions, reqPerm)) {
      setCurrentTab('overview');
    }
  }, [activeRole, currentTab]);

  // Computed counts for badges
  const isResellerOrderCheck = (o: Order) =>
    Boolean(
      (o as any).resellerId ||
      (o as any).resellerStoreName ||
      (o as any).isResellerOrder ||
      (o.notes && o.notes.includes('[Dropship:'))
    );

  const pendingOrdersCount = orders.filter((o) => {
    if (isResellerOrderCheck(o)) return false;
    const s = (o.orderStatus || (o as any).status || 'Pending').toString().trim().toLowerCase();
    return s === 'pending' || s === 'payment verification' || s === 'unconfirmed';
  }).length;

  const pendingResellerOrdersCount = orders.filter((o) => {
    if (!isResellerOrderCheck(o)) return false;
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

  // Direct Logout Handler - Clears session completely and takes user back to store home without opening staff portal modal
  const handleDirectLogout = () => {
    setCurrentStaff(null);
    setAuthenticatedStaff(null);
    localStorage.removeItem('kenax_current_staff');
    localStorage.removeItem('kenax_authenticated_staff');
    localStorage.removeItem('kenax_authenticated_role');
    setIsLoginModalOpen(false);

    if (onLogout) {
      onLogout();
    } else if (onNavigateToStore) {
      onNavigateToStore();
    }
  };

  const isResellerTab =
    currentTab === 'admin-resellers' ||
    currentTab === 'admin-reseller-orders' ||
    currentTab === 'admin-reseller-approvals' ||
    currentTab === 'admin-reseller-subscriptions' ||
    currentTab === 'admin-reseller-renewals' ||
    currentTab === 'admin-reseller-plans' ||
    currentTab === 'admin-reseller-payouts';

  if (isResellerTab) {
    return (
      <div className="admin-portal-root min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 sm:p-5 lg:p-6 font-sans">
        <AdminResellerManagement
          initialTab={
            currentTab === 'admin-reseller-orders'
              ? 'orders'
              : currentTab === 'admin-reseller-approvals'
              ? 'pending'
              : currentTab === 'admin-reseller-subscriptions'
              ? 'subscriptions'
              : currentTab === 'admin-reseller-renewals'
              ? 'renewals'
              : currentTab === 'admin-reseller-plans'
              ? 'plans'
              : currentTab === 'admin-reseller-payouts'
              ? 'payouts'
              : 'overview'
          }
          onBackToAdmin={() => setCurrentTab('overview')}
          onLoginAsPartner={onNavigateToPartnerPortal}
          onNavigateToPermissionMatrix={() => setCurrentTab('permission-matrix')}
          orders={orders}
          products={products}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onVerifyPayment={handleVerifyPayment}
          onOpenInvoice={(ord) => setSelectedInvoiceOrder(ord)}
          currentRole={activeRole}
          currentStaff={currentStaff}
          settings={settings}
          onRecordAudit={recordAuditLog}
        />
      </div>
    );
  }

  return (
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
        pendingResellerOrdersCount={pendingResellerOrdersCount}
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
        <main className="flex-1 p-2 sm:p-4 lg:p-5 w-full max-w-[99%] 2xl:max-w-[1720px] mx-auto">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-xs">
                <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
                <span className="font-bold">মডিউল লোড হচ্ছে...</span>
              </div>
            }
          >
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

          {currentTab === 'my-dashboard' && activeRole === 'super_admin' && (
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
              key={currentTab}
              orders={orders}
              products={products}
              initialScope={currentTab === 'confirmed-orders' ? 'confirmed' : 'pending'}
              onUpdateOrderStatus={(orderId, status, courier, tracking, staff) => {
                handleUpdateOrderStatus(orderId, status, courier, tracking, staff);
              }}
              onVerifyPayment={handleVerifyPayment}
              onPrintInvoice={(order) => setSelectedInvoiceOrder(order)}
              onAddOrder={(newOrd) => {
                if (onAddOrder) onAddOrder(newOrd);
                recordAuditLog('Manual Order Created', 'orders', newOrd.id, `Created manual order ${newOrd.id} for ${newOrd.customerName} (৳${newOrd.totalAmount})`);
              }}
              currentRole={activeRole}
              currentStaff={currentStaff}
              settings={settings}
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
                onAddProduct(p);
                recordAuditLog('Product Created', 'products', p.sku, `Created product ${p.name} (${p.sku}) at ৳${p.price}`);
                triggerTelegramNewProductWorkflow({
                  product: p,
                  staffUser: currentStaff,
                  supplierName: p.supplierName,
                }).catch((err) => console.error('[Telegram New Product Error]:', err));
              }}
              onUpdateProduct={(p) => {
                const prevProd = products.find((old) => old.id === p.id || old.sku === p.sku);
                const prevPrice = prevProd?.price || p.price;
                onUpdateProduct(p);
                recordAuditLog('Product Updated', 'products', p.sku, `Updated pricing/specs for ${p.name} (${p.sku})`);
                if (prevProd && p.price < prevPrice) {
                  triggerTelegramProductDiscountWorkflow({
                    product: p,
                    previousPrice: prevPrice,
                    staffUser: currentStaff,
                  }).catch((err) => console.error('[Telegram Discount Alert Error]:', err));
                }
              }}
              onDeleteProduct={(id) => {
                const prod = products.find((p) => p.id === id);
                onDeleteProduct(id);
                if (prod) {
                  recordAuditLog('Product Deleted', 'products', prod.sku, `Removed product ${prod.name} from catalog`);
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
            />
          )}

          {(currentTab === 'admin-sellers' ||
            currentTab === 'admin-seller-approvals' ||
            currentTab === 'admin-seller-renewals' ||
            currentTab === 'admin-seller-plans' ||
            currentTab === 'admin-partner-payouts') && (
            <AdminSellerManagement
              initialTab={
                currentTab === 'admin-seller-approvals'
                  ? 'pending'
                  : currentTab === 'admin-seller-renewals'
                  ? 'renewals'
                  : currentTab === 'admin-seller-plans'
                  ? 'plans'
                  : currentTab === 'admin-partner-payouts'
                  ? 'payouts'
                  : 'all'
              }
              onLoginAsPartner={onNavigateToPartnerPortal}
              onNavigateToPermissionMatrix={() => setCurrentTab('permission-matrix')}
            />
          )}

          {currentTab === 'partners' && (
            <AdminPartners
              initialTab="all"
              onLoginAsPartner={onNavigateToPartnerPortal}
            />
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

          {currentTab === 'advertiser' && (
            <AdminAdvertiser
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
              stockLogs={stockLogs}
              onAdjustStock={handleAdjustStock}
              currentRole={activeRole}
              currentStaff={currentStaff}
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

          {currentTab === 'reviews' && (
            <AdminReviews
              reviews={reviews}
              products={products}
              onApproveReview={async (id) => {
                const target = reviews.find((r) => r.id === id);
                if (target) {
                  const updated = { ...target, status: 'approved' as const };
                  setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
                  await saveReviewToDB(updated);
                }
                recordAuditLog('Review Approved', 'reviews', id, `Approved public display for review #${id}`);
              }}
              onHideReview={async (id) => {
                const target = reviews.find((r) => r.id === id);
                if (target) {
                  const updated = { ...target, status: 'hidden' as const };
                  setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
                  await saveReviewToDB(updated);
                }
                recordAuditLog('Review Hidden', 'reviews', id, `Hidden review #${id}`);
              }}
              onDeleteReview={async (id) => {
                setReviews((prev) => prev.filter((r) => r.id !== id));
                await deleteReviewFromDB(id);
                recordAuditLog('Review Deleted', 'reviews', id, `Permanently removed review #${id}`);
              }}
              onUpdateReview={async (updated) => {
                setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                try {
                  const raw = localStorage.getItem('kenax_custom_reviews_map');
                  const map = raw ? JSON.parse(raw) : {};
                  map[updated.id] = updated;
                  safeSetLocalStorage('kenax_custom_reviews_map', JSON.stringify(map));
                } catch {}
                try {
                  const cached = localStorage.getItem('kenax_reviews_cache');
                  let list: Review[] = cached ? JSON.parse(cached) : [];
                  const idx = list.findIndex((r) => r.id === updated.id);
                  if (idx >= 0) {
                    list[idx] = updated;
                  } else {
                    list.unshift(updated);
                  }
                  safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(list));
                } catch {}
                // Trigger cloud & API sync in background without blocking UI
                saveReviewToDB(updated).catch((e) => console.warn('[Review DB Sync]', e));
                recordAuditLog('Review Edited', 'reviews', updated.id, `Edited review content/rating/photos for #${updated.id}`);
              }}
              onAddDemoReview={async (newDemo) => {
                setReviews((prev) => [newDemo, ...prev]);
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

          {currentTab === 'permission-matrix' && (
            <PermissionMatrix />
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
              initialSubTab={initialSettingsSubTab}
            />
          )}
          </Suspense>
        </main>
      </div>

      {/* Printable Invoice Modal */}
      <InvoiceModal
        order={selectedInvoiceOrder}
        products={products}
        settings={settings}
        onClose={() => setSelectedInvoiceOrder(null)}
      />

      {/* Staff Login / Role Switcher Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(staff) => {
          setAuthenticatedStaff(staff);
          setCurrentStaff(staff);
          localStorage.setItem('kenax_authenticated_staff', JSON.stringify(staff));
          localStorage.setItem('kenax_authenticated_role', staff.role);
          if (onRoleChange) onRoleChange(staff.role);
          recordAuditLog(
            'Staff Logged In',
            'staff',
            staff.email,
            `${staff.name} logged into Admin Portal as ${staff.role}`
          );
        }}
        staffList={staffList}
      />

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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
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
  );
};

export default AdminPortal;
