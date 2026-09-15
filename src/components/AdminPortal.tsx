import React, { useState, useEffect } from 'react';
import {
  AdminSidebar,
  AdminTab,
} from './admin/AdminSidebar';
import { AdminHeader } from './admin/AdminHeader';
import { AdminOverview } from './admin/AdminOverview';
import { AdminOrders } from './admin/AdminOrders';
import { AdminProducts } from './admin/AdminProducts';
import { AdminCategories } from './admin/AdminCategories';
import { AdminInventory } from './admin/AdminInventory';
import { AdminCustomers } from './admin/AdminCustomers';
import { AdminDelivery } from './admin/AdminDelivery';
import { AdminPayments } from './admin/AdminPayments';
import { AdminDeliveryAdvance } from './admin/AdminDeliveryAdvance';
import { AdminCoupons } from './admin/AdminCoupons';
import { AdminReviews } from './admin/AdminReviews';
import { AdminStaff } from './admin/AdminStaff';
import { AdminActivityLogs } from './admin/AdminActivityLogs';
import { AdminReports } from './admin/AdminReports';
import { AdminCosts } from './admin/AdminCosts';
import { AdminPerformanceOverview } from './admin/AdminPerformanceOverview';
import { AdminSettings } from './admin/AdminSettings';
import { AdminPaymentGateways } from './admin/AdminPaymentGateways';
import { AdminCartActivities } from './admin/AdminCartActivities';
import { AdminWishlistActivities } from './admin/AdminWishlistActivities';
import { AdminGmailAlerts } from './admin/AdminGmailAlerts';
import { AdminSEOSettings } from './admin/AdminSEOSettings';
import { AdminSMSGateway } from './admin/AdminSMSGateway';
import { AdminWhatsAppAutomation } from './admin/AdminWhatsAppAutomation';
import { InvoiceModal } from './admin/InvoiceModal';
import { AdminLoginModal } from './admin/AdminLoginModal';
import {
  triggerOrderStatusChangeWorkflow,
  triggerSuperAdminAuditAlert,
} from '../lib/emailService';

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
  saveReviewToDB,
  deleteReviewFromDB,
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
    tracking?: string
  ) => void;
  onAddOrder?: (newOrder: Order) => void;
  onUpdateSettings: (settings: Partial<SiteSettings> | SiteSettings) => void | Promise<void>;
  currentRole: UserRole;
  currentStaff?: StaffUser | null;
  onNavigateToStore?: () => void;
  onRoleChange?: (newRole: UserRole) => void;
  onLogout?: () => void;
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
}) => {
  // Navigation & View States
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedCustomerForAdmin, setSelectedCustomerForAdmin] = useState<CustomerRecord | null>(null);

  // Always scroll to top when switching admin tabs
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
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
    const itemsTotal = cart.items.reduce((sum, it) => sum + it.price * it.quantity, 0);

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
      items: cart.items.map((it) => ({
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
  };

  const [reviews, setReviews] = useState<Review[]>([
    {
      id: 'rev-1',
      productId: 'prod-smartwatch-1',
      productName: 'Haylou Solar Pro Smartwatch',
      customerName: 'Tanvir Hossain',
      customerEmail: 'tanvir@gmail.com',
      rating: 5,
      comment: 'Original product! Packaging was intact and Steadfast delivery took only 24 hours in Dhaka.',
      photos: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'],
      verifiedPurchase: true,
      status: 'approved',
      createdAt: '2025-02-14T10:00:00Z',
    },
    {
      id: 'rev-2',
      productId: 'prod-earbuds-1',
      productName: 'Xiaomi Redmi Buds 5',
      customerName: 'Nusrat Jahan',
      customerEmail: 'nusrat@gmail.com',
      rating: 5,
      comment: 'Sound quality and active noise cancellation is awesome for this price. Highly recommended KenaX BD!',
      photos: [],
      verifiedPurchase: true,
      status: 'approved',
      createdAt: '2025-02-13T18:30:00Z',
    },
    {
      id: 'rev-3',
      productId: 'prod-powerbank-1',
      productName: 'Baseus 20000mAh Power Bank',
      customerName: 'Kamrul Hasan',
      customerEmail: 'kamrul@gmail.com',
      rating: 4,
      comment: 'Fast charging works perfectly with 22.5W output on my Xiaomi phone.',
      photos: ['https://images.unsplash.com/photo-1609592424104-16d755227181?w=400'],
      verifiedPurchase: false,
      status: 'pending',
      createdAt: '2025-02-12T14:15:00Z',
    },
  ]);

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

    return () => {
      unsubscribeLogs();
      unsubscribeCustomers();
      unsubscribeExpenses();
      unsubscribeOtherProfits();
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
    trackingNumber?: string
  ) => {
    onUpdateOrderStatus(orderId, newStatus, courierName, trackingNumber);

    recordAuditLog(
      `Order Status updated to ${newStatus}`,
      'orders',
      orderId,
      `Order #${orderId} marked as ${newStatus}. Courier: ${courierName || 'Standard'}. Tracking: ${trackingNumber || 'N/A'}`
    );

    // Automated Email Notification & Staff Audit Workflow
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder) {
      const updatedOrderSnapshot: Order = {
        ...targetOrder,
        orderStatus: newStatus,
        courierName: courierName || targetOrder.courierName,
        trackingNumber: trackingNumber || targetOrder.trackingNumber,
      };

      // 1. Send Customer Email update for Confirmed, Processing, Picked, etc.
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
    }
  };

  // Payment Verification Handler
  const handleVerifyPayment = (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const isDeliveryOnly = targetOrder.paymentOptionType === 'delivery_only';
    const verifiedAdvanceAmount = isDeliveryOnly
      ? (targetOrder.paidAmount !== undefined && targetOrder.paidAmount > 0 ? targetOrder.paidAmount : targetOrder.deliveryCharge)
      : targetOrder.totalAmount;
    const remainingDue = isDeliveryOnly
      ? (targetOrder.dueAmount !== undefined ? targetOrder.dueAmount : Math.max(0, targetOrder.totalAmount - verifiedAdvanceAmount))
      : 0;

    const updatedOrder: Order = {
      ...targetOrder,
      paymentStatus: 'Verified',
      paidAmount: verifiedAdvanceAmount,
      dueAmount: remainingDue,
      paymentVerifiedAt: new Date().toISOString(),
      orderStatus: targetOrder.orderStatus === 'Payment Verification' ? 'Confirmed' : targetOrder.orderStatus,
      handledByStaffId: currentStaff?.id,
      handledByStaffName: currentStaff?.name,
      handledByStaffRole: activeRole,
      timeline: [
        ...targetOrder.timeline,
        {
          status: 'Payment Verification',
          timestamp: new Date().toISOString(),
          note: isDeliveryOnly
            ? `Delivery advance of ৳${verifiedAdvanceAmount.toLocaleString()} verified by ${currentStaff?.name || 'Admin'}. Remaining due on delivery: ৳${remainingDue.toLocaleString()}`
            : `Payment of ৳${targetOrder.totalAmount.toLocaleString()} verified by ${currentStaff?.name || 'Admin'}`,
        },
      ],
    };

    updateOrderInDB(updatedOrder.id, updatedOrder);
    onUpdateOrderStatus(orderId, updatedOrder.orderStatus);

    recordAuditLog(
      'Payment Verified',
      'payments',
      orderId,
      `Approved ${isDeliveryOnly ? 'delivery advance' : 'payment'} of ৳${verifiedAdvanceAmount.toLocaleString()} for Order #${orderId} via ${targetOrder.paymentMethod}`
    );
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
    setStaffList((prev) => [newStaff, ...prev]);
    saveStaffToDB(newStaff);
    recordAuditLog(
      'New Staff Account Created',
      'staff',
      newStaff.email,
      `Created staff account for ${newStaff.name} with role ${newStaff.role}`
    );
  };

  const handleUpdateStaff = (updatedStaff: StaffUser) => {
    setStaffList((prev) => prev.map((s) => (s.id === updatedStaff.id ? updatedStaff : s)));
    saveStaffToDB(updatedStaff);
    recordAuditLog(
      'Staff Account Updated',
      'staff',
      updatedStaff.email,
      `Updated profile/permissions for ${updatedStaff.name}`
    );
  };

  const handleDeleteStaff = async (staffId: string) => {
    const target = staffList.find((s) => s.id === staffId);
    if (!target) return;

    // Hard permanent delete: purge account immediately and tombstone it in Firestore/local storage
    setStaffList((prev) => {
      const next = prev.filter((s) => s.id !== staffId);
      safeSetLocalStorage('kenax_staff_cache', JSON.stringify(next));
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
      performance: 'reports.view',
      orders: 'orders.view',
      'cart-activities': 'orders.view',
      'wishlist-activities': 'orders.view',
      payments: 'payments.view',
      'payment-gateways': 'settings.view',
      reports: 'reports.view',
      products: 'products.view',
      categories: 'products.view',
      inventory: 'inventory.view',
      coupons: 'coupons.view',
      customers: 'customers.view',
      reviews: 'reviews.view',
      delivery: 'delivery.view',
      staff: 'staff.view',
      roles: 'roles.view',
      logs: 'logs.view',
      settings: 'settings.view',
    };

    const reqPerm = tabPermissionMap[currentTab];
    if (reqPerm && !hasPermission(activeRole, permissions, reqPerm)) {
      setCurrentTab('overview');
    }
  }, [activeRole, currentTab]);

  // Computed counts for badges
  const pendingOrdersCount = orders.filter(
    (o) => o.orderStatus === 'Pending' || o.orderStatus === 'Payment Verification'
  ).length;

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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
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
        lowStockCount={lowStockCount}
        liveCartsCount={liveCartsCount}
        liveWishlistsCount={customers.filter((c) => c.wishlist && c.wishlist.length > 0).length}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onRoleChange={handleRoleChange}
        isSuperAdminAccount={isSuperAdminAccount}
      />

      {/* Main Content Area (Offset by 64px for sidebar on lg screens) */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <AdminHeader
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
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

          {currentTab === 'orders' && (
            <AdminOrders
              orders={orders}
              products={products}
              onUpdateOrderStatus={(orderId, status, courier, tracking) => {
                handleUpdateOrderStatus(orderId, status, courier, tracking);
              }}
              onVerifyPayment={handleVerifyPayment}
              onPrintInvoice={(order) => setSelectedInvoiceOrder(order)}
              onAddOrder={(newOrd) => {
                if (onAddOrder) onAddOrder(newOrd);
                recordAuditLog('Manual Order Created', 'orders', newOrd.id, `Created manual order ${newOrd.id} for ${newOrd.customerName} (৳${newOrd.totalAmount})`);
              }}
              currentRole={activeRole}
              currentStaff={currentStaff}
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
              }}
              onUpdateProduct={(p) => {
                onUpdateProduct(p);
                recordAuditLog('Product Updated', 'products', p.sku, `Updated pricing/specs for ${p.name} (${p.sku})`);
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
            />
          )}

          {currentTab === 'payments' && (
            <AdminPayments
              orders={orders}
              onVerifyPayment={handleVerifyPayment}
              currentRole={activeRole}
              currentStaff={currentStaff}
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
                await saveReviewToDB(updated);
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
            />
          )}
        </main>
      </div>

      {/* Printable Invoice Modal */}
      <InvoiceModal
        order={selectedInvoiceOrder}
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">🔑</span>
                <h3 className="font-bold text-base">Change Staff Password</h3>
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
                <div className={`p-3 rounded-xl text-xs font-semibold ${passwordChangeMsg.includes('success') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {passwordChangeMsg}
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 mb-2">
                Changing password for: <b className="text-slate-900">{currentStaff?.name}</b> ({currentStaff?.email})
                <span className="block text-[10px] text-slate-400 mt-0.5">Your dashboard, role, permissions, and all data remain fully intact and secure.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={confirmStaffPassword}
                  onChange={(e) => setConfirmStaffPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
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
