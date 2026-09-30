import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryNav } from './components/CategoryNav';
import { PromoGrid } from './components/PromoGrid';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { FlashSaleBanner } from './components/FlashSaleBanner';
import { MobileBottomNav } from './components/MobileBottomNav';
import { OrderProcessingAnimation } from './components/OrderProcessingAnimation';
import { MaintenanceModal } from './components/MaintenanceModal';
import type { PolicyTab } from './components/PolicyModal';

import { ProductPageView } from './components/ProductPageView';
import { AuthPageView } from './components/AuthPageView';

// Portals & Core Views: Lazy loaded with suspense to ensure ultra-fast initial storefront load
const AdminPortal = React.lazy(() => import('./components/AdminPortal'));
const SellerPortal = React.lazy(() =>
  import('./components/seller/SellerPortal').then((m) => ({ default: m.SellerPortal }))
);
const ResellerPortal = React.lazy(() =>
  import('./components/reseller/ResellerPortal').then((m) => ({ default: m.ResellerPortal }))
);
const PartnerLoginPage = React.lazy(() =>
  import('./components/partner/PartnerLoginPage').then((m) => ({ default: m.PartnerLoginPage }))
);

// High-Performance Core Views & Modals: Direct imports ensure rock-solid React hook dispatcher stability
import { CustomerFloatingChat } from './components/CustomerFloatingChat';
import { CheckoutModal } from './components/CheckoutModal';
import { CheckoutPageView } from './components/CheckoutPageView';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CustomerDashboard } from './components/CustomerDashboard';
import { TrackOrderView } from './components/TrackOrderView';
import { AboutView } from './components/AboutView';
import { ContactView } from './components/ContactView';
import { PolicyView } from './components/PolicyView';
import { PolicyModal } from './components/PolicyModal';
import { ProductLandingPageView } from './components/ProductLandingPageView';
import { TagProductsView } from './components/TagProductsView';
import { AIAssistantModal } from './components/AIAssistantModal';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { safeSetLocalStorage } from './lib/storage';
import { getEnvStorageKey } from './utils/envHelper';
import { sanitizeCart } from './utils/cartUtils';
import { applySEOMetaTags } from './utils/seo';
import { sortProductsByPagePriority } from './utils/productPriorityUtils';
import { recordProductAction } from './utils/productPopularity';
import { getCleanPromoGridSettings } from './data/defaultPromoBanners';
import { sanitizeSiteSettings } from './utils/sanitizeSiteSettings';
import {
  DEFAULT_FLASH_SALE_BANNER,
  DEFAULT_PRIVACY_POLICY,
  DEFAULT_TERMS_OF_SERVICE,
  DEFAULT_REFUND_POLICY,
  DEFAULT_FAQS,
} from './data/defaultPolicies';

import {
  Product,
  ProductHistoryEntry,
  Order,
  OrderItem,
  Category,
  UserRole,
  DeliveryAddress,
  SiteSettings,
  OrderStatus,
  CustomerRecord,
  StaffUser,
  CartActivity,
  CartActivityItem,
  DEFAULT_HERO_SIDE_BANNER,
  PartnerUser,
} from './types';
import { INITIAL_PRODUCTS, PRODUCTION_PRODUCTS } from './data/initialProducts';
import { isPreviewEnvironment } from './utils/envHelper';
import {
  INITIAL_CATEGORIES,
  INITIAL_WEBSITE_SETTINGS,
  INITIAL_ORDERS,
  INITIAL_COUPONS,
  INITIAL_STAFF,
} from './data/initialSettings';
import {
  seedAllDataToFirestore,
  getProductsFromDB,
  getOrdersFromDB,
  saveOrderToDB,
  saveProductToDB,
  deleteProductFromDB,
  subscribeToProducts,
  updateOrderInDB,
  getCartActivitiesFromDB,
  subscribeToCartActivities,
  saveCartActivityToDB,
  updateCartActivityStatusInDB,
  subscribeToOrders,
  fetchCustomerOrdersFromDB,
  fetchCustomerRecordFromDB,
  saveCustomerToDB,
  getStaffFromDB,
  saveStaffToDB,
  subscribeToStaff,
  getSettingsFromDB,
  saveSettingsToDB,
  subscribeToSettings,
  getCategoriesFromDB,
  saveCategoryToDB,
  deleteCategoryFromDB,
  subscribeToCategories,
  subscribeToCustomers,
  mergeProductsLists,
  mergeCategoriesLists,
  mergeOrdersLists,
  resolveOriginalImageMedia,
} from './lib/firebase';
import { addAddressWithoutDuplicates, isSameAddress } from './utils/addressUtils';
import { preloadProductThumbnailBatch } from './utils/imageOptimizer';
import { Sparkles, Flame, Star, CheckCircle, ArrowRight, ShieldCheck, Lock, LogIn } from 'lucide-react';
import {
  triggerAddToCartWorkflow,
  triggerOrderPlacedWorkflow,
} from './lib/emailService';
import {
  triggerOrderPlacedSMS,
  triggerOrderStatusSMS,
  triggerOrderEmailNotification,
} from './lib/smsService';
import { triggerTelegramNewOrder, triggerTelegramOrderStatusChange } from './lib/telegramBotService';
import { triggerWhatsAppEvent } from './lib/whatsappService';
import { dispatchFakeOrderAlerts } from './lib/fakeOrderAlertService';
import {
  initTrackingPixels,
  trackPixelPageView,
  trackPixelViewContent,
  trackPixelAddToCart,
  trackPixelInitiateCheckout,
  trackPixelPurchase,
  trackPixelSearch,
  trackPixelContact,
} from './utils/pixelTracker';

export default function App() {
  // Navigation View State with Full Refresh & Direct Route Persistence
  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      const pathname = (window.location.pathname || '').toLowerCase().replace(/\/$/, '');
      const hash = (window.location.hash || '').toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      const portalParam = params.get('portal');

      // 1. Direct Multi-Page URL Pathname Routes
      if (pathname === '/seller' || pathname === '/seller-portal' || pathname === '/seller/dashboard') {
        return 'seller-portal';
      }
      if (pathname === '/reseller' || pathname === '/reseller-portal' || pathname === '/reseller/dashboard') {
        return 'reseller-portal';
      }
      if (pathname === '/admin' || pathname === '/admin-dashboard' || pathname === '/admin-portal' || pathname === '/admin/dashboard') {
        return 'admin-dashboard';
      }
      if (pathname === '/partner-login' || pathname === '/partner' || pathname === '/seller-login' || pathname === '/reseller-login') {
        return 'partner-login';
      }
      if (pathname === '/checkout') return 'checkout';
      if (pathname === '/track' || pathname === '/track-order') return 'track-order';
      if (pathname === '/about') return 'about';
      if (pathname === '/contact') return 'contact';

      // 2. Admin dashboard route (hash or view param)
      if (
        hash === '#admin' ||
        hash === '#admin-dashboard' ||
        hash === '#admin-portal' ||
        urlView === 'admin' ||
        urlView === 'admin-dashboard'
      ) {
        return 'admin-dashboard';
      }

      // 3. Direct Landing Page route (?lp=slug or ?landing=slug or ?offer=slug)
      if (params.has('lp') || params.has('landing') || params.has('offer')) {
        return 'landing-page';
      }

      // 4. Direct Product route (?product=id or ?p=id or ?id=id)
      if (params.has('product') || params.has('p') || params.has('id')) {
        return 'product';
      }

      // 5. Tag view route (?tag=...)
      if (params.has('tag')) {
        return `tag:${params.get('tag')}`;
      }

      // 6. Dedicated Partner Portals (?portal=seller, ?portal=reseller, ?portal=partner-login)
      if (portalParam === 'seller') return 'seller-portal';
      if (portalParam === 'reseller') return 'reseller-portal';
      if (portalParam === 'partner-login' || portalParam === 'partner') return 'partner-login';

      // 7. Explicit view route (?view=...)
      if (urlView) {
        if (urlView === 'home') return 'home';
        if (urlView === 'checkout') return 'checkout';
        if (urlView === 'login' || urlView === 'register' || urlView === 'auth') {
          return 'auth';
        }
        if (urlView === 'seller-portal' || urlView === 'seller') return 'seller-portal';
        if (urlView === 'reseller-portal' || urlView === 'reseller') return 'reseller-portal';
        if (urlView === 'partner-login') return 'partner-login';
        return urlView;
      }

      // 8. Direct persistent saved view
      const savedView = localStorage.getItem('kenax_current_view');
      if (savedView) {
        if (savedView === 'admin-dashboard' || savedView === 'admin') {
          const hasStaff =
            localStorage.getItem('kenax_current_staff') ||
            localStorage.getItem('kenax_authenticated_staff') ||
            localStorage.getItem('preview_kenax_current_staff');
          if (hasStaff) return 'admin-dashboard';
          return 'home';
        }
        if (savedView === 'seller-portal' || savedView === 'reseller-portal') {
          const hasPartner = localStorage.getItem('kenax_current_partner');
          if (hasPartner) return savedView;
          return 'partner-login';
        }
        if (savedView === 'product' || savedView === 'landing-page') {
          return 'home';
        }
        return savedView;
      }
    } catch {}
    return 'home';
  });
  const [selectedTrackOrder, setSelectedTrackOrder] = useState<Order | null>(null);

  // Partner (Seller & Reseller) State
  const [currentPartner, setCurrentPartner] = useState<PartnerUser | null>(() => {
    try {
      const saved = localStorage.getItem('kenax_current_partner');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch {}
    return null;
  });
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const savedStaff =
        localStorage.getItem('kenax_current_staff') ||
        localStorage.getItem('kenax_authenticated_staff') ||
        localStorage.getItem('preview_kenax_current_staff');
      if (savedStaff) {
        const parsed = JSON.parse(savedStaff);
        if (parsed && parsed.role) return parsed.role;
      }
      const savedRole = localStorage.getItem('kenax_authenticated_role');
      if (savedRole) return savedRole as UserRole;
    } catch {}
    return 'customer';
  });
  const [adminInitialTab, setAdminInitialTab] = useState<any>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (urlTab) return urlTab;
      const savedTab = localStorage.getItem('kenax_admin_active_tab');
      if (savedTab) return savedTab;
    } catch {}
    return 'overview';
  });
  const [adminInitialSettingsSubTab, setAdminInitialSettingsSubTab] = useState<any>('hero');

  // Customer Authentication state
  const [currentCustomer, setCurrentCustomer] = useState<CustomerRecord | null>(() => {
    const saved = localStorage.getItem('kenax_current_customer');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.id || parsed.email)) {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });
  const [authPageTab, setAuthPageTab] = useState<'login' | 'register'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlView = (params.get('view') || '').toLowerCase();
      const tabParam = (params.get('tab') || '').toLowerCase();
      if (urlView === 'register' || tabParam === 'register') return 'register';
      return 'login';
    } catch {
      return 'login';
    }
  });
  const [returnViewAfterAuth, setReturnViewAfterAuth] = useState<string>('home');
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [customerAuthInitialTab, setCustomerAuthInitialTab] = useState<'login' | 'register'>('login');

  const handleOpenCustomerAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthPageTab(tab);
    setCustomerAuthInitialTab(tab);
    if (currentView !== 'auth' && currentView !== 'login' && currentView !== 'register') {
      setReturnViewAfterAuth(currentView);
    }
    // Directly navigate to the dedicated separate Auth Page
    setCurrentView('auth');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('view', tab);
      window.history.pushState(null, '', url.pathname + '?' + url.searchParams.toString());
    } catch {}
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackFromAuth = () => {
    if (
      returnViewAfterAuth &&
      returnViewAfterAuth !== 'auth' &&
      returnViewAfterAuth !== 'login' &&
      returnViewAfterAuth !== 'register'
    ) {
      handleNavigate(returnViewAfterAuth);
    } else {
      handleNavigate('home');
    }
  };

  // Staff Authentication state (Permanent Multi-Device & Cross-Environment Persistence)
  const [staffList, setStaffList] = useState<StaffUser[]>(() => {
    const staffById = new Map<string, StaffUser>();
    const staffByEmail = new Map<string, StaffUser>();

    const mergeEntry = (s: StaffUser) => {
      if (!s || (!s.id && !s.email)) return;
      const lowerEmail = s.email ? s.email.trim().toLowerCase() : '';
      const idKey = s.id ? s.id.trim() : '';

      const existing = (idKey ? staffById.get(idKey) : null) || (lowerEmail ? staffByEmail.get(lowerEmail) : null);
      const resolvedPhone = (s.phone && s.phone.trim() !== '') ? s.phone.trim() : (existing?.phone || s.phone);
      const resolvedName = (s.name && s.name.trim() !== '') ? s.name.trim() : (existing?.name || s.name);
      const merged: StaffUser = existing
        ? {
            ...existing,
            ...s,
            phone: resolvedPhone,
            name: resolvedName,
          }
        : { ...s };

      if (idKey) staffById.set(idKey, merged);
      if (lowerEmail) staffByEmail.set(lowerEmail, merged);
    };

    // 1. INITIAL_STAFF baseline
    for (const s of INITIAL_STAFF as StaffUser[]) {
      mergeEntry(s);
    }

    const readLocal = (key: string) => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            parsed.forEach((s) => mergeEntry(s));
          } else if (parsed && typeof parsed === 'object' && (parsed.id || parsed.email)) {
            mergeEntry(parsed);
          }
        }
      } catch {}
    };
    readLocal('kenax_staff_cache');
    readLocal('preview_kenax_staff_cache');
    readLocal('kenax_current_staff');
    readLocal('kenax_authenticated_staff');

    const seen = new Set<string>();
    const res: StaffUser[] = [];
    for (const s of staffById.values()) {
      const key = s.id || (s.email ? s.email.toLowerCase() : '');
      if (key && !seen.has(key)) {
        seen.add(key);
        res.push(s);
      }
    }
    return res;
  });

  useEffect(() => {
    // Initial fetch from DB / Server store / Firestore
    getStaffFromDB().then((dbStaff) => {
      if (dbStaff && dbStaff.length > 0) {
        setStaffList(dbStaff);
        setCurrentStaff((prev) => {
          if (!prev) return prev;
          const matched = dbStaff.find(
            (s) => s.id === prev.id || (s.email && prev.email && s.email.toLowerCase() === prev.email.toLowerCase())
          );
          if (matched) {
            const ser = JSON.stringify(matched);
            localStorage.setItem('kenax_current_staff', ser);
            localStorage.setItem('kenax_authenticated_staff', ser);
            return matched;
          }
          return prev;
        });
      }
    });

    // Real-time synchronization subscription
    const unsubscribe = subscribeToStaff((latestStaff) => {
      if (latestStaff && latestStaff.length > 0) {
        setStaffList(latestStaff);
        setCurrentStaff((prev) => {
          if (!prev) return prev;
          const matched = latestStaff.find(
            (s) => s.id === prev.id || (s.email && prev.email && s.email.toLowerCase() === prev.email.toLowerCase())
          );
          if (matched) {
            const ser = JSON.stringify(matched);
            localStorage.setItem('kenax_current_staff', ser);
            localStorage.setItem('kenax_authenticated_staff', ser);
            return matched;
          }
          return prev;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const [currentStaff, setCurrentStaff] = useState<StaffUser | null>(() => {
    const saved = localStorage.getItem('kenax_current_staff') || localStorage.getItem('kenax_authenticated_staff') || localStorage.getItem('preview_kenax_current_staff');
    if (saved) {
      try {
        const parsed: StaffUser = JSON.parse(saved);
        if (parsed && (parsed.id || parsed.email)) {
          return parsed;
        }
      } catch (e) {}
    }
    return null;
  });

  // Reconcile active session staff into staffList so it's always listed in Staff Members & RBAC
  useEffect(() => {
    if (currentStaff && (currentStaff.id || currentStaff.email)) {
      setStaffList((prev) => {
        const exists = prev.some(
          (s) => s.id === currentStaff.id || (s.email && currentStaff.email && s.email.toLowerCase() === currentStaff.email.toLowerCase())
        );
        if (!exists) {
          const updated = [currentStaff, ...prev];
          saveStaffToDB(currentStaff);
          return updated;
        }
        return prev;
      });
    }
  }, [currentStaff]);

  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Cart Activities for Admin / Manager / Moderator Tracking
  const [cartActivities, setCartActivities] = useState<CartActivity[]>(() => {
    try {
      const cached = localStorage.getItem('kenax_cart_activities_cache');
      const list = cached ? JSON.parse(cached) : [];
      return Array.isArray(list) ? list.filter((c: any) => c && c.isV2Activity) : [];
    } catch {
      return [];
    }
  });

  // Persistent Guest Visitor Session ID
  const [visitorSessionId] = useState<string>(() => {
    let id = localStorage.getItem('kenax_visitor_session_id');
    if (!id) {
      id = 'visitor-' + Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem('kenax_visitor_session_id', id);
    }
    return id;
  });

  // Order Placement Animation & Success Modal States
  const [processingOrder, setProcessingOrder] = useState<Order | null>(null);
  const processingOrderRef = useRef<Order | null>(null);
  const [isProcessingAnimationOpen, setIsProcessingAnimationOpen] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Database Data States
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const rawDeleted = localStorage.getItem(getEnvStorageKey('kenax_deleted_product_ids'));
      const deletedSet = new Set<string>(rawDeleted ? JSON.parse(rawDeleted) : []);
      const cached = localStorage.getItem(getEnvStorageKey('kenax_products_cache'));
      let cachedList: Product[] = [];
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) cachedList = parsed;
      }
      const baseline = INITIAL_PRODUCTS;
      const merged = mergeProductsLists(baseline, cachedList, deletedSet);
      return merged.filter((p: Product) => p && p.id && !deletedSet.has(p.id));
    } catch {
      return INITIAL_PRODUCTS;
    }
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const cached = localStorage.getItem(getEnvStorageKey('kenax_orders_cache'));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return mergeOrdersLists([], parsed);
      }
    } catch {}
    return [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const cached = localStorage.getItem('kenax_categories_cache') || localStorage.getItem('kenax_categories');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeCategoriesLists(INITIAL_CATEGORIES, parsed);
        }
      }
    } catch {}
    return INITIAL_CATEGORIES;
  });
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    const saved = (() => {
      try {
        return localStorage.getItem('kenax_site_settings') || localStorage.getItem('kenax_settings_cache');
      } catch {
        return null;
      }
    })();
    const storedLogo = (() => {
      try {
        return localStorage.getItem('kenax_custom_logo') || undefined;
      } catch {
        return undefined;
      }
    })();
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return sanitizeSiteSettings(parsed, storedLogo);
      } catch (e) {
        console.error('Failed to parse saved siteSettings', e);
      }
    }
    return sanitizeSiteSettings(INITIAL_WEBSITE_SETTINGS, storedLogo);
  });

  // Dynamically sync SEO Meta Tags and Advertising Pixels (Meta Pixel, CAPI, TikTok, GA4) to DOM
  useEffect(() => {
    if (siteSettings?.seoSettings) {
      applySEOMetaTags(siteSettings.seoSettings);
    }
    if (siteSettings?.advertiserSettings) {
      initTrackingPixels(siteSettings);
    }
  }, [siteSettings?.seoSettings, siteSettings?.advertiserSettings]);

  // Policy & Help Center Page State
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState<boolean>(false);
  const [policyPageTab, setPolicyPageTab] = useState<string>('return');

  const handleOpenPolicy = (tab: string) => {
    setPolicyPageTab(tab);
    if (currentView === 'policy') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setCurrentView('policy');
    }
  };

  const handleUpdateSettings = async (newSettings: SiteSettings) => {
    let fullMerged: SiteSettings = sanitizeSiteSettings(newSettings, siteSettings.customLogo);
    setSiteSettings((prev) => {
      fullMerged = sanitizeSiteSettings({ ...prev, ...newSettings });
      try {
        safeSetLocalStorage('kenax_site_settings', JSON.stringify(fullMerged));
        safeSetLocalStorage('kenax_settings_cache', JSON.stringify(fullMerged));
        if (fullMerged.customLogo) {
          safeSetLocalStorage('kenax_custom_logo', fullMerged.customLogo);
        }
      } catch (e) {
        console.error('Failed to persist siteSettings', e);
      }
      return fullMerged;
    });
    await saveSettingsToDB(fullMerged);
  };

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('cat') || params.get('category');
      if (cat) return cat;
      const saved = localStorage.getItem('kenax_selected_category');
      if (saved) return saved;
    } catch {}
    return 'All';
  });
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get('sub') || params.get('subcategory');
      if (sub) return sub;
    } catch {}
    return 'All';
  });
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tag = params.get('tag');
      if (tag) return tag;
      const saved = localStorage.getItem('kenax_selected_tag');
      if (saved) return saved;
    } catch {}
    return 'Flash Sale';
  });
  const [selectedHomeTab, setSelectedHomeTab] = useState<'all' | 'trending' | 'electronics' | 'fashion' | 'home' | 'bestsellers'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating'>('featured');

  useEffect(() => {
    if (siteSettings.homeTabs?.hiddenTabs?.includes(selectedHomeTab)) {
      setSelectedHomeTab('all');
    }
  }, [siteSettings.homeTabs?.hiddenTabs, selectedHomeTab]);

  useEffect(() => {
    if (selectedCategory) {
      safeSetLocalStorage('kenax_selected_category', selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedTag) {
      safeSetLocalStorage('kenax_selected_tag', selectedTag);
    }
  }, [selectedTag]);

  const handleSelectCategory = (catName: string, subcategory = 'All', subSubcategory = 'All') => {
    setSelectedCategory(catName);
    setSelectedSubcategory(subcategory);
    setSelectedSubSubcategory(subSubcategory);
    setSearchQuery(''); // Clear search query on category selection so category products display properly
    if (currentView !== 'shop') {
      setCurrentView('shop');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleSelectSubcategory = (subName: string) => {
    setSelectedSubcategory(subName);
    setSelectedSubSubcategory('All');
  };

  const handleSelectSubSubcategory = (subSubName: string) => {
    setSelectedSubSubcategory(subSubName);
  };

  // Interactive Shopping States
  const [cart, setCart] = useState<OrderItem[]>(() => {
    const saved = localStorage.getItem('kenax_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return sanitizeCart(parsed);
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }
    return [];
  });
  const [checkoutItems, setCheckoutItems] = useState<OrderItem[]>([]);
  const checkoutItemsRef = useRef<OrderItem[]>([]);
  useEffect(() => {
    checkoutItemsRef.current = checkoutItems;
  }, [checkoutItems]);
  const [wishlist, setWishlist] = useState<Product[]>(() => {
    const saved = localStorage.getItem('kenax_wishlist');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse wishlist', e);
      }
    }
    return [];
  });
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Sync cart changes to localStorage and Cloud Firestore
  useEffect(() => {
    safeSetLocalStorage('kenax_cart', JSON.stringify(cart));
    if (currentCustomer?.id) {
      const updatedCust = { ...currentCustomer, cart };
      saveCustomerToDB(updatedCust).catch((err) => console.warn('Sync cart to Firestore:', err));
    }
  }, [cart, currentCustomer?.id]);

  // Reconcile Cart Images across reloads, refreshes & offline caching
  useEffect(() => {
    if (cart.length > 0 && products.length > 0) {
      let needsCartUpdate = false;
      const updatedCart = cart.map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (!prod) return item;

        let currentImg = item.productImage;
        const defaultProdImg =
          (prod.images && prod.images.find((img) => typeof img === 'string' && img.trim() !== '')) ||
          (prod.colors && prod.colors.find((c) => c.imageUrl && c.imageUrl.trim() !== '')?.imageUrl) ||
          '';

        if (!currentImg || currentImg.trim() === '' || currentImg.startsWith('media://')) {
          if (currentImg && currentImg.startsWith('media://productImageMedia/')) {
            resolveOriginalImageMedia(currentImg).then((resolved) => {
              if (resolved && !resolved.startsWith('media://')) {
                setCart((prev) =>
                  prev.map((it) =>
                    it.productId === item.productId && it.variant === item.variant
                      ? { ...it, productImage: resolved }
                      : it
                  )
                );
              }
            });
          } else if (defaultProdImg) {
            currentImg = defaultProdImg;
            needsCartUpdate = true;
          }
        }

        return currentImg !== item.productImage ? { ...item, productImage: currentImg } : item;
      });

      if (needsCartUpdate) {
        setCart(updatedCart);
      }
    }
  }, [products]);

  // Sync wishlist changes to localStorage and Cloud Firestore
  useEffect(() => {
    safeSetLocalStorage('kenax_wishlist', JSON.stringify(wishlist));
    if (currentCustomer?.id) {
      const updatedCust = { ...currentCustomer, wishlist };
      saveCustomerToDB(updatedCust).catch((err) => console.warn('Sync wishlist to Firestore:', err));
    }
  }, [wishlist, currentCustomer?.id]);

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutOrderSource, setCheckoutOrderSource] = useState<'manual' | 'chatbot' | string>('manual');
  const [returnViewAfterCheckout, setReturnViewAfterCheckout] = useState<string>('home');
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(() => {
    try {
      const savedProductJson = localStorage.getItem('kenax_selected_product_for_detail');
      if (savedProductJson) {
        const parsed = JSON.parse(savedProductJson);
        if (parsed && parsed.id) return parsed;
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    if (selectedProductForDetail) {
      try {
        localStorage.setItem('kenax_selected_product_for_detail', JSON.stringify(selectedProductForDetail));
      } catch {}
    }
  }, [selectedProductForDetail]);

  // Product Navigation History Stack (supports multi-level product chains e.g. Home -> Product A -> Product B -> Back to A -> Back to Home)
  const [productNavHistory, setProductNavHistory] = useState<ProductHistoryEntry[]>(() => {
    try {
      const saved = sessionStorage.getItem('kenax_product_nav_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const saveProductNavHistory = (newStack: ProductHistoryEntry[]) => {
    setProductNavHistory(newStack);
    try {
      sessionStorage.setItem('kenax_product_nav_history', JSON.stringify(newStack));
    } catch {}
  };

  // Customer Saved Addresses (Empty by default, permanently saved in localStorage)
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>(() => {
    const saved = localStorage.getItem('kenax_saved_addresses');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved addresses', e);
      }
    }
    return [];
  });

  useEffect(() => {
    safeSetLocalStorage('kenax_saved_addresses', JSON.stringify(savedAddresses));
    if (currentCustomer) {
      const updatedCust = { ...currentCustomer, addresses: savedAddresses, savedAddresses: savedAddresses };
      saveCustomerToDB(updatedCust).catch((err) => console.warn('Sync address to Firestore:', err));
    }
  }, [savedAddresses, currentCustomer]);

  const handleAddAddress = (newAddr: DeliveryAddress) => {
    setSavedAddresses((prev) => {
      const { addresses } = addAddressWithoutDuplicates(prev, newAddr);
      return addresses;
    });
  };

  const handleUpdateAddress = (updatedAddr: DeliveryAddress) => {
    setSavedAddresses((prev) => {
      let updated = prev.map((a) => (a.id === updatedAddr.id ? updatedAddr : a));
      if (updatedAddr.isDefault) {
        updated = updated.map((a) => (a.id === updatedAddr.id ? a : { ...a, isDefault: false }));
      }
      return updated;
    });
  };

  const handleDeleteAddress = (id: string) => {
    setSavedAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  // Customer Dashboard active tab control (orders / addresses / wishlist / cart)
  const [customerDashboardTab, setCustomerDashboardTab] = useState<'orders' | 'cart' | 'addresses' | 'wishlist'>('orders');

  // Centralized Navigation Handler with Automatic Smooth Scroll to Top
  const handleNavigate = (view: string, tab?: 'orders' | 'cart' | 'addresses' | 'wishlist') => {
    let targetView = view;
    const cleanView = (view || '').trim().toLowerCase();

    if (cleanView === 'cart' || cleanView === 'view:cart') {
      setIsCartOpen(true);
      return;
    }

    if (cleanView === 'cart-items' || cleanView === 'customer-cart') {
      setCustomerDashboardTab('cart');
      targetView = 'customer-dashboard';
    } else if (cleanView === 'saved-addresses' || cleanView === 'addresses') {
      setCustomerDashboardTab('addresses');
      targetView = 'customer-dashboard';
    } else if (cleanView === 'checkout' || cleanView === 'view:checkout') {
      setCheckoutItems(cart.length > 0 ? cart : []);
      if (currentView !== 'checkout') {
        setReturnViewAfterCheckout(currentView);
      }
      setIsCartOpen(false);
      setIsCheckoutOpen(true);
      setCurrentView('checkout');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    } else if (cleanView === 'login' || cleanView === 'auth:login' || cleanView === 'signin') {
      setAuthPageTab('login');
      if (currentView !== 'auth' && currentView !== 'login' && currentView !== 'register') {
        setReturnViewAfterAuth(currentView);
      }
      targetView = 'auth';
    } else if (cleanView === 'register' || cleanView === 'auth:register' || cleanView === 'signup') {
      setAuthPageTab('register');
      if (currentView !== 'auth' && currentView !== 'login' && currentView !== 'register') {
        setReturnViewAfterAuth(currentView);
      }
      targetView = 'auth';
    } else if (cleanView === 'auth') {
      if (currentView !== 'auth' && currentView !== 'login' && currentView !== 'register') {
        setReturnViewAfterAuth(currentView);
      }
      targetView = 'auth';
    }

    if (cleanView.startsWith('tag:') || cleanView.startsWith('tag-')) {
      const tagName = (view || '').replace(/^tag[:-]/i, '').trim();
      setSelectedTag(tagName);
      targetView = `tag:${tagName}`;
    } else if (
      cleanView === 'flash_sale' ||
      cleanView === 'flash-sale' ||
      cleanView === 'flash' ||
      cleanView === 'view:flash_sale'
    ) {
      setSelectedTag('Flash Sale');
      targetView = 'tag:Flash Sale';
    } else if (cleanView === 'trending' || cleanView === 'view:trending') {
      setSelectedTag('Trending');
      targetView = 'tag:Trending';
    } else if (
      cleanView === 'new_arrivals' ||
      cleanView === 'new-arrivals' ||
      cleanView === 'new' ||
      cleanView === 'view:new_arrivals'
    ) {
      setSelectedTag('New Arrivals');
      targetView = 'tag:New Arrivals';
    } else if (
      cleanView === 'deals' ||
      cleanView === 'deal' ||
      cleanView === 'view:deals'
    ) {
      setSelectedTag('Deals');
      targetView = 'tag:Deals';
    } else if (
      cleanView === 'top_rated' ||
      cleanView === 'top-rated' ||
      cleanView === 'bestsellers' ||
      cleanView === 'best' ||
      cleanView === 'view:top_rated'
    ) {
      setSelectedCategory('All');
      setSelectedSubcategory('All');
      setSelectedSubSubcategory('All');
      setSearchQuery('');
      setSortBy('rating');
      targetView = 'shop';
    } else if (
      cleanView === 'electronics' ||
      cleanView === 'gadgets' ||
      cleanView === 'category:electronics' ||
      cleanView.includes('electronic')
    ) {
      const elecCat = categories.find(
        (c) =>
          c.name.toLowerCase().includes('electronic') ||
          c.name.toLowerCase().includes('gadget')
      );
      setSelectedCategory(elecCat ? elecCat.name : 'Electronics & Gadgets');
      setSelectedSubcategory('All');
      setSelectedSubSubcategory('All');
      setSearchQuery('');
      targetView = 'shop';
    } else if (
      cleanView === 'fashion' ||
      cleanView === 'clothing' ||
      cleanView === 'category:fashion' ||
      cleanView.includes('fashion')
    ) {
      const fashCat = categories.find(
        (c) =>
          c.name.toLowerCase().includes('fashion') ||
          c.name.toLowerCase().includes('clothing')
      );
      setSelectedCategory(fashCat ? fashCat.name : 'Fashion & Clothing');
      setSelectedSubcategory('All');
      setSelectedSubSubcategory('All');
      setSearchQuery('');
      targetView = 'shop';
    } else if (
      cleanView === 'home-living' ||
      cleanView === 'home_living' ||
      cleanView === 'home_kitchen' ||
      cleanView === 'category:home'
    ) {
      const homeCat = categories.find(
        (c) =>
          c.name.toLowerCase().includes('home') ||
          c.name.toLowerCase().includes('living')
      );
      setSelectedCategory(homeCat ? homeCat.name : 'Home & Living');
      setSelectedSubcategory('All');
      setSelectedSubSubcategory('All');
      setSearchQuery('');
      targetView = 'shop';
    } else if (cleanView === 'shop' || cleanView === 'view:shop' || cleanView === 'products' || cleanView === 'categories') {
      targetView = 'shop';
    } else if (cleanView === 'all' || cleanView === 'all-products') {
      setSelectedCategory('All');
      setSelectedSubcategory('All');
      setSelectedSubSubcategory('All');
      setSearchQuery('');
      targetView = 'shop';
    } else if (cleanView === 'mobile' || cleanView === 'smartphones') {
      const elecCat = categories.find(
        (c) =>
          c.name.toLowerCase().includes('electronic') ||
          c.name.toLowerCase().includes('gadget')
      );
      setSelectedCategory(elecCat ? elecCat.name : 'Electronics & Gadgets');
      setSelectedSubcategory('Smartphones & Tablets');
      setSelectedSubSubcategory('All');
      setSearchQuery('');
      targetView = 'shop';
    } else if (cleanView === 'xiaomi' || cleanView === 'tag:xiaomi') {
      setSelectedCategory('All');
      setSelectedSubcategory('All');
      setSelectedSubSubcategory('All');
      setSearchQuery('Xiaomi');
      targetView = 'shop';
    } else if (cleanView === 'profile' || cleanView === 'customer-dashboard') {
      targetView = 'customer-dashboard';
      if (tab) {
        setCustomerDashboardTab(tab);
      } else {
        setCustomerDashboardTab('orders');
      }
    } else if (cleanView === 'product') {
      targetView = 'product';
    } else if (
      cleanView === 'privacy' ||
      cleanView === 'terms' ||
      cleanView === 'refund' ||
      cleanView === 'faq' ||
      cleanView === 'help' ||
      cleanView === 'policy' ||
      cleanView === 'policies'
    ) {
      if (cleanView === 'terms') setPolicyPageTab('terms');
      else if (cleanView === 'refund') setPolicyPageTab('refund');
      else if (cleanView === 'faq' || cleanView === 'help') setPolicyPageTab('faq');
      else if (cleanView === 'privacy') setPolicyPageTab('privacy');
      targetView = 'policy';
    } else {
      // Check if matching any category name directly
      const matchedCat = categories.find(
        (c) =>
          c.name.toLowerCase() === cleanView ||
          cleanView === `category:${c.name.toLowerCase()}`
      );
      if (matchedCat) {
        setSelectedCategory(matchedCat.name);
        setSelectedSubcategory('All');
        setSelectedSubSubcategory('All');
        setSearchQuery('');
        targetView = 'shop';
      }
    }

    if (targetView === currentView) {
      // If clicking a link for the view we are already on (e.g. clicking Home while on Home page), smoothly scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // If changing views: instantly reset scroll position so the new view enters smoothly from (0,0) without scroll-glitches
      window.scrollTo({ top: 0, behavior: 'instant' });
      setCurrentView(targetView);
    }

    // Clean up product query params when navigating to other main views
    if (targetView !== 'product' && targetView !== 'landing-page') {
      saveProductNavHistory([]);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('product');
        url.searchParams.delete('p');
        url.searchParams.delete('id');
        url.searchParams.delete('lp');
        url.searchParams.delete('landing');
        url.searchParams.delete('offer');

        if (targetView === 'home') {
          url.searchParams.delete('view');
          url.searchParams.delete('tag');
          url.searchParams.delete('tab');
          url.searchParams.delete('orderId');
          const cleanSearch = url.searchParams.toString() ? '?' + url.searchParams.toString() : '';
          window.history.pushState({}, '', url.pathname + cleanSearch);
        } else if (targetView.startsWith('tag:')) {
          url.searchParams.delete('view');
          url.searchParams.set('tag', targetView.replace(/^tag:/i, '').trim());
          window.history.pushState({}, '', url.pathname + '?' + url.searchParams.toString());
        } else if (targetView === 'shop') {
          url.searchParams.delete('tag');
          url.searchParams.set('view', 'shop');
          window.history.pushState({}, '', url.pathname + '?' + url.searchParams.toString());
        } else {
          url.searchParams.delete('tag');
          url.searchParams.set('view', targetView);
          window.history.pushState({}, '', url.pathname + '?' + url.searchParams.toString());
        }
      } catch (e) {}
    }
  };

  const handleOpenProductDetail = (product: Product, forceStandardView = false) => {
    const currentScrollY = window.scrollY;

    // Track navigation history: if currently viewing a product and clicking another product (e.g. related/similar products),
    // push current product to history stack. If viewing a page, push current page view to history.
    if ((currentView === 'product' || currentView === 'landing-page') && selectedProductForDetail) {
      if (selectedProductForDetail.id !== product.id) {
        const productEntry: ProductHistoryEntry = {
          type: 'product',
          view: currentView,
          productId: selectedProductForDetail.id,
          productName: selectedProductForDetail.name,
          scrollY: currentScrollY,
        };
        saveProductNavHistory([...productNavHistory, productEntry]);
      }
    } else {
      const pageEntry: ProductHistoryEntry = {
        type: 'view',
        view: currentView,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        subSubcategory: selectedSubSubcategory,
        tag: selectedTag,
        searchQuery: searchQuery,
        scrollY: currentScrollY,
      };
      saveProductNavHistory([...productNavHistory, pageEntry]);
    }

    setSelectedProductForDetail(product);
    try {
      const url = new URL(window.location.href);
      if (!forceStandardView && product.landingPage?.enabled) {
        url.searchParams.set('lp', product.landingPage.slug || product.id);
        url.searchParams.delete('product');
      } else {
        url.searchParams.set('product', product.id);
        url.searchParams.delete('lp');
      }
      window.history.pushState({ productId: product.id }, '', url.pathname + '?' + url.searchParams.toString());
    } catch (e) {}

    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!forceStandardView && product.landingPage?.enabled) {
      setCurrentView('landing-page');
    } else {
      setCurrentView('product');
    }

    // Dispatch Multi-Channel ViewContent (Meta Pixel, CAPI, TikTok, GA4)
    trackPixelViewContent(product, siteSettings);
  };

  const handleBackFromProduct = () => {
    if (productNavHistory.length > 0) {
      const nextStack = [...productNavHistory];
      const previous = nextStack.pop()!;
      saveProductNavHistory(nextStack);

      if (previous.type === 'product' && previous.productId) {
        const prevProduct = products.find((p) => p.id === previous.productId);
        if (prevProduct) {
          setSelectedProductForDetail(prevProduct);
          setCurrentView(previous.view === 'landing-page' && prevProduct.landingPage?.enabled ? 'landing-page' : 'product');
          try {
            const url = new URL(window.location.href);
            if (previous.view === 'landing-page' && prevProduct.landingPage?.enabled) {
              url.searchParams.set('lp', prevProduct.landingPage.slug || prevProduct.id);
              url.searchParams.delete('product');
            } else {
              url.searchParams.set('product', prevProduct.id);
              url.searchParams.delete('lp');
            }
            window.history.pushState({ productId: prevProduct.id }, '', url.pathname + '?' + url.searchParams.toString());
          } catch (e) {}

          if (previous.scrollY !== undefined && previous.scrollY > 0) {
            window.scrollTo({ top: previous.scrollY, behavior: 'instant' });
          } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
          return;
        }
      }

      // Previous was a page view (Home, Shop, Tag, Customer Dashboard, etc.)
      const targetView = previous.view && previous.view !== 'product' && previous.view !== 'landing-page' ? previous.view : 'shop';
      if (previous.category) setSelectedCategory(previous.category);
      if (previous.subcategory) setSelectedSubcategory(previous.subcategory);
      if (previous.subSubcategory) setSelectedSubSubcategory(previous.subSubcategory);
      if (previous.tag) setSelectedTag(previous.tag);
      if (previous.searchQuery !== undefined) setSearchQuery(previous.searchQuery);

      setCurrentView(targetView);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('product');
        url.searchParams.delete('p');
        url.searchParams.delete('id');
        url.searchParams.delete('lp');
        window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
      } catch (e) {}

      if (previous.scrollY !== undefined && previous.scrollY > 0) {
        window.scrollTo({ top: previous.scrollY, behavior: 'instant' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
      return;
    }

    // Default fallback if no history stack exists
    setCurrentView('shop');
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('product');
      url.searchParams.delete('p');
      url.searchParams.delete('id');
      url.searchParams.delete('lp');
      window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
    } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Sync URL query params with product details (e.g. ?product=prod_1 or ?lp=offer-slug for FB Ad campaigns / Landing pages)
  useEffect(() => {
    const handleUrlProductCheck = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const lpSlug = urlParams.get('lp') || urlParams.get('landing') || urlParams.get('offer');
        const prodId = urlParams.get('product') || urlParams.get('p') || urlParams.get('id');

        if (lpSlug && products.length > 0) {
          const matchedByLp = products.find(
            (p) =>
              (p.landingPage?.slug && p.landingPage.slug.toLowerCase() === lpSlug.toLowerCase()) ||
              p.id.toLowerCase() === lpSlug.toLowerCase() ||
              (p.sku && p.sku.toLowerCase() === lpSlug.toLowerCase())
          );
          if (matchedByLp) {
            setSelectedProductForDetail(matchedByLp);
            setCurrentView('landing-page');
            return;
          }
        }

        if (prodId && products.length > 0) {
          const matchedProduct = products.find(
            (p) => p.id === prodId || p.id.toLowerCase() === prodId.toLowerCase() || (p.sku && p.sku.toLowerCase() === prodId.toLowerCase())
          );
          if (matchedProduct) {
            setSelectedProductForDetail(matchedProduct);
            if (matchedProduct.landingPage?.enabled && urlParams.get('mode') !== 'standard') {
              setCurrentView('landing-page');
            } else {
              setCurrentView('product');
            }
          }
        }
      } catch (e) {}
    };

    // When products array is refreshed from DB/subscription, update selectedProductForDetail with latest product object if set
    if (selectedProductForDetail && products.length > 0) {
      const freshCurrentProduct = products.find((p) => p.id === selectedProductForDetail.id);
      if (freshCurrentProduct) {
        setSelectedProductForDetail(freshCurrentProduct);
      }
    }
    // Check URL parameters on mount or when products are loaded to display direct product / landing links
    handleUrlProductCheck();

    const onPopState = () => {
      try {
        const pathname = (window.location.pathname || '').toLowerCase().replace(/\/$/, '');
        const hash = (window.location.hash || '').toLowerCase();
        const urlParams = new URLSearchParams(window.location.search);
        const prodId = urlParams.get('product') || urlParams.get('p') || urlParams.get('id');
        const lpSlug = urlParams.get('lp') || urlParams.get('landing') || urlParams.get('offer');
        const urlTag = urlParams.get('tag');
        const urlView = urlParams.get('view');
        const portalParam = urlParams.get('portal');

        if (pathname === '/seller' || pathname === '/seller-portal' || portalParam === 'seller') {
          setCurrentView('seller-portal');
          return;
        }
        if (pathname === '/reseller' || pathname === '/reseller-portal' || portalParam === 'reseller') {
          setCurrentView('reseller-portal');
          return;
        }
        if (pathname === '/partner-login' || portalParam === 'partner-login' || portalParam === 'partner') {
          setCurrentView('partner-login');
          return;
        }
        if (pathname === '/admin' || pathname === '/admin-dashboard' || hash === '#admin' || urlView === 'admin') {
          setCurrentView('admin-dashboard');
          return;
        }

        if (!prodId && !lpSlug) {
          if (urlTag) {
            setSelectedTag(urlTag);
            setCurrentView(`tag:${urlTag}`);
            return;
          }
          if (urlView) {
            setCurrentView(urlView);
            return;
          }
          if (!urlParams.toString()) {
            setCurrentView('home');
            return;
          }
          if (productNavHistory.length > 0) {
            const nextStack = [...productNavHistory];
            const previous = nextStack.pop()!;
            saveProductNavHistory(nextStack);
            const targetView = previous.view && previous.view !== 'product' && previous.view !== 'landing-page' ? previous.view : 'shop';
            if (previous.category) setSelectedCategory(previous.category);
            if (previous.subcategory) setSelectedSubcategory(previous.subcategory);
            if (previous.subSubcategory) setSelectedSubSubcategory(previous.subSubcategory);
            if (previous.tag) setSelectedTag(previous.tag);
            if (previous.searchQuery !== undefined) setSearchQuery(previous.searchQuery);
            setCurrentView(targetView);
            if (previous.scrollY) {
              window.scrollTo({ top: previous.scrollY, behavior: 'instant' });
            }
            return;
          } else if (currentView === 'product' || currentView === 'landing-page') {
            setCurrentView('home');
            return;
          }
        } else if (prodId && productNavHistory.length > 0) {
          const top = productNavHistory[productNavHistory.length - 1];
          if (top.type === 'product' && top.productId === prodId) {
            const nextStack = [...productNavHistory];
            nextStack.pop();
            saveProductNavHistory(nextStack);
          }
        }
      } catch (e) {}
      handleUrlProductCheck();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [products]);

  const lastScrolledViewRef = useRef<string>(currentView);

  // Ensure view changes update localStorage and URL search params for 100% accurate refresh persistence
  useEffect(() => {
    if (lastScrolledViewRef.current !== currentView) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      lastScrolledViewRef.current = currentView;
    }
    try {
      localStorage.setItem('kenax_current_view', currentView);
      const url = new URL(window.location.href);

      if (currentView === 'home') {
        // Clean all route/product params on home view so refresh strictly stays on Home
        url.searchParams.delete('view');
        url.searchParams.delete('product');
        url.searchParams.delete('p');
        url.searchParams.delete('id');
        url.searchParams.delete('lp');
        url.searchParams.delete('landing');
        url.searchParams.delete('offer');
        url.searchParams.delete('tag');
        url.searchParams.delete('tab');
        url.searchParams.delete('orderId');
        localStorage.removeItem('kenax_landing_page_active');
        const cleanSearch = url.searchParams.toString() ? '?' + url.searchParams.toString() : '';
        window.history.replaceState(null, '', url.pathname + cleanSearch);
      } else if (currentView === 'seller-portal' || currentView === 'seller') {
        url.searchParams.delete('product');
        url.searchParams.delete('lp');
        url.searchParams.delete('landing');
        url.searchParams.delete('offer');
        url.searchParams.delete('tag');
        url.searchParams.delete('view');
        url.searchParams.set('portal', 'seller');
        document.title = siteSettings.storeName ? `Seller Dashboard - ${siteSettings.storeName}` : 'Seller Dashboard - KenaX BD';
        window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString());
      } else if (currentView === 'reseller-portal' || currentView === 'reseller') {
        url.searchParams.delete('product');
        url.searchParams.delete('lp');
        url.searchParams.delete('landing');
        url.searchParams.delete('offer');
        url.searchParams.delete('tag');
        url.searchParams.delete('view');
        url.searchParams.set('portal', 'reseller');
        document.title = siteSettings.storeName ? `Reseller Dashboard - ${siteSettings.storeName}` : 'Reseller Dashboard - KenaX BD';
        window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString());
      } else if (currentView === 'partner-login') {
        url.searchParams.delete('product');
        url.searchParams.delete('lp');
        url.searchParams.delete('landing');
        url.searchParams.delete('offer');
        url.searchParams.delete('tag');
        url.searchParams.delete('view');
        url.searchParams.set('portal', 'partner-login');
        document.title = 'Partner Login - KenaX BD Marketplace';
        window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString());
      } else if (currentView === 'admin-dashboard' || currentView === 'admin' || currentView === 'moderator-dashboard') {
        url.searchParams.delete('product');
        url.searchParams.delete('lp');
        url.searchParams.delete('landing');
        url.searchParams.delete('offer');
        url.searchParams.set('view', 'admin');
        document.title = 'Admin Portal - KenaX BD Management';
        window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString() + '#admin');
      } else if (currentView === 'product') {
        url.searchParams.delete('view');
        url.searchParams.delete('lp');
        url.searchParams.delete('landing');
        url.searchParams.delete('offer');
        url.searchParams.delete('tag');
        if (selectedProductForDetail?.id) {
          url.searchParams.set('product', selectedProductForDetail.id);
        }
        window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString());
      } else if (currentView === 'landing-page') {
        url.searchParams.delete('view');
        url.searchParams.delete('product');
        url.searchParams.delete('p');
        url.searchParams.delete('id');
        url.searchParams.delete('tag');
        if (selectedProductForDetail) {
          url.searchParams.set('lp', selectedProductForDetail.landingPage?.slug || selectedProductForDetail.id);
        }
        window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString());
      } else if (currentView.startsWith('tag:')) {
        url.searchParams.delete('product');
        url.searchParams.delete('lp');
        url.searchParams.delete('landing');
        url.searchParams.delete('offer');
        url.searchParams.delete('view');
        const tagName = currentView.replace(/^tag:/i, '').trim();
        url.searchParams.set('tag', tagName);
        window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString());
      } else if (currentView === 'shop') {
        url.searchParams.delete('product');
        url.searchParams.delete('lp');
        url.searchParams.delete('landing');
        url.searchParams.delete('offer');
        url.searchParams.delete('tag');
        url.searchParams.set('view', 'shop');
        if (selectedCategory && selectedCategory !== 'All') {
          url.searchParams.set('cat', selectedCategory);
        } else {
          url.searchParams.delete('cat');
          url.searchParams.delete('category');
        }
        window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString());
      } else if (currentView === 'auth' || currentView === 'login' || currentView === 'register') {
        url.searchParams.delete('product');
        url.searchParams.delete('lp');
        url.searchParams.delete('landing');
        url.searchParams.delete('offer');
        url.searchParams.delete('tag');
        url.searchParams.set('view', authPageTab === 'register' ? 'register' : 'login');
        window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString());
      } else if (currentView === 'checkout') {
        url.searchParams.delete('product');
        url.searchParams.delete('p');
        url.searchParams.delete('id');
        url.searchParams.delete('lp');
        url.searchParams.delete('landing');
        url.searchParams.delete('offer');
        url.searchParams.delete('tag');
        url.searchParams.set('view', 'checkout');
        window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString());
      } else {
        url.searchParams.delete('product');
        url.searchParams.delete('lp');
        url.searchParams.delete('landing');
        url.searchParams.delete('offer');
        url.searchParams.set('view', currentView);
        window.history.replaceState(null, '', url.pathname + '?' + url.searchParams.toString());
      }

      // Track Multi-Channel PageView (Meta Pixel, TikTok, GA4)
      trackPixelPageView(document.title, siteSettings);
    } catch {}
  }, [currentView, selectedProductForDetail?.id, selectedTag, selectedCategory, authPageTab, siteSettings]);

  // Horizontal scroll ref for shop category filter chips
  const categoryChipsRef = useRef<HTMLDivElement>(null);
  const scrollCategoryChips = (direction: 'left' | 'right') => {
    if (categoryChipsRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      categoryChipsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Horizontal scroll ref for subcategory filter chips
  const subcategoryChipsRef = useRef<HTMLDivElement>(null);
  const scrollSubcategoryChips = (direction: 'left' | 'right') => {
    if (subcategoryChipsRef.current) {
      const scrollAmount = direction === 'left' ? -240 : 240;
      subcategoryChipsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Horizontal scroll ref for 3rd-tier sub-subcategory filter chips
  const subSubcategoryChipsRef = useRef<HTMLDivElement>(null);
  const scrollSubSubcategoryChips = (direction: 'left' | 'right') => {
    if (subSubcategoryChipsRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      subSubcategoryChipsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Initial database fetch & seed with real-time listeners (Products, Orders, Settings, Categories, Cart Activities)
  useEffect(() => {
    let unsubscribeOrders: (() => void) | null = null;
    let unsubscribeProducts: (() => void) | null = null;
    let unsubscribeSettings: (() => void) | null = null;
    let unsubscribeCategories: (() => void) | null = null;
    let unsubscribeCartActivities: (() => void) | null = null;

    async function initDB() {
      // Seed if not done yet
      const seeded = localStorage.getItem('kenax_seeded_flag');
      if (!seeded) {
        await seedAllDataToFirestore();
      }

      // Fetch products from Firestore & local cache
      const dbProducts = await getProductsFromDB();
      if (dbProducts && dbProducts.length > 0) {
        setProducts(dbProducts);
      }

      // Fetch settings from Firestore
      const dbSettings = await getSettingsFromDB();
      if (dbSettings) {
        setSiteSettings((prev) => {
          const merged = sanitizeSiteSettings({ ...prev, ...dbSettings });
          safeSetLocalStorage('kenax_site_settings', JSON.stringify(merged));
          safeSetLocalStorage('kenax_settings_cache', JSON.stringify(merged));
          return merged;
        });
      }

      // Fetch categories from Firestore
      const dbCategories = await getCategoriesFromDB();
      if (dbCategories && dbCategories.length > 0) {
        setCategories(dbCategories);
      }

      unsubscribeProducts = subscribeToProducts((liveProducts) => {
        if (liveProducts && liveProducts.length > 0) {
          setProducts(liveProducts);
        }
      });

      unsubscribeSettings = subscribeToSettings((liveSettings) => {
        if (liveSettings) {
          setSiteSettings((prev) => {
            const merged = sanitizeSiteSettings({ ...prev, ...liveSettings });
            safeSetLocalStorage('kenax_site_settings', JSON.stringify(merged));
            safeSetLocalStorage('kenax_settings_cache', JSON.stringify(merged));
            return merged;
          });
        }
      });

      unsubscribeCategories = subscribeToCategories((liveCategories) => {
        if (liveCategories && liveCategories.length > 0) {
          setCategories(liveCategories);
        }
      });
    }

    initDB();

    const handleSyncOnNetworkOrPoll = async () => {
      try {
        const freshProducts = await getProductsFromDB();
        if (freshProducts && freshProducts.length > 0) {
          setProducts(freshProducts);
        }
        const freshSettings = await getSettingsFromDB();
        if (freshSettings) {
          setSiteSettings((prev) => {
            const merged = sanitizeSiteSettings({ ...prev, ...freshSettings });
            safeSetLocalStorage('kenax_site_settings', JSON.stringify(merged));
            safeSetLocalStorage('kenax_settings_cache', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (e) {}
    };

    const handleProductDeletedEvent = (e: any) => {
      const deletedId = e.detail;
      if (deletedId) {
        setProducts((prev) => prev.filter((p) => p.id !== deletedId));
      }
    };

    const handleSettingsUpdatedEvent = (e: any) => {
      const updated = e.detail;
      if (updated) {
        setSiteSettings((prev) => {
          const merged = sanitizeSiteSettings({ ...prev, ...updated });
          safeSetLocalStorage('kenax_site_settings', JSON.stringify(merged));
          safeSetLocalStorage('kenax_settings_cache', JSON.stringify(merged));
          return merged;
        });
      }
    };

    window.addEventListener('online', handleSyncOnNetworkOrPoll);
    window.addEventListener('kenax_product_deleted', handleProductDeletedEvent);
    window.addEventListener('kenax_settings_updated', handleSettingsUpdatedEvent);
    const syncInterval = setInterval(handleSyncOnNetworkOrPoll, 10000);

    return () => {
      window.removeEventListener('online', handleSyncOnNetworkOrPoll);
      window.removeEventListener('kenax_product_deleted', handleProductDeletedEvent);
      window.removeEventListener('kenax_settings_updated', handleSettingsUpdatedEvent);
      clearInterval(syncInterval);
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeCategories) unsubscribeCategories();
      if (unsubscribeCartActivities) unsubscribeCartActivities();
    };
  }, []);

  // Preload product thumbnail images in the background for zero-latency card renders
  useEffect(() => {
    if (products && products.length > 0) {
      preloadProductThumbnailBatch(products);
    }
  }, [products]);

  // Fetch customer-specific orders and fresh customer profile whenever customer logs in or is active
  useEffect(() => {
    if (currentCustomer?.id) {
      // 1. Fetch orders
      fetchCustomerOrdersFromDB(currentCustomer).then((custOrders) => {
        if (custOrders && custOrders.length > 0) {
          setOrders((prev) => {
            const merged = [...custOrders];
            prev.forEach((o) => {
              if (!merged.some((m) => m.id === o.id)) {
                merged.push(o);
              }
            });
            return merged;
          });
        }
      }).catch((e) => console.warn('Sync customer orders error:', e));

      // 2. Fetch fresh customer document directly from Cloud Firestore for cross-device consistency
      fetchCustomerRecordFromDB(currentCustomer.id).then((freshCust) => {
        if (freshCust) {
          const custAddrs = freshCust.addresses || freshCust.savedAddresses;
          if (custAddrs && custAddrs.length > 0) {
            setSavedAddresses((prev) => {
              // Merge saved addresses without duplicates
              let currentList = prev;
              custAddrs.forEach((a) => {
                const { addresses } = addAddressWithoutDuplicates(currentList, a);
                currentList = addresses;
              });
              return currentList;
            });
          }
          if (freshCust.wishlist && freshCust.wishlist.length > 0) {
            setWishlist((prevWish) => (prevWish.length === 0 ? freshCust.wishlist! : prevWish));
          }
          if (freshCust.cart && freshCust.cart.length > 0) {
            setCart((prevCart) => (prevCart.length === 0 ? sanitizeCart(freshCust.cart!) : prevCart));
          }
        }
      }).catch((e) => console.warn('Sync customer profile error:', e));
    }
  }, [currentCustomer?.id]);

  // Real-time synchronization for Authorized Staff Only (Completely isolated from regular public store customers)
  useEffect(() => {
    const isStaffLoggedIn = Boolean(
      currentStaff && ['super_admin', 'admin', 'manager', 'moderator'].includes(currentStaff.role)
    );
    if (!isStaffLoggedIn) {
      return;
    }

    let isMounted = true;
    let unsubOrders: (() => void) | null = null;
    let unsubCartActivities: (() => void) | null = null;

    // Fetch store orders and cart activities for authenticated staff
    getOrdersFromDB().then((dbOrders) => {
      if (isMounted && dbOrders) {
        setOrders(dbOrders);
      }
    });

    unsubOrders = subscribeToOrders((liveOrders) => {
      if (isMounted && liveOrders) {
        setOrders(liveOrders);
      }
    });

    getCartActivitiesFromDB().then((dbCartActivities) => {
      if (isMounted && dbCartActivities) {
        setCartActivities(dbCartActivities);
      }
    });

    unsubCartActivities = subscribeToCartActivities((liveCartActivities) => {
      if (isMounted && liveCartActivities) {
        setCartActivities(liveCartActivities);
      }
    });

    return () => {
      isMounted = false;
      if (unsubOrders) unsubOrders();
      if (unsubCartActivities) unsubCartActivities();
    };
  }, [currentStaff?.id, currentStaff?.role]);

  // Real-time cart tracking synchronization for Staff (Admin, Manager, Moderator)
  const syncCartActivity = async (updatedItems: OrderItem[], actionProduct?: Product) => {
    const cartActivityId = currentCustomer ? `cart-user-${currentCustomer.id}` : `cart-${visitorSessionId}`;
    const now = new Date().toISOString();

    const activityItems: CartActivityItem[] = updatedItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId) || actionProduct;
      // Strip heavy base64 strings from cart activity history to preserve browser memory & storage
      let img = item.productImage || prod?.images[0] || '';
      if (typeof img === 'string' && img.startsWith('data:') && img.length > 500) {
        const remoteFallback = prod?.images?.find((u) => !u.startsWith('data:'));
        img = remoteFallback || '';
      }
      return {
        productId: item.productId,
        name: item.productName,
        price: item.price,
        originalPrice: prod?.originalPrice,
        quantity: item.quantity,
        image: img,
        sku: prod?.sku || 'SKU-GEN',
        category: prod?.category,
        subcategory: prod?.subcategory,
        brand: prod?.brand,
        supplierUrl: prod?.supplierUrl, // Dropshipping / Sourcing Link strictly visible to staff!
        addedAt: now,
      };
    });

    const totalQty = updatedItems.reduce((sum, it) => sum + it.quantity, 0);
    const totalVal = updatedItems.reduce((sum, it) => sum + it.total, 0);

    const existing = cartActivities.find((c) => c.id === cartActivityId);
    const activityPayload: CartActivity = {
      id: cartActivityId,
      userId: currentCustomer?.id,
      customerName: currentCustomer ? currentCustomer.name : `Guest Visitor (${visitorSessionId.slice(-4)})`,
      customerEmail: currentCustomer ? currentCustomer.email : `visitor-${visitorSessionId.slice(-4)}@guest.bd`,
      customerPhone: currentCustomer?.mobile,
      userType: currentCustomer ? 'registered' : 'guest',
      items: activityItems,
      totalItems: totalQty,
      totalAmount: totalVal,
      status: totalQty > 0 ? 'active' : 'abandoned',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    setCartActivities((prev) => {
      if (totalQty === 0 || activityItems.length === 0) {
        return prev.filter((c) => c.id !== cartActivityId);
      }
      const idx = prev.findIndex((c) => c.id === cartActivityId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = activityPayload;
        return next;
      }
      return [activityPayload, ...prev];
    });

    if (totalQty > 0 && activityItems.length > 0) {
      await saveCartActivityToDB(activityPayload);

      // Automated Add-to-Cart Notification (Customer reminder & Staff lead alert)
      if (actionProduct) {
        const recipientEmail = currentCustomer?.email || (activityPayload.customerEmail.includes('@guest.bd') ? null : activityPayload.customerEmail);
        if (recipientEmail) {
          triggerAddToCartWorkflow(
            {
              name: currentCustomer?.name || activityPayload.customerName,
              email: recipientEmail,
              mobile: currentCustomer?.mobile || activityPayload.customerPhone || '',
            },
            actionProduct,
            totalQty,
            totalVal
          ).catch((err) => console.warn('[Add to Cart Email Workflow Warning]:', err));
        }
      }
    }
  };

  // Cart Management
  const handleAddToCart = (product: Product, quantity = 1, variant?: string, customImage?: string) => {
    let exactImage =
      (customImage && customImage.trim() !== '')
        ? customImage
        : (product.images && product.images.find((img) => typeof img === 'string' && img.trim() !== '')) ||
          (product.colors && product.colors.find((c) => c.imageUrl && c.imageUrl.trim() !== '')?.imageUrl) ||
          '';

    // Extract selected color and selectedColorImage if available
    let detectedColor: string | undefined = undefined;
    let detectedColorImage: string | undefined = undefined;
    if (product.colors && product.colors.length > 0) {
      if (customImage) {
        const matchByImg = product.colors.find((c) => c.imageUrl && c.imageUrl === customImage);
        if (matchByImg) {
          detectedColor = matchByImg.name;
          detectedColorImage = matchByImg.imageUrl;
        }
      }
      if (!detectedColor && variant) {
        const firstPart = variant.split('/')[0]?.trim().toLowerCase();
        const matchByName = product.colors.find((c) => (c.name || '').trim().toLowerCase() === firstPart);
        if (matchByName) {
          detectedColor = matchByName.name;
          detectedColorImage = matchByName.imageUrl;
        }
      }
    }

    // If exactImage is a media:// reference, trigger async resolution and cache into cart/localStorage
    if (exactImage && exactImage.startsWith('media://productImageMedia/')) {
      resolveOriginalImageMedia(exactImage).then((resolved) => {
        if (resolved && !resolved.startsWith('media://')) {
          setCart((prev) =>
            prev.map((item) =>
              item.productId === product.id && item.variant === variant
                ? { ...item, productImage: resolved, selectedColorImage: detectedColorImage || resolved }
                : item
            )
          );
        }
      });
    }

    let nextCart: OrderItem[] = [];
    setCart((prev) => {
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        productImage: customImage || detectedColorImage || exactImage,
        selectedColor: detectedColor,
        selectedColorImage: detectedColorImage || (customImage && customImage.trim() !== '' ? customImage : undefined),
        quantity,
        price: product.price,
        total: product.price * quantity,
        variant,
      };
      nextCart = sanitizeCart([...prev, newItem]);
      return nextCart;
    });

    setIsCartOpen(true);
    syncCartActivity(nextCart, product);
    recordProductAction(product.id, 'add_to_cart', quantity);

    // Multi-Channel AddToCart tracking (Meta Pixel, CAPI, TikTok, GA4)
    trackPixelAddToCart(product, quantity, variant, siteSettings);
  };

  const handleBuyNow = (product: Product, quantity = 1, variant?: string, customImage?: string, orderSource = 'manual') => {
    setCheckoutOrderSource(orderSource);
    recordProductAction(product.id, 'buy_now', quantity);
    let exactImage =
      (customImage && customImage.trim() !== '')
        ? customImage
        : (product.images && product.images.find((img) => typeof img === 'string' && img.trim() !== '')) ||
          (product.colors && product.colors.find((c) => c.imageUrl && c.imageUrl.trim() !== '')?.imageUrl) ||
          '';

    let detectedColor: string | undefined = undefined;
    let detectedColorImage: string | undefined = undefined;
    if (product.colors && product.colors.length > 0) {
      if (customImage) {
        const matchByImg = product.colors.find((c) => c.imageUrl && c.imageUrl === customImage);
        if (matchByImg) {
          detectedColor = matchByImg.name;
          detectedColorImage = matchByImg.imageUrl;
        }
      }
      if (!detectedColor && variant) {
        const firstPart = variant.split('/')[0]?.trim().toLowerCase();
        const matchByName = product.colors.find((c) => (c.name || '').trim().toLowerCase() === firstPart);
        if (matchByName) {
          detectedColor = matchByName.name;
          detectedColorImage = matchByName.imageUrl;
        }
      }
    }

    if (exactImage && exactImage.startsWith('media://productImageMedia/')) {
      resolveOriginalImageMedia(exactImage).then((resolved) => {
        if (resolved && !resolved.startsWith('media://')) {
          setCheckoutItems((prev) =>
            prev.map((item) =>
              item.productId === product.id && item.variant === variant
                ? { ...item, productImage: resolved, selectedColorImage: detectedColorImage || resolved }
                : item
            )
          );
        }
      });
    }

    const singleItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      productImage: customImage || detectedColorImage || exactImage,
      selectedColor: detectedColor,
      selectedColorImage: detectedColorImage || (customImage && customImage.trim() !== '' ? customImage : undefined),
      quantity,
      price: product.price,
      total: product.price * quantity,
      variant: variant || undefined,
    };

    checkoutItemsRef.current = [singleItem];
    setCheckoutItems([singleItem]);
    if (currentView !== 'checkout') {
      setReturnViewAfterCheckout(currentView);
    }
    setIsCartOpen(false);
    setIsAIAssistantOpen(false);
    setSelectedProductForDetail(null);
    setCurrentView('checkout');
    setIsCheckoutOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    let nextCart: OrderItem[] = [];
    setCart((prev) => {
      nextCart = prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity, total: quantity * item.price }
          : item
      );
      return nextCart;
    });
    syncCartActivity(nextCart);
  };

  const handleRemoveCartItem = (productId: string) => {
    let nextCart: OrderItem[] = [];
    setCart((prev) => {
      nextCart = prev.filter((item) => item.productId !== productId);
      return nextCart;
    });
    setCheckoutItems((prev) => prev.filter((item) => item.productId !== productId));
    syncCartActivity(nextCart);
  };

  const handleUpdateCartItem = (productId: string, updates: Partial<OrderItem>) => {
    let nextCart: OrderItem[] = [];
    setCart((prev) => {
      nextCart = prev.map((item) =>
        item.productId === productId ? { ...item, ...updates } : item
      );
      return nextCart;
    });

    setCheckoutItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, ...updates } : item
      )
    );

    syncCartActivity(nextCart);
  };

  const handleToggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        recordProductAction(product.id, 'unfavorite');
        return prev.filter((p) => p.id !== product.id);
      } else {
        recordProductAction(product.id, 'favorite');
        return [...prev, product];
      }
    });
  };

  // Coupon handling
  const handleApplyCoupon = (code: string): boolean => {
    const coupon = INITIAL_COUPONS.find(
      (c) => c.code.toUpperCase() === code.toUpperCase() && c.isActive
    );
    if (!coupon) return false;

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (subtotal < coupon.minSpend) {
      alert(`Minimum spend of ৳${coupon.minSpend} required for coupon ${coupon.code}`);
      return false;
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }

    setAppliedCoupon(coupon.code);
    setDiscountAmount(Math.round(discount));
    return true;
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
    setCheckoutOrderSource('manual');
    const itemsToSave = checkoutItemsRef.current;
    if (itemsToSave && itemsToSave.length > 0 && currentView !== 'checkout') {
      setCart((prev) => {
        const next = sanitizeCart([...prev, ...itemsToSave]);
        syncCartActivity(next);
        return next;
      });
    }
    checkoutItemsRef.current = [];
    setCheckoutItems([]);
    if (currentView === 'checkout') {
      setCurrentView(returnViewAfterCheckout || 'home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Order Placement Handler
  const handleOrderPlaced = async (newOrder: Order) => {
    // Reset checkout items ref immediately to prevent restoring ordered items to cart
    checkoutItemsRef.current = [];
    setCheckoutItems([]);
    setIsCheckoutOpen(false);
    if (currentView === 'checkout') {
      setCurrentView('home');
    }

    // Immediately launch the delivery van animation for instant visual feedback on both Desktop/PC and Mobile
    processingOrderRef.current = newOrder;
    setProcessingOrder(newOrder);
    setIsProcessingAnimationOpen(true);

    setOrders((prev) => [newOrder, ...prev]);

    // Clean up ordered items from cart (whether direct Buy Now or combined with cart items)
    const orderedKeys = new Set(
      (newOrder.items || []).map((i) => `${i.productId}_${i.variant || ''}`)
    );
    const orderedProductIds = new Set((newOrder.items || []).map((i) => i.productId));

    setCart((prev) => {
      const remaining = prev.filter(
        (i) => !orderedKeys.has(`${i.productId}_${i.variant || ''}`) && !orderedProductIds.has(i.productId)
      );
      safeSetLocalStorage('kenax_cart', JSON.stringify(remaining));
      safeSetLocalStorage(getEnvStorageKey('kenax_cart'), JSON.stringify(remaining));
      syncCartActivity(remaining);
      return remaining;
    });
    setAppliedCoupon(null);
    setDiscountAmount(0);

    // Track product order popularity
    (newOrder.items || []).forEach((it) => {
      const pId = it.productId || (it as any).id;
      if (pId) {
        recordProductAction(pId, 'buy_now', it.quantity || 1);
      }
    });

    // Auto-save order delivery location to customer's saved addresses (preventing duplicates)
    if (newOrder.fullAddress && newOrder.fullAddress.trim().length > 3) {
      const orderDeliveryAddr: DeliveryAddress = {
        id: 'addr-' + Date.now(),
        label: 'Home / Delivery',
        fullName: newOrder.deliveryName || newOrder.customerName,
        recipientName: newOrder.deliveryName || newOrder.customerName,
        mobileNumber: newOrder.deliveryMobile || newOrder.customerMobile,
        recipientPhone: newOrder.deliveryMobile || newOrder.customerMobile,
        division: newOrder.division,
        district: newOrder.district,
        upazila: newOrder.upazila,
        area: newOrder.area,
        houseRoad: newOrder.houseRoad,
        fullAddress: newOrder.fullAddress,
        postalCode: newOrder.postalCode,
        deliveryInstructions: newOrder.deliveryInstructions,
        isDefault: false,
      };

      setSavedAddresses((prev) => {
        const { addresses } = addAddressWithoutDuplicates(prev, orderDeliveryAddr);
        return addresses;
      });

      if (currentCustomer) {
        const currentAddrs = currentCustomer.addresses || currentCustomer.savedAddresses || [];
        const { addresses: updatedAddrs } = addAddressWithoutDuplicates(currentAddrs, orderDeliveryAddr);
        const currentOrderIds = currentCustomer.orderIds || [];
        const updatedOrderIds = currentOrderIds.includes(newOrder.id) ? currentOrderIds : [newOrder.id, ...currentOrderIds];
        const updatedCust: CustomerRecord = {
          ...currentCustomer,
          addresses: updatedAddrs,
          savedAddresses: updatedAddrs,
          orderIds: updatedOrderIds,
          totalOrders: (currentCustomer.totalOrders || 0) + 1,
          ordersCount: ((currentCustomer.ordersCount || currentCustomer.totalOrders) || 0) + 1,
          totalSpent: (currentCustomer.totalSpent || 0) + newOrder.totalAmount,
          lastOrderDate: newOrder.createdAt,
        };
        setCurrentCustomer(updatedCust);
        safeSetLocalStorage('kenax_current_customer', JSON.stringify(updatedCust));
        safeSetLocalStorage(getEnvStorageKey('kenax_current_customer'), JSON.stringify(updatedCust));
        saveCustomerToDB(updatedCust).catch((err) => console.warn('Sync customer order address:', err));
      }
    } else if (currentCustomer) {
      const currentOrderIds = currentCustomer.orderIds || [];
      const updatedOrderIds = currentOrderIds.includes(newOrder.id) ? currentOrderIds : [newOrder.id, ...currentOrderIds];
      const updatedCust: CustomerRecord = {
        ...currentCustomer,
        orderIds: updatedOrderIds,
        totalOrders: (currentCustomer.totalOrders || 0) + 1,
        ordersCount: ((currentCustomer.ordersCount || currentCustomer.totalOrders) || 0) + 1,
        totalSpent: (currentCustomer.totalSpent || 0) + newOrder.totalAmount,
        lastOrderDate: newOrder.createdAt,
      };
      setCurrentCustomer(updatedCust);
      safeSetLocalStorage('kenax_current_customer', JSON.stringify(updatedCust));
      safeSetLocalStorage(getEnvStorageKey('kenax_current_customer'), JSON.stringify(updatedCust));
      saveCustomerToDB(updatedCust).catch((err) => console.warn('Sync customer order record:', err));
    }

    // Persist to Cloud Firestore and local storage in background (non-blocking)
    try {
      await saveOrderToDB(newOrder);
      
      // Dispatch Order Placed (Pending) Email to Customer and New Order Alerts to Staff & Super Admin
      triggerOrderPlacedWorkflow(newOrder).catch((emailErr) => {
        console.warn('[Order Placed Email Workflow Warning]:', emailErr);
      });

      // Dispatch Order Placed SMS to Customer & Admin
      triggerOrderPlacedSMS(newOrder).catch((smsErr) => {
        console.warn('[Order Placed SMS Warning]:', smsErr);
      });

      // Dispatch Telegram Bot Alert to Admin, Staff & Customer (Pending status)
      triggerTelegramNewOrder(newOrder).catch((tgErr) => {
        console.warn('[Telegram New Order Alert Warning]:', tgErr);
      });

      // Dispatch Multi-Channel Purchase Event (Meta Pixel + Server-Side CAPI, TikTok, Google Ads)
      trackPixelPurchase(newOrder, siteSettings);
    } catch (err) {
      console.warn('[KenaX BD] Error persisting order to Firestore:', err);
    }

    // Convert active cart activity to converted!
    try {
      const cartActivityId = currentCustomer ? `cart-user-${currentCustomer.id}` : `cart-${visitorSessionId}`;
      await updateCartActivityStatusInDB(cartActivityId, 'converted');
      setCartActivities((prev) =>
        prev.map((c) =>
          c.id === cartActivityId ? { ...c, status: 'converted', updatedAt: new Date().toISOString() } : c
        )
      );
    } catch (err) {
      console.warn('[KenaX BD] Error updating cart activity status:', err);
    }
  };

  const handleProcessingAnimationComplete = (completedOrder?: Order | null) => {
    setIsProcessingAnimationOpen(false);
    const targetOrder = completedOrder || processingOrderRef.current || processingOrder;
    if (targetOrder) {
      setSuccessOrder(targetOrder);
      setIsSuccessModalOpen(true);
    }
  };

  // Customer & Staff Logout handlers
  const handleCustomerLogout = () => {
    setCurrentCustomer(null);
    setCurrentStaff(null);
    setCurrentRole('customer');
    localStorage.removeItem('kenax_current_customer');
    localStorage.removeItem('kenax_current_staff');
    localStorage.removeItem('kenax_cart');
    localStorage.removeItem('kenax_wishlist');
    localStorage.removeItem('kenax_saved_addresses');
    setCart([]);
    setWishlist([]);
    setSavedAddresses([]);
    setCurrentView('home');
  };

  const handleStaffLogout = () => {
    setCurrentStaff(null);
    setCurrentRole('customer');
    localStorage.removeItem('kenax_current_staff');
    localStorage.removeItem('kenax_authenticated_staff');
    localStorage.removeItem('kenax_authenticated_role');
    localStorage.removeItem('kenax_current_view');
    localStorage.removeItem('kenax_admin_active_tab');
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      url.searchParams.delete('tab');
      const cleanSearch = url.searchParams.toString() ? '?' + url.searchParams.toString() : '';
      window.history.replaceState(null, '', url.pathname + cleanSearch);
    } catch {}
    setCurrentView('home');
  };

  // Product addition by admin
  const handleAddProduct = async (newProduct: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === newProduct.id);
      if (exists) {
        return prev.map((p) => (p.id === newProduct.id ? newProduct : p));
      }
      return [newProduct, ...prev];
    });
    await saveProductToDB(newProduct);
  };

  // Product update by admin
  const handleUpdateProduct = async (updatedProduct: Product) => {
    const freshProduct: Product = {
      ...updatedProduct,
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => prev.map((p) => (p.id === freshProduct.id ? freshProduct : p)));
    await saveProductToDB(freshProduct);
  };

  // Product deletion
  const handleDeleteProduct = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    await deleteProductFromDB(productId);
  };

  // Category handlers for Admin
  const handleAddCategory = async (newCat: Category) => {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === newCat.id);
      const next = exists ? prev.map((c) => (c.id === newCat.id ? newCat : c)) : [...prev, newCat];
      try {
        localStorage.setItem('kenax_categories', JSON.stringify(next));
        localStorage.setItem('kenax_categories_cache', JSON.stringify(next));
      } catch {}
      return next;
    });
    await saveCategoryToDB(newCat);
  };

  const handleUpdateCategory = async (updatedCat: Category) => {
    const oldCat = categories.find((c) => c.id === updatedCat.id);
    setCategories((prev) => {
      const next = prev.map((c) => (c.id === updatedCat.id ? updatedCat : c));
      try {
        localStorage.setItem('kenax_categories', JSON.stringify(next));
        localStorage.setItem('kenax_categories_cache', JSON.stringify(next));
      } catch {}
      return next;
    });
    await saveCategoryToDB(updatedCat);

    // Cascade category name change to products if name changed
    if (oldCat && oldCat.name !== updatedCat.name) {
      setProducts((prev) => {
        const nextProducts = prev.map((p) =>
          p.category === oldCat.name ? { ...p, category: updatedCat.name, categorySlug: updatedCat.slug || p.categorySlug } : p
        );
        try {
          localStorage.setItem('kenax_products_cache', JSON.stringify(nextProducts));
        } catch {}
        return nextProducts;
      });
      products.filter((p) => p.category === oldCat.name).forEach((p) => {
        saveProductToDB({ ...p, category: updatedCat.name, categorySlug: updatedCat.slug || p.categorySlug }).catch(() => {});
      });
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    setCategories((prev) => {
      const next = prev.filter((c) => c.id !== catId);
      try {
        localStorage.setItem('kenax_categories', JSON.stringify(next));
        localStorage.setItem('kenax_categories_cache', JSON.stringify(next));
      } catch {}
      return next;
    });
    await deleteCategoryFromDB(catId);
  };

  const handleReorderCategories = async (newCats: Category[]) => {
    setCategories(newCats);
    try {
      localStorage.setItem('kenax_categories', JSON.stringify(newCats));
      localStorage.setItem('kenax_categories_cache', JSON.stringify(newCats));
    } catch {}
    for (const c of newCats) {
      await saveCategoryToDB(c);
    }
  };

  // Status updates by admin
  const handleUpdateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    courier?: string,
    tracking?: string,
    handledByStaff?: { id?: string; name?: string; role?: string },
    adminNotes?: string
  ) => {
    const existing = orders.find((o) => o.id === orderId);
    const nowISO = new Date().toISOString();
    const currentTimeline = existing?.timeline || [];
    const updatedTimeline = [...currentTimeline];

    const activeStaffName = handledByStaff?.name || currentStaff?.name || 'Staff Admin';
    const activeStaffRole = handledByStaff?.role || currentStaff?.role || 'Super Admin';
    const activeStaffId = handledByStaff?.id || currentStaff?.id || '';

    updatedTimeline.push({
      status,
      timestamp: nowISO,
      note: `Status updated to ${status}${courier ? ` via ${courier}` : ''}${tracking ? ` (Tracking: ${tracking})` : ''}${adminNotes ? ` | Note: ${adminNotes}` : ''}`,
      updatedBy: activeStaffName,
    });

    const isConfirming =
      status === 'Confirmed' ||
      (status !== 'Pending' &&
        status !== 'Payment Verification' &&
        status !== 'Cancelled' &&
        status !== 'Rejected' &&
        status !== 'Fake Order' &&
        !existing?.confirmedByStaffName);

    const confirmedByStaffName = isConfirming
      ? existing?.confirmedByStaffName || activeStaffName
      : existing?.confirmedByStaffName;
    const confirmedByStaffId = isConfirming
      ? existing?.confirmedByStaffId || activeStaffId
      : existing?.confirmedByStaffId;
    const confirmedByStaffRole = isConfirming
      ? existing?.confirmedByStaffRole || activeStaffRole
      : existing?.confirmedByStaffRole;
    const confirmedAt = isConfirming
      ? existing?.confirmedAt || nowISO
      : existing?.confirmedAt;

    const isDeliveredOrCompleted = status === 'Delivered' || status === 'Completed';
    const isReturnedStatus = status === 'Returned';

    // If order is Delivered or Completed (COD or any pending bill), mark the bill as fully Paid and dueAmount as 0
    // If order is Returned, mark as Unpaid
    let paymentUpdates: Partial<Order> = {};
    if (isDeliveredOrCompleted) {
      paymentUpdates = {
        paymentStatus: 'Paid',
        paidAmount: existing?.totalAmount || 0,
        dueAmount: 0,
        paymentVerifiedAt: existing?.paymentVerifiedAt || nowISO,
      };
    } else if (isReturnedStatus) {
      paymentUpdates = {
        paymentStatus: 'Unpaid',
        paidAmount: 0,
        dueAmount: existing?.totalAmount || 0,
      };
    }

    const updates: Partial<Order> = {
      orderStatus: status,
      status: status as any,
      isFakeOrder: status === 'Fake Order' ? true : false,
      isV2Order: true,
      courierName: courier || existing?.courierName,
      trackingNumber: tracking || existing?.trackingNumber,
      adminNotes: adminNotes !== undefined ? adminNotes : existing?.adminNotes,
      timeline: updatedTimeline,
      updatedAt: nowISO,
      handledByStaffId: activeStaffId,
      handledByStaffName: activeStaffName,
      handledByStaffRole: activeStaffRole,
      confirmedByStaffId,
      confirmedByStaffName,
      confirmedByStaffRole,
      confirmedAt,
      ...paymentUpdates,
    };

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
    );
    await updateOrderInDB(orderId, updates);

    // Trigger Automated SMS & WhatsApp notification to Customer & Pinned Admin for status change
    if (existing) {
      const updatedOrder: Order = {
        ...existing,
        ...updates,
      };

      // If marked as Fake Order: Dispatch high-priority alert across WhatsApp, Telegram, and Email
      if (status === 'Fake Order') {
        dispatchFakeOrderAlerts({
          order: updatedOrder,
          staff: {
            name: activeStaffName,
            role: activeStaffRole,
            id: activeStaffId,
          },
          note: adminNotes || 'Marked as Fake Order by Staff',
        }).catch((err) => {
          console.warn('[Dispatch Fake Order Alerts Error]:', err);
        });
      }

      triggerOrderStatusSMS(updatedOrder, status).catch((err) => {
        console.warn('[Order Status SMS Warning]:', err);
      });
      triggerTelegramOrderStatusChange({
        order: updatedOrder,
        prevStatus: existing.orderStatus || 'Pending',
        newStatus: status,
        staffUser: activeStaffName ? {
          id: activeStaffId,
          name: activeStaffName,
          role: activeStaffRole as any,
          email: '',
        } : null,
        courierName: courier,
        trackingNumber: tracking,
      }).catch((tgErr) => {
        console.warn('[Telegram Status Change Warning]:', tgErr);
      });
      triggerWhatsAppEvent({
        event: status === 'Fake Order' ? ('admin_pinned_fake_order_alert' as any) : 'order_status_changed',
        order: updatedOrder,
        customerPhone: updatedOrder.customerMobile || updatedOrder.deliveryMobile,
        user: {
          name: updatedOrder.customerName || updatedOrder.deliveryName,
          email: updatedOrder.customerEmail || '',
          phone: updatedOrder.customerMobile || updatedOrder.deliveryMobile,
          id: updatedOrder.customerId,
        },
        statusChange: {
          oldStatus: existing.orderStatus,
          newStatus: status,
        },
        staff: {
          name: activeStaffName,
          role: activeStaffRole,
          id: activeStaffId,
        },
      }).catch((waErr) => {
        console.warn('[WhatsApp Order Status Event Error]:', waErr);
      });
    }
  };

  // Manual order creation by Staff (Admin, Moderator, Manager) or Customer Bot
  const handleAddOrder = async (newOrder: Order) => {
    const rawStatus = (newOrder.orderStatus || (newOrder as any).status || 'Pending').toString().trim();
    const lower = rawStatus.toLowerCase();
    const normalizedStatus: OrderStatus =
      lower === 'pending'
        ? 'Pending'
        : lower === 'confirmed'
        ? 'Confirmed'
        : lower === 'cancelled'
        ? 'Cancelled'
        : lower === 'delivered'
        ? 'Delivered'
        : ((rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)) as OrderStatus);

    const isBot = newOrder.orderSource === 'chatbot' || newOrder.orderSource === 'ai_bot';
    const sanitizedOrder: Order = {
      ...newOrder,
      orderStatus: normalizedStatus,
      status: normalizedStatus as any,
      isV2Order: true,
      orderSource: isBot ? 'chatbot' : (newOrder.orderSource || 'manual'),
      isAiBotOrder: isBot,
      createdByStaffName: isBot
        ? 'Ordered by KenaX Bot'
        : newOrder.createdByStaffName === 'Ordered by KenaX Bot'
        ? undefined
        : newOrder.createdByStaffName,
    };
    setOrders((prev) => [sanitizedOrder, ...prev.filter((o) => o.id !== sanitizedOrder.id)]);
    await saveOrderToDB(sanitizedOrder);
    triggerTelegramNewOrder(newOrder).catch((tgErr) => {
      console.warn('[Telegram Manual Order Alert Warning]:', tgErr);
    });
    triggerWhatsAppEvent({
      event: 'order_placed',
      order: newOrder,
      customerPhone: newOrder.customerMobile || newOrder.deliveryMobile,
      user: {
        name: newOrder.customerName || newOrder.deliveryName,
        email: newOrder.customerEmail || '',
        phone: newOrder.customerMobile || newOrder.deliveryMobile,
        id: newOrder.customerId,
      },
    }).catch((waErr) => {
      console.warn('[WhatsApp Manual Order Alert Error]:', waErr);
    });
  };

  // Filter products for Home Sections
  const getHomeFilteredProducts = () => {
    let list = [...products];
    if (selectedHomeTab === 'trending') {
      list = products.filter((p) => p.isTrending || p.saleBadge === 'Trending');
    } else if (selectedHomeTab === 'electronics') {
      list = products.filter((p) => p.category === 'Electronics & Gadgets');
    } else if (selectedHomeTab === 'fashion') {
      list = products.filter((p) => p.category === 'Fashion & Clothing');
    } else if (selectedHomeTab === 'home') {
      list = products.filter((p) => p.category === 'Home & Living');
    } else if (selectedHomeTab === 'bestsellers') {
      list = products.filter((p) => p.isBestSeller || p.saleBadge === 'Best Seller');
    }
    return sortProductsByPagePriority(list, 'home');
  };

  // Filter products for Shop Page
  const getShopFilteredProducts = () => {
    let list = [...products];

    if (selectedCategory !== 'All') {
      const catTrim = selectedCategory.trim().toLowerCase();
      list = list.filter((p) => {
        if (!p.category) return false;
        const pCat = p.category.trim().toLowerCase();
        // Direct category match
        if (
          pCat === catTrim ||
          pCat.replace(/ & /g, ' and ') === catTrim.replace(/ & /g, ' and ') ||
          pCat.replace(/ and /g, ' & ') === catTrim.replace(/ and /g, ' & ')
        ) {
          return true;
        }

        // Hierarchical match: if selectedCategory corresponds to a category in categories list,
        // also match products having subcategories or subSubcategories in that group
        const catObj = categories.find((c) => {
          const cName = c.name.trim().toLowerCase();
          return (
            cName === catTrim ||
            cName.replace(/ & /g, ' and ') === catTrim.replace(/ & /g, ' and ') ||
            cName.replace(/ and /g, ' & ') === catTrim.replace(/ and /g, ' & ') ||
            c.slug.toLowerCase() === catTrim
          );
        });

        if (catObj && catObj.subcategories) {
          const matchedInSub = catObj.subcategories.some((sub) => {
            const subName = (typeof sub === 'string' ? sub : sub.name).toLowerCase();
            if (pCat === subName || (p.subcategory && p.subcategory.toLowerCase() === subName)) {
              return true;
            }
            if (typeof sub === 'object' && sub.subSubcategories) {
              return sub.subSubcategories.some((child) => {
                const childLower = child.toLowerCase();
                return (
                  pCat === childLower ||
                  (p.subSubcategory && p.subSubcategory.toLowerCase() === childLower) ||
                  (p.childSubcategory && p.childSubcategory.toLowerCase() === childLower)
                );
              });
            }
            return false;
          });
          if (matchedInSub) return true;
        }

        return false;
      });
    }

    if (selectedSubcategory !== 'All') {
      list = list.filter((p) => p.subcategory === selectedSubcategory);
    }

    if (selectedSubSubcategory !== 'All') {
      const target = selectedSubSubcategory.toLowerCase();
      list = list.filter((p) => {
        const direct = (p.subSubcategory || p.childSubcategory || '').toLowerCase();
        if (direct === target) return true;
        if (p.tags && p.tags.some((t) => t.toLowerCase() === target)) return true;
        if (p.name.toLowerCase().includes(target)) return true;
        if (p.description && p.description.toLowerCase().includes(target)) return true;
        return false;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.banglaName && p.banglaName.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) || // Support SKU / serial number search!
          p.category.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
          (p.subSubcategory && p.subSubcategory.toLowerCase().includes(q)) ||
          (p.childSubcategory && p.childSubcategory.toLowerCase().includes(q)) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    if (sortBy === 'price-low') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else {
      let pageContext = 'shop';
      if (selectedCategory && selectedCategory !== 'All') {
        pageContext = `category:${selectedCategory}`;
      }
      list = sortProductsByPagePriority(list, pageContext);
    }

    return list;
  };

  // Memoized filtered product lists to prevent heavy recalculations on mobile
  const homeFilteredProducts = useMemo(() => {
    return getHomeFilteredProducts();
  }, [products, selectedHomeTab]);

  const shopFilteredProducts = useMemo(() => {
    return getShopFilteredProducts();
  }, [products, selectedCategory, selectedSubcategory, selectedSubSubcategory, searchQuery, sortBy, categories]);

  const handleNavigateToStoreFromAdmin = () => {
    // Admin "View Store" Restriction:
    // When an admin navigates from the admin dashboard to the storefront, they only see the store from their own
    // account and cannot access or manipulate other customers' accounts or private data.
    if (currentStaff) {
      const adminCustomerProfile: CustomerRecord = {
        id: `staff-cust-${currentStaff.id}`,
        name: currentStaff.name,
        email: currentStaff.email,
        mobile: currentStaff.phone || '01700000000',
        totalOrders: orders.filter(
          (o) => o.customerId === `staff-cust-${currentStaff.id}` || o.customerEmail === currentStaff.email
        ).length,
        totalSpent: 0,
        isBlocked: false,
        status: 'active',
        registeredAt: currentStaff.createdAt,
        createdAt: currentStaff.createdAt,
      };
      setCurrentCustomer(adminCustomerProfile);
      localStorage.setItem('kenax_current_customer', JSON.stringify(adminCustomerProfile));
    }
    localStorage.setItem('kenax_current_view', 'home');
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      url.searchParams.delete('tab');
      const cleanSearch = url.searchParams.toString() ? '?' + url.searchParams.toString() : '';
      window.history.replaceState(null, '', url.pathname + cleanSearch);
    } catch {}
    setCurrentView('home');
  };

  const isAdminView =
    currentView === 'admin-dashboard' ||
    currentView === 'moderator-dashboard' ||
    currentView === 'admin';

  const isStaff =
    Boolean(currentStaff) &&
    ['super_admin', 'admin', 'manager', 'moderator'].includes(currentStaff.role);

  if (isAdminView) {
    if (!isStaff) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Staff Authentication Required</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Access to the Admin, Manager, and Moderator dashboards is restricted to authorized personnel only. Customer accounts cannot view internal store data.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <button
                onClick={() => setIsAdminLoginOpen(true)}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Staff Sign In</span>
              </button>
              <button
                onClick={handleNavigateToStoreFromAdmin}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Return to Store
              </button>
            </div>
          </div>
          <AdminLoginModal
            isOpen={isAdminLoginOpen}
            onClose={() => setIsAdminLoginOpen(false)}
            onLoginSuccess={(staff) => {
              setCurrentStaff(staff);
              setCurrentRole(staff.role);
              localStorage.setItem('kenax_current_staff', JSON.stringify(staff));
              setIsAdminLoginOpen(false);
              setCurrentView('admin-dashboard');
            }}
            staffList={staffList}
          />
        </div>
      );
    }

    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-xl shadow-sky-500/5">
                <ShieldCheck className="w-8 h-8 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">Loading Admin Portal...</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Verifying staff credentials and loading management console
                </p>
              </div>
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-sky-500 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          </div>
        }
      >
        <AdminPortal
          products={products}
          orders={orders}
          settings={siteSettings}
          categories={categories}
          onAddCategory={handleAddCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onReorderCategories={handleReorderCategories}
          cartActivities={cartActivities}
          onUpdateCartActivityStatus={async (cartId, status) => {
            await updateCartActivityStatusInDB(cartId, status);
            setCartActivities((prev) =>
              prev.map((c) => (c.id === cartId ? { ...c, status, updatedAt: new Date().toISOString() } : c))
            );
          }}
          onRefreshCartActivities={async () => {
            const fresh = await getCartActivitiesFromDB();
            if (fresh) setCartActivities(fresh);
          }}
          onUpdateProduct={handleUpdateProduct}
          onAddProduct={handleAddProduct}
          onDeleteProduct={handleDeleteProduct}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onAddOrder={handleAddOrder}
          onUpdateSettings={handleUpdateSettings}
          currentRole={currentStaff?.role || currentRole}
          currentStaff={currentStaff}
          onNavigateToStore={handleNavigateToStoreFromAdmin}
          onLogout={handleStaffLogout}
          initialTab={adminInitialTab}
          initialSettingsSubTab={adminInitialSettingsSubTab}
          staffList={staffList}
          onUpdateStaffList={(newList) => {
            setStaffList(newList);
            if (currentStaff) {
              const matched = newList.find(
                (s) => s.id === currentStaff.id || (s.email && currentStaff.email && s.email.toLowerCase() === currentStaff.email.toLowerCase())
              );
              if (matched) {
                setCurrentStaff(matched);
                const ser = JSON.stringify(matched);
                localStorage.setItem('kenax_current_staff', ser);
                localStorage.setItem('kenax_authenticated_staff', ser);
                localStorage.setItem('preview_kenax_current_staff', ser);
              }
            }
          }}
          onUpdateCurrentStaff={(updated) => {
            setCurrentStaff(updated);
            const ser = JSON.stringify(updated);
            localStorage.setItem('kenax_current_staff', ser);
            localStorage.setItem('kenax_authenticated_staff', ser);
            localStorage.setItem('preview_kenax_current_staff', ser);
          }}
          onRoleChange={(role) => {
            setCurrentRole(role);
            if (currentStaff) {
              const updated = { ...currentStaff, role };
              setCurrentStaff(updated);
              localStorage.setItem('kenax_current_staff', JSON.stringify(updated));
              localStorage.setItem('kenax_authenticated_staff', JSON.stringify(updated));
              localStorage.setItem('kenax_authenticated_role', role);
            }
          }}
          onNavigateToPartnerPortal={(partner) => {
            setCurrentPartner(partner);
            safeSetLocalStorage('kenax_current_partner', JSON.stringify(partner));
            if (partner.type === 'seller') {
              setCurrentView('seller-portal');
            } else {
              setCurrentView('reseller-portal');
            }
          }}
        />
      </React.Suspense>
    );
  }

  // ================= DEDICATED SELLER HUB (VENDOR PORTAL) =================
  if (currentView === 'seller-portal') {
    if (!currentPartner || currentPartner.type !== 'seller') {
      return (
        <React.Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
          <PartnerLoginPage
            initialRole="seller"
            onLoginSuccess={(p) => {
              setCurrentPartner(p);
              safeSetLocalStorage('kenax_current_partner', JSON.stringify(p));
              setCurrentView('seller-portal');
            }}
            onBackToStore={() => {
              setCurrentView('home');
              try {
                const url = new URL(window.location.href);
                url.searchParams.delete('portal');
                window.history.pushState(null, '', url.pathname);
              } catch {}
            }}
          />
        </React.Suspense>
      );
    }

    return (
      <React.Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs">Loading Seller Portal...</div>}>
        <SellerPortal
          currentPartner={currentPartner}
          products={products}
          orders={orders}
          onAddProduct={handleAddProduct}
          onUpdateProduct={handleUpdateProduct}
          onDeleteProduct={handleDeleteProduct}
          onLogout={() => {
            setCurrentPartner(null);
            localStorage.removeItem('kenax_current_partner');
            setCurrentView('home');
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('portal');
              window.history.pushState(null, '', url.pathname);
            } catch {}
          }}
          onNavigateToStore={() => {
            setCurrentView('home');
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('portal');
              window.history.pushState(null, '', url.pathname);
            } catch {}
          }}
        />
      </React.Suspense>
    );
  }

  // ================= DEDICATED RESELLER & DROPSHIP HUB =================
  if (currentView === 'reseller-portal') {
    if (!currentPartner || currentPartner.type !== 'reseller') {
      return (
        <React.Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
          <PartnerLoginPage
            initialRole="reseller"
            onLoginSuccess={(p) => {
              setCurrentPartner(p);
              safeSetLocalStorage('kenax_current_partner', JSON.stringify(p));
              setCurrentView('reseller-portal');
            }}
            onBackToStore={() => {
              setCurrentView('home');
              try {
                const url = new URL(window.location.href);
                url.searchParams.delete('portal');
                window.history.pushState(null, '', url.pathname);
              } catch {}
            }}
          />
        </React.Suspense>
      );
    }

    return (
      <React.Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs">Loading Reseller Portal...</div>}>
        <ResellerPortal
          currentPartner={currentPartner}
          products={products}
          orders={orders}
          onPlaceOrder={handleAddOrder}
          onLogout={() => {
            setCurrentPartner(null);
            localStorage.removeItem('kenax_current_partner');
            setCurrentView('home');
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('portal');
              window.history.pushState(null, '', url.pathname);
            } catch {}
          }}
          onNavigateToStore={() => {
            setCurrentView('home');
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('portal');
              window.history.pushState(null, '', url.pathname);
            } catch {}
          }}
        />
      </React.Suspense>
    );
  }

  // ================= DEDICATED PARTNER LOGIN VIEW =================
  if (currentView === 'partner-login') {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
        <PartnerLoginPage
          initialRole="seller"
          onLoginSuccess={(p) => {
            setCurrentPartner(p);
            safeSetLocalStorage('kenax_current_partner', JSON.stringify(p));
            if (p.type === 'seller') {
              setCurrentView('seller-portal');
            } else {
              setCurrentView('reseller-portal');
            }
          }}
          onBackToStore={() => {
            setCurrentView('home');
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('portal');
              window.history.pushState(null, '', url.pathname);
            } catch {}
          }}
        />
      </React.Suspense>
    );
  }

  const isMaintenanceActive = Boolean(siteSettings.maintenanceMode?.enabled);
  const isStaffUser = Boolean(
    currentStaff ||
    (currentRole && ['super_admin', 'admin', 'manager', 'moderator'].includes(currentRole))
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white transition-colors duration-200">
      {/* Active Maintenance Mode Banner for Logged-in Staff */}
      {isMaintenanceActive && isStaffUser && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-3 py-2 text-[11px] sm:text-xs font-black flex flex-col sm:flex-row items-center justify-between gap-1.5 shadow-sm relative z-50 border-b border-amber-600/30">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping shrink-0" />
            <span className="leading-tight">
              ⚠️ <strong>Maintenance Mode Active:</strong> Public visitors see the notice.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setAdminInitialTab('settings');
              setAdminInitialSettingsSubTab('system');
              setCurrentView('admin-dashboard');
            }}
            className="px-3 py-1 rounded-lg bg-slate-950 text-amber-300 hover:text-white hover:bg-slate-900 text-[11px] font-bold cursor-pointer shrink-0 transition-colors shadow-xs"
          >
            Manage Settings ↗
          </button>
        </div>
      )}

      {/* 1. Main Header with Role Switcher & Bangladesh Announcement */}
      <Header
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        wishlistCount={wishlist.length}
        currentRole={currentRole}
        currentView={currentView}
        currentCustomer={currentCustomer}
        onOpenCustomerAuth={handleOpenCustomerAuth}
        onCustomerLogout={handleCustomerLogout}
        currentStaff={currentStaff}
        onOpenStaffLogin={() => setIsAdminLoginOpen(true)}
        onStaffLogout={handleStaffLogout}
        onNavigate={handleNavigate}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => {
          handleNavigate('customer-dashboard', 'wishlist');
        }}
        onOpenAIAssistant={() => setIsAIAssistantOpen(true)}
        onRoleChange={setCurrentRole}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        categories={categories}
        products={products}
        customLogoUrl={siteSettings.customLogo}
        siteName={siteSettings.siteName}
        siteSettings={siteSettings}
      />

      {/* 2. Main Body Content Based on Active View */}
      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.12,
              ease: 'easeOut',
            }}
            className="w-full transform-gpu"
          >
            {/* VIEW: Home */}
        {currentView === 'home' && (
          <div>
            {/* Hero Section matching Screenshot 1 & 2 */}
            <HeroBanner
              categories={categories}
              onSelectCategory={(cat) => {
                handleSelectCategory(cat);
                handleNavigate('shop');
              }}
              onNavigate={handleNavigate}
              heroBanners={siteSettings.heroBanners}
              heroFeatures={siteSettings.heroFeatures}
              heroSideBanner={siteSettings.heroSideBanner}
              codBannerImage={siteSettings.codBannerImage}
              siteName={siteSettings.siteName}
            />

            {/* Shop by Category Icons (from screenshot 2) */}
            <CategoryNav
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                handleSelectCategory(cat);
                handleNavigate('shop');
              }}
              onNavigate={handleNavigate}
            />

            {/* 3 Promotional Cards Grid */}
            <PromoGrid
              promoGridSettings={siteSettings.promoGrid}
              promoBanners={siteSettings.promoBanners}
              onSelectCategory={(cat) => {
                handleSelectCategory(cat);
                handleNavigate('shop');
              }}
              onNavigate={handleNavigate}
            />

            {/* Featured & Popular Products Section */}
            <section className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {siteSettings.homeTabs?.sectionTitle || 'Popular Products & Deals'}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {siteSettings.homeTabs?.sectionSubtitle || 'Authentic items with manufacturer warranty and fast delivery'}
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {[
                    { id: 'all', label: siteSettings.homeTabs?.all || 'All Products' },
                    { id: 'trending', label: siteSettings.homeTabs?.trending || '🔥 Trending' },
                    { id: 'electronics', label: siteSettings.homeTabs?.electronics || 'Electronics' },
                    { id: 'fashion', label: siteSettings.homeTabs?.fashion || 'Fashion' },
                    { id: 'home', label: siteSettings.homeTabs?.home || 'Home & Living' },
                    { id: 'bestsellers', label: siteSettings.homeTabs?.bestsellers || 'Best Sellers' },
                  ]
                    .filter((tab) => !siteSettings.homeTabs?.hiddenTabs?.includes(tab.id))
                    .map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedHomeTab(tab.id as any)}
                      className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                        selectedHomeTab === tab.id
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {homeFilteredProducts.slice(0, 12).map((product, index) => (
                  <ProductCard
                    key={`${product.id}_${index}`}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onBuyNow={handleBuyNow}
                    onQuickView={handleOpenProductDetail}
                    onToggleWishlist={handleToggleWishlist}
                    isWishlisted={wishlist.some((w) => w.id === product.id)}
                    currentRole={currentRole}
                    isLoggedIn={Boolean(currentCustomer)}
                    onOpenCustomerAuth={() => handleOpenCustomerAuth('login')}
                  />
                ))}
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => handleNavigate('shop')}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400 hover:border-sky-300 dark:hover:border-sky-600 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>Explore All Products ({products.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>

            {/* Flash Sale Banner Section (Enlarged Widescreen Banner with Admin Editable Content) */}
            <FlashSaleBanner
              settings={siteSettings.flashSaleBanner}
              onNavigateToShop={() => {
                setSelectedCategory('Electronics & Gadgets');
                setCurrentView('shop');
              }}
            />

            {/* Why Choose KenaX BD Section */}
            <section className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 py-10">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
                <div className="text-center max-w-2xl mx-auto mb-8">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">Why Shop at KenaX BD?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Delivering trust and quality across 64 districts in Bangladesh
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">100% Genuine Guaranteed</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Every product is inspected and sourced directly from authentic manufacturers with warranty.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cash on Delivery</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Zero payment risk. Inspect your parcel when the courier arrives at your doorstep before paying.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/80 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Smart AI Assistant</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Powered by Gemini 2.5 with deep thinking mode to help you choose the ideal products for your budget.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW: Shop / Catalog */}
        {currentView === 'shop' && (
          <div className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 bg-slate-50/80 dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleNavigate('home')}
                className="hover:text-sky-600 dark:hover:text-sky-400 font-semibold cursor-pointer"
              >
                Home
              </button>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <button
                type="button"
                onClick={() => handleSelectCategory('All', 'All', 'All')}
                className={`font-semibold cursor-pointer ${
                  selectedCategory === 'All' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'hover:text-sky-600 dark:hover:text-sky-400'
                }`}
              >
                ALL Product
              </button>
              {selectedCategory !== 'All' && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <button
                    type="button"
                    onClick={() => handleSelectCategory(selectedCategory, 'All', 'All')}
                    className={`font-semibold cursor-pointer ${
                      selectedSubcategory === 'All' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'hover:text-sky-600 dark:hover:text-sky-400'
                    }`}
                  >
                    {selectedCategory}
                  </button>
                </>
              )}
              {selectedSubcategory !== 'All' && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <button
                    type="button"
                    onClick={() => handleSelectCategory(selectedCategory, selectedSubcategory, 'All')}
                    className={`font-semibold cursor-pointer ${
                      selectedSubSubcategory === 'All' ? 'text-sky-600 dark:text-sky-400 font-bold' : 'hover:text-sky-600 dark:hover:text-sky-400'
                    }`}
                  >
                    {selectedSubcategory}
                  </button>
                </>
              )}
              {selectedSubSubcategory !== 'All' && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">/</span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold bg-sky-100/70 dark:bg-sky-950/60 px-2 py-0.5 rounded-md">
                    {selectedSubSubcategory}
                  </span>
                </>
              )}
            </nav>

            <div className="flex flex-row items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {selectedSubSubcategory !== 'All'
                    ? selectedSubSubcategory
                    : selectedSubcategory !== 'All'
                    ? selectedSubcategory
                    : selectedCategory === 'All'
                    ? 'All Products'
                    : selectedCategory}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>Showing {shopFilteredProducts.length} items</span>
                  {(selectedCategory !== 'All' || selectedSubcategory !== 'All' || selectedSubSubcategory !== 'All') && (
                    <button
                      type="button"
                      onClick={() => handleSelectCategory('All', 'All', 'All')}
                      className="text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 font-bold text-[11px] underline cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  )}
                </p>
              </div>

              {/* Sorting Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline text-xs font-bold text-slate-600 dark:text-slate-400">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 sm:px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 shadow-2xs cursor-pointer"
                >
                  <option value="featured">Featured Deals</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>
            </div>

            {/* Hierarchical Dynamic Category Bar: Shows only the active tier */}
            {(() => {
              const activeCat = categories.find((c) => c.name === selectedCategory);
              const subcategories = activeCat?.subcategories || [];
              const totalCategoryProducts = products.filter((p) => p.category === selectedCategory).length;

              const activeSubObj = activeCat?.subcategories?.find(
                (s) => (typeof s === 'string' ? s : s?.name) === selectedSubcategory
              );
              const subSubList: string[] =
                typeof activeSubObj === 'object' && activeSubObj?.subSubcategories && activeSubObj.subSubcategories.length > 0
                  ? activeSubObj.subSubcategories
                  : [];

              // If no pre-configured subSubcategories list, check if products have distinct subSubcategories
              const distinctProductSubSubs = Array.from(
                new Set(
                  products
                    .filter((p) => p.category === selectedCategory && p.subcategory === selectedSubcategory)
                    .map((p) => p.subSubcategory || p.childSubcategory)
                    .filter(Boolean)
                )
              ) as string[];

              const availableChildSubs = Array.from(new Set([...subSubList, ...distinctProductSubSubs]));
              const totalSubProducts = products.filter(
                (p) => p.category === selectedCategory && p.subcategory === selectedSubcategory
              ).length;

              // Determine which single tier bar to display
              const isLevel3Active = selectedCategory !== 'All' && selectedSubcategory !== 'All' && availableChildSubs.length > 0;
              const isLevel2Active = selectedCategory !== 'All' && subcategories.length > 0 && !isLevel3Active;
              const isLevel1Active = selectedCategory === 'All' || subcategories.length === 0;

              return (
                <div className="mb-4">
                  {/* Level 1: Main Category Filter Chips (Shown ONLY when at All Products or Category has no subcategories) */}
                  {isLevel1Active && (
                    <div className="relative group/catbar animate-in fade-in duration-200">
                      {/* Left Scroll Arrow (Desktop) */}
                      <button
                        type="button"
                        onClick={() => scrollCategoryChips('left')}
                        className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-md items-center justify-center text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 hover:border-sky-300 transition-all cursor-pointer"
                        aria-label="Scroll left"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div
                        ref={categoryChipsRef}
                        className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-smooth scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-300"
                      >
                        <button
                          onClick={() => handleSelectCategory('All', 'All', 'All')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                            selectedCategory === 'All'
                              ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300 dark:ring-sky-500/50'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-sky-300 dark:hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-300'
                          }`}
                        >
                          All Categories
                        </button>
                        {[...categories].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)).map((cat) => {
                          const isCatSelected = selectedCategory === cat.name;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => handleSelectCategory(cat.name, 'All', 'All')}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                                isCatSelected
                                  ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300 dark:ring-sky-500/50'
                                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-sky-300 dark:hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-300'
                              }`}
                            >
                              <span>{cat.name}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Right Scroll Arrow (Desktop) */}
                      <button
                        type="button"
                        onClick={() => scrollCategoryChips('right')}
                        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-md items-center justify-center text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 hover:border-sky-300 transition-all cursor-pointer"
                        aria-label="Scroll right"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Level 2: Sub-categories Bar (Shown ONLY when Category is selected & Level 3 is not active) */}
                  {isLevel2Active && (
                    <div className="relative p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 group/subbar animate-in fade-in duration-200">
                      {/* Left Scroll Arrow (Desktop) */}
                      <button
                        type="button"
                        onClick={() => scrollSubcategoryChips('left')}
                        className="hidden md:flex absolute -left-2.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm items-center justify-center text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 hover:border-sky-300 transition-all cursor-pointer"
                        aria-label="Scroll left"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <div
                        ref={subcategoryChipsRef}
                        className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scroll-smooth scrollbar-none"
                      >
                        {/* Quick return to All Categories */}
                        <button
                          onClick={() => handleSelectCategory('All', 'All', 'All')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-2xs"
                          title="Back to All Categories"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>All Categories</span>
                        </button>

                        {/* All in Category */}
                        <button
                          onClick={() => handleSelectSubcategory('All')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs ${
                            selectedSubcategory === 'All'
                              ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300 dark:ring-sky-500/50'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-sky-50 dark:hover:bg-slate-750 hover:text-sky-700 dark:hover:text-sky-300 hover:border-sky-300'
                          }`}
                        >
                          <span>All {selectedCategory}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                              selectedSubcategory === 'All'
                                ? 'bg-sky-700 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200'
                            }`}
                          >
                            {totalCategoryProducts}
                          </span>
                        </button>

                        {/* Subcategory Pills */}
                        {subcategories.map((sub, idx) => {
                          const subName = typeof sub === 'string' ? sub : (sub?.name || '');
                          const subKey = typeof sub === 'string' ? `sub-${idx}-${sub}` : (sub?.id || `sub-${idx}-${sub?.name || ''}`);
                          const count = products.filter(
                            (p) => p.category === selectedCategory && p.subcategory === subName
                          ).length;
                          const isSelected = selectedSubcategory === subName;

                          return (
                            <button
                              key={subKey}
                              onClick={() => handleSelectSubcategory(subName)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs ${
                                isSelected
                                  ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300 dark:ring-sky-500/50'
                                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-sky-50 dark:hover:bg-slate-750 hover:text-sky-700 dark:hover:text-sky-300 hover:border-sky-300'
                              }`}
                            >
                              <span>{subName}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                  isSelected
                                    ? 'bg-sky-700 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200'
                                }`}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Right Scroll Arrow (Desktop) */}
                      <button
                        type="button"
                        onClick={() => scrollSubcategoryChips('right')}
                        className="hidden md:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-sm items-center justify-center text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700 hover:border-sky-300 transition-all cursor-pointer"
                        aria-label="Scroll right"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Level 3: 3rd-Tier Sub-subcategories Interactive Navigation Bar (Shown ONLY when Subcategory selected with children) */}
                  {isLevel3Active && (
                    <div className="relative p-1.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/70 dark:border-sky-800/60 group/subsubbar animate-in fade-in duration-200">
                      {/* Left Scroll Arrow (Desktop) */}
                      <button
                        type="button"
                        onClick={() => scrollSubSubcategoryChips('left')}
                        className="hidden md:flex absolute -left-2.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 shadow-sm items-center justify-center text-sky-700 dark:text-sky-300 hover:text-white hover:bg-sky-600 hover:border-sky-600 transition-all cursor-pointer"
                        aria-label="Scroll left"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <div
                        ref={subSubcategoryChipsRef}
                        className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scroll-smooth scrollbar-none"
                      >
                        {/* Quick return to parent Category Subcategories */}
                        <button
                          onClick={() => handleSelectCategory(selectedCategory, 'All', 'All')}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 shadow-2xs"
                          title={`Back to all ${selectedCategory}`}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>All {selectedCategory}</span>
                        </button>

                        {/* All in Subcategory */}
                        <button
                          onClick={() => handleSelectSubSubcategory('All')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs ${
                            selectedSubSubcategory === 'All'
                              ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300 dark:ring-sky-500/50'
                              : 'bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-sky-600 hover:text-white hover:border-sky-600'
                          }`}
                        >
                          <span>All {selectedSubcategory}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                              selectedSubSubcategory === 'All'
                                ? 'bg-sky-700 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200'
                            }`}
                          >
                            {totalSubProducts}
                          </span>
                        </button>

                        {/* Level-3 Sub-subcategory Pills */}
                        {availableChildSubs.map((ssName, ssIdx) => {
                          const target = ssName.toLowerCase();
                          const count = products.filter(
                            (p) =>
                              p.category === selectedCategory &&
                              p.subcategory === selectedSubcategory &&
                              ((p.subSubcategory || p.childSubcategory || '').toLowerCase() === target ||
                                (p.tags && p.tags.some((t) => t.toLowerCase() === target)) ||
                                p.name.toLowerCase().includes(target))
                          ).length;
                          const isSelected = selectedSubSubcategory === ssName;

                          return (
                            <button
                              key={ssIdx}
                              onClick={() => handleSelectSubSubcategory(ssName)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs ${
                                isSelected
                                  ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-300 dark:ring-sky-500/50'
                                  : 'bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-sky-600 hover:text-white hover:border-sky-600'
                              }`}
                            >
                              <span>{ssName}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                  isSelected
                                    ? 'bg-sky-700 text-white'
                                    : 'bg-sky-50 dark:bg-slate-700 text-sky-700 dark:text-sky-300'
                                }`}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Right Scroll Arrow (Desktop) */}
                      <button
                        type="button"
                        onClick={() => scrollSubSubcategoryChips('right')}
                        className="hidden md:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 shadow-sm items-center justify-center text-sky-700 dark:text-sky-300 hover:text-white hover:bg-sky-600 hover:border-sky-600 transition-all cursor-pointer"
                        aria-label="Scroll right"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Products Grid */}
            {shopFilteredProducts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">No Products Found</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  No products match your current filters or category selection.
                </p>
                <div className="flex items-center justify-center flex-wrap gap-2 mt-4">
                  {selectedSubSubcategory !== 'All' && (
                    <button
                      onClick={() => setSelectedSubSubcategory('All')}
                      className="px-3.5 py-1.5 bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-sky-700 cursor-pointer"
                    >
                      View All {selectedSubcategory}
                    </button>
                  )}
                  {selectedSubcategory !== 'All' && (
                    <button
                      onClick={() => handleSelectSubcategory('All')}
                      className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      View All {selectedCategory}
                    </button>
                  )}
                  <button
                    onClick={() => handleSelectCategory('All', 'All', 'All')}
                    className="px-3.5 py-1.5 bg-slate-900 dark:bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-sky-700 cursor-pointer"
                  >
                    View All Products
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {shopFilteredProducts.map((product, index) => (
                  <ProductCard
                    key={`${product.id}_${index}`}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onBuyNow={handleBuyNow}
                    onQuickView={handleOpenProductDetail}
                    onToggleWishlist={handleToggleWishlist}
                    isWishlisted={wishlist.some((w) => w.id === product.id)}
                    currentRole={currentRole}
                    isLoggedIn={Boolean(currentCustomer)}
                    onOpenCustomerAuth={() => handleOpenCustomerAuth('login')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: Admin Tag Collection View (Flash Sale, New Arrivals, Deals, Custom Admin Tags) */}
        {(currentView.startsWith('tag:') || currentView.startsWith('tag-') || currentView === 'tag-view') && (
          <TagProductsView
            tag={selectedTag}
            allProducts={products}
            onAddToCart={(p, qty) => handleAddToCart(p, qty)}
            onBuyNow={(p, qty) => handleBuyNow(p, qty)}
            onQuickView={(p) => handleOpenProductDetail(p)}
            onToggleWishlist={handleToggleWishlist}
            wishlist={wishlist}
            currentRole={currentRole}
            isLoggedIn={Boolean(currentCustomer)}
            onOpenCustomerAuth={() => handleOpenCustomerAuth('login')}
            onNavigate={handleNavigate}
            siteSettings={siteSettings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}

        {/* VIEW: Dedicated Landing Page for Facebook Ads / Direct Campaigns */}
        {(currentView === 'landing-page' || currentView === 'lp') && (
          <ProductLandingPageView
            product={
              selectedProductForDetail ||
              (localStorage.getItem('kenax_active_landing_product_id')
                ? products.find((p) => p.id === localStorage.getItem('kenax_active_landing_product_id'))
                : null) ||
              products.find((p) => p.landingPage?.enabled) ||
              products[0]
            }
            allProducts={products}
            onSelectProduct={(p) => handleOpenProductDetail(p)}
            onAddToCart={(p, qty, variant, customImg) => handleAddToCart(p, qty, variant, customImg)}
            onBuyNow={(p, qty, variant, customImg) => handleBuyNow(p, qty, variant, customImg)}
            onOrderPlaced={handleOrderPlaced}
            siteSettings={siteSettings}
          />
        )}

        {/* VIEW: Dedicated Product Page */}
        {currentView === 'product' && (
          (selectedProductForDetail || products.length > 0) ? (
            <ProductPageView
              product={selectedProductForDetail || products[0]}
              allProducts={products}
              onSelectProduct={(p) => handleOpenProductDetail(p)}
              onAddToCart={(p, qty, variant, customImg) => handleAddToCart(p, qty, variant, customImg)}
              onBuyNow={(p, qty, variant, customImg) => handleBuyNow(p, qty, variant, customImg)}
              onToggleWishlist={handleToggleWishlist}
              isWishlisted={Boolean(
                (selectedProductForDetail || products[0]) &&
                  wishlist.some((w) => w.id === (selectedProductForDetail || products[0]).id)
              )}
              wishlist={wishlist}
              currentRole={currentRole}
              isLoggedIn={Boolean(currentCustomer)}
              onOpenCustomerAuth={() => handleOpenCustomerAuth('login')}
              onNavigate={handleNavigate}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
                setSelectedSubcategory('All');
                handleNavigate('shop');
              }}
              insideDhakaFee={siteSettings.insideDhakaDeliveryFee}
              outsideDhakaFee={siteSettings.outsideDhakaDeliveryFee}
              orders={orders}
              currentCustomer={currentCustomer}
              onBack={handleBackFromProduct}
              previousItem={productNavHistory.length > 0 ? productNavHistory[productNavHistory.length - 1] : null}
            />
          ) : (
            <div className="min-h-[50vh] flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )
        )}

        {/* VIEW: Track Order */}
        {currentView === 'track' && (
          <TrackOrderView
            orders={orders}
            initialOrder={selectedTrackOrder}
            currentCustomer={currentCustomer}
            onNavigateShop={() => {
              setCurrentView('shop');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateHome={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectTrackOrder={(order) => setSelectedTrackOrder(order)}
          />
        )}

        {/* VIEW: Customer Dashboard */}
        {currentView === 'customer-dashboard' && (
          <CustomerDashboard
            orders={orders}
            savedAddresses={savedAddresses}
            onAddAddress={handleAddAddress}
            onUpdateAddress={handleUpdateAddress}
            onDeleteAddress={handleDeleteAddress}
            wishlist={wishlist}
            cart={cart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onRemoveCartItem={handleRemoveCartItem}
            onOpenCheckout={() => {
              setCheckoutItems(cart.length > 0 ? cart : []);
              setIsCheckoutOpen(true);
            }}
            initialTab={customerDashboardTab}
            onTabChange={setCustomerDashboardTab}
            onTrackOrder={(order) => {
              setSelectedTrackOrder(order);
              setCurrentView('track');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigate={(view) => {
              if (view === 'customer-dashboard') {
                setCustomerDashboardTab('orders');
              }
              handleNavigate(view);
            }}
            onSelectProduct={(p) => handleOpenProductDetail(p)}
            onAddToCart={(p) => handleAddToCart(p, 1)}
            onToggleWishlist={handleToggleWishlist}
            products={products}
            currentCustomer={currentCustomer}
            onOpenCustomerAuth={() => handleOpenCustomerAuth('login')}
          />
        )}

        {/* VIEW: About Us */}
        {currentView === 'about' && (
          <AboutView
            onNavigate={(view) => {
              setCurrentView(view);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenPolicy={handleOpenPolicy}
          />
        )}

        {/* VIEW: Contact */}
        {currentView === 'contact' && <ContactView siteSettings={siteSettings} />}

        {/* VIEW: Help Center & Policies (Privacy Policy, Terms of Service, Refund Policy, FAQ & Help) */}
        {(currentView === 'policy' ||
          currentView === 'policies' ||
          currentView === 'faq' ||
          currentView === 'help' ||
          currentView === 'terms' ||
          currentView === 'privacy' ||
          currentView === 'refund' ||
          currentView === 'return' ||
          currentView === 'exchange') && (
          <PolicyView
            initialTab={
              currentView === 'return'
                ? 'return'
                : currentView === 'exchange'
                ? 'exchange'
                : currentView === 'terms'
                ? 'terms'
                : currentView === 'refund'
                ? 'refund'
                : currentView === 'faq' || currentView === 'help'
                ? 'faq'
                : currentView === 'privacy'
                ? 'privacy'
                : policyPageTab
            }
            siteSettings={siteSettings}
            privacyPolicyText={siteSettings.privacyPolicy}
            termsOfServiceText={siteSettings.termsOfService}
            refundPolicyText={siteSettings.refundPolicy}
            returnPolicyText={siteSettings.returnPolicy}
            exchangePolicyText={siteSettings.exchangePolicy}
            storePolicies={siteSettings.storePolicies}
            faqs={siteSettings.faqs}
            onNavigate={(view) => {
              setCurrentView(view);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setCurrentView('shop');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* VIEW: Dedicated Customer & Staff Auth Page (Login / Register) */}
        {(currentView === 'auth' || currentView === 'login' || currentView === 'register') && (
          <AuthPageView
            initialTab={authPageTab}
            onCustomerLogin={(customer) => {
              setCurrentCustomer(customer);
              localStorage.setItem('kenax_current_customer', JSON.stringify(customer));
              if (customer.cart && Array.isArray(customer.cart)) {
                const cleanCart = sanitizeCart(customer.cart);
                setCart(cleanCart);
                localStorage.setItem('kenax_cart', JSON.stringify(cleanCart));
              }
              if (customer.wishlist && Array.isArray(customer.wishlist)) {
                setWishlist(customer.wishlist);
                localStorage.setItem('kenax_wishlist', JSON.stringify(customer.wishlist));
              }
              const addrs = customer.addresses || customer.savedAddresses;
              if (addrs && Array.isArray(addrs) && addrs.length > 0) {
                setSavedAddresses(addrs);
                localStorage.setItem('kenax_saved_addresses', JSON.stringify(addrs));
              }
              if (returnViewAfterAuth === 'checkout') {
                setIsCheckoutOpen(true);
                setCurrentView('home');
              } else if (
                returnViewAfterAuth &&
                returnViewAfterAuth !== 'auth' &&
                returnViewAfterAuth !== 'login' &&
                returnViewAfterAuth !== 'register'
              ) {
                setCurrentView(returnViewAfterAuth);
              } else {
                setCurrentView('customer-dashboard');
              }
            }}
            onStaffLogin={(staff) => {
              setCurrentStaff(staff);
              setCurrentRole(staff.role);
              localStorage.setItem('kenax_current_staff', JSON.stringify(staff));
              localStorage.setItem('kenax_authenticated_staff', JSON.stringify(staff));
              localStorage.setItem('kenax_authenticated_role', staff.role);

              const adminCustomerProfile: CustomerRecord = {
                id: `staff-cust-${staff.id}`,
                name: staff.name,
                email: staff.email,
                mobile: staff.phone || '01700000000',
                totalOrders: 0,
                totalSpent: 0,
                isBlocked: false,
                status: 'active',
                registeredAt: staff.createdAt || new Date().toISOString(),
                createdAt: staff.createdAt || new Date().toISOString(),
              };
              setCurrentCustomer(adminCustomerProfile);
              localStorage.setItem('kenax_current_customer', JSON.stringify(adminCustomerProfile));

              setCurrentView('admin-dashboard');
            }}
            staffList={staffList}
            onBack={handleBackFromAuth}
            onNavigate={handleNavigate}
            customLogoUrl={siteSettings.customLogoUrl}
          />
        )}

        {/* VIEW: Dedicated Full Checkout Page (Opens on Buy Now or Direct Cart Checkout) */}
        {currentView === 'checkout' && (
          <CheckoutPageView
            cartItems={checkoutItems.length > 0 ? checkoutItems : cart}
            fullCart={cart}
            discountAmount={discountAmount}
            couponCode={appliedCoupon || undefined}
            orderSource={checkoutOrderSource}
            onOrderPlaced={handleOrderPlaced}
            onClose={handleCloseCheckout}
            savedAddresses={savedAddresses}
            defaultInsideCityFee={siteSettings.insideDhakaDeliveryFee}
            defaultOutsideCityFee={siteSettings.outsideDhakaDeliveryFee}
            currentCustomer={currentCustomer}
            onCustomerCreated={(newCust) => {
              setCurrentCustomer(newCust);
              try {
                localStorage.setItem('kenax_current_customer', JSON.stringify(newCust));
              } catch {}
            }}
            onRemoveItem={handleRemoveCartItem}
            onUpdateCartItem={handleUpdateCartItem}
            products={products}
            siteSettings={siteSettings}
            onNavigate={handleNavigate}
          />
        )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. Global Modals & Drawers */}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={() => {
          checkoutItemsRef.current = cart;
          setCheckoutItems(cart);
          if (currentView !== 'checkout') {
            setReturnViewAfterCheckout(currentView);
          }
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
          setCurrentView('checkout');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        appliedCoupon={appliedCoupon}
        discountAmount={discountAmount}
        onApplyCoupon={handleApplyCoupon}
        onRemoveCoupon={handleRemoveCoupon}
        deliveryCharge={siteSettings.insideDhakaDeliveryFee}
        products={products}
        onSelectProduct={handleOpenProductDetail}
      />

      {/* Checkout Modal (Used if opened outside dedicated checkout page) */}
      {isCheckoutOpen && currentView !== 'checkout' && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={handleCloseCheckout}
          cartItems={checkoutItems.length > 0 ? checkoutItems : cart}
          fullCart={cart}
          discountAmount={discountAmount}
          couponCode={appliedCoupon || undefined}
          orderSource={checkoutOrderSource}
          onOrderPlaced={handleOrderPlaced}
          savedAddresses={savedAddresses}
          defaultInsideCityFee={siteSettings.insideDhakaDeliveryFee}
          defaultOutsideCityFee={siteSettings.outsideDhakaDeliveryFee}
          currentCustomer={currentCustomer}
          onCustomerCreated={(newCust) => {
            setCurrentCustomer(newCust);
            try {
              localStorage.setItem('kenax_current_customer', JSON.stringify(newCust));
            } catch {}
          }}
          onRemoveItem={handleRemoveCartItem}
          onUpdateCartItem={handleUpdateCartItem}
          products={products}
          siteSettings={siteSettings}
        />
      )}

      {/* Order Dispatch Animation (Moving KenaX BD Express Delivery Van with Real-time Status Steps) */}
      <OrderProcessingAnimation
        isOpen={isProcessingAnimationOpen}
        order={processingOrder}
        onComplete={handleProcessingAnimationComplete}
      />

      {/* Order Received Success Popup Modal (Contact Notice, Receipt Download/Print, Track Order Button) */}
      {isSuccessModalOpen && (
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200 space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  অর্ডারটি সফলভাবে সম্পন্ন হয়েছে!
                </h3>
                <p className="text-xs text-slate-600">
                  {successOrder?.id ? `অর্ডার আইডি: #${successOrder.id}` : 'আপনার অর্ডারটি গ্রহণ করা হয়েছে।'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSuccessModalOpen(false);
                      setCurrentView('shop');
                    }}
                    className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs"
                  >
                    শপিং চালিয়ে যান
                  </button>
                  {successOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSuccessModalOpen(false);
                        setSelectedTrackOrder(successOrder);
                        setCurrentView('track');
                      }}
                      className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs"
                    >
                      ট্র্যাক অর্ডার
                    </button>
                  )}
                </div>
              </div>
            </div>
          }
        >
          <OrderSuccessModal
            isOpen={isSuccessModalOpen}
            onClose={() => setIsSuccessModalOpen(false)}
            order={successOrder}
            onTrackOrder={(order) => {
              setSelectedTrackOrder(order);
              setCurrentView('track');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onContinueShopping={() => {
              setCurrentView('shop');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </ErrorBoundary>
      )}

      {/* AI Assistant Modal (Gemini 2.5 with Fast & Deep Thinking Modes) */}
      {isAIAssistantOpen && (
        <AIAssistantModal
          isOpen={isAIAssistantOpen}
          onClose={() => setIsAIAssistantOpen(false)}
          products={products}
          onSelectProduct={(p) => {
            handleOpenProductDetail(p);
            setIsAIAssistantOpen(false);
          }}
          onAddToCart={(p) => handleAddToCart(p, 1)}
          onBuyNow={(p, qty) => handleBuyNow(p, qty || 1, undefined, undefined, 'chatbot')}
        />
      )}

      {/* Customer & Staff Authentication Modal (Unified Login / Register) */}
      {isCustomerAuthOpen && (
        <CustomerAuthModal
          isOpen={isCustomerAuthOpen}
          onClose={() => setIsCustomerAuthOpen(false)}
          initialTab={customerAuthInitialTab}
          onCustomerLogin={(customer) => {
            setCurrentCustomer(customer);
            localStorage.setItem('kenax_current_customer', JSON.stringify(customer));
            if (customer.cart && Array.isArray(customer.cart)) {
              const cleanCart = sanitizeCart(customer.cart);
              setCart(cleanCart);
              localStorage.setItem('kenax_cart', JSON.stringify(cleanCart));
            }
            if (customer.wishlist && Array.isArray(customer.wishlist)) {
              setWishlist(customer.wishlist);
              localStorage.setItem('kenax_wishlist', JSON.stringify(customer.wishlist));
            }
            const addrs = customer.addresses || customer.savedAddresses;
            if (addrs && Array.isArray(addrs) && addrs.length > 0) {
              setSavedAddresses(addrs);
              localStorage.setItem('kenax_saved_addresses', JSON.stringify(addrs));
            }
            setIsCustomerAuthOpen(false);
          }}
          onStaffLogin={(staff) => {
            setCurrentStaff(staff);
            setCurrentRole(staff.role);
            localStorage.setItem('kenax_current_staff', JSON.stringify(staff));
            localStorage.setItem('kenax_authenticated_staff', JSON.stringify(staff));
            localStorage.setItem('kenax_authenticated_role', staff.role);

            const adminCustomerProfile: CustomerRecord = {
              id: `staff-cust-${staff.id}`,
              name: staff.name,
              email: staff.email,
              mobile: staff.phone || '01700000000',
              totalOrders: 0,
              totalSpent: 0,
              isBlocked: false,
              status: 'active',
              registeredAt: staff.createdAt || new Date().toISOString(),
              createdAt: staff.createdAt || new Date().toISOString(),
            };
            setCurrentCustomer(adminCustomerProfile);
            localStorage.setItem('kenax_current_customer', JSON.stringify(adminCustomerProfile));

            setIsCustomerAuthOpen(false);
            setCurrentView('admin-dashboard');
          }}
          staffList={staffList}
        />
      )}

      {/* Staff Authentication Modal (Admin / Manager / Moderator / Super Admin) */}
      {isAdminLoginOpen && (
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          onLoginSuccess={(staff) => {
            setCurrentStaff(staff);
            setCurrentRole(staff.role);
            localStorage.setItem('kenax_current_staff', JSON.stringify(staff));
            localStorage.setItem('kenax_authenticated_staff', JSON.stringify(staff));
            localStorage.setItem('kenax_authenticated_role', staff.role);
            setIsAdminLoginOpen(false);
            setCurrentView('admin-dashboard');
          }}
          staffList={staffList}
        />
      )}

      {/* 4. Footer with Policy Triggers (English Only, Trade License Removed) */}
      <Footer
        onNavigate={handleNavigate}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setSelectedSubcategory('All');
          handleNavigate('shop');
        }}
        customLogoUrl={undefined}
        onOpenPolicy={handleOpenPolicy}
        siteSettings={siteSettings}
      />

      {/* 5. Customer Policy & FAQ Help Center Modal (Optional Fallback) */}
      {isPolicyModalOpen && (
        <PolicyModal
          isOpen={isPolicyModalOpen}
          onClose={() => setIsPolicyModalOpen(false)}
          initialTab={policyPageTab}
          privacyPolicyText={siteSettings.privacyPolicy}
          termsOfServiceText={siteSettings.termsOfService}
          refundPolicyText={siteSettings.refundPolicy}
          faqs={siteSettings.faqs}
        />
      )}

      {/* 6. Global Maintenance Mode Modal Popup for Public Visitors */}
      {isMaintenanceActive && !isStaffUser && currentView !== 'admin-dashboard' && (
        <MaintenanceModal
          siteSettings={siteSettings}
          onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        />
      )}

      {/* 7. Mobile Bottom Navigation Bar (Visible exclusively on mobile storefront) */}
      {currentView !== 'admin-dashboard' && (
        <MobileBottomNav
          currentView={currentView}
          cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          currentCustomer={currentCustomer}
          currentStaff={currentStaff}
          isCartOpen={isCartOpen}
          onNavigate={handleNavigate}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenCustomerAuth={() => handleOpenCustomerAuth('login')}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSelectCategory={(cat, sub, subSub) => {
            handleSelectCategory(cat, sub, subSub);
          }}
          categories={categories}
          products={products}
          onOpenProductDetail={handleOpenProductDetail}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Customer Floating Support Chat (KenaX AI Bot, WhatsApp, Telegram, Messenger) */}
      {currentView !== 'admin-dashboard' && (
        <CustomerFloatingChat
          currentCustomer={currentCustomer}
          siteSettings={siteSettings}
          onAddOrder={handleAddOrder}
          products={products}
          onOpenProductDetail={handleOpenProductDetail}
          orders={orders}
          wishlist={wishlist}
          cart={cart}
        />
      )}
    </div>
  );
}
