export type UserRole = 'super_admin' | 'manager' | 'admin' | 'moderator' | 'customer';

export type ProductType = 'own' | 'dropshipping' | 'aliexpress' | 'alibaba';

export interface ColorVariation {
  colorName?: string; // e.g. "Green", "Red", "Black"
  name: string; // e.g. "Green", "Red", "Black"
  colorCode?: string; // hex code like "#10B981" or "#EF4444"
  hexCode?: string; // hex code like "#10B981" or "#EF4444"
  imageUrl?: string; // specific product image linked to this color!
  inStock?: boolean;
}

export type VariationType = 'color' | 'size' | 'weight' | 'storage' | 'material' | 'custom';

export interface ProductVariationOption {
  id: string;
  type?: VariationType;
  name: string; // "Color", "Size", "Storage", or custom name like "Edition"
  values?: string[]; // ["S", "M", "L", "XL"] or ["128GB", "256GB"]
  options?: string[]; // ["S", "M", "L", "XL"] or ["128GB", "256GB"]
  colorItems?: ColorVariation[]; // If color, stores the colorName + colorCode + linked imageUrl!
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "8GB / 256GB" or "Black" or "Size 42"
  priceModifier?: number;
  stock: number;
  sku: string;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  slug?: string; // Custom URL slug (e.g. smart-watch-t800 or offer-t800)
  banglaName?: string;
  category: string;
  categoryName?: string;
  subcategory?: string;
  subSubcategory?: string; // Child subcategory (3rd tier)
  childSubcategory?: string; // Alias for subSubcategory
  brand: string;
  price: number; // in ৳ BDT
  originalPrice: number; // in ৳ BDT
  compareAtPrice?: number;
  costPrice?: number; // internal supplier cost in ৳ BDT
  discountPercent?: number;
  stock: number;
  sku: string;
  images: string[];
  videoUrl?: string;
  description: string;
  specifications?: Record<string, string>;
  productType: ProductType;
  supplierName?: string;
  supplierUrl?: string;
  supplierSku?: string;
  rating: number;
  reviewsCount: number;
  isBestSeller?: boolean;
  isNew?: boolean;
  isHot?: boolean;
  isTrending?: boolean;
  isFeatured?: boolean;
  saleBadge?: 'Trending' | 'New' | 'Best Seller' | 'Hot' | 'Featured' | 'None' | string;
  discountType?: 'percentage' | 'flat' | 'none';
  discountValue?: number; // e.g. 10 for 10% or 500 for ৳500 flat
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  // Variations & Color-linked images
  variations?: ProductVariationOption[];
  colors?: ColorVariation[];
  sizes?: string[];
  variants?: ProductVariant[];
  [key: string]: any;
}

export interface SubCategoryItem {
  id: string;
  name: string;
  icon?: string;
  subSubcategories?: string[];
}

export interface Category {
  id: string;
  name: string;
  banglaName?: string;
  slug: string;
  icon: string;
  itemCount: number;
  featuredImage?: string;
  subcategories?: (string | SubCategoryItem)[];
  priority?: number;
}

export interface DeliveryAddress {
  id?: string;
  label?: 'Home' | 'Office' | 'Other' | string;
  fullName?: string;
  mobileNumber?: string;
  recipientName?: string;
  recipientPhone?: string;
  email?: string;
  division: string;
  district: string;
  upazila: string;
  area?: string;
  houseRoad?: string;
  fullAddress: string;
  postalCode?: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
}

export type OrderStatus =
  | 'Pending'
  | 'Payment Verification'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned'
  | 'Refunded'
  | 'Rejected'
  | string;

export type PaymentMethod = 'Cash on Delivery' | 'bKash' | 'Nagad' | 'Rocket' | string;

export type PaymentOptionType = 'cod' | 'full' | 'delivery_only';
export type PaymentGatewayAccountType = 'Personal' | 'Merchant' | 'Agent' | 'Card' | 'Bank' | string;
export type PaymentGatewayTxType = 'Send Money' | 'Payment' | 'Cash Out' | 'Card Payment' | 'Bank Transfer' | string;
export type PaymentAssignedCategory = 'all' | 'full' | 'delivery_only' | 'cod';

export interface PaymentGatewayConfig {
  id: string;
  name: string;
  accountNumber: string;
  accountType: PaymentGatewayAccountType;
  txType: PaymentGatewayTxType;
  instructions: string;
  isEnabled: boolean;
  qrCodeUrl?: string;
  assignedTo?: PaymentAssignedCategory; // Where to show: 'all' | 'full' | 'delivery_only' | 'cod'
  isCustom?: boolean;
}

export type PaymentStatus =
  | 'Pending Verification'
  | 'Verified'
  | 'Paid on Delivery'
  | 'Rejected'
  | 'Paid'
  | 'Pending'
  | 'Submitted'
  | string;

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  variant?: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedVariation?: string;
  selectedColorImage?: string;
  quantity: number;
  price: number; // in BDT
  total: number;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  
  // Delivery Address Snapshot (immutable)
  deliveryName: string;
  deliveryMobile: string;
  division: string;
  district: string;
  upazila: string;
  area: string;
  houseRoad?: string;
  fullAddress: string;
  postalCode?: string;
  deliveryInstructions?: string;
  customerDivision?: string;
  deliveryAddress?: string;
  
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  discountAmount?: number;
  couponCode?: string;
  totalAmount: number; // in ৳ BDT
  
  // Payment
  paymentMethod: PaymentMethod;
  paymentOptionType?: PaymentOptionType; // 'cod' | 'full' | 'delivery_only'
  paymentStatus: PaymentStatus;
  senderMobileNumber?: string;
  transactionId?: string;
  paidAmount?: number;
  dueAmount?: number;
  paymentVerifiedAt?: string;
  advancePaidVerified?: boolean;
  
  // Shipping & Courier
  orderStatus: OrderStatus;
  courierName?: string; // Steadfast, Pathao, RedX, eCourier, Paperfly
  courierOrderId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  
  timeline: OrderTimelineEvent[];
  createdAt: string;
  updatedAt: string;
  
  // Staff attribution fields for order creation & processing
  createdByStaffId?: string;
  createdByStaffName?: string;
  isV2Order?: boolean;
  createdByStaffRole?: string;
  handledByStaffId?: string;
  handledByStaffName?: string;
  handledByStaffRole?: string;
  [key: string]: any;
}

export interface DeliveryZone {
  id: string;
  name: string;
  division: string;
  charge: number; // BDT
  estimatedTime: string;
  isActive: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountPercent?: number;
  discountAmount?: number;
  minSpend?: number;
  minPurchase?: number;
  maxDiscount?: number;
  expiryDate?: string;
  validUntil?: string;
  usageLimit?: number;
  usedCount?: number;
  usageCount?: number;
  isActive: boolean;
}

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  customerName: string;
  userName?: string;
  customerEmail: string;
  rating: number;
  comment: string;
  photos?: string[];
  verifiedPurchase: boolean;
  status: 'approved' | 'pending' | 'rejected' | 'hidden';
  createdAt: string;
}

export type EmailTemplateType =
  | 'user_welcome'
  | 'user_add_to_cart'
  | 'user_order_placed'
  | 'user_order_confirmed'
  | 'user_order_processing'
  | 'user_order_picked'
  | 'staff_new_user_registered'
  | 'staff_cart_wishlist_alert'
  | 'staff_new_order_alert'
  | 'super_admin_audit_alert'
  | string;

export interface EmailTemplate {
  id: string;
  title: string;
  banglaTitle?: string;
  category?: 'user' | 'staff' | 'super_admin' | string;
  subject: string;
  description?: string;
  variables?: string[];
  sampleData?: Record<string, string>;
  htmlContent?: string;
  enabled?: boolean;
  
  // Customizable structured content fields (directly editable by admin)
  headline?: string;
  bodyMessage?: string;
  highlightNote?: string;
  buttonText?: string;
  buttonUrl?: string;
  footerNote?: string;

  // Legacy compatibility fields
  event?: string;
  message?: string;
  isActive?: boolean;
}

export interface EmailLog {
  id: string;
  to?: string;
  recipient?: string;
  recipientRole?: 'Customer' | 'Admin' | 'Super Admin' | 'Moderator' | 'Manager' | string;
  type?: string;
  emailType?: string;
  templateName?: string;
  subject: string;
  html?: string;
  text?: string;
  status: 'Sent' | 'Delivered' | 'Simulated' | 'Failed' | 'Pending';
  actorName?: string;
  actorRole?: string;
  orderId?: string;
  timestamp?: string;
  sentDate?: string;
  error?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface GoogleSheetsSyncLog {
  id: string;
  lastSync: string;
  status: 'Success' | 'In Progress' | 'Failed';
  syncedOrders: number;
  syncedProducts: number;
  syncedCustomers: number;
  syncedPayments: number;
  error?: string;
}

export interface AuditLog {
  id: string;
  user: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface SEOSettings {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  googleSiteVerification?: string;
  canonicalUrl?: string;
  robotsTxtContent?: string;
}

export interface NavItem {
  id: string;
  label: string;
  targetView: string; // 'home', 'shop', 'tag:Flash Sale', 'tag:New Arrivals', 'tag:Deals', 'tag:Mobile', 'tag:Xiaomi', etc.
  priority: number;
  isHot?: boolean;
  badgeText?: string;
  badgeColor?: string;
  enabled: boolean;
}

export interface PromoBannerItem {
  id: string;
  badge?: string;
  badgeIcon?: 'zap' | 'sparkles' | 'flame' | 'tag' | 'gift' | 'star' | 'shield' | 'check' | 'none' | string;
  badgeColor?: 'sky' | 'rose' | 'amber' | 'emerald' | 'purple' | 'blue' | 'indigo' | string;
  title: string;
  highlightText?: string;
  subtitle?: string;
  description?: string;
  
  // Media & Background Image
  backgroundImage?: string;
  mobileBackgroundImage?: string;
  gradientTheme?: string;
  overlayOpacity?: number; // 0-100%

  // Visibility & Device Targeting
  enabled?: boolean; // Overall active/deactivate
  showOnDesktop?: boolean; // Show on Desktop
  showOnMobile?: boolean; // Show on Mobile

  // Action Button
  buttonText?: string;
  buttonLink?: string;
  buttonVariant?: 'primary' | 'secondary' | 'dark' | 'whatsapp' | 'emerald' | 'amber' | 'outline';

  // Toggle internal elements
  showBadge?: boolean;
  showButton?: boolean;
  showSubtitle?: boolean;
}

export interface PromoGridPlacementSettings {
  // Homepage
  showOnHomepage?: boolean;
  homepagePosition?: 'after_category_nav' | 'after_popular_products' | 'bottom_before_footer' | string;

  // Shop / All Products Page
  showOnShopPage?: boolean;
  shopPosition?: 'top_above_filters' | 'between_categories_and_products' | 'middle_products' | 'bottom_below_products' | string;

  // Specific / All Category Pages (e.g. Electronics & Gadgets, Fashion, etc.)
  showOnCategoryPages?: boolean;
  categoryFilterMode?: 'all' | 'specific';
  selectedCategoryNames?: string[];
  categoryPosition?: 'top_above_products' | 'middle_products' | 'bottom_below_products' | string;

  // Flash Sale / Deals
  showOnFlashSalePage?: boolean;
  flashSalePosition?: 'top_below_countdown' | 'middle_deals' | 'bottom_below_deals' | string;

  // Other Tag Collection Pages (Trending, New Arrivals, etc.)
  showOnTagPages?: boolean;
  tagFilterMode?: 'all' | 'specific';
  selectedTags?: string[];
  tagPosition?: 'top_above_products' | 'middle_products' | 'bottom_below_products' | string;
}

export interface PromoGridSettings {
  enabled?: boolean;
  showOnDesktop?: boolean;
  showOnMobile?: boolean;
  sectionTitle?: string;
  banners?: PromoBannerItem[];
  placements?: PromoGridPlacementSettings;
}

export interface WebsiteSettings {
  id?: string;
  siteName: string;
  tagline?: string;
  bengaliTagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  insideDhakaDeliveryCharge?: number;
  outsideDhakaDeliveryCharge?: number;
  insideDhakaDeliveryFee?: number;
  outsideDhakaDeliveryFee?: number;
  deliveryInsideDhaka?: number;
  deliveryOutsideDhaka?: number;
  announcementBarText?: string;
  freeDeliveryThreshold?: number;
  bkashNumber?: string;
  nagadNumber?: string;
  rocketNumber?: string;
  sheetsSyncEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  heroBanners?: HeroBannerItem[];
  heroFeatures?: HeroFeatureTag[];
  heroSideBanner?: HeroSideBannerSettings;
  codBannerImage?: string;
  flashSaleBanner?: FlashSaleBannerSettings;
  promoGrid?: PromoGridSettings;
  promoBanners?: PromoBannerItem[];
  privacyPolicy?: string;
  termsOfService?: string;
  refundPolicy?: string;
  faqs?: FAQItem[];
  customLogo?: string;
  seoSettings?: SEOSettings;
  tagCollectionBanners?: Record<string, TagCollectionSlide[]>;
  navigationItems?: NavItem[];
  [key: string]: any;
}

export interface TagCollectionButton {
  id: string;
  text: string;
  link: string; // 'shop', 'trending', 'whatsapp', or custom url
  variant?: 'primary' | 'secondary' | 'emerald' | 'whatsapp' | 'outline';
}

export interface TagCollectionStat {
  id: string;
  label: string;
  value: string;
}

export interface TagCollectionSlide {
  id: string;
  badge?: string; // e.g. "FLASH SALE" or "NEW ARRIVALS"
  title: string; // e.g. "Flash Sale Collection"
  subtitle?: string;
  description?: string; // e.g. "Explore authentic items tagged under Flash Sale..."
  bengaliText?: string;
  itemCountText?: string; // e.g. "14 Items Available" (Stat #1)
  stockStatusText?: string; // e.g. "100% Verified Stock" (Stat #2)
  
  // Media & Background Image (Custom uploaded image URL or gradient theme)
  backgroundImage?: string; // High-resolution custom background image URL / Base64 Data URL
  mobileBackgroundImage?: string; // Optional mobile specific background image
  gradientTheme?: string; // e.g. "none" | "from-rose-600 via-red-600 to-amber-600"
  overlayOpacity?: number; // 0-100% dark overlay for readable text over background image
  
  // Banner Height & Size Customization (Desktop vs Mobile)
  desktopHeight?: 'compact' | 'standard' | 'tall' | 'extra_tall' | 'custom';
  desktopCustomHeight?: number; // e.g. 150-600 px
  mobileHeight?: 'compact' | 'standard' | 'tall' | 'extra_tall' | 'custom';
  mobileCustomHeight?: number; // e.g. 100-400 px
  
  // Position, Spacing & Alignment Controls (X, Y, Top, Bottom, Left, Right)
  paddingTop?: number; // Top padding in px (0-150px)
  paddingBottom?: number; // Bottom padding in px (0-150px)
  paddingLeft?: number; // Left padding in px (0-150px)
  paddingRight?: number; // Right padding in px (0-150px)
  containerMaxWidth?: number; // Max width percentage (30-100%)
  backgroundMode?: 'image' | 'gradient'; // 'image' or 'gradient'
  horizontalAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'center' | 'bottom';
  offsetX?: number; // Fine offset X percentage (-50% to +50%)
  offsetY?: number; // Fine offset Y percentage (-50% to +50%)
  textColor?: string; // 'white' | 'slate-900' | 'amber-300' etc.

  // Action / Navigation Buttons inside banner slide
  buttons?: TagCollectionButton[];

  // Visibility toggles (Admin can delete / hide specific text elements)
  showBadge?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showDescription?: boolean;
  showBengaliText?: boolean;
  showStats?: boolean;
  showStat1?: boolean;
  showStat2?: boolean;
  customStats?: TagCollectionStat[];
}

export interface HeroBannerButton {
  id: string;
  text: string;
  link?: string; // e.g. 'shop', 'category:electronics', 'view:checkout', 'whatsapp'
  variant?: 'primary' | 'secondary' | 'dark' | 'whatsapp' | 'emerald' | 'outline';
}

export interface HeroBannerBadge {
  id: string;
  text: string;
  icon?: string; // e.g. 'sparkles', 'shield', 'truck', 'star', 'tag', 'zap', 'check'
  color?: string; // e.g. 'sky', 'emerald', 'amber', 'rose', 'purple'
}

export interface HeroBannerItem {
  id: string;
  badge: string; // legacy fallback badge
  badges?: HeroBannerBadge[]; // per-slide custom badges array
  title: string;
  subtitle: string;
  description?: string;
  bengali?: string;
  buttonText: string; // legacy primary button text
  buttons?: HeroBannerButton[]; // per-slide custom action buttons array
  theme?: string;
  image: string; // Desktop View Image
  mobileImage?: string; // Mobile View Image
  mediaType?: 'image' | 'video' | 'youtube'; // Type of background media
  videoUrl?: string; // Direct video file Data URL or MP4/WebM URL
  youtubeUrl?: string; // YouTube video link or ID
  soundEnabled?: boolean; // Admin choice to enable video sound/audio
  videoDurationSeconds?: number; // Custom duration in seconds for video slides before advancing
  overlayOpacity?: number; // 0 to 100 overlay opacity percentage (0 = no dark gradient, 100% full image opacity)
  contentAlignment?: 'left' | 'center' | 'right'; // Slide text & button alignment (left, center, right)
}

export type HeroBannerSlide = HeroBannerItem;

export const DEFAULT_HERO_BANNERS: HeroBannerItem[] = [
  {
    id: 'slide-1',
    badge: 'Welcome to KenaX BD',
    title: 'Smart Shopping',
    subtitle: 'Better Living',
    description: 'Your Need, Our Promise. Genuine Products Delivered Nationwide.',
    bengali: 'দেশজুড়ে দ্রুততম ডেলিভারি ও অরিজিনাল কোয়ালিটি নিশ্চয়তা।',
    buttonText: 'Shop Now',
    theme: 'from-blue-900 via-sky-900 to-slate-950',
    image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1600&auto=format&fit=crop&q=85',
    mobileImage: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&auto=format&fit=crop&q=85',
    mediaType: 'image',
    badges: [
      { id: 'b-1', text: '🔥 Hot Deals', icon: 'flame', color: 'rose' },
      { id: 'b-2', text: '🚚 Nationwide Delivery', icon: 'truck', color: 'sky' },
    ],
    buttons: [
      { id: 'btn-1', text: 'Shop Deals', link: 'shop', variant: 'primary' },
      { id: 'btn-2', text: 'Trending', link: 'trending', variant: 'secondary' },
    ],
  },
  {
    id: 'slide-2',
    badge: 'Special Eid & Festival Deals',
    title: 'Mega Gadget Fest',
    subtitle: 'Up to 40% Off',
    description: 'Authentic gadgets delivered nationwide at best prices.',
    bengali: 'সেরা গ্যাজেট ও ইলেকট্রনিক্স ডিল বিশেষ ছাড়ে।',
    buttonText: 'Explore Gadgets',
    theme: 'from-indigo-900 via-slate-900 to-sky-950',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&auto=format&fit=crop&q=85',
    mobileImage: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=85',
    mediaType: 'image',
    badges: [
      { id: 'b-3', text: '⚡ Limited Offer', icon: 'zap', color: 'amber' },
      { id: 'b-4', text: '⭐ 100% Original', icon: 'shield', color: 'emerald' },
    ],
    buttons: [
      { id: 'btn-3', text: 'Explore Gadgets', link: 'shop', variant: 'primary' },
      { id: 'btn-4', text: 'Hot Deals', link: 'flash-sale', variant: 'secondary' },
    ],
  },
];

export interface FlashSaleBannerSettings {
  badge: string;
  discount?: string;
  discountTag?: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink?: string;
  image?: string;
  enabled?: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface HeroFeatureTag {
  id: string;
  text: string;
  icon?: 'shield' | 'card' | 'check' | 'truck' | 'star' | string;
  enabled: boolean;
  subtitle?: string;
}

export interface HeroSideBannerSettings {
  enabled: boolean;
  tagText?: string;
  title: string;
  description?: string;
  footerText?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonVariant?: 'primary' | 'secondary' | 'dark' | 'emerald' | 'outline' | 'whatsapp';
  showButton?: boolean;
  bgType?: 'gradient' | 'color' | 'image';
  bgColor?: string;
  bgImage?: string;
}

export const DEFAULT_HERO_SIDE_BANNER: HeroSideBannerSettings = {
  enabled: true,
  tagText: 'Nationwide Delivery',
  title: 'Cash on Delivery Nationwide',
  description: 'Order directly to your doorstep, inspect your package, and pay safely upon delivery anywhere in Bangladesh.',
  footerText: '100% Guaranteed',
  buttonText: 'Order Now',
  buttonLink: 'shop',
  buttonVariant: 'secondary',
  showButton: true,
  bgType: 'gradient',
  bgColor: 'from-sky-700 via-blue-800 to-slate-900',
  bgImage: '',
};

export interface MaintenanceModeSettings {
  enabled: boolean;
  title?: string;
  message?: string;
  bengaliMessage?: string;
  estimatedEndTime?: string;
  contactPhone?: string;
  contactWhatsApp?: string;
  contactEmail?: string;
  allowStaffBypass?: boolean;
}

export interface SiteSettings {
  id?: string;
  siteName: string;
  tagline?: string;
  insideDhakaDeliveryFee: number;
  outsideDhakaDeliveryFee: number;
  insideDhakaDeliveryCharge?: number;
  outsideDhakaDeliveryCharge?: number;
  sheetsSyncEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  announcementBarText: string;
  phone?: string;
  email?: string;
  address?: string;
  bengaliTagline?: string;
  deliveryInsideDhaka?: number;
  deliveryOutsideDhaka?: number;
  freeDeliveryThreshold?: number;
  bkashNumber?: string;
  nagadNumber?: string;
  rocketNumber?: string;
  enableBkash?: boolean;
  enableNagad?: boolean;
  enableRocket?: boolean;
  enableCOD?: boolean;
  autoConfirmOrders?: boolean;
  paymentGateways?: PaymentGatewayConfig[];
  enableCod?: boolean;
  enableFullPayment?: boolean;
  enableDeliveryOnlyPayment?: boolean;
  paymentInstructionsNotice?: string;
  customLogo?: string;
  heroBanners?: HeroBannerItem[];
  heroFeatures?: HeroFeatureTag[];
  heroSideBanner?: HeroSideBannerSettings;
  codBannerImage?: string;
  flashSaleBanner?: FlashSaleBannerSettings;
  privacyPolicy?: string;
  termsOfService?: string;
  refundPolicy?: string;
  faqs?: FAQItem[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  seoSettings?: any;
  lowStockThreshold?: number;
  maintenanceMode?: MaintenanceModeSettings;
  // Contact Center & Footer Information Fields (Editable & Deletable by Admin)
  experienceCenterTitle?: string;
  experienceCenterAddress?: string;
  helplines?: string[];
  officialEmails?: string[];
  supportHours?: string;
  nationwideDeliveryText?: string;
  emailFooterHotline?: string;
  emailFooterEmail?: string;
  emailFooterAddress?: string;
  emailFooterTrustText?: string;
  [key: string]: any;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status?: 'active' | 'suspended';
  isActive?: boolean;
  isRemoved?: boolean;
  removedAt?: string;
  removedBy?: string;
  permissions: string[];
  phone?: string;
  avatar?: string;
  lastLogin?: string;
  createdAt: string;
  createdBy?: string;
}

export interface ActivityLog {
  id: string;
  staffId?: string;
  staffName: string;
  staffRole: string;
  action: string;
  module:
    | 'Orders'
    | 'Products'
    | 'Inventory'
    | 'Customers'
    | 'Delivery'
    | 'Payments'
    | 'Coupons'
    | 'Reviews'
    | 'Staff'
    | 'Settings'
    | 'Auth'
    | string;
  targetId: string;
  previousData?: any;
  newData?: any;
  details: string;
  timestamp: string;
  ip?: string;
  ipAddress?: string;
  device?: string;
}

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  staffId?: string;
  staffName: string;
  staffRole: string;
  previousStock: number;
  newStock: number;
  quantityChanged: number;
  reason: string;
  timestamp: string;
}

export interface AdminNotification {
  id: string;
  type: 'order' | 'payment' | 'stock' | 'review' | 'system' | 'staff';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface PanelPurchaseInfo {
  id: string;
  panelName: string;
  plan: string;
  purchaseDate: string;
  price: number;
  orderId: string;
  status: 'Active' | 'Pending' | 'Expired';
  domainOrSubdomain?: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  password?: string;
  mobile: string;
  phone?: string;
  totalOrders: number;
  ordersCount?: number;
  totalSpent: number;
  lastOrderDate?: string;
  isBlocked: boolean;
  status?: string;
  blockReason?: string;
  registeredAt: string;
  createdAt?: string;
  savedAddresses?: any[];
  addresses?: DeliveryAddress[];
  wishlist?: Product[];
  cart?: OrderItem[];
  orderIds?: string[];
  isPanelPurchased?: boolean;
  panelPurchases?: PanelPurchaseInfo[];
  isV2Account?: boolean;
}

export interface CartActivityItem {
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: string;
  sku: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  supplierUrl?: string;
  addedAt: string;
}

export interface CartActivity {
  id: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerLocation?: string;
  userType: 'registered' | 'guest';
  items: CartActivityItem[];
  totalItems: number;
  totalAmount: number;
  ipAddress?: string;
  device?: string;
  status: 'active' | 'converted' | 'abandoned' | 'contacted';
  notes?: string;
  lastFollowUpBy?: string;
  lastFollowUpAt?: string;
  convertedByStaffId?: string;
  convertedByStaffName?: string;
  convertedByStaffRole?: string;
  isV2Activity?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermissions {
  role: 'super_admin' | 'admin' | 'manager' | 'moderator';
  permissions: string[];
}

export type PolicyTab = 'privacy' | 'terms' | 'refund' | 'faq';

export type SMSServiceProvider = 'android_sim' | 'greenweb' | 'mimsms' | 'reve' | 'bulksmsbd' | 'custom';

export type SMSEventType =
  | 'order_placed'
  | 'order_confirmed'
  | 'courier_shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'payment_received'
  | 'order_cancelled';

export interface SMSTemplate {
  id: SMSEventType;
  title: string;
  banglaTitle?: string;
  enabled: boolean;
  messageText: string;
  variables: string[];
}

export interface SMSSettings {
  enabled: boolean;
  provider: SMSServiceProvider;
  senderId?: string;
  apiKey?: string;
  apiSecret?: string;
  apiUrl?: string;
  adminAlertMobile?: string;
  notifyAdminOnNewOrder: boolean;
  notifyCustomerOnOrderPlaced: boolean;
  notifyCustomerOnConfirmed: boolean;
  notifyCustomerOnShipped: boolean;
  notifyCustomerOnDelivered: boolean;
  notifyCustomerOnPayment: boolean;
  templates?: Record<SMSEventType, SMSTemplate>;
}

export interface SMSLog {
  id: string;
  recipientPhone: string;
  recipientName?: string;
  orderId?: string;
  eventType: SMSEventType | 'test_sms' | 'custom';
  message: string;
  status: 'sent' | 'failed' | 'queued' | 'simulated';
  provider: string;
  responseMessage?: string;
  timestamp: string;
}

export interface GmailAlertSettings {
  enabled: boolean;
  senderName: string;
  senderEmail: string;
  superAdminEmail: string; // sadikrtx3060@gmail.com
  staffAlertEmails: string[];
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  notifyOnUserRegister: boolean;
  notifyOnAddToCart: boolean;
  notifyOnWishlist: boolean;
  notifyOnNewOrder: boolean;
  notifyOnStaffAudit: boolean;
  footerHotline?: string;
  footerEmail?: string;
  footerAddress?: string;
  footerTrustText?: string;
}

export type ExpenseCategory =
  | 'delivery'
  | 'packaging'
  | 'shipping'
  | 'product_cost'
  | 'marketing'
  | 'office_rent'
  | 'salary'
  | 'utilities'
  | 'software'
  | 'loss_damage'
  | 'other';

export interface ExpenseRecord {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number; // in BDT ৳
  date: string; // YYYY-MM-DD
  courier?: string; // e.g. "Steadfast", "Pathao", "RedX", "Paperfly", "Sundarban", "In-House Rider"
  location?: string; // e.g. "Inside Dhaka - Dhanmondi", "Chattogram Hub"
  orderId?: string; // linked order reference if any
  note?: string; // admin side note / remarks
  paymentMethod?: string; // Cash, bKash, Bank Transfer, etc.
  recordedBy: string; // staff name
  recordedByRole?: string; // staff role
  createdAt: string;
  updatedAt?: string;
}

export type OtherProfitSource =
  | 'affiliate_commission'
  | 'delivery_cashback'
  | 'supplier_rebate'
  | 'bulk_resale'
  | 'scrap_carton_sale'
  | 'service_charge'
  | 'bonus_reward'
  | 'investment_return'
  | 'bank_profit'
  | 'other_income';

export interface OtherProfitRecord {
  id: string;
  title: string;
  amount: number; // in BDT ৳
  sourceCategory: OtherProfitSource | string;
  sourceOrigin: string; // কোথা থেকে আসছে: vendor/partner/platform name
  sourceHistory?: string; // হিস্ট্রি ও প্রেক্ষাপট: detailed origin description/breakdown
  date: string; // YYYY-MM-DD
  paymentMethod?: string; // bKash, Nagad, Rocket, Bank Transfer, Cash, etc.
  receivedBy: string; // staff name
  receivedByRole?: string; // staff role
  sideNote?: string; // সাইট নোট (special admin note / remarks)
  createdAt: string;
  updatedAt?: string;
}

export const isDemoOtherProfit = (p: any): boolean => {
  if (!p) return true;
  const id = String(p.id || '');
  const title = String(p.title || '').toLowerCase();
  const note = String(p.sideNote || p.note || '').toLowerCase();
  const origin = String(p.sourceOrigin || '').toLowerCase();

  return (
    id.startsWith('PRF-DEMO') ||
    id === 'PRF-1001' ||
    id === 'PRF-1002' ||
    id === 'PRF-1003' ||
    id === 'PRF-1' ||
    id === 'PRF-001' ||
    id === 'PRF-01' ||
    title.includes('demo') ||
    title.includes('sample') ||
    title.includes('cashback') ||
    title.includes('rebate') ||
    title.includes('carton') ||
    title.includes('affiliate') ||
    title.includes('volume cashback') ||
    title.includes('distributor rebate') ||
    origin.includes('steadfast') ||
    origin.includes('xiaomi') ||
    note.includes('petty drawer') ||
    note.includes('bk92842x') ||
    note.includes('demo') ||
    note.includes('sample')
  );
};

export type WhatsAppEventType =
  | 'order_placed'
  | 'order_confirmed'
  | 'order_shipped'
  | 'out_for_delivery'
  | 'order_delivered'
  | 'payment_received'
  | 'cart_recovery'
  | 'marketing_broadcast';

export interface WhatsAppTemplate {
  id: WhatsAppEventType;
  title: string;
  banglaTitle: string;
  category: 'Transactional' | 'Marketing' | 'Support';
  enabled: boolean;
  message: string;
  variables: string[];
}

export interface WhatsAppSettings {
  enabled: boolean;
  businessNumber: string; // e.g., "8801800000000"
  senderName: string; // e.g. "KenaX BD Official"
  provider: 'direct_link' | 'ultramsg' | 'wasender' | 'green_api' | 'cloud_api';
  instanceId?: string;
  apiKey?: string;
  webhookUrl?: string;
  autoSendOnNewOrder: boolean;
  autoSendOnShipped: boolean;
  autoSendOnDelivered: boolean;
  autoSendOnPayment: boolean;
  templates: Record<WhatsAppEventType, WhatsAppTemplate>;
}


