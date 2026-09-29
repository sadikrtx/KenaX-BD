import { safeSetLocalStorage } from './storage';

export interface RuleModuleDefinition {
  id: string;
  label: string;
  labelBn: string;
  category: 'core' | 'store' | 'catalog' | 'orders' | 'ai_tools' | 'finance' | 'analytics' | 'marketing' | 'tools' | 'support';
  description: string;
  defaultPlans: string[];
}

// All Modules in Seller Dashboard
export const SELLER_RULE_MODULES: RuleModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard & KPI Analytics',
    labelBn: 'ড্যাশবোর্ড ওভারভিউ ও পরিসংখ্যান',
    category: 'core',
    description: 'Summary KPIs, active orders count, sales overview and performance badges.',
    defaultPlans: ['basic', 'standard', 'premium'],
  },
  {
    id: 'my_store',
    label: 'My Store Profile & Branding',
    labelBn: 'মাই স্টোর প্রোফাইল (লোগো, ব্যানার, শপ নেম)',
    category: 'store',
    description: 'Store page customization, official banner, announcements and public store URL.',
    defaultPlans: ['basic', 'standard', 'premium'],
  },
  {
    id: 'store_settings',
    label: 'Store Settings & Custom Domain',
    labelBn: 'স্টোর পলিসি ও কাস্টম ডোমেইন সেটিংস',
    category: 'store',
    description: 'Custom domain mapping, shipping and return policies, and advanced settings.',
    defaultPlans: ['standard', 'premium'],
  },
  {
    id: 'products_catalog',
    label: 'Products Catalog & Inventory',
    labelBn: 'প্রোডাক্ট তালিকা ও স্টক ইনভেন্টরি',
    category: 'catalog',
    description: 'View, edit, search and filter all seller inventory items.',
    defaultPlans: ['basic', 'standard', 'premium'],
  },
  {
    id: 'products_add',
    label: 'Add New Products',
    labelBn: 'নতুন প্রোডাক্ট আপলোড ও পাবলিশ',
    category: 'catalog',
    description: 'Upload new single or variant products with pricing, gallery and specs.',
    defaultPlans: ['basic', 'standard', 'premium'],
  },
  {
    id: 'categories_all',
    label: 'All Categories Access (আনলিমিটেড ক্যাটাগরি)',
    labelBn: 'সবগুলো ক্যাটাগরিতে এক্সেস (আনলিমিটেড)',
    category: 'catalog',
    description: 'Permission to post products into all marketplace categories without restriction.',
    defaultPlans: ['standard', 'premium'],
  },
  {
    id: 'orders_management',
    label: 'Order Management & Packing Slips',
    labelBn: 'অর্ডার প্রসেসিং ও প্যাকিং স্লিপ প্রিন্ট',
    category: 'orders',
    description: 'Confirm, process, print packing slips, ready-to-ship and courier tracking.',
    defaultPlans: ['basic', 'standard', 'premium'],
  },
  {
    id: 'ai_bot',
    label: 'AI Sales Bot Automation (অর্ডার নেওয়ার জন্য এআই বট)',
    labelBn: 'এআই সেলস বট অর্ডার অটোমেশন ও অ্যাসিস্ট্যান্ট',
    category: 'ai_tools',
    description: 'Automated AI sales agent taking customer orders and answering inquiries 24/7.',
    defaultPlans: ['standard', 'premium'],
  },
  {
    id: 'finance_wallet',
    label: 'Live Wallet & Balance Overview',
    labelBn: 'লাইভ ওয়ালেট ও ব্যালেন্স হিসাব',
    category: 'finance',
    description: 'Real-time available balance, pending earnings, and marketplace ledger.',
    defaultPlans: ['basic', 'standard', 'premium'],
  },
  {
    id: 'finance_earnings',
    label: 'Earnings Breakdown & Graph Reports',
    labelBn: 'আর্নিং ব্রেকডাউন ও বিস্তারিত রিপোর্ট',
    category: 'finance',
    description: 'Detailed daily, weekly, and monthly earnings breakdown with charts.',
    defaultPlans: ['standard', 'premium'],
  },
  {
    id: 'finance_withdrawals',
    label: 'Payout Withdrawal Requests',
    labelBn: 'টাকা তোলার রিকোয়েস্ট (bKash/Nagad/Bank)',
    category: 'finance',
    description: 'Submit payout withdrawals directly to mobile banking or commercial bank.',
    defaultPlans: ['basic', 'standard', 'premium'],
  },
  {
    id: 'analytics_sales',
    label: 'Deep Sales & Customer Insights',
    labelBn: 'সেলস ও কাস্টমার এনালিটিক্স চার্ট',
    category: 'analytics',
    description: 'Advanced analytics, returning customer rate, and top selling products.',
    defaultPlans: ['premium'],
  },
  {
    id: 'marketing_coupons',
    label: 'Promotional Coupons & Vouchers',
    labelBn: 'ডিসকাউন্ট কুপন ও ভাউচার তৈরি',
    category: 'marketing',
    description: 'Generate custom store coupon codes, minimum cart values, and expiry dates.',
    defaultPlans: ['standard', 'premium'],
  },
  {
    id: 'marketing_campaigns',
    label: 'Marketplace Mega Campaigns',
    labelBn: 'মার্কেটপ্লেস মেগা ক্যাম্পেইনে অংশগ্রহণ',
    category: 'marketing',
    description: 'Join marketplace flash sales, Eid promotions, and homepage featured banners.',
    defaultPlans: ['premium'],
  },
  {
    id: 'customer_reviews',
    label: 'Customer Reviews & Replies',
    labelBn: 'কাস্টমার রিভিউ ও রিপ্লাই মডারেশন',
    category: 'marketing',
    description: 'Read reviews from buyers, moderate feedback, and post official store replies.',
    defaultPlans: ['basic', 'standard', 'premium'],
  },
  {
    id: 'support_ticket',
    label: '24/7 Dedicated Priority Support Desk',
    labelBn: '২৪/৭ প্রায়োরিটি ভিআইপি সাপোর্ট হেল্পডেস্ক',
    category: 'support',
    description: 'Direct priority ticket routing to senior marketplace account managers.',
    defaultPlans: ['premium'],
  },
];

// All Modules in Reseller Dashboard categorized by actual Menu Tabs
export const RESELLER_RULE_MODULES: RuleModuleDefinition[] = [
  // 1. Dashboard & KPIs (ড্যাশবোর্ড ও পরিসংখ্যান)
  {
    id: 'reseller_dashboard',
    label: 'Live Sales & Profit KPIs',
    labelBn: 'লাইভ সেলস ও প্রফিট কেপিআই',
    category: 'core',
    description: 'Summary counters for revenue, delivered orders, pending balance, and payout ledger.',
    defaultPlans: ['basic', 'standard', 'premium', 'silver', 'gold_vip'],
  },
  {
    id: 'sales_graph',
    label: 'Sales Performance & Earning Charts',
    labelBn: 'সেলস পারফরম্যান্স ও আয় গ্রাফ',
    category: 'core',
    description: 'Interactive graphical visualization of daily, weekly, and monthly dropship earnings.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },
  {
    id: 'quick_actions',
    label: 'Quick Operational Shortcuts',
    labelBn: 'কুইক অপারেশনাল শর্টকাট',
    category: 'core',
    description: 'Instant 1-click action buttons to create orders, check deliveries, and withdraw profits.',
    defaultPlans: ['basic', 'standard', 'premium', 'silver', 'gold_vip'],
  },

  // 2. Products & Wholesale Catalog (হোলসেল ক্যাটালগ ও প্রোডাক্টস)
  {
    id: 'catalog_browse',
    label: 'Wholesale Catalog & Stock Inventory',
    labelBn: 'হোলসেল ক্যাটালগ ও স্টক ব্রাউজিং',
    category: 'catalog',
    description: 'Browse wholesale verified products with live warehouse stocks and trade pricing.',
    defaultPlans: ['basic', 'standard', 'premium', 'silver', 'gold_vip'],
  },
  {
    id: 'margin_calculator',
    label: 'Dynamic Profit Margin Calculator',
    labelBn: 'স্মার্ট প্রফিট মার্জিন ক্যালকুলেটর',
    category: 'catalog',
    description: 'Calculate wholesale cost + custom reseller markup + courier delivery fees in real-time.',
    defaultPlans: ['basic', 'standard', 'premium', 'silver', 'gold_vip'],
  },
  {
    id: 'product_favorites',
    label: 'Product Favorites & Bookmarks',
    labelBn: 'প্রিয় প্রোডাক্টস ও উইশলিস্ট সংরক্ষণ',
    category: 'catalog',
    description: 'Save trending and high-margin products to personal favorites for quick access.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },
  {
    id: 'stock_alerts',
    label: 'Inventory Stock Alerts & Restock Feeds',
    labelBn: 'লাইভ ইনভেন্টরি ও স্টক রিস্টক অ্যালার্ট',
    category: 'catalog',
    description: 'Instant notification badges when low-stock items or viral products are replenished.',
    defaultPlans: ['premium', 'gold_vip'],
  },

  // 3. Order Operations (অর্ডার প্রসেসিং ও কুরিয়ার ট্র্যাকিং)
  {
    id: 'orders_place',
    label: 'Direct Customer Order Placement',
    labelBn: 'সরাসরি কাস্টমার অর্ডার প্লেসমেন্ট',
    category: 'orders',
    description: 'Place dropshipping orders directly on behalf of end buyers with customer delivery address.',
    defaultPlans: ['basic', 'standard', 'premium', 'silver', 'gold_vip'],
  },
  {
    id: 'orders_tracking',
    label: 'Live Courier Status & Delivery Tracking',
    labelBn: 'লাইভ কুরিয়ার স্ট্যাটাস ও ট্র্যাকিং',
    category: 'orders',
    description: 'Track package journey across courier partners from warehouse dispatch to doorstep.',
    defaultPlans: ['basic', 'standard', 'premium', 'silver', 'gold_vip'],
  },
  {
    id: 'white_label_invoice',
    label: 'White-Label Custom Invoice Generator',
    labelBn: 'হোয়াইট-লেবেল কাস্টম ইনভয়েস জেনারেটর',
    category: 'orders',
    description: 'Generate customer invoice PDFs bearing reseller shop name and branding without central logo.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },
  {
    id: 'order_returns',
    label: 'Order Returns & Cancellation Handling',
    labelBn: 'রিটার্ন ও ক্যান্সেলেশন রিকোয়েস্ট',
    category: 'orders',
    description: 'Submit return requests, monitor returned parcels, and verify courier return reasons.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },

  // 4. Customer Directory (কাস্টমার ডিরেক্টরি ও ম্যানেজমেন্ট)
  {
    id: 'customer_directory',
    label: 'Customer Directory & Phonebook',
    labelBn: 'কাস্টমার ডিরেক্টরি ও ফোনবুক',
    category: 'tools',
    description: 'Maintain private directory of end-customer contact numbers, districts, and addresses.',
    defaultPlans: ['basic', 'standard', 'premium', 'silver', 'gold_vip'],
  },
  {
    id: 'customer_add',
    label: 'Add & Manage Customer Profiles',
    labelBn: 'নতুন কাস্টমার প্রোফাইল যোগ ও এডিট',
    category: 'tools',
    description: 'Create and edit detailed customer profiles with preferred courier drop-off locations.',
    defaultPlans: ['basic', 'standard', 'premium', 'silver', 'gold_vip'],
  },
  {
    id: 'customer_history',
    label: 'Customer Lifetime Purchase History',
    labelBn: 'কাস্টমার অতীত অর্ডার হিস্ট্রি ও পরিসংখ্যান',
    category: 'tools',
    description: 'View previous order frequency, return probability, and total customer spending value.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },

  // 5. Profit Wallet & Finance (ফাইন্যান্স ও প্রফিট ওয়ালেট)
  {
    id: 'wallet_balance',
    label: 'Live Profit Wallet & Balance Ledger',
    labelBn: 'লাইভ প্রফিট ওয়ালেট ব্যালেন্স ও লেজার',
    category: 'finance',
    description: 'Real-time ledger tracking cleared profits from delivered parcels and pending payouts.',
    defaultPlans: ['basic', 'standard', 'premium', 'silver', 'gold_vip'],
  },
  {
    id: 'wallet_payouts',
    label: 'Payout Withdrawal Requests (bKash/Nagad/Bank)',
    labelBn: 'উইথড্রয়াল রিকোয়েস্ট (বিকাশ/নগদ/ব্যাংক)',
    category: 'finance',
    description: 'Submit profit disbursement requests with choice of bKash, Nagad, Rocket or commercial bank.',
    defaultPlans: ['basic', 'standard', 'premium', 'silver', 'gold_vip'],
  },
  {
    id: 'payout_vouchers',
    label: 'Payout Vouchers & Transaction History',
    labelBn: 'পরিশোধিত ভাউচার ও ট্রানজেকশন হিস্ট্রি',
    category: 'finance',
    description: 'Download printable settlement receipts with official transaction verification codes.',
    defaultPlans: ['standard', 'premium', 'silver', 'gold_vip'],
  },

  // 6. Analytics & Insights (এনালিটিক্স ও রিপোর্টস)
  {
    id: 'profit_analytics',
    label: 'Detailed Sales & Profit Trends',
    labelBn: 'বিস্তারিত সেলস ও প্রফিট ট্রেন্ডস',
    category: 'analytics',
    description: 'In-depth graphs tracking average order margin, monthly earnings, and growth trajectory.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },
  {
    id: 'product_insights',
    label: 'Top Selling Products Analytics',
    labelBn: 'টপ সেলিং প্রোডাক্টস ও লাভজনক আইটেম',
    category: 'analytics',
    description: 'Identify best-converting catalog items with the highest delivered completion rate.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },

  // 7. Marketing & Sub-Store Tools (মার্কেটিং ও বিজনেস গ্রোথ)
  {
    id: 'social_share_1click',
    label: '1-Click Social Share Hub (FB/WhatsApp)',
    labelBn: '১-ক্লিক সোশ্যাল মিডিয়া ক্যাটালগ শেয়ার',
    category: 'marketing',
    description: 'Copy high-res photos and readymade sales captions formatted for Facebook & WhatsApp.',
    defaultPlans: ['standard', 'premium', 'silver', 'gold_vip'],
  },
  {
    id: 'substore_builder',
    label: 'Reseller Sub-Store Builder & Custom URL',
    labelBn: 'রিসেলার সাব-স্টোর বিল্ডার ও লিঙ্ক',
    category: 'marketing',
    description: 'Personalized e-commerce storefront allowing customers to order under reseller brand.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },
  {
    id: 'landing_page_builder',
    label: 'Instant Product Landing Page Builder',
    labelBn: 'ইনস্ট্যান্ট প্রোডাক্ট ল্যান্ডিং পেজ ক্রিয়েটর',
    category: 'marketing',
    description: 'Build fast single-product landing pages with embedded checkout tailored for ad campaigns.',
    defaultPlans: ['premium', 'gold_vip'],
  },
  {
    id: 'reseller_ads',
    label: 'Facebook & Google Ads Tracker',
    labelBn: 'ফেসবুক ও গুগল এডস ক্যাম্পেইন ট্র্যাকার',
    category: 'marketing',
    description: 'Track ad spend, cost per acquisition (CPA), and net profit returns on paid campaigns.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },
  {
    id: 'marketing_referral',
    label: 'Reseller Referral Bonus Program',
    labelBn: 'রেফারেল প্রোগ্রাম ও কমিশন বোনাস',
    category: 'marketing',
    description: 'Invite new partners and earn ongoing cash bonuses from their successful orders.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },

  // 8. Courier & Delivery Fraud Tools (কুরিয়ার ও ডেলিভারি ইন্টিগ্রেশন)
  {
    id: 'courier_checker',
    label: 'Multi-Courier Fraud & Success Rate Checker',
    labelBn: 'মাল্টি-কুরিয়ার ফ্রড ও ডেলিভারি চেকার',
    category: 'tools',
    description: 'Inspect buyer phone numbers across courier networks to identify fake or return-prone orders.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },
  {
    id: 'courier_calculator',
    label: 'Live Courier Delivery Fee Calculator',
    labelBn: 'লাইভ কুরিয়ার চার্জ ও জোন ক্যালকুলেটর',
    category: 'tools',
    description: 'Compute precise delivery costs across inside Dhaka, sub-Dhaka, and outside Dhaka zones.',
    defaultPlans: ['basic', 'standard', 'premium', 'silver', 'gold_vip'],
  },

  // 9. Target Rewards & Gamification (টার্গেট ও রিওয়ার্ডস)
  {
    id: 'target_rewards',
    label: 'Monthly Target Milestones & Cash Rewards',
    labelBn: 'মাসিক সেলস টার্গেট ও বোনাস ক্যাশ',
    category: 'tools',
    description: 'Unlock cash bonuses and awards upon hitting monthly sales milestone volumes.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },
  {
    id: 'reseller_leaderboard',
    label: 'Reseller Leaderboard & VIP Club Rankings',
    labelBn: 'টপ রিসেলার লিডারবোর্ড ও রেটিং',
    category: 'tools',
    description: 'Compete on the nationwide reseller leaderboard for elite recognition and bonuses.',
    defaultPlans: ['basic', 'standard', 'premium', 'silver', 'gold_vip'],
  },

  // 10. VIP Membership & Support (ভিআইপি সুবিধা ও সাপোর্ট)
  {
    id: 'vip_cashback',
    label: 'VIP Extra % Margin & Early Wholesale Access',
    labelBn: 'ভিআইপি অতিরিক্ত ক্যাশব্যাক মার্জিন',
    category: 'finance',
    description: 'Earn additional 2% to 5% bonus profit margin on top of standard retail profit.',
    defaultPlans: ['premium', 'gold_vip'],
  },
  {
    id: 'priority_dispatch',
    label: 'Priority Order Dispatch & Fast Handover',
    labelBn: 'অগ্রাধিকার ভিত্তিতে দ্রুত ডেলিভারি ডিসপ্যাচ',
    category: 'orders',
    description: 'Reseller orders undergo expedited packing and earliest-slot courier dispatch.',
    defaultPlans: ['standard', 'premium', 'gold_vip'],
  },
  {
    id: 'priority_support',
    label: '24/7 Dedicated Account Manager & VIP Hotline',
    labelBn: '২৪/৭ ডেডিকেটেড ভিআইপি সাপোর্ট ও টিম চ্যাট',
    category: 'support',
    description: 'Direct priority assistance via dedicated account executive and private WhatsApp hotline.',
    defaultPlans: ['premium', 'gold_vip'],
  },
];

const SELLER_MATRIX_KEY = 'kenax_seller_rule_matrix_v1';
const RESELLER_MATRIX_KEY = 'kenax_reseller_rule_matrix_v1';
const USER_OVERRIDES_KEY = 'kenax_partner_rule_overrides_v1';

// Default Matrix Builder
export function getDefaultMatrix(type: 'seller' | 'reseller'): Record<string, string[]> {
  const modules = type === 'seller' ? SELLER_RULE_MODULES : RESELLER_RULE_MODULES;
  const plans = type === 'seller' ? ['basic', 'standard', 'premium'] : ['basic', 'standard', 'premium', 'silver', 'gold_vip'];

  const matrix: Record<string, string[]> = {};
  plans.forEach((planId) => {
    matrix[planId] = modules
      .filter((m) => m.defaultPlans.includes(planId))
      .map((m) => m.id);
  });
  return matrix;
}

// Get Plan Matrix
export function getPlanRuleMatrix(type: 'seller' | 'reseller'): Record<string, string[]> {
  const key = type === 'seller' ? SELLER_MATRIX_KEY : RESELLER_MATRIX_KEY;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const defaults = getDefaultMatrix(type);
      safeSetLocalStorage(key, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : getDefaultMatrix(type);
  } catch {
    return getDefaultMatrix(type);
  }
}

// Save Plan Matrix
export function savePlanRuleMatrix(type: 'seller' | 'reseller', matrix: Record<string, string[]>): void {
  const key = type === 'seller' ? SELLER_MATRIX_KEY : RESELLER_MATRIX_KEY;
  safeSetLocalStorage(key, JSON.stringify(matrix));
}

// User-Specific Overrides (Individual Custom Rules)
export interface UserRuleOverride {
  partnerId: string;
  allowedModules: string[];
  updatedAt: string;
  notes?: string;
}

export function getUserRuleOverrides(): Record<string, UserRuleOverride> {
  try {
    const raw = localStorage.getItem(USER_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveUserRuleOverride(partnerId: string, allowedModules: string[], notes?: string): void {
  const overrides = getUserRuleOverrides();
  overrides[partnerId] = {
    partnerId,
    allowedModules,
    updatedAt: new Date().toISOString(),
    notes: notes || 'Custom admin permissions granted',
  };
  safeSetLocalStorage(USER_OVERRIDES_KEY, JSON.stringify(overrides));
}

export function removeUserRuleOverride(partnerId: string): void {
  const overrides = getUserRuleOverrides();
  delete overrides[partnerId];
  safeSetLocalStorage(USER_OVERRIDES_KEY, JSON.stringify(overrides));
}

// Helper: Check if a specific module is allowed for a user
export function isModuleAllowedForPartner(
  partner: { id?: string; planId?: string; type?: string; isVip?: boolean } | null | undefined,
  moduleId: string,
  partnerType: 'seller' | 'reseller' = 'seller'
): boolean {
  if (!partner) return true; // fallback

  // 1. Check if user has an individual custom override
  if (partner.id) {
    const overrides = getUserRuleOverrides();
    if (overrides[partner.id]) {
      return overrides[partner.id].allowedModules.includes(moduleId);
    }
  }

  // 2. Check plan matrix
  const matrix = getPlanRuleMatrix(partnerType);
  const planId = (partner.planId || 'basic').toLowerCase();
  
  if (matrix[planId]) {
    return matrix[planId].includes(moduleId);
  }

  // Fallback to basic
  if (matrix['basic']) {
    return matrix['basic'].includes(moduleId);
  }

  return true;
}
