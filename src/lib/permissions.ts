import { UserRole } from '../types/index.ts';

export interface PermissionDefinition {
  id: string;
  name: string;
  nameBn?: string;
  description: string;
  module: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // --- WHATSAPP AUTOMATION & LIVE INBOX (Granular RBAC) ---
  {
    id: 'whatsapp.inbox',
    name: 'WhatsApp Live Inbox & Chats',
    nameBn: 'হোয়াটসঅ্যাপ লাইভ ইনবক্স ও চ্যাট হিস্ট্রি',
    description: 'Access WhatsApp live inbox, view customer conversation history, and monitor unread messages',
    module: 'WhatsApp',
  },
  {
    id: 'whatsapp.reply',
    name: 'WhatsApp Direct Replies & Media',
    nameBn: 'হোয়াটসঅ্যাপ রিপ্লাই ও মিডিয়া পাঠানো',
    description: 'Send direct text replies, images, videos, audio notes, and instant responses to customers',
    module: 'WhatsApp',
  },
  {
    id: 'whatsapp.templates',
    name: 'WhatsApp Message Templates',
    nameBn: 'হোয়াটসঅ্যাপ মেসেজ টেমপ্লেটস কনফিগারেশন',
    description: 'Configure automated order notifications, status alert templates & event messaging rules',
    module: 'WhatsApp',
  },
  {
    id: 'whatsapp.settings',
    name: 'WhatsApp API & Webhook Settings',
    nameBn: 'হোয়াটসঅ্যাপ ক্লাউড এপিআই ও ওয়েবহুক সেটিংস',
    description: 'Manage Meta Cloud API token, Phone Number ID, Webhook verification secret & API credentials',
    module: 'WhatsApp',
  },

  // --- TELEGRAM BOT (Granular RBAC) ---
  {
    id: 'telegram.view',
    name: 'Telegram Bot & Mini App View',
    nameBn: 'টেলিগ্রাম বট ও মিনি অ্যাপ অ্যাক্সেস',
    description: 'View Telegram bot dashboard, channel alerts, customer subscriber logs & Mini App status',
    module: 'Telegram',
  },
  {
    id: 'telegram.send',
    name: 'Telegram Quick Sender & Dispatch',
    nameBn: 'টেলিগ্রাম মেসেজ ও ব্রডকাস্ট পাঠানো',
    description: 'Send manual Telegram messages, test broadcasts, product discounts to connected channels',
    module: 'Telegram',
  },
  {
    id: 'telegram.templates',
    name: 'Telegram Alert Templates',
    nameBn: 'টেলিগ্রাম নোটিফিকেশন টেমপ্লেটস',
    description: 'Configure order status alerts, registration alerts, and low stock templates for Telegram',
    module: 'Telegram',
  },
  {
    id: 'telegram.rules',
    name: 'Telegram Command Rules Matrix',
    nameBn: 'টেলিগ্রাম কমান্ড রুলস ম্যাট্রিক্স',
    description: 'Manage Telegram bot commands (/start, /track, /help, /offers) and interactive inline buttons',
    module: 'Telegram',
  },
  {
    id: 'telegram.settings',
    name: 'Telegram Bot Token & Admin IDs',
    nameBn: 'টেলিগ্রাম বট টোকেন ও সিক্রেট আইডি',
    description: 'Manage sensitive Telegram Bot Token, Super Admin Chat ID, and private Admin Chat IDs',
    module: 'Telegram',
  },

  // --- AI STORE CHATBOT & RULE MATRIX ---
  {
    id: 'chatbot.ai',
    name: 'AI Store Chatbot Access',
    nameBn: 'স্টোর চ্যাটবট অ্যাক্সেস',
    description: 'Configure AI shopping assistant, persona prompt, ordering features & welcome message',
    module: 'Chatbot',
  },
  {
    id: 'chatbot.rules',
    name: 'Chatbot Rule Matrix & Actions',
    nameBn: 'চ্যাটবট রুল ম্যাট্রিক্স ও অ্যাকশন লজিক',
    description: 'Add, edit, prioritize and configure rule-based triggers, keywords, auto-replies & action functions',
    module: 'Chatbot',
  },
  {
    id: 'chatbot.sms',
    name: 'SMS Gateway & Alerts Access',
    description: 'Send SMS notifications, configure SMS gateway APIs (Greenweb, Bulk SMS) & SMS templates',
    module: 'Automation',
  },
  {
    id: 'chatbot.email',
    name: 'Gmail & Email Alerts Access',
    description: 'Access email notification templates, Gmail SMTP settings, email logs & automated mailers',
    module: 'Automation',
  },

  // --- MARKETING & ADVERTISER (Meta Pixel, TikTok, Google Ads, ROAS) ---
  { id: 'marketing.view', name: 'View Advertiser & Pixel Hub', nameBn: 'অ্যাডভার্টাইজার ও পিক্সেল হাব দেখুন', description: 'Access advertising dashboard, UTM generator & campaign ROAS tracker', module: 'Marketing' },
  { id: 'marketing.manage', name: 'Manage Ad Pixels & CAPI', nameBn: 'পিক্সেল ও CAPI কনফিগারেশন নিয়ন্ত্রণ', description: 'Configure Meta Pixel ID, Conversions API Token, TikTok Pixel & Google Ads conversion IDs', module: 'Marketing' },

  // --- PRODUCTS & CATALOG ---
  { id: 'products.view', name: 'View Products Catalog', description: 'View product catalog, pricing & stock status', module: 'Products' },
  { id: 'products.create', name: 'Create Products', description: 'Add new products, variants, highlights & images', module: 'Products' },
  { id: 'products.edit', name: 'Edit Products', description: 'Modify pricing, stock levels, descriptions & badges', module: 'Products' },
  { id: 'products.delete', name: 'Delete Products', description: 'Remove or archive products from catalog', module: 'Products' },
  { id: 'products.manage', name: 'Full Product Control', description: 'Bulk updates, duplication, prioritization & feature badges', module: 'Products' },
  { id: 'landing_pages.view', name: 'View Landing Pages', description: 'Access dedicated product landing page builder & analytics', module: 'Products' },
  { id: 'landing_pages.manage', name: 'Manage Landing Pages', description: 'Create, toggle active/inactive & customize product landing pages for Facebook Ads', module: 'Products' },
  { id: 'categories.manage', name: 'Manage Categories & Subcategories', description: 'Create and organize categories, subcategories & hierarchy', module: 'Products' },

  // --- ORDERS & SALES ---
  { id: 'orders.view', name: 'View Orders List', description: 'View customer orders list, order details & purchasing history', module: 'Orders' },
  { id: 'orders.create', name: 'Create Manual Orders', description: 'Create phone, walk-in & manual customer orders', module: 'Orders' },
  { id: 'orders.edit', name: 'Edit Orders', description: 'Update order items, delivery address, discount & extra charges', module: 'Orders' },
  { id: 'orders.status', name: 'Update Order Status', description: 'Change status from Pending, Confirmed, Shipped to Delivered', module: 'Orders' },
  { id: 'orders.cancel', name: 'Cancel Orders', description: 'Cancel orders and restore product inventory stock', module: 'Orders' },
  { id: 'orders.manage', name: 'Full Order Control', description: 'Full refund handling, dispute resolution & permanent order deletion', module: 'Orders' },
  { id: 'orders.cart_activities', name: 'View Live Cart Activities', description: 'Monitor live items customers are currently adding to cart', module: 'Orders' },
  { id: 'orders.wishlist_activities', name: 'View Wishlist Trends', description: 'Track saved customer wishlists and popular product interest', module: 'Orders' },

  // --- INVENTORY & WAREHOUSE ---
  { id: 'inventory.view', name: 'View Stock & Alerts', description: 'Monitor SKU stock levels and low stock warning alerts', module: 'Inventory' },
  { id: 'inventory.adjust', name: 'Adjust Stock Quantities', description: 'Manually add/subtract stock with stock log audit reasons', module: 'Inventory' },
  { id: 'inventory.manage', name: 'Manage Warehouses', description: 'Warehouse stock allocation, batch numbers & reorder triggers', module: 'Inventory' },

  // --- DROPSHIPPING & SUPPLIERS ---
  { id: 'suppliers.view', name: 'View Suppliers & Wholesalers', description: 'View supplier address book, vendors & dropshipping sources', module: 'Suppliers' },
  { id: 'suppliers.manage', name: 'Manage Suppliers & Sourcing', description: 'Add, edit & delete wholesale suppliers, sourcing terms & contacts', module: 'Suppliers' },

  // --- CUSTOMERS & REVIEWS ---
  { id: 'customers.view', name: 'View Customer Accounts', description: 'View customer accounts, contact numbers & lifetime order totals', module: 'Customers' },
  { id: 'customers.edit', name: 'Edit Customer Info', description: 'Update customer address, phone number & account info', module: 'Customers' },
  { id: 'customers.block', name: 'Block / Unblock Customers', description: 'Restrict fraudulent or spam customer phone numbers', module: 'Customers' },
  { id: 'reviews.view', name: 'View Customer Reviews', description: 'Read customer ratings, star reviews & photo testimonials', module: 'Reviews' },
  { id: 'reviews.approve', name: 'Approve / Moderation', description: 'Approve or hide customer reviews on website product pages', module: 'Reviews' },
  { id: 'reviews.delete', name: 'Delete Customer Reviews', description: 'Permanently remove fake or spam product reviews', module: 'Reviews' },

  // --- LOGISTICS & SHIPPING ---
  { id: 'delivery.view', name: 'View Deliveries & Couriers', description: 'Track courier consignments, Steadfast/Pathao status & shipping stats', module: 'Delivery' },
  { id: 'delivery.update', name: 'Update Tracking IDs', description: 'Assign courier IDs, tracking numbers & delivery notes', module: 'Delivery' },
  { id: 'delivery.manage', name: 'Manage Delivery Zones', description: 'Configure delivery zones, delivery charges & courier API keys', module: 'Delivery' },

  // --- PAYMENTS & FINANCIALS ---
  { id: 'payments.view', name: 'View Payment Transactions', description: 'Inspect cash-on-delivery, bKash, Nagad & Rocket transaction history', module: 'Payments' },
  { id: 'payments.verify', name: 'Verify Advance Payments', description: 'Approve or reject manual bKash/Nagad/Rocket TrxIDs & advance fees', module: 'Payments' },
  { id: 'payments.gateways', name: 'Manage Payment Gateways', description: 'Configure merchant gateway numbers, QR codes & payment modes', module: 'Payments' },
  { id: 'costs.view', name: 'View Costs & Expenses', description: 'Track daily operational expenses, ad spend & net profit margins', module: 'Financials' },
  { id: 'costs.manage', name: 'Manage Expenses & Costs', description: 'Add, edit & delete business expenses, office costs & ad budgets', module: 'Financials' },

  // --- COUPONS & PROMOTIONS ---
  { id: 'coupons.view', name: 'View Promo Coupons', description: 'View active promo codes, discount deals & usage count', module: 'Coupons' },
  { id: 'coupons.create', name: 'Create Coupons', description: 'Create discount vouchers, promo codes & minimum spend rules', module: 'Coupons' },
  { id: 'coupons.edit', name: 'Edit Coupons', description: 'Modify discount amount, percentage, expiry date & usage limit', module: 'Coupons' },
  { id: 'coupons.delete', name: 'Delete Coupons', description: 'Deactivate and remove promo codes from store', module: 'Coupons' },

  // --- REPORTS & PERFORMANCE ---
  { id: 'reports.view', name: 'View Sales Analytics', description: 'View sales performance, order revenue charts & category stats', module: 'Reports' },
  { id: 'reports.export', name: 'Export Reports (CSV)', description: 'Download CSV sales reports for accounting & audit purposes', module: 'Reports' },
  { id: 'performance.view', name: 'View Staff Performance', description: 'Track order handling efficiency & leaderboard per staff member', module: 'Reports' },
  { id: 'my_dashboard.view', name: 'View My Dashboard', description: 'View personal staff performance, confirmed orders, delivered revenue & pending pool', module: 'Reports' },

  // --- STAFF & RBAC ---
  { id: 'staff.view', name: 'View Staff Accounts', description: 'List employee accounts, login history & status', module: 'Staff' },
  { id: 'staff.create', name: 'Create Staff Accounts', description: 'Invite & provision new staff accounts with custom roles', module: 'Staff' },
  { id: 'staff.edit', name: 'Edit Staff & Permissions', description: 'Update staff details, role assignments & granular checkboxes', module: 'Staff' },
  { id: 'staff.delete', name: 'Delete / Suspend Staff', description: 'Suspend staff login access or permanently remove staff account', module: 'Staff' },
  { id: 'roles.view', name: 'View Permissions Matrix', description: 'Inspect role permission hierarchy and access levels', module: 'Roles' },
  { id: 'roles.manage', name: 'Customize Permission Matrix', description: 'Customize standard role permission templates', module: 'Roles' },

  // --- SETTINGS, SEO & LOGS ---
  { id: 'settings.view', name: 'View Website Settings', description: 'View store profile, contact numbers & general settings', module: 'Settings' },
  { id: 'settings.edit', name: 'Edit Store Settings', description: 'Update store info, delivery rates, banners, branding & policies', module: 'Settings' },
  { id: 'seo.manage', name: 'Manage SEO & Meta Tags', description: 'Configure Google Site Verification, meta titles, descriptions & cards', module: 'Settings' },
  { id: 'logs.view', name: 'View Activity Audit Logs', description: 'Inspect full audit trail of all staff and admin actions', module: 'Audit Logs' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<'super_admin' | 'admin' | 'manager' | 'moderator', string[]> = {
  super_admin: ALL_PERMISSIONS.map((p) => p.id),
  admin: ALL_PERMISSIONS.filter(
    (p) => p.id !== 'staff.delete' && p.id !== 'roles.manage' && p.id !== 'my_dashboard.view'
  ).map((p) => p.id),
  manager: [
    'whatsapp.inbox',
    'whatsapp.reply',
    'whatsapp.templates',
    'telegram.view',
    'telegram.send',
    'telegram.templates',
    'telegram.rules',
    'chatbot.ai',
    'chatbot.rules',
    'chatbot.sms',
    'chatbot.email',
    'marketing.view',
    'marketing.manage',
    'products.view',
    'products.create',
    'products.edit',
    'products.manage',
    'landing_pages.view',
    'landing_pages.manage',
    'categories.manage',
    'orders.view',
    'orders.create',
    'orders.edit',
    'orders.status',
    'orders.cancel',
    'orders.manage',
    'orders.cart_activities',
    'orders.wishlist_activities',
    'inventory.view',
    'inventory.adjust',
    'inventory.manage',
    'suppliers.view',
    'suppliers.manage',
    'customers.view',
    'customers.edit',
    'delivery.view',
    'delivery.update',
    'delivery.manage',
    'payments.view',
    'payments.verify',
    'costs.view',
    'costs.manage',
    'coupons.view',
    'coupons.create',
    'coupons.edit',
    'coupons.delete',
    'reviews.view',
    'reviews.approve',
    'reports.view',
    'reports.export',
    'performance.view',
    'logs.view',
  ],
  moderator: [
    'whatsapp.inbox',
    'whatsapp.reply',
    'telegram.view',
    'telegram.send',
    'products.view',
    'products.edit',
    'orders.view',
    'orders.status',
    'orders.cart_activities',
    'inventory.view',
    'inventory.adjust',
    'customers.view',
    'delivery.view',
    'delivery.update',
    'payments.view',
    'reviews.view',
    'reviews.approve',
    'logs.view',
  ],
};

/**
 * Checks if a given role or customized permission array satisfies the required permission.
 */
export function hasPermission(
  role: UserRole,
  customPermissions: string[] | undefined,
  requiredPermission: string
): boolean {
  if (role === 'customer') return false;

  // My Dashboard is strictly restricted to Super Admin only (User explicit requirement)
  if (requiredPermission === 'my_dashboard.view') {
    return role === 'super_admin';
  }

  if (role === 'super_admin') return true;

  // Helper matcher
  const satisfies = (permList: string[]): boolean => {
    if (permList.includes('*')) return true;
    if (permList.includes(requiredPermission)) return true;

    // Granular WhatsApp permissions mapping
    if (requiredPermission === 'whatsapp.inbox' || requiredPermission === 'chatbot.whatsapp') {
      if (
        permList.includes('whatsapp.inbox') ||
        permList.includes('whatsapp.reply') ||
        permList.includes('chatbot.whatsapp') ||
        permList.includes('settings.view')
      ) {
        return true;
      }
    }
    if (requiredPermission === 'whatsapp.reply') {
      if (permList.includes('whatsapp.reply') || permList.includes('chatbot.whatsapp')) return true;
    }
    if (requiredPermission === 'whatsapp.templates') {
      if (permList.includes('whatsapp.templates') || permList.includes('chatbot.whatsapp')) return true;
    }
    if (requiredPermission === 'whatsapp.settings') {
      if (permList.includes('whatsapp.settings') || permList.includes('chatbot.whatsapp')) return true;
    }

    // Granular Telegram permissions mapping
    if (requiredPermission === 'telegram.view' || requiredPermission === 'chatbot.telegram') {
      if (
        permList.includes('telegram.view') ||
        permList.includes('telegram.send') ||
        permList.includes('telegram.rules') ||
        permList.includes('chatbot.telegram') ||
        permList.includes('settings.view')
      ) {
        return true;
      }
    }
    if (requiredPermission === 'telegram.send') {
      if (permList.includes('telegram.send') || permList.includes('chatbot.telegram')) return true;
    }
    if (requiredPermission === 'telegram.rules') {
      if (permList.includes('telegram.rules') || permList.includes('chatbot.telegram')) return true;
    }
    if (requiredPermission === 'telegram.templates') {
      if (permList.includes('telegram.templates') || permList.includes('chatbot.telegram')) return true;
    }
    if (requiredPermission === 'telegram.settings') {
      if (permList.includes('telegram.settings') || permList.includes('chatbot.telegram')) return true;
    }

    // Granular Chatbot permissions mapping
    if (requiredPermission === 'chatbot.ai') {
      if (
        permList.includes('chatbot.ai') ||
        permList.includes('chatbot.rules') ||
        permList.includes('settings.view') ||
        permList.includes('settings.edit')
      ) {
        return true;
      }
    }
    if (requiredPermission === 'chatbot.rules') {
      if (
        permList.includes('chatbot.rules') ||
        permList.includes('chatbot.ai') ||
        permList.includes('settings.view')
      ) {
        return true;
      }
    }

    // Legacy & Other mapping fallbacks
    if (requiredPermission.startsWith('chatbot.')) {
      if (permList.includes('settings.view') || permList.includes('settings.edit')) {
        return true;
      }
    }
    if (requiredPermission === 'orders.cart_activities' || requiredPermission === 'orders.wishlist_activities') {
      if (permList.includes('orders.view')) return true;
    }
    if (requiredPermission === 'costs.view' || requiredPermission === 'costs.manage') {
      if (permList.includes('reports.view') || permList.includes('settings.view')) return true;
    }
    if (requiredPermission === 'suppliers.view' || requiredPermission === 'suppliers.manage') {
      if (permList.includes('products.view')) return true;
    }
    if (requiredPermission === 'categories.manage') {
      if (permList.includes('products.view')) return true;
    }
    if (requiredPermission === 'payments.gateways') {
      if (permList.includes('payments.view') || permList.includes('settings.view')) return true;
    }
    if (requiredPermission === 'seo.manage') {
      if (permList.includes('settings.view')) return true;
    }
    if (requiredPermission === 'performance.view') {
      if (permList.includes('reports.view')) return true;
    }

    return false;
  };

  // Evaluate custom permissions array if present
  if (customPermissions && Array.isArray(customPermissions) && customPermissions.length > 0) {
    return satisfies(customPermissions);
  }

  // Fallback to role default
  const roleDefault = DEFAULT_ROLE_PERMISSIONS[role as 'admin' | 'manager' | 'moderator'] || [];
  return satisfies(roleDefault);
}

