import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Filter,
  Sliders,
  Heart,
  Store,
  BadgeCheck,
  Star,
  Share2,
  Plus,
  Sparkles,
  TrendingUp,
  Tag,
  Boxes,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowDownToLine,
  Eye,
  Video,
} from 'lucide-react';
import { Product } from '../../types';
import { ResellerUser } from '../../types/reseller';
import { ResellerProductDetailPage } from './ResellerProductDetailPage';

interface ResellerProductCatalogPanelProps {
  products: Product[];
  favorites: string[];
  lang?: 'bn' | 'en';
  initialStockView?: 'all' | 'in_stock' | 'out_of_stock' | 'favorites';
  onToggleFavorite: (productId: string) => void;
  onOpenOrderModal: (product: Product) => void;
  onOpenShareModal: (product: Product) => void;
  onOpenCalculator: () => void;
  onOpenLandingPage?: (product: Product) => void;
  onSelectSellerReviews?: (sellerInfo: {
    id: string;
    name: string;
    shopName: string;
    rating: number;
    reviewsCount: number;
    verified: boolean;
  }) => void;
  reseller?: ResellerUser;
}

export const ResellerProductCatalogPanel: React.FC<ResellerProductCatalogPanelProps> = ({
  products,
  favorites,
  lang = 'bn',
  initialStockView = 'all',
  onToggleFavorite,
  onOpenOrderModal,
  onOpenShareModal,
  onOpenCalculator,
  onOpenLandingPage,
  onSelectSellerReviews,
  reseller,
}) => {
  const isBn = lang === 'bn';
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockTab, setStockTab] = useState<'all' | 'in_stock' | 'out_of_stock' | 'favorites'>(initialStockView);
  const [sortBy, setSortBy] = useState<'high_profit' | 'low_price' | 'high_price' | 'popular'>('high_profit');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Quick View Modal State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Trigger HD image download
  const handleDownloadHDImage = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const imageUrl = product.images && product.images[0];
    if (!imageUrl) return;

    setDownloadingId(product.id);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const cleanName = product.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      link.download = `kenaxbd_${cleanName || 'product'}_hd.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setDownloadToast(
        isBn
          ? `✅ "${product.name.slice(0, 20)}..." হাই কোয়ালিটি ছবি ডাউনলোড হয়েছে`
          : `✅ High quality photo downloaded for "${product.name.slice(0, 20)}..."`
      );
      setTimeout(() => setDownloadToast(null), 3000);
    } catch {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.target = '_blank';
      link.download = `kenaxbd_${product.id}_hd.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadToast(isBn ? '✅ ছবি ডাউনলোড উইন্ডো ওপেন হয়েছে' : '✅ Opened image for download');
      setTimeout(() => setDownloadToast(null), 3000);
    } finally {
      setDownloadingId(null);
    }
  };

  // Categories list
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filter and sort products (respecting seller reseller permission)
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      if (p.allowReselling === false) {
        return false;
      }

      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;

      const isOutOfStock = p.stock <= 0 || p.stockStatus === 'out_of_stock';
      let matchStock = true;
      if (stockTab === 'in_stock') matchStock = !isOutOfStock;
      if (stockTab === 'out_of_stock') matchStock = isOutOfStock;
      if (stockTab === 'favorites') matchStock = favorites.includes(p.id);

      return matchSearch && matchCategory && matchStock;
    });

    result.sort((a, b) => {
      const profitA = (a.suggestedResellerRetailPrice || Math.round(a.price * 1.25)) - (a.resellerPrice || a.price);
      const profitB = (b.suggestedResellerRetailPrice || Math.round(b.price * 1.25)) - (b.resellerPrice || b.price);

      if (sortBy === 'high_profit') return profitB - profitA;
      if (sortBy === 'low_price') return a.price - b.price;
      if (sortBy === 'high_price') return b.price - a.price;
      return (b.rating || 5) - (a.rating || 5);
    });

    return result;
  }, [products, searchQuery, categoryFilter, stockTab, favorites, sortBy]);

  const availableResellerProducts = useMemo(() => {
    return products.filter((p) => p.allowReselling !== false);
  }, [products]);

  const inStockCount = useMemo(() => {
    return availableResellerProducts.filter((p) => p.stock > 0 && p.stockStatus !== 'out_of_stock').length;
  }, [availableResellerProducts]);

  const outOfStockCount = useMemo(() => {
    return availableResellerProducts.filter((p) => p.stock <= 0 || p.stockStatus === 'out_of_stock').length;
  }, [availableResellerProducts]);

  // Render Dedicated Full-Page Product Detail View when a product is clicked
  if (quickViewProduct) {
    return (
      <ResellerProductDetailPage
        product={quickViewProduct}
        allProducts={products}
        reseller={
          reseller ||
          ({
            id: 'reseller_temp',
            fullName: 'Authorized Reseller',
            businessName: 'My Reselling Store',
            phone: '',
          } as any)
        }
        lang={lang}
        isFavorite={favorites.includes(quickViewProduct.id)}
        onToggleFavorite={onToggleFavorite}
        onBack={() => setQuickViewProduct(null)}
        onOpenOrder={(prod) => {
          onOpenOrderModal(prod);
        }}
        onSelectProduct={(prod) => {
          setQuickViewProduct(prod);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">

      {/* Download Alert Toast */}
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{downloadToast}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-black uppercase">
              {isBn ? 'জিরো ইনভেস্টমেন্ট' : 'Zero Investment'}
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-[10px] sm:text-xs text-slate-300 font-bold">
              {isBn ? 'ভেরিফাইড ভেন্ডর' : '100% Verified'}
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-[10px] sm:text-xs text-emerald-400 font-bold">
              {isBn ? 'এইচডি মিডিয়া' : 'HD Media'}
            </span>
          </div>
          <h2 className="text-sm sm:text-lg font-black text-white">
            {isBn ? 'হোলসেল প্রোডাক্ট ক্যাটালগ' : 'Wholesale Product Catalog'}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400 max-w-xl hidden sm:block">
            {isBn
              ? 'সেলার অনুমোদিত পণ্য দেখুন, হাই-কোয়ালিটি ফটো ও ক্যাপশন ডাউনলোড করুন এবং ফেসবুক/হোয়াটসঅ্যাপে বিক্রয় করে ইনস্ট্যান্ট প্রফিট বুঝে নিন।'
              : 'Explore vendor-approved wholesale items, download HD media & captions, and resell directly with instant profit margins.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCalculator}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm transition-colors self-start md:self-auto"
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isBn ? 'মার্জিন হিসাব' : 'Margin Calculator'}</span>
        </button>
      </div>

      {/* Stock Status Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none pb-1">
        <button
          type="button"
          onClick={() => setStockTab('all')}
          className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            stockTab === 'all'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 shadow-2xs'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>{isBn ? 'সব' : 'All'}</span>
          <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-950 text-[10px] font-mono text-slate-700 dark:text-slate-300">
            {availableResellerProducts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStockTab('in_stock')}
          className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            stockTab === 'in_stock'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 shadow-2xs'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>{isBn ? 'ইন স্টক' : 'In Stock'}</span>
          <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-950 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
            {inStockCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStockTab('out_of_stock')}
          className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            stockTab === 'out_of_stock'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 shadow-2xs'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>{isBn ? 'স্টক আউট' : 'Out of Stock'}</span>
          <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-950 text-[10px] font-mono text-rose-600 dark:text-rose-400">
            {outOfStockCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStockTab('favorites')}
          className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            stockTab === 'favorites'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 shadow-2xs'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>{isBn ? 'সংরক্ষিত' : 'Saved'}</span>
          <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-950 text-[10px] font-mono text-rose-600 dark:text-rose-300">
            {favorites.length}
          </span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-900 p-2.5 sm:p-3.5 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isBn ? 'হোলসেল পণ্য খুঁজুন...' : 'Search wholesale products...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 sm:py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white cursor-pointer truncate"
          >
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? (isBn ? 'সকল ক্যাটাগরি' : 'All Categories') : cat}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 sm:py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white cursor-pointer truncate"
          >
            <option value="high_profit">{isBn ? 'সর্বোচ্চ লাভ' : 'Highest Profit'}</option>
            <option value="low_price">{isBn ? 'কম মূল্য' : 'Price: Low'}</option>
            <option value="high_price">{isBn ? 'বেশি মূল্য' : 'Price: High'}</option>
            <option value="popular">{isBn ? 'টপ রেটেড' : 'Top Rated'}</option>
          </select>
        </div>
      </div>

      {/* Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 space-y-3">
          <Boxes className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-xs sm:text-sm font-bold text-white">
            {isBn ? 'কোনো প্রোডাক্ট খুঁজে পাওয়া যায়নি' : 'No products found'}
          </h3>
          <p className="text-xs text-slate-400">
            {stockTab === 'out_of_stock'
              ? isBn
                ? 'বর্তমানে কোনো প্রোডাক্ট স্টক-আউট নেই।'
                : 'No products are currently out of stock.'
              : isBn
              ? 'আপনার অনুসন্ধান ফিল্টার পরিবর্তন করে চেষ্টা করুন।'
              : 'Try adjusting your search terms or category filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {filteredProducts.map((product) => {
            const wholesaleCost = product.resellerPrice || product.price;
            const suggestedPrice = product.suggestedResellerRetailPrice || Math.round(product.price * 1.25);
            const estimatedProfit = suggestedPrice - wholesaleCost;
            const profitPercent = Math.round((estimatedProfit / wholesaleCost) * 100);
            const isFav = favorites.includes(product.id);
            const isOutOfStock = product.stock <= 0 || product.stockStatus === 'out_of_stock';
            const sellerName = product.sellerShopName || product.supplierName || product.brand || (isBn ? 'ক্যানাক্স ভেরিফাইড' : 'KenaX Verified');
            const sellerRating = product.sellerRating || 4.9;

            return (
              <div
                key={product.id}
                className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col justify-between group hover:border-emerald-500/50 transition-all duration-200 shadow-2xs"
              >
                {/* Product Image & Top Overlays */}
                <div
                  onClick={() => setQuickViewProduct(product)}
                  className="relative aspect-square bg-slate-50 dark:bg-slate-950 p-2 sm:p-3 flex items-center justify-center overflow-hidden cursor-pointer"
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className={`w-full h-full object-contain group-hover:scale-105 transition-transform duration-200 ${
                      isOutOfStock ? 'grayscale opacity-75' : ''
                    }`}
                  />

                  {/* Favorite Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(product.id);
                    }}
                    className={`absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer ${
                      isFav
                        ? 'bg-rose-950/80 text-rose-400 border border-rose-800'
                        : 'bg-slate-900/80 text-slate-400 hover:text-rose-400 border border-slate-800'
                    }`}
                    title="Favorite"
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-400' : ''}`} />
                  </button>

                  {/* Quick View Button on Image (Desktop) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickViewProduct(product);
                    }}
                    className="hidden sm:flex absolute top-2 right-11 w-8 h-8 rounded-full items-center justify-center bg-slate-900/80 text-sky-300 hover:text-white border border-slate-800 backdrop-blur-md transition-colors cursor-pointer"
                    title="Quick View"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {/* Stock Tag */}
                  {isOutOfStock ? (
                    <span className="absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-950/95 text-rose-300 border border-rose-800 flex items-center gap-0.5">
                      <AlertCircle className="w-2.5 h-2.5" />
                      <span>{isBn ? 'স্টক আউট' : 'Stock Out'}</span>
                    </span>
                  ) : (
                    <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800">
                      {isBn ? `স্টক: ${product.stock}` : `Stock: ${product.stock}`}
                    </span>
                  )}
                </div>

                {/* Product Info & Margin Box */}
                <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col justify-between text-xs">
                  <div>
                    {/* Seller Name & Rating Header */}
                    <div className="flex items-center justify-between gap-1 mb-1 pb-1 border-b border-slate-800/60 text-[10px] sm:text-[11px]">
                      <div className="flex items-center gap-1 min-w-0">
                        <Store className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="font-bold text-slate-300 truncate">{sellerName}</span>
                      </div>
                      <span className="text-amber-400 flex items-center gap-0.5 shrink-0 font-bold text-[10px]">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        <span>{sellerRating}</span>
                      </span>
                    </div>

                    <h4
                      onClick={() => setQuickViewProduct(product)}
                      className="font-bold text-white line-clamp-2 leading-snug cursor-pointer hover:text-emerald-400 transition-colors text-[11px] sm:text-xs"
                    >
                      {product.name}
                    </h4>

                    {/* Reseller Margin Calculation Box */}
                    <div className="mt-1.5 sm:mt-2.5 p-2 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5 sm:space-y-1">
                      <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-400">
                        <span>{isBn ? 'হোলসেল:' : 'Cost:'}</span>
                        <span className="font-bold text-white tabular-nums">৳{wholesaleCost.toLocaleString('en-BD')}</span>
                      </div>
                      <div className="flex justify-between text-[10px] sm:text-[11px] font-black text-emerald-400 border-t border-slate-800/80 pt-0.5">
                        <span>{isBn ? 'লাভ:' : 'Profit:'}</span>
                        <span className="tabular-nums">+৳{estimatedProfit} ({profitPercent}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-800/80">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenShareModal(product)}
                        className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors flex items-center justify-center gap-1 text-[10px] font-bold"
                        title="Share"
                      >
                        <Share2 className="w-3 h-3" />
                        <span className="hidden xs:inline">{isBn ? 'শেয়ার' : 'Share'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDownloadHDImage(product, e)}
                        disabled={downloadingId === product.id}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 cursor-pointer transition-colors"
                        title="Download Photo"
                      >
                        {downloadingId === product.id ? (
                          <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin block" />
                        ) : (
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenOrderModal(product)}
                      disabled={isOutOfStock}
                      className={`w-full py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer ${
                        isOutOfStock
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {isOutOfStock
                          ? isBn ? 'স্টক আউট' : 'Out of Stock'
                          : isBn ? 'অর্ডার করুন' : 'Order Now'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
