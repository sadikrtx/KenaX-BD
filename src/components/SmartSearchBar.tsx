import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Clock,
  TrendingUp,
  ArrowRight,
  ShoppingCart,
  ShoppingBag,
  Check,
  Star,
  Trash2,
  SlidersHorizontal,
  CornerDownLeft,
  Package,
  ChevronRight,
} from 'lucide-react';
import { Product, Category } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  getRecentSearchProductIds,
  addRecentSearchProductId,
  clearRecentSearchProducts,
  searchProductsSmart,
} from '../utils/smartSearch';

const formatBDT = (amount: number) => `৳ ${Number(amount || 0).toLocaleString('en-BD')}`;

interface SmartSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  products: Product[];
  categories: Category[];
  onNavigate: (view: string) => void;
  onSelectCategory: (cat: string, subcategory?: string, subSubcategory?: string) => void;
  onOpenProductDetail?: (product: Product) => void;
  onAddToCart?: (product: Product, quantity: number) => void;
  onBuyNow?: (product: Product, quantity: number) => void;
  variant?: 'desktop' | 'mobile-header' | 'mobile-sheet';
  onCloseMobileSheet?: () => void;
  autoFocus?: boolean;
}

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  products = [],
  categories = [],
  onNavigate,
  onSelectCategory,
  onOpenProductDetail,
  onAddToCart,
  onBuyNow,
  variant = 'desktop',
  onCloseMobileSheet,
  autoFocus = false,
}) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(variant === 'mobile-sheet');
  const [activeCatFilter, setActiveCatFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'relevance' | 'price-asc' | 'price-desc' | 'rating'>('relevance');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const [recentProductIds, setRecentProductIds] = useState<string[]>(() => getRecentSearchProductIds());
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync recent searches & products across tabs/components
  useEffect(() => {
    const syncRecents = () => {
      setRecentSearches(getRecentSearches());
      setRecentProductIds(getRecentSearchProductIds());
    };
    window.addEventListener('kenax-recent-search-updated', syncRecents);
    window.addEventListener('storage', syncRecents);
    return () => {
      window.removeEventListener('kenax-recent-search-updated', syncRecents);
      window.removeEventListener('storage', syncRecents);
    };
  }, []);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  // Reset category filter and highlighted index when query changes
  useEffect(() => {
    setActiveCatFilter('All');
    setHighlightedIndex(-1);
  }, [searchQuery]);

  // Global click-outside & Ctrl+K / "/" keyboard shortcut for desktop
  useEffect(() => {
    if (variant === 'mobile-sheet') return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        !(document.activeElement as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    if (variant === 'desktop') {
      document.addEventListener('keydown', handleGlobalKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      if (variant === 'desktop') {
        document.removeEventListener('keydown', handleGlobalKeyDown);
      }
    };
  }, [variant]);

  // Compute smart live search results
  const searchResult = useMemo(() => {
    return searchProductsSmart(searchQuery, products, categories, {
      categoryFilter: activeCatFilter,
      sortBy,
      limit: 10,
    });
  }, [searchQuery, products, categories, activeCatFilter, sortBy]);

  // Available categories within all matching products (ignoring activeCatFilter so tabs stay visible)
  const availableResultCategories = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const baseResult = searchProductsSmart(searchQuery, products, categories, {
      categoryFilter: 'All',
      limit: 50,
    });
    const counts = new Map<string, number>();
    baseResult.products.forEach((p) => {
      if (p.category) {
        counts.set(p.category, (counts.get(p.category) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [searchQuery, products, categories]);

  // Recently viewed product objects
  const recentProducts = useMemo(() => {
    if (!recentProductIds.length || !products.length) return [];
    return recentProductIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p))
      .slice(0, 4);
  }, [recentProductIds, products]);

  // Popular / smart suggestion keywords
  const popularSuggestions = useMemo(() => {
    return [
      'Smart Watch',
      'Wireless Earbuds',
      'Panjabi',
      'Sneakers',
      'Under 1000',
      'Fast Charger',
      'Backpack',
      'Three Piece',
    ];
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    const lower = trimmed.toLowerCase();

    // Staff portal secret route support (/admin)
    if (lower === '/admin' || lower === '/admin-dashboard' || lower === '/admin-portal') {
      setSearchQuery('');
      setIsOpen(false);
      onCloseMobileSheet?.();
      try {
        window.history.pushState({}, '', '/admin');
      } catch {}
      onNavigate('admin');
      return;
    }

    // If a product row is keyboard-highlighted, open that product directly
    if (highlightedIndex >= 0 && highlightedIndex < searchResult.products.length) {
      handleSelectProduct(searchResult.products[highlightedIndex]);
      return;
    }

    if (trimmed) {
      addRecentSearch(trimmed);
    }
    setIsOpen(false);
    onCloseMobileSheet?.();
    onNavigate('shop');
  };

  const handleSelectProduct = (product: Product) => {
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery.trim());
    }
    addRecentSearchProductId(product.id);
    setIsOpen(false);
    onCloseMobileSheet?.();
    if (onOpenProductDetail) {
      onOpenProductDetail(product);
    } else {
      setSearchQuery(product.name);
      onNavigate('shop');
    }
  };

  const handleOrderProductNow = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (searchQuery.trim()) {
      addRecentSearch(searchQuery.trim());
    }
    addRecentSearchProductId(product.id);
    setIsOpen(false);
    onCloseMobileSheet?.();
    if (onBuyNow) {
      onBuyNow(product, 1);
    } else if (onOpenProductDetail) {
      onOpenProductDetail(product);
    }
  };

  const handleQuickAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product, 1);
      setAddedProductId(product.id);
      setTimeout(() => {
        setAddedProductId((prev) => (prev === product.id ? null : prev));
      }, 1400);
    }
  };

  const handleApplySuggestion = (keyword: string) => {
    setSearchQuery(keyword);
    addRecentSearch(keyword);
    inputRef.current?.focus();
    setIsOpen(true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const itemsCount = searchResult.products.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      if (itemsCount > 0) {
        setHighlightedIndex((prev) => (prev + 1) % itemsCount);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      if (itemsCount > 0) {
        setHighlightedIndex((prev) => (prev <= 0 ? itemsCount - 1 : prev - 1));
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Highlight matched query text cleanly inside product name
  const renderHighlightedText = (text: string, query: string) => {
    const cleanQ = (searchResult.cleanedKeyword || query).trim();
    if (!cleanQ || cleanQ.length < 2) return text;
    const escaped = cleanQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === cleanQ.toLowerCase() ? (
            <span
              key={i}
              className="text-sky-600 dark:text-sky-400 font-extrabold underline decoration-sky-400/50 underline-offset-2"
            >
              {part}
            </span>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
      </>
    );
  };

  const hasQuery = searchQuery.trim().length > 0 && !searchQuery.trim().startsWith('/');

  // Render dropdown body (shared between desktop popover, mobile header popover, and mobile sheet)
  const renderSearchPanelContent = () => (
    <div className="flex flex-col max-h-[76vh] md:max-h-[540px] overflow-hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {!hasQuery ? (
        /* ================= EMPTY QUERY STATE: RECENT SEARCHES, RECENTLY VIEWED & SUGGESTIONS ================= */
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 scrollbar-thin">
          {/* 1. Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('সাম্প্রতিক সার্চ', 'Recent Searches')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRecentSearches(clearRecentSearches())}
                  className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{t('সব মুছুন', 'Clear All')}</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((item) => (
                  <div
                    key={item}
                    className="group inline-flex items-center bg-slate-100 dark:bg-slate-800/90 hover:bg-sky-50 dark:hover:bg-sky-950/50 border border-slate-200/80 dark:border-slate-700/80 hover:border-sky-300 dark:hover:border-sky-800 rounded-lg transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => handleApplySuggestion(item)}
                      className="pl-2.5 pr-1.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 group-hover:text-sky-700 dark:group-hover:text-sky-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="w-3 h-3 text-slate-400 group-hover:text-sky-500 shrink-0" />
                      <span className="truncate max-w-[180px]">{item}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecentSearches(removeRecentSearch(item));
                      }}
                      className="pr-2 pl-1 py-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title={t('মুছে ফেলুন', 'Remove')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Recently Viewed Products from Search */}
          {recentProducts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Package className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>{t('সম্প্রতি দেখা পণ্য', 'Recently Viewed Products')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearRecentSearchProducts();
                    setRecentProductIds([]);
                  }}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {t('মুছুন', 'Clear')}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recentProducts.map((prod) => (
                  <div
                    key={`recent-${prod.id}`}
                    onClick={() => handleSelectProduct(prod)}
                    className="flex items-center gap-2.5 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group"
                  >
                    <div className="w-11 h-11 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                      <img
                        src={getOptimizedImageUrl(prod.images?.[0], 120)}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400">
                        {prod.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                          {formatBDT(prod.price)}
                        </span>
                        {prod.stock > 0 && onBuyNow && (
                          <button
                            type="button"
                            onClick={(e) => handleOrderProductNow(e, prod)}
                            className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 underline underline-offset-2 cursor-pointer"
                          >
                            {t('অর্ডার করুন', 'Order Now')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Popular / Smart Searches */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2.5">
              <TrendingUp className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{t('জনপ্রিয় সার্চ', 'Popular Searches')}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularSuggestions.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => handleApplySuggestion(kw)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Quick Categories Browse */}
          {categories.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mb-2">
                {t('ক্যাটাগরি অনুযায়ী খুঁজুন', 'Browse by Category')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {categories.slice(0, 6).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onCloseMobileSheet?.();
                      onSelectCategory(cat.name, 'All', 'All');
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer group"
                  >
                    <span className="truncate">{cat.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= ACTIVE QUERY STATE: INSTANT LIVE PRODUCT RESULTS ================= */
        <>
          {/* Top Filter & Sort Control Bar */}
          <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {searchResult.totalMatches}
              </span>
              <span>{t('টি পণ্য পাওয়া গেছে', 'products found')}</span>
              {searchResult.detectedMaxPrice !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-sky-600 dark:text-sky-400">
                    {t(`সর্বোচ্চ ৳${searchResult.detectedMaxPrice}`, `Under ৳${searchResult.detectedMaxPrice}`)}
                  </span>
                </>
              )}
            </div>

            {/* Live Sort Selector */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
              <div className="flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                {(
                  [
                    { id: 'relevance', label: t('সেরা মিল', 'Best Match') },
                    { id: 'price-asc', label: t('কম দাম', 'Low Price') },
                    { id: 'price-desc', label: t('বেশি দাম', 'High Price') },
                    { id: 'rating', label: t('রেটিং', 'Top Rated') },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSortBy(opt.id)}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      sortBy === opt.id
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category Filter Tabs (When results span multiple categories) */}
          {availableResultCategories.length > 1 && (
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-white dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setActiveCatFilter('All')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeCatFilter === 'All'
                    ? 'bg-slate-900 dark:bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t('সব ক্যাটাগরি', 'All')}
              </button>
              {availableResultCategories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCatFilter(cat.name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeCatFilter === cat.name
                      ? 'bg-slate-900 dark:bg-sky-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.name} ({cat.count})
                </button>
              ))}
            </div>
          )}

          {/* Product Results Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70 scrollbar-thin">
            {searchResult.products.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {t(`"${searchQuery}" দিয়ে কোনো পণ্য পাওয়া যায়নি`, `No products found for "${searchQuery}"`)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t(
                      'অন্য কোনো নাম, ব্র্যান্ড, ক্যাটাগরি বা SKU দিয়ে চেষ্টা করুন',
                      'Try searching with a different product name, brand, or category'
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  {popularSuggestions.slice(0, 5).map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => handleApplySuggestion(kw)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              searchResult.products.map((product, index) => {
                const isHighlighted = index === highlightedIndex;
                const isOutOfStock = product.stock <= 0;
                const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
                const discountPercent = hasDiscount
                  ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
                  : 0;
                const isJustAdded = addedProductId === product.id;

                return (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`p-3 sm:px-4 sm:py-3 flex items-center gap-3 sm:gap-3.5 transition-colors cursor-pointer group ${
                      isHighlighted
                        ? 'bg-sky-50/80 dark:bg-slate-800/90'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Product Thumbnail */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
                      <img
                        src={getOptimizedImageUrl(product.images?.[0], 160)}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-150"
                      />
                      {discountPercent > 0 && (
                        <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-rose-600 text-white text-[9px] font-bold leading-none tabular-nums">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>

                    {/* Product Info & Clean Unboxed Metadata */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 truncate transition-colors">
                        {renderHighlightedText(product.name, searchQuery)}
                      </h4>

                      {/* Unboxed Metadata Line with · Separators */}
                      <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="truncate max-w-[140px]">{product.category}</span>
                        {product.brand && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate max-w-[100px]">{product.brand}</span>
                          </>
                        )}
                        {product.rating > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-semibold tabular-nums">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {product.rating.toFixed(1)}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            isOutOfStock
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : 'text-emerald-600 dark:text-emerald-400 font-medium'
                          }
                        >
                          {isOutOfStock ? t('স্টক আউট', 'Out of Stock') : t('স্টকে আছে', 'In Stock')}
                        </span>
                      </div>

                      {/* Price Row */}
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xs sm:text-sm font-extrabold text-sky-600 dark:text-sky-400 tabular-nums">
                          {formatBDT(product.price)}
                        </span>
                        {hasDiscount && (
                          <span className="text-[11px] text-slate-400 line-through tabular-nums">
                            {formatBDT(product.originalPrice!)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Direct Actions: Add to Cart & Order Now */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onAddToCart && !isOutOfStock && (
                        <button
                          type="button"
                          onClick={(e) => handleQuickAddToCart(e, product)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                            isJustAdded
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400'
                          }`}
                          title={t('কার্টে যোগ করুন', 'Add to Cart')}
                        >
                          {isJustAdded ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <ShoppingCart className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => handleOrderProductNow(e, product)}
                        className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                        <span>{t('অর্ডার করুন', 'Order Now')}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Footer Bar: View All Results + Keyboard Hint */}
          {searchResult.products.length > 0 && (
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1.5 cursor-pointer"
              >
                <span>
                  {t(
                    `সব ফলাফল দেখুন (${searchResult.totalMatches}টি পণ্য)`,
                    `View all ${searchResult.totalMatches} results in Shop`
                  )}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <CornerDownLeft className="w-3 h-3" />
                  <span>{t('প্রবেশ করতে ক্লিক বা Enter চাপুন', 'Click product to view details')}</span>
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Mobile sheet mode renders inside MobileBottomNav's full-width top sheet
  if (variant === 'mobile-sheet') {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-900">
        {/* Top Search Input Row */}
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
          <form onSubmit={handleSubmit} className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={t(
                'পণ্য, ব্র্যান্ড বা মডেল লিখে খুঁজুন...',
                'Search products, brands, or SKU...'
              )}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
          <button
            type="button"
            onClick={onCloseMobileSheet}
            className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0 cursor-pointer"
          >
            {t('বন্ধ করুন', 'Close')}
          </button>
        </div>

        {/* Live Search Body */}
        <div className="flex-1 overflow-y-auto">{renderSearchPanelContent()}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <form onSubmit={handleSubmit} className="relative w-full flex items-center min-w-0">
        <div className="relative flex-1 flex items-center min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={t(
              'পণ্য, ব্র্যান্ড বা মডেল খুঁজুন...',
              'Search products, brands, or model...'
            )}
            className="w-full pl-9 lg:pl-10 pr-16 py-2 sm:py-2.5 rounded-l-xl border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/90 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-xs lg:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all min-w-0"
          />

          {/* Clear input button or "/" keyboard badge */}
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                inputRef.current?.focus();
                setIsOpen(true);
              }}
              className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title={t('মুছে ফেলুন', 'Clear search')}
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            variant === 'desktop' && (
              <span className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-md absolute right-2.5 pointer-events-none">
                /
              </span>
            )
          )}
        </div>

        <button
          type="submit"
          className="bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white px-3.5 lg:px-5 py-2 sm:py-2.5 rounded-r-xl font-semibold text-xs lg:text-sm transition-colors flex items-center justify-center shrink-0 cursor-pointer border border-sky-600"
        >
          <Search className="w-4 h-4 lg:mr-1.5" />
          <span className="hidden lg:inline whitespace-nowrap">{t('সার্চ', 'Search')}</span>
        </button>
      </form>

      {/* Instant Live Search Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 w-full md:min-w-[540px] lg:min-w-[640px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {renderSearchPanelContent()}
        </div>
      )}
    </div>
  );
};
