import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Heart,
  ShoppingCart,
  User,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Truck,
  ShieldCheck,
  CreditCard,
  PhoneCall,
  Sparkles,
  LayoutDashboard,
  LogOut,
  MapPin,
  CheckCircle,
  Smartphone,
  Shirt,
  Armchair,
  Dumbbell,
  Baby,
  Car,
  HeartPulse,
  Headphones,
  Grid,
  Flame,
  Home,
  Info,
  Layers,
  ArrowRight,
  Tag,
  Zap,
  LogIn,
  UserPlus,
  Sun,
  Moon,
} from 'lucide-react';
import { KenaXLogo } from './KenaXLogo';
import { ThemeToggle } from './ThemeToggle';
import { UserRole, CustomerRecord, StaffUser, Category, SubCategoryItem, Product, WebsiteSettings } from '../types';
import { getEffectiveNavItems } from '../data/defaultNavItems';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  cartCount: number;
  wishlistCount: number;
  currentRole: UserRole;
  currentView: string;
  currentCustomer?: CustomerRecord | null;
  onOpenCustomerAuth?: (tab?: 'login' | 'register') => void;
  onCustomerLogout?: () => void;
  currentStaff?: StaffUser | null;
  onOpenStaffLogin?: () => void;
  onStaffLogout?: () => void;
  onNavigate: (view: string) => void;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onOpenAIAssistant: () => void;
  onRoleChange: (role: UserRole) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string, subcategory?: string, subSubcategory?: string) => void;
  categories: Category[];
  products?: Product[];
  customLogoUrl?: string;
  siteName?: string;
  siteSettings?: WebsiteSettings;
}

export const Header: React.FC<HeaderProps> = ({
  cartCount,
  wishlistCount,
  currentRole,
  currentView,
  currentCustomer,
  onOpenCustomerAuth,
  onCustomerLogout,
  currentStaff,
  onOpenStaffLogin,
  onStaffLogout,
  onNavigate,
  onOpenCart,
  onOpenWishlist,
  onOpenAIAssistant,
  onRoleChange,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  onSelectCategory,
  categories,
  products = [],
  customLogoUrl,
  siteName,
  siteSettings,
}) => {
  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();

  const getLocalizedNavLabel = (label: string) => {
    const trimmed = label.trim();
    const l = trimmed.toLowerCase();

    // These tags and promotional categories must ALWAYS remain in English:
    // ALL Products, Flash Sale, HOT, Trending/TRENDING, New Arrivals/Collection, Hot Deals/Deals, Best Sell/Best Sellers
    if (trimmed === 'ফ্ল্যাশ সেল' || l === 'flash sale') return 'Flash Sale';
    if (trimmed === 'হট ডিল' || l === 'hot deals' || l === 'deals' || l === 'hot deal' || l === 'hot') return 'Hot Deals';
    if (trimmed === 'নতুন কালেকশন' || l === 'new arrivals' || l === 'new arrival' || l === 'new collection') return 'New Arrivals';
    if (l === 'trending') return 'Trending';
    if (trimmed === 'সেরা বিক্রি' || trimmed === 'বেস্ট সেলার' || l === 'best sell' || l === 'best sellers' || l === 'best seller') return 'Best Sellers';
    if (trimmed === 'সব পণ্য' || trimmed === 'সকল পণ্য' || l === 'all products') return 'All Products';

    if (
      l === 'all products' ||
      l === 'flash sale' ||
      l === 'hot' ||
      l === 'hot deals' ||
      l === 'deals' ||
      l === 'trending' ||
      l === 'new arrivals' ||
      l === 'best sell' ||
      l === 'best sellers'
    ) {
      return label;
    }

    if (language !== 'bn') return label;
    if (l === 'home') return 'হোম';
    if (l === 'shop') return 'শপ';
    if (l === 'track order' || l === 'track') return 'অর্ডার ট্র্যাক';
    if (l === 'contact' || l === 'contact us') return 'যোগাযোগ';
    return label;
  };

  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isMobileAccountOpen, setIsMobileAccountOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [mobileActiveTab, setMobileActiveTab] = useState<'categories' | 'menu'>('categories');
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);
  const [mobileExpandedCatIds, setMobileExpandedCatIds] = useState<Record<string, boolean>>({});
  const [mobileExpandedSubKeys, setMobileExpandedSubKeys] = useState<Record<string, boolean>>({});

  // Scroll tracking refs for smart mobile header hide/reveal with intentional delays
  const lastScrollY = useRef(0);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const isHeaderVisibleRef = useRef(true);

  // Sync ref with state
  useEffect(() => {
    isHeaderVisibleRef.current = isHeaderVisible;
  }, [isHeaderVisible]);

  // Extract custom admin tags from products to dynamically display in top navigation
  const dynamicCustomTags = React.useMemo(() => {
    if (!products || products.length === 0) return [];
    const tagSet = new Set<string>();
    const standardSet = new Set(['shop', 'flash sale', 'new arrivals', 'deals', 'hot deals', 'best seller', 'trending', 'featured', 'none']);
    products.forEach((p) => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          const cleaned = (t || '').trim();
          if (cleaned && !standardSet.has(cleaned.toLowerCase())) {
            tagSet.add(cleaned);
          }
        });
      }
    });
    return Array.from(tagSet).slice(0, 5);
  }, [products]);

  // Effective header navigation items sorted by priority
  const navItems = React.useMemo(() => {
    return getEffectiveNavItems(siteSettings?.navigationItems).filter((item) => item.enabled !== false);
  }, [siteSettings?.navigationItems]);

  // Refs for click outside & hover management
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const mobileAccountRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const categoryHoverTimer = useRef<NodeJS.Timeout | null>(null);
  const accountHoverTimer = useRef<NodeJS.Timeout | null>(null);

  // All categories displayed cleanly without omissions
  const displayedCategories = [...categories].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

  const normalizeSubs = (subs?: (string | SubCategoryItem)[]): SubCategoryItem[] => {
    if (!subs) return [];
    return subs.map((s, idx) => {
      if (typeof s === 'string') {
        return {
          id: `sub-${idx}-${s}`,
          name: s,
          icon: 'Layers',
          subSubcategories: [],
        };
      }
      return {
        id: s.id || `sub-${idx}-${s.name}`,
        name: s.name,
        icon: s.icon || 'Layers',
        subSubcategories: s.subSubcategories || [],
      };
    });
  };

  const activeHoveredCat = displayedCategories.find((c) => c.id === hoveredCatId) || displayedCategories[0];

  // Category Icon helper
  const getCategoryIcon = (slug?: string, name?: string) => {
    const s = `${slug || ''} ${name || ''}`.toLowerCase();
    if (s.includes('electronic') || s.includes('gadget') || s.includes('phone')) {
      return <Smartphone className="w-4 h-4 text-sky-600" />;
    }
    if (s.includes('fashion') || s.includes('cloth') || s.includes('wear') || s.includes('dress')) {
      return <Shirt className="w-4 h-4 text-rose-500" />;
    }
    if (s.includes('home') || s.includes('living') || s.includes('furniture')) {
      return <Armchair className="w-4 h-4 text-emerald-600" />;
    }
    if (s.includes('beauty') || s.includes('care') || s.includes('cosmetic')) {
      return <Sparkles className="w-4 h-4 text-purple-500" />;
    }
    if (s.includes('sport') || s.includes('fitness') || s.includes('gym')) {
      return <Dumbbell className="w-4 h-4 text-blue-600" />;
    }
    if (s.includes('toy') || s.includes('kid') || s.includes('baby')) {
      return <Baby className="w-4 h-4 text-amber-500" />;
    }
    if (s.includes('auto') || s.includes('car') || s.includes('motor')) {
      return <Car className="w-4 h-4 text-sky-700" />;
    }
    if (s.includes('health') || s.includes('wellness') || s.includes('medical')) {
      return <HeartPulse className="w-4 h-4 text-red-500" />;
    }
    if (s.includes('headphone') || s.includes('audio') || s.includes('accessori')) {
      return <Headphones className="w-4 h-4 text-indigo-600" />;
    }
    return <Grid className="w-4 h-4 text-slate-600" />;
  };

  // Category menu hover handlers
  const handleCategoryMouseEnter = () => {
    if (categoryHoverTimer.current) {
      clearTimeout(categoryHoverTimer.current);
      categoryHoverTimer.current = null;
    }
    setIsCategoryMenuOpen(true);
  };

  const handleCategoryMouseLeave = () => {
    if (categoryHoverTimer.current) clearTimeout(categoryHoverTimer.current);
    categoryHoverTimer.current = setTimeout(() => {
      setIsCategoryMenuOpen(false);
    }, 180);
  };

  // Account dropdown hover handlers
  const handleAccountMouseEnter = () => {
    if (accountHoverTimer.current) {
      clearTimeout(accountHoverTimer.current);
      accountHoverTimer.current = null;
    }
  };

  const handleAccountMouseLeave = () => {
    if (accountHoverTimer.current) clearTimeout(accountHoverTimer.current);
    accountHoverTimer.current = setTimeout(() => {
      setIsAccountDropdownOpen(false);
    }, 220);
  };

  // Global click outside & keydown listener
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(target)) {
        setIsCategoryMenuOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(target)) {
        setIsAccountDropdownOpen(false);
      }
      if (mobileAccountRef.current && !mobileAccountRef.current.contains(target)) {
        setIsMobileAccountOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCategoryMenuOpen(false);
        setIsAccountDropdownOpen(false);
        setIsMobileAccountOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
      document.removeEventListener('keydown', handleKeyDown);
      if (categoryHoverTimer.current) clearTimeout(categoryHoverTimer.current);
      if (accountHoverTimer.current) clearTimeout(accountHoverTimer.current);
    };
  }, []);

  // Mobile scroll behavior configured per user specification:
  // - Scroll down: waits 1 second (1000ms) of downward scrolling before hiding header
  // - Scroll up: waits 2 seconds (2000ms) of upward scrolling before revealing header
  // - Reaching the very top (<= 25px): instantly reveals header without waiting
  // - Idle / stationary for 4 seconds (4000ms): auto-reveals header
  useEffect(() => {
    const clearAllTimers = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
      if (idleScrollTimer.current) {
        clearTimeout(idleScrollTimer.current);
        idleScrollTimer.current = null;
      }
    };

    const resetIdleTimer = () => {
      if (idleScrollTimer.current) {
        clearTimeout(idleScrollTimer.current);
      }
      idleScrollTimer.current = setTimeout(() => {
        setIsHeaderVisible(true);
        idleScrollTimer.current = null;
      }, 4000); // 4 seconds idle delay
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // At top of page, always immediately show header
      if (currentScrollY <= 25) {
        clearAllTimers();
        setIsHeaderVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      const diff = currentScrollY - lastScrollY.current;

      // 1. User scrolling DOWN:
      // Wait 1 second (1000ms) of downward scrolling before sliding up/hiding
      if (diff > 5) {
        // If an upward reveal was pending, cancel it
        if (revealTimerRef.current) {
          clearTimeout(revealTimerRef.current);
          revealTimerRef.current = null;
        }

        // Start 1-second hide timer if header is currently visible and not already counting down
        if (isHeaderVisibleRef.current && !hideTimerRef.current) {
          hideTimerRef.current = setTimeout(() => {
            setIsHeaderVisible(false);
            setIsMobileAccountOpen(false); // Close mobile account popup when scrolling away
            hideTimerRef.current = null;
            resetIdleTimer();
          }, 1000); // 1 second delay
        }

        // Reset the 4-second idle reveal timer on every scroll
        resetIdleTimer();
      }
      // 2. User scrolling UP:
      // Wait 2 seconds (2000ms) of upward scrolling before sliding down/revealing
      else if (diff < -5) {
        // If a downward hide was pending, cancel it
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }

        // Start 2-second reveal timer if header is currently hidden and not already counting down
        if (!isHeaderVisibleRef.current && !revealTimerRef.current) {
          revealTimerRef.current = setTimeout(() => {
            setIsHeaderVisible(true);
            revealTimerRef.current = null;
          }, 2000); // 2 seconds delay
        }

        // Reset the 4-second idle reveal timer on every scroll
        resetIdleTimer();
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearAllTimers();
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate('shop');
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-transform duration-300 ease-in-out ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full md:translate-y-0'
        }`}
      >
      {/* Main Header Bar */}
      <div className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-4">
        {/* Logo at the far left corner */}
        <div
          onClick={() => {
            onNavigate('home');
            window.scrollTo({ top: 0, behavior: 'instant' });
          }}
          className="cursor-pointer transition-transform active:scale-95 shrink-0 py-0.5 sm:py-1"
        >
          <KenaXLogo
            size="md"
            theme={isDark ? 'dark' : 'light'}
            customLogoUrl={customLogoUrl}
            customDarkLogoUrl={siteSettings?.customLogoDark}
            siteName={siteName}
          />
        </div>

        {/* Desktop Search Bar with Search Button */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-2xl hidden md:flex items-center relative"
        >
          <div className="relative w-full flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('পণ্য, ব্র্যান্ড বা মডেল খুঁজুন...', 'Search for products, brands and more...')}
              className="w-full pl-4 pr-12 py-2.5 rounded-l-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-xs"
            />
            <button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white px-6 py-2.5 rounded-r-xl font-medium text-sm transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
            >
              <Search className="w-4 h-4 mr-1.5" />
              <span>{t('সার্চ', 'Search')}</span>
            </button>
          </div>
        </form>

        {/* Desktop Right Actions: Account, Wishlist, Cart */}
        <div className="hidden md:flex items-center gap-2 sm:gap-3">
          {/* Customer Account or Login / Register for Visitors */}
          {currentCustomer ? (
            <div
              ref={accountDropdownRef}
              onMouseEnter={handleAccountMouseEnter}
              onMouseLeave={handleAccountMouseLeave}
              className="relative"
            >
              <button
                onClick={() => setIsAccountDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
                aria-expanded={isAccountDropdownOpen}
              >
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {currentCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {currentStaff ? 'Staff Account' : 'Customer Account'}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                    {currentCustomer.name.split(' ')[0]}
                    <ChevronDown className={`w-3 h-3 ml-0.5 text-slate-400 transition-transform duration-200 ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
                  </span>
                </div>
              </button>

              {/* Dropdown Menu */}
              {isAccountDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-100"
                  onMouseEnter={handleAccountMouseEnter}
                  onMouseLeave={handleAccountMouseLeave}
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Signed in as</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{currentCustomer.name}</p>
                    <p className="text-[11px] text-sky-600 dark:text-sky-400 font-mono truncate">{currentCustomer.email}</p>
                  </div>

                  <div className="py-1">
                    {currentStaff && (
                      <button
                        onClick={() => {
                          onNavigate('admin-dashboard');
                          setIsAccountDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 flex items-center gap-2 cursor-pointer border-b border-sky-100 dark:border-sky-900/40 mb-1"
                      >
                        <ShieldCheck className="w-4 h-4 text-sky-600" />
                        <span>{t('অ্যাডমিন ড্যাশবোর্ড', 'Admin Dashboard')}</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onNavigate('customer-dashboard');
                        setIsAccountDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <User className="w-4 h-4 text-sky-600" /> {t('আমার অ্যাকাউন্ট ও অর্ডার', 'My Account & Orders')}
                    </button>
                    <button
                      onClick={() => {
                        onNavigate('cart-items');
                        setIsAccountDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <ShoppingCart className="w-4 h-4 text-sky-600" /> {t('আমার কার্ট পণ্য', 'My Cart Items')}
                    </button>
                    <button
                      onClick={() => {
                        onNavigate('saved-addresses');
                        setIsAccountDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <MapPin className="w-4 h-4 text-sky-600" /> {t('সংরক্ষিত ঠিকানা', 'Saved Addresses')}
                    </button>
                    <button
                      onClick={() => {
                        onOpenWishlist();
                        setIsAccountDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Heart className="w-4 h-4 text-rose-500" /> {t('পছন্দের তালিকা', 'My Wishlist')}
                    </button>
                    <button
                      onClick={() => {
                        onNavigate('track');
                        setIsAccountDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Truck className="w-4 h-4 text-emerald-600" /> {t('অর্ডার ট্র্যাক করুন', 'Track Live Order')}
                    </button>
                  </div>

                  {onCustomerLogout && (
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          onCustomerLogout();
                          if (onStaffLogout) onStaffLogout();
                          setIsAccountDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> {t('সাইন আউট', 'Sign Out')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Visitor Login / Register Buttons (Right Beside Cart) */
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenCustomerAuth?.('login')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-2xs active:scale-95"
                title={t('লগইন করুন', 'Sign In')}
              >
                <LogIn className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
                <span>{t('লগইন', 'Login')}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCustomerAuth?.('register')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs active:scale-95"
                title={t('নতুন অ্যাকাউন্ট তৈরি করুন', 'Register New Account')}
              >
                <UserPlus className="w-3.5 h-3.5 text-sky-100 shrink-0" />
                <span>{t('রেজিস্টার', 'Register')}</span>
              </button>
            </div>
          )}

          {/* Desktop Wishlist Button */}
          <button
            onClick={onOpenWishlist}
            className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Wishlist"
          >
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-sky-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Desktop Cart Button */}
          <button
            onClick={onOpenCart}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium text-xs transition-colors cursor-pointer shadow-xs border border-transparent dark:border-slate-700"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-sky-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline font-semibold">{t('কার্ট', 'Cart')}</span>
          </button>

          {/* Desktop Dark Mode Theme Toggle */}
          <ThemeToggle variant="compact" />

          {/* Language Switcher (বাংলা / EN) */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0 ml-0.5">
            <button
              type="button"
              onClick={() => setLanguage('bn')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                language === 'bn' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                language === 'en' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Mobile View: Right Actions (Dark Toggle, Language Switcher, Track Order, Wishlist, Account Icon Only) */}
        <div className="md:hidden flex items-center gap-1">
          {/* Mobile Dark Mode Toggle */}
          <ThemeToggle variant="mobile" />

          {/* Mobile Language Switcher */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-bold border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors shrink-0"
            title="Switch Language"
          >
            {language === 'bn' ? 'বাংলা' : 'EN'}
          </button>

          {/* 1. Track Order Button (Beside Wishlist) */}
          <button
            type="button"
            onClick={() => {
              onNavigate('track');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            className="p-1.5 sm:p-2 rounded-xl text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer flex items-center justify-center relative"
            aria-label="Track Your Order"
            title="Track Your Order"
          >
            <Truck className="w-6 h-6 text-slate-900 dark:text-slate-100 stroke-[2.5]" />
          </button>

          {/* 2. Wishlist Button */}
          <button
            type="button"
            onClick={onOpenWishlist}
            className="relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer flex items-center justify-center"
            aria-label="Wishlist"
            title="Wishlist"
          >
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500/15" />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center shadow-xs">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* 3. When Logged Out: Show 'Login' & 'Register' buttons. When Logged In: Customer Avatar & Menu */}
          {!currentCustomer ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenCustomerAuth?.('login')}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] tracking-tight border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
                title="Login"
              >
                <span>{t('লগইন', 'Login')}</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenCustomerAuth?.('register')}
                className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] tracking-tight shadow-xs transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
                title="Register"
              >
                <span>{t('রেজিস্টার', 'Register')}</span>
              </button>
            </div>
          ) : (
            <div ref={mobileAccountRef} className="relative">
              <button
                type="button"
                onClick={() => setIsMobileAccountOpen((prev) => !prev)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all cursor-pointer flex items-center justify-center"
                aria-label="Account Menu"
                title="Account"
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 dark:bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {currentCustomer.name.charAt(0).toUpperCase()}
                </div>
              </button>

              {/* Mobile Account Dropdown Menu */}
              {isMobileAccountOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 rounded-t-2xl">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Signed in as</p>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{currentCustomer.name}</p>
                    <p className="text-[10px] text-sky-600 dark:text-sky-400 font-mono truncate">{currentCustomer.email}</p>
                  </div>

                  <div className="py-1">
                    {/* Super Admin / Staff Link if applicable */}
                    {currentStaff && (
                      <button
                        onClick={() => {
                          onNavigate('admin-dashboard');
                          setIsMobileAccountOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 flex items-center gap-2 cursor-pointer border-b border-sky-100 dark:border-sky-900/40"
                      >
                        <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                        <span>Admin Dashboard</span>
                      </button>
                    )}

                    {/* 1. Your Account */}
                    <button
                      onClick={() => {
                        onNavigate('customer-dashboard');
                        setIsMobileAccountOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400 flex items-center gap-2.5 cursor-pointer font-semibold"
                    >
                      <User className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Your Account</span>
                    </button>

                    {/* 2. Your Orders */}
                    <button
                      onClick={() => {
                        onNavigate('customer-dashboard');
                        setIsMobileAccountOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400 flex items-center gap-2.5 cursor-pointer font-semibold"
                    >
                      <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Your Orders</span>
                    </button>

                    {/* 3. Your Wishlist */}
                    <button
                      onClick={() => {
                        onOpenWishlist();
                        setIsMobileAccountOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400 flex items-center gap-2.5 cursor-pointer font-semibold"
                    >
                      <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Your Wishlist</span>
                    </button>

                    {/* 4. Your Cart */}
                    <button
                      onClick={() => {
                        onOpenCart();
                        setIsMobileAccountOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400 flex items-center gap-2.5 cursor-pointer font-semibold"
                    >
                      <ShoppingCart className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Your Cart</span>
                    </button>
                  </div>

                  {/* 5. Sign Out */}
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        if (onCustomerLogout) onCustomerLogout();
                        if (onStaffLogout) onStaffLogout();
                        setIsMobileAccountOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Desktop Sub-Navigation Bar (Placed inside sticky header so it never hides when scrolling down on desktop) */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 hidden md:block">
        <div className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* All Categories Trigger Button */}
            <div
              ref={categoryMenuRef}
              onMouseEnter={handleCategoryMouseEnter}
              onMouseLeave={handleCategoryMouseLeave}
              className="relative"
            >
              <button
                type="button"
                onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                className="bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white px-5 py-2.5 rounded-t-lg font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors shadow-xs select-none"
                aria-expanded={isCategoryMenuOpen}
              >
                <Menu className="w-4 h-4" />
                <span>{t('সব ক্যাটাগরি', 'All Categories')}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isCategoryMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Categories Mega Dropdown */}
              {isCategoryMenuOpen && (
                <div
                  className="absolute left-0 top-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-b-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-150 flex max-h-[80vh] overflow-hidden"
                  style={{ width: '780px' }}
                  onMouseEnter={handleCategoryMouseEnter}
                  onMouseLeave={handleCategoryMouseLeave}
                >
                  {/* Left Column: Category List */}
                  <div className="w-64 border-r border-slate-100 dark:border-slate-800 py-2 bg-slate-50/50 dark:bg-slate-850 overflow-y-auto scrollbar-thin max-h-[78vh]">
                    <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {t('ক্যাটাগরি', 'Categories')}
                    </div>
                    {displayedCategories.map((cat) => {
                      const isHovered = (hoveredCatId || displayedCategories[0]?.id) === cat.id;
                      const subs = normalizeSubs(cat.subcategories);
                      return (
                        <div
                          key={cat.id}
                          onMouseEnter={() => setHoveredCatId(cat.id)}
                          onClick={() => {
                            onSelectCategory(cat.name, 'All', 'All');
                            onNavigate('shop');
                            setIsCategoryMenuOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                            isHovered
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className={isHovered ? 'text-white' : ''}>
                              {getCategoryIcon(cat.slug, cat.name)}
                            </span>
                            <span className="truncate">{cat.name}</span>
                          </div>
                          {subs.length > 0 && (
                            <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isHovered ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Section: Subcategories & 3rd-Tier Child Subcategories */}
                  <div className="flex-1 p-5 overflow-y-auto max-h-[78vh] bg-white dark:bg-slate-900 scrollbar-thin">
                    {activeHoveredCat ? (
                      <div>
                        {/* Active Category Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                              {getCategoryIcon(activeHoveredCat.slug, activeHoveredCat.name)}
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-900 dark:text-white">{activeHoveredCat.name}</h3>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {normalizeSubs(activeHoveredCat.subcategories).length} subcategories available
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCategory(activeHoveredCat.name, 'All', 'All');
                              onNavigate('shop');
                              setIsCategoryMenuOpen(false);
                            }}
                            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>View All Products</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Subcategory Grid */}
                        {normalizeSubs(activeHoveredCat.subcategories).length > 0 ? (
                          <div className="grid grid-cols-2 gap-4">
                            {normalizeSubs(activeHoveredCat.subcategories).map((sub) => (
                              <div
                                key={sub.id}
                                className="bg-slate-50/70 dark:bg-slate-800/60 hover:bg-sky-50/40 dark:hover:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/70 transition-all hover:border-sky-200 dark:hover:border-sky-500/50"
                              >
                                {/* Subcategory Title */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectCategory(activeHoveredCat.name, sub.name, 'All');
                                    onNavigate('shop');
                                    setIsCategoryMenuOpen(false);
                                  }}
                                  className="w-full text-left font-bold text-xs text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 flex items-center justify-between group cursor-pointer mb-2"
                                >
                                  <span className="group-hover:translate-x-0.5 transition-transform">
                                    {sub.name}
                                  </span>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 dark:group-hover:text-sky-400" />
                                </button>

                                {/* 3rd-Tier Child Subcategories (Sub-subcategories) */}
                                {sub.subSubcategories && sub.subSubcategories.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                                    {sub.subSubcategories.map((ssName, ssIdx) => (
                                      <button
                                        key={ssIdx}
                                        type="button"
                                        onClick={() => {
                                          onSelectCategory(activeHoveredCat.name, sub.name, ssName);
                                          onNavigate('shop');
                                          setIsCategoryMenuOpen(false);
                                        }}
                                        className="text-[11px] px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-sky-600 hover:text-white hover:border-sky-600 transition-colors cursor-pointer"
                                      >
                                        {ssName}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Direct collection</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-xs text-slate-400">
                            No subcategories listed for this category.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Select a category to view subcategories
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Links (Priority Configurable by Admin) */}
            <nav className="flex items-center space-x-1 pl-4 text-xs font-semibold text-slate-700 dark:text-slate-300 overflow-x-auto no-scrollbar">
              {navItems.map((item) => {
                const isTag = item.targetView.startsWith('tag:');
                const tagVal = isTag ? item.targetView.replace(/^tag:/, '') : '';
                const isActive =
                  currentView === item.targetView ||
                  (isTag && (currentView === `tag:${tagVal}` || currentView === `tag-${tagVal}`));

                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.targetView)}
                    className={`px-3 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? 'text-sky-600 dark:text-sky-400 font-bold bg-sky-50/90 dark:bg-sky-950/60'
                        : 'hover:text-sky-600 dark:hover:text-sky-400 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{getLocalizedNavLabel(item.label)}</span>
                    {item.isHot && (
                      <span
                        className={`${
                          item.badgeColor || 'bg-red-500'
                        } text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase shadow-xs`}
                      >
                        {item.badgeText || 'HOT'}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>

      {/* Mobile Sub-Navigation Bar: Directly connected to Admin Store Settings -> Header Navigation & Priority */}
      <div className="md:hidden bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800/80 px-3 py-2 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex items-center gap-2 w-max pr-2">
          {navItems.map((item) => {
            const isTag = item.targetView.startsWith('tag:');
            const tagVal = isTag ? item.targetView.replace(/^tag:/, '').trim() : '';
            const lowerTag = tagVal.toLowerCase();
            const lowerLabel = item.label.toLowerCase();

            // Determine active state
            let isActive = false;
            if (item.targetView === 'home') {
              isActive = currentView === 'home';
            } else if (item.targetView === 'shop') {
              isActive = currentView === 'shop' && selectedCategory === 'All' && !searchQuery;
            } else if (isTag) {
              isActive =
                currentView === item.targetView ||
                currentView === `tag:${tagVal}` ||
                currentView === `tag-${tagVal}` ||
                (currentView === 'flash-sale' && lowerTag.includes('flash')) ||
                (currentView === 'shop' && searchQuery.toLowerCase() === lowerTag);
            } else if (item.targetView.startsWith('category:')) {
              const catName = item.targetView.replace(/^category:/, '');
              isActive = currentView === 'shop' && selectedCategory.toLowerCase() === catName.toLowerCase();
            } else {
              isActive = currentView === item.targetView;
            }

            // Click handler
            const handleClick = () => {
              if (item.targetView === 'home') {
                onNavigate('home');
              } else if (item.targetView === 'shop') {
                setSearchQuery('');
                onSelectCategory('All', 'All', 'All');
                onNavigate('shop');
              } else if (isTag) {
                if (lowerTag === 'flash sale' || lowerTag === 'flash') {
                  onNavigate('flash-sale');
                } else {
                  onNavigate(item.targetView);
                }
              } else {
                onNavigate(item.targetView);
              }
              window.scrollTo({ top: 0, behavior: 'instant' });
            };

            // Dynamic Icon helper based on label or targetView
            const renderIcon = () => {
              if (lowerLabel.includes('flash') || lowerTag.includes('flash') || lowerLabel.includes('hot')) {
                return <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />;
              }
              if (lowerLabel.includes('trend') || lowerTag.includes('trend')) {
                return <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
              }
              if (lowerLabel.includes('bestseller') || lowerTag.includes('bestseller') || lowerLabel.includes('best seller')) {
                return <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
              }
              if (lowerLabel.includes('new') || lowerTag.includes('new') || lowerLabel.includes('arrival')) {
                return <Sparkles className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
              }
              if (lowerLabel.includes('deal') || lowerTag.includes('deal') || lowerLabel.includes('offer')) {
                return <Tag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
              }
              if (
                lowerLabel.includes('mobile') ||
                lowerLabel.includes('smartphone') ||
                lowerLabel.includes('phone') ||
                lowerTag.includes('mobile') ||
                lowerTag.includes('phone')
              ) {
                return <Smartphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
              }
              if (lowerLabel.includes('xiaomi') || lowerTag.includes('xiaomi')) {
                return <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />;
              }
              if (lowerLabel.includes('redmi') || lowerTag.includes('redmi')) {
                return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />;
              }
              if (lowerLabel.includes('gadget') || lowerTag.includes('gadget')) {
                return <Zap className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
              }
              if (lowerLabel.includes('all') || lowerLabel.includes('shop')) {
                return <Grid className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
              }
              if (lowerLabel.includes('home')) {
                return <Home className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
              }
              return <Tag className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
            };

            return (
              <button
                key={item.id}
                type="button"
                onClick={handleClick}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border select-none active:scale-95 ${
                  isActive
                    ? 'bg-sky-600 text-white border-sky-500 shadow-md ring-1 ring-sky-400/50'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-750 hover:border-sky-300 dark:hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-300'
                }`}
              >
                {renderIcon()}
                <span>{getLocalizedNavLabel(item.label)}</span>
                {item.isHot && (
                  <span
                    className={`${
                      item.badgeColor || 'bg-red-500'
                    } text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase shadow-2xs ml-0.5`}
                  >
                    {item.badgeText || 'HOT'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer Overlay & All Categories Side Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Sidebar */}
          <div
            ref={mobileMenuRef}
            className="relative w-[85%] max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250 ease-out"
          >
            {/* Drawer Top Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-600 to-blue-700 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white tracking-wide">All Categories</h3>
                  <p className="text-[10px] text-sky-100">Explore {displayedCategories.length} product categories</p>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Selector: Categories vs Quick Menu */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1.5 gap-1.5 text-xs font-bold">
              <button
                onClick={() => setMobileActiveTab('categories')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mobileActiveTab === 'categories'
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs border border-slate-200/80 dark:border-slate-700 font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Categories ({displayedCategories.length})</span>
              </button>
              <button
                onClick={() => setMobileActiveTab('menu')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mobileActiveTab === 'menu'
                    ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs border border-slate-200/80 dark:border-slate-700 font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Menu className="w-3.5 h-3.5" />
                <span>Navigation</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {mobileActiveTab === 'categories' ? (
                /* 1. All Categories List */
                <div className="space-y-1.5">
                  {/* View All / All Products Option */}
                  <button
                    onClick={() => {
                      onSelectCategory('All');
                      onNavigate('shop');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      selectedCategory === 'All'
                        ? 'bg-sky-50/80 dark:bg-sky-950/60 border-sky-500 dark:border-sky-500 text-sky-900 dark:text-sky-300 font-bold shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/80 flex items-center justify-center shrink-0">
                        <Grid className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div>
                        <span className="text-xs font-black block text-slate-900 dark:text-white">All Products</span>
                        <span className="text-[10px] text-slate-400">View entire catalog</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Individual Categories with 3-Tier Drilldown */}
                  {displayedCategories.map((cat) => {
                    const isSelected = selectedCategory === cat.name;
                    const isExpanded = !!mobileExpandedCatIds[cat.id];
                    const subs = normalizeSubs(cat.subcategories);

                    return (
                      <div
                        key={cat.id}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isSelected
                            ? 'bg-sky-50/50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500/70'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between p-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCategory(cat.name, 'All', 'All');
                              onNavigate('shop');
                              setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              {getCategoryIcon(cat.slug, cat.name)}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                                {cat.name}
                              </span>
                              {cat.itemCount !== undefined && (
                                <span className="text-[10px] text-slate-400 block">
                                  {cat.itemCount}+ items
                                </span>
                              )}
                            </div>
                          </button>

                          {subs.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMobileExpandedCatIds((prev) => ({
                                  ...prev,
                                  [cat.id]: !prev[cat.id],
                                }));
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                              aria-label="Toggle subcategories"
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-sky-600 dark:text-sky-400' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Nested Subcategories (Tier 2 & 3) */}
                        {isExpanded && subs.length > 0 && (
                          <div className="bg-slate-50/90 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 p-2.5 space-y-2">
                            {subs.map((sub) => {
                              const subKey = `${cat.id}_${sub.id}`;
                              const isSubExpanded = !!mobileExpandedSubKeys[subKey];
                              const childSubs = sub.subSubcategories || [];

                              return (
                                <div
                                  key={sub.id}
                                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-2 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onSelectCategory(cat.name, sub.name, 'All');
                                        onNavigate('shop');
                                        setIsMobileMenuOpen(false);
                                      }}
                                      className="text-xs font-black text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 text-left flex-1 py-1 cursor-pointer"
                                    >
                                      {sub.name}
                                    </button>

                                    {childSubs.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMobileExpandedSubKeys((prev) => ({
                                            ...prev,
                                            [subKey]: !prev[subKey],
                                          }));
                                        }}
                                        className="text-[10px] text-sky-600 dark:text-sky-400 font-bold px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 cursor-pointer"
                                      >
                                        {childSubs.length} sub-items {isSubExpanded ? '▲' : '▼'}
                                      </button>
                                    )}
                                  </div>

                                  {/* 3rd-Tier Child Subcategories (Tier 3) */}
                                  {(isSubExpanded || childSubs.length <= 3) && childSubs.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                      {childSubs.map((ssName, ssIdx) => (
                                        <button
                                          key={ssIdx}
                                          type="button"
                                          onClick={() => {
                                            onSelectCategory(cat.name, sub.name, ssName);
                                            onNavigate('shop');
                                            setIsMobileMenuOpen(false);
                                          }}
                                          className="text-[10px] px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-600 hover:text-white hover:border-sky-600 transition-colors cursor-pointer"
                                        >
                                          {ssName}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* 2. Navigation Menu Links */
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const isTag = item.targetView.startsWith('tag:');
                    const tagVal = isTag ? item.targetView.replace(/^tag:/, '') : '';
                    const isActive =
                      currentView === item.targetView ||
                      (isTag && (currentView === `tag:${tagVal}` || currentView === `tag-${tagVal}`));

                    return (
                      <button
                        key={`mobile_${item.id}`}
                        onClick={() => {
                          onNavigate(item.targetView);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold border border-sky-100 dark:border-sky-800'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Tag className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        {item.isHot && (
                          <span
                            className={`${
                              item.badgeColor || 'bg-red-500'
                            } text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase`}
                          >
                            {item.badgeText || 'HOT'}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {currentStaff && (
                    <button
                      onClick={() => {
                        onNavigate('admin-dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-xs font-black text-left bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800"
                    >
                      <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>Admin Dashboard</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onNavigate('customer-dashboard');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-xs font-bold text-left transition-colors cursor-pointer ${
                      currentView === 'customer-dashboard' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <User className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Customer Account / Dashboard</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom User Profile or Login CTA */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              {currentCustomer ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {currentCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{currentCustomer.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentCustomer.email}</p>
                    </div>
                  </div>
                  {onCustomerLogout && (
                    <button
                      onClick={() => {
                        onCustomerLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (onOpenCustomerAuth) onOpenCustomerAuth('login');
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <LogIn className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <span>{t('লগইন করুন', 'Sign In')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      if (onOpenCustomerAuth) onOpenCustomerAuth('register');
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-sky-100" />
                    <span>{t('রেজিস্টার', 'Register')}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
