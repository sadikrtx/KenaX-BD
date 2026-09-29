import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw,
  Store,
  Boxes,
  Sliders,
  Check,
  Search,
  Cloud,
  Database,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
  Layers,
  Lock,
  Table,
  LayoutGrid,
  Filter,
  CheckSquare,
  Square,
  HelpCircle,
} from 'lucide-react';
import {
  SELLER_DASHBOARD_TABS,
  RESELLER_DASHBOARD_TABS,
  RolePermissionMatrixConfig,
  DEFAULT_PERMISSION_MATRIX,
  DEFAULT_RESELLER_TIER_TABS,
  ResellerTierAllowedTabs,
  subscribeToFirebasePermissionMatrix,
  savePermissionMatrixToFirebase,
  getCachedPermissionMatrix,
  DashboardTabModule,
} from '../../lib/permissionMatrixService';
import { useLanguage } from '../../context/LanguageContext';

const GROUP_LABELS: Record<string, { en: string; bn: string }> = {
  core: { en: 'Core', bn: 'ড্যাশবোর্ড' },
  catalog: { en: 'Catalog', bn: 'ক্যাটালগ' },
  orders: { en: 'Orders', bn: 'অর্ডার' },
  finance: { en: 'Finance', bn: 'অর্থায়ন' },
  marketing: { en: 'Marketing', bn: 'মার্কেটিং' },
  tools: { en: 'Tools', bn: 'টুলস' },
  support: { en: 'Support', bn: 'সাপোর্ট' },
};

export const PermissionMatrix: React.FC = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [matrixSection, setMatrixSection] = useState<'roles' | 'tiers'>('roles');
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');
  const [activeRole, setActiveRole] = useState<'seller' | 'reseller'>('seller');
  const [matrixConfig, setMatrixConfig] = useState<RolePermissionMatrixConfig>(() =>
    getCachedPermissionMatrix()
  );
  const [savedConfig, setSavedConfig] = useState<RolePermissionMatrixConfig>(() =>
    getCachedPermissionMatrix()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to live Firebase updates
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToFirebasePermissionMatrix((updated) => {
      setMatrixConfig(updated);
      setSavedConfig(updated);
      setIsLoading(false);
      setFirebaseStatus('connected');
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentTierTabs: ResellerTierAllowedTabs = useMemo(() => {
    return matrixConfig.resellerTierAllowedTabs || DEFAULT_RESELLER_TIER_TABS;
  }, [matrixConfig.resellerTierAllowedTabs]);

  const hasUnsavedChanges = useMemo(() => {
    const savedTiers = savedConfig.resellerTierAllowedTabs || DEFAULT_RESELLER_TIER_TABS;
    const currentTiers = matrixConfig.resellerTierAllowedTabs || DEFAULT_RESELLER_TIER_TABS;

    return (
      JSON.stringify(matrixConfig.sellerAllowedTabs.slice().sort()) !==
        JSON.stringify(savedConfig.sellerAllowedTabs.slice().sort()) ||
      JSON.stringify(matrixConfig.resellerAllowedTabs.slice().sort()) !==
        JSON.stringify(savedConfig.resellerAllowedTabs.slice().sort()) ||
      JSON.stringify(currentTiers.basic.slice().sort()) !== JSON.stringify(savedTiers.basic.slice().sort()) ||
      JSON.stringify(currentTiers.standard.slice().sort()) !== JSON.stringify(savedTiers.standard.slice().sort()) ||
      JSON.stringify(currentTiers.premium.slice().sort()) !== JSON.stringify(savedTiers.premium.slice().sort())
    );
  }, [matrixConfig, savedConfig]);

  // Combined master list of all distinct tabs across Seller and Reseller for the Matrix Table
  interface UnifiedTabRow {
    id: string;
    label: string;
    labelBn: string;
    group: string;
    description: string;
    descriptionBn: string;
    isSellerAvailable: boolean;
    isResellerAvailable: boolean;
  }

  const unifiedRows: UnifiedTabRow[] = useMemo(() => {
    const map = new Map<string, UnifiedTabRow>();

    SELLER_DASHBOARD_TABS.forEach((t) => {
      map.set(t.id, {
        id: t.id,
        label: t.label,
        labelBn: t.labelBn,
        group: t.group,
        description: t.description,
        descriptionBn: t.descriptionBn,
        isSellerAvailable: true,
        isResellerAvailable: false,
      });
    });

    RESELLER_DASHBOARD_TABS.forEach((t) => {
      const existing = map.get(t.id);
      if (existing) {
        existing.isResellerAvailable = true;
      } else {
        map.set(t.id, {
          id: t.id,
          label: t.label,
          labelBn: t.labelBn,
          group: t.group,
          description: t.description,
          descriptionBn: t.descriptionBn,
          isSellerAvailable: false,
          isResellerAvailable: true,
        });
      }
    });

    return Array.from(map.values());
  }, []);

  // Filtered rows for Matrix View
  const filteredUnifiedRows = useMemo(() => {
    return unifiedRows.filter((row) => {
      const matchSearch =
        row.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.labelBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.descriptionBn && row.descriptionBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        row.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchGroup = filterGroup === 'all' || row.group === filterGroup;
      return matchSearch && matchGroup;
    });
  }, [unifiedRows, searchQuery, filterGroup]);

  // Filtered tabs for Cards View
  const currentRoleTabModules = useMemo(() => {
    return activeRole === 'seller' ? SELLER_DASHBOARD_TABS : RESELLER_DASHBOARD_TABS;
  }, [activeRole]);

  const activeAllowedTabs = useMemo(() => {
    return activeRole === 'seller' ? matrixConfig.sellerAllowedTabs : matrixConfig.resellerAllowedTabs;
  }, [activeRole, matrixConfig]);

  const filteredCardTabs = useMemo(() => {
    return currentRoleTabModules.filter((tab) => {
      const matchSearch =
        tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tab.labelBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tab.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tab.descriptionBn && tab.descriptionBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        tab.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchGroup = filterGroup === 'all' || tab.group === filterGroup;
      return matchSearch && matchGroup;
    });
  }, [currentRoleTabModules, searchQuery, filterGroup]);

  // Toggle single tab checkbox for specific role
  const handleToggleTabForRole = (role: 'seller' | 'reseller', tabId: string) => {
    if (role === 'seller') {
      const isAllowed = matrixConfig.sellerAllowedTabs.includes(tabId);
      const nextAllowed = isAllowed
        ? matrixConfig.sellerAllowedTabs.filter((id) => id !== tabId)
        : [...matrixConfig.sellerAllowedTabs, tabId];

      setMatrixConfig((prev) => ({
        ...prev,
        sellerAllowedTabs: nextAllowed,
      }));
    } else {
      const isAllowed = matrixConfig.resellerAllowedTabs.includes(tabId);
      const nextAllowed = isAllowed
        ? matrixConfig.resellerAllowedTabs.filter((id) => id !== tabId)
        : [...matrixConfig.resellerAllowedTabs, tabId];

      setMatrixConfig((prev) => ({
        ...prev,
        resellerAllowedTabs: nextAllowed,
      }));
    }
  };

  // Toggle both roles simultaneously for a tab
  const handleToggleBothRoles = (tabId: string, enable: boolean) => {
    setMatrixConfig((prev) => {
      const nextSeller = enable
        ? Array.from(new Set([...prev.sellerAllowedTabs, tabId]))
        : prev.sellerAllowedTabs.filter((id) => id !== tabId);

      const nextReseller = enable
        ? Array.from(new Set([...prev.resellerAllowedTabs, tabId]))
        : prev.resellerAllowedTabs.filter((id) => id !== tabId);

      return {
        ...prev,
        sellerAllowedTabs: nextSeller,
        resellerAllowedTabs: nextReseller,
      };
    });
  };

  // Bulk role toggle
  const handleBulkToggleRole = (role: 'seller' | 'reseller', enableAll: boolean) => {
    const modules = role === 'seller' ? SELLER_DASHBOARD_TABS : RESELLER_DASHBOARD_TABS;
    const targetIds = enableAll ? modules.map((t) => t.id) : [];

    setMatrixConfig((prev) => ({
      ...prev,
      [role === 'seller' ? 'sellerAllowedTabs' : 'resellerAllowedTabs']: targetIds,
    }));

    const roleName = isBn ? (role === 'seller' ? 'সেলার' : 'রিসেলার') : role.toUpperCase();
    showToast(
      isBn
        ? enableAll
          ? `সকল ${roleName} ট্যাব সক্রিয় করা হয়েছে!`
          : `সকল ${roleName} ট্যাব নিষ্ক্রিয় করা হয়েছে!`
        : enableAll
          ? `All ${roleName} tabs enabled!`
          : `All ${roleName} tabs disabled!`
    );
  };

  // Reset to Factory Defaults
  const handleResetToDefaults = () => {
    setMatrixConfig(DEFAULT_PERMISSION_MATRIX);
    savePermissionMatrixToFirebase(DEFAULT_PERMISSION_MATRIX)
      .then(() => {
        setSavedConfig(DEFAULT_PERMISSION_MATRIX);
        showToast(
          isBn
            ? 'পারমিশন ম্যাট্রিক্স ডিফল্ট অবস্থায় রিসেট ও ফায়ারবেসে সিঙ্ক করা হয়েছে!'
            : 'Permission matrix reset to default and synced with Firebase!'
        );
      })
      .catch(() => {
        showToast(isBn ? 'রিসেট লোকাল স্টোরেজে সেভ হয়েছে।' : 'Reset saved locally.');
      });
  };

  // Toggle single cell in Reseller Tier Matrix
  const handleToggleTierTab = (planId: 'basic' | 'standard' | 'premium', tabId: string) => {
    setMatrixConfig((prev) => {
      const tierTabs = prev.resellerTierAllowedTabs || DEFAULT_RESELLER_TIER_TABS;
      const currentList = tierTabs[planId] || [];
      const nextList = currentList.includes(tabId)
        ? currentList.filter((id) => id !== tabId)
        : [...currentList, tabId];

      return {
        ...prev,
        resellerTierAllowedTabs: {
          ...tierTabs,
          [planId]: nextList,
        },
      };
    });
  };

  // Toggle all modules for a specific Reseller Tier column
  const handleBulkToggleTier = (planId: 'basic' | 'standard' | 'premium', enableAll: boolean) => {
    setMatrixConfig((prev) => {
      const tierTabs = prev.resellerTierAllowedTabs || DEFAULT_RESELLER_TIER_TABS;
      const targetIds = enableAll ? RESELLER_DASHBOARD_TABS.map((t) => t.id) : [];

      return {
        ...prev,
        resellerTierAllowedTabs: {
          ...tierTabs,
          [planId]: targetIds,
        },
      };
    });

    const tierName =
      planId === 'premium'
        ? isBn ? 'প্রিমিয়াম ভিআইপি' : 'Premium VIP'
        : planId === 'standard'
        ? isBn ? 'স্ট্যান্ডার্ড' : 'Standard'
        : isBn ? 'বেসিক' : 'Basic';

    showToast(
      isBn
        ? enableAll
          ? `${tierName} টিয়ারের জন্য সকল ফিচার সক্রিয় করা হয়েছে!`
          : `${tierName} টিয়ারের জন্য সকল ফিচার নিষ্ক্রিয় করা হয়েছে!`
        : enableAll
          ? `All tabs enabled for ${tierName} Reseller tier!`
          : `All tabs disabled for ${tierName} Reseller tier!`
    );
  };

  // Row-level quick action for tier matrix
  const handleSetRowTierMode = (tabId: string, mode: 'all' | 'vip_only' | 'off') => {
    setMatrixConfig((prev) => {
      const tierTabs = prev.resellerTierAllowedTabs || DEFAULT_RESELLER_TIER_TABS;
      let newBasic = [...tierTabs.basic];
      let newStandard = [...tierTabs.standard];
      let newPremium = [...tierTabs.premium];

      if (mode === 'all') {
        if (!newBasic.includes(tabId)) newBasic.push(tabId);
        if (!newStandard.includes(tabId)) newStandard.push(tabId);
        if (!newPremium.includes(tabId)) newPremium.push(tabId);
      } else if (mode === 'vip_only') {
        newBasic = newBasic.filter((id) => id !== tabId);
        newStandard = newStandard.filter((id) => id !== tabId);
        if (!newPremium.includes(tabId)) newPremium.push(tabId);
      } else {
        newBasic = newBasic.filter((id) => id !== tabId);
        newStandard = newStandard.filter((id) => id !== tabId);
        newPremium = newPremium.filter((id) => id !== tabId);
      }

      return {
        ...prev,
        resellerTierAllowedTabs: {
          basic: newBasic,
          standard: newStandard,
          premium: newPremium,
        },
      };
    });
  };

  // Save to Firebase
  const handleSaveToFirebase = async () => {
    setIsSaving(true);
    try {
      await savePermissionMatrixToFirebase(matrixConfig);
      setSavedConfig(matrixConfig);
      setIsSaving(false);
      showToast(
        isBn
          ? '🎉 পারমিশন ম্যাট্রিক্স সফলভাবে ফায়ারবেস ফায়ারস্টোরে সেভ হয়েছে! লাইভ কার্যকর।'
          : '🎉 Permission Matrix successfully saved to Firestore! Live rules updated.'
      );
    } catch (error) {
      setIsSaving(false);
      showToast(
        isBn
          ? '⚠️ লোকাল স্টোরেজে সেভ হয়েছে। ফায়ারবেস পারমিশন চেক করুন।'
          : '⚠️ Saved to local storage. Check Firebase permissions.'
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 text-xs">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 dark:border-slate-300 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span className="font-bold text-xs">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white dark:hover:text-slate-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {isBn ? 'রোল-ভিত্তিক পারমিশন ম্যাট্রিক্স' : 'Role-Based UI Permission Matrix'}
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  <Sliders className="w-3 h-3" />
                  <span>{isBn ? 'সেলার বনাম রিসেলার' : 'Sellers vs Resellers'}</span>
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <Cloud className="w-3 h-3" />
                  <span>{isBn ? 'ফায়ারবেস সিঙ্কড' : 'Firestore Synced'}</span>
                </span>
                {hasUnsavedChanges && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700 animate-pulse">
                    {isBn ? 'পরিবর্তন সেভ করা হয়নি' : 'Unsaved Changes'}
                  </span>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                {isBn
                  ? 'ইউআই-ভিত্তিক চেকবক্স ম্যাট্রিক্সের মাধ্যমে সেলার ও রিসেলারদের ড্যাশবোর্ড ট্যাবসমূহ নিয়ন্ত্রণ করুন। ফায়ারবেস ফায়ারস্টোরে সংরক্ষিত হয়ে রিয়েল-টাইমে কাজ করে।'
                  : 'UI-based checkbox matrix to map interface tabs to specific user roles (Sellers vs. Resellers). Settings persist to Firestore and dynamically show/hide tabs in real-time.'}
              </p>
            </div>
          </div>

          {/* Top Actions: View Toggle, Reset & Save */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title={isBn ? 'ম্যাট্রিক্স টেবিল ভিউ' : 'Matrix Table View'}
              >
                <Table className="w-3.5 h-3.5" />
                <span>{isBn ? 'ম্যাট্রিক্স টেবিল' : 'Matrix Table'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title={isBn ? 'রোল কার্ডস গ্রিড ভিউ' : 'Role Cards Grid View'}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{isBn ? 'রোল কার্ডস' : 'Role Cards'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title={isBn ? 'সব ট্যাব ডিফল্ট অবস্থায় রিসেট করুন' : 'Reset all tabs to default state'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isBn ? 'রিসেট' : 'Reset'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToFirebase}
              disabled={isSaving}
              className={`px-4 py-2 rounded-xl text-white font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 ${
                hasUnsavedChanges
                  ? 'bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-500/30'
                  : 'bg-sky-600 hover:bg-sky-700'
              } disabled:opacity-50`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isBn ? 'ফায়ারস্টোরে সেভ করুন' : 'Save to Firestore'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sync Status Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-[11px]">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {isBn ? 'ফায়ারস্টোর লোকেশন: ' : 'Firestore Target: '}
              <strong className="text-slate-700 dark:text-slate-300 font-mono">
                system_settings/permission_matrix
              </strong>
            </span>
          </div>

          <div className="text-slate-400">
            {isBn ? 'সর্বশেষ সিঙ্ক: ' : 'Last Synced: '}
            <span className="font-mono text-slate-600 dark:text-slate-300">
              {new Date(matrixConfig.updatedAt).toLocaleTimeString()} (
              {new Date(matrixConfig.updatedAt).toLocaleDateString()})
            </span>{' '}
            • {isBn ? 'আপডেটকারী: ' : 'by '}
            <span className="font-semibold">{matrixConfig.updatedBy}</span>
          </div>
        </div>
      </div>

      {/* Top Configuration Mode Selector */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 w-fit">
        <button
          type="button"
          onClick={() => setMatrixSection('roles')}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            matrixSection === 'roles'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 text-sky-500" />
          <span>{isBn ? 'রুল ম্যাট্রিক্স: সেলার বনাম রিসেলার' : 'Role Matrix: Seller vs Reseller'}</span>
        </button>

        <button
          type="button"
          onClick={() => setMatrixSection('tiers')}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            matrixSection === 'tiers'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{isBn ? 'রিসেলার টিয়ার প্ল্যান ম্যাট্রিক্স' : 'Reseller Tier Matrix'}</span>
          <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
            {isBn ? 'কাস্টমাইজেবল' : 'Customizable'}
          </span>
        </button>
      </div>

      {/* SECTION 1: ROLE MATRIX (SELLER VS RESELLER) */}
      {matrixSection === 'roles' && (
        <>
          {/* Role Summary Stats Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Seller Card Summary */}
            <div
              onClick={() => {
                setActiveRole('seller');
                if (viewMode === 'cards') setViewMode('cards');
              }}
              className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between ${
                activeRole === 'seller'
                  ? 'bg-sky-50/70 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 shadow-md ring-2 ring-sky-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      {isBn ? 'সেলার রোল' : 'Seller Role'}
                    </h3>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-sky-600/20 text-sky-700 dark:text-sky-300">
                      {matrixConfig.sellerAllowedTabs.length} / {SELLER_DASHBOARD_TABS.length} {isBn ? 'সক্রিয়' : 'Active'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isBn
                      ? 'ভেন্ডর স্টোর, প্রোডাক্ট ক্যাটালগ, অর্ডার ও পে-আউট ট্যাব নিয়ন্ত্রণ করে'
                      : 'Controls vendor store, product catalog, orders, and payout tabs'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBulkToggleRole('seller', true);
                  }}
                  className="px-2 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/60 dark:hover:bg-sky-800 text-sky-800 dark:text-sky-200 text-[10px] font-bold"
                  title={isBn ? 'সকল সেলার ট্যাব সক্রিয় করুন' : 'Enable all Seller tabs'}
                >
                  {isBn ? 'সব অন' : 'All On'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBulkToggleRole('seller', false);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold"
                  title={isBn ? 'সকল সেলার ট্যাব নিষ্ক্রিয় করুন' : 'Disable all Seller tabs'}
                >
                  {isBn ? 'সব অফ' : 'All Off'}
                </button>
              </div>
            </div>

            {/* Reseller Card Summary */}
            <div
              onClick={() => {
                setActiveRole('reseller');
                if (viewMode === 'cards') setViewMode('cards');
              }}
              className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-center justify-between ${
                activeRole === 'reseller'
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      {isBn ? 'রিসেলার রোল' : 'Reseller Role'}
                    </h3>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-emerald-600/20 text-emerald-700 dark:text-emerald-300">
                      {matrixConfig.resellerAllowedTabs.length} / {RESELLER_DASHBOARD_TABS.length} {isBn ? 'সক্রিয়' : 'Active'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isBn
                      ? 'অ্যাক্টিভ সেলস, আর্নিং ওভারভিউ, প্রোডাক্ট ক্যাটালগ ও সিআরএম নিয়ন্ত্রণ করে'
                      : 'Controls Active Sales, Earnings Overview, Product Catalog, and CRM'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBulkToggleRole('reseller', true);
                  }}
                  className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold"
                  title={isBn ? 'সকল রিসেলার ট্যাব সক্রিয় করুন' : 'Enable all Reseller tabs'}
                >
                  {isBn ? 'সব অন' : 'All On'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBulkToggleRole('reseller', false);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold"
                  title={isBn ? 'সকল রিসেলার ট্যাব নিষ্ক্রিয় করুন' : 'Disable all Reseller tabs'}
                >
                  {isBn ? 'সব অফ' : 'All Off'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SECTION 2: RESELLER TIER MATRIX (BASIC / STANDARD / PREMIUM VIP) */}
      {matrixSection === 'tiers' && (
        <div className="space-y-4">
          {/* Tier Policy Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-800/80 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                {isBn ? 'টিয়ার-ভিত্তিক কাস্টমাইজার' : 'Tier-Based Customizer'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-200 font-bold">
                {isBn
                  ? 'কাস্টমাইজ করুন কোন প্ল্যানের রিসেলার কোন কোন ফিচার/ট্যাব দেখতে পারবে'
                  : 'Customize which UI features and tabs each reseller plan tier can access'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-black text-slate-200">
                  <span>{isBn ? '🔰 বেসিক রিসেলার' : '🔰 Basic Reseller'}</span>
                  <span className="text-[10px] text-slate-400">{isBn ? '৳০ / ফ্রি' : '৳0 / Free'}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isBn ? (
                    <>⚠️ <strong>ডেলিভারি চার্জ নিয়ম:</strong> প্রথম <strong>৫ থেকে ৭টি</strong> অর্ডারের ডেলিভারি চার্জ অগ্রিম প্রযোজ্য।</>
                  ) : (
                    <>⚠️ <strong>Delivery Policy:</strong> Advance delivery charge required for first <strong>5 to 7</strong> orders.</>
                  )}
                </p>
                <div className="text-[10px] text-emerald-400 font-bold">
                  {isBn
                    ? `সক্রিয়: ${currentTierTabs.basic.length} / ${RESELLER_DASHBOARD_TABS.length} টি ফিচার`
                    : `Active: ${currentTierTabs.basic.length} / ${RESELLER_DASHBOARD_TABS.length} features`}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-sky-800/50 space-y-1">
                <div className="flex items-center justify-between font-black text-sky-300">
                  <span>{isBn ? '🥈 স্ট্যান্ডার্ড প্রো' : '🥈 Standard Pro'}</span>
                  <span className="text-[10px] text-sky-400">{isBn ? '৳৫৯০ / মাস' : '৳590 / Month'}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isBn ? (
                    <>📦 <strong>ডেলিভারি চার্জ নিয়ম:</strong> প্রথম <strong>৩টি</strong> অর্ডারের ডেলিভারি চার্জ অগ্রিম প্রযোজ্য।</>
                  ) : (
                    <>📦 <strong>Delivery Policy:</strong> Advance delivery charge required for first <strong>3</strong> orders.</>
                  )}
                </p>
                <div className="text-[10px] text-sky-400 font-bold">
                  {isBn
                    ? `সক্রিয়: ${currentTierTabs.standard.length} / ${RESELLER_DASHBOARD_TABS.length} টি ফিচার`
                    : `Active: ${currentTierTabs.standard.length} / ${RESELLER_DASHBOARD_TABS.length} features`}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-800/50 space-y-1">
                <div className="flex items-center justify-between font-black text-amber-300">
                  <span>{isBn ? '👑 প্রিমিয়াম ভিআইপি' : '👑 Premium VIP'}</span>
                  <span className="text-[10px] text-amber-400">{isBn ? '৳১৪৯০ / মাস' : '৳1,490 / Month'}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isBn ? (
                    <>✨ <strong>ডেলিভারি চার্জ নিয়ম:</strong> <strong>কোনো অগ্রিম ডেলিভারি চার্জ নেই</strong> (০ অগ্রিম, ফুল ক্যাশ অন ডেলিভারি)।</>
                  ) : (
                    <>✨ <strong>Delivery Policy:</strong> <strong>Zero advance delivery charge</strong> (0 Advance, Full Cash on Delivery).</>
                  )}
                </p>
                <div className="text-[10px] text-amber-400 font-bold">
                  {isBn
                    ? `সক্রিয়: ${currentTierTabs.premium.length} / ${RESELLER_DASHBOARD_TABS.length} টি ফিচার (সব আনলকড)`
                    : `Active: ${currentTierTabs.premium.length} / ${RESELLER_DASHBOARD_TABS.length} features (All Unlocked)`}
                </div>
              </div>
            </div>
          </div>

          {/* Reseller Tier Matrix Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">{isBn ? 'রিসেলার ফিচার / ট্যাব' : 'Reseller Feature / UI Tab'}</th>
                    <th className="px-3 py-3.5 text-center">{isBn ? 'গ্রুপ' : 'Group'}</th>
                    <th className="px-4 py-3.5 text-center bg-slate-100/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200">
                      <div className="space-y-1">
                        <div>{isBn ? '🔰 বেসিক' : '🔰 Basic'}</div>
                        <div className="flex items-center justify-center gap-1 font-normal lowercase text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleBulkToggleTier('basic', true)}
                            className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:underline"
                          >
                            {isBn ? 'সব অন' : 'all on'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkToggleTier('basic', false)}
                            className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:underline"
                          >
                            {isBn ? 'সব অফ' : 'all off'}
                          </button>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-center bg-sky-50/50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300">
                      <div className="space-y-1">
                        <div>{isBn ? '🥈 স্ট্যান্ডার্ড' : '🥈 Standard'}</div>
                        <div className="flex items-center justify-center gap-1 font-normal lowercase text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleBulkToggleTier('standard', true)}
                            className="px-1.5 py-0.5 rounded bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-200 hover:underline"
                          >
                            {isBn ? 'সব অন' : 'all on'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkToggleTier('standard', false)}
                            className="px-1.5 py-0.5 rounded bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-200 hover:underline"
                          >
                            {isBn ? 'সব অফ' : 'all off'}
                          </button>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-center bg-amber-50/50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">
                      <div className="space-y-1">
                        <div>{isBn ? '👑 প্রিমিয়াম ভিআইপি' : '👑 Premium VIP'}</div>
                        <div className="flex items-center justify-center gap-1 font-normal lowercase text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleBulkToggleTier('premium', true)}
                            className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 hover:underline"
                          >
                            {isBn ? 'সব অন' : 'all on'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkToggleTier('premium', false)}
                            className="px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 hover:underline"
                          >
                            {isBn ? 'সব অফ' : 'all off'}
                          </button>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-right">{isBn ? 'টিয়ার অ্যাকশন' : 'Quick Tier Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {RESELLER_DASHBOARD_TABS.map((tab) => {
                    const isBasic = currentTierTabs.basic.includes(tab.id);
                    const isStandard = currentTierTabs.standard.includes(tab.id);
                    const isPremium = currentTierTabs.premium.includes(tab.id);

                    return (
                      <tr key={tab.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">
                              {tab.id}
                            </span>
                            <span className="font-black text-xs text-slate-900 dark:text-white">
                              {isBn ? tab.labelBn : tab.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
                            {isBn ? tab.descriptionBn : tab.description}
                          </p>
                        </td>

                        <td className="px-3 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {isBn ? (GROUP_LABELS[tab.group]?.bn || tab.group) : (GROUP_LABELS[tab.group]?.en || tab.group)}
                          </span>
                        </td>

                        {/* Basic Checkbox */}
                        <td className="px-4 py-3.5 text-center bg-slate-50/40 dark:bg-slate-950/20">
                          <button
                            type="button"
                            onClick={() => handleToggleTierTab('basic', tab.id)}
                            className="inline-flex items-center justify-center cursor-pointer p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                          >
                            {isBasic ? (
                              <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>
                        </td>

                        {/* Standard Checkbox */}
                        <td className="px-4 py-3.5 text-center bg-sky-50/20 dark:bg-sky-950/10">
                          <button
                            type="button"
                            onClick={() => handleToggleTierTab('standard', tab.id)}
                            className="inline-flex items-center justify-center cursor-pointer p-1 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/40"
                          >
                            {isStandard ? (
                              <CheckSquare className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>
                        </td>

                        {/* Premium VIP Checkbox */}
                        <td className="px-4 py-3.5 text-center bg-amber-50/20 dark:bg-amber-950/10">
                          <button
                            type="button"
                            onClick={() => handleToggleTierTab('premium', tab.id)}
                            className="inline-flex items-center justify-center cursor-pointer p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40"
                          >
                            {isPremium ? (
                              <CheckSquare className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>
                        </td>

                        {/* Quick Row Level Action */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSetRowTierMode(tab.id, 'all')}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold"
                            >
                              {isBn ? 'সব টিয়ার' : 'All Tiers'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetRowTierMode(tab.id, 'vip_only')}
                              className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold"
                            >
                              {isBn ? 'শুধু ভিআইপি' : 'VIP Only'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetRowTierMode(tab.id, 'off')}
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-bold"
                            >
                              {isBn ? 'বন্ধ' : 'Off'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isBn ? 'নাম, আইডি বা বিবরণ দিয়ে খুঁজুন...' : 'Search UI tabs by name, ID or description...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
          >
            <option value="all">{isBn ? 'সকল ক্যাটাগরি' : 'All Groups'}</option>
            <option value="core">{isBn ? 'ড্যাশবোর্ড ও ওভারভিউ' : 'Core & Overview'}</option>
            <option value="catalog">{isBn ? 'প্রোডাক্ট ও ক্যাটালগ' : 'Products & Catalog'}</option>
            <option value="orders">{isBn ? 'অর্ডার ও সেলস' : 'Orders & Active Sales'}</option>
            <option value="finance">{isBn ? 'ফাইন্যান্স ও আর্নিং' : 'Finance & Earnings'}</option>
            <option value="marketing">{isBn ? 'মার্কেটিং ও শেয়ার' : 'Marketing & Sharing'}</option>
            <option value="tools">{isBn ? 'অটোমেশন ও টুলস' : 'Automation & Tools'}</option>
            <option value="support">{isBn ? 'হেল্পডেস্ক ও প্ল্যান' : 'Helpdesk & Plans'}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-semibold mr-1">
            {isBn ? 'প্রদর্শিত মডিউল:' : 'Displaying:'}{' '}
            <strong>{viewMode === 'matrix' ? filteredUnifiedRows.length : filteredCardTabs.length}</strong>{' '}
            {isBn ? 'টি' : 'modules'}
          </span>
        </div>
      </div>

      {/* VIEW MODE 1: MATRIX TABLE VIEW (Side-by-Side Checkboxes) */}
      {viewMode === 'matrix' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">{isBn ? 'ইউআই ট্যাব / মডিউল' : 'UI Tab / Module'}</th>
                  <th className="px-3 py-3.5 text-center">{isBn ? 'গ্রুপ' : 'Group'}</th>
                  <th className="px-4 py-3.5 text-center bg-sky-50/50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300">
                    <div className="flex items-center justify-center gap-1.5">
                      <Store className="w-3.5 h-3.5" />
                      <span>{isBn ? 'সেলার রোল' : 'Sellers Role'}</span>
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-center bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
                    <div className="flex items-center justify-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5" />
                      <span>{isBn ? 'রিসেলার রোল' : 'Resellers Role'}</span>
                    </div>
                  </th>
                  <th className="px-3 py-3.5 text-center">{isBn ? 'অ্যাক্সেস স্ট্যাটাস' : 'Access Status'}</th>
                  <th className="px-4 py-3.5 text-right">{isBn ? 'অ্যাকশন' : 'Quick Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredUnifiedRows.map((row) => {
                  const isSellerAllowed = matrixConfig.sellerAllowedTabs.includes(row.id);
                  const isResellerAllowed = matrixConfig.resellerAllowedTabs.includes(row.id);

                  let statusBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-400 dark:bg-slate-800">
                      {isBn ? 'লুকানো (উভয় বন্ধ)' : 'Hidden (Both Off)'}
                    </span>
                  );
                  if (isSellerAllowed && isResellerAllowed) {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {isBn ? 'উভয় রোলে সক্রিয়' : 'Both Roles Allowed'}
                      </span>
                    );
                  } else if (isSellerAllowed) {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        {isBn ? 'শুধু সেলার' : 'Seller Only'}
                      </span>
                    );
                  } else if (isResellerAllowed) {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {isBn ? 'শুধু রিসেলার' : 'Reseller Only'}
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Module info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">
                            {row.id}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {isBn ? row.labelBn : row.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
                          {isBn ? row.descriptionBn : row.description}
                        </p>
                      </td>

                      {/* Group Tag */}
                      <td className="px-3 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {isBn ? (GROUP_LABELS[row.group]?.bn || row.group) : (GROUP_LABELS[row.group]?.en || row.group)}
                        </span>
                      </td>

                      {/* Seller Checkbox Column */}
                      <td className="px-4 py-3.5 text-center bg-sky-50/20 dark:bg-sky-950/10">
                        <label className="inline-flex items-center justify-center p-2 rounded-xl hover:bg-sky-100/50 dark:hover:bg-sky-900/30 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={isSellerAllowed}
                            onChange={() => handleToggleTabForRole('seller', row.id)}
                            className="w-5 h-5 rounded-md text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Reseller Checkbox Column */}
                      <td className="px-4 py-3.5 text-center bg-emerald-50/20 dark:bg-emerald-950/10">
                        <label className="inline-flex items-center justify-center p-2 rounded-xl hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={isResellerAllowed}
                            onChange={() => handleToggleTabForRole('reseller', row.id)}
                            className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Access Status */}
                      <td className="px-3 py-3.5 text-center">{statusBadge}</td>

                      {/* Quick Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleBothRoles(row.id, true)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold cursor-pointer"
                            title={isBn ? 'উভয় রোলে সক্রিয় করুন' : 'Enable for both roles'}
                          >
                            {isBn ? 'উভয় অন' : 'Both On'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleBothRoles(row.id, false)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 text-[10px] font-bold cursor-pointer"
                            title={isBn ? 'উভয় রোলে নিষ্ক্রিয় করুন' : 'Disable for both roles'}
                          >
                            {isBn ? 'উভয় অফ' : 'Both Off'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ROLE CARDS GRID VIEW */}
      {viewMode === 'cards' && (
        <div className="space-y-4">
          {/* Active Role Selector Switcher */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm">
            <button
              type="button"
              onClick={() => setActiveRole('seller')}
              className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeRole === 'seller'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>{isBn ? 'সেলার কার্ডস' : 'Seller Cards'} ({SELLER_DASHBOARD_TABS.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveRole('reseller')}
              className={`flex-1 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                activeRole === 'reseller'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>{isBn ? 'রিসেলার কার্ডস' : 'Reseller Cards'} ({RESELLER_DASHBOARD_TABS.length})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCardTabs.map((tab) => {
              const isAllowed = activeAllowedTabs.includes(tab.id);

              return (
                <div
                  key={tab.id}
                  onClick={() => handleToggleTabForRole(activeRole, tab.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isAllowed
                      ? activeRole === 'seller'
                        ? 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800 shadow-2xs'
                        : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={() => {}} // handled by parent onClick
                          className={`w-4 h-4 rounded-md cursor-pointer ${
                            activeRole === 'seller'
                              ? 'text-sky-600 focus:ring-sky-500'
                              : 'text-emerald-600 focus:ring-emerald-500'
                          }`}
                        />
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {tab.id}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isAllowed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {isAllowed ? (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>{isBn ? 'অন (দৃশ্যমান)' : 'Visible'}</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>{isBn ? 'অফ (লুকানো)' : 'Hidden'}</span>
                          </>
                        )}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      {isBn ? tab.labelBn : tab.label}
                    </h4>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {isBn ? tab.descriptionBn : tab.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="uppercase font-bold tracking-wider">
                      {isBn ? (GROUP_LABELS[tab.group]?.bn || tab.group) : (GROUP_LABELS[tab.group]?.en || tab.group)}
                    </span>
                    <span className="font-medium text-slate-500">
                      {isAllowed
                        ? (isBn ? 'ড্যাশবোর্ডে দৃশ্যমান' : 'Visible in Dashboard')
                        : (isBn ? 'ড্যাশবোর্ডে লুকানো' : 'Hidden in Dashboard')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Save Reminder Bar if changes are unsaved */}
      <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-600 p-4 rounded-3xl text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-black text-xs">
              {isBn
                ? 'লাইভ অ্যাক্টিভেশনের জন্য ফায়ারবেসে সেভ করুন'
                : 'Save updates to Firebase Firestore for instant live effect'}
            </p>
            <p className="text-[11px] text-white/80 mt-0.5">
              {isBn
                ? "চেকবক্স পরিবর্তন শেষ হলে 'Save to Firestore' বাটনে ক্লিক করুন। সাথে সাথে সেলার ও রিসেলার পোর্টালের সাইডবার ডাইনামিকালি পরিবর্তিত হবে।"
                : "After toggling permissions, click 'Save to Firestore'. Changes take effect instantly on seller and reseller dashboards."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveToFirebase}
          disabled={isSaving}
          className="px-6 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-black rounded-xl shadow-md transition-all cursor-pointer shrink-0 disabled:opacity-50"
        >
          {isSaving
            ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
            : (isBn ? 'ফায়ারস্টোরে সেভ করুন' : 'Save to Firestore Now')}
        </button>
      </div>
    </div>
  );
};

export default PermissionMatrix;
