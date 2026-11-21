import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
  deleteField,
  serverTimestamp,
} from 'firebase/firestore';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  Check,
  Plus,
  Trash2,
  X,
  LogIn,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { db, auth, logActivityToDB, OperationType } from '../../lib/firebase';
import { StaffUser, UserRole, ActivityLog } from '../../types';

// ============================================================================
// 1. SIDEBAR SECTION & DASHBOARD TAB HIERARCHY (Mirrors AdminSidebar + Settings)
// ============================================================================

export interface KnownTreeAreaNode {
  title: string;
  /** Canonical PascalCase slug used when generating `<action><Path>` keys */
  slug: string;
  /** Optional alternate slugs recognized when mapping existing keys back into this folder */
  aliases?: string[];
  children?: KnownTreeAreaNode[];
}

export interface KnownSidebarSection {
  title: string;
  tabs: KnownTreeAreaNode[];
}

export const STORE_SETTINGS_SUBGROUPS: KnownTreeAreaNode[] = [
  {
    title: 'Hero Slides',
    slug: 'HeroSlides',
    aliases: ['HeroBanner', 'HeroBanners'],
    children: [
      { title: 'Slide 1', slug: 'Slide1' },
      { title: 'Slide 2', slug: 'Slide2' },
      { title: 'Slide 3', slug: 'Slide3' },
    ],
  },
  {
    title: 'Header Navigation & Priorities',
    slug: 'HeaderNavigation',
    aliases: ['HeaderNavigationAndPriorities', 'HeaderNavigationPriorities'],
    children: [
      { title: 'Main Menu', slug: 'MainMenu' },
      { title: 'Category Bar', slug: 'CategoryBar' },
      { title: 'Top Bar', slug: 'TopBar' },
    ],
  },
  {
    title: 'Tag Collection Banners',
    slug: 'TagCollectionBanners',
    aliases: ['TagBanners', 'TagCollections'],
  },
  {
    title: 'Promo Grid',
    slug: 'PromoGrid',
    children: [
      { title: 'Card 1', slug: 'Card1' },
      { title: 'Card 2', slug: 'Card2' },
      { title: 'Card 3', slug: 'Card3' },
      { title: 'Card 4', slug: 'Card4' },
    ],
  },
  {
    title: 'Mid Promo Banner',
    slug: 'MidPromoBanner',
  },
  {
    title: 'Store Profile',
    slug: 'StoreProfile',
  },
  {
    title: 'Delivery & Pay',
    slug: 'DeliveryAndPay',
    aliases: ['DeliveryPay'],
  },
  {
    title: 'SEO & Meta',
    slug: 'SeoAndMeta',
    aliases: ['SeoMeta', 'SEOMeta'],
  },
  {
    title: 'Order Step Names',
    slug: 'OrderStepNames',
  },
  {
    title: 'Policies & Legal Pages',
    slug: 'PoliciesAndLegalPages',
    aliases: ['PoliciesLegalPages'],
  },
];

export const SIDEBAR_TREE_SCHEMA: KnownSidebarSection[] = [
  {
    title: 'CORE',
    tabs: [
      { title: 'ড্যাশবোর্ড', slug: 'Dashboard', aliases: ['DashboardOverview', 'Overview'] },
      { title: 'Report & Analytics', slug: 'Reports', aliases: ['ReportAndAnalytics', 'SalesReports', 'ReportAnalytics'] },
      { title: 'Team Performance', slug: 'TeamPerformance', aliases: ['Performance'] },
      { title: 'আমার ড্যাশবোর্ড', slug: 'MyDashboard' },
    ],
  },
  {
    title: 'SALES',
    tabs: [
      { title: 'Orders', slug: 'Orders', aliases: ['Order', 'OrderStatus'] },
      { title: 'Confirmed Orders', slug: 'ConfirmedOrders' },
      { title: 'অর্ডার সেটিংস', slug: 'OrderSettings' },
      { title: 'Cart Activities', slug: 'CartActivities' },
      { title: 'Wishlist Activities', slug: 'WishlistActivities' },
      { title: 'Payments', slug: 'Payments' },
      { title: 'Advance Payment', slug: 'AdvancePayment', aliases: ['DeliveryAdvance'] },
    ],
  },
  {
    title: 'CATALOG',
    tabs: [
      { title: 'Products', slug: 'Products', aliases: ['Product', 'ProductPerformance'] },
      { title: 'প্রাইস ক্যালকুলেটর', slug: 'PriceCalculator' },
      { title: 'Categories', slug: 'Categories' },
      { title: 'Costs & Expenses', slug: 'CostsAndExpenses', aliases: ['Costs', 'Expenses'] },
      { title: 'Inventory', slug: 'Inventory', aliases: ['Stock'] },
      { title: 'Coupons & Promos', slug: 'Coupons', aliases: ['CouponsAndPromos', 'CouponsPromos'] },
      { title: 'স্পেশাল অফার ও পপআপ', slug: 'GetOffers', aliases: ['GetOffersAndPopup', 'SpecialOffers'] },
      { title: 'Payment Gateways', slug: 'PaymentGateways' },
    ],
  },
  {
    title: 'মার্কেটিং ও বিজ্ঞাপন',
    tabs: [
      { title: 'ফেসবুক অ্যাডস', slug: 'FacebookAds' },
      { title: 'টিকটক অ্যাডস', slug: 'TikTokAds', aliases: ['TiktokAds'] },
      { title: 'গুগল অ্যাডস', slug: 'GoogleAds' },
      { title: 'ল্যান্ডিং পেজ ও সেলস ফানেল', slug: 'LandingPages' },
    ],
  },
  {
    title: 'সরবরাহকারী ও ডিলার',
    tabs: [
      { title: 'সরবরাহকারী', slug: 'Suppliers', aliases: ['Dropshipping'] },
      { title: 'ডিলার ব্যবস্থাপনা', slug: 'DealerManagement', aliases: ['Dealers'] },
    ],
  },
  {
    title: 'CUSTOMERS',
    tabs: [
      { title: 'Customers', slug: 'Customers', aliases: ['Customer'] },
      { title: 'Reviews Moderation', slug: 'ReviewsModeration', aliases: ['Reviews'] },
    ],
  },
  {
    title: 'LOGISTICS',
    tabs: [
      { title: 'Delivery & Couriers', slug: 'DeliveryAndCouriers', aliases: ['Delivery', 'Couriers'] },
      { title: 'Courier Fraud Checker', slug: 'CourierFraudChecker', aliases: ['CourierFraud', 'CourierCheck'] },
    ],
  },
  {
    title: 'AUTOMATION',
    tabs: [
      { title: 'Chat Bot', slug: 'ChatBot' },
      { title: 'WhatsApp Automation', slug: 'WhatsAppAutomation', aliases: ['WhatsAppAlerts', 'WhatsappAlerts'] },
      { title: 'Telegram Bot', slug: 'TelegramBot' },
      { title: 'SMS Gateway & Alerts', slug: 'SmsGatewayAndAlerts', aliases: ['SmsGateway', 'SMSGateway'] },
      { title: 'Gmail Alerts & Templates', slug: 'GmailAlertsAndTemplates', aliases: ['GmailAlerts'] },
    ],
  },
  {
    title: 'STAFF & RBAC',
    tabs: [
      { title: 'Staff Management', slug: 'StaffManagement', aliases: ['Staff'] },
      { title: 'Roles & Permissions', slug: 'RolesAndPermissions', aliases: ['Roles'] },
    ],
  },
  {
    title: 'SYSTEM',
    tabs: [
      {
        title: 'Store Settings',
        slug: 'StoreSettings',
        children: STORE_SETTINGS_SUBGROUPS,
      },
      { title: 'Activity Logs', slug: 'ActivityLogs', aliases: ['Activity'] },
      { title: 'Muse Permissions', slug: 'MusePermissions' },
      { title: 'Muse AI ইন্টিগ্রেশন', slug: 'MuseAiIntegration', aliases: ['IntegrationSettings'] },
      { title: 'SEO & Meta Tags', slug: 'SeoAndMetaTags', aliases: ['SeoSettings', 'SEOSettings'] },
      { title: 'Google Sheets Sync', slug: 'GoogleSheetsSync', aliases: ['GoogleSheets'] },
      { title: 'Privacy & Store Policies', slug: 'PrivacyAndStorePolicies', aliases: ['Policies'] },
      { title: 'স্টোরেজ ও ক্লাউড', slug: 'StorageAndCloud', aliases: ['StorageSettings'] },
    ],
  },
  {
    title: 'প্লাগইনস',
    tabs: [
      { title: 'ইনস্টলকৃত প্লাগইন', slug: 'InstalledPlugins' },
      { title: 'নতুন প্লাগইন যুক্ত করুন', slug: 'AddNewPlugin' },
      { title: 'প্লাগইন স্টোর', slug: 'PluginStore' },
      { title: 'প্লাগইন আপলোড (.zip)', slug: 'UploadPlugin' },
      { title: 'প্লাগইন সেটিংস', slug: 'PluginSettings' },
      { title: 'প্লাগইন আপডেটস', slug: 'PluginUpdates' },
      { title: 'প্লাগইন অ্যাক্টিভিটি লগ', slug: 'PluginActivityLogs' },
    ],
  },
];

export const SECTION_ORDER: string[] = [
  ...SIDEBAR_TREE_SCHEMA.map((s) => s.title),
  'Custom',
];

// ============================================================================
// 2. ALL 23 EXISTING PERMISSIONS (15 Original Built-Ins + 4 Coupons + 4 PromoGrid)
// ============================================================================

export type BuiltInMusePermissionKey =
  | 'viewOrders'
  | 'changeOrderStatus'
  | 'assignOrders'
  | 'addOrders'
  | 'courierCheck'
  | 'viewProducts'
  | 'manageProducts'
  | 'viewProductPerformance'
  | 'viewInventory'
  | 'updateStock'
  | 'viewActivity'
  | 'viewSalesReports'
  | 'viewDashboardOverview'
  | 'buildReports'
  | 'sendWhatsAppAlerts'
  | 'viewCoupons'
  | 'createCoupons'
  | 'updateCoupons'
  | 'deleteCoupons'
  | 'viewStoreSettingsPromoGrid'
  | 'createStoreSettingsPromoGrid'
  | 'updateStoreSettingsPromoGrid'
  | 'deleteStoreSettingsPromoGrid';

export type MusePermissionGroupId =
  | 'orders'
  | 'products'
  | 'inventory'
  | 'staff_activity'
  | 'reports'
  | 'alerts'
  | 'custom';

export interface MusePermissionItem {
  key: string;
  label: string;
  path: string[];
  group?: MusePermissionGroupId;
  builtIn?: boolean;
}

export interface MusePermissionGroup {
  id: MusePermissionGroupId;
  title: string;
}

export const BUILT_IN_MUSE_GROUPS: MusePermissionGroup[] = [
  { id: 'orders', title: 'Orders' },
  { id: 'products', title: 'Products' },
  { id: 'inventory', title: 'Inventory' },
  { id: 'staff_activity', title: 'Staff & Activity' },
  { id: 'reports', title: 'Reports' },
  { id: 'alerts', title: 'Alerts' },
  { id: 'custom', title: 'Custom' },
];

export const BUILT_IN_MUSE_PERMISSIONS: MusePermissionItem[] = [
  // CORE -> ড্যাশবোর্ড
  {
    key: 'viewDashboardOverview',
    label: 'View',
    path: ['CORE', 'ড্যাশবোর্ড'],
    group: 'reports',
    builtIn: true,
  },
  // CORE -> Report & Analytics
  {
    key: 'viewSalesReports',
    label: 'View Sales Reports',
    path: ['CORE', 'Report & Analytics'],
    group: 'reports',
    builtIn: true,
  },
  {
    key: 'buildReports',
    label: 'Build Reports',
    path: ['CORE', 'Report & Analytics'],
    group: 'reports',
    builtIn: true,
  },

  // SALES -> Orders
  {
    key: 'viewOrders',
    label: 'View',
    path: ['SALES', 'Orders'],
    group: 'orders',
    builtIn: true,
  },
  {
    key: 'addOrders',
    label: 'Create',
    path: ['SALES', 'Orders'],
    group: 'orders',
    builtIn: true,
  },
  {
    key: 'changeOrderStatus',
    label: 'Change Status',
    path: ['SALES', 'Orders'],
    group: 'orders',
    builtIn: true,
  },
  {
    key: 'assignOrders',
    label: 'Assign Order',
    path: ['SALES', 'Orders'],
    group: 'orders',
    builtIn: true,
  },

  // CATALOG -> Products
  {
    key: 'viewProducts',
    label: 'View',
    path: ['CATALOG', 'Products'],
    group: 'products',
    builtIn: true,
  },
  {
    key: 'manageProducts',
    label: 'Create & Edit',
    path: ['CATALOG', 'Products'],
    group: 'products',
    builtIn: true,
  },
  {
    key: 'viewProductPerformance',
    label: 'View Performance',
    path: ['CATALOG', 'Products'],
    group: 'products',
    builtIn: true,
  },

  // CATALOG -> Inventory
  {
    key: 'viewInventory',
    label: 'View',
    path: ['CATALOG', 'Inventory'],
    group: 'inventory',
    builtIn: true,
  },
  {
    key: 'updateStock',
    label: 'Edit Stock',
    path: ['CATALOG', 'Inventory'],
    group: 'inventory',
    builtIn: true,
  },

  // CATALOG -> Coupons & Promos
  {
    key: 'viewCoupons',
    label: 'View',
    path: ['CATALOG', 'Coupons & Promos'],
    group: 'products',
    builtIn: true,
  },
  {
    key: 'createCoupons',
    label: 'Create',
    path: ['CATALOG', 'Coupons & Promos'],
    group: 'products',
    builtIn: true,
  },
  {
    key: 'updateCoupons',
    label: 'Edit',
    path: ['CATALOG', 'Coupons & Promos'],
    group: 'products',
    builtIn: true,
  },
  {
    key: 'deleteCoupons',
    label: 'Delete',
    path: ['CATALOG', 'Coupons & Promos'],
    group: 'products',
    builtIn: true,
  },

  // LOGISTICS -> Courier Fraud Checker
  {
    key: 'courierCheck',
    label: 'View & Run Fraud Check',
    path: ['LOGISTICS', 'Courier Fraud Checker'],
    group: 'orders',
    builtIn: true,
  },

  // AUTOMATION -> WhatsApp Automation
  {
    key: 'sendWhatsAppAlerts',
    label: 'Send WhatsApp Alerts',
    path: ['AUTOMATION', 'WhatsApp Automation'],
    group: 'alerts',
    builtIn: true,
  },

  // SYSTEM -> Activity Logs
  {
    key: 'viewActivity',
    label: 'View',
    path: ['SYSTEM', 'Activity Logs'],
    group: 'staff_activity',
    builtIn: true,
  },

  // SYSTEM -> Store Settings -> Promo Grid
  {
    key: 'viewStoreSettingsPromoGrid',
    label: 'View',
    path: ['SYSTEM', 'Store Settings', 'Promo Grid'],
    group: 'custom',
    builtIn: true,
  },
  {
    key: 'createStoreSettingsPromoGrid',
    label: 'Create',
    path: ['SYSTEM', 'Store Settings', 'Promo Grid'],
    group: 'custom',
    builtIn: true,
  },
  {
    key: 'updateStoreSettingsPromoGrid',
    label: 'Edit',
    path: ['SYSTEM', 'Store Settings', 'Promo Grid'],
    group: 'custom',
    builtIn: true,
  },
  {
    key: 'deleteStoreSettingsPromoGrid',
    label: 'Delete',
    path: ['SYSTEM', 'Store Settings', 'Promo Grid'],
    group: 'custom',
    builtIn: true,
  },
];

const BUILT_IN_BY_KEY = new Map<string, MusePermissionItem>(
  BUILT_IN_MUSE_PERMISSIONS.map((p) => [p.key, p])
);
const BUILT_IN_KEY_SET = new Set<string>(BUILT_IN_MUSE_PERMISSIONS.map((p) => p.key));
const RESERVED_KEYS = new Set<string>([
  'updatedAt',
  'updatedBy',
  'createdAt',
  '__proto__',
  'constructor',
  'prototype',
]);

// ============================================================================
// 3. KEY AUTO-GENERATION & PATH DERIVATION CONVENTION
// ============================================================================

export type StandardActionType =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'download_receipt'
  | 'add_expense'
  | 'reset_defaults'
  | 'custom';

export const ACTION_OPTIONS: {
  id: StandardActionType;
  label: string;
  verb: string;
  suffix?: string;
}[] = [
  { id: 'view', label: 'View', verb: 'view' },
  { id: 'create', label: 'Create', verb: 'create' },
  { id: 'update', label: 'Edit', verb: 'update' },
  { id: 'delete', label: 'Delete', verb: 'delete' },
  { id: 'download_receipt', label: 'Download Receipt', verb: 'download', suffix: 'Receipt' },
  { id: 'add_expense', label: 'Add Expense', verb: 'add', suffix: 'Expense' },
  { id: 'reset_defaults', label: 'Reset Defaults', verb: 'reset', suffix: 'Defaults' },
  { id: 'custom', label: 'Custom action…', verb: 'view' },
];

/**
 * Convert any segment title or node to PascalCase with spaces and symbols removed.
 * Uses known node slugs first (e.g., "Coupons & Promos" -> "Coupons", "ড্যাশবোর্ড" -> "Dashboard").
 */
const TITLE_TO_SLUG_MAP = new Map<string, string>();
const SLUG_PATH_LOOKUP: { slugPrefix: string; path: string[] }[] = [];

function registerKnownNodes() {
  if (TITLE_TO_SLUG_MAP.size > 0) return;

  const walk = (sectionTitle: string, nodes: KnownTreeAreaNode[], parentTitles: string[], parentSlug: string) => {
    for (const node of nodes) {
      TITLE_TO_SLUG_MAP.set(node.title.toLowerCase(), node.slug);
      const currentPath = [sectionTitle, ...parentTitles, node.title];
      const allSlugs = [node.slug, ...(node.aliases || [])];
      for (const s of allSlugs) {
        const combinedSlug = parentSlug + s;
        SLUG_PATH_LOOKUP.push({ slugPrefix: combinedSlug, path: currentPath });
      }
      if (node.children && node.children.length > 0) {
        walk(sectionTitle, node.children, [...parentTitles, node.title], parentSlug + node.slug);
      }
    }
  };

  for (const sec of SIDEBAR_TREE_SCHEMA) {
    walk(sec.title, sec.tabs, [], '');
  }
  // Sort longest slugPrefix first so specific sub-paths (e.g. StoreSettingsPromoGrid) match before StoreSettings
  SLUG_PATH_LOOKUP.sort((a, b) => b.slugPrefix.length - a.slugPrefix.length);
}
registerKnownNodes();

export function toPascalCaseSegment(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const known = TITLE_TO_SLUG_MAP.get(trimmed.toLowerCase());
  if (known) return known;

  const words = trimmed
    .replace(/&/g, ' ')
    .replace(/[^a-zA-Z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return '';
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/**
 * Parse a custom action string like "Download Receipt" -> { verb: "download", suffix: "Receipt" }
 * or "Approve" -> { verb: "approve", suffix: "" }
 */
function parseActionVerbAndSuffix(
  actionId: StandardActionType,
  customActionText: string
): { verb: string; suffix: string; defaultLabel: string } {
  if (actionId !== 'custom') {
    const found = ACTION_OPTIONS.find((a) => a.id === actionId) || ACTION_OPTIONS[0];
    return {
      verb: found.verb,
      suffix: found.suffix || '',
      defaultLabel: found.label,
    };
  }

  const words = customActionText
    .trim()
    .replace(/[^a-zA-Z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return { verb: 'view', suffix: '', defaultLabel: customActionText.trim() || 'View' };
  }

  const verb = words[0].toLowerCase();
  const suffix = words
    .slice(1)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return {
    verb,
    suffix,
    defaultLabel: customActionText.trim(),
  };
}

/**
 * Generate permission key by exact convention:
 * key = <action><Path> where <Path> is every path level from Level 2 down in PascalCase concatenated.
 */
export function generatePermissionKeyFromPath(
  pathLevelsFromLevel2: string[],
  actionId: StandardActionType,
  customActionText = ''
): string {
  const pascalPath = pathLevelsFromLevel2
    .map((seg) => toPascalCaseSegment(seg))
    .filter(Boolean)
    .join('');
  if (!pascalPath) return '';

  const { verb, suffix } = parseActionVerbAndSuffix(actionId, customActionText);
  if (!verb) return '';
  return `${verb}${pascalPath}${suffix}`;
}

const KNOWN_ACTION_VERBS: { verb: string; label: string }[] = [
  { verb: 'view', label: 'View' },
  { verb: 'create', label: 'Create' },
  { verb: 'update', label: 'Edit' },
  { verb: 'edit', label: 'Edit' },
  { verb: 'delete', label: 'Delete' },
  { verb: 'manage', label: 'Manage' },
  { verb: 'change', label: 'Change' },
  { verb: 'assign', label: 'Assign' },
  { verb: 'add', label: 'Add' },
  { verb: 'build', label: 'Build' },
  { verb: 'send', label: 'Send' },
  { verb: 'download', label: 'Download' },
  { verb: 'reset', label: 'Reset' },
  { verb: 'export', label: 'Export' },
  { verb: 'approve', label: 'Approve' },
  { verb: 'verify', label: 'Verify' },
];

function splitPascalWords(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
}

/**
 * Derive folder path and short action label from any permission key using the convention.
 * Keys that match no known dashboard area go into the final `['Custom']` folder.
 */
export function derivePathAndLabelFromKey(key: string): { path: string[]; label: string } {
  const builtIn = BUILT_IN_BY_KEY.get(key);
  if (builtIn) {
    return { path: builtIn.path, label: builtIn.label };
  }

  let matchedVerb: { verb: string; label: string } | null = null;
  let remainder = '';

  for (const v of KNOWN_ACTION_VERBS) {
    if (
      key.startsWith(v.verb) &&
      key.length > v.verb.length &&
      /[A-Z]/.test(key.charAt(v.verb.length))
    ) {
      matchedVerb = v;
      remainder = key.slice(v.verb.length);
      break;
    }
  }

  if (!matchedVerb || !remainder) {
    return { path: ['Custom'], label: key };
  }

  for (const entry of SLUG_PATH_LOOKUP) {
    if (remainder === entry.slugPrefix) {
      return {
        path: entry.path,
        label: matchedVerb.label,
      };
    }
    if (
      remainder.startsWith(entry.slugPrefix) &&
      /[A-Z0-9]/.test(remainder.charAt(entry.slugPrefix.length))
    ) {
      const tail = remainder.slice(entry.slugPrefix.length);
      // Handle special action suffixes like Defaults, Receipt, Expense
      if (matchedVerb.verb === 'reset' && tail === 'Defaults') {
        return { path: entry.path, label: 'Reset Defaults' };
      }
      if (matchedVerb.verb === 'download' && tail === 'Receipt') {
        return { path: entry.path, label: 'Download Receipt' };
      }
      if (matchedVerb.verb === 'add' && tail === 'Expense') {
        return { path: entry.path, label: 'Add Expense' };
      }
      // Otherwise treat the tail as a deeper subfolder level (e.g. Level 4 card/item)
      const tailFolderTitle = splitPascalWords(tail) || tail;
      return {
        path: [...entry.path, tailFolderTitle],
        label: matchedVerb.label,
      };
    }
  }

  return {
    path: ['Custom'],
    label: `${matchedVerb.label} ${splitPascalWords(remainder)}`.trim(),
  };
}

// ============================================================================
// 4. RECURSIVE FOLDER TREE BUILDER (Supports Any Depth: Level 1 -> Level 4+)
// ============================================================================

export interface FolderTreeNode {
  name: string;
  pathKey: string;
  path: string[];
  depth: number;
  children: FolderTreeNode[];
  permissions: MusePermissionItem[];
  totalPermissionCount: number;
}

function buildFolderTree(items: MusePermissionItem[]): FolderTreeNode[] {
  const rootMap = new Map<string, FolderTreeNode>();

  const ensureNode = (
    map: Map<string, FolderTreeNode>,
    segmentName: string,
    pathSoFar: string[],
    depth: number
  ): FolderTreeNode => {
    const pathKey = pathSoFar.join(' / ');
    let node = map.get(segmentName);
    if (!node) {
      node = {
        name: segmentName,
        pathKey,
        path: pathSoFar,
        depth,
        children: [],
        permissions: [],
        totalPermissionCount: 0,
      };
      map.set(segmentName, node);
    }
    return node;
  };

  // Use per-node child lookup map while constructing
  const childMaps = new WeakMap<FolderTreeNode, Map<string, FolderTreeNode>>();

  for (const item of items) {
    const cleanPath =
      Array.isArray(item.path) && item.path.filter(Boolean).length > 0
        ? item.path.map((s) => s.trim()).filter(Boolean)
        : ['Custom'];

    let currentNode: FolderTreeNode | null = null;
    for (let i = 0; i < cleanPath.length; i++) {
      const seg = cleanPath[i];
      const pathSoFar = cleanPath.slice(0, i + 1);
      if (i === 0) {
        currentNode = ensureNode(rootMap, seg, pathSoFar, 1);
      } else if (currentNode) {
        let cMap = childMaps.get(currentNode);
        if (!cMap) {
          cMap = new Map<string, FolderTreeNode>();
          childMaps.set(currentNode, cMap);
        }
        const child = ensureNode(cMap, seg, pathSoFar, i + 1);
        if (!currentNode.children.includes(child)) {
          currentNode.children.push(child);
        }
        currentNode = child;
      }
    }

    if (currentNode) {
      currentNode.permissions.push(item);
    }
  }

  const computeTotals = (node: FolderTreeNode): number => {
    let total = node.permissions.length;
    for (const child of node.children) {
      total += computeTotals(child);
    }
    node.totalPermissionCount = total;
    return total;
  };

  const sectionOrderIndex = (name: string): number => {
    const idx = SECTION_ORDER.indexOf(name);
    return idx === -1 ? SECTION_ORDER.length - 1 : idx;
  };

  const roots = Array.from(rootMap.values())
    .map((r) => {
      computeTotals(r);
      return r;
    })
    .filter((r) => r.totalPermissionCount > 0)
    .sort((a, b) => sectionOrderIndex(a.name) - sectionOrderIndex(b.name));

  return roots;
}

function buildDefaultPermissionValues(): Record<string, boolean> {
  const defaults: Record<string, boolean> = {};
  for (const item of BUILT_IN_MUSE_PERMISSIONS) {
    defaults[item.key] = true;
  }
  return defaults;
}

function formatFirestoreError(err: unknown): string {
  if (!err) return 'Unknown Firestore error';
  const anyErr = err as { code?: string; message?: string };
  const code = typeof anyErr.code === 'string' ? anyErr.code : '';
  const message =
    typeof anyErr.message === 'string' && anyErr.message.trim()
      ? anyErr.message.trim()
      : String(err);
  if (code && !message.toLowerCase().includes(code.toLowerCase())) {
    return `${code}: ${message}`;
  }
  return message;
}

function logStructuredFirestoreError(
  err: unknown,
  operationType: OperationType,
  path: string
) {
  const errInfo = {
    error: err instanceof Error ? err.message : String(err),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

// ============================================================================
// 5. MAIN COMPONENT
// ============================================================================

interface AdminMusePermissionsProps {
  currentUserRole?: UserRole;
  currentStaff?: StaffUser | null;
  onRecordAuditLog?: (
    action: string,
    module: string,
    targetId: string,
    details: string,
    meta?: { fromStatus?: string; toStatus?: string; staffEmail?: string }
  ) => void;
}

type RowFeedback = 'idle' | 'saving' | 'saved' | 'error';

interface CustomMetaMapEntry {
  label: string;
  path: string[];
}

const NEW_OPTION_SENTINEL = '__NEW_CUSTOM_LEVEL__';

export const AdminMusePermissions: React.FC<AdminMusePermissionsProps> = ({
  currentUserRole,
  currentStaff,
  onRecordAuditLog,
}) => {
  const isStrictSuperAdmin = currentUserRole === 'super_admin';

  // Track real Firebase Auth session
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState<boolean>(false);

  // Real Firestore state:
  // 1) settings/musePermissions (pure booleans for Cloudflare Worker v3)
  // 2) settings/musePermissionMeta (map: { "<key>": { label, path } }) + legacy settings/musePermissionsMeta fallback
  const [values, setValues] = useState<Record<string, boolean> | null>(null);
  const [customMetaMap, setCustomMetaMap] = useState<Record<string, CustomMetaMapEntry>>({});
  const [legacyCustomMetaMap, setLegacyCustomMetaMap] = useState<Record<string, CustomMetaMapEntry>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Collapsible folder state: ALL closed by default, except path to a just-added permission
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  // Per-row live feedback & delete confirmation
  const [rowFeedback, setRowFeedback] = useState<Record<string, RowFeedback>>({});
  const [rowErrorMessage, setRowErrorMessage] = useState<Record<string, string>>({});
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // Toast status
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Permission form state (Path Picker + Action + Auto-Generated Key)
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [selectedSection, setSelectedSection] = useState<string>('SALES');
  const [selectedTab, setSelectedTab] = useState<string>('Orders');
  const [customTabInput, setCustomTabInput] = useState<string>('');
  const [selectedSubgroup, setSelectedSubgroup] = useState<string>('');
  const [customSubgroupInput, setCustomSubgroupInput] = useState<string>('');
  const [forceShowSubgroup, setForceShowSubgroup] = useState<boolean>(false);
  const [selectedSubSubgroup, setSelectedSubSubgroup] = useState<string>('');
  const [customSubSubgroupInput, setCustomSubSubgroupInput] = useState<string>('');
  const [forceShowSubSubgroup, setForceShowSubSubgroup] = useState<boolean>(false);
  const [extraLevels, setExtraLevels] = useState<string[]>([]);

  const [selectedAction, setSelectedAction] = useState<StandardActionType>('view');
  const [customActionInput, setCustomActionInput] = useState<string>('');
  const [newLabel, setNewLabel] = useState<string>('View');
  const [labelManuallyEdited, setLabelManuallyEdited] = useState<boolean>(false);
  const [newKey, setNewKey] = useState<string>('viewOrders');
  const [isKeyEditable, setIsKeyEditable] = useState<boolean>(false);
  const [keyManuallyEdited, setKeyManuallyEdited] = useState<boolean>(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const timersRef = useRef<Record<string, number>>({});
  const bootstrapAttemptedRef = useRef<boolean>(false);

  const clearTimer = (id: string) => {
    if (timersRef.current[id]) {
      window.clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  };

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current = {};
    };
  }, []);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    clearTimer('__toast__');
    setToast({ type, message });
    timersRef.current['__toast__'] = window.setTimeout(
      () => setToast(null),
      type === 'error' ? 6000 : 2400
    );
  }, []);

  // 1. Observe Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const actorLabel =
    firebaseUser?.email || currentStaff?.email || currentStaff?.name || 'Super Admin';

  // 2. Real-time onSnapshot subscriptions to settings/musePermissions & settings/musePermissionMeta
  useEffect(() => {
    if (!isStrictSuperAdmin || !authReady) return;

    bootstrapAttemptedRef.current = false;

    if (!firebaseUser) {
      setValues((prev) => prev ?? buildDefaultPermissionValues());
      setLoading(false);
      setFirestoreError(
        'ফায়ারবেস সুপার অ্যাডমিন সেশন সক্রিয় নেই। লাইভ পারমিশন দেখতে ও সেভ করতে Google দিয়ে সাইন-ইন করুন।'
      );
      return;
    }

    setLoading(true);
    setFirestoreError(null);

    const permRef = doc(db, 'settings', 'musePermissions');
    const metaRef = doc(db, 'settings', 'musePermissionMeta');
    const legacyMetaRef = doc(db, 'settings', 'musePermissionsMeta');

    let valuesResolved = false;

    const unsubValues = onSnapshot(
      permRef,
      (snap) => {
        valuesResolved = true;
        setFirestoreError(null);

        if (!snap.exists()) {
          const initialDefaults = buildDefaultPermissionValues();
          setValues(initialDefaults);
          setLoading(false);

          if (!bootstrapAttemptedRef.current) {
            bootstrapAttemptedRef.current = true;
            setDoc(
              permRef,
              {
                ...initialDefaults,
                updatedAt: serverTimestamp(),
                updatedBy: actorLabel,
              },
              { merge: true }
            ).catch((err) => {
              logStructuredFirestoreError(err, OperationType.WRITE, 'settings/musePermissions');
              setFirestoreError(formatFirestoreError(err));
            });
          }
          return;
        }

        const data = snap.data() || {};
        const mergedValues: Record<string, boolean> = {};
        const missingBuiltIns: Record<string, boolean> = {};

        for (const item of BUILT_IN_MUSE_PERMISSIONS) {
          if (typeof data[item.key] === 'boolean') {
            mergedValues[item.key] = data[item.key];
          } else {
            mergedValues[item.key] = true;
            missingBuiltIns[item.key] = true;
          }
        }

        for (const [k, v] of Object.entries(data)) {
          if (!RESERVED_KEYS.has(k) && typeof v === 'boolean' && !(k in mergedValues)) {
            mergedValues[k] = v;
          }
        }

        setValues(mergedValues);
        setLoading(false);

        // Backfill any missing built-in keys without touching existing saved ON/OFF values
        if (Object.keys(missingBuiltIns).length > 0 && !bootstrapAttemptedRef.current) {
          bootstrapAttemptedRef.current = true;
          setDoc(
            permRef,
            {
              ...missingBuiltIns,
              updatedAt: serverTimestamp(),
              updatedBy: actorLabel,
            },
            { merge: true }
          ).catch((err) => {
            logStructuredFirestoreError(err, OperationType.WRITE, 'settings/musePermissions');
            setFirestoreError(formatFirestoreError(err));
          });
        }
      },
      (err) => {
        logStructuredFirestoreError(err, OperationType.GET, 'settings/musePermissions');
        const realMessage = formatFirestoreError(err);
        setFirestoreError(realMessage);
        if (!valuesResolved) {
          setValues((prev) => prev ?? buildDefaultPermissionValues());
        }
        setLoading(false);
      }
    );

    const unsubMeta = onSnapshot(
      metaRef,
      (snap) => {
        if (!snap.exists()) {
          setCustomMetaMap({});
          return;
        }
        const data = snap.data() || {};
        const nextMap: Record<string, CustomMetaMapEntry> = {};

        for (const [k, rawVal] of Object.entries(data)) {
          if (RESERVED_KEYS.has(k) || BUILT_IN_KEY_SET.has(k)) continue;
          if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal)) {
            const label = String((rawVal as any).label || '').trim();
            const rawPath = Array.isArray((rawVal as any).path)
              ? (rawVal as any).path.map((p: unknown) => String(p || '').trim()).filter(Boolean)
              : [];
            if (label) {
              nextMap[k] = {
                label,
                path: rawPath.length > 0 ? rawPath : derivePathAndLabelFromKey(k).path,
              };
            }
          }
        }
        setCustomMetaMap(nextMap);
      },
      (err) => {
        logStructuredFirestoreError(err, OperationType.GET, 'settings/musePermissionMeta');
      }
    );

    // Also read legacy settings/musePermissionsMeta if any custom permissions were stored there previously
    const unsubLegacyMeta = onSnapshot(
      legacyMetaRef,
      (snap) => {
        if (!snap.exists()) {
          setLegacyCustomMetaMap({});
          return;
        }
        const data = snap.data() || {};
        const rawList = Array.isArray(data.permissions) ? data.permissions : [];
        const nextLegacy: Record<string, CustomMetaMapEntry> = {};
        for (const entry of rawList) {
          if (!entry || typeof entry !== 'object') continue;
          const k = String((entry as any).key || '').trim();
          const l = String((entry as any).label || '').trim();
          if (!k || !l || RESERVED_KEYS.has(k) || BUILT_IN_KEY_SET.has(k)) continue;
          const derived = derivePathAndLabelFromKey(k);
          nextLegacy[k] = {
            label: l,
            path: Array.isArray((entry as any).path) && (entry as any).path.length > 0
              ? (entry as any).path
              : derived.path,
          };
        }
        setLegacyCustomMetaMap(nextLegacy);
      },
      () => {}
    );

    return () => {
      unsubValues();
      unsubMeta();
      unsubLegacyMeta();
    };
  }, [isStrictSuperAdmin, authReady, firebaseUser, actorLabel]);

  // 3. Combine all 23 built-in permissions + custom permissions mapped to their dashboard folder path
  const allPermissions: MusePermissionItem[] = useMemo(() => {
    const list: MusePermissionItem[] = [...BUILT_IN_MUSE_PERMISSIONS];
    const knownKeys = new Set<string>(BUILT_IN_KEY_SET);

    const combinedMeta: Record<string, CustomMetaMapEntry> = {
      ...legacyCustomMetaMap,
      ...customMetaMap,
    };

    // Add custom permissions from settings/musePermissionMeta
    for (const [key, meta] of Object.entries(combinedMeta)) {
      if (knownKeys.has(key) || RESERVED_KEYS.has(key)) continue;
      knownKeys.add(key);
      list.push({
        key,
        label: meta.label || derivePathAndLabelFromKey(key).label,
        path: meta.path && meta.path.length > 0 ? meta.path : derivePathAndLabelFromKey(key).path,
        builtIn: false,
      });
    }

    // Add any boolean keys in settings/musePermissions that have no meta entry yet (derived by convention)
    if (values) {
      for (const key of Object.keys(values)) {
        if (!knownKeys.has(key) && !RESERVED_KEYS.has(key)) {
          knownKeys.add(key);
          const derived = derivePathAndLabelFromKey(key);
          list.push({
            key,
            label: derived.label,
            path: derived.path,
            builtIn: false,
          });
        }
      }
    }

    return list;
  }, [customMetaMap, legacyCustomMetaMap, values]);

  // Build recursive collapsible folder tree
  const folderTree = useMemo(() => buildFolderTree(allPermissions), [allPermissions]);

  // ============================================================================
  // 4. CONDITIONAL PATH PICKER & AUTO-GENERATED KEY LOGIC
  // ============================================================================

  const currentSectionSchema = useMemo(
    () => SIDEBAR_TREE_SCHEMA.find((s) => s.title === selectedSection) || null,
    [selectedSection]
  );

  const knownTabsForSection = useMemo(
    () => currentSectionSchema?.tabs || [],
    [currentSectionSchema]
  );

  const effectiveTabTitle = useMemo(() => {
    if (selectedSection === 'Custom') return customTabInput.trim();
    if (selectedTab === NEW_OPTION_SENTINEL) return customTabInput.trim();
    return selectedTab.trim();
  }, [selectedSection, selectedTab, customTabInput]);

  const currentTabSchema = useMemo(
    () => knownTabsForSection.find((t) => t.title === selectedTab) || null,
    [knownTabsForSection, selectedTab]
  );

  const knownSubgroupsForTab = useMemo(
    () => currentTabSchema?.children || [],
    [currentTabSchema]
  );

  // Rule 7a: Subgroup field is shown ONLY when the chosen tab has children OR user tapped "+ Add another level"
  const showSubgroupField =
    Boolean(effectiveTabTitle) &&
    (knownSubgroupsForTab.length > 0 || forceShowSubgroup);

  const effectiveSubgroupTitle = useMemo(() => {
    if (!showSubgroupField) return '';
    if (knownSubgroupsForTab.length === 0 || selectedSubgroup === NEW_OPTION_SENTINEL) {
      return customSubgroupInput.trim();
    }
    return selectedSubgroup.trim();
  }, [showSubgroupField, knownSubgroupsForTab, selectedSubgroup, customSubgroupInput]);

  const currentSubgroupSchema = useMemo(
    () => knownSubgroupsForTab.find((sg) => sg.title === selectedSubgroup) || null,
    [knownSubgroupsForTab, selectedSubgroup]
  );

  const knownSubSubgroups = useMemo(
    () => currentSubgroupSchema?.children || [],
    [currentSubgroupSchema]
  );

  // Rule 7a: Sub-subgroup field is shown ONLY when the chosen subgroup has children OR user tapped "+ Add another level"
  const showSubSubgroupField =
    showSubgroupField &&
    Boolean(effectiveSubgroupTitle) &&
    (knownSubSubgroups.length > 0 || forceShowSubSubgroup);

  const effectiveSubSubgroupTitle = useMemo(() => {
    if (!showSubSubgroupField) return '';
    if (knownSubSubgroups.length === 0 || selectedSubSubgroup === NEW_OPTION_SENTINEL) {
      return customSubSubgroupInput.trim();
    }
    return selectedSubSubgroup.trim();
  }, [showSubSubgroupField, knownSubSubgroups, selectedSubSubgroup, customSubSubgroupInput]);

  // Active path levels from Level 2 downward (used for key generation)
  const activeLevelsFromLevel2 = useMemo(() => {
    const levels: string[] = [];
    if (effectiveTabTitle) levels.push(effectiveTabTitle);
    if (showSubgroupField && effectiveSubgroupTitle) levels.push(effectiveSubgroupTitle);
    if (showSubSubgroupField && effectiveSubSubgroupTitle) levels.push(effectiveSubSubgroupTitle);
    for (const extra of extraLevels) {
      if (extra.trim()) levels.push(extra.trim());
    }
    return levels;
  }, [
    effectiveTabTitle,
    showSubgroupField,
    effectiveSubgroupTitle,
    showSubSubgroupField,
    effectiveSubSubgroupTitle,
    extraLevels,
  ]);

  // Full folder path [Level 1, Level 2, ...] saved in settings/musePermissionMeta
  const activeFullPath = useMemo(() => {
    return [selectedSection, ...activeLevelsFromLevel2].filter(Boolean);
  }, [selectedSection, activeLevelsFromLevel2]);

  // Keep auto-generated key and default action label in sync with path + action
  useEffect(() => {
    if (!keyManuallyEdited) {
      const generated = generatePermissionKeyFromPath(
        activeLevelsFromLevel2,
        selectedAction,
        customActionInput
      );
      setNewKey(generated);
    }
    if (!labelManuallyEdited) {
      const { defaultLabel } = parseActionVerbAndSuffix(selectedAction, customActionInput);
      setNewLabel(defaultLabel);
    }
  }, [
    activeLevelsFromLevel2,
    selectedAction,
    customActionInput,
    keyManuallyEdited,
    labelManuallyEdited,
  ]);

  // Handle Section change -> reset Tab, Subgroup, Sub-subgroup cleanly
  const handleSectionChange = (nextSection: string) => {
    setSelectedSection(nextSection);
    const sec = SIDEBAR_TREE_SCHEMA.find((s) => s.title === nextSection);
    const firstTab = sec?.tabs?.[0];
    setSelectedTab(firstTab ? firstTab.title : NEW_OPTION_SENTINEL);
    setCustomTabInput('');
    const firstSub = firstTab?.children?.[0];
    setSelectedSubgroup(firstSub ? firstSub.title : '');
    setCustomSubgroupInput('');
    setForceShowSubgroup(false);
    const firstSubSub = firstSub?.children?.[0];
    setSelectedSubSubgroup(firstSubSub ? firstSubSub.title : '');
    setCustomSubSubgroupInput('');
    setForceShowSubSubgroup(false);
    setExtraLevels([]);
    setAddFormError(null);
  };

  // Handle Tab change -> auto-select first subgroup if the tab has known subgroups, otherwise hide Subgroup
  const handleTabChange = (nextTab: string) => {
    setSelectedTab(nextTab);
    setCustomTabInput('');
    const tabObj = knownTabsForSection.find((t) => t.title === nextTab);
    const firstSub = tabObj?.children?.[0];
    setSelectedSubgroup(firstSub ? firstSub.title : '');
    setCustomSubgroupInput('');
    setForceShowSubgroup(false);
    const firstSubSub = firstSub?.children?.[0];
    setSelectedSubSubgroup(firstSubSub ? firstSubSub.title : '');
    setCustomSubSubgroupInput('');
    setForceShowSubSubgroup(false);
    setExtraLevels([]);
    setAddFormError(null);
  };

  // Handle Subgroup change -> auto-select first sub-subgroup if the subgroup has known children
  const handleSubgroupChange = (nextSubgroup: string) => {
    setSelectedSubgroup(nextSubgroup);
    setCustomSubgroupInput('');
    const subObj = knownSubgroupsForTab.find((sg) => sg.title === nextSubgroup);
    const firstSubSub = subObj?.children?.[0];
    setSelectedSubSubgroup(firstSubSub ? firstSubSub.title : '');
    setCustomSubSubgroupInput('');
    setForceShowSubSubgroup(false);
    setExtraLevels([]);
    setAddFormError(null);
  };

  if (!isStrictSuperAdmin) {
    return null;
  }

  const toggleFolder = (pathKey: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [pathKey]: !prev[pathKey],
    }));
  };

  const openPathAndAncestors = (pathSegments: string[]) => {
    const updates: Record<string, boolean> = {};
    for (let i = 0; i < pathSegments.length; i++) {
      const key = pathSegments.slice(0, i + 1).join(' / ');
      updates[key] = true;
    }
    setOpenFolders((prev) => ({ ...prev, ...updates }));
  };

  const writeAudit = (
    action: string,
    targetId: string,
    details: string,
    fromStatus?: string,
    toStatus?: string
  ) => {
    if (onRecordAuditLog) {
      onRecordAuditLog(action, 'settings', targetId, details, {
        fromStatus,
        toStatus,
        staffEmail: firebaseUser?.email || currentStaff?.email,
      });
    } else {
      const logEntry: ActivityLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        staffId: currentStaff?.id || 'staff-root',
        staffName: currentStaff?.name || 'Super Admin',
        staffEmail: firebaseUser?.email || currentStaff?.email || undefined,
        staffRole: 'super_admin',
        action,
        module: 'settings',
        targetId,
        fromStatus,
        toStatus,
        source: 'admin',
        details,
        timestamp: new Date().toISOString(),
      };
      logActivityToDB(logEntry).catch(() => {});
    }
  };

  const handleGoogleSuperAdminConnect = async () => {
    setIsConnectingGoogle(true);
    setFirestoreError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      showToast('success', 'Connected');
    } catch (err) {
      const msg = formatFirestoreError(err);
      setFirestoreError(msg);
      showToast('error', msg);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleToggle = async (row: MusePermissionItem) => {
    if (!values) return;
    if (rowFeedback[row.key] === 'saving') return;

    const previousValue = Boolean(values[row.key]);
    const nextValue = !previousValue;

    clearTimer(row.key);
    setValues((prev) => (prev ? { ...prev, [row.key]: nextValue } : prev));
    setRowFeedback((prev) => ({ ...prev, [row.key]: 'saving' }));
    setRowErrorMessage((prev) => {
      const next = { ...prev };
      delete next[row.key];
      return next;
    });

    try {
      const permRef = doc(db, 'settings', 'musePermissions');
      await setDoc(
        permRef,
        {
          [row.key]: nextValue,
          updatedAt: serverTimestamp(),
          updatedBy: actorLabel,
        },
        { merge: true }
      );

      setFirestoreError(null);
      setRowFeedback((prev) => ({ ...prev, [row.key]: 'saved' }));
      showToast('success', 'Saved');

      timersRef.current[row.key] = window.setTimeout(() => {
        setRowFeedback((prev) => ({ ...prev, [row.key]: 'idle' }));
      }, 2200);

      const fromText = previousValue ? 'ON' : 'OFF';
      const toText = nextValue ? 'ON' : 'OFF';
      writeAudit(
        'Muse Permission Updated',
        `musePermissions.${row.key}`,
        `${actorLabel} changed Muse permission "${row.label}" (${row.key}): ${fromText} → ${toText}`,
        fromText,
        toText
      );
    } catch (err) {
      logStructuredFirestoreError(err, OperationType.WRITE, 'settings/musePermissions');
      const realError = formatFirestoreError(err);
      const bengaliErr = `সেভ হয়নি, আবার চেষ্টা করুন (${realError})`;
      setValues((prev) => (prev ? { ...prev, [row.key]: previousValue } : prev));
      setRowFeedback((prev) => ({ ...prev, [row.key]: 'error' }));
      setRowErrorMessage((prev) => ({ ...prev, [row.key]: bengaliErr }));
      setFirestoreError(bengaliErr);
      showToast('error', bengaliErr);

      timersRef.current[row.key] = window.setTimeout(() => {
        setRowFeedback((prev) => ({ ...prev, [row.key]: 'idle' }));
      }, 6000);
    }
  };

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);

    const trimmedLabel = newLabel.trim();
    const trimmedKey = newKey.trim();

    if (!trimmedLabel) {
      setAddFormError('অনুগ্রহ করে পারমিশনের একটি নাম (Label) লিখুন।');
      return;
    }
    if (trimmedLabel.length > 140) {
      setAddFormError('পারমিশনের নাম ১৪০ অক্ষরের মধ্যে হতে হবে।');
      return;
    }
    if (activeLevelsFromLevel2.length === 0) {
      setAddFormError('অনুগ্রহ করে একটি ড্যাশবোর্ড ট্যাব (Tab) নির্বাচন বা টাইপ করুন।');
      return;
    }
    if (!/^[a-z]+([A-Z][a-zA-Z0-9]*)+$/.test(trimmedKey)) {
      setAddFormError(
        'Key অবশ্যই camelCase কনভেনশনে হতে হবে (যেমন: viewOrders বা viewStoreSettingsPromoGridCard1)।'
      );
      return;
    }
    if (RESERVED_KEYS.has(trimmedKey)) {
      setAddFormError(`"${trimmedKey}" একটি সংরক্ষিত (reserved) কি।`);
      return;
    }
    if (
      allPermissions.some((p) => p.key === trimmedKey) ||
      (values && Object.prototype.hasOwnProperty.call(values, trimmedKey))
    ) {
      setAddFormError(`"${trimmedKey}" পারমিশন কি ইতিমধ্যে বিদ্যমান রয়েছে। একই কি দুইবার যোগ করা যাবে না।`);
      return;
    }

    setIsAdding(true);
    try {
      const targetPath = activeFullPath.length > 0 ? activeFullPath : ['Custom'];

      const batch = writeBatch(db);
      // 1. Save pure boolean in settings/musePermissions for the Cloudflare Worker
      batch.set(
        doc(db, 'settings', 'musePermissions'),
        {
          [trimmedKey]: true,
          updatedAt: serverTimestamp(),
          updatedBy: actorLabel,
        },
        { merge: true }
      );

      // 2. Save display metadata (label + path) in separate document settings/musePermissionMeta
      batch.set(
        doc(db, 'settings', 'musePermissionMeta'),
        {
          [trimmedKey]: {
            label: trimmedLabel,
            path: targetPath,
          },
          updatedAt: serverTimestamp(),
          updatedBy: actorLabel,
        },
        { merge: true }
      );

      await batch.commit();

      // Open ONLY the folder path containing the just-added permission
      openPathAndAncestors(targetPath);

      setFirestoreError(null);
      setLabelManuallyEdited(false);
      setKeyManuallyEdited(false);
      setIsKeyEditable(false);
      setShowAddForm(false);
      showToast('success', 'Saved');

      writeAudit(
        'Muse Custom Permission Added',
        `musePermissions.${trimmedKey}`,
        `${actorLabel} added custom Muse permission "${trimmedLabel}" (${trimmedKey}) at ${targetPath.join(' → ')}`,
        'NONE',
        'ON'
      );
    } catch (err) {
      logStructuredFirestoreError(err, OperationType.WRITE, 'settings/musePermissionMeta');
      const realError = formatFirestoreError(err);
      setAddFormError(`সেভ করা যায়নি: ${realError}`);
      setFirestoreError(realError);
      showToast('error', realError);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCustomPermission = async (row: MusePermissionItem) => {
    if (row.builtIn || BUILT_IN_KEY_SET.has(row.key)) return;
    setDeletingKey(row.key);

    try {
      const batch = writeBatch(db);
      // Remove boolean field from settings/musePermissions
      batch.set(
        doc(db, 'settings', 'musePermissions'),
        {
          [row.key]: deleteField(),
          updatedAt: serverTimestamp(),
          updatedBy: actorLabel,
        },
        { merge: true }
      );
      // Remove meta entry from settings/musePermissionMeta
      batch.set(
        doc(db, 'settings', 'musePermissionMeta'),
        {
          [row.key]: deleteField(),
          updatedAt: serverTimestamp(),
          updatedBy: actorLabel,
        },
        { merge: true }
      );
      await batch.commit();

      setConfirmDeleteKey(null);
      setFirestoreError(null);
      showToast('success', 'Saved');

      writeAudit(
        'Muse Custom Permission Deleted',
        `musePermissions.${row.key}`,
        `${actorLabel} deleted custom Muse permission "${row.label}" (${row.key})`,
        values?.[row.key] ? 'ON' : 'OFF',
        'DELETED'
      );
    } catch (err) {
      logStructuredFirestoreError(err, OperationType.WRITE, 'settings/musePermissions');
      const realError = formatFirestoreError(err);
      setFirestoreError(realError);
      showToast('error', realError);
    } finally {
      setDeletingKey(null);
    }
  };

  // Render a single permission action row (ONLY label and switch, plus delete icon for custom items)
  const renderPermissionRow = (row: MusePermissionItem) => {
    const isOn = Boolean(values?.[row.key]);
    const status = rowFeedback[row.key] || 'idle';
    const isBusy = status === 'saving' || deletingKey === row.key;
    const isCustom = !row.builtIn && !BUILT_IN_KEY_SET.has(row.key);
    const isConfirmingDelete = confirmDeleteKey === row.key;
    const rowErr = rowErrorMessage[row.key];

    return (
      <div key={row.key} className="min-h-[48px] py-2.5 px-3.5 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor={`muse-switch-${row.key}`}
            className="text-sm font-medium text-stone-800 dark:text-stone-100 leading-snug cursor-pointer select-none min-w-0 flex-1"
          >
            {row.label}
          </label>

          <div className="flex items-center gap-2.5 shrink-0">
            {status === 'saving' && (
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
                Saving…
              </span>
            )}
            {status === 'saved' && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Saved
              </span>
            )}

            {isCustom && !isConfirmingDelete && (
              <button
                type="button"
                onClick={() => setConfirmDeleteKey(row.key)}
                disabled={isBusy}
                aria-label={`Delete ${row.label}`}
                className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              id={`muse-switch-${row.key}`}
              type="button"
              role="switch"
              aria-checked={isOn}
              aria-busy={isBusy}
              aria-label={row.label}
              disabled={isBusy}
              onClick={() => handleToggle(row)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900 ${
                isOn
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-stone-200 hover:bg-stone-300 dark:bg-stone-700 dark:hover:bg-stone-600'
              } ${isBusy ? 'opacity-65 cursor-wait' : 'cursor-pointer'}`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
                  isOn ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {status === 'error' && rowErr && (
          <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 break-words">
            {rowErr}
          </p>
        )}

        {isCustom && isConfirmingDelete && (
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDeleteKey(null)}
              disabled={deletingKey === row.key}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleDeleteCustomPermission(row)}
              disabled={deletingKey === row.key}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-60"
            >
              {deletingKey === row.key ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Recursive collapsible folder renderer (works identically at Level 1, 2, 3, 4, and deeper)
  const renderFolderNode = (node: FolderTreeNode): React.ReactNode => {
    const isOpen = Boolean(openFolders[node.pathKey]);
    const isTopLevel = node.depth === 1;

    return (
      <div
        key={node.pathKey}
        className={
          isTopLevel
            ? 'w-full rounded-3xl bg-white dark:bg-stone-900 border border-amber-950/[0.07] dark:border-stone-800 shadow-[0_8px_28px_-14px_rgba(120,76,24,0.12)] overflow-hidden'
            : 'rounded-2xl bg-[#FAF6F0]/75 dark:bg-stone-950/60 border border-amber-950/[0.07] dark:border-stone-800/90 overflow-hidden'
        }
      >
        <button
          type="button"
          onClick={() => toggleFolder(node.pathKey)}
          aria-expanded={isOpen}
          className={`w-full min-h-[48px] px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
            isTopLevel
              ? 'hover:bg-amber-50/40 dark:hover:bg-stone-800/50'
              : 'hover:bg-amber-100/30 dark:hover:bg-stone-800/40'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0" />
            )}
            {isOpen ? (
              <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-amber-600/80 dark:text-amber-500/80 shrink-0" />
            )}
            <span
              className={`${
                isTopLevel
                  ? 'text-sm sm:text-[15px] font-bold text-stone-900 dark:text-stone-100'
                  : 'text-sm font-semibold text-stone-800 dark:text-stone-200'
              } truncate`}
            >
              {node.name}
            </span>
          </div>

          <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-2 rounded-full text-xs font-semibold bg-amber-500/12 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 shrink-0">
            {node.totalPermissionCount}
          </span>
        </button>

        {isOpen && (
          <div className="px-3.5 sm:px-4 pb-3.5 pt-1 space-y-2.5 border-t border-amber-950/[0.05] dark:border-stone-800/70">
            {node.children.length > 0 && (
              <div className="space-y-2 pt-1">
                {node.children.map((child) => renderFolderNode(child))}
              </div>
            )}

            {node.permissions.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-stone-900 border border-amber-950/[0.06] dark:border-stone-800 divide-y divide-amber-950/[0.06] dark:divide-stone-800">
                {node.permissions.map((perm) => renderPermissionRow(perm))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Balance top-level section folders across 2 columns on desktop
  const leftColumnNodes = folderTree.filter((_, idx) => idx % 2 === 0);
  const rightColumnNodes = folderTree.filter((_, idx) => idx % 2 === 1);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="rounded-3xl bg-[#FAF6F0] dark:bg-stone-950/90 border border-amber-950/[0.06] dark:border-stone-800/80 p-4 sm:p-6 lg:p-8">
        {/* Top Row: Title + Toast + Add Permission Action (NO SUBTITLES ANYWHERE) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
            Muse Permissions
          </h1>

          <div className="flex items-center gap-2.5">
            {toast && (
              <div
                role="status"
                aria-live="polite"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold shadow-sm ${
                  toast.type === 'error'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-white text-emerald-700 border border-emerald-200/80 dark:bg-stone-900 dark:text-emerald-400 dark:border-emerald-800/60'
                }`}
              >
                {toast.type === 'success' && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                <span className="max-w-[260px] sm:max-w-md truncate">{toast.message}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowAddForm((prev) => !prev);
                setAddFormError(null);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {showAddForm ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Permission</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real Firestore Error / Auth Action Banner (shown ONLY when an error occurs) */}
        {firestoreError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium text-rose-800 dark:text-rose-200 break-words">
                {firestoreError}
              </p>
            </div>
            {(!firebaseUser || firestoreError.toLowerCase().includes('permission')) && (
              <button
                type="button"
                onClick={handleGoogleSuperAdminConnect}
                disabled={isConnectingGoogle}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{isConnectingGoogle ? 'Signing in…' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        )}

        {/* Super Admin Add Permission Form with Conditional Path Picker */}
        {showAddForm && (
          <form
            onSubmit={handleAddPermission}
            className="mb-6 rounded-3xl bg-white dark:bg-stone-900 border border-amber-950/[0.08] dark:border-stone-800 shadow-[0_8px_28px_-14px_rgba(120,76,24,0.12)] p-5 sm:p-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* Level 1: Section */}
              <div className="md:col-span-4">
                <label
                  htmlFor="muse-path-section"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Section
                </label>
                <select
                  id="muse-path-section"
                  value={selectedSection}
                  onChange={(e) => handleSectionChange(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70 cursor-pointer"
                >
                  {SECTION_ORDER.map((secTitle) => (
                    <option key={secTitle} value={secTitle}>
                      {secTitle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level 2: Tab */}
              <div className="md:col-span-4">
                <label
                  htmlFor="muse-path-tab"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Tab
                </label>
                {selectedSection === 'Custom' ? (
                  <input
                    id="muse-path-tab"
                    type="text"
                    required
                    value={customTabInput}
                    onChange={(e) => {
                      setCustomTabInput(e.target.value);
                      setAddFormError(null);
                    }}
                    placeholder="Tab name"
                    className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
                  />
                ) : (
                  <div className="space-y-2">
                    <select
                      id="muse-path-tab"
                      value={selectedTab}
                      onChange={(e) => handleTabChange(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70 cursor-pointer"
                    >
                      {knownTabsForSection.map((tab) => (
                        <option key={tab.title} value={tab.title}>
                          {tab.title}
                        </option>
                      ))}
                      <option value={NEW_OPTION_SENTINEL}>＋ Type a new tab…</option>
                    </select>
                    {selectedTab === NEW_OPTION_SENTINEL && (
                      <input
                        type="text"
                        required
                        value={customTabInput}
                        onChange={(e) => {
                          setCustomTabInput(e.target.value);
                          setAddFormError(null);
                        }}
                        placeholder="New tab name"
                        className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Level 3: Subgroup (CONDITIONAL — only rendered when Tab has children or user tapped + Add another level) */}
              {showSubgroupField && (
                <div className="md:col-span-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="muse-path-subgroup"
                      className="block text-xs font-semibold text-stone-700 dark:text-stone-300"
                    >
                      Subgroup
                    </label>
                    {knownSubgroupsForTab.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setForceShowSubgroup(false);
                          setSelectedSubgroup('');
                          setCustomSubgroupInput('');
                          setForceShowSubSubgroup(false);
                          setSelectedSubSubgroup('');
                          setCustomSubSubgroupInput('');
                          setExtraLevels([]);
                        }}
                        className="text-[11px] font-semibold text-stone-400 hover:text-rose-600 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {knownSubgroupsForTab.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        id="muse-path-subgroup"
                        value={selectedSubgroup}
                        onChange={(e) => handleSubgroupChange(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70 cursor-pointer"
                      >
                        {knownSubgroupsForTab.map((sg) => (
                          <option key={sg.title} value={sg.title}>
                            {sg.title}
                          </option>
                        ))}
                        <option value={NEW_OPTION_SENTINEL}>＋ Type a new subgroup…</option>
                      </select>
                      {selectedSubgroup === NEW_OPTION_SENTINEL && (
                        <input
                          type="text"
                          required
                          value={customSubgroupInput}
                          onChange={(e) => {
                            setCustomSubgroupInput(e.target.value);
                            setAddFormError(null);
                          }}
                          placeholder="New subgroup name"
                          className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      id="muse-path-subgroup"
                      type="text"
                      required
                      value={customSubgroupInput}
                      onChange={(e) => {
                        setCustomSubgroupInput(e.target.value);
                        setAddFormError(null);
                      }}
                      placeholder="Subgroup name"
                      className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
                    />
                  )}
                </div>
              )}

              {/* Level 4: Sub-subgroup (CONDITIONAL — only rendered when Subgroup has children or user tapped + Add another level) */}
              {showSubSubgroupField && (
                <div className="md:col-span-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="muse-path-subsubgroup"
                      className="block text-xs font-semibold text-stone-700 dark:text-stone-300"
                    >
                      Sub-subgroup
                    </label>
                    {knownSubSubgroups.length === 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setForceShowSubSubgroup(false);
                          setSelectedSubSubgroup('');
                          setCustomSubSubgroupInput('');
                          setExtraLevels([]);
                        }}
                        className="text-[11px] font-semibold text-stone-400 hover:text-rose-600 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {knownSubSubgroups.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        id="muse-path-subsubgroup"
                        value={selectedSubSubgroup}
                        onChange={(e) => {
                          setSelectedSubSubgroup(e.target.value);
                          setCustomSubSubgroupInput('');
                          setAddFormError(null);
                        }}
                        className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70 cursor-pointer"
                      >
                        {knownSubSubgroups.map((ssg) => (
                          <option key={ssg.title} value={ssg.title}>
                            {ssg.title}
                          </option>
                        ))}
                        <option value={NEW_OPTION_SENTINEL}>＋ Type a new sub-subgroup…</option>
                      </select>
                      {selectedSubSubgroup === NEW_OPTION_SENTINEL && (
                        <input
                          type="text"
                          required
                          value={customSubSubgroupInput}
                          onChange={(e) => {
                            setCustomSubSubgroupInput(e.target.value);
                            setAddFormError(null);
                          }}
                          placeholder="New sub-subgroup name"
                          className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
                        />
                      )}
                    </div>
                  ) : (
                    <input
                      id="muse-path-subsubgroup"
                      type="text"
                      required
                      value={customSubSubgroupInput}
                      onChange={(e) => {
                        setCustomSubSubgroupInput(e.target.value);
                        setAddFormError(null);
                      }}
                      placeholder="Sub-subgroup name"
                      className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
                    />
                  )}
                </div>
              )}

              {/* Optional Level 5+ dynamic levels when user taps "+ Add another level" */}
              {extraLevels.map((lvlVal, idx) => (
                <div key={`extra-level-${idx}`} className="md:col-span-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Level {idx + 5}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setExtraLevels((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-[11px] font-semibold text-stone-400 hover:text-rose-600 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={lvlVal}
                    onChange={(e) => {
                      const val = e.target.value;
                      setExtraLevels((prev) => prev.map((it, i) => (i === idx ? val : it)));
                      setAddFormError(null);
                    }}
                    placeholder={`Level ${idx + 5} name`}
                    className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
                  />
                </div>
              ))}

              {/* Action Picker */}
              <div className="md:col-span-4">
                <label
                  htmlFor="muse-action-select"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Action
                </label>
                <div className="space-y-2">
                  <select
                    id="muse-action-select"
                    value={selectedAction}
                    onChange={(e) => {
                      setSelectedAction(e.target.value as StandardActionType);
                      setAddFormError(null);
                    }}
                    className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70 cursor-pointer"
                  >
                    {ACTION_OPTIONS.map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.label}
                      </option>
                    ))}
                  </select>
                  {selectedAction === 'custom' && (
                    <input
                      type="text"
                      required
                      value={customActionInput}
                      onChange={(e) => {
                        setCustomActionInput(e.target.value);
                        setAddFormError(null);
                      }}
                      placeholder="e.g. Download Receipt"
                      className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
                    />
                  )}
                </div>
              </div>

              {/* Label */}
              <div className="md:col-span-4">
                <label
                  htmlFor="muse-new-label"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Label
                </label>
                <input
                  id="muse-new-label"
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    setLabelManuallyEdited(true);
                    setAddFormError(null);
                  }}
                  placeholder="View"
                  className="w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-[#FAF6F0]/60 dark:bg-stone-950 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
                />
              </div>

              {/* Auto-generated Key (read-only by default, with small "edit key" toggle) */}
              <div className="md:col-span-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="muse-new-key"
                    className="block text-xs font-semibold text-stone-700 dark:text-stone-300"
                  >
                    Key
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsKeyEditable((prev) => {
                        const next = !prev;
                        if (!next) {
                          setKeyManuallyEdited(false);
                        }
                        return next;
                      });
                    }}
                    className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    {isKeyEditable ? 'auto key' : 'edit key'}
                  </button>
                </div>
                <input
                  id="muse-new-key"
                  type="text"
                  required
                  readOnly={!isKeyEditable}
                  value={newKey}
                  onChange={(e) => {
                    if (!isKeyEditable) return;
                    setKeyManuallyEdited(true);
                    setNewKey(e.target.value.replace(/[^a-zA-Z0-9]/g, ''));
                    setAddFormError(null);
                  }}
                  className={`w-full h-11 px-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 text-sm font-mono text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/70 ${
                    isKeyEditable
                      ? 'bg-[#FAF6F0]/60 dark:bg-stone-950'
                      : 'bg-stone-100/80 dark:bg-stone-800/70 cursor-default'
                  }`}
                />
              </div>
            </div>

            {/* "+ Add another level" trigger */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!showSubgroupField) {
                    setForceShowSubgroup(true);
                  } else if (!showSubSubgroupField) {
                    setForceShowSubSubgroup(true);
                  } else {
                    setExtraLevels((prev) => [...prev, '']);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 cursor-pointer"
              >
                <span>＋ Add another level</span>
              </button>
            </div>

            {addFormError && (
              <p className="mt-3 text-xs font-medium text-rose-600 dark:text-rose-400 break-words">
                {addFormError}
              </p>
            )}

            <div className="mt-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setAddFormError(null);
                }}
                className="px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdding}
                className="px-5 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-60"
              >
                {isAdding ? 'Saving…' : 'Save Permission'}
              </button>
            </div>
          </form>
        )}

        {/* Skeleton while initial Firestore snapshot resolves */}
        {loading || !values ? (
          <div
            aria-busy="true"
            aria-label="Loading Muse Permissions"
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5"
          >
            {[4, 4].map((folderCount, colIdx) => (
              <div key={colIdx} className="space-y-3.5">
                {Array.from({ length: folderCount }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-14 rounded-3xl bg-white dark:bg-stone-900 border border-amber-950/[0.06] dark:border-stone-800 px-5 flex items-center justify-between"
                  >
                    <div className="h-4 w-36 rounded-md bg-stone-200/80 dark:bg-stone-800 animate-pulse" />
                    <div className="h-6 w-8 rounded-full bg-stone-200/80 dark:bg-stone-800 animate-pulse" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 items-start">
            <div className="space-y-3.5">
              {leftColumnNodes.map((node) => renderFolderNode(node))}
            </div>
            <div className="space-y-3.5">
              {rightColumnNodes.map((node) => renderFolderNode(node))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
