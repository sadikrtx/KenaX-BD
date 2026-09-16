import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Star,
  ShoppingCart,
  Zap,
  CheckCircle,
  Play,
  Pause,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Heart,
  Check,
  Sparkles,
} from 'lucide-react';
import { Product, UserRole, ColorVariation } from '../types';
import { getProductStockStatus, getStockStatusInfo } from '../utils/stockUtils';
import { FormattedText } from './FormattedText';
import { HighlightIcon } from './HighlightIcon';
import { DEFAULT_PRODUCT_HIGHLIGHTS } from '../utils/highlightConstants';
import { NEUTRAL_PRODUCT_PLACEHOLDER, getOptimizedImageUrl, markImageLoaded, preloadImage } from '../utils/imageOptimizer';
import { ProductVideoPlayer } from './ProductVideoPlayer';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, variant?: string, customImage?: string) => void;
  onBuyNow: (product: Product, quantity: number, variant?: string, customImage?: string) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: boolean;
  currentRole: UserRole;
  isLoggedIn?: boolean;
  onOpenCustomerAuth?: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  isWishlisted,
  currentRole,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'reviews'>('details');
  const [isPaused, setIsPaused] = useState(false);
  const [holdUntil, setHoldUntil] = useState<number>(() => Date.now() + 4000);

  // Variations state
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedCustomOptions, setSelectedCustomOptions] = useState<Record<string, string>>({});
  const [activeColorImage, setActiveColorImage] = useState<string | null>(null);

  const validImages = useMemo(() => {
    const list = (product?.images || []).filter(
      (img) => typeof img === 'string' && img.trim() !== ''
    );
    return list.length > 0 ? list : [NEUTRAL_PRODUCT_PLACEHOLDER];
  }, [product?.images]);

  const hasVideo = Boolean(product?.videoUrl && product.videoUrl.trim() !== '');
  const totalSlides = validImages.length + (hasVideo ? 1 : 0);

  // Initialize variation states when product changes
  useEffect(() => {
    if (product) {
      setSelectedImageIndex(0);
      setShowVideo(false);
      setQuantity(1);
      setIsPaused(false);

      if (product.colors && product.colors.length > 0) {
        const firstColor = product.colors[0];
        setSelectedColor(firstColor.name);
        if (firstColor.imageUrl && firstColor.imageUrl.trim() !== '') {
          setActiveColorImage(firstColor.imageUrl);
          const imgIdx = (product.images || []).findIndex((img) => img === firstColor.imageUrl);
          if (imgIdx !== -1) {
            setSelectedImageIndex(imgIdx);
          }
        } else {
          setActiveColorImage(null);
        }
      } else {
        setSelectedColor('');
        setActiveColorImage(null);
      }

      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0]);
      } else {
        setSelectedSize('');
      }

      if (product.variations && product.variations.length > 0) {
        const initialCustom: Record<string, string> = {};
        product.variations.forEach((v) => {
          if (v.options && v.options.length > 0) {
            initialCustom[v.name] = v.options[0];
          }
        });
        setSelectedCustomOptions(initialCustom);
      } else {
        setSelectedCustomOptions({});
      }

      // 4-second hold on initial load with default color
      setHoldUntil(Date.now() + 4000);
    }
  }, [product]);

  // Auto-Slide carousel: 4s hold on initial load / color switch, then 3s auto-slide across images & video
  useEffect(() => {
    if (!isOpen || !product || isPaused || totalSlides <= 1) return;

    const remainingHold = Math.max(0, holdUntil - Date.now());
    const delay = remainingHold > 0 ? remainingHold : 3000;

    const timer = setTimeout(() => {
      if (isPaused) return;
      setActiveColorImage(null);
      const currentIdx = showVideo ? validImages.length : selectedImageIndex;
      const nextIdx = (currentIdx + 1) % totalSlides;
      if (hasVideo && nextIdx === validImages.length) {
        setShowVideo(true);
      } else {
        setShowVideo(false);
        setSelectedImageIndex(nextIdx);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isOpen, product, selectedImageIndex, showVideo, holdUntil, isPaused, totalSlides, hasVideo, validImages.length]);

  if (!isOpen || !product) return null;

  const hasSpecifications = Boolean(
    product.specifications && Object.keys(product.specifications).length > 0
  );

  const isStaff = ['super_admin', 'admin', 'manager', 'moderator'].includes(currentRole);

  // Match selected variant combination
  const matchedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return null;
    const allSelectedVals = [selectedSize, ...Object.values(selectedCustomOptions), selectedColor].filter(Boolean);
    const found = product.variants.find((v) => {
      const vName = v.name.toLowerCase().trim();
      if (selectedSize && (vName === selectedSize.toLowerCase().trim() || vName.includes(selectedSize.toLowerCase().trim()))) {
        return true;
      }
      return allSelectedVals.some((val) => vName === val.toLowerCase().trim() || vName.includes(val.toLowerCase().trim()));
    });
    return found || null;
  }, [product.variants, selectedSize, selectedCustomOptions, selectedColor]);

  // Compute effective active unit price considering variant modifier
  const activeUnitPrice = useMemo(() => {
    let p = product.price;
    if (matchedVariant?.priceModifier) {
      p += matchedVariant.priceModifier;
    }
    return Math.max(1, p);
  }, [product.price, matchedVariant]);

  const activeOriginalPrice = useMemo(() => {
    const baseOriginal = product.originalPrice || product.price;
    if (matchedVariant?.priceModifier) {
      return baseOriginal + matchedVariant.priceModifier;
    }
    return baseOriginal;
  }, [product.originalPrice, product.price, matchedVariant]);

  const activeStock = matchedVariant?.stock !== undefined ? matchedVariant.stock : (product.stock ?? 50);
  const activeSku = matchedVariant?.sku || product.sku;

  const profitBDT = product.costPrice ? activeUnitPrice - product.costPrice : 0;
  const marginPercent = product.costPrice
    ? Math.round((profitBDT / activeUnitPrice) * 100)
    : 0;

  // Handle color selection
  const handleSelectColor = (color: ColorVariation) => {
    setSelectedColor(color.name);
    setShowVideo(false);
    if (color.imageUrl && color.imageUrl.trim() !== '') {
      setActiveColorImage(color.imageUrl);
      const imgIdx = validImages.findIndex((img) => img === color.imageUrl);
      if (imgIdx !== -1) {
        setSelectedImageIndex(imgIdx);
      }
    } else {
      setActiveColorImage(null);
    }
    // Hold 4 seconds when user selects another color
    setHoldUntil(Date.now() + 4000);
  };

  const handleSelectImageSlide = (idx: number) => {
    setSelectedImageIndex(idx);
    setShowVideo(false);
    setActiveColorImage(null);
    setHoldUntil(Date.now() + 4000);
  };

  const handleSelectVideoSlide = () => {
    if (!hasVideo) return;
    setShowVideo(true);
    setActiveColorImage(null);
    setHoldUntil(Date.now() + 4000);
  };

  const handlePrevSlide = () => {
    if (totalSlides <= 1) return;
    setActiveColorImage(null);
    const currentIdx = showVideo ? validImages.length : selectedImageIndex;
    const newIdx = currentIdx === 0 ? totalSlides - 1 : currentIdx - 1;
    if (hasVideo && newIdx === validImages.length) {
      setShowVideo(true);
    } else {
      setShowVideo(false);
      setSelectedImageIndex(newIdx);
    }
    setHoldUntil(Date.now() + 4000);
  };

  const handleNextSlide = () => {
    if (totalSlides <= 1) return;
    setActiveColorImage(null);
    const currentIdx = showVideo ? validImages.length : selectedImageIndex;
    const newIdx = (currentIdx + 1) % totalSlides;
    if (hasVideo && newIdx === validImages.length) {
      setShowVideo(true);
    } else {
      setShowVideo(false);
      setSelectedImageIndex(newIdx);
    }
    setHoldUntil(Date.now() + 4000);
  };

  // Compose complete variant string for Cart & Checkout
  const getSelectedVariantString = () => {
    const parts: string[] = [];
    if (selectedColor) parts.push(`Color: ${selectedColor}`);
    if (selectedSize) parts.push(`Size: ${selectedSize}`);
    Object.entries(selectedCustomOptions).forEach(([k, v]) => {
      if (v) parts.push(`${k}: ${v}`);
    });
    return parts.length > 0 ? parts.join(' | ') : undefined;
  };

  const imagesList = validImages;

  const currentDisplayImage =
    (matchedVariant?.image && matchedVariant.image.trim() !== '' && !activeColorImage)
      ? matchedVariant.image
      : (activeColorImage && activeColorImage.trim() !== '')
      ? activeColorImage
      : imagesList[selectedImageIndex < imagesList.length ? selectedImageIndex : 0] ||
        imagesList[0] ||
        NEUTRAL_PRODUCT_PLACEHOLDER;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 md:p-6">
      <div className="relative bg-white rounded-none sm:rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border-0 sm:border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto min-h-screen sm:min-h-0">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100/90 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
          aria-label="Close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 max-h-[100vh] sm:max-h-[85vh] overflow-y-auto">
          {/* Left Column: Media Gallery (Images with 3s Auto-Slide + Video) */}
          <div
            className="p-0 sm:p-4 bg-white sm:bg-slate-50/80 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            <div>
              {/* Main Media Preview Box */}
              <div className="relative aspect-square rounded-none sm:rounded-2xl bg-white border-0 sm:border border-slate-200/90 overflow-hidden flex items-center justify-center shadow-none sm:shadow-xs group">
                {showVideo && product.videoUrl ? (
                  <ProductVideoPlayer
                    videoUrl={product.videoUrl}
                    title={product.name}
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <img
                    src={getOptimizedImageUrl(currentDisplayImage, 800)}
                    alt={product.name}
                    loading="eager"
                    decoding="async"
                    onLoad={() => markImageLoaded(currentDisplayImage, 800)}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== NEUTRAL_PRODUCT_PLACEHOLDER) {
                        target.src = NEUTRAL_PRODUCT_PLACEHOLDER;
                      }
                    }}
                    className="w-full h-full object-contain p-0 sm:p-2.5 mix-blend-multiply transition-transform duration-300 transform scale-100 group-hover:scale-105"
                  />
                )}

                {/* Color preview badge if active */}
                {activeColorImage && (
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-900/85 text-white text-[10px] sm:text-[11px] font-bold backdrop-blur-xs flex items-center gap-1.5 shadow-sm z-10">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>{selectedColor} Preview</span>
                  </div>
                )}

                {/* Left/Right Slide Arrows if multiple media items */}
                {totalSlides > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevSlide();
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 z-20"
                      aria-label="Previous Slide"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextSlide();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 z-20"
                      aria-label="Next Slide"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </>
                )}

                {/* Video toggle button if video exists */}
                {hasVideo && (
                  <button
                    onClick={() => {
                      if (showVideo) {
                        setShowVideo(false);
                        setSelectedImageIndex(0);
                      } else {
                        setShowVideo(true);
                        setActiveColorImage(null);
                      }
                      setHoldUntil(Date.now() + 4000);
                    }}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-semibold backdrop-blur-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors z-20"
                  >
                    {showVideo ? (
                      <>
                        <Pause className="w-3 h-3 text-sky-400" />
                        <span>Photo</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 text-sky-400 fill-sky-400" />
                        <span>Video</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Thumbnails Row */}
              <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectImageSlide(idx)}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 overflow-hidden shrink-0 bg-white p-0.5 cursor-pointer transition-all ${
                      !showVideo && (selectedImageIndex === idx || activeColorImage === img)
                        ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-xs scale-105'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img
                      src={getOptimizedImageUrl(img, 150)}
                      alt={`Thumbnail ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      onLoad={() => markImageLoaded(img, 150)}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== NEUTRAL_PRODUCT_PLACEHOLDER) {
                          target.src = NEUTRAL_PRODUCT_PLACEHOLDER;
                        }
                      }}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}

                {hasVideo && (
                  <button
                    onClick={handleSelectVideoSlide}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 shrink-0 bg-slate-900 text-white flex flex-col items-center justify-center p-0.5 cursor-pointer transition-all ${
                      showVideo ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-xs scale-105' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Play className="w-4 h-4 text-sky-400 fill-sky-400" />
                    <span className="text-[9px] font-bold mt-0.5">Video</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Details & Actions */}
          <div className="p-3.5 sm:p-5 md:p-6 flex flex-col justify-between">
            <div>
              {/* Category, Brand & Base Sale Badge */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                {product.brand && (
                  <>
                    <span className="text-[11px] sm:text-xs font-semibold text-sky-600 uppercase tracking-wider">{product.brand}</span>
                    <span className="text-slate-300">•</span>
                  </>
                )}
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">{product.category}</span>
                {product.saleBadge === 'Trending' || product.isTrending ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                    <span>🔥</span> Trending
                  </span>
                ) : product.saleBadge === 'New' || product.isNew ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200">
                    <span>✨</span> New Arrival
                  </span>
                ) : product.saleBadge === 'Best Seller' || product.isBestSeller ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span>🏆</span> Best Seller
                  </span>
                ) : product.saleBadge === 'Hot' || product.isHot ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                    <span>⚡</span> Hot Deal
                  </span>
                ) : product.saleBadge === 'Featured' || product.isFeatured ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                    <span>⭐</span> Featured
                  </span>
                ) : null}
              </div>

              {/* Product Title */}
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                {product.name}
              </h2>
              {product.banglaName && (
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">{product.banglaName}</p>
              )}

              {/* Rating & Reviews Count */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap sm:flex-nowrap">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.floor(product.rating) ? 'fill-amber-400' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-700">{product.rating}</span>
                <span className="text-xs text-slate-500 font-medium">
                  ({product.reviewsCount}
                  <span className="hidden sm:inline"> customer reviews</span>)
                </span>
                <span className="text-slate-300">•</span>
                {(() => {
                  const currentStatus = getProductStockStatus(product);
                  const info = getStockStatusInfo(currentStatus);
                  return (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${info.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${info.dotClass}`} />
                      {info.labelEn} ({info.labelBn})
                    </span>
                  );
                })()}
              </div>

              {/* Dynamic Price Box based on Quantity */}
              <div className="mt-3 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-slate-50 via-sky-50/40 to-slate-50 border border-slate-200/90 flex flex-row items-center flex-nowrap gap-2 sm:gap-3 overflow-x-auto scrollbar-none whitespace-nowrap">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 shrink-0">
                  ৳ {(activeUnitPrice * quantity).toLocaleString('en-BD')}
                </span>
                {activeOriginalPrice > activeUnitPrice && (
                  <span className="text-xs sm:text-sm text-slate-400 line-through shrink-0">
                    ৳ {((activeOriginalPrice || activeUnitPrice) * quantity).toLocaleString('en-BD')}
                  </span>
                )}
                {quantity > 1 && (
                  <span className="text-[10px] sm:text-xs font-bold text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-md border border-sky-200 shrink-0">
                    ৳{activeUnitPrice.toLocaleString('en-BD')} × {quantity}
                  </span>
                )}
                {matchedVariant && (
                  <span className="text-[10px] sm:text-xs font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 shrink-0">
                    {matchedVariant.name}
                  </span>
                )}
                {product.discountType === 'flat' && product.discountValue ? (
                  <span className="text-[10px] sm:text-xs font-extrabold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 shrink-0 whitespace-nowrap">
                    -৳{(product.discountValue * quantity).toLocaleString('en-BD')} Flat OFF
                  </span>
                ) : product.discountPercent && product.discountPercent > 0 ? (
                  <span className="text-[10px] sm:text-xs font-extrabold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 shrink-0 whitespace-nowrap">
                    {product.discountPercent}% save
                  </span>
                ) : null}
              </div>

              {/* UNIFIED SINGLE ROW: Quantity, Color & Size on One Line (No Dropdown Menus!) */}
              <div className="mt-3 p-2.5 sm:p-3 rounded-2xl bg-slate-50/95 border border-slate-200/90 shadow-2xs">
                <div className="flex flex-row items-center gap-3 sm:gap-4 flex-nowrap overflow-x-auto scrollbar-none py-1">
                  {/* 1. Quantity Stepper */}
                  <div className="shrink-0">
                    <div className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Quantity
                    </div>
                    <div className="flex items-center border border-slate-300 rounded-xl bg-white h-9 sm:h-10 px-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-30 rounded-lg font-black text-sm transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="text-xs sm:text-sm font-black text-slate-900 px-2 select-none min-w-[24px] text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                        className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg font-black text-sm transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 2. Color Variations (Individual Chips - No Dropdown Menu!) */}
                  {product.colors && product.colors.length > 0 && (
                    <div className="shrink-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider">
                          Color:
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-extrabold text-sky-700">
                          {selectedColor || product.colors[0]?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-nowrap">
                        {product.colors.map((color) => {
                          const isSelected = selectedColor === color.name;
                          return (
                            <button
                              key={color.name}
                              type="button"
                              onClick={() => handleSelectColor(color)}
                              className={`h-9 sm:h-10 px-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
                                isSelected
                                  ? 'border-sky-600 bg-sky-600 text-white ring-2 ring-sky-300'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                              title={color.name}
                            >
                              {color.imageUrl && color.imageUrl.trim() !== '' ? (
                                <img
                                  src={color.imageUrl}
                                  alt={color.name}
                                  className="w-4 h-4 rounded-sm object-cover border border-white/50 shrink-0"
                                />
                              ) : (
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-white/60 shrink-0 shadow-xs"
                                  style={{ backgroundColor: color.hexCode || '#94a3b8' }}
                                />
                              )}
                              <span className="whitespace-nowrap">{color.name}</span>
                              {isSelected && <Check className="w-3 h-3 text-white shrink-0 ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Size Variations (Individual Buttons - No Dropdown Menu!) */}
                  {product.sizes && product.sizes.length > 0 && (
                    <div className="shrink-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-wider">
                          Size:
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-extrabold text-indigo-700">
                          {selectedSize || product.sizes[0]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-nowrap">
                        {product.sizes.map((size) => {
                          const isSelected = selectedSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setSelectedSize(size)}
                              className={`h-9 sm:h-10 min-w-[36px] sm:min-w-[40px] px-2.5 rounded-xl border flex items-center justify-center text-xs font-black transition-all cursor-pointer shrink-0 shadow-2xs ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-300'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. Wishlist Button */}
                  <div className="shrink-0 ml-auto">
                    <div className="text-[10px] sm:text-[11px] font-black text-transparent mb-1 select-none pointer-events-none">
                      •
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleWishlist(product)}
                      className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shadow-2xs ${
                        isWishlisted
                          ? 'border-rose-300 bg-rose-50 text-rose-600'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Add to Wishlist"
                    >
                      <Heart className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Variations (if any) */}
              {product.variations && product.variations.length > 0 && (
                <div className="space-y-2 mt-2.5 pt-2 border-t border-slate-100">
                  {product.variations.map((v) => (
                    <div key={v.id || v.name}>
                      <span className="text-xs font-bold text-slate-700 block mb-1">
                        {v.name}: <span className="text-sky-700 font-black">{selectedCustomOptions[v.name]}</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {(v.options || []).map((opt) => {
                          const isSelected = selectedCustomOptions[v.name] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                setSelectedCustomOptions((prev) => ({ ...prev, [v.name]: opt }))
                              }
                              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Staff-Only Dropshipping & Margin Box */}
              {isStaff && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-950 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <span>🔒 Staff Only: Product Sourcing</span>
                    </span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md uppercase font-black">
                      {product.productType === 'own' ? 'In-House' : 'Dropship'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-slate-700 text-[11px] bg-white p-2 rounded-lg border border-amber-200/60 mb-2">
                    <div>
                      Cost: <b className="text-slate-900">৳{product.costPrice || 0}</b>
                    </div>
                    <div>
                      Profit: <b className="text-emerald-700">৳{profitBDT}</b>
                    </div>
                    <div>
                      Margin: <b className="text-blue-700">{marginPercent}%</b>
                    </div>
                  </div>

                  {product.supplierUrl && (
                    <a
                      href={product.supplierUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Supplier Page ({product.supplierName || 'AliExpress'}) ↗</span>
                    </a>
                  )}
                </div>
              )}

              {/* Navigation Tabs (Details, Specs, Reviews) */}
              <div className="flex border-b border-slate-200 mt-3 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'details'
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Description
                </button>
                {hasSpecifications && (
                  <button
                    onClick={() => setActiveTab('specs')}
                    className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'specs'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Specifications
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'reviews'
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Reviews ({product.reviewsCount})
                </button>
              </div>

              {/* Tab Content */}
              <div className="py-2.5 text-xs text-slate-600 min-h-[60px]">
                {activeTab === 'details' && (
                  <div className="space-y-3">
                    <FormattedText
                      content={product.description}
                      fallback={`${product.name} is built with top-tier materials to ensure maximum performance and durability.`}
                      className="text-xs text-slate-600"
                    />

                    {/* Key Highlights */}
                    {(() => {
                      const highlightsToRender = product.keyHighlights && Array.isArray(product.keyHighlights)
                        ? product.keyHighlights.filter((h: any) => (typeof h === 'string' ? true : h.active !== false))
                        : DEFAULT_PRODUCT_HIGHLIGHTS;

                      if (highlightsToRender.length === 0) return null;

                      return (
                        <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-100">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-sky-900 mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                            <span>Key Highlights & Benefits</span>
                          </h4>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 font-medium">
                            {highlightsToRender.map((item: any, idx: number) => {
                              const text = typeof item === 'string' ? item : item.text;
                              const icon = typeof item === 'object' ? (item.icon || 'check-circle') : 'check-circle';
                              const iconColor = typeof item === 'object' ? (item.iconColor || 'emerald') : 'emerald';
                              const key = typeof item === 'object' && item.id ? item.id : `hl-${idx}`;

                              return (
                                <li key={key} className="flex items-center gap-2">
                                  <HighlightIcon
                                    icon={icon}
                                    iconColor={iconColor}
                                    className="w-3.5 h-3.5 shrink-0"
                                  />
                                  <span className="truncate">{text}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {hasSpecifications && activeTab === 'specs' && (
                  <div className="space-y-1">
                    {Object.entries(product.specifications || {}).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between py-1 border-b border-slate-100"
                      >
                        <span className="text-slate-500 font-medium">{key}</span>
                        <span className="font-bold text-slate-800">{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Verified Customer</span>
                        <span className="text-[10px] text-slate-400">Recent</span>
                      </div>
                      <div className="flex items-center text-amber-400 my-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400" />
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Excellent product quality and prompt delivery service.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions based on Availability Status */}
            <div className="pt-3 border-t border-slate-200 mt-3">
              {(() => {
                const currentStatus = getProductStockStatus(product);
                if (currentStatus === 'out_of_stock') {
                  return (
                    <button
                      disabled
                      type="button"
                      className="w-full py-3 px-4 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 cursor-not-allowed opacity-80"
                    >
                      <span>Out of Stock (আউট অফ স্টক)</span>
                    </button>
                  );
                }
                if (currentStatus === 'upcoming') {
                  return (
                    <button
                      disabled
                      type="button"
                      className="w-full py-3 px-4 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-purple-200"
                    >
                      <span>Upcoming Product (আপকামিং)</span>
                    </button>
                  );
                }
                return (
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        const variantStr = getSelectedVariantString();
                        const chosenImg = activeColorImage || (matchedVariant?.image) || imagesList[selectedImageIndex] || imagesList[0];
                        const customProduct: Product = {
                          ...product,
                          price: activeUnitPrice,
                          sku: activeSku || product.sku,
                        };
                        onAddToCart(customProduct, quantity, variantStr, chosenImg);
                        onClose();
                      }}
                      className="w-full py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-xs active:scale-98 min-w-0 overflow-hidden"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate">Add to Cart</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const variantStr = getSelectedVariantString();
                        const chosenImg = activeColorImage || (matchedVariant?.image) || imagesList[selectedImageIndex] || imagesList[0];
                        const customProduct: Product = {
                          ...product,
                          price: activeUnitPrice,
                          sku: activeSku || product.sku,
                        };
                        onBuyNow(customProduct, quantity, variantStr, chosenImg);
                        onClose();
                      }}
                      className="w-full py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-md shadow-sky-600/20 active:scale-98 min-w-0 overflow-hidden"
                    >
                      <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-300 text-amber-300 shrink-0" />
                      <span className="truncate">Buy Now • ৳{(activeUnitPrice * quantity).toLocaleString('en-BD')}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
