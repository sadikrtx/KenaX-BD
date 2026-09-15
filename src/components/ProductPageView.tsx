import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  ShoppingCart,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle,
  Play,
  Pause,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Heart,
  Check,
  Sparkles,
  Share2,
  ArrowLeft,
  Clock,
  Package,
  Award,
  HelpCircle,
  ThumbsUp,
  MessageSquare,
  Send,
  AlertCircle,
} from 'lucide-react';
import { Product, UserRole, ColorVariation, Order, CustomerRecord } from '../types';
import { FormattedText } from './FormattedText';
import { ProductCard } from './ProductCard';
import { applyProductOpenGraphMeta, restoreStoreOpenGraphMeta } from '../utils/seo';
import { getOptimizedImageUrl, NEUTRAL_PRODUCT_PLACEHOLDER, markImageLoaded, preloadImage } from '../utils/imageOptimizer';
import { resolveOriginalImageMedia, getSynchronouslyResolvedMedia } from '../lib/firebase';

export interface CustomerReview {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  photos?: string[];
  verifiedPurchase: boolean;
  likes?: number;
}

interface ProductPageViewProps {
  product: Product;
  allProducts: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity: number, variant?: string, customImage?: string) => void;
  onBuyNow: (product: Product, quantity: number, variant?: string, customImage?: string) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: boolean;
  wishlist: Product[];
  currentRole: UserRole;
  isLoggedIn?: boolean;
  onOpenCustomerAuth?: () => void;
  onNavigate: (view: string) => void;
  onSelectCategory?: (category: string) => void;
  insideDhakaFee?: number;
  outsideDhakaFee?: number;
  orders?: Order[];
  currentCustomer?: CustomerRecord | null;
}

export const ProductPageView: React.FC<ProductPageViewProps> = ({
  product,
  allProducts,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  isWishlisted,
  wishlist,
  currentRole,
  isLoggedIn = false,
  onOpenCustomerAuth,
  onNavigate,
  onSelectCategory,
  insideDhakaFee = 60,
  outsideDhakaFee = 120,
  orders = [],
  currentCustomer = null,
}) => {
  const safeInsideDhaka = (typeof insideDhakaFee === 'number' && !isNaN(insideDhakaFee)) ? insideDhakaFee : 60;
  const safeOutsideDhaka = (typeof outsideDhakaFee === 'number' && !isNaN(outsideDhakaFee)) ? outsideDhakaFee : 120;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'reviews' | 'shipping'>('details');
  const [isPaused, setIsPaused] = useState(false);

  // Variations state
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedCustomOptions, setSelectedCustomOptions] = useState<Record<string, string>>({});
  const [activeColorImage, setActiveColorImage] = useState<string | null>(null);

  // Added to cart feedback state
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reviews state with sample initial reviews and user review submission
  const [reviews, setReviews] = useState<CustomerReview[]>(() => {
    return [
      {
        id: 'rev-1',
        userName: 'Tanvir Hossain',
        rating: 5,
        date: '2 days ago',
        comment: 'পণ্যটি অরিজিনাল এবং কোয়ালিটি অত্যন্ত প্রিমিয়াম। প্যাকেজিং চমৎকার ছিল এবং ২ দিনের মধ্যেই ডেলিভারি পেয়েছি।',
        verifiedPurchase: true,
        likes: 12,
      },
      {
        id: 'rev-2',
        userName: 'Sadia Rahman',
        rating: 5,
        date: '1 week ago',
        comment: 'Authentic item as described. The color matches the picture perfectly. Highly recommended KenaX BD!',
        verifiedPurchase: true,
        likes: 8,
      },
      {
        id: 'rev-3',
        userName: 'Mahmudul Hasan',
        rating: 4,
        date: '2 weeks ago',
        comment: 'Great value for money. Cash on delivery was hassle-free. Customer support was very responsive.',
        verifiedPurchase: true,
        likes: 5,
      },
    ];
  });

  // New review form
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewPhotos, setNewReviewPhotos] = useState<string[]>([]);
  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Initialize variation states when product changes
  useEffect(() => {
    setSelectedImageIndex(0);
    setShowVideo(false);
    setQuantity(1);
    setAddedFeedback(false);
    setReviewSubmitted(false);
    setIsPaused(false);

    if (product.colors && product.colors.length > 0) {
      const firstColor = product.colors[0];
      setSelectedColor(firstColor.name);
      if (firstColor.imageUrl) {
        setActiveColorImage(firstColor.imageUrl);
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

    // Immediately ensure viewport is at top smoothly without bottom-to-top scroll animation lag
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [product.id]);

  // Dynamically apply individual product OpenGraph Social Preview meta tags
  useEffect(() => {
    const variantStr = getSelectedVariantString();
    applyProductOpenGraphMeta(product, variantStr, activeColorImage || undefined);

    return () => {
      // Clean up when leaving product page
      restoreStoreOpenGraphMeta();
    };
  }, [product, selectedColor, selectedSize, selectedCustomOptions, activeColorImage]);

  // 3-Second Auto-Slide for all product images
  useEffect(() => {
    if (showVideo || isPaused || activeColorImage) return;
    const imagesCount = product.images?.length || 0;
    if (imagesCount <= 1) return;

    const interval = setInterval(() => {
      setSelectedImageIndex((prev) => (prev + 1) % imagesCount);
    }, 3000);

    return () => clearInterval(interval);
  }, [product.id, showVideo, isPaused, activeColorImage, product.images?.length]);

  const isStaff = ['super_admin', 'admin', 'manager', 'moderator'].includes(currentRole);

  const hasSpecifications = Boolean(
    product.specifications && Object.keys(product.specifications).length > 0
  );

  // Match selected variant combination (e.g. Storage/RAM variant or Color/Size variant)
  const matchedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return null;

    // 1. Exact match by name
    const allSelectedVals = [selectedSize, ...Object.values(selectedCustomOptions), selectedColor].filter(Boolean);
    
    // Try to find variant whose name matches any selected option or combination
    const found = product.variants.find((v) => {
      const vName = v.name.toLowerCase().trim();
      if (selectedSize && (vName === selectedSize.toLowerCase().trim() || vName.includes(selectedSize.toLowerCase().trim()))) {
        return true;
      }
      return allSelectedVals.some((val) => vName === val.toLowerCase().trim() || vName.includes(val.toLowerCase().trim()));
    });

    return found || null;
  }, [product.variants, selectedSize, selectedCustomOptions, selectedColor]);

  // Compute effective active price considering variant price modifier
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
    if (color.imageUrl) {
      setActiveColorImage(color.imageUrl);
      setShowVideo(false);
    }
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

  const validProductImages = (product.images || []).filter(
    (img) => typeof img === 'string' && img.trim() !== ''
  );

  const currentDisplayImage =
    (matchedVariant?.image && matchedVariant.image.trim() !== '' && !activeColorImage)
      ? matchedVariant.image
      : (activeColorImage && activeColorImage.trim() !== '')
      ? activeColorImage
      : validProductImages[selectedImageIndex] ||
        validProductImages[0] ||
        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500';

  const handleAddToCartClick = () => {
    const customProduct: Product = {
      ...product,
      price: activeUnitPrice,
      sku: activeSku || product.sku,
    };
    const chosenImg =
      activeColorImage ||
      matchedVariant?.image ||
      validProductImages[selectedImageIndex] ||
      validProductImages[0] ||
      product.images?.[0] ||
      '';
    onAddToCart(
      customProduct,
      quantity,
      getSelectedVariantString(),
      chosenImg
    );
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2500);
  };

  const handleBuyNowClick = () => {
    const customProduct: Product = {
      ...product,
      price: activeUnitPrice,
      sku: activeSku || product.sku,
    };
    const chosenImg =
      activeColorImage ||
      matchedVariant?.image ||
      validProductImages[selectedImageIndex] ||
      validProductImages[0] ||
      product.images?.[0] ||
      '';
    onBuyNow(
      customProduct,
      quantity,
      getSelectedVariantString(),
      chosenImg
    );
  };

  const handleShareClick = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Check if current user has an order with status === 'Delivered' containing this product
  const hasPurchasedAndDelivered = Boolean(
    currentCustomer &&
    orders &&
    orders.some((order) => {
      if (order.orderStatus !== 'Delivered') return false;

      const emailMatch =
        currentCustomer.email &&
        order.customerEmail &&
        order.customerEmail.trim().toLowerCase() === currentCustomer.email.trim().toLowerCase();

      const cPhone = (currentCustomer.mobile || '').replace(/\D/g, '');
      const oPhone = (order.customerMobile || (order as any).customerPhone || '').replace(/\D/g, '');
      const dPhone = (order.deliveryMobile || '').replace(/\D/g, '');
      const phoneMatch =
        cPhone &&
        (oPhone === cPhone ||
          dPhone === cPhone ||
          (cPhone.length >= 10 && (oPhone.endsWith(cPhone.slice(-10)) || dPhone.endsWith(cPhone.slice(-10)))));

      const idMatch = order.customerId && currentCustomer.id && order.customerId === currentCustomer.id;

      if (!emailMatch && !phoneMatch && !idMatch) return false;

      return (order.items || []).some(
        (item) => item.productId === product.id || (item.productName && item.productName.toLowerCase() === product.name.toLowerCase())
      );
    })
  );

  // Check if customer ordered this product, but it's not yet delivered (e.g. Pending, Confirmed, Processing, Shipped)
  const hasPendingOrInTransitOrder = Boolean(
    currentCustomer &&
    orders &&
    !hasPurchasedAndDelivered &&
    orders.some((order) => {
      if (order.orderStatus === 'Cancelled') return false;

      const emailMatch =
        currentCustomer.email &&
        order.customerEmail &&
        order.customerEmail.trim().toLowerCase() === currentCustomer.email.trim().toLowerCase();

      const cPhone = (currentCustomer.mobile || '').replace(/\D/g, '');
      const oPhone = (order.customerMobile || (order as any).customerPhone || '').replace(/\D/g, '');
      const dPhone = (order.deliveryMobile || '').replace(/\D/g, '');
      const phoneMatch =
        cPhone &&
        (oPhone === cPhone ||
          dPhone === cPhone ||
          (cPhone.length >= 10 && (oPhone.endsWith(cPhone.slice(-10)) || dPhone.endsWith(cPhone.slice(-10)))));

      const idMatch = order.customerId && currentCustomer.id && order.customerId === currentCustomer.id;

      if (!emailMatch && !phoneMatch && !idMatch) return false;

      return (order.items || []).some(
        (item) => item.productId === product.id || (item.productName && item.productName.toLowerCase() === product.name.toLowerCase())
      );
    })
  );

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reviewerName = (newReviewName.trim() || currentCustomer?.name || 'Valued Customer').trim();
    if (!reviewerName || !newReviewComment.trim()) return;

    const newRev: CustomerReview = {
      id: `rev-${Date.now()}`,
      userName: reviewerName,
      rating: newReviewRating,
      date: 'Just now',
      comment: newReviewComment.trim(),
      photos: newReviewPhotos.length > 0 ? newReviewPhotos : undefined,
      verifiedPurchase: true,
      likes: 1,
    };

    setReviews([newRev, ...reviews]);
    setNewReviewComment('');
    setNewReviewPhotos([]);
    setPhotoInputUrl('');
    setReviewSubmitted(true);
    setTimeout(() => setReviewSubmitted(false), 5000);
  };

  // Calculate dynamically ranked Similar Products (matching subcategory, category, brand, and relevance)
  const similarProducts = useMemo(() => {
    return allProducts
      .filter((p) => p.id !== product.id)
      .map((p) => {
        let score = 0;
        // Exact same subcategory + category gets top priority
        if (product.subcategory && p.subcategory === product.subcategory && p.category === product.category) {
          score += 50;
        } else if (p.category === product.category) {
          // Same category gets strong priority
          score += 25;
        }

        // Same brand gets additional relevance boost
        if (product.brand && p.brand && p.brand.toLowerCase() === product.brand.toLowerCase()) {
          score += 15;
        }

        // Price proximity (products within similar price range)
        if (product.price > 0 && p.price > 0) {
          const priceRatio = Math.min(product.price, p.price) / Math.max(product.price, p.price);
          score += priceRatio * 5;
        }

        // Rating boost
        score += (p.rating || 4.5);

        return { product: p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((item) => item.product);
  }, [allProducts, product.id, product.category, product.subcategory, product.brand, product.price]);

  return (
    <div className="bg-slate-50 min-h-screen pb-16 animate-in fade-in duration-200">
      {/* 1. Breadcrumbs and Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Breadcrumb path */}
          <nav className="flex items-center gap-1.5 text-slate-500 overflow-x-auto py-0.5 scrollbar-none">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-sky-600 transition-colors font-medium cursor-pointer shrink-0"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => {
                if (onSelectCategory) onSelectCategory('All');
                onNavigate('shop');
              }}
              className="hover:text-sky-600 transition-colors font-medium cursor-pointer shrink-0"
            >
              Shop
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => {
                if (onSelectCategory) onSelectCategory(product.category);
                onNavigate('shop');
              }}
              className="hover:text-sky-600 transition-colors font-semibold text-slate-700 cursor-pointer shrink-0"
            >
              {product.category}
            </button>
            {product.subcategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500 truncate max-w-[120px] sm:max-w-none">
                  {product.subcategory}
                </span>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-bold text-sky-700 truncate max-w-[140px] sm:max-w-[260px]">
              {product.name}
            </span>
          </nav>

          {/* Quick Back & Share Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareClick}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              title="Share or Copy Product Link"
            >
              <Share2 className="w-3.5 h-3.5 text-sky-600" />
              <span>{copiedLink ? 'Copied Link!' : 'Share'}</span>
            </button>
            <button
              onClick={() => onNavigate('shop')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Shop</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1536px] mx-auto px-0 sm:px-4 lg:px-6 pt-0 sm:pt-2">
        {/* 2. Main Product Showcase Box */}
        <div className="bg-white rounded-none sm:rounded-3xl border-x-0 border-t-0 sm:border border-slate-200 shadow-none sm:shadow-sm overflow-hidden p-0 sm:p-4 lg:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 sm:gap-6 lg:gap-8">
            {/* Left Column: Media Gallery (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between p-0">
              <div>
                {/* Main Image / Video Viewport with 3s Slide & Controls */}
                <div
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                  onTouchStart={() => setIsPaused(true)}
                  onTouchEnd={() => setIsPaused(false)}
                  className="relative aspect-square rounded-none sm:rounded-2xl bg-white sm:bg-slate-50 border-b sm:border border-slate-200/90 overflow-hidden flex items-center justify-center shadow-none sm:shadow-xs group"
                >
                  {showVideo && product.videoUrl ? (
                    <video
                      src={product.videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <img
                      key={currentDisplayImage}
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
                      className="w-full h-full object-contain p-0 sm:p-2 mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Left / Right Carousel Navigation Arrows (Desktop hover & Mobile) */}
                  {!showVideo && (product.images || []).length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveColorImage(null);
                          const total = product.images.length;
                          setSelectedImageIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:opacity-80 sm:hover:opacity-100 cursor-pointer z-10 hover:scale-110 active:scale-95"
                        aria-label="Previous Image"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-700" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveColorImage(null);
                          const total = product.images.length;
                          setSelectedImageIndex((prev) => (prev + 1) % total);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:opacity-80 sm:hover:opacity-100 cursor-pointer z-10 hover:scale-110 active:scale-95"
                        aria-label="Next Image"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-700" />
                      </button>
                    </>
                  )}

                  {/* Active Color Preview Pill */}
                  {activeColorImage && (
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-slate-900/85 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 shadow-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{selectedColor} Preview</span>
                    </div>
                  )}

                  {/* Badges Overlay */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end z-10">
                    {product.saleBadge === 'Trending' || product.isTrending ? (
                      <span className="bg-purple-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-xs flex items-center gap-1">
                        <span>🔥</span> Trending
                      </span>
                    ) : product.saleBadge === 'New' || product.isNew ? (
                      <span className="bg-sky-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-xs flex items-center gap-1">
                        <span>✨</span> New Arrival
                      </span>
                    ) : product.saleBadge === 'Best Seller' || product.isBestSeller ? (
                      <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-xs flex items-center gap-1">
                        <span>🏆</span> Best Seller
                      </span>
                    ) : product.saleBadge === 'Hot' || product.isHot ? (
                      <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-xs flex items-center gap-1">
                        <span>⚡</span> Hot Deal
                      </span>
                    ) : product.saleBadge === 'Featured' || product.isFeatured ? (
                      <span className="bg-amber-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-xs flex items-center gap-1">
                        <span>⭐</span> Featured
                      </span>
                    ) : null}

                    {product.discountPercent && product.discountPercent > 0 && (
                      <span className="bg-rose-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-xs">
                        -{product.discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  {/* Video Toggle Button */}
                  {product.videoUrl && (
                    <button
                      onClick={() => {
                        setShowVideo(!showVideo);
                        if (!showVideo) setActiveColorImage(null);
                      }}
                      className="absolute bottom-3 right-3 px-3.5 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                    >
                      {showVideo ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-sky-400" />
                          <span>Show Photo</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
                          <span>Watch Video</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Thumbnails Row */}
                <div className="flex items-center gap-2 sm:gap-2.5 mt-2.5 sm:mt-4 px-3 sm:px-0 overflow-x-auto pb-1 scrollbar-thin">
                  {(product.images || []).filter((img) => typeof img === 'string' && img.trim() !== '').map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        setActiveColorImage(null);
                        setShowVideo(false);
                      }}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl border-2 overflow-hidden shrink-0 bg-white p-1 cursor-pointer transition-all ${
                        !showVideo && !activeColorImage && selectedImageIndex === idx
                          ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-md'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={getOptimizedImageUrl(img, 160)}
                        alt={`${product.name} Thumbnail ${idx + 1}`}
                        loading="lazy"
                        decoding="async"
                        onLoad={() => markImageLoaded(img, 160)}
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

                  {product.videoUrl && (
                    <button
                      onClick={() => {
                        setShowVideo(true);
                        setActiveColorImage(null);
                      }}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl border-2 shrink-0 bg-slate-900 text-white flex flex-col items-center justify-center p-1 cursor-pointer transition-all ${
                        showVideo ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-800'
                      }`}
                    >
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 fill-sky-400" />
                      <span className="text-[10px] font-bold mt-1">Video</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Pricing, Specs, Variants & Purchase Controls (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between px-3 sm:px-0 pt-2 sm:pt-0">
              <div>
                {/* Brand, Category, SKU */}
                <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                  <span className="font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                    {product.brand}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-slate-600">{product.category}</span>
                  {product.sku && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-400 font-mono text-[11px]">SKU: {product.sku}</span>
                    </>
                  )}
                </div>

                {/* Main Product Title */}
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  {product.name}
                </h1>
                {product.banglaName && (
                  <p className="text-sm font-semibold text-slate-500 mt-1">{product.banglaName}</p>
                )}

                {/* Rating, Reviews count & In Stock Banner */}
                <div className="flex items-center gap-2 sm:gap-3 mt-3 pt-1 text-xs">
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl">
                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.floor(product.rating) ? 'fill-amber-400' : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-black text-amber-900">{product.rating}</span>
                    <span className="text-slate-500 font-medium">
                      ({product.reviewsCount}
                      <span className="hidden sm:inline"> customer reviews</span>)
                    </span>
                  </div>

                  <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl font-bold shrink-0 ${
                    activeStock > 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {activeStock > 0 ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>In Stock ({activeStock} available)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Out of Stock</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Price Box */}
                <div className="mt-5 p-5 rounded-2xl bg-gradient-to-r from-sky-50/70 via-blue-50/40 to-slate-50 border border-sky-100">
                  <div className="flex flex-row items-center flex-nowrap gap-3 overflow-x-auto scrollbar-none whitespace-nowrap">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 shrink-0">
                      ৳ {(activeUnitPrice * quantity).toLocaleString('en-BD')}
                    </span>
                    {activeOriginalPrice > activeUnitPrice && (
                      <span className="text-base sm:text-lg text-slate-400 line-through font-semibold shrink-0">
                        ৳ {((activeOriginalPrice || activeUnitPrice) * quantity).toLocaleString('en-BD')}
                      </span>
                    )}
                    {quantity > 1 && (
                      <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 shrink-0">
                        ৳{activeUnitPrice.toLocaleString('en-BD')} × {quantity}
                      </span>
                    )}
                    {matchedVariant && (
                      <span className="text-xs font-black text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 shrink-0">
                        Selected: {matchedVariant.name}
                      </span>
                    )}
                    {product.discountType === 'flat' && product.discountValue ? (
                      <span className="text-xs font-black text-rose-700 bg-rose-100 px-3 py-1 rounded-xl border border-rose-200 shrink-0 whitespace-nowrap">
                        ৳{(product.discountValue * quantity).toLocaleString('en-BD')} save ({product.discountPercent}% OFF)
                      </span>
                    ) : product.discountPercent && product.discountPercent > 0 ? (
                      <span className="text-xs font-black text-rose-700 bg-rose-100 px-3 py-1 rounded-xl border border-rose-200 shrink-0 whitespace-nowrap">
                        {product.discountPercent}% save
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* VARIATIONS & CONTROLS: Color, Size & Quantity on One Single Line */}
                <div className="space-y-4 mt-5 pt-3 border-t border-slate-100">
                  {/* UNIFIED SINGLE ROW: Quantity, Color & Size on One Line (No Dropdown Menus!) */}
                  <div className="p-3 sm:p-4 rounded-2xl bg-slate-50/95 border border-slate-200/90 shadow-2xs">
                    <div className="flex flex-row items-center gap-3 sm:gap-4 flex-nowrap overflow-x-auto scrollbar-none py-1">
                      {/* 1. Quantity Stepper */}
                      <div className="shrink-0">
                        <div className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider mb-1">
                          Quantity
                        </div>
                        <div className="flex items-center border border-slate-300 rounded-xl bg-white h-10 sm:h-11 px-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                            disabled={quantity <= 1}
                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 rounded-lg font-black text-sm transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="text-xs sm:text-sm font-black text-slate-900 px-2 select-none min-w-[28px] text-center">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity((prev) => Math.min(product.stock || 99, prev + 1))}
                            disabled={quantity >= (product.stock || 99)}
                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-40 rounded-lg font-black text-sm transition-colors cursor-pointer"
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
                            <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider">
                              Color:
                            </span>
                            <span className="text-[10px] sm:text-xs font-extrabold text-sky-700">
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
                                  className={`h-10 sm:h-11 px-3 rounded-xl border flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
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
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-0.5" />}
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
                            <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider">
                              Size:
                            </span>
                            <span className="text-[10px] sm:text-xs font-extrabold text-indigo-700">
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
                                  className={`h-10 sm:h-11 min-w-[40px] sm:min-w-[44px] px-3 rounded-xl border flex items-center justify-center text-xs sm:text-sm font-black transition-all cursor-pointer shrink-0 shadow-2xs ${
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
                    </div>
                  </div>

                  {/* Custom Variations (Storage, Edition, Material, etc. if any) */}
                  {product.variations && product.variations.length > 0 &&
                    product.variations.map((v) => (
                      <div key={v.id || v.name} className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                        <span className="text-xs font-bold text-slate-800 block mb-2">
                          Select {v.name}: <span className="text-sky-700 font-black">{selectedCustomOptions[v.name]}</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {(v.options || []).map((opt) => {
                            const isSelected = selectedCustomOptions[v.name] === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() =>
                                  setSelectedCustomOptions((prev) => ({ ...prev, [v.name]: opt }))
                                }
                                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20 shadow-xs'
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

                {/* Staff-Only Dropshipping / Supplier Section */}
                {isStaff && (
                  <div className="mt-5 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-amber-950 mb-2">
                      <span className="flex items-center gap-1.5">
                        <span>🔒 Staff Sourcing Data</span>
                      </span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-md uppercase font-black">
                        {product.productType === 'own' ? 'In-House Stock' : 'Dropship / Direct Import'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-slate-700 text-xs bg-white p-3 rounded-xl border border-amber-200/60 mb-2">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Cost Price</span>
                        <span className="font-bold text-slate-800">
                          {product.costPrice ? `৳ ${product.costPrice.toLocaleString('en-BD')}` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Est. Profit</span>
                        <span className="font-bold text-emerald-600">
                          {profitBDT > 0 ? `+৳ ${profitBDT.toLocaleString('en-BD')}` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Margin</span>
                        <span className="font-bold text-sky-700">{marginPercent}%</span>
                      </div>
                    </div>
                    {product.supplierUrl && (
                      <a
                        href={product.supplierUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Supplier Product Page ({product.supplierName || 'AliExpress / Alibaba'})</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: Add to Cart, Buy Now, Wishlist */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-3">
                {addedFeedback && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Product successfully added to your shopping cart!</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-3 min-w-0">
                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCartClick}
                    className="col-span-1 sm:col-span-6 py-2.5 sm:py-3.5 px-2 sm:px-6 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2.5 transition-all shadow-md cursor-pointer min-w-0 overflow-hidden"
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="truncate">Add to Cart</span>
                  </button>

                  {/* Buy Now Button (Direct checkout) */}
                  <button
                    onClick={handleBuyNowClick}
                    className="col-span-1 sm:col-span-5 py-2.5 sm:py-3.5 px-2 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-lg shadow-sky-600/20 cursor-pointer min-w-0 overflow-hidden"
                  >
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-300 text-amber-300 shrink-0" />
                    <span className="truncate">Buy Now • ৳{(product.price * quantity).toLocaleString('en-BD')}</span>
                  </button>

                  {/* Wishlist Button */}
                  <button
                    onClick={() => onToggleWishlist(product)}
                    className={`hidden sm:flex sm:col-span-1 p-3.5 rounded-2xl border items-center justify-center transition-all cursor-pointer ${
                      isWishlisted
                        ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                    title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                  </button>
                </div>

                {/* Delivery Information Strip */}
                <div className="mt-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>
                      Inside Dhaka: <strong>৳{safeInsideDhaka}</strong> (24-48h) • Outside Dhaka: <strong>৳{safeOutsideDhaka}</strong> (2-3 days)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Fast dispatch via Steadfast / Pathao</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. In-Depth Tabs Section (Description, Specifications, Customer Reviews, Shipping Policy) */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Tabs Navigation */}
          <div className="flex items-center border-b border-slate-200 overflow-x-auto bg-slate-50/70">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'details'
                  ? 'border-sky-600 text-sky-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4 text-sky-600" />
              <span>Description</span>
            </button>

            {hasSpecifications && (
              <button
                onClick={() => setActiveTab('specs')}
                className={`px-6 py-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'specs'
                    ? 'border-sky-600 text-sky-700 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-4 h-4 text-sky-600" />
                <span>Specifications</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-6 py-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'reviews'
                  ? 'border-sky-600 text-sky-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-sky-600" />
              <span>Reviews ({reviews.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('shipping')}
              className={`px-6 py-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'shipping'
                  ? 'border-sky-600 text-sky-700 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4 text-sky-600" />
              <span>Delivery & Warranty</span>
            </button>
          </div>

          {/* Tab Content Panes */}
          <div className="p-6 sm:p-8">
            {/* TAB 1: Product Description */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 mb-3">Product Overview</h3>
                  <FormattedText
                    content={product.description}
                    fallback={`${product.name} is built with top-tier materials to ensure maximum performance and durability. Tested and verified for high satisfaction.`}
                    className="text-sm text-slate-700"
                  />
                </div>

                {/* Key Highlights */}
                <div className="p-5 rounded-2xl bg-sky-50/60 border border-sky-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-sky-900 mb-3 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-sky-600" />
                    <span>Key Highlights & Benefits</span>
                  </h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700 font-medium">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Original product specifications & brand warranty</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Cash on Delivery home delivery available across Bangladesh</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Secure protective packaging for safe transit</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Direct support & assistance from KenaX BD team</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: Specifications Table */}
            {activeTab === 'specs' && (
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-4">Technical Specifications</h3>
                {product.specifications && Object.keys(product.specifications).length > 0 ? (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs sm:text-sm text-left">
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-600 w-1/3">Brand</td>
                          <td className="py-3 px-4 text-slate-900 font-medium">{product.brand}</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-4 font-bold text-slate-600">Category</td>
                          <td className="py-3 px-4 text-slate-900 font-medium">{product.category}</td>
                        </tr>
                        {product.subcategory && (
                          <tr className="bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-600">Sub-category</td>
                            <td className="py-3 px-4 text-slate-900 font-medium">{product.subcategory}</td>
                          </tr>
                        )}
                        {Object.entries(product.specifications).map(([key, val], idx) => (
                          <tr key={key} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="py-3 px-4 font-bold text-slate-600">{key}</td>
                            <td className="py-3 px-4 text-slate-900 font-medium">{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-500">Standard specifications apply for this item.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Customer Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-8">
                {/* Rating Overview Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-200 items-center">
                  <div className="text-center md:border-r border-slate-200 md:pr-6">
                    <span className="text-5xl font-black text-slate-900">{product.rating}</span>
                    <div className="flex items-center justify-center text-amber-400 my-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(product.rating) ? 'fill-amber-400' : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-bold text-slate-600">Based on {reviews.length} verified reviews</p>
                  </div>

                  <div className="md:col-span-2 space-y-1.5 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-600 font-bold">5 Stars</span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full w-[85%]"></div>
                      </div>
                      <span className="w-10 text-right text-slate-500 font-semibold">85%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-600 font-bold">4 Stars</span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full w-[12%]"></div>
                      </div>
                      <span className="w-10 text-right text-slate-500 font-semibold">12%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-600 font-bold">3 Stars</span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full w-[3%]"></div>
                      </div>
                      <span className="w-10 text-right text-slate-500 font-semibold">3%</span>
                    </div>
                  </div>
                </div>

                {/* Write a Review Section */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-slate-900">Write a Customer Review</h4>
                    {hasPurchasedAndDelivered && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Verified Buyer
                      </span>
                    )}
                  </div>

                  {reviewSubmitted ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>আপনার রিভিউটির জন্য ধন্যবাদ! এটি অ্যাডমিন কর্তৃক পর্যালোচনার পর প্রকাশিত হবে।</span>
                    </div>
                  ) : hasPurchasedAndDelivered ? (
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          You purchased and received this product ({currentCustomer?.name || 'Customer'}). Your review will be marked with a <strong>Verified Purchase</strong> badge.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Your Rating:</label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewReviewRating(star)}
                              className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  star <= newReviewRating ? 'fill-amber-400' : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-xs font-bold text-slate-700 ml-2">
                            {newReviewRating === 5
                              ? '5 - Excellent!'
                              : newReviewRating === 4
                              ? '4 - Very Good'
                              : newReviewRating === 3
                              ? '3 - Average'
                              : '2 - Below Average'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Your Name *</label>
                          <input
                            type="text"
                            required
                            value={newReviewName || currentCustomer?.name || ''}
                            onChange={(e) => setNewReviewName(e.target.value)}
                            placeholder={currentCustomer?.name || "e.g. Shakib Al Hasan"}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Your Review *</label>
                        <textarea
                          required
                          rows={3}
                          value={newReviewComment}
                          onChange={(e) => setNewReviewComment(e.target.value)}
                          placeholder="Share details of your experience with this product..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-sky-500"
                        />
                      </div>

                      {/* Photo Upload Section */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Upload Photos (Optional - Add Image URLs or Sample Uploads)
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="url"
                            value={photoInputUrl}
                            onChange={(e) => setPhotoInputUrl(e.target.value)}
                            placeholder="Paste image URL (e.g. https://images.unsplash.com/...)"
                            className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:border-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (photoInputUrl.trim()) {
                                setNewReviewPhotos([...newReviewPhotos, photoInputUrl.trim()]);
                                setPhotoInputUrl('');
                              }
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Add Photo
                          </button>
                        </div>

                        {/* Quick preset photo buttons for instant testing */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                          <span className="text-[10px] font-bold text-slate-500">Quick sample photo:</span>
                          {[
                            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
                            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
                            'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400'
                          ].map((url, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                if (!newReviewPhotos.includes(url)) {
                                  setNewReviewPhotos([...newReviewPhotos, url]);
                                }
                              }}
                              className="text-[10px] text-sky-600 hover:text-sky-700 underline font-bold cursor-pointer"
                            >
                              + Sample {i + 1}
                            </button>
                          ))}
                        </div>

                        {newReviewPhotos.filter((p) => typeof p === 'string' && p.trim() !== '').length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {newReviewPhotos.filter((p) => typeof p === 'string' && p.trim() !== '').map((pUrl, idx) => (
                              <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group">
                                <img src={pUrl} alt="Review upload" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setNewReviewPhotos(newReviewPhotos.filter((_, i) => i !== idx))}
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center opacity-90 hover:opacity-100 cursor-pointer"
                                  title="Remove photo"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Review</span>
                      </button>
                    </form>
                  ) : hasPendingOrInTransitOrder ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs sm:text-sm font-bold text-amber-950">
                            অর্ডারটি ডেলিভারি হওয়ার পর রিভিউ দিতে পারবেন
                          </h5>
                          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                            আপনার এই প্রোডাক্টের অর্ডারটি বর্তমানে প্রক্রিয়াধীন রয়েছে। পণ্যটি আপনার কাছে সফলভাবে পৌঁছে দেওয়া (Delivered) হলে আপনি ভেরিফাইড রিভিউ প্রদান করতে পারবেন।
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : currentCustomer ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                            Only Verified Buyers Can Write a Review
                          </h5>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            শুধুমাত্র যারা এই প্রোডাক্টটি কিনেছেন এবং ডেলিভারি পেয়েছেন তারাই রিভিউ দিতে পারবেন। নির্ভরযোগ্য ও বাস্তবসম্মত মতামত বজায় রাখতে এই নিয়ম প্রযোজ্য।
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                              Verified Purchaser Reviews
                            </h5>
                            <p className="text-xs text-slate-500 mt-0.5">
                              রিভিউ প্রদান করতে লগইন করুন। শুধুমাত্র ডেলিভারি সম্পন্ন হওয়া কাস্টমাররা রিভিউ লিখতে পারবেন।
                            </p>
                          </div>
                        </div>
                        {onOpenCustomerAuth && (
                          <button
                            onClick={onOpenCustomerAuth}
                            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                          >
                            Login to Review
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900">Recent Customer Reviews</h4>
                  <div className="divide-y divide-slate-100">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="py-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                              {rev.userName.charAt(0)}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900">{rev.userName}</span>
                              {rev.verifiedPurchase && (
                                <span className="ml-2 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                                  ✓ Verified Buyer
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400">{rev.date}</span>
                        </div>

                        <div className="flex items-center text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < rev.rating ? 'fill-amber-400' : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">{rev.comment}</p>

                        {rev.photos && rev.photos.filter((p) => typeof p === 'string' && p.trim() !== '').length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {rev.photos.filter((p) => typeof p === 'string' && p.trim() !== '').map((pImg, pIdx) => (
                              <a
                                key={pIdx}
                                href={pImg}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity block shadow-2xs"
                                title="Click to view full photo"
                              >
                                <img src={pImg} alt="Review attachment" className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Delivery & Shipping Policy */}
            {activeTab === 'shipping' && (
              <div className="space-y-6 text-xs text-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                    <h4 className="text-sm font-black text-slate-900 mb-2 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-sky-600" />
                      <span>Delivery Timelines & Charges</span>
                    </h4>
                    <ul className="space-y-2 mt-3 text-slate-600 font-medium">
                      <li>• <strong>Inside Dhaka:</strong> 24-48 Hours (Charge: ৳{safeInsideDhaka})</li>
                      <li>• <strong>Outside Dhaka:</strong> 2-3 Days across all districts (Charge: ৳{safeOutsideDhaka})</li>
                      <li>• <strong>Courier Partners:</strong> Steadfast Courier & Pathao Logistics</li>
                      <li>• <strong>Tracking:</strong> Real-time SMS and web tracking provided for all shipments</li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                    <h4 className="text-sm font-black text-slate-900 mb-2 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-rose-600" />
                      <span>Warranty & Return Support</span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed mt-2">
                      If you receive a defective, damaged, or incorrect item, please notify our customer support team within 7 days. We will provide a free replacement or instant refund under our guarantee.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Similar Products Section */}
        <section className="mt-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Similar Products
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Related items from {product.category} {product.subcategory ? `• ${product.subcategory}` : ''}
              </p>
            </div>

            <button
              onClick={() => {
                if (onSelectCategory) onSelectCategory(product.category);
                onNavigate('shop');
              }}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View More in {product.category}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Similar Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {similarProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={(prod) => onAddToCart(prod, 1)}
                onBuyNow={(prod) => onBuyNow(prod, 1)}
                onQuickView={(prod) => {
                  onSelectProduct(prod);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onToggleWishlist={onToggleWishlist}
                isWishlisted={wishlist.some((w) => w.id === p.id)}
                currentRole={currentRole}
                isLoggedIn={isLoggedIn}
                onOpenCustomerAuth={onOpenCustomerAuth}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
