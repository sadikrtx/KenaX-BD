import React, { useState, useEffect } from 'react';
import { ShoppingCart, Heart, Eye, Zap, ExternalLink, CheckCircle } from 'lucide-react';
import { Product, UserRole } from '../types';
import { getOptimizedImageUrl, isImagePreloaded, markImageLoaded, NEUTRAL_PRODUCT_PLACEHOLDER, handleImageError } from '../utils/imageOptimizer';
import { resolveOriginalImageMedia, getSynchronouslyResolvedMedia } from '../lib/firebase';
import { getProductStockStatus } from '../utils/stockUtils';
import { isProductPopular } from '../utils/productPopularity';
import { useLanguage } from '../context/LanguageContext';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity?: number, variant?: string, customImage?: string) => void;
  onBuyNow?: (product: Product, quantity?: number, variant?: string, customImage?: string) => void;
  onQuickView: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: boolean;
  currentRole?: UserRole;
  isLoggedIn?: boolean;
  onOpenCustomerAuth?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onAddToCart,
  onBuyNow,
  onQuickView,
  onToggleWishlist,
  isWishlisted,
  currentRole,
  isLoggedIn = false,
  onOpenCustomerAuth,
}) => {
  const { language, t } = useLanguage();
  const rawImage = (product.images?.[0] && product.images[0].trim() !== '')
    ? product.images[0]
    : NEUTRAL_PRODUCT_PLACEHOLDER;

  // Synchronously resolve media reference if already in memory/localStorage cache
  const syncMedia = rawImage.startsWith('media://') ? getSynchronouslyResolvedMedia(rawImage) : null;
  const effectiveRaw = syncMedia || rawImage;
  const initialOptimized = effectiveRaw.startsWith('media://')
    ? effectiveRaw
    : getOptimizedImageUrl(effectiveRaw, 600);

  const [displayImage, setDisplayImage] = useState<string>(initialOptimized);
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    if (initialOptimized.startsWith('media://')) return false;
    return isImagePreloaded(initialOptimized, 600) || !initialOptimized.startsWith('media://');
  });

  useEffect(() => {
    let isMounted = true;
    if (rawImage.startsWith('media://')) {
      const syncVal = getSynchronouslyResolvedMedia(rawImage);
      if (syncVal) {
        setDisplayImage(syncVal);
        setIsLoaded(true);
        markImageLoaded(syncVal, 600);
      } else {
        resolveOriginalImageMedia(rawImage, product.id).then((url) => {
          if (isMounted) {
            const validUrl = (url && !url.startsWith('media://')) ? url : NEUTRAL_PRODUCT_PLACEHOLDER;
            setDisplayImage(validUrl);
            setIsLoaded(true);
            markImageLoaded(validUrl, 600);
          }
        });
      }
    } else {
      const optimized = getOptimizedImageUrl(rawImage, 600);
      setDisplayImage(optimized);
      if (isImagePreloaded(optimized, 600)) {
        setIsLoaded(true);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [rawImage, product.id]);

  const isStaff = !!currentRole && ['super_admin', 'admin', 'manager', 'moderator'].includes(currentRole);
  const getBadge = () => {
    const badges: React.ReactNode[] = [];
    const hasTag = (tag: string) =>
      product.tags && product.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()));

    const isPopularItem = isProductPopular(product.id, 2) || (product as any).isPopular;
    if (isPopularItem) {
      badges.push(
        <span
          key="popular"
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs"
        >
          <span>🔥</span>
          <span>Popular</span>
        </span>
      );
    }

    if (product.saleBadge === 'Trending' || product.isTrending || hasTag('trending')) {
      if (!isPopularItem) {
        badges.push(
          <span
            key="trending"
            className="bg-purple-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs"
          >
            <span>🔥</span>
            <span>Trending</span>
          </span>
        );
      }
    } else if (product.saleBadge === 'New' || product.isNew || hasTag('new arrival') || hasTag('new')) {
      badges.push(
        <span
          key="new"
          className="bg-sky-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs"
        >
          <span>✨</span>
          <span>New</span>
        </span>
      );
    } else if (product.saleBadge === 'Best Seller' || product.isBestSeller || hasTag('best seller')) {
      badges.push(
        <span
          key="bestseller"
          className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs"
        >
          <span>🏆</span>
          <span>Best Seller</span>
        </span>
      );
    } else if (product.saleBadge === 'Hot' || product.isHot || hasTag('flash sale') || hasTag('hot deal') || hasTag('hot')) {
      badges.push(
        <span
          key="hot"
          className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs"
        >
          <span>⚡</span>
          <span>Flash Sale</span>
        </span>
      );
    } else if (product.saleBadge === 'Featured' || product.isFeatured || hasTag('featured')) {
      badges.push(
        <span
          key="featured"
          className="bg-amber-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs"
        >
          <span>⭐</span>
          <span>Featured</span>
        </span>
      );
    }

    if (product.discountType === 'flat' && product.discountValue && product.discountValue > 0) {
      badges.push(
        <span
          key="discount"
          className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs"
        >
          -৳{product.discountValue.toLocaleString('en-BD')} OFF
        </span>
      );
    } else if (product.discountPercent && product.discountPercent > 0) {
      badges.push(
        <span
          key="discount"
          className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs"
        >
          -{product.discountPercent}% OFF
        </span>
      );
    }

    return badges.length > 0 ? badges : null;
  };

  return (
    <div className="product-card-contain bg-white dark:bg-slate-900/95 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 hover:border-sky-400 dark:hover:border-sky-500/70 shadow-2xs hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:-translate-y-0.5">
      {/* Product Image & Badges */}
      <div
        onClick={() => onQuickView(product)}
        className="relative bg-slate-50 dark:bg-slate-800/60 aspect-square overflow-hidden flex items-center justify-center p-2.5 sm:p-3 cursor-pointer"
      >
        {/* Top Badges */}
        <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10 flex flex-col gap-1">
          {getBadge()}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product);
          }}
          className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-90 ${
            isWishlisted
              ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'bg-white/90 dark:bg-slate-800/90 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-700 shadow-xs'
          }`}
          aria-label="Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-rose-600 dark:fill-rose-400' : ''}`} />
        </button>

        {/* Product Image */}
        <img
          src={displayImage}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
          decoding="async"
          onLoad={() => {
            setIsLoaded(true);
            markImageLoaded(displayImage, 600);
          }}
          onError={(e) => {
            setIsLoaded(true);
            handleImageError(e, rawImage);
          }}
        />

        {/* Quick View Overlay on Hover */}
        <div className="hidden sm:flex absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-2">
          <button
            onClick={() => onQuickView(product)}
            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold shadow-md hover:bg-sky-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all transform translate-y-2 group-hover:translate-y-0 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t('কুইক ভিউ', 'Quick View')}</span>
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between min-w-0">
        <div className="min-w-0">
          {/* Title */}
          <h3
            onClick={() => onQuickView(product)}
            className="text-xs sm:text-sm font-black text-slate-900 dark:text-white line-clamp-2 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer leading-snug tracking-tight min-h-[2.35rem] sm:min-h-[2.5rem]"
            title={product.name}
          >
            {language === 'bn' && product.banglaName ? product.banglaName : product.name}
          </h3>

          {/* KenaX Verified Badge */}
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/80 dark:border-sky-800/80 px-2 py-0.5 rounded-md">
              <CheckCircle className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>KenaX Verified</span>
            </span>
          </div>
        </div>

        {/* Price & Action Buttons */}
        <div className="mt-2 pt-2 sm:mt-3 sm:pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5 min-w-0">
          <div className="flex flex-row items-center flex-nowrap gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap">
            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight shrink-0">
              ৳ {(product.price || 0).toLocaleString('en-BD')}
            </span>
            {(product.originalPrice || 0) > (product.price || 0) && (
              <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 line-through shrink-0">
                ৳ {(product.originalPrice || 0).toLocaleString('en-BD')}
              </span>
            )}
            {product.discountType === 'flat' && product.discountValue ? (
              <span className="text-[9px] sm:text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1 py-0.5 rounded border border-rose-100 dark:border-rose-800 shrink-0 whitespace-nowrap">
                -৳{(product.discountValue || 0).toLocaleString('en-BD')}
              </span>
            ) : product.discountPercent && product.discountPercent > 0 ? (
              <span className="text-[9px] sm:text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1 py-0.5 rounded border border-rose-100 dark:border-rose-800 shrink-0 whitespace-nowrap">
                {product.discountPercent}% {t('ছাড়', 'save')}
              </span>
            ) : null}
          </div>

          {/* Action Buttons based on Availability Status */}
          {(() => {
            const status = getProductStockStatus(product);
            if (status === 'out_of_stock') {
              return (
                <button
                  disabled
                  className="w-full py-2 sm:py-2.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-700 opacity-80 cursor-not-allowed"
                >
                  <span>{t('স্টক শেষ', 'Out of Stock')}</span>
                </button>
              );
            }
            if (status === 'upcoming') {
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickView(product);
                  }}
                  className="w-full py-2 sm:py-2.5 px-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-purple-800 dark:text-purple-300 font-bold text-xs flex items-center justify-center gap-1 border border-purple-200 dark:border-purple-800 cursor-pointer transition-colors"
                >
                  <span>{t('শীঘ্রই আসছে', 'Upcoming')}</span>
                </button>
              );
            }
            return (
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-0.5 min-w-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product, 1, undefined, displayImage || product.images?.[0]);
                  }}
                  className="w-full py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:border-sky-300 dark:hover:border-sky-600 active:scale-95 text-slate-800 dark:text-slate-200 hover:text-sky-900 dark:hover:text-sky-300 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs min-w-0 overflow-hidden"
                  title="Add to Cart"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400 shrink-0" />
                  <span className="truncate">{t('কার্ট', 'Add to Cart')}</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const chosenImage = displayImage || product.images?.[0];
                    if (onBuyNow) {
                      onBuyNow(product, 1, undefined, chosenImage);
                    } else {
                      onAddToCart(product, 1, undefined, chosenImage);
                    }
                  }}
                  className="w-full py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl bg-gradient-to-r from-sky-600 via-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:scale-95 text-white font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 transition-all shadow-xs hover:shadow-md cursor-pointer min-w-0 overflow-hidden"
                  title="Buy Now"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0" />
                  <span className="truncate">{t('অর্ডার করুন', 'Buy Now')}</span>
                </button>
              </div>
            );
          })()}

          {/* Staff-Only Dropship / Supplier Link */}
          {isStaff && product.supplierUrl && (
            <a
              href={product.supplierUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 w-full py-1.5 px-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs min-w-0"
              title="Staff Only: Open Dropshipping Source Page (AliExpress/Alibaba)"
            >
              <ExternalLink className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
              <span className="truncate">
                {product.supplierName ? `Source: ${product.supplierName}` : '🔗 Supplier Source Link ↗'}
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
});
