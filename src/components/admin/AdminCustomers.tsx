import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingCart,
  X,
  AlertTriangle,
  KeyRound,
  Lock,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Heart,
  ShoppingBag,
  Download,
  Laptop,
  UserCheck,
  BadgeCheck,
  Crown,
  CreditCard,
  Server,
  Edit,
  Trash2,
} from 'lucide-react';
import { CustomerRecord, Order, UserRole, StaffUser } from '../../types';

interface AdminCustomersProps {
  customers: CustomerRecord[];
  orders: Order[];
  onToggleCustomerStatus: (customerId: string, blockReason?: string) => void;
  onResetCustomerPassword?: (customerId: string, newPassword: string) => void;
  onEditCustomer?: (customerId: string, updatedData: Partial<CustomerRecord>) => void;
  onDeleteCustomer?: (customerId: string) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  initialSelectedCustomer?: CustomerRecord | null;
  onCloseCustomerModal?: () => void;
}

export type CustomerSegment = 'all' | 'registered' | 'panel_buyers' | 'active_buyers' | 'wishlist';

export const AdminCustomers: React.FC<AdminCustomersProps> = ({
  customers,
  orders,
  onToggleCustomerStatus,
  onResetCustomerPassword,
  onEditCustomer,
  onDeleteCustomer,
  currentRole,
  currentStaff,
  initialSelectedCustomer,
  onCloseCustomerModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<CustomerSegment>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(initialSelectedCustomer || null);

  useEffect(() => {
    if (initialSelectedCustomer) {
      // Find latest customer data from customers list if possible
      const freshCust = customers.find((c) => c.id === initialSelectedCustomer.id || c.mobile === initialSelectedCustomer.mobile) || initialSelectedCustomer;
      setSelectedCustomer(freshCust);
      if (freshCust.wishlist && freshCust.wishlist.length > 0) {
        setActiveSegment('wishlist');
      }
    }
  }, [initialSelectedCustomer, customers]);

  const handleCloseCustomerModal = () => {
    setSelectedCustomer(null);
    if (onCloseCustomerModal) {
      onCloseCustomerModal();
    }
  };
  const [blockingTarget, setBlockingTarget] = useState<CustomerRecord | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState('Repeated fake order placement or COD cancellation');

  // Edit Customer State
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editIsBlocked, setEditIsBlocked] = useState(false);
  const [editBlockReason, setEditBlockReason] = useState('');
  const [editSuccessNotice, setEditSuccessNotice] = useState<string | null>(null);

  // Delete Customer State (with guaranteed preservation of pending and past orders)
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRecord | null>(null);

  const handleOpenEditModal = (customer: CustomerRecord) => {
    setEditingCustomer(customer);
    setEditName(customer.name || '');
    setEditMobile(customer.mobile || '');
    setEditEmail(customer.email || '');
    const firstAddr = (customer.savedAddresses && customer.savedAddresses[0]?.address) ||
      (customer.addresses && customer.addresses[0]?.fullAddress) || '';
    setEditAddress(firstAddr);
    setEditIsBlocked(Boolean(customer.isBlocked));
    setEditBlockReason(customer.blockReason || '');
    setEditSuccessNotice(null);
  };

  const handleSaveCustomerEdit = () => {
    if (!editingCustomer) return;
    if (!editName.trim()) {
      alert('Please enter a valid customer name.');
      return;
    }
    if (!editMobile.trim()) {
      alert('Please enter a valid customer mobile number.');
      return;
    }

    const updatedData: Partial<CustomerRecord> = {
      name: editName.trim(),
      mobile: editMobile.trim(),
      email: editEmail.trim(),
      isBlocked: editIsBlocked,
      blockReason: editIsBlocked ? (editBlockReason.trim() || 'Manual restriction by admin') : undefined,
    };

    if (editAddress.trim()) {
      const existingAddrs = editingCustomer.savedAddresses || [];
      const updatedAddrs = existingAddrs.length > 0
        ? existingAddrs.map((a, idx) => idx === 0 ? { ...a, address: editAddress.trim() } : a)
        : [{ id: 'addr-1', address: editAddress.trim(), isDefault: true }];
      updatedData.savedAddresses = updatedAddrs;
    }

    if (onEditCustomer) {
      onEditCustomer(editingCustomer.id, updatedData);
    }

    if (selectedCustomer && selectedCustomer.id === editingCustomer.id) {
      setSelectedCustomer({
        ...selectedCustomer,
        ...updatedData,
      });
    }

    setEditSuccessNotice('Customer profile details updated successfully!');
    setTimeout(() => {
      setEditingCustomer(null);
      setEditSuccessNotice(null);
    }, 1200);
  };

  const handleOpenDeleteModal = (customer: CustomerRecord) => {
    setDeletingCustomer(customer);
  };

  const handleConfirmDeleteCustomer = () => {
    if (!deletingCustomer) return;
    if (onDeleteCustomer) {
      onDeleteCustomer(deletingCustomer.id);
    }
    if (selectedCustomer && selectedCustomer.id === deletingCustomer.id) {
      handleCloseCustomerModal();
    }
    setDeletingCustomer(null);
  };

  // Password visibility & reset state
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [resetTarget, setResetTarget] = useState<CustomerRecord | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resetSuccessNotice, setResetSuccessNotice] = useState<string | null>(null);

  const togglePasswordVisibility = (customerId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [customerId]: !prev[customerId],
    }));
  };

  const handleCopyPassword = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = 'KenaX@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordInput(pass);
  };

  const handleOpenResetModal = (customer: CustomerRecord) => {
    setResetTarget(customer);
    setNewPasswordInput('');
    setShowNewPassword(true);
    setResetSuccessNotice(null);
  };

  const handleConfirmResetPassword = () => {
    if (!resetTarget || !newPasswordInput.trim()) return;
    if (newPasswordInput.trim().length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }

    if (onResetCustomerPassword) {
      onResetCustomerPassword(resetTarget.id, newPasswordInput.trim());
    }

    if (selectedCustomer && selectedCustomer.id === resetTarget.id) {
      setSelectedCustomer({
        ...selectedCustomer,
        password: newPasswordInput.trim(),
      });
    }

    setResetSuccessNotice(`Password for ${resetTarget.name} updated to "${newPasswordInput.trim()}" successfully!`);
    setTimeout(() => {
      setResetTarget(null);
      setResetSuccessNotice(null);
    }, 1800);
  };

  const getCustomerOrders = (mobile: string) => {
    return orders.filter((o) => o.customerMobile === mobile);
  };

  // Customer Classification Helpers
  const isRegisteredCustomer = (c: CustomerRecord): boolean => {
    return Boolean(c.password || (c.email && c.email.includes('@')) || (c.id && !c.id.includes('guest')));
  };

  const isPanelBuyer = (c: CustomerRecord): boolean => {
    if (c.isPanelPurchased || (c.panelPurchases && c.panelPurchases.length > 0)) {
      return true;
    }
    const custOrders = getCustomerOrders(c.mobile);
    return custOrders.some((o) =>
      (o.items || []).some((it: any) => {
        const name = (it.productName || it.name || '').toLowerCase();
        return (
          name.includes('panel') ||
          name.includes('website') ||
          name.includes('software') ||
          name.includes('script') ||
          name.includes('subscription') ||
          name.includes('license') ||
          name.includes('package') ||
          name.includes('pro') ||
          name.includes('domain') ||
          name.includes('hosting')
        );
      })
    );
  };

  const isActiveBuyer = (c: CustomerRecord): boolean => {
    return c.totalOrders > 0 || getCustomerOrders(c.mobile).length > 0;
  };

  const hasWishlist = (c: CustomerRecord): boolean => {
    return Boolean(c.wishlist && c.wishlist.length > 0);
  };

  // Metrics Calculations
  const registeredCustomersCount = customers.filter(isRegisteredCustomer).length;
  const panelBuyersCount = customers.filter(isPanelBuyer).length;
  const activeBuyersCount = customers.filter(isActiveBuyer).length;
  const wishlistCustomersCount = customers.filter(hasWishlist).length;

  const totalWishlistItemsCount = customers.reduce((sum, c) => sum + (c.wishlist?.length || 0), 0);

  // Filter Customers by Selected Segment and Search Query
  const filteredCustomers = customers.filter((c) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      c.name.toLowerCase().includes(query) ||
      c.mobile.includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.panelPurchases && c.panelPurchases.some((p) => p.panelName.toLowerCase().includes(query)));

    let matchesSegment = true;
    if (activeSegment === 'registered') {
      matchesSegment = isRegisteredCustomer(c);
    } else if (activeSegment === 'panel_buyers') {
      matchesSegment = isPanelBuyer(c);
    } else if (activeSegment === 'active_buyers') {
      matchesSegment = isActiveBuyer(c);
    } else if (activeSegment === 'wishlist') {
      matchesSegment = hasWishlist(c);
    }

    return matchesQuery && matchesSegment;
  });

  const handleBlockConfirm = () => {
    if (!blockingTarget) return;
    onToggleCustomerStatus(blockingTarget.id, blockReasonInput);
    setBlockingTarget(null);
  };

  // Export Customer CSV Function
  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      alert('No customer records to export.');
      return;
    }

    const headers = [
      'Customer ID',
      'Name',
      'Mobile',
      'Email',
      'Registered User',
      'Panel Purchaser',
      'Panel Purchases',
      'Total Orders',
      'Total Spent (BDT)',
      'Registration Date',
      'Status',
    ];

    const rows = filteredCustomers.map((c) => {
      const custOrders = getCustomerOrders(c.mobile);
      const orderCount = custOrders.length || c.totalOrders || 0;
      const spent = custOrders.reduce((s, o) => s + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0) || c.totalSpent || 0;
      const registered = isRegisteredCustomer(c) ? 'Yes' : 'No';
      const panelUser = isPanelBuyer(c) ? 'Yes' : 'No';
      const panelDetails = c.panelPurchases
        ? c.panelPurchases.map((p) => `${p.panelName} (${p.plan})`).join(' | ')
        : 'N/A';

      return [
        `"${c.id}"`,
        `"${c.name}"`,
        `"${c.mobile}"`,
        `"${c.email || ''}"`,
        `"${registered}"`,
        `"${panelUser}"`,
        `"${panelDetails}"`,
        orderCount,
        spent,
        `"${new Date(c.createdAt || c.registeredAt || Date.now()).toLocaleDateString('en-GB')}"`,
        `"${c.isBlocked ? 'Blocked' : 'Active'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KenaX_Customers_Report_${activeSegment}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Customers */}
        <div
          onClick={() => setActiveSegment('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSegment === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-800'
              : 'bg-white text-slate-900 border-slate-200 shadow-2xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeSegment === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Shoppers
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${activeSegment === 'all' ? 'bg-slate-800 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black">{customers.length}</span>
            <span className={`text-xs font-semibold ${activeSegment === 'all' ? 'text-slate-400' : 'text-slate-500'}`}>
              All Database Records
            </span>
          </div>
        </div>

        {/* Card 2: Total Registered Customers */}
        <div
          onClick={() => setActiveSegment('registered')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSegment === 'registered'
              ? 'bg-indigo-900 text-white border-indigo-900 shadow-md ring-2 ring-indigo-700'
              : 'bg-white text-slate-900 border-slate-200 shadow-2xs hover:border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeSegment === 'registered' ? 'text-indigo-200' : 'text-slate-500'}`}>
              Registered Accounts
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${activeSegment === 'registered' ? 'bg-indigo-800 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black">{registeredCustomersCount}</span>
            <span className={`text-xs font-semibold ${activeSegment === 'registered' ? 'text-indigo-200' : 'text-indigo-600'}`}>
              {customers.length > 0 ? `${Math.round((registeredCustomersCount / customers.length) * 100)}% of total` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 3: Panel Purchase Customers */}
        <div
          onClick={() => setActiveSegment('panel_buyers')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSegment === 'panel_buyers'
              ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-700'
              : 'bg-white text-slate-900 border-slate-200 shadow-2xs hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeSegment === 'panel_buyers' ? 'text-purple-200' : 'text-slate-500'}`}>
              Panel Purchasers
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${activeSegment === 'panel_buyers' ? 'bg-purple-800 text-purple-300' : 'bg-purple-50 text-purple-600'}`}>
              <Laptop className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black">{panelBuyersCount}</span>
            <span className={`text-xs font-semibold ${activeSegment === 'panel_buyers' ? 'text-purple-200' : 'text-purple-600'}`}>
              Website & SaaS Buyers
            </span>
          </div>
        </div>

        {/* Card 4: Active Buyers */}
        <div
          onClick={() => setActiveSegment('active_buyers')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSegment === 'active_buyers'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-md ring-2 ring-emerald-700'
              : 'bg-white text-slate-900 border-slate-200 shadow-2xs hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeSegment === 'active_buyers' ? 'text-emerald-200' : 'text-slate-500'}`}>
              Active Shoppers
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${activeSegment === 'active_buyers' ? 'bg-emerald-800 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black">{activeBuyersCount}</span>
            <span className={`text-xs font-semibold ${activeSegment === 'active_buyers' ? 'text-emerald-200' : 'text-emerald-600'}`}>
              Placed Orders
            </span>
          </div>
        </div>
      </div>

      {/* Segment Switcher Bar & Search / Actions */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
        {/* System Option Tabs (Customer Segments) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveSegment('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSegment === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Total Customers ({customers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('registered')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSegment === 'registered'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Registered Customers ({registeredCustomersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('panel_buyers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSegment === 'panel_buyers'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Panel Buyers ({panelBuyersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('active_buyers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSegment === 'active_buyers'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Ordered Customers ({activeBuyersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('wishlist')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSegment === 'wishlist'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <Heart className="w-4 h-4 fill-current" />
            <span>Wishlist Saved ({wishlistCustomersCount})</span>
          </button>
        </div>

        {/* Search Input & CSV Export Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, BD mobile, email, panel..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              title="Export filtered customer list to CSV format"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3.5 px-4">Customer Profile</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Account Type &amp; Tags</th>
                <th className="py-3.5 px-4">Password</th>
                <th className="py-3.5 px-4 text-center">Wishlist</th>
                <th className="py-3.5 px-4 text-center">Orders</th>
                <th className="py-3.5 px-4 text-right">Total Spent</th>
                <th className="py-3.5 px-4">Registered</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-slate-700">No customers found in this section</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting search query or switching tabs above.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const customerOrders = getCustomerOrders(c.mobile);
                  const actualOrderCount = customerOrders.length || c.totalOrders;
                  const actualSpent = customerOrders.reduce((s, o) => s + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0) || c.totalSpent;
                  const isPassVisible = visiblePasswords[c.id];
                  const custPassword = c.password || 'password123';

                  const registered = isRegisteredCustomer(c);
                  const panelUser = isPanelBuyer(c);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {registered && (
                                <span title="Registered Shopper Account" className="inline-flex items-center">
                                  <BadgeCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">ID: {c.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.mobile}</span>
                        </p>
                        {c.email && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{c.email}</span>
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {registered ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <UserCheck className="w-3 h-3" />
                              <span>Registered</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              <span>Guest</span>
                            </span>
                          )}

                          {panelUser && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                              <Laptop className="w-3 h-3 text-purple-700" />
                              <span>Panel Purchaser</span>
                            </span>
                          )}
                        </div>
                        {c.panelPurchases && c.panelPurchases.length > 0 && (
                          <p className="text-[10px] font-semibold text-purple-700 mt-1 truncate max-w-[160px]" title={c.panelPurchases[0].panelName}>
                            💻 {c.panelPurchases[0].panelName}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md text-[11px] text-slate-700 font-semibold">
                            {isPassVisible ? custPassword : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(c.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title={isPassVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(custPassword, c.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 cursor-pointer"
                            title="Copy Password"
                          >
                            {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {c.wishlist && c.wishlist.length > 0 ? (
                          <button
                            onClick={() => setSelectedCustomer(c)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 cursor-pointer transition-colors shadow-2xs"
                            title="Click to view wishlisted items in detail"
                          >
                            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                            <span>{c.wishlist.length} {c.wishlist.length === 1 ? 'item' : 'items'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {actualOrderCount}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        ৳{actualSpent.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(c.createdAt || c.registeredAt || Date.now()).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.isBlocked
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {c.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Customer Profile (Name, Phone, Email, Address, Status)"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenResetModal(c)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedCustomer(c)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                            title="View Detailed Profile & Order History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (c.isBlocked) {
                                onToggleCustomerStatus(c.id);
                              } else {
                                setBlockingTarget(c);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              c.isBlocked
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={c.isBlocked ? 'Unblock Customer' : 'Block Customer'}
                          >
                            {c.isBlocked ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(c)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Customer Account (Orders Will Be Kept)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span>{selectedCustomer.name}</span>
                    {isPanelBuyer(selectedCustomer) && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500 text-white">
                        Panel Buyer
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedCustomer.mobile} • Registered ID: {selectedCustomer.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedCustomer)}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Edit Customer Details"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCustomer.isBlocked) {
                      onToggleCustomerStatus(selectedCustomer.id);
                    } else {
                      setBlockingTarget(selectedCustomer);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    selectedCustomer.isBlocked
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                  title={selectedCustomer.isBlocked ? 'Unblock Customer' : 'Block Customer'}
                >
                  {selectedCustomer.isBlocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{selectedCustomer.isBlocked ? 'Unblock' : 'Block'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenDeleteModal(selectedCustomer)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Delete Customer Account"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
                <button
                  onClick={handleCloseCustomerModal}
                  className="text-slate-400 hover:text-white cursor-pointer ml-1 p-1 rounded-md hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Wishlist Highlight Banner if customer has saved items */}
              {selectedCustomer.wishlist && selectedCustomer.wishlist.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
                      <Heart className="w-6 h-6 fill-white text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>Wishlist Activity Active</span>
                        <span className="px-2 py-0.5 rounded-full bg-white text-rose-600 text-[10px] font-black">
                          {selectedCustomer.wishlist.length} {selectedCustomer.wishlist.length === 1 ? 'Item' : 'Items'} Saved
                        </span>
                      </h4>
                      <p className="text-xs text-rose-100 mt-0.5">
                        This customer has saved products in their personal wishlist. Scroll down to view the full wishlist catalog.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Account Credentials & Security Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Customer Account Credentials</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleOpenResetModal(selectedCustomer)}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Password</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Email</span>
                    <span className="font-semibold text-slate-900 break-all">{selectedCustomer.email || 'N/A'}</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Mobile (Phone)</span>
                    <span className="font-semibold text-slate-900">{selectedCustomer.mobile}</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Current Password</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">
                        {visiblePasswords[selectedCustomer.id]
                          ? selectedCustomer.password || 'password123'
                          : '••••••••'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(selectedCustomer.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {visiblePasswords[selectedCustomer.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(selectedCustomer.password || 'password123', `modal-${selectedCustomer.id}`)}
                          className="p-1 text-slate-400 hover:text-sky-600 cursor-pointer"
                          title="Copy Password"
                        >
                          {copiedId === `modal-${selectedCustomer.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchased Panels / Website Subscriptions Section */}
              {isPanelBuyer(selectedCustomer) && (
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-purple-700" />
                    <span>Purchased Website / Admin Panels ({selectedCustomer.panelPurchases?.length || 1})</span>
                  </h4>
                  {selectedCustomer.panelPurchases && selectedCustomer.panelPurchases.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCustomer.panelPurchases.map((pnl) => (
                        <div key={pnl.id} className="p-3.5 rounded-xl bg-white border border-purple-200 text-xs space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900 text-sm">{pnl.panelName}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {pnl.status}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium">
                            Plan: <strong>{pnl.plan}</strong> • Purchased Date: <strong>{pnl.purchaseDate}</strong>
                          </p>
                          <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-purple-100 mt-1">
                            <span>Order Ref: <strong className="font-mono text-purple-700">#{pnl.orderId}</strong></span>
                            {pnl.domainOrSubdomain && (
                              <span>Domain: <strong className="text-slate-800">{pnl.domainOrSubdomain}</strong></span>
                            )}
                            <span className="font-black text-slate-900">৳{pnl.price.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-white border border-purple-200 text-xs">
                      <p className="font-bold text-slate-900">Purchased Web Services / Digital Package</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Customer has orders containing website setup / admin panel services on KenaX BD.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Addresses */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  Saved Shipping Addresses
                </h4>
                <div className="space-y-2">
                  {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 ? (
                    selectedCustomer.addresses.map((addr, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <p className="font-bold text-slate-800">{addr.fullAddress}</p>
                        <p className="text-slate-500 mt-0.5">
                          District: {addr.district} • Division: {addr.division}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl">No saved addresses on file.</p>
                  )}
                </div>
              </div>

              {/* Wishlist Items Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-2 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  <span>Customer Wishlist ({selectedCustomer.wishlist?.length || 0} Saved Items)</span>
                </h4>
                {!selectedCustomer.wishlist || selectedCustomer.wishlist.length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 text-center bg-slate-50 rounded-xl border border-slate-100">
                    No products added to wishlist by this customer yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedCustomer.wishlist.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-3 rounded-xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50/60 flex items-center gap-3 transition-colors"
                      >
                        <img
                          src={prod.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}
                          alt={prod.name}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                        />
                        <div className="flex-1 min-w-0 text-xs">
                          <h5 className="font-bold text-slate-900 truncate" title={prod.name}>
                            {prod.name}
                          </h5>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {prod.category} {prod.subcategory ? `• ${prod.subcategory}` : ''}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-rose-950">৳{prod.price.toLocaleString()}</span>
                              {prod.originalPrice && prod.originalPrice > prod.price && (
                                <span className="line-through text-slate-400 text-[10px]">
                                  ৳{prod.originalPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                (prod.stock || 0) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {(prod.stock || 0) > 0 ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-sky-600" />
                    Order History with KenaX BD ({getCustomerOrders(selectedCustomer.mobile).length})
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    🛡️ Order History Retained
                  </span>
                </div>
                {getCustomerOrders(selectedCustomer.mobile).length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 text-center bg-slate-50 rounded-xl">
                    No orders recorded for this phone number yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getCustomerOrders(selectedCustomer.mobile).map((o) => (
                      <div
                        key={o.id}
                        className="p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between hover:bg-slate-50"
                      >
                        <div>
                          <span className="font-mono font-bold text-sky-700">#{o.id}</span>
                          <span className="text-slate-400 ml-2">
                            {new Date(o.createdAt).toLocaleDateString('en-GB')}
                          </span>
                          <p className="text-slate-600 mt-0.5">
                            {(o.items || []).map((it: any) => `${it.productName || it.name || 'Product'} (${it.quantity})`).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">৳{o.totalAmount.toLocaleString()}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {o.orderStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-5 relative">
              <button
                onClick={() => setResetTarget(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-2">
                <KeyRound className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-black text-white">Reset Customer Password</h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Set a new login password for <strong>{resetTarget.name}</strong> ({resetTarget.mobile})
              </p>
            </div>

            <div className="p-6 space-y-4">
              {resetSuccessNotice && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resetSuccessNotice}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p>
                  <strong>Customer:</strong> {resetTarget.name}
                </p>
                <p>
                  <strong>Email:</strong> {resetTarget.email || 'None'}
                </p>
                <p>
                  <strong>Mobile:</strong> {resetTarget.mobile}
                </p>
                <p>
                  <strong>Current Password:</strong>{' '}
                  <span className="font-mono font-bold text-slate-800">
                    {resetTarget.password || 'password123'}
                  </span>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">New Password</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter new password (min 4 chars)"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetPassword}
                  disabled={!newPasswordInput.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  Save & Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Customer Confirmation Dialog */}
      {blockingTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Block Shopper Account?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Block <strong className="text-slate-800">{blockingTarget.name}</strong> ({blockingTarget.mobile}) from placing orders on KenaX BD.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Suspension</label>
              <textarea
                rows={2}
                value={blockReasonInput}
                onChange={(e) => setBlockReasonInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-5">
              <button
                onClick={() => setBlockingTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Profile Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 relative">
              <button
                onClick={() => setEditingCustomer(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-2">
                <Edit className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-black text-white">Edit Customer Profile</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Update details for <strong>{editingCustomer.name}</strong> ({editingCustomer.mobile})
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {editSuccessNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{editSuccessNotice}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Customer Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    placeholder="e.g. 01711223344"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="e.g. customer@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Delivery Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <textarea
                    rows={2}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="e.g. House #12, Road #4, Dhanmondi, Dhaka"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Account Status & Access
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="customer_status"
                      checked={!editIsBlocked}
                      onChange={() => setEditIsBlocked(false)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex items-center gap-1 text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Active (Allowed to order)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="customer_status"
                      checked={editIsBlocked}
                      onChange={() => setEditIsBlocked(true)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="flex items-center gap-1 text-rose-700">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Blocked (Restricted)
                    </span>
                  </label>
                </div>

                {editIsBlocked && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Reason for Blocking
                    </label>
                    <input
                      type="text"
                      value={editBlockReason}
                      onChange={(e) => setEditBlockReason(e.target.value)}
                      placeholder="e.g. Repeated cancellation of COD orders"
                      className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-xs text-rose-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomerEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-5 relative">
              <button
                onClick={() => setDeletingCustomer(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-2">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-black text-white">Delete Customer Account?</h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Remove customer profile for <strong>{deletingCustomer.name}</strong> ({deletingCustomer.mobile})
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Order History Remains 100% Safe</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Deleting this account removes the customer’s login record, but <strong>all pending orders, previous orders, and payment records ({getCustomerOrders(deletingCustomer.mobile).length} total orders)</strong> will NOT be deleted. They will remain securely preserved in your Admin Orders list and financial reports.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p>
                  <strong>Customer ID:</strong> <span className="font-mono">{deletingCustomer.id}</span>
                </p>
                <p>
                  <strong>Phone:</strong> {deletingCustomer.mobile}
                </p>
                <p>
                  <strong>Orders on Record:</strong> {getCustomerOrders(deletingCustomer.mobile).length} orders (৳{getCustomerOrders(deletingCustomer.mobile).reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()} spent)
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCustomer}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
