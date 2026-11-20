import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  LayoutGrid,
  Search,
  ShoppingCart,
  LogIn,
  User,
  ShieldCheck,
  X,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Category, Product, CustomerRecord, StaffUser } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import { SmartSearchBar } from './SmartSearchBar';

const formatBDT = (amount: number) => `৳ ${amount.toLocaleString('en-BD')}`;

interface MobileBottomNavProps {
  currentView: string;
  cartCount: number;
  currentCustomer?: CustomerRecord | null;
  currentStaff?: StaffUser | null;
  isCartOpen?: boolean;
  onNavigate: (view: string) => void;
  onOpenCart: () => void;
  onOpenCustomerAuth: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSelectCategory: (cat: string, subcategory?: string, subSubcategory?: string) => void;
  categories: Category[];
  products: Product[];
  onOpenProductDetail: (product: Product) => void;
  onAddToCart?: (product: Product, quantity: number) => void;
  onBuyNow?: (product: Product, quantity: number) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  cartCount,
  currentCustomer,
  currentStaff,
  isCartOpen = false,
  onNavigate,
  onOpenCart,
  onOpenCustomerAuth,
  searchQuery,
  setSearchQuery,
  onSelectCategory,
  categories,
  products,
  onOpenProductDetail,
  onAddToCart,
  onBuyNow,
}) => {
  const { t } = useLanguage();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [localSearchInput, setLocalSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleCategoryExpand = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Sync search input when opened
  useEffect(() => {
    if (isSearchOpen) {
      setLocalSearchInput(searchQuery || '');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    }
  }, [isSearchOpen, searchQuery]);

  // Lock body scroll when search or categories overlay is active
  useEffect(() => {
    if (isSearchOpen || isCategoriesOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSearchOpen, isCategoriesOpen]);

  // Filtered products for quick mobile search including SKU / serial number
  const liveSearchResults = React.useMemo(() => {
    const q = localSearchInput.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const banglaMatch = p.banglaName && p.banglaName.toLowerCase().includes(q);
        const skuMatch = p.sku && p.sku.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        const subCatMatch = p.subcategory?.toLowerCase().includes(q);
        const brandMatch = p.brand?.toLowerCase().includes(q);
        const tagMatch = p.tags && p.tags.some((t) => t.toLowerCase().includes(q));
        return nameMatch || banglaMatch || skuMatch || catMatch || subCatMatch || brandMatch || tagMatch;
      })
      .slice(0, 10);
  }, [localSearchInput, products]);

  // Filtered categories
  const filteredCategories = React.useMemo(() => {
    const q = categoryFilter.trim().toLowerCase();
    const sorted = [...categories].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.banglaName && c.banglaName.toLowerCase().includes(q))
    );
  }, [categoryFilter, categories]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = localSearchInput.trim();
    if (trimmed) {
      const lower = trimmed.toLowerCase();
      if (lower === '/admin' || lower === '/admin-dashboard' || lower === '/admin-portal') {
        setLocalSearchInput('');
        setSearchQuery('');
        setIsSearchOpen(false);
        try {
          window.history.pushState({}, '', '/admin');
        } catch {}
        onNavigate('admin');
        return;
      }
      setSearchQuery(trimmed);
      onNavigate('shop');
      setIsSearchOpen(false);
    }
  };

  const handleQuickKeyword = (kw: string) => {
    setLocalSearchInput(kw);
    setSearchQuery(kw);
    onNavigate('shop');
    setIsSearchOpen(false);
  };

  const isHomeActive = currentView === 'home';
  const isAccountActive =
    currentView === 'customer-dashboard' ||
    currentView === 'admin-dashboard' ||
    currentView === 'auth' ||
    currentView === 'login' ||
    currentView === 'register';
  const isLoggedIn = !!currentCustomer || !!currentStaff;

  return (
    <>
      {/* 
        ========================================================================
        1. SLEEK MOBILE BOTTOM NAVIGATION BAR (md:hidden)
        Ordered exactly:
        1. Categories (Far Left)
        2. Search (Left of Home)
        3. Home (Center - where Search was)
        4. Cart (Right Side)
        5. Dashboard (Far Right Corner - Role-based access)
        ========================================================================
      */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.25)] select-none pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex items-center justify-around h-15 px-1.5">
          {/* 1. Categories Tab (Far Left Corner) */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setIsCategoriesOpen((prev) => !prev);
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors cursor-pointer ${
              isCategoriesOpen
                ? 'text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isCategoriesOpen && (
              <span className="absolute -top-1 w-7 h-0.5 bg-sky-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            )}
            <LayoutGrid className="w-5 h-5 mb-0.5 transition-transform active:scale-90" />
            <span className="text-[10px] tracking-tight leading-none">{t('ক্যাটাগরি', 'Categories')}</span>
          </button>

          {/* 2. Search Tab (Left of Home) */}
          <button
            type="button"
            onClick={() => {
              setIsCategoriesOpen(false);
              setIsSearchOpen((prev) => !prev);
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors cursor-pointer ${
              isSearchOpen
                ? 'text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isSearchOpen && (
              <span className="absolute -top-1 w-7 h-0.5 bg-sky-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            )}
            <Search className="w-5 h-5 mb-0.5 transition-transform active:scale-90" />
            <span className="text-[10px] tracking-tight leading-none">{t('সার্চ', 'Search')}</span>
          </button>

          {/* 3. Home Tab (Center - where Search used to be) */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setIsCategoriesOpen(false);
              onNavigate('home');
              window.scrollTo({ top: 0, behavior: 'instant' });
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors cursor-pointer ${
              isHomeActive && !isSearchOpen && !isCategoriesOpen && !isCartOpen
                ? 'text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isHomeActive && !isSearchOpen && !isCategoriesOpen && !isCartOpen && (
              <span className="absolute -top-1 w-7 h-0.5 bg-sky-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            )}
            <Home className="w-5 h-5 mb-0.5 transition-transform active:scale-90" />
            <span className="text-[10px] tracking-tight leading-none">{t('হোম', 'Home')}</span>
          </button>

          {/* 4. Cart Tab with Live Counter Badge (Right Side) */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setIsCategoriesOpen(false);
              onOpenCart();
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors cursor-pointer ${
              isCartOpen && !isSearchOpen && !isCategoriesOpen
                ? 'text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isCartOpen && !isSearchOpen && !isCategoriesOpen && (
              <span className="absolute -top-1 w-7 h-0.5 bg-sky-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            )}
            <div className="relative">
              <ShoppingCart className="w-5 h-5 mb-0.5 transition-transform active:scale-90" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-sky-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none">{t('কার্ট', 'Cart')}</span>
          </button>

          {/* 5. Dashboard / Login Tab (Far Right Corner - Customer Account Routing) */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setIsCategoriesOpen(false);
              if (currentCustomer) {
                onNavigate('customer-dashboard');
              } else {
                onOpenCustomerAuth();
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors cursor-pointer ${
              isAccountActive && !isSearchOpen && !isCategoriesOpen && !isCartOpen
                ? 'text-sky-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isAccountActive && !isSearchOpen && !isCategoriesOpen && !isCartOpen && (
              <span className="absolute -top-1 w-7 h-0.5 bg-sky-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            )}
            {currentCustomer ? (
              <div className="w-5 h-5 rounded-full bg-sky-600/30 border border-sky-400/60 flex items-center justify-center mb-0.5 text-[10px] font-bold text-sky-300">
                {currentCustomer.name ? currentCustomer.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
            ) : (
              <LogIn className="w-5 h-5 mb-0.5 transition-transform active:scale-90" />
            )}
            <span className="text-[10px] tracking-tight leading-none truncate max-w-[60px]">
              {currentCustomer ? t('প্রোফাইল', 'Dashboard') : t('লগইন', 'Login')}
            </span>
          </button>
        </div>
      </nav>

      {/* 
        ========================================================================
        2. MOBILE SEARCH DRAWER (Slides in from top, keeping bottom bar visible)
        ========================================================================
      */}
      {isSearchOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-15 sm:bottom-16 z-40 md:hidden flex flex-col justify-start animate-in fade-in duration-200">
          {/* Backdrop behind search sheet */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsSearchOpen(false)}
          />

          {/* Search Sheet Container from top */}
          <div className="relative bg-white dark:bg-slate-900 rounded-b-3xl max-h-[84vh] flex flex-col shadow-2xl z-10 animate-in slide-in-from-top duration-300 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
            <SmartSearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              products={products}
              categories={categories}
              onNavigate={onNavigate}
              onSelectCategory={(cat, sub, subSub) => {
                onSelectCategory(cat, sub, subSub);
                setIsSearchOpen(false);
              }}
              onOpenProductDetail={(prod) => {
                onOpenProductDetail(prod);
                setIsSearchOpen(false);
              }}
              onAddToCart={onAddToCart}
              onBuyNow={(prod, qty) => {
                if (onBuyNow) onBuyNow(prod, qty);
                setIsSearchOpen(false);
              }}
              variant="mobile-sheet"
              onCloseMobileSheet={() => setIsSearchOpen(false)}
              autoFocus={true}
            />

            {/* Mobile Handle at bottom */}
            <div className="py-1.5 flex justify-center shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        3. MOBILE CATEGORIES SIDE PANEL DRAWER (Slides in from the side)
        ========================================================================
      */}
      {isCategoriesOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCategoriesOpen(false)}
          />

          {/* Side Panel Drawer sliding from the left side */}
          <div className="relative w-[85%] max-w-[320px] h-full bg-white dark:bg-slate-900 shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-300 border-r border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white leading-tight">
                    {t('ক্যাটাগরি ব্রাউজ করুন', 'Browse Categories')}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {filteredCategories.length} {t('টি ক্যাটাগরি রয়েছে', 'categories available')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoriesOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Close Categories"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Filter Search */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  placeholder={t('ক্যাটাগরি খুঁজুন...', 'Filter categories...')}
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Categories Scrollable List with Accordion */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
              {/* All Products Option */}
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('All', 'All', 'All');
                  setIsCategoriesOpen(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center font-black text-xs shrink-0">
                    ALL
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-sky-600 truncate">
                      {t('সকল পণ্য', 'All Products')}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {t('সব প্রোডাক্ট একসাথে দেখুন', 'Explore entire catalog')}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 shrink-0" />
              </button>

              {/* Individual Categories */}
              {filteredCategories.map((cat) => {
                const isExpanded = !!expandedCategories[cat.id];
                const hasSubcategories = !!cat.subcategories && cat.subcategories.length > 0;

                return (
                  <div key={cat.id} className="rounded-xl border border-slate-100 dark:border-slate-800/80 overflow-hidden bg-white dark:bg-slate-900/60">
                    <div className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory(cat.name, 'All', 'All');
                          setIsCategoriesOpen(false);
                        }}
                        className="flex-1 flex items-center gap-2.5 text-left group cursor-pointer min-w-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-sky-100 dark:group-hover:bg-sky-950 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-sky-600 transition-colors shrink-0">
                          <LayoutGrid className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 truncate">
                            {cat.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate">
                            {cat.banglaName ? `${cat.banglaName} • ` : ''}
                            {cat.itemCount ? `${cat.itemCount}+ ${t('টি পণ্য', 'items')}` : t('দেখুন', 'Explore')}
                          </p>
                        </div>
                      </button>

                      {hasSubcategories && (
                        <button
                          type="button"
                          onClick={(e) => toggleCategoryExpand(cat.id, e)}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer shrink-0 ml-1"
                          title="Toggle Subcategories"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-sky-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Subcategories */}
                    {hasSubcategories && isExpanded && (
                      <div className="pl-4 pr-2 py-2 space-y-1 bg-slate-50/80 dark:bg-slate-850/80 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-1 duration-150">
                        {cat.subcategories!.map((subItem, sIdx) => {
                          const subName = typeof subItem === 'string' ? subItem : subItem.name;
                          const subSubs = typeof subItem === 'object' && subItem.subSubcategories ? subItem.subSubcategories : [];
                          return (
                            <div key={sIdx} className="py-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectCategory(cat.name, subName, 'All');
                                  setIsCategoriesOpen(false);
                                }}
                                className="w-full text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-sky-600 py-1 px-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-between"
                              >
                                <span>{subName}</span>
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                              </button>
                              {subSubs.length > 0 && (
                                <div className="flex flex-wrap gap-1 pl-2 pr-1 pt-1 pb-0.5">
                                  {subSubs.map((child, cIdx) => (
                                    <button
                                      key={cIdx}
                                      type="button"
                                      onClick={() => {
                                        onSelectCategory(cat.name, subName, child);
                                        setIsCategoriesOpen(false);
                                      }}
                                      className="text-[10px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:text-sky-600 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
                                    >
                                      {child}
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

            {/* Footer View All button */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('All', 'All', 'All');
                  setIsCategoriesOpen(false);
                }}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-98 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>{t('সব পণ্য শপে দেখুন', 'View All Products in Shop')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
