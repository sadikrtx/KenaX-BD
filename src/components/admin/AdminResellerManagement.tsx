import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Sparkles,
  Crown,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Edit,
  Trash2,
  LogIn,
  X,
  Save,
  ShieldCheck,
  CreditCard,
  ArrowUpRight,
  UserCheck,
  Layers,
  RefreshCw,
  AlertTriangle,
  Smartphone,
  Megaphone,
  Globe,
  Target,
  ExternalLink,
  Activity,
  Eye,
  ShoppingBag,
  TrendingUp,
  Users,
  Download,
  FileText,
  Send,
  Share2,
  Building2,
  ChevronRight,
  AlertCircle,
  Calendar,
  Hash,
  ArrowDownRight,
  Filter,
  Shield,
  Award,
  Zap,
  Printer,
  Wallet,
  PlusCircle,
  MinusCircle,
  Edit3,
  Menu,
} from 'lucide-react';
import {
  PartnerUser,
  PartnerPayout,
  Order,
  OrderStatus,
  UserRole,
  StaffUser,
  Product,
  SiteSettings,
} from '../../types';
import {
  getPartnersFromStorage,
  savePartnersToStorage,
  getPayoutsFromStorage,
  savePayoutsToStorage,
} from '../../lib/partnerStorage';
import { AdminResellerPlans } from './AdminResellerPlans';
import { AdminResellerOrders } from './AdminResellerOrders';
import {
  syncResellerPlan,
  getResellerPlanRequests,
  approveResellerPlanRequest,
  rejectResellerPlanRequest,
  getAdminPaymentInfo,
  saveAdminPaymentInfo,
  AdminOfficialPaymentInfo,
  getResellerAdCampaigns,
  updateResellerAdCampaignStatus,
  getResellers,
} from '../../lib/resellerStorage';
import { ResellerPlanId, ResellerPlanUpgradeRequest, ResellerAdCampaign, ResellerUser } from '../../types/reseller';
import { useLanguage } from '../../context/LanguageContext';

export type ResellerSubTab =
  | 'overview'
  | 'orders'
  | 'all'
  | 'pending'
  | 'payouts'
  | 'subscriptions'
  | 'plan_requests'
  | 'renewals'
  | 'plans'
  | 'reseller_ads'
  | 'reseller_substores';

interface AdminResellerManagementProps {
  onLoginAsPartner?: (partner: PartnerUser) => void;
  initialTab?: ResellerSubTab;
  onNavigateToPermissionMatrix?: () => void;
  onBackToAdmin?: () => void;
  orders?: Order[];
  products?: Product[];
  onUpdateOrderStatus?: (
    orderId: string,
    newStatus: OrderStatus,
    courierName?: string,
    trackingNumber?: string,
    handledByStaff?: { id?: string; name?: string; role?: string },
    adminNotes?: string
  ) => void;
  onVerifyPayment?: (orderId: string) => void;
  onOpenInvoice?: (order: Order) => void;
  currentRole?: UserRole;
  currentStaff?: StaffUser | null;
  settings?: SiteSettings;
  onRecordAudit?: (action: string, module: string, targetId: string, details: string) => void;
}

export const AdminResellerManagement: React.FC<AdminResellerManagementProps> = ({
  onLoginAsPartner,
  initialTab = 'overview',
  onNavigateToPermissionMatrix,
  onBackToAdmin,
  orders = [],
  products = [],
  onUpdateOrderStatus,
  onVerifyPayment,
  onOpenInvoice,
  currentRole = 'super_admin',
  currentStaff = null,
  settings,
  onRecordAudit,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const isBn = language === 'bn';

  const [partners, setPartners] = useState<PartnerUser[]>(() => getPartnersFromStorage());
  const [payouts, setPayouts] = useState<PartnerPayout[]>(() => getPayoutsFromStorage());
  const [planRequests, setPlanRequests] = useState<ResellerPlanUpgradeRequest[]>(() =>
    getResellerPlanRequests()
  );
  const [adminPaymentInfo, setAdminPaymentInfo] = useState<AdminOfficialPaymentInfo>(() =>
    getAdminPaymentInfo()
  );
  const [adCampaigns, setAdCampaigns] = useState<ResellerAdCampaign[]>(() =>
    getResellerAdCampaigns()
  );
  const [allResellers, setAllResellers] = useState<ResellerUser[]>(() => getResellers());
  const [isPaymentSettingsOpen, setIsPaymentSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ResellerSubTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // New interactive and permanent payout state
  const [payoutSubFilter, setPayoutSubFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [payoutSearchQuery, setPayoutSearchQuery] = useState('');
  const [approvingPayout, setApprovingPayout] = useState<PartnerPayout | null>(null);
  const [payoutTrxIdInput, setPayoutTrxIdInput] = useState('');
  const [payoutNoteInput, setPayoutNoteInput] = useState('');
  const [resellerToDelete, setResellerToDelete] = useState<PartnerUser | null>(null);
  const [selectedResellerForDetails, setSelectedResellerForDetails] = useState<PartnerUser | null>(null);
  const [selectedReceiptPayout, setSelectedReceiptPayout] = useState<PartnerPayout | null>(null);
  const [walletAdjustReseller, setWalletAdjustReseller] = useState<PartnerUser | null>(null);
  const [walletAdjustAmount, setWalletAdjustAmount] = useState('');
  const [walletAdjustType, setWalletAdjustType] = useState<'credit' | 'debit'>('credit');
  const [walletAdjustReason, setWalletAdjustReason] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    setPartners(getPartnersFromStorage());
    setPayouts(getPayoutsFromStorage());
    setPlanRequests(getResellerPlanRequests());
    setAdminPaymentInfo(getAdminPaymentInfo());
    setAdCampaigns(getResellerAdCampaigns());
    setAllResellers(getResellers());
  }, [activeTab]);

  const refreshPlanRequests = () => {
    setPlanRequests(getResellerPlanRequests());
  };

  const handleApprovePlanRequest = (req: ResellerPlanUpgradeRequest) => {
    const success = approveResellerPlanRequest(req.id, 'Admin');
    if (success) {
      // Update partner storage in sync
      const updated = partners.map((p) => {
        if (p.id === req.resellerId || p.phone === req.resellerPhone || p.name === req.resellerName) {
          return {
            ...p,
            planId: req.targetPlanId,
            selectedPlanId: req.targetPlanId,
            isVip: true,
            resellerTier: 'gold_vip' as const,
            commissionRate: req.targetPlanId === 'premium' ? 20 : 18,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      setPartners(updated);
      savePartnersToStorage(updated);
      refreshPlanRequests();
      setActionSuccessMsg(
        isBn
          ? `✅ ${req.resellerName}-এর জন্য ${req.targetPlanName} সফলভাবে অনুমোদিত হয়েছে!`
          : `✅ Plan ${req.targetPlanName} approved successfully for ${req.resellerName}!`
      );
      setTimeout(() => setActionSuccessMsg(null), 3500);
    }
  };

  const handleRejectPlanRequest = (req: ResellerPlanUpgradeRequest) => {
    const reason = window.prompt(
      isBn ? 'বাতিল করার কারণ লিখুন (রিসেলারকে জানানো হবে):' : 'Enter rejection reason (reseller will be notified):',
      isBn ? 'পেমেন্ট তথ্য বা TrxID অমিল পাওয়া গেছে।' : 'Payment info or TrxID mismatch found.'
    );
    if (reason !== null) {
      rejectResellerPlanRequest(req.id, reason.trim() || undefined);
      refreshPlanRequests();
      setActionSuccessMsg(
        isBn
          ? `❌ ${req.resellerName}-এর রিকোয়েস্ট বাতিল করা হয়েছে।`
          : `❌ Request for ${req.resellerName} has been rejected.`
      );
      setTimeout(() => setActionSuccessMsg(null), 3500);
    }
  };

  const handleSaveAdminPaymentInfo = (e: React.FormEvent) => {
    e.preventDefault();
    saveAdminPaymentInfo(adminPaymentInfo);
    setIsPaymentSettingsOpen(false);
    setActionSuccessMsg(
      isBn ? '✅ অ্যাডমিন পেমেন্ট নম্বর সফলভাবে সংরক্ষিত হয়েছে!' : '✅ Admin payment details saved successfully!'
    );
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Edit Reseller Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<PartnerUser | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    shopName: '',
    phone: '',
    email: '',
    isVip: false,
    planId: 'starter' as ResellerPlanId,
    resellerTier: 'silver' as 'bronze' | 'silver' | 'gold_vip',
    commissionRate: '15',
    status: 'active' as 'active' | 'pending' | 'suspended',
    bkash: '',
    bankAccount: '',
  });

  // Add Reseller Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newResellerForm, setNewResellerForm] = useState({
    name: '',
    shopName: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    isVip: false,
    resellerTier: 'silver' as 'bronze' | 'silver' | 'gold_vip',
    commissionRate: '15',
    city: 'Dhaka',
    address: '',
    bkash: '',
  });

  // Isolated Resellers list
  const resellersList = useMemo(
    () => partners.filter((p) => p.type === 'reseller'),
    [partners]
  );

  const pendingResellersCount = useMemo(
    () => resellersList.filter((r) => r.status === 'pending' || (r.status as any) === 'pending_approval').length,
    [resellersList]
  );

  const vipResellersCount = useMemo(
    () => resellersList.filter((r) => r.isVip || r.resellerTier === 'gold_vip').length,
    [resellersList]
  );

  const pendingRenewalsCount = useMemo(
    () =>
      resellersList.filter(
        (r) =>
          r.subscriptionStatus === 'pending_renewal' ||
          r.subscriptionStatus === 'expired' ||
          Boolean(r.renewalTxId)
      ).length,
    [resellersList]
  );

  // Filtered payouts exclusively for resellers
  const resellerPayouts = useMemo(
    () => payouts.filter((p) => p.partnerType === 'reseller'),
    [payouts]
  );

  const pendingPayoutsCount = useMemo(
    () => resellerPayouts.filter((p) => p.status === 'pending').length,
    [resellerPayouts]
  );

  const totalWalletBalance = useMemo(
    () => resellersList.reduce((acc, r) => acc + (r.walletBalance || 0), 0),
    [resellersList]
  );

  // Reseller Orders computations
  const resellerOrdersList = useMemo(() => {
    return orders.filter(
      (o) => o.isResellerOrder || o.resellerId || o.source === 'reseller' || o.source === 'reseller_hub'
    );
  }, [orders]);

  const pendingResellerOrdersCount = useMemo(() => {
    return resellerOrdersList.filter((o) => o.status === 'pending' || o.status === 'processing').length;
  }, [resellerOrdersList]);

  const totalResellerSalesVolume = useMemo(() => {
    return resellerOrdersList.reduce((sum, o) => sum + (o.total || 0), 0);
  }, [resellerOrdersList]);

  // Approved and historical payouts
  const approvedPayouts = useMemo(() => {
    return resellerPayouts.filter((p) => p.status === 'approved');
  }, [resellerPayouts]);

  const totalDisbursedPayouts = useMemo(() => {
    return approvedPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [approvedPayouts]);

  const pendingPayoutsAmount = useMemo(() => {
    return resellerPayouts.filter((p) => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [resellerPayouts]);

  const filteredPayouts = useMemo(() => {
    return resellerPayouts.filter((p) => {
      if (payoutSubFilter !== 'all' && p.status !== payoutSubFilter) return false;
      if (!payoutSearchQuery.trim()) return true;
      const q = payoutSearchQuery.toLowerCase();
      return (
        p.partnerName.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.txId && p.txId.toLowerCase().includes(q)) ||
        p.accountNumber.includes(q) ||
        p.method.toLowerCase().includes(q)
      );
    });
  }, [resellerPayouts, payoutSubFilter, payoutSearchQuery]);

  const topPerformingResellers = useMemo(() => {
    return [...resellersList]
      .sort((a, b) => (b.totalEarnings || b.walletBalance || 0) - (a.totalEarnings || a.walletBalance || 0))
      .slice(0, 5);
  }, [resellersList]);

  // Filtered resellers list based on active tab
  const filteredResellers = useMemo(() => {
    return resellersList.filter((reseller) => {
      const matchSearch =
        reseller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reseller.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reseller.phone.includes(searchQuery) ||
        reseller.username.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (activeTab === 'pending') return reseller.status === 'pending' || (reseller.status as any) === 'pending_approval';
      if (activeTab === 'subscriptions') return reseller.isVip || reseller.resellerTier === 'gold_vip' || reseller.status === 'active';
      if (activeTab === 'renewals') {
        return (
          reseller.subscriptionStatus === 'pending_renewal' ||
          reseller.subscriptionStatus === 'expired' ||
          Boolean(reseller.renewalTxId) ||
          Boolean(reseller.subscriptionEndDate)
        );
      }
      return true;
    });
  }, [resellersList, searchQuery, activeTab]);

  // VIP Access Toggle Handler
  const handleToggleVipStatus = (resellerId: string) => {
    const updated = partners.map((p) => {
      if (p.id === resellerId) {
        const nextVip = !p.isVip;
        return {
          ...p,
          isVip: nextVip,
          resellerTier: (nextVip ? 'gold_vip' : 'silver') as any,
          commissionRate: nextVip ? 20 : 15,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPartners(updated);
    savePartnersToStorage(updated);
  };

  // Approve Reseller Subscription Renewal
  const handleApproveResellerRenewal = (reseller: PartnerUser, addDays: number = 30) => {
    const updated = partners.map((p) => {
      if (p.id === reseller.id) {
        const currentEnd = p.subscriptionEndDate ? new Date(p.subscriptionEndDate) : new Date();
        const baseDate = currentEnd > new Date() ? currentEnd : new Date();
        baseDate.setDate(baseDate.getDate() + addDays);

        return {
          ...p,
          status: 'active' as const,
          subscriptionStatus: 'active' as const,
          subscriptionEndDate: baseDate.toISOString(),
          renewalTxId: undefined,
          renewalPaymentMethod: undefined,
          renewalAmount: undefined,
          renewalSubmittedAt: undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPartners(updated);
    savePartnersToStorage(updated);
  };

  // Expire Reseller Subscription (for testing & lock enforcement)
  const handleExpireResellerSubscription = (resellerId: string) => {
    const updated = partners.map((p) => {
      if (p.id === resellerId) {
        return {
          ...p,
          subscriptionStatus: 'expired' as const,
          subscriptionEndDate: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPartners(updated);
    savePartnersToStorage(updated);
  };

  // Reactivate Reseller Subscription
  const handleReactivateResellerSubscription = (resellerId: string) => {
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const updated = partners.map((p) => {
      if (p.id === resellerId) {
        return {
          ...p,
          status: 'active' as const,
          subscriptionStatus: 'active' as const,
          subscriptionEndDate: nextMonth.toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPartners(updated);
    savePartnersToStorage(updated);
  };

  // Approve Pending Reseller
  const handleApproveReseller = (reseller: PartnerUser) => {
    const updated = partners.map((p) => {
      if (p.id === reseller.id) {
        return {
          ...p,
          status: 'active' as const,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPartners(updated);
    savePartnersToStorage(updated);
  };

  // Reject Reseller
  const handleRejectReseller = (reseller: PartnerUser) => {
    const updated = partners.map((p) => {
      if (p.id === reseller.id) {
        return {
          ...p,
          status: 'suspended' as const,
          rejectionReason: 'Verification requirements not fulfilled',
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setPartners(updated);
    savePartnersToStorage(updated);
  };

  // Toggle Reseller Active / Suspended
  const handleToggleStatus = (resellerId: string) => {
    const updated = partners.map((p) => {
      if (p.id === resellerId) {
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

  // Copy Reseller Portal Link
  const handleCopyLink = (reseller: PartnerUser) => {
    const origin = window.location.origin;
    const link = `${origin}/?portal=reseller&user=${reseller.username}`;
    navigator.clipboard.writeText(link);
    setCopiedId(reseller.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Payout Approval Modal
  const handleOpenApproveModal = (payout: PartnerPayout) => {
    setApprovingPayout(payout);
    setPayoutTrxIdInput(`RES-TRX-${Date.now().toString().slice(-6)}`);
    setPayoutNoteInput(isBn ? 'রিসেলার প্রফিট পে-আউট সম্পন্ন' : 'Dropship profit payout disbursed');
  };

  // Confirm Payout Approval (Saves to permanent audit history & updates partner wallet)
  const handleConfirmApprovePayout = () => {
    if (!approvingPayout) return;
    const finalTxId = payoutTrxIdInput.trim() || `RES-TRX-${Date.now().toString().slice(-6)}`;
    const finalNote = payoutNoteInput.trim() || 'Dropship profit payout disbursed';

    const updatedPayouts = payouts.map((p) => {
      if (p.id === approvingPayout.id) {
        return {
          ...p,
          status: 'approved' as const,
          processedAt: new Date().toISOString(),
          txId: finalTxId,
          note: finalNote,
        };
      }
      return p;
    });

    // Deduct from partner's balance and increment totalWithdrawn
    const updatedPartners = partners.map((partner) => {
      if (partner.id === approvingPayout.partnerId || partner.username === approvingPayout.partnerId) {
        const newBal = Math.max(0, (partner.walletBalance || 0) - approvingPayout.amount);
        const newWithdrawn = (partner.totalWithdrawn || 0) + approvingPayout.amount;
        return {
          ...partner,
          walletBalance: newBal,
          totalWithdrawn: newWithdrawn,
          updatedAt: new Date().toISOString(),
        };
      }
      return partner;
    });

    setPayouts(updatedPayouts);
    savePayoutsToStorage(updatedPayouts);
    setPartners(updatedPartners);
    savePartnersToStorage(updatedPartners);

    if (onRecordAudit) {
      onRecordAudit(
        'PAYOUT_APPROVED',
        'Reseller Payouts',
        approvingPayout.id,
        `Approved ৳${approvingPayout.amount} for ${approvingPayout.partnerName} via ${approvingPayout.method} (TrxID: ${finalTxId})`
      );
    }

    const paidAmt = approvingPayout.amount;
    setApprovingPayout(null);
    setActionSuccessMsg(
      isBn
        ? `৳${paidAmt.toLocaleString('en-BD')} প্রফিট পে-আউট সফলভাবে অনুমোদন ও হিস্ট্রিতে সংরক্ষিত হয়েছে! (TrxID: ${finalTxId})`
        : `৳${paidAmt.toLocaleString('en-BD')} payout successfully approved and recorded in permanent history! (TrxID: ${finalTxId})`
    );
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Reject Reseller Payout Request
  const handleRejectPayout = (payoutId: string) => {
    if (!window.confirm(isBn ? 'আপনি কি নিশ্চিত যে এই পে-আউট আবেদনটি বাতিল করতে চান?' : 'Are you sure you want to reject this payout request?')) {
      return;
    }
    const updated = payouts.map((p) => {
      if (p.id === payoutId) {
        return {
          ...p,
          status: 'rejected' as const,
          processedAt: new Date().toISOString(),
          note: isBn ? 'অ্যাডমিন কর্তৃক বাতিলকৃত' : 'Admin Rejected',
        };
      }
      return p;
    });
    setPayouts(updated);
    savePayoutsToStorage(updated);
    if (onRecordAudit) {
      onRecordAudit('PAYOUT_REJECTED', 'Reseller Payouts', payoutId, 'Rejected reseller payout request');
    }
    setActionSuccessMsg(isBn ? 'পে-আউট আবেদনটি বাতিল করা হয়েছে।' : 'Payout request has been rejected.');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Delete Reseller Permanently
  const handleConfirmDeleteReseller = () => {
    if (!resellerToDelete) return;
    const targetName = resellerToDelete.name;
    const targetId = resellerToDelete.id;

    const updated = partners.filter((p) => p.id !== targetId);
    setPartners(updated);
    savePartnersToStorage(updated);

    const updatedResellers = allResellers.filter((r) => r.id !== targetId && r.phone !== resellerToDelete.phone);
    setAllResellers(updatedResellers);

    if (onRecordAudit) {
      onRecordAudit('RESELLER_DELETED', 'Reseller Management', targetId, `Permanently deleted reseller ${targetName}`);
    }

    setResellerToDelete(null);
    setActionSuccessMsg(
      isBn
        ? `রিসেলার "${targetName}" সফলভাবে পার্মানেন্ট ডিলিট করা হয়েছে!`
        : `Reseller "${targetName}" has been permanently deleted!`
    );
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Manual Balance Adjustment (Credit / Debit)
  const handleSaveWalletAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAdjustReseller) return;
    const amt = parseFloat(walletAdjustAmount);
    if (isNaN(amt) || amt <= 0) return;

    const targetPartner = walletAdjustReseller;
    const updated = partners.map((p) => {
      if (p.id === targetPartner.id) {
        const currentBal = p.walletBalance || 0;
        const newBal = walletAdjustType === 'credit' ? currentBal + amt : Math.max(0, currentBal - amt);
        return {
          ...p,
          walletBalance: newBal,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    setPartners(updated);
    savePartnersToStorage(updated);

    if (onRecordAudit) {
      onRecordAudit(
        'WALLET_ADJUSTMENT',
        'Reseller Management',
        targetPartner.id,
        `${walletAdjustType === 'credit' ? 'Credited' : 'Debited'} ৳${amt} for ${targetPartner.shopName}. Reason: ${walletAdjustReason || 'Manual Admin Adjustment'}`
      );
    }

    setActionSuccessMsg(
      isBn
        ? `রিসেলার "${targetPartner.shopName}" এর ওয়ালেটে ৳${amt.toLocaleString('en-BD')} ${walletAdjustType === 'credit' ? 'সফলভাবে যোগ' : 'কর্তন'} করা হয়েছে!`
        : `Wallet balance ৳${amt.toLocaleString('en-BD')} successfully ${walletAdjustType === 'credit' ? 'credited to' : 'debited from'} ${targetPartner.shopName}!`
    );
    setWalletAdjustReseller(null);
    setWalletAdjustAmount('');
    setWalletAdjustReason('');
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Bulk Approve Pending Resellers
  const handleBulkApprovePendingResellers = () => {
    const pending = resellersList.filter((r) => r.status === 'pending' || (r.status as any) === 'pending_approval');
    if (pending.length === 0) {
      setActionSuccessMsg(isBn ? 'কোনো অপেক্ষমান আবেদন নেই।' : 'No pending applications to approve.');
      setTimeout(() => setActionSuccessMsg(null), 2500);
      return;
    }

    const pendingIds = new Set(pending.map((p) => p.id));
    const updated = partners.map((p) => {
      if (pendingIds.has(p.id)) {
        return {
          ...p,
          status: 'active' as const,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    setPartners(updated);
    savePartnersToStorage(updated);
    setActionSuccessMsg(
      isBn
        ? `সকল অপেক্ষমান ${pending.length} টি আবেদন সফলভাবে অনুমোদন করা হয়েছে!`
        : `All ${pending.length} pending applications have been approved!`
    );
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Export Reseller Data (CSV)
  const handleExportResellers = () => {
    const csvRows = [
      ['ID', 'Name', 'Shop Name', 'Phone', 'Email', 'Plan', 'Tier', 'Status', 'Wallet Balance', 'Total Earnings', 'Total Withdrawn', 'City', 'Created At'],
      ...resellersList.map((r) => [
        r.id,
        `"${r.name}"`,
        `"${r.shopName}"`,
        `"${r.phone}"`,
        r.email || '',
        r.planId || 'free',
        r.resellerTier || 'silver',
        r.status,
        r.walletBalance || 0,
        r.totalEarnings || 0,
        r.totalWithdrawn || 0,
        `"${r.city || ''}"`,
        r.createdAt,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kenax_resellers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Payout History (CSV)
  const handleExportPayouts = () => {
    const csvRows = [
      ['Payout ID', 'Reseller Name', 'Amount (BDT)', 'Payment Method', 'Account Number', 'Status', 'TrxID', 'Requested Date', 'Processed Date', 'Admin Note'],
      ...resellerPayouts.map((p) => [
        p.id,
        `"${p.partnerName}"`,
        p.amount,
        p.method,
        `"${p.accountNumber}"`,
        p.status,
        p.txId || '',
        p.requestedAt,
        p.processedAt || '',
        `"${p.note || ''}"`,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kenax_payout_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Reseller Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReseller) return;

    const rateNum = parseFloat(editFormData.commissionRate) || editingReseller.commissionRate;

    const updated = partners.map((p) => {
      if (p.id === editingReseller.id) {
        return {
          ...p,
          name: editFormData.name.trim(),
          shopName: editFormData.shopName.trim(),
          phone: editFormData.phone.trim(),
          email: editFormData.email.trim(),
          planId: editFormData.planId,
          selectedPlanId: editFormData.planId,
          isVip: editFormData.planId === 'premium' || editFormData.isVip,
          resellerTier: editFormData.resellerTier,
          commissionRate: rateNum,
          status: editFormData.status,
          paymentDetails: {
            ...p.paymentDetails,
            bkash: editFormData.bkash || p.paymentDetails.bkash,
            bankAccount: editFormData.bankAccount || p.paymentDetails.bankAccount,
          },
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    setPartners(updated);
    savePartnersToStorage(updated);
    // Directly sync authoritative reseller plan in resellerStorage so reseller portal instantly reflects new plan
    syncResellerPlan(editingReseller.id, editFormData.planId);
    setIsEditModalOpen(false);
    setEditingReseller(null);
  };

  // Create New Reseller
  const handleCreateReseller = (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = parseFloat(newResellerForm.commissionRate) || 15;
    const newId = `reseller-${Date.now().toString().slice(-6)}`;

    const newPartner: PartnerUser = {
      id: newId,
      type: 'reseller',
      name: newResellerForm.name.trim(),
      shopName: newResellerForm.shopName.trim(),
      phone: newResellerForm.phone.trim(),
      email: newResellerForm.email.trim(),
      username: newResellerForm.username.trim().toLowerCase(),
      password: newResellerForm.password.trim(),
      status: 'active',
      isVip: newResellerForm.isVip,
      resellerTier: newResellerForm.resellerTier,
      commissionRate: rateNum,
      walletBalance: 0,
      totalEarnings: 0,
      totalWithdrawn: 0,
      paymentDetails: {
        bkash: newResellerForm.bkash.trim(),
      },
      city: newResellerForm.city,
      address: newResellerForm.address,
      createdAt: new Date().toISOString(),
    };

    const updated = [newPartner, ...partners];
    setPartners(updated);
    savePartnersToStorage(updated);

    setIsAddModalOpen(false);
    setNewResellerForm({
      name: '',
      shopName: '',
      phone: '',
      email: '',
      username: '',
      password: '',
      isVip: false,
      resellerTier: 'silver',
      commissionRate: '15',
      city: 'Dhaka',
      address: '',
      bkash: '',
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150 text-xs">
      {/* Toast Alert */}
      {actionSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer font-bold px-2">✕</button>
        </div>
      )}

      {/* TOP MASTER HEADER BAR: Reseller Command Hub Header with Back to Admin & Live KPIs */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {onBackToAdmin && (
              <button
                type="button"
                onClick={onBackToAdmin}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-lg shadow-sky-950/40 border border-sky-400/50 hover:scale-[1.03] active:scale-95 ring-2 ring-sky-500/30"
                title={isBn ? 'মেইন এডমিন ড্যাশবোর্ডে ফিরে যান' : 'Back to Main Admin Dashboard'}
              >
                <ChevronRight className="w-4 h-4 rotate-180 stroke-[3]" />
                <span>{isBn ? 'মেইন এডমিন ড্যাশবোর্ড' : 'Main Admin Dashboard'}</span>
              </button>
            )}

            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-sky-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/30 shrink-0">
              <Boxes className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {isBn ? 'রিসেলার কমান্ড হাব ও ড্রপশিপিং পোর্টাল' : 'Reseller Command Hub & Portal'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {isBn ? 'লাইভ হাব' : 'Live Hub'}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {isBn
                  ? 'হোলসেল ড্রপশিপিং পার্টনার নেটওয়ার্ক, লাইভ অর্ডার, কমিশন টায়ার এবং প্রফিট পে-আউট কন্ট্রোল সেন্টার।'
                  : 'Manage zero-inventory wholesale dropshipping partners, fulfill orders, configure margin tiers, and disburse payouts.'}
              </p>
            </div>
          </div>

          {/* Header Controls: Search + Mobile Menu Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
            >
              <Menu className="w-4 h-4" />
              <span>{isBn ? 'হাব মেনু' : 'Hub Menu'}</span>
            </button>

            {/* Quick Reseller Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isBn ? 'রিসেলার নাম / ফোন / শপ খুঁজুন...' : 'Search reseller, shop, phone...'}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Real-time KPI Stats Ribbon Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* 1. Total Resellers */}
          <div className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-medium truncate">{isBn ? 'মোট রিসেলার' : 'Total Resellers'}</div>
              <div className="text-xs font-black text-slate-800 dark:text-slate-100">{resellersList.length}</div>
            </div>
          </div>

          {/* 2. Active Resellers */}
          <div className="p-2 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium truncate">{isBn ? 'সক্রিয় পার্টনার' : 'Active Partners'}</div>
              <div className="text-xs font-black text-emerald-700 dark:text-emerald-300">{resellersList.filter((r) => r.status === 'active').length}</div>
            </div>
          </div>

          {/* 3. Pending Approvals */}
          <div className="p-2 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium truncate">{isBn ? 'পেন্ডিং KYC' : 'Pending KYC'}</div>
              <div className="text-xs font-black text-amber-700 dark:text-amber-300">{pendingResellersCount}</div>
            </div>
          </div>

          {/* 4. Reseller Orders */}
          <div className="p-2 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/50 dark:border-sky-800/40 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-sky-600/80 dark:text-sky-400/80 font-medium truncate">{isBn ? 'ড্রপশিপ অর্ডার' : 'Dropship Orders'}</div>
              <div className="text-xs font-black text-sky-700 dark:text-sky-300">{resellerOrdersList.length}</div>
            </div>
          </div>

          {/* 5. Total Wallet Balance */}
          <div className="p-2 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/40 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-medium truncate">{isBn ? 'ওয়ালেট ব্যালেন্স' : 'Wallet Balance'}</div>
              <div className="text-xs font-black text-indigo-700 dark:text-indigo-300 font-mono">৳{totalWalletBalance.toLocaleString('en-BD')}</div>
            </div>
          </div>

          {/* 6. Pending Payouts */}
          <div className="p-2 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-800/40 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-medium truncate">{isBn ? 'পেন্ডিং পেআউট' : 'Pending Payouts'}</div>
              <div className="text-xs font-black text-rose-700 dark:text-rose-300 font-mono">
                ৳{pendingPayoutsAmount.toLocaleString('en-BD')} {pendingPayoutsCount > 0 && `(${pendingPayoutsCount})`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reseller Hub Master Layout: Left Vertical Command Sidebar + Right Workspace Area */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT COLUMN: Vertical Reseller Command Center & Hub Management Sidebar */}
        <aside className={`w-full lg:w-72 xl:w-80 shrink-0 space-y-3.5 ${isMobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
          {/* 1. Reseller Command Center Brand Header Card */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/30 shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {isBn ? 'কমান্ড সেন্টার' : 'Command Center'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {isBn ? 'সক্রিয় হাব' : 'Live Hub'}
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900 dark:text-white mt-0.5 truncate">
                  {isBn ? 'রিসেলার কমান্ড হাব' : 'Reseller Command Hub'}
                </h2>
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
              {isBn
                ? 'হোলসেল ড্রপশিপিং পার্টনার নেটওয়ার্ক, লাইভ অর্ডার, কমিশন টায়ার এবং প্রফিট পে-আউট কন্ট্রোল করুন।'
                : 'Manage zero-inventory wholesale dropshipping partners, fulfill orders, configure margin tiers, and disburse payouts.'}
            </p>
          </div>

          {/* 2. Executive Quick Action Tools (Export Reseller, Export Payouts, Payment Settings, Permissions, Ads Reseller) */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {isBn ? 'কুইক এক্সিকিউটিভ কন্ট্রোল' : 'Executive Controls'}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>

            {/* Primary Action Button: Add Reseller */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black shadow-md shadow-emerald-600/30 cursor-pointer flex items-center justify-center gap-2 text-xs transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{isBn ? 'নতুন রিসেলার অনবোর্ডিং' : 'Add New Reseller'}</span>
            </button>

            {/* 2-Column Grid of 5 Executive Tools */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {/* 1. Export Resellers */}
              <button
                onClick={handleExportResellers}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all text-center group"
                title={isBn ? 'রিসেলার তালিকা CSV এক্সপোর্ট' : 'Export Resellers CSV'}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold leading-tight mt-0.5">{isBn ? 'রিসেলার এক্সপোর্ট' : 'Export Resellers'}</span>
              </button>

              {/* 2. Export Payouts */}
              <button
                onClick={handleExportPayouts}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all text-center group"
                title={isBn ? 'পেআউট হিস্ট্রি CSV এক্সপোর্ট' : 'Export Payout History CSV'}
              >
                <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold leading-tight mt-0.5">{isBn ? 'পেআউট এক্সপোর্ট' : 'Export Payouts'}</span>
              </button>

              {/* 3. Payment Settings */}
              <button
                onClick={() => setIsPaymentSettingsOpen(true)}
                className="p-2.5 rounded-2xl bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all text-center group"
                title={isBn ? 'অফিসিয়াল পেমেন্ট নম্বর সেটিংস' : 'Configure Payment Details'}
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold leading-tight mt-0.5">{isBn ? 'পেমেন্ট সেটিংস' : 'Payment Settings'}</span>
              </button>

              {/* 4. Permissions Matrix */}
              <button
                onClick={() => {
                  if (onNavigateToPermissionMatrix) {
                    onNavigateToPermissionMatrix();
                  } else {
                    setActiveTab('plans');
                  }
                }}
                className="p-2.5 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 cursor-pointer flex flex-col items-center justify-center gap-1 transition-all text-center group"
                title={isBn ? 'রোল ও পারমিশন কন্ট্রোল' : 'Role-Based Permissions'}
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold leading-tight mt-0.5">{isBn ? 'পারমিশন ম্যাট্রিক্স' : 'Permissions'}</span>
              </button>

              {/* 5. Ads Reseller / Campaign Tracker (Full Width in Grid) */}
              <button
                onClick={() => setActiveTab('reseller_ads')}
                className="col-span-2 p-2 rounded-2xl bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/50 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/50 cursor-pointer flex items-center justify-center gap-2 transition-all group"
                title={isBn ? 'রিসেলার বিজ্ঞাপন ও ক্যাম্পেইন ট্র্যাকার' : 'Reseller Ads & Campaign Tracker'}
              >
                <Megaphone className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold">{isBn ? 'এডস ক্যাম্পেইন ট্র্যাকার' : 'Ads Campaign Tracker'}</span>
                <span className="px-1.5 py-0.2 rounded-md font-mono text-[9px] bg-rose-500 text-white font-bold ml-1">
                  {adCampaigns.length}
                </span>
              </button>
            </div>

            {/* Bulk Approve Pending Resellers Trigger */}
            {pendingResellersCount > 0 && (
              <button
                onClick={handleBulkApprovePendingResellers}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all text-[11px] animate-pulse"
                title={isBn ? 'সকল অপেক্ষমান আবেদন এক ক্লিকে অনুমোদন' : 'Bulk approve all pending applications'}
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>{isBn ? `সকল KYC এক ক্লিকে অনুমোদন (${pendingResellersCount})` : `Bulk Approve KYC (${pendingResellersCount})`}</span>
              </button>
            )}
          </div>

          {/* 3. Vertical Categorized Navigation Menu (Like Admin Dashboard Sidebar) */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            {/* Category 1: Command & Operations */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block">
                {isBn ? 'কমান্ড ও অপারেশনস' : 'Command & Operations'}
              </span>

              {/* 1. Overview */}
              <button
                onClick={() => {
                  setActiveTab('overview');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-between ${
                  activeTab === 'overview'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>{isBn ? 'ড্যাশবোর্ড ওভারভিউ' : 'Overview Command'}</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 opacity-40 ${activeTab === 'overview' ? 'opacity-100' : ''}`} />
              </button>

              {/* 2. Reseller Orders */}
              <button
                onClick={() => {
                  setActiveTab('orders');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-between ${
                  activeTab === 'orders'
                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-amber-500" />
                  <span>{isBn ? 'রিসেলার অর্ডারস' : 'Reseller Orders'}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                    activeTab === 'orders'
                      ? 'bg-white/20 text-white'
                      : pendingResellerOrdersCount > 0
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {resellerOrdersList.length}
                </span>
              </button>

              {/* 3. All Resellers Directory */}
              <button
                onClick={() => {
                  setActiveTab('all');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-between ${
                  activeTab === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Boxes className="w-4 h-4 text-emerald-500" />
                  <span>{isBn ? 'সকল রিসেলার তালিকা' : 'All Resellers'}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                    activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {resellersList.length}
                </span>
              </button>

              {/* 4. Pending Requests & KYC */}
              <button
                onClick={() => {
                  setActiveTab('pending');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-between ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>{isBn ? 'পেন্ডিং আবেদন ও KYC' : 'Pending Requests'}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                    activeTab === 'pending'
                      ? 'bg-slate-950 text-white'
                      : pendingResellersCount > 0
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {pendingResellersCount}
                </span>
              </button>
            </div>

            {/* Category 2: Finance & Disbursements */}
            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block">
                {isBn ? 'ফাইন্যান্স ও পেআউট' : 'Finance & Disbursements'}
              </span>

              {/* 5. Profit Payouts */}
              <button
                onClick={() => {
                  setActiveTab('payouts');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-between ${
                  activeTab === 'payouts'
                    ? 'bg-sky-600 text-white shadow-xs shadow-sky-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <DollarSign className="w-4 h-4 text-sky-500" />
                  <span>{isBn ? 'প্রফিট পে-আউট ও হিস্ট্রি' : 'Profit Payouts & History'}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                    activeTab === 'payouts'
                      ? 'bg-white/20 text-white'
                      : pendingPayoutsCount > 0
                      ? 'bg-rose-500 text-white font-black animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {pendingPayoutsCount > 0 ? `${pendingPayoutsCount} New` : resellerPayouts.length}
                </span>
              </button>
            </div>

            {/* Category 3: Membership & Rules */}
            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block">
                {isBn ? 'মেম্বারশিপ ও রুলস' : 'Membership & Rules'}
              </span>

              {/* 6. Tiers & Feature Matrix */}
              <button
                onClick={() => {
                  setActiveTab('plans');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-between ${
                  activeTab === 'plans'
                    ? 'bg-teal-600 text-white shadow-xs shadow-teal-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-teal-500" />
                  <span>{isBn ? 'টিয়ার ও ফিচার রুল ম্যাট্রিক্স' : 'Tiers & Feature Matrix'}</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-md font-mono text-[9px] bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold">
                  {isBn ? 'লাইভ' : 'Live'}
                </span>
              </button>

              {/* 7. VIP Plan Upgrade Requests */}
              <button
                onClick={() => {
                  setActiveTab('plan_requests');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-between ${
                  activeTab === 'plan_requests'
                    ? 'bg-purple-600 text-white shadow-xs shadow-purple-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Crown className="w-4 h-4 text-purple-400" />
                  <span>{isBn ? 'ভিআইপি রিকোয়েস্ট' : 'VIP Upgrades'}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                    activeTab === 'plan_requests'
                      ? 'bg-white/20 text-white'
                      : planRequests.filter((r) => r.status === 'pending').length > 0
                      ? 'bg-purple-500 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {planRequests.filter((r) => r.status === 'pending').length}
                </span>
              </button>

              {/* 8. Active VIP Members */}
              <button
                onClick={() => {
                  setActiveTab('subscriptions');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-between ${
                  activeTab === 'subscriptions'
                    ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{isBn ? 'ভিআইপি মেম্বার তালিকা' : 'VIP Members'}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                    activeTab === 'subscriptions' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {vipResellersCount}
                </span>
              </button>

              {/* 9. Subscription Renewals */}
              <button
                onClick={() => {
                  setActiveTab('renewals');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-between ${
                  activeTab === 'renewals'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 text-indigo-500" />
                  <span>{isBn ? 'রিনিউয়াল মনিটরিং' : 'Renewals'}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                    activeTab === 'renewals'
                      ? 'bg-white/20 text-white'
                      : pendingRenewalsCount > 0
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {pendingRenewalsCount}
                </span>
              </button>
            </div>

            {/* Category 4: Marketing & Platform Growth */}
            <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block">
                {isBn ? 'মার্কেটিং ও প্ল্যাটফর্ম' : 'Marketing & Growth'}
              </span>

              {/* 10. Reseller Ads Tracker */}
              <button
                onClick={() => {
                  setActiveTab('reseller_ads');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-between ${
                  activeTab === 'reseller_ads'
                    ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Megaphone className="w-4 h-4 text-rose-500" />
                  <span>{isBn ? 'রিসেলার এডস ট্র্যাকার' : 'Ads Tracker'}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                    activeTab === 'reseller_ads' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {adCampaigns.length}
                </span>
              </button>

              {/* 11. Sub-Stores */}
              <button
                onClick={() => {
                  setActiveTab('reseller_substores');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-2xl font-bold text-xs cursor-pointer transition-all flex items-center justify-between ${
                  activeTab === 'reseller_substores'
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <span>{isBn ? 'সাব-স্টোর নেটওয়ার্ক' : 'Sub-Stores'}</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                    activeTab === 'reseller_substores' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {allResellers.filter((r) => r.subStoreEnabled !== false).length}
                </span>
              </button>
            </div>
          </div>

          {/* 4. Financial Health Mini-Card */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white border border-slate-800 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {isBn ? 'ফাইন্যান্সিয়াল ব্যালেন্স সামারি' : 'Financial Ledger'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[10px] text-slate-400">{isBn ? 'পরিশোধিত প্রফিট' : 'Disbursed'}</p>
                <p className="font-black text-emerald-400 text-sm mt-0.5">৳{totalDisbursedPayouts.toLocaleString('en-BD')}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">{isBn ? 'ওয়ালেট সঞ্চয়' : 'In Wallets'}</p>
                <p className="font-black text-sky-400 text-sm mt-0.5">৳{totalWalletBalance.toLocaleString('en-BD')}</p>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{isBn ? 'মোট ড্রপশিপিং সেলস:' : 'Gross Reseller Sales:'}</span>
              <span className="font-black text-amber-300">৳{totalResellerSalesVolume.toLocaleString('en-BD')}</span>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Reseller Hub Workspace Content */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          {/* Top Section Header & Mobile Navigation Toggle Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <Menu className="w-4 h-4" />
                <span>{isBn ? 'কমান্ড মেনু' : 'Menu'}</span>
              </button>

              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>{isBn ? 'রিসেলার হাব' : 'Reseller Hub'}</span>
                  <span>/</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {activeTab === 'overview' && (isBn ? 'ড্যাশবোর্ড ওভারভিউ' : 'Overview Command Center')}
                    {activeTab === 'orders' && (isBn ? 'রিসেলার অর্ডারস' : 'Reseller Orders')}
                    {activeTab === 'all' && (isBn ? 'সকল রিসেলার ডিরেক্টরি' : 'All Resellers')}
                    {activeTab === 'pending' && (isBn ? 'পেন্ডিং আবেদন ও KYC' : 'Pending Requests')}
                    {activeTab === 'payouts' && (isBn ? 'প্রফিট পে-আউট ও হিস্ট্রি' : 'Profit Payouts & History')}
                    {activeTab === 'plans' && (isBn ? 'টিয়ার ও ফিচার রুল ম্যাট্রিক্স' : 'Tiers Config & Rule Matrix')}
                    {activeTab === 'plan_requests' && (isBn ? 'ভিআইপি মেম্বারশিপ রিকোয়েস্ট' : 'VIP Upgrade Requests')}
                    {activeTab === 'subscriptions' && (isBn ? 'সক্রিয় ভিআইপি পার্টনার তালিকা' : 'Active VIP Members')}
                    {activeTab === 'renewals' && (isBn ? 'রিনিউয়াল মনিটরিং' : 'Subscription Renewals')}
                    {activeTab === 'reseller_ads' && (isBn ? 'এডস ক্যাম্পেইন ট্র্যাকার' : 'Ads Tracker')}
                    {activeTab === 'reseller_substores' && (isBn ? 'সাব-স্টোর নেটওয়ার্ক' : 'Sub-Stores')}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {activeTab === 'overview' && (isBn ? 'রিসেলার কমান্ড সেন্টার ওভারভিউ' : 'Reseller Command Center Overview')}
                  {activeTab === 'orders' && (isBn ? 'ড্রপশিপিং লাইভ অর্ডার ম্যানেজমেন্ট' : 'Dropshipping Live Orders')}
                  {activeTab === 'all' && (isBn ? 'সকল ড্রপশিপিং পার্টনার ডিরেক্টরি' : 'Resellers Directory & Wallets')}
                  {activeTab === 'pending' && (isBn ? 'অপেক্ষমান পার্টনার আবেদন ও KYC ভেরিফিকেশন' : 'Pending Verification Queue')}
                  {activeTab === 'payouts' && (isBn ? 'প্রফিট পে-আউট অনুমোদন ও স্থায়ী হিস্ট্রি' : 'Profit Disbursements & Audit History')}
                  {activeTab === 'plans' && (isBn ? 'রিসেলার মেম্বারশিপ ও ট্যাব রুল ম্যাট্রিক্স' : 'Membership Tiers & Feature Rules')}
                  {activeTab === 'plan_requests' && (isBn ? 'ভিআইপি মেম্বারশিপ আপগ্রেড রিকোয়েস্ট' : 'VIP Tier Upgrade Requests')}
                  {activeTab === 'subscriptions' && (isBn ? 'সক্রিয় ভিআইপি মেম্বার তালিকা' : 'Active VIP Partners')}
                  {activeTab === 'renewals' && (isBn ? 'সাবস্ক্রিপশন মেয়াদ ও রিনিউয়াল মনিটরিং' : 'Subscription Expiry & Renewals')}
                  {activeTab === 'reseller_ads' && (isBn ? 'রিসেলার এডস ট্র্যাকার ও ক্যাম্পেইন আরওআই' : 'Reseller Ad Campaign Tracker')}
                  {activeTab === 'reseller_substores' && (isBn ? 'রিসেলার সাব-স্টোর হাব ও লাইভ শপস' : 'Reseller Sub-Store Networks')}
                </h3>
              </div>
            </div>

            {/* Quick Right Shortcuts */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isBn ? 'নতুন রিসেলার' : 'Add Reseller'}</span>
              </button>
            </div>
          </div>

          {/* Mobile Horizontal Quick Navigation Chips (Visible on Mobile / Tablet) */}
          <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'overview', name: isBn ? 'ওভারভিউ' : 'Overview' },
              { id: 'orders', name: isBn ? 'অর্ডারস' : 'Orders', count: resellerOrdersList.length },
              { id: 'all', name: isBn ? 'রিসেলারস' : 'Resellers', count: resellersList.length },
              { id: 'pending', name: isBn ? 'পেন্ডিং' : 'Pending', count: pendingResellersCount },
              { id: 'payouts', name: isBn ? 'পেআউটস' : 'Payouts', count: pendingPayoutsCount },
              { id: 'plans', name: isBn ? 'টিয়ার্স' : 'Tiers' },
              { id: 'plan_requests', name: isBn ? 'ভিআইপি' : 'VIP Upgrades' },
              { id: 'reseller_ads', name: isBn ? 'এডস' : 'Ads' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ResellerSubTab)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{tab.name}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className={`px-1 py-0.2 rounded-full text-[9px] font-black ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Executive 8-KPI Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
            {/* 1. Total Resellers */}
            <div
              onClick={() => setActiveTab('all')}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all hover:shadow-xs group"
            >
              <div className="flex items-center justify-between text-slate-400">
                <p className="text-[10px] font-bold uppercase tracking-wider">{isBn ? 'মোট রিসেলার' : 'Total Resellers'}</p>
                <Users className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {resellersList.length}
              </h4>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                {resellersList.filter(r => r.status === 'active').length} {isBn ? 'সক্রিয়' : 'Active'}
              </p>
            </div>

            {/* 2. Pending KYC */}
            <div
              onClick={() => setActiveTab('pending')}
              className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-500 cursor-pointer transition-all hover:shadow-xs group"
            >
              <div className="flex items-center justify-between text-amber-500">
                <p className="text-[10px] font-bold uppercase tracking-wider">{isBn ? 'অপেক্ষমান আবেদন' : 'Pending KYC'}</p>
                <Clock className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-lg font-black text-amber-500 dark:text-amber-400 mt-1 flex items-center gap-1.5">
                <span>{pendingResellersCount}</span>
                {pendingResellersCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black animate-pulse">
                    New
                  </span>
                )}
              </h4>
              <p className="text-[10px] text-amber-600/80 dark:text-amber-300/80 font-semibold mt-0.5">
                {isBn ? 'ভেরিফিকেশন বাকি' : 'Needs Review'}
              </p>
            </div>

            {/* 3. Reseller Orders */}
            <div
              onClick={() => setActiveTab('orders')}
              className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 hover:border-sky-500 cursor-pointer transition-all hover:shadow-xs group"
            >
              <div className="flex items-center justify-between text-sky-500">
                <p className="text-[10px] font-bold uppercase tracking-wider">{isBn ? 'রিসেলার অর্ডার' : 'Reseller Orders'}</p>
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-lg font-black text-sky-500 dark:text-sky-400 mt-1 flex items-center gap-1.5">
                <span>{resellerOrdersList.length}</span>
                {pendingResellerOrdersCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500 text-white font-black animate-pulse">
                    {pendingResellerOrdersCount}
                  </span>
                )}
              </h4>
              <p className="text-[10px] text-sky-600/80 dark:text-sky-300/80 font-semibold mt-0.5 truncate">
                {pendingResellerOrdersCount} {isBn ? 'ডেলিভারি বাকি' : 'To Process'}
              </p>
            </div>

            {/* 4. VIP Resellers */}
            <div
              onClick={() => setActiveTab('subscriptions')}
              className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 hover:border-purple-500 cursor-pointer transition-all hover:shadow-xs group"
            >
              <div className="flex items-center justify-between text-purple-500">
                <p className="text-[10px] font-bold uppercase tracking-wider">{isBn ? 'ভিআইপি পার্টনার' : 'VIP Partners'}</p>
                <Crown className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-lg font-black text-purple-500 dark:text-purple-400 mt-1">
                {vipResellersCount}
              </h4>
              <p className="text-[10px] text-purple-600/80 dark:text-purple-300/80 font-semibold mt-0.5">
                {isBn ? 'উচ্চ কমিশন টায়ার' : 'Gold/Diamond'}
              </p>
            </div>

            {/* 5. Reseller Sales Volume */}
            <div
              onClick={() => setActiveTab('orders')}
              className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-500 cursor-pointer transition-all hover:shadow-xs group"
            >
              <div className="flex items-center justify-between text-indigo-500">
                <p className="text-[10px] font-bold uppercase tracking-wider">{isBn ? 'মোট ড্রপশিপিং সেল' : 'Gross Sales'}</p>
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-lg font-black text-indigo-600 dark:text-indigo-300 mt-1">
                ৳{totalResellerSalesVolume.toLocaleString('en-BD')}
              </h4>
              <p className="text-[10px] text-indigo-600/80 dark:text-indigo-300/80 font-semibold mt-0.5">
                {resellerOrdersList.length} {isBn ? 'অর্ডার থেকে' : 'Total Orders'}
              </p>
            </div>

            {/* 6. Wallet Balances */}
            <div
              onClick={() => setActiveTab('all')}
              className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500 cursor-pointer transition-all hover:shadow-xs group"
            >
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                <p className="text-[10px] font-bold uppercase tracking-wider">{isBn ? 'ওয়ালেট ব্যালেন্স' : 'Wallet Balances'}</p>
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                ৳{totalWalletBalance.toLocaleString('en-BD')}
              </h4>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 font-semibold mt-0.5">
                {isBn ? 'দাবীকৃত বা সঞ্চিত' : 'In Reseller Wallets'}
              </p>
            </div>

            {/* 7. Pending Payout Requests */}
            <div
              onClick={() => setActiveTab('payouts')}
              className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 hover:border-rose-500 cursor-pointer transition-all hover:shadow-xs group"
            >
              <div className="flex items-center justify-between text-rose-500">
                <p className="text-[10px] font-bold uppercase tracking-wider">{isBn ? 'অপেক্ষমান পেআউট' : 'Pending Payouts'}</p>
                <Clock className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-lg font-black text-rose-500 dark:text-rose-400 mt-1 flex items-center gap-1.5">
                <span>৳{pendingPayoutsAmount.toLocaleString('en-BD')}</span>
                {pendingPayoutsCount > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-black animate-pulse">
                    {pendingPayoutsCount}
                  </span>
                )}
              </h4>
              <p className="text-[10px] text-rose-600/80 dark:text-rose-300/80 font-semibold mt-0.5">
                {pendingPayoutsCount} {isBn ? 'টি আবেদন অপেক্ষমান' : 'Requests Waiting'}
              </p>
            </div>

            {/* 8. Disbursed Payouts */}
            <div
              onClick={() => setActiveTab('payouts')}
              className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 hover:border-teal-500 cursor-pointer transition-all hover:shadow-xs group"
            >
              <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
                <p className="text-[10px] font-bold uppercase tracking-wider">{isBn ? 'পরিশোধিত প্রফিট' : 'Disbursed Profit'}</p>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-lg font-black text-teal-600 dark:text-teal-300 mt-1">
                ৳{totalDisbursedPayouts.toLocaleString('en-BD')}
              </h4>
              <p className="text-[10px] text-teal-700/80 dark:text-teal-300/80 font-semibold mt-0.5">
                {approvedPayouts.length} {isBn ? 'টি পরিশোধিত ভাউচার' : 'Paid Vouchers'}
              </p>
            </div>
          </div>

      {/* Search & Filter Toolbar for Directory and Renewals */}
      {(activeTab === 'all' || activeTab === 'pending' || activeTab === 'subscriptions' || activeTab === 'renewals') && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isBn ? "নাম, শপ নেম, ফোন নম্বর বা ইউজারনেম দিয়ে খুঁজুন..." : "Search reseller by name, shop, phone or username..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              {isBn ? `মোট পাওয়া গেছে: ${filteredResellers.length} জন` : `Found: ${filteredResellers.length} Resellers`}
            </span>
          </div>
        </div>
      )}

      {/* Tab Content 1: Executive Overview Command Center */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Command Action Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border border-slate-700/60 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-sm sm:text-base flex items-center gap-2 text-white">
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>{isBn ? 'কুইক অ্যাডমিন অ্যাকশন ও অপারেশনাল ট্রিগার' : 'Quick Admin Actions & Operational Triggers'}</span>
                </h3>
                <p className="text-slate-300 text-xs mt-1">
                  {isBn
                    ? 'এক ক্লিকে অপেক্ষমান আবেদন, পে-আউট অনুমোদন, লাইভ অর্ডার প্রসেস এবং নতুন রিসেলার অনবোর্ড করুন।'
                    : 'Process pending applications, disburse profit payouts, inspect live orders, and configure reseller tiers in one click.'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {pendingResellersCount > 0 && (
                  <button
                    onClick={handleBulkApprovePendingResellers}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isBn ? `সকল KYC অনুমোদন (${pendingResellersCount})` : `Approve All KYC (${pendingResellersCount})`}</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('payouts')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-md"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{isBn ? `পে-আউট প্রসেস করুন (${pendingPayoutsCount})` : `Process Payouts (${pendingPayoutsCount})`}</span>
                </button>

                <button
                  onClick={() => setActiveTab('orders')}
                  className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-md"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{isBn ? `লাইভ রিসেলার অর্ডারস (${resellerOrdersList.length})` : `Live Reseller Orders (${resellerOrdersList.length})`}</span>
                </button>

                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold border border-white/20 flex items-center gap-1.5 transition-all text-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'নতুন রিসেলার যোগ' : 'Add New Reseller'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Two-Column Grid: Recent Orders & Urgent Payouts (Left) + Top Resellers Leaderboard & Tier Distribution (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 7/12 cols */}
            <div className="lg:col-span-7 space-y-5">
              {/* Recent Reseller Orders Widget */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {isBn ? 'সাম্প্রতিক রিসেলার অর্ডার' : 'Recent Reseller Orders'}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {isBn ? 'রিসেলার নেটওয়ার্কের সাম্প্রতিক লাইভ অর্ডার ও কমিশন' : 'Latest orders submitted across the reseller network'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{isBn ? 'সব অর্ডার দেখুন' : 'View All Orders'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {resellerOrdersList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {isBn ? 'এখনো কোনো রিসেলার অর্ডার জমা পড়েনি।' : 'No reseller orders recorded yet.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[500px]">
                      <thead className="text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">{isBn ? 'অর্ডার আইডি ও সময়' : 'Order ID & Date'}</th>
                          <th className="py-2.5 px-3">{isBn ? 'গ্রাহক / ডেলিভারি' : 'Customer'}</th>
                          <th className="py-2.5 px-3">{isBn ? 'রিসেলার শপ' : 'Reseller Store'}</th>
                          <th className="py-2.5 px-3 text-right">{isBn ? 'মূল্য ও প্রফিট' : 'Total & Margin'}</th>
                          <th className="py-2.5 px-3 text-right">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {resellerOrdersList.slice(0, 5).map((order) => {
                          const resellerMargin = order.resellerCommission || order.resellerMargin || Math.round((order.total || 0) * 0.15);
                          return (
                            <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-2.5 px-3">
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">#{order.id.slice(-6)}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{new Date(order.createdAt).toLocaleDateString()}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]">{order.customerName}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">{order.customerPhone}</p>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                                  {order.resellerStoreName || order.resellerName || (isBn ? 'রিসেলার শপ' : 'Reseller Hub')}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="font-extrabold text-slate-900 dark:text-white block">৳{(order.total || 0).toLocaleString('en-BD')}</span>
                                <span className="text-[10px] font-bold text-emerald-500 block">৳{resellerMargin.toLocaleString('en-BD')} {isBn ? 'মার্জিন' : 'Profit'}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                  order.status === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse' :
                                  order.status === 'shipped' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20' :
                                  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Urgent Pending Payout Requests Queue */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {isBn ? 'জরুরি প্রফিট পে-আউট রিকোয়েস্ট' : 'Urgent Profit Payout Requests'}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {isBn ? 'রিসেলারদের উত্তোলন আবেদন যাচাই করে TrxID দিয়ে পরিশোধ করুন' : 'Verify reseller withdrawal requests and disburse with TrxID'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('payouts')}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{isBn ? 'সব পে-আউট দেখুন' : 'View All Payouts'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {pendingPayoutsCount === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {isBn ? 'সকল পে-আউট পরিশোধিত!' : 'All Payouts Settled!'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isBn ? 'এই মুহূর্তে কোনো নতুন পে-আউট রিকোয়েস্ট অপেক্ষমান নেই।' : 'No withdrawal requests waiting for admin action.'}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {resellerPayouts.filter(p => p.status === 'pending').slice(0, 4).map((payout) => (
                      <div
                        key={payout.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{payout.partnerName}</span>
                            <span className="px-2 py-0.2 rounded-full text-[9px] font-bold uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              {payout.method}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {payout.accountNumber} • ID: #{payout.id.slice(-6)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">{isBn ? 'দাবীকৃত প্রফিট' : 'Requested'}</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                              ৳{payout.amount.toLocaleString('en-BD')}
                            </span>
                          </div>

                          <button
                            onClick={() => handleOpenApproveModal(payout)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-xs flex items-center gap-1 transition-all shrink-0"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isBn ? 'অ্যাপ্রুভ ও পরিশোধ' : 'Approve & Disburse'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 5/12 cols */}
            <div className="lg:col-span-5 space-y-5">
              {/* Top Resellers Leaderboard */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {isBn ? 'সেরা রিসেলার পারফরম্যান্স লিডারবোর্ড' : 'Top Reseller Leaderboard'}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {isBn ? 'লাইফটাইম সেলস ও প্রফিটের ভিত্তিতে শীর্ষ ৫ জন' : 'Top 5 ranked by lifetime dropshipping profit'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('all')}
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{isBn ? 'সকল রিসেলার' : 'Directory'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {topPerformingResellers.map((reseller, idx) => {
                    const medalColors = [
                      'from-amber-400 to-yellow-500 text-slate-950 font-black shadow-amber-500/30',
                      'from-slate-300 to-slate-400 text-slate-900 font-black',
                      'from-amber-600 to-amber-700 text-white font-black',
                      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
                    ];

                    return (
                      <div
                        key={reseller.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-emerald-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs shadow-xs shrink-0 ${
                            idx < 3 ? `bg-gradient-to-tr ${medalColors[idx]}` : medalColors[idx]
                          }`}>
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white text-xs">{reseller.shopName}</p>
                            <p className="text-[10px] text-slate-400">{reseller.name} • {reseller.phone}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs block">
                              ৳{(reseller.totalEarnings || 0).toLocaleString('en-BD')}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                              {reseller.resellerTier || 'Silver'} ({reseller.commissionRate}%)
                            </span>
                          </div>

                          {onLoginAsPartner && (
                            <button
                              onClick={() => onLoginAsPartner(reseller)}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                              title={isBn ? 'রিসেলার পোর্টালে ঢুকুন' : 'Login as Reseller'}
                            >
                              <LogIn className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* VIP Membership & Tier Distribution Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {isBn ? 'মেম্বারশিপ টায়ার ও কমিশন বিভাজন' : 'Membership Tier & Commission Distribution'}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {isBn ? 'রিসেলারদের টায়ার বন্টন ও ডিসকাউন্ট হার' : 'Breakdown of active tiers and profit margins'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('plans')}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{isBn ? 'কনফিগ' : 'Configure'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {/* Gold VIP */}
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <div>
                        <span className="font-bold text-amber-700 dark:text-amber-300 text-xs block">
                          ⭐ {isBn ? 'গোল্ড ভিআইপি টায়ার' : 'Gold VIP Tier'}
                        </span>
                        <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                          {isBn ? '২০% সর্বোচ্চ মার্জিন ডিসকাউন্ট' : '20% Dynamic Discount Margin'}
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-amber-700 dark:text-amber-300 text-sm">
                      {resellersList.filter(r => r.isVip || r.resellerTier === 'gold_vip').length} {isBn ? 'জন' : 'VIPs'}
                    </span>
                  </div>

                  {/* Silver */}
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <div>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 text-xs block">
                          🥈 {isBn ? 'সিলভার স্ট্যান্ডার্ড টায়ার' : 'Silver Standard Tier'}
                        </span>
                        <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                          {isBn ? '১৫% স্ট্যান্ডার্ড মার্জিন ডিসকাউন্ট' : '15% Standard Margin Discount'}
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">
                      {resellersList.filter(r => !r.isVip && (r.resellerTier === 'silver' || !r.resellerTier)).length} {isBn ? 'জন' : 'Members'}
                    </span>
                  </div>

                  {/* Bronze */}
                  <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-slate-500" />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                          🥉 {isBn ? 'ব্রোঞ্জ স্টার্টার টায়ার' : 'Bronze Starter Tier'}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {isBn ? '১০% বিগিনার মার্জিন ডিসকাউন্ট' : '10% Beginner Margin Discount'}
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-slate-800 dark:text-slate-200 text-sm">
                      {resellersList.filter(r => r.resellerTier === 'bronze').length} {isBn ? 'জন' : 'Starters'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Reseller Orders Management */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <span>{isBn ? 'রিসেলার ড্রপশিপিং অর্ডারস কমান্ড সেন্টার' : 'Reseller Dropshipping Orders Command Center'}</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {isBn
                  ? 'সকল রিসেলারের সাবমিট করা অর্ডার, পার্সেল ট্র্যাকিং, কুরিয়ার ডেলিভারি স্ট্যাটাস ও প্রফিট রিলিজ পরিচালনা করুন।'
                  : 'Fulfill reseller drop-ship orders, verify payments, assign couriers, and release commissions.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                {pendingResellerOrdersCount} {isBn ? 'অপেক্ষমান অর্ডার' : 'Pending Orders'}
              </span>
            </div>
          </div>

          <AdminResellerOrders
            orders={orders}
            products={products}
            onUpdateOrderStatus={onUpdateOrderStatus}
            onVerifyPayment={onVerifyPayment}
            onOpenInvoice={onOpenInvoice}
            currentRole={currentRole}
            currentStaff={currentStaff}
            settings={settings}
          />
        </div>
      )}

      {/* Tab Content 4: Reseller Plan */}
      {activeTab === 'plans' && <AdminResellerPlans />}

      {/* Tab Content 5: Payout Reseller with Permanent History & Official Receipts */}
      {activeTab === 'payouts' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs space-y-4 p-4 sm:p-6">
          {/* Header & Sub-filter bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span>{isBn ? 'রিসেলার প্রফিট পে-আউট ও স্থায়ী অডিট হিস্ট্রি' : 'Reseller Profit Payout & Permanent Audit History'}</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {isBn
                  ? 'রিসেলারদের সকল উইথড্রয়াল রিকোয়েস্ট যাচাই করে অনুমোদন দিন। অনুমোদনের পর তথ্য আজীবনের জন্য হিস্ট্রিতে সংরক্ষিত থাকবে।'
                  : 'Review withdrawal requests, confirm payouts with TrxID, and view official audit receipts.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportPayouts}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1.5 text-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isBn ? 'CSV এক্সপোর্ট' : 'Export CSV'}</span>
              </button>
            </div>
          </div>

          {/* Sub-Filters and Search Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setPayoutSubFilter('pending')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
                  payoutSubFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isBn ? 'অপেক্ষমান আবেদন' : 'Pending Requests'}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  payoutSubFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  {pendingPayoutsCount}
                </span>
              </button>

              <button
                onClick={() => setPayoutSubFilter('approved')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
                  payoutSubFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'পরিশোধিত হিস্ট্রি (স্থায়ী)' : 'Approved History (Permanent)'}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  payoutSubFilter === 'approved' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  {approvedPayouts.length}
                </span>
              </button>

              <button
                onClick={() => setPayoutSubFilter('rejected')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
                  payoutSubFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isBn ? 'বাতিলকৃত' : 'Rejected'}</span>
              </button>

              <button
                onClick={() => setPayoutSubFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 ${
                  payoutSubFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <span>{isBn ? 'সকল লেনদেন' : 'All Transactions'}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  payoutSubFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
                }`}>
                  {resellerPayouts.length}
                </span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isBn ? "রিসেলার নাম, TrxID বা ফোন..." : "Search payout by name, TrxID..."}
                value={payoutSearchQuery}
                onChange={(e) => setPayoutSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Mobile View: Cards */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 space-y-2.5 pt-2">
            {filteredPayouts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {isBn ? 'এই ক্যাটাগরিতে কোনো পে-আউট রেকর্ড নেই।' : 'No payout records found in this category.'}
              </div>
            ) : (
              filteredPayouts.map((payout) => (
                <div key={payout.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{payout.partnerName}</p>
                      <p className="font-mono text-[10px] text-slate-400">ID: #{payout.id.slice(-8)}</p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        payout.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-500/30'
                          : payout.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-500/30 animate-pulse'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {payout.status === 'approved' ? (isBn ? 'পরিশোধিত' : 'Paid') : payout.status === 'pending' ? (isBn ? 'অপেক্ষমান' : 'Pending') : (isBn ? 'বাতিল' : 'Rejected')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div>
                      <span className="text-slate-400 block text-[10px]">{isBn ? 'উত্তোলনকৃত প্রফিট' : 'Payout Amount'}</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">৳{payout.amount.toLocaleString('en-BD')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">{isBn ? 'পেমেন্ট মাধ্যম' : 'Account'}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 uppercase font-bold text-[10px]">
                        {payout.method}: {payout.accountNumber}
                      </span>
                    </div>
                  </div>

                  {payout.txId && (
                    <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 font-bold bg-sky-500/10 px-2.5 py-1 rounded-lg flex items-center justify-between">
                      <span>TrxID: {payout.txId}</span>
                      {payout.processedAt && (
                        <span className="text-slate-400">{new Date(payout.processedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {payout.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleOpenApproveModal(payout)}
                          className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer text-center shadow-xs flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isBn ? 'অনুমোদন ও TrxID প্রদান' : 'Approve with TrxID'}</span>
                        </button>
                        <button
                          onClick={() => handleRejectPayout(payout.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs cursor-pointer text-center border border-rose-800"
                        >
                          {isBn ? 'বাতিল' : 'Reject'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSelectedReceiptPayout(payout)}
                        className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{isBn ? 'ভাউচার রসিদ দেখুন' : 'Official Receipt Voucher'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto scrollbar-none">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs">
                <tr>
                  <th className="px-4 py-3">{isBn ? 'পেআউট আইডি' : 'Payout ID'}</th>
                  <th className="px-4 py-3">{isBn ? 'রিসেলার পার্টনার' : 'Reseller Partner'}</th>
                  <th className="px-4 py-3">{isBn ? 'দাবীকৃত প্রফিট' : 'Requested Amount'}</th>
                  <th className="px-4 py-3">{isBn ? 'উত্তোলন একাউন্ট' : 'Disbursement Account'}</th>
                  <th className="px-4 py-3">{isBn ? 'আবেদনের তারিখ' : 'Submitted At'}</th>
                  <th className="px-4 py-3">{isBn ? 'স্ট্যাটাস ও TrxID' : 'Status & TrxID'}</th>
                  <th className="px-4 py-3 text-right">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredPayouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isBn ? 'এই ক্যাটাগরিতে কোনো পে-আউট রেকর্ড নেই।' : 'No payout records found in this category.'}
                    </td>
                  </tr>
                ) : (
                  filteredPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-200">
                        #{payout.id.slice(-8)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 dark:text-white">{payout.partnerName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Reseller Account</p>
                      </td>
                      <td className="px-4 py-3 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        ৳{payout.amount.toLocaleString('en-BD')}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                        <span className="uppercase font-bold text-slate-400 mr-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">{payout.method}</span>
                        <span>{payout.accountNumber}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                        {new Date(payout.requestedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            payout.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-500/30'
                              : payout.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-500/30 animate-pulse'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {payout.status === 'approved' ? (isBn ? '✓ পরিশোধিত' : '✓ Paid') : payout.status === 'pending' ? (isBn ? '● অপেক্ষমান' : '● Pending') : (isBn ? '✕ বাতিল' : '✕ Rejected')}
                        </span>
                        {payout.txId && (
                          <p className="text-[10px] font-mono text-sky-600 dark:text-sky-400 mt-1 font-bold">
                            TrxID: {payout.txId}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {payout.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenApproveModal(payout)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-xs flex items-center gap-1 transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isBn ? 'অনুমোদন ও TrxID' : 'Approve & Pay'}</span>
                            </button>
                            <button
                              onClick={() => handleRejectPayout(payout.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs cursor-pointer border border-rose-800 transition-colors"
                            >
                              {isBn ? 'বাতিল' : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedReceiptPayout(payout)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{isBn ? 'ভাউচার রসিদ' : 'Receipt Voucher'}</span>
                          </button>
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

      {/* Tab Content: Reseller Ads Tracker Overseer */}
      {activeTab === 'reseller_ads' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Reseller Ad Spend</span>
              <span className="text-xl font-black text-rose-400 mt-0.5 block">
                ৳{adCampaigns.reduce((sum, c) => sum + c.spentBDT, 0).toLocaleString('en-BD')}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Ad-Driven Revenue</span>
              <span className="text-xl font-black text-emerald-400 mt-0.5 block">
                ৳{adCampaigns.reduce((sum, c) => sum + c.revenueBDT, 0).toLocaleString('en-BD')}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Average System ROAS</span>
              <span className="text-xl font-black text-amber-400 mt-0.5 block">
                {(
                  adCampaigns.reduce((sum, c) => sum + (c.spentBDT > 0 ? c.revenueBDT / c.spentBDT : 0), 0) /
                  (adCampaigns.length || 1)
                ).toFixed(1)}x
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Active Ad Campaigns</span>
              <span className="text-xl font-black text-sky-400 mt-0.5 block">
                {adCampaigns.filter((c) => c.status === 'active').length}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-rose-500" />
                <span>Reseller Meta, TikTok & Google Ad Campaigns</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">{adCampaigns.length} Campaigns Active</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <tr>
                    <th className="px-4 py-3">Reseller & Store</th>
                    <th className="px-4 py-3">Campaign & Platform</th>
                    <th className="px-4 py-3">Pixel ID</th>
                    <th className="px-4 py-3">Daily Budget</th>
                    <th className="px-4 py-3">Spent vs Revenue</th>
                    <th className="px-4 py-3">ROAS</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No active reseller ad campaigns found.
                      </td>
                    </tr>
                  ) : (
                    adCampaigns.map((camp) => (
                      <tr key={camp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-white">{camp.resellerStoreName}</p>
                          <p className="text-[10px] text-slate-500">{camp.resellerName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-white">{camp.campaignTitle}</p>
                          <span className="inline-block px-2 py-0.2 rounded-full text-[9px] font-black uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-0.5">
                            {camp.platform}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{camp.pixelId}</td>
                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">৳{camp.dailyLimitBDT}/day</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-rose-400">Spent: ৳{camp.spentBDT.toLocaleString('en-BD')}</p>
                          <p className="font-bold text-emerald-400">Rev: ৳{camp.revenueBDT.toLocaleString('en-BD')}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            {camp.roas || (camp.spentBDT > 0 ? (camp.revenueBDT / camp.spentBDT).toFixed(1) : '0.0')}x
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            camp.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {camp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              const next = camp.status === 'active' ? 'paused' : 'active';
                              updateResellerAdCampaignStatus(camp.id, next);
                              setAdCampaigns(getResellerAdCampaigns());
                            }}
                            className={`px-3 py-1 rounded-xl text-[10px] font-bold cursor-pointer transition-colors ${
                              camp.status === 'active'
                                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                : 'bg-emerald-600 text-white hover:bg-emerald-500'
                            }`}
                          >
                            {camp.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Reseller Sub-Stores & Invoices Overseer */}
      {activeTab === 'reseller_substores' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Activated Sub-Stores</span>
              <span className="text-xl font-black text-indigo-400 mt-0.5 block">
                {allResellers.filter((r) => r.subStoreEnabled !== false).length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Custom Domains Connected</span>
              <span className="text-xl font-black text-emerald-400 mt-0.5 block">
                {allResellers.filter((r) => Boolean(r.subDomain)).length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Pixel Connected Stores</span>
              <span className="text-xl font-black text-amber-400 mt-0.5 block">
                {allResellers.filter((r) => Boolean(r.subStoreFbPixelId)).length}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-500" />
                <span>Reseller Online Storefronts & Invoice Branding Directory</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <tr>
                    <th className="px-4 py-3">Store Name & Owner</th>
                    <th className="px-4 py-3">Store URL / Subdomain</th>
                    <th className="px-4 py-3">Invoice Phone</th>
                    <th className="px-4 py-3">Meta / TikTok Pixel</th>
                    <th className="px-4 py-3">Custom Invoice Footer</th>
                    <th className="px-4 py-3 text-right">View Storefront</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allResellers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No reseller sub-stores registered.
                      </td>
                    </tr>
                  ) : (
                    allResellers.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
                              {r.subStoreLogo ? (
                                <img src={r.subStoreLogo} alt={r.subStoreTitle || r.fullName} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                r.fullName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{r.subStoreTitle || r.businessName || `${r.fullName}'s Store`}</p>
                              <p className="text-[10px] text-slate-500">{r.fullName} ({r.phone})</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-emerald-400">
                          kenaxbd.com/store/{r.subDomain || r.username || 'shop'}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">{r.subStorePhone || r.phone}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                          {r.subStoreFbPixelId ? `Meta: ${r.subStoreFbPixelId}` : 'No Pixel'}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-400 truncate max-w-[180px]">
                          {r.subStoreCustomInvoiceFooter || 'Default Footer'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`https://kenaxbd.com/store/${r.subDomain || r.username || 'shop'}?ref=${r.referralCode || r.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] inline-flex items-center gap-1 transition-all"
                          >
                            <span>Open Store</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Plan Upgrade Requests (VIP Membership Purchases) */}
      {activeTab === 'plan_requests' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs space-y-3">
          <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>{isBn ? 'রিসেলার ভিআইপি প্ল্যান আপগ্রেড ও পেমেন্ট অনুমোদন' : 'Reseller VIP Plan Upgrade & Purchase Requests'}</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {isBn
                  ? 'রিসেলারদের ভিআইপি মেম্বারশিপ আপগ্রেড রিকোয়েস্ট ও TrxID ভেরিফিকেশন।'
                  : 'Review VIP membership upgrade requests and verify payment transaction IDs.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPaymentSettingsOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                <span>{isBn ? 'পেমেন্ট নম্বর সেটিংস' : 'Payment Settings'}</span>
              </button>
              <button
                type="button"
                onClick={refreshPlanRequests}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                title="Refresh Requests"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile View: Cards */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 sm:p-3 space-y-2.5">
            {planRequests.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                কোনো ভিআইপি প্ল্যান আপগ্রেড রিকোয়েস্ট জমা পড়েনি।
              </div>
            ) : (
              planRequests.map((req) => (
                <div key={req.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>{req.resellerName}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{req.resellerPhone}</p>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 font-black text-[10px] border border-amber-500/40">
                      {req.targetPlanName}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Payment Details</span>
                      <span className="font-bold text-indigo-400 uppercase text-[10px]">{req.paymentMethod}</span>
                      <span className="text-slate-400 text-[10px] block">From: {req.senderPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Amount</span>
                      <span className="font-black text-emerald-400 text-xs">৳{req.amount.toLocaleString('en-BD')}</span>
                      <span className="text-slate-400 text-[9px] block uppercase font-sans">{req.billingCycle}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span className="font-mono font-bold text-xs text-white truncate">TrxID: {req.transactionId}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(req.transactionId);
                        setCopiedId(req.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                    >
                      {copiedId === req.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 text-[10px]">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        req.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : req.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {req.status.toUpperCase()}
                    </span>

                    <span className="text-slate-400 font-mono">
                      {new Date(req.requestedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApprovePlanRequest(req)}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve VIP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectPlanRequest(req)}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs cursor-pointer border border-rose-800"
                      >
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto scrollbar-none">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Reseller & Shop</th>
                  <th className="px-4 py-3">Target VIP Plan</th>
                  <th className="px-4 py-3">Cycle & Amount</th>
                  <th className="px-4 py-3">Payment TrxID & Method</th>
                  <th className="px-4 py-3">Submitted At</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {planRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      কোনো ভিআইপি প্ল্যান আপগ্রেড রিকোয়েস্ট জমা পড়েনি।
                    </td>
                  </tr>
                ) : (
                  planRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-400" />
                          <span>{req.resellerName}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          {req.resellerPhone} • {req.resellerBusinessName || req.currentPlanId.toUpperCase()}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 font-black text-[11px] border border-amber-500/40 inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>{req.targetPlanName}</span>
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Upgrading from: <span className="font-semibold text-slate-300 uppercase">{req.currentPlanId}</span>
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-extrabold text-emerald-400 font-mono text-sm">
                          ৳{req.amount.toLocaleString('en-BD')}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">
                          {req.billingCycle === 'yearly' ? 'Yearly (12 Months)' : 'Monthly (1 Month)'}
                        </p>
                      </td>

                      <td className="px-4 py-3 font-mono">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase text-[10px]">
                              {req.paymentMethod}
                            </span>
                            <span className="text-slate-300 text-[11px] font-bold">
                              From: {req.senderPhone}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-extrabold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                              TrxID: {req.transactionId}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(req.transactionId);
                                setCopiedId(req.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                              title="Copy TrxID"
                            >
                              {copiedId === req.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {req.proofNote && (
                            <p className="text-[10px] text-slate-400 italic">
                              Note: {req.proofNote}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                        {new Date(req.requestedAt).toLocaleString('en-GB', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : req.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {req.status.toUpperCase()}
                        </span>
                        {req.adminNote && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {req.adminNote}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {req.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApprovePlanRequest(req)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] cursor-pointer shadow-md shadow-emerald-950/40 flex items-center gap-1"
                              title="Approve and activate VIP plan"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve VIP</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectPlanRequest(req)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[11px] cursor-pointer border border-rose-800"
                              title="Reject upgrade request"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-medium">
                            {req.status === 'approved' ? '✓ VIP Active' : '✕ Rejected'}
                          </span>
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

      {/* Main Table for All Reseller, Pending Reseller, Subscription Reseller */}
      {(activeTab === 'all' || activeTab === 'pending' || activeTab === 'subscriptions') && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs space-y-3">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-500" />
              <span>
                {activeTab === 'all' && (isBn ? 'সকল নিবন্ধিত ড্রপশিপিং রিসেলার তালিকা' : 'All Registered Dropshipping Resellers')}
                {activeTab === 'pending' && (isBn ? 'অপেক্ষমান রিসেলার আবেদন যাচাই' : 'Pending Reseller Applications')}
                {activeTab === 'subscriptions' && (isBn ? 'ভিআইপি মেম্বারশিপ ও প্রিমিয়াম রিসেলার' : 'Reseller VIP Membership & Tier Subscriptions')}
              </span>
            </h3>
            <span className="text-slate-400 text-[10px] sm:text-[11px] font-bold">
              {isBn ? `মোট ${filteredResellers.length} টি রেকর্ড` : `Showing ${filteredResellers.length} Records`}
            </span>
          </div>

          {/* Mobile View: Cards */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 sm:p-3 space-y-2.5">
            {filteredResellers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {isBn ? 'কোনো রিসেলার রেকর্ড পাওয়া যায়নি।' : 'No reseller records found.'}
              </div>
            ) : (
              filteredResellers.map((reseller) => {
                const isVipMember = reseller.isVip || reseller.resellerTier === 'gold_vip';

                return (
                  <div key={reseller.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{reseller.shopName}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {reseller.name} • {reseller.phone}
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleVipStatus(reseller.id)}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold cursor-pointer transition-all flex items-center gap-1 border shrink-0 ${
                          isVipMember
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <Crown className="w-3 h-3" />
                        <span>{isVipMember ? (isBn ? '⭐ ভিআইপি' : '⭐ VIP') : (isBn ? 'স্ট্যান্ডার্ড' : 'Standard')}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 font-mono">
                      <div>
                        <span className="text-slate-400 block text-[9px] font-sans">{isBn ? 'ইউজারনেম' : 'Username'}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-[10px]">{reseller.username}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] font-sans">{isBn ? 'ওয়ালেট ব্যালেন্স' : 'Wallet Balance'}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          ৳{(reseller.walletBalance || 0).toLocaleString('en-BD')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] pt-1">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        reseller.resellerTier === 'gold_vip' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30' :
                        reseller.resellerTier === 'silver' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30' :
                        'bg-slate-500/20 text-slate-600 dark:text-slate-300 border border-slate-500/30'
                      }`}>
                        {reseller.resellerTier || 'Silver Tier'} • {reseller.commissionRate}% {isBn ? 'মার্জিন' : 'Margin'}
                      </span>

                      <div>
                        {reseller.status === 'pending' || (reseller.status as any) === 'pending_approval' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 animate-spin" /> {isBn ? 'অপেক্ষমান' : 'Pending'}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(reseller.id)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer ${
                              reseller.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                            }`}
                          >
                            {reseller.status === 'active' ? (isBn ? '● সক্রিয়' : '● Active') : (isBn ? '● স্থগিত' : '● Suspended')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      {(reseller.status === 'pending' || (reseller.status as any) === 'pending_approval') && (
                        <>
                          <button
                            onClick={() => handleApproveReseller(reseller)}
                            className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isBn ? 'অনুমোদন' : 'Approve'}</span>
                          </button>
                          <button
                            onClick={() => handleRejectReseller(reseller)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs cursor-pointer border border-rose-800"
                          >
                            <span>{isBn ? 'বাতিল' : 'Reject'}</span>
                          </button>
                        </>
                      )}

                      {/* View Profile */}
                      <button
                        onClick={() => setSelectedResellerForDetails(reseller)}
                        className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-500 cursor-pointer"
                        title={isBn ? 'প্রোফাইল বিবরণ দেখুন' : 'View Profile Details'}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Adjust Balance */}
                      <button
                        onClick={() => {
                          setWalletAdjustReseller(reseller);
                          setWalletAdjustAmount('');
                          setWalletAdjustReason('');
                        }}
                        className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                        title={isBn ? 'ব্যালেন্স অ্যাডজাস্ট' : 'Adjust Wallet Balance'}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                      </button>

                      {/* Copy Link */}
                      <button
                        onClick={() => handleCopyLink(reseller)}
                        className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        title={isBn ? 'পোর্টাল লিংক কপি' : 'Copy Portal Link'}
                      >
                        {copiedId === reseller.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {onLoginAsPartner && (
                        <button
                          onClick={() => onLoginAsPartner(reseller)}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                          title={isBn ? 'রিসেলার পোর্টালে ঢুকুন' : 'Login as Reseller'}
                        >
                          <LogIn className="w-3 h-3" />
                          <span>{isBn ? 'লগইন' : 'Login'}</span>
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => {
                          setEditingReseller(reseller);
                          setEditFormData({
                            name: reseller.name,
                            shopName: reseller.shopName,
                            phone: reseller.phone,
                            email: reseller.email,
                            isVip: reseller.isVip || reseller.resellerTier === 'gold_vip',
                            planId: (reseller.planId || (reseller as any).selectedPlanId || (reseller.isVip ? 'premium' : 'starter')) as ResellerPlanId,
                            resellerTier: reseller.resellerTier || 'silver',
                            commissionRate: reseller.commissionRate.toString(),
                            status: reseller.status,
                            bkash: reseller.paymentDetails?.bkash || '',
                            bankAccount: reseller.paymentDetails?.bankAccount || '',
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                        title={isBn ? 'এডিট করুন' : 'Edit Details'}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Permanent Delete */}
                      <button
                        onClick={() => setResellerToDelete(reseller)}
                        className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 text-rose-600 hover:text-white dark:text-rose-400 border border-rose-200 dark:border-rose-900 cursor-pointer transition-colors"
                        title={isBn ? 'রিসেলার পার্মানেন্ট ডিলিট' : 'Permanently Delete Reseller'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto scrollbar-none">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs">
                <tr>
                  <th className="px-4 py-3">{isBn ? 'রিসেলার ও শপ' : 'Reseller / Store'}</th>
                  <th className="px-4 py-3">{isBn ? 'লগইন তথ্য' : 'Login Credentials'}</th>
                  <th className="px-4 py-3">{isBn ? 'ভিআইপি মেম্বারশিপ' : 'VIP Status Toggle'}</th>
                  <th className="px-4 py-3">{isBn ? 'মার্জিন ডিসকাউন্ট' : 'Discount Tier / Margin'}</th>
                  <th className="px-4 py-3">{isBn ? 'ওয়ালেট ব্যালেন্স' : 'Wallet Balance'}</th>
                  <th className="px-4 py-3">{isBn ? 'অ্যাকাউন্ট স্ট্যাটাস' : 'Account Status'}</th>
                  <th className="px-4 py-3 text-right">{isBn ? 'ম্যানেজমেন্ট অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredResellers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isBn ? 'কোনো রিসেলার রেকর্ড পাওয়া যায়নি।' : 'No reseller records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredResellers.map((reseller) => {
                    const isVipMember = reseller.isVip || reseller.resellerTier === 'gold_vip';

                    return (
                      <tr key={reseller.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Boxes className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{reseller.shopName}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {reseller.name} • {reseller.phone}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{reseller.email}</p>
                        </td>

                        <td className="px-4 py-3 font-mono">
                          <p className="font-bold text-slate-800 dark:text-slate-200">user: {reseller.username}</p>
                          <p className="text-[11px] text-slate-400">pass: {reseller.password || '******'}</p>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleVipStatus(reseller.id)}
                            className={`px-3 py-1 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1.5 border shadow-2xs ${
                              isVipMember
                                ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
                            }`}
                            title={isBn ? 'ভিআইপি স্ট্যাটাস পরিবর্তন করতে ক্লিক করুন' : 'Click to Toggle VIP Status'}
                          >
                            <Crown className="w-3.5 h-3.5" />
                            <span>{isVipMember ? (isBn ? '⭐ ভিআইপি পার্টনার' : '⭐ VIP Member') : (isBn ? 'স্ট্যান্ডার্ড' : 'Standard')}</span>
                          </button>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] uppercase ${
                            reseller.resellerTier === 'gold_vip' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30' :
                            reseller.resellerTier === 'silver' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30' :
                            'bg-slate-500/20 text-slate-600 dark:text-slate-300 border border-slate-500/30'
                          }`}>
                            {reseller.resellerTier || 'Silver Tier'}
                          </span>
                          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {reseller.commissionRate}% {isBn ? 'কমিশন মার্জিন' : 'Margin Discount'}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                            ৳{(reseller.walletBalance || 0).toLocaleString('en-BD')}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {isBn ? 'মোট আয়:' : 'Lifetime:'} ৳{(reseller.totalEarnings || 0).toLocaleString('en-BD')}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          {reseller.status === 'pending' || (reseller.status as any) === 'pending_approval' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-spin" />
                              <span>{isBn ? 'অপেক্ষমান আবেদন' : 'Pending Review'}</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(reseller.id)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                                reseller.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 hover:bg-rose-200'
                              }`}
                            >
                              {reseller.status === 'active' ? (isBn ? '● সক্রিয়' : '● Active') : (isBn ? '● স্থগিত' : '● Suspended')}
                            </button>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(reseller.status === 'pending' || (reseller.status as any) === 'pending_approval') && (
                              <>
                                <button
                                  onClick={() => handleApproveReseller(reseller)}
                                  className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] cursor-pointer flex items-center gap-1 shadow-xs"
                                  title={isBn ? 'আবেদন অনুমোদন করুন' : 'Approve Reseller'}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{isBn ? 'অনুমোদন' : 'Approve'}</span>
                                </button>

                                <button
                                  onClick={() => handleRejectReseller(reseller)}
                                  className="px-2.5 py-1 rounded-xl bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[11px] cursor-pointer border border-rose-800"
                                  title={isBn ? 'আবেদন বাতিল করুন' : 'Reject Reseller'}
                                >
                                  <span>{isBn ? 'বাতিল' : 'Reject'}</span>
                                </button>
                              </>
                            )}

                            {/* View Full Profile */}
                            <button
                              onClick={() => setSelectedResellerForDetails(reseller)}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
                              title={isBn ? 'সম্পূর্ণ প্রোফাইল ও সেলস দেখুন' : 'View Full Profile & Analytics'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Manual Balance Adjustment */}
                            <button
                              onClick={() => {
                                setWalletAdjustReseller(reseller);
                                setWalletAdjustAmount('');
                                setWalletAdjustReason('');
                              }}
                              className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                              title={isBn ? 'ম্যানুয়াল ওয়ালেট ব্যালেন্স অ্যাডজাস্ট' : 'Adjust Wallet Balance'}
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>

                            {/* Copy Link */}
                            <button
                              onClick={() => handleCopyLink(reseller)}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                              title={isBn ? 'পোর্টাল লিংক কপি' : 'Copy Reseller Portal Link'}
                            >
                              {copiedId === reseller.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Login as Reseller */}
                            {onLoginAsPartner && (
                              <button
                                onClick={() => onLoginAsPartner(reseller)}
                                className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 border border-emerald-200 dark:border-emerald-800"
                                title={isBn ? 'রিসেলার পোর্টালে ঢুকুন' : 'Open Reseller Hub'}
                              >
                                <LogIn className="w-3 h-3" />
                                <span>{isBn ? 'লগইন' : 'Login'}</span>
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={() => {
                                setEditingReseller(reseller);
                                setEditFormData({
                                  name: reseller.name,
                                  shopName: reseller.shopName,
                                  phone: reseller.phone,
                                  email: reseller.email,
                                  isVip: reseller.isVip || reseller.resellerTier === 'gold_vip',
                                  planId: (reseller.planId || (reseller as any).selectedPlanId || (reseller.isVip ? 'premium' : 'starter')) as ResellerPlanId,
                                  resellerTier: reseller.resellerTier || 'silver',
                                  commissionRate: reseller.commissionRate.toString(),
                                  status: reseller.status,
                                  bkash: reseller.paymentDetails?.bkash || '',
                                  bankAccount: reseller.paymentDetails?.bankAccount || '',
                                });
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-800 cursor-pointer transition-colors"
                              title={isBn ? 'তথ্য ও টায়ার এডিট' : 'Edit Tier & Details'}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Permanent Delete */}
                            <button
                              onClick={() => setResellerToDelete(reseller)}
                              className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 text-rose-600 hover:text-white dark:text-rose-400 border border-rose-200 dark:border-rose-900 cursor-pointer transition-colors"
                              title={isBn ? 'পার্মানেন্ট ডিলিট করুন' : 'Permanently Delete Reseller'}
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

      {/* Tab Content: Subscription & Renewal Reseller */}
      {activeTab === 'renewals' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs space-y-3">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-500" />
                <span>{isBn ? 'রিসেলার সাবস্ক্রিপশন ও রিনিউয়াল মনিটরিং' : 'Reseller Subscription Renewals & Expiration Monitoring'}</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {isBn
                  ? 'কোনো রিসেলারের সাবস্ক্রিপশন মেয়াদ শেষ হয়ে গেলে বা রিনিউয়ালের অনুরোধ আসলে এখান থেকে যাচাই ও বর্ধিত করুন।'
                  : 'Review and extend reseller subscriptions when they expire or request renewal.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                {pendingRenewalsCount} Requiring Action
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Reseller / Shop Name</th>
                  <th className="px-4 py-3">Membership Tier</th>
                  <th className="px-4 py-3">Subscription Validity</th>
                  <th className="px-4 py-3">Renewal Payment Details</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {resellersList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No reseller subscription renewal records found.
                    </td>
                  </tr>
                ) : (
                  resellersList.map((reseller) => {
                    const isExpired =
                      reseller.subscriptionStatus === 'expired' ||
                      Boolean(reseller.subscriptionEndDate && new Date(reseller.subscriptionEndDate) < new Date());
                    const isPendingRenewal =
                      reseller.subscriptionStatus === 'pending_renewal' || Boolean(reseller.renewalTxId);
                    const daysRemaining = reseller.subscriptionEndDate
                      ? Math.ceil(
                          (new Date(reseller.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                        )
                      : null;

                    return (
                      <tr key={reseller.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Boxes className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{reseller.shopName}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {reseller.name} • {reseller.phone}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{reseller.email}</p>
                        </td>

                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-md font-extrabold text-[10px] uppercase ${
                            reseller.resellerTier === 'gold_vip' || reseller.isVip
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : reseller.resellerTier === 'silver'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                          }`}>
                            {reseller.isVip || reseller.resellerTier === 'gold_vip' ? '⭐ Gold VIP Member' : reseller.resellerTier ? `${reseller.resellerTier.toUpperCase()} Tier` : 'Silver Tier'}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Cycle: {reseller.billingCycle || 'Monthly'}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          {reseller.subscriptionEndDate ? (
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {new Date(reseller.subscriptionEndDate).toLocaleDateString()}
                              </p>
                              {daysRemaining !== null && (
                                <p
                                  className={`text-[11px] font-bold ${
                                    daysRemaining < 0
                                      ? 'text-rose-500 animate-pulse'
                                      : daysRemaining <= 5
                                      ? 'text-amber-500'
                                      : 'text-emerald-500'
                                  }`}
                                >
                                  {daysRemaining < 0
                                    ? `Expired ${Math.abs(daysRemaining)} days ago`
                                    : `${daysRemaining} days left`}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">30 Days Standard Cycle</span>
                          )}
                        </td>

                        <td className="px-4 py-3 font-mono">
                          {reseller.renewalTxId ? (
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-bold uppercase">
                                {reseller.renewalPaymentMethod || 'bKash'} Verified
                              </span>
                              <p className="font-bold text-slate-900 dark:text-white text-[11px] mt-0.5">
                                TxID: {reseller.renewalTxId}
                              </p>
                              <p className="text-emerald-500 dark:text-emerald-400 text-[10px] font-bold">
                                Paid: ৳{reseller.renewalAmount || 499}
                              </p>
                              {reseller.renewalSubmittedAt && (
                                <p className="text-slate-400 text-[10px]">
                                  {new Date(reseller.renewalSubmittedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ) : isExpired ? (
                            <span className="text-rose-500 dark:text-rose-400 text-[11px] font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Awaiting Renewal Payment</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Active Membership Plan</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {isPendingRenewal ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Pending Renewal</span>
                            </span>
                          ) : isExpired ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              <span>Expired</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleApproveResellerRenewal(reseller, 30)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer shadow-xs flex items-center gap-1"
                              title="Approve & Extend 30 Days"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Renew (+30d)</span>
                            </button>

                            <button
                              onClick={() => handleApproveResellerRenewal(reseller, 365)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] cursor-pointer shadow-xs"
                              title="Extend 1 Full Year"
                            >
                              +1 Year
                            </button>

                            {!isExpired && (
                              <button
                                onClick={() => handleExpireResellerSubscription(reseller.id)}
                                className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[11px] cursor-pointer border border-rose-800"
                                title="Simulate Expiry (Test Lock Screen)"
                              >
                                Expire
                              </button>
                            )}

                            {isExpired && (
                              <button
                                onClick={() => handleReactivateResellerSubscription(reseller.id)}
                                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] cursor-pointer"
                                title="Reactivate Account"
                              >
                                Reactivate
                              </button>
                            )}
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
        </main>
      </div>

      {isEditModalOpen && editingReseller && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-500" />
                <span>Edit Reseller Account & VIP Tier</span>
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hub Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.shopName}
                    onChange={(e) => setEditFormData({ ...editFormData, shopName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reseller Tier *</label>
                  <select
                    value={editFormData.resellerTier}
                    onChange={(e) => setEditFormData({ ...editFormData, resellerTier: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="bronze">Bronze Tier (10% Margin)</option>
                    <option value="silver">Silver Tier (15% Margin)</option>
                    <option value="gold_vip">Gold VIP Tier (20% Margin)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Custom Margin (%)</label>
                  <input
                    type="number"
                    value={editFormData.commissionRate}
                    onChange={(e) => setEditFormData({ ...editFormData, commissionRate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Membership Plan Selector (Admin Controlled Plan Assignment) */}
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-extrabold text-emerald-400 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isBn ? 'রিসেলার মেম্বারশিপ প্ল্যান' : 'Reseller Membership Plan'} *</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                    Admin Controlled
                  </span>
                </div>
                <select
                  value={editFormData.planId}
                  onChange={(e) => {
                    const selected = e.target.value as ResellerPlanId;
                    setEditFormData({
                      ...editFormData,
                      planId: selected,
                      isVip: selected === 'premium' ? true : editFormData.isVip,
                    });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-emerald-500/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs shadow-xs"
                >
                  <option value="starter">{isBn ? 'ফ্রি স্টার্টার প্ল্যান' : 'Free Starter Plan'}</option>
                  <option value="pro">{isBn ? 'প্রো গ্রোথ প্ল্যান (৳৩৫০/মাস)' : 'Pro Growth Plan (৳350/mo)'}</option>
                  <option value="premium">{isBn ? 'ভিআইপি এলিট ড্রপশিপ প্ল্যান (৳৭৫০/মাস)' : 'VIP Elite Dropship Plan (৳750/mo)'}</option>
                </select>
                <p className="text-[10px] text-slate-400">
                  {isBn
                    ? 'অ্যাডমিন এখান থেকে যে প্ল্যান সিলেক্ট করবেন, রিসেলারের অ্যাকাউন্টে স্বয়ংক্রিয়ভাবে সেই নতুন প্ল্যান সেট হয়ে যাবে।'
                    : 'Selecting a plan here will automatically update the reseller account to the chosen membership tier.'}
                </p>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-amber-300 text-xs flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" />
                    <span>VIP Member Access</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Grants zero commission processing & priority payout</p>
                </div>
                <input
                  type="checkbox"
                  checked={editFormData.isVip}
                  onChange={(e) => setEditFormData({ ...editFormData, isVip: e.target.checked })}
                  className="w-5 h-5 accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Reseller</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Reseller Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-500" />
                <span>Create New Reseller / Dropshipper Account</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReseller} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hub Name *</label>
                  <input
                    type="text"
                    required
                    value={newResellerForm.shopName}
                    onChange={(e) => setNewResellerForm({ ...newResellerForm, shopName: e.target.value })}
                    placeholder="e.g. Gadget Mania Dropship"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={newResellerForm.name}
                    onChange={(e) => setNewResellerForm({ ...newResellerForm, name: e.target.value })}
                    placeholder="e.g. Tanvir Hasan"
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
                    value={newResellerForm.phone}
                    onChange={(e) => setNewResellerForm({ ...newResellerForm, phone: e.target.value })}
                    placeholder="018xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newResellerForm.email}
                    onChange={(e) => setNewResellerForm({ ...newResellerForm, email: e.target.value })}
                    placeholder="reseller@example.com"
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
                    value={newResellerForm.username}
                    onChange={(e) => setNewResellerForm({ ...newResellerForm, username: e.target.value })}
                    placeholder="reseller_tanvir"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    value={newResellerForm.password}
                    onChange={(e) => setNewResellerForm({ ...newResellerForm, password: e.target.value })}
                    placeholder="reseller123"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tier *</label>
                  <select
                    value={newResellerForm.resellerTier}
                    onChange={(e) => setNewResellerForm({ ...newResellerForm, resellerTier: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="bronze">Bronze (10% Discount)</option>
                    <option value="silver">Silver (15% Discount)</option>
                    <option value="gold_vip">Gold VIP (20% Discount)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Discount Margin (%)</label>
                  <input
                    type="number"
                    value={newResellerForm.commissionRate}
                    onChange={(e) => setNewResellerForm({ ...newResellerForm, commissionRate: e.target.value })}
                    placeholder="15"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
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
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Create Reseller</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Payment Settings Modal (Customize Official Numbers) */}
      {isPaymentSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span>{isBn ? 'অফিসিয়াল পেমেন্ট নম্বর সেটিংস' : 'Official Payment Settings'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentSettingsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {isBn
                ? 'রিসেলাররা যখন মেম্বারশিপ বা ভিআইপি প্ল্যান কিনবে, তখন পেমেন্ট পেজে এই নম্বরগুলো দেখতে পাবে এবং এগুলোতে টাকা পাঠিয়ে TrxID সাবমিট করবে।'
                : 'Resellers will see these numbers at checkout when upgrading plan tiers or purchasing VIP membership.'}
            </p>

            <form onSubmit={handleSaveAdminPaymentInfo} className="space-y-4">
              <div className="space-y-3">
                {/* bKash */}
                <div className="p-3 bg-pink-500/10 border border-pink-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-xs text-pink-400">{isBn ? 'বিকাশ নম্বর' : 'bKash Number'}</label>
                    <select
                      value={adminPaymentInfo.bkashType}
                      onChange={(e) =>
                        setAdminPaymentInfo({
                          ...adminPaymentInfo,
                          bkashType: e.target.value,
                        })
                      }
                      className="px-2 py-0.5 rounded-lg bg-slate-900 border border-pink-500/40 text-[10px] font-bold text-pink-300"
                    >
                      <option value="Personal / Send Money">Personal (Send Money)</option>
                      <option value="Merchant / Payment">Merchant (Payment)</option>
                      <option value="Agent / Cash In">Agent (Cash In)</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    value={adminPaymentInfo.bkash}
                    onChange={(e) =>
                      setAdminPaymentInfo({
                        ...adminPaymentInfo,
                        bkash: e.target.value,
                      })
                    }
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-pink-500/40 bg-slate-950 font-mono text-sm text-white font-bold"
                  />
                </div>

                {/* Nagad */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-xs text-amber-400">{isBn ? 'নগদ নম্বর' : 'Nagad Number'}</label>
                    <select
                      value={adminPaymentInfo.nagadType}
                      onChange={(e) =>
                        setAdminPaymentInfo({
                          ...adminPaymentInfo,
                          nagadType: e.target.value,
                        })
                      }
                      className="px-2 py-0.5 rounded-lg bg-slate-900 border border-amber-500/40 text-[10px] font-bold text-amber-300"
                    >
                      <option value="Personal / Send Money">Personal (Send Money)</option>
                      <option value="Merchant / Payment">Merchant (Payment)</option>
                      <option value="Agent / Cash In">Agent (Cash In)</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    value={adminPaymentInfo.nagad}
                    onChange={(e) =>
                      setAdminPaymentInfo({
                        ...adminPaymentInfo,
                        nagad: e.target.value,
                      })
                    }
                    placeholder="018xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-amber-500/40 bg-slate-950 font-mono text-sm text-white font-bold"
                  />
                </div>

                {/* Rocket */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-xs text-purple-400">{isBn ? 'রকেট নম্বর' : 'Rocket Number'}</label>
                    <span className="text-[10px] font-bold text-purple-300">Personal</span>
                  </div>
                  <input
                    type="text"
                    value={adminPaymentInfo.rocket}
                    onChange={(e) =>
                      setAdminPaymentInfo({
                        ...adminPaymentInfo,
                        rocket: e.target.value,
                      })
                    }
                    placeholder="019xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-purple-500/40 bg-slate-950 font-mono text-sm text-white font-bold"
                  />
                </div>

                {/* Bank Account */}
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
                  <label className="font-black text-xs text-emerald-400 block">{isBn ? 'ব্যাংক তথ্য' : 'Bank Account Details'}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={adminPaymentInfo.bankName}
                      onChange={(e) =>
                        setAdminPaymentInfo({
                          ...adminPaymentInfo,
                          bankName: e.target.value,
                        })
                      }
                      placeholder="Bank Name (e.g. City Bank)"
                      className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-slate-950 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={adminPaymentInfo.bankBranch}
                      onChange={(e) =>
                        setAdminPaymentInfo({
                          ...adminPaymentInfo,
                          bankBranch: e.target.value,
                        })
                      }
                      placeholder="Branch (e.g. Gulshan)"
                      className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-slate-950 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={adminPaymentInfo.accountHolderName}
                      onChange={(e) =>
                        setAdminPaymentInfo({
                          ...adminPaymentInfo,
                          accountHolderName: e.target.value,
                        })
                      }
                      placeholder="Account Holder Name"
                      className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-slate-950 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={adminPaymentInfo.bankAccount}
                      onChange={(e) =>
                        setAdminPaymentInfo({
                          ...adminPaymentInfo,
                          bankAccount: e.target.value,
                        })
                      }
                      placeholder="Account Number"
                      className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-slate-950 font-mono text-xs text-white font-bold"
                    />
                  </div>
                </div>

                {/* Instruction notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {isBn ? 'রিসেলারদের জন্য বিশেষ নির্দেশিকা' : 'Special Instructions for Resellers'}
                  </label>
                  <textarea
                    rows={2}
                    value={adminPaymentInfo.instructionBn || ''}
                    onChange={(e) =>
                      setAdminPaymentInfo({
                        ...adminPaymentInfo,
                        instructionBn: e.target.value,
                      })
                    }
                    placeholder={isBn ? "পেমেন্ট পাঠানোর সময় রেফারেন্সে আপনার ফোন নম্বর বা শপের নাম দিন..." : "Enter transaction ID or store name in payment reference..."}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isBn ? 'নম্বর সংরক্ষণ করুন' : 'Save Payment Numbers'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1: Approve Payout Modal with TrxID */}
      {approvingPayout && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-500/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {isBn ? 'পেআউট অনুমোদন ও বিতরণ করুন' : 'Approve & Disburse Payout'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ID: {approvingPayout.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovingPayout(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payout Details Card */}
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isBn ? 'রিসেলারের নাম / শপ' : 'Reseller / Shop'}
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {approvingPayout.partnerName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isBn ? 'পেমেন্ট গেটওয়ে' : 'Payout Gateway'}
                </span>
                <span className="text-xs font-black uppercase text-emerald-500">
                  {approvingPayout.method}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isBn ? 'অ্যাকাউন্ট নম্বর' : 'Account Number'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {approvingPayout.accountNumber}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isBn ? 'মোট পেআউট পরিমাণ' : 'Payout Amount'}
                </span>
                <span className="text-base font-black text-emerald-500">
                  ৳{approvingPayout.amount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* TrxID Input & Regenerate */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isBn ? 'ট্রানজেকশন আইডি (TrxID) *' : 'Transaction ID (TrxID) *'}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const prefix = approvingPayout.method.toUpperCase().slice(0, 2);
                    const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
                    setPayoutTrxIdInput(`${prefix}${rand}`);
                  }}
                  className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{isBn ? 'নতুন TrxID জেনারেট' : 'Regenerate'}</span>
                </button>
              </div>
              <input
                type="text"
                value={payoutTrxIdInput}
                onChange={(e) => setPayoutTrxIdInput(e.target.value)}
                placeholder="e.g. BK9X8841Z"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs font-bold"
              />
              <p className="text-[10px] text-slate-400">
                {isBn
                  ? 'এই TrxID-টি রিসেলারের হিস্ট্রিতে এবং অফিশিয়াল ভাউচারে স্থায়ীভাবে রেকর্ড হয়ে থাকবে।'
                  : 'This TrxID will be permanently recorded in reseller history & official voucher.'}
              </p>
            </div>

            {/* Admin Note Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isBn ? 'অ্যাডমিন নোট / রিমার্কস (ঐচ্ছিক)' : 'Admin Note / Remarks (Optional)'}
              </label>
              <input
                type="text"
                value={payoutNoteInput}
                onChange={(e) => setPayoutNoteInput(e.target.value)}
                placeholder={isBn ? 'যেমন: সফলভাবে বিকাশ পার্সোনালে সেন্ড মানি করা হয়েছে' : 'e.g. Sent via bKash Personal sender 017...'}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setApprovingPayout(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmApprovePayout}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isBn ? 'অনুমোদন নিশ্চিত করুন' : 'Confirm & Mark Paid'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Official Kenax Payout Receipt Voucher Modal */}
      {selectedReceiptPayout && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[95vh] overflow-y-auto print:shadow-none print:border-none print:m-0 print:p-0">
            {/* Header & Actions */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 print:hidden">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {isBn ? 'অফিসিয়াল পেআউট ভাউচার ও মানি রিসিট' : 'Official Payout Receipt Voucher'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isBn ? 'প্রিন্ট / ডাউনলোড' : 'Print / PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptPayout(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Voucher Paper */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-5 print:border-none print:bg-white print:text-black">
              {/* Voucher Top Brand */}
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-base">
                      K
                    </div>
                    <div>
                      <h4 className="font-black text-sm tracking-wider uppercase text-slate-900 dark:text-white">
                        KENAX RESELLER NETWORK
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Disbursement & Partner Commission Clearance
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-500/30">
                    ✓ DISBURSED & SETTLED
                  </span>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                    Voucher: KV-{selectedReceiptPayout.id.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Voucher Summary Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{isBn ? 'গ্রাহক / রিসেলার' : 'Beneficiary Reseller'}</p>
                  <p className="font-extrabold text-slate-900 dark:text-white mt-0.5">{selectedReceiptPayout.partnerName}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Account: {selectedReceiptPayout.accountNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{isBn ? 'অনুমোদনের তারিখ' : 'Approval Date'}</p>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedReceiptPayout.approvedAt || selectedReceiptPayout.processedAt
                      ? new Date(selectedReceiptPayout.approvedAt || selectedReceiptPayout.processedAt!).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : (selectedReceiptPayout.requestedAt || selectedReceiptPayout.date || 'N/A')}
                  </p>
                  <p className="text-[11px] font-mono text-emerald-500 font-bold mt-0.5">
                    TrxID: {selectedReceiptPayout.txId || selectedReceiptPayout.transactionId || 'TXN-SETTLED-DIRECT'}
                  </p>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{isBn ? 'অনুরোধকৃত প্রফিট উইথড্র' : 'Gross Payout Requested'}</span>
                  <span className="font-mono">৳{selectedReceiptPayout.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{isBn ? 'সার্ভিস ও প্রসেসিং ফি (০%)' : 'Processing Fee (0%)'}</span>
                  <span className="font-mono text-emerald-500">৳0.00</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{isBn ? 'পেমেন্ট চ্যানেল' : 'Disbursement Method'}</span>
                  <span className="font-bold uppercase text-slate-700 dark:text-slate-300">{selectedReceiptPayout.method}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 text-sm">
                  <span className="font-black text-slate-900 dark:text-white">{isBn ? 'মোট পরিশোধিত পরিমাণ' : 'Net Disbursed Amount'}</span>
                  <span className="font-black text-emerald-500 text-base font-mono">৳{selectedReceiptPayout.amount.toLocaleString()}</span>
                </div>
              </div>

              {(selectedReceiptPayout.note || selectedReceiptPayout.adminNote) && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px]">
                  <span className="font-bold text-slate-500 dark:text-slate-400">{isBn ? 'অ্যাডমিন রিমার্কস:' : 'Admin Remarks:'}</span>{' '}
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedReceiptPayout.note || selectedReceiptPayout.adminNote}</span>
                </div>
              )}

              {/* Authorized Stamp */}
              <div className="pt-4 border-t border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-400">
                <div>
                  <p className="font-mono">Security Hash: SHA-256 Verified</p>
                  <p>Electronically generated official receipt</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg border-2 border-emerald-500/40 text-emerald-500 font-black uppercase text-[10px] tracking-wider rotate-[-3deg]">
                  ✓ Kenax Authorized
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Permanent Delete Reseller Confirmation Modal */}
      {resellerToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-500/30 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {isBn ? 'রিসেলার অ্যাকাউন্ট সম্পূর্ণ ডিলিট করুন' : 'Permanently Delete Reseller'}
                </h3>
                <p className="text-[10px] text-rose-500 font-bold">
                  {isBn ? 'এই কাজটি অপরিবর্তনীয় (Irreversible Action)' : 'This action cannot be undone'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isBn ? 'শপের নাম:' : 'Shop Name:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">{resellerToDelete.shopName || resellerToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isBn ? 'মালিকের নাম:' : 'Owner Name:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">{resellerToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isBn ? 'ফোন নম্বর:' : 'Phone Number:'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{resellerToDelete.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isBn ? 'বর্তমান ওয়ালেট ব্যালেন্স:' : 'Wallet Balance:'}</span>
                <span className="font-mono font-extrabold text-emerald-500">৳{(resellerToDelete.walletBalance ?? resellerToDelete.balance ?? 0).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isBn
                ? 'আপনি কি নিশ্চিত যে এই রিসেলার এবং তার সাব-স্টোরের সমস্ত ডাটা সিস্টেম থেকে চিরতরে মুছে ফেলতে চান?'
                : 'Are you sure you want to permanently erase this reseller and all associated sub-store data from the platform?'}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setResellerToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteReseller}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/40 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isBn ? 'হ্যাঁ, পার্মানেন্ট ডিলিট করুন' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Manual Balance Credit / Debit Adjustment Modal */}
      {walletAdjustReseller && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-500/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {isBn ? 'ওয়ালেট ব্যালেন্স অ্যাডজাস্টমেন্ট' : 'Wallet Balance Adjustment'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {walletAdjustReseller.shopName || walletAdjustReseller.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWalletAdjustReseller(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Display */}
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                {isBn ? 'বর্তমান ব্যালেন্স:' : 'Current Balance:'}
              </span>
              <span className="text-sm font-black font-mono text-emerald-500">
                ৳{(walletAdjustReseller.walletBalance ?? walletAdjustReseller.balance ?? 0).toLocaleString()}
              </span>
            </div>

            {/* Type: Credit (+) or Debit (-) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWalletAdjustType('credit')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  walletAdjustType === 'credit'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isBn ? 'টাকা যোগ (+) ক্রেডিট' : 'Add Credit (+)'}</span>
              </button>
              <button
                type="button"
                onClick={() => setWalletAdjustType('debit')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                  walletAdjustType === 'debit'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-500'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <MinusCircle className="w-3.5 h-3.5" />
                <span>{isBn ? 'টাকা কর্তন (-) ডেবিট' : 'Deduct (-)'}</span>
              </button>
            </div>

            {/* Amount input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isBn ? 'পরিমাণ (৳) *' : 'Amount (BDT) *'}
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={walletAdjustAmount}
                onChange={(e) => setWalletAdjustAmount(e.target.value)}
                placeholder="500"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-sm"
              />
            </div>

            {/* Note input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isBn ? 'কারণ / রিমার্কস *' : 'Reason / Note *'}
              </label>
              <input
                type="text"
                value={walletAdjustReason}
                onChange={(e) => setWalletAdjustReason(e.target.value)}
                placeholder={isBn ? 'যেমন: বোনাস রিওয়ার্ড / ম্যানুয়াল ক্যাশ ডিপোজিট' : 'e.g. Sales milestone reward / manual refund'}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setWalletAdjustReseller(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveWalletAdjustment}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isBn ? 'ব্যালেন্স আপডেট করুন' : 'Apply Adjustment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Full Reseller Profile & Sub-store Inspector Modal */}
      {selectedResellerForDetails && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-black text-xl flex items-center justify-center shadow-md">
                  {(selectedResellerForDetails.shopName || selectedResellerForDetails.name || 'R').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {selectedResellerForDetails.shopName || selectedResellerForDetails.name}
                    </h3>
                    {selectedResellerForDetails.isVip && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-black text-[10px] flex items-center gap-1">
                        <Crown className="w-3 h-3" /> VIP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Owner: {selectedResellerForDetails.name} • ID: {selectedResellerForDetails.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResellerForDetails(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{isBn ? 'যোগাযোগ' : 'Contact Phone'}</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{selectedResellerForDetails.phone || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{isBn ? 'ইমেইল' : 'Email Address'}</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{selectedResellerForDetails.email || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{isBn ? 'মেম্বারশিপ প্ল্যান' : 'Membership Plan'}</span>
                <p className="font-black text-emerald-500 uppercase">{selectedResellerForDetails.planId || 'Starter'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{isBn ? 'কমিশন / ডিসকাউন্ট মার্জিন' : 'Profit Margin'}</span>
                <p className="font-black text-indigo-500">{selectedResellerForDetails.commissionRate || 15}%</p>
              </div>
            </div>

            {/* Financial Performance */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{isBn ? 'ওয়ালেট ব্যালেন্স' : 'Wallet'}</p>
                <p className="text-sm font-black font-mono text-emerald-500 mt-1">৳{(selectedResellerForDetails.walletBalance ?? selectedResellerForDetails.balance ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{isBn ? 'মোট অর্জিত প্রফিট' : 'Total Profit'}</p>
                <p className="text-sm font-black font-mono text-teal-400 mt-1">৳{(selectedResellerForDetails.totalEarnings ?? selectedResellerForDetails.totalSales ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{isBn ? 'সফল সেলস' : 'Completed'}</p>
                <p className="text-sm font-black font-mono text-indigo-400 mt-1">{selectedResellerForDetails.orderCount || 0}</p>
              </div>
            </div>

            {/* Sub-store URL */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{isBn ? 'সাব-স্টোর লিংক' : 'Sub-Store Link'}</p>
                <p className="font-mono text-emerald-500 font-bold mt-0.5">
                  kenax.com/store/{selectedResellerForDetails.username || selectedResellerForDetails.id}
                </p>
              </div>
              <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                Active Store
              </span>
            </div>

            {/* Action Buttons inside modal */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const target = selectedResellerForDetails;
                  setSelectedResellerForDetails(null);
                  setEditingReseller(target);
                  setEditFormData({
                    name: target.name,
                    shopName: target.shopName,
                    phone: target.phone,
                    email: target.email,
                    isVip: target.isVip || target.resellerTier === 'gold_vip',
                    planId: (target.planId || (target as any).selectedPlanId || (target.isVip ? 'premium' : 'starter')) as ResellerPlanId,
                    resellerTier: target.resellerTier || 'silver',
                    commissionRate: target.commissionRate.toString(),
                    status: target.status,
                    bkash: target.paymentDetails?.bkash || '',
                    bankAccount: target.paymentDetails?.bankAccount || '',
                  });
                  setIsEditModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isBn ? 'তথ্য এডিট' : 'Edit Info'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedResellerForDetails;
                  setSelectedResellerForDetails(null);
                  setWalletAdjustReseller(target);
                  setWalletAdjustAmount('');
                  setWalletAdjustReason('');
                }}
                className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{isBn ? 'ব্যালেন্স অ্যাডজাস্ট' : 'Adjust Wallet'}</span>
              </button>
              {onLoginAsPartner && (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedResellerForDetails;
                    setSelectedResellerForDetails(null);
                    onLoginAsPartner(target);
                  }}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isBn ? 'লগইন অ্যাজ রিসেলার' : 'Login as Reseller'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
