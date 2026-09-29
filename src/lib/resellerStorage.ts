import {
  ResellerPlan,
  ResellerUser,
  ResellerCustomer,
  ResellerTransaction,
  ResellerWithdrawal,
  ResellerSupportTicket,
  ResellerNotification,
  ResellerPlanId,
  ResellerPlanUpgradeRequest,
  ResellerAdCampaign,
} from '../types/reseller';
import { safeSetLocalStorage } from './storage';

const RESELLER_PLANS_KEY = 'kenax_reseller_plans_v1';
const RESELLERS_KEY = 'kenax_reseller_accounts_v1';
const RESELLER_CUSTOMERS_KEY = 'kenax_reseller_customers_v1';
const RESELLER_TRANSACTIONS_KEY = 'kenax_reseller_transactions_v1';
const RESELLER_WITHDRAWALS_KEY = 'kenax_reseller_withdrawals_v1';
const RESELLER_TICKETS_KEY = 'kenax_reseller_tickets_v1';
const RESELLER_FAVORITES_KEY = 'kenax_reseller_favorites_v1';
const RESELLER_NOTIFICATIONS_KEY = 'kenax_reseller_notifications_v1';
const ACTIVE_RESELLER_SESSION_KEY = 'kenax_active_reseller_session_v1';
const RESELLER_PLAN_REQUESTS_KEY = 'kenax_reseller_plan_requests_v1';
const ADMIN_PAYMENT_INFO_KEY = 'kenax_admin_payment_info_v1';

export interface AdminOfficialPaymentInfo {
  bkash: string;
  bkashType: string;
  nagad: string;
  nagadType: string;
  rocket: string;
  rocketType: string;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  accountHolderName: string;
  instructionBn: string;
  instructionEn: string;
}

export const DEFAULT_ADMIN_PAYMENT_INFO: AdminOfficialPaymentInfo = {
  bkash: '01799887766',
  bkashType: 'Personal / Send Money',
  nagad: '01899887766',
  nagadType: 'Personal / Send Money',
  rocket: '01988776655-0',
  rocketType: 'Personal',
  bankName: 'City Bank Limited',
  bankAccount: '110293847501',
  bankBranch: 'Dhanmondi Branch',
  accountHolderName: 'KenaX BD Dropshipping Services',
  instructionBn: 'যেকোনো প্ল্যান আপগ্রেড করতে উপরের অফিশিয়াল নাম্বারে সেন্ড মানি করুন এবং TrxID ও আপনার প্রেরক নাম্বার ফর্মটিতে সাবমিট করুন। অ্যাডমিন অনুমোদনের সাথে সাথে আপনার সমস্ত পুরনো ডাটা ঠিক রেখেই VIP মেম্বারশিপ সক্রিয় হবে।',
  instructionEn: 'Send money to the official numbers above and submit the TrxID and sender mobile number. Your account will upgrade with all existing data preserved upon admin verification.',
};

export const DEFAULT_RESELLER_PLANS: ResellerPlan[] = [
  {
    id: 'basic',
    name: 'Basic Reseller (Free)',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxMonthlyOrders: 30,
    maxCustomers: 50,
    productAccessLevel: 'limited',
    bonusProfitPercentage: 0,
    analyticsLevel: 'basic',
    marketingToolsEnabled: false,
    productSharingEnabled: true,
    bulkOrderingEnabled: false,
    referralRewardEnabled: true,
    vipEligible: false,
    supportLevel: 'standard',
    features: [
      '100% Free Lifetime Registration',
      'Access to 500+ Wholesale Reseller Products',
      'Up to 30 Monthly Customer Orders',
      'Customer Directory (Up to 50 contacts)',
      'Basic Order & Delivery Tracking',
      'Instant bKash/Nagad Profit Withdrawals',
      'Standard Email & Ticket Support',
    ],
    status: 'active',
  },
  {
    id: 'standard',
    name: 'Standard Pro Reseller',
    monthlyPrice: 590,
    yearlyPrice: 5900,
    maxMonthlyOrders: 200,
    maxCustomers: 300,
    productAccessLevel: 'standard',
    bonusProfitPercentage: 2,
    analyticsLevel: 'advanced',
    marketingToolsEnabled: true,
    productSharingEnabled: true,
    bulkOrderingEnabled: true,
    referralRewardEnabled: true,
    vipEligible: false,
    supportLevel: 'priority',
    features: [
      'Access to All 2,000+ Marketplace Products',
      'Up to 200 Monthly Customer Orders',
      'Customer Directory (Up to 300 contacts)',
      '2% Extra Bonus Profit on every delivered item',
      'Advanced Interactive Profit Calculator',
      'Product Sharing with 1-Click WhatsApp & FB captions',
      'Bulk Order Placement Tools',
      'Comprehensive Sales & Profit Analytics',
      'Priority Phone & WhatsApp Support',
    ],
    status: 'active',
  },
  {
    id: 'premium',
    name: 'Premium VIP Reseller',
    monthlyPrice: 1490,
    yearlyPrice: 14900,
    maxMonthlyOrders: -1, // Unlimited
    maxCustomers: -1, // Unlimited
    productAccessLevel: 'all',
    bonusProfitPercentage: 5,
    analyticsLevel: 'enterprise',
    marketingToolsEnabled: true,
    productSharingEnabled: true,
    bulkOrderingEnabled: true,
    referralRewardEnabled: true,
    vipEligible: true,
    supportLevel: 'dedicated_hotline',
    features: [
      'Unlimited Monthly Customer Orders',
      'Unlimited Customer Contacts Storage',
      '5% Maximum Bonus Profit on all products',
      'VIP Verified Reseller Badge & Early Access',
      'Priority Delivery Dispatch & Express Settlement',
      'Custom Reseller Link Generation & Attribution',
      'Exclusive Flash Deal Wholesale Pricing',
      'Advanced Conversion Analytics & Profit Projections',
      '24/7 Dedicated Account Manager Hotline',
    ],
    status: 'active',
  },
];

export const DEFAULT_RESELLERS: ResellerUser[] = [
  {
    id: 'RESELLER-DHAKA-1',
    fullName: 'Shakil Ahmed',
    phone: '01799887766',
    email: 'shakil.reseller@kenaxbd.com',
    username: 'reseller_dhaka',
    password: 'reseller123',
    district: 'Dhaka',
    area: 'Mirpur 10',
    address: 'House 45, Road 2, Block C, Mirpur',
    profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
    businessName: 'Dhaka Smart Gadgets Reseller',
    planId: 'standard',
    billingCycle: 'monthly',
    subscriptionStatus: 'active',
    subscriptionStartDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    subscriptionEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    onboardingStep: 6,
    onboardingCompleted: true,
    isVIP: false,
    referralCode: 'KX-RES-7789',
    totalReferralEarnings: 1200,
    walletBalance: 6450,
    pendingProfit: 1850,
    totalProfit: 42300,
    totalSales: 185400,
    totalWithdrawn: 34000,
    activeCustomersCount: 38,
    paymentInfo: {
      bkash: '01799887766',
      nagad: '01799887766',
      bankName: 'Islami Bank Bangladesh PLC',
      bankAccount: '2050119283746',
      accountHolderName: 'Shakil Ahmed',
    },
    accountStatus: 'active',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
];

export const DEFAULT_RESELLER_CUSTOMERS: ResellerCustomer[] = [
  {
    id: 'CUST-RES-101',
    resellerId: 'RESELLER-DHAKA-1',
    name: 'Anisur Rahman',
    phone: '01811223344',
    email: 'anis@example.com',
    address: 'Flat 3B, Lakeview Tower, Uttara Sector 3',
    district: 'Dhaka',
    upazila: 'Uttara',
    totalOrders: 4,
    totalSpent: 9400,
    lastOrderDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: 'active',
    notes: 'Prefers evening delivery. Regular gadget buyer.',
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: 'CUST-RES-102',
    resellerId: 'RESELLER-DHAKA-1',
    name: 'Farzana Akter',
    phone: '01722334455',
    email: 'farzana@example.com',
    address: 'House 12, Road 5, Dhanmondi',
    district: 'Dhaka',
    upazila: 'Dhanmondi',
    totalOrders: 2,
    totalSpent: 4800,
    lastOrderDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    status: 'active',
    notes: 'Interested in smartwatches and lifestyle items.',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: 'CUST-RES-103',
    resellerId: 'RESELLER-DHAKA-1',
    name: 'Zubair Hossain',
    phone: '01933445566',
    address: 'Chawkbazar, Kotwali',
    district: 'Chittagong',
    totalOrders: 1,
    totalSpent: 2650,
    lastOrderDate: new Date(Date.now() - 15 * 86400000).toISOString(),
    status: 'active',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

export const DEFAULT_RESELLER_TRANSACTIONS: ResellerTransaction[] = [
  {
    id: 'TXN-RES-9901',
    resellerId: 'RESELLER-DHAKA-1',
    orderId: 'ORD-RES-8821',
    type: 'profit_credit',
    amount: 350,
    balanceAfter: 6450,
    status: 'completed',
    description: 'Profit credited for Order #ORD-RES-8821 (Delivered)',
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'TXN-RES-9902',
    resellerId: 'RESELLER-DHAKA-1',
    type: 'withdrawal',
    amount: 5000,
    balanceAfter: 6100,
    status: 'completed',
    description: 'Withdrawal to bKash (01799887766)',
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'TXN-RES-9903',
    resellerId: 'RESELLER-DHAKA-1',
    orderId: 'ORD-RES-8815',
    type: 'profit_credit',
    amount: 450,
    balanceAfter: 11100,
    status: 'completed',
    description: 'Profit credited for Order #ORD-RES-8815 (Delivered)',
    date: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: 'TXN-RES-9904',
    resellerId: 'RESELLER-DHAKA-1',
    type: 'referral_bonus',
    amount: 300,
    balanceAfter: 10650,
    status: 'completed',
    description: 'Referral reward for partner joined with KX-RES-7789',
    date: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
];

export const DEFAULT_RESELLER_WITHDRAWALS: ResellerWithdrawal[] = [
  {
    id: 'WD-RES-501',
    resellerId: 'RESELLER-DHAKA-1',
    resellerName: 'Shakil Ahmed',
    resellerPhone: '01799887766',
    amount: 5000,
    fee: 0,
    netAmount: 5000,
    method: 'bkash',
    accountNumber: '01799887766',
    status: 'paid',
    requestedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    processedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    txId: 'BK-992019482',
    adminNote: 'Processed via bKash Merchant API',
  },
];

export const DEFAULT_RESELLER_NOTIFICATIONS: ResellerNotification[] = [
  {
    id: 'NOTIF-1',
    resellerId: 'RESELLER-DHAKA-1',
    title: 'Profit Credited! (৳350)',
    message: 'Your profit for Order #ORD-RES-8821 has been credited to your available balance.',
    type: 'profit',
    linkTab: 'finance',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'NOTIF-2',
    resellerId: 'RESELLER-DHAKA-1',
    title: 'New Wholesale Products Added',
    message: 'New Amoled Smartwatches & Wireless Earbuds are now ready to resell with high margins.',
    type: 'product',
    linkTab: 'products',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// ================= STORAGE HELPERS =================

export function getResellerPlans(): ResellerPlan[] {
  try {
    const raw = localStorage.getItem(RESELLER_PLANS_KEY);
    if (!raw) {
      safeSetLocalStorage(RESELLER_PLANS_KEY, JSON.stringify(DEFAULT_RESELLER_PLANS));
      return DEFAULT_RESELLER_PLANS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_RESELLER_PLANS;
  } catch {
    return DEFAULT_RESELLER_PLANS;
  }
}

export function saveResellerPlans(plans: ResellerPlan[]): void {
  safeSetLocalStorage(RESELLER_PLANS_KEY, JSON.stringify(plans));
}

export function getResellers(): ResellerUser[] {
  try {
    const raw = localStorage.getItem(RESELLERS_KEY);
    if (!raw) {
      safeSetLocalStorage(RESELLERS_KEY, JSON.stringify(DEFAULT_RESELLERS));
      return DEFAULT_RESELLERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_RESELLERS;
  } catch {
    return DEFAULT_RESELLERS;
  }
}

export function saveResellers(resellers: ResellerUser[]): void {
  safeSetLocalStorage(RESELLERS_KEY, JSON.stringify(resellers));
}

export function getResellerCustomers(): ResellerCustomer[] {
  try {
    const raw = localStorage.getItem(RESELLER_CUSTOMERS_KEY);
    if (!raw) {
      safeSetLocalStorage(RESELLER_CUSTOMERS_KEY, JSON.stringify(DEFAULT_RESELLER_CUSTOMERS));
      return DEFAULT_RESELLER_CUSTOMERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_RESELLER_CUSTOMERS;
  } catch {
    return DEFAULT_RESELLER_CUSTOMERS;
  }
}

export function saveResellerCustomers(customers: ResellerCustomer[]): void {
  safeSetLocalStorage(RESELLER_CUSTOMERS_KEY, JSON.stringify(customers));
}

export function getResellerTransactions(): ResellerTransaction[] {
  try {
    const raw = localStorage.getItem(RESELLER_TRANSACTIONS_KEY);
    if (!raw) {
      safeSetLocalStorage(RESELLER_TRANSACTIONS_KEY, JSON.stringify(DEFAULT_RESELLER_TRANSACTIONS));
      return DEFAULT_RESELLER_TRANSACTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_RESELLER_TRANSACTIONS;
  } catch {
    return DEFAULT_RESELLER_TRANSACTIONS;
  }
}

export function saveResellerTransactions(transactions: ResellerTransaction[]): void {
  safeSetLocalStorage(RESELLER_TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export function getResellerWithdrawals(): ResellerWithdrawal[] {
  try {
    const raw = localStorage.getItem(RESELLER_WITHDRAWALS_KEY);
    if (!raw) {
      safeSetLocalStorage(RESELLER_WITHDRAWALS_KEY, JSON.stringify(DEFAULT_RESELLER_WITHDRAWALS));
      return DEFAULT_RESELLER_WITHDRAWALS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_RESELLER_WITHDRAWALS;
  } catch {
    return DEFAULT_RESELLER_WITHDRAWALS;
  }
}

export function saveResellerWithdrawals(withdrawals: ResellerWithdrawal[]): void {
  safeSetLocalStorage(RESELLER_WITHDRAWALS_KEY, JSON.stringify(withdrawals));
}

export function getResellerFavorites(resellerId: string): string[] {
  try {
    const raw = localStorage.getItem(`${RESELLER_FAVORITES_KEY}_${resellerId}`);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

export function saveResellerFavorites(resellerId: string, favorites: string[]): void {
  safeSetLocalStorage(`${RESELLER_FAVORITES_KEY}_${resellerId}`, JSON.stringify(favorites));
}

export function getResellerNotifications(resellerId: string): ResellerNotification[] {
  try {
    const raw = localStorage.getItem(`${RESELLER_NOTIFICATIONS_KEY}_${resellerId}`);
    if (!raw) {
      return DEFAULT_RESELLER_NOTIFICATIONS;
    }
    return JSON.parse(raw) || DEFAULT_RESELLER_NOTIFICATIONS;
  } catch {
    return DEFAULT_RESELLER_NOTIFICATIONS;
  }
}

export function saveResellerNotifications(resellerId: string, notifs: ResellerNotification[]): void {
  safeSetLocalStorage(`${RESELLER_NOTIFICATIONS_KEY}_${resellerId}`, JSON.stringify(notifs));
}

export function getActiveResellerSession(): ResellerUser | null {
  try {
    const raw = localStorage.getItem(ACTIVE_RESELLER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id) return null;
    
    // Always sync with authoritative resellers list so admin changes to plan or status reflect immediately
    const all = getResellers();
    const latest = all.find((r) => r.id === parsed.id || r.phone === parsed.phone || r.username === parsed.username);
    if (latest) {
      if (latest.planId !== parsed.planId || latest.accountStatus !== parsed.accountStatus || latest.isVIP !== parsed.isVIP) {
        safeSetLocalStorage(ACTIVE_RESELLER_SESSION_KEY, JSON.stringify(latest));
      }
      return latest;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function syncResellerPlan(resellerId: string, newPlanId: ResellerPlanId): boolean {
  try {
    const all = getResellers();
    let updatedReseller: ResellerUser | null = null;
    const updatedList = all.map((r) => {
      if (r.id === resellerId || r.phone === resellerId || r.username === resellerId) {
        updatedReseller = {
          ...r,
          planId: newPlanId,
          isVIP: newPlanId === 'premium',
          updatedAt: new Date().toISOString(),
        };
        return updatedReseller;
      }
      return r;
    });

    if (updatedReseller) {
      saveResellers(updatedList);
      const active = getActiveResellerSession();
      if (active && (active.id === resellerId || active.phone === resellerId || active.username === resellerId)) {
        setActiveResellerSession(updatedReseller);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('reseller_plan_changed', { detail: { resellerId, newPlanId } }));
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function setActiveResellerSession(reseller: ResellerUser | null): void {
  if (!reseller) {
    localStorage.removeItem(ACTIVE_RESELLER_SESSION_KEY);
  } else {
    safeSetLocalStorage(ACTIVE_RESELLER_SESSION_KEY, JSON.stringify(reseller));
  }
}

export function getAdminPaymentInfo(): AdminOfficialPaymentInfo {
  try {
    const raw = localStorage.getItem(ADMIN_PAYMENT_INFO_KEY);
    if (!raw) {
      safeSetLocalStorage(ADMIN_PAYMENT_INFO_KEY, JSON.stringify(DEFAULT_ADMIN_PAYMENT_INFO));
      return DEFAULT_ADMIN_PAYMENT_INFO;
    }
    const parsed = JSON.parse(raw);
    return parsed && parsed.bkash ? parsed : DEFAULT_ADMIN_PAYMENT_INFO;
  } catch {
    return DEFAULT_ADMIN_PAYMENT_INFO;
  }
}

export function saveAdminPaymentInfo(info: AdminOfficialPaymentInfo): void {
  safeSetLocalStorage(ADMIN_PAYMENT_INFO_KEY, JSON.stringify(info));
}

export function getResellerPlanRequests(): ResellerPlanUpgradeRequest[] {
  try {
    const raw = localStorage.getItem(RESELLER_PLAN_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveResellerPlanRequests(requests: ResellerPlanUpgradeRequest[]): void {
  safeSetLocalStorage(RESELLER_PLAN_REQUESTS_KEY, JSON.stringify(requests));
}

export function createResellerPlanRequest(
  data: Omit<ResellerPlanUpgradeRequest, 'id' | 'status' | 'requestedAt'>
): ResellerPlanUpgradeRequest {
  const all = getResellerPlanRequests();
  const newReq: ResellerPlanUpgradeRequest = {
    ...data,
    id: `REQ-PLAN-${Date.now().toString().slice(-6)}`,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  const updated = [newReq, ...all];
  saveResellerPlanRequests(updated);

  // Also add a system notification for the reseller
  const notifs = getResellerNotifications(data.resellerId);
  const newNotif: ResellerNotification = {
    id: `NOTIF-PLAN-${Date.now()}`,
    resellerId: data.resellerId,
    title: `মেম্বারশিপ রিকোয়েস্ট জমা হয়েছে (${data.targetPlanName})`,
    message: `আপনার ${data.targetPlanName} প্ল্যানের জন্য ৳${data.amount} টাকার পেমেন্ট রিকোয়েস্ট (TrxID: ${data.transactionId}) গ্রহণ করা হয়েছে। অ্যাডমিন ভেরিফাই করলেই প্ল্যানটি স্বয়ংক্রিয়ভাবে সক্রিয় হবে।`,
    type: 'plan',
    linkTab: 'membership-plan',
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  saveResellerNotifications(data.resellerId, [newNotif, ...notifs]);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('reseller_plan_request_created', { detail: newReq }));
  }

  return newReq;
}

export function approveResellerPlanRequest(requestId: string, adminName: string = 'Super Admin'): boolean {
  try {
    const all = getResellerPlanRequests();
    let targetReq: ResellerPlanUpgradeRequest | null = null;

    const updatedRequests = all.map((req) => {
      if (req.id === requestId) {
        targetReq = {
          ...req,
          status: 'approved',
          reviewedAt: new Date().toISOString(),
          reviewedBy: adminName,
        };
        return targetReq;
      }
      return req;
    });

    if (!targetReq) return false;

    saveResellerPlanRequests(updatedRequests);

    // Synchronize reseller plan in authoritative storage and active session
    syncResellerPlan(targetReq.resellerId, targetReq.targetPlanId);

    // Notify the reseller
    const notifs = getResellerNotifications(targetReq.resellerId);
    const newNotif: ResellerNotification = {
      id: `NOTIF-PLAN-APP-${Date.now()}`,
      resellerId: targetReq.resellerId,
      title: `🎉 ${targetReq.targetPlanName} মেম্বারশিপ অনুমোদিত হয়েছে!`,
      message: `অভিনন্দন! আপনার ${targetReq.targetPlanName} আপগ্রেড রিকোয়েস্ট অ্যাডমিন দ্বারা অনুমোদিত হয়েছে। আপনার সমস্ত পুরনো ডাটা ও ব্যালেন্স অক্ষুণ্ণ রেখে নতুন VIP সুবিধাসমূহ সক্রিয় করা হয়েছে।`,
      type: 'plan',
      linkTab: 'membership-plan',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    saveResellerNotifications(targetReq.resellerId, [newNotif, ...notifs]);

    // Record subscription transaction in ledger
    const txns = getResellerTransactions();
    const subTxn: ResellerTransaction = {
      id: `TXN-SUB-${Date.now().toString().slice(-6)}`,
      resellerId: targetReq.resellerId,
      type: 'subscription_fee',
      amount: targetReq.amount,
      balanceAfter: 0,
      status: 'completed',
      description: `Subscription fee for ${targetReq.targetPlanName} (${targetReq.billingCycle}) via ${targetReq.paymentMethod.toUpperCase()} (TrxID: ${targetReq.transactionId})`,
      date: new Date().toISOString(),
    };
    saveResellerTransactions([subTxn, ...txns]);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reseller_plan_approved', { detail: targetReq }));
    }

    return true;
  } catch {
    return false;
  }
}

export function rejectResellerPlanRequest(
  requestId: string,
  reason: string = 'পেমেন্ট তথ্য বা TrxID অমিল পাওয়া গেছে।',
  adminName: string = 'Super Admin'
): boolean {
  try {
    const all = getResellerPlanRequests();
    let targetReq: ResellerPlanUpgradeRequest | null = null;

    const updatedRequests = all.map((req) => {
      if (req.id === requestId) {
        targetReq = {
          ...req,
          status: 'rejected',
          reviewedAt: new Date().toISOString(),
          reviewedBy: adminName,
          adminNote: reason,
        };
        return targetReq;
      }
      return req;
    });

    if (!targetReq) return false;

    saveResellerPlanRequests(updatedRequests);

    // Notify the reseller
    const notifs = getResellerNotifications(targetReq.resellerId);
    const newNotif: ResellerNotification = {
      id: `NOTIF-PLAN-REJ-${Date.now()}`,
      resellerId: targetReq.resellerId,
      title: `❌ মেম্বারশিপ আপগ্রেড রিকোয়েস্ট বাতিল হয়েছে`,
      message: `আপনার ${targetReq.targetPlanName} আপগ্রেড রিকোয়েস্টটি প্রত্যাখ্যাত হয়েছে। কারণ: ${reason}। অনুগ্রহ করে সঠিক TrxID দিয়ে পুনরায় চেষ্টা করুন বা সাপোর্টে যোগাযোগ করুন।`,
      type: 'plan',
      linkTab: 'membership-plan',
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    saveResellerNotifications(targetReq.resellerId, [newNotif, ...notifs]);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reseller_plan_rejected', { detail: targetReq }));
    }

    return true;
  } catch {
    return false;
  }
}

// ==========================================
// RESELLER AD CAMPAIGNS & TRACKING STORAGE
// ==========================================
const RESELLER_AD_CAMPAIGNS_KEY = 'kenax_reseller_ad_campaigns_v1';

export const INITIAL_RESELLER_AD_CAMPAIGNS: ResellerAdCampaign[] = [
  {
    id: 'CAMPAIGN-VIP-101',
    resellerId: 'RESELLER-DHAKA-1',
    resellerName: 'Shakil Ahmed',
    resellerStoreName: 'Shakil Fashion & Electronics',
    campaignTitle: '🔥 Winter Premium Jackets & Hoodies Conversion Campaign',
    platform: 'facebook',
    pixelId: '678912345098765',
    capiToken: 'EAAG1234567890abcdef...',
    budgetBDT: 2500,
    spentBDT: 1850,
    dailyLimitBDT: 500,
    targetAudience: 'Dhaka & Chittagong (Age 18-38, Shopping Enthusiasts)',
    clicks: 1420,
    impressions: 18500,
    conversions: 38,
    revenueBDT: 41800,
    roas: 4.5,
    status: 'active',
    productIds: ['prod-1', 'prod-2'],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'CAMPAIGN-VIP-102',
    resellerId: 'RESELLER-DHAKA-1',
    resellerName: 'Shakil Ahmed',
    resellerStoreName: 'Shakil Fashion & Electronics',
    campaignTitle: '📱 Smartwatch & TWS Earbuds TikTok Spark Ad',
    platform: 'tiktok',
    pixelId: 'CTIKTOK12398745',
    budgetBDT: 1500,
    spentBDT: 1200,
    dailyLimitBDT: 300,
    targetAudience: 'All Bangladesh Youth (Age 16-30)',
    clicks: 980,
    impressions: 24000,
    conversions: 22,
    revenueBDT: 28600,
    roas: 3.8,
    status: 'active',
    productIds: ['prod-3'],
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

export function getResellerAdCampaigns(): ResellerAdCampaign[] {
  try {
    const raw = localStorage.getItem(RESELLER_AD_CAMPAIGNS_KEY);
    if (!raw) {
      safeSetLocalStorage(RESELLER_AD_CAMPAIGNS_KEY, JSON.stringify(INITIAL_RESELLER_AD_CAMPAIGNS));
      return INITIAL_RESELLER_AD_CAMPAIGNS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RESELLER_AD_CAMPAIGNS;
  }
}

export function saveResellerAdCampaigns(campaigns: ResellerAdCampaign[]): void {
  safeSetLocalStorage(RESELLER_AD_CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

export function createResellerAdCampaign(campaign: Omit<ResellerAdCampaign, 'id' | 'createdAt'>): ResellerAdCampaign {
  const all = getResellerAdCampaigns();
  const newCampaign: ResellerAdCampaign = {
    ...campaign,
    id: `CAMPAIGN-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  saveResellerAdCampaigns([newCampaign, ...all]);
  return newCampaign;
}

export function updateResellerAdCampaignStatus(campaignId: string, newStatus: 'active' | 'paused' | 'completed'): boolean {
  const all = getResellerAdCampaigns();
  const updated = all.map((c) => (c.id === campaignId ? { ...c, status: newStatus, updatedAt: new Date().toISOString() } : c));
  saveResellerAdCampaigns(updated);
  return true;
}

export function updateResellerSubStoreConfig(resellerId: string, subStoreConfig: Partial<ResellerUser>): ResellerUser | null {
  const resellers = getResellers();
  let updatedReseller: ResellerUser | null = null;
  const updated = resellers.map((r) => {
    if (r.id === resellerId) {
      updatedReseller = { ...r, ...subStoreConfig, updatedAt: new Date().toISOString() };
      return updatedReseller;
    }
    return r;
  });
  if (updatedReseller) {
    saveResellers(updated);
    setActiveResellerSession(updatedReseller);
  }
  return updatedReseller;
}

