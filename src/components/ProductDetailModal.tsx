import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  ZoomIn,
  AlertTriangle,
} from 'lucide-react';
import { Product, UserRole, ColorVariation } from '../types';
import { getProductStockStatus, getStockStatusInfo } from '../utils/stockUtils';
import { FormattedText } from './FormattedText';
import { HighlightIcon } from './HighlightIcon';
import { DEFAULT_PRODUCT_HIGHLIGHTS } from '../utils/highlightConstants';
import { NEUTRAL_PRODUCT_PLACEHOLDER, getOptimizedImageUrl, markImageLoaded, preloadImage, getVideoThumbnail } from '../utils/imageOptimizer';
import { ProductVideoPlayer } from './ProductVideoPlayer';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'reviews'>('details');
  const [isPaused, setIsPaused] = useState(false);
  const [holdUntil, setHoldUntil] = useState<number>(() => Date.now() + 4000);

  // Variations state (Default: empty - user MUST select manually)
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedCustomOptions, setSelectedCustomOptions] = useState<Record<string, string>>({});
  const [activeColorImage, setActiveColorImage] = useState<string | null>(null);
  const [variationError, setVariationError] = useState<string | null>(null);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  const handleMouseMoveZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x, y });
    if (!isZooming) setIsZooming(true);
  };

  const handleMouseLeaveZoom = () => {
    setIsZooming(false);
  };

  const validImages = useMemo(() => {
    const list = (product?.images || []).filter(
      (img) => typeof img === 'string' && img.trim() !== ''
    );
    return list.length > 0 ? list : [NEUTRAL_PRODUCT_PLACEHOLDER];
  }, [product?.images]);

  const hasVideo = Boolean(product?.videoUrl && product.videoUrl.trim() !== '');
  const totalSlides = validImages.length + (hasVideo ? 1 : 0);

  const videoThumbnailUrl = useMemo(() => {
    return hasVideo ? getVideoThumbnail(product?.videoUrl, validImages[0]) : null;
  }, [hasVideo, product?.videoUrl, validImages]);

  // Initialize variation states when product changes (Default: Unselected)
  useEffect(() => {
    if (product) {
      setSelectedImageIndex(0);
      setShowVideo(false);
      setQuantity(1);
      setIsPaused(false);

      // Do NOT auto-select variations - customer must explicitly pick one
      setSelectedColor('');
      setSelectedSize('');
      setSelectedCustomOptions({});
      setActiveColorImage(null);
      setVariationError(null);

      // 4-second hold on initial load
      setHoldUntil(Date.now() + 4000);
    }
  }, [product]);

  // Auto-Slide carousel: 4s hold on initial load / color switch, 3s for images. 
  // Pauses completely when video is playing so the video plays for its full duration before sliding to images.
  useEffect(() => {
    if (!isOpen || !product || isPaused || totalSlides <= 1 || showVideo) return;

    const remainingHold = Math.max(0, holdUntil - Date.now());
    const delay = remainingHold > 0 ? remainingHold : 3000;

    const timer = setTimeout(() => {
      if (isPaused || showVideo) return;
      setActiveColorImage(null);
      const nextIdx = (selectedImageIndex + 1) % totalSlides;
      if (hasVideo && nextIdx === validImages.length) {
        setShowVideo(true);
      } else {
        setShowVideo(false);
        setSelectedImageIndex(nextIdx);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isOpen, product, selectedImageIndex, showVideo, holdUntil, isPaused, totalSlides, hasVideo, validImages.length]);

  // When video completes its full duration, advance to the first image and resume sliding
  const handleVideoEnded = useCallback(() => {
    setShowVideo(false);
    setSelectedImageIndex(0);
    setActiveColorImage(null);
    setHoldUntil(Date.now() + 3000);
  }, []);

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

  // Validate that required variations are selected before placing order or adding to cart
  const validateVariationSelection = (): boolean => {
    if (!product) return false;

    if (product.colors && product.colors.length > 0 && !selectedColor) {
      setVariationError(t('⚠️ অনুগ্রহ করে প্রোডাক্টের কালার সিলেক্ট করুন!', '⚠️ Please select a product color!'));
      return false;
    }

    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      setVariationError(t('⚠️ অনুগ্রহ করে প্রোডাক্টের সাইজ সিলেক্ট করুন!', '⚠️ Please select a product size!'));
      return false;
    }

    if (product.variations && product.variations.length > 0) {
      for (const v of product.variations) {
        if (!selectedCustomOptions[v.name]) {
          setVariationError(t(`⚠️ অনুগ্রহ করে ${v.name} সিলেক্ট করুন!`, `⚠️ Please select ${v.name}!`));
          return false;
        }
      }
    }

    setVariationError(null);
    return true;
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 md:p-6">
      <div className="relative bg-white dark:bg-slate-900 rounded-none sm:rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border-0 sm:border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 my-auto min-h-screen sm:min-h-0">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:bg-slate-300 dark:active:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
          aria-label="Close"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 max-h-[100vh] sm:max-h-[85vh] overflow-y-auto">
          {/* Left Column: Media Gallery (Images with 3s Auto-Slide + Video) */}
          <div
            className="p-0 sm:p-4 bg-white sm:bg-slate-50/80 dark:bg-slate-900 dark:sm:bg-slate-900/90 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            <div>
              {/* Main Media Preview Box */}
              <div className="relative aspect-square rounded-none sm:rounded-2xl bg-white dark:bg-slate-950 border-0 sm:border border-slate-200/90 dark:border-slate-800 overflow-hidden flex items-center justify-center shadow-none sm:shadow-xs group">
                {showVideo && product.videoUrl ? (
                  <ProductVideoPlayer
                    videoUrl={product.videoUrl}
                    title={product.name}
                    aspectRatio={product.videoAspectRatio || 'auto'}
                    autoPlay={true}
                    loop={false}
                    onEnded={handleVideoEnded}
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <div
                    className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-crosshair select-none"
                    onMouseMove={handleMouseMoveZoom}
                    onMouseEnter={handleMouseMoveZoom}
                    onMouseLeave={handleMouseLeaveZoom}
                  >
                    <img
                      src={getOptimizedImageUrl(currentDisplayImage, 1800)}
                      alt={product.name}
                      loading="eager"
                      decoding="async"
                      onLoad={() => markImageLoaded(currentDisplayImage, 1800)}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== NEUTRAL_PRODUCT_PLACEHOLDER) {
                          target.src = NEUTRAL_PRODUCT_PLACEHOLDER;
                        }
                      }}
                      style={{
                        transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
                        transform: isZooming ? 'scale(2.3)' : 'scale(1)',
                        transition: isZooming ? 'transform 0.08s ease-out' : 'transform 0.3s ease-out',
                      }}
                      className="w-full h-full object-contain p-0 sm:p-2.5 will-change-transform pointer-events-none drop-shadow-sm"
                    />
                    {/* Subtle hover zoom guide badge */}
                    <div
                      className={`pointer-events-none absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-900/80 dark:bg-slate-950/80 text-white backdrop-blur-xs flex items-center gap-1.5 text-[10px] font-bold shadow-md transition-opacity duration-200 z-10 border border-slate-700/50 ${
                        isZooming ? 'opacity-0' : 'opacity-80 group-hover:opacity-100'
                      }`}
                    >
                      <ZoomIn className="w-3 h-3 text-sky-400" />
                      <span>{t('হোভার জুম', 'Hover to Zoom')}</span>
                    </div>
                  </div>
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
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 z-20 border border-slate-200 dark:border-slate-700"
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-md flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 z-20 border border-slate-200 dark:border-slate-700"
                      aria-label="Next Slide"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </>
                )}

                {/* Video toggle button if video exists (Only when viewing photo) */}
                {hasVideo && !showVideo && (
                  <button
                    onClick={() => {
                      setShowVideo(true);
                      setActiveColorImage(null);
                      setHoldUntil(Date.now() + 4000);
                    }}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-semibold backdrop-blur-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors z-20"
                  >
                    <Play className="w-3 h-3 text-sky-400 fill-sky-400" />
                    <span>Video</span>
                  </button>
                )}
              </div>

              {/* Thumbnails Row */}
              <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectImageSlide(idx)}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 overflow-hidden shrink-0 bg-white dark:bg-slate-950 p-0.5 cursor-pointer transition-all ${
                      !showVideo && (selectedImageIndex === idx || activeColorImage === img)
                        ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-xs scale-105'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
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
                    type="button"
                    onClick={handleSelectVideoSlide}
                    className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 shrink-0 overflow-hidden bg-slate-950 group cursor-pointer transition-all ${
                      showVideo
                        ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-xs scale-105'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                    title="Watch Product Video"
                  >
                    {/* Video Thumbnail Preview */}
                    {videoThumbnailUrl ? (
                      <img
                        src={videoThumbnailUrl}
                        alt="Video Preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <video
                        src={`${product.videoUrl}#t=0.5`}
                        preload="metadata"
                        muted
                        playsInline
                        className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                    {/* Frosted Play Icon Badge Overlay */}
                    <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 flex flex-col items-center justify-center transition-colors">
                      <div className="w-5 h-5 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-md">
                        <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Details & Actions */}
          <div className="p-3.5 sm:p-5 md:p-6 flex flex-col justify-between">
            <div>
              {/* Category & Brand */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                {product.brand && (
                  <>
                    <span className="text-[11px] sm:text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">{product.brand}</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                  </>
                )}
                <span className="text-[11px] sm:text-xs font-black text-sky-700 dark:text-sky-300 uppercase tracking-wider bg-sky-50 dark:bg-sky-950/70 px-2 py-0.5 rounded-md border border-sky-200/80 dark:border-sky-800/80">{product.category}</span>
              </div>

              {/* Product Title + Badges Row under Title */}
              <div className="mb-2">
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  {product.name}
                </h2>
                {product.banglaName && (
                  <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{product.banglaName}</p>
                )}

                {/* Rating, In Stock, and Trending Row */}
                <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-2 py-0.5 rounded-lg">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span className="font-bold text-amber-900 dark:text-amber-300">{product.rating}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">({product.reviewsCount})</span>
                  </div>

                  {(() => {
                    const currentStatus = getProductStockStatus(product);
                    const info = getStockStatusInfo(currentStatus);
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${info.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${info.dotClass}`} />
                        <span>{info.labelEn}</span>
                      </span>
                    );
                  })()}

                  {(product.saleBadge === 'Trending' || product.isTrending) ? (
                    <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs">
                      <span>🔥</span>
                      <span>Trending</span>
                    </span>
                  ) : product.saleBadge === 'Hot' || product.isHot ? (
                    <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs">
                      <span>⚡</span>
                      <span>Hot Deal</span>
                    </span>
                  ) : product.saleBadge === 'New' || product.isNew ? (
                    <span className="inline-flex items-center gap-1 bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs">
                      <span>✨</span>
                      <span>New</span>
                    </span>
                  ) : product.saleBadge === 'Best Seller' || product.isBestSeller ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs">
                      <span>🏆</span>
                      <span>Best Seller</span>
                    </span>
                  ) : product.saleBadge === 'Featured' || product.isFeatured ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs">
                      <span>⭐</span>
                      <span>Featured</span>
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Short Description & Highlights (under Title) */}
              {(() => {
                const hasShortDesc = Boolean(product.shortDescription && product.shortDescription.trim().length > 0);
                const activeHighlights = (product.keyHighlights || []).filter((h: any) => typeof h === 'string' || h.active !== false);
                const hasHighlights = activeHighlights.length > 0;

                if (!hasShortDesc && !hasHighlights) return null;

                return (
                  <div className="mt-2 p-2.5 sm:p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 space-y-2">
                    {hasShortDesc && (
                      <FormattedText
                        content={product.shortDescription}
                        className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-200"
                      />
                    )}
                    {hasHighlights && (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] sm:text-xs text-slate-700 dark:text-slate-200 font-medium">
                        {activeHighlights.slice(0, 4).map((item: any, idx: number) => {
                          const text = typeof item === 'string' ? item : item.text;
                          const icon = typeof item === 'object' ? (item.icon || 'check-circle') : 'check-circle';
                          const iconColor = typeof item === 'object' ? (item.iconColor || 'emerald') : 'emerald';
                          const key = typeof item === 'object' && item.id ? item.id : `shl-${idx}`;
                          return (
                            <li key={key} className="flex items-center gap-1.5">
                              <HighlightIcon icon={icon} iconColor={iconColor} className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })()}

              {/* Dynamic Price Display */}
              <div className="mt-2.5 sm:mt-3 py-1 flex flex-row items-center flex-nowrap gap-2 sm:gap-3 overflow-x-auto scrollbar-none whitespace-nowrap">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white shrink-0">
                  ৳ {(activeUnitPrice * quantity).toLocaleString('en-BD')}
                </span>
                {activeOriginalPrice > activeUnitPrice && (
                  <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 line-through shrink-0 font-medium">
                    ৳ {((activeOriginalPrice || activeUnitPrice) * quantity).toLocaleString('en-BD')}
                  </span>
                )}
                {quantity > 1 && (
                  <span className="text-[10px] sm:text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100/80 dark:bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800 shrink-0">
                    ৳{activeUnitPrice.toLocaleString('en-BD')} × {quantity}
                  </span>
                )}
                {matchedVariant && (
                  <span className="text-[10px] sm:text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800 shrink-0">
                    {matchedVariant.name}
                  </span>
                )}
                {product.discountType === 'flat' && product.discountValue ? (
                  <span className="text-[10px] sm:text-xs font-extrabold text-rose-600 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 shrink-0 whitespace-nowrap">
                    -৳{(product.discountValue * quantity).toLocaleString('en-BD')} Flat OFF
                  </span>
                ) : product.discountPercent && product.discountPercent > 0 ? (
                  <span className="text-[10px] sm:text-xs font-extrabold text-rose-600 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 shrink-0 whitespace-nowrap">
                    {product.discountPercent}% save
                  </span>
                ) : null}
              </div>

              {/* UNIFIED SINGLE ROW: Quantity, Color & Size on One Line */}
              <div className="mt-2.5 sm:mt-3 py-1">
                <div className="flex flex-row items-center gap-2 sm:gap-3 flex-nowrap overflow-x-auto scrollbar-none py-0.5">
                  {/* 1. Quantity Stepper */}
                  <div className="shrink-0">
                    <div className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">
                      Qty
                    </div>
                    <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 h-7.5 sm:h-9 px-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        className="w-5 sm:w-6 h-5 sm:h-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 disabled:opacity-30 rounded font-black text-xs sm:text-sm transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white px-1 sm:px-2 select-none min-w-[18px] sm:min-w-[22px] text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                        className="w-5 sm:w-6 h-5 sm:h-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 rounded font-black text-xs sm:text-sm transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 2. Color Variations (Individual Chips) */}
                  {product.colors && product.colors.length > 0 && (
                    <div className="shrink-0">
                      <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Color:
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-extrabold text-sky-700 dark:text-sky-300 truncate max-w-[120px]">
                          {selectedColor || <span className="text-amber-500 dark:text-amber-400 font-bold animate-pulse">{t('সিলেক্ট করুন', 'Select Color')}</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
                        {product.colors.map((color) => {
                          const isSelected = selectedColor === color.name;
                          return (
                            <button
                              key={color.name}
                              type="button"
                              onClick={() => {
                                handleSelectColor(color);
                                setVariationError(null);
                              }}
                              className={`h-7.5 sm:h-9 px-1.5 sm:px-2 rounded-lg sm:rounded-xl border flex items-center gap-1 text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
                                isSelected
                                  ? 'border-sky-600 bg-sky-600 text-white ring-1 sm:ring-2 ring-sky-300 dark:ring-sky-500/40'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                              title={color.name}
                            >
                              {color.imageUrl && color.imageUrl.trim() !== '' ? (
                                <img
                                  src={color.imageUrl}
                                  alt={color.name}
                                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs object-cover border border-white/50 shrink-0"
                                />
                              ) : (
                                <span
                                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-white/60 shrink-0 shadow-xs"
                                  style={{ backgroundColor: color.hexCode || '#94a3b8' }}
                                />
                              )}
                              <span className="whitespace-nowrap text-[10px] sm:text-xs">{color.name}</span>
                              {isSelected && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white shrink-0 ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Size Variations (Individual Buttons - No Dropdown Menu!) */}
                  {product.sizes && product.sizes.length > 0 && (
                    <div className="shrink-0">
                      <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
                        <span className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Size:
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300">
                          {selectedSize || <span className="text-amber-500 dark:text-amber-400 font-bold animate-pulse">{t('সিলেক্ট করুন', 'Select Size')}</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
                        {product.sizes.map((size) => {
                          const isSelected = selectedSize === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                setSelectedSize(size);
                                setVariationError(null);
                              }}
                              className={`h-7.5 sm:h-9 min-w-[28px] sm:min-w-[34px] px-1.5 sm:px-2 rounded-lg sm:rounded-xl border flex items-center justify-center text-[10px] sm:text-xs font-black transition-all cursor-pointer shrink-0 shadow-2xs ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-600 text-white ring-1 sm:ring-2 ring-indigo-300 dark:ring-indigo-500/40'
                                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
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
                    <div className="text-[9px] sm:text-[10px] font-black text-transparent mb-0.5 sm:mb-1 select-none pointer-events-none">
                      •
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleWishlist(product)}
                      className={`h-7.5 w-7.5 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl border flex items-center justify-center transition-colors cursor-pointer shadow-2xs ${
                        isWishlisted
                          ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title="Add to Wishlist"
                    >
                      <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Variation Alert Banner on its own clean line below Quantity & Color/Size */}
                {variationError && (
                  <div className="w-full mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-2 shadow-xs animate-in fade-in slide-in-from-top-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
                    <span className="flex-1">{variationError}</span>
                  </div>
                )}
              </div>

              {/* Custom Variations (if any) */}
              {product.variations && product.variations.length > 0 && (
                <div className="space-y-2 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {product.variations.map((v) => (
                    <div key={v.id || v.name}>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {v.name}: <span className="text-sky-700 dark:text-sky-300 font-black">{selectedCustomOptions[v.name]}</span>
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
                                  ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/20'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
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
                <div className="mt-3 p-3 rounded-2xl bg-amber-50/90 dark:bg-slate-900/95 border border-amber-300 dark:border-amber-500/50 text-xs shadow-xs dark:shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <div className="flex items-center justify-between font-bold text-amber-950 dark:text-amber-300 mb-2">
                    <span className="flex items-center gap-1.5 font-black text-xs text-amber-950 dark:text-amber-300">
                      <span>🔒 Staff Only: Product Sourcing Data</span>
                    </span>
                    <span className="text-[10px] bg-amber-200/90 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 px-2 py-0.5 rounded-lg uppercase font-black tracking-wider">
                      {product.productType === 'own' ? 'In-House' : 'Dropship'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 bg-white/90 dark:bg-slate-950/90 p-2 rounded-xl border border-amber-200/80 dark:border-amber-500/30 text-xs mb-2">
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Cost</span>
                      <b className="font-black text-slate-900 dark:text-amber-200 text-xs">৳{product.costPrice || 0}</b>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Profit</span>
                      <b className="font-black text-emerald-700 dark:text-emerald-400 text-xs">৳{profitBDT}</b>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Margin</span>
                      <b className="font-black text-sky-700 dark:text-sky-400 text-xs">{marginPercent}%</b>
                    </div>
                  </div>

                  {product.supplierUrl && (
                    <a
                      href={product.supplierUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-xs dark:shadow-[0_0_12px_rgba(245,158,11,0.35)] transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                      <span className="truncate">Open Supplier Page ({product.supplierName || 'AliExpress'}) ↗</span>
                    </a>
                  )}
                </div>
              )}

              {/* Navigation Tabs (Details, Specs, Reviews) */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 mt-3 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'details'
                      ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Description
                </button>
                {hasSpecifications && (
                  <button
                    onClick={() => setActiveTab('specs')}
                    className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                      activeTab === 'specs'
                        ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Specifications
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'reviews'
                      ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Customer Reviews</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black rounded-md flex items-center gap-0.5">
                    ★ {product.rating} ({product.reviewsCount})
                  </span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="py-2.5 text-xs text-slate-600 dark:text-slate-300 min-h-[60px]">
                {activeTab === 'details' && (
                  <div className="space-y-3">
                    <FormattedText
                      content={product.description}
                      fallback={`${product.name} is built with top-tier materials to ensure maximum performance and durability.`}
                      className="text-xs text-slate-600 dark:text-slate-300"
                    />

                    {/* Key Highlights */}
                    {(() => {
                      const highlightsToRender = product.keyHighlights && Array.isArray(product.keyHighlights)
                        ? product.keyHighlights.filter((h: any) => (typeof h === 'string' ? true : h.active !== false))
                        : DEFAULT_PRODUCT_HIGHLIGHTS;

                      if (highlightsToRender.length === 0) return null;

                      return (
                        <div className="p-3.5 rounded-xl bg-sky-50/60 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700/80">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-sky-900 dark:text-sky-300 mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            <span>Key Highlights & Benefits</span>
                          </h4>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-200 font-medium">
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
                        className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800"
                      >
                        <span className="text-slate-500 dark:text-slate-400 font-medium">{key}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-3">
                    {/* Enlarged Customer Rating Header Card */}
                    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-amber-50/80 dark:from-amber-950/40 dark:via-slate-850 dark:to-amber-950/30 border border-amber-200/90 dark:border-amber-800/60 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{product.rating}</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">/ 5.0</span>
                        </div>
                        <div className="flex items-center text-amber-400 my-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                i < Math.floor(product.rating) ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium">
                          Based on {product.reviewsCount} verified customer review{product.reviewsCount !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] sm:text-xs font-black border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>100% Verified</span>
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          Genuine Reviews
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-white text-xs">Verified Customer</span>
                        <span className="text-[10px] text-slate-400">Recent</span>
                      </div>
                      <div className="flex items-center text-amber-400 my-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Excellent product quality and prompt delivery service across Bangladesh. Highly recommended!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions based on Availability Status */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 mt-3">
              {(() => {
                const currentStatus = getProductStockStatus(product);
                if (currentStatus === 'out_of_stock') {
                  return (
                    <button
                      disabled
                      type="button"
                      className="w-full py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-80"
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
                      className="w-full py-3 px-4 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-purple-200 dark:border-purple-800"
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
                        if (!validateVariationSelection()) return;
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
                      className="w-full py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-xs active:scale-98 min-w-0 overflow-hidden"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate">Add to Cart</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!validateVariationSelection()) return;
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
