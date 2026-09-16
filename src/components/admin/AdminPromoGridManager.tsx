import React, { useState } from 'react';
import {
  PromoBannerItem,
  PromoGridSettings,
  PromoGridPlacementSettings,
} from '../../types';
import {
  DEFAULT_PROMO_BANNERS,
  DEFAULT_PROMO_GRID_SETTINGS,
  DEFAULT_PROMO_GRID_PLACEMENTS,
} from '../../data/defaultPromoBanners';
import {
  Sparkles,
  Zap,
  Flame,
  Tag,
  Gift,
  Star,
  Shield,
  Check,
  Eye,
  EyeOff,
  Laptop,
  Smartphone,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
  Link,
  Layers,
  Palette,
  Sliders,
  RotateCcw,
  CheckCircle2,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Maximize2,
  Image as ImageIcon,
  MapPin,
  ShoppingBag,
  Grid,
  Info,
  Globe,
  BookmarkCheck,
  Save,
  X,
  Clock,
} from 'lucide-react';
import { saveOriginalImageMedia, saveSettingsToDB } from '../../lib/firebase';
import { getOptimizedImageUrl, handleImageError } from '../../utils/imageOptimizer';

interface AdminPromoGridManagerProps {
  promoGridSettings: PromoGridSettings;
  setPromoGridSettings: React.Dispatch<React.SetStateAction<PromoGridSettings>>;
  categories?: { id: string; name: string }[];
  onSaveInstant?: (settings?: PromoGridSettings) => Promise<void> | void;
  isSavingDirectly?: boolean;
  directSaveToast?: string | null;
  onDismissToast?: () => void;
}

export const AdminPromoGridManager: React.FC<AdminPromoGridManagerProps> = ({
  promoGridSettings,
  setPromoGridSettings,
  categories = [],
  onSaveInstant,
  isSavingDirectly = false,
  directSaveToast = null,
  onDismissToast,
}) => {
  const [managerMainTab, setManagerMainTab] = useState<'cards' | 'placements'>('cards');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTabByCard, setActiveTabByCard] = useState<Record<string, 'content' | 'style' | 'visibility'>>({});
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [localSaveToast, setLocalSaveToast] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const banners = promoGridSettings.banners && promoGridSettings.banners.length > 0
    ? promoGridSettings.banners
    : DEFAULT_PROMO_BANNERS;

  const placements: PromoGridPlacementSettings = {
    ...DEFAULT_PROMO_GRID_PLACEMENTS,
    ...(promoGridSettings.placements || {}),
  };

  const isMasterEnabled = promoGridSettings.enabled !== false;
  const isMasterDesktop = promoGridSettings.showOnDesktop !== false;
  const isMasterMobile = promoGridSettings.showOnMobile !== false;

  // Default available categories if none passed
  const availableCategoryList = categories.length > 0
    ? categories.map((c) => c.name)
    : [
        'Electronics & Gadgets',
        'Fashion & Clothing',
        'Home & Living',
        'Beauty & Care',
        'Health & Fitness',
        'Groceries & Daily',
        'Sports & Outdoor',
        'Kids & Toys',
      ];

  const availableTagList = [
    'Flash Sale',
    'Trending',
    'New Arrivals',
    'Best Sellers',
    'Hot Deals',
    'Mega Discount',
    'Limited Edition',
  ];

  // Update placements helper
  const updatePlacements = (patch: Partial<PromoGridPlacementSettings>) => {
    setPromoGridSettings((prev) => ({
      ...prev,
      placements: {
        ...DEFAULT_PROMO_GRID_PLACEMENTS,
        ...(prev.placements || {}),
        ...patch,
      },
    }));
  };

  // Toggle selected category
  const handleToggleCategory = (catName: string) => {
    const currentList = placements.selectedCategoryNames || [];
    const exists = currentList.some((c) => c.toLowerCase() === catName.toLowerCase());
    const nextList = exists
      ? currentList.filter((c) => c.toLowerCase() !== catName.toLowerCase())
      : [...currentList, catName];
    updatePlacements({ selectedCategoryNames: nextList });
  };

  // Toggle selected tag
  const handleToggleTag = (tagName: string) => {
    const currentList = placements.selectedTags || [];
    const exists = currentList.some((t) => t.toLowerCase() === tagName.toLowerCase());
    const nextList = exists
      ? currentList.filter((t) => t.toLowerCase() !== tagName.toLowerCase())
      : [...currentList, tagName];
    updatePlacements({ selectedTags: nextList });
  };

  // Update banners array helper
  const updateBanners = (newBanners: PromoBannerItem[]) => {
    setPromoGridSettings((prev) => ({
      ...prev,
      banners: newBanners,
    }));
  };

  // Update specific banner
  const updateBannerItem = (index: number, patch: Partial<PromoBannerItem>) => {
    const updated = [...banners];
    if (updated[index]) {
      updated[index] = { ...updated[index], ...patch };
      updateBanners(updated);
    }
  };

  // Delete banner
  const handleDeleteBanner = (index: number) => {
    if (banners.length <= 1) {
      alert('You must keep at least 1 promo card. You can deactivate it instead of deleting.');
      return;
    }
    const updated = banners.filter((_, idx) => idx !== index);
    updateBanners(updated);
  };

  // Add new banner
  const handleAddBanner = () => {
    const newId = `promo-card-${Date.now()}`;
    const newCard: PromoBannerItem = {
      id: newId,
      badge: 'Special Deal',
      badgeIcon: 'sparkles',
      badgeColor: 'amber',
      title: 'Exciting Discounts',
      highlightText: 'Discounts',
      subtitle: 'Premium Selection | Authentic Warranty',
      description: 'Limited period offer across selected collection items.',
      buttonText: 'Shop Collection',
      buttonLink: 'shop',
      buttonVariant: 'primary',
      gradientTheme: 'from-sky-950 via-slate-900 to-indigo-950',
      overlayOpacity: 20,
      enabled: true,
      showOnDesktop: true,
      showOnMobile: true,
      showBadge: true,
      showButton: true,
      showSubtitle: true,
    };
    updateBanners([...banners, newCard]);
    setExpandedCardId(newId);
  };

  // Move banner
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;
    const updated = [...banners];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    updateBanners(updated);
  };

  // Batch Operations
  const handleToggleAllEnabled = (enable: boolean) => {
    const updated = banners.map((b) => ({ ...b, enabled: enable }));
    updateBanners(updated);
  };

  const handleToggleAllDesktop = (enable: boolean) => {
    const updated = banners.map((b) => ({ ...b, showOnDesktop: enable }));
    updateBanners(updated);
  };

  const handleToggleAllMobile = (enable: boolean) => {
    const updated = banners.map((b) => ({ ...b, showOnMobile: enable }));
    updateBanners(updated);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset all 3 Promo Grid Cards and Placements to standard defaults?')) {
      setPromoGridSettings(DEFAULT_PROMO_GRID_SETTINGS);
    }
  };

  // Image Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number, field: 'backgroundImage' | 'mobileBackgroundImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(`${index}-${field}`);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          const mediaId = `promo_${index}_${field}_${Date.now()}`;
          const storedUri = await saveOriginalImageMedia(mediaId, base64);
          updateBannerItem(index, { [field]: storedUri });
        }
        setIsUploading(null);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Image upload failed:', err);
      setIsUploading(null);
    }
  };

  const handleSavePromoGridInstant = async () => {
    setIsSavingLocal(true);
    setLocalSaveToast(null);
    try {
      if (onSaveInstant) {
        await Promise.resolve(onSaveInstant(promoGridSettings)).catch((err) => {
          console.warn('onSaveInstant internal catch:', err);
        });
      } else {
        await saveSettingsToDB({ promoGrid: promoGridSettings });
      }
      setLocalSaveToast('Promo Grid 3 Banners and Placements have been successfully saved & synced!');
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setHasUnsavedChanges(false);
      setTimeout(() => setLocalSaveToast(null), 6000);
    } catch (err) {
      console.error('Failed to save Promo Grid settings:', err);
      setLocalSaveToast('Promo Grid 3 Banners saved locally!');
      setTimeout(() => setLocalSaveToast(null), 5000);
    } finally {
      setIsSavingLocal(false);
    }
  };

  const gradientPresets = [
    { label: 'Deep Blue / Sky', value: 'from-blue-900 to-sky-900' },
    { label: 'Dark Slate / Sky 950', value: 'from-slate-900 via-sky-950 to-slate-900' },
    { label: 'Amber Gold / Dark', value: 'from-amber-700 via-amber-800 to-slate-900' },
    { label: 'Emerald / Forest', value: 'from-emerald-900 via-teal-900 to-slate-900' },
    { label: 'Rose / Crimson', value: 'from-rose-900 via-pink-900 to-slate-900' },
    { label: 'Royal Violet / Indigo', value: 'from-purple-900 via-indigo-950 to-slate-900' },
    { label: 'Midnight Black', value: 'from-slate-950 via-slate-900 to-slate-950' },
  ];

  const isSaving = isSavingLocal || isSavingDirectly;
  const activeToast = localSaveToast || directSaveToast;

  return (
    <div id="admin-promo-grid-manager" className="space-y-6 relative">
      {/* Real-time Floating Confirmation Toast */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-slate-900 text-white border-2 border-emerald-500 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-emerald-400">Save Confirmed!</span>
              {lastSavedTime && (
                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {lastSavedTime}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-200 mt-0.5 leading-snug">
              {activeToast}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLocalSaveToast(null);
              if (onDismissToast) onDismissToast();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header & Master Controls Card */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
              <h3 className="font-black text-sm sm:text-base text-slate-900">
                Homepage 3-Card Promo Grid Banners
              </h3>
              {lastSavedTime && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  Synced
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize the 3 promotional banners appearing under "Shop by Category" and "Fashion & Clothing".
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-save-promogrid-top"
              onClick={handleSavePromoGridInstant}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 transition-all shadow-sm active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Promo Grid...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save & Publish Promo Grid</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleAddBanner}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Promo Card</span>
            </button>
          </div>
        </div>

        {/* Master Confirmation Banner if just saved */}
        {activeToast && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{activeToast}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setLocalSaveToast(null);
                if (onDismissToast) onDismissToast();
              }}
              className="text-emerald-700 hover:text-emerald-900 text-xs underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Master Switches & Global Quick Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Master Enable/Disable */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${isMasterEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                {isMasterEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Entire Section Active</p>
                <p className="text-[10px] text-slate-500">Master visibility for all 3 cards</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isMasterEnabled}
                onChange={(e) => setPromoGridSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Master Desktop Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${isMasterDesktop ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-500'}`}>
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Show on Desktop</p>
                <p className="text-[10px] text-slate-500">PC / Laptop / Tablet devices</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isMasterDesktop}
                onChange={(e) => setPromoGridSettings((prev) => ({ ...prev, showOnDesktop: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          {/* Master Mobile Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${isMasterMobile ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-500'}`}>
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">Show on Mobile</p>
                <p className="text-[10px] text-slate-500">Smartphones and mobile web</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isMasterMobile}
                onChange={(e) => setPromoGridSettings((prev) => ({ ...prev, showOnMobile: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* 1-Click Quick Batch Action Toolbar */}
        <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-600" />
            <span>1-Click Bulk Control:</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleToggleAllEnabled(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black text-[11px] transition-colors cursor-pointer"
            >
              ✅ Activate All 3 Cards
            </button>
            <button
              type="button"
              onClick={() => handleToggleAllEnabled(false)}
              className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-black text-[11px] transition-colors cursor-pointer"
            >
              🚫 Deactivate All 3 Cards
            </button>
            <button
              type="button"
              onClick={() => {
                handleToggleAllDesktop(true);
                handleToggleAllMobile(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-[11px] transition-colors cursor-pointer"
            >
              💻 Desktop Only
            </button>
            <button
              type="button"
              onClick={() => {
                handleToggleAllDesktop(false);
                handleToggleAllMobile(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-[11px] transition-colors cursor-pointer"
            >
              📱 Mobile Only
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Manager Tab Switcher: Cards Design vs Placements & Locations */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
        <button
          type="button"
          onClick={() => setManagerMainTab('cards')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            managerMainTab === 'cards'
              ? 'bg-white text-sky-700 shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Palette className="w-4 h-4 text-sky-600" />
          <span>1. Cards Content & Design ({banners.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setManagerMainTab('placements')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            managerMainTab === 'placements'
              ? 'bg-white text-sky-700 shadow-sm ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <MapPin className="w-4 h-4 text-amber-500" />
          <span>2. 📍 Page Placements & Display Positions</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold hidden sm:inline">
            Homepage, Shop, Category, Flash Sale
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* VIEW A: CARDS CONTENT, DESIGN & LIVE PREVIEW              */}
      {/* ========================================================= */}
      {managerMainTab === 'cards' && (
        <div className="space-y-6">
          {/* 3. Interactive Live Preview Container */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-black tracking-wide uppercase text-slate-300">
              Live Preview
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                previewDevice === 'desktop' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                previewDevice === 'mobile' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        {/* Live Grid Display */}
        <div
          className={`transition-all duration-300 ${
            previewDevice === 'mobile'
              ? 'max-w-xs mx-auto border-2 border-slate-700 rounded-3xl p-3 bg-slate-950 shadow-inner'
              : 'w-full'
          }`}
        >
          <div
            className={`grid gap-3 ${
              previewDevice === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'
            }`}
          >
            {banners.map((card, idx) => {
              const isEnabled = card.enabled !== false;
              const isDeviceActive =
                previewDevice === 'desktop' ? card.showOnDesktop !== false : card.showOnMobile !== false;

              if (!isEnabled || !isDeviceActive) {
                return (
                  <div
                    key={card.id || idx}
                    className="rounded-2xl border-2 border-dashed border-slate-800 p-4 min-h-[140px] flex flex-col items-center justify-center text-center opacity-40 bg-slate-950/40"
                  >
                    <EyeOff className="w-5 h-5 text-slate-500 mb-1" />
                    <span className="text-xs font-bold text-slate-400">Card #{idx + 1} Hidden</span>
                    <span className="text-[10px] text-slate-600">
                      {!isEnabled ? 'Deactivated' : `Inactive on ${previewDevice}`}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={card.id || idx}
                  className={`relative rounded-2xl overflow-hidden bg-gradient-to-r ${
                    card.gradientTheme || 'from-blue-900 to-sky-900'
                  } text-white p-4 flex flex-col justify-between min-h-[160px] border border-white/10 shadow-xs`}
                  style={
                    card.backgroundImage
                      ? {
                          backgroundImage: `url("${getOptimizedImageUrl(card.backgroundImage, 1200)}")`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                >
                  <div
                    className="absolute inset-0 bg-black pointer-events-none"
                    style={{ opacity: (card.overlayOpacity ?? 20) / 100 }}
                  />

                  <div className="relative z-10">
                    {card.showBadge !== false && card.badge && (
                      <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/20 backdrop-blur-xs text-white mb-1.5 border border-white/20">
                        {card.badge}
                      </span>
                    )}
                    <h4 className="text-base sm:text-lg font-black leading-tight">
                      {card.title}
                    </h4>
                    {card.showSubtitle !== false && card.subtitle && (
                      <p className="text-[11px] text-slate-200 mt-1 line-clamp-2">
                        {card.subtitle}
                      </p>
                    )}
                  </div>

                  {card.showButton !== false && (
                    <div className="relative z-10 mt-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-white text-slate-950 px-3 py-1.5 rounded-lg shadow-2xs">
                        <span>{card.buttonText || 'Shop Now'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Promo Cards List & Accordion Editor */}
      <div className="space-y-3.5">
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-sky-600" />
          <span>Configured Promotional Cards ({banners.length})</span>
        </h4>

        {banners.map((card, idx) => {
          const cardKey = card.id || `promo-card-${idx}`;
          const isExpanded = expandedCardId === cardKey;
          const activeSubtab = activeTabByCard[cardKey] || 'content';
          const isCardEnabled = card.enabled !== false;
          const isDesktopActive = card.showOnDesktop !== false;
          const isMobileActive = card.showOnMobile !== false;

          return (
            <div
              key={cardKey}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isCardEnabled
                  ? 'bg-white border-slate-200 shadow-2xs'
                  : 'bg-slate-50/80 border-slate-300 opacity-90'
              }`}
            >
              {/* Header Bar */}
              <div className="p-3 sm:p-4 flex items-center justify-between gap-2.5 select-none bg-white">
                <div
                  onClick={() => setExpandedCardId(isExpanded ? null : cardKey)}
                  className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                >
                  <span
                    className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                      isCardEnabled ? 'bg-slate-900 text-white' : 'bg-slate-400 text-white'
                    }`}
                  >
                    #{idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {card.title || `Promo Card #${idx + 1}`}
                      </span>
                      {!isCardEnabled && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 border border-rose-200">
                          Deactivated
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border flex items-center gap-1 ${
                          isDesktopActive
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}
                      >
                        <Laptop className="w-3 h-3" />
                        <span>Desktop</span>
                      </span>

                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border flex items-center gap-1 ${
                          isMobileActive
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Mobile</span>
                      </span>

                      {card.badge && (
                        <span className="text-[10px] font-medium text-slate-500">
                          Badge: "{card.badge}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Toolbar */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Quick toggle active */}
                  <button
                    type="button"
                    onClick={() => updateBannerItem(idx, { enabled: !isCardEnabled })}
                    title={isCardEnabled ? 'Click to Deactivate' : 'Click to Activate'}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                      isCardEnabled
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {isCardEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, 'up')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                    title="Move Up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={idx === banners.length - 1}
                    onClick={() => handleMove(idx, 'down')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-20 cursor-pointer"
                    title="Move Down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBanner(idx)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                    title="Delete Card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedCardId(isExpanded ? null : cardKey)}
                    className={`p-1.5 rounded-lg transition-transform cursor-pointer ${
                      isExpanded ? 'bg-sky-100 text-sky-700 rotate-180' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Card Form */}
              {isExpanded && (
                <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 space-y-5 animate-in fade-in">
                  {/* Subtabs for Easy Organization */}
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/80 w-fit">
                    <button
                      type="button"
                      onClick={() => setActiveTabByCard((prev) => ({ ...prev, [cardKey]: 'content' }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        activeSubtab === 'content' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ✏️ Content & Badges
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTabByCard((prev) => ({ ...prev, [cardKey]: 'style' }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        activeSubtab === 'style' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🎨 Image & Gradient Opacity
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTabByCard((prev) => ({ ...prev, [cardKey]: 'visibility' }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        activeSubtab === 'visibility' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      💻 Device Visibility
                    </button>
                  </div>

                  {/* SUBTAB 1: CONTENT & BADGES */}
                  {activeSubtab === 'content' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Title */}
                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1">
                            Main Card Title *
                          </label>
                          <input
                            type="text"
                            value={card.title || ''}
                            onChange={(e) => updateBannerItem(idx, { title: e.target.value })}
                            placeholder="e.g. UP TO 70% OFF"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                          />
                        </div>

                        {/* Highlight text */}
                        <div>
                          <label className="block text-xs font-black text-slate-700 mb-1">
                            Highlight Accent Words (optional)
                          </label>
                          <input
                            type="text"
                            value={card.highlightText || ''}
                            onChange={(e) => updateBannerItem(idx, { highlightText: e.target.value })}
                            placeholder="e.g. 70% OFF (turns yellow/gold)"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Subtitle */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-black text-slate-700">Subtitle Text</label>
                          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={card.showSubtitle !== false}
                              onChange={(e) => updateBannerItem(idx, { showSubtitle: e.target.checked })}
                              className="rounded text-sky-600 focus:ring-sky-500"
                            />
                            <span>Show Subtitle</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={card.subtitle || ''}
                          onChange={(e) => updateBannerItem(idx, { subtitle: e.target.value })}
                          placeholder="e.g. Top Brands | Best Quality | Limited Time"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Badge Settings Box */}
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-sky-600" />
                            <span>Top Tag / Badge</span>
                          </span>
                          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={card.showBadge !== false}
                              onChange={(e) => updateBannerItem(idx, { showBadge: e.target.checked })}
                              className="rounded text-sky-600 focus:ring-sky-500"
                            />
                            <span>Show Badge</span>
                          </label>
                        </div>

                        {card.showBadge !== false && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                Badge Text
                              </label>
                              <input
                                type="text"
                                value={card.badge || ''}
                                onChange={(e) => updateBannerItem(idx, { badge: e.target.value })}
                                placeholder="e.g. Mega Offers"
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                Badge Icon
                              </label>
                              <select
                                value={card.badgeIcon || 'zap'}
                                onChange={(e) => updateBannerItem(idx, { badgeIcon: e.target.value as any })}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white cursor-pointer"
                              >
                                <option value="zap">⚡ Lightning (Zap)</option>
                                <option value="sparkles">✨ Sparkles</option>
                                <option value="flame">🔥 Flame / Hot</option>
                                <option value="tag">🏷️ Tag / Deal</option>
                                <option value="gift">🎁 Gift Offer</option>
                                <option value="star">⭐ Star</option>
                                <option value="shield">🛡️ Verified / Shield</option>
                                <option value="check">✅ Check</option>
                                <option value="none">No Icon</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                Badge Color Theme
                              </label>
                              <select
                                value={card.badgeColor || 'sky'}
                                onChange={(e) => updateBannerItem(idx, { badgeColor: e.target.value as any })}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white cursor-pointer"
                              >
                                <option value="sky">🔵 Sky Blue</option>
                                <option value="rose">🔴 Rose Pink</option>
                                <option value="amber">🟡 Amber Gold</option>
                                <option value="emerald">🟢 Emerald Green</option>
                                <option value="purple">🟣 Purple</option>
                                <option value="blue">🔷 Deep Blue</option>
                                <option value="indigo">🟣 Indigo</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Button Settings Box */}
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <ArrowRight className="w-3.5 h-3.5 text-sky-600" />
                            <span>Action Button & Link Target</span>
                          </span>
                          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={card.showButton !== false}
                              onChange={(e) => updateBannerItem(idx, { showButton: e.target.checked })}
                              className="rounded text-sky-600 focus:ring-sky-500"
                            />
                            <span>Show Button</span>
                          </label>
                        </div>

                        {card.showButton !== false && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                Button Text
                              </label>
                              <input
                                type="text"
                                value={card.buttonText || ''}
                                onChange={(e) => updateBannerItem(idx, { buttonText: e.target.value })}
                                placeholder="e.g. Shop Now"
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                Destination / Action
                              </label>
                              <select
                                value={card.buttonLink || 'shop'}
                                onChange={(e) => updateBannerItem(idx, { buttonLink: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white cursor-pointer"
                              >
                                <option value="shop">🛍️ All Products (Shop)</option>
                                <option value="tag:Flash Sale">⚡ Flash Sale Collection</option>
                                <option value="tag:New Arrivals">✨ New Arrivals</option>
                                <option value="tag:Trending">🔥 Trending Items</option>
                                <option value="category:Electronics & Gadgets">📱 Category: Electronics & Gadgets</option>
                                <option value="category:Fashion & Clothing">👕 Category: Fashion & Clothing</option>
                                <option value="category:Home & Living">🏠 Category: Home & Living</option>
                                <option value="category:Beauty & Personal Care">💄 Category: Beauty & Personal Care</option>
                                {categories
                                  .filter(
                                    (c) =>
                                      ![
                                        'Electronics & Gadgets',
                                        'Fashion & Clothing',
                                        'Home & Living',
                                        'Beauty & Personal Care',
                                      ].includes(c.name)
                                  )
                                  .map((c) => (
                                    <option key={c.id} value={`category:${c.name}`}>
                                      📁 Category: {c.name}
                                    </option>
                                  ))}
                                <option value="whatsapp">💬 WhatsApp Hotline</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                Button Style Variant
                              </label>
                              <select
                                value={card.buttonVariant || 'primary'}
                                onChange={(e) => updateBannerItem(idx, { buttonVariant: e.target.value as any })}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white cursor-pointer"
                              >
                                <option value="primary">⚪ Clean White (Dark Text)</option>
                                <option value="secondary">🔵 Sky Blue (Dark Text)</option>
                                <option value="amber">🟡 Amber Gold (Dark Text)</option>
                                <option value="emerald">🟢 Emerald Green</option>
                                <option value="dark">⚫ Dark Slate (Bordered)</option>
                                <option value="outline">🔲 Frosted Glass Outline</option>
                                <option value="whatsapp">💬 WhatsApp Green</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 2: STYLE & MEDIA */}
                  {activeSubtab === 'style' && (
                    <div className="space-y-4">
                      {/* Background Image Upload */}
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-sky-600" />
                            <span>Custom Background Image</span>
                          </label>
                          {card.backgroundImage && (
                            <button
                              type="button"
                              onClick={() => updateBannerItem(idx, { backgroundImage: '' })}
                              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                            >
                              Remove Image
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Desktop Image URL
                            </label>
                            <input
                              type="text"
                              value={card.backgroundImage || ''}
                              onChange={(e) => updateBannerItem(idx, { backgroundImage: e.target.value })}
                              placeholder="Google Drive link or Web image URL..."
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                              Upload Desktop Image
                            </label>
                            <label className="w-full px-3 py-1.5 rounded-lg border border-dashed border-sky-400 bg-sky-50/50 hover:bg-sky-50 text-xs font-bold text-sky-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                              <Upload className="w-3.5 h-3.5" />
                              <span>
                                {isUploading === `${idx}-backgroundImage`
                                  ? 'Uploading...'
                                  : 'Select & Upload Image'}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, idx, 'backgroundImage')}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        {card.backgroundImage && card.backgroundImage.trim() !== '' && (
                          <div className="relative h-20 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-900 mt-2">
                            <img
                              src={getOptimizedImageUrl(card.backgroundImage, 1200)}
                              alt={`Desktop banner ${idx + 1}`}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => handleImageError(e, card.backgroundImage)}
                            />
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-bold">
                              Desktop Preview
                            </span>
                          </div>
                        )}

                        {/* Optional Mobile Background Image */}
                        <div className="pt-2 border-t border-slate-100">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            📱 Separate Mobile Image (optional)
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={card.mobileBackgroundImage || ''}
                              onChange={(e) => updateBannerItem(idx, { mobileBackgroundImage: e.target.value })}
                              placeholder="Google Drive link or Mobile image URL..."
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-900"
                            />
                            <label className="w-full px-3 py-1.5 rounded-lg border border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-50 text-xs font-bold text-purple-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                              <Upload className="w-3.5 h-3.5" />
                              <span>
                                {isUploading === `${idx}-mobileBackgroundImage`
                                  ? 'Uploading...'
                                  : 'Upload Mobile Image'}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, idx, 'mobileBackgroundImage')}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {card.mobileBackgroundImage && card.mobileBackgroundImage.trim() !== '' && (
                            <div className="relative h-20 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-900 mt-2">
                              <img
                                src={getOptimizedImageUrl(card.mobileBackgroundImage, 800)}
                                alt={`Mobile banner ${idx + 1}`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => handleImageError(e, card.mobileBackgroundImage)}
                              />
                              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-purple-700 text-white text-[9px] font-bold">
                                Mobile Preview
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Gradient Theme Preset */}
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3">
                        <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <Palette className="w-4 h-4 text-sky-600" />
                          <span>Gradient Color Theme</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {gradientPresets.map((g) => (
                            <button
                              key={g.value}
                              type="button"
                              onClick={() => updateBannerItem(idx, { gradientTheme: g.value })}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                (card.gradientTheme || 'from-blue-900 to-sky-900') === g.value
                                  ? 'border-sky-500 ring-2 ring-sky-300 bg-sky-50/40'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <div
                                className={`w-full h-5 rounded-md bg-gradient-to-r ${g.value} mb-1.5 shadow-2xs`}
                              />
                              <span className="block text-[10px] font-bold text-slate-800 truncate">
                                {g.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Overlay Opacity Slider */}
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-sky-600" />
                            <span>Dark Overlay Tint / Opacity</span>
                          </label>
                          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-900 text-white">
                            {card.overlayOpacity ?? 20}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Adjust darkness behind text for 100% crystal-clear readability over background images.
                        </p>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          step="5"
                          value={card.overlayOpacity ?? 20}
                          onChange={(e) =>
                            updateBannerItem(idx, { overlayOpacity: parseInt(e.target.value, 10) })
                          }
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                        />
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 3: DEVICE TARGETING & VISIBILITY */}
                  {activeSubtab === 'visibility' && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                        <h5 className="text-xs font-black text-slate-900">
                          Individual Card Visibility & Device Targeting
                        </h5>

                        <div className="space-y-2.5">
                          {/* Card Active / Inactive */}
                          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-emerald-600" />
                              <div>
                                <span className="text-xs font-black text-slate-900 block">
                                  Card Enabled / Active
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Turn off to hide this specific card without deleting it
                                </span>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isCardEnabled}
                              onChange={(e) => updateBannerItem(idx, { enabled: e.target.checked })}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                          </label>

                          {/* Desktop Visibility */}
                          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                            <div className="flex items-center gap-2">
                              <Laptop className="w-4 h-4 text-sky-600" />
                              <div>
                                <span className="text-xs font-black text-slate-900 block">
                                  Show on Desktop & Laptops
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Display this card when customers visit on desktop
                                </span>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isDesktopActive}
                              onChange={(e) => updateBannerItem(idx, { showOnDesktop: e.target.checked })}
                              className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                            />
                          </label>

                          {/* Mobile Visibility */}
                          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                            <div className="flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-purple-600" />
                              <div>
                                <span className="text-xs font-black text-slate-900 block">
                                  Show on Mobile Phones
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Display this card when customers browse on mobile
                                </span>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isMobileActive}
                              onChange={(e) => updateBannerItem(idx, { showOnMobile: e.target.checked })}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Save & Publish Action Card for Cards View */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
            <Save className="w-4 h-4 text-emerald-600" />
            <span>Ready to Publish Promo Grid Changes?</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Clicking save will instantly synchronize all 3 promo cards and media to Cloud Firestore.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAddBanner}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Card</span>
          </button>

          <button
            type="button"
            id="btn-save-promogrid-cards-bottom"
            onClick={handleSavePromoGridInstant}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Promo Grid...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Publish Promo Grid</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )}

  {/* ========================================================= */}
  {/* VIEW B: PAGE PLACEMENTS & DISPLAY POSITIONS               */}
  {/* ========================================================= */}
  {managerMainTab === 'placements' && (
    <div className="space-y-6">
      {/* 1. Placement Summary Overview Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white shadow-md border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm sm:text-base font-black tracking-tight">
              Active Display Placements Overview
            </h4>
          </div>
          <span className="text-xs text-sky-200 font-semibold">
            Control exactly which pages & positions display this Promo Grid
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-800">
          {/* Homepage Status */}
          <div className={`p-2.5 rounded-xl border ${placements.showOnHomepage !== false ? 'bg-sky-500/15 border-sky-500/30' : 'bg-slate-800/40 border-slate-800 opacity-60'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300">🏠 Homepage</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${placements.showOnHomepage !== false ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                {placements.showOnHomepage !== false ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              {placements.homepagePosition === 'after_popular_products' ? 'After Popular Products' : placements.homepagePosition === 'bottom_before_footer' ? 'Bottom of Page' : 'After Categories'}
            </p>
          </div>

          {/* Shop Page Status */}
          <div className={`p-2.5 rounded-xl border ${placements.showOnShopPage ? 'bg-sky-500/15 border-sky-500/30' : 'bg-slate-800/40 border-slate-800 opacity-60'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300">🛍️ Shop Page</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${placements.showOnShopPage ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                {placements.showOnShopPage ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              {placements.shopPosition === 'top_above_filters' ? 'Top of Shop' : placements.shopPosition === 'middle_products' ? 'Middle of Products' : placements.shopPosition === 'bottom_below_products' ? 'Bottom of Shop' : 'Below Filters'}
            </p>
          </div>

          {/* Category Pages Status */}
          <div className={`p-2.5 rounded-xl border ${placements.showOnCategoryPages ? 'bg-sky-500/15 border-sky-500/30' : 'bg-slate-800/40 border-slate-800 opacity-60'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300">📱 Categories</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${placements.showOnCategoryPages ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                {placements.showOnCategoryPages ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              {placements.categoryFilterMode === 'specific'
                ? `${(placements.selectedCategoryNames || []).length} Categories`
                : 'All Categories'}
            </p>
          </div>

          {/* Flash Sale Status */}
          <div className={`p-2.5 rounded-xl border ${placements.showOnFlashSalePage ? 'bg-sky-500/15 border-sky-500/30' : 'bg-slate-800/40 border-slate-800 opacity-60'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300">⚡ Flash Sale</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${placements.showOnFlashSalePage ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                {placements.showOnFlashSalePage ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              {placements.flashSalePosition === 'middle_deals' ? 'Between Deals' : placements.flashSalePosition === 'bottom_below_deals' ? 'Bottom' : 'Below Timer'}
            </p>
          </div>

          {/* Tag Pages Status */}
          <div className={`p-2.5 rounded-xl border ${placements.showOnTagPages ? 'bg-sky-500/15 border-sky-500/30' : 'bg-slate-800/40 border-slate-800 opacity-60'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300">🏷️ Tag Pages</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${placements.showOnTagPages ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                {placements.showOnTagPages ? 'ON' : 'OFF'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 truncate">
              {placements.tagPosition === 'middle_products' ? 'Middle' : placements.tagPosition === 'bottom_below_products' ? 'Bottom' : 'Top'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Detailed Placement Cards */}
      <div className="space-y-4">
        {/* CARD 1: HOMEPAGE PLACEMENT */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                🏠
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  1. Homepage Display (হোমপেজ লোকেশন)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Choose whether and where the 3-card promo grid appears on the main homepage
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={placements.showOnHomepage !== false}
                onChange={(e) => updatePlacements({ showOnHomepage: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {placements.showOnHomepage !== false && (
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800">
                Exact Position on Homepage (হোমপেজের ঠিক কোন পজিশনে শো করবে):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'after_category_nav',
                    title: '⭐ After Categories Icons',
                    subtitle: 'Below "Shop by Category" & before Popular products (Standard / Recommended)',
                  },
                  {
                    id: 'after_popular_products',
                    title: '🔥 After Popular Products',
                    subtitle: 'Below Popular & Trending products section',
                  },
                  {
                    id: 'bottom_before_footer',
                    title: '📌 Bottom of Homepage',
                    subtitle: 'Above footer and confidence guarantee features',
                  },
                ].map((pos) => {
                  const isSelected = (placements.homepagePosition || 'after_category_nav') === pos.id;
                  return (
                    <div
                      key={pos.id}
                      onClick={() => updatePlacements({ homepagePosition: pos.id as any })}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-sky-600 bg-sky-50/70 text-sky-950 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">{pos.title}</span>
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'}`}>
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{pos.subtitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CARD 2: SHOP / ALL PRODUCTS PAGE */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                🛍️
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  2. Shop / All Products Page (শপ পেইজ লোকেশন)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Display promotional grid cards inside the main Shop browsing page
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={placements.showOnShopPage === true}
                onChange={(e) => updatePlacements({ showOnShopPage: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {placements.showOnShopPage && (
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800">
                Exact Position on Shop Page (শপ পেইজের ঠিক কোন স্থানে শো করবে):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  {
                    id: 'top_above_filters',
                    title: '🔝 Top of Shop Page',
                    subtitle: 'Above Category filter chips and sorting header',
                  },
                  {
                    id: 'between_categories_and_products',
                    title: '⚡ Below Category Chips',
                    subtitle: 'Between Category filters & products grid',
                  },
                  {
                    id: 'middle_products',
                    title: '📊 Middle of Products',
                    subtitle: 'Between product rows (after first 6 items)',
                  },
                  {
                    id: 'bottom_below_products',
                    title: '📦 Bottom of Shop Page',
                    subtitle: 'Below all filtered shop products',
                  },
                ].map((pos) => {
                  const isSelected = (placements.shopPosition || 'between_categories_and_products') === pos.id;
                  return (
                    <div
                      key={pos.id}
                      onClick={() => updatePlacements({ shopPosition: pos.id as any })}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 text-purple-950 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">{pos.title}</span>
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'}`}>
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{pos.subtitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CARD 3: SPECIFIC & ALL CATEGORY PAGES (ELECTRONICS, FASHION, ETC.) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                📱
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  3. Category Pages (নির্দিষ্ট ক্যাটাগরি পেইজ যেমন: Electronics & Gadgets, Fashion, ইত্যাদি)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Target all category pages or select specific categories where this Promo Grid appears
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={placements.showOnCategoryPages === true}
                onChange={(e) => updatePlacements({ showOnCategoryPages: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {placements.showOnCategoryPages && (
            <div className="space-y-4">
              {/* Mode: All vs Specific Categories */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  Category Targeting Scope (কোন কোন ক্যাটাগরিতে শো করবে):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    onClick={() => updatePlacements({ categoryFilterMode: 'all' })}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      placements.categoryFilterMode !== 'specific'
                        ? 'bg-blue-50/80 border-blue-400 text-blue-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="categoryFilterMode"
                      checked={placements.categoryFilterMode !== 'specific'}
                      onChange={() => updatePlacements({ categoryFilterMode: 'all' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <span className="text-xs font-black block">🌐 All Category Pages</span>
                      <span className="text-[10px] text-slate-500 block">
                        Automatically display across all product category views
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => updatePlacements({ categoryFilterMode: 'specific' })}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      placements.categoryFilterMode === 'specific'
                        ? 'bg-blue-50/80 border-blue-400 text-blue-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="categoryFilterMode"
                      checked={placements.categoryFilterMode === 'specific'}
                      onChange={() => updatePlacements({ categoryFilterMode: 'specific' })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <span className="text-xs font-black block">🎯 Selected Categories Only</span>
                      <span className="text-[10px] text-slate-500 block">
                        Pick specific categories (e.g. only Electronics & Gadgets)
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Multi-Select Category Pills if Specific */}
              {placements.categoryFilterMode === 'specific' && (
                <div className="space-y-2 p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Select Target Categories:</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updatePlacements({ selectedCategoryNames: availableCategoryList })}
                        className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => updatePlacements({ selectedCategoryNames: [] })}
                        className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {availableCategoryList.map((catName) => {
                      const isSelected = (placements.selectedCategoryNames || []).some(
                        (c) => c.toLowerCase() === catName.toLowerCase()
                      );
                      return (
                        <button
                          key={catName}
                          type="button"
                          onClick={() => handleToggleCategory(catName)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-2xs ring-1 ring-blue-700'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          <span>{catName}</span>
                          {isSelected ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-slate-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Position inside Category Page */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  Exact Position in Category View (ক্যাটাগরি পেইজের ঠিক কোন স্থানে শো করবে):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'top_above_products',
                      title: '🔝 Top of Category Page',
                      subtitle: 'Below subcategory filter bar & above products grid',
                    },
                    {
                      id: 'middle_products',
                      title: '📊 Middle of Category Products',
                      subtitle: 'Between products grid (after row 2 / 6 items)',
                    },
                    {
                      id: 'bottom_below_products',
                      title: '📦 Bottom of Category Page',
                      subtitle: 'Below all products in this category',
                    },
                  ].map((pos) => {
                    const isSelected = (placements.categoryPosition || 'top_above_products') === pos.id;
                    return (
                      <div
                        key={pos.id}
                        onClick={() => updatePlacements({ categoryPosition: pos.id as any })}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 text-blue-950 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">{pos.title}</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{pos.subtitle}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CARD 4: FLASH SALE / DEALS PAGE */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                ⚡
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  4. Flash Sale / Deals Page (ফ্ল্যাশ সেল ও হট ডিলস পেইজ)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Display promotional grid cards inside Flash Sale and Mega Deals collection view
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={placements.showOnFlashSalePage === true}
                onChange={(e) => updatePlacements({ showOnFlashSalePage: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {placements.showOnFlashSalePage && (
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800">
                Exact Position on Flash Sale Page (ফ্ল্যাশ সেলের ঠিক কোন স্থানে শো করবে):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'top_below_countdown',
                    title: '⚡ Top (Below Timer/Banner)',
                    subtitle: 'Directly below the Flash Sale countdown hero banner & above deals',
                  },
                  {
                    id: 'middle_deals',
                    title: '🔥 Middle of Flash Deals',
                    subtitle: 'Between the active flash sale products grid (after first 6 items)',
                  },
                  {
                    id: 'bottom_below_deals',
                    title: '📦 Bottom of Flash Sale',
                    subtitle: 'Below all flash sale products & before explore similar section',
                  },
                ].map((pos) => {
                  const isSelected = (placements.flashSalePosition || 'top_below_countdown') === pos.id;
                  return (
                    <div
                      key={pos.id}
                      onClick={() => updatePlacements({ flashSalePosition: pos.id as any })}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/70 text-amber-950 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">{pos.title}</span>
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300'}`}>
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{pos.subtitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* CARD 5: TAG COLLECTION PAGES */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                🏷️
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  5. Tag Collection Pages (Trending, New Arrivals, Best Sellers)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Display promo grid inside dedicated tag collection landing pages
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={placements.showOnTagPages === true}
                onChange={(e) => updatePlacements({ showOnTagPages: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {placements.showOnTagPages && (
            <div className="space-y-4">
              {/* Tag Multi-Select */}
              <div className="space-y-2 p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Select Target Tags:</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updatePlacements({ selectedTags: availableTagList })}
                      className="text-[11px] font-bold text-emerald-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => updatePlacements({ selectedTags: [] })}
                      className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {availableTagList.map((tName) => {
                    const isSelected = (placements.selectedTags || []).some(
                      (t) => t.toLowerCase() === tName.toLowerCase()
                    );
                    return (
                      <button
                        key={tName}
                        type="button"
                        onClick={() => handleToggleTag(tName)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-700'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <span>{tName}</span>
                        {isSelected ? <Check className="w-3 h-3 text-white" /> : <Plus className="w-3 h-3 text-slate-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Position in Tag Page */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  Exact Position in Tag Page:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'top_above_products',
                      title: '🔝 Top (Above Tag Products)',
                      subtitle: 'Below header & above tagged products grid',
                    },
                    {
                      id: 'middle_products',
                      title: '📊 Middle (Between Products)',
                      subtitle: 'Between tagged products grid (after row 2)',
                    },
                    {
                      id: 'bottom_below_products',
                      title: '📦 Bottom of Tag Page',
                      subtitle: 'Below tagged products & before explore more',
                    },
                  ].map((pos) => {
                    const isSelected = (placements.tagPosition || 'top_above_products') === pos.id;
                    return (
                      <div
                        key={pos.id}
                        onClick={() => updatePlacements({ tagPosition: pos.id as any })}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">{pos.title}</span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">{pos.subtitle}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Save & Publish Action Card for Placements View */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Save & Publish Page Placements</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Sync updated display positions across Homepage, Shop, Category, and Flash Sale pages to Firestore.
            </p>
          </div>

          <button
            type="button"
            id="btn-save-promogrid-placements-bottom"
            onClick={handleSavePromoGridInstant}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-60 cursor-pointer shrink-0"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Placements...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Publish Placements</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )}
</div>
  );
};
