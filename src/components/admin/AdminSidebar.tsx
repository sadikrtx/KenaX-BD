import React from 'react';
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
  LogOut,
  ExternalLink,
  ChevronRight,
  Shield,
  Sparkles,
  Mail,
  Receipt,
  TrendingDown,
  Globe,
  MessageSquare,
} from 'lucide-react';
import { UserRole, StaffUser } from '../../types';
import { KenaXLogo } from '../KenaXLogo';
import { hasPermission } from '../../lib/permissions';

export type AdminTab =
  | 'overview'
  | 'performance'
  | 'orders'
  | 'delivery-advance'
  | 'cart-activities'
  | 'wishlist-activities'
  | 'products'
  | 'categories'
  | 'costs'
  | 'inventory'
  | 'customers'
  | 'delivery'
  | 'payments'
  | 'payment-gateways'
  | 'coupons'
  | 'reviews'
  | 'staff'
  | 'roles'
  | 'reports'
  | 'logs'
  | 'whatsapp-automation'
  | 'sms-gateway'
  | 'gmail-alerts'
  | 'seo-settings'
  | 'settings';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  onLogout: () => void;
  onNavigateToStore: () => void;
  pendingOrdersCount: number;
  lowStockCount: number;
  liveCartsCount?: number;
  liveWishlistsCount?: number;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onRoleChange?: (role: UserRole) => void;
  isSuperAdminAccount?: boolean;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  currentRole,
  currentStaff,
  onLogout,
  onNavigateToStore,
  pendingOrdersCount,
  lowStockCount,
  liveCartsCount = 0,
  liveWishlistsCount = 0,
  isMobileOpen,
  onCloseMobile,
  onRoleChange,
  isSuperAdminAccount = false,
}) => {
  const staffPermissions = currentStaff?.permissions || [];

  interface NavItem {
    id: AdminTab;
    label: string;
    icon: React.ElementType;
    badge?: number | string;
    badgeColor?: string;
    requiredPermission: string;
  }

  interface NavGroup {
    title: string;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      title: 'CORE',
      items: [
        {
          id: 'overview',
          label: 'Dashboard',
          icon: LayoutDashboard,
          requiredPermission: 'reports.view',
        },
        {
          id: 'reports',
          label: 'Report & Analytics',
          icon: BarChart3,
          requiredPermission: 'reports.view',
        },
        {
          id: 'performance',
          label: 'Team Performance',
          icon: BarChart3,
          requiredPermission: 'reports.view',
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
          id: 'cart-activities',
          label: 'Cart Activities',
          icon: ShoppingBag,
          badge: liveCartsCount > 0 ? liveCartsCount : undefined,
          badgeColor: 'bg-sky-500 text-white',
          requiredPermission: 'orders.view',
        },
        {
          id: 'wishlist-activities',
          label: 'Wishlist Activities',
          icon: Heart,
          badge: liveWishlistsCount > 0 ? liveWishlistsCount : undefined,
          badgeColor: 'bg-rose-500 text-white',
          requiredPermission: 'orders.view',
        },
        {
          id: 'payments',
          label: 'Payments',
          icon: CreditCard,
          requiredPermission: 'payments.view',
        },
        {
          id: 'delivery-advance',
          label: 'Advance Payment',
          icon: CreditCard,
          badge: 'Advance',
          badgeColor: 'bg-emerald-600 text-white',
          requiredPermission: 'payments.view',
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
          id: 'categories',
          label: 'Categories',
          icon: FolderTree,
          requiredPermission: 'products.view',
        },
        {
          id: 'costs',
          label: 'Costs & Expenses',
          icon: Receipt,
          badge: 'Track',
          badgeColor: 'bg-rose-600 text-white',
          requiredPermission: 'reports.view',
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
          id: 'payment-gateways',
          label: 'Payment Gateways',
          icon: Smartphone,
          badge: 'Live',
          badgeColor: 'bg-emerald-600 text-white',
          requiredPermission: 'settings.view',
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
      ],
    },
    {
      title: 'STAFF & RBAC',
      items: [
        {
          id: 'staff',
          label: 'Staff Management',
          icon: UserCheck,
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
          id: 'whatsapp-automation',
          label: 'WhatsApp Automation',
          icon: MessageSquare,
          badge: 'WhatsApp',
          badgeColor: 'bg-emerald-600 text-white',
          requiredPermission: 'settings.view',
        },
        {
          id: 'sms-gateway',
          label: 'SMS Gateway & Alerts',
          icon: MessageSquare,
          badge: 'SMS',
          badgeColor: 'bg-emerald-600 text-white',
          requiredPermission: 'settings.view',
        },
        {
          id: 'seo-settings',
          label: 'SEO & Meta Tags',
          icon: Globe,
          badge: 'SEO',
          badgeColor: 'bg-indigo-600 text-white',
          requiredPermission: 'settings.view',
        },
        {
          id: 'gmail-alerts',
          label: 'Gmail Alerts & Templates',
          icon: Mail,
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo & Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5">
            <KenaXLogo size="sm" theme="dark" className="h-8" />
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-sky-600/30 text-sky-400 border border-sky-500/30 rounded">
              ADMIN
            </span>
          </div>
        </div>

        {/* Staff Profile Card */}
        <div className="p-4 mx-3 my-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0">
              {currentStaff?.name ? currentStaff.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {currentStaff?.name || 'Authorized Admin'}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                {getRoleBadge(currentRole)}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {navGroups.map((group) => {
            // Filter items user has permission for
            const visibleItems = group.items.filter((item) =>
              hasPermission(currentRole, staffPermissions, item.requiredPermission)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
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
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
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
              </div>
            );
          })}
        </div>

        {/* Bottom Actions & Role Switcher */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90 space-y-2 shrink-0">
          {onRoleChange && isSuperAdminAccount && (
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
        </div>
      </aside>
    </>
  );
};
