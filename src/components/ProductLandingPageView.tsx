import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Flame,
  Clock,
  ShieldCheck,
  Truck,
  CheckCircle,
  Star,
  ShoppingBag,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  Check,
  Phone,
  MapPin,
  User,
  Heart,
  Eye,
  Gift,
  Layers,
  Award,
  Zap,
  Tag,
  AlertCircle,
  Lock,
  CheckCircle2,
  ThumbsUp,
  CreditCard,
  PackageCheck,
  Headphones,
  FileText,
} from 'lucide-react';
import {
  Product,
  Order,
  OrderItem,
  SiteSettings,
  LandingPageConfig,
  ColorVariation,
} from '../types';
import {
  cleanBDPhoneNumber,
  validateBangladeshMobile,
  isValidBDMobileNumber,
} from '../utils/phoneUtils';
import { getOptimizedImageUrl, handleImageError } from '../utils/imageOptimizer';
import { FormattedText } from './FormattedText';
import { ProductVideoPlayer, detectVideoAspectRatio } from './ProductVideoPlayer';

interface ProductLandingPageViewProps {
  product: Product;
  allProducts: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart?: (
    product: Product,
    quantity?: number,
    variant?: string,
    customImage?: string
  ) => void;
  onBuyNow?: (
    product: Product,
    quantity?: number,
    variant?: string,
    customImage?: string
  ) => void;
  onOrderPlaced?: (order: Order) => void;
  siteSettings?: SiteSettings;
  isPreviewMode?: boolean;
  onBackToStore?: () => void;
}

export const THEME_STYLES: Record<
  string,
  {
    primaryBg: string;
    primaryHover: string;
    primaryText: string;
    lightBg: string;
    borderColor: string;
    ringColor: string;
    gradient: string;
    badgeBg: string;
    glowColor: string;
    btnGradient: string;
  }
> = {
  emerald: {
    primaryBg: 'bg-emerald-600',
    primaryHover: 'hover:bg-emerald-700',
    primaryText: 'text-emerald-600',
    lightBg: 'bg-emerald-50/80',
    borderColor: 'border-emerald-500',
    ringColor: 'focus:ring-emerald-500',
    gradient: 'from-emerald-900 via-teal-900 to-slate-950',
    badgeBg: 'bg-emerald-100/90 text-emerald-900 border-emerald-300',
    glowColor: 'shadow-emerald-500/20',
    btnGradient: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white',
  },
  indigo: {
    primaryBg: 'bg-indigo-600',
    primaryHover: 'hover:bg-indigo-700',
    primaryText: 'text-indigo-600',
    lightBg: 'bg-indigo-50/80',
    borderColor: 'border-indigo-500',
    ringColor: 'focus:ring-indigo-500',
    gradient: 'from-slate-950 via-indigo-950 to-slate-950',
    badgeBg: 'bg-indigo-100/90 text-indigo-900 border-indigo-300',
    glowColor: 'shadow-indigo-500/20',
    btnGradient: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white',
  },
  sky: {
    primaryBg: 'bg-sky-600',
    primaryHover: 'hover:bg-sky-700',
    primaryText: 'text-sky-600',
    lightBg: 'bg-sky-50/80',
    borderColor: 'border-sky-500',
    ringColor: 'focus:ring-sky-500',
    gradient: 'from-slate-950 via-sky-950 to-slate-950',
    badgeBg: 'bg-sky-100/90 text-sky-900 border-sky-300',
    glowColor: 'shadow-sky-500/20',
    btnGradient: 'bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white',
  },
  rose: {
    primaryBg: 'bg-rose-600',
    primaryHover: 'hover:bg-rose-700',
    primaryText: 'text-rose-600',
    lightBg: 'bg-rose-50/80',
    borderColor: 'border-rose-500',
    ringColor: 'focus:ring-rose-500',
    gradient: 'from-slate-950 via-rose-950 to-slate-950',
    badgeBg: 'bg-rose-100/90 text-rose-900 border-rose-300',
    glowColor: 'shadow-rose-500/20',
    btnGradient: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white',
  },
  amber: {
    primaryBg: 'bg-amber-600',
    primaryHover: 'hover:bg-amber-700',
    primaryText: 'text-amber-600',
    lightBg: 'bg-amber-50/80',
    borderColor: 'border-amber-500',
    ringColor: 'focus:ring-amber-500',
    gradient: 'from-slate-950 via-amber-950 to-slate-950',
    badgeBg: 'bg-amber-100/90 text-amber-900 border-amber-300',
    glowColor: 'shadow-amber-500/20',
    btnGradient: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white',
  },
  purple: {
    primaryBg: 'bg-purple-600',
    primaryHover: 'hover:bg-purple-700',
    primaryText: 'text-purple-600',
    lightBg: 'bg-purple-50/80',
    borderColor: 'border-purple-500',
    ringColor: 'focus:ring-purple-500',
    gradient: 'from-slate-950 via-purple-950 to-slate-950',
    badgeBg: 'bg-purple-100/90 text-purple-900 border-purple-300',
    glowColor: 'shadow-purple-500/20',
    btnGradient: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white',
  },
  slate: {
    primaryBg: 'bg-slate-900',
    primaryHover: 'hover:bg-black',
    primaryText: 'text-slate-900',
    lightBg: 'bg-slate-100',
    borderColor: 'border-slate-800',
    ringColor: 'focus:ring-slate-900',
    gradient: 'from-slate-950 via-slate-900 to-slate-950',
    badgeBg: 'bg-slate-200 text-slate-900 border-slate-300',
    glowColor: 'shadow-slate-500/20',
    btnGradient: 'bg-gradient-to-r from-slate-900 to-black hover:from-black hover:to-slate-900 text-white',
  },
};

export const ProductLandingPageView: React.FC<ProductLandingPageViewProps> = ({
  product,
  allProducts,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onOrderPlaced,
  siteSettings,
  isPreviewMode = false,
  onBackToStore,
}) => {
  const lp = (product.landingPage || {}) as LandingPageConfig;
  const themeKey = lp.accentColor || 'emerald';
  const theme = THEME_STYLES[themeKey] || THEME_STYLES.emerald;

  // Helper to determine if hex is light for readable icons
  const isLightColor = (hex?: string) => {
    if (!hex) return false;
    const clean = hex.replace('#', '');
    if (clean.length === 3) {
      const r = parseInt(clean[0] + clean[0], 16);
      const g = parseInt(clean[1] + clean[1], 16);
      const b = parseInt(clean[2] + clean[2], 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 160;
    }
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 160;
    }
    return false;
  };

  // 1. Available Colors
  const availableColors: ColorVariation[] = useMemo(() => {
    if (lp.customColors && lp.customColors.length > 0) {
      return lp.customColors;
    }
    if (product.colors && product.colors.length > 0) {
      return product.colors;
    }
    // Check if variations has a color variation
    const colorVar = product.variations?.find(
      (v) =>
        v.type === 'color' ||
        v.name?.toLowerCase().includes('color') ||
        v.name?.includes('কালার') ||
        (v.colorItems && v.colorItems.length > 0)
    );
    if (colorVar) {
      if (colorVar.colorItems && colorVar.colorItems.length > 0) {
        return colorVar.colorItems;
      }
      const opts = colorVar.options || colorVar.values || [];
      return opts.map((opt) => ({
        name: opt,
        colorName: opt,
        colorCode: '#0f172a',
      }));
    }

    // Default 3 standard colors for T-shirt / apparel landing pages
    const name = (product.name || '').toLowerCase();
    const cat = (product.category || '').toLowerCase();
    const isApparelOrTshirt =
      name.includes('t-shirt') ||
      name.includes('tshirt') ||
      name.includes('টি-শার্ট') ||
      name.includes('polo') ||
      name.includes('shirt') ||
      name.includes('শার্ট') ||
      name.includes('panjabi') ||
      name.includes('পাঞ্জাবি') ||
      cat.includes('fashion') ||
      cat.includes('clothing') ||
      cat.includes('পোশাক') ||
      lp.enabled;

    if (isApparelOrTshirt) {
      return [
        { name: 'কালো', colorName: 'Black', colorCode: '#0f172a', hexCode: '#0f172a' },
        { name: 'সাদা', colorName: 'White', colorCode: '#f8fafc', hexCode: '#f8fafc' },
        { name: 'নেভি ব্লু', colorName: 'Navy Blue', colorCode: '#1e3a8a', hexCode: '#1e3a8a' },
      ];
    }

    return [];
  }, [product, lp.customColors, lp.enabled]);

  // 2. Available Sizes / Options
  const availableSizes: string[] = useMemo(() => {
    if (product.sizes && product.sizes.length > 0) {
      return product.sizes;
    }
    const sizeVar = product.variations?.find(
      (v) =>
        v.type === 'size' ||
        v.name?.toLowerCase().includes('size') ||
        v.name?.includes('সাইজ')
    );
    if (sizeVar) {
      return sizeVar.options || sizeVar.values || [];
    }
    const nonColorVars = (product.variations || []).filter(
      (v) =>
        v.type !== 'color' &&
        !v.name?.toLowerCase().includes('color') &&
        !v.name?.includes('কালার')
    );
    if (nonColorVars.length > 0) {
      return nonColorVars[0].options || nonColorVars[0].values || [];
    }
    return [];
  }, [product]);

  // Extract contextual product noun (e.g. টি-শার্ট, পোলো শার্ট, পাঞ্জাবি, etc.)
  const productItemNoun = useMemo(() => {
    const name = product.name || '';
    const lower = name.toLowerCase();
    if (lower.includes('t-shirt') || lower.includes('tshirt') || name.includes('টি-শার্ট')) return 'টি-শার্ট';
    if (lower.includes('polo') || name.includes('পোলো')) return 'পোলো শার্ট';
    if (lower.includes('shirt') || name.includes('শার্ট')) return 'শার্ট';
    if (lower.includes('panjabi') || name.includes('পাঞ্জাবি')) return 'পাঞ্জাবি';
    if (lower.includes('pant') || name.includes('প্যান্ট')) return 'প্যান্ট';
    if (lower.includes('gown') || name.includes('গাউন')) return 'গাউন';
    if (lower.includes('two piece') || lower.includes('three piece') || name.includes('থ্রি-পিস')) return 'ড্রেস';
    if (lower.includes('shoe') || name.includes('জুতা') || lower.includes('sneaker')) return 'জুতো';
    if (lower.includes('watch') || name.includes('ঘড়ি')) return 'ঘড়ি';
    if (lower.includes('bag') || name.includes('ব্যাগ')) return 'ব্যাগ';
    return 'টি-শার্ট';
  }, [product.name]);

  // Selected Image & Color (Default: null - user MUST select manually)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ColorVariation | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');

  // Quantity
  const [quantity, setQuantity] = useState(1);

  // Form State for Instant Checkout
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState<'inside_dhaka' | 'outside_dhaka'>('inside_dhaka');
  const [customerNote, setCustomerNote] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const orderFormRef = useRef<HTMLDivElement>(null);

  // Gallery Images
  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (product.images && product.images.length > 0) {
      list.push(...product.images);
    }
    if (product.colors && product.colors.length > 0) {
      product.colors.forEach((c) => {
        if (c.imageUrl && !list.includes(c.imageUrl)) {
          list.push(c.imageUrl);
        }
      });
    }
    return list.length > 0
      ? list
      : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop'];
  }, [product]);

  // Delivery Charges
  const insideDhakaCharge = lp.deliveryInsideDhakaFee ?? siteSettings?.insideDhakaCharge ?? 70;
  const outsideDhakaCharge = lp.deliveryOutsideDhakaFee ?? siteSettings?.outsideDhakaCharge ?? 130;
  const currentDeliveryCharge = deliveryArea === 'inside_dhaka' ? insideDhakaCharge : outsideDhakaCharge;

  // Pricing calculations
  const currentPrice = product.price || 0;
  const originalPrice = product.originalPrice || currentPrice * 1.5;
  const savings = Math.max(0, originalPrice - currentPrice);
  const discountPercent =
    product.discountPercent ||
    (originalPrice > currentPrice ? Math.round((savings / originalPrice) * 100) : 0);

  const subtotal = currentPrice * quantity;
  const totalPayable = subtotal + currentDeliveryCharge;

  // Real-time Countdown Timer (Hours/Minutes/Seconds)
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: lp.countdownHours || 14,
    minutes: 35,
    seconds: 42,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          // Reset loop
          return { hours: lp.countdownHours || 24, minutes: 0, seconds: 0 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lp.countdownHours]);

  // Similar products filtering
  const similarProducts = useMemo(() => {
    if (lp.showSimilarProducts === false) return [];
    if (lp.similarProductIds && lp.similarProductIds.length > 0) {
      return allProducts.filter(
        (p) => lp.similarProductIds?.includes(p.id) && p.id !== product.id
      );
    }
    return allProducts
      .filter((p) => p.category === product.category && p.id !== product.id)
      .slice(0, 4);
  }, [allProducts, product, lp.showSimilarProducts, lp.similarProductIds]);

  // Active Image display
  const activeImage = selectedColor?.imageUrl || galleryImages[selectedImageIndex] || galleryImages[0];

  // Smooth scroll to checkout form
  const scrollToCheckout = () => {
    if (orderFormRef.current) {
      orderFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Video URL & Aspect Ratio handling
  const landingVideoUrl = (lp.videoUrl || product.videoUrl || '').trim();
  const configuredVideoRatio = lp.videoAspectRatio || product.videoAspectRatio || 'auto';
  const [detectedLpRatio, setDetectedLpRatio] = useState<'9:16' | '16:9' | '1:1' | '4:3'>(() => {
    if (configuredVideoRatio && configuredVideoRatio !== 'auto') return configuredVideoRatio;
    return detectVideoAspectRatio(landingVideoUrl);
  });

  useEffect(() => {
    if (configuredVideoRatio && configuredVideoRatio !== 'auto') {
      setDetectedLpRatio(configuredVideoRatio);
    } else {
      setDetectedLpRatio(detectVideoAspectRatio(landingVideoUrl));
    }
  }, [configuredVideoRatio, landingVideoUrl]);

  const activeVideoRatio = (configuredVideoRatio && configuredVideoRatio !== 'auto') ? configuredVideoRatio : detectedLpRatio;

  // Handle direct 1-click order submission
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = customerName.trim();
    const cleanPhone = cleanBDPhoneNumber(customerPhone);
    const cleanAddress = customerAddress.trim();

    if (!cleanName) {
      setFormError('অনুগ্রহ করে আপনার পুরো নাম লিখুন');
      return;
    }

    const phoneValidation = validateBangladeshMobile(cleanPhone, { lang: 'bn' });
    if (!phoneValidation.isValid) {
      setFormError(phoneValidation.error || 'সঠিক মোবাইল নম্বর দিন।');
      return;
    }

    if (!cleanAddress || cleanAddress.length < 5) {
      setFormError('অনুগ্রহ করে আপনার সম্পূর্ণ ডেলিভারি ঠিকানা (বাসা/রোড/এলাকা/থানা/জেলা) লিখুন');
      return;
    }

    if (availableColors.length > 0 && !selectedColor) {
      setFormError('⚠️ অনুগ্রহ করে প্রোডাক্টের কালার সিলেক্ট করুন!');
      return;
    }

    if (availableSizes.length > 0 && !selectedVariant) {
      setFormError('⚠️ অনুগ্রহ করে প্রোডাক্টের সাইজ বা ভেরিয়েশন সিলেক্ট করুন!');
      return;
    }

    setIsSubmittingOrder(true);

    const orderItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      productImage: activeImage,
      selectedColor: selectedColor?.name,
      selectedColorImage: selectedColor?.imageUrl,
      selectedSize: selectedVariant || undefined,
      selectedVariation: selectedVariant || undefined,
      quantity,
      price: currentPrice,
      total: subtotal,
      variant: [selectedColor?.name, selectedVariant].filter(Boolean).join(' - ') || selectedVariant || selectedColor?.name || undefined,
    };

    const newOrder: Order = {
      id: 'ORD-' + Date.now().toString().slice(-6),
      customerId: 'guest-' + Date.now(),
      customerName: cleanName,
      customerEmail: '',
      customerMobile: cleanPhone,
      customerPhone: cleanPhone,
      deliveryName: cleanName,
      deliveryMobile: cleanPhone,
      fullAddress: cleanAddress,
      deliveryAddress: cleanAddress,
      division: deliveryArea === 'inside_dhaka' ? 'Dhaka' : 'Outside Dhaka',
      district: deliveryArea === 'inside_dhaka' ? 'Dhaka City' : 'Other District',
      upazila: deliveryArea === 'inside_dhaka' ? 'Dhaka City' : 'General Area',
      area: deliveryArea === 'inside_dhaka' ? 'Dhaka' : 'General Area',
      items: [orderItem],
      totalAmount: totalPayable,
      subtotal: subtotal,
      deliveryCharge: currentDeliveryCharge,
      discount: 0,
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'Pending',
      status: 'Pending',
      orderStatus: 'Pending',
      orderDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerNotes: customerNote || undefined,
      source: 'Landing Page Direct (FB Ads)',
      orderSource: 'manual',
      sourceChannel: 'Landing Page Direct',
      isAiBotOrder: false,
      timeline: [
        {
          status: 'Pending',
          timestamp: new Date().toISOString(),
          note: 'Direct 1-Click Order placed from Facebook Ads Landing Page',
        },
      ],
    };

    if (onOrderPlaced) {
      onOrderPlaced(newOrder);
      setIsSubmittingOrder(false);
      setOrderSuccess(true);
    } else if (onBuyNow) {
      onBuyNow(product, quantity, selectedVariant || selectedColor?.name, activeImage);
      setIsSubmittingOrder(false);
    } else {
      setTimeout(() => {
        setIsSubmittingOrder(false);
        setOrderSuccess(true);
      }, 600);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28 md:pb-20 selection:bg-indigo-500 selection:text-white">
      {/* Top Animated Urgency Ribbon */}
      <div
        className={`w-full py-3 px-4 text-center text-xs sm:text-sm font-black text-white bg-gradient-to-r ${theme.gradient} shadow-lg sticky top-0 z-40 flex items-center justify-center gap-2 overflow-hidden border-b border-white/10`}
      >
        <Flame className="w-4 h-4 text-amber-300 fill-amber-300 animate-bounce shrink-0" />
        <span className="tracking-wide">
          {lp.topBannerText || '🔥 ধামাকা অফার! সীমিত সময়ের জন্য বিশেষ ছাড় চলছে'}
        </span>
        <span className="hidden md:inline bg-white/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
          সারা বাংলাদেশে ক্যাশ অন ডেলিভারি
        </span>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 space-y-6 sm:space-y-10">
        {/* TOP CALLOUT HEADLINE */}
        <div className="text-center px-1 max-w-4xl mx-auto overflow-hidden">
          <h1 className="text-base sm:text-2xl md:text-3xl lg:text-4xl font-black text-white font-bangla tracking-tight leading-normal">
            {lp.headline || 'সীমিত সময়ের স্পেশাল অফার! আজই অর্ডার করুন'}
          </h1>
        </div>

        {/* MAIN PRODUCT SHOWCASE CARD */}
        <div className="bg-slate-900 rounded-3xl sm:rounded-[36px] border border-slate-800 shadow-2xl p-4 sm:p-7 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
            {/* Left Column: Media Gallery (Large Full-View Image - 6 cols on desktop) */}
            <div className="lg:col-span-6 space-y-3.5">
              <div className="relative min-h-[360px] sm:min-h-[480px] md:min-h-[540px] w-full rounded-2xl sm:rounded-3xl bg-slate-950/90 border border-slate-800 overflow-hidden group shadow-xl flex items-center justify-center p-2 sm:p-4">
                <img
                  src={getOptimizedImageUrl(activeImage, 1200)}
                  alt={product.name}
                  className="w-full h-auto max-h-[520px] sm:max-h-[620px] object-contain object-center group-hover:scale-[1.02] transition-transform duration-500 drop-shadow-lg"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleImageError(e, activeImage)}
                />
              </div>

              {/* Thumbnail Carousel */}
              {galleryImages.length > 1 && (
                <div className="flex items-center justify-center lg:justify-start gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        setSelectedColor(null);
                      }}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer p-1 bg-slate-950 flex items-center justify-center ${
                        activeImage === img
                          ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-105 shadow-md'
                          : 'border-slate-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={getOptimizedImageUrl(img, 200)}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Product Details, Offer, Variations, CTA, Countdown (6 cols on desktop) */}
            <div className="lg:col-span-6 space-y-4">
              {/* Category & Brand Header */}
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <span className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-black uppercase tracking-wider font-bangla">
                  {product.category || 'General'}
                </span>
                {product.brand && (
                  <span className="text-xs font-bold text-slate-300 font-bangla bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                    {product.brand}
                  </span>
                )}
              </div>

              {/* 1. Product Title */}
              <div className="text-center lg:text-left space-y-1">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-snug font-bangla">
                  {product.banglaName || product.name}
                </h2>
                {product.banglaName && product.name && product.banglaName !== product.name && (
                  <p className="text-xs sm:text-sm font-semibold text-slate-300 font-bangla">{product.name}</p>
                )}
              </div>

              {/* 2. Offer Pricing Presentation */}
              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-bangla">
                    {lp.priceSectionTitle || 'অফার মূল্য:'}
                  </span>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400 font-mono">
                      ৳{currentPrice.toLocaleString()}
                    </span>
                    {originalPrice > currentPrice && (
                      <span className="text-sm sm:text-base text-slate-500 line-through font-semibold font-mono">
                        ৳{originalPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {savings > 0 && (
                  <div className="text-right">
                    <span className="inline-block px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black font-bangla">
                      {lp.savingsBadgeText ? `৳${savings.toLocaleString()} ${lp.savingsBadgeText}` : `৳${savings.toLocaleString()} সাশ্রয়!`}
                    </span>
                  </div>
                )}
              </div>

              {/* Immediate Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={scrollToCheckout}
                  className={`w-full py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl font-black text-sm sm:text-lg flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer font-bangla ${theme.btnGradient}`}
                >
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>
                    {lp.customButtonText && !lp.customButtonText.includes('ক্যাশ অন ডেলিভারিতে')
                      ? lp.customButtonText
                      : 'অর্ডার কনফার্ম করুন'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs font-semibold text-slate-400 font-bangla">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lp.orderSecurityNotice || 'পণ্য হাতে পেয়ে দেখে ডেলিভারি ম্যানকে মূল্য পরিশোধ করুন'}</span>
                </div>
              </div>

              {/* LIVE COUNTDOWN TIMER CARD (Directly below Order Confirm button) */}
              {lp.showCountdown !== false && (
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xl border border-amber-500/30 relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-left">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40 shadow-inner">
                        <Clock className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-white font-bangla">
                          {lp.countdownTitle || 'স্পেশাল অফারটি শেষ হতে বাকি:'}
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-amber-300 font-bangla">
                          {lp.countdownSubtitle || 'অফার শেষ হলে পূর্বের মূল্যে ফিরে যাবে'}
                        </p>
                      </div>
                    </div>

                    {/* Ticking Digits */}
                    <div className="flex items-center gap-1.5 font-mono">
                      <div className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 min-w-[50px] text-center shadow-md">
                        <span className="text-lg sm:text-xl font-black text-amber-400">
                          {String(timeLeft.hours).padStart(2, '0')}
                        </span>
                        <p className="text-[8px] text-slate-400 font-sans uppercase font-bold">ঘণ্টা</p>
                      </div>
                      <span className="text-base font-bold text-amber-400">:</span>
                      <div className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 min-w-[50px] text-center shadow-md">
                        <span className="text-lg sm:text-xl font-black text-amber-400">
                          {String(timeLeft.minutes).padStart(2, '0')}
                        </span>
                        <p className="text-[8px] text-slate-400 font-sans uppercase font-bold">মিনিট</p>
                      </div>
                      <span className="text-base font-bold text-amber-400">:</span>
                      <div className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 min-w-[50px] text-center shadow-md">
                        <span className="text-lg sm:text-xl font-black text-amber-400">
                          {String(timeLeft.seconds).padStart(2, '0')}
                        </span>
                        <p className="text-[8px] text-slate-400 font-sans uppercase font-bold">সেকেন্ড</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4 Trust Badges Bento */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 font-bangla">
                  <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200">ক্যাশ অন ডেলিভারি</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 font-bangla">
                  <RotateCcw className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200">৭ দিনের রিপ্লেসমেন্ট</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 font-bangla">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200">১০০% অরিজিনাল পণ্য</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 font-bangla">
                  <Zap className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200">দ্রুততম হোম ডেলিভারি</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PRODUCT OVERVIEW & DETAILED DESCRIPTION (প্রোডাক্ট পরিচিতি ও বিস্তারিত ওভারভিউ) */}
        {lp.showProductOverview !== false && (
          <section className="bg-slate-900/90 rounded-3xl sm:rounded-[36px] p-5 sm:p-8 lg:p-10 border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-sm space-y-6 sm:space-y-8 font-bangla">
            {/* Subtle Ambient Glow */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Section Header */}
            <div className="text-center space-y-3 max-w-2xl mx-auto relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30 shadow-inner">
                <FileText className="w-3.5 h-3.5" />
                <span>{lp.descriptionSectionSubtitle || 'প্রোডাক্ট পরিচিতি ও ওভারভিউ'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
                {lp.descriptionSectionTitle || 'প্রোডাক্টের বিস্তারিত বিবরণ ও গুরুত্বপূর্ণ তথ্য'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                অর্ডার কনফার্ম করার পূর্বে প্রোডাক্টের সাইজ, মেটেরিয়াল এবং প্রয়োজনীয় ফিচারগুলো বিস্তারিত দেখে নিন
              </p>
            </div>

            {/* Main Content Layout */}
            <div className="relative z-10 space-y-6">
              {/* Formatted Description Card */}
              {(() => {
                const descText = (lp.customDescription || product.description || product.shortDescription || '').trim();
                if (!descText) return null;

                const lines = descText.split('\n').map((l) => l.trim()).filter(Boolean);

                return (
                  <div className="bg-slate-950/80 rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-slate-800/90 shadow-inner space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 text-white font-bold text-sm sm:text-base">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>বিস্তারিত বৈশিষ্ট্য ও গুণাগুণ</span>
                    </div>

                    <div className="space-y-3 pt-1">
                      {lines.map((line, idx) => {
                        // Section heading detection (starts with emojis or contains title indicator)
                        const isHeading =
                          line.startsWith('📌') ||
                          line.startsWith('📏') ||
                          line.startsWith('✨') ||
                          line.startsWith('⚡') ||
                          line.startsWith('📦') ||
                          line.startsWith('🏷️') ||
                          line.startsWith('◆') ||
                          line.startsWith('★') ||
                          (line.includes(':') && line.length < 35 && !line.startsWith('•') && !line.startsWith('-'));

                        // Bullet point detection
                        const isBullet =
                          line.startsWith('•') ||
                          line.startsWith('-') ||
                          line.startsWith('*') ||
                          line.startsWith('✔') ||
                          line.startsWith('✓') ||
                          line.startsWith('▶') ||
                          /^\d+\./.test(line);

                        if (isHeading) {
                          return (
                            <div
                              key={idx}
                              className="mt-4 first:mt-0 pt-2 pb-1 text-emerald-300 font-bold text-xs sm:text-sm flex items-center gap-2 tracking-wide"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span>{line.replace(/^[📌📏✨⚡📦🏷️◆★]\s*/, '')}</span>
                            </div>
                          );
                        }

                        if (isBullet) {
                          const cleanBullet = line.replace(/^[•\-\*✔✓▶]|\d+\.\s*/, '').trim();
                          return (
                            <div
                              key={idx}
                              className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/30 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed">
                                {cleanBullet}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <p
                            key={idx}
                            className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium"
                          >
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Bento Grid: Specifications & Product Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {product.brand && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 text-center space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      ব্র্যান্ড
                    </span>
                    <strong className="text-xs sm:text-sm font-bold text-white block truncate">
                      {product.brand}
                    </strong>
                  </div>
                )}

                {product.sku && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 text-center space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      প্রোডাক্ট কোড
                    </span>
                    <strong className="text-xs sm:text-sm font-bold text-emerald-400 font-mono block truncate">
                      {product.sku}
                    </strong>
                  </div>
                )}

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 text-center space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    স্টক স্ট্যাটাস
                  </span>
                  <strong className="text-xs sm:text-sm font-bold text-emerald-400 block truncate">
                    {product.stock > 0 ? 'রেডি ইন স্টক' : 'লিমিটেড অফার'}
                  </strong>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 text-center space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    নিশ্চয়তা
                  </span>
                  <strong className="text-xs sm:text-sm font-bold text-amber-300 block truncate">
                    {product.warranty || '১০০% অরিজিনাল'}
                  </strong>
                </div>
              </div>

              {/* 3 Pillars of Trust Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-bold text-white">প্যাকেজে যা যা পাচ্ছেন</h4>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      ইনট্যাক্ট প্যাকেটজাত ১০০% অরিজিনাল পণ্য ও নিরাপদ বক্স প্যাকিং।
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/25">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-bold text-white">কোয়ালিটি গ্যারান্টি</h4>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      ডেলিভারির পূর্বে মান যাচাইকৃত এবং কোনো ত্রুটি থাকলে সহজ রিপ্লেসমেন্ট।
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-bold text-white">হোম ডেলিভারি সুবিধা</h4>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      কুরিয়ার ম্যানের সামনে চেক করে দেখে নিশ্চিত হয়ে মূল্য পরিশোধ করুন।
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct 1-Click Order Button inside Overview */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={scrollToCheckout}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer ${theme.btnGradient}`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>পছন্দ হয়েছে? এখনই ক্যাশ অন ডেলিভারিতে অর্ডার করুন</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* EMBEDDED UNBOXING / REVIEW VIDEO (If Available) */}
        {landingVideoUrl && (
          <div
            className={`bg-slate-900 rounded-3xl p-4 sm:p-7 border border-slate-800 shadow-2xl space-y-4 text-center mx-auto transition-all ${
              activeVideoRatio === '9:16'
                ? 'max-w-[380px] sm:max-w-[420px] w-full'
                : activeVideoRatio === '1:1'
                ? 'max-w-xl w-full'
                : activeVideoRatio === '4:3'
                ? 'max-w-3xl w-full'
                : 'max-w-4xl w-full'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 font-bangla">
              <Play className="w-3.5 h-3.5 fill-indigo-300" />
              <span>{lp.videoSubtitle || 'প্রোডাক্ট লাইভ ভিডিও ও আনবক্সিং'}</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-white font-bangla">
              {lp.videoTitle || 'প্রোডাক্টটির আসল কোয়ালিটি ও আনবক্সিং ভিডিও দেখে নিন'}
            </h3>

            <div
              className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-xl mx-auto flex items-center justify-center ${
                activeVideoRatio === '9:16'
                  ? 'aspect-[9/16]'
                  : activeVideoRatio === '1:1'
                  ? 'aspect-square'
                  : activeVideoRatio === '4:3'
                  ? 'aspect-[4/3]'
                  : 'aspect-video'
              }`}
            >
              <ProductVideoPlayer
                videoUrl={landingVideoUrl}
                title={lp.videoTitle || product.name}
                aspectRatio={activeVideoRatio}
                onRatioDetected={(r) => setDetectedLpRatio(r)}
                autoPlay={false}
                loop={true}
                className="w-full h-full"
              />
            </div>
          </div>
        )}

        {/* PRODUCT HIGHLIGHTS & FEATURES SECTION */}
        {lp.showFeatures !== false &&
          ((lp.features && lp.features.length > 0) ||
            (product.keyHighlights && product.keyHighlights.length > 0)) && (
          <div className="space-y-6">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 font-bangla">
                {lp.featuresSectionSubtitle || 'কেন এটি আপনার জন্য সেরা?'}
              </span>
              <h3 className="text-xl sm:text-3xl font-black text-white font-bangla">
                {lp.featuresSectionTitle || 'প্রোডাক্টের বিশেষ ফিচার ও আকর্ষণীয় সুবিধাসমূহ'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(lp.features && lp.features.length > 0
                ? lp.features
                : (product.keyHighlights || []).map((kh, idx) => ({
                    id: `kh-${idx}`,
                    title: kh.text,
                    desc: 'প্রিমিয়াম কোয়ালিটি উপাদান ও নির্ভরযোগ্য পারফরম্যান্স।',
                    icon: 'check-circle',
                  }))
              ).map((feature, fIdx) => (
                <div
                  key={feature.id || fIdx}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800/90 hover:border-slate-700 shadow-xl transition-all space-y-3"
                >
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-black text-white leading-snug font-bangla">{feature.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-bangla">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WHY CHOOSE US CHECKLIST */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-bangla">
              {lp.whyUsSectionSubtitle || 'নিরাপদ অনলাইন শপিং'}
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-white font-bangla">
              {lp.whyUsSectionTitle || 'কেন আমাদের থেকেই অর্ডার করবেন?'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-3xl mx-auto">
            {(lp.whyChooseUs || [
              '১০০% অরিজিনাল ও ইনস্পেক্টেড কোয়ালিটি পণ্য',
              'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা (পণ্য দেখে পেমেন্ট)',
              'দ্রুততম সময়ে হোম ডেলিভারি সার্ভিস',
              '৭ দিনের সহজ রিপ্লেসমেন্ট ও রিটার্ন গ্যারান্টি',
              'সার্বক্ষণিক কাস্টমার সাপোর্ট ও আন্তরিক বিক্রয়োত্তর সেবা',
            ]).map((point, pIdx) => (
              <div
                key={pIdx}
                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3.5 shadow-sm font-bangla"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-200">{point}</span>
              </div>
            ))}
          </div>

          {lp.guaranteeText && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center max-w-2xl mx-auto font-bangla">
              <p className="text-xs font-bold text-amber-300">{lp.guaranteeText}</p>
            </div>
          )}
        </div>

        {/* CUSTOMER REVIEWS & SOCIAL PROOF */}
        {lp.customReviews && lp.customReviews.length > 0 && (
          <div className="space-y-6">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-bangla">
                {lp.reviewsSectionSubtitle || 'কাস্টমারদের মতামত'}
              </span>
              <h3 className="text-xl sm:text-3xl font-black text-white font-bangla">
                {lp.reviewsSectionTitle || 'আমাদের সম্মানিত ক্রেতাদের অভিজ্ঞতা'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lp.customReviews.map((rev, rIdx) => (
                <div
                  key={rev.id || rIdx}
                  className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(rev.rating || 5)].map((_, s) => (
                        <Star key={s} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium font-bangla">
                      "{rev.comment}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 font-bangla">
                      {rev.name?.slice(0, 1) || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-white truncate font-bangla">{rev.name}</h5>
                      <p className="text-[10px] text-slate-400 truncate font-bangla">
                        {rev.location || 'ভেরিফাইড ক্রেতা'} • {rev.date || 'সম্প্রতি'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ----------------- 1-CLICK INSTANT ORDER CHECKOUT FORM ----------------- */}
        <div
          ref={orderFormRef}
          id="checkout-form"
          className="bg-slate-900 rounded-3xl sm:rounded-[40px] border-2 border-emerald-500/40 p-5 sm:p-10 shadow-2xl space-y-8 scroll-mt-24 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Form Header */}
          <div className="text-center space-y-2.5 max-w-2xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black font-bangla">
              <ShoppingBag className="w-4 h-4" />
              <span>{lp.orderFormBadgeText || '১০০% ক্যাশ অন ডেলিভারি'}</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white font-bangla">
              {lp.customOrderTitle || 'অর্ডার করতে নিচের ফর্মটি সঠিক তথ্য দিয়ে পূরণ করুন'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium font-bangla">
              {lp.customOrderSubtitle ||
                'পণ্য হাতে পেয়ে দেখে ডেলিভারি ম্যানের কাছে পেমেন্ট করার ১০০% নিশ্চয়তা'}
            </p>
          </div>

          {orderSuccess ? (
            <div className="p-8 bg-emerald-500/10 rounded-3xl border border-emerald-500/30 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-xl font-black text-white font-bangla">
                {lp.orderSuccessTitle || 'আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-bangla">
                {lp.orderSuccessSubtitle ||
                  'আমাদের প্রতিনিধি শীঘ্রই আপনার সাথে ফোনে যোগাযোগ করে অর্ডার কনফার্ম করবেন এবং দ্রুত পার্সেল পাঠানো হবে।'}
              </p>
              <button
                onClick={() => {
                  setOrderSuccess(false);
                  if (onBackToStore) onBackToStore();
                }}
                className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-bangla"
              >
                আরো শপিং করুন
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitOrder} className="max-w-2xl mx-auto space-y-6 relative z-10">
              {formError && (
                <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2.5 animate-shake font-bangla">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Step 1: Variant, Color, Size & Quantity (Prominently styled) */}
              <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-950 border-2 border-slate-800 space-y-4 sm:space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-800/80 gap-1.5 sm:gap-2">
                  <h4 className="text-xs sm:text-base font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2 font-bangla">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] sm:text-xs font-black border border-emerald-500/30">১</span>
                    <span>{lp.step1Title || 'কালার, সাইজ ও অর্ডারের পরিমাণ সিলেক্ট করুন'}</span>
                  </h4>
                  <div className="text-[11px] sm:text-sm font-bold text-slate-300 font-bangla">
                    মোট প্রডাক্ট মূল্য: <span className="text-emerald-400 font-black text-xs sm:text-base font-mono">৳{(currentPrice * quantity).toLocaleString()}</span>
                  </div>
                </div>

                {/* Product Summary Header in Form */}
                <div className="flex items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-slate-950 p-1 border border-slate-700/80 shrink-0 flex items-center justify-center overflow-hidden">
                    <img
                      src={getOptimizedImageUrl(activeImage, 120)}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-base font-black text-white line-clamp-1 font-bangla">{product.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                      <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                        ৳{currentPrice.toLocaleString()}
                      </span>
                      {selectedColor && (
                        <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bangla">
                          কালার: {selectedColor.name}
                        </span>
                      )}
                      {selectedVariant && (
                        <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bangla">
                          সাইজ: {selectedVariant}
                        </span>
                      )}
                      <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bangla">
                        পরিমাণ: {quantity} টি
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1. BIG PROMINENT COLOR SELECTION */}
                {availableColors && availableColors.length > 0 && (
                  <div className="space-y-2 sm:space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs sm:text-base font-black text-white font-bangla flex items-center gap-1.5 sm:gap-2">
                        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                        <span>আপনার পছন্দের কালারটি সিলেক্ট করুন:</span>
                      </label>
                      {selectedColor && (
                        <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bangla">
                          সিলেক্টেড: {selectedColor.name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                      {availableColors.map((color, cIdx) => {
                        const isSelected = selectedColor?.name === color.name;
                        const colorCode = color.colorCode || color.hexCode;
                        const colorImg = color.imageUrl || (color as any).image;

                        return (
                          <button
                            key={(color as any).id || color.name || cIdx}
                            type="button"
                            onClick={() => {
                              setSelectedColor(color);
                              if (colorImg) {
                                const foundIdx = galleryImages.findIndex((img) => img === colorImg);
                                if (foundIdx !== -1) setSelectedImageIndex(foundIdx);
                              }
                            }}
                            className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 text-left cursor-pointer transition-all flex items-center justify-between gap-2.5 sm:gap-3 group relative ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/20 ring-2 ring-emerald-500/40 text-white shadow-lg shadow-emerald-500/10 scale-[1.01]'
                                : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:bg-slate-800/90'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                              {colorImg ? (
                                <img
                                  src={getOptimizedImageUrl(colorImg, 100)}
                                  alt=""
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-contain bg-slate-950 border border-slate-700 shrink-0 p-0.5"
                                />
                              ) : colorCode ? (
                                <div
                                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border-2 border-white/40 shadow-sm shrink-0 flex items-center justify-center"
                                  style={{ backgroundColor: colorCode }}
                                >
                                  {isSelected && (
                                    <Check
                                      className={`w-4 h-4 sm:w-5 sm:h-5 drop-shadow stroke-[3] ${
                                        isLightColor(colorCode) ? 'text-slate-900' : 'text-white'
                                      }`}
                                    />
                                  )}
                                </div>
                              ) : null}
                              <div className="min-w-0">
                                <p className="text-xs sm:text-base font-black font-bangla text-white truncate">
                                  {color.name}
                                </p>
                                <p className="text-[10px] sm:text-xs text-slate-400 font-bangla mt-0.5">
                                  {color.name} কালার
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0">
                              <div
                                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'border-2 border-slate-700 bg-slate-950 text-transparent'
                                }`}
                              >
                                <Check className={`w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3] transition-transform ${isSelected ? 'scale-100' : 'scale-0'}`} />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. BIG PROMINENT SIZE SELECTION */}
                {availableSizes && availableSizes.length > 0 && (
                  <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-3 border-t border-slate-900">
                    <div className="flex items-center justify-between">
                      <label className="text-xs sm:text-base font-black text-white font-bangla flex items-center gap-1.5 sm:gap-2">
                        <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
                        <span>আপনার সাইজটি সিলেক্ট করুন:</span>
                      </label>
                      {selectedVariant && (
                        <span className="text-[10px] sm:text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full font-bangla">
                          সিলেক্টেড: {selectedVariant}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                      {availableSizes.map((opt, oIdx) => {
                        const isSelected = selectedVariant === opt;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => setSelectedVariant(opt)}
                            className={`py-2.5 sm:py-3.5 px-2 sm:px-4 rounded-xl sm:rounded-2xl border-2 text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 sm:gap-2 font-black ${
                              isSelected
                                ? 'border-sky-500 bg-sky-500/20 text-white ring-2 ring-sky-500/50 shadow-lg shadow-sky-500/10 scale-[1.02]'
                                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white hover:bg-slate-850'
                            }`}
                          >
                            <span className="text-xs sm:text-lg">{opt}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. BIG PROMINENT QUANTITY SELECTION */}
                <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-3 border-t border-slate-900">
                  <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div>
                      <label className="text-xs sm:text-base font-black text-white font-bangla flex items-center gap-1.5 sm:gap-2">
                        <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                        <span>অর্ডারের পরিমাণ (Quantity) সিলেক্ট করুন:</span>
                      </label>
                      <p className="text-[11px] sm:text-xs text-slate-400 font-bangla mt-0.5 sm:mt-1">
                        প্রতিটির মূল্য ৳{currentPrice.toLocaleString()} • সর্বমোট: <span className="font-black text-emerald-400 text-xs sm:text-base font-mono">৳{(currentPrice * quantity).toLocaleString()}</span>
                      </p>
                    </div>

                    {/* Stepper with Large Clickable Buttons */}
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <div className="flex items-center bg-slate-950 border-2 border-slate-700 rounded-xl sm:rounded-2xl overflow-hidden shadow-inner">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center text-white font-black hover:bg-slate-800 active:scale-90 transition-all cursor-pointer text-base sm:text-xl select-none"
                          title="কমান"
                        >
                          -
                        </button>
                        <span className="w-10 sm:w-16 text-center text-sm sm:text-lg font-black text-white select-none font-mono">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => q + 1)}
                          className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center text-white font-black hover:bg-slate-800 active:scale-90 transition-all cursor-pointer text-base sm:text-xl select-none"
                          title="বাড়ান"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Delivery Zone */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 sm:space-y-3">
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-indigo-400 font-bangla">
                  {lp.step2Title || '২. আপনার ডেলিভারি এরিয়া সিলেক্ট করুন'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <label
                    onClick={() => setDeliveryArea('inside_dhaka')}
                    className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      deliveryArea === 'inside_dhaka'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-md'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <div
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center ${
                          deliveryArea === 'inside_dhaka'
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-600'
                        }`}
                      >
                        {deliveryArea === 'inside_dhaka' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-bold font-bangla">
                        {lp.insideDhakaLabel || 'ঢাকার ভেতরে'}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-black text-emerald-400 font-bangla">
                      {insideDhakaCharge === 0 ? 'ফ্রি ডেলিভারি' : `৳${insideDhakaCharge}`}
                    </span>
                  </label>

                  <label
                    onClick={() => setDeliveryArea('outside_dhaka')}
                    className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      deliveryArea === 'outside_dhaka'
                        ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-md'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <div
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center ${
                          deliveryArea === 'outside_dhaka'
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-600'
                        }`}
                      >
                        {deliveryArea === 'outside_dhaka' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                        )}
                      </div>
                      <span className="text-xs sm:text-sm font-bold font-bangla">
                        {lp.outsideDhakaLabel || 'ঢাকার বাইরে'}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-black text-emerald-400 font-bangla">
                      {outsideDhakaCharge === 0 ? 'ফ্রি ডেলিভারি' : `৳${outsideDhakaCharge}`}
                    </span>
                  </label>
                </div>
              </div>

              {/* Step 3: Customer Information */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 sm:space-y-4">
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-indigo-400 font-bangla">
                  {lp.step3Title || '৩. আপনার নাম ও ঠিকানা লিখুন'}
                </h4>

                <div className="space-y-2.5 sm:space-y-3.5">
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-bangla">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lp.nameInputLabel || 'আপনার নাম *'}</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={lp.nameInputPlaceholder || 'আপনার পুরো নাম লিখুন'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-500 font-bangla"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-bangla">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lp.phoneInputLabel || 'মোবাইল নাম্বার *'}</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(cleanBDPhoneNumber(e.target.value))}
                      placeholder={lp.phoneInputPlaceholder || '01XXXXXXXXX (১১ সংখ্যার মোবাইল নম্বর দিন)'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-bangla">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lp.addressInputLabel || 'সম্পূর্ণ ডেলিভারি ঠিকানা *'}</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder={lp.addressInputPlaceholder || 'বাসা/রোড নাম্বার, গ্রাম/মহল্লা, থানা ও জেলার নাম লিখুন...'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 sm:p-3.5 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-500 leading-relaxed font-bangla"
                    />
                  </div>

                  {lp.noteInputLabel && (
                    <div className="space-y-1 sm:space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-bangla">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lp.noteInputLabel}</span>
                      </label>
                      <input
                        type="text"
                        value={customerNote}
                        onChange={(e) => setCustomerNote(e.target.value)}
                        placeholder={lp.noteInputPlaceholder || 'ডেলিভারি সংক্রান্ত কোনো বিশেষ নির্দেশনা থাকলে লিখুন...'}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-500 font-bangla"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-bangla">
                <div className="flex justify-between text-slate-400">
                  <span>প্রোডাক্ট সাব-টোটাল ({quantity} টি):</span>
                  <span className="font-bold text-white">৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>ডেলিভারি চার্জ ({deliveryArea === 'inside_dhaka' ? (lp.insideDhakaLabel || 'ঢাকার ভেতরে') : (lp.outsideDhakaLabel || 'ঢাকার বাইরে')}):</span>
                  <span className="font-bold text-emerald-400">
                    {currentDeliveryCharge === 0 ? 'ফ্রি' : `৳${currentDeliveryCharge}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                  <span>সর্বমোট প্রদেয় মূল্য:</span>
                  <span className="text-emerald-400">৳{totalPayable.toLocaleString()}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmittingOrder}
                className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-2xl cursor-pointer font-bangla ${
                  isSubmittingOrder ? 'opacity-70 cursor-wait' : ''
                } ${theme.btnGradient}`}
              >
                <Lock className="w-5 h-5" />
                <span>
                  {isSubmittingOrder
                    ? 'অর্ডার প্রসেসিং হচ্ছে...'
                    : (lp.customButtonText && !lp.customButtonText.includes('ক্যাশ অন ডেলিভারিতে')
                        ? lp.customButtonText
                        : 'অর্ডার কনফার্ম করুন')}
                </span>
              </button>

              <p className="text-center text-[11px] text-slate-400 font-bangla">
                {lp.orderSecurityNotice || '🔒 আপনার সকল তথ্য ১০০% সুরক্ষিত এবং ক্যাশ অন ডেলিভারিতে পণ্য হাতে পাওয়ার পর মূল্য পরিশোধ করতে পারবেন।'}
              </p>
            </form>
          )}
        </div>

        {/* SIMILAR PRODUCTS SECTION */}
        {similarProducts.length > 0 && (
          <div className="space-y-6 pt-4">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-400 font-bangla">
                {lp.similarSectionSubtitle || 'সম্পর্কিত পণ্যসমূহ'}
              </span>
              <h3 className="text-xl sm:text-3xl font-black text-white font-bangla">
                {lp.similarSectionTitle || 'সম্পর্কিত অন্যান্য আকর্ষণীয় পণ্যসমূহ'}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {similarProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  className="bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800/80 hover:border-indigo-500/50 p-3 sm:p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between group shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-slate-950 relative">
                      <img
                        src={getOptimizedImageUrl(p.images?.[0] || '', 300)}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {p.discountPercent ? (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black font-bangla">
                          -{p.discountPercent}%
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-indigo-400 transition-colors font-bangla">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-bangla">
                        {p.banglaName || 'প্রিমিয়াম কালেকশন'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-baseline justify-between mt-3 font-bangla">
                    <span className="text-xs sm:text-sm font-black text-emerald-400">
                      ৳{p.price.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md">
                      অর্ডার দেখুন
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MOBILE STICKY FLOATING CTA BAR (Always accessible on small screens) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 p-3 flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-2.5 min-w-0 font-bangla">
          <img
            src={getOptimizedImageUrl(activeImage, 80)}
            alt=""
            className="w-10 h-10 rounded-xl object-cover border border-slate-800 shrink-0"
          />
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block truncate">
              {lp.stickyBarSubtext || 'অফার মূল্য'}
            </span>
            <span className="text-sm font-black text-emerald-400">৳{currentPrice.toLocaleString()}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={scrollToCheckout}
          className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg shrink-0 cursor-pointer animate-pulse font-bangla ${theme.btnGradient}`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{lp.stickyBarButtonText || lp.customButtonText || 'অর্ডার করুন'}</span>
        </button>
      </div>
    </div>
  );
};
