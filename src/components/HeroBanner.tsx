import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CreditCard,
  Truck,
  CheckCircle,
  Tag,
  ArrowRight,
  Star,
  Zap,
} from 'lucide-react';
import { Category, HeroBannerItem, HeroFeatureTag, HeroSideBannerSettings } from '../types';
import { DEFAULT_HERO_FEATURES } from '../data/initialSettings';
import { resolveOriginalImageMedia } from '../lib/firebase';

interface HeroBannerProps {
  categories: Category[];
  onSelectCategory: (categoryName: string) => void;
  onNavigate: (view: string) => void;
  heroBanners?: HeroBannerItem[];
  heroFeatures?: HeroFeatureTag[];
  heroSideBanner?: HeroSideBannerSettings;
  codBannerImage?: string;
  siteName?: string;
}

const DEFAULT_SLIDES: HeroBannerItem[] = [
  {
    id: 'slide-1',
    badge: 'Welcome to KenaX BD',
    title: 'Smart Shopping',
    subtitle: 'Better Living',
    description: 'Your Need, Our Promise. Genuine Products Delivered Nationwide.',
    buttonText: 'Shop Now',
    theme: 'from-blue-900 via-sky-900 to-slate-950',
    image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1600&auto=format&fit=crop&q=85',
  },
  {
    id: 'slide-2',
    badge: 'Special Eid & Festival Deals',
    title: 'Mega Gadget Fest',
    subtitle: 'Up to 40% Off',
    description: 'Authentic gadgets delivered nationwide at best prices.',
    buttonText: 'Explore Gadgets',
    theme: 'from-indigo-900 via-slate-900 to-sky-950',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&auto=format&fit=crop&q=85',
  },
];

export function extractYouTubeId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  categories = [],
  onNavigate,
  onSelectCategory,
  heroBanners,
  heroFeatures,
  heroSideBanner,
  codBannerImage,
  siteName,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const slides = heroBanners && heroBanners.length > 0 ? heroBanners : DEFAULT_SLIDES;
  const currentSlide = slides[activeSlide] || slides[0];

  const [resolvedSlideImage, setResolvedSlideImage] = useState<string>('');
  const [resolvedMobileSlideImage, setResolvedMobileSlideImage] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const rawImg = currentSlide?.image || '';
    const rawMobImg = currentSlide?.mobileImage || '';

    if (rawImg.startsWith('media://')) {
      resolveOriginalImageMedia(rawImg).then((url) => {
        if (isMounted) setResolvedSlideImage(url || rawImg);
      });
    } else {
      setResolvedSlideImage(rawImg);
    }

    if (rawMobImg.startsWith('media://')) {
      resolveOriginalImageMedia(rawMobImg).then((url) => {
        if (isMounted) setResolvedMobileSlideImage(url || rawMobImg);
      });
    } else {
      setResolvedMobileSlideImage(rawMobImg);
    }

    return () => {
      isMounted = false;
    };
  }, [currentSlide?.image, currentSlide?.mobileImage]);

  const isSideBannerEnabled = heroSideBanner ? heroSideBanner.enabled !== false : true;

  // Touch & Mouse Swipe / Drag Gesture Support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState<number | null>(null);

  const minSwipeDistance = 35;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      handleNextSlide();
    } else if (distance < -minSwipeDistance) {
      handlePrevSlide();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Mouse drag support for desktop/trackpads
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStartX === null) return;
    const distance = dragStartX - e.clientX;
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
      setIsDragging(false);
      setDragStartX(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartX(null);
  };

  useEffect(() => {
    if (activeSlide >= slides.length && slides.length > 0) {
      setActiveSlide(0);
    }
  }, [slides.length, activeSlide]);

  const hasContent = !!(
    (currentSlide?.badge && currentSlide.badge.trim().length > 0) ||
    (currentSlide?.title && currentSlide.title.trim().length > 0) ||
    (currentSlide?.subtitle && currentSlide.subtitle.trim().length > 0) ||
    (currentSlide?.description && currentSlide.description.trim().length > 0) ||
    (currentSlide?.bengali && currentSlide.bengali.trim().length > 0) ||
    (currentSlide?.buttons && currentSlide.buttons.length > 0)
  );

  // Sound logic: Sound plays ONLY ONCE on the first view. Subsequent loops are muted.
  const [soundPlayedSlideIds, setSoundPlayedSlideIds] = useState<string[]>([]);
  const prevSlideIdRef = useRef<string>(currentSlide?.id);

  useEffect(() => {
    if (prevSlideIdRef.current && prevSlideIdRef.current !== currentSlide?.id) {
      const prevId = prevSlideIdRef.current;
      setSoundPlayedSlideIds((prev) => (prev.includes(prevId) ? prev : [...prev, prevId]));
    }
    prevSlideIdRef.current = currentSlide?.id;
  }, [currentSlide?.id]);

  const isMuted = !currentSlide?.soundEnabled || soundPlayedSlideIds.includes(currentSlide?.id || '');

  // Admin configurable trust feature pills
  const activeFeatures = (heroFeatures && heroFeatures.length > 0 ? heroFeatures : DEFAULT_HERO_FEATURES).filter(
    (f) => f.enabled !== false && f.text && f.text.trim().length > 0
  );

  // Handle slide transition after video duration or default timer
  useEffect(() => {
    const isVideo = currentSlide?.mediaType === 'video' || currentSlide?.mediaType === 'youtube' || !!currentSlide?.videoUrl || !!currentSlide?.youtubeUrl;
    
    // Custom slide duration in ms (if admin defined) or 15s for video, 6s for image
    const durationMs = currentSlide?.videoDurationSeconds
      ? currentSlide.videoDurationSeconds * 1000
      : isVideo ? 15000 : 6000;

    const timer = setTimeout(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [activeSlide, slides.length, currentSlide]);

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  const handleButtonClick = (link?: string) => {
    if (!link) {
      onSelectCategory('All');
      onNavigate('shop');
      return;
    }

    const cleanLink = link.trim().toLowerCase();

    if (cleanLink === 'home' || cleanLink === 'view:home') {
      onNavigate('home');
    } else if (cleanLink === 'shop' || cleanLink === 'view:shop' || cleanLink === 'all' || cleanLink === 'products') {
      onSelectCategory('All');
      onNavigate('shop');
    } else if (cleanLink === 'electronics' || cleanLink === 'gadgets' || cleanLink.includes('electronic')) {
      const elecCat = categories.find((c) => c.name.toLowerCase().includes('electronic') || c.name.toLowerCase().includes('gadget'));
      onSelectCategory(elecCat ? elecCat.name : 'Electronics & Gadgets');
      onNavigate('shop');
    } else if (cleanLink === 'fashion' || cleanLink === 'clothing' || cleanLink.includes('fashion')) {
      const fashCat = categories.find((c) => c.name.toLowerCase().includes('fashion') || c.name.toLowerCase().includes('clothing'));
      onSelectCategory(fashCat ? fashCat.name : 'Fashion & Clothing');
      onNavigate('shop');
    } else if (cleanLink === 'home' || cleanLink === 'kitchen' || cleanLink.includes('living') || cleanLink.includes('home')) {
      const homeCat = categories.find((c) => c.name.toLowerCase().includes('home') || c.name.toLowerCase().includes('living'));
      onSelectCategory(homeCat ? homeCat.name : 'Home & Living');
      onNavigate('shop');
    } else if (cleanLink === 'flash_sale' || cleanLink === 'flash-sale' || cleanLink === 'flash' || cleanLink === 'view:flash_sale') {
      onSelectCategory('All');
      onNavigate('flash_sale');
    } else if (cleanLink === 'new_arrivals' || cleanLink === 'new-arrivals' || cleanLink === 'new' || cleanLink === 'view:new_arrivals') {
      onSelectCategory('All');
      onNavigate('new_arrivals');
    } else if (cleanLink === 'top_rated' || cleanLink === 'top-rated' || cleanLink === 'best' || cleanLink === 'bestsellers' || cleanLink === 'view:top_rated') {
      onSelectCategory('All');
      onNavigate('top_rated');
    } else if (cleanLink === 'trending' || cleanLink === 'view:trending') {
      onSelectCategory('All');
      onNavigate('trending');
    } else if (cleanLink === 'categories' || cleanLink === 'view:categories') {
      onSelectCategory('All');
      onNavigate('shop');
    } else if (link.startsWith('category:')) {
      const catName = link.replace('category:', '').trim();
      onSelectCategory(catName);
      onNavigate('shop');
    } else if (cleanLink === 'cart' || cleanLink === 'view:cart') {
      onNavigate('cart');
    } else if (cleanLink === 'checkout' || cleanLink === 'view:checkout') {
      onNavigate('checkout');
    } else if (cleanLink === 'contact' || cleanLink === 'view:contact') {
      onNavigate('contact');
    } else if (cleanLink === 'about' || cleanLink === 'view:about') {
      onNavigate('about');
    } else if (cleanLink === 'whatsapp') {
      window.open('https://wa.me/8801700123456', '_blank');
    } else if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank');
    } else {
      // Fallback: check if matches any category name directly
      const matchedCategory = categories.find((c) => c.name.toLowerCase() === cleanLink);
      if (matchedCategory) {
        onSelectCategory(matchedCategory.name);
        onNavigate('shop');
      } else {
        onNavigate(link);
      }
    }
  };

  const renderBadgeIcon = (iconName?: string) => {
    switch (iconName) {
      case 'sparkles':
        return <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case 'card':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'check':
        return <CheckCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      case 'truck':
        return <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'star':
        return <Star className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
      case 'tag':
        return <Tag className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'zap':
        return <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'shield':
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    }
  };

  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300';
      case 'amber':
        return 'bg-amber-500/20 border-amber-400/40 text-amber-300';
      case 'rose':
        return 'bg-rose-500/20 border-rose-400/40 text-rose-300';
      case 'purple':
        return 'bg-purple-500/20 border-purple-400/40 text-purple-300';
      case 'sky':
      default:
        return 'bg-sky-500/20 border-sky-400/40 text-sky-300';
    }
  };

  // Alignment helper (left, center, right)
  const align = currentSlide?.contentAlignment || 'left';
  const alignClasses =
    align === 'center'
      ? 'text-center items-center mx-auto'
      : align === 'right'
      ? 'text-right items-end ml-auto'
      : 'text-left items-start mr-auto';

  // Calculate overlay opacity (0 to 1)
  const rawOverlayOpacity = currentSlide?.overlayOpacity;
  const overlayOpacityDecimal =
    rawOverlayOpacity !== undefined && rawOverlayOpacity !== null
      ? Math.min(100, Math.max(0, rawOverlayOpacity)) / 100
      : hasContent
      ? 0.85
      : 0.0;

  return (
    <section className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 1. Large High-Impact Hero Carousel Banner */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`${
            isSideBannerEnabled ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12 xl:col-span-12'
          } relative rounded-3xl overflow-hidden bg-slate-950 text-white min-h-[460px] sm:min-h-[520px] lg:min-h-[550px] p-6 sm:p-10 lg:p-12 flex flex-col justify-between shadow-xl border border-slate-800/80 group select-none cursor-grab active:cursor-grabbing touch-pan-y transition-all duration-300`}
        >
          {/* Active Slide Media Background */}
          {(() => {
            if (!currentSlide) return null;

            const ytId = extractYouTubeId(currentSlide.youtubeUrl);
            const isYouTube = (currentSlide.mediaType === 'youtube' || (ytId && currentSlide.mediaType !== 'image')) && ytId;
            const isDirectVideo = (currentSlide.mediaType === 'video' || (currentSlide.videoUrl && currentSlide.mediaType !== 'image')) && currentSlide.videoUrl && !isYouTube;

            const renderOverlay = () => {
              if (overlayOpacityDecimal <= 0) return null;
              return (
                <>
                  <div
                    className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
                      align === 'center'
                        ? 'bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-slate-950/90'
                        : align === 'right'
                        ? 'bg-gradient-to-l from-slate-950/95 via-slate-950/80 to-slate-950/35'
                        : 'bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/35'
                    }`}
                    style={{ opacity: overlayOpacityDecimal }}
                  />
                  <div
                    className="absolute inset-0 z-10 bg-sky-950/20 mix-blend-overlay pointer-events-none transition-opacity duration-300"
                    style={{ opacity: overlayOpacityDecimal }}
                  />
                </>
              );
            };

            if (isYouTube) {
              return (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-slate-950">
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${ytId}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&playsinline=1&enablejsapi=1&fs=0&autohide=1`}
                    title={currentSlide.title || 'Hero Background Video'}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] min-w-full min-h-full object-cover pointer-events-none border-0"
                    allow="autoplay; encrypted-media; picture-in-picture"
                  />
                  {/* Transparent overlay capturing all hover events so YouTube never shows pause/share icons */}
                  <div className="absolute inset-0 z-10 pointer-events-auto bg-transparent"></div>
                  {renderOverlay()}
                </div>
              );
            }

            if (isDirectVideo) {
              return (
                <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
                  <video
                    key={currentSlide.id + (currentSlide.videoUrl || '')}
                    src={currentSlide.videoUrl}
                    autoPlay
                    muted={isMuted}
                    playsInline
                    poster={currentSlide.image}
                    onEnded={handleNextSlide}
                    className="w-full h-full object-cover object-center transform scale-100 group-hover:scale-105 transition-transform duration-1000"
                  />
                  {renderOverlay()}
                </div>
              );
            }

            {/* Default to Image */}
            if (currentSlide.image || currentSlide.mobileImage) {
              const displayImg = resolvedSlideImage || currentSlide.image || currentSlide.mobileImage;
              const displayMobImg = resolvedMobileSlideImage || currentSlide.mobileImage || displayImg;
              return (
                <div className="absolute inset-0 z-0">
                  <picture className="w-full h-full block">
                    {displayMobImg && (
                      <source media="(max-width: 767px)" srcSet={displayMobImg} />
                    )}
                    <img
                      src={displayImg}
                      alt={currentSlide.title || 'Hero Slide'}
                      className="w-full h-full object-cover object-center transform scale-100 group-hover:scale-105 transition-transform duration-1000"
                    />
                  </picture>
                  {renderOverlay()}
                </div>
              );
            }

            return null;
          })()}

          {/* Ambient Glow Lights */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sky-500/20 blur-3xl pointer-events-none z-1"></div>
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-blue-600/25 blur-3xl pointer-events-none z-1"></div>

          {/* Top Row: Slide Badges */}
          <div className="relative z-10 flex items-center justify-between gap-3">
            {/* Render slide badges if available */}
            {(() => {
              const slide = slides[activeSlide];
              if (!slide) return <div />;

              let activeBadgesList: { id: string; text: string; icon?: string; color?: string }[] = [];

              if (slide.badges !== undefined) {
                // If explicitly configured, only use the badges in slide.badges
                activeBadgesList = (slide.badges || []).filter((b) => b.text && b.text.trim());
              } else if (slide.badge && slide.badge.trim()) {
                // Fallback for legacy single badge string
                activeBadgesList = [{ id: 'main-badge', text: slide.badge.trim(), icon: 'sparkles', color: 'sky' }];
              }

              if (activeBadgesList.length === 0) return <div />;

              return (
                <div className="flex flex-wrap items-center gap-2 max-w-full">
                  {activeBadgesList.map((badgeItem, bIdx) => (
                    <span
                      key={badgeItem.id || `badge-${bIdx}`}
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-black tracking-wide backdrop-blur-md shadow-sm transition-all ${getBadgeStyle(
                        badgeItem.color
                      )}`}
                    >
                      {renderBadgeIcon(badgeItem.icon)}
                      <span>{badgeItem.text}</span>
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Middle Content: Big Title, Subtitle, Bengali Tagline & Trust Tags */}
          {hasContent && (
            <div className={`relative z-10 my-auto py-6 max-w-2xl space-y-4 flex flex-col ${alignClasses}`}>
              {(slides[activeSlide]?.title || slides[activeSlide]?.subtitle) && (
                <div className="space-y-1 sm:space-y-2">
                  {slides[activeSlide]?.title && (
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
                      {slides[activeSlide]?.title}
                    </h1>
                  )}
                  {slides[activeSlide]?.subtitle && (
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-300 to-blue-200">
                      {slides[activeSlide]?.subtitle}
                    </h2>
                  )}
                </div>
              )}

              {(slides[activeSlide]?.description || slides[activeSlide]?.bengali) && (
                <p className="text-sm sm:text-base lg:text-lg font-medium text-slate-200 max-w-xl">
                  {slides[activeSlide]?.description || slides[activeSlide]?.bengali}
                </p>
              )}

              {/* CTA Buttons (Per-Slide Customizable) */}
              {currentSlide?.buttons !== undefined ? (
                currentSlide.buttons.length > 0 && (
                  <div className={`pt-4 flex flex-wrap items-center gap-3 ${
                    align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
                  }`}>
                    {currentSlide.buttons.map((btn, bIdx) => {
                      const isFirst = bIdx === 0;
                      let styleClasses = 'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm tracking-wide transition-all transform active:scale-95 shadow-lg cursor-pointer ';
                      
                      switch (btn.variant) {
                        case 'emerald':
                          styleClasses += 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25';
                          break;
                        case 'secondary':
                          styleClasses += 'bg-white hover:bg-slate-100 text-slate-950 shadow-white/10';
                          break;
                        case 'dark':
                          styleClasses += 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md';
                          break;
                        case 'whatsapp':
                          styleClasses += 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/30';
                          break;
                        case 'primary':
                        default:
                          styleClasses += 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/30';
                          break;
                      }

                      return (
                        <button
                          key={btn.id}
                          onClick={() => handleButtonClick(btn.link)}
                          className={styleClasses}
                        >
                          <span>{btn.text}</span>
                          {isFirst && <ArrowRight className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className={`pt-4 flex items-center gap-4 ${
                  align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
                }`}>
                  <button
                    onClick={() => onNavigate('shop')}
                    className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm sm:text-base tracking-wide transition-all transform active:scale-95 shadow-xl shadow-sky-500/30 cursor-pointer"
                  >
                    <span>{slides[activeSlide]?.buttonText || 'Shop Now'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => onNavigate('shop')}
                    className="hidden sm:inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm tracking-wide transition-all backdrop-blur-md border border-white/20 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Explore Deals</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* 2. Right Column: High-Value Promo Cards (Cash on Delivery & Quick Guarantees) */}
        {isSideBannerEnabled && (
          <div className="hidden lg:flex lg:col-span-4 xl:col-span-3 flex-col gap-4">
            {/* Top Cash On Delivery / Custom Promo Banner */}
            {(() => {
              const bgImg = heroSideBanner?.bgImage || codBannerImage;
              const bgType = heroSideBanner?.bgType || (bgImg ? 'image' : 'gradient');
              const bgColor = heroSideBanner?.bgColor || 'from-sky-700 via-blue-800 to-slate-900';
              const isHexOrRgb = bgColor.startsWith('#') || bgColor.startsWith('rgb');

              const tagText = heroSideBanner?.tagText !== undefined ? heroSideBanner.tagText : 'Nationwide Delivery';
              const title = heroSideBanner?.title !== undefined ? heroSideBanner.title : 'Cash on Delivery Nationwide';
              const description = heroSideBanner?.description !== undefined ? heroSideBanner.description : 'Order directly to your doorstep, inspect your package, and pay safely upon delivery anywhere in Bangladesh.';
              const footerText = heroSideBanner?.footerText !== undefined ? heroSideBanner.footerText : '100% Guaranteed';
              const buttonText = heroSideBanner?.buttonText !== undefined ? heroSideBanner.buttonText : 'Order Now';
              const buttonLink = heroSideBanner?.buttonLink || 'shop';
              const showButton = heroSideBanner?.showButton !== false && !!buttonText?.trim();
              const buttonVariant = heroSideBanner?.buttonVariant || 'secondary';

              let btnClass = 'bg-white text-slate-950 hover:bg-sky-50';
              if (buttonVariant === 'primary') btnClass = 'bg-sky-500 text-slate-950 hover:bg-sky-400';
              else if (buttonVariant === 'emerald') btnClass = 'bg-emerald-500 text-white hover:bg-emerald-400';
              else if (buttonVariant === 'dark') btnClass = 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-700';
              else if (buttonVariant === 'outline') btnClass = 'bg-transparent text-white border border-white/40 hover:bg-white/10';
              else if (buttonVariant === 'whatsapp') btnClass = 'bg-emerald-600 text-white hover:bg-emerald-500';

              return (
                <div
                  style={isHexOrRgb ? { backgroundColor: bgColor } : undefined}
                  className={`flex-1 ${
                    !isHexOrRgb && bgType !== 'image' ? (bgColor.startsWith('bg-') ? bgColor : `bg-gradient-to-br ${bgColor}`) : 'bg-slate-900'
                  } rounded-3xl p-6 text-white flex flex-col justify-between shadow-lg relative overflow-hidden group border border-sky-600/30 min-h-[220px]`}
                >
                  {bgType === 'image' && bgImg && (
                    <div className="absolute inset-0 z-0">
                      <img
                        src={bgImg}
                        alt="Promo Banner"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-40"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-transparent"></div>
                    </div>
                  )}

                  <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-sky-400/20 rounded-full blur-2xl pointer-events-none z-1"></div>

                  <div className="relative z-10 space-y-2">
                    {tagText && tagText.trim() ? (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-sky-100 px-2.5 py-1 rounded-md backdrop-blur-md inline-block">
                        {tagText}
                      </span>
                    ) : null}
                    {title && title.trim() ? (
                      <h3 className="text-xl sm:text-2xl font-black leading-tight text-white">
                        {title}
                      </h3>
                    ) : null}
                    {description && description.trim() ? (
                      <p className="text-xs text-sky-100/90 leading-relaxed">
                        {description}
                      </p>
                    ) : null}
                  </div>

                  {(footerText || showButton) ? (
                    <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between relative z-10 gap-2">
                      {footerText && footerText.trim() ? (
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{footerText}</span>
                        </div>
                      ) : <div />}
                      {showButton ? (
                        <button
                          onClick={() => handleButtonClick(buttonLink)}
                          className={`text-xs font-black px-3.5 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer shrink-0 ${btnClass}`}
                        >
                          {buttonText}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })()}

            {/* Quick Guarantees & Courier Badges */}
            {activeFeatures.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-3">
                {activeFeatures.map((feat) => (
                  <div key={feat.id} className="flex items-center gap-3.5 p-2.5 rounded-2xl bg-slate-50 hover:bg-sky-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                      {renderBadgeIcon(feat.icon)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900">{feat.text}</h4>
                      {feat.subtitle && <p className="text-[11px] text-slate-500">{feat.subtitle}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
