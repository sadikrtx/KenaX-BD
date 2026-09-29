import React, { useMemo, useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  Tag,
  Zap,
  ArrowRight,
  Package,
  Grid,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  MessageCircle,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { Product, UserRole, SiteSettings, TagCollectionSlide } from '../types';
import { ProductCard } from './ProductCard';
import { sortProductsByPagePriority } from '../utils/productPriorityUtils';
import { getTagSlides } from '../utils/tagBannerDefaults';
import { TagBannerEditorModal } from './admin/TagBannerEditorModal';
import { resolveOriginalImageMedia, getSynchronouslyResolvedMedia } from '../lib/firebase';
import { getOptimizedImageUrl, handleImageError } from '../utils/imageOptimizer';

interface TagProductsViewProps {
  tag: string;
  allProducts: Product[];
  onAddToCart: (product: Product, quantity?: number) => void;
  onBuyNow: (product: Product, quantity?: number) => void;
  onQuickView: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  wishlist: Product[];
  currentRole: UserRole;
  isLoggedIn: boolean;
  onOpenCustomerAuth: () => void;
  onNavigate: (view: string) => void;
  siteSettings?: SiteSettings;
  onUpdateSettings?: (newSettings: Partial<SiteSettings>) => Promise<void> | void;
}

export const TagProductsView: React.FC<TagProductsViewProps> = ({
  tag,
  allProducts,
  onAddToCart,
  onBuyNow,
  onQuickView,
  onToggleWishlist,
  wishlist,
  currentRole,
  isLoggedIn,
  onOpenCustomerAuth,
  onNavigate,
  siteSettings,
  onUpdateSettings,
}) => {
  const cleanTag = (tag || '').trim();
  const lowerTag = cleanTag.toLowerCase();

  const isAdmin =
    currentRole === 'super_admin' ||
    currentRole === 'admin' ||
    currentRole === 'manager';

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Filter tagged products
  const taggedProducts = useMemo(() => {
    const filtered = allProducts.filter((p) => {
      // Direct tag array match
      if (p.tags && p.tags.some((t) => t.trim().toLowerCase() === lowerTag)) return true;

      // Matching legacy boolean flags & sale badges
      if (lowerTag.includes('flash') || lowerTag.includes('hot')) {
        if (
          p.isHot ||
          p.saleBadge === 'Hot' ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes('flash') || t.toLowerCase().includes('hot')))
        )
          return true;
      }
      if (lowerTag.includes('new') || lowerTag.includes('arrival')) {
        if (
          p.isNew ||
          p.saleBadge === 'New' ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes('new')))
        )
          return true;
      }
      if (lowerTag.includes('deal') || lowerTag.includes('offer')) {
        if (
          p.originalPrice > p.price ||
          (p.discountPercent || 0) > 0 ||
          p.saleBadge === 'Hot' ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes('deal')))
        )
          return true;
      }
      if (lowerTag.includes('bestseller') || lowerTag.includes('best seller')) {
        if (p.isBestSeller || p.saleBadge === 'Best Seller') return true;
      }
      if (lowerTag.includes('trending')) {
        if (p.isTrending || p.saleBadge === 'Trending') return true;
      }
      if (lowerTag.includes('featured')) {
        if (p.isFeatured || p.saleBadge === 'Featured') return true;
      }
      if (lowerTag.includes('xiaomi')) {
        if (p.name.toLowerCase().includes('xiaomi') || (p.category && p.category.toLowerCase().includes('xiaomi'))) return true;
      }
      if (lowerTag.includes('redmi')) {
        if (p.name.toLowerCase().includes('redmi') || (p.category && p.category.toLowerCase().includes('redmi'))) return true;
      }
      if (lowerTag.includes('smart') || lowerTag.includes('phone') || lowerTag.includes('mobile')) {
        if (
          p.category?.toLowerCase().includes('phone') ||
          p.category?.toLowerCase().includes('mobile') ||
          p.name?.toLowerCase().includes('phone') ||
          p.name?.toLowerCase().includes('mobile') ||
          p.name?.toLowerCase().includes('smartphone')
        )
          return true;
      }
      if (lowerTag.includes('gadget')) {
        if (
          p.category?.toLowerCase().includes('gadget') ||
          p.category?.toLowerCase().includes('electronic') ||
          p.category?.toLowerCase().includes('accessories') ||
          p.name?.toLowerCase().includes('watch') ||
          p.name?.toLowerCase().includes('earbuds')
        )
          return true;
      }

      if (p.saleBadge && p.saleBadge.toLowerCase() === lowerTag) return true;
      return false;
    });

    return sortProductsByPagePriority(filtered, `tag:${cleanTag}`);
  }, [allProducts, lowerTag, cleanTag]);

  // Dynamic slides for this tag from siteSettings or defaults
  const slides: TagCollectionSlide[] = useMemo(() => {
    return getTagSlides(cleanTag, siteSettings?.tagCollectionBanners, taggedProducts.length);
  }, [cleanTag, siteSettings?.tagCollectionBanners, taggedProducts.length]);

  // Auto rotate slides if multiple exist
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [slides.length]);

  const activeSlide = slides[currentSlideIndex] || slides[0];

  const [resolvedBgImage, setResolvedBgImage] = useState<string | undefined>(() => {
    if (!activeSlide?.backgroundImage || activeSlide.backgroundImage.trim() === '') return undefined;
    if (activeSlide.backgroundImage.startsWith('media://')) {
      return getSynchronouslyResolvedMedia(activeSlide.backgroundImage) || undefined;
    }
    return getOptimizedImageUrl(activeSlide.backgroundImage, 1400);
  });
  const [resolvedMobileBgImage, setResolvedMobileBgImage] = useState<string | undefined>(() => {
    if (!activeSlide?.mobileBackgroundImage || activeSlide.mobileBackgroundImage.trim() === '') return undefined;
    if (activeSlide.mobileBackgroundImage.startsWith('media://')) {
      return getSynchronouslyResolvedMedia(activeSlide.mobileBackgroundImage) || undefined;
    }
    return getOptimizedImageUrl(activeSlide.mobileBackgroundImage, 800);
  });

  useEffect(() => {
    let isMounted = true;
    if (activeSlide?.backgroundImage && activeSlide.backgroundImage.trim() !== '') {
      if (activeSlide.backgroundImage.startsWith('media://')) {
        const cached = getSynchronouslyResolvedMedia(activeSlide.backgroundImage);
        if (cached) {
          setResolvedBgImage(cached);
        } else {
          resolveOriginalImageMedia(activeSlide.backgroundImage).then((url) => {
            if (isMounted) setResolvedBgImage(url && url.trim() !== '' && !url.startsWith('media://') ? url : undefined);
          });
        }
      } else {
        setResolvedBgImage(getOptimizedImageUrl(activeSlide.backgroundImage, 1400));
      }
    } else {
      setResolvedBgImage(undefined);
    }

    if (activeSlide?.mobileBackgroundImage && activeSlide.mobileBackgroundImage.trim() !== '') {
      if (activeSlide.mobileBackgroundImage.startsWith('media://')) {
        const cachedMobile = getSynchronouslyResolvedMedia(activeSlide.mobileBackgroundImage);
        if (cachedMobile) {
          setResolvedMobileBgImage(cachedMobile);
        } else {
          resolveOriginalImageMedia(activeSlide.mobileBackgroundImage).then((url) => {
            if (isMounted) setResolvedMobileBgImage(url && url.trim() !== '' && !url.startsWith('media://') ? url : undefined);
          });
        }
      } else {
        setResolvedMobileBgImage(getOptimizedImageUrl(activeSlide.mobileBackgroundImage, 800));
      }
    } else {
      setResolvedMobileBgImage(undefined);
    }

    return () => { isMounted = false; };
  }, [activeSlide?.backgroundImage, activeSlide?.mobileBackgroundImage]);

  // Remaining products to display as "Similar & Recommended Products"
  const remainingProducts = useMemo(() => {
    const taggedIds = new Set(taggedProducts.map((p) => p.id));
    return allProducts.filter((p) => !taggedIds.has(p.id));
  }, [allProducts, taggedProducts]);

  const handleSaveBanner = async (tagKey: string, updatedSlides: TagCollectionSlide[]) => {
    if (onUpdateSettings) {
      const currentBanners = siteSettings?.tagCollectionBanners || {};
      const cleanKey = tagKey.trim().toLowerCase();
      const originalKey = cleanTag.trim();
      await onUpdateSettings({
        tagCollectionBanners: {
          ...currentBanners,
          [cleanKey]: updatedSlides,
          [originalKey]: updatedSlides,
        },
      });
    }
  };

  const handleButtonClick = (btnLink: string) => {
    if (btnLink === 'whatsapp') {
      const waNumber = siteSettings?.phone || '8801700000000';
      const text = encodeURIComponent(`Hi, I am interested in the ${cleanTag} collection on ${siteSettings?.siteName || 'KenaX BD'}.`);
      window.open(`https://wa.me/${waNumber.replace(/\D/g, '')}?text=${text}`, '_blank');
      return;
    }
    if (btnLink === 'shop' || btnLink === 'trending') {
      onNavigate(btnLink);
      return;
    }
    if (btnLink.startsWith('http://') || btnLink.startsWith('https://')) {
      window.open(btnLink, '_blank');
      return;
    }
    onNavigate('shop');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Dynamic Admin-Configured Tag Collection Hero Banner */}
      {slides.length === 0 ? (
        isAdmin ? (
          <div className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 flex justify-end pt-2 pb-1">
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-sky-600 text-white font-bold text-xs shadow-md border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-300" />
              <span>✏️ Edit Banner (Hero Currently Disabled)</span>
            </button>
          </div>
        ) : null
      ) : activeSlide ? (
        <div className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 pt-2 sm:pt-3">
          <div className="relative group/tagbanner">
          {/* Floating Admin Quick-Edit Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsEditorOpen(true)}
              className="absolute top-4 right-4 z-30 px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-sky-600 text-white font-bold text-xs shadow-lg backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-300" />
              <span>✏️ Edit Banner</span>
            </button>
          )}

          {/* Hero Banner Container */}
          <div
            className={`relative overflow-hidden rounded-3xl text-white shadow-xl transition-all border border-slate-200/80 flex flex-col ${
              /* Height preset class mapping */
              activeSlide.desktopHeight === 'compact'
                ? 'md:min-h-[180px]'
                : activeSlide.desktopHeight === 'tall'
                ? 'md:min-h-[380px]'
                : activeSlide.desktopHeight === 'extra_tall'
                ? 'md:min-h-[500px]'
                : 'md:min-h-[280px]'
            } ${
              activeSlide.mobileHeight === 'compact'
                ? 'min-h-[140px]'
                : activeSlide.mobileHeight === 'tall'
                ? 'min-h-[280px]'
                : activeSlide.mobileHeight === 'extra_tall'
                ? 'min-h-[360px]'
                : activeSlide.mobileHeight === 'hd_16_9'
                ? 'w-full aspect-[16/9]'
                : activeSlide.mobileHeight === 'custom' && activeSlide.mobileCustomHeight
                ? ''
                : 'w-full aspect-[16/9] sm:aspect-auto min-h-[180px] sm:min-h-[220px]'
            } ${
              (resolvedBgImage || resolvedMobileBgImage)
                ? 'bg-slate-950'
                : activeSlide.gradientTheme === 'none'
                ? 'bg-slate-900'
                : `bg-gradient-to-r ${activeSlide.gradientTheme || 'from-rose-600 via-red-600 to-amber-600'}`
            }`}
            style={{
              /* Custom pixel heights if configured */
              ...(activeSlide.desktopHeight === 'custom' && activeSlide.desktopCustomHeight
                ? { minHeight: `${activeSlide.desktopCustomHeight}px` }
                : {}),
              ...(activeSlide.mobileHeight === 'custom' && activeSlide.mobileCustomHeight
                ? { minHeight: `${activeSlide.mobileCustomHeight}px` }
                : {}),
            }}
          >
            {/* Custom Uploaded Background Image (Desktop & Mobile Responsive) */}
            {Boolean((resolvedBgImage && resolvedBgImage.trim() !== '') || (resolvedMobileBgImage && resolvedMobileBgImage.trim() !== '')) && (
              <picture className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                {resolvedMobileBgImage && resolvedMobileBgImage.trim() !== '' && (
                  <source media="(max-width: 639px)" srcSet={resolvedMobileBgImage} />
                )}
                <img
                  src={(resolvedBgImage && resolvedBgImage.trim() !== '') ? resolvedBgImage : resolvedMobileBgImage}
                  alt={activeSlide.title || cleanTag}
                  className="w-full h-full object-cover transition-opacity duration-700"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageError(e, (resolvedBgImage && resolvedBgImage.trim() !== '') ? resolvedBgImage : resolvedMobileBgImage)}
                />
              </picture>
            )}

            {/* Dark Mask Overlay for High Contrast Text */}
            <div
              className="absolute inset-0 bg-slate-950 z-1 pointer-events-none transition-opacity duration-700"
              style={{ opacity: (activeSlide.overlayOpacity ?? 20) / 100 }}
            />

            {/* Positioned Text & Content Container */}
            <div
              className={`relative z-10 space-y-3 transition-all duration-300 flex-1 flex flex-col w-full ${
                activeSlide.verticalAlign === 'top'
                  ? 'justify-start'
                  : activeSlide.verticalAlign === 'bottom'
                  ? 'justify-end'
                  : 'justify-center'
              } ${
                activeSlide.horizontalAlign === 'center'
                  ? 'mx-auto text-center items-center'
                  : activeSlide.horizontalAlign === 'right'
                  ? 'ml-auto text-right items-end'
                  : 'mr-auto text-left items-start'
              }`}
              style={{
                paddingTop: `${activeSlide.paddingTop ?? 32}px`,
                paddingBottom: `${activeSlide.paddingBottom ?? 32}px`,
                paddingLeft: `${activeSlide.paddingLeft ?? 32}px`,
                paddingRight: `${activeSlide.paddingRight ?? 32}px`,
                maxWidth: `${activeSlide.containerMaxWidth ?? 100}%`,
                transform: `translate(${activeSlide.offsetX || 0}%, ${activeSlide.offsetY || 0}%)`,
              }}
            >
            {/* Badge */}
            {activeSlide.showBadge !== false && activeSlide.badge && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black tracking-wide border border-white/20 uppercase shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{activeSlide.badge}</span>
              </div>
            )}

            {/* Title */}
            {activeSlide.showTitle !== false && (
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
                {activeSlide.title || `${cleanTag} Collection`}
              </h1>
            )}

            {/* Subtitle */}
            {activeSlide.showSubtitle !== false && activeSlide.subtitle && (
              <p className="text-xs sm:text-sm text-amber-300 font-bold">
                {activeSlide.subtitle}
              </p>
            )}

            {/* Description */}
            {activeSlide.showDescription !== false && activeSlide.description && (
              <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium max-w-2xl drop-shadow-xs">
                {activeSlide.description}
              </p>
            )}

            {/* Bengali Text */}
            {activeSlide.showBengaliText && activeSlide.bengaliText && (
              <p className="text-xs text-amber-200 font-medium">
                {activeSlide.bengaliText}
              </p>
            )}

            {/* Action / Navigation Buttons inside Slide */}
            {activeSlide.buttons && activeSlide.buttons.length > 0 && (
              <div className={`flex flex-wrap items-center gap-2.5 pt-2 ${
                activeSlide.horizontalAlign === 'center'
                  ? 'justify-center'
                  : activeSlide.horizontalAlign === 'right'
                  ? 'justify-end'
                  : 'justify-start'
              }`}>
                {activeSlide.buttons.map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => handleButtonClick(btn.link)}
                    className={`px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${
                      btn.variant === 'whatsapp'
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : btn.variant === 'outline'
                        ? 'border-2 border-white/80 bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-900'
                    }`}
                  >
                    {btn.variant === 'whatsapp' && <MessageCircle className="w-4 h-4" />}
                    <span>{btn.text}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Stats */}
            {activeSlide.showStats !== false && (
              <div className={`flex items-center gap-3 pt-2 text-xs font-semibold text-white/90 ${
                activeSlide.horizontalAlign === 'center'
                  ? 'justify-center'
                  : activeSlide.horizontalAlign === 'right'
                  ? 'justify-end'
                  : 'justify-start'
              }`}>
                <span className="flex items-center gap-1.5 bg-black/30 backdrop-blur-xs px-3 py-1 rounded-xl">
                  <Package className="w-4 h-4 text-sky-300" />
                  <span>{activeSlide.itemCountText || `${taggedProducts.length} Items Available`}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-black/30 backdrop-blur-xs px-3 py-1 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{activeSlide.stockStatusText || '100% Verified Stock'}</span>
                </span>
              </div>
            )}
          </div>

          {/* Slider Prev / Next Controls if multiple slides */}
          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % slides.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs"
                aria-label="Next Slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Slider Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={`dot_${idx}`}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      currentSlideIndex === idx ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Background Decorative Ambient Glow */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      </div>
    </div>
      ) : null}

      {/* 2. Tagged Products Grid */}
      <div className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {cleanTag} Products ({taggedProducts.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All Shop Items</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {taggedProducts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 text-center max-w-md mx-auto my-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Products Currently Tagged</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              There are no items currently marked with the tag "{cleanTag}". You can assign this tag to any product from the Admin Dashboard or explore our full product catalog below!
            </p>
            <button
              onClick={() => onNavigate('shop')}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Browse All Shop Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {taggedProducts.map((product, index) => (
              <ProductCard
                key={`tag_${product.id}_${index}`}
                product={product}
                onAddToCart={(p) => onAddToCart(p, 1)}
                onBuyNow={(p) => onBuyNow(p, 1)}
                onQuickView={(p) => onQuickView(p)}
                onToggleWishlist={onToggleWishlist}
                isWishlisted={wishlist.some((w) => w.id === product.id)}
                currentRole={currentRole}
                isLoggedIn={isLoggedIn}
                onOpenCustomerAuth={onOpenCustomerAuth}
              />
            ))}
          </div>
        )}
      </div>

      {/* 3. Similar & Other Popular Products Section */}
      {remainingProducts.length > 0 && (
        <div className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 pt-8 border-t-2 border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100/70 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <span>Explore Similar & Other Popular Products</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Discover more top-rated gadgets, smartphones, and trending deals from our catalog
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer self-start sm:self-auto border dark:border-slate-700"
            >
              Explore Full Shop ({allProducts.length})
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {remainingProducts.slice(0, 18).map((product, index) => (
              <ProductCard
                key={`rem_${product.id}_${index}`}
                product={product}
                onAddToCart={(p) => onAddToCart(p, 1)}
                onBuyNow={(p) => onBuyNow(p, 1)}
                onQuickView={(p) => onQuickView(p)}
                onToggleWishlist={onToggleWishlist}
                isWishlisted={wishlist.some((w) => w.id === product.id)}
                currentRole={currentRole}
                isLoggedIn={isLoggedIn}
                onOpenCustomerAuth={onOpenCustomerAuth}
              />
            ))}
          </div>

          {remainingProducts.length > 18 && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-700 dark:hover:text-sky-400 hover:border-sky-300 font-bold text-xs transition-colors shadow-2xs cursor-pointer"
              >
                <span>View More Products ({remainingProducts.length - 18} remaining)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin Tag Banner Editor Modal */}
      {isAdmin && (
        <TagBannerEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialTag={cleanTag}
          tagCollectionBanners={siteSettings?.tagCollectionBanners || {}}
          onSaveBanner={handleSaveBanner}
          itemCount={taggedProducts.length}
        />
      )}
    </div>
  );
};
