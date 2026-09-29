import {
  SellerPlan,
  SellerUser,
  SellerSubOrder,
  SellerLedgerTransaction,
  SellerWithdrawalRequest,
  SellerCoupon,
  SellerSupportTicket,
  SellerCampaign,
  SellerReview,
  SellerPlanId,
  SellerSubOrderStatus,
} from '../types/seller';
import { Product, Order, OrderItem } from '../types/index.ts';
import { safeSetLocalStorage } from './storage';

const PLANS_KEY = 'kenax_marketplace_plans_v1';
const SELLERS_KEY = 'kenax_marketplace_sellers_v1';
const SUBORDERS_KEY = 'kenax_marketplace_suborders_v1';
const LEDGER_KEY = 'kenax_marketplace_ledger_v1';
const WITHDRAWALS_KEY = 'kenax_marketplace_withdrawals_v1';
const COUPONS_KEY = 'kenax_marketplace_coupons_v1';
const TICKETS_KEY = 'kenax_marketplace_tickets_v1';
const CAMPAIGNS_KEY = 'kenax_marketplace_campaigns_v1';
const REVIEWS_KEY = 'kenax_marketplace_reviews_v1';
const CURRENT_SELLER_KEY = 'kenax_active_seller_session_v1';

// Default Admin-Configurable Marketplace Plans
export const DEFAULT_SELLER_PLANS: SellerPlan[] = [
  {
    id: 'basic',
    name: 'Basic Starter',
    monthlyPrice: 0, // Free / Starter tier
    yearlyPrice: 0,
    productLimit: 25,
    commissionRate: 12, // 12% marketplace commission
    imageLimitPerProduct: 4,
    features: [
      'Up to 25 Live Products',
      'Standard Shop Customization',
      'Real-time Order & Packaging Management',
      'Basic Sales & Order Analytics',
      'Standard Customer & Platform Support',
      '12% Marketplace Commission',
      'Standard Courier Integration',
    ],
    featuredProductSlots: 0,
    analyticsLevel: 'basic',
    supportLevel: 'standard',
    customDomainSupport: false,
    couponToolsEnabled: false,
    promotionalToolsEnabled: false,
    status: 'active',
  },
  {
    id: 'standard',
    name: 'Standard Pro',
    monthlyPrice: 990, // ৳990 / month
    yearlyPrice: 9900, // ৳9,900 / year (2 months free)
    productLimit: 150,
    commissionRate: 9, // 9% marketplace commission
    imageLimitPerProduct: 8,
    features: [
      'Up to 150 Live Products',
      'Full Shop Branding & Custom Banners',
      'Advanced Sales & Product Analytics',
      'Seller Coupon & Discount Creator',
      'Featured Marketplace Visibility',
      '9% Lower Marketplace Commission',
      'Priority Support Hotline',
      'Flash Sale Campaign Access',
    ],
    featuredProductSlots: 3,
    analyticsLevel: 'advanced',
    supportLevel: 'priority',
    customDomainSupport: false,
    couponToolsEnabled: true,
    promotionalToolsEnabled: true,
    status: 'active',
  },
  {
    id: 'premium',
    name: 'Premium Enterprise',
    monthlyPrice: 2490, // ৳2,490 / month
    yearlyPrice: 24900, // ৳24,900 / year
    productLimit: -1, // Unlimited
    commissionRate: 6, // 6% marketplace commission
    imageLimitPerProduct: 12,
    features: [
      'Unlimited Product Uploads',
      'VIP Verified Official Seller Badge',
      'Lowest 6% Marketplace Commission',
      'Homepage & Category Spotlight Banners',
      'Advanced Customer & Conversion Metrics',
      'Unlimited Seller Coupons & Promo Codes',
      '24/7 Dedicated Account Manager Support',
      'Priority Courier Pickup & Fast Settlement',
      'Custom SEO & Video Gallery Hosting',
    ],
    featuredProductSlots: 10,
    analyticsLevel: 'enterprise',
    supportLevel: 'dedicated_24_7',
    customDomainSupport: true,
    couponToolsEnabled: true,
    promotionalToolsEnabled: true,
    status: 'active',
  },
];

// Initial Demo Sellers
export const DEFAULT_SELLERS: SellerUser[] = [
  {
    id: 'seller-apex-101',
    fullName: 'Rahim Chowdhury',
    email: 'apex.seller@kenaxbd.com',
    phone: '01711002233',
    username: 'seller_apex',
    password: 'seller123',
    sellerType: 'registered_business',
    planId: 'premium',
    billingCycle: 'monthly',
    subscriptionStatus: 'active',
    subscriptionStartDate: new Date(Date.now() - 60 * 86400000).toISOString(),
    subscriptionEndDate: new Date(Date.now() + 300 * 86400000).toISOString(),
    onboardingStep: 8,
    onboardingCompleted: true,
    verificationStatus: 'verified',
    accountStatus: 'active',
    tradeLicenseNo: 'TRAD-DHK-88392',
    tinNumber: 'TIN-9948201948',
    store: {
      storeName: 'Apex Electronics BD',
      storeSlug: 'apex-electronics',
      logoUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300',
      bannerUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200',
      description: 'Official Premium Electronics & Smart Gadgets Partner in Bangladesh. 100% Authentic Products with 1-Year Official Warranty.',
      headline: 'Official Tech & Gadgets Store',
      announcement: 'Special 10% Discount on all Smartwatches this week!',
      contactEmail: 'support@apexelectronics.com',
      contactPhone: '01711002233',
      address: 'Shop 42, Level 3, Multiplan Center, New Elephant Road',
      district: 'Dhaka',
      upazila: 'Dhanmondi',
      socialLinks: {
        facebook: 'https://facebook.com/apexelectronicsbd',
        whatsapp: '+8801711002233',
      },
      featuredCategories: ['Smartwatch', 'Earbuds & Audio', 'Gadgets'],
      returnPolicy: '7 Days Easy Return for manufacturer defects.',
      shippingPolicy: '24-48 Hours Express Delivery in Dhaka, 48-72 Hours Nationwide.',
    },
    paymentInfo: {
      bkash: '01711002233',
      nagad: '01711002233',
      bankName: 'City Bank PLC',
      bankAccount: '1102938475001',
      bankBranch: 'Gulshan 2, Dhaka',
      accountHolderName: 'Apex Electronics BD',
      routingNumber: '225271829',
    },
    walletBalance: 28450,
    pendingBalance: 7200,
    totalEarnings: 194500,
    totalMarketplaceCommission: 12400,
    totalWithdrawn: 153650,
    rating: 4.9,
    totalReviews: 84,
    followersCount: 1420,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: 'seller-gadget-202',
    fullName: 'Tanvir Hasan',
    email: 'tanvir.seller@kenaxbd.com',
    phone: '01822334455',
    username: 'seller_gadget',
    password: 'seller123',
    sellerType: 'individual',
    planId: 'standard',
    billingCycle: 'monthly',
    subscriptionStatus: 'active',
    subscriptionStartDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    subscriptionEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    onboardingStep: 8,
    onboardingCompleted: true,
    verificationStatus: 'verified',
    accountStatus: 'active',
    nidNumber: '1992837461928',
    store: {
      storeName: 'Gadget Mania BD',
      storeSlug: 'gadget-mania',
      logoUrl: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=300',
      bannerUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200',
      description: 'Your trusted hub for premium mobile accessories, wireless earphones, power banks, and gaming accessories.',
      headline: 'Best Deals on Mobile Accessories',
      contactEmail: 'gadgetmaniabd@gmail.com',
      contactPhone: '01822334455',
      address: 'Shop 15, GEC Circle, Agrabad',
      district: 'Chittagong',
      upazila: 'Kotwali',
      featuredCategories: ['Mobile Accessories', 'Audio'],
    },
    paymentInfo: {
      bkash: '01822334455',
      nagad: '01822334455',
      bankName: 'BRAC Bank PLC',
      bankAccount: '1501203948571',
      accountHolderName: 'Tanvir Hasan',
    },
    walletBalance: 12300,
    pendingBalance: 3400,
    totalEarnings: 68500,
    totalMarketplaceCommission: 6165,
    totalWithdrawn: 52800,
    rating: 4.8,
    totalReviews: 39,
    followersCount: 680,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
];

// Initial Demo Sub-orders for Sellers
export const DEFAULT_SUBORDERS: SellerSubOrder[] = [
  {
    id: 'ORD-10021-A',
    parentOrderId: 'ORD-10021',
    sellerId: 'seller-apex-101',
    items: [
      {
        productId: 'prod-watch-1',
        productName: 'Ultra Pro Smartwatch Series 9 (Amoled Display, Bluetooth Calling)',
        name: 'Ultra Pro Smartwatch Series 9 (Amoled Display, Bluetooth Calling)',
        price: 3250,
        quantity: 1,
        total: 3250,
        productImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
        sku: 'APX-W9-BLK',
      },
    ],
    subtotal: 3250,
    discount: 0,
    deliveryCharge: 60,
    commissionPercentage: 6,
    commissionAmount: 195,
    netSellerEarnings: 3055,
    paymentStatus: 'Unpaid',
    orderStatus: 'Ready for Pickup',
    packagingDeadline: new Date(Date.now() + 12 * 3600000).toISOString(),
    packedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    pickupReadyAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    courierName: 'Steadfast Courier',
    trackingCode: 'ST-9920194',
    customerInfo: {
      name: 'Ashfaqur Rahman',
      phone: '01719876543',
      address: 'House 12, Road 4, Sector 7, Uttara',
      city: 'Dhaka',
      district: 'Dhaka',
      notes: 'Please call before delivery',
    },
    sellerInternalNotes: 'Packed securely in bubble wrap with official warranty card.',
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: 'ORD-10019-A',
    parentOrderId: 'ORD-10019',
    sellerId: 'seller-apex-101',
    items: [
      {
        productId: 'prod-earbuds-1',
        productName: 'Pro ANC Wireless Noise Cancelling Earbuds 2026',
        name: 'Pro ANC Wireless Noise Cancelling Earbuds 2026',
        price: 2450,
        quantity: 2,
        total: 4900,
        productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
        sku: 'APX-ANC-WHT',
      },
    ],
    subtotal: 4900,
    discount: 200,
    deliveryCharge: 60,
    commissionPercentage: 6,
    commissionAmount: 282,
    netSellerEarnings: 4418,
    paymentStatus: 'Paid',
    orderStatus: 'Delivered',
    deliveredAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    courierName: 'Pathao Courier',
    trackingCode: 'PTH-8839201',
    customerInfo: {
      name: 'Farhana Sultana',
      phone: '01812345678',
      address: 'Flat 4B, Gulshan Lake View Apartments',
      city: 'Dhaka',
      district: 'Dhaka',
    },
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
  {
    id: 'ORD-10022-A',
    parentOrderId: 'ORD-10022',
    sellerId: 'seller-apex-101',
    items: [
      {
        productId: 'prod-watch-1',
        productName: 'Ultra Pro Smartwatch Series 9 (Amoled Display, Bluetooth Calling)',
        name: 'Ultra Pro Smartwatch Series 9 (Amoled Display, Bluetooth Calling)',
        price: 3250,
        quantity: 1,
        total: 3250,
        productImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
        sku: 'APX-W9-SLV',
      },
    ],
    subtotal: 3250,
    discount: 0,
    deliveryCharge: 120,
    commissionPercentage: 6,
    commissionAmount: 195,
    netSellerEarnings: 3055,
    paymentStatus: 'Unpaid',
    orderStatus: 'Confirmed',
    packagingDeadline: new Date(Date.now() + 18 * 3600000).toISOString(),
    customerInfo: {
      name: 'Mahmudul Hasan',
      phone: '01912987654',
      address: 'Holding 45, Station Road',
      city: 'Sylhet',
      district: 'Sylhet',
    },
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

// Initial Ledger Transactions
export const DEFAULT_LEDGER: SellerLedgerTransaction[] = [
  {
    id: 'LED-901',
    sellerId: 'seller-apex-101',
    orderId: 'ORD-10019-A',
    type: 'order_sale',
    description: 'Delivered Order Sale (ORD-10019-A) - 2x Pro ANC Earbuds',
    grossAmount: 4700,
    commissionAmount: 282,
    netAmount: 4418,
    runningBalance: 28450,
    status: 'Completed',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'LED-895',
    sellerId: 'seller-apex-101',
    payoutId: 'WD-501',
    type: 'withdrawal_payout',
    description: 'Withdrawal to Bank Account (City Bank PLC - 1102938475001)',
    grossAmount: 25000,
    commissionAmount: 0,
    netAmount: -25000,
    runningBalance: 24032,
    status: 'Completed',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

// Initial Withdrawals
export const DEFAULT_WITHDRAWALS: SellerWithdrawalRequest[] = [
  {
    id: 'WD-501',
    sellerId: 'seller-apex-101',
    sellerName: 'Rahim Chowdhury',
    shopName: 'Apex Electronics BD',
    amount: 25000,
    withdrawalFee: 0,
    payableAmount: 25000,
    method: 'bank',
    accountDetails: 'City Bank PLC (Acc: 1102938475001, Branch: Gulshan 2)',
    status: 'Paid',
    requestedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    reviewedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    paidAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    transactionRef: 'CB-TXN-9948201',
  },
];

// Initial Support Tickets
export const DEFAULT_TICKETS: SellerSupportTicket[] = [
  {
    id: 'TCK-201',
    sellerId: 'seller-apex-101',
    shopName: 'Apex Electronics BD',
    subject: 'Request for Courier Express Pickup Dispatch',
    category: 'Orders & Shipping',
    priority: 'high',
    status: 'In Progress',
    description: 'We have 15 packed orders ready for pickup at our Dhanmondi hub. Please assign courier pickup rider before 4 PM.',
    messages: [
      {
        id: 'msg-1',
        sender: 'seller',
        senderName: 'Rahim (Apex Electronics)',
        message: 'Hello Admin, we have 15 orders ready to be picked up today. Please notify Steadfast rider.',
        timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
      },
      {
        id: 'msg-2',
        sender: 'admin',
        senderName: 'Sadik (KenaX Admin)',
        message: 'Rider assigned! Pathao & Steadfast logistics will arrive at your shop between 2:30 PM - 3:30 PM.',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
];

// Initial Reviews for Sellers
export const DEFAULT_SELLER_REVIEWS: SellerReview[] = [
  {
    id: 'REV-801',
    sellerId: 'seller-apex-101',
    productId: 'prod-watch-1',
    productName: 'Ultra Pro Smartwatch Series 9',
    productImage: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600',
    customerName: 'Tariqul Islam',
    rating: 5,
    comment: 'Awesome build quality! Received 100% original product with warranty card. Highly recommended seller!',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    sellerReply: {
      message: 'Thank you Tariqul bhai! Enjoy your new smartwatch and feel free to reach out anytime.',
      repliedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  },
  {
    id: 'REV-802',
    sellerId: 'seller-apex-101',
    productId: 'prod-earbuds-1',
    productName: 'Pro ANC Wireless Noise Cancelling Earbuds',
    productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
    customerName: 'Samira Khan',
    rating: 5,
    comment: 'Super fast packaging and delivery. The sound quality and ANC are mindblowing!',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
];

// ================= STORAGE GETTERS & SETTERS =================

export function getSellerPlans(): SellerPlan[] {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (!raw) {
      safeSetLocalStorage(PLANS_KEY, JSON.stringify(DEFAULT_SELLER_PLANS));
      return DEFAULT_SELLER_PLANS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SELLER_PLANS;
  } catch {
    return DEFAULT_SELLER_PLANS;
  }
}

export function saveSellerPlans(plans: SellerPlan[]): void {
  safeSetLocalStorage(PLANS_KEY, JSON.stringify(plans));
}

export function getSellers(): SellerUser[] {
  try {
    const raw = localStorage.getItem(SELLERS_KEY);
    if (!raw) {
      safeSetLocalStorage(SELLERS_KEY, JSON.stringify(DEFAULT_SELLERS));
      return DEFAULT_SELLERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SELLERS;
  } catch {
    return DEFAULT_SELLERS;
  }
}

export function saveSellers(sellers: SellerUser[]): void {
  safeSetLocalStorage(SELLERS_KEY, JSON.stringify(sellers));
}

export function getSellerSubOrders(): SellerSubOrder[] {
  try {
    const raw = localStorage.getItem(SUBORDERS_KEY);
    if (!raw) {
      safeSetLocalStorage(SUBORDERS_KEY, JSON.stringify(DEFAULT_SUBORDERS));
      return DEFAULT_SUBORDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_SUBORDERS;
  } catch {
    return DEFAULT_SUBORDERS;
  }
}

export function saveSellerSubOrders(suborders: SellerSubOrder[]): void {
  safeSetLocalStorage(SUBORDERS_KEY, JSON.stringify(suborders));
}

export function getSellerLedgers(): SellerLedgerTransaction[] {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) {
      safeSetLocalStorage(LEDGER_KEY, JSON.stringify(DEFAULT_LEDGER));
      return DEFAULT_LEDGER;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_LEDGER;
  } catch {
    return DEFAULT_LEDGER;
  }
}

export function saveSellerLedgers(ledger: SellerLedgerTransaction[]): void {
  safeSetLocalStorage(LEDGER_KEY, JSON.stringify(ledger));
}

export function getSellerWithdrawals(): SellerWithdrawalRequest[] {
  try {
    const raw = localStorage.getItem(WITHDRAWALS_KEY);
    if (!raw) {
      safeSetLocalStorage(WITHDRAWALS_KEY, JSON.stringify(DEFAULT_WITHDRAWALS));
      return DEFAULT_WITHDRAWALS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_WITHDRAWALS;
  } catch {
    return DEFAULT_WITHDRAWALS;
  }
}

export function saveSellerWithdrawals(withdrawals: SellerWithdrawalRequest[]): void {
  safeSetLocalStorage(WITHDRAWALS_KEY, JSON.stringify(withdrawals));
}

export function getSellerCoupons(): SellerCoupon[] {
  try {
    const raw = localStorage.getItem(COUPONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

export function saveSellerCoupons(coupons: SellerCoupon[]): void {
  safeSetLocalStorage(COUPONS_KEY, JSON.stringify(coupons));
}

export function getSellerTickets(): SellerSupportTicket[] {
  try {
    const raw = localStorage.getItem(TICKETS_KEY);
    if (!raw) {
      safeSetLocalStorage(TICKETS_KEY, JSON.stringify(DEFAULT_TICKETS));
      return DEFAULT_TICKETS;
    }
    return JSON.parse(raw) || DEFAULT_TICKETS;
  } catch {
    return DEFAULT_TICKETS;
  }
}

export function saveSellerTickets(tickets: SellerSupportTicket[]): void {
  safeSetLocalStorage(TICKETS_KEY, JSON.stringify(tickets));
}

export function getSellerReviews(): SellerReview[] {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    if (!raw) {
      safeSetLocalStorage(REVIEWS_KEY, JSON.stringify(DEFAULT_SELLER_REVIEWS));
      return DEFAULT_SELLER_REVIEWS;
    }
    return JSON.parse(raw) || DEFAULT_SELLER_REVIEWS;
  } catch {
    return DEFAULT_SELLER_REVIEWS;
  }
}

export function saveSellerReviews(reviews: SellerReview[]): void {
  safeSetLocalStorage(REVIEWS_KEY, JSON.stringify(reviews));
}

// Authenticated Seller Session
export function getActiveSellerSession(): SellerUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_SELLER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.id ? parsed : null;
  } catch {
    return null;
  }
}

export function setActiveSellerSession(seller: SellerUser | null): void {
  if (!seller) {
    localStorage.removeItem(CURRENT_SELLER_KEY);
  } else {
    safeSetLocalStorage(CURRENT_SELLER_KEY, JSON.stringify(seller));
  }
}
