import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  Search,
  Plus,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Package,
  ShoppingCart,
  DollarSign,
  Star,
  X,
  Key,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { AdminTab } from './AdminSidebar';
import { AdminNotification, StaffUser, UserRole } from '../../types';

interface AdminHeaderProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  onOpenMobileMenu: () => void;
  notifications: AdminNotification[];
  onMarkNotificationRead: (id: string) => void;
  currentStaff: StaffUser | null;
  currentRole: UserRole;
  onLogout: () => void;
  onNavigateToStore: () => void;
  onOpenAddProduct?: () => void;
  onOpenChangePassword?: () => void;
  isSuperAdminAccount?: boolean;
  onRoleChange?: (newRole: UserRole) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenMobileMenu,
  notifications,
  onMarkNotificationRead,
  currentStaff,
  currentRole,
  onLogout,
  onNavigateToStore,
  onOpenAddProduct,
  onOpenChangePassword,
  isSuperAdminAccount,
  onRoleChange,
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifHoverTimer = useRef<NodeJS.Timeout | null>(null);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotifOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleNotifMouseEnter = () => {
    if (notifHoverTimer.current) {
      clearTimeout(notifHoverTimer.current);
      notifHoverTimer.current = null;
    }
  };

  const handleNotifMouseLeave = () => {
    if (notifHoverTimer.current) clearTimeout(notifHoverTimer.current);
    notifHoverTimer.current = setTimeout(() => {
      setIsNotifOpen(false);
    }, 250);
  };
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getTabTitle = (tab: AdminTab) => {
    switch (tab) {
      case 'overview': return 'Dashboard Overview';
      case 'orders': return 'Order Management';
      case 'products': return 'Product Catalog';
      case 'categories': return 'Category Management';
      case 'inventory': return 'Inventory & Stock Control';
      case 'customers': return 'Customer Management';
      case 'delivery': return 'Delivery & Courier Logistics';
      case 'payments': return 'Payments & Transactions';
      case 'coupons': return 'Coupons & Discounts';
      case 'reviews': return 'Reviews & Moderation';
      case 'staff': return 'Staff & RBAC Administration';
      case 'roles': return 'Role Permissions Matrix';
      case 'reports': return 'Sales & Financial Reports';
      case 'logs': return 'Audit & Activity Logs';
      case 'settings': return 'Website & Store Settings';
      case 'gmail-alerts': return 'Gmail Alerts & Template Manager';
      default: return 'Admin Portal';
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'order': return <ShoppingCart className="w-4 h-4 text-sky-500" />;
      case 'payment': return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'stock': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'review': return <Star className="w-4 h-4 text-purple-500" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 px-4 lg:px-8 flex items-center justify-between">
      {/* Left section: mobile hamburger & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium hidden sm:flex">
            <span>KenaX BD Admin</span>
            <span>/</span>
            <span className="text-slate-600 capitalize">{currentTab}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
            {getTabTitle(currentTab)}
          </h1>
        </div>
      </div>

      {/* Right Section: Quick actions & notification center */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Quick Add Product button if on products or overview */}
        {onOpenAddProduct && (currentTab === 'products' || currentTab === 'overview') && (
          <button
            onClick={onOpenAddProduct}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        )}

        {/* Live Store link */}
        <button
          onClick={onNavigateToStore}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          <span>View Store</span>
        </button>

        {/* Notifications Dropdown */}
        <div
          ref={notifRef}
          onMouseEnter={handleNotifMouseEnter}
          onMouseLeave={handleNotifMouseLeave}
          className="relative"
        >
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Notifications"
            aria-expanded={isNotifOpen}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-xs">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-sky-500 text-white text-[10px] font-bold rounded-full">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        onMarkNotificationRead(n.id);
                        if (n.type === 'order') onSelectTab('orders');
                        if (n.type === 'stock') onSelectTab('inventory');
                        if (n.type === 'review') onSelectTab('reviews');
                        if (n.type === 'payment') onSelectTab('payments');
                        setIsNotifOpen(false);
                      }}
                      className={`p-3.5 text-xs transition-colors cursor-pointer flex items-start gap-3 ${
                        n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-sky-50/60 hover:bg-sky-50 font-medium'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-slate-100 shrink-0">
                        {getNotifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className="font-bold text-slate-800 truncate">{n.title}</p>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    notifications.forEach((n) => onMarkNotificationRead(n.id));
                    setIsNotifOpen(false);
                  }}
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  Mark All as Read
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Staff Mini Avatar Dropdown */}
        <div ref={profileRef} className="relative pl-2 border-l border-slate-200">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {currentStaff?.name ? currentStaff.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                {currentStaff?.name || 'Staff User'}
              </p>
              <p className="text-[10px] text-slate-500 capitalize">{currentRole.replace('_', ' ')}</p>
            </div>
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 py-1">
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-900 truncate">{currentStaff?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{currentStaff?.email}</p>
              </div>

              {onOpenChangePassword && (
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onOpenChangePassword();
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-sky-600" />
                  <span>Change Password</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onNavigateToStore();
                }}
                className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>View Store</span>
              </button>

              <div className="border-t border-slate-100 my-1"></div>

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onLogout();
                }}
                className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 cursor-pointer transition-colors"
                title="Log Out & Return to Home"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
