import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Clock,
  User,
  Phone,
  Mail,
  ExternalLink,
  Search,
  Filter,
  Eye,
  CheckCircle,
  AlertCircle,
  Package,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  X,
  Share2,
  Send,
  MessageCircle,
  Check,
  Copy,
  Trash2,
  PlusCircle,
  PhoneCall,
  FileText,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Monitor,
  Info,
  Calendar,
  Tag,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  UserCheck,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { CartActivity, CartActivityItem, UserRole, StaffUser } from '../../types';

interface AdminCartActivitiesProps {
  cartActivities: CartActivity[];
  currentRole: UserRole;
  currentStaff?: StaffUser | null;
  onRefresh?: () => void;
  onUpdateStatus?: (
    cartId: string,
    status: 'active' | 'converted' | 'abandoned' | 'contacted',
    extra?: {
      notes?: string;
      lastFollowUpBy?: string;
      lastFollowUpAt?: string;
      convertedByStaffId?: string;
      convertedByStaffName?: string;
      convertedByStaffRole?: string;
      [key: string]: any;
    }
  ) => void;
  onDeleteCart?: (cartId: string) => void;
  onConvertToOrder?: (cart: CartActivity) => void;
}

export const AdminCartActivities: React.FC<AdminCartActivitiesProps> = ({
  cartActivities = [],
  currentRole,
  currentStaff,
  onRefresh,
  onUpdateStatus,
  onDeleteCart,
  onConvertToOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'contacted' | 'converted' | 'abandoned'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'registered' | 'guest'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest_value' | 'most_items'>('newest');
  const [selectedCart, setSelectedCart] = useState<CartActivity | null>(null);
  const [expandedCartItems, setExpandedCartItems] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal note state
  const [modalNote, setModalNote] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<number>(1);
  const [recoveryMessage, setRecoveryMessage] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');

  const isStaff = ['super_admin', 'admin', 'manager', 'moderator'].includes(currentRole);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Cart activities updated with latest live sessions!');
    }, 600);
  };

  // Only consider valid cart activities that have 1 or more items (strictly ignore 0 item carts)
  const validCartActivities = useMemo(() => {
    return (cartActivities || []).filter(
      (cart) => cart && cart.items && cart.items.length > 0 && (cart.totalItems === undefined || cart.totalItems > 0)
    );
  }, [cartActivities]);

  // Filter & Sort
  const filteredCarts = useMemo(() => {
    const list = validCartActivities.filter((cart) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        cart.customerName.toLowerCase().includes(term) ||
        cart.customerEmail.toLowerCase().includes(term) ||
        (cart.customerPhone && cart.customerPhone.includes(term)) ||
        (cart.customerLocation && cart.customerLocation.toLowerCase().includes(term)) ||
        cart.items.some(
          (item) =>
            item.name.toLowerCase().includes(term) ||
            (item.sku && item.sku.toLowerCase().includes(term)) ||
            (item.category && item.category.toLowerCase().includes(term))
        );

      const matchesStatus = statusFilter === 'all' || cart.status === statusFilter;
      const matchesType = typeFilter === 'all' || cart.userType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });

    return list.sort((a, b) => {
      if (sortBy === 'highest_value') {
        return (b.totalAmount || 0) - (a.totalAmount || 0);
      }
      if (sortBy === 'most_items') {
        return (b.totalItems || 0) - (a.totalItems || 0);
      }
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [validCartActivities, searchTerm, statusFilter, typeFilter, sortBy]);

  // Metrics
  const totalCarts = validCartActivities.length;
  const activeCarts = validCartActivities.filter((c) => c.status === 'active');
  const contactedCarts = validCartActivities.filter((c) => c.status === 'contacted');
  const convertedCarts = validCartActivities.filter((c) => c.status === 'converted');
  const abandonedCarts = validCartActivities.filter((c) => c.status === 'abandoned');
  const totalActiveValue = activeCarts.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const conversionRate = totalCarts > 0 ? Math.round((convertedCarts.length / totalCarts) * 100) : 0;

  const getStatusBadge = (status: 'active' | 'converted' | 'abandoned' | 'contacted') => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Active in Cart
          </span>
        );
      case 'contacted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
            <PhoneCall className="w-3 h-3 text-purple-600" />
            Contacted
          </span>
        );
      case 'converted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">
            <CheckCircle className="w-3 h-3 text-sky-600" />
            Converted
          </span>
        );
      case 'abandoned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Abandoned
          </span>
        );
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return isoString;
    }
  };

  const generateWhatsAppMessage = (cart: CartActivity, templateIndex = 1) => {
    const customerName = cart.customerName.replace(/\(.*\)/, '').trim() || 'Valued Customer';
    const firstItem = cart.items[0]?.name || 'Cart item';
    const otherCount = cart.items.length > 1 ? ` and ${cart.items.length - 1} more items` : '';
    const totalAmount = (cart.totalAmount || 0).toLocaleString('en-BD');

    if (templateIndex === 1) {
      // Assistance Template
      return `Hello ${customerName}! Greetings from KenaX BD.\n\nWe noticed you added "${firstItem}"${otherCount} (Total ৳ ${totalAmount}) to your cart.\n\nWould you like any assistance completing your order with Cash on Delivery? We are here to help! Thank you.`;
    } else if (templateIndex === 2) {
      // Special Offer / Discount Template
      return `Hello ${customerName}!\n\nSpecial delivery discount offer is active today for "${firstItem}"${otherCount} in your KenaX BD cart.\n\nConfirm now for fast home delivery! Reply with your delivery address and phone number.\n- KenaX BD Support`;
    } else {
      // Stock Alert Reminder Template
      return `Hello ${customerName},\n\nStock is limited for "${firstItem}" in your KenaX BD cart. Complete your order now to secure fast delivery.\n\nReply if you need assistance. KenaX BD`;
    }
  };

  const handleOpenWhatsApp = (cart: CartActivity, customTextOrTemplate?: string | number) => {
    if (!cart.customerPhone) {
      showToast('No phone number found for this customer.');
      return;
    }
    const cleanPhone = cart.customerPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('880') ? cleanPhone : cleanPhone.startsWith('0') ? `88${cleanPhone}` : `880${cleanPhone}`;
    
    let textToSend = '';
    if (typeof customTextOrTemplate === 'string') {
      textToSend = customTextOrTemplate;
    } else if (typeof customTextOrTemplate === 'number') {
      textToSend = generateWhatsAppMessage(cart, customTextOrTemplate);
    } else {
      textToSend = recoveryMessage || generateWhatsAppMessage(cart, activeTemplate);
    }

    const message = encodeURIComponent(textToSend);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');

    if (onUpdateStatus && cart.status === 'active') {
      onUpdateStatus(cart.id, 'contacted', {
        notes: `WhatsApp Follow-up initiated by ${currentStaff?.name || 'Staff'}`,
        lastFollowUpBy: currentStaff?.name || 'Staff',
        lastFollowUpAt: new Date().toISOString(),
      });
      if (selectedCart && selectedCart.id === cart.id) {
        setSelectedCart({
          ...selectedCart,
          status: 'contacted',
          lastFollowUpBy: currentStaff?.name || 'Staff',
          lastFollowUpAt: new Date().toISOString(),
        });
      }
    }
    showToast('WhatsApp chat opened!');
  };

  const handleSendEmail = (cart: CartActivity) => {
    const targetEmail = recipientEmail.trim() || cart.customerEmail?.trim();
    if (!targetEmail) {
      showToast('No email address found for this user. Please enter an email address.');
      return;
    }
    const textToSend = recoveryMessage || generateWhatsAppMessage(cart, activeTemplate);
    const subject = encodeURIComponent(emailSubject.trim() || `KenaX BD - Items in your cart`);
    const body = encodeURIComponent(textToSend);
    const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${subject}&body=${body}`;

    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onUpdateStatus && cart.status === 'active') {
      onUpdateStatus(cart.id, 'contacted', {
        notes: `Recovery Email initiated by ${currentStaff?.name || 'Staff'} to ${targetEmail}`,
        lastFollowUpBy: currentStaff?.name || 'Staff',
        lastFollowUpAt: new Date().toISOString(),
      });
      if (selectedCart && selectedCart.id === cart.id) {
        setSelectedCart({
          ...selectedCart,
          status: 'contacted',
          lastFollowUpBy: currentStaff?.name || 'Staff',
          lastFollowUpAt: new Date().toISOString(),
        });
      }
    }
    showToast(`Email application launched (${targetEmail})!`);
  };

  const handleCopyRecoveryMessage = () => {
    if (!recoveryMessage) return;
    navigator.clipboard.writeText(recoveryMessage);
    showToast('Recovery message copied to clipboard!');
  };

  const handleCopyCartSummary = (cart: CartActivity) => {
    const itemsText = cart.items
      .map((it) => `• ${it.name} (Qty: ${it.quantity}, Price: ৳${it.price.toLocaleString('en-BD')}${it.sku ? `, SKU: ${it.sku}` : ''})`)
      .join('\n');
    const summary = `🛒 KenaX BD Cart Activity Summary\nCustomer: ${cart.customerName}\nPhone: ${cart.customerPhone || 'N/A'}\nEmail: ${cart.customerEmail || 'N/A'}\nTotal Amount: ৳${cart.totalAmount.toLocaleString('en-BD')} (${cart.totalItems} items)\nStatus: ${cart.status}\n\nProducts:\n${itemsText}`;

    navigator.clipboard.writeText(summary);
    setCopiedId(cart.id);
    showToast('Cart summary copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenModal = (cart: CartActivity) => {
    setSelectedCart(cart);
    setModalNote(cart.notes || '');
    setActiveTemplate(1);
    const initialMsg = generateWhatsAppMessage(cart, 1);
    setRecoveryMessage(initialMsg);
    setRecipientEmail(cart.customerEmail || '');
    const firstItem = cart.items[0]?.name || 'items';
    setEmailSubject(`KenaX BD - Assistance regarding "${firstItem}" in your cart`);
  };

  const handleSelectTemplate = (templateIdx: number) => {
    setActiveTemplate(templateIdx);
    if (selectedCart) {
      const msg = generateWhatsAppMessage(selectedCart, templateIdx);
      setRecoveryMessage(msg);
    }
  };

  const handleSaveModalNote = () => {
    if (!selectedCart || !onUpdateStatus) return;
    onUpdateStatus(selectedCart.id, selectedCart.status, {
      notes: modalNote,
      lastFollowUpBy: currentStaff?.name || 'Staff',
      lastFollowUpAt: new Date().toISOString(),
    });
    setSelectedCart({
      ...selectedCart,
      notes: modalNote,
      lastFollowUpBy: currentStaff?.name || 'Staff',
      lastFollowUpAt: new Date().toISOString(),
    });
    showToast('Follow-up note saved successfully!');
  };

  const handleDirectConvertToOrder = (cart: CartActivity) => {
    if (onConvertToOrder) {
      const staffName = currentStaff?.name || 'Super Admin';
      const staffRole = currentStaff?.role || currentRole || 'super_admin';
      const updatedCart: CartActivity = {
        ...cart,
        status: 'converted',
        convertedByStaffId: currentStaff?.id || 'staff-root',
        convertedByStaffName: staffName,
        convertedByStaffRole: staffRole,
        lastFollowUpBy: staffName,
        lastFollowUpAt: new Date().toISOString(),
      };
      if (onUpdateStatus) {
        onUpdateStatus(cart.id, 'converted', {
          notes: `Converted to order by ${staffName} (${staffRole})`,
          lastFollowUpBy: staffName,
          lastFollowUpAt: new Date().toISOString(),
          convertedByStaffId: currentStaff?.id || 'staff-root',
          convertedByStaffName: staffName,
          convertedByStaffRole: staffRole,
        });
      }
      onConvertToOrder(updatedCart);
      showToast(`Cart successfully converted to Store Order by ${staffName}!`);
      if (selectedCart?.id === cart.id) {
        setSelectedCart(null);
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-sky-500 to-blue-600 text-white rounded-xl shadow-xs shadow-sky-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Cart Activities & Live Sessions
              </h1>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh live cart stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
            Role: {currentRole.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Metrics Row (Compact KPI Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Carts</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-2">{activeCarts.length}</p>
          <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <Flame className="w-3 h-3" /> Live shoppers right now
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-sky-200 transition-colors">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Live Cart Value</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            ৳ {totalActiveValue.toLocaleString('en-BD')}
          </p>
          <p className="text-[10px] text-slate-500 font-medium mt-1">Potential active sales in cart</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Followed Up</span>
            <PhoneCall className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-700 mt-2">{contactedCarts.length}</p>
          <p className="text-[10px] text-purple-600 font-bold mt-1">Customer contacted by staff</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Converted</span>
            <CheckCircle className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-xl sm:text-2xl font-black text-sky-600">{convertedCarts.length}</p>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800">
              {conversionRate}% rate
            </span>
          </div>
          <p className="text-[10px] text-sky-700 font-medium mt-1">Converted to confirmed orders</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-amber-200 transition-colors col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Abandoned</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 mt-2">{abandonedCarts.length}</p>
          <p className="text-[10px] text-amber-700 font-medium mt-1">High recovery opportunity</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col gap-3">
        {/* Top Filter Tabs with Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>All Carts</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/50 text-current">
              {totalCarts}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
            <span>Active</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
              {activeCarts.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('contacted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'contacted'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-purple-700 hover:bg-purple-50'
            }`}
          >
            <PhoneCall className="w-3 h-3" />
            <span>Contacted</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800">
              {contactedCarts.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('converted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'converted'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-sky-700 hover:bg-sky-50'
            }`}
          >
            <CheckCircle className="w-3 h-3" />
            <span>Converted</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800">
              {convertedCarts.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('abandoned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              statusFilter === 'abandoned'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>Abandoned</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
              {abandonedCarts.length}
            </span>
          </button>
        </div>

        {/* Search & Secondary Dropdowns */}
        <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, phone, email, SKU, product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 bg-slate-50/50 focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-row items-center gap-2 w-full md:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="flex-1 md:flex-none px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-700 bg-white cursor-pointer focus:outline-hidden focus:border-sky-500 min-w-0"
            >
              <option value="all">All Visitors & Customers</option>
              <option value="registered">Registered Customers Only</option>
              <option value="guest">Guest Visitors Only</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 md:flex-none px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-700 bg-white cursor-pointer focus:outline-hidden focus:border-sky-500 min-w-0"
            >
              <option value="newest">Sort: Newest Activity First</option>
              <option value="highest_value">Sort: Highest Cart Value</option>
              <option value="most_items">Sort: Most Items Count</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cart Activities Table & Mobile Responsive Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {filteredCarts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Cart Activities Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'No cart sessions match your filter criteria. Try clearing search or filters.'
                : 'When shoppers add products to their cart on the website, their live cart details, products, and contact info will appear here in real-time.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Customer & User Info</th>
                    <th className="py-3 px-4">Products in Cart</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-4">Status & Switcher</th>
                    <th className="py-3 px-4 text-right">Direct Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredCarts.map((cart) => {
                    const isExpanded = expandedCartItems[cart.id];
                    const itemsToShow = isExpanded ? cart.items : cart.items.slice(0, 2);
                    const hasMoreItems = cart.items.length > 2;

                    return (
                      <tr key={cart.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Customer / User Info */}
                        <td className="py-3.5 px-4 align-top min-w-[210px]">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 mt-0.5 shadow-2xs border ${
                                cart.userType === 'registered'
                                  ? 'bg-sky-100 text-sky-800 border-sky-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {cart.customerName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-slate-900 text-xs truncate max-w-[140px]" title={cart.customerName}>
                                  {cart.customerName}
                                </span>
                                <span
                                  className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                                    cart.userType === 'registered'
                                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {cart.userType === 'registered' ? 'Registered' : 'Guest'}
                                </span>
                              </div>

                              {/* Contact Details with 1-Click Quick Actions */}
                              <div className="mt-1 space-y-0.5">
                                {cart.customerPhone ? (
                                  <div className="flex items-center gap-1.5">
                                    <a
                                      href={`tel:${cart.customerPhone}`}
                                      className="font-bold text-slate-900 hover:text-sky-600 flex items-center gap-1 text-[11px]"
                                      title="Call Customer"
                                    >
                                      <Phone className="w-3 h-3 text-emerald-600" />
                                      {cart.customerPhone}
                                    </a>
                                    <button
                                      onClick={() => handleOpenWhatsApp(cart, 1)}
                                      className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                                      title="Send WhatsApp Recovery Message"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">No phone provided</span>
                                )}

                                {cart.customerEmail && (
                                  <span className="text-[10px] text-slate-500 truncate block max-w-[170px]" title={cart.customerEmail}>
                                    {cart.customerEmail}
                                  </span>
                                )}

                                {cart.customerLocation && (
                                  <span className="text-[10px] font-medium text-slate-600 block">
                                    📍 {cart.customerLocation}
                                  </span>
                                )}

                                {cart.notes && (
                                  <div className="mt-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-medium truncate max-w-[180px]" title={cart.notes}>
                                    📝 {cart.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Products in Cart (Formatted for 2+ items) */}
                        <td className="py-3.5 px-4 align-top max-w-sm min-w-[290px]">
                          {cart.items.length >= 2 && (
                            <div className="flex items-center justify-between gap-1 mb-1.5 px-2 py-0.5 rounded-md bg-sky-50/80 border border-sky-100 text-[10px] font-bold text-sky-800">
                              <span>📦 {cart.items.length} Products Stack</span>
                              <span>Total: {cart.totalItems} Qty</span>
                            </div>
                          )}
                          <div className="space-y-1.5">
                            {itemsToShow.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between gap-2 bg-slate-50/90 hover:bg-white p-2 rounded-xl border border-slate-200/80 transition-colors shadow-2xs"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {cart.items.length >= 2 && (
                                    <span className="w-4 h-4 rounded-md bg-slate-200/70 text-slate-700 font-black text-[9px] flex items-center justify-center shrink-0">
                                      #{idx + 1}
                                    </span>
                                  )}
                                  <img
                                    src={item.image || 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=100'}
                                    alt={item.name}
                                    className="w-8 h-8 rounded-lg object-cover bg-white shrink-0 border border-slate-200"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-900 truncate text-[11px]" title={item.name}>
                                      {item.name}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                      <span className="font-black text-slate-800">
                                        ৳ {item.price.toLocaleString('en-BD')}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded-md bg-sky-100/70 text-sky-800 font-bold text-[9px] border border-sky-200/60 shrink-0">
                                        Qty: {item.quantity}
                                      </span>
                                      {item.sku && (
                                        <span className="px-1 py-0.2 rounded bg-slate-100 font-mono text-[9px] text-slate-600 shrink-0">
                                          #{item.sku}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Staff Supplier Link */}
                                {isStaff && item.supplierUrl && (
                                  <a
                                    href={item.supplierUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 shrink-0 transition-all flex items-center gap-1 text-[10px] font-bold shadow-2xs"
                                    title="Staff Only: Supplier / Sourcing Page (AliExpress/Alibaba)"
                                  >
                                    <ExternalLink className="w-3 h-3 text-amber-700" />
                                    <span className="text-[9px] hidden lg:inline">Source</span>
                                  </a>
                                )}
                              </div>
                            ))}

                            {hasMoreItems && (
                              <button
                                onClick={() =>
                                  setExpandedCartItems((prev) => ({
                                    ...prev,
                                    [cart.id]: !prev[cart.id],
                                  }))
                                }
                                className="w-full py-1 text-[10px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50/60 hover:bg-sky-50 rounded-lg border border-sky-100 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3 h-3" /> Show fewer items
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3" /> +{cart.items.length - 2} more products in cart
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Total Amount & Items */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div>
                            <span className="text-sm font-black text-slate-900 block tracking-tight">
                              ৳ {cart.totalAmount.toLocaleString('en-BD')}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 mt-0.5 inline-block">
                              {cart.totalItems} item{cart.totalItems > 1 ? 's' : ''}
                            </span>
                          </div>
                        </td>

                        {/* Last Activity Time */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-[11px] text-slate-800">
                              {formatRelativeTime(cart.updatedAt || cart.createdAt)}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {new Date(cart.updatedAt || cart.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        {/* Status & In-place Switcher */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <div className="space-y-1.5">
                            {getStatusBadge(cart.status)}

                            {cart.status === 'converted' && (
                              <div className="mt-1 flex items-center gap-1 flex-wrap max-w-[150px]">
                                <span className="text-[9px] text-slate-400 font-medium">Converted by:</span>
                                <span className="text-[10px] font-bold text-slate-800 truncate">
                                  {cart.convertedByStaffName || cart.lastFollowUpBy || 'Staff'}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 rounded-md text-[8px] font-extrabold uppercase tracking-tight ${
                                    (cart.convertedByStaffRole || currentRole) === 'super_admin'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : (cart.convertedByStaffRole || currentRole) === 'manager'
                                      ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {(cart.convertedByStaffRole || currentRole) === 'super_admin'
                                    ? 'Super Admin'
                                    : (cart.convertedByStaffRole || currentRole) === 'manager'
                                    ? 'Manager'
                                    : 'Moderator'}
                                </span>
                              </div>
                            )}

                            {onUpdateStatus && (
                              <div>
                                <select
                                  value={cart.status}
                                  onChange={(e) =>
                                    onUpdateStatus(cart.id, e.target.value as any, {
                                      lastFollowUpBy: currentStaff?.name || 'Staff',
                                      lastFollowUpAt: new Date().toISOString(),
                                      convertedByStaffId: e.target.value === 'converted' ? currentStaff?.id || 'staff-root' : undefined,
                                      convertedByStaffName: e.target.value === 'converted' ? currentStaff?.name || 'Staff' : undefined,
                                      convertedByStaffRole: e.target.value === 'converted' ? currentStaff?.role || currentRole || 'super_admin' : undefined,
                                    })
                                  }
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-slate-200 bg-white text-slate-700 cursor-pointer block hover:border-slate-300"
                                >
                                  <option value="active">🟢 Active</option>
                                  <option value="contacted">🟣 Contacted</option>
                                  <option value="converted">🔵 Converted</option>
                                  <option value="abandoned">🟡 Abandoned</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Direct Actions */}
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Modal */}
                            <button
                              onClick={() => handleOpenModal(cart)}
                              className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-sky-200 shadow-2xs"
                              title="View Full Details & Follow-up"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Details</span>
                            </button>

                            {/* WhatsApp Lead Button */}
                            {cart.customerPhone && (
                              <button
                                onClick={() => handleOpenWhatsApp(cart, 1)}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-emerald-200 shadow-2xs"
                                title="Send WhatsApp Recovery Message"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </button>
                            )}

                            {/* Convert to Order */}
                            {onConvertToOrder && cart.status !== 'converted' && (
                              <button
                                onClick={() => handleDirectConvertToOrder(cart)}
                                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title="Convert this cart into an official order"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Make Order</span>
                              </button>
                            )}

                            {/* Copy Summary */}
                            <button
                              onClick={() => handleCopyCartSummary(cart)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200"
                              title="Copy Summary"
                            >
                              {copiedId === cart.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* Delete */}
                            {onDeleteCart && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to remove the cart session for ${cart.customerName}?`)) {
                                    onDeleteCart(cart.id);
                                    showToast('Cart session removed.');
                                  }
                                }}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete Session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Card Grid View (Shown on Mobile screens < md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredCarts.map((cart) => {
                const isExpanded = expandedCartItems[cart.id];
                const itemsToShow = isExpanded ? cart.items : cart.items.slice(0, 2);
                const hasMoreItems = cart.items.length > 2;

                return (
                  <div key={cart.id} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors">
                    {/* Header: Customer Info & Status */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-2xs border ${
                            cart.userType === 'registered'
                              ? 'bg-sky-100 text-sky-800 border-sky-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {cart.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-slate-900 text-xs truncate max-w-[130px]">{cart.customerName}</span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                                cart.userType === 'registered'
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {cart.userType === 'registered' ? 'Registered' : 'Guest'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formatRelativeTime(cart.updatedAt || cart.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {getStatusBadge(cart.status)}
                        <span className="text-xs font-black text-slate-900">৳ {cart.totalAmount.toLocaleString('en-BD')}</span>
                      </div>
                    </div>

                    {/* Quick Contact Bar */}
                    {(cart.customerPhone || cart.customerEmail || cart.customerLocation) && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                        {cart.customerPhone ? (
                          <div className="flex items-center gap-2">
                            <a href={`tel:${cart.customerPhone}`} className="font-bold text-slate-900 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              {cart.customerPhone}
                            </a>
                            <button
                              onClick={() => handleOpenWhatsApp(cart, 1)}
                              className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No phone</span>
                        )}

                        {cart.customerLocation && (
                          <span className="text-[10px] font-medium text-slate-600 truncate max-w-[120px]">
                            📍 {cart.customerLocation}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Products List (Specially structured for 2+ products) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-600">
                        <span>Products in Cart ({cart.items.length})</span>
                        <span className="text-sky-700 font-bold bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                          {cart.totalItems} Items total
                        </span>
                      </div>

                      <div className="space-y-1.5 bg-slate-50/90 p-2 rounded-xl border border-slate-200/80">
                        {itemsToShow.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                            {cart.items.length >= 2 && (
                              <span className="w-4 h-4 rounded-md bg-slate-100 text-slate-600 text-[9px] font-black flex items-center justify-center shrink-0 border border-slate-200 mt-0.5">
                                #{idx + 1}
                              </span>
                            )}
                            <img
                              src={item.image || 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=100'}
                              alt={item.name}
                              className="w-9 h-9 rounded-md object-cover bg-slate-50 border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 text-xs truncate" title={item.name}>{item.name}</p>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                <span className="font-black text-slate-900">৳ {item.price.toLocaleString('en-BD')}</span>
                                <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-bold text-[9px]">
                                  Qty: {item.quantity}
                                </span>
                                {item.sku && (
                                  <span className="px-1 py-0.2 rounded bg-slate-100 font-mono text-[9px] text-slate-600">#{item.sku}</span>
                                )}
                              </div>
                            </div>

                            {isStaff && item.supplierUrl && (
                              <a
                                href={item.supplierUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 shrink-0 text-[9px] font-bold flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3 text-amber-700" /> Source
                              </a>
                            )}
                          </div>
                        ))}

                        {hasMoreItems && (
                          <button
                            onClick={() => setExpandedCartItems((prev) => ({ ...prev, [cart.id]: !prev[cart.id] }))}
                            className="w-full py-1 text-[10px] font-bold text-sky-600 hover:text-sky-700 bg-sky-50 rounded-lg border border-sky-200/80 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            {isExpanded ? (
                              <><ChevronUp className="w-3 h-3" /> Show fewer products</>
                            ) : (
                              <><ChevronDown className="w-3 h-3" /> +{cart.items.length - 2} more products</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      {onUpdateStatus && (
                        <select
                          value={cart.status}
                          onChange={(e) =>
                            onUpdateStatus(cart.id, e.target.value as any, {
                              lastFollowUpBy: currentStaff?.name || 'Staff',
                              lastFollowUpAt: new Date().toISOString(),
                            })
                          }
                          className="text-[11px] font-bold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 cursor-pointer"
                        >
                          <option value="active">🟢 Active</option>
                          <option value="contacted">🟣 Contacted</option>
                          <option value="converted">🔵 Converted</option>
                          <option value="abandoned">🟡 Abandoned</option>
                        </select>
                      )}

                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => handleOpenModal(cart)}
                          className="px-2 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold text-[11px] flex items-center gap-1 border border-sky-200"
                        >
                          <Eye className="w-3 h-3" /> Details
                        </button>
                        {onConvertToOrder && cart.status !== 'converted' && (
                          <button
                            onClick={() => handleDirectConvertToOrder(cart)}
                            className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs"
                          >
                            <Check className="w-3 h-3" /> Make Order
                          </button>
                        )}
                        <button
                          onClick={() => handleCopyCartSummary(cart)}
                          className="p-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {copiedId === cart.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Cart Detail Modal */}
      {selectedCart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-sky-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500 text-white shadow-xs">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{selectedCart.customerName}</h3>
                    {getStatusBadge(selectedCart.status)}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Session ID: <span className="font-mono">{selectedCart.id}</span> • {selectedCart.userType === 'registered' ? 'Registered Customer' : 'Guest Visitor'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCart(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Customer Contact Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Customer Information
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                    {selectedCart.userType === 'registered' ? 'Registered' : 'Guest Session'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Full Name</span>
                    <span className="font-black text-slate-900">{selectedCart.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contact Mobile</span>
                    <span className="font-black text-slate-900">{selectedCart.customerPhone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email Address</span>
                    <span className="font-medium text-slate-800">{selectedCart.customerEmail || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Location / Address</span>
                    <span className="font-medium text-slate-800">{selectedCart.customerLocation || 'Dhaka / Online visitor'}</span>
                  </div>
                </div>

                {/* Direct Action Phone & WhatsApp Buttons (Single responsive row) */}
                {selectedCart.customerPhone && (
                  <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-3 gap-1.5 w-full">
                    <a
                      href={`tel:${selectedCart.customerPhone}`}
                      className="px-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 transition-colors shadow-2xs text-center truncate"
                    >
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Call Customer</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(selectedCart, activeTemplate)}
                      className="px-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer text-center truncate"
                    >
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCartSummary(selectedCart)}
                      className="px-2 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer text-center truncate"
                    >
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Copy Summary</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Products Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Products in Cart ({selectedCart.items.length})
                  </h4>
                  <span className="text-xs font-black text-slate-900">
                    Total: ৳ {selectedCart.totalAmount.toLocaleString('en-BD')}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {selectedCart.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-sky-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={item.image || 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=100'}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-50 border border-slate-100 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h5 className="font-black text-slate-900 text-xs truncate" title={item.name}>
                            {item.name}
                          </h5>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 mt-1">
                            {item.sku && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-bold text-slate-700 border border-slate-200/60 shrink-0">
                                SKU: {item.sku}
                              </span>
                            )}
                            {item.category && (
                              <span className="font-semibold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded shrink-0">
                                {item.category}
                              </span>
                            )}
                            <span className="text-slate-400">• Added {formatRelativeTime(item.addedAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing, Quantity and Sourcing Link clearly separated without overlap */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <div className="flex items-center gap-1.5 sm:justify-end">
                            <span className="text-xs font-black text-slate-900">
                              ৳ {item.price.toLocaleString('en-BD')}
                            </span>
                            <span className="text-[10px] font-black text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/80">
                              Qty: {item.quantity}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 block sm:text-right mt-0.5">
                            Total: ৳ {(item.price * item.quantity).toLocaleString('en-BD')}
                          </span>
                        </div>

                        {isStaff && item.supplierUrl && (
                          <a
                            href={item.supplierUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold transition-all shadow-2xs shrink-0"
                            title="Open Dropshipping / Supplier Source Link"
                          >
                            <ExternalLink className="w-3 h-3 text-amber-700" />
                            <span>Source Link ↗</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recovery Message Center (WhatsApp & Email Support with Editable Message Box) */}
              <div className="bg-gradient-to-br from-emerald-50/70 via-sky-50/40 to-blue-50/70 p-4 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2.5">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="p-1 rounded-md bg-emerald-600 text-white">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </span>
                        <span className="p-1 rounded-md bg-sky-600 text-white">
                          <Mail className="w-3.5 h-3.5" />
                        </span>
                      </div>
                      <span>Customer Recovery & Follow-up Center</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Edit message and send directly to customer via WhatsApp or Email.
                    </p>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                    Live Recovery System
                  </span>
                </div>

                {/* Template Quick Selectors (3 items aligned in 1 single row) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    1. Select Quick Template:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate(1)}
                      className={`px-1.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                        activeTemplate === 1
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800'
                      }`}
                    >
                      <span className="truncate">1. Help & Support</span>
                      {activeTemplate === 1 && <Check className="w-3 h-3 shrink-0 hidden sm:inline" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate(2)}
                      className={`px-1.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                        activeTemplate === 2
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800'
                      }`}
                    >
                      <span className="truncate">2. Discount & Delivery</span>
                      {activeTemplate === 2 && <Check className="w-3 h-3 shrink-0 hidden sm:inline" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate(3)}
                      className={`px-1.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold text-center transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                        activeTemplate === 3
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800'
                      }`}
                    >
                      <span className="truncate">3. Limited Stock Alert</span>
                      {activeTemplate === 3 && <Check className="w-3 h-3 shrink-0 hidden sm:inline" />}
                    </button>
                  </div>
                </div>

                {/* Email Subject & Target Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white/80 p-2.5 rounded-xl border border-slate-200/80">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-sky-600" />
                      <span>Customer Recipient Email:</span>
                    </label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="e.g. customer@example.com"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-sky-500 font-medium text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-500" />
                      <span>Email Subject:</span>
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Enter email subject..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-sky-500 font-medium text-slate-900"
                    />
                  </div>
                </div>

                {/* Editable Message Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <span>2. Editable Recovery Message:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectTemplate(activeTemplate)}
                        className="text-[10px] font-bold text-sky-600 hover:text-sky-700 cursor-pointer flex items-center gap-0.5"
                        title="Reset message to selected template defaults"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Reset
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyRecoveryMessage}
                        className="text-[10px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200"
                      >
                        <Copy className="w-2.5 h-2.5" /> Copy Message
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={recoveryMessage}
                    onChange={(e) => setRecoveryMessage(e.target.value)}
                    rows={5}
                    placeholder="Type or edit your message here..."
                    className="w-full p-3 bg-white rounded-xl border border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs text-slate-800 font-sans focus:outline-hidden transition-all shadow-xs leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
                    <span>💡 This message can be sent via WhatsApp or Email.</span>
                    <span>{recoveryMessage.length} characters</span>
                  </div>
                </div>

                {/* Sending Action Buttons (Single responsive row on mobile) */}
                <div className="grid grid-cols-2 gap-2 pt-1 w-full">
                  {/* WhatsApp Follow-up Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(selectedCart, recoveryMessage)}
                    className="w-full py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-[11px] sm:text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow-md text-center truncate"
                    title="Launch WhatsApp Chat with Customer using this message"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate">Send WhatsApp</span>
                  </button>

                  {/* Send Email Button */}
                  <button
                    type="button"
                    onClick={() => handleSendEmail(selectedCart)}
                    className="w-full py-2.5 px-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 active:from-sky-800 text-white font-bold text-[11px] sm:text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow-md text-center truncate"
                    title="Send this recovery message to customer email"
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">Send Email</span>
                  </button>
                </div>
              </div>

              {/* Staff Follow-up Note */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Staff Follow-up Notes
                </h4>
                <textarea
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Add internal notes (e.g. 'Customer will confirm after 6 PM', 'Wants 2 units with black color')..."
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-sky-500"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {selectedCart.lastFollowUpBy ? `Last updated by ${selectedCart.lastFollowUpBy}` : 'Visible to all staff'}
                  </span>
                  <button
                    onClick={handleSaveModalNote}
                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    Save Note
                  </button>
                </div>
              </div>

              {/* Status Switcher & Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block">Total Cart Value</span>
                  <span className="text-xl font-black text-white">
                    ৳ {selectedCart.totalAmount.toLocaleString('en-BD')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {onUpdateStatus && (
                    <>
                      <button
                        onClick={() => {
                          onUpdateStatus(selectedCart.id, 'active');
                          setSelectedCart({ ...selectedCart, status: 'active' });
                          showToast('Status marked as Active');
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          selectedCart.status === 'active'
                            ? 'bg-emerald-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => {
                          onUpdateStatus(selectedCart.id, 'contacted');
                          setSelectedCart({ ...selectedCart, status: 'contacted' });
                          showToast('Status marked as Contacted');
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          selectedCart.status === 'contacted'
                            ? 'bg-purple-500 text-white font-black'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Contacted
                      </button>
                      <button
                        onClick={() => {
                          onUpdateStatus(selectedCart.id, 'converted');
                          setSelectedCart({ ...selectedCart, status: 'converted' });
                          showToast('Status marked as Converted');
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          selectedCart.status === 'converted'
                            ? 'bg-sky-500 text-white font-black'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Converted
                      </button>
                      <button
                        onClick={() => {
                          onUpdateStatus(selectedCart.id, 'abandoned');
                          setSelectedCart({ ...selectedCart, status: 'abandoned' });
                          showToast('Status marked as Abandoned');
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          selectedCart.status === 'abandoned'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        Abandoned
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              {onConvertToOrder && selectedCart.status !== 'converted' ? (
                <button
                  onClick={() => handleDirectConvertToOrder(selectedCart)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" /> Convert to Official Store Order
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-medium">Session recorded</span>
              )}

              <button
                onClick={() => setSelectedCart(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
