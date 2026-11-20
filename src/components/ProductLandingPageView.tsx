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
  Copy,
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
import { useLanguage } from '../context/LanguageContext';
import { getAttributionForOrder } from '../utils/attribution';
import { trackPixelViewContent, trackPixelInitiateCheckout } from '../utils/pixelTracker';
import { OrderRestrictionModal, RestrictionReason } from './OrderRestrictionModal';
import { generateNextOrderId } from '../lib/firebase';

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
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const lp = (product.landingPage || {}) as LandingPageConfig;
  const themeKey = lp.accentColor || 'emerald';
  const theme = THEME_STYLES[themeKey] || THEME_STYLES.emerald;

  // Track Meta / Google / TikTok ViewContent on Landing Page visit
  useEffect(() => {
    if (product && product.id) {
      try {
        trackPixelViewContent(product, siteSettings);
      } catch {}
    }
  }, [product?.id]);

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

  // Restriction Contact Modal State
  const [restrictionModal, setRestrictionModal] = useState<{
    isOpen: boolean;
    reason: RestrictionReason;
    customMessage?: string;
    customerPhone?: string;
  }>({
    isOpen: false,
    reason: 'blocked_ip',
  });

  // Landing Page Payment Options Configuration
  const isCodAllowed = lp.allowCashOnDelivery !== false && (siteSettings?.lpEnableCod ?? true);
  const isDeliveryAdvanceAllowed = lp.allowDeliveryAdvance === true || (lp.allowDeliveryAdvance !== false && siteSettings?.lpEnableDeliveryAdvance === true);
  const isFullAdvanceAllowed = lp.allowFullAdvance === true || (lp.allowFullAdvance !== false && siteSettings?.lpEnableFullAdvance === true);

  const effectiveCodAllowed = isCodAllowed || (!isDeliveryAdvanceAllowed && !isFullAdvanceAllowed);
  const effectiveDeliveryAllowed = isDeliveryAdvanceAllowed;
  const effectiveFullAllowed = isFullAdvanceAllowed;

  const showPaymentSelection = effectiveDeliveryAllowed || effectiveFullAllowed;

  const [paymentOptionType, setPaymentOptionType] = useState<'cod' | 'delivery_only' | 'full'>('cod');
  const [selectedGateway, setSelectedGateway] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [senderMobile, setSenderMobile] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Auto-switch payment option if current is not allowed
  useEffect(() => {
    if (paymentOptionType === 'cod' && !effectiveCodAllowed) {
      if (effectiveDeliveryAllowed) setPaymentOptionType('delivery_only');
      else if (effectiveFullAllowed) setPaymentOptionType('full');
    } else if (paymentOptionType === 'delivery_only' && !effectiveDeliveryAllowed) {
      if (effectiveCodAllowed) setPaymentOptionType('cod');
      else if (effectiveFullAllowed) setPaymentOptionType('full');
    } else if (paymentOptionType === 'full' && !effectiveFullAllowed) {
      if (effectiveCodAllowed) setPaymentOptionType('cod');
      else if (effectiveDeliveryAllowed) setPaymentOptionType('delivery_only');
    }
  }, [effectiveCodAllowed, effectiveDeliveryAllowed, effectiveFullAllowed, paymentOptionType]);

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
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = customerName.trim();
    const cleanPhone = cleanBDPhoneNumber(customerPhone);
    const cleanAddress = customerAddress.trim();

    if (!cleanName) {
      setFormError(isBn ? 'অনুগ্রহ করে আপনার পুরো নাম লিখুন' : 'Please enter your full name');
      return;
    }

    const phoneValidation = validateBangladeshMobile(cleanPhone, { lang: isBn ? 'bn' : 'en' });
    if (!phoneValidation.isValid) {
      setFormError(phoneValidation.error || (isBn ? 'সঠিক মোবাইল নম্বর দিন।' : 'Please enter a valid 11-digit mobile number.'));
      return;
    }

    if (!cleanAddress || cleanAddress.length < 5) {
      setFormError(isBn ? 'অনুগ্রহ করে আপনার সম্পূর্ণ ডেলিভারি ঠিকানা (বাসা/রোড/এলাকা/থানা/জেলা) লিখুন' : 'Please enter your complete delivery address (House/Road/Area/District)');
      return;
    }

    if (availableColors.length > 0 && !selectedColor) {
      setFormError(isBn ? '⚠️ অনুগ্রহ করে প্রোডাক্টের কালার সিলেক্ট করুন!' : '⚠️ Please select a product color!');
      return;
    }

    if (availableSizes.length > 0 && !selectedVariant) {
      setFormError(isBn ? '⚠️ অনুগ্রহ করে প্রোডাক্টের সাইজ বা ভেরিয়েশন সিলেক্ট করুন!' : '⚠️ Please select a product size or variation!');
      return;
    }

    // Validate Advance Payment details if advance is selected
    if (paymentOptionType !== 'cod') {
      if (!senderMobile || senderMobile.trim().length < 11) {
        setFormError(isBn ? '⚠️ অনুগ্রহ করে পেমেন্ট প্রেরক মোবাইল নম্বর (১১ ডিজিট) প্রদান করুন!' : '⚠️ Please enter the 11-digit sender mobile number!');
        return;
      }
      if (!transactionId || transactionId.trim().length < 4) {
        setFormError(isBn ? '⚠️ অনুগ্রহ করে পেমেন্টের সঠিক Transaction ID (TrxID) লিখুন!' : '⚠️ Please enter the valid Transaction ID (TrxID)!');
        return;
      }
    }

    // Check duplicate order restriction
    const secSettings = siteSettings?.orderSecuritySettings;
    if (secSettings?.duplicateOrderBlock && cleanPhone) {
      const blockMinutes = secSettings.duplicateOrderBlockMinutes || 15;
      const lastPlacedTime = localStorage.getItem(`kenax_last_order_time_${cleanPhone}`);
      if (lastPlacedTime) {
        const elapsedMinutes = (Date.now() - parseInt(lastPlacedTime, 10)) / (1000 * 60);
        if (elapsedMinutes < blockMinutes) {
          setRestrictionModal({
            isOpen: true,
            reason: 'duplicate_order',
            customerPhone: cleanPhone,
            customMessage: `এই নম্বর (${cleanPhone}) থেকে ইতিমধ্যে একটি সাম্প্রতিক অর্ডার করা হয়েছে। দয়া করে নিচে মেসেঞ্জারে, হোয়াটসঅ্যাপে বা টেলিগ্রামে আমাদের প্রতিনিধিকে সরাসরি মেসেজ দিন।`,
          });
          return;
        }
      }
    }

    setIsSubmittingOrder(true);

    // Check IP restriction before placing order
    try {
      const ipCheckRes = await fetch('/api/ip-management/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (ipCheckRes.ok) {
        const ipCheckData = await ipCheckRes.json();
        if (ipCheckData?.isBlocked) {
          setIsSubmittingOrder(false);
          setRestrictionModal({
            isOpen: true,
            reason: 'blocked_ip',
            customMessage: 'আপনার আইপি অ্যাড্রেস থেকে অটোমেটিক অর্ডার করার চেষ্টা সাময়িকভাবে স্থগিত রাখা হয়েছে। অনুগ্রহ করে মেসেঞ্জারে, হোয়াটসঅ্যাপে বা টেলিগ্রামে আমাদের সাথে সরাসরি কথা বলুন।',
          });
          return;
        }
      }
    } catch (e) {}

    const paidAmount =
      paymentOptionType === 'full'
        ? totalPayable
        : paymentOptionType === 'delivery_only'
        ? currentDeliveryCharge
        : 0;

    const dueAmount = Math.max(0, totalPayable - paidAmount);

    let resolvedPaymentMethod = 'Cash on Delivery';
    if (paymentOptionType === 'delivery_only') {
      resolvedPaymentMethod = selectedGateway === 'bkash' ? 'bKash (Delivery Advance)' : selectedGateway === 'nagad' ? 'Nagad (Delivery Advance)' : 'Delivery Charge Only';
    } else if (paymentOptionType === 'full') {
      resolvedPaymentMethod = selectedGateway === 'bkash' ? 'bKash (Full Payment)' : selectedGateway === 'nagad' ? 'Nagad (Full Payment)' : 'Full Advance';
    }

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

    const generatedOrderId = await generateNextOrderId('KB');

    const newOrder: Order = {
      id: generatedOrderId,
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
      paymentMethod: resolvedPaymentMethod as any,
      paymentOptionType: paymentOptionType,
      paymentStatus: paymentOptionType === 'cod' ? 'Pending' : 'Pending',
      status: 'Pending',
      orderStatus: 'Pending',
      senderMobileNumber: paymentOptionType !== 'cod' ? senderMobile.trim() : undefined,
      transactionId: paymentOptionType !== 'cod' ? transactionId.trim() : undefined,
      paidAmount: paidAmount,
      dueAmount: dueAmount,
      advancePaidVerified: false,
      orderDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerNotes: customerNote || undefined,
      source: 'Landing Page',
      orderSource: 'landing_page',
      sourceChannel: 'Landing Page Direct',
      isAiBotOrder: false,
      landingPageSlug: lp.slug || product.slug || product.id,
      attribution: getAttributionForOrder(),
      timeline: [
        {
          status: 'Pending',
          timestamp: new Date().toISOString(),
          note: `Direct 1-Click Order placed from Landing Page [${product.name}] (Payment: ${paymentOptionType === 'cod' ? 'Cash on Delivery' : paymentOptionType === 'delivery_only' ? `Delivery Advance ৳${currentDeliveryCharge}` : `Full Advance ৳${totalPayable}`})`,
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
          {lp.topBannerText || (isBn ? '🔥 ধামাকা অফার! সীমিত সময়ের জন্য বিশেষ ছাড় চলছে' : '🔥 Mega Deal! Limited Time Special Discount Available')}
        </span>
        <span className="hidden md:inline bg-white/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
          {isBn ? 'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি' : 'Cash on Delivery Nationwide'}
        </span>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6 space-y-6 sm:space-y-10">
        {/* TOP CALLOUT HEADLINE */}
        <div className="text-center px-1 max-w-4xl mx-auto overflow-hidden">
          <h1 className="text-base sm:text-2xl md:text-3xl lg:text-4xl font-black text-white font-bangla tracking-tight leading-normal">
            {lp.headline || (isBn ? 'সীমিত সময়ের স্পেশাল অফার! আজই অর্ডার করুন' : 'Limited Time Special Offer! Order Yours Today')}
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
                  {product.category || (isBn ? 'সাধারণ' : 'General')}
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
                  {isBn ? (product.banglaName || product.name) : product.name}
                </h2>
                {isBn && product.banglaName && product.name && product.banglaName !== product.name && (
                  <p className="text-xs sm:text-sm font-semibold text-slate-300 font-bangla">{product.name}</p>
                )}
              </div>

              {/* 2. Offer Pricing Presentation */}
              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-bangla">
                    {lp.priceSectionTitle || (isBn ? 'অফার মূল্য:' : 'Offer Price:')}
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
                      {lp.savingsBadgeText ? `৳${savings.toLocaleString()} ${lp.savingsBadgeText}` : (isBn ? `৳${savings.toLocaleString()} সাশ্রয়!` : `Save ৳${savings.toLocaleString()}!`)}
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
                      : (isBn ? 'অর্ডার কনফার্ম করুন' : 'Confirm Order Now')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs font-semibold text-slate-400 font-bangla">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lp.orderSecurityNotice || (isBn ? 'পণ্য হাতে পেয়ে দেখে ডেলিভারি ম্যানকে মূল্য পরিশোধ করুন' : 'Inspect the parcel and pay the delivery agent in cash upon receipt')}</span>
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
                          {lp.countdownTitle || (isBn ? 'স্পেশাল অফারটি শেষ হতে বাকি:' : 'Special Offer Ends In:')}
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-amber-300 font-bangla">
                          {lp.countdownSubtitle || (isBn ? 'অফার শেষ হলে পূর্বের মূল্যে ফিরে যাবে' : 'Price reverts to original after timer ends')}
                        </p>
                      </div>
                    </div>

                    {/* Ticking Digits */}
                    <div className="flex items-center gap-1.5 font-mono">
                      <div className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 min-w-[50px] text-center shadow-md">
                        <span className="text-lg sm:text-xl font-black text-amber-400">
                          {String(timeLeft.hours).padStart(2, '0')}
                        </span>
                        <p className="text-[8px] text-slate-400 font-sans uppercase font-bold">{isBn ? 'ঘণ্টা' : 'Hours'}</p>
                      </div>
                      <span className="text-base font-bold text-amber-400">:</span>
                      <div className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 min-w-[50px] text-center shadow-md">
                        <span className="text-lg sm:text-xl font-black text-amber-400">
                          {String(timeLeft.minutes).padStart(2, '0')}
                        </span>
                        <p className="text-[8px] text-slate-400 font-sans uppercase font-bold">{isBn ? 'মিনিট' : 'Minutes'}</p>
                      </div>
                      <span className="text-base font-bold text-amber-400">:</span>
                      <div className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 min-w-[50px] text-center shadow-md">
                        <span className="text-lg sm:text-xl font-black text-amber-400">
                          {String(timeLeft.seconds).padStart(2, '0')}
                        </span>
                        <p className="text-[8px] text-slate-400 font-sans uppercase font-bold">{isBn ? 'সেকেন্ড' : 'Seconds'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4 Trust Badges Bento */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 font-bangla">
                  <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200">{isBn ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 font-bangla">
                  <RotateCcw className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200">{isBn ? '৭ দিনের রিপ্লেসমেন্ট' : '7 Days Replacement'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 font-bangla">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200">{isBn ? '১০০% অরিজিনাল পণ্য' : '100% Original Product'}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2.5 font-bangla">
                  <Zap className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200">{isBn ? 'দ্রুততম হোম ডেলিভারি' : 'Express Home Delivery'}</span>
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
                <span>{lp.descriptionSectionSubtitle || (isBn ? 'প্রোডাক্ট পরিচিতি ও ওভারভিউ' : 'Product Overview & Specifications')}</span>
              </div>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight">
                {lp.descriptionSectionTitle || (isBn ? 'প্রোডাক্টের বিস্তারিত বিবরণ ও গুরুত্বপূর্ণ তথ্য' : 'Detailed Product Description & Information')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                {isBn ? 'অর্ডার কনফার্ম করার পূর্বে প্রোডাক্টের সাইজ, মেটেরিয়াল এবং প্রয়োজনীয় ফিচারগুলো বিস্তারিত দেখে নিন' : 'Please review product sizing, materials, and features before confirming your order'}
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
                      <span>{isBn ? 'বিস্তারিত বৈশিষ্ট্য ও গুণাগুণ' : 'Key Specifications & Highlights'}</span>
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
                      {isBn ? 'ব্র্যান্ড' : 'Brand'}
                    </span>
                    <strong className="text-xs sm:text-sm font-bold text-white block truncate">
                      {product.brand}
                    </strong>
                  </div>
                )}

                {product.sku && (
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 text-center space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {isBn ? 'প্রোডাক্ট কোড' : 'SKU / Code'}
                    </span>
                    <strong className="text-xs sm:text-sm font-bold text-emerald-400 font-mono block truncate">
                      {product.sku}
                    </strong>
                  </div>
                )}

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 text-center space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isBn ? 'স্টক স্ট্যাটাস' : 'Stock Status'}
                  </span>
                  <strong className="text-xs sm:text-sm font-bold text-emerald-400 block truncate">
                    {product.stock > 0 ? (isBn ? 'রেডি ইন স্টক' : 'In Stock') : (isBn ? 'লিমিটেড অফার' : 'Limited Stock')}
                  </strong>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 text-center space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {isBn ? 'নিশ্চয়তা' : 'Warranty / Quality'}
                  </span>
                  <strong className="text-xs sm:text-sm font-bold text-amber-300 block truncate">
                    {product.warranty || (isBn ? '১০০% অরিজিনাল' : '100% Genuine')}
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
                    <h4 className="text-xs sm:text-sm font-bold text-white">{isBn ? 'প্যাকেজে যা যা পাচ্ছেন' : 'What You Get in Package'}</h4>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {isBn ? 'ইনট্যাক্ট প্যাকেটজাত ১০০% অরিজিনাল পণ্য ও নিরাপদ বক্স প্যাকিং।' : '100% genuine intact original product in secure packaging.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/25">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-bold text-white">{isBn ? 'কোয়ালিটি গ্যারান্টি' : 'Quality Guarantee'}</h4>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {isBn ? 'ডেলিভারির পূর্বে মান যাচাইকৃত এবং কোনো ত্রুটি থাকলে সহজ রিপ্লেসমেন্ট।' : 'Quality inspected before delivery with hassle-free replacement policy.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs sm:text-sm font-bold text-white">{isBn ? 'হোম ডেলিভারি সুবিধা' : 'Home Delivery Service'}</h4>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {isBn ? 'কুরিয়ার ম্যানের সামনে চেক করে দেখে নিশ্চিত হয়ে মূল্য পরিশোধ করুন।' : 'Inspect package in front of delivery agent and pay in cash.'}
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
                  <span>{isBn ? 'পছন্দ হয়েছে? এখনই ক্যাশ অন ডেলিভারিতে অর্ডার করুন' : 'Like it? Order with Cash on Delivery Now'}</span>
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
              <span>{lp.videoSubtitle || (isBn ? 'প্রোডাক্ট লাইভ ভিডিও ও আনবক্সিং' : 'Live Product Unboxing Video')}</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-white font-bangla">
              {lp.videoTitle || (isBn ? 'প্রোডাক্টটির আসল কোয়ালিটি ও আনবক্সিং ভিডিও দেখে নিন' : 'Watch Product Real Quality & Unboxing Video')}
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
                {lp.featuresSectionSubtitle || (isBn ? 'কেন এটি আপনার জন্য সেরা?' : 'Why Is This The Best Choice?')}
              </span>
              <h3 className="text-xl sm:text-3xl font-black text-white font-bangla">
                {lp.featuresSectionTitle || (isBn ? 'প্রোডাক্টের বিশেষ ফিচার ও আকর্ষণীয় সুবিধাসমূহ' : 'Key Product Features & Highlights')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(lp.features && lp.features.length > 0
                ? lp.features
                : (product.keyHighlights || []).map((kh, idx) => ({
                    id: `kh-${idx}`,
                    title: kh.text,
                    desc: isBn ? 'প্রিমিয়াম কোয়ালিটি উপাদান ও নির্ভরযোগ্য পারফরম্যান্স।' : 'Premium quality materials and reliable performance.',
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
              {lp.whyUsSectionSubtitle || (isBn ? 'নিরাপদ অনলাইন শপিং' : '100% Safe Online Shopping')}
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-white font-bangla">
              {lp.whyUsSectionTitle || (isBn ? 'কেন আমাদের থেকেই অর্ডার করবেন?' : 'Why Choose To Buy From Us?')}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-3xl mx-auto">
            {(lp.whyChooseUs || (isBn ? [
              '১০০% অরিজিনাল ও ইনস্পেক্টেড কোয়ালিটি পণ্য',
              'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা (পণ্য দেখে পেমেন্ট)',
              'দ্রুততম সময়ে হোম ডেলিভারি সার্ভিস',
              '৭ দিনের সহজ রিপ্লেসমেন্ট ও রিটার্ন গ্যারান্টি',
              'সার্বক্ষণিক কাস্টমার সাপোর্ট ও আন্তরিক বিক্রয়োত্তর সেবা',
            ] : [
              '100% original & quality-inspected products',
              'Cash on delivery across all Bangladesh (Inspect before payment)',
              'Super-fast express home delivery service',
              '7-day easy replacement & return guarantee',
              '24/7 friendly customer support and after-sales service',
            ])).map((point, pIdx) => (
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
                {lp.reviewsSectionSubtitle || (isBn ? 'কাস্টমারদের মতামত' : 'Customer Feedback')}
              </span>
              <h3 className="text-xl sm:text-3xl font-black text-white font-bangla">
                {lp.reviewsSectionTitle || (isBn ? 'আমাদের সম্মানিত ক্রেতাদের অভিজ্ঞতা' : 'Verified Customer Reviews')}
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
                        {rev.location || (isBn ? 'ভেরিফাইড ক্রেতা' : 'Verified Buyer')} • {rev.date || (isBn ? 'সম্প্রতি' : 'Recent')}
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
              <span>{lp.orderFormBadgeText || (isBn ? '১০০% ক্যাশ অন ডেলিভারি' : '100% Cash on Delivery')}</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white font-bangla">
              {lp.customOrderTitle || (isBn ? 'অর্ডার করতে নিচের ফর্মটি সঠিক তথ্য দিয়ে পূরণ করুন' : 'Fill Out the Form Below with Accurate Information')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium font-bangla">
              {lp.customOrderSubtitle ||
                (isBn ? 'পণ্য হাতে পেয়ে দেখে ডেলিভারি ম্যানের কাছে পেমেন্ট করার ১০০% নিশ্চয়তা' : 'Inspect package in front of courier before paying • 100% Guaranteed')}
            </p>
          </div>

          {orderSuccess ? (
            <div className="p-8 bg-emerald-500/10 rounded-3xl border border-emerald-500/30 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="text-xl font-black text-white font-bangla">
                {lp.orderSuccessTitle || (isBn ? 'আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!' : 'Your Order Has Been Placed Successfully!')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-bangla">
                {lp.orderSuccessSubtitle ||
                  (isBn ? 'আমাদের প্রতিনিধি শীঘ্রই আপনার সাথে ফোনে যোগাযোগ করে অর্ডার কনফার্ম করবেন এবং দ্রুত পার্সেল পাঠানো হবে।' : 'Our representative will call you shortly to confirm and dispatch your parcel quickly.')}
              </p>
              <button
                onClick={() => {
                  setOrderSuccess(false);
                  if (onBackToStore) onBackToStore();
                }}
                className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer font-bangla"
              >
                {isBn ? 'আরো শপিং করুন' : 'Continue Shopping'}
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
                    <span>{lp.step1Title || (isBn ? 'কালার, সাইজ ও অর্ডারের পরিমাণ সিলেক্ট করুন' : 'Select Color, Size & Quantity')}</span>
                  </h4>
                  <div className="text-[11px] sm:text-sm font-bold text-slate-300 font-bangla">
                    {isBn ? 'মোট প্রডাক্ট মূল্য: ' : 'Product Total: '}<span className="text-emerald-400 font-black text-xs sm:text-base font-mono">৳{(currentPrice * quantity).toLocaleString()}</span>
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
                    <p className="text-xs sm:text-base font-black text-white line-clamp-1 font-bangla">{isBn ? (product.banglaName || product.name) : product.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                      <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                        ৳{currentPrice.toLocaleString()}
                      </span>
                      {selectedColor && (
                        <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bangla">
                          {isBn ? 'কালার: ' : 'Color: '}{selectedColor.name}
                        </span>
                      )}
                      {selectedVariant && (
                        <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bangla">
                          {isBn ? 'সাইজ: ' : 'Size: '}{selectedVariant}
                        </span>
                      )}
                      <span className="text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bangla">
                        {isBn ? `পরিমাণ: ${quantity} টি` : `Qty: ${quantity}`}
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
                        <span>{isBn ? 'আপনার পছন্দের কালারটি সিলেক্ট করুন:' : 'Select Your Preferred Color:'}</span>
                      </label>
                      {selectedColor && (
                        <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bangla">
                          {isBn ? `সিলেক্টেড: ${selectedColor.name}` : `Selected: ${selectedColor.name}`}
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
                                  {color.name} {isBn ? 'কালার' : 'Color'}
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
                        <span>{isBn ? 'আপনার সাইজটি সিলেক্ট করুন:' : 'Select Your Size:'}</span>
                      </label>
                      {selectedVariant && (
                        <span className="text-[10px] sm:text-xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full font-bangla">
                          {isBn ? `সিলেক্টেড: ${selectedVariant}` : `Selected: ${selectedVariant}`}
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
                        <span>{isBn ? 'অর্ডারের পরিমাণ (Quantity) সিলেক্ট করুন:' : 'Select Quantity:'}</span>
                      </label>
                      <p className="text-[11px] sm:text-xs text-slate-400 font-bangla mt-0.5 sm:mt-1">
                        {isBn ? `প্রতিটির মূল্য ৳${currentPrice.toLocaleString()} • সর্বমোট: ` : `Unit price ৳${currentPrice.toLocaleString()} • Subtotal: `}<span className="font-black text-emerald-400 text-xs sm:text-base font-mono">৳{(currentPrice * quantity).toLocaleString()}</span>
                      </p>
                    </div>

                    {/* Stepper with Large Clickable Buttons */}
                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <div className="flex items-center bg-slate-950 border-2 border-slate-700 rounded-xl sm:rounded-2xl overflow-hidden shadow-inner">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center text-white font-black hover:bg-slate-800 active:scale-90 transition-all cursor-pointer text-base sm:text-xl select-none"
                          title={isBn ? 'কমান' : 'Decrease'}
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
                          title={isBn ? 'বাড়ান' : 'Increase'}
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
                  {lp.step2Title || (isBn ? '২. আপনার ডেলিভারি এরিয়া সিলেক্ট করুন' : '2. Select Your Delivery Area')}
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
                        {lp.insideDhakaLabel || (isBn ? 'ঢাকার ভেতরে' : 'Inside Dhaka')}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-black text-emerald-400 font-bangla">
                      {insideDhakaCharge === 0 ? (isBn ? 'ফ্রি ডেলিভারি' : 'Free Delivery') : `৳${insideDhakaCharge}`}
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
                        {lp.outsideDhakaLabel || (isBn ? 'ঢাকার বাইরে' : 'Outside Dhaka')}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-black text-emerald-400 font-bangla">
                      {outsideDhakaCharge === 0 ? (isBn ? 'ফ্রি ডেলিভারি' : 'Free Delivery') : `৳${outsideDhakaCharge}`}
                    </span>
                  </label>
                </div>
              </div>

              {/* Step 3: Customer Information */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 sm:space-y-4">
                <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-indigo-400 font-bangla">
                  {lp.step3Title || (isBn ? '৩. আপনার নাম ও ঠিকানা লিখুন' : '3. Enter Your Name & Address')}
                </h4>

                <div className="space-y-2.5 sm:space-y-3.5">
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-bangla">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lp.nameInputLabel || (isBn ? 'আপনার নাম *' : 'Your Full Name *')}</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={lp.nameInputPlaceholder || (isBn ? 'আপনার পুরো নাম লিখুন' : 'Enter your full name')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-500 font-bangla"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-bangla">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lp.phoneInputLabel || (isBn ? 'মোবাইল নাম্বার *' : 'Mobile Number *')}</span>
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(cleanBDPhoneNumber(e.target.value))}
                      placeholder={lp.phoneInputPlaceholder || (isBn ? '01XXXXXXXXX (১১ সংখ্যার মোবাইল নম্বর দিন)' : '01XXXXXXXXX (11-digit mobile number)')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-bangla">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lp.addressInputLabel || (isBn ? 'সম্পূর্ণ ডেলিভারি ঠিকানা *' : 'Full Delivery Address *')}</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder={lp.addressInputPlaceholder || (isBn ? 'বাসা/রোড নাম্বার, গ্রাম/মহল্লা, থানা ও জেলার নাম লিখুন...' : 'House/Road no, Area/Village, Thana & District...')}
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
                        placeholder={lp.noteInputPlaceholder || (isBn ? 'ডেলিভারি সংক্রান্ত কোনো বিশেষ নির্দেশনা থাকলে লিখুন...' : 'Any special delivery instructions...')}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-500 font-bangla"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Payment Options (Only when Delivery Advance or Full Advance is enabled) */}
              {showPaymentSelection ? (
                <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-indigo-400 font-bangla flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{isBn ? '৪. পেমেন্ট মেথড সিলেক্ট করুন' : '4. Select Payment Method'}</span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                    {effectiveCodAllowed && (
                      <button
                        type="button"
                        onClick={() => setPaymentOptionType('cod')}
                        className={`p-3 rounded-xl sm:rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          paymentOptionType === 'cod'
                            ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                            : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white font-bangla">{isBn ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery'}</span>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentOptionType === 'cod' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}>
                            {paymentOptionType === 'cod' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </div>
                        </div>
                        <p className="text-[10.5px] text-slate-400 font-bangla">{isBn ? 'পণ্য হাতে পেয়ে সম্পূর্ণ মূল্য পরিশোধ করুন' : 'Pay full amount in cash upon parcel receipt'}</p>
                        <span className="text-xs font-black text-emerald-400 font-mono">{isBn ? '৳০ অগ্রিম' : '৳0 Advance'}</span>
                      </button>
                    )}

                    {effectiveDeliveryAllowed && (
                      <button
                        type="button"
                        onClick={() => setPaymentOptionType('delivery_only')}
                        className={`p-3 rounded-xl sm:rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          paymentOptionType === 'delivery_only'
                            ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                            : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white font-bangla">{isBn ? 'ডেলিভারি চার্জ অগ্রিম' : 'Delivery Charge Advance'}</span>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentOptionType === 'delivery_only' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'}`}>
                            {paymentOptionType === 'delivery_only' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </div>
                        </div>
                        <p className="text-[10.5px] text-slate-400 font-bangla">{isBn ? `বাকি ৳${subtotal.toLocaleString()} পণ্য পেয়ে দিবেন` : `Pay remaining ৳${subtotal.toLocaleString()} upon delivery`}</p>
                        <span className="text-xs font-black text-indigo-400 font-mono">৳{currentDeliveryCharge} {isBn ? 'অগ্রিম' : 'Advance'}</span>
                      </button>
                    )}

                    {effectiveFullAllowed && (
                      <button
                        type="button"
                        onClick={() => setPaymentOptionType('full')}
                        className={`p-3 rounded-xl sm:rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          paymentOptionType === 'full'
                            ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30'
                            : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white font-bangla">{isBn ? 'ফুল পেমেন্ট অগ্রিম' : 'Full Advance Payment'}</span>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentOptionType === 'full' ? 'border-amber-500 bg-amber-500' : 'border-slate-600'}`}>
                            {paymentOptionType === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </div>
                        </div>
                        <p className="text-[10.5px] text-slate-400 font-bangla">{isBn ? 'সম্পূর্ণ অর্ডার মূল্য অগ্রিম পরিশোধ' : 'Pay total order amount in advance'}</p>
                        <span className="text-xs font-black text-amber-400 font-mono">৳{totalPayable.toLocaleString()} {isBn ? 'পরিশোধ' : 'Paid'}</span>
                      </button>
                    )}
                  </div>

                  {/* Advance Payment Details Input Card */}
                  {paymentOptionType !== 'cod' && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-slate-300 font-bangla">{isBn ? 'অগ্রিম প্রদেয় পরিমাণ:' : 'Advance Payable Amount:'}</span>
                        <span className="font-black text-emerald-400 font-mono text-sm">
                          ৳{paymentOptionType === 'full' ? totalPayable.toLocaleString() : currentDeliveryCharge.toLocaleString()}
                        </span>
                      </div>

                      {/* Gateway Tabs */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 font-bangla">{isBn ? 'পেমেন্ট গেটওয়ে নির্বাচন করুন:' : 'Select Payment Gateway:'}</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedGateway('bkash')}
                            className={`flex-1 py-2 px-3 rounded-lg border text-center font-bold text-xs cursor-pointer transition-all ${
                              selectedGateway === 'bkash'
                                ? 'bg-pink-600 text-white border-pink-500 shadow-sm'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            bKash (বিকাশ)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedGateway('nagad')}
                            className={`flex-1 py-2 px-3 rounded-lg border text-center font-bold text-xs cursor-pointer transition-all ${
                              selectedGateway === 'nagad'
                                ? 'bg-orange-600 text-white border-orange-500 shadow-sm'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            Nagad (নগদ)
                          </button>
                        </div>
                      </div>

                      {/* Payment Number & Copy Button */}
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">
                            {selectedGateway === 'bkash' ? 'bKash Personal / Merchant' : 'Nagad Personal / Merchant'} Number:
                          </span>
                          <span className="font-mono font-bold text-white text-xs sm:text-sm tracking-wide">
                            {selectedGateway === 'bkash'
                              ? (siteSettings?.bkashNumber || '01700000000')
                              : (siteSettings?.nagadNumber || '01800000000')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const num = selectedGateway === 'bkash'
                              ? (siteSettings?.bkashNumber || '01700000000')
                              : (siteSettings?.nagadNumber || '01800000000');
                            navigator.clipboard.writeText(num);
                            setCopiedNumber(true);
                            setTimeout(() => setCopiedNumber(false), 2000);
                          }}
                          className="px-2.5 py-1.5 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedNumber ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedNumber ? (isBn ? 'কপি হয়েছে' : 'Copied') : (isBn ? 'কপি করুন' : 'Copy')}</span>
                        </button>
                      </div>

                      {/* Inputs: Sender Mobile & TrxID */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300 font-bangla">
                            {isBn ? 'প্রেরক বিকাশ/নগদ নম্বর *' : 'Sender bKash/Nagad Number *'}
                          </label>
                          <input
                            type="tel"
                            maxLength={11}
                            value={senderMobile}
                            onChange={(e) => setSenderMobile(cleanBDPhoneNumber(e.target.value))}
                            placeholder="01XXXXXXXXX"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300 font-bangla">
                            Transaction ID (TrxID) *
                          </label>
                          <input
                            type="text"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder={isBn ? 'যেমন: 9J3K8L2P...' : 'e.g., 9J3K8L2P...'}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono uppercase text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-400 font-bangla">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isBn ? 'পেমেন্ট মেথড: ' : 'Payment Method: '}<strong className="text-white">{isBn ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery'}</strong> {isBn ? '(পণ্য হাতে পাওয়ার পর মূল্য পরিশোধ করবেন)' : '(Pay when you receive the parcel)'}</span>
                </div>
              )}

              {/* Summary Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-bangla">
                <div className="flex justify-between text-slate-400">
                  <span>{isBn ? `প্রোডাক্ট সাব-টোটাল (${quantity} টি):` : `Product Subtotal (${quantity} items):`}</span>
                  <span className="font-bold text-white">৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{isBn ? `ডেলিভারি চার্জ (${deliveryArea === 'inside_dhaka' ? (lp.insideDhakaLabel || 'ঢাকার ভেতরে') : (lp.outsideDhakaLabel || 'ঢাকার বাইরে')}):` : `Delivery Charge (${deliveryArea === 'inside_dhaka' ? (lp.insideDhakaLabel || 'Inside Dhaka') : (lp.outsideDhakaLabel || 'Outside Dhaka')}):`}</span>
                  <span className="font-bold text-emerald-400">
                    {currentDeliveryCharge === 0 ? (isBn ? 'ফ্রি' : 'Free') : `৳${currentDeliveryCharge}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-slate-800">
                  <span>{isBn ? 'সর্বমোট প্রদেয় মূল্য:' : 'Grand Total:'}</span>
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
                    ? (isBn ? 'অর্ডার প্রসেসিং হচ্ছে...' : 'Processing Order...')
                    : (lp.customButtonText && !lp.customButtonText.includes('ক্যাশ অন ডেলিভারিতে')
                        ? lp.customButtonText
                        : (isBn ? 'অর্ডার কনফার্ম করুন' : 'Confirm Order Now'))}
                </span>
              </button>

              <p className="text-center text-[11px] text-slate-400 font-bangla">
                {lp.orderSecurityNotice || (isBn ? '🔒 আপনার সকল তথ্য ১০০% সুরক্ষিত এবং ক্যাশ অন ডেলিভারিতে পণ্য হাতে পাওয়ার পর মূল্য পরিশোধ করতে পারবেন।' : '🔒 Your information is 100% secure. You can inspect the item and pay upon delivery.')}
              </p>
            </form>
          )}
        </div>

        {/* SIMILAR PRODUCTS SECTION */}
        {similarProducts.length > 0 && (
          <div className="space-y-6 pt-4">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-400 font-bangla">
                {lp.similarSectionSubtitle || (isBn ? 'সম্পর্কিত পণ্যসমূহ' : 'Related Products')}
              </span>
              <h3 className="text-xl sm:text-3xl font-black text-white font-bangla">
                {lp.similarSectionTitle || (isBn ? 'সম্পর্কিত অন্যান্য আকর্ষণীয় পণ্যসমূহ' : 'Similar High-Quality Products')}
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
                        {p.banglaName || (isBn ? 'প্রিমিয়াম কালেকশন' : 'Premium Collection')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-baseline justify-between mt-3 font-bangla">
                    <span className="text-xs sm:text-sm font-black text-emerald-400">
                      ৳{p.price.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md">
                      {isBn ? 'অর্ডার দেখুন' : 'View Order'}
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
              {lp.stickyBarSubtext || (isBn ? 'অফার মূল্য' : 'Offer Price')}
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
          <span>{lp.stickyBarButtonText || lp.customButtonText || (isBn ? 'অর্ডার করুন' : 'Order Now')}</span>
        </button>
      </div>
      {/* Order Restriction Contact Popup Modal */}
      <OrderRestrictionModal
        isOpen={restrictionModal.isOpen}
        onClose={() => setRestrictionModal((prev) => ({ ...prev, isOpen: false }))}
        reason={restrictionModal.reason}
        customMessage={restrictionModal.customMessage}
        customerPhone={restrictionModal.customerPhone}
        siteSettings={siteSettings}
      />
    </div>
  );
};
