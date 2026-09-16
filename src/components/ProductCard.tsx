import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, Heart, Eye, Zap, ExternalLink, User, Package } from 'lucide-react';
import { Product, UserRole } from '../types';
import { getOptimizedImageUrl, isImagePreloaded, markImageLoaded, NEUTRAL_PRODUCT_PLACEHOLDER } from '../utils/imageOptimizer';
import { resolveOriginalImageMedia, getSynchronouslyResolvedMedia } from '../lib/firebase';
import { getProductStockStatus, getStockStatusInfo } from '../utils/stockUtils';

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
  const rawImage = (product.images?.[0] && product.images[0].trim() !== '')
    ? product.images[0]
    : NEUTRAL_PRODUCT_PLACEHOLDER;

  // Synchronously resolve media reference if already in memory/localStorage cache
  const syncMedia = rawImage.startsWith('media://') ? getSynchronouslyResolvedMedia(rawImage) : null;
  const effectiveRaw = syncMedia || rawImage;
  const initialOptimized = effectiveRaw.startsWith('media://')
    ? effectiveRaw
    : getOptimizedImageUrl(effectiveRaw, 360);

  const [displayImage, setDisplayImage] = useState<string>(initialOptimized);
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    if (initialOptimized.startsWith('media://')) return false;
    return isImagePreloaded(initialOptimized, 360) || !initialOptimized.startsWith('media://');
  });

  useEffect(() => {
    let isMounted = true;
    if (rawImage.startsWith('media://')) {
      const syncVal = getSynchronouslyResolvedMedia(rawImage);
      if (syncVal) {
        setDisplayImage(syncVal);
        setIsLoaded(true);
        markImageLoaded(syncVal, 360);
      } else {
        resolveOriginalImageMedia(rawImage, product.id).then((url) => {
          if (isMounted) {
            const validUrl = (url && !url.startsWith('media://')) ? url : NEUTRAL_PRODUCT_PLACEHOLDER;
            setDisplayImage(validUrl);
            setIsLoaded(true);
            markImageLoaded(validUrl, 360);
          }
        });
      }
    } else {
      const optimized = getOptimizedImageUrl(rawImage, 360);
      setDisplayImage(optimized);
      if (isImagePreloaded(optimized, 360)) {
        setIsLoaded(true);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [rawImage, product.id]);

  const isStaff = !!currentRole && ['super_admin', 'admin', 'manager', 'moderator'].includes(currentRole);
  const getBadge = () => {
    const hasTag = (tag: string) =>
      product.tags && product.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()));

    if (product.saleBadge === 'Trending' || product.isTrending || hasTag('trending')) {
      return (
        <span className="bg-purple-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs">
          <span>🔥</span>
          <span>Trending</span>
        </span>
      );
    }
    if (product.saleBadge === 'New' || product.isNew || hasTag('new arrival') || hasTag('new')) {
      return (
        <span className="bg-sky-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs">
          <span>✨</span>
          <span>New</span>
        </span>
      );
    }
    if (product.saleBadge === 'Best Seller' || product.isBestSeller || hasTag('best seller')) {
      return (
        <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs">
          <span>🏆</span>
          <span>Best Seller</span>
        </span>
      );
    }
    if (product.saleBadge === 'Hot' || product.isHot || hasTag('flash sale') || hasTag('hot deal') || hasTag('hot')) {
      return (
        <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs">
          <span>⚡</span>
          <span>Flash Sale</span>
        </span>
      );
    }
    if (product.saleBadge === 'Featured' || product.isFeatured || hasTag('featured')) {
      return (
        <span className="bg-amber-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs">
          <span>⭐</span>
          <span>Featured</span>
        </span>
      );
    }
    if (product.discountType === 'flat' && product.discountValue && product.discountValue > 0) {
      return (
        <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
          -৳{product.discountValue.toLocaleString('en-BD')} OFF
        </span>
      );
    }
    if (product.discountPercent && product.discountPercent > 0) {
      return (
        <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
          -{product.discountPercent}% OFF
        </span>
      );
    }
    return null;
  };

  const getSpecsSnippet = () => {
    if (product.specifications) {
      const keys = Object.keys(product.specifications);
      if (keys.length > 0) {
        return product.specifications[keys[0]];
      }
    }
    return product.brand || product.category || 'Official Product';
  };

  return (
    <div className="product-card-contain bg-white rounded-2xl border border-slate-200 hover:border-sky-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group transform-gpu">
      {/* Product Image & Badges */}
      <div
        onClick={() => onQuickView(product)}
        className="relative bg-slate-50 aspect-square overflow-hidden flex items-center justify-center p-3 cursor-pointer"
      >
        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
          {getBadge()}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product);
          }}
          className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isWishlisted
              ? 'bg-rose-50 text-rose-600 shadow-xs'
              : 'bg-white/80 backdrop-blur-xs text-slate-500 hover:text-rose-600 hover:bg-white shadow-xs'
          }`}
          aria-label="Wishlist"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
        </button>

        {/* Product Image */}
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-200"
          loading="lazy"
          decoding="async"
          onLoad={() => {
            setIsLoaded(true);
            markImageLoaded(displayImage, 400);
          }}
          onError={(e) => {
            setIsLoaded(true);
            const target = e.currentTarget;
            if (target.src !== NEUTRAL_PRODUCT_PLACEHOLDER) {
              target.src = NEUTRAL_PRODUCT_PLACEHOLDER;
            }
          }}
        />

        {/* Quick View Overlay on Hover */}
        <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onQuickView(product)}
            className="px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold shadow-md hover:bg-sky-50 flex items-center gap-1.5 transition-all transform translate-y-2 group-hover:translate-y-0 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between min-w-0">
        <div className="min-w-0">
          {/* Title */}
          <h3
            onClick={() => onQuickView(product)}
            className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 hover:text-sky-600 transition-colors cursor-pointer leading-snug"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Subtitle / Key Specs */}
          <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 mt-0.5">
            {getSpecsSnippet()}
          </p>

          {/* Star Rating & Review Count & Availability Badge */}
          <div className="flex items-center justify-between gap-1 mt-1 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1 text-amber-500">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                      i < Math.floor(product.rating || 5)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600">
                ({product.reviewsCount ?? 0})
              </span>
            </div>

            {/* Availability status badge */}
            {(() => {
              const status = getProductStockStatus(product);
              if (status === 'out_of_stock') {
                return (
                  <span className="text-[9px] sm:text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-md">
                    Out of Stock
                  </span>
                );
              }
              if (status === 'upcoming') {
                return (
                  <span className="text-[9px] sm:text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded-md">
                    Upcoming
                  </span>
                );
              }
              return (
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md">
                  In Stock
                </span>
              );
            })()}
          </div>
        </div>

        {/* Price & Action Buttons */}
        <div className="mt-2.5 pt-2 sm:mt-3 sm:pt-2.5 border-t border-slate-100 flex flex-col gap-1.5 min-w-0">
          <div className="flex flex-row items-center flex-nowrap gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap">
            <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight shrink-0">
              ৳ {(product.price || 0).toLocaleString('en-BD')}
            </span>
            {(product.originalPrice || 0) > (product.price || 0) && (
              <span className="text-[10px] sm:text-xs text-slate-400 line-through shrink-0">
                ৳ {(product.originalPrice || 0).toLocaleString('en-BD')}
              </span>
            )}
            {product.discountType === 'flat' && product.discountValue ? (
              <span className="text-[9px] sm:text-[10px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-100 shrink-0 whitespace-nowrap">
                -৳{(product.discountValue || 0).toLocaleString('en-BD')}
              </span>
            ) : product.discountPercent && product.discountPercent > 0 ? (
              <span className="text-[9px] sm:text-[10px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-100 shrink-0 whitespace-nowrap">
                {product.discountPercent}% save
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
                  className="w-full py-2.5 px-2 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-1 border border-slate-200 opacity-80 cursor-not-allowed"
                >
                  <span>Out of Stock (আউট অফ স্টক)</span>
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
                  className="w-full py-2.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center gap-1 border border-purple-200 cursor-pointer transition-colors"
                >
                  <span>Upcoming (আপকামিং)</span>
                </button>
              );
            }
            return (
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-1 min-w-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product, 1, undefined, displayImage || product.images?.[0]);
                  }}
                  className="w-full py-2 md:py-2.5 px-1.5 sm:px-2 rounded-xl bg-slate-100 hover:bg-sky-50 hover:border-sky-300 active:bg-slate-200 text-slate-800 hover:text-sky-900 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer border border-slate-200 shadow-2xs min-w-0 overflow-hidden"
                  title="Add to Cart"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <span className="truncate">Add to Cart</span>
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
                  className="w-full py-2 md:py-2.5 px-1.5 sm:px-2 rounded-xl bg-gradient-to-r from-sky-600 via-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:from-sky-700 text-white font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 transition-all shadow-xs hover:shadow-md active:scale-98 cursor-pointer min-w-0 overflow-hidden"
                  title="Buy Now"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0" />
                  <span className="truncate">Buy Now</span>
                </button>
              </div>
            );
          })()}

          {/* Staff-Only Dropship / Supplier Link (Strictly hidden from customers, cleanly structured) */}
          {isStaff && product.supplierUrl && (
            <a
              href={product.supplierUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 w-full py-1.5 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:shadow-xs min-w-0"
              title="Staff Only: Open Dropshipping Source Page (AliExpress/Alibaba)"
            >
              <ExternalLink className="w-3 h-3 text-amber-700 shrink-0" />
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
