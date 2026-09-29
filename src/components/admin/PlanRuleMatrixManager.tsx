import React, { useState, useMemo } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Sparkles,
  Save,
  RotateCcw,
  UserCheck,
  Search,
  Sliders,
  Check,
  AlertCircle,
  Store,
  Boxes,
  HelpCircle,
  Layers,
  ArrowRight,
  Bot,
  Zap,
  ChevronDown,
  ChevronRight,
  ShoppingBag,
  Users,
  Wallet,
  TrendingUp,
  Megaphone,
  Truck,
  Trophy,
  Crown,
  Eye,
} from 'lucide-react';
import {
  SELLER_RULE_MODULES,
  RESELLER_RULE_MODULES,
  RuleModuleDefinition,
  getPlanRuleMatrix,
  savePlanRuleMatrix,
  getDefaultMatrix,
  getUserRuleOverrides,
  saveUserRuleOverride,
  removeUserRuleOverride,
  UserRuleOverride,
} from '../../lib/planRulesStorage';
import { PartnerUser } from '../../types';
import { getPartnersFromStorage } from '../../lib/partnerStorage';
import { useLanguage } from '../../context/LanguageContext';

export interface PlanRuleMatrixManagerProps {
  initialType?: 'seller' | 'reseller';
  onMatrixChanged?: () => void;
  hideTypeSwitcher?: boolean;
}

interface CategoryGroup {
  id: string;
  nameEn: string;
  nameBn: string;
  descEn: string;
  descBn: string;
  icon: React.ElementType;
  modules: RuleModuleDefinition[];
}

export const PlanRuleMatrixManager: React.FC<PlanRuleMatrixManagerProps> = ({
  initialType = 'seller',
  onMatrixChanged,
  hideTypeSwitcher = false,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [partnerType, setPartnerType] = useState<'seller' | 'reseller'>(initialType);
  const [activeSubView, setActiveSubView] = useState<'matrix' | 'individual'>('matrix');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Matrix State
  const [sellerMatrix, setSellerMatrix] = useState(() => getPlanRuleMatrix('seller'));
  const [resellerMatrix, setResellerMatrix] = useState(() => getPlanRuleMatrix('reseller'));

  // User Overrides State
  const [userOverrides, setUserOverrides] = useState<Record<string, UserRuleOverride>>(() => getUserRuleOverrides());
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [partnerSearch, setPartnerSearch] = useState<string>('');

  // Partners list from storage
  const partners = useMemo(() => getPartnersFromStorage(), []);
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchType = p.type === partnerType;
      const matchSearch =
        p.name.toLowerCase().includes(partnerSearch.toLowerCase()) ||
        p.shopName.toLowerCase().includes(partnerSearch.toLowerCase()) ||
        p.phone.includes(partnerSearch) ||
        p.username.toLowerCase().includes(partnerSearch.toLowerCase());
      return matchType && matchSearch;
    });
  }, [partners, partnerType, partnerSearch]);

  const selectedPartner = useMemo(() => {
    return partners.find((p) => p.id === selectedPartnerId) || filteredPartners[0] || null;
  }, [partners, selectedPartnerId, filteredPartners]);

  // Current modules list
  const currentModules: RuleModuleDefinition[] = useMemo(() => {
    return partnerType === 'seller' ? SELLER_RULE_MODULES : RESELLER_RULE_MODULES;
  }, [partnerType]);

  // Current plan columns
  const planColumns = useMemo(() => {
    if (partnerType === 'seller') {
      return [
        {
          id: 'basic',
          name: isBn ? 'বেসিক স্টারটার (৳০)' : 'Basic Starter (৳0)',
          tierName: isBn ? 'বেসিক' : 'Basic',
          badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700',
        },
        {
          id: 'standard',
          name: isBn ? 'স্ট্যান্ডার্ড বিজনেস (৳৯৯০)' : 'Standard Business (৳990)',
          tierName: isBn ? 'স্ট্যান্ডার্ড' : 'Standard',
          badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800',
        },
        {
          id: 'premium',
          name: isBn ? 'প্রিমিয়াম ভিআইপি (৳২৪৯০)' : 'Premium VIP (৳2,490)',
          tierName: isBn ? 'প্রিমিয়াম' : 'Premium',
          badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800',
        },
      ];
    } else {
      return [
        {
          id: 'basic',
          name: isBn ? 'বেসিক মেম্বারশিপ (৳০)' : 'Basic Reseller (৳0)',
          tierName: isBn ? 'বেসিক' : 'Basic',
          badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700',
        },
        {
          id: 'standard',
          name: isBn ? 'স্ট্যান্ডার্ড প্রো (৳৫৯০)' : 'Standard Pro (৳590)',
          tierName: isBn ? 'স্ট্যান্ডার্ড' : 'Standard',
          badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
        },
        {
          id: 'premium',
          name: isBn ? 'প্রিমিয়াম ভিআইপি (৳১৪৯০)' : 'Premium VIP (৳1,490)',
          tierName: isBn ? 'প্রিমিয়াম' : 'Premium',
          badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
        },
      ];
    }
  }, [partnerType, isBn]);

  const activeMatrix = partnerType === 'seller' ? sellerMatrix : resellerMatrix;

  // Group modules into category tabs
  const categoryGroups: CategoryGroup[] = useMemo(() => {
    if (partnerType === 'seller') {
      const groupsMap: Record<string, { nameEn: string; nameBn: string; descEn: string; descBn: string; icon: React.ElementType; modules: RuleModuleDefinition[] }> = {
        core: { nameEn: 'Dashboard & Core Tools', nameBn: 'ড্যাশবোর্ড ও প্রধান টুলস', descEn: 'Main KPI cards, analytics overview and quick buttons', descBn: 'প্রধান কেপিআই কার্ড ও ড্যাশবোর্ড ওভারভিউ', icon: Boxes, modules: [] },
        store: { nameEn: 'My Store & Branding', nameBn: 'মাই স্টোর ও ব্র্যান্ডিং', descEn: 'Store profile, banners and custom domain settings', descBn: 'স্টোর প্রোফাইল, ব্যানার ও কাস্টম ডোমেইন', icon: Store, modules: [] },
        catalog: { nameEn: 'Products & Inventory', nameBn: 'প্রোডাক্টস ও ইনভেন্টরি', descEn: 'Catalog browse, product upload and unlimited categories', descBn: 'ক্যাটালগ ব্রাউজ, প্রোডাক্ট আপলোড ও ক্যাটাগরি', icon: ShoppingBag, modules: [] },
        orders: { nameEn: 'Orders & Packing Slips', nameBn: 'অর্ডার প্রসেসিং ও প্যাকিং স্লিপ', descEn: 'Order management, packing slips and courier handover', descBn: 'অর্ডার ম্যানেজমেন্ট ও কুরিয়ার ট্র্যাকিং', icon: Truck, modules: [] },
        ai_tools: { nameEn: 'AI Bot & Automation', nameBn: 'এআই সেলস বট অটোমেশন', descEn: 'Automated 24/7 AI sales assistant taking orders', descBn: '২৪/৭ অটোমেটেড এআই সেলস অ্যাসিস্ট্যান্ট', icon: Bot, modules: [] },
        finance: { nameEn: 'Wallet & Payouts', nameBn: 'ওয়ালেট ও প্রফিট উইথড্রয়াল', descEn: 'Live balance, earnings ledger and payout withdrawals', descBn: 'লাইভ ব্যালেন্স, আর্নিংস লেজার ও উইথড্রয়াল', icon: Wallet, modules: [] },
        analytics: { nameEn: 'Sales & Customer Analytics', nameBn: 'সেলস ও কাস্টমার এনালিটিক্স', descEn: 'Deep conversion insights, sales charts and customer metrics', descBn: 'গভীর সেলস রিপোর্ট ও কনভার্সন চার্ট', icon: TrendingUp, modules: [] },
        marketing: { nameEn: 'Marketing & Promotions', nameBn: 'মার্কেটিং ও প্রমোশন', descEn: 'Promotional discount coupons, flash campaigns and reviews', descBn: 'ডিসকাউন্ট কুপন, মেগা ক্যাম্পেইন ও রিভিউ', icon: Megaphone, modules: [] },
        support: { nameEn: 'Priority VIP Support', nameBn: 'প্রায়োরিটি ভিআইপি সাপোর্ট', descEn: 'Dedicated senior account manager and priority hotline', descBn: 'ডেডিকেটেড অ্যাকাউন্ট ম্যানেজার ও ভিআইপি হটলাইন', icon: Crown, modules: [] },
      };
      currentModules.forEach((m) => {
        if (groupsMap[m.category]) {
          groupsMap[m.category].modules.push(m);
        } else {
          if (!groupsMap['core']) groupsMap['core'] = { nameEn: 'General', nameBn: 'সাধারণ', descEn: '', descBn: '', icon: Boxes, modules: [] };
          groupsMap['core'].modules.push(m);
        }
      });
      return Object.entries(groupsMap)
        .filter(([_, g]) => g.modules.length > 0)
        .map(([id, g]) => ({ id, ...g }));
    } else {
      // Reseller 10 Tab Groups matching the Reseller Dashboard Menu exactly
      const groupsMap: Record<string, { nameEn: string; nameBn: string; descEn: string; descBn: string; icon: React.ElementType; modules: RuleModuleDefinition[] }> = {
        core: {
          nameEn: '1. Dashboard & Live KPIs',
          nameBn: '১. ড্যাশবোর্ড ও কেপিআই পরিসংখ্যান',
          descEn: 'Summary counters, sales earnings charts and operational shortcut triggers',
          descBn: 'প্রধান কেপিআই কাউন্টার, আর্নিংস চার্ট ও দ্রুত অপারেশনাল শর্টকাট',
          icon: Boxes,
          modules: [],
        },
        catalog: {
          nameEn: '2. Wholesale Products & Catalog',
          nameBn: '২. হোলসেল প্রোডাক্টস ও ক্যাটালগ',
          descEn: 'Wholesale inventory browsing, profit margin calculator, stock alerts and favorites',
          descBn: 'হোলসেল ইনভেন্টরি ব্রাউজিং, মার্জিন ক্যালকুলেটর, স্টক অ্যালার্ট ও বুকমার্ক',
          icon: ShoppingBag,
          modules: [],
        },
        orders: {
          nameEn: '3. Order Placement & Courier Tracking',
          nameBn: '৩. অর্ডার প্লেসমেন্ট ও কুরিয়ার ট্র্যাকিং',
          descEn: 'Direct order placement, live courier delivery tracking, white-label invoices and returns',
          descBn: 'কাস্টমার অর্ডার প্লেসমেন্ট, লাইভ কুরিয়ার ট্র্যাকিং, কাস্টম ইনভয়েস ও রিটার্ন',
          icon: Truck,
          modules: [],
        },
        tools: {
          nameEn: '4. Customer Directory & Courier Fraud Tools',
          nameBn: '৪. কাস্টমার ডিরেক্টরি ও কুরিয়ার ফ্রড টুলস',
          descEn: 'End-customer phonebook, repeat order statistics, and multi-courier delivery fraud checker',
          descBn: 'কাস্টমার ফোনবুক, অতীত অর্ডার হিস্ট্রি এবং মাল্টি-কুরিয়ার ফ্রড ও ডেলিভারি চেকার',
          icon: Users,
          modules: [],
        },
        finance: {
          nameEn: '5. Profit Wallet & Disbursements',
          nameBn: '৫. প্রফিট ওয়ালেট ও উইথড্রয়াল পে-আউট',
          descEn: 'Live wallet balance, bKash/Nagad/Bank payout requests, payment vouchers and ledger',
          descBn: 'লাইভ ওয়ালেট ব্যালেন্স, বিকাশ/নগদ/ব্যাংক উইথড্রয়াল ও পরিশোধিত ভাউচার হিস্ট্রি',
          icon: Wallet,
          modules: [],
        },
        analytics: {
          nameEn: '6. Sales & Profit Analytics',
          nameBn: '৬. সেলস ও প্রফিট এনালিটিক্স',
          descEn: 'Sales performance trends, margin breakdowns and top-selling product insights',
          descBn: 'সেলস ট্রেন্ডস, মার্জিন ব্রেকডাউন এবং সর্বোচ্চ বিক্রিত লাভজনক প্রোডাক্ট রিপোর্ট',
          icon: TrendingUp,
          modules: [],
        },
        marketing: {
          nameEn: '7. Marketing, Sub-Stores & Landing Pages',
          nameBn: '৭. মার্কেটিং, সাব-স্টোর ও ল্যান্ডিং পেজ',
          descEn: 'Reseller e-commerce sub-store builder, 1-click social share, instant landing pages, and ad tracker',
          descBn: 'রিসেলার সাব-স্টোর বিল্ডার, ১-ক্লিক সোশ্যাল শেয়ার, ইনস্ট্যান্ট ল্যান্ডিং পেজ ও এডস ট্র্যাকার',
          icon: Megaphone,
          modules: [],
        },
        support: {
          nameEn: '8. VIP Membership, Cashback & Priority Support',
          nameBn: '৮. ভিআইপি মেম্বারশিপ, ক্যাশব্যাক ও সাপোর্ট',
          descEn: 'VIP extra margin cashback, expedited order dispatch, and 24/7 dedicated account manager',
          descBn: 'ভিআইপি অতিরিক্ত ক্যাশব্যাক মার্জিন, দ্রুত ডেলিভারি ডিসপ্যাচ ও ২৪/৭ ডেডিকেটেড সাপোর্ট',
          icon: Crown,
          modules: [],
        },
      };

      currentModules.forEach((m) => {
        if (groupsMap[m.category]) {
          groupsMap[m.category].modules.push(m);
        } else {
          if (!groupsMap['tools']) groupsMap['tools'] = { nameEn: 'Additional Tools', nameBn: 'অতিরিক্ত টুলস', descEn: '', descBn: '', icon: Boxes, modules: [] };
          groupsMap['tools'].modules.push(m);
        }
      });

      return Object.entries(groupsMap)
        .filter(([_, g]) => g.modules.length > 0)
        .map(([id, g]) => ({ id, ...g }));
    }
  }, [partnerType, currentModules]);

  // Toggle single cell in matrix
  const handleToggleCell = (planId: string, moduleId: string) => {
    const currentList = activeMatrix[planId] || [];
    const isEnabled = currentList.includes(moduleId);
    const nextList = isEnabled
      ? currentList.filter((id) => id !== moduleId)
      : [...currentList, moduleId];

    const nextMatrix: Record<string, string[]> = {
      ...activeMatrix,
      [planId]: nextList,
    };

    // Synchronize aliases for reseller backward compatibility
    if (partnerType === 'reseller') {
      if (planId === 'standard') {
        nextMatrix['silver'] = nextList;
      } else if (planId === 'silver') {
        nextMatrix['standard'] = nextList;
      } else if (planId === 'premium') {
        nextMatrix['gold_vip'] = nextList;
      } else if (planId === 'gold_vip') {
        nextMatrix['premium'] = nextList;
      }
    }

    if (partnerType === 'seller') {
      setSellerMatrix(nextMatrix);
      savePlanRuleMatrix('seller', nextMatrix);
    } else {
      setResellerMatrix(nextMatrix);
      savePlanRuleMatrix('reseller', nextMatrix);
    }

    if (onMatrixChanged) onMatrixChanged();
  };

  // Toggle all modules for a plan column
  const handleToggleAllForPlan = (planId: string, enableAll: boolean) => {
    const nextList = enableAll ? currentModules.map((m) => m.id) : [];
    const nextMatrix: Record<string, string[]> = {
      ...activeMatrix,
      [planId]: nextList,
    };

    if (partnerType === 'reseller') {
      if (planId === 'standard') nextMatrix['silver'] = nextList;
      if (planId === 'premium') nextMatrix['gold_vip'] = nextList;
    }

    if (partnerType === 'seller') {
      setSellerMatrix(nextMatrix);
      savePlanRuleMatrix('seller', nextMatrix);
    } else {
      setResellerMatrix(nextMatrix);
      savePlanRuleMatrix('reseller', nextMatrix);
    }

    if (onMatrixChanged) onMatrixChanged();
    const msg = isBn
      ? `${planId.toUpperCase()} টিয়ারের জন্য সকল ফিচার ${enableAll ? 'অন' : 'অফ'} করা হয়েছে!`
      : `All features ${enableAll ? 'enabled' : 'cleared'} for ${planId.toUpperCase()} tier!`;
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Toggle all modules in a specific category for a specific plan column
  const handleToggleCategoryForPlan = (categoryGroup: CategoryGroup, planId: string, enable: boolean) => {
    const groupModuleIds = categoryGroup.modules.map((m) => m.id);
    const currentList = activeMatrix[planId] || [];
    let nextList: string[];

    if (enable) {
      nextList = Array.from(new Set([...currentList, ...groupModuleIds]));
    } else {
      nextList = currentList.filter((id) => !groupModuleIds.includes(id));
    }

    const nextMatrix: Record<string, string[]> = {
      ...activeMatrix,
      [planId]: nextList,
    };

    if (partnerType === 'reseller') {
      if (planId === 'standard') nextMatrix['silver'] = nextList;
      if (planId === 'premium') nextMatrix['gold_vip'] = nextList;
    }

    if (partnerType === 'seller') {
      setSellerMatrix(nextMatrix);
      savePlanRuleMatrix('seller', nextMatrix);
    } else {
      setResellerMatrix(nextMatrix);
      savePlanRuleMatrix('reseller', nextMatrix);
    }

    if (onMatrixChanged) onMatrixChanged();
  };

  // Apply Quick Preset
  const handleApplyPreset = (presetType: 'basic' | 'standard' | 'premium') => {
    if (partnerType === 'reseller') {
      if (presetType === 'basic') {
        // Free basic gets core, browse, orders, customer directory, live balance
        const basicModuleIds = ['reseller_dashboard', 'quick_actions', 'catalog_browse', 'margin_calculator', 'orders_place', 'orders_tracking', 'customer_directory', 'customer_add', 'wallet_balance', 'wallet_payouts', 'courier_calculator', 'reseller_leaderboard'];
        const nextMatrix = { ...resellerMatrix, basic: basicModuleIds };
        setResellerMatrix(nextMatrix);
        savePlanRuleMatrix('reseller', nextMatrix);
      } else if (presetType === 'standard') {
        // Standard gets everything except VIP-exclusive items
        const standardModuleIds = currentModules
          .filter((m) => !['stock_alerts', 'landing_page_builder', 'vip_cashback', 'priority_support'].includes(m.id))
          .map((m) => m.id);
        const nextMatrix = { ...resellerMatrix, standard: standardModuleIds, silver: standardModuleIds };
        setResellerMatrix(nextMatrix);
        savePlanRuleMatrix('reseller', nextMatrix);
      } else if (presetType === 'premium') {
        // Premium VIP gets 100% of all modules
        const allModuleIds = currentModules.map((m) => m.id);
        const nextMatrix = { ...resellerMatrix, premium: allModuleIds, gold_vip: allModuleIds };
        setResellerMatrix(nextMatrix);
        savePlanRuleMatrix('reseller', nextMatrix);
      }
    }
    if (onMatrixChanged) onMatrixChanged();
    setSaveSuccessMsg(
      isBn
        ? `সফলভাবে ${presetType.toUpperCase()} প্রিসেট প্রয়োগ করা হয়েছে!`
        : `Successfully applied ${presetType.toUpperCase()} preset!`
    );
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Reset to default
  const handleResetDefaults = () => {
    const confirmPrompt = isBn
      ? `${partnerType === 'seller' ? 'সেলার' : 'রিসেলার'} রুল ম্যাট্রিক্স ফ্যাক্টরি ডিফল্ট সেটিংসে রিসেট করবেন?`
      : `Reset ${partnerType === 'seller' ? 'Seller' : 'Reseller'} Rule Matrix to standard factory defaults?`;
    if (window.confirm(confirmPrompt)) {
      const defaults = getDefaultMatrix(partnerType);
      if (partnerType === 'seller') {
        setSellerMatrix(defaults);
        savePlanRuleMatrix('seller', defaults);
      } else {
        setResellerMatrix(defaults);
        savePlanRuleMatrix('reseller', defaults);
      }
      if (onMatrixChanged) onMatrixChanged();
      setSaveSuccessMsg(isBn ? 'রুল ম্যাট্রিক্স ডিফল্ট সেটিংসে সফলভাবে রিসেট হয়েছে।' : 'Rule Matrix reset to standard defaults.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // User Overrides Logic
  const selectedPartnerOverride = useMemo(() => {
    if (!selectedPartner) return null;
    return userOverrides[selectedPartner.id] || null;
  }, [selectedPartner, userOverrides]);

  const [customUserModules, setCustomUserModules] = useState<string[]>([]);

  React.useEffect(() => {
    if (!selectedPartner) return;
    if (userOverrides[selectedPartner.id]) {
      setCustomUserModules(userOverrides[selectedPartner.id].allowedModules);
    } else {
      const userPlan = selectedPartner.planId || 'basic';
      setCustomUserModules(activeMatrix[userPlan] || activeMatrix['basic'] || []);
    }
  }, [selectedPartner, userOverrides, activeMatrix]);

  const handleToggleUserModule = (moduleId: string) => {
    setCustomUserModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleSaveUserOverride = () => {
    if (!selectedPartner) return;
    saveUserRuleOverride(
      selectedPartner.id,
      customUserModules,
      `Custom admin permissions configured for ${selectedPartner.shopName || selectedPartner.name}`
    );
    setUserOverrides(getUserRuleOverrides());
    setSaveSuccessMsg(
      isBn
        ? `"${selectedPartner.shopName || selectedPartner.name}"-এর জন্য কাস্টম পারমিশন সংরক্ষিত হয়েছে!`
        : `Custom rules saved for ${selectedPartner.shopName || selectedPartner.name}!`
    );
    setTimeout(() => setSaveSuccessMsg(null), 3000);
    if (onMatrixChanged) onMatrixChanged();
  };

  const handleRemoveUserOverride = () => {
    if (!selectedPartner) return;
    const confirmPrompt = isBn
      ? `"${selectedPartner.name}"-এর জন্য কাস্টম রুলস মুছে বেস প্ল্যানের ডিফল্ট নিয়মে ফিরিয়ে আনবেন?`
      : `Remove custom rules and restore base plan rules for ${selectedPartner.name}?`;
    if (window.confirm(confirmPrompt)) {
      removeUserRuleOverride(selectedPartner.id);
      setUserOverrides(getUserRuleOverrides());
      const userPlan = selectedPartner.planId || 'basic';
      setCustomUserModules(activeMatrix[userPlan] || []);
      setSaveSuccessMsg(
        isBn
          ? `কাস্টম রুলস মুছে বেস প্ল্যান (${userPlan.toUpperCase()}) পুনরুদ্ধার করা হয়েছে।`
          : `Custom overrides removed. Restored to ${userPlan.toUpperCase()} plan rules.`
      );
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      if (onMatrixChanged) onMatrixChanged();
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150 text-xs">
      {/* Toast Alert */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 px-4 py-3 rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-xs">{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 font-bold px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-sky-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  {partnerType === 'seller'
                    ? (isBn ? 'সেলার প্ল্যান ও ফিচার রুল ম্যাট্রিক্স' : 'Seller Plan & Feature Rule Matrix')
                    : (isBn ? 'রিসেলার টিয়ার ও ফিচার রুল কনফিগ' : 'Reseller Tier & Feature Rule Config')}
                </h2>
                {!hideTypeSwitcher && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {partnerType === 'seller' ? (isBn ? 'সেলার রুলস' : 'Seller Rules') : (isBn ? 'রিসেলার রুলস' : 'Reseller Rules')}
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {partnerType === 'seller'
                  ? (isBn
                      ? 'চেকবক্সের মাধ্যমে সেলারদের ড্যাশবোর্ড মেনু ট্যাব, ইনভেন্টরি, এআই বট ও প্রিমিয়াম ফিচার কনফিগার করুন।'
                      : 'Configure seller dashboard menu tabs, inventory tools, AI sales bot, and premium tier features via interactive checkboxes.')
                  : (isBn
                      ? 'রিসেলার ড্যাশবোর্ডের মেনু ট্যাব এবং ভেতরের প্রতিটি স্পেসিফিক ফাংশন বেসিক, স্ট্যান্ডার্ড ও প্রিমিয়াম টিয়ারের জন্য আলাদা আলাদাভাবে নির্ধারণ করুন।'
                      : 'Configure reseller dashboard menu tabs and specific granular functions individually across Basic, Standard, and Premium VIP tiers.')}
              </p>
            </div>
          </div>

          {/* Top Switcher: Seller vs Reseller (Hidden when inside Reseller Hub) */}
          {!hideTypeSwitcher && (
            <div className="flex items-center gap-2 shrink-0 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setPartnerType('seller');
                  setSelectedPartnerId('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  partnerType === 'seller'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>{isBn ? 'সেলার রুলস' : 'Seller Rules'}</span>
              </button>
              <button
                onClick={() => {
                  setPartnerType('reseller');
                  setSelectedPartnerId('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  partnerType === 'reseller'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>{isBn ? 'রিসেলার রুলস' : 'Reseller Rules'}</span>
              </button>
            </div>
          )}
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3.5 mt-3.5 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubView('matrix')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'matrix'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isBn ? 'প্ল্যান ফিচার চেকবক্স ম্যাট্রিক্স' : 'Plan Feature Checkbox Matrix'}</span>
            </button>
            <button
              onClick={() => setActiveSubView('individual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubView === 'individual'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isBn ? 'ইউজার-ভিত্তিক কাস্টম পারমিশন' : 'Individual User Overrides'}</span>
              {Object.keys(userOverrides).length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-500 text-white rounded-full font-bold">
                  {Object.keys(userOverrides).length}
                </span>
              )}
            </button>
          </div>

          {activeSubView === 'matrix' && (
            <div className="flex items-center gap-2 flex-wrap">
              {partnerType === 'reseller' && (
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold px-1.5">
                    {isBn ? 'কুইক প্রিসেট:' : 'Quick Presets:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('basic')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 text-[11px] font-bold shadow-xs cursor-pointer"
                    title={isBn ? 'বেসিক ফ্রি প্রিসেট' : 'Basic Free Preset'}
                  >
                    {isBn ? 'বেসিক' : 'Basic'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('standard')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 text-[11px] font-bold shadow-xs cursor-pointer"
                    title={isBn ? 'স্ট্যান্ডার্ড প্রো প্রিসেট' : 'Standard Pro Preset'}
                  >
                    {isBn ? 'স্ট্যান্ডার্ড' : 'Standard'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('premium')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                    title={isBn ? 'প্রিমিয়াম ভিআইপি প্রিসেট (সকল ফিচার)' : 'Premium VIP (All Features)'}
                  >
                    {isBn ? 'প্রিমিয়াম (সবটি)' : 'Premium (All)'}
                  </button>
                </div>
              )}
              <button
                onClick={handleResetDefaults}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                title={isBn ? 'ডিফল্ট সেটিংসে রিসেট' : 'Reset to factory defaults'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isBn ? 'ডিফল্ট রিসেট' : 'Reset Defaults'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE PLAN CHECKBOX MATRIX */}
      {activeSubView === 'matrix' && (
        <div className="space-y-4">
          {/* Search & Stats Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isBn ? 'ড্যাশবোর্ড মেনু ট্যাব বা স্পেসিফিক ফিচার খুঁজুন...' : 'Search dashboard menu tabs or specific functions...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-bold">
              <span>
                {isBn ? `মোট মেনু ক্যাটাগরি: ${categoryGroups.length}টি` : `Menu Categories: ${categoryGroups.length}`}
              </span>
              <span>•</span>
              <span>
                {isBn ? `মোট ফাংশন: ${currentModules.length}টি` : `Total Functions: ${currentModules.length}`}
              </span>
            </div>
          </div>

          {/* Matrix Container */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                    <th className="py-4 px-5 min-w-[320px] font-black uppercase text-[11px] tracking-wider">
                      {isBn ? 'ড্যাশবোর্ড মেনু ট্যাব ও স্পেসিফিক ফাংশনসমূহ' : 'Dashboard Menu Tabs & Specific Functions'}
                    </th>
                    {planColumns.map((col) => {
                      const enabledCount = (activeMatrix[col.id] || []).length;
                      return (
                        <th key={col.id} className="py-4 px-4 text-center min-w-[190px] border-l border-slate-200 dark:border-slate-800">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-3 py-1 rounded-xl font-black text-xs ${col.badgeColor}`}>
                              {col.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                              <span className="font-black text-emerald-600 dark:text-emerald-400">
                                {enabledCount}/{currentModules.length} {isBn ? 'সক্রিয়' : 'Active'}
                              </span>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() => handleToggleAllForPlan(col.id, true)}
                                className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold cursor-pointer"
                              >
                                {isBn ? 'সব অন' : 'All'}
                              </button>
                              <span>/</span>
                              <button
                                type="button"
                                onClick={() => handleToggleAllForPlan(col.id, false)}
                                className="text-rose-600 hover:text-rose-700 hover:underline font-bold cursor-pointer"
                              >
                                {isBn ? 'সব অফ' : 'Clear'}
                              </button>
                            </div>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {categoryGroups.map((group) => {
                    // Filter group modules based on search
                    const visibleModules = group.modules.filter((m) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        m.label.toLowerCase().includes(q) ||
                        m.labelBn.toLowerCase().includes(q) ||
                        m.description.toLowerCase().includes(q)
                      );
                    });

                    if (visibleModules.length === 0) return null;

                    const isCollapsed = !!collapsedCategories[group.id];
                    const IconComponent = group.icon;

                    return (
                      <React.Fragment key={group.id}>
                        {/* Category Header Row */}
                        <tr className="bg-slate-50/90 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-700/80">
                          <td className="py-3 px-5">
                            <div
                              onClick={() => toggleCategoryCollapse(group.id)}
                              className="flex items-center gap-2 cursor-pointer select-none group"
                            >
                              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-black text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {isBn ? group.nameBn : group.nameEn}
                                  </h4>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-md font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    {visibleModules.length} {isBn ? 'টি ফাংশন' : 'functions'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {isBn ? group.descBn : group.descEn}
                                </p>
                              </div>
                              <div className="ml-auto text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </td>

                          {planColumns.map((col) => {
                            const groupModuleIds = group.modules.map((m) => m.id);
                            const enabledInGroup = groupModuleIds.filter((id) => (activeMatrix[col.id] || []).includes(id)).length;
                            const isAllInGroupEnabled = enabledInGroup === groupModuleIds.length;

                            return (
                              <td key={col.id} className="py-3 px-4 text-center border-l border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-center gap-1.5 text-[11px]">
                                  <span className="font-bold text-slate-600 dark:text-slate-300">
                                    {enabledInGroup}/{groupModuleIds.length}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCategoryForPlan(group, col.id, !isAllInGroupEnabled)}
                                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-colors cursor-pointer ${
                                      isAllInGroupEnabled
                                        ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                                    }`}
                                  >
                                    {isAllInGroupEnabled ? (isBn ? 'সব অন' : 'All On') : (isBn ? 'অন করুন' : 'Enable')}
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Individual Functions Rows */}
                        {!isCollapsed &&
                          visibleModules.map((module) => {
                            return (
                              <tr
                                key={module.id}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                <td className="py-3 px-5 pl-10">
                                  <div>
                                    <p className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-2">
                                      <span>{isBn ? module.labelBn : module.label}</span>
                                      {module.category === 'ai_tools' && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                          {isBn ? 'এআই' : 'AI Powered'}
                                        </span>
                                      )}
                                      {module.id === 'vip_cashback' && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                          {isBn ? 'ভিআইপি এক্সক্লুসিভ' : 'VIP Exclusive'}
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      {module.description}
                                    </p>
                                    <span className="text-[9px] font-mono text-slate-400">ID: {module.id}</span>
                                  </div>
                                </td>

                                {planColumns.map((col) => {
                                  const isChecked = (activeMatrix[col.id] || []).includes(module.id);
                                  return (
                                    <td key={col.id} className="py-3 px-4 text-center border-l border-slate-200 dark:border-slate-800">
                                      <label className="inline-flex items-center justify-center cursor-pointer p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleToggleCell(col.id, module.id)}
                                          className="w-5 h-5 rounded-md border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        />
                                      </label>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {categoryGroups.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{isBn ? 'কোনো ফিচার মডিউল পাওয়া যায়নি' : 'No feature modules found'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: INDIVIDUAL USER / RESELLER OVERRIDE */}
      {activeSubView === 'individual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Partner Search & Selector */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  {partnerType === 'seller'
                    ? (isBn ? 'সেলার সিলেক্ট করুন' : 'Select Seller')
                    : (isBn ? 'রিসেলার সিলেক্ট করুন' : 'Select Reseller')}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isBn
                  ? 'যেকোনো নির্দিষ্ট ইউজারের জন্য আলাদা আলাদা ফিচার পারমিশন অন/অফ করতে পারবেন।'
                  : 'Configure custom granular feature permissions for a specific individual account.'}
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isBn ? 'নাম, শপ বা ফোন দিয়ে খুঁজুন...' : 'Search by name, shop or phone...'}
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredPartners.map((p) => {
                const isSelected = selectedPartner?.id === p.id;
                const hasOverride = !!userOverrides[p.id];

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPartnerId(p.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 shadow-xs'
                        : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {p.shopName || p.name}
                        </p>
                        {hasOverride && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 shrink-0">
                            {isBn ? 'কাস্টম রুলস' : 'Custom Rules'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {p.name} • {p.phone}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {isBn ? 'প্ল্যান:' : 'Plan:'} {(p.planId || 'basic').toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            p.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected ? 'text-emerald-600 translate-x-1' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}

              {filteredPartners.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs">
                  {isBn ? 'কোনো পার্টনার পাওয়া যায়নি' : 'No partners found'}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Custom Checkbox Matrix for Selected User */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            {selectedPartner ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">
                        {selectedPartner.shopName || selectedPartner.name}
                      </h3>
                      {selectedPartnerOverride ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          {isBn ? '⚡ কাস্টম পারমিশন সক্রিয়' : '⚡ Custom Overrides Active'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {isBn ? 'বেস প্ল্যান:' : 'Base Plan:'} {(selectedPartner.planId || 'Basic').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isBn ? 'ইউজারনেম:' : 'Username:'}{' '}
                      <span className="font-mono text-slate-700 dark:text-slate-300">{selectedPartner.username}</span> •{' '}
                      {isBn ? 'ফোন:' : 'Phone:'} {selectedPartner.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {selectedPartnerOverride && (
                      <button
                        onClick={handleRemoveUserOverride}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-600 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{isBn ? 'প্ল্যান ডিফল্টে রিসেট' : 'Reset to Default'}</span>
                      </button>
                    )}
                    <button
                      onClick={handleSaveUserOverride}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isBn ? 'কাস্টম পারমিশন সেভ' : 'Save Custom Rules'}</span>
                    </button>
                  </div>
                </div>

                {/* Modules Grid with Checkboxes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                    <span>
                      {isBn
                        ? `ড্যাশবোর্ড ফিচার ও পারমিশনসমূহ (${customUserModules.length}টি অন আছে)`
                        : `Dashboard Features & Permissions (${customUserModules.length} Enabled)`}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCustomUserModules(currentModules.map((m) => m.id))}
                        className="text-emerald-600 hover:underline font-bold cursor-pointer"
                      >
                        {isBn ? 'সব অন করুন' : 'Enable All'}
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => setCustomUserModules([])}
                        className="text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        {isBn ? 'সব বন্ধ করুন' : 'Disable All'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                    {currentModules.map((module) => {
                      const isAllowed = customUserModules.includes(module.id);
                      return (
                        <label
                          key={module.id}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                            isAllowed
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                              : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isAllowed}
                            onChange={() => handleToggleUserModule(module.id)}
                            className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 mt-1 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{isBn ? module.labelBn : module.label}</span>
                              {module.category === 'ai_tools' && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded font-black">
                                  {isBn ? 'এআই' : 'AI'}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {module.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-slate-400">
                <Store className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>{isBn ? 'বামের তালিকা থেকে কোনো পার্টনার সিলেক্ট করুন' : 'Select a partner from the left list'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default PlanRuleMatrixManager;
