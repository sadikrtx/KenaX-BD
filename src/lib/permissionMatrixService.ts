import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, auth } from './firebase.ts';
import { safeSetLocalStorage } from './storage';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Permission Matrix Error: ', JSON.stringify(errInfo));
}

export interface DashboardTabModule {
  id: string;
  label: string;
  labelBn: string;
  group: 'core' | 'catalog' | 'orders' | 'finance' | 'marketing' | 'tools' | 'support';
  description: string;
  descriptionBn: string;
}

// Available Dashboard Tabs for Sellers
export const SELLER_DASHBOARD_TABS: DashboardTabModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Home & Overview',
    labelBn: 'ড্যাশবোর্ড হোম ও ওভারভিউ',
    group: 'core',
    description: 'Summary KPIs, active order alerts, sales charts, and quick stat badges.',
    descriptionBn: 'সামগ্রিক কেপিআই, অ্যাক্টিভ অর্ডার অ্যালার্ট, সেলস চার্ট ও কুইক স্ট্যাটাস ব্যাজ।',
  },
  {
    id: 'my-store',
    label: 'My Store Profile & Branding',
    labelBn: 'মাই স্টোর প্রোফাইল (লোগো ও ব্যানার)',
    group: 'core',
    description: 'Store public profile, custom store URL, announcements, and bio.',
    descriptionBn: 'স্টোরের পাবলিক প্রোফাইল, কাস্টম স্টোর ইউআরএল, নোটিশ ও স্টোর বায়ো।',
  },
  {
    id: 'store-settings',
    label: 'Store Settings & Custom Domain',
    labelBn: 'স্টোর পলিসি ও কাস্টম ডোমেইন',
    group: 'core',
    description: 'Custom domain mapping, store return & shipping policies, and operational hours.',
    descriptionBn: 'কাস্টম ডোমেইন ম্যাপিং, স্টোর রিটার্ন ও শিপিং পলিসি এবং কাজের সময়সূচি।',
  },
  {
    id: 'products-all',
    label: 'Products Catalog (All Products)',
    labelBn: 'প্রোডাক্ট তালিকা ও স্টক ভিউ',
    group: 'catalog',
    description: 'Browse, filter, edit prices, manage variants, and delete published products.',
    descriptionBn: 'পণ্য ব্রাউজ, ফিল্টার, মূল্য পরিবর্তন, ভ্যারিয়েন্ট ব্যবস্থাপনা ও পণ্য ডিলিট।',
  },
  {
    id: 'products-add',
    label: 'Add New Product Module',
    labelBn: 'নতুন প্রোডাক্ট আপলোড ও পাবলিশ',
    group: 'catalog',
    description: 'Product creation wizard with photo galleries, wholesale pricing, and specs.',
    descriptionBn: 'ফটো গ্যালারি, পাইকারি মূল্য ও স্পেসিফিকেশনসহ নতুন পণ্য আপলোড উইজার্ড।',
  },
  {
    id: 'products-drafts',
    label: 'Product Drafts & Pending Review',
    labelBn: 'ড্রাফট ও পেন্ডিং প্রোডাক্ট তালিকা',
    group: 'catalog',
    description: 'Unpublished draft items and products awaiting admin quality review.',
    descriptionBn: 'অপ্রকাশিত ড্রাফট পণ্য এবং অ্যাডমিন রিভিউয়ের অপেক্ষায় থাকা পণ্যের তালিকা।',
  },
  {
    id: 'products-low-stock',
    label: 'Low Stock Inventory Alerts',
    labelBn: 'লো-স্টক ইনভেন্টরি এলার্ট',
    group: 'catalog',
    description: 'Automated warnings when items fall below reorder thresholds.',
    descriptionBn: 'পণ্যের স্টক কমে গেলে স্বয়ংক্রিয় রিয়র্ডার সতর্কবার্তা।',
  },
  {
    id: 'categories-all',
    label: 'Unlimited Category Permissions',
    labelBn: 'সবগুলো ক্যাটাগরিতে প্রোডাক্ট আপলোড',
    group: 'catalog',
    description: 'Allows sellers to list products across all marketplace categories without restriction.',
    descriptionBn: 'সেলারকে মার্কেটের যেকোনো ক্যাটাগরিতে সীমাবদ্ধতা ছাড়াই পণ্য আপলোডের অনুমতি দেয়।',
  },
  {
    id: 'orders-all',
    label: 'Orders Management & Packing Slips',
    labelBn: 'অর্ডার প্রসেসিং ও প্যাকিং স্লিপ',
    group: 'orders',
    description: 'Order status lifecycle, invoice printing, and courier handover workflows.',
    descriptionBn: 'অর্ডার স্ট্যাটাস লাইফসাইকেল, ইনভয়েস প্রিন্ট ও কুরিয়ার হ্যান্ডওভার ওয়ার্কফ্লো।',
  },
  {
    id: 'ai-bot',
    label: 'AI Sales Bot Automation',
    labelBn: 'এআই সেলস বট অর্ডার অটোমেশন',
    group: 'tools',
    description: '24/7 AI-driven sales agent answering buyer chats and placing automated orders.',
    descriptionBn: '২৪/৭ এআই সেলস এজেন্ট যা ক্রেতাদের চ্যাটের উত্তর দেয় ও স্বয়ংক্রিয় অর্ডার নেয়।',
  },
  {
    id: 'finance-wallet',
    label: 'Live Wallet & Current Balance',
    labelBn: 'লাইভ ওয়ালেট ও ব্যালেন্স',
    group: 'finance',
    description: 'Real-time available payout funds, pending escrow balance, and transaction history.',
    descriptionBn: 'উত্তোলনযোগ্য ব্যালেন্স, পেন্ডিং এসক্রো ফান্ড ও ট্রানজ্যাকশন হিস্ট্রি।',
  },
  {
    id: 'finance-earnings',
    label: 'Earnings Breakdown & Graph Reports',
    labelBn: 'আর্নিং ব্রেকডাউন ও গ্রাফ রিপোর্ট',
    group: 'finance',
    description: 'Comprehensive daily, weekly, and monthly earnings breakdown with charts.',
    descriptionBn: 'দৈনিক, সাপ্তাহিক ও মাসিক আয়ের পূর্ণাঙ্গ চার্ট ও বিস্তারিত রিপোর্ট।',
  },
  {
    id: 'finance-withdrawals',
    label: 'Payout Withdrawal Requests',
    labelBn: 'টাকা তোলার রিকোয়েস্ট (উইথড্রল)',
    group: 'finance',
    description: 'Submit withdrawal requests directly to bKash, Nagad, Rocket, or Bank.',
    descriptionBn: 'বিকাশ, নগদ, রকেট বা ব্যাংকে সরাসরি টাকা তোলার আবেদন।',
  },
  {
    id: 'finance-transactions',
    label: 'Finance Ledger & Balance History',
    labelBn: 'ওয়ালেট লেজার ও ট্রানজ্যাকশন হিস্ট্রি',
    group: 'finance',
    description: 'View immutable transaction history of credited earnings and withdrawals.',
    descriptionBn: 'জমা হওয়া উপার্জন ও উত্তোলনের অপরিবর্তনীয় ট্রানজ্যাকশন হিস্ট্রি।',
  },
  {
    id: 'finance-commission',
    label: 'Commission Rates Breakdown',
    labelBn: 'মার্কেটপ্লেস কমিশন রেট তালিকা',
    group: 'finance',
    description: 'Category-specific marketplace fees and net margin calculator.',
    descriptionBn: 'ক্যাটাগরি ভিত্তিক মার্কেটপ্লেস ফি ও নিট মার্জিন ক্যালকুলেটর।',
  },
  {
    id: 'analytics-sales',
    label: 'Sales & Customer Analytics',
    labelBn: 'সেলস ও কাস্টমার এনালিটিক্স',
    group: 'finance',
    description: 'Revenue trends, top performing products, customer repurchase rate, and graphs.',
    descriptionBn: 'আয়ের গতিধারা, সেরা বিক্রিত পণ্য, কাস্টমার রিটার্ন রেট ও অ্যানালিটিক্স গ্রাফ।',
  },
  {
    id: 'marketing-coupons',
    label: 'Store Promotional Coupons',
    labelBn: 'ডিসকাউন্ট কুপন তৈরি',
    group: 'marketing',
    description: 'Create custom promo codes, flat discounts, or percentage vouchers.',
    descriptionBn: 'কাস্টম প্রোমো কোড, ফ্ল্যাট ডিসকাউন্ট বা পার্সেন্টেজ ভাউচার তৈরি।',
  },
  {
    id: 'marketing-campaigns',
    label: 'Mega Campaigns & Featured Banners',
    labelBn: 'মেগা ক্যাম্পেইনে অংশগ্রহণ',
    group: 'marketing',
    description: 'Participate in sitewide flash sales, Eid promotions, and banner features.',
    descriptionBn: 'ফ্ল্যাশ সেল, ঈদ প্রমোশন ও হোমপেজ ব্যানার মেগা ক্যাম্পেইনে অংশগ্রহণ।',
  },
  {
    id: 'reviews',
    label: 'Customer Reviews & Replies',
    labelBn: 'কাস্টমার রিভিউ ও রিপ্লাই',
    group: 'marketing',
    description: 'Read reviews submitted by shoppers, moderate ratings, and reply publicly.',
    descriptionBn: 'ক্রেতাদের দেওয়া রিভিউ পড়া, রেটিং মডারেশন ও সরাসরি রিপ্লাই দেওয়া।',
  },
  {
    id: 'subscription-plan',
    label: 'Subscription Plans & Upgrade',
    labelBn: 'সাবস্ক্রিপশন প্ল্যান ও রিনিউয়াল',
    group: 'support',
    description: 'View current active plan, validity countdown, and tier upgrades.',
    descriptionBn: 'বর্তমান অ্যাক্টিভ প্ল্যান, মেয়াদ কাউন্টডাউন ও টিয়ার আপগ্রেড সুবিধা।',
  },
  {
    id: 'support',
    label: '24/7 Dedicated Support Helpdesk',
    labelBn: '২৪/৭ ভিআইপি সাপোর্ট হেল্পডেস্ক',
    group: 'support',
    description: 'Direct priority ticket hotline to senior marketplace account managers.',
    descriptionBn: 'মার্কেটপ্লেস সিনিয়র অ্যাকাউন্ট ম্যানেজারদের সাথে সরাসরি প্রায়োরিটি টিকিট হটলাইন।',
  },
  {
    id: 'settings',
    label: 'Store & Account Security Settings',
    labelBn: 'স্টোর ও অ্যাকাউন্ট সিকিউরিটি সেটিংস',
    group: 'support',
    description: 'Update password, authorized staff credentials, and notification preferences.',
    descriptionBn: 'পাসওয়ার্ড পরিবর্তন, অনুমোদিত স্টাফ ক্রেডেনশিয়াল ও নোটিফিকেশন সেটিংস।',
  },
];

// Available Dashboard Tabs for Resellers
export const RESELLER_DASHBOARD_TABS: DashboardTabModule[] = [
  {
    id: 'dashboard',
    label: 'Reseller Dashboard Home',
    labelBn: 'রিসেলার ড্যাশবোর্ড ওভারভিউ',
    group: 'core',
    description: 'Summary KPIs (Total Profit, Available Balance, Pending Profit, Total Sales), quick order shortcuts, and balance reveal.',
    descriptionBn: 'সার্বিক কেপিআই (মোট লাভ, উত্তোলনযোগ্য ব্যালেন্স, পেন্ডিং প্রফিট, মোট সেলস) ও কুইক অর্ডার শর্টকাট।',
  },
  {
    id: 'target-rewards',
    label: 'Sales Targets & Milestone Bonuses',
    labelBn: 'সেলস টার্গেট ও বোনাস রিওয়ার্ডস',
    group: 'core',
    description: 'Monthly and weekly sales target tracker with real-time progress, target completion cash bonuses, VIP badges, and zero delivery fee unlocks.',
    descriptionBn: 'মাসিক ও সাপ্তাহিক সেলস টার্গেট ট্র্যাকার, ক্যাশ বোনাস, ভিআইপি ব্যাজ ও জিরো ডেলিভারি চার্জ সুবিধা।',
  },
  {
    id: 'leaderboard',
    label: 'Top Resellers Leaderboard',
    labelBn: 'রিসেলার লিডারবোর্ড ও রেংক',
    group: 'core',
    description: 'Leaderboard of top selling resellers across Bangladesh with podium ranking, sales figures, badges, and monthly performance rewards.',
    descriptionBn: 'সারা দেশের শীর্ষ রিসেলারদের লিডারবোর্ড র‍্যাঙ্কিং, সেলস পরিসংখ্যান ও আকর্ষণীয় পুরস্কার।',
  },
  {
    id: 'catalog',
    label: 'Product Catalog (Reselling)',
    labelBn: 'হোলসেল রিসেলিং প্রোডাক্ট ক্যাটালগ',
    group: 'catalog',
    description: 'Specialized wholesale catalog with base costs, retail prices, live profit margin calculator, and 1-click dropship dispatch.',
    descriptionBn: 'পাইকারি রেট, খুচরা মূল্য, লাইভ প্রফিট মার্জিন ক্যালকুলেটর ও ১-ক্লিক ড্রপশিপ ডিসপ্যাচ।',
  },
  {
    id: 'catalog-stockout',
    label: 'Stock Out Products View',
    labelBn: 'স্টক-আউট প্রোডাক্ট তালিকা',
    group: 'catalog',
    description: 'Dedicated list of out-of-stock seller products so resellers can monitor replenished stock and re-order timing.',
    descriptionBn: 'স্টক-আউট পণ্যের তালিকা যাতে রিসেলাররা স্টক পুনরায় আসার আপডেট রাখতে পারেন।',
  },
  {
    id: 'favorites',
    label: 'Saved & Favorite Products',
    labelBn: 'ফেভারিট ও সংরক্ষিত প্রোডাক্ট',
    group: 'catalog',
    description: 'Bookmark high-margin products for rapid reordering, instant profit quoting, and social sharing.',
    descriptionBn: 'বেশি লাভের পণ্য বুকমার্ক করে রাখা, দ্রুত প্রফিট কোট ও সামাজিক মাধ্যমে শেয়ার।',
  },
  {
    id: 'orders-all',
    label: 'Active Sales & Orders Tracking',
    labelBn: 'অ্যাক্টিভ সেলস ও অর্ডার ট্র্যাকিং',
    group: 'orders',
    description: 'Specialized active sales panel showing dropship customer parcels, courier status, delivery tracking, and earned margins.',
    descriptionBn: 'কাস্টমার পার্সেল, কুরিয়ার স্ট্যাটাস, ডেলিভারি ট্র্যাকিং ও উপার্জিত মার্জিনের সক্রিয় ট্র্যাকিং।',
  },
  {
    id: 'finance-profit',
    label: 'Earnings Overview & Wallet',
    labelBn: 'উপার্জন ও ওয়ালেট ব্যালেন্স',
    group: 'finance',
    description: 'Specialized earnings panel showing lifetime revenue, available balance, pending courier profits, withdrawal payouts, and deposit.',
    descriptionBn: 'আজীবন আয়, উত্তোলনযোগ্য ব্যালেন্স, পেন্ডিং কুরিয়ার প্রফিট ও টাকা তোলার স্টেটমেন্ট।',
  },
  {
    id: 'finance-transactions',
    label: 'Reseller Profit Ledger History',
    labelBn: 'প্রফিট লেজার ও ট্রানজ্যাকশন হিস্ট্রি',
    group: 'finance',
    description: 'View full audit log of order profit releases, deposits, and withdrawal transactions.',
    descriptionBn: 'অর্ডার প্রফিট রিলিজ, ডিপোজিট ও উত্তোলনের সম্পূর্ণ অডিট ট্রানজ্যাকশন লগ।',
  },
  {
    id: 'courier-checker',
    label: 'Courier Fraud & Delivery Checker',
    labelBn: 'কুরিয়ার ফ্রড ও ডেলিভারি চেকার',
    group: 'tools',
    description: 'Check customer past delivery history across Steadfast, Pathao & RedX to prevent returned parcels.',
    descriptionBn: 'পার্সেল রিটার্ন ঠেকাতে স্টিডফাস্ট, পাঠাও ও রেডএক্স-এ কাস্টমারের অতীত ডেলিভারি হিস্ট্রি চেক।',
  },
  {
    id: 'delivery-courier',
    label: 'Courier Booking & Parcel Tracking',
    labelBn: 'কুরিয়ার বুকিং ও ট্র্যাকিং',
    group: 'tools',
    description: 'Book parcels with Steadfast courier, generate consignment numbers, track live parcel milestones, and review delivery fees.',
    descriptionBn: 'স্টিডফাস্ট কুরিয়ারে পার্সেল বুকিং, কনসাইনমেন্ট নম্বর তৈরি ও লাইভ পার্সেল ট্র্যাকিং।',
  },
  {
    id: 'landing-page',
    label: 'Product Landing Page Generator (VIP)',
    labelBn: 'ল্যান্ডিং পেজ ক্রিয়েটর (বুস্টিং)',
    group: 'marketing',
    description: 'Generate high-converting Facebook and TikTok ad landing pages for catalog products with pixel tracking and WhatsApp chat.',
    descriptionBn: 'পিক্সেল ট্র্যাকিং ও হোয়াটসঅ্যাপ চ্যাটসহ ফেসবুক এবং টিকটক বিজ্ঞাপনের জন্য আকর্ষণীয় ল্যান্ডিং পেজ।',
  },
  {
    id: 'campaigns',
    label: 'Campaign & Promo Hub',
    labelBn: 'ক্যাম্পেইন ও প্রোমো হাব',
    group: 'marketing',
    description: 'Create promotional sales campaigns, track custom referral campaign links, and manage special offer discounts.',
    descriptionBn: 'প্রমোশনাল সেলস ক্যাম্পেইন তৈরি, রেফারাল ক্যাম্পেইন লিংক ট্র্যাকিং ও স্পেশাল অফার ছাড়।',
  },
  {
    id: 'customers',
    label: 'Customer Directory & CRM',
    labelBn: 'কাস্টমার ডিরেক্টরি ও সিআরএম',
    group: 'tools',
    description: 'Save client contact numbers, delivery addresses, and track repeat order value.',
    descriptionBn: 'গ্রাহকদের ফোন নম্বর ও ঠিকানা সংরক্ষণ এবং বারবার অর্ডার করার হিস্ট্রি ট্র্যাক করা।',
  },
  {
    id: 'marketing-share',
    label: '1-Click Share & HD Photo Download',
    labelBn: 'শেয়ার ও এইচডি ফটো ডাউনলোড',
    group: 'marketing',
    description: 'Instant 1-click copy product photos, high-resolution original image downloads, retail price, and formatted Facebook captions.',
    descriptionBn: '১-ক্লিকে পণ্যের ছবি কপি, হাই-রেজ্যুলেশন ছবি ডাউনলোড, খুচরা মূল্য ও ফেসবুক ক্যাপশন।',
  },
  {
    id: 'marketing-referral',
    label: 'Referral Earning & Rewards',
    labelBn: 'রেফারাল আর্নিং ও রিওয়ার্ড',
    group: 'marketing',
    description: 'Referral program sharing hub to invite fellow resellers and earn lifetime sub-reseller commissions.',
    descriptionBn: 'অন্যান্য রিসেলারদের আমন্ত্রণ জানিয়ে লাইফটাইম সাব-রিসেলার কমিশন উপার্জনের হাব।',
  },
  {
    id: 'analytics',
    label: 'Sales & Profit Analytics',
    labelBn: 'সেলস ও প্রফিট এনালিটিক্স',
    group: 'finance',
    description: 'Visual graphs of daily revenue, profit trends, top margin categories, and customer retention metrics.',
    descriptionBn: 'দৈনিক আয়, লাভের গ্রাফ, সেরা ক্যাটাগরি ও কাস্টমার রিটেনশনের বিস্তারিত অ্যানালিটিক্স।',
  },
  {
    id: 'team-chat',
    label: 'Live Chat with KenaX BD Team',
    labelBn: 'ক্যানাক্স বিডি টিমের সাথে লাইভ চ্যাট',
    group: 'support',
    description: 'Direct interactive live chat with KenaX BD central support and accounts team.',
    descriptionBn: 'ক্যানাক্স বিডি কেন্দ্রীয় সাপোর্ট ও অ্যাকাউন্টস টিমের সাথে সরাসরি লাইভ চ্যাট।',
  },
  {
    id: 'support',
    label: 'Dedicated VIP Support Desk',
    labelBn: 'ডেডিকেটেড ভিআইপি সাপোর্ট',
    group: 'support',
    description: 'Create and track priority support tickets for parcel disputes, refunds, and withdrawals.',
    descriptionBn: 'পার্সেল সংক্রান্ত সমস্যা, রিফান্ড ও উত্তোলনের জন্য প্রায়োরিটি সাপোর্ট টিকিট তৈরি।',
  },
  {
    id: 'membership-plan',
    label: 'Reseller Plan & VIP Tier Upgrade',
    labelBn: 'মেম্বারশিপ প্ল্যান ও নিয়ম',
    group: 'support',
    description: 'View current active reseller plan, advance delivery charge rules (Basic 5-7, Standard 3, Premium 0), and upgrade options.',
    descriptionBn: 'রিসেলার প্ল্যান, অগ্রিম ডেলিভারি চার্জ নিয়ম (বেসিক ৫-৭টি, স্ট্যান্ডার্ড ৩টি, প্রিমিয়াম ০) ও আপগ্রেড সুবিধা।',
  },
  {
    id: 'settings',
    label: 'Reseller Account Settings',
    labelBn: 'অ্যাকাউন্ট ও সিকিউরিটি সেটিংস',
    group: 'support',
    description: 'Manage payout mobile numbers (bKash/Nagad/Bank), security passwords, and notifications.',
    descriptionBn: 'টাকা তোলার মোবাইল নম্বর (বিকাশ/নগদ/ব্যাংক), সিকিউরিটি পাসওয়ার্ড ও নোটিফিকেশন সেটিংস।',
  },
  {
    id: 'profile',
    label: 'My Profile & Account',
    labelBn: 'মাই প্রোফাইল ও অ্যাকাউন্ট',
    group: 'support',
    description: 'Edit personal profile, business details, payout mobile numbers (bKash/Nagad/Rocket/Bank), shop bio, and notification settings.',
    descriptionBn: 'ব্যক্তিগত তথ্য, ব্যবসার বিবরণ, টাকা তোলার নম্বর (বিকাশ/নগদ/রকেট/ব্যাংক) ও শপ বায়ো সম্পাদনা।',
  },
];

export interface ResellerTierAllowedTabs {
  basic: string[];
  standard: string[];
  premium: string[];
}

export interface RolePermissionMatrixConfig {
  id: string;
  sellerAllowedTabs: string[];
  resellerAllowedTabs: string[];
  resellerTierAllowedTabs?: ResellerTierAllowedTabs;
  updatedAt: string;
  updatedBy: string;
}

const STORAGE_KEY = 'kenax_role_permission_matrix_v1';
const FIRESTORE_PATH = 'system_settings';
const FIRESTORE_DOC_ID = 'permission_matrix';

// Default Tier Permissions
export const DEFAULT_RESELLER_TIER_TABS: ResellerTierAllowedTabs = {
  premium: RESELLER_DASHBOARD_TABS.map((t) => t.id),
  standard: RESELLER_DASHBOARD_TABS.filter((t) => t.id !== 'landing-page').map((t) => t.id),
  basic: RESELLER_DASHBOARD_TABS.filter(
    (t) => t.id !== 'landing-page' && t.id !== 'courier-checker' && t.id !== 'campaigns' && t.id !== 'analytics'
  ).map((t) => t.id),
};

// Factory Defaults (All enabled initially)
export const DEFAULT_PERMISSION_MATRIX: RolePermissionMatrixConfig = {
  id: 'permission_matrix',
  sellerAllowedTabs: SELLER_DASHBOARD_TABS.map((t) => t.id),
  resellerAllowedTabs: RESELLER_DASHBOARD_TABS.map((t) => t.id),
  resellerTierAllowedTabs: DEFAULT_RESELLER_TIER_TABS,
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Default',
};

// Cached In-Memory State
let cachedSettings: RolePermissionMatrixConfig = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sellerAllowedTabs) && Array.isArray(parsed.resellerAllowedTabs)) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_PERMISSION_MATRIX;
})();

// Listeners for In-App Live Updates
type PermissionListener = (settings: RolePermissionMatrixConfig) => void;
const listeners = new Set<PermissionListener>();

export function getCachedPermissionMatrix(): RolePermissionMatrixConfig {
  return cachedSettings;
}

export function subscribeToLocalPermissionMatrix(listener: PermissionListener): () => void {
  listeners.add(listener);
  listener(cachedSettings);
  return () => {
    listeners.delete(listener);
  };
}

function broadcastUpdate(newSettings: RolePermissionMatrixConfig) {
  cachedSettings = newSettings;
  safeSetLocalStorage(STORAGE_KEY, JSON.stringify(newSettings));
  listeners.forEach((listener) => {
    try {
      listener(newSettings);
    } catch (e) {
      console.error('Error in permission matrix listener:', e);
    }
  });
}

// 1. Live Real-Time Firestore Sync
export function subscribeToFirebasePermissionMatrix(
  onUpdate: (settings: RolePermissionMatrixConfig) => void
): Unsubscribe {
  const docRef = doc(db, FIRESTORE_PATH, FIRESTORE_DOC_ID);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<RolePermissionMatrixConfig>;
        const merged: RolePermissionMatrixConfig = {
          id: FIRESTORE_DOC_ID,
          sellerAllowedTabs: Array.isArray(data.sellerAllowedTabs)
            ? data.sellerAllowedTabs
            : DEFAULT_PERMISSION_MATRIX.sellerAllowedTabs,
          resellerAllowedTabs: Array.isArray(data.resellerAllowedTabs)
            ? data.resellerAllowedTabs
            : DEFAULT_PERMISSION_MATRIX.resellerAllowedTabs,
          resellerTierAllowedTabs: data.resellerTierAllowedTabs && typeof data.resellerTierAllowedTabs === 'object'
            ? {
                basic: Array.isArray(data.resellerTierAllowedTabs.basic)
                  ? data.resellerTierAllowedTabs.basic
                  : DEFAULT_RESELLER_TIER_TABS.basic,
                standard: Array.isArray(data.resellerTierAllowedTabs.standard)
                  ? data.resellerTierAllowedTabs.standard
                  : DEFAULT_RESELLER_TIER_TABS.standard,
                premium: Array.isArray(data.resellerTierAllowedTabs.premium)
                  ? data.resellerTierAllowedTabs.premium
                  : DEFAULT_RESELLER_TIER_TABS.premium,
              }
            : DEFAULT_RESELLER_TIER_TABS,
          updatedAt: data.updatedAt || new Date().toISOString(),
          updatedBy: data.updatedBy || 'Admin',
        };
        broadcastUpdate(merged);
        onUpdate(merged);
      } else {
        // Document does not exist in Firestore yet: seed it with defaults
        savePermissionMatrixToFirebase(DEFAULT_PERMISSION_MATRIX).catch(() => {});
        onUpdate(DEFAULT_PERMISSION_MATRIX);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${FIRESTORE_PATH}/${FIRESTORE_DOC_ID}`);
      // Fallback to local cache
      onUpdate(cachedSettings);
    }
  );
}

// 2. Save Matrix to Firebase & Storage
export async function savePermissionMatrixToFirebase(
  config: RolePermissionMatrixConfig
): Promise<void> {
  const docRef = doc(db, FIRESTORE_PATH, FIRESTORE_DOC_ID);
  const payload: RolePermissionMatrixConfig = {
    ...config,
    id: FIRESTORE_DOC_ID,
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || 'Authorized Admin',
  };

  // Immediate local optimistic broadcast
  broadcastUpdate(payload);

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${FIRESTORE_PATH}/${FIRESTORE_DOC_ID}`);
    throw error;
  }
}

// 3. Helper: Check if tab is allowed for specific role & plan
export function isTabAllowedForRole(
  role: 'seller' | 'reseller',
  tabId: string,
  settings: RolePermissionMatrixConfig = cachedSettings,
  planId?: 'basic' | 'standard' | 'premium'
): boolean {
  if (role === 'seller') {
    return settings.sellerAllowedTabs.includes(tabId);
  } else {
    // If a planId is specified, check against resellerTierAllowedTabs first
    if (planId && settings.resellerTierAllowedTabs && settings.resellerTierAllowedTabs[planId]) {
      const tierAllowed = settings.resellerTierAllowedTabs[planId];
      if (tierAllowed.includes(tabId)) return true;
      // Map aliases for Active Sales
      if (
        (tabId === 'active-sales' || tabId === 'sales' || tabId === 'orders-processing' || tabId === 'orders-delivered') &&
        tierAllowed.includes('orders-all')
      ) {
        return true;
      }
      // Map aliases for Earnings Overview
      if (
        (tabId === 'earnings' || tabId === 'finance-wallet' || tabId === 'analytics-sales' || tabId === 'analytics-profit') &&
        (tierAllowed.includes('finance-profit') || tierAllowed.includes('finance-wallet'))
      ) {
        return true;
      }
      // Map aliases for Product Catalog
      if (
        (tabId === 'product-catalog' || tabId === 'my-products') &&
        tierAllowed.includes('catalog')
      ) {
        return true;
      }
      return false;
    }

    // Default global reseller check
    if (settings.resellerAllowedTabs.includes(tabId)) return true;
    // Map aliases for Active Sales
    if (
      (tabId === 'active-sales' || tabId === 'sales' || tabId === 'orders-processing' || tabId === 'orders-delivered') &&
      settings.resellerAllowedTabs.includes('orders-all')
    ) {
      return true;
    }
    // Map aliases for Earnings Overview
    if (
      (tabId === 'earnings' || tabId === 'finance-wallet' || tabId === 'analytics-sales' || tabId === 'analytics-profit') &&
      (settings.resellerAllowedTabs.includes('finance-profit') || settings.resellerAllowedTabs.includes('finance-wallet'))
    ) {
      return true;
    }
    // Map aliases for Product Catalog
    if (
      (tabId === 'product-catalog' || tabId === 'my-products') &&
      settings.resellerAllowedTabs.includes('catalog')
    ) {
      return true;
    }
    return false;
  }
}
