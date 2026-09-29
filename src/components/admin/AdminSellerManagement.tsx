import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Copy,
  Check,
  Edit,
  Trash2,
  LogIn,
  X,
  Save,
  ShieldCheck,
  Calendar,
  AlertCircle,
  BadgeCheck,
  RefreshCw,
  Sparkles,
  DollarSign,
  Layers,
  CreditCard,
  Building2,
} from 'lucide-react';
import { PartnerUser, PartnerPayout } from '../../types';
import {
  getPartnersFromStorage,
  savePartnersToStorage,
  getPayoutsFromStorage,
  savePayoutsToStorage,
} from '../../lib/partnerStorage';
import { getSellers, saveSellers } from '../../lib/sellerStorage';
import { AdminSellerPlans } from './AdminSellerPlans';
import { useLanguage } from '../../context/LanguageContext';

export type SellerSubTab =
  | 'all'
  | 'pending'
  | 'subscriptions'
  | 'renewals'
  | 'plans'
  | 'payouts';

interface AdminSellerManagementProps {
  onLoginAsPartner?: (partner: PartnerUser) => void;
  initialTab?: SellerSubTab;
  onNavigateToPermissionMatrix?: () => void;
}

export const AdminSellerManagement: React.FC<AdminSellerManagementProps> = ({
  onLoginAsPartner,
  initialTab = 'all',
  onNavigateToPermissionMatrix,
}) => {
  const { language, t } = useLanguage();
  const isBn = language === 'bn';

  const [partners, setPartners] = useState<PartnerUser[]>(() => getPartnersFromStorage());
  const [payouts, setPayouts] = useState<PartnerPayout[]>(() => getPayoutsFromStorage());
  const [activeTab, setActiveTab] = useState<SellerSubTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    setPartners(getPartnersFromStorage());
    setPayouts(getPayoutsFromStorage());
  }, []);

  // Edit Seller Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<PartnerUser | null>(null);
  const [editFormData, setSubEditFormData] = useState({
    name: '',
    shopName: '',
    phone: '',
    email: '',
    planId: 'standard',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    status: 'active' as 'active' | 'pending' | 'suspended',
    subscriptionStatus: 'active' as 'active' | 'expired' | 'pending_renewal' | 'trial',
    expiryDate: '',
    commissionRate: '9',
    bkash: '',
  });

  // Add Seller Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSellerForm, setNewSellerForm] = useState({
    name: '',
    shopName: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    planId: 'standard',
    commissionRate: '9',
    city: 'Dhaka',
    address: '',
    bkash: '',
  });

  // Filter only sellers
  const allSellers = useMemo(
    () => partners.filter((p) => p.type === 'seller'),
    [partners]
  );

  const pendingSellersCount = useMemo(
    () => allSellers.filter((s) => s.status === 'pending' || (s.status as any) === 'pending_approval').length,
    [allSellers]
  );

  const pendingRenewalsCount = useMemo(
    () => allSellers.filter((s) => s.subscriptionStatus === 'pending_renewal' || (s.subscriptionEndDate && new Date(s.subscriptionEndDate).getTime() < Date.now())).length,
    [allSellers]
  );

  const sellerPayouts = useMemo(
    () => payouts.filter((p) => p.partnerType === 'seller'),
    [payouts]
  );

  const pendingPayoutsCount = useMemo(
    () => sellerPayouts.filter((p) => p.status === 'pending').length,
    [sellerPayouts]
  );

  // Filtered sellers list based on active sub tab
  const filteredSellers = useMemo(() => {
    return allSellers.filter((seller) => {
      const matchSearch =
        seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.phone.includes(searchQuery) ||
        seller.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.username.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (activeTab === 'pending') return seller.status === 'pending' || (seller.status as any) === 'pending_approval';
      if (activeTab === 'subscriptions') return seller.status === 'active';
      if (activeTab === 'renewals') return seller.subscriptionStatus === 'pending_renewal' || seller.renewalTxId || (seller.subscriptionEndDate && new Date(seller.subscriptionEndDate).getTime() < Date.now());
      return true;
    });
  }, [allSellers, searchQuery, activeTab]);

  // Approve Pending Seller
  const handleApproveSeller = (seller: PartnerUser) => {
    const chosenPlan = seller.selectedPlanId || seller.planId || 'standard';
    const extensionDays = seller.billingCycle === 'yearly' ? 365 : 30;
    const expiryIso = new Date(Date.now() + extensionDays * 86400000).toISOString();

    const updatedPartners = partners.map((p) => {
      if (p.id === seller.id) {
        return {
          ...p,
          status: 'active' as const,
          planId: chosenPlan,
          selectedPlanId: chosenPlan,
          subscriptionStatus: 'active' as const,
          subscriptionEndDate: expiryIso,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    setPartners(updatedPartners);
    savePartnersToStorage(updatedPartners);

    // Sync in sellerStorage
    const sellersList = getSellers();
    const updatedSellers = sellersList.map((s) => {
      if (s.id === seller.id || s.username === seller.username) {
        return {
          ...s,
          accountStatus: 'active' as const,
          verificationStatus: 'verified' as const,
          subscriptionStatus: 'active' as const,
          planId: chosenPlan as any,
          subscriptionEndDate: expiryIso,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    saveSellers(updatedSellers);
  };

  // Reject Seller
  const handleRejectSeller = (seller: PartnerUser) => {
    const reason = prompt('Enter rejection reason for this seller:', 'Information verification failed.');
    if (reason === null) return;

    const updatedPartners = partners.map((p) => {
      if (p.id === seller.id) {
        return {
          ...p,
          status: 'suspended' as const,
          rejectionReason: reason,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    setPartners(updatedPartners);
    savePartnersToStorage(updatedPartners);

    const sellersList = getSellers();
    const updatedSellers = sellersList.map((s) => {
      if (s.id === seller.id || s.username === seller.username) {
        return {
          ...s,
          accountStatus: 'suspended' as const,
          verificationStatus: 'rejected' as const,
          rejectionReason: reason,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    saveSellers(updatedSellers);
  };

  // Verify Seller Renewal Payment
  const handleVerifyRenewalPayment = (seller: PartnerUser) => {
    const extensionDays = seller.billingCycle === 'yearly' ? 365 : 30;
    const currentExpiry = seller.subscriptionEndDate && new Date(seller.subscriptionEndDate).getTime() > Date.now()
      ? new Date(seller.subscriptionEndDate).getTime()
      : Date.now();
    const newExpiryIso = new Date(currentExpiry + extensionDays * 86400000).toISOString();

    const updatedPartners = partners.map((p) => {
      if (p.id === seller.id) {
        return {
          ...p,
          status: 'active' as const,
          subscriptionStatus: 'active' as const,
          subscriptionEndDate: newExpiryIso,
          renewalTxId: undefined,
          renewalPaymentMethod: undefined,
          renewalAmount: undefined,
          renewalSubmittedAt: undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPartners(updatedPartners);
    savePartnersToStorage(updatedPartners);

    const sellersList = getSellers();
    const updatedSellers = sellersList.map((s) => {
      if (s.id === seller.id || s.username === seller.username) {
        return {
          ...s,
          accountStatus: 'active' as const,
          verificationStatus: 'verified' as const,
          subscriptionStatus: 'active' as const,
          subscriptionEndDate: newExpiryIso,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    saveSellers(updatedSellers);
  };

  // Quick Extend 30 Days
  const handleQuickExtend30Days = (seller: PartnerUser) => {
    const currentExpiry = seller.subscriptionEndDate && new Date(seller.subscriptionEndDate).getTime() > Date.now()
      ? new Date(seller.subscriptionEndDate).getTime()
      : Date.now();
    const newExpiryIso = new Date(currentExpiry + 30 * 86400000).toISOString();

    const updatedPartners = partners.map((p) => {
      if (p.id === seller.id) {
        return {
          ...p,
          status: 'active' as const,
          subscriptionStatus: 'active' as const,
          subscriptionEndDate: newExpiryIso,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPartners(updatedPartners);
    savePartnersToStorage(updatedPartners);

    const sellersList = getSellers();
    const updatedSellers = sellersList.map((s) => {
      if (s.id === seller.id || s.username === seller.username) {
        return {
          ...s,
          accountStatus: 'active' as const,
          verificationStatus: 'verified' as const,
          subscriptionStatus: 'active' as const,
          subscriptionEndDate: newExpiryIso,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    saveSellers(updatedSellers);
  };

  // Toggle Active / Suspended
  const handleToggleStatus = (sellerId: string) => {
    const updated = partners.map((p) => {
      if (p.id === sellerId) {
        const nextStatus = p.status === 'active' ? ('suspended' as const) : ('active' as const);
        return {
          ...p,
          status: nextStatus,
          subscriptionStatus: nextStatus === 'active' ? ('active' as const) : ('expired' as const),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPartners(updated);
    savePartnersToStorage(updated);
  };

  // Approve / Reject Seller Payout Request
  const handleUpdatePayoutStatus = (payoutId: string, status: 'approved' | 'rejected') => {
    const updated = payouts.map((p) => {
      if (p.id === payoutId) {
        return {
          ...p,
          status,
          processedAt: new Date().toISOString(),
          txId: status === 'approved' ? `SEL-TXN-${Date.now().toString().slice(-6)}` : undefined,
        };
      }
      return p;
    });
    setPayouts(updated);
    savePayoutsToStorage(updated);
  };

  // Copy Seller Portal Login Link
  const handleCopyLink = (seller: PartnerUser) => {
    const origin = window.location.origin;
    const link = `${origin}/?portal=seller&user=${seller.username}`;
    navigator.clipboard.writeText(link);
    setCopiedId(seller.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Save Seller Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeller) return;

    const rateNum = parseFloat(editFormData.commissionRate) || editingSeller.commissionRate;
    const expiryIso = editFormData.expiryDate ? new Date(editFormData.expiryDate).toISOString() : editingSeller.subscriptionEndDate;

    const updatedPartners = partners.map((p) => {
      if (p.id === editingSeller.id) {
        return {
          ...p,
          name: editFormData.name.trim(),
          shopName: editFormData.shopName.trim(),
          phone: editFormData.phone.trim(),
          email: editFormData.email.trim(),
          planId: editFormData.planId,
          selectedPlanId: editFormData.planId,
          billingCycle: editFormData.billingCycle,
          status: editFormData.status,
          subscriptionStatus: editFormData.subscriptionStatus,
          subscriptionEndDate: expiryIso,
          commissionRate: rateNum,
          paymentDetails: {
            ...p.paymentDetails,
            bkash: editFormData.bkash || p.paymentDetails.bkash,
          },
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    setPartners(updatedPartners);
    savePartnersToStorage(updatedPartners);

    // Sync in sellerStorage
    const sellersList = getSellers();
    const updatedSellers = sellersList.map((s) => {
      if (s.id === editingSeller.id || s.username === editingSeller.username) {
        return {
          ...s,
          fullName: editFormData.name.trim(),
          email: editFormData.email.trim(),
          phone: editFormData.phone.trim(),
          planId: editFormData.planId as any,
          billingCycle: editFormData.billingCycle,
          accountStatus: editFormData.status === 'active' ? ('active' as const) : ('suspended' as const),
          subscriptionStatus: editFormData.subscriptionStatus,
          subscriptionEndDate: expiryIso,
          store: {
            ...s.store,
            storeName: editFormData.shopName.trim(),
          },
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    saveSellers(updatedSellers);

    setIsEditModalOpen(false);
    setEditingSeller(null);
  };

  // Save New Seller Creation
  const handleCreateSeller = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(newSellerForm.commissionRate) || 9;
    const newId = `seller-${Date.now().toString().slice(-6)}`;
    const expiryIso = new Date(Date.now() + 30 * 86400000).toISOString();

    const newPartner: PartnerUser = {
      id: newId,
      type: 'seller',
      name: newSellerForm.name.trim(),
      shopName: newSellerForm.shopName.trim(),
      phone: newSellerForm.phone.trim(),
      email: newSellerForm.email.trim(),
      username: newSellerForm.username.trim().toLowerCase(),
      password: newSellerForm.password.trim(),
      status: 'active',
      planId: newSellerForm.planId,
      selectedPlanId: newSellerForm.planId,
      billingCycle: 'monthly',
      subscriptionStatus: 'active',
      subscriptionEndDate: expiryIso,
      commissionRate: rateNum,
      walletBalance: 0,
      totalEarnings: 0,
      totalWithdrawn: 0,
      paymentDetails: {
        bkash: newSellerForm.bkash.trim(),
      },
      city: newSellerForm.city,
      address: newSellerForm.address,
      createdAt: new Date().toISOString(),
    };

    const updated = [newPartner, ...partners];
    setPartners(updated);
    savePartnersToStorage(updated);

    setIsAddModalOpen(false);
    setNewSellerForm({
      name: '',
      shopName: '',
      phone: '',
      email: '',
      username: '',
      password: '',
      planId: 'standard',
      commissionRate: '9',
      city: 'Dhaka',
      address: '',
      bkash: '',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 text-xs">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
              <Store className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {isBn ? 'সেলার ম্যানেজমেন্ট হাব' : 'Seller Management Hub'}
            </h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px] sm:text-xs">
            {isBn
              ? 'নিবন্ধিত সেলার, পেন্ডিং আবেদন, সাবস্ক্রিপশন প্ল্যান, রিনিউয়াল এবং উইথড্রল পরিচালনা করুন।'
              : 'Manage registered sellers, pending applications, active subscription plans, renewals, and seller withdrawal payouts.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onNavigateToPermissionMatrix && (
            <button
              onClick={onNavigateToPermissionMatrix}
              className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{isBn ? 'পারমিশন ম্যাট্রিক্স' : 'Permission Matrix'}</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isBn ? 'নতুন সেলার যুক্ত করুন' : 'Add Seller'}</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-slate-400 text-[10px] sm:text-[11px] font-bold">{isBn ? 'মোট সেলার' : 'Total Sellers'}</p>
          <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {allSellers.length}
          </h4>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-400 text-[10px] sm:text-[11px] font-bold">{isBn ? 'পেন্ডিং আবেদন' : 'Pending Approvals'}</p>
          <h4 className="text-lg sm:text-xl font-black text-amber-400 mt-0.5 flex items-center gap-1.5">
            <span>{pendingSellersCount}</span>
            {pendingSellersCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-extrabold animate-pulse">
                {isBn ? 'নতুন' : 'New'}
              </span>
            )}
          </h4>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-indigo-400 text-[10px] sm:text-[11px] font-bold">{isBn ? 'পেন্ডিং রিনিউয়াল' : 'Pending Renewals'}</p>
          <h4 className="text-lg sm:text-xl font-black text-indigo-400 mt-0.5">
            {pendingRenewalsCount}
          </h4>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-emerald-400 text-[10px] sm:text-[11px] font-bold">{isBn ? 'পেন্ডিং পে-আউট' : 'Pending Payouts'}</p>
          <h4 className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5 flex items-center gap-1.5">
            <span>{pendingPayoutsCount}</span>
            {pendingPayoutsCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 font-extrabold animate-pulse">
                {isBn ? 'অ্যাকশন' : 'Action'}
              </span>
            )}
          </h4>
        </div>
      </div>

      {/* Sub Tabs Navigation Bar - Responsive Wrap Layout Without Scrollbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1">
          {/* 1. All Seller */}
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-sky-600 text-white shadow-xs shadow-sky-600/30'
                : 'bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-700/60'
            }`}
          >
            <Store className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'all' ? 'text-white' : 'text-sky-500 dark:text-sky-400'}`} />
            <span>{isBn ? 'সকল সেলার' : 'All Sellers'}</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition-colors ${
                activeTab === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {allSellers.length}
            </span>
          </button>

          {/* 2. Pending Seller Approvals */}
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/30'
                : 'bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-700/60'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'pending' ? 'text-white' : 'text-amber-500 dark:text-amber-400'}`} />
            <span>{isBn ? 'পেন্ডিং আবেদন' : 'Pending Approvals'}</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition-colors ${
                activeTab === 'pending'
                  ? 'bg-white/20 text-white'
                  : pendingSellersCount > 0
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-extrabold animate-pulse'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {pendingSellersCount}
            </span>
          </button>

          {/* 3. Subscription Seller */}
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'subscriptions'
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                : 'bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-700/60'
            }`}
          >
            <BadgeCheck className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'subscriptions' ? 'text-emerald-200' : 'text-emerald-500 dark:text-emerald-400'}`} />
            <span>{isBn ? 'অ্যাক্টিভ সেলার' : 'Subscribed'}</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition-colors ${
                activeTab === 'subscriptions'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {allSellers.filter((s) => s.status === 'active').length}
            </span>
          </button>

          {/* 4. Subscription and Renewal */}
          <button
            onClick={() => setActiveTab('renewals')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'renewals'
                ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                : 'bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-700/60'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'renewals' ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
            <span>{isBn ? 'রিনিউয়াল রিকোয়েস্ট' : 'Subscription Renewals'}</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition-colors ${
                activeTab === 'renewals'
                  ? 'bg-white/20 text-white'
                  : pendingRenewalsCount > 0
                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-extrabold animate-pulse'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {pendingRenewalsCount}
            </span>
          </button>

          {/* 5. Seller Plans */}
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'plans'
                ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/30'
                : 'bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-700/60'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'plans' ? 'text-purple-200' : 'text-purple-500 dark:text-purple-400'}`} />
            <span>{isBn ? 'প্ল্যান কনফিগ' : 'Subscription Tiers'}</span>
          </button>

          {/* 6. Seller Payout */}
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'payouts'
                ? 'bg-teal-600 text-white shadow-xs shadow-teal-600/30'
                : 'bg-slate-100 hover:bg-slate-200 hover:text-slate-900 text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-700/60'
            }`}
          >
            <CreditCard className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'payouts' ? 'text-white' : 'text-teal-500 dark:text-teal-400'}`} />
            <span>{isBn ? 'প্রফিট পে-আউট' : 'Profit Payouts'}</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition-colors ${
                activeTab === 'payouts'
                  ? 'bg-white/20 text-white'
                  : pendingPayoutsCount > 0
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-extrabold animate-pulse'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {pendingPayoutsCount}
            </span>
          </button>
        </div>

        <div className="relative w-full xl:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isBn ? "নাম, ফোন বা শপ নেম দিয়ে খুঁজুন..." : "Search seller, shop, phone..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
          />
        </div>
      </div>

      {/* Tab Content 5: Seller Plans */}
      {activeTab === 'plans' && <AdminSellerPlans />}

      {/* Tab Content 6: Seller Payout */}
      {activeTab === 'payouts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs space-y-3">
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-500" />
              <span>Seller Withdrawal & Payout Approvals</span>
            </h3>
            <span className="text-slate-400 text-[10px] sm:text-[11px] font-semibold">
              {sellerPayouts.length} Total
            </span>
          </div>

          {/* Mobile View Cards */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 sm:p-3 space-y-2.5">
            {sellerPayouts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No payout requests found for sellers.
              </div>
            ) : (
              sellerPayouts.map((payout) => (
                <div key={payout.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{payout.partnerName}</p>
                      <p className="font-mono text-[10px] text-slate-400">ID: {payout.id}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        payout.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : payout.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                      }`}
                    >
                      {payout.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Amount</span>
                      <span className="font-black text-teal-500 dark:text-teal-400 text-sm">৳{payout.amount.toLocaleString('en-BD')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Account</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 uppercase font-bold text-[10px]">
                        {payout.method}: {payout.accountNumber}
                      </span>
                    </div>
                  </div>

                  {payout.txId && (
                    <div className="text-[10px] font-mono text-sky-400 font-bold bg-sky-500/10 px-2 py-1 rounded-lg">
                      TxID: {payout.txId}
                    </div>
                  )}

                  {payout.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleUpdatePayoutStatus(payout.id, 'approved')}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer text-center"
                      >
                        Approve Payout
                      </button>
                      <button
                        onClick={() => handleUpdatePayoutStatus(payout.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer text-center"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto scrollbar-none">
            <table className="w-full text-left min-w-[640px]">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs">
                <tr>
                  <th className="px-4 py-3">Payout ID</th>
                  <th className="px-4 py-3">Seller Store</th>
                  <th className="px-4 py-3">Requested Amount</th>
                  <th className="px-4 py-3">Payment Account</th>
                  <th className="px-4 py-3">Requested Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {sellerPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No payout requests found for sellers.
                    </td>
                  </tr>
                ) : (
                  sellerPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-200">{payout.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{payout.partnerName}</td>
                      <td className="px-4 py-3 font-extrabold text-teal-500 dark:text-teal-400">
                        ৳{payout.amount.toLocaleString('en-BD')}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                        <span className="uppercase font-bold text-slate-400 mr-1">{payout.method}:</span>
                        {payout.accountNumber}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                        {new Date(payout.requestedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            payout.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : payout.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                          }`}
                        >
                          {payout.status}
                        </span>
                        {payout.txId && (
                          <p className="text-[10px] font-mono text-sky-400 mt-0.5 font-bold">
                            TxID: {payout.txId}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {payout.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdatePayoutStatus(payout.id, 'approved')}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdatePayoutStatus(payout.id, 'rejected')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Sellers Table for All Seller, Pending Seller Approvals, Subscription Seller, Subscription and Renewal */}
      {activeTab !== 'plans' && activeTab !== 'payouts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-sky-500" />
              <span>
                {activeTab === 'all' && 'All Registered Sellers'}
                {activeTab === 'pending' && 'Pending Seller Applications & Payment Proof'}
                {activeTab === 'subscriptions' && 'Active Seller Subscriptions & Package Validity'}
                {activeTab === 'renewals' && 'Subscription Renewals & Payment Verification'}
              </span>
            </h3>
            <span className="text-slate-400 text-[10px] sm:text-[11px]">
              {filteredSellers.length} Records
            </span>
          </div>

          {/* Mobile View: Compact Smart Cards (Zero Horizontal Scrollbar) */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 sm:p-3 space-y-2.5">
            {filteredSellers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No seller records found matching this category.
              </div>
            ) : (
              filteredSellers.map((seller) => {
                const planId = seller.selectedPlanId || seller.planId || 'standard';
                const isExpired = seller.subscriptionEndDate && new Date(seller.subscriptionEndDate).getTime() < Date.now();
                const daysLeft = seller.subscriptionEndDate
                  ? Math.ceil((new Date(seller.subscriptionEndDate).getTime() - Date.now()) / (1000 * 3600 * 24))
                  : null;

                return (
                  <div key={seller.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span>{seller.shopName}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {seller.name} • {seller.phone}
                        </p>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md font-extrabold uppercase text-[9px] shrink-0 ${
                        planId === 'premium' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                        planId === 'standard' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                        'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                      }`}>
                        {planId === 'premium' ? '💎 Premium' : planId === 'standard' ? '⭐ Standard' : '🌱 Free'}
                      </span>
                    </div>

                    {/* Credentials & Status info */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[9px] font-sans">User Login</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[10px]">{seller.username}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-sans">Password</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px]">{seller.password || '••••••'}</span>
                      </div>
                    </div>

                    {/* Validity & Status Row */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] pt-1">
                      <div>
                        {activeTab === 'renewals' && seller.renewalTxId ? (
                          <span className="text-amber-400 font-mono font-bold">
                            TrxID: {seller.renewalTxId} ({seller.renewalPaymentMethod || 'bKash'})
                          </span>
                        ) : seller.subscriptionEndDate ? (
                          isExpired ? (
                            <span className="font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                              ⚠️ Expired ({Math.abs(daysLeft || 0)}d ago)
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              ✅ Active ({daysLeft} days)
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">Unlimited Trial</span>
                        )}
                      </div>

                      <div>
                        {seller.status === 'pending' || (seller.status as any) === 'pending_approval' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 animate-spin" /> Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(seller.id)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer ${
                              seller.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                            }`}
                          >
                            {seller.status === 'active' ? '● Active' : '● Suspended'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      {(seller.status === 'pending' || (seller.status as any) === 'pending_approval') && (
                        <>
                          <button
                            onClick={() => handleApproveSeller(seller)}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleRejectSeller(seller)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs cursor-pointer border border-rose-800"
                          >
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {(seller.renewalTxId || seller.subscriptionStatus === 'pending_renewal') && (
                        <button
                          onClick={() => handleVerifyRenewalPayment(seller)}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verify Renewal</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleQuickExtend30Days(seller)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-[11px] cursor-pointer border border-indigo-800"
                      >
                        +30d
                      </button>

                      {/* Copy Link */}
                      <button
                        onClick={() => handleCopyLink(seller)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        title="Copy Login Link"
                      >
                        {copiedId === seller.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* Login */}
                      {onLoginAsPartner && (
                        <button
                          onClick={() => onLoginAsPartner(seller)}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs flex items-center gap-1"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Login</span>
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => {
                          setEditingSeller(seller);
                          setSubEditFormData({
                            name: seller.name,
                            shopName: seller.shopName,
                            phone: seller.phone,
                            email: seller.email,
                            planId: seller.selectedPlanId || seller.planId || 'standard',
                            billingCycle: seller.billingCycle || 'monthly',
                            status: seller.status as any,
                            subscriptionStatus: seller.subscriptionStatus || 'active',
                            expiryDate: seller.subscriptionEndDate ? new Date(seller.subscriptionEndDate).toISOString().slice(0, 10) : '',
                            commissionRate: seller.commissionRate.toString(),
                            bkash: seller.paymentDetails?.bkash || '',
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-white"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View Table */}
          <div className="hidden md:block overflow-x-auto scrollbar-none">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs">
                <tr>
                  <th className="px-4 py-3">Store & Owner</th>
                  <th className="px-4 py-3">Login Credentials</th>
                  <th className="px-4 py-3">Subscription Package</th>
                  <th className="px-4 py-3">
                    {activeTab === 'renewals' ? 'Renewal Payment Proof' : 'Expiry Date / Countdown'}
                  </th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredSellers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No seller records found matching this category.
                    </td>
                  </tr>
                ) : (
                  filteredSellers.map((seller) => {
                    const planId = seller.selectedPlanId || seller.planId || 'standard';
                    const isExpired = seller.subscriptionEndDate && new Date(seller.subscriptionEndDate).getTime() < Date.now();
                    const daysLeft = seller.subscriptionEndDate
                      ? Math.ceil((new Date(seller.subscriptionEndDate).getTime() - Date.now()) / (1000 * 3600 * 24))
                      : null;

                    return (
                      <tr key={seller.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-sky-500" />
                            <span>{seller.shopName}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {seller.name} • {seller.phone}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{seller.email}</p>
                        </td>

                        <td className="px-4 py-3 font-mono">
                          <p className="font-bold text-slate-800 dark:text-slate-200">user: {seller.username}</p>
                          <p className="text-[11px] text-slate-400">pass: {seller.password || '******'}</p>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-md font-extrabold uppercase text-[10px] ${
                            planId === 'premium' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            planId === 'standard' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                            'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                          }`}>
                            {planId === 'premium' ? '💎 Premium' : planId === 'standard' ? '⭐ Standard' : '🌱 Free/Basic'}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5 capitalize">
                            {seller.billingCycle || 'monthly'} • {seller.commissionRate}% Fee
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          {activeTab === 'renewals' && seller.renewalTxId ? (
                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
                              <p className="font-extrabold text-amber-300 font-mono text-[11px]">
                                TrxID: {seller.renewalTxId}
                              </p>
                              <p className="text-[10px] text-slate-300">
                                Method: <b className="uppercase">{seller.renewalPaymentMethod || 'bKash'}</b> • ৳{seller.renewalAmount || 990}
                              </p>
                            </div>
                          ) : seller.subscriptionEndDate ? (
                            <div>
                              <p className="font-mono text-slate-200 font-bold">
                                {new Date(seller.subscriptionEndDate).toLocaleDateString('en-GB')}
                              </p>
                              {isExpired ? (
                                <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-rose-500/30">
                                  ⚠️ Expired ({Math.abs(daysLeft || 0)}d ago)
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-emerald-500/30">
                                  ✅ Active ({daysLeft} days)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Unlimited Trial</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {seller.status === 'pending' || (seller.status as any) === 'pending_approval' ? (
                            <div className="space-y-1 p-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-spin" />
                                <span>Pending Approval</span>
                              </span>
                              {seller.paymentTxId && (
                                <p className="text-[10px] text-amber-300 font-mono font-bold">
                                  TrxID: {seller.paymentTxId} ({seller.paymentMethod || 'bKash'})
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(seller.id)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                                seller.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 hover:bg-rose-200'
                              }`}
                            >
                              {seller.status === 'active' ? '● Active' : '● Suspended'}
                            </button>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(seller.status === 'pending' || (seller.status as any) === 'pending_approval') && (
                              <>
                                <button
                                  onClick={() => handleApproveSeller(seller)}
                                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] cursor-pointer flex items-center gap-1 shadow-xs"
                                  title="Approve Application & Unlock Portal"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>

                                <button
                                  onClick={() => handleRejectSeller(seller)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[11px] cursor-pointer border border-rose-800"
                                  title="Reject Application"
                                >
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {(seller.renewalTxId || seller.subscriptionStatus === 'pending_renewal') && (
                              <button
                                onClick={() => handleVerifyRenewalPayment(seller)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] cursor-pointer flex items-center gap-1 shadow-xs"
                                title="Verify Renewal Payment"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verify Renewal</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleQuickExtend30Days(seller)}
                              className="px-2 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-[10px] cursor-pointer border border-indigo-800"
                              title="Quick Extend Expiration (+30 Days)"
                            >
                              <span>+30 Days</span>
                            </button>

                            {/* Copy Link */}
                            <button
                              onClick={() => handleCopyLink(seller)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                              title="Copy Portal Login Link"
                            >
                              {copiedId === seller.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Login as Seller */}
                            {onLoginAsPartner && (
                              <button
                                onClick={() => onLoginAsPartner(seller)}
                                className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-600 hover:text-white text-sky-700 dark:text-sky-300 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-sky-200 dark:border-sky-800"
                                title="Open Seller Dashboard"
                              >
                                <LogIn className="w-3 h-3" />
                                <span>Login</span>
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={() => {
                                setEditingSeller(seller);
                                setSubEditFormData({
                                  name: seller.name,
                                  shopName: seller.shopName,
                                  phone: seller.phone,
                                  email: seller.email,
                                  planId: seller.selectedPlanId || seller.planId || 'standard',
                                  billingCycle: seller.billingCycle || 'monthly',
                                  status: seller.status as any,
                                  subscriptionStatus: seller.subscriptionStatus || 'active',
                                  expiryDate: seller.subscriptionEndDate ? new Date(seller.subscriptionEndDate).toISOString().slice(0, 10) : '',
                                  commissionRate: seller.commissionRate.toString(),
                                  bkash: seller.paymentDetails?.bkash || '',
                                });
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer"
                              title="Edit Details & Plan"
                            >
                              <Edit className="w-3.5 h-3.5" />
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
      )}

      {/* Edit Seller Modal */}
      {isEditModalOpen && editingSeller && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-sky-500" />
                <span>Edit Seller Details & Subscription</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Store Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.shopName}
                    onChange={(e) => setSubEditFormData({ ...editFormData, shopName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setSubEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setSubEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setSubEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{isBn ? 'প্যাকেজ প্ল্যান *' : 'Package Plan *'}</label>
                <select
                  value={editFormData.planId}
                  onChange={(e) => setSubEditFormData({ ...editFormData, planId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value="basic">{isBn ? '🌱 বেসিক স্টারটার (৳০/মাস - ১২% ফি)' : '🌱 Basic Starter (৳0/mo - 12% Fee)'}</option>
                  <option value="standard">{isBn ? '⭐ স্ট্যান্ডার্ড প্রো (৳৯৯০/মাস - ৯% ফি)' : '⭐ Standard Pro (৳990/mo - 9% Fee)'}</option>
                  <option value="premium">{isBn ? '💎 প্রিমিয়াম এন্টারপ্রাইজ (৳২,৪৯০/মাস - ৬% ফি)' : '💎 Premium Enterprise (৳2,490/mo - 6% Fee)'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{isBn ? 'অ্যাকাউন্ট স্ট্যাটাস' : 'Account Status'}</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setSubEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="active">{isBn ? 'অ্যাক্টিভ' : 'Active'}</option>
                    <option value="pending">{isBn ? 'পেন্ডিং রিভিউ' : 'Pending Review'}</option>
                    <option value="suspended">{isBn ? 'সাসপেন্ডেড' : 'Suspended'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{isBn ? 'সাবস্ক্রিপশন মেয়াদ' : 'Subscription Expiry'}</label>
                  <input
                    type="date"
                    value={editFormData.expiryDate}
                    onChange={(e) => setSubEditFormData({ ...editFormData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isBn ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Seller Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-sky-500" />
                <span>Create New Verified Seller Account</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSeller} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Store Name *</label>
                  <input
                    type="text"
                    required
                    value={newSellerForm.shopName}
                    onChange={(e) => setNewSellerForm({ ...newSellerForm, shopName: e.target.value })}
                    placeholder="e.g. Apex Tech BD"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={newSellerForm.name}
                    onChange={(e) => setNewSellerForm({ ...newSellerForm, name: e.target.value })}
                    placeholder="e.g. Rahim Chowdhury"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newSellerForm.phone}
                    onChange={(e) => setNewSellerForm({ ...newSellerForm, phone: e.target.value })}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newSellerForm.email}
                    onChange={(e) => setNewSellerForm({ ...newSellerForm, email: e.target.value })}
                    placeholder="seller@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newSellerForm.username}
                    onChange={(e) => setNewSellerForm({ ...newSellerForm, username: e.target.value })}
                    placeholder="seller_apex"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    value={newSellerForm.password}
                    onChange={(e) => setNewSellerForm({ ...newSellerForm, password: e.target.value })}
                    placeholder="seller123"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{isBn ? 'প্রাথমিক প্ল্যান *' : 'Initial Plan *'}</label>
                <select
                  value={newSellerForm.planId}
                  onChange={(e) => setNewSellerForm({ ...newSellerForm, planId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value="basic">{isBn ? '🌱 বেসিক স্টারটার (৳০/মাস - ১২% ফি)' : '🌱 Basic Starter (৳0/mo - 12% Fee)'}</option>
                  <option value="standard">{isBn ? '⭐ স্ট্যান্ডার্ড প্রো (৳৯৯০/মাস - ৯% ফি)' : '⭐ Standard Pro (৳990/mo - 9% Fee)'}</option>
                  <option value="premium">{isBn ? '💎 প্রিমিয়াম এন্টারপ্রাইজ (৳২,৪৯০/মাস - ৬% ফি)' : '💎 Premium Enterprise (৳2,490/mo - 6% Fee)'}</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Create Seller</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
