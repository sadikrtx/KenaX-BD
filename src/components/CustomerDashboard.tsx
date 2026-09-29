import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Package,
  MapPin,
  Heart,
  Plus,
  Trash2,
  ExternalLink,
  Phone,
  Mail,
  Home,
  Briefcase,
  CheckCircle,
  Truck,
  DollarSign,
  ShoppingCart,
  Zap,
  Clock,
  ShieldCheck,
  Building,
  X,
  Pencil,
  RefreshCw,
  Cloud,
  ArrowRight,
} from 'lucide-react';
import { Order, DeliveryAddress, Product, CustomerRecord, OrderItem } from '../types';
import { normalizePhoneNumber, fetchCustomerOrdersFromDB, getOrdersFromDB, subscribeToOrders } from '../lib/firebase';
import { BANGLADESH_LOCATIONS } from '../data/bangladeshData';
import { CartItemImage } from './CartItemImage';
import { getOptimizedImageUrl, handleImageError } from '../utils/imageOptimizer';
import {
  cleanBDPhoneNumber,
  isValidBDMobileNumber,
  getBDPhoneValidationError,
} from '../utils/phoneUtils';

interface CustomerDashboardProps {
  orders: Order[];
  savedAddresses: DeliveryAddress[];
  onAddAddress: (addr: DeliveryAddress) => void;
  onUpdateAddress?: (addr: DeliveryAddress) => void;
  onDeleteAddress: (id: string) => void;
  wishlist: Product[];
  cart?: OrderItem[];
  onUpdateCartQuantity?: (productId: string, quantity: number) => void;
  onRemoveCartItem?: (productId: string) => void;
  onOpenCheckout?: () => void;
  onTrackOrder: (order: Order) => void;
  onNavigate: (view: string) => void;
  onSelectProduct?: (product: Product) => void;
  onAddToCart?: (product: Product, quantity?: number) => void;
  onBuyNow?: (product: Product, quantity?: number) => void;
  onToggleWishlist?: (product: Product) => void;
  currentCustomer?: CustomerRecord | null;
  products?: Product[];
  onOpenCustomerAuth?: () => void;
  initialTab?: 'orders' | 'cart' | 'addresses' | 'wishlist';
  onTabChange?: (tab: 'orders' | 'cart' | 'addresses' | 'wishlist') => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  orders = [],
  savedAddresses = [],
  onAddAddress,
  onUpdateAddress,
  onDeleteAddress,
  wishlist = [],
  cart = [],
  products = [],
  onUpdateCartQuantity,
  onRemoveCartItem,
  onOpenCheckout,
  onTrackOrder,
  onNavigate,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  currentCustomer,
  onOpenCustomerAuth,
  initialTab,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'cart' | 'addresses' | 'wishlist'>(initialTab || 'orders');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSwitch = (tab: 'orders' | 'cart' | 'addresses' | 'wishlist') => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Address form state
  const [addrLabel, setAddrLabel] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [recipientName, setRecipientName] = useState(currentCustomer?.name || '');
  const [recipientPhone, setRecipientPhone] = useState(currentCustomer?.mobile || '');
  const [division, setDivision] = useState('Dhaka');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('Dhanmondi');
  const [fullAddress, setFullAddress] = useState('');
  const [isDefaultAddr, setIsDefaultAddr] = useState(false);

  // Derived location dropdown lists
  const availableDistricts = division && BANGLADESH_LOCATIONS[division]
    ? Object.keys(BANGLADESH_LOCATIONS[division].districts)
    : [];

  const availableUpazilas = division && district && BANGLADESH_LOCATIONS[division]?.districts[district]
    ? BANGLADESH_LOCATIONS[division].districts[district].upazilas
    : [];

  const handleDivisionChange = (newDiv: string) => {
    setDivision(newDiv);
    const districts = BANGLADESH_LOCATIONS[newDiv]?.districts ? Object.keys(BANGLADESH_LOCATIONS[newDiv].districts) : [];
    const firstDistrict = districts[0] || '';
    setDistrict(firstDistrict);
    const upazilas = firstDistrict && BANGLADESH_LOCATIONS[newDiv]?.districts[firstDistrict]?.upazilas ? BANGLADESH_LOCATIONS[newDiv].districts[firstDistrict].upazilas : [];
    setUpazila(upazilas[0] || '');
  };

  const handleDistrictChange = (newDist: string) => {
    setDistrict(newDist);
    const upazilas = division && BANGLADESH_LOCATIONS[division]?.districts[newDist]?.upazilas ? BANGLADESH_LOCATIONS[division].districts[newDist].upazilas : [];
    setUpazila(upazilas[0] || '');
  };

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddressModal(false);
        setEditingAddressId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenAddModal = () => {
    setEditingAddressId(null);
    setAddrLabel('Home');
    setRecipientName(currentCustomer?.name || '');
    setRecipientPhone(currentCustomer?.mobile || '');
    setDivision('Dhaka');
    setDistrict('Dhaka');
    setUpazila('Dhanmondi');
    setFullAddress('');
    setIsDefaultAddr(savedAddresses.length === 0);
    setShowAddressModal(true);
  };

  const handleOpenEditModal = (addr: DeliveryAddress) => {
    setEditingAddressId(addr.id);
    setAddrLabel(addr.label === 'Home' || addr.label === 'Office' || addr.label === 'Other' ? addr.label : 'Home');
    setRecipientName(addr.recipientName || currentCustomer?.name || '');
    setRecipientPhone(addr.recipientPhone || currentCustomer?.mobile || '');
    
    const div = addr.division && BANGLADESH_LOCATIONS[addr.division] ? addr.division : 'Dhaka';
    const dist = addr.district && BANGLADESH_LOCATIONS[div]?.districts[addr.district] ? addr.district : Object.keys(BANGLADESH_LOCATIONS[div]?.districts || {})[0] || 'Dhaka';
    const upz = addr.upazila || (BANGLADESH_LOCATIONS[div]?.districts[dist]?.upazilas[0] || 'Dhanmondi');

    setDivision(div);
    setDistrict(dist);
    setUpazila(upz);
    setFullAddress(addr.fullAddress || '');
    setIsDefaultAddr(Boolean(addr.isDefault));
    setShowAddressModal(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullAddress.trim()) return;

    const cleanPhone = cleanBDPhoneNumber(recipientPhone) || cleanBDPhoneNumber(currentCustomer?.mobile || '');
    if (cleanPhone && !isValidBDMobileNumber(cleanPhone)) {
      alert(getBDPhoneValidationError(cleanPhone) || 'Please enter a valid 11-digit mobile number starting with 013 to 019.');
      return;
    }

    if (editingAddressId) {
      const updatedAddr: DeliveryAddress = {
        id: editingAddressId,
        label: addrLabel,
        recipientName: recipientName.trim() || currentCustomer?.name || 'Customer',
        recipientPhone: cleanPhone,
        division,
        district,
        upazila,
        fullAddress: fullAddress.trim(),
        isDefault: isDefaultAddr,
      };
      if (onUpdateAddress) {
        onUpdateAddress(updatedAddr);
      } else {
        onAddAddress(updatedAddr);
      }
    } else {
      const newAddr: DeliveryAddress = {
        id: 'addr-' + Date.now(),
        label: addrLabel,
        recipientName: recipientName.trim() || currentCustomer?.name || 'Customer',
        recipientPhone: cleanPhone,
        division,
        district,
        upazila,
        fullAddress: fullAddress.trim(),
        isDefault: savedAddresses.length === 0 || isDefaultAddr,
      };
      onAddAddress(newAddr);
    }

    setShowAddressModal(false);
    setEditingAddressId(null);
    setFullAddress('');
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleManualSync = async () => {
    if (!currentCustomer) return;
    setIsSyncing(true);
    setSyncSuccess(false);
    try {
      await fetchCustomerOrdersFromDB(currentCustomer);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. Order IDs tracked locally on this device/browser session
  const [localOrderIds, setLocalOrderIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('kenax_my_orders') || localStorage.getItem('preview_kenax_my_orders');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [dbSyncedOrders, setDbSyncedOrders] = useState<Order[]>([]);

  // Real-time background synchronization for orders from Firestore & central DB
  useEffect(() => {
    let isMounted = true;
    const syncOrders = async () => {
      try {
        const fresh = await getOrdersFromDB();
        if (isMounted && fresh && fresh.length > 0) {
          setDbSyncedOrders(fresh);
        }
      } catch (e) {}
    };

    syncOrders();

    const handleOrderPlacedOrStorage = () => {
      try {
        const raw = localStorage.getItem('kenax_my_orders') || localStorage.getItem('preview_kenax_my_orders');
        if (raw) setLocalOrderIds(JSON.parse(raw));
      } catch {}
      syncOrders();
    };

    window.addEventListener('kenax_order_placed', handleOrderPlacedOrStorage);
    window.addEventListener('storage', handleOrderPlacedOrStorage);
    const unsub = subscribeToOrders((live) => {
      if (isMounted && live && live.length > 0) {
        setDbSyncedOrders(live);
      }
    });

    return () => {
      isMounted = false;
      window.removeEventListener('kenax_order_placed', handleOrderPlacedOrStorage);
      window.removeEventListener('storage', handleOrderPlacedOrStorage);
      if (unsub) unsub();
    };
  }, []);

  // Track online/offline status
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Pool all orders from props and live Firestore sync
  const allOrdersPool = useMemo(() => {
    const map = new Map<string, Order>();
    (orders || []).forEach((o) => { if (o && o.id) map.set(o.id, o); });
    (dbSyncedOrders || []).forEach((o) => { if (o && o.id) map.set(o.id, o); });
    return Array.from(map.values());
  }, [orders, dbSyncedOrders]);

  // Filter orders strictly for the logged-in customer or orders placed from this browser
  const customerOrders = useMemo(() => {
    return allOrdersPool.filter((o) => {
      if (!o) return false;
      const isDeviceOrder = localOrderIds.includes(o.id) || localOrderIds.some((id) => id.toUpperCase() === (o.id || '').toUpperCase());

      if (currentCustomer) {
        const emailMatch = Boolean(
          o.customerEmail &&
          currentCustomer.email &&
          o.customerEmail.trim().toLowerCase() === currentCustomer.email.trim().toLowerCase()
        );

        const cPhone = normalizePhoneNumber(currentCustomer.mobile);
        const oPhone = normalizePhoneNumber(o.customerMobile || (o as any).customerPhone || (o as any).phone || (o as any).mobile);
        const dPhone = normalizePhoneNumber(o.deliveryMobile);
        const phoneMatch = Boolean(
          cPhone && (
            oPhone === cPhone ||
            dPhone === cPhone ||
            (cPhone.length >= 10 && (oPhone.endsWith(cPhone.slice(-10)) || dPhone.endsWith(cPhone.slice(-10)))) ||
            (oPhone.length >= 10 && cPhone.endsWith(oPhone.slice(-10))) ||
            (dPhone.length >= 10 && cPhone.endsWith(dPhone.slice(-10)))
          )
        );

        const idMatch = Boolean(
          (o.customerId && currentCustomer.id && (o.customerId === currentCustomer.id || o.customerId === `cust-${currentCustomer.id}`)) ||
          (currentCustomer.orderIds && currentCustomer.orderIds.includes(o.id))
        );

        return Boolean(emailMatch || phoneMatch || idMatch || isDeviceOrder);
      }

      // Unregistered / visitor on this browser: show all orders placed from this device
      return isDeviceOrder;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [allOrdersPool, localOrderIds, currentCustomer]);

  // Metrics calculations for this specific customer
  const totalOrdersCount = customerOrders.length;
  const totalSpentBDT = customerOrders.reduce((sum, o) => sum + (o?.totalAmount || 0), 0);
  const deliveredOrdersCount = customerOrders.filter((o) => o?.orderStatus === 'Delivered' || o?.orderStatus === 'Completed').length;
  const activeShipmentsCount = customerOrders.filter(
    (o) => o?.orderStatus === 'Processing' || o?.orderStatus === 'Shipped' || o?.orderStatus === 'Pending' || o?.orderStatus === 'Confirmed'
  ).length;

  const totalCartCount = (cart || []).reduce((sum, i) => sum + i.quantity, 0);
  const totalCartValue = (cart || []).reduce((sum, i) => sum + (i.price * i.quantity), 0);

  const initials = currentCustomer?.name
    ? currentCustomer.name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CU';

  return (
    <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
      {/* 1. EXPANDED PROFILE & METRICS BANNER */}
      {currentCustomer ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* User Info Profile */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-md shrink-0">
                {initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {currentCustomer.name}
                  </h1>
                  {deliveredOrdersCount > 0 && (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
                      <CheckCircle className="w-3.5 h-3.5" /> Verified Customer
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-slate-400" /> {currentCustomer.email}
                  </span>
                  {currentCustomer.mobile && (
                    <>
                      <span className="hidden sm:inline text-slate-300 dark:text-slate-600">•</span>
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-slate-400" /> {currentCustomer.mobile}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Key Metrics Quick Stats Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 shrink-0">
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 text-center min-w-[110px]">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                  Total Orders
                </span>
                <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {totalOrdersCount}
                </span>
              </div>

              <div className="bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 rounded-2xl p-3.5 sm:p-4 text-center min-w-[110px]">
                <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 block uppercase tracking-wider">
                  Total Spent
                </span>
                <span className="text-lg sm:text-2xl font-black text-sky-950 dark:text-sky-200 mt-0.5 block">
                  ৳{totalSpentBDT.toLocaleString('en-BD')}
                </span>
              </div>

              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-3.5 sm:p-4 text-center min-w-[110px]">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block uppercase tracking-wider">
                  Delivered
                </span>
                <span className="text-lg sm:text-2xl font-black text-emerald-950 dark:text-emerald-200 mt-0.5 block">
                  {deliveredOrdersCount}
                </span>
              </div>

              <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-3.5 sm:p-4 text-center min-w-[110px]">
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block uppercase tracking-wider">
                  In Transit
                </span>
                <span className="text-lg sm:text-2xl font-black text-amber-950 dark:text-amber-200 mt-0.5 block">
                  {activeShipmentsCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Visitor / Device Mode Banner */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/80 border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xl shrink-0">
                <User className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                  Your Dashboard
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {customerOrders.length > 0
                    ? `Showing ${customerOrders.length} order${customerOrders.length > 1 ? 's' : ''} preserved on this device. Sign in or register to sync across all devices.`
                    : 'Your orders, cart items, delivery addresses, and wishlist are saved automatically on this device.'}
                </p>
              </div>
            </div>

            {customerOrders.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-2.5 sm:p-3 text-center min-w-[85px]">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block uppercase">Orders</span>
                    <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">{totalOrdersCount}</span>
                  </div>
                  <div className="bg-sky-50/70 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900/50 rounded-xl p-2.5 sm:p-3 text-center min-w-[85px]">
                    <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 block uppercase">Spent</span>
                    <span className="text-base sm:text-lg font-black text-sky-950 dark:text-sky-200">৳{totalSpentBDT.toLocaleString('en-BD')}</span>
                  </div>
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-2.5 sm:p-3 text-center min-w-[85px]">
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 block uppercase">Delivered</span>
                    <span className="text-base sm:text-lg font-black text-emerald-950 dark:text-emerald-200">{deliveredOrdersCount}</span>
                  </div>
                  <div className="bg-amber-50/70 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/50 rounded-xl p-2.5 sm:p-3 text-center min-w-[85px]">
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 block uppercase">In Transit</span>
                    <span className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-200">{activeShipmentsCount}</span>
                  </div>
                </div>
                <button
                  onClick={onOpenCustomerAuth}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  Sign In / Link Account
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenCustomerAuth}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. MODERN DASHBOARD TABS */}
      <div className="flex border-b border-slate-200 gap-3 sm:gap-6 text-sm sm:text-base font-bold text-slate-600 mb-8 overflow-x-auto pb-1">
        {/* TAB 1: ORDERS */}
        <button
          onClick={() => handleTabSwitch('orders')}
          className={`pb-3.5 flex items-center gap-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-sky-600 text-sky-600 font-black'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>My Orders</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'orders' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {totalOrdersCount}
          </span>
        </button>

        {/* TAB 2: MY CART */}
        <button
          onClick={() => handleTabSwitch('cart')}
          className={`pb-3.5 flex items-center gap-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'cart'
              ? 'border-sky-600 text-sky-600 font-black'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Cart Items</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'cart' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {totalCartCount}
          </span>
        </button>

        {/* TAB 3: SAVED ADDRESSES */}
        <button
          onClick={() => handleTabSwitch('addresses')}
          className={`pb-3.5 flex items-center gap-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'addresses'
              ? 'border-sky-600 text-sky-600 font-black'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span>Saved Addresses</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'addresses' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {(savedAddresses || []).length}
          </span>
        </button>

        {/* TAB 4: WISHLIST */}
        <button
          onClick={() => handleTabSwitch('wishlist')}
          className={`pb-3.5 flex items-center gap-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'wishlist'
              ? 'border-sky-600 text-sky-600 font-black'
              : 'border-transparent hover:text-slate-900'
          }`}
        >
          <Heart className="w-5 h-5" />
          <span>Wishlist</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'wishlist' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {(wishlist || []).length}
          </span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {customerOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">No orders placed yet</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Explore our catalog for genuine electronics, lifestyle gadgets, and fast Cash on Delivery!
              </p>
              <button
                onClick={() => onNavigate('shop')}
                className="mt-5 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
              >
                Browse Shop
              </button>
            </div>
          ) : (
            customerOrders.map((order) => {
              const orderItems = order?.items || [];
              const isDelivered = order.orderStatus === 'Delivered' || order.orderStatus === 'Completed';
              const isReturned = order.orderStatus === 'Returned';
              const isShipped = order.orderStatus === 'Shipped';
              const isPaid = order.paymentStatus === 'Paid' || isDelivered;
              const displayStatus = order.orderStatus === 'Completed' ? 'Delivered' : order.orderStatus === 'Returned' ? 'Delivery Returned' : order.orderStatus;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all duration-200"
                >
                  {/* Order Top Bar: ID, Date, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono font-bold text-sm text-sky-700 bg-sky-50 px-3 py-1 rounded-lg border border-sky-200/60">
                        #{order.id}
                      </span>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          isDelivered
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isReturned
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : isShipped
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {displayStatus}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Placed on {new Date(order.createdAt).toLocaleDateString()} at{' '}
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                        Payment: {order.paymentMethod || 'Cash on Delivery'}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          isReturned
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : isPaid
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {isReturned ? 'Delivery Returned (Unpaid)' : isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>

                  {/* Order Details Grid: Products Preview & Shipping Info */}
                  <div className="py-4 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                    {/* Items List Preview */}
                    <div className="lg:col-span-2 space-y-3">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Ordered Products ({orderItems.length})
                      </div>
                      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-2">
                        {orderItems.map((item, idx) => {
                          const matchingProd = (products || []).find((p) => p.id === item.productId || p.name.toLowerCase() === (item.productName || '').toLowerCase());
                          const pImg =
                            (item.productImage && item.productImage.trim() !== '')
                              ? item.productImage
                              : ((item as any).image && (item as any).image.trim() !== '')
                              ? (item as any).image
                              : matchingProd?.images?.find((img) => typeof img === 'string' && img.trim() !== '')
                              || matchingProd?.colors?.find((c) => c.imageUrl)?.imageUrl
                              || 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=200';
                          const pName =
                            item.productName ||
                            (item as any).title ||
                            (item as any).name ||
                            'Ordered Product';

                          return (
                            <div key={idx} className="flex items-center gap-3 py-2.5">
                              <CartItemImage
                                item={item as OrderItem}
                                product={matchingProd}
                                sizeClassName="w-12 h-12 rounded-xl shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{pName}</p>
                                {item.variant && (
                                  <span className="inline-block text-[10px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-semibold mt-0.5">
                                    {item.variant}
                                  </span>
                                )}
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Qty: {item.quantity} × ৳{item.price.toLocaleString('en-BD')}
                                </p>
                              </div>
                              <span className="text-xs font-black text-slate-900 shrink-0">
                                ৳{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-BD')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Shipping Address & Courier Summary */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        <Truck className="w-3.5 h-3.5 text-sky-600" />
                        <span>Delivery Destination</span>
                      </div>
                      <p className="text-slate-800 font-semibold leading-relaxed">
                        {order.fullAddress}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        {order.upazila ? `${order.upazila}, ` : ''}
                        {order.district}, {order.division}
                      </p>
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Courier Partner</span>
                        <span className="font-bold text-slate-700">Pathao / Steadfast Express</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Footer: Total Amount & Actions */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">Total Payable:</span>
                      <span className="text-xl sm:text-2xl font-black text-slate-900">
                        ৳{order.totalAmount.toLocaleString('en-BD')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isReturned
                            ? 'bg-rose-100 text-rose-800'
                            : isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isReturned ? 'Delivery Returned' : isPaid ? 'Paid' : 'COD Pending'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          onTrackOrder(order);
                          onNavigate('track');
                        }}
                        className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                      >
                        <Truck className="w-4 h-4 text-sky-400" />
                        <span>Track Parcel Live</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </button>

                      <button
                        onClick={() => onNavigate('shop')}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Buy Again
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: CART ITEMS */}
      {activeTab === 'cart' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800">
                My Cart Products ({totalCartCount})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Items added to your cart are permanently preserved on this device and synced to your cloud profile.
              </p>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => onNavigate('shop')}
                className="text-xs font-bold text-sky-600 hover:text-sky-700"
              >
                + Add More Products ➔
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4 border border-sky-100">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Your Cart is Empty</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                You haven't added any products to your cart yet. Explore our top gadgets, electronics, and lifestyle collections.
              </p>
              <button
                onClick={() => onNavigate('shop')}
                className="mt-5 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-sm shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Start Shopping</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cart Items List */}
              <div className="lg:col-span-2 space-y-4">
                {cart.map((item, index) => {
                  const itemKey = `${item.productId}-${item.selectedSize || ''}-${item.selectedColor || ''}-${index}`;
                  const matchingProd = (products || []).find((p) => p.id === item.productId || p.name.toLowerCase() === (item.productName || '').toLowerCase());
                  const cartImg =
                    (item.productImage && item.productImage.trim() !== '')
                      ? item.productImage
                      : matchingProd?.images?.find((img) => typeof img === 'string' && img.trim() !== '')
                      || matchingProd?.colors?.find((c) => c.imageUrl)?.imageUrl
                      || 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=200';
                  return (
                    <div
                      key={itemKey}
                      className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <CartItemImage
                          item={item}
                          product={matchingProd}
                          sizeClassName="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">
                            {item.productName}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {item.selectedColor && (
                              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                Color: {item.selectedColor}
                              </span>
                            )}
                            {item.selectedSize && (
                              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                Size: {item.selectedSize}
                              </span>
                            )}
                            {item.variant && !item.selectedColor && !item.selectedSize && (
                              <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                                {item.variant}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-sky-700 mt-1.5">
                            ৳{item.price.toLocaleString('en-BD')} / unit
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                          <button
                            onClick={() => {
                              if (onUpdateCartQuantity) {
                                onUpdateCartQuantity(item.productId, item.quantity - 1);
                              }
                            }}
                            className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 active:bg-slate-300 font-bold transition-colors cursor-pointer"
                            title="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="px-3 py-1.5 text-xs font-black text-slate-900 min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              if (onUpdateCartQuantity) {
                                onUpdateCartQuantity(item.productId, item.quantity + 1);
                              }
                            }}
                            className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 active:bg-slate-300 font-bold transition-colors cursor-pointer"
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        {/* Item Total Amount */}
                        <div className="text-right min-w-[5rem]">
                          <span className="text-xs text-slate-400 block">Total</span>
                          <span className="text-sm sm:text-base font-black text-slate-900">
                            ৳{(item.price * item.quantity).toLocaleString('en-BD')}
                          </span>
                        </div>

                        {/* Remove from Cart */}
                        {onRemoveCartItem && (
                          <button
                            onClick={() => onRemoveCartItem(item.productId)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Remove from cart"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary Box */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs h-fit space-y-5">
                <h4 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                  <span>Order Summary</span>
                  <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                    {totalCartCount} items
                  </span>
                </h4>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal</span>
                    <span className="font-bold text-slate-900">৳{totalCartValue.toLocaleString('en-BD')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated Shipping</span>
                    <span className="font-bold text-emerald-600">Calculated at Checkout</span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between text-sm sm:text-base font-black text-slate-900">
                    <span>Subtotal</span>
                    <span className="text-xl font-black text-sky-700">৳{totalCartValue.toLocaleString('en-BD')}</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    onClick={() => {
                      if (onOpenCheckout) {
                        onOpenCheckout();
                      } else {
                        onNavigate('checkout');
                      }
                    }}
                    className="w-full py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onNavigate('shop')}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>100% Genuine Products with Cash on Delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Fast Express Delivery across all 64 Districts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Cart data permanently saved and synced</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADDRESSES */}
      {activeTab === 'addresses' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800">
                Your Saved Delivery Addresses
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your shipping locations for seamless 1-click checkout.
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-sky-700 active:bg-sky-800 cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Address</span>
            </button>
          </div>

          {(savedAddresses || []).length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4 border border-sky-100">
                <MapPin className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Saved Addresses Found</h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                You do not have any saved delivery addresses yet. Add your home or office address for faster 1-click checkout!
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  onClick={handleOpenAddModal}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Address</span>
                </button>
                {!currentCustomer && (
                  <button
                    onClick={onOpenCustomerAuth}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Sign In to Sync
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Expanded 3-4 column grid on desktop */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {(savedAddresses || []).map((addr) => (
                <div
                  key={addr.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs relative flex flex-col justify-between hover:border-slate-300 transition-all duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-lg border border-sky-100">
                        {addr.label === 'Home' ? (
                          <Home className="w-3.5 h-3.5 text-sky-600" />
                        ) : (
                          <Briefcase className="w-3.5 h-3.5 text-sky-600" />
                        )}
                        {addr.label}
                      </span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Default
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-bold text-slate-900">{addr.recipientName}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> {addr.recipientPhone}
                    </p>

                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-700 leading-relaxed">
                      <p className="font-medium text-slate-800">{addr.fullAddress}</p>
                      <p className="text-slate-400 text-[11px] mt-1">
                        {addr.upazila ? `${addr.upazila}, ` : ''}
                        {addr.district}, {addr.division}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Bangladesh
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(addr)}
                        className="px-2.5 py-1 text-slate-600 hover:text-sky-600 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold border border-slate-200 hover:border-sky-200"
                        title="Edit Address"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => onDeleteAddress(addr.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                        title="Delete Address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add / Edit Address Modal */}
          {showAddressModal && (
            <div
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAddressModal(false);
                  setEditingAddressId(null);
                }
              }}
            >
              <div className="bg-white rounded-3xl max-w-md w-full max-h-[88vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 overflow-hidden">
                {/* Fixed Header */}
                <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        {editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {editingAddressId ? 'Update your saved delivery address' : 'Save a new delivery address'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddressModal(false);
                      setEditingAddressId(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrollable Form Body */}
                <form onSubmit={handleSaveAddress} className="p-4 sm:p-6 space-y-3.5 text-xs overflow-y-auto flex-1">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">Address Label</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Home', 'Office', 'Other'] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setAddrLabel(l)}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                            addrLabel === l
                              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Recipient Name</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Tanvir Hossain"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Recipient Phone (11-Digit) *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(cleanBDPhoneNumber(e.target.value))}
                      placeholder="017XXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-xs"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Division *</label>
                      <select
                        value={division}
                        onChange={(e) => handleDivisionChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
                        required
                      >
                        {Object.keys(BANGLADESH_LOCATIONS).map((div) => (
                          <option key={div} value={div}>
                            {div}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">District *</label>
                      <select
                        value={district}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
                        required
                      >
                        {availableDistricts.map((dist) => (
                          <option key={dist} value={dist}>
                            {dist}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Thana / Upazila</label>
                      <select
                        value={upazila}
                        onChange={(e) => setUpazila(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
                      >
                        {availableUpazilas.map((upz) => (
                          <option key={upz} value={upz}>
                            {upz}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Full Detailed Address</label>
                    <textarea
                      rows={2}
                      value={fullAddress}
                      onChange={(e) => setFullAddress(e.target.value)}
                      placeholder="e.g. House 45, Flat 4B, Road 27, Dhanmondi, Dhaka"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-xs"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isDefaultAddr"
                      checked={isDefaultAddr}
                      onChange={(e) => setIsDefaultAddr(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4 border-slate-300 cursor-pointer"
                    />
                    <label htmlFor="isDefaultAddr" className="text-xs text-slate-700 font-semibold cursor-pointer">
                      Set as default delivery address
                    </label>
                  </div>

                  {/* Sticky Footer with Save / Cancel Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-white sticky bottom-0 z-10">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddressModal(false);
                        setEditingAddressId(null);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors font-semibold cursor-pointer text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-colors shadow-xs cursor-pointer text-xs"
                    >
                      {editingAddressId ? 'Update Address' : 'Save Address'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WISHLIST */}
      {activeTab === 'wishlist' && (
        <div>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800">
                Your Saved Wishlist ({(wishlist || []).length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Saved items are stored in your profile for quick checkout anytime.
              </p>
            </div>
            {wishlist.length > 0 && (
              <button
                onClick={() => onNavigate('shop')}
                className="text-xs font-bold text-sky-600 hover:text-sky-700"
              >
                Continue Shopping ➔
              </button>
            )}
          </div>

          {(wishlist || []).length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
              <Heart className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">Your wishlist is empty</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Explore our catalog and click the heart icon on any product to save it here!
              </p>
              <button
                onClick={() => onNavigate('shop')}
                className="mt-5 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
              >
                Explore Products
              </button>
            </div>
          ) : (
            /* Expansive 4-6 column grid on wide desktop screens */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {(wishlist || []).map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl border border-slate-200 p-4 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-sky-300 transition-all duration-200 group"
                >
                  <div>
                    {/* Image */}
                    <div
                      onClick={() => onSelectProduct && onSelectProduct(p)}
                      className={`relative aspect-square w-full rounded-2xl bg-slate-50 border border-slate-100 p-2 overflow-hidden flex items-center justify-center mb-3 ${
                        onSelectProduct ? 'cursor-pointer' : ''
                      }`}
                    >
                      <img
                        src={getOptimizedImageUrl(p.images?.[0] || 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500', 600)}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImageError(e, p.images?.[0])}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {onToggleWishlist && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWishlist(p);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-xs text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove from wishlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">
                      {p.category}
                    </span>
                    <h4
                      onClick={() => onSelectProduct && onSelectProduct(p)}
                      className={`text-xs font-bold text-slate-900 line-clamp-2 mt-1 min-h-[32px] hover:text-sky-600 transition-colors ${
                        onSelectProduct ? 'cursor-pointer' : ''
                      }`}
                    >
                      {p.name}
                    </h4>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="text-sm font-black text-slate-900">
                        ৳{p.price.toLocaleString('en-BD')}
                      </p>
                      {p.compareAtPrice && p.compareAtPrice > p.price && (
                        <p className="text-[10px] text-slate-400 line-through">
                          ৳{p.compareAtPrice.toLocaleString('en-BD')}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1 sm:gap-1.5 mt-1 min-w-0">
                      <button
                        onClick={() => onAddToCart && onAddToCart(p, 1)}
                        className="w-full py-2 px-1 sm:px-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 transition-all cursor-pointer border border-slate-200 shadow-2xs min-w-0 overflow-hidden"
                        title="Add to Cart"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                        <span className="truncate">Add to Cart</span>
                      </button>

                      <button
                        onClick={() => {
                          if (onBuyNow) {
                            onBuyNow(p, 1);
                          } else if (onAddToCart) {
                            onAddToCart(p, 1);
                          }
                        }}
                        className="w-full py-2 px-1 sm:px-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:from-sky-700 active:to-blue-700 text-white font-black text-[10px] sm:text-xs flex items-center justify-center gap-1 transition-all shadow-xs hover:shadow-md cursor-pointer min-w-0 overflow-hidden"
                        title="Buy Now"
                      >
                        <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0" />
                        <span className="truncate">Buy Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
