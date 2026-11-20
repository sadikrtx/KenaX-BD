import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Tag,
  Check,
  ArrowRight,
  Gift,
  Flame,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Clock,
  Truck,
  Phone,
  MessageCircle,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import {
  OfferPopupSettings,
  DEFAULT_OFFER_POPUP_SETTINGS,
  DEFAULT_OFFER_SLIDES,
  OfferSlideItem,
  OfferHighlightType,
} from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

interface OfferPopupModalProps {
  popupSettings?: OfferPopupSettings;
  onNavigate: (view: string, target?: string) => void;
  onSelectCategory?: (category: string) => void;
  onSelectProduct?: (productId: string) => void;
  isPreview?: boolean;
}

export const OfferPopupModal: React.FC<OfferPopupModalProps> = ({
  popupSettings,
  onNavigate,
  onSelectCategory,
  onSelectProduct,
  isPreview = false,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const config = {
    ...DEFAULT_OFFER_POPUP_SETTINGS,
    ...(popupSettings || {}),
  };

  // Compile active slides list (supporting both new slides array and legacy single slide fallback)
  const activeSlides: OfferSlideItem[] = (
    config.slides && config.slides.length > 0
      ? config.slides.filter((s) => s.enabled !== false)
      : [
          {
            id: 'legacy_default_slide',
            enabled: true,
            badgeText: config.badgeText || DEFAULT_OFFER_POPUP_SETTINGS.badgeText,
            badgeTextEn: config.badgeTextEn || DEFAULT_OFFER_POPUP_SETTINGS.badgeTextEn,
            title: config.title || DEFAULT_OFFER_POPUP_SETTINGS.title || '',
            titleEn: config.titleEn || DEFAULT_OFFER_POPUP_SETTINGS.titleEn,
            subtitle: config.subtitle || DEFAULT_OFFER_POPUP_SETTINGS.subtitle || '',
            subtitleEn: config.subtitleEn || DEFAULT_OFFER_POPUP_SETTINGS.subtitleEn,
            imageUrl: config.imageUrl || DEFAULT_OFFER_POPUP_SETTINGS.imageUrl,
            highlightType: (config.couponCode ? 'coupon' : 'discount_badge') as OfferHighlightType,
            couponCode: config.couponCode || 'OFFER50',
            couponDiscountText: config.couponDiscountText || '৫০% পর্যন্ত ছাড়',
            couponDiscountTextEn: config.couponDiscountTextEn || 'Up to 50% OFF',
            buttonText: config.buttonText || DEFAULT_OFFER_POPUP_SETTINGS.buttonText || '🛍️ এখনই অফারটি নিন',
            buttonTextEn: config.buttonTextEn || DEFAULT_OFFER_POPUP_SETTINGS.buttonTextEn,
            actionType: (config.actionType as any) || 'shop',
            actionTarget: config.actionTarget || '',
          },
        ]
  ).filter(Boolean);

  const [isOpen, setIsOpen] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Live countdown timer state (hours, minutes, seconds)
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number }>({
    h: 11,
    m: 45,
    s: 30,
  });

  // Countdown timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: prev.m - 1, s: 59 };
        if (prev.h > 0) return { ...prev, h: prev.h - 1, m: 59, s: 59 };
        return { h: 12, m: 0, s: 0 }; // Loop countdown
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Popup open delay and session check
  useEffect(() => {
    if (isPreview) {
      setIsOpen(true);
      return;
    }

    if (!config.enabled || activeSlides.length === 0) {
      setIsOpen(false);
      return;
    }

    if (config.showOncePerSession) {
      try {
        const hasSeen = sessionStorage.getItem('kenax_offer_popup_seen');
        if (hasSeen === 'true') return;
      } catch {}
    }

    const delayMs = Math.max(500, (config.delaySeconds || 2.5) * 1000);
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [config.enabled, config.delaySeconds, config.showOncePerSession, isPreview, activeSlides.length]);

  // Auto carousel slide rotation
  useEffect(() => {
    if (!isOpen || activeSlides.length <= 1 || isHovered) return;
    const intervalSec = Math.max(3, config.autoSlideInterval || 4.5);
    const slideTimer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, intervalSec * 1000);

    return () => clearInterval(slideTimer);
  }, [isOpen, activeSlides.length, isHovered, config.autoSlideInterval]);

  const handleClose = () => {
    setIsOpen(false);
    if (!isPreview && config.showOncePerSession) {
      try {
        sessionStorage.setItem('kenax_offer_popup_seen', 'true');
      } catch {}
    }
  };

  const handlePrevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndex((prev) => (prev === 0 ? activeSlides.length - 1 : prev - 1));
  };

  const handleNextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const currentSlide: OfferSlideItem = activeSlides[currentSlideIndex] || activeSlides[0] || DEFAULT_OFFER_SLIDES[0];

  const handleCopyCoupon = (e: React.MouseEvent, code?: string) => {
    e.stopPropagation();
    const cCode = code || currentSlide.couponCode;
    if (!cCode) return;
    navigator.clipboard.writeText(cCode);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2500);
  };

  const handleActionClick = () => {
    handleClose();
    const action = currentSlide.actionType || 'shop';
    const target = currentSlide.actionTarget || '';

    if (action === 'shop') {
      onNavigate('shop');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'category' && target) {
      if (onSelectCategory) {
        onSelectCategory(target);
      }
      onNavigate('shop');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'product' && target) {
      if (onSelectProduct) {
        onSelectProduct(target);
      }
      onNavigate('product');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'flash_sale') {
      onNavigate('home');
      setTimeout(() => {
        const el = document.getElementById('flash-sale-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    } else if (action === 'whatsapp') {
      const num = target || currentSlide.hotlineNumber || '8801719143897';
      const cleanNum = num.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanNum}?text=Hello,%20I%20want%20to%20know%20more%20about%20your%20offers!`, '_blank', 'noopener,noreferrer');
    } else if (action === 'custom_url' && target) {
      if (target.startsWith('http://') || target.startsWith('https://')) {
        window.open(target, '_blank', 'noopener,noreferrer');
      } else {
        onNavigate(target.replace('/', ''));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      onNavigate('shop');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const badgeText = isBn
    ? currentSlide.badgeText || currentSlide.badgeTextEn
    : currentSlide.badgeTextEn || currentSlide.badgeText;
  const titleText = isBn
    ? currentSlide.title || currentSlide.titleEn
    : currentSlide.titleEn || currentSlide.title;
  const subtitleText = isBn
    ? currentSlide.subtitle || currentSlide.subtitleEn
    : currentSlide.subtitleEn || currentSlide.subtitle;
  const buttonText = isBn
    ? currentSlide.buttonText || currentSlide.buttonTextEn
    : currentSlide.buttonTextEn || currentSlide.buttonText;
  const discountText = isBn
    ? currentSlide.couponDiscountText || currentSlide.couponDiscountTextEn
    : currentSlide.couponDiscountTextEn || currentSlide.couponDiscountText;
  const highlightTitle = isBn
    ? currentSlide.customHighlightTitle || currentSlide.customHighlightTitleEn
    : currentSlide.customHighlightTitleEn || currentSlide.customHighlightTitle;
  const highlightSubtitle = isBn
    ? currentSlide.customHighlightSubtitle || currentSlide.customHighlightSubtitleEn
    : currentSlide.customHighlightSubtitleEn || currentSlide.customHighlightSubtitle;

  const bannerImg =
    currentSlide.imageUrl ||
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative w-full max-w-lg sm:max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar Header with Close & Slide Indicators */}
            <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
              {activeSlides.length > 1 && (
                <div className="px-2.5 py-1 rounded-full bg-slate-950/60 backdrop-blur-md text-[11px] font-black text-white border border-white/10 flex items-center gap-1">
                  <span>{currentSlideIndex + 1}</span>
                  <span className="text-white/50">/</span>
                  <span>{activeSlides.length}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-slate-950/65 hover:bg-slate-950/90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95 group border border-white/10"
                title={isBn ? 'বন্ধ করুন' : 'Close'}
              >
                <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              </button>
            </div>

            {/* Banner Media Image with Carousel Controls */}
            <div className="relative w-full h-44 sm:h-52 bg-slate-950 overflow-hidden group/banner">
              <img
                key={currentSlide.id || currentSlideIndex}
                src={getOptimizedImageUrl(bannerImg, 800)}
                alt="Special Offer"
                onClick={handleActionClick}
                className="w-full h-full object-cover object-center transform group-hover/banner:scale-105 transition-transform duration-700 cursor-pointer animate-in fade-in"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80';
                }}
              />
              <div
                onClick={handleActionClick}
                className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent cursor-pointer"
              />

              {/* Prev / Next Carousel Navigation Arrows */}
              {activeSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevSlide}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900/95 text-white flex items-center justify-center backdrop-blur-md border border-white/15 shadow-md transition-all active:scale-90 cursor-pointer"
                    title="Previous Slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextSlide}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900/95 text-white flex items-center justify-center backdrop-blur-md border border-white/15 shadow-md transition-all active:scale-90 cursor-pointer"
                    title="Next Slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Floating Top Left Badge */}
              {badgeText && (
                <div className="absolute top-3.5 left-3.5 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/30 border border-white/20 uppercase tracking-wider animate-pulse">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>{badgeText}</span>
                  </span>
                </div>
              )}

              {/* Banner Floating Title on bottom of image */}
              <div
                onClick={handleActionClick}
                className="absolute bottom-3 left-4 right-4 z-10 cursor-pointer"
              >
                <h3 className="text-lg sm:text-xl font-black text-white drop-shadow-md leading-tight group-hover/banner:text-amber-300 transition-colors">
                  {titleText}
                </h3>
              </div>
            </div>

            {/* Modal Content Body */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Subtitle / Description */}
              {subtitleText && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {subtitleText}
                </p>
              )}

              {/* DYNAMIC HIGHLIGHT SECTION BASED ON highlightType */}
              {/* 1. Promo Coupon Code */}
              {currentSlide.highlightType === 'coupon' && currentSlide.couponCode && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-indigo-500/10 dark:from-amber-500/15 dark:to-indigo-500/15 border-2 border-dashed border-sky-400 dark:border-sky-500/40 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{isBn ? 'স্পেশাল কুপন কোড' : 'Special Promo Code'}</span>
                      {discountText && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-black">
                          {discountText}
                        </span>
                      )}
                    </div>
                    <p className="text-base sm:text-lg font-black font-mono tracking-wider text-slate-900 dark:text-white mt-0.5 truncate">
                      {currentSlide.couponCode}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleCopyCoupon(e, currentSlide.couponCode)}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 active:scale-95"
                  >
                    {copiedCoupon ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span className="text-emerald-200">{isBn ? 'কপি হয়েছে!' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Tag className="w-3.5 h-3.5" />
                        <span>{isBn ? 'কোড কপি করুন' : 'Copy Code'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* 2. Live Countdown Clock */}
              {currentSlide.highlightType === 'countdown' && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-orange-500/10 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Clock className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold text-rose-700 dark:text-rose-300 uppercase block tracking-wider">
                        {highlightTitle || (isBn ? '⚡ অফার শেষ হতে বাকি:' : '⚡ Limited-Time Offer:')}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isBn ? 'দ্রুত অর্ডার করে অফার লুফে নিন' : 'Hurry up before deals expire'}
                      </span>
                    </div>
                  </div>

                  {/* Countdown Digital Boxes */}
                  <div className="flex items-center gap-1 font-mono font-black text-slate-900 dark:text-white shrink-0">
                    <div className="px-2 py-1 rounded-lg bg-slate-900 text-white dark:bg-slate-800 text-xs shadow-xs text-center min-w-[28px]">
                      {String(timeLeft.h).padStart(2, '0')}
                      <span className="text-[8px] block font-sans text-slate-400 font-normal">HR</span>
                    </div>
                    <span className="font-bold text-rose-500">:</span>
                    <div className="px-2 py-1 rounded-lg bg-slate-900 text-white dark:bg-slate-800 text-xs shadow-xs text-center min-w-[28px]">
                      {String(timeLeft.m).padStart(2, '0')}
                      <span className="text-[8px] block font-sans text-slate-400 font-normal">MIN</span>
                    </div>
                    <span className="font-bold text-rose-500">:</span>
                    <div className="px-2 py-1 rounded-lg bg-rose-600 text-white text-xs shadow-xs text-center min-w-[28px] animate-pulse">
                      {String(timeLeft.s).padStart(2, '0')}
                      <span className="text-[8px] block font-sans text-rose-200 font-normal">SEC</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Discount Badge / Flat Offer Note */}
              {currentSlide.highlightType === 'discount_badge' && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Percent className="w-5 h-5 font-black" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200">
                      {highlightTitle || discountText || (isBn ? 'বিশেষ ফ্ল্যাট মূল্যছাড় ও ক্যাশব্যাক' : 'Special Instant Discount Deal')}
                    </h4>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                      {highlightSubtitle || (isBn ? 'চেকআউটে স্বয়ংক্রিয়ভাবে ডিসকাউন্ট প্রযোজ্য হবে।' : 'Discount will be applied automatically at checkout.')}
                    </p>
                  </div>
                </div>
              )}

              {/* 4. Free Home Delivery Promo */}
              {currentSlide.highlightType === 'free_delivery' && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700/60 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200">
                      {highlightTitle || (isBn ? '🚚 সম্পূর্ণ ফ্রি হোম ডেলিভারি সারা বাংলাদেশ' : '🚚 Free Nationwide Express Delivery')}
                    </h4>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                      {highlightSubtitle || (isBn ? 'ক্যাশ অন ডেলিভারিতে কোনো অতিরিক্ত শিপিং চার্জ নেই।' : 'No extra shipping fee on cash on delivery.')}
                    </p>
                  </div>
                </div>
              )}

              {/* 5. Direct Phone / WhatsApp Ordering Hotline */}
              {currentSlide.highlightType === 'hotline' && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                        {highlightTitle || (isBn ? 'সরাসরি হোয়াটসঅ্যাপে অর্ডার করুন' : 'Order via WhatsApp / Call')}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        {currentSlide.hotlineNumber || '+880 1719-143897'}
                      </span>
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/${(currentSlide.hotlineNumber || '8801719143897').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs shrink-0 cursor-pointer"
                  >
                    <span>{isBn ? 'মেসেজ দিন' : 'Chat Now'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* 6. Custom Text / Highlights Notice */}
              {currentSlide.highlightType === 'custom_text' && (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                      {highlightTitle || (isBn ? 'বিশেষ অফার হাইলাইটস' : 'Special Highlights')}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {highlightSubtitle || (isBn ? '১০০% অরিজিনাল প্রোডাক্ট ও ৭ দিনের রিপ্লেসমেন্ট ওয়ারেন্টি।' : '100% genuine products with replacement guarantee.')}
                    </p>
                  </div>
                </div>
              )}

              {/* Main CTA Button */}
              <button
                type="button"
                onClick={handleActionClick}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-sm sm:text-base shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer group"
              >
                <span>{buttonText || (isBn ? '🛍️ এখনই অফারটি নিন' : '🛍️ Claim Offer Now')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Carousel Pagination Dots */}
              {activeSlides.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  {activeSlides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        currentSlideIndex === idx
                          ? 'w-6 bg-sky-600 dark:bg-sky-400 shadow-xs'
                          : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                      }`}
                      title={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Dismiss Text */}
              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {isBn ? 'পরে দেখব / বন্ধ করুন' : 'Maybe later / Dismiss'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
