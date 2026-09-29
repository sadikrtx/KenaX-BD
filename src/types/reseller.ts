import { Product, Order, OrderItem } from './index';

export type ResellerPlanId = 'basic' | 'standard' | 'premium';

export interface ResellerPlan {
  id: ResellerPlanId;
  name: string;
  monthlyPrice: number; // in BDT (0 for Basic)
  yearlyPrice: number; // in BDT
  maxMonthlyOrders: number; // -1 for unlimited
  maxCustomers: number; // -1 for unlimited
  productAccessLevel: 'limited' | 'standard' | 'all';
  bonusProfitPercentage: number; // e.g. 0% for basic, 2% for standard, 5% for premium
  analyticsLevel: 'basic' | 'advanced' | 'enterprise';
  marketingToolsEnabled: boolean;
  productSharingEnabled: boolean;
  bulkOrderingEnabled: boolean;
  referralRewardEnabled: boolean;
  vipEligible: boolean;
  supportLevel: 'standard' | 'priority' | 'dedicated_hotline';
  features: string[];
  status: 'active' | 'inactive';
}

export interface ResellerCustomer {
  id: string;
  resellerId: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  district: string;
  upazila?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ResellerPaymentInfo {
  bkash?: string;
  nagad?: string;
  rocket?: string;
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  accountHolderName?: string;
  routingNumber?: string;
}

export interface ResellerUser {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  username: string;
  password?: string;
  district: string;
  area: string;
  address?: string;
  profilePhoto?: string;
  businessName?: string;
  planId: ResellerPlanId;
  billingCycle: 'monthly' | 'yearly';
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'cancelled';
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  onboardingStep: number;
  onboardingCompleted: boolean;
  isVIP: boolean;
  vipSince?: string;
  referralCode: string;
  referredBy?: string;
  totalReferralEarnings: number;
  walletBalance: number;
  pendingProfit: number;
  totalProfit: number;
  totalSales: number;
  totalWithdrawn: number;
  activeCustomersCount: number;
  paymentInfo: ResellerPaymentInfo;
  accountStatus: 'active' | 'suspended' | 'pending';
  // Dedicated White-Label Sub-Store & Custom Invoice Branding
  subDomain?: string; // e.g. "shakil-store"
  subStoreTitle?: string; // e.g. "Shakil Fashion & Gadgets"
  subStoreLogo?: string; // custom logo URL for store and invoice
  subStorePhone?: string; // custom contact phone on invoice
  subStoreAddress?: string; // custom store address on invoice
  subStoreTagline?: string; // e.g. "Premium Quality Products at Lowest Prices"
  subStoreThemeColor?: string; // e.g. "#10b981"
  subStoreFbPixelId?: string; // Meta Pixel ID
  subStoreTikTokPixelId?: string; // TikTok Pixel ID
  subStoreGaId?: string; // Google Analytics ID
  subStoreCapiToken?: string; // Conversions API Token
  subStoreCustomInvoiceFooter?: string; // e.g. "Thank you for shopping with Shakil Store! For support call 01799887766"
  subStoreEnabled?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ResellerAdCampaign {
  id: string;
  resellerId: string;
  resellerName: string;
  resellerStoreName: string;
  campaignTitle: string;
  platform: 'facebook' | 'tiktok' | 'google' | 'instagram';
  pixelId: string;
  capiToken?: string;
  budgetBDT: number;
  spentBDT: number;
  dailyLimitBDT: number;
  targetAudience: string;
  clicks: number;
  impressions: number;
  conversions: number;
  revenueBDT: number;
  roas: number; // e.g. 4.2
  status: 'active' | 'paused' | 'pending' | 'completed';
  landingPageUrl?: string;
  productIds: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ResellerTransaction {
  id: string;
  resellerId: string;
  orderId?: string;
  type: 'profit_credit' | 'withdrawal' | 'referral_bonus' | 'adjustment' | 'subscription_fee';
  amount: number;
  balanceAfter: number;
  status: 'pending' | 'available' | 'completed' | 'reversed';
  description: string;
  date: string;
}

export interface ResellerWithdrawal {
  id: string;
  resellerId: string;
  resellerName: string;
  resellerPhone: string;
  amount: number;
  fee: number;
  netAmount: number;
  method: 'bkash' | 'nagad' | 'rocket' | 'bank';
  accountNumber: string;
  bankName?: string;
  bankBranch?: string;
  accountHolderName?: string;
  status: 'requested' | 'pending' | 'approved' | 'paid' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  txId?: string;
  adminNote?: string;
}

export interface ResellerSupportTicket {
  id: string;
  resellerId: string;
  resellerName: string;
  subject: string;
  category: 'order' | 'profit' | 'withdrawal' | 'product' | 'account' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  attachmentUrl?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  replies: {
    sender: 'reseller' | 'support' | 'admin';
    senderName: string;
    message: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt?: string;
}

export interface ResellerNotification {
  id: string;
  resellerId: string;
  title: string;
  message: string;
  type: 'order' | 'profit' | 'withdrawal' | 'product' | 'system' | 'referral' | 'plan';
  linkTab?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ResellerPlanUpgradeRequest {
  id: string;
  resellerId: string;
  resellerName: string;
  resellerPhone: string;
  resellerBusinessName?: string;
  currentPlanId: ResellerPlanId;
  targetPlanId: ResellerPlanId;
  targetPlanName: string;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'bank';
  senderPhone: string;
  transactionId: string;
  adminPaymentNumber: string;
  proofNote?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNote?: string;
}

