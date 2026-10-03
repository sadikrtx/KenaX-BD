import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  AlertTriangle,
  ZoomIn,
  X,
  FolderUp,
  Image as ImageIcon,
  Film,
  Loader2,
  Lock,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { Product, UserRole, ColorVariation, Order, CustomerRecord, ProductHistoryEntry } from '../types';
import { FormattedText } from './FormattedText';
import { ProductCard } from './ProductCard';
import { applyProductOpenGraphMeta, restoreStoreOpenGraphMeta } from '../utils/seo';
import { getOptimizedImageUrl, NEUTRAL_PRODUCT_PLACEHOLDER, markImageLoaded, preloadImage, getVideoThumbnail } from '../utils/imageOptimizer';
import {
  resolveOriginalImageMedia,
  getSynchronouslyResolvedMedia,
  saveReviewToDB,
  getReviewsFromDB,
  subscribeToReviews,
} from '../lib/firebase';
import { Review } from '../types';
import { uploadCustomerReviewPhoto, resolveGoogleDriveUrl, getDriveDirectImageUrl, handleImageErrorFallback } from '../lib/googleDriveService';
import { ProductVideoPlayer } from './ProductVideoPlayer';
import { getProductStockStatus, getStockStatusInfo } from '../utils/stockUtils';
import { HighlightIcon } from './HighlightIcon';
import { DEFAULT_PRODUCT_HIGHLIGHTS } from '../utils/highlightConstants';
import { useLanguage } from '../context/LanguageContext';
import { safeSetLocalStorage } from '../lib/storage';

export interface CustomerReview {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
  photos?: string[];
  verifiedPurchase: boolean;
  likes?: number;
  isPendingApproval?: boolean;
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
  onBack?: () => void;
  previousItem?: ProductHistoryEntry | null;
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
  onBack,
  previousItem = null,
}) => {
  const { t, language } = useLanguage();
  const safeInsideDhaka = (typeof insideDhakaFee === 'number' && !isNaN(insideDhakaFee)) ? insideDhakaFee : 60;
  const safeOutsideDhaka = (typeof outsideDhakaFee === 'number' && !isNaN(outsideDhakaFee)) ? outsideDhakaFee : 120;

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'reviews' | 'shipping'>('details');
  const [isPaused, setIsPaused] = useState(false);
  const [holdUntil, setHoldUntil] = useState<number>(() => Date.now() + 4000);

  // Variations state (Default: empty - user MUST select manually)
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedCustomOptions, setSelectedCustomOptions] = useState<Record<string, string>>({});
  const [activeColorImage, setActiveColorImage] = useState<string | null>(null);
  const [variationError, setVariationError] = useState<string | null>(null);

  // List of valid product images
  const validProductImages = useMemo(() => {
    const list = (product?.images || []).filter(
      (img) => typeof img === 'string' && img.trim() !== ''
    );
    return list.length > 0 ? list : [NEUTRAL_PRODUCT_PLACEHOLDER];
  }, [product?.images]);

  const hasVideo = Boolean(product?.videoUrl && product.videoUrl.trim() !== '');
  const totalSlides = validProductImages.length + (hasVideo ? 1 : 0);

  const videoThumbnailUrl = useMemo(() => {
    return hasVideo ? getVideoThumbnail(product?.videoUrl, validProductImages[0]) : null;
  }, [hasVideo, product?.videoUrl, validProductImages]);

  // Added to cart feedback state
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Reviews state with real-time Firestore persistence and local storage cache
  const [dbReviewsList, setDbReviewsList] = useState<Review[]>(() => {
    try {
      const cached = localStorage.getItem('kenax_reviews_cache');
      let list = cached ? JSON.parse(cached) : [];
      const customRaw = localStorage.getItem('kenax_custom_reviews_map');
      if (customRaw) {
        const customMap = JSON.parse(customRaw);
        list = list.map((r: Review) => customMap[r.id] ? { ...r, ...customMap[r.id] } : r);
      }
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {}
    return [];
  });

  // Track locally submitted review IDs by this user across page reloads & offline
  const [mySubmittedReviewIds, setMySubmittedReviewIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kenax_my_submitted_reviews');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    getReviewsFromDB().then((items) => {
      if (items && items.length > 0) {
        setDbReviewsList(items);
        safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(items));
      }
    });

    const unsub = subscribeToReviews((liveReviews) => {
      if (liveReviews) {
        setDbReviewsList(liveReviews);
        safeSetLocalStorage('kenax_reviews_cache', JSON.stringify(liveReviews));
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // Compute active reviews for this product (Preserves all existing reviews and merges newly submitted ones)
  const reviews = useMemo<CustomerReview[]>(() => {
    if (!product?.id) return [];
    
    // 1. Get all reviews matching this product ID from DB
    const matching = dbReviewsList.filter(
      (r) => r.productId === product.id || r.productName?.toLowerCase() === product.name?.toLowerCase()
    );

    // 2. All visitors (guests, accounts, all devices) see all active reviews
    const visibleReviews = matching.filter(
      (r) => r.status !== 'hidden' && (r as any).status !== 'rejected'
    );

    const mappedRealReviews: CustomerReview[] = visibleReviews.map((r) => {
      let formattedDate = 'Recently';
      if (r.createdAt) {
        try {
          const dateObj = new Date(r.createdAt);
          formattedDate = dateObj.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        } catch {}
      }
      return {
        id: r.id,
        userName: r.customerName || r.userName || 'Verified Buyer',
        rating: r.rating || 5,
        date: formattedDate,
        comment: r.comment || '',
        photos: (r.photos || []).map((pUrl) => (typeof pUrl === 'string' ? resolveGoogleDriveUrl(pUrl) : pUrl)),
        verifiedPurchase: Boolean(r.verifiedPurchase || mySubmittedReviewIds.includes(r.id)),
        likes: 2,
        isPendingApproval: r.status === 'pending' && mySubmittedReviewIds.includes(r.id),
      };
    });

    // Default verified buyer reviews - always preserved so previous reviews NEVER disappear!
    const defaultSampleReviews: CustomerReview[] = [
      {
        id: `rev-sample-1-${product.id}`,
        userName: 'Tanvir Hossain',
        rating: 5,
        date: language === 'bn' ? '২ দিন আগে' : '2 days ago',
        comment: language === 'bn' 
          ? 'পণ্যটি অরিজিনাল এবং কোয়ালিটি অত্যন্ত প্রিমিয়াম। প্যাকেজিং চমৎকার ছিল এবং ২ দিনের মধ্যেই ডেলিভারি পেয়েছি।'
          : 'Authentic product and premium quality! Packaging was intact and delivery took only 2 days.',
        verifiedPurchase: true,
        likes: 12,
      },
      {
        id: `rev-sample-2-${product.id}`,
        userName: 'Sadia Rahman',
        rating: 5,
        date: language === 'bn' ? '১ সপ্তাহ আগে' : '1 week ago',
        comment: language === 'bn'
          ? 'যেমন বর্ণনা দেওয়া ছিল হুবহু তেমনই পেয়েছি। কালার ও ফিনিশিং দারুণ। KenaX BD-কে অনেক ধন্যবাদ!'
          : 'Authentic item as described. The color matches the picture perfectly. Highly recommended KenaX BD!',
        verifiedPurchase: true,
        likes: 8,
      },
    ];

    // Merge: newly submitted customer reviews first, followed by default verified reviews without duplicate IDs
    const existingIds = new Set(mappedRealReviews.map((r) => r.id));
    const combined = [...mappedRealReviews];
    defaultSampleReviews.forEach((d) => {
      if (!existingIds.has(d.id)) {
        combined.push(d);
      }
    });

    return combined;
  }, [product?.id, product?.name, dbReviewsList, mySubmittedReviewIds, language]);

  // New review form
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewPhotos, setNewReviewPhotos] = useState<string[]>([]);
  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isUploadingReviewMedia, setIsUploadingReviewMedia] = useState(false);
  const [reviewMediaUploadProgress, setReviewMediaUploadProgress] = useState(0);
  const [reviewMediaUploadMsg, setReviewMediaUploadMsg] = useState<string | null>(null);
  const customerFileInputRef = useRef<HTMLInputElement>(null);
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

  // Initialize variation states when product changes (Default: Unselected)
  useEffect(() => {
    setSelectedImageIndex(0);
    setShowVideo(false);
    setQuantity(1);
    setAddedFeedback(false);
    const hasReviewedThisSession = typeof window !== 'undefined' && product?.id && sessionStorage.getItem('kenax_reviewed_' + product.id) === 'true';
    setReviewSubmitted(Boolean(hasReviewedThisSession));
    setIsPaused(false);

    // Do NOT auto-select variations - customer must explicitly pick one
    setSelectedColor('');
    setSelectedSize('');
    setSelectedCustomOptions({});
    setActiveColorImage(null);
    setVariationError(null);

    // 4-second hold on initial load
    setHoldUntil(Date.now() + 4000);

    // Immediately ensure viewport is at top smoothly without bottom-to-top scroll animation lag
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [product?.id]);

  // Dynamically apply individual product OpenGraph Social Preview meta tags
  useEffect(() => {
    if (!product) return;
    const variantStr = getSelectedVariantString();
    applyProductOpenGraphMeta(product, variantStr, activeColorImage || undefined);

    return () => {
      // Clean up when leaving product page
      restoreStoreOpenGraphMeta();
    };
  }, [product, selectedColor, selectedSize, selectedCustomOptions, activeColorImage]);

  // Auto-Slide with 4-second hold on initial load / color switch, and 3-second interval for images.
  // When video slide is active, auto-slide timer pauses completely so the video plays for its entire duration.
  useEffect(() => {
    if (isPaused || totalSlides <= 1 || showVideo) return;

    const remainingHold = Math.max(0, holdUntil - Date.now());
    const delay = remainingHold > 0 ? remainingHold : 3000;

    const timer = setTimeout(() => {
      if (isPaused || showVideo) return;
      setActiveColorImage(null);
      const nextIdx = (selectedImageIndex + 1) % totalSlides;
      if (hasVideo && nextIdx === validProductImages.length) {
        setShowVideo(true);
      } else {
        setShowVideo(false);
        setSelectedImageIndex(nextIdx);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [selectedImageIndex, showVideo, holdUntil, isPaused, totalSlides, hasVideo, validProductImages.length]);

  // When video completes its full duration, smoothly advance to the first image slide
  const handleVideoEnded = useCallback(() => {
    setShowVideo(false);
    setSelectedImageIndex(0);
    setActiveColorImage(null);
    setHoldUntil(Date.now() + 3000);
  }, []);

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
    setShowVideo(false);
    if (color.imageUrl && color.imageUrl.trim() !== '') {
      setActiveColorImage(color.imageUrl);
      const imgIdx = validProductImages.findIndex((img) => img === color.imageUrl);
      if (imgIdx !== -1) {
        setSelectedImageIndex(imgIdx);
      }
    } else {
      setActiveColorImage(null);
    }
    // Hold 4 seconds on newly selected color
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
    const currentIdx = showVideo ? validProductImages.length : selectedImageIndex;
    const newIdx = currentIdx === 0 ? totalSlides - 1 : currentIdx - 1;
    if (hasVideo && newIdx === validProductImages.length) {
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
    const currentIdx = showVideo ? validProductImages.length : selectedImageIndex;
    const newIdx = (currentIdx + 1) % totalSlides;
    if (hasVideo && newIdx === validProductImages.length) {
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

  const currentDisplayImage =
    (matchedVariant?.image && matchedVariant.image.trim() !== '' && !activeColorImage)
      ? matchedVariant.image
      : (activeColorImage && activeColorImage.trim() !== '')
      ? activeColorImage
      : validProductImages[selectedImageIndex < validProductImages.length ? selectedImageIndex : 0] ||
        validProductImages[0] ||
        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500';

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

  const handleAddToCartClick = () => {
    if (!validateVariationSelection()) return;
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
    if (!validateVariationSelection()) return;
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

  const handleCustomerMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReviewMedia(true);
    setReviewMediaUploadProgress(15);
    setReviewMediaUploadMsg(null);

    try {
      const activeCustomerName = (newReviewName.trim() || currentCustomer?.name || 'Customer').trim();
      const res = await uploadCustomerReviewPhoto(file, {
        productTitle: product?.name || 'Product',
        customerName: activeCustomerName,
        onProgress: (p) => setReviewMediaUploadProgress(p),
      });
      if (res && res.url) {
        setNewReviewPhotos((prev) => [...prev, res.url]);
        setPhotoInputUrl(res.url); // Automatically fill the photo URL input box with the Google Drive link!
        setReviewMediaUploadMsg(t('ছবি সফলভাবে গুগল ড্রাইভে আপলোড ও লিংক যুক্ত হয়েছে!', 'Photo successfully uploaded to Google Drive & link attached!'));
      }
    } catch (err: any) {
      console.warn('[Customer Media Upload Error]:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setNewReviewPhotos((prev) => [...prev, result]);
          setPhotoInputUrl(result);
          setReviewMediaUploadMsg(t('ফটো সংযুক্ত হয়েছে', 'Photo attached'));
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingReviewMedia(false);
      setReviewMediaUploadProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const reviewerName = (newReviewName.trim() || currentCustomer?.name || 'Valued Customer').trim();
    if (!reviewerName || !newReviewComment.trim()) return;

    const newReviewId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newReviewRecord: Review = {
      id: newReviewId,
      productId: product.id,
      productName: product.name,
      customerName: reviewerName,
      userName: reviewerName,
      customerEmail: currentCustomer?.email || '',
      rating: newReviewRating,
      comment: newReviewComment.trim(),
      photos: newReviewPhotos.filter((p) => typeof p === 'string' && p.trim() !== ''),
      status: 'approved', // Live & permanently visible across all devices, guest users, and accounts
      verifiedPurchase: true,
      createdAt: nowIso,
    };

    // 1. Immediately store in local submitted list so this customer ALWAYS sees their review permanently
    const updatedMyReviews = [newReviewId, ...mySubmittedReviewIds];
    setMySubmittedReviewIds(updatedMyReviews);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kenax_my_submitted_reviews', JSON.stringify(updatedMyReviews));
      } catch {}
    }

    // 2. Instantly update local reviews list (Optimistic UI)
    setDbReviewsList((prev) => [newReviewRecord, ...prev.filter((r) => r.id !== newReviewId)]);

    // 3. Instantly clear form inputs and show Thank You card!
    setNewReviewComment('');
    setNewReviewPhotos([]);
    setPhotoInputUrl('');
    setReviewSubmitted(true);
    setReviewMediaUploadMsg(null);
    if (typeof window !== 'undefined' && product?.id) {
      try {
        sessionStorage.setItem('kenax_reviewed_' + product.id, 'true');
      } catch {}
    }

    // 4. Save to Cloud Firestore & Google Drive permanently in background
    try {
      await saveReviewToDB(newReviewRecord);
    } catch (err) {
      console.warn('[Review Save DB Error]:', err);
    }
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
  }, [allProducts, product?.id, product?.category, product?.subcategory, product?.brand, product?.price]);

  if (!product) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-medium">{t('পণ্য লোড হচ্ছে...', 'Loading product...')}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen pb-16 animate-in fade-in duration-200">
      {/* 1. Breadcrumbs and Top Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Breadcrumb path */}
          <nav className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 overflow-x-auto py-0.5 scrollbar-none">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-medium cursor-pointer shrink-0"
            >
              {t('হোম', 'Home')}
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => {
                if (onSelectCategory) onSelectCategory('All');
                onNavigate('shop');
              }}
              className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-medium cursor-pointer shrink-0"
            >
              All Products
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              onClick={() => {
                if (onSelectCategory) onSelectCategory(product.category);
                onNavigate('shop');
              }}
              className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
            >
              {product.category}
            </button>
            {product.subcategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400 truncate max-w-[120px] sm:max-w-none">
                  {product.subcategory}
                </span>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-bold text-sky-700 dark:text-sky-400 truncate max-w-[140px] sm:max-w-[260px]">
              {product.name}
            </span>
          </nav>

          {/* Quick Back & Share Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareClick}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              title={t('লিংক শেয়ার বা কপি করুন', 'Share or Copy Product Link')}
            >
              <Share2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{copiedLink ? t('লিংক কপি হয়েছে!', 'Copied Link!') : t('শেয়ার', 'Share')}</span>
            </button>
            <button
              onClick={onBack ? onBack : () => onNavigate('shop')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs shadow-2xs group shrink-0"
              title={
                previousItem?.type === 'product' && previousItem.productName
                  ? t(`আগের প্রোডাক্টে ফিরে যান (${previousItem.productName})`, `Back to previous item (${previousItem.productName})`)
                  : t('আগের পেজে ফিরে যান', 'Go Back')
              }
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
              <span className="font-bangla whitespace-nowrap">
                {previousItem?.type === 'product'
                  ? t('আগের প্রোডাক্টে ফিরে যান', 'Previous Product')
                  : t('আগের পেজে ফিরে যান', 'Go Back')}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1536px] mx-auto px-0 sm:px-4 lg:px-6 pt-0 sm:pt-2">
        {/* 2. Main Product Showcase Box */}
        <div className="bg-white dark:bg-slate-900 rounded-none sm:rounded-3xl border-x-0 border-t-0 sm:border border-slate-200 dark:border-slate-800 shadow-none sm:shadow-sm overflow-hidden p-0 sm:p-4 lg:p-5">
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
                  className="relative aspect-square rounded-none sm:rounded-2xl bg-white sm:bg-slate-50 dark:bg-slate-900 sm:dark:bg-slate-850 border-b sm:border border-slate-200/90 dark:border-slate-800 overflow-hidden flex items-center justify-center shadow-none sm:shadow-xs group"
                >
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

                  {/* Left / Right Carousel Navigation Arrows (Desktop hover & Mobile) */}
                  {totalSlides > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrevSlide();
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:opacity-80 sm:hover:opacity-100 cursor-pointer z-20 hover:scale-110 active:scale-95"
                        aria-label="Previous Slide"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-700" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNextSlide();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:opacity-80 sm:hover:opacity-100 cursor-pointer z-20 hover:scale-110 active:scale-95"
                        aria-label="Next Slide"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-700" />
                      </button>
                    </>
                  )}

                  {/* Active Color Preview Pill */}
                  {activeColorImage && (
                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-slate-900/85 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 shadow-md z-10">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{selectedColor} Preview</span>
                    </div>
                  )}

                  {/* Video Toggle Button (Only when not already watching video) */}
                  {hasVideo && !showVideo && (
                    <button
                      onClick={() => {
                        setShowVideo(true);
                        setActiveColorImage(null);
                        setHoldUntil(Date.now() + 4000);
                      }}
                      className="absolute bottom-3 right-3 px-3.5 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-colors z-20"
                    >
                      <Play className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
                      <span>Watch Video</span>
                    </button>
                  )}
                </div>

                {/* Thumbnails Row */}
                <div className="flex items-center gap-2 sm:gap-2.5 mt-2.5 sm:mt-4 px-3 sm:px-0 overflow-x-auto pb-1 scrollbar-thin">
                  {validProductImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectImageSlide(idx)}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl border-2 overflow-hidden shrink-0 bg-white p-1 cursor-pointer transition-all ${
                        !showVideo && (selectedImageIndex === idx || activeColorImage === img)
                          ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-md scale-105'
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

                  {hasVideo && (
                    <button
                      type="button"
                      onClick={handleSelectVideoSlide}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl border-2 shrink-0 overflow-hidden bg-slate-950 group cursor-pointer transition-all ${
                        showVideo
                          ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-md scale-105'
                          : 'border-slate-200 hover:border-slate-400 dark:border-slate-700'
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
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-md">
                          <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white text-white ml-0.5" />
                        </div>
                      </div>
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
                  {product.brand && (
                    <span className="font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 px-2.5 py-1 rounded-lg border border-sky-100 dark:border-sky-800/80">
                      {product.brand}
                    </span>
                  )}
                  {product.brand && <span className="text-slate-300 dark:text-slate-600">•</span>}
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectCategory) onSelectCategory(product.category);
                      onNavigate('shop');
                    }}
                    className="font-black text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 uppercase tracking-wider text-[11px] sm:text-xs hover:underline cursor-pointer"
                  >
                    {product.category}
                  </button>
                  {product.sku && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-slate-400 dark:text-slate-400 font-mono text-[11px]">SKU: {product.sku}</span>
                    </>
                  )}
                </div>

                {/* Main Product Title */}
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {product.name}
                </h1>
                {product.banglaName && (
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-300 mt-1">{product.banglaName}</p>
                )}

                {/* Rating, Reviews count & In Stock Banner */}
                <div className="flex items-center gap-2 sm:gap-2.5 mt-3 pt-1 text-xs flex-wrap">
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-2.5 py-1 rounded-xl">
                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.floor(product.rating) ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-black text-amber-900 dark:text-amber-300">{product.rating}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      ({product.reviewsCount}
                      <span className="hidden sm:inline"> {t('টি কাস্টমার রিভিউ', 'customer reviews')}</span>)
                    </span>
                  </div>

                  {/* Clean Availability Badge without numeric numbers */}
                  {(() => {
                    const currentStatus = getProductStockStatus(product);
                    const info = getStockStatusInfo(currentStatus);
                    return (
                      <div className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl font-bold shrink-0 border ${info.badgeClass}`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${info.dotClass}`} />
                        <span>{language === 'bn' ? info.labelBn : info.labelEn}</span>
                      </div>
                    );
                  })()}

                  {/* Trending / Status Badge under Title beside Reviews and In Stock */}
                  {(product.saleBadge === 'Trending' || product.isTrending) ? (
                    <div className="flex items-center gap-1 bg-purple-100 dark:bg-purple-950/80 border border-purple-200/80 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-xl font-extrabold shrink-0 shadow-2xs">
                      <span>🔥</span>
                      <span>{language === 'bn' ? 'ট্রেন্ডিং' : 'Trending'}</span>
                    </div>
                  ) : product.saleBadge === 'Hot' || product.isHot ? (
                    <div className="flex items-center gap-1 bg-rose-100 dark:bg-rose-950/80 border border-rose-200/80 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-xl font-extrabold shrink-0 shadow-2xs">
                      <span>⚡</span>
                      <span>{language === 'bn' ? 'হট ডিল' : 'Hot Deal'}</span>
                    </div>
                  ) : product.saleBadge === 'New' || product.isNew ? (
                    <div className="flex items-center gap-1 bg-sky-100 dark:bg-sky-950/80 border border-sky-200/80 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 px-2.5 py-1 rounded-xl font-extrabold shrink-0 shadow-2xs">
                      <span>✨</span>
                      <span>{language === 'bn' ? 'নতুন' : 'New'}</span>
                    </div>
                  ) : product.saleBadge === 'Best Seller' || product.isBestSeller ? (
                    <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-xl font-extrabold shrink-0 shadow-2xs">
                      <span>🏆</span>
                      <span>{language === 'bn' ? 'বেস্ট সেলার' : 'Best Seller'}</span>
                    </div>
                  ) : product.saleBadge === 'Featured' || product.isFeatured ? (
                    <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-950/80 border border-amber-200/80 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-xl font-extrabold shrink-0 shadow-2xs">
                      <span>⭐</span>
                      <span>{language === 'bn' ? 'ফিচার্ড' : 'Featured'}</span>
                    </div>
                  ) : null}
                </div>

                {/* Short Description (if present) */}
                {product.shortDescription && product.shortDescription.trim() !== '' && (
                  <div className="mt-3.5 p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                    <FormattedText
                      content={product.shortDescription}
                      className="text-xs sm:text-sm text-slate-700 dark:text-slate-200"
                    />
                  </div>
                )}

                {/* Price Display */}
                <div className="mt-4 py-1">
                  <div className="flex flex-row items-center flex-nowrap gap-3 overflow-x-auto scrollbar-none whitespace-nowrap">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white shrink-0">
                      ৳ {(activeUnitPrice * quantity).toLocaleString('en-BD')}
                    </span>
                    {activeOriginalPrice > activeUnitPrice && (
                      <span className="text-base sm:text-lg text-slate-400 dark:text-slate-500 line-through font-semibold shrink-0">
                        ৳ {((activeOriginalPrice || activeUnitPrice) * quantity).toLocaleString('en-BD')}
                      </span>
                    )}
                    {quantity > 1 && (
                      <span className="text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/80 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800 shrink-0">
                        ৳{activeUnitPrice.toLocaleString('en-BD')} × {quantity}
                      </span>
                    )}
                    {matchedVariant && (
                      <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 shrink-0">
                        {t('নির্বাচিত:', 'Selected:')} {matchedVariant.name}
                      </span>
                    )}
                    {product.discountType === 'flat' && product.discountValue ? (
                      <span className="text-xs font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-800 shrink-0 whitespace-nowrap">
                        ৳{(product.discountValue * quantity).toLocaleString('en-BD')} {t('ছাড়', 'save')} ({product.discountPercent}% {t('ছাড়', 'OFF')})
                      </span>
                    ) : product.discountPercent && product.discountPercent > 0 ? (
                      <span className="text-xs font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-800 shrink-0 whitespace-nowrap">
                        {product.discountPercent}% {t('ছাড়', 'save')}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* VARIATIONS & CONTROLS: Color, Size & Quantity on One Single Line */}
                <div className="space-y-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {/* UNIFIED SINGLE ROW: Quantity, Color & Size on One Line */}
                  <div className="py-1">
                    <div className="flex flex-row items-center gap-3 sm:gap-4 flex-nowrap overflow-x-auto scrollbar-none py-1">
                      {/* 1. Quantity Stepper */}
                      <div className="shrink-0">
                        <div className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          {t('পরিমাণ', 'Quantity')}
                        </div>
                        <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 h-10 sm:h-11 px-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                            disabled={quantity <= 1}
                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 disabled:opacity-40 rounded-lg font-black text-sm transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white px-2 select-none min-w-[28px] text-center">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity((prev) => Math.min(product.stock || 99, prev + 1))}
                            disabled={quantity >= (product.stock || 99)}
                            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 disabled:opacity-40 rounded-lg font-black text-sm transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* 2. Color Variations */}
                      {product.colors && product.colors.length > 0 && (
                        <div className="shrink-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              {t('রং:', 'Color:')}
                            </span>
                            <span className="text-[10px] sm:text-xs font-extrabold text-sky-700 dark:text-sky-300">
                              {selectedColor || <span className="text-amber-500 dark:text-amber-400 font-bold animate-pulse">{t('সিলেক্ট করুন', 'Select Color')}</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-nowrap">
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
                                  className={`h-10 sm:h-11 px-3 rounded-xl border flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 shadow-2xs ${
                                    isSelected
                                      ? 'border-sky-600 bg-sky-600 text-white ring-2 ring-sky-300 dark:ring-sky-500/40'
                                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
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
                            <span className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              {t('সাইজ:', 'Size:')}
                            </span>
                            <span className="text-[10px] sm:text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
                              {selectedSize || <span className="text-amber-500 dark:text-amber-400 font-bold animate-pulse">{t('সিলেক্ট করুন', 'Select Size')}</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-nowrap">
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
                                  className={`h-10 sm:h-11 min-w-[40px] sm:min-w-[44px] px-3 rounded-xl border flex items-center justify-center text-xs sm:text-sm font-black transition-all cursor-pointer shrink-0 shadow-2xs ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-500/40'
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
                    </div>

                    {/* Variation Alert Banner on its own clean line below Quantity & Color/Size */}
                    {variationError && (
                      <div className="w-full mt-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm flex items-center gap-2.5 shadow-sm animate-in fade-in slide-in-from-top-1">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
                        <span className="flex-1">{variationError}</span>
                      </div>
                    )}
                  </div>

                  {/* Custom Variations (Storage, Edition, Material, etc. if any) */}
                  {product.variations && product.variations.length > 0 &&
                    product.variations.map((v) => (
                      <div key={v.id || v.name} className="py-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                          {t(`${v.name} নির্বাচন করুন:`, `Select ${v.name}:`)} <span className="text-sky-700 dark:text-sky-300 font-black">{selectedCustomOptions[v.name]}</span>
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
                                    ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/20 shadow-xs'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
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
                  <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/90 dark:bg-slate-900/95 border border-amber-300 dark:border-amber-500/50 text-xs shadow-xs dark:shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                    <div className="flex items-center justify-between font-bold text-amber-950 dark:text-amber-300 mb-2.5">
                      <span className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-amber-950 dark:text-amber-300">
                        <span>🔒 Staff Sourcing Data</span>
                      </span>
                      <span className="text-[10px] bg-amber-200/90 dark:bg-amber-500/20 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 px-2.5 py-0.5 rounded-lg uppercase font-black tracking-wider">
                        {product.productType === 'own' ? 'In-House Stock' : 'Dropship / Direct Import'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 bg-white/90 dark:bg-slate-950/90 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-500/30 text-xs mb-2.5">
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Cost Price</span>
                        <span className="font-black text-slate-900 dark:text-amber-200 text-sm">
                          {product.costPrice ? `৳ ${product.costPrice.toLocaleString('en-BD')}` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Est. Profit</span>
                        <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                          {profitBDT > 0 ? `+৳ ${profitBDT.toLocaleString('en-BD')}` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 dark:text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Margin</span>
                        <span className="font-black text-sky-700 dark:text-sky-400 text-sm">{marginPercent}%</span>
                      </div>
                    </div>
                    {product.supplierUrl && (
                      <a
                        href={product.supplierUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full gap-2 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 dark:from-amber-400 dark:to-amber-500 dark:hover:from-amber-300 dark:hover:to-amber-400 px-3.5 py-2 rounded-xl shadow-xs dark:shadow-[0_0_12px_rgba(245,158,11,0.35)] transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        <span className="truncate">Open Supplier Product Page ({product.supplierName || 'AliExpress / Alibaba'})</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: Add to Cart, Buy Now, Wishlist */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                {addedFeedback && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{t('পণ্যটি সফলভাবে কার্টে যোগ হয়েছে!', 'Product successfully added to your shopping cart!')}</span>
                  </div>
                )}

                {(() => {
                  const currentStatus = getProductStockStatus(product);
                  if (currentStatus === 'out_of_stock') {
                    return (
                      <div className="flex items-center gap-2">
                        <button
                          disabled
                          className="flex-1 py-3.5 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-80"
                        >
                          <AlertCircle className="w-5 h-5 text-rose-500" />
                          <span>{t('স্টক শেষ', 'Out of Stock')}</span>
                        </button>
                        <button
                          onClick={() => onToggleWishlist(product)}
                          className={`p-3.5 rounded-2xl border flex items-center justify-center transition-all cursor-pointer ${
                            isWishlisted
                              ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-600 dark:fill-rose-400' : ''}`} />
                        </button>
                      </div>
                    );
                  }
                  if (currentStatus === 'upcoming') {
                    return (
                      <div className="flex items-center gap-2">
                        <button
                          disabled
                          className="flex-1 py-3.5 px-6 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-sm flex items-center justify-center gap-2 border border-purple-200 dark:border-purple-800"
                        >
                          <Clock className="w-5 h-5 text-purple-600" />
                          <span>{t('শীঘ্রই আসছে (আপকামিং)', 'Upcoming Product')}</span>
                        </button>
                        <button
                          onClick={() => onToggleWishlist(product)}
                          className={`p-3.5 rounded-2xl border flex items-center justify-center transition-all cursor-pointer ${
                            isWishlisted
                              ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-600 dark:fill-rose-400' : ''}`} />
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-3 min-w-0">
                      {/* Add to Cart Button */}
                      <button
                        onClick={handleAddToCartClick}
                        className="col-span-1 sm:col-span-6 py-2.5 sm:py-3.5 px-2 sm:px-6 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2.5 transition-all shadow-md cursor-pointer min-w-0 overflow-hidden"
                      >
                        <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        <span className="truncate">{t('কার্টে যোগ করুন', 'Add to Cart')}</span>
                      </button>

                      {/* Buy Now Button (Direct checkout) */}
                      <button
                        onClick={handleBuyNowClick}
                        className="col-span-1 sm:col-span-5 py-2.5 sm:py-3.5 px-2 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all shadow-lg shadow-sky-600/20 cursor-pointer min-w-0 overflow-hidden"
                      >
                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-300 text-amber-300 shrink-0" />
                        <span className="truncate">{t('অর্ডার করুন', 'Buy Now')} • ৳{(product.price * quantity).toLocaleString('en-BD')}</span>
                      </button>

                      {/* Wishlist Button */}
                      <button
                        onClick={() => onToggleWishlist(product)}
                        className={`hidden sm:flex sm:col-span-1 p-3.5 rounded-2xl border items-center justify-center transition-all cursor-pointer ${
                          isWishlisted
                            ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                        title={isWishlisted ? t('উইশলিস্ট থেকে মুছুন', 'Remove from Wishlist') : t('উইশলিস্টে যোগ করুন', 'Add to Wishlist')}
                      >
                        <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-600 dark:fill-rose-400' : ''}`} />
                      </button>
                    </div>
                  );
                })()}

                {/* Secondary Actions: Share */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleShareClick}
                    className="py-2 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title={t('প্রোডাক্ট লিংক শেয়ার করুন', 'Share Product Link')}
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    <span>{copiedLink ? t('লিংক কপি হয়েছে!', 'Copied Link!') : t('শেয়ার করুন', 'Share Product')}</span>
                  </button>
                </div>

                {/* End of Product Actions */}
              </div>
            </div>
          </div>
        </div>

        {/* 3. In-Depth Tabs Section (Description, Specifications, Customer Reviews, Shipping Policy) */}
        <div className="mt-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Tabs Navigation */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-slate-50/70 dark:bg-slate-850/80">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'details'
                  ? 'border-sky-600 text-sky-700 dark:text-sky-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Package className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>{t('বিবরণ', 'Description')}</span>
            </button>

            {hasSpecifications && (
              <button
                onClick={() => setActiveTab('specs')}
                className={`px-6 py-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'specs'
                    ? 'border-sky-600 text-sky-700 dark:text-sky-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Award className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>{t('স্পেসিফিকেশন', 'Specifications')}</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-6 py-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'reviews'
                  ? 'border-sky-600 text-sky-700 dark:text-sky-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>{t('রিভিউ', 'Reviews')} ({reviews.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('shipping')}
              className={`px-6 py-4 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'shipping'
                  ? 'border-sky-600 text-sky-700 dark:text-sky-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>{t('ডেলিভারি ও ওয়ারেন্টি', 'Delivery & Warranty')}</span>
            </button>
          </div>

          {/* Tab Content Panes */}
          <div className="p-6 sm:p-8">
            {/* TAB 1: Product Description */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-3">{t('প্রোডাক্ট বিবরণ', 'Product Overview')}</h3>
                  <FormattedText
                    content={product.description}
                    fallback={`${product.name} is built with top-tier materials to ensure maximum performance and durability. Tested and verified for high satisfaction.`}
                    className="text-sm text-slate-700 dark:text-slate-300"
                  />
                </div>

                {/* Key Highlights */}
                {(() => {
                  const highlightsToRender = product.keyHighlights && Array.isArray(product.keyHighlights)
                    ? product.keyHighlights.filter((h: any) => (typeof h === 'string' ? true : h.active !== false))
                    : DEFAULT_PRODUCT_HIGHLIGHTS;

                  if (highlightsToRender.length === 0) return null;

                  return (
                    <div className="p-5 rounded-2xl bg-sky-50/60 dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700/80">
                      <h4 className="text-xs font-black uppercase tracking-wider text-sky-900 dark:text-sky-300 mb-3 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        <span>{t('মূল বৈশিষ্ট্য ও সুবিধাসমূহ', 'Key Highlights & Benefits')}</span>
                      </h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700 dark:text-slate-200 font-medium">
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
                                className="w-4 h-4 shrink-0"
                              />
                              <span>{text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* TAB 2: Specifications Table */}
            {activeTab === 'specs' && (
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">{t('টেকনিক্যাল স্পেসিফিকেশন', 'Technical Specifications')}</h3>
                {product.specifications && Object.keys(product.specifications).length > 0 ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs sm:text-sm text-left">
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        <tr className="bg-slate-50 dark:bg-slate-800/60">
                          <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-400 w-1/3">{t('ব্র্যান্ড', 'Brand')}</td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">{product.brand}</td>
                        </tr>
                        <tr className="bg-white dark:bg-slate-900">
                          <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-400">{t('ক্যাটাগরি', 'Category')}</td>
                          <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">{product.category}</td>
                        </tr>
                        {product.subcategory && (
                          <tr className="bg-slate-50 dark:bg-slate-800/60">
                            <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-400">{t('সাব-ক্যাটাগরি', 'Sub-category')}</td>
                            <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">{product.subcategory}</td>
                          </tr>
                        )}
                        {Object.entries(product.specifications).map(([key, val], idx) => (
                          <tr key={key} className={idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-800/60' : 'bg-white dark:bg-slate-900'}>
                            <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-400">{key}</td>
                            <td className="py-3 px-4 text-slate-900 dark:text-slate-100 font-medium">{val}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('এই পণ্যের জন্য স্ট্যান্ডার্ড স্পেসিফিকেশন প্রযোজ্য।', 'Standard specifications apply for this item.')}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Customer Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-8">
                {/* Rating Overview Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 items-center">
                  <div className="text-center md:border-r border-slate-200 dark:border-slate-800 md:pr-6">
                    <span className="text-5xl font-black text-slate-900 dark:text-white">{product.rating}</span>
                    <div className="flex items-center justify-center text-amber-400 my-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(product.rating) ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {t(`${reviews.length}টি ভেরিফাইড পর্যালোচনার ভিত্তিতে`, `Based on ${reviews.length} verified reviews`)}
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-1.5 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-600 dark:text-slate-300 font-bold">{t('৫ স্টার', '5 Stars')}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full w-[85%]"></div>
                      </div>
                      <span className="w-10 text-right text-slate-500 dark:text-slate-400 font-semibold">85%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-600 dark:text-slate-300 font-bold">{t('৪ স্টার', '4 Stars')}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full w-[12%]"></div>
                      </div>
                      <span className="w-10 text-right text-slate-500 dark:text-slate-400 font-semibold">12%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-600 dark:text-slate-300 font-bold">{t('৩ স্টার', '3 Stars')}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full w-[3%]"></div>
                      </div>
                      <span className="w-10 text-right text-slate-500 dark:text-slate-400 font-semibold">3%</span>
                    </div>
                  </div>
                </div>

                {/* Write a Review Section */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{t('কাস্টমার রিভিউ লিখুন', 'Write a Customer Review')}</h4>
                    {hasPurchasedAndDelivered && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {t('ভেরিফাইড ক্রেতা', 'Verified Buyer')}
                      </span>
                    )}
                  </div>

                  {reviewSubmitted ? (
                    <div className="p-6 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-center space-y-4 shadow-sm animate-in fade-in duration-200">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-base sm:text-lg font-black text-emerald-900 dark:text-emerald-100">
                          {t('ধন্যবাদ! আপনার রিভিউটি সফলভাবে জমা দেওয়া হয়েছে।', 'Thank you! Your review has been submitted.')}
                        </h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 max-w-lg mx-auto leading-relaxed">
                          {t(
                            'আপনার মূল্যবান মতামত ও গুগল ড্রাইভে আপলোডকৃত ছবি সফলভাবে সংরক্ষিত হয়েছে। রিভিউটি অ্যাডমিন প্যানেলে পাঠানো হয়েছে এবং অ্যাডমিন অনুমোদন করার সাথে সাথে সবার জন্য উন্মুক্ত হবে। নিচে সাম্প্রতিক রিভিউ তালিকায় আপনার দেওয়া রিভিউটি যুক্ত করা হয়েছে।',
                            'Thank you for submitting your review! Your review and Google Drive photos have been safely recorded. It has been sent to the Admin Dashboard for approval and will appear publicly once approved. Your review has also been added to the recent reviews list below.'
                          )}
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewSubmitted(false);
                            if (typeof window !== 'undefined' && product?.id) {
                              try {
                                sessionStorage.removeItem('kenax_reviewed_' + product.id);
                              } catch {}
                            }
                            setNewReviewComment('');
                            setNewReviewPhotos([]);
                            setPhotoInputUrl('');
                            setNewReviewRating(5);
                          }}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{t('আরেকটি রিভিউ দিন (Add Another Review)', 'Add Another Review')}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      {hasPurchasedAndDelivered ? (
                        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>
                            {t('আপনি সফলভাবে পণ্যটি গ্রহণ করেছেন। আপনার রিভিউটিতে ভেরিফাইড ক্রেতা ব্যাজ থাকবে।', `You purchased and received this product (${currentCustomer?.name || 'Customer'}). Your review will have a Verified Purchase badge.`)}
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>
                            {t('পণ্যটি সম্পর্কে আপনার বাস্তব অভিজ্ঞতা ও রেটিং দিন। আপনার মতামত আমাদের জন্য মূল্যবান।', 'Share your genuine review and rating. Your feedback helps other shoppers.')}
                          </span>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('আপনার রেটিং:', 'Your Rating:')}</label>
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
                                  star <= newReviewRating ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                                }`}
                              />
                            </button>
                          ))}
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-2">
                            {newReviewRating === 5
                              ? t('৫ - অসাধারণ!', '5 - Excellent!')
                              : newReviewRating === 4
                              ? t('৪ - খুব ভালো', '4 - Very Good')
                              : newReviewRating === 3
                              ? t('৩ - মোটামুটি', '3 - Average')
                              : t('২ - সাধারণ', '2 - Below Average')}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('আপনার নাম *', 'Your Name *')}</label>
                          <input
                            type="text"
                            required
                            value={newReviewName || currentCustomer?.name || ''}
                            onChange={(e) => setNewReviewName(e.target.value)}
                            placeholder={currentCustomer?.name || t('উদা: সাকিব আল হাসান', 'e.g. Shakib Al Hasan')}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('আপনার রিভিউ *', 'Your Review *')}</label>
                        <textarea
                          required
                          rows={3}
                          value={newReviewComment}
                          onChange={(e) => setNewReviewComment(e.target.value)}
                          placeholder={t('পণ্যটি সম্পর্কে আপনার বাস্তব অভিজ্ঞতা লিখুন...', 'Share details of your experience with this product...')}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-sky-500"
                        />
                      </div>

                      {/* Photo & Video Upload Section */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            {t('ছবি বা ভিডিও সংযুক্তি (ঐচ্ছিক)', 'Upload Photos or Videos (Optional)')}
                          </label>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>{t('নিরাপদ আপলোড', 'Secure Upload')}</span>
                          </span>
                        </div>

                        {/* Upload Status / Progress */}
                        {isUploadingReviewMedia && (
                          <div className="p-2.5 mb-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-xs font-semibold text-sky-800 dark:text-sky-300 flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                            <span>{t('ছবি আপলোড হচ্ছে...', 'Uploading photo...')} ({reviewMediaUploadProgress}%)</span>
                          </div>
                        )}
                        {reviewMediaUploadMsg && (
                          <div className="p-2 mb-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{reviewMediaUploadMsg}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => customerFileInputRef.current?.click()}
                            disabled={isUploadingReviewMedia}
                            className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                          >
                            <FolderUp className="w-3.5 h-3.5" />
                            <span>{t('ডিভাইস থেকে ছবি আপলোড করুন', 'Upload from Device')}</span>
                          </button>
                          <input
                            ref={customerFileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleCustomerMediaUpload}
                            className="hidden"
                          />

                          <div className="flex-1 flex items-center gap-1.5 min-w-[240px]">
                            <input
                              type="url"
                              value={photoInputUrl}
                              onChange={(e) => setPhotoInputUrl(e.target.value)}
                              placeholder={t('গুগল ড্রাইভ বা ছবির সরাসরি লিংক...', 'Google Drive or image link...')}
                              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-sky-500 font-mono"
                            />
                            {photoInputUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (photoInputUrl) {
                                    navigator.clipboard.writeText(photoInputUrl);
                                    setReviewMediaUploadMsg(t('গুগল ড্রাইভ লিংক কপি হয়েছে!', 'Drive link copied!'));
                                    setTimeout(() => setReviewMediaUploadMsg(null), 3000);
                                  }
                                }}
                                className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                                title="Copy Drive Link"
                              >
                                {t('কপি লিংক', 'Copy Link')}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (photoInputUrl.trim()) {
                                  const resolved = resolveGoogleDriveUrl(photoInputUrl.trim());
                                  if (!newReviewPhotos.includes(resolved)) {
                                    setNewReviewPhotos([...newReviewPhotos, resolved]);
                                  }
                                  setPhotoInputUrl('');
                                }
                              }}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                            >
                              {t('+ যোগ', '+ Add')}
                            </button>
                          </div>
                        </div>

                        {newReviewPhotos.filter((p) => typeof p === 'string' && p.trim() !== '').length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {newReviewPhotos.filter((p) => typeof p === 'string' && p.trim() !== '').map((pUrl, idx) => {
                              const isVid = pUrl.includes('.mp4') || pUrl.includes('.webm') || pUrl.includes('video');
                              return (
                                <div key={idx} className="relative w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 group">
                                  {isVid ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white">
                                      <Film className="w-5 h-5 text-sky-400" />
                                      <span className="text-[9px] font-bold">Video</span>
                                    </div>
                                  ) : (
                                    <img
                                      src={getDriveDirectImageUrl(pUrl)}
                                      alt="Review upload"
                                      className="w-full h-full object-cover"
                                      onError={(e) => handleImageErrorFallback(e, pUrl)}
                                    />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setNewReviewPhotos(newReviewPhotos.filter((_, i) => i !== idx))}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center opacity-90 hover:opacity-100 cursor-pointer"
                                    title="Remove photo"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{t('রিভিউ জমা দিন', 'Submit Review')}</span>
                      </button>
                    </form>
                  )}
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">{t('সাম্প্রতিক কাস্টমার রিভিউ', 'Recent Customer Reviews')}</h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="py-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs">
                              {rev.userName.charAt(0)}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">{rev.userName}</span>
                              {rev.verifiedPurchase && (
                                <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md font-bold">
                                  ✓ {t('ভেরিফাইড ক্রেতা', 'Verified Buyer')}
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
                                i < rev.rating ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          ))}
                        </div>

                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{rev.comment}</p>

                        {rev.photos && rev.photos.filter((p) => typeof p === 'string' && p.trim() !== '').length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {rev.photos.filter((p) => typeof p === 'string' && p.trim() !== '').map((pImg, pIdx) => {
                              const isVid = pImg.includes('.mp4') || pImg.includes('.webm') || pImg.includes('video');
                              if (isVid) {
                                return (
                                  <div
                                    key={pIdx}
                                    className="w-24 sm:w-28 h-18 sm:h-20 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-black shadow-2xs"
                                  >
                                    <video src={pImg} controls className="w-full h-full object-cover" />
                                  </div>
                                );
                              }
                              return (
                                <a
                                  key={pIdx}
                                  href={pImg}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 hover:opacity-90 transition-opacity block shadow-2xs"
                                  title="Click to view full photo"
                                >
                                  <img
                                    src={getDriveDirectImageUrl(pImg)}
                                    alt="Review attachment"
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                    onError={(e) => handleImageErrorFallback(e, pImg)}
                                  />
                                </a>
                              );
                            })}
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
              <div className="space-y-6 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>{t('ডেলিভারি সময় ও চার্জ', 'Delivery Timelines & Charges')}</span>
                    </h4>
                    <ul className="space-y-2 mt-3 text-slate-600 dark:text-slate-300 font-medium">
                      <li>• <strong>{t('ঢাকার ভিতরে:', 'Inside Dhaka:')}</strong> {t('২৪-৪৮ ঘণ্টার মধ্যে', '24-48 Hours')} ({t('চার্জ:', 'Charge:')} ৳{safeInsideDhaka})</li>
                      <li>• <strong>{t('ঢাকার বাইরে:', 'Outside Dhaka:')}</strong> {t('২-৩ দিনের মধ্যে সব জেলায়', '2-3 Days across all districts')} ({t('চার্জ:', 'Charge:')} ৳{safeOutsideDhaka})</li>
                      <li>• <strong>{t('কুরিয়ার পার্টনার:', 'Courier Partners:')}</strong> Steadfast Courier & Pathao Logistics</li>
                      <li>• <strong>{t('ট্র্যাকিং:', 'Tracking:')}</strong> {t('প্রতিটি পার্সেলের জন্য রিয়েল-টাইম এসএমএস ও ট্র্যাকিং সুবিধা', 'Real-time SMS and web tracking provided for all shipments')}</li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>{t('ওয়ারেন্টি ও রিটার্ন সাপোর্ট', 'Warranty & Return Support')}</span>
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
                      {t('যদি আপনি কোনো ত্রুটিপূর্ণ, ভাঙা বা ভুল পণ্য পেয়ে থাকেন, অনুগ্রহ করে ৭ দিনের মধ্যে আমাদের কাস্টমার সাপোর্টে যোগাযোগ করুন। আমরা সম্পূর্ণ বিনামূল্যে রিপ্লেসমেন্ট বা রিফান্ড প্রদান করব।', 'If you receive a defective, damaged, or incorrect item, please notify our customer support team within 7 days. We will provide a free replacement or instant refund under our guarantee.')}
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
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {t('সম্পর্কিত পণ্যসমূহ', 'Similar Products')}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {product.category} {product.subcategory ? `• ${product.subcategory}` : ''}
              </p>
            </div>

            <button
              onClick={() => {
                if (onSelectCategory) onSelectCategory(product.category);
                onNavigate('shop');
              }}
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <span>{t(`${product.category}-এ আরও দেখুন`, `View More in ${product.category}`)}</span>
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
                  window.scrollTo({ top: 0, behavior: 'instant' });
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

export default ProductPageView;
