import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Heart,
  Package,
  Boxes,
  Users,
  FolderTree,
  Tag,
  Star,
  Truck,
  CreditCard,
  Smartphone,
  UserCheck,
  ShieldAlert,
  ClipboardList,
  Settings,
  BarChart3,
  TrendingUp,
  LineChart,
  Trophy,
  Gauge,
  CheckCircle2,
  Wallet,
  BadgePercent,
  Coins,
  LayoutTemplate,
  QrCode,
  Network,
  MessageCircle,
  Radio,
  Send,
  Users2,
  ScrollText,
  LogOut,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Shield,
  ShieldCheck,
  Sparkles,
  Mail,
  Receipt,
  TrendingDown,
  Globe,
  Zap,
  MessageSquare,
  Bot,
  Building2,
  BadgeCheck,
  Bell,
  Target,
  Store,
  Clock,
  RefreshCw,
  Menu,
  FileSpreadsheet,
  Gift,
  SlidersHorizontal,
  X,
  Cloud,
  Handshake,
  Puzzle,
  Upload,
  Plus,
  History,
  Calculator,
  Plug,
} from 'lucide-react';
import { UserRole, StaffUser } from '../../types';
import { KenaXLogo } from '../KenaXLogo';
import { hasPermission } from '../../lib/permissions';
import { useLanguage } from '../../context/LanguageContext';
import { usePlugins } from '../../context/PluginContext';

export type AdminTab =
  | 'overview'
  | 'performance'
  | 'my-dashboard'
  | 'orders'
  | 'confirmed-orders'
  | 'delivery-advance'
  | 'cart-activities'
  | 'wishlist-activities'
  | 'products'
  | 'price-calculator'
  | 'landing-pages'
  | 'categories'
  | 'advertiser'
  | 'facebook-ads'
  | 'tiktok-ads'
  | 'google-ads'
  | 'dropshipping'
  | 'dealers'
  | 'costs'
  | 'inventory'
  | 'customers'
  | 'delivery'
  | 'courier-fraud'
  | 'order-settings'
  | 'payments'
  | 'payment-gateways'
  | 'coupons'
  | 'get-offers'
  | 'reviews'
  | 'staff'
  | 'roles'
  | 'reports'
  | 'logs'
  | 'chat-bot'
  | 'telegram-bot'
  | 'whatsapp-automation'
  | 'sms-gateway'
  | 'gmail-alerts'
  | 'seo-settings'
  | 'policies'
  | 'google-sheets'
  | 'settings'
  | 'integration-settings'
  | 'muse-permissions'
  | 'storage-settings'
  | 'plugins'
  | 'plugins-installed'
  | 'plugins-add-new'
  | 'plugins-store'
  | 'plugins-upload'
  | 'plugins-settings'
  | 'plugins-updates'
  | 'plugins-logs';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  onLogout: () => void;
  onNavigateToStore: () => void;
  pendingOrdersCount: number;
  confirmedOrdersCount?: number;
  lowStockCount: number;
  liveCartsCount?: number;
  liveWishlistsCount?: number;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onRoleChange?: (role: UserRole) => void;
  isSuperAdminAccount?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  currentRole,
  currentStaff,
  onLogout,
  onNavigateToStore,
  pendingOrdersCount,
  confirmedOrdersCount = 0,
  lowStockCount,
  liveCartsCount = 0,
  liveWishlistsCount = 0,
  isMobileOpen,
  onCloseMobile,
  onRoleChange,
  isSuperAdminAccount = false,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const staffPermissions = currentStaff?.permissions || [];
  const { state: pluginState } = usePlugins();
  const activePluginsCount = pluginState.installations.filter((i) => i.status === 'active').length;
  const availablePluginUpdatesCount = pluginState.updates.filter((u) => u.status === 'available').length;

  interface NavItem {
    id: AdminTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
    requiredPermission: string;
    superAdminOnly?: boolean;
  }

  interface NavGroup {
    title: string;
    items: NavItem[];
  }

  // Section toggle state (Accordion)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('kenax_admin_sidebar_collapsed_groups');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Real-time unread/new SMS count for Automation section
  const [unreadSmsCount, setUnreadSmsCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('kenax_unread_sms_count');
      if (saved) return Number(saved) || 0;
    } catch {}
    return 0;
  });

  useEffect(() => {
    const handleUnreadUpdate = () => {
      try {
        const saved = localStorage.getItem('kenax_unread_sms_count');
        setUnreadSmsCount(saved ? Number(saved) || 0 : 0);
      } catch {}
    };
    window.addEventListener('kenax_sms_unread_updated', handleUnreadUpdate);
    window.addEventListener('storage', handleUnreadUpdate);
    return () => {
      window.removeEventListener('kenax_sms_unread_updated', handleUnreadUpdate);
      window.removeEventListener('storage', handleUnreadUpdate);
    };
  }, []);

  useEffect(() => {
    if (currentTab === 'sms-gateway') {
      setUnreadSmsCount(0);
      try {
        localStorage.setItem('kenax_unread_sms_count', '0');
      } catch {}
    }
  }, [currentTab]);

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionTitle]: !prev[sectionTitle] };
      try {
        localStorage.setItem('kenax_admin_sidebar_collapsed_groups', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Automatically uncollapse section containing currentTab
  useEffect(() => {
    const activeGroup = navGroups.find((g) => g.items.some((it) => it.id === currentTab));
    if (activeGroup && collapsedSections[activeGroup.title]) {
      setCollapsedSections((prev) => {
        const next = { ...prev, [activeGroup.title]: false };
        try {
          localStorage.setItem('kenax_admin_sidebar_collapsed_groups', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [currentTab]);

  const navGroups: NavGroup[] = [
    {
      title: 'CORE',
      items: [
        {
          id: 'overview',
          label: isBn ? 'ড্যাশবোর্ড' : 'Dashboard',
          icon: LayoutDashboard,
          requiredPermission: 'reports.view',
        },
        {
          id: 'reports',
          label: 'Report & Analytics',
          icon: TrendingUp,
          requiredPermission: 'reports.view',
        },
        {
          id: 'performance',
          label: 'Team Performance',
          icon: Trophy,
          requiredPermission: 'performance.view',
        },
        {
          id: 'my-dashboard',
          label: isBn ? 'আমার ড্যাশবোর্ড' : 'My Dashboard',
          icon: Gauge,
          requiredPermission: 'my_dashboard.view',
        },
      ],
    },
    {
      title: 'SALES',
      items: [
        {
          id: 'orders',
          label: 'Orders',
          icon: ShoppingCart,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
          badgeColor: 'bg-amber-500 text-white',
          requiredPermission: 'orders.view',
        },
        {
          id: 'confirmed-orders',
          label: 'Confirmed Orders',
          icon: CheckCircle2,
          badge: confirmedOrdersCount > 0 ? confirmedOrdersCount : undefined,
          badgeColor: 'bg-teal-600 text-white',
          requiredPermission: 'orders.view',
        },
        {
          id: 'order-settings',
          label: isBn ? 'অর্ডার সেটিংস' : 'Order Settings',
          icon: SlidersHorizontal,
          badge: 'Security',
          badgeColor: 'bg-[#8B0000] text-white',
          requiredPermission: 'orders.view',
        },
        {
          id: 'cart-activities',
          label: 'Cart Activities',
          icon: ShoppingBag,
          badge: liveCartsCount > 0 ? liveCartsCount : undefined,
          badgeColor: 'bg-sky-500 text-white',
          requiredPermission: 'orders.cart_activities',
        },
        {
          id: 'wishlist-activities',
          label: 'Wishlist Activities',
          icon: Heart,
          badge: liveWishlistsCount > 0 ? liveWishlistsCount : undefined,
          badgeColor: 'bg-rose-500 text-white',
          requiredPermission: 'orders.wishlist_activities',
        },
        {
          id: 'payments',
          label: 'Payments',
          icon: Wallet,
          requiredPermission: 'payments.view',
        },
        {
          id: 'delivery-advance',
          label: 'Advance Payment',
          icon: BadgePercent,
          badge: 'Advance',
          badgeColor: 'bg-emerald-600 text-white',
          requiredPermission: 'payments.verify',
        },
      ],
    },
    {
      title: 'CATALOG',
      items: [
        {
          id: 'products',
          label: 'Products',
          icon: Package,
          requiredPermission: 'products.view',
        },
        {
          id: 'price-calculator',
          label: isBn ? 'প্রাইস ক্যালকুলেটর' : 'Price Calculator',
          icon: Calculator,
          requiredPermission: 'products.view',
        },
        {
          id: 'categories',
          label: 'Categories',
          icon: FolderTree,
          requiredPermission: 'categories.manage',
        },
        {
          id: 'costs',
          label: 'Costs & Expenses',
          icon: Receipt,
          badge: 'Track',
          badgeColor: 'bg-rose-600 text-white',
          requiredPermission: 'costs.view',
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: Boxes,
          badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined,
          badgeColor: 'bg-rose-500 text-white',
          requiredPermission: 'inventory.view',
        },
        {
          id: 'coupons',
          label: 'Coupons & Promos',
          icon: Tag,
          requiredPermission: 'coupons.view',
        },
        {
          id: 'get-offers',
          label: isBn ? 'স্পেশাল অফার ও পপআপ' : 'Get Offers & Popup',
          icon: Gift,
          badge: 'Popup',
          badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
          requiredPermission: 'coupons.view',
        },
        {
          id: 'payment-gateways',
          label: 'Payment Gateways',
          icon: QrCode,
          badge: 'Live',
          badgeColor: 'bg-emerald-600 text-white',
          requiredPermission: 'payments.gateways',
        },
      ],
    },
    {
      title: isBn ? 'মার্কেটিং ও বিজ্ঞাপন' : 'MARKETING & ADS',
      items: [
        {
          id: 'facebook-ads',
          label: isBn ? 'ফেসবুক অ্যাডস' : 'Facebook Ads',
          icon: Target,
          badge: 'Pixel & CAPI',
          badgeColor: 'bg-blue-600 text-white',
          requiredPermission: 'marketing.view',
        },
        {
          id: 'tiktok-ads',
          label: isBn ? 'টিকটক অ্যাডস' : 'TikTok Ads',
          icon: Zap,
          badge: 'Events API',
          badgeColor: 'bg-rose-600 text-white',
          requiredPermission: 'marketing.view',
        },
        {
          id: 'google-ads',
          label: isBn ? 'গুগল অ্যাডস' : 'Google Ads',
          icon: Globe,
          badge: 'GA4 & Ads',
          badgeColor: 'bg-amber-600 text-white',
          requiredPermission: 'marketing.view',
        },
        {
          id: 'landing-pages',
          label: isBn ? 'ল্যান্ডিং পেজ ও সেলস ফানেল' : 'Landing Pages',
          icon: LayoutTemplate,
          badge: 'Funnel',
          badgeColor: 'bg-indigo-600 text-white',
          requiredPermission: 'landing_pages.view',
        },
      ],
    },
    {
      title: isBn ? 'সরবরাহকারী ও ডিলার' : 'SUPPLIERS & DEALERS',
      items: [
        {
          id: 'dropshipping',
          label: isBn ? 'সরবরাহকারী' : 'Suppliers',
          icon: Building2,
          requiredPermission: 'suppliers.view',
        },
        {
          id: 'dealers',
          label: isBn ? 'ডিলার ব্যবস্থাপনা' : 'Dealer Management',
          icon: Handshake,
          badge: 'Internal',
          badgeColor: 'bg-emerald-600 text-white',
          requiredPermission: 'dealers.view',
        },
      ],
    },
    {
      title: 'CUSTOMERS',
      items: [
        {
          id: 'customers',
          label: 'Customers',
          icon: Users,
          requiredPermission: 'customers.view',
        },
        {
          id: 'reviews',
          label: 'Reviews Moderation',
          icon: Star,
          requiredPermission: 'reviews.view',
        },
      ],
    },
    {
      title: 'LOGISTICS',
      items: [
        {
          id: 'delivery',
          label: 'Delivery & Couriers',
          icon: Truck,
          requiredPermission: 'delivery.view',
        },
        {
          id: 'courier-fraud',
          label: 'Courier Fraud Checker',
          icon: ShieldAlert,
          badge: 'Fraud Check',
          badgeColor: 'bg-amber-500 text-white',
          requiredPermission: 'delivery.view',
        },
      ],
    },
    {
      title: 'AUTOMATION',
      items: [
        {
          id: 'chat-bot',
          label: 'Chat Bot',
          icon: Bot,
          badge: 'KenaX Bot',
          badgeColor: 'bg-emerald-600 text-white',
          requiredPermission: 'chatbot.ai',
        },
        {
          id: 'whatsapp-automation',
          label: 'WhatsApp Automation',
          icon: MessageCircle,
          badge: 'WhatsApp',
          badgeColor: 'bg-emerald-600 text-white',
          requiredPermission: 'whatsapp.inbox',
        },
        {
          id: 'telegram-bot',
          label: 'Telegram Bot',
          icon: Send,
          badge: 'Telegram',
          badgeColor: 'bg-sky-500 text-white',
          requiredPermission: 'telegram.view',
        },
        {
          id: 'sms-gateway',
          label: 'SMS Gateway & Alerts',
          icon: Radio,
          badge: unreadSmsCount > 0 ? unreadSmsCount : undefined,
          badgeColor: 'bg-emerald-500 text-white',
          requiredPermission: 'chatbot.sms',
        },
        {
          id: 'gmail-alerts',
          label: 'Gmail Alerts & Templates',
          icon: Mail,
          requiredPermission: 'chatbot.email',
        },
      ],
    },
    {
      title: 'STAFF & RBAC',
      items: [
        {
          id: 'staff',
          label: 'Staff Management',
          icon: Users2,
          requiredPermission: 'staff.view',
        },
        {
          id: 'roles',
          label: 'Roles & Permissions',
          icon: Shield,
          requiredPermission: 'roles.view',
        },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        {
          id: 'seo-settings',
          label: 'SEO & Meta Tags',
          icon: Globe,
          badge: 'SEO',
          badgeColor: 'bg-indigo-600 text-white',
          requiredPermission: 'seo.manage',
        },
        {
          id: 'google-sheets',
          label: 'Google Sheets Sync',
          icon: FileSpreadsheet,
          badge: 'SYNC',
          badgeColor: 'bg-emerald-600 text-white',
          requiredPermission: 'settings.view',
        },
        {
          id: 'policies',
          label: 'Privacy & Store Policies',
          icon: ScrollText,
          badge: 'POLICY',
          badgeColor: 'bg-sky-600 text-white',
          requiredPermission: 'settings.view',
        },
        {
          id: 'logs',
          label: 'Activity Logs',
          icon: ClipboardList,
          requiredPermission: 'logs.view',
        },
        {
          id: 'settings',
          label: 'Store Settings',
          icon: Settings,
          requiredPermission: 'settings.view',
        },
        {
          id: 'integration-settings',
          label: isBn ? 'Muse AI ইন্টিগ্রেশন' : 'Muse AI Integration',
          icon: Plug,
          badge: 'Muse AI',
          badgeColor: 'bg-emerald-600 text-white',
          requiredPermission: 'settings.view',
          superAdminOnly: true,
        },
        {
          id: 'muse-permissions',
          label: 'Muse Permissions',
          icon: ShieldCheck,
          badge: 'Muse',
          badgeColor: 'bg-amber-600 text-white',
          requiredPermission: 'settings.view',
          superAdminOnly: true,
        },
        {
          id: 'storage-settings',
          label: isBn ? 'স্টোরেজ ও ক্লাউড' : 'Storage & Cloud',
          icon: Cloud,
          badge: 'Cloud & Drive',
          badgeColor: 'bg-indigo-600 text-white',
          requiredPermission: 'settings.view',
        },
      ],
    },
    {
      title: isBn ? 'প্লাগইনস (PLUGINS)' : 'PLUGINS',
      items: [
        {
          id: 'plugins-installed',
          label: isBn ? 'ইনস্টলকৃত প্লাগইন' : 'Installed Plugins',
          icon: Puzzle,
          badge: activePluginsCount > 0 ? `${activePluginsCount} Active` : 'Hub',
          badgeColor: activePluginsCount > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300',
          requiredPermission: 'plugins.view',
        },
        {
          id: 'plugins-add-new',
          label: isBn ? 'নতুন প্লাগইন যুক্ত করুন' : 'Add New Plugin',
          icon: Plus,
          requiredPermission: 'plugins.install',
        },
        {
          id: 'plugins-store',
          label: isBn ? 'প্লাগইন স্টোর' : 'Plugin Store',
          icon: Store,
          badge: `${pluginState.plugins.length || 8}`,
          badgeColor: 'bg-indigo-600 text-white',
          requiredPermission: 'plugins.view',
        },
        {
          id: 'plugins-upload',
          label: isBn ? 'প্লাগইন আপলোড (.zip)' : 'Upload Plugin',
          icon: Upload,
          badge: '.zip',
          badgeColor: 'bg-sky-600 text-white',
          requiredPermission: 'plugins.install',
        },
        {
          id: 'plugins-settings',
          label: isBn ? 'প্লাগইন সেটিংস' : 'Plugin Settings',
          icon: SlidersHorizontal,
          requiredPermission: 'plugins.settings',
        },
        {
          id: 'plugins-updates',
          label: isBn ? 'প্লাগইন আপডেটস' : 'Plugin Updates',
          icon: RefreshCw,
          badge: availablePluginUpdatesCount > 0 ? availablePluginUpdatesCount : undefined,
          badgeColor: 'bg-amber-500 text-slate-950 font-black',
          requiredPermission: 'plugins.manage',
        },
        {
          id: 'plugins-logs',
          label: isBn ? 'প্লাগইন অ্যাক্টিভিটি লগ' : 'Plugin Activity Logs',
          icon: History,
          requiredPermission: 'plugins.view',
        },
      ],
    },
  ];

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">SUPER ADMIN</span>;
      case 'manager':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">MANAGER</span>;
      case 'moderator':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">MODERATOR</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">USER</span>;
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: On mobile it is always expanded (w-72 sm:w-80), on desktop it responds to isCollapsed */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-slate-950 border-r border-slate-800 text-slate-300 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen
            ? 'translate-x-0 w-72 sm:w-80 max-w-[85vw] shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Logo & Brand Header with 3-line desktop toggle & mobile X close button */}
        <div
          className={`h-16 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md shrink-0 transition-all duration-300 flex items-center ${
            isCollapsed
              ? 'lg:px-2 lg:justify-center px-4 justify-between'
              : 'px-4 justify-between'
          }`}
        >
          <div className="flex items-center justify-center min-w-0">
            {isCollapsed ? (
              <KenaXLogo size="sm" variant="emblem" theme="dark" className="w-8 h-8" />
            ) : (
              <KenaXLogo size="sm" variant="horizontal" theme="dark" className="h-7" />
            )}
          </div>

          {/* Mobile Close 'X' Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 lg:hidden cursor-pointer transition-colors"
            title="মেনু বন্ধ করুন"
            aria-label="Close mobile menu"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Desktop 3-Line Collapse/Expand Button (Hidden when collapsed inside header, toggled from header bar) */}
          {onToggleCollapse && !isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-white border border-slate-700/80 transition-all cursor-pointer items-center justify-center shadow-xs group shrink-0"
              title={isBn ? 'সাইডবার মেনু সংকুচিত করুন' : 'Collapse Sidebar'}
              aria-label="Toggle sidebar collapse"
            >
              <div className="flex flex-col gap-1 w-4 items-center justify-center">
                <span className="w-4 h-0.5 bg-sky-400 group-hover:bg-white rounded-full transition-colors" />
                <span className="w-4 h-0.5 bg-sky-400 group-hover:bg-white rounded-full transition-colors" />
                <span className="w-4 h-0.5 bg-sky-400 group-hover:bg-white rounded-full transition-colors" />
              </div>
            </button>
          )}
        </div>

        {/* Staff Profile Card */}
        {(!isCollapsed || isMobileOpen) ? (
          <div className="p-3 mx-3 my-2.5 rounded-xl bg-slate-900 border border-slate-800 transition-all shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md text-xs shrink-0 ring-1 ring-white/10">
                {currentStaff?.name ? currentStaff.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {currentStaff?.name || 'Authorized Admin'}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {getRoleBadge(currentRole)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="my-2.5 mx-auto w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md text-xs shrink-0 cursor-pointer border border-slate-700"
            title={`${currentStaff?.name || 'Admin'} (${currentRole})`}
          >
            {currentStaff?.name ? currentStaff.name.charAt(0).toUpperCase() : 'A'}
          </div>
        )}

        {/* Navigation Links (Scrollable) */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed && !isMobileOpen ? 'px-2' : 'px-3'} py-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800`}>
          {navGroups.map((group, groupIndex) => {
            // Filter items user has permission for
            const visibleItems = group.items.filter((item) => {
              if (item.superAdminOnly && currentRole !== 'super_admin') return false;
              return hasPermission(currentRole, staffPermissions, item.requiredPermission);
            });

            if (visibleItems.length === 0) return null;

            const isSectionCollapsed = !!collapsedSections[group.title];
            const hasActiveChild = visibleItems.some((it) => it.id === currentTab);

            let hasActiveNotification = false;
            if (group.title === 'SALES') {
              hasActiveNotification = pendingOrdersCount > 0;
            } else if (group.title === 'AUTOMATION') {
              hasActiveNotification = unreadSmsCount > 0;
            }

            const renderCollapsedDesktop = isCollapsed && !isMobileOpen;

            return (
              <div key={group.title} className="space-y-1">
                {!renderCollapsedDesktop ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(group.title)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer select-none group/sec ${
                      hasActiveChild
                        ? 'text-sky-400 bg-sky-950/40 border border-sky-800/40 shadow-2xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent hover:border-slate-700/50'
                    }`}
                    title={isSectionCollapsed ? `${group.title} মেনু খুলুন` : `${group.title} মেনু বন্ধ করুন`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="truncate group-hover/sec:text-white transition-colors">{group.title}</span>
                      
                      {/* Green Notification Dot ONLY for SALES (new orders) and AUTOMATION (new SMS) */}
                      {hasActiveNotification && (
                        <span
                          className="relative flex h-2 w-2 shrink-0"
                          title={
                            group.title === 'SALES'
                              ? `${pendingOrdersCount}টি নতুন অর্ডার পেন্ডিং রয়েছে`
                              : `${unreadSmsCount}টি নতুন এসএমএস নোটিফিকেশন রয়েছে`
                          }
                        >
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-2 ring-slate-900"></span>
                        </span>
                      )}
                    </span>

                    {/* Stylish Modern Arrow Container */}
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 shrink-0 ${
                        hasActiveChild
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          : 'bg-slate-800/60 group-hover/sec:bg-slate-700 text-slate-400 group-hover/sec:text-white border border-slate-700/50'
                      }`}
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isSectionCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </div>
                  </button>
                ) : (
                  groupIndex > 0 && <div className="h-px bg-slate-800/80 my-2 mx-1" />
                )}

                {(!isSectionCollapsed || renderCollapsedDesktop) && (
                  <div className="space-y-0.5 animate-in fade-in duration-150">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;

                      if (renderCollapsedDesktop) {
                        return (
                          <div key={item.id} className="relative group/navitem">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectTab(item.id);
                                onCloseMobile();
                                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                                const mainEl = document.querySelector('main');
                                if (mainEl) mainEl.scrollTop = 0;
                              }}
                              className={`w-full flex items-center justify-center p-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer relative ${
                                isActive
                                  ? 'bg-sky-600 text-white font-semibold shadow-md ring-1 ring-sky-400/50'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
                              }`}
                              aria-label={item.label}
                            >
                              <Icon
                                className={`w-5 h-5 shrink-0 transition-colors ${
                                  isActive ? 'text-white' : 'text-slate-400 group-hover/navitem:text-slate-200'
                                }`}
                              />
                              {item.badge && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-slate-950" />
                              )}
                            </button>

                            {/* Floating tooltip on hover */}
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 pointer-events-none group-hover/navitem:opacity-100 transition-opacity z-50">
                              {item.label}
                              {item.badge && (
                                <span className="ml-1.5 text-[9px] px-1 py-0.2 bg-sky-500/20 text-sky-300 rounded font-bold">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelectTab(item.id);
                            onCloseMobile();
                            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                            const mainEl = document.querySelector('main');
                            if (mainEl) mainEl.scrollTop = 0;
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                            isActive
                              ? 'bg-sky-600 text-white font-semibold shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Icon
                              className={`w-4 h-4 shrink-0 transition-colors ${
                                isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                              }`}
                            />
                            <span className="truncate whitespace-nowrap">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 ${
                                item.badgeColor || 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Actions & Role Switcher */}
        <div className={`p-2.5 border-t border-slate-800 bg-slate-950/90 space-y-2 shrink-0 ${isCollapsed && !isMobileOpen ? 'flex flex-col items-center' : ''}`}>
          {(!isCollapsed || isMobileOpen) && onRoleChange && isSuperAdminAccount && (
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Quick Role Tester
                </p>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold font-mono">
                  Super Admin
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['super_admin', 'manager', 'moderator'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onRoleChange(r)}
                    className={`py-1.5 text-[10px] font-bold rounded-lg text-center transition-all cursor-pointer ${
                      currentRole === r
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {r === 'super_admin' ? 'Super' : r === 'manager' ? 'Manager' : 'Mod'}
                  </button>
                ))}
              </div>
              {currentRole !== 'super_admin' && (
                <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-amber-300 font-medium">
                    Testing: <b className="text-white capitalize">{currentRole === 'manager' ? 'Manager View' : 'Moderator View'}</b>
                  </span>
                  <button
                    type="button"
                    onClick={() => onRoleChange('super_admin')}
                    className="text-sky-400 hover:text-sky-300 font-bold underline cursor-pointer"
                  >
                    Reset Super
                  </button>
                </div>
              )}
            </div>
          )}

          {(!isCollapsed || isMobileOpen) ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateToStore}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer border border-slate-800"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Live Store</span>
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="flex items-center justify-center p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer border border-red-500/20"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full">
              <button
                type="button"
                onClick={onNavigateToStore}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-800"
                title="View Live Store"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors cursor-pointer border border-red-500/20"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
