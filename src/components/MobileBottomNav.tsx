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
    if (localSearchInput.trim()) {
      setSearchQuery(localSearchInput.trim());
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

          {/* 5. Dashboard / Login Tab (Far Right Corner - Role-Based Routing) */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setIsCategoriesOpen(false);
              if (currentStaff) {
                onNavigate('admin-dashboard');
              } else if (currentCustomer) {
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
            {currentStaff ? (
              <ShieldCheck className="w-5 h-5 mb-0.5 transition-transform active:scale-90 text-amber-400" />
            ) : currentCustomer ? (
              <div className="w-5 h-5 rounded-full bg-sky-600/30 border border-sky-400/60 flex items-center justify-center mb-0.5 text-[10px] font-bold text-sky-300">
                {currentCustomer.name ? currentCustomer.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
            ) : (
              <LogIn className="w-5 h-5 mb-0.5 transition-transform active:scale-90" />
            )}
            <span className="text-[10px] tracking-tight leading-none truncate max-w-[60px]">
              {currentStaff ? t('অ্যাডমিন', 'Admin') : currentCustomer ? t('প্রোফাইল', 'Dashboard') : t('লগইন', 'Login')}
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
          <div className="relative bg-white rounded-b-3xl max-h-[82vh] flex flex-col shadow-2xl z-10 animate-in slide-in-from-top duration-300 border-b border-slate-200 overflow-hidden">
            {/* Search Header Bar */}
            <div className="p-3 bg-white border-b border-slate-200 shadow-xs flex items-center gap-2 shrink-0">
              <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
                <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={localSearchInput}
                  onChange={(e) => setLocalSearchInput(e.target.value)}
                  placeholder={t('পণ্য, ক্যাটাগরি বা মডেল দিয়ে খুঁজুন...', 'Search by name, category, or SKU/serial...')}
                  className="w-full pl-9 pr-8 py-2.5 bg-slate-100 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                />
                {localSearchInput && (
                  <button
                    type="button"
                    onClick={() => setLocalSearchInput('')}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 shrink-0 cursor-pointer"
              >
                {t('বাতিল', 'Cancel')}
              </button>
            </div>

            {/* Quick Suggestions & Trending Keywords */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {!localSearchInput.trim() ? (
                <div className="space-y-4">
                  {/* Popular Searches */}
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                      <span>Popular Searches</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Smart Watch',
                        'Wireless Earbuds',
                        'Men Fashion',
                        'Sneakers',
                        'Panjabi',
                        'Serum',
                        'Fast Charger',
                        'Backpack',
                      ].map((kw) => (
                        <button
                          key={kw}
                          type="button"
                          onClick={() => handleQuickKeyword(kw)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer border border-slate-200/60"
                        >
                          {kw}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Top Categories */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Top Categories
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.slice(0, 6).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setLocalSearchInput('');
                            onSelectCategory(c.name, 'All', 'All');
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-sky-50 rounded-xl border border-slate-200/80 text-left transition-colors cursor-pointer group"
                        >
                          <span className="text-xs font-semibold text-slate-800 group-hover:text-sky-600 truncate">
                            {c.name}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Categories / Popular Subcategories */}
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      <Tag className="w-3 h-3 text-sky-500" />
                      <span>Suggested Categories</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Panjabi & Pajama',
                        'Smartphones',
                        'TWS Earbuds',
                        'Sneakers',
                        'Smartwatches',
                        'Baby & Kids',
                        'Three Piece & Kurti',
                      ].map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => {
                            setLocalSearchInput('');
                            onSelectCategory('All', sub, 'All');
                            setIsSearchOpen(false);
                          }}
                          className="px-2.5 py-1 bg-sky-50/70 hover:bg-sky-100 text-sky-700 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border border-sky-100"
                        >
                          #{sub}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-500">
                    <span>Results ({liveSearchResults.length})</span>
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="text-sky-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View all in Shop</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {liveSearchResults.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-sm font-semibold text-slate-600">No products found for "{localSearchInput}"</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try searching by product name, SKU / serial number, or category
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {liveSearchResults.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => {
                            onOpenProductDetail(prod);
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-sky-200 hover:bg-sky-50/40 transition-colors cursor-pointer group"
                        >
                          <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center p-1">
                            <img
                              src={getOptimizedImageUrl(prod.images?.[0], 200)}
                              alt={prod.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-sky-600 transition-colors">
                              {prod.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-400 truncate">{prod.category}</span>
                              {prod.sku && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                  SKU: {prod.sku}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-extrabold text-sky-600">
                                {formatBDT(prod.price)}
                              </span>
                              {prod.originalPrice && prod.originalPrice > prod.price && (
                                <span className="text-[10px] text-slate-400 line-through">
                                  {formatBDT(prod.originalPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                          {onAddToCart && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(prod, 1);
                              }}
                              className="p-2 bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer"
                              title="Add to cart"
                            >
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Handle at bottom */}
            <div className="py-1.5 flex justify-center shrink-0 border-t border-slate-100 bg-slate-50">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        3. MOBILE CATEGORIES TOP DRAWER / SLIDE-IN FROM TOP
        ========================================================================
      */}
      {isCategoriesOpen && (
        <div className="fixed top-0 left-0 right-0 bottom-15 sm:bottom-16 z-40 md:hidden flex flex-col justify-start animate-in fade-in duration-200">
          {/* Backdrop (leaving bottom navigation bar completely visible & interactive) */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsCategoriesOpen(false)}
          />

          {/* Top Sheet Modal that slides in from the top */}
          <div className="relative bg-white rounded-b-3xl max-h-[82vh] flex flex-col shadow-2xl z-10 animate-in slide-in-from-top duration-300 border-b border-slate-200 overflow-hidden">
            {/* Sheet Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-sky-600" />
                  <span>Browse Categories</span>
                </h3>
                <p className="text-xs text-slate-400">Select a category or subcategory to explore</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoriesOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
                title="Close Categories"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Filter */}
            <div className="px-5 pt-3 pb-2">
              <input
                type="text"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="Search category or subcategory..."
                className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Categories List with Expandable Subcategories */}
            <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-slate-100 space-y-1">
              {/* All Categories Option */}
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('All', 'All', 'All');
                  setIsCategoriesOpen(false);
                }}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-sky-50 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs">
                    ALL
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-sky-600">All Products</h4>
                    <p className="text-[10px] text-slate-400">View complete product catalog</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600" />
              </button>

              {filteredCategories.map((cat) => {
                const isExpanded = !!expandedCategories[cat.id];
                const hasSubcategories = !!cat.subcategories && cat.subcategories.length > 0;

                return (
                  <div key={cat.id} className="pt-1">
                    <div className="flex items-center justify-between py-1.5 px-1 rounded-xl hover:bg-slate-50 transition-colors">
                      {/* Main Category Click -> Filter to this category */}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory(cat.name, 'All', 'All');
                          setIsCategoriesOpen(false);
                        }}
                        className="flex-1 flex items-center gap-3 text-left group cursor-pointer p-1.5"
                      >
                        <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-sky-100 flex items-center justify-center text-slate-700 group-hover:text-sky-600 transition-colors shrink-0">
                          <LayoutGrid className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 group-hover:text-sky-600 truncate">
                            {cat.name}
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            {cat.banglaName ? `${cat.banglaName} • ` : ''}
                            {cat.itemCount ? `${cat.itemCount}+ items` : 'Explore'}
                          </p>
                        </div>
                      </button>

                      {/* Arrow / Chevron Button to toggle subcategories */}
                      {hasSubcategories ? (
                        <button
                          type="button"
                          onClick={(e) => toggleCategoryExpand(cat.id, e)}
                          className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition-all cursor-pointer shrink-0 ml-1"
                          title="Toggle Subcategories"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-sky-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCategory(cat.name, 'All', 'All');
                            setIsCategoriesOpen(false);
                          }}
                          className="p-2 text-slate-300 hover:text-sky-600 transition-colors cursor-pointer shrink-0 ml-1"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Expandable Subcategories Accordion */}
                    {hasSubcategories && isExpanded && (
                      <div className="pl-6 pr-2 py-2 space-y-1 bg-slate-50/80 rounded-2xl mb-2 border-l-2 border-sky-400 ml-4 animate-in slide-in-from-top-2 duration-150">
                        {cat.subcategories!.map((subItem, sIdx) => {
                          const subName = typeof subItem === 'string' ? subItem : subItem.name;
                          const subSubs = typeof subItem === 'object' && subItem.subSubcategories ? subItem.subSubcategories : [];
                          return (
                            <div key={sIdx} className="py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectCategory(cat.name, subName, 'All');
                                  setIsCategoriesOpen(false);
                                }}
                                className="w-full text-left text-xs font-semibold text-slate-700 hover:text-sky-600 py-1 px-2 rounded-lg hover:bg-white transition-colors cursor-pointer flex items-center justify-between"
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
                                      className="text-[10px] text-slate-600 bg-white hover:bg-sky-50 hover:text-sky-600 px-2 py-0.5 rounded-md border border-slate-200/80 transition-colors cursor-pointer"
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
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('All', 'All', 'All');
                  setIsCategoriesOpen(false);
                }}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                View All Products in Shop
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
