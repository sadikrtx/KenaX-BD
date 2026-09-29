import { Product, OrderItem, DeliveryAddress } from './index';

export type SellerPlanId = 'basic' | 'standard' | 'premium';

export interface SellerPlan {
  id: SellerPlanId;
  name: string;
  monthlyPrice: number; // in BDT
  yearlyPrice: number; // in BDT (discounted)
  productLimit: number; // -1 for unlimited
  commissionRate: number; // e.g. 10 for 10%
  imageLimitPerProduct: number;
  features: string[];
  featuredProductSlots: number;
  analyticsLevel: 'basic' | 'advanced' | 'enterprise';
  supportLevel: 'standard' | 'priority' | 'dedicated_24_7';
  customDomainSupport: boolean;
  couponToolsEnabled: boolean;
  promotionalToolsEnabled: boolean;
  status: 'active' | 'inactive';
}

export type SellerVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type SellerAccountStatus = 'active' | 'suspended' | 'pending_approval';

export interface SellerPaymentInfo {
  bkash?: string;
  nagad?: string;
  rocket?: string;
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  accountHolderName?: string;
  routingNumber?: string;
}

export interface SellerStoreConfig {
  storeName: string;
  storeSlug: string;
  logoUrl: string;
  bannerUrl: string;
  description: string;
  headline?: string;
  announcement?: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  district: string;
  upazila: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    youtube?: string;
  };
  featuredCategories?: string[];
  returnPolicy?: string;
  shippingPolicy?: string;
}

export interface SellerUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  username: string;
  password?: string;
  profilePhoto?: string;
  sellerType: 'individual' | 'registered_business' | 'authorized_distributor' | 'brand';
  planId: SellerPlanId;
  selectedPlanId?: SellerPlanId;
  billingCycle: 'monthly' | 'yearly';
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'pending_renewal' | 'cancelled';
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  paymentMethod?: 'bkash' | 'nagad' | 'rocket' | 'bank' | 'none';
  paymentSenderNumber?: string;
  paymentTxId?: string;
  paymentAmount?: number;
  paymentProofNote?: string;
  paymentSubmittedAt?: string;
  rejectionReason?: string;
  onboardingStep: number; // 1 to 8 (8 = completed)
  onboardingCompleted: boolean;
  verificationStatus: SellerVerificationStatus;
  accountStatus: SellerAccountStatus;
  nidNumber?: string;
  tradeLicenseNo?: string;
  tinNumber?: string;
  store: SellerStoreConfig;
  paymentInfo: SellerPaymentInfo;
  walletBalance: number;
  pendingBalance: number; // In escrow / transit
  totalEarnings: number;
  totalMarketplaceCommission: number;
  totalWithdrawn: number;
  rating: number;
  totalReviews: number;
  followersCount: number;
  createdAt: string;
  updatedAt?: string;
}

export type SellerSubOrderStatus =
  | 'New'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Ready for Pickup'
  | 'Picked Up'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned'
  | 'Refunded';

export interface SellerSubOrder {
  id: string; // e.g. "ORD-10001-A"
  parentOrderId: string; // "ORD-10001"
  sellerId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  commissionPercentage: number;
  commissionAmount: number;
  netSellerEarnings: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Refunded';
  orderStatus: SellerSubOrderStatus;
  packagingDeadline?: string;
  packedAt?: string;
  pickupReadyAt?: string;
  deliveredAt?: string;
  courierName?: string;
  trackingCode?: string;
  customerInfo: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district?: string;
    notes?: string;
  };
  sellerInternalNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SellerLedgerTransaction {
  id: string;
  sellerId: string;
  orderId?: string;
  payoutId?: string;
  type:
    | 'order_sale'
    | 'commission_deduction'
    | 'withdrawal_payout'
    | 'subscription_fee'
    | 'refund_adjustment'
    | 'promotional_fee';
  description: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number; // positive = credit, negative = debit
  runningBalance: number;
  status: 'Completed' | 'Pending' | 'Reversed' | 'Failed';
  createdAt: string;
}

export interface SellerWithdrawalRequest {
  id: string;
  sellerId: string;
  sellerName: string;
  shopName: string;
  amount: number;
  withdrawalFee: number;
  payableAmount: number;
  method: 'bkash' | 'nagad' | 'rocket' | 'bank';
  accountDetails: string;
  status: 'Requested' | 'Pending Review' | 'Approved' | 'Processing' | 'Paid' | 'Rejected' | 'Failed';
  requestedAt: string;
  reviewedAt?: string;
  paidAt?: string;
  transactionRef?: string;
  adminNotes?: string;
  rejectionReason?: string;
}

export interface SellerCoupon {
  id: string;
  sellerId: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  startDate: string;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  applicableProductIds?: string[]; // empty = all seller products
  status: 'active' | 'expired' | 'disabled';
  createdAt: string;
}

export interface SellerSupportTicket {
  id: string;
  sellerId: string;
  shopName: string;
  subject: string;
  category: 'Orders & Shipping' | 'Payment & Payout' | 'Products & Catalog' | 'Account & Verification' | 'Technical';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  description: string;
  messages: {
    id: string;
    sender: 'seller' | 'admin';
    senderName: string;
    message: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface SellerCampaign {
  id: string;
  sellerId: string;
  productId: string;
  productName: string;
  productImage: string;
  type: 'featured_listing' | 'flash_sale' | 'mega_discount' | 'store_spotlight';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'ended';
  durationDays: number;
  proposedDiscount?: number;
  adminRemarks?: string;
}

export interface SellerReview {
  id: string;
  sellerId: string;
  productId: string;
  productName: string;
  productImage: string;
  customerName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  sellerReply?: {
    message: string;
    repliedAt: string;
  };
}

export interface ResellerSellerReview {
  id: string;
  sellerId: string;
  sellerShopName: string;
  resellerId: string;
  resellerName: string;
  resellerCity?: string;
  rating: number; // 1 to 5
  dispatchSpeedRating: number; // 1 to 5
  productQualityRating: number; // 1 to 5
  packagingRating: number; // 1 to 5
  comment: string;
  verifiedOrderCount?: number;
  createdAt: string;
}

