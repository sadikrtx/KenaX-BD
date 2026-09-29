import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Store,
  Boxes,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Edit,
  Trash2,
  DollarSign,
  Phone,
  Mail,
  ShieldCheck,
  AlertCircle,
  Building2,
  Eye,
  Key,
  LogIn,
  X,
  Save,
  CreditCard,
  Sparkles,
  Layers,
  CheckCircle2,
  RefreshCw,
  Calendar,
  BadgeCheck,
  ChevronRight,
} from 'lucide-react';
import { PartnerUser, PartnerPayout, PartnerRole } from '../../types';
import {
  getPartnersFromStorage,
  savePartnersToStorage,
  getPayoutsFromStorage,
  savePayoutsToStorage,
} from '../../lib/partnerStorage';
import { getSellers, saveSellers } from '../../lib/sellerStorage';
import { AdminSellerPlans } from './AdminSellerPlans';
import { AdminResellerPlans } from './AdminResellerPlans';

interface AdminPartnersProps {
  onLoginAsPartner?: (partner: PartnerUser) => void;
  initialTab?: 'all' | 'sellers' | 'resellers' | 'pending' | 'renewals' | 'plans' | 'reseller-plans' | 'payouts';
}

export const AdminPartners: React.FC<AdminPartnersProps> = ({
  onLoginAsPartner,
  initialTab = 'all',
}) => {
  const [partners, setPartners] = useState<PartnerUser[]>(() => getPartnersFromStorage());
  const [payouts, setPayouts] = useState<PartnerPayout[]>(() => getPayoutsFromStorage());
  const [activeTab, setActiveTab] = useState<'all' | 'sellers' | 'resellers' | 'pending' | 'renewals' | 'plans' | 'reseller-plans' | 'payouts'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPortalType, setCopiedPortalType] = useState<string | null>(null);

  // Edit Subscription Modal state
  const [isEditSubOpen, setIsEditSubOpen] = useState(false);
  const [editingSubPartner, setEditingSubPartner] = useState<PartnerUser | null>(null);
  const [subFormData, setSubFormData] = useState({
    planId: 'standard',
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    subscriptionStatus: 'active' as 'active' | 'expired' | 'pending_renewal' | 'trial',
    expiryDate: '',
    commissionRate: '9',
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const pendingSellers = useMemo(
    () => partners.filter((p) => p.status === 'pending' || p.status === ('pending_approval' as any)),
    [partners]
  );

  const pendingRenewals = useMemo(
    () => partners.filter((p) => p.subscriptionStatus === 'pending_renewal' || (p.subscriptionEndDate && new Date(p.subscriptionEndDate).getTime() < Date.now())),
    [partners]
  );

  const handleCopyDirectPortalLink = (type: 'seller' | 'reseller') => {
    const origin = window.location.origin;
    const link = `${origin}/?portal=${type}`;
    navigator.clipboard.writeText(link);
    setCopiedPortalType(type);
    setTimeout(() => setCopiedPortalType(null), 2500);
  };

  // New Partner Modal
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerUser | null>(null);
  const [formData, setFormData] = useState({
    type: 'seller' as PartnerRole,
    name: '',
    shopName: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    commissionRate: '10',
    city: 'Dhaka',
    address: '',
    bkash: '',
    bankAccount: '',
  });

  // Filtered partners
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone.includes(searchQuery) ||
        p.username.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (activeTab === 'sellers') return p.type === 'seller';
      if (activeTab === 'resellers') return p.type === 'reseller';
      if (activeTab === 'pending') return p.status === 'pending' || p.status === ('pending_approval' as any);
      if (activeTab === 'renewals') return p.type === 'seller';
      return true;
    });
  }, [partners, searchQuery, activeTab]);

  // Approve Pending Seller Application & Activate Subscription Plan
  const handleApproveSeller = (partner: PartnerUser) => {
    const chosenPlan = partner.selectedPlanId || partner.planId || 'standard';
    const extensionDays = partner.billingCycle === 'yearly' ? 365 : 30;
    const expiryIso = new Date(Date.now() + extensionDays * 86400000).toISOString();

    const updatedPartners = partners.map((p) => {
      if (p.id === partner.id) {
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
    const allSellers = getSellers();
    const updatedSellers = allSellers.map((s) => {
      if (s.id === partner.id || s.username === partner.username) {
        return {
          ...s,
          accountStatus: 'active' as const,
          verificationStatus: 'verified' as const,
          subscriptionStatus: 'active' as const,
          planId: (chosenPlan as any),
          subscriptionEndDate: expiryIso,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    saveSellers(updatedSellers);
  };

  // Reject Pending Seller Application
  const handleRejectSeller = (partner: PartnerUser) => {
    const reason = prompt('Enter rejection reason for this seller:', 'Payment transaction ID verification failed.');
    if (reason === null) return;

    const updatedPartners = partners.map((p) => {
      if (p.id === partner.id) {
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

    const allSellers = getSellers();
    const updatedSellers = allSellers.map((s) => {
      if (s.id === partner.id || s.username === partner.username) {
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
  const handleVerifyRenewalPayment = (partner: PartnerUser) => {
    const extensionDays = partner.billingCycle === 'yearly' ? 365 : 30;
    const currentExpiry = partner.subscriptionEndDate && new Date(partner.subscriptionEndDate).getTime() > Date.now()
      ? new Date(partner.subscriptionEndDate).getTime()
      : Date.now();
    const newExpiryIso = new Date(currentExpiry + extensionDays * 86400000).toISOString();

    const updatedPartners = partners.map((p) => {
      if (p.id === partner.id) {
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

    const allSellers = getSellers();
    const updatedSellers = allSellers.map((s) => {
      if (s.id === partner.id || s.username === partner.username) {
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

  // Quick Extend Expiration (+30 Days)
  const handleQuickExtend30Days = (partner: PartnerUser) => {
    const currentExpiry = partner.subscriptionEndDate && new Date(partner.subscriptionEndDate).getTime() > Date.now()
      ? new Date(partner.subscriptionEndDate).getTime()
      : Date.now();
    const newExpiryIso = new Date(currentExpiry + 30 * 86400000).toISOString();

    const updatedPartners = partners.map((p) => {
      if (p.id === partner.id) {
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

    const allSellers = getSellers();
    const updatedSellers = allSellers.map((s) => {
      if (s.id === partner.id || s.username === partner.username) {
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

  // Save Subscription Edit
  const handleSaveSubscriptionEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubPartner) return;

    const commRateNum = parseFloat(subFormData.commissionRate) || editingSubPartner.commissionRate;
    const isoExpiry = subFormData.expiryDate ? new Date(subFormData.expiryDate).toISOString() : editingSubPartner.subscriptionEndDate;

    const updatedPartners = partners.map((p) => {
      if (p.id === editingSubPartner.id) {
        return {
          ...p,
          planId: subFormData.planId,
          selectedPlanId: subFormData.planId,
          billingCycle: subFormData.billingCycle,
          subscriptionStatus: subFormData.subscriptionStatus,
          subscriptionEndDate: isoExpiry,
          commissionRate: commRateNum,
          status: subFormData.subscriptionStatus === 'expired' ? ('suspended' as const) : ('active' as const),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPartners(updatedPartners);
    savePartnersToStorage(updatedPartners);

    // Sync in sellerStorage
    const allSellers = getSellers();
    const updatedSellers = allSellers.map((s) => {
      if (s.id === editingSubPartner.id || s.username === editingSubPartner.username) {
        return {
          ...s,
          planId: subFormData.planId as any,
          billingCycle: subFormData.billingCycle,
          subscriptionStatus: subFormData.subscriptionStatus,
          subscriptionEndDate: isoExpiry,
          accountStatus: subFormData.subscriptionStatus === 'expired' ? ('suspended' as const) : ('active' as const),
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    saveSellers(updatedSellers);

    setIsEditSubOpen(false);
    setEditingSubPartner(null);
  };

  // Copy portal login link for partner
  const handleCopyLoginLink = (partner: PartnerUser) => {
    const origin = window.location.origin;
    const link = `${origin}/?portal=${partner.type}&user=${partner.username}`;
    navigator.clipboard.writeText(link);
    setCopiedId(partner.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle Partner Status (Active / Suspended)
  const handleToggleStatus = (id: string) => {
    const updated = partners.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          status: (p.status === 'active' ? 'suspended' : 'active') as any,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPartners(updated);
    savePartnersToStorage(updated);
  };

  // Delete Partner
  const handleDeletePartner = (id: string) => {
    if (confirm('Are you sure you want to delete this partner account?')) {
      const updated = partners.filter((p) => p.id !== id);
      setPartners(updated);
      savePartnersToStorage(updated);
    }
  };

  // Save Partner (Create or Update)
  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(formData.commissionRate) || 10;

    if (editingPartner) {
      const updated: PartnerUser = {
        ...editingPartner,
        type: formData.type,
        name: formData.name.trim(),
        shopName: formData.shopName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password || editingPartner.password,
        commissionRate: rateNum,
        city: formData.city,
        address: formData.address,
        paymentDetails: {
          ...editingPartner.paymentDetails,
          bkash: formData.bkash || editingPartner.paymentDetails.bkash,
          bankAccount: formData.bankAccount || editingPartner.paymentDetails.bankAccount,
        },
        updatedAt: new Date().toISOString(),
      };
      const list = partners.map((p) => (p.id === editingPartner.id ? updated : p));
      setPartners(list);
      savePartnersToStorage(list);
    } else {
      const newPartner: PartnerUser = {
        id: `PARTNER-${Date.now().toString().slice(-6)}`,
        type: formData.type,
        name: formData.name.trim(),
        shopName: formData.shopName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password.trim(),
        status: 'active',
        commissionRate: rateNum,
        walletBalance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        paymentDetails: {
          bkash: formData.bkash.trim(),
          bankAccount: formData.bankAccount.trim(),
        },
        city: formData.city,
        address: formData.address,
        createdAt: new Date().toISOString(),
      };
      const list = [newPartner, ...partners];
      setPartners(list);
      savePartnersToStorage(list);
    }

    setIsAddPartnerOpen(false);
    setEditingPartner(null);
    setFormData({
      type: 'seller',
      name: '',
      shopName: '',
      phone: '',
      email: '',
      username: '',
      password: '',
      commissionRate: '10',
      city: 'Dhaka',
      address: '',
      bkash: '',
      bankAccount: '',
    });
  };

  // Approve / Reject Payout
  const handleUpdatePayoutStatus = (payoutId: string, status: 'approved' | 'rejected') => {
    const updated = payouts.map((p) => {
      if (p.id === payoutId) {
        return {
          ...p,
          status,
          processedAt: new Date().toISOString(),
          txId: status === 'approved' ? `TXN-${Date.now().toString().slice(-6)}` : undefined,
        };
      }
      return p;
    });
    setPayouts(updated);
    savePayoutsToStorage(updated);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 text-xs">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
              <Store className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Sellers & Resellers Management (সেলার ও রিসেলার হাব)
            </h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Create verified seller vendors and dropshippers with dedicated portals, custom commissions, and payout management.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPartner(null);
            setFormData({
              type: 'seller',
              name: '',
              shopName: '',
              phone: '',
              email: '',
              username: '',
              password: '',
              commissionRate: '10',
              city: 'Dhaka',
              address: '',
              bkash: '',
              bankAccount: '',
            });
            setIsAddPartnerOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Partner (নতুন সেলার/রিসেলার)</span>
        </button>
      </div>

      {/* Dedicated Portal Invitation Links for Admin to Share */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Seller Portal Link Card */}
        <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/30 flex flex-col justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold shrink-0 border border-sky-500/30">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🏪 সেলার পোর্টাল লিঙ্ক (Seller Portal Link)</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400">
                  Dedicated URL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                সেলারদের এই লিঙ্কটি শেয়ার করুন। এই লিঙ্কে প্রবেশ করে সেলাররা তাদের দোকান খুলতে ও লগইন করতে পারবে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-sky-500/20">
            <div className="flex-1 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-sky-500/30 text-[11px] font-mono text-sky-300 truncate">
              {window.location.origin}/?portal=seller
            </div>
            <button
              onClick={() => handleCopyDirectPortalLink('seller')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                copiedPortalType === 'seller'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-sky-600 hover:bg-sky-500 text-white'
              }`}
            >
              {copiedPortalType === 'seller' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>লিঙ্ক কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>কপি করুন</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Reseller Portal Link Card */}
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-500/30">
              <Boxes className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🛍️ রিসেলার হাব লিঙ্ক (Reseller Hub Link)</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">
                  Dedicated URL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                রিসেলারদের এই লিঙ্কটি দিন। এই লিঙ্কে গিয়ে তারা ইনভেন্টরি ছাড়া পাইকারি ক্যাটালগ ও মার্জিন ড্যাশবোর্ডে লগইন/রেজিস্টার করতে পারবে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/20">
            <div className="flex-1 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-[11px] font-mono text-emerald-300 truncate">
              {window.location.origin}/?portal=reseller
            </div>
            <button
              onClick={() => handleCopyDirectPortalLink('reseller')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                copiedPortalType === 'reseller'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {copiedPortalType === 'reseller' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>লিঙ্ক কপি হয়েছে!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>কপি করুন</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 dark:bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All Partners ({partners.length})
          </button>
          <button
            onClick={() => setActiveTab('sellers')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sellers'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Sellers ({partners.filter((p) => p.type === 'seller').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              Pending Approvals (
              <span className={`font-black ${pendingSellers.length > 0 ? 'text-amber-300 animate-pulse' : ''}`}>
                {pendingSellers.length}
              </span>
              )
            </span>
          </button>

          <button
            onClick={() => setActiveTab('renewals')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'renewals'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>
              Subscriptions & Renewals (
              {pendingRenewals.length > 0 && (
                <span className="text-rose-300 font-black animate-pulse">
                  {pendingRenewals.length}
                </span>
              )}
              )
            </span>
          </button>

          <button
            onClick={() => setActiveTab('resellers')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'resellers'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Resellers ({partners.filter((p) => p.type === 'reseller').length})</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'plans'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Seller Plans</span>
          </button>
          <button
            onClick={() => setActiveTab('reseller-plans')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'reseller-plans'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Reseller Membership Plans</span>
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'payouts'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>
              Payout Requests (
              {payouts.filter((p) => p.status === 'pending').length > 0 && (
                <span className="text-amber-300 font-black animate-pulse">
                  {payouts.filter((p) => p.status === 'pending').length}
                </span>
              )}
              )
            </span>
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search partner, shop, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Seller Subscription Plans Tab */}
      {activeTab === 'plans' && <AdminSellerPlans />}

      {/* Reseller Membership Plans Tab */}
      {activeTab === 'reseller-plans' && <AdminResellerPlans />}

      {/* Subscriptions & Renewals Management Tab */}
      {activeTab === 'renewals' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 text-[11px] font-bold">Total Seller Packages</p>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {partners.filter((p) => p.type === 'seller').length}
              </h4>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-emerald-400 text-[11px] font-bold">Active Subscriptions</p>
              <h4 className="text-xl font-black text-emerald-400 mt-1">
                {partners.filter((p) => p.type === 'seller' && p.status === 'active' && p.subscriptionStatus !== 'pending_renewal').length}
              </h4>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-400 text-[11px] font-bold">Pending Renewal Verification</p>
              <h4 className="text-xl font-black text-amber-400 mt-1">
                {partners.filter((p) => p.subscriptionStatus === 'pending_renewal' || p.renewalTxId).length}
              </h4>
            </div>
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-rose-400 text-[11px] font-bold">Expired Package Locks</p>
              <h4 className="text-xl font-black text-rose-400 mt-1">
                {partners.filter((p) => p.type === 'seller' && (p.subscriptionStatus === 'expired' || (p.subscriptionEndDate && new Date(p.subscriptionEndDate).getTime() < Date.now()))).length}
              </h4>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-500" />
                <span>Seller Subscriptions & Package Expiry Control</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">
                Auto Lock On Expiration Enabled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Seller / Shop</th>
                    <th className="px-4 py-3">Active Package</th>
                    <th className="px-4 py-3">Expiry / Days Left</th>
                    <th className="px-4 py-3">Renewal Payment Details</th>
                    <th className="px-4 py-3">Subscription Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {partners.filter((p) => p.type === 'seller').length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No seller accounts found.
                      </td>
                    </tr>
                  ) : (
                    partners
                      .filter((p) => p.type === 'seller')
                      .map((partner) => {
                        const planId = partner.selectedPlanId || partner.planId || 'standard';
                        const isExpired = partner.subscriptionEndDate && new Date(partner.subscriptionEndDate).getTime() < Date.now();
                        const daysLeft = partner.subscriptionEndDate
                          ? Math.ceil((new Date(partner.subscriptionEndDate).getTime() - Date.now()) / (1000 * 3600 * 24))
                          : null;

                        return (
                          <tr key={partner.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900 dark:text-white">{partner.shopName}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {partner.name} • {partner.phone}
                              </p>
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
                                {partner.billingCycle || 'monthly'} Billing • {partner.commissionRate}% Fee
                              </p>
                            </td>

                            <td className="px-4 py-3">
                              {partner.subscriptionEndDate ? (
                                <div>
                                  <p className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                                    {new Date(partner.subscriptionEndDate).toLocaleDateString('en-GB')}
                                  </p>
                                  {isExpired ? (
                                    <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-rose-500/30">
                                      ⚠️ Expired ({Math.abs(daysLeft || 0)}d ago) - Access Locked
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-emerald-500/30">
                                      ✅ Active ({daysLeft} days remaining)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-500">Unlimited / Trial</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {partner.renewalTxId ? (
                                <div className="space-y-0.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                  <p className="font-extrabold text-amber-300 text-[11px] flex items-center gap-1">
                                    <span>TrxID: {partner.renewalTxId}</span>
                                  </p>
                                  <p className="text-[10px] text-slate-300 font-mono">
                                    Method: <b className="uppercase">{partner.renewalPaymentMethod || 'bKash'}</b> • Amount: ৳{partner.renewalAmount || (planId === 'premium' ? 2490 : planId === 'standard' ? 990 : 0)}
                                  </p>
                                  <p className="text-[9px] text-amber-400">
                                    Submitted: {partner.renewalSubmittedAt ? new Date(partner.renewalSubmittedAt).toLocaleTimeString() : 'Recently'}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[11px]">No pending renewal payment</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                partner.subscriptionStatus === 'pending_renewal' || partner.renewalTxId
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : partner.subscriptionStatus === 'active' && !isExpired
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {partner.subscriptionStatus === 'pending_renewal' || partner.renewalTxId
                                  ? '⌛ Pending Payment Verification'
                                  : partner.subscriptionStatus === 'active' && !isExpired
                                  ? '● Active'
                                  : '🔒 Expired / Locked'}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {(partner.renewalTxId || partner.subscriptionStatus === 'pending_renewal') && (
                                  <button
                                    onClick={() => handleVerifyRenewalPayment(partner)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] cursor-pointer flex items-center gap-1 shadow-xs"
                                    title="Verify Renewal Payment & Unlock Portal"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Verify Payment</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleQuickExtend30Days(partner)}
                                  className="px-2 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-[10px] cursor-pointer border border-indigo-800"
                                  title="Quick Extend Expiration by 30 Days"
                                >
                                  <span>+30 Days</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingSubPartner(partner);
                                    setSubFormData({
                                      planId: partner.selectedPlanId || partner.planId || 'standard',
                                      billingCycle: partner.billingCycle || 'monthly',
                                      subscriptionStatus: partner.subscriptionStatus || 'active',
                                      expiryDate: partner.subscriptionEndDate ? new Date(partner.subscriptionEndDate).toISOString().slice(0, 10) : '',
                                      commissionRate: partner.commissionRate.toString(),
                                    });
                                    setIsEditSubOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 cursor-pointer"
                                  title="Edit Subscription Details"
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
        </div>
      )}

      {/* Main Partners Table for Sellers, Resellers, All, and Pending */}
      {activeTab !== 'payouts' && activeTab !== 'plans' && activeTab !== 'reseller-plans' && activeTab !== 'renewals' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Partner Type</th>
                  <th className="px-4 py-3">Shop / Owner Name</th>
                  <th className="px-4 py-3">Login Credentials</th>
                  <th className="px-4 py-3">Package / Commission</th>
                  <th className="px-4 py-3">Wallet Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPartners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No partners found. Click "Add New Partner" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredPartners.map((partner) => {
                    const planId = partner.selectedPlanId || partner.planId || 'standard';

                    return (
                      <tr key={partner.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              partner.type === 'seller'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            }`}
                          >
                            {partner.type === 'seller' ? <Store className="w-3 h-3" /> : <Boxes className="w-3 h-3" />}
                            <span className="capitalize">{partner.type}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-white">{partner.shopName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {partner.name} • {partner.phone}
                          </p>
                        </td>

                        <td className="px-4 py-3 font-mono">
                          <p className="font-bold text-slate-800 dark:text-slate-200">user: {partner.username}</p>
                          <p className="text-[11px] text-slate-400">pass: {partner.password || '******'}</p>
                        </td>

                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                          <div>
                            <span className="capitalize">
                              {partner.commissionRate}% {partner.type === 'seller' ? 'Fee' : 'Discount'}
                            </span>
                            {partner.type === 'seller' && (
                              <p className={`text-[10px] font-extrabold uppercase mt-0.5 ${
                                planId === 'premium' ? 'text-purple-400' : planId === 'standard' ? 'text-sky-400' : 'text-slate-400'
                              }`}>
                                Plan: {planId} ({partner.billingCycle || 'monthly'})
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            ৳{partner.walletBalance.toLocaleString('en-BD')}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Earned: ৳{partner.totalEarnings.toLocaleString('en-BD')}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          {partner.status === 'pending' ? (
                            <div className="space-y-1 p-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-spin" />
                                <span>Pending Approval</span>
                              </span>
                              {partner.paymentTxId && (
                                <p className="text-[10px] text-amber-300 font-mono font-bold">
                                  TrxID: {partner.paymentTxId} ({partner.paymentMethod || 'bKash'})
                                </p>
                              )}
                              {partner.paymentAmount && (
                                <p className="text-[9px] text-amber-200 font-bold">
                                  Fee Paid: ৳{partner.paymentAmount}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(partner.id)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                                partner.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 hover:bg-rose-200'
                              }`}
                            >
                              {partner.status === 'active' ? '● Active' : '● Suspended'}
                            </button>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {partner.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveSeller(partner)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                                  title="Approve Seller & Activate Plan"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>

                                <button
                                  onClick={() => handleRejectSeller(partner)}
                                  className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[11px] transition-all cursor-pointer border border-rose-800"
                                  title="Reject Application"
                                >
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {/* Copy Link */}
                            <button
                              onClick={() => handleCopyLoginLink(partner)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                              title="Copy Portal Login Link"
                            >
                              {copiedId === partner.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Login as Partner */}
                            {onLoginAsPartner && (
                              <button
                                onClick={() => onLoginAsPartner(partner)}
                                className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-600 hover:text-white text-sky-700 dark:text-sky-300 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-sky-200 dark:border-sky-800"
                                title="Open Partner Dashboard"
                              >
                                <LogIn className="w-3 h-3" />
                                <span>Login</span>
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={() => {
                                setEditingPartner(partner);
                                setFormData({
                                  type: partner.type,
                                  name: partner.name,
                                  shopName: partner.shopName,
                                  phone: partner.phone,
                                  email: partner.email,
                                  username: partner.username,
                                  password: partner.password || '',
                                  commissionRate: partner.commissionRate.toString(),
                                  city: partner.city || 'Dhaka',
                                  address: partner.address || '',
                                  bkash: partner.paymentDetails?.bkash || '',
                                  bankAccount: partner.paymentDetails?.bankAccount || '',
                                });
                                setIsAddPartnerOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeletePartner(partner.id)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Payouts Table */}
      {activeTab === 'payouts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Partner Payout Requests</h3>
            <span className="text-slate-500">{payouts.length} Total Requests</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Payout ID</th>
                  <th className="px-4 py-3">Partner Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Account Number</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No payout requests found.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">{p.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{p.partnerName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            p.partnerType === 'seller'
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          }`}
                        >
                          {p.partnerType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                        ৳{p.amount.toLocaleString('en-BD')}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                        <span className="uppercase font-bold text-slate-500 mr-1">{p.method}:</span>
                        {p.accountNumber}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : p.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleUpdatePayoutStatus(p.id, 'approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdatePayoutStatus(p.id, 'rejected')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Completed</span>
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

      {/* Edit Subscription Modal */}
      {isEditSubOpen && editingSubPartner && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-sky-500" />
                <span>Edit Seller Subscription</span>
              </h3>
              <button
                onClick={() => setIsEditSubOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscriptionEdit} className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                <p className="font-bold text-slate-900 dark:text-white">{editingSubPartner.shopName}</p>
                <p className="text-slate-500 dark:text-slate-400">{editingSubPartner.name} • {editingSubPartner.email}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Package Plan *</label>
                <select
                  value={subFormData.planId}
                  onChange={(e) => setSubFormData({ ...subFormData, planId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value="basic">🌱 Basic Starter (৳0/mo - 12% fee)</option>
                  <option value="standard">⭐ Standard Pro (৳990/mo - 9% fee)</option>
                  <option value="premium">💎 Premium Enterprise (৳2,490/mo - 6% fee)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Billing Cycle</label>
                  <select
                    value={subFormData.billingCycle}
                    onChange={(e) => setSubFormData({ ...subFormData, billingCycle: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={subFormData.subscriptionStatus}
                    onChange={(e) => setSubFormData({ ...subFormData, subscriptionStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="active">Active (Unlocked)</option>
                    <option value="pending_renewal">Pending Renewal</option>
                    <option value="expired">Expired (Locked)</option>
                    <option value="trial">Trial Period</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={subFormData.expiryDate}
                    onChange={(e) => setSubFormData({ ...subFormData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    value={subFormData.commissionRate}
                    onChange={(e) => setSubFormData({ ...subFormData, commissionRate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditSubOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update Subscription</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Partner Modal */}
      {isAddPartnerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingPartner ? 'Edit Partner Account' : 'Create New Seller / Reseller'}
              </h3>
              <button
                onClick={() => setIsAddPartnerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Partner Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'seller' })}
                    className={`py-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      formData.type === 'seller'
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>Seller / Vendor (সেলার)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'reseller' })}
                    className={`py-2.5 rounded-xl border font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      formData.type === 'reseller'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Reseller / Dropship (রিসেলার)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Shop / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    placeholder="e.g. Apex Tech BD"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahim Chowdhury"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number (Mobile) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="partner@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. seller_apex"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                  <input
                    type="text"
                    required={!editingPartner}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {formData.type === 'seller' ? 'Admin Fee (%)' : 'Wholesale Margin (%)'}
                  </label>
                  <input
                    type="number"
                    value={formData.commissionRate}
                    onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                    placeholder="10"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">bKash / Nagad Number</label>
                  <input
                    type="text"
                    value={formData.bkash}
                    onChange={(e) => setFormData({ ...formData, bkash: e.target.value })}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Account Info</label>
                  <input
                    type="text"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    placeholder="Bank Name, Account & Branch"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPartnerOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Partner Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
