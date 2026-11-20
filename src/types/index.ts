export type UserRole = 'super_admin' | 'manager' | 'admin' | 'moderator' | 'customer';

export type StorageProvider = 'GOOGLE_DRIVE' | 'FIREBASE' | 'EXTERNAL';

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

export interface ProductHighlight {
  id: string;
  text: string;
  icon?: string; // 'check-circle' (default), 'shield-check', 'zap', 'truck', 'sparkles', 'star', 'award', 'heart', 'flame', 'thumbs-up', 'clock', 'badge-percent', 'package-check', 'refresh-cw', 'headphones', 'gift', etc., or custom emoji
  iconColor?: string; // 'emerald' | 'sky' | 'indigo' | 'amber' | 'rose' | 'purple' | 'teal' | 'slate'
  active: boolean; // true = visible, false = hidden/deactivated
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
  stockStatus?: 'in_stock' | 'out_of_stock' | 'upcoming';
  sku: string;
  images: string[];
  videoUrl?: string;
  shortDescription?: string;
  description: string;
  specifications?: Record<string, string>;
  productType: ProductType;
  supplierId?: string;
  supplierName?: string;
  supplierUrl?: string;
  supplierSku?: string;
  // Own stock sourcing details (purchase address, vendor contact phone, vendor name, memo)
  sourcingAddress?: string;
  sourcingPhone?: string;
  sourcingVendorName?: string;
  sourcingMemo?: string;
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
  priority?: number; // Global priority ranking (e.g. 1 is highest/top)
  pagePriorities?: Record<string, number>; // Page-specific priority rankings (e.g. { 'home': 1, 'shop': 2, 'category:Smartphones': 1, 'tag:Trending': 3 })
  createdAt?: string;
  updatedAt?: string;
  // Multi-vendor seller & Reseller marketplace fields
  sellerId?: string;
  sellerName?: string;
  sellerShopName?: string;
  sellerRating?: number;
  sellerReviewsCount?: number;
  sellerVerified?: boolean;
  allowReselling?: boolean; // When true, resellers can sell this product
  resellerPrice?: number; // Wholesale cost for resellers (e.g. ৳950)
  suggestedResellerRetailPrice?: number; // Suggested customer price (e.g. ৳1450)
  minResellerRetailPrice?: number; // Minimum price reseller can sell at (e.g. ৳1200)
  resellerCommissionRate?: number; // Estimated profit % or commission
  // Variations & Color-linked images
  variations?: ProductVariationOption[];
  colors?: ColorVariation[];
  sizes?: string[];
  variants?: ProductVariant[];
  videoAspectRatio?: 'auto' | '9:16' | '16:9' | '1:1' | '4:3';
  keyHighlights?: ProductHighlight[];
  landingPage?: LandingPageConfig;
  // File & Media Storage Provider (Google Drive vs Firebase vs External)
  storageProvider?: StorageProvider;
  storagePath?: string;
  [key: string]: any;
}

export interface LandingPageFeature {
  id: string;
  title: string;
  desc: string;
  icon?: string; // 'check-circle', 'shield-check', 'zap', 'truck', 'star', 'sparkles', 'heart', 'award', 'refresh-cw'
}

export interface LandingPageReview {
  id: string;
  name: string;
  rating: number;
  comment: string;
  location?: string;
  date?: string;
  photo?: string;
}

export interface LandingPageTrustBadge {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
}

export interface LandingPageConfig {
  enabled: boolean;
  slug?: string;
  headline?: string;
  subHeadline?: string;
  accentColor?: 'emerald' | 'sky' | 'indigo' | 'rose' | 'amber' | 'purple' | 'slate' | string;
  topBannerText?: string;
  topBadgeText?: string;
  showCountdown?: boolean;
  countdownHours?: number;
  countdownEndDate?: string;
  countdownTitle?: string;
  countdownSubtitle?: string;
  priceSectionTitle?: string;
  stockStatusText?: string;
  savingsBadgeText?: string;
  colorSelectLabel?: string;
  variantSelectLabel?: string;
  customColors?: ColorVariation[];
  descriptionSectionTitle?: string;
  descriptionSectionSubtitle?: string;
  customDescription?: string;
  showProductOverview?: boolean;
  videoUrl?: string;
  videoTitle?: string;
  videoSubtitle?: string;
  videoAspectRatio?: 'auto' | '9:16' | '16:9' | '1:1' | '4:3';
  galleryImages?: string[];
  showFeatures?: boolean;
  featuresSectionTitle?: string;
  featuresSectionSubtitle?: string;
  features?: LandingPageFeature[];
  whyUsSectionTitle?: string;
  whyUsSectionSubtitle?: string;
  whyChooseUs?: string[];
  badges?: string[];
  customTrustBadges?: LandingPageTrustBadge[];
  reviewsSectionTitle?: string;
  reviewsSectionSubtitle?: string;
  customReviews?: LandingPageReview[];
  customOrderTitle?: string;
  customOrderSubtitle?: string;
  orderFormBadgeText?: string;
  step1Title?: string;
  step2Title?: string;
  step3Title?: string;
  insideDhakaLabel?: string;
  outsideDhakaLabel?: string;
  nameInputLabel?: string;
  nameInputPlaceholder?: string;
  phoneInputLabel?: string;
  phoneInputPlaceholder?: string;
  addressInputLabel?: string;
  addressInputPlaceholder?: string;
  noteInputLabel?: string;
  noteInputPlaceholder?: string;
  customButtonText?: string;
  orderSecurityNotice?: string;
  orderSuccessTitle?: string;
  orderSuccessSubtitle?: string;
  freeDeliveryNote?: string;
  showSimilarProducts?: boolean;
  similarSectionTitle?: string;
  similarSectionSubtitle?: string;
  similarProductIds?: string[];
  guaranteeText?: string;
  stickyBarButtonText?: string;
  stickyBarSubtext?: string;
  deliveryInsideDhakaFee?: number;
  deliveryOutsideDhakaFee?: number;
  // Landing Page Payment Options Settings
  allowCashOnDelivery?: boolean;
  allowDeliveryAdvance?: boolean;
  allowFullAdvance?: boolean;
  paymentMode?: 'inherit' | 'cod_only' | 'advance_delivery' | 'full_advance' | 'all';
  viewsCount?: number;
  ordersCount?: number;
  updatedAt?: string;
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

export interface Supplier {
  id: string;
  name: string; // Business name
  websiteUrl?: string; // Website link
  facebookUrl?: string; // Facebook page link
  tiktokUrl?: string; // TikTok link
  whatsapp?: string; // WhatsApp number or personal number
  personalPhone?: string; // Personal phone
  managerPhone?: string; // CEO number or manager number
  ceoPhone?: string; // CEO number
  address?: string;
  contactPerson?: string;
  notes?: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface SourcingLocation {
  id: string;
  vendorName: string; // Wholesaler / Vendor name (e.g. Haji Fabrics & Wholesale)
  marketName?: string; // Wholesale market / Area (e.g. Islampur Cloth Market)
  address: string; // Shop / Market physical address
  phone: string; // Contact phone number
  secondaryPhone?: string; // Alternative contact / WhatsApp
  contactPerson?: string; // Shop owner / Manager name
  memo?: string; // Sourcing notes / purchase terms / pricing agreements
  productCategories?: string; // Categories / products sourced from here
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
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
  | 'Follow Up'
  | 'Payment Verification'
  | 'Incomplete'
  | 'Confirmed'
  | 'Processing'
  | 'Ready to Ship'
  | 'Packed'
  | 'In Transit'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Completed'
  | 'Hold'
  | 'Cancelled'
  | 'Spam'
  | 'Returned'
  | 'Refunded'
  | 'Rejected'
  | 'Failed Delivery'
  | 'Fake Order'
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
  id?: string;
  productName: string;
  name?: string;
  productImage: string;
  image?: string;
  sku?: string;
  variant?: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedVariation?: string;
  selectedColorImage?: string;
  quantity: number;
  price: number; // in BDT
  total: number;
  costPrice?: number;
  supplierName?: string;
  supplierUrl?: string;
  supplierId?: string;
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
  customerPhone?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  shippingAddress?: string;
  
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
  isFakeOrder?: boolean;
  isIncompleteOrder?: boolean;
  incompleteReason?: string;
  missingFields?: string[];
  courierName?: string; // Steadfast, Pathao, RedX, eCourier, Paperfly
  courierOrderId?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  
  timeline: OrderTimelineEvent[];
  customerNotes?: string;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  
  // Staff attribution fields for order creation & processing
  orderSource?: 'chatbot' | 'manual' | string;
  isAiBotOrder?: boolean;
  createdByStaffId?: string;
  createdByStaffName?: string;
  isV2Order?: boolean;
  createdByStaffRole?: string;
  handledByStaffId?: string;
  handledByStaffName?: string;
  handledByStaffRole?: string;
  confirmedByStaffId?: string;
  confirmedByStaffName?: string;
  confirmedByStaffRole?: string;
  confirmedAt?: string;
  telegramChatId?: string;
  telegramUsername?: string;

  // Meta Ads & Marketing Attribution Fields
  attribution?: {
    firstTouch?: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_content?: string;
      utm_term?: string;
      fbclid?: string;
      ttclid?: string;
      gclid?: string;
      gbraid?: string;
      wbraid?: string;
      referrer?: string;
      landingUrl?: string;
      landingPage?: string;
      timestamp?: string;
    };
    lastTouch?: {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_content?: string;
      utm_term?: string;
      fbclid?: string;
      ttclid?: string;
      gclid?: string;
      gbraid?: string;
      wbraid?: string;
      referrer?: string;
      landingUrl?: string;
      landingPage?: string;
      timestamp?: string;
    };
    sessionId?: string;
    fbclid?: string;
    ttclid?: string;
    gclid?: string;
    gbraid?: string;
    wbraid?: string;
    fbp?: string;
    fbc?: string;
    capturedAt?: string;
  };
  metaPurchaseEventId?: string;
  metaPurchaseSent?: boolean;
  metaPurchaseSentAt?: string;
  metaPurchaseStatus?: 'sent' | 'skipped' | 'failed' | 'simulated';
  metaPurchaseError?: string;

  // TikTok Ads & Marketing Attribution Fields
  tiktokPurchaseEventId?: string;
  tiktokPurchaseSent?: boolean;
  tiktokPurchaseSentAt?: string;
  tiktokPurchaseStatus?: 'sent' | 'skipped' | 'failed' | 'simulated';
  tiktokPurchaseError?: string;

  // Google Ads & GA4 Tracking Fields
  googlePurchaseTracked?: boolean;
  googlePurchaseTrackedAt?: string;
  googlePurchaseTrackingStatus?: 'sent' | 'skipped' | 'failed' | 'simulated';
  googlePurchaseTransactionId?: string;

  // Customer IP Tracking & Security Fields
  customerIp?: string;
  ipVersion?: 'IPv4' | 'IPv6' | string;
  ipStatus?: 'Active' | 'Blocked' | 'Suspicious' | 'Whitelisted' | string;
  ipBlockReason?: string;
  ipFirstSeen?: string;
  ipLastSeen?: string;
  ipOrdersCount?: number;
  ipCapturedAt?: string;
  ipCaptureSource?: string;
  isTrustedProxy?: boolean;
  ipProxyType?: string;
  
  // IP Approximate Geolocation Intelligence Fields
  ipCountry?: string;
  ipCountryCode?: string;
  ipRegion?: string; // Division / State / Region
  ipCity?: string;
  ipLatitude?: number;
  ipLongitude?: number;
  ipIsp?: string; // ISP / Network Provider
  ipConnectionType?: string; // Connection type e.g. Broadband, Cellular, Datacenter
  ipLocationAccuracy?: string; // Approximate, City-level, Country-level, Unavailable
  ipGeoResolvedAt?: string;
  ipGeoData?: IpGeoLocation;

  // Inventory & Stock Control Fields
  stockDeducted?: boolean;
  stockDeductedAt?: string;

  // Extended Order Management Dashboard Fields
  siteOrderNumber?: string;
  fulfillmentStatus?: 'Unfulfilled' | 'Processing' | 'Packed' | 'Shipped' | 'Fulfilled' | 'Returned' | 'Failed' | string;
  packagingStatus?: string;
  channel?: string;
  adNetwork?: string;
  isDuplicate?: boolean;
  internalNotesList?: Array<{
    id: string;
    note: string;
    authorName: string;
    authorRole: string;
    createdAt: string;
  }>;
  courierCheckStatus?: 'verified' | 'risky' | 'unverified' | 'no_data';
  courierCheckSummary?: {
    successRate: number;
    totalOrders: number;
    deliveredOrders: number;
    cancelledOrders?: number;
    returnedOrders?: number;
    riskLevel: string;
    checkedAt: string;
  };
  [key: string]: any;
}

export interface IpGeoLocation {
  ip: string;
  ipVersion: 'IPv4' | 'IPv6' | 'Unknown';
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  org?: string;
  as?: string;
  connectionType?: string;
  accuracyStatus?: 'approximate' | 'city_level' | 'country_level' | 'unavailable' | string;
  detectionSource?: 'server_header' | 'cloudflare' | 'x_forwarded_for' | 'remote_address' | string;
  isTrustedProxy?: boolean;
  proxyType?: 'Cloudflare' | 'Google Cloud Load Balancer / Cloud Run' | 'Nginx' | 'Direct' | 'Unknown' | string;
  resolvedAt?: string;
  isDatacenterOrProxy?: boolean;
}

export type IpStatus = 'Active' | 'Blocked' | 'Suspicious' | 'Whitelisted';

export interface IpActivityHistory {
  action: 'blocked' | 'unblocked' | 'order_placed' | 'checkout_attempt' | 'note_added';
  timestamp: string;
  actor?: string;
  reason?: string;
  details?: string;
  orderId?: string;
}

export interface IpRecord {
  ip: string;
  status: IpStatus;
  blockReason?: string;
  blockedAt?: string;
  blockedBy?: string;
  unblockedAt?: string;
  unblockedBy?: string;
  firstSeen: string;
  lastSeen: string;
  totalOrders: number;
  orderIds: string[];
  customerIds: string[];
  customerNames: string[];
  customerPhones: string[];
  customerEmails: string[];
  locations: string[];
  riskScore?: number;
  notes?: string;
  history: IpActivityHistory[];
  updatedAt?: string;
}

export interface IpSummaryStats {
  totalIps: number;
  totalActive: number;
  totalBlocked: number;
  totalSuspicious: number;
  totalOrdersTracked: number;
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
  customerEmail?: string;
  rating: number;
  comment: string;
  photos?: string[];
  verifiedPurchase: boolean;
  status: 'approved' | 'pending' | 'rejected' | 'hidden';
  createdAt: string;
  isDemo?: boolean;
}

export type EmailTemplateType =
  | 'user_welcome'
  | 'user_add_to_cart'
  | 'user_order_placed'
  | 'user_order_confirmed'
  | 'user_order_processing'
  | 'user_order_picked'
  | 'user_order_delivered'
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

export interface MetaPixelEventToggles {
  pageView: boolean;
  viewContent: boolean;
  addToCart: boolean;
  initiateCheckout: boolean;
  purchase: boolean;
  search: boolean;
  contact: boolean;
}

export interface MetaPixelSettings {
  enabled: boolean;
  pixelId: string;
  additionalPixelIds?: string[];
  capiToken?: string;
  testEventCode?: string;
  datasetId?: string;
  domainVerification?: string;
  enableAdvancedMatching?: boolean;
  events?: MetaPixelEventToggles;
  catalogFeedEnabled?: boolean;
  catalogUpdateFrequency?: 'hourly' | 'daily' | 'realtime';
  catalogBrandFallback?: string;
  apiVersion?: string;
  status?: 'connected' | 'not_configured' | 'error';
  lastCapiEventAt?: string;
  lastCatalogSyncAt?: string;
}

export interface TikTokPixelEventToggles {
  pageView: boolean;
  viewContent: boolean;
  addToCart: boolean;
  initiateCheckout: boolean;
  purchase: boolean;
  search: boolean;
  completeRegistration: boolean;
  contact: boolean;
}

export interface TikTokAdsSettings {
  enabled: boolean;
  pixelId: string;
  additionalPixelIds?: string[];
  eventsApiToken?: string;
  testEventCode?: string;
  appId?: string;
  apiVersion?: string;
  enableAdvancedMatching?: boolean;
  catalogFeedEnabled?: boolean;
  catalogBrandFallback?: string;
  catalogUpdateFrequency?: 'hourly' | 'daily' | 'realtime';
  status?: 'connected' | 'not_configured' | 'error';
  lastEventsApiEventAt?: string;
  lastCatalogSyncAt?: string;
  events?: TikTokPixelEventToggles;
}

export interface GoogleAdsEventToggles {
  pageView: boolean;
  viewItem: boolean;
  viewItemList: boolean;
  selectItem: boolean;
  search: boolean;
  addToCart: boolean;
  removeFromCart: boolean;
  beginCheckout: boolean;
  addPaymentInfo: boolean;
  purchase: boolean;
  signUp: boolean;
  generateLead: boolean;
}

export interface GoogleAdsSettings {
  enabled: boolean;
  gtmContainerId?: string; // GTM-XXXXXX
  ga4MeasurementId?: string; // G-XXXXXXXXXX
  googleTagId?: string; // GT-XXXXXXXXXX or AW-XXXXXXXXX
  googleAdsConversionId?: string; // AW-XXXXXXXXX
  googleAdsPurchaseLabel?: string;
  googleAdsBeginCheckoutLabel?: string;
  googleAdsAddToCartLabel?: string;
  googleAdsSignUpLabel?: string;
  googleAdsLeadLabel?: string;
  enableEnhancedConversions?: boolean;
  enableEnhancedEcommerce?: boolean;
  enableRemarketingTag?: boolean;
  merchantCenterFeedEnabled?: boolean;
  merchantCenterCurrency?: string;
  status?: 'connected' | 'not_configured' | 'error';
  lastConversionAt?: string;
  lastFeedSyncAt?: string;
  events?: GoogleAdsEventToggles;
}

export interface CustomScriptsSettings {
  headerScript?: string;
  footerScript?: string;
}

export interface CampaignAdSpend {
  id: string;
  name: string;
  platform: 'facebook' | 'tiktok' | 'google' | 'youtube' | 'influencer' | 'sms' | 'other';
  spendBDT: number;
  startDate: string;
  endDate?: string;
  targetUrl?: string;
  productId?: string;
  productName?: string;
  utmCampaign?: string;
  notes?: string;
  status: 'active' | 'completed' | 'paused';
  createdAt?: string;
}

export interface SavedUTMLink {
  id: string;
  name: string;
  fullUrl: string;
  platform: string;
  productOrPage: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string;
  utmTerm?: string;
  createdAt: string;
  clicksCount?: number;
}

export interface AdvertiserSettings {
  meta?: MetaPixelSettings;
  tiktok?: TikTokAdsSettings;
  google?: GoogleAdsSettings;
  customScripts?: CustomScriptsSettings;
  adSpends?: CampaignAdSpend[];
  savedUTMs?: SavedUTMLink[];
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

export interface HomeTabCustomLabels {
  sectionTitle?: string;
  sectionSubtitle?: string;
  all?: string;
  trending?: string;
  bestsellers?: string;
  electronics?: string;
  fashion?: string;
  home?: string;
  hiddenTabs?: string[];
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
  homeTabs?: HomeTabCustomLabels;
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
  mobileHeight?: 'compact' | 'standard' | 'tall' | 'extra_tall' | 'hd_16_9' | 'custom';
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

export interface StorePolicy {
  id: string;
  slug: string; // e.g. 'return', 'exchange', 'privacy', 'terms', 'refund'
  title: string;
  titleBn?: string;
  content: string;
  active: boolean;
  badgeText?: string;
  iconName?: string;
  order: number;
  updatedAt?: string;
}

export interface CustomOrderStepName {
  title: string;
  descBn?: string;
}

export const DEFAULT_ORDER_STEP_NAMES: Record<string, CustomOrderStepName> = {
  Pending: { title: 'Pending', descBn: 'অর্ডার জমা' },
  'Payment Verification': { title: 'Payment Check', descBn: 'পেমেন্ট যাচাই' },
  Confirmed: { title: 'Confirmed', descBn: 'অর্ডার কনফার্মড' },
  Processing: { title: 'Processing', descBn: 'প্রসেসিং করা হচ্ছে' },
  Packed: { title: 'Packed / Picked', descBn: 'প্যাকিং/পিকড সম্পন্ন' },
  Shipped: { title: 'Shipped', descBn: 'কুরিয়ার শিপড' },
  'Out for Delivery': { title: 'Out for Delivery', descBn: 'ডেলিভারির পথে' },
  Delivered: { title: 'Delivered', descBn: 'ডেলিভারি সম্পন্ন' },
  Completed: { title: 'Completed', descBn: 'অর্ডার কমপ্লিট' },
  Cancelled: { title: 'Cancelled', descBn: 'অর্ডার বাতিল' },
  Returned: { title: 'Returned', descBn: 'অর্ডার রিটার্ন' },
};

export interface SiteSettings {
  id?: string;
  siteName: string;
  tagline?: string;
  insideDhakaDeliveryFee: number;
  outsideDhakaDeliveryFee: number;
  insideDhakaDeliveryCharge?: number;
  outsideDhakaDeliveryCharge?: number;
  sheetsSyncEnabled?: boolean;
  googleSpreadsheetId?: string;
  googleSpreadsheetUrl?: string;
  autoSyncGoogleSheets?: boolean;
  googleSheetsLastSyncedAt?: string;
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
  // Landing Page Payment Controls
  lpEnableCod?: boolean;
  lpEnableDeliveryAdvance?: boolean;
  lpEnableFullAdvance?: boolean;
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
  returnPolicy?: string;
  exchangePolicy?: string;
  storePolicies?: StorePolicy[];
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
  messengerLink?: string;
  whatsappNumber?: string;
  telegramBotUsername?: string;
  // KenaX AI Bot & Channel Numbers Configuration
  aiBotEnabled?: boolean;
  aiBotName?: string;
  aiBotWelcomeMessage?: string;
  aiBotPrompt?: string;
  aiBotAllowOrdering?: boolean;
  officialWhatsAppAgentNumber?: string;
  whatsappSuperAdminNumber?: string;
  chatBotRules?: ChatBotRule[];
  customOrderStepNames?: Record<string, CustomOrderStepName>;
  homeTabs?: HomeTabCustomLabels;
  advertiserSettings?: AdvertiserSettings;
  // Courier Fraud & Integration Settings
  steadfastApiKey?: string;
  steadfastSecretKey?: string;
  steadfastWebhookEnabled?: boolean;
  steadfastWebhookSecret?: string;
  autoUpdateOrderStatusFromWebhook?: boolean;
  pathaoApiKey?: string;
  pathaoSecretKey?: string;
  pathaoStoreId?: string;
  fraudAlertThresholdPercent?: number; // e.g. 70 (if success rate < 70%, trigger high risk alert)
  autoFraudCheckOnOrder?: boolean;
  advanceDeliveryFeeAmount?: number;
  courierCredentials?: CourierCredentialsSettings;
  deliveryZones?: DeliveryZoneItem[];
  orderSecuritySettings?: OrderSecuritySettings;
  offerPopup?: OfferPopupSettings;
  // Cloud Storage & Google Drive Marketplace File Settings
  storageSettings?: StorageSettingsConfig;
  [key: string]: any;
}

export interface StorageSettingsConfig {
  googleDriveEnabled: boolean;
  cloudSellerUploadEnabled?: boolean;
  cloudResellerUploadEnabled?: boolean;
  allowedSellerPlans: string[]; // e.g. ['premium', 'standard']
  allowedResellerPlans: string[]; // e.g. ['premium', 'standard']
  individualSellerOverrides: Record<string, boolean>; // e.g. { 'seller-123': true }
  individualResellerOverrides: Record<string, boolean>; // e.g. { 'reseller-456': false }
  maxFileSizeMB: number; // default: 5
  allowedFileTypes: string[]; // default: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
}

export const DEFAULT_STORAGE_SETTINGS: StorageSettingsConfig = {
  googleDriveEnabled: true,
  cloudSellerUploadEnabled: false,
  cloudResellerUploadEnabled: false,
  allowedSellerPlans: ['premium'],
  allowedResellerPlans: ['premium'],
  individualSellerOverrides: {},
  individualResellerOverrides: {},
  maxFileSizeMB: 5,
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};

export interface OrderSecuritySettings {
  mobileNumberVerification: boolean;
  locationFieldsRequired: boolean;
  vpnProtection: boolean;
  orderConfirmationSms: boolean;
  duplicateOrderBlock: boolean;
  duplicateOrderBlockMinutes: number;
  courierProtection: boolean;
  courierSuccessRatioThreshold: number;
  advanceDeliveryFeeForHighRisk?: boolean;
  advanceDeliveryFeeAmount?: number;
  blockFakeMobileNumbers?: boolean;
  minOrderAmount?: number;
  maxOrderQuantity?: number;
  autoConfirmVerifiedOrders?: boolean;
}

export const DEFAULT_ORDER_SECURITY_SETTINGS: OrderSecuritySettings = {
  mobileNumberVerification: false,
  locationFieldsRequired: true,
  vpnProtection: false,
  orderConfirmationSms: true,
  duplicateOrderBlock: true,
  duplicateOrderBlockMinutes: 15,
  courierProtection: true,
  courierSuccessRatioThreshold: 70,
  advanceDeliveryFeeForHighRisk: false,
  advanceDeliveryFeeAmount: 120,
  blockFakeMobileNumbers: true,
  minOrderAmount: 0,
  maxOrderQuantity: 10,
  autoConfirmVerifiedOrders: false,
};

export interface DeliveryZoneItem {
  id: string;
  name: string;
  charge: number;
  deliveryTime: string;
  isDefault?: boolean;
}

export interface CourierCredentialsSettings {
  // SteadFast
  steadfastUrl?: string;
  steadfastApiKey?: string;
  steadfastSecretKey?: string;
  steadfastWebhookToken?: string;
  steadfastEnabled?: boolean;

  // Pathao
  pathaoUrl?: string;
  pathaoClientId?: string;
  pathaoClientSecret?: string;
  pathaoUsername?: string;
  pathaoPassword?: string;
  pathaoStoreId?: string;
  pathaoWebhookSecret?: string;
  pathaoWebhookCallbackSecret?: string;
  pathaoEnabled?: boolean;

  // Redx
  redxUrl?: string;
  redxAccessToken?: string;
  redxStoreId?: string;
  redxEnabled?: boolean;

  // Carrybee
  carrybeeUrl?: string;
  carrybeeClientId?: string;
  carrybeeClientSecret?: string;
  carrybeeClientContext?: string;
  carrybeeStoreId?: string;
  carrybeeEnabled?: boolean;
}

export type OfferHighlightType =
  | 'coupon'
  | 'countdown'
  | 'discount_badge'
  | 'free_delivery'
  | 'hotline'
  | 'custom_text'
  | 'none';

export interface OfferSlideItem {
  id: string;
  enabled: boolean;
  badgeText?: string;
  badgeTextEn?: string;
  title: string;
  titleEn?: string;
  subtitle: string;
  subtitleEn?: string;
  imageUrl?: string;
  // Flexible Highlight Feature
  highlightType: OfferHighlightType;
  couponCode?: string;
  couponDiscountText?: string;
  couponDiscountTextEn?: string;
  countdownHours?: number;
  customHighlightTitle?: string;
  customHighlightTitleEn?: string;
  customHighlightSubtitle?: string;
  customHighlightSubtitleEn?: string;
  hotlineNumber?: string;
  // CTA Action
  buttonText: string;
  buttonTextEn?: string;
  actionType: 'shop' | 'category' | 'product' | 'flash_sale' | 'custom_url' | 'whatsapp';
  actionTarget?: string;
}

export interface OfferPopupSettings {
  enabled: boolean;
  delaySeconds: number; // e.g. 2, 2.5, 3, 5
  autoSlideInterval?: number; // e.g. 4 seconds
  showOncePerSession?: boolean;
  slides?: OfferSlideItem[];
  badgeText?: string;
  badgeTextEn?: string;
  title?: string;
  titleEn?: string;
  subtitle?: string;
  subtitleEn?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  couponCode?: string;
  couponDiscountText?: string;
  couponDiscountTextEn?: string;
  buttonText?: string;
  buttonTextEn?: string;
  actionType?: 'shop' | 'category' | 'product' | 'flash_sale' | 'custom_url' | 'whatsapp';
  actionTarget?: string;
  updatedAt?: string;
}

export const DEFAULT_OFFER_SLIDES: OfferSlideItem[] = [
  {
    id: 'slide_1_mega_sale',
    enabled: true,
    badgeText: '🔥 মেগা ফ্ল্যাশ সেল ও সুপার ডিসকাউন্ট',
    badgeTextEn: '🔥 MEGA FLASH SALE & SUPER DEALS',
    title: 'সীমিত সময়ের জন্য বিশেষ এক্সক্লুসিভ অফার!',
    titleEn: 'Limited-Time Exclusive Deal for You!',
    subtitle: 'আমাদের যেকোনো ট্রেন্ডি স্মার্ট গ্যাজেট ও অ্যাক্সেসরিজ অর্ডারে উপভোগ করুন আকর্ষণীয় ক্যাশব্যাক ও ফ্ল্যাট ডিসকাউন্ট।',
    subtitleEn: 'Enjoy massive instant discounts and verified Cash on Delivery across Bangladesh on all original gadgets.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    highlightType: 'coupon',
    couponCode: 'OFFER50',
    couponDiscountText: '৫০% পর্যন্ত ছাড়',
    couponDiscountTextEn: 'Up to 50% OFF',
    buttonText: '🛍️ এখনই অফারটি উপভোগ করুন',
    buttonTextEn: '🛍️ Claim Offer Now',
    actionType: 'shop',
    actionTarget: '',
  },
  {
    id: 'slide_2_flash_deal',
    enabled: true,
    badgeText: '⚡ ফ্ল্যাশ সেল কাউন্টডাউন',
    badgeTextEn: '⚡ FLASH SALE COUNTDOWN',
    title: 'আজকের ফ্ল্যাশ সেল অফার শেষ হতে আর কিছুক্ষণ!',
    titleEn: 'Today’s Flash Deals Ending Very Soon!',
    subtitle: 'স্টক সীমিত! আপনার পছন্দের স্মার্ট ওয়াচ ও হেডফোন লুফে নিন সেরা মূল্যে ক্যাশ অন ডেলিভারিতে।',
    subtitleEn: 'Grab top trending smartwatches and audio accessories at unbeatable prices before stock runs out.',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    highlightType: 'countdown',
    countdownHours: 12,
    customHighlightTitle: '⚡ অফার শেষ হতে বাকি:',
    customHighlightTitleEn: '⚡ Offer ends in:',
    buttonText: '⚡ ফ্ল্যাশ সেল পণ্যগুলো দেখুন',
    buttonTextEn: '⚡ View Flash Sale Items',
    actionType: 'flash_sale',
    actionTarget: '',
  },
  {
    id: 'slide_3_free_delivery',
    enabled: true,
    badgeText: '🚚 ফ্রি ডেলিভারি অফার',
    badgeTextEn: '🚚 FREE DELIVERY PROMO',
    title: 'সারাদেশে সম্পূর্ণ ফ্রি হোম ডেলিভারি অফার!',
    titleEn: 'Free Express Home Delivery Nationwide!',
    subtitle: 'যেকোনো প্রিমিয়াম গ্যাজেট ও গ্যাজেট এক্সেসরিজ অর্ডারে কোনো ডেলিভারি চার্জ লাগবে না।',
    subtitleEn: 'Zero shipping cost on all orders. Safe packaging and instant verified Cash on Delivery.',
    imageUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80',
    highlightType: 'free_delivery',
    customHighlightTitle: '🎁 ফ্রি এক্সপ্রেস ডেলিভারি সারা বাংলাদেশ',
    customHighlightTitleEn: '🎁 Free Express Delivery Nationwide',
    customHighlightSubtitle: 'শর্তহীন ফ্রি হোম ডেলিভারি ও দ্রুত সার্ভিস',
    customHighlightSubtitleEn: 'No minimum order required today only',
    buttonText: '📦 ফ্রি ডেলিভারিতে অর্ডার করুন',
    buttonTextEn: '📦 Order with Free Delivery',
    actionType: 'shop',
    actionTarget: '',
  },
];

export const DEFAULT_OFFER_POPUP_SETTINGS: OfferPopupSettings = {
  enabled: true,
  delaySeconds: 2.5,
  autoSlideInterval: 4.5,
  showOncePerSession: true,
  slides: DEFAULT_OFFER_SLIDES,
  badgeText: '🔥 মেগা ফ্ল্যাশ সেল ও সুপার ডিসকাউন্ট',
  badgeTextEn: '🔥 MEGA FLASH SALE & SUPER DEALS',
  title: 'সীমিত সময়ের জন্য বিশেষ এক্সক্লুসিভ অফার!',
  titleEn: 'Limited-Time Exclusive Deal for You!',
  subtitle: 'আমাদের যেকোনো ট্রেন্ডি স্মার্ট গ্যাজেট ও অ্যাক্সেসরিজ অর্ডারে উপভোগ করুন আকর্ষণীয় ক্যাশব্যাক ও ফ্ল্যাট ডিসকাউন্ট।',
  subtitleEn: 'Enjoy massive instant discounts and verified Cash on Delivery across Bangladesh on all original gadgets.',
  imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  couponCode: 'OFFER50',
  couponDiscountText: '৫০% পর্যন্ত ছাড়',
  couponDiscountTextEn: 'Up to 50% OFF',
  buttonText: '🛍️ এখনই অফারটি উপভোগ করুন',
  buttonTextEn: '🛍️ Claim Offer Now',
  actionType: 'shop',
  actionTarget: '',
};

export interface CourierFraudReport {
  phone: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders?: number;
  successRate: number; // percentage (0 to 100)
  riskLevel: 'safe' | 'moderate' | 'high_risk' | 'unknown';
  riskReason?: string;
  courierSource?: string;
  checkedAt: string;
  rawDetails?: any;
}

export interface ChatBotRuleActionData {
  suggestedProductIds?: string[];
  couponCode?: string;
  targetUrl?: string;
  agentPhone?: string;
  telegramUsername?: string;
  prefilledOrderProductId?: string;
  quickButtons?: Array<{
    label: string;
    action: 'open_order' | 'suggest_products' | 'connect_whatsapp' | 'connect_telegram' | 'view_policy' | 'custom_url';
    payload?: string;
    icon?: string;
  }>;
}

export interface ChatBotRule {
  id: string;
  name: string;
  nameBn?: string;
  description?: string;
  enabled: boolean;
  priority: number; // Lower numbers have higher priority (1 is highest)
  matchType: 'contains_any' | 'contains_all' | 'exact' | 'regex' | 'intent';
  keywords: string[]; // List of trigger keywords/phrases
  actionType:
    | 'auto_reply'
    | 'suggest_products'
    | 'open_order_form'
    | 'connect_whatsapp'
    | 'connect_telegram'
    | 'apply_coupon'
    | 'view_policy'
    | 'quick_buttons';
  replyMessage: string;
  replyMessageBn?: string;
  actionData?: ChatBotRuleActionData;
  triggerCount?: number;
  lastTriggeredAt?: string;
  category?: 'Orders' | 'Delivery' | 'Payment' | 'Support' | 'Discount' | 'General';
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
  staffEmail?: string;
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
    | 'Integration'
    | string;
  targetId: string;
  orderId?: string;
  productId?: string;
  fromStatus?: string;
  toStatus?: string;
  source?: 'admin' | 'muse_integration' | 'system' | string;
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
  orderId?: string;
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
  telegramChatId?: string;
  telegramUsername?: string;
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

export type PolicyTab = 'return' | 'exchange' | 'privacy' | 'terms' | 'refund' | 'faq' | string;

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
  webhookUrl?: string; // Google Apps Script Webhook or HTTP Webhook for Netlify
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

export interface WhatsAppMessageRecord {
  id: string; // Meta message ID (wamid) or generated ID
  direction: 'incoming' | 'outgoing';
  from: string;
  to?: string;
  senderName?: string;
  text?: string;
  messageType: 'text' | 'interactive' | 'template' | 'image' | 'video' | 'audio' | 'voice' | 'button' | 'location' | 'document' | 'other';
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'voice' | 'document';
  mediaCaption?: string;
  filename?: string;
  rawPayload?: any;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  timestamp: string;
  orderId?: string;
  error?: string;
  staffMember?: string;
  staffId?: string;
  staffRole?: string;
  readAt?: string;
  readBy?: string;
  updatedAt?: string;
}

export interface WhatsAppConversation {
  phoneNumber: string;
  customerName?: string;
  isPinned?: boolean;
  lastMessage?: WhatsAppMessageRecord;
  unreadCount: number;
  totalMessages: number;
  is24hWindowActive: boolean;
  windowExpiresAt?: string;
  messages: WhatsAppMessageRecord[];
}

export type WhatsAppEventType =
  | 'user_registered'
  | 'order_placed'
  | 'order_confirmed'
  | 'order_shipped'
  | 'out_for_delivery'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_received'
  | 'payment_number_updated'
  | 'admin_pinned_order_alert'
  | 'admin_pinned_status_alert'
  | 'admin_pinned_fake_order_alert'
  | 'admin_pinned_registration_alert'
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
  pinnedAdminNumber?: string; // Pinned WhatsApp number for Admin Alerts
  senderName: string; // e.g. "KenaX BD Official"
  provider: 'direct_link' | 'ultramsg' | 'wasender' | 'green_api' | 'cloud_api';
  instanceId?: string;
  apiKey?: string;
  webhookUrl?: string;
  autoSendOnRegistration?: boolean;
  autoSendOnNewOrder: boolean;
  autoSendOnStatusChange?: boolean;
  autoSendOnShipped: boolean;
  autoSendOnDelivered: boolean;
  autoSendOnPayment: boolean;
  autoSendOnPaymentUpdate?: boolean;
  autoSendToPinnedAdmin?: boolean;
  templates: Record<WhatsAppEventType, WhatsAppTemplate>;
}

// Telegram Bot Types
export type TelegramEventType =
  | 'admin_new_order'
  | 'admin_user_registered'
  | 'super_admin_staff_activity'
  | 'customer_order_placed'
  | 'customer_order_status_update'
  | 'customer_order_delivered'
  | 'channel_new_product'
  | 'super_admin_product_created'
  | 'channel_discount_alert'
  | 'channel_coupon_alert'
  | 'super_admin_discount_coupon_activity'
  | 'admin_fake_order_alert';

export interface TelegramTemplate {
  id: TelegramEventType;
  title: string;
  banglaTitle: string;
  recipientType: 'admin' | 'super_admin' | 'staff' | 'customer';
  enabled: boolean;
  message: string;
  variables: string[];
}

export interface TelegramLog {
  id: string;
  timestamp: string;
  eventType: TelegramEventType;
  recipientChatId: string;
  recipientType: 'admin' | 'super_admin' | 'staff' | 'customer';
  recipientName?: string;
  orderId?: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  messagePreview: string;
}

export interface TelegramBotSettings {
  enabled: boolean;
  botToken: string;
  botUsername?: string;
  superAdminChatId: string; // sadikrtx3060 / super admin chatId
  adminChatIds: string[]; // admin, manager, moderator chat or channel IDs
  moderatorChatIds?: string[];
  channelId?: string; // Telegram Channel ID (e.g. @kenaxbd_channel or -100xxxxxxxxxx)
  channelUsername?: string;
  
  // Feature Toggles
  notifyAdminOnNewOrder: boolean;
  notifyStaffOnNewOrder: boolean;
  notifyAdminOnUserRegister: boolean;
  notifyCustomerOnOrderPlaced: boolean;
  notifySuperAdminOnStaffActivity: boolean;
  notifyCustomerOnStatusUpdate: boolean;

  // Telegram Channel & Product / Discount / Coupon Broadcasts
  postNewProductsToChannel?: boolean;
  postDiscountsToChannel?: boolean;
  postCouponsToChannel?: boolean;
  notifySuperAdminOnProductCreated?: boolean;
  notifySuperAdminOnDiscountCreated?: boolean;
  notifySuperAdminOnCouponCreated?: boolean;

  customerNotifyStatuses: {
    confirmed: boolean;
    processing: boolean;
    picked: boolean;
    shipped: boolean;
    delivered: boolean;
    cancelled: boolean;
    refunded: boolean;
  };

  // Telegram Mini App Integration Settings
  telegramMiniAppEnabled?: boolean;
  telegramMiniAppButtonTitle?: string;
  telegramMiniAppAutoFill?: boolean;
  telegramMiniAppHaptics?: boolean;
  telegramMiniAppThemeSync?: boolean;
  telegramMiniAppTrackOrderButton?: boolean;

  templates: Record<TelegramEventType, TelegramTemplate>;
}

export interface ProductHistoryEntry {
  type: 'product' | 'view';
  view: string;
  productId?: string;
  productName?: string;
  category?: string;
  subcategory?: string;
  subSubcategory?: string;
  tag?: string;
  searchQuery?: string;
  scrollY?: number;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
  source?: string;
  status: 'active' | 'unsubscribed';
}
