import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Zap,
  Sparkles,
  Flame,
  Tag,
  Gift,
  Star,
  Shield,
  Check,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { PromoBannerItem, PromoGridSettings } from '../types';
import { getCleanPromoGridSettings } from '../data/defaultPromoBanners';
import { resolveOriginalImageMedia } from '../lib/firebase';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

interface PromoGridProps {
  promoGridSettings?: PromoGridSettings;
  promoBanners?: PromoBannerItem[];
  onSelectCategory: (category: string) => void;
  onNavigate: (view: string, subtab?: string) => void;
  className?: string;

  // Placement validation props
  targetPage?: 'homepage' | 'shop' | 'category' | 'flash-sale' | 'flash_sale' | 'tag' | 'custom';
  targetPosition?: string;
  categoryName?: string;
  tagName?: string;
}

export const PromoGrid: React.FC<PromoGridProps> = ({
  promoGridSettings,
  promoBanners,
  onSelectCategory,
  onNavigate,
  className = '',
  targetPage,
  targetPosition,
  categoryName,
  tagName,
}) => {
  // Merge settings
  const config = getCleanPromoGridSettings(
    promoGridSettings || (promoBanners ? { banners: promoBanners } : undefined)
  );

  // If master disabled, do not render
  if (config.enabled === false) {
    return null;
  }

  // Check Placement Rules if targetPage is supplied
  if (targetPage) {
    const placements = config.placements || {};

    if (targetPage === 'homepage') {
      const showOnHome = placements.showOnHomepage !== false;
      if (!showOnHome) return null;
      if (targetPosition && (placements.homepagePosition || 'after_category_nav') !== targetPosition) {
        return null;
      }
    } else if (targetPage === 'shop') {
      const showOnShop = placements.showOnShopPage === true;
      if (!showOnShop) return null;
      if (targetPosition && (placements.shopPosition || 'between_categories_and_products') !== targetPosition) {
        return null;
      }
    } else if (targetPage === 'category') {
      const showOnCategory = placements.showOnCategoryPages === true;
      if (!showOnCategory) return null;

      if (placements.categoryFilterMode === 'specific' && categoryName) {
        const allowedCats = placements.selectedCategoryNames || [];
        const isMatched = allowedCats.some(
          (c) => c.toLowerCase() === categoryName.toLowerCase()
        );
        if (!isMatched) return null;
      }

      if (targetPosition && (placements.categoryPosition || 'top_above_products') !== targetPosition) {
        return null;
      }
    } else if (targetPage === 'flash-sale' || (targetPage === 'tag' && tagName?.toLowerCase().includes('flash'))) {
      const showOnFlash = placements.showOnFlashSalePage === true;
      if (!showOnFlash) return null;
      if (targetPosition && (placements.flashSalePosition || 'top_below_countdown') !== targetPosition) {
        return null;
      }
    } else if (targetPage === 'tag') {
      const showOnTag = placements.showOnTagPages === true;
      if (!showOnTag) return null;

      if (placements.tagFilterMode === 'specific' && tagName) {
        const allowedTags = placements.selectedTags || [];
        const isMatched = allowedTags.some(
          (t) => t.toLowerCase() === tagName.toLowerCase()
        );
        if (!isMatched) return null;
      }

      if (targetPosition && (placements.tagPosition || 'top_above_products') !== targetPosition) {
        return null;
      }
    }
  }

  // Filter banners that are enabled
  const activeBanners = (config.banners || []).filter((b) => b.enabled !== false);

  if (activeBanners.length === 0) {
    return null;
  }

  // Determine container visibility based on master desktop/mobile settings
  let containerVisibilityClass = '';
  if (config.showOnDesktop === false && config.showOnMobile === false) {
    return null;
  } else if (config.showOnDesktop === false) {
    containerVisibilityClass = 'md:hidden'; // Only on mobile
  } else if (config.showOnMobile === false) {
    containerVisibilityClass = 'hidden md:block'; // Only on desktop
  }

  return (
    <section
      id={`promo-grid-${targetPage || 'default'}-${targetPosition || 'main'}`}
      className={`max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 ${containerVisibilityClass} ${className}`}
    >
      {config.sectionTitle && config.sectionTitle.trim() !== '' && (
        <div className="mb-3.5">
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {config.sectionTitle}
          </h3>
        </div>
      )}

      <div
        className={`grid gap-3.5 sm:gap-4 ${
          activeBanners.length === 1
            ? 'grid-cols-1'
            : activeBanners.length === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-3'
        }`}
      >
        {activeBanners.map((banner, index) => (
          <PromoCardItem
            key={banner.id || `promo-card-${index}`}
            banner={banner}
            index={index}
            onSelectCategory={onSelectCategory}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
};

interface PromoCardItemProps {
  banner: PromoBannerItem;
  index: number;
  onSelectCategory: (category: string) => void;
  onNavigate: (view: string, subtab?: string) => void;
}

const PromoCardItem: React.FC<PromoCardItemProps> = ({
  banner,
  index,
  onSelectCategory,
  onNavigate,
}) => {
  const [resolvedDesktopImg, setResolvedDesktopImg] = useState<string | undefined>(undefined);
  const [resolvedMobileImg, setResolvedMobileImg] = useState<string | undefined>(undefined);

  // Resolve background images
  useEffect(() => {
    let isMounted = true;
    if (banner.backgroundImage && banner.backgroundImage.trim() !== '') {
      if (banner.backgroundImage.startsWith('media://')) {
        resolveOriginalImageMedia(banner.backgroundImage).then((url) => {
          if (isMounted) setResolvedDesktopImg(url ? getOptimizedImageUrl(url, 1200) : undefined);
        });
      } else {
        setResolvedDesktopImg(getOptimizedImageUrl(banner.backgroundImage, 1200));
      }
    } else {
      setResolvedDesktopImg(undefined);
    }

    if (banner.mobileBackgroundImage && banner.mobileBackgroundImage.trim() !== '') {
      if (banner.mobileBackgroundImage.startsWith('media://')) {
        resolveOriginalImageMedia(banner.mobileBackgroundImage).then((url) => {
          if (isMounted) setResolvedMobileImg(url ? getOptimizedImageUrl(url, 800) : undefined);
        });
      } else {
        setResolvedMobileImg(getOptimizedImageUrl(banner.mobileBackgroundImage, 800));
      }
    } else {
      setResolvedMobileImg(undefined);
    }

    return () => {
      isMounted = false;
    };
  }, [banner.backgroundImage, banner.mobileBackgroundImage]);

  // Check card-level device visibility
  const showDesktop = banner.showOnDesktop !== false;
  const showMobile = banner.showOnMobile !== false;

  if (!showDesktop && !showMobile) {
    return null;
  }

  let cardDeviceClass = '';
  if (!showDesktop && showMobile) {
    cardDeviceClass = 'md:hidden';
  } else if (showDesktop && !showMobile) {
    cardDeviceClass = 'hidden md:flex';
  }

  // Handle action click
  const handleActionClick = () => {
    const link = (banner.buttonLink || '').trim();
    if (!link || link === 'shop') {
      onNavigate('shop');
      return;
    }
    if (link.startsWith('category:')) {
      const catName = link.replace('category:', '').trim();
      onSelectCategory(catName);
      onNavigate('shop');
      return;
    }
    if (link.startsWith('tag:')) {
      const tagName = link.replace('tag:', '').trim();
      onNavigate('tag-products', tagName);
      return;
    }
    if (link === 'flash-sale' || link === 'deals') {
      onNavigate('tag-products', 'Flash Sale');
      return;
    }
    if (link.startsWith('whatsapp')) {
      window.open('https://wa.me/8801700000000', '_blank', 'noopener,noreferrer');
      return;
    }
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener,noreferrer');
      return;
    }
    onNavigate(link);
  };

  // Badge Icon Renderer
  const renderBadgeIcon = () => {
    const iconName = (banner.badgeIcon || 'zap').toLowerCase();
    const props = { className: 'w-3 h-3 shrink-0' };
    switch (iconName) {
      case 'zap':
        return <Zap {...props} />;
      case 'sparkles':
        return <Sparkles {...props} />;
      case 'flame':
        return <Flame {...props} />;
      case 'tag':
        return <Tag {...props} />;
      case 'gift':
        return <Gift {...props} />;
      case 'star':
        return <Star {...props} />;
      case 'shield':
        return <Shield {...props} />;
      case 'check':
        return <Check {...props} />;
      case 'none':
        return null;
      default:
        return <Zap {...props} />;
    }
  };

  // Badge Color Style
  const getBadgeStyle = () => {
    const color = (banner.badgeColor || 'sky').toLowerCase();
    switch (color) {
      case 'rose':
        return 'bg-rose-500/30 text-rose-300 border-rose-500/30';
      case 'amber':
        return 'bg-amber-400/30 text-amber-200 border-amber-400/30';
      case 'emerald':
        return 'bg-emerald-500/30 text-emerald-300 border-emerald-500/30';
      case 'purple':
        return 'bg-purple-500/30 text-purple-300 border-purple-500/30';
      case 'blue':
        return 'bg-blue-500/30 text-blue-300 border-blue-500/30';
      case 'indigo':
        return 'bg-indigo-500/30 text-indigo-300 border-indigo-500/30';
      case 'sky':
      default:
        return 'bg-sky-500/30 text-sky-300 border-sky-500/30';
    }
  };

  // Button Style
  const getButtonClass = () => {
    const variant = banner.buttonVariant || (index === 1 ? 'secondary' : 'primary');
    switch (variant) {
      case 'secondary':
        return 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold';
      case 'emerald':
        return 'bg-emerald-500 hover:bg-emerald-400 text-white font-bold';
      case 'amber':
        return 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black';
      case 'dark':
        return 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-bold';
      case 'whatsapp':
        return 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold';
      case 'outline':
        return 'bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-xs font-bold';
      case 'primary':
      default:
        return 'bg-white hover:bg-sky-50 text-slate-900 font-bold';
    }
  };

  // Gradient Fallback
  const defaultGradients = [
    'from-blue-950 via-blue-900 to-sky-900',
    'from-slate-950 via-sky-950 to-slate-900',
    'from-amber-900 via-amber-800 to-slate-950',
  ];
  const gradientClass =
    banner.gradientTheme && banner.gradientTheme.trim() !== ''
      ? banner.gradientTheme.includes('from-')
        ? `bg-gradient-to-r ${banner.gradientTheme}`
        : banner.gradientTheme
      : `bg-gradient-to-r ${defaultGradients[index % defaultGradients.length]}`;

  const overlayOpacity =
    banner.overlayOpacity !== undefined ? Math.min(100, Math.max(0, banner.overlayOpacity)) : 20;

  // Title highlight parsing
  const renderTitle = () => {
    const title = banner.title || 'Special Promotion';
    const highlight = banner.highlightText?.trim();
    if (highlight && title.includes(highlight)) {
      const parts = title.split(highlight);
      return (
        <>
          {parts[0]}
          <span className="text-amber-300">{highlight}</span>
          {parts.slice(1).join(highlight)}
        </>
      );
    }
    return title;
  };

  return (
    <div
      id={`promo-card-${banner.id || index}`}
      className={`relative rounded-2xl overflow-hidden ${gradientClass} text-white p-5 sm:p-6 flex flex-col justify-between min-h-[185px] sm:min-h-[200px] shadow-sm border border-white/10 group transition-all duration-300 hover:shadow-md ${cardDeviceClass}`}
    >
      {/* Background Image Layer (Desktop) */}
      {resolvedDesktopImg && (
        <div
          className={`absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105 ${
            resolvedMobileImg ? 'hidden sm:block' : 'block'
          }`}
          style={{ backgroundImage: `url("${resolvedDesktopImg}")` }}
        />
      )}

      {/* Background Image Layer (Mobile specific) */}
      {resolvedMobileImg && (
        <div
          className="absolute inset-0 bg-cover bg-center sm:hidden transition-transform duration-700 ease-out group-hover:scale-105"
          style={{ backgroundImage: `url("${resolvedMobileImg}")` }}
        />
      )}

      {/* Dark / Tint Overlay for Crisp Text Legibility */}
      <div
        className="absolute inset-0 bg-black transition-opacity pointer-events-none"
        style={{ opacity: overlayOpacity / 100 }}
      />

      {/* Subtle Glow Bulb Accent */}
      <div className="absolute right-0 -bottom-8 w-36 h-36 opacity-20 bg-white rounded-full blur-2xl pointer-events-none group-hover:opacity-30 transition-opacity" />

      {/* Content Layer */}
      <div className="relative z-10">
        {banner.showBadge !== false && banner.badge && banner.badge.trim() !== '' && (
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border backdrop-blur-xs ${getBadgeStyle()}`}
          >
            {renderBadgeIcon()}
            <span>{banner.badge}</span>
          </span>
        )}

        <h3 className="text-xl sm:text-2xl font-black mt-2.5 leading-tight tracking-tight drop-shadow-xs">
          {renderTitle()}
        </h3>

        {banner.showSubtitle !== false && banner.subtitle && banner.subtitle.trim() !== '' && (
          <p className="text-xs text-slate-200/90 mt-1.5 line-clamp-2 leading-relaxed drop-shadow-2xs">
            {banner.subtitle}
          </p>
        )}

        {banner.description && banner.description.trim() !== '' && (
          <p className="text-[11px] text-slate-300/80 mt-1 line-clamp-1 leading-snug">
            {banner.description}
          </p>
        )}
      </div>

      {/* Action Button Layer */}
      {banner.showButton !== false && (
        <div className="relative z-10 mt-4 pt-1">
          <button
            type="button"
            onClick={handleActionClick}
            className={`inline-flex items-center gap-2 text-xs px-4 py-2 rounded-xl transition-all duration-200 active:scale-95 shadow-xs cursor-pointer ${getButtonClass()}`}
          >
            <span>{banner.buttonText || 'Shop Now'}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      )}
    </div>
  );
};
