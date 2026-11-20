import React, { useState, useEffect, useMemo } from 'react';
import {
  SaasDonutChart,
  SaasBarChart,
  CollapsibleAnalyticsPanel,
  SAAS_CHART_COLORS,
} from './charts/AdminCharts';
import {
  Gift,
  Sparkles,
  Save,
  CheckCircle,
  Eye,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Tag,
  Flame,
  Clock,
  Smartphone,
  Monitor,
  ArrowRight,
  ExternalLink,
  Layers,
  X,
  Check,
  RotateCcw,
  Zap,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Percent,
  Truck,
  Phone,
  MessageCircle,
  MoveUp,
  MoveDown,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  OfferPopupSettings,
  DEFAULT_OFFER_POPUP_SETTINGS,
  DEFAULT_OFFER_SLIDES,
  OfferSlideItem,
  OfferHighlightType,
  SiteSettings,
  Category,
  Product,
} from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';
import { saveOfferPopupSettingsToDB } from '../../lib/firebase';

interface AdminOfferPopupManagerProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: Partial<SiteSettings>) => Promise<void> | void;
  categories?: Category[];
  products?: Product[];
}

const PRESET_SAMPLE_IMAGES = [
  {
    name: 'Smart Gadgets & Audio',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Smart Watch Flash Sale',
    url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Wireless Tech & Gaming',
    url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Mega E-commerce Deals',
    url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
  },
];

export const AdminOfferPopupManager: React.FC<AdminOfferPopupManagerProps> = ({
  settings,
  onUpdateSettings,
  categories = [],
  products = [],
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const initialConfig: OfferPopupSettings = {
    ...DEFAULT_OFFER_POPUP_SETTINGS,
    ...(settings?.offerPopup || {}),
  };

  const initialSlides: OfferSlideItem[] =
    settings?.offerPopup?.slides && settings.offerPopup.slides.length > 0
      ? settings.offerPopup.slides
      : DEFAULT_OFFER_SLIDES;

  const [popupState, setPopupState] = useState<OfferPopupSettings>({
    ...initialConfig,
    slides: initialSlides,
  });

  const [slides, setSlides] = useState<OfferSlideItem[]>(initialSlides);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingSingleSlide, setIsSavingSingleSlide] = useState(false);
  const [singleSlideSaveToast, setSingleSlideSaveToast] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activeLangTab, setActiveLangTab] = useState<'bn' | 'en'>('bn');
  const [copiedPreviewCoupon, setCopiedPreviewCoupon] = useState(false);

  useEffect(() => {
    if (settings?.offerPopup) {
      const sList =
        settings.offerPopup.slides && settings.offerPopup.slides.length > 0
          ? settings.offerPopup.slides
          : DEFAULT_OFFER_SLIDES;

      setPopupState({
        ...DEFAULT_OFFER_POPUP_SETTINGS,
        ...settings.offerPopup,
        slides: sList,
      });
      setSlides(sList);
    }
  }, [settings?.offerPopup]);

  const currentSlide = slides[selectedSlideIndex] || slides[0] || DEFAULT_OFFER_SLIDES[0];

  const offerChartData = useMemo(() => {
    const enabledCount = slides.filter((s) => s.enabled).length;
    const pausedCount = Math.max(0, slides.length - enabledCount);

    const statusSlices = [
      {
        id: 'enabled',
        label: isBn ? 'সক্রিয় স্লাইড' : 'Active Slides',
        value: enabledCount,
        color: '#059669',
      },
      {
        id: 'paused',
        label: isBn ? 'বন্ধ স্লাইড' : 'Paused Slides',
        value: pausedCount,
        color: '#64748B',
      },
    ];

    const actionLabels: Record<string, string> = {
      shop: isBn ? 'শপ পেজ' : 'Shop All',
      product: isBn ? 'পণ্য লিংক' : 'Product',
      category: isBn ? 'ক্যাটাগরি' : 'Category',
      coupon: isBn ? 'কুপন কপি' : 'Coupon',
      external: isBn ? 'বাহ্যিক লিংক' : 'External',
    };

    const actionCounts: Record<string, number> = {};
    slides.forEach((s) => {
      const key = s.actionType || 'shop';
      actionCounts[key] = (actionCounts[key] || 0) + 1;
    });

    const actionBars = Object.entries(actionCounts).map(([key, count], idx) => ({
      id: key,
      label: actionLabels[key] || key,
      value: count,
      color: SAAS_CHART_COLORS[idx % SAAS_CHART_COLORS.length],
    }));

    return { statusSlices, actionBars };
  }, [slides, isBn]);

  const handleUpdateCurrentSlide = (updates: Partial<OfferSlideItem>) => {
    setSlides((prev) => {
      const copy = [...prev];
      if (copy[selectedSlideIndex]) {
        copy[selectedSlideIndex] = { ...copy[selectedSlideIndex], ...updates };
      }
      return copy;
    });
  };

  const handleFastSaveSingleSlide = async () => {
    setIsSavingSingleSlide(true);
    try {
      const firstActive = slides.find((s) => s.enabled) || slides[0];
      const updatedPayload: OfferPopupSettings = {
        ...popupState,
        slides,
        badgeText: firstActive?.badgeText,
        badgeTextEn: firstActive?.badgeTextEn,
        title: firstActive?.title,
        titleEn: firstActive?.titleEn,
        subtitle: firstActive?.subtitle,
        subtitleEn: firstActive?.subtitleEn,
        imageUrl: firstActive?.imageUrl,
        couponCode: firstActive?.couponCode,
        couponDiscountText: firstActive?.couponDiscountText,
        couponDiscountTextEn: firstActive?.couponDiscountTextEn,
        buttonText: firstActive?.buttonText,
        buttonTextEn: firstActive?.buttonTextEn,
        actionType: firstActive?.actionType,
        actionTarget: firstActive?.actionTarget,
        updatedAt: new Date().toISOString(),
      };

      // 1. Optimistic instant save into localStorage & cache
      try {
        const cached = localStorage.getItem('kenax_settings_cache') || localStorage.getItem('kenax_site_settings') || '{}';
        const parsed = JSON.parse(cached);
        parsed.offerPopup = updatedPayload;
        localStorage.setItem('kenax_settings_cache', JSON.stringify(parsed));
        localStorage.setItem('kenax_site_settings', JSON.stringify(parsed));
        window.dispatchEvent(new CustomEvent('kenax_settings_updated', { detail: parsed }));
      } catch {}

      // 2. Trigger parent update & background Firebase save
      if (onUpdateSettings) {
        onUpdateSettings({ offerPopup: updatedPayload });
      }
      saveOfferPopupSettingsToDB(updatedPayload).catch(() => {});

      setSingleSlideSaveToast(
        isBn
          ? `স্লাইড #${selectedSlideIndex + 1} সফলভাবে সেভ হয়েছে!`
          : `Slide #${selectedSlideIndex + 1} saved successfully!`
      );
      setTimeout(() => setSingleSlideSaveToast(null), 3000);
    } catch (err) {
      console.error('Failed to quick save slide:', err);
    } finally {
      setIsSavingSingleSlide(false);
    }
  };

  const handleAddSlide = () => {
    const newSlideNum = slides.length + 1;
    const newSlide: OfferSlideItem = {
      id: `slide_${Date.now()}`,
      enabled: true,
      badgeText: `🔥 স্পেশাল অফার ${newSlideNum}`,
      badgeTextEn: `🔥 SPECIAL OFFER ${newSlideNum}`,
      title: `নতুন আকর্ষণীয় অফার ও ক্যাম্পেইন #${newSlideNum}`,
      titleEn: `Exclusive Special Deal #${newSlideNum}`,
      subtitle: 'আমাদের যেকোনো ট্রেন্ডি স্মার্ট গ্যাজেট অর্ডারে পান আকর্ষণীয় ডিসকাউন্ট।',
      subtitleEn: 'Enjoy massive instant discounts on our curated collection of electronics.',
      imageUrl: PRESET_SAMPLE_IMAGES[(newSlideNum - 1) % PRESET_SAMPLE_IMAGES.length].url,
      highlightType: 'coupon',
      couponCode: `DEAL${newSlideNum * 10}`,
      couponDiscountText: `${newSlideNum * 10}% পর্যন্ত ছাড়`,
      couponDiscountTextEn: `Up to ${newSlideNum * 10}% OFF`,
      buttonText: '🛍️ এখনই অফারটি নিন',
      buttonTextEn: '🛍️ Claim Offer Now',
      actionType: 'shop',
      actionTarget: '',
    };

    setSlides((prev) => [...prev, newSlide]);
    setSelectedSlideIndex(slides.length);
  };

  const handleDeleteSlide = (indexToDelete: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (slides.length <= 1) {
      alert(isBn ? 'কমপক্ষে একটি অফার স্লাইড থাকতে হবে।' : 'At least one offer slide must be present.');
      return;
    }
    const updated = slides.filter((_, idx) => idx !== indexToDelete);
    setSlides(updated);
    setSelectedSlideIndex(Math.max(0, indexToDelete - 1));
  };

  const handleToggleSlideEnabled = (indexToToggle: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSlides((prev) =>
      prev.map((s, idx) => (idx === indexToToggle ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slides.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const copy = [...slides];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    setSlides(copy);
    setSelectedSlideIndex(targetIndex);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        handleUpdateCurrentSlide({ imageUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const firstActive = slides.find((s) => s.enabled) || slides[0];
      const updatedPayload: OfferPopupSettings = {
        ...popupState,
        slides,
        // Sync top level legacy fields with first slide for backward compatibility
        badgeText: firstActive.badgeText,
        badgeTextEn: firstActive.badgeTextEn,
        title: firstActive.title,
        titleEn: firstActive.titleEn,
        subtitle: firstActive.subtitle,
        subtitleEn: firstActive.subtitleEn,
        imageUrl: firstActive.imageUrl,
        couponCode: firstActive.couponCode,
        couponDiscountText: firstActive.couponDiscountText,
        couponDiscountTextEn: firstActive.couponDiscountTextEn,
        buttonText: firstActive.buttonText,
        buttonTextEn: firstActive.buttonTextEn,
        actionType: firstActive.actionType,
        actionTarget: firstActive.actionTarget,
        updatedAt: new Date().toISOString(),
      };

      await onUpdateSettings({
        offerPopup: updatedPayload,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save Offer Popup settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        isBn
          ? 'আপনি কি ডিফল্ট অফার পপআপ সেটিংসে ফিরে যেতে চান?'
          : 'Reset to default multi-slide offer popup settings?'
      )
    ) {
      setPopupState(DEFAULT_OFFER_POPUP_SETTINGS);
      setSlides(DEFAULT_OFFER_SLIDES);
      setSelectedSlideIndex(0);
    }
  };

  const activeBadge =
    activeLangTab === 'bn'
      ? currentSlide.badgeText || currentSlide.badgeTextEn
      : currentSlide.badgeTextEn || currentSlide.badgeText;
  const activeTitle =
    activeLangTab === 'bn'
      ? currentSlide.title || currentSlide.titleEn
      : currentSlide.titleEn || currentSlide.title;
  const activeSubtitle =
    activeLangTab === 'bn'
      ? currentSlide.subtitle || currentSlide.subtitleEn
      : currentSlide.subtitleEn || currentSlide.subtitle;
  const activeButtonText =
    activeLangTab === 'bn'
      ? currentSlide.buttonText || currentSlide.buttonTextEn
      : currentSlide.buttonTextEn || currentSlide.buttonText;
  const activeDiscountText =
    activeLangTab === 'bn'
      ? currentSlide.couponDiscountText || currentSlide.couponDiscountTextEn
      : currentSlide.couponDiscountTextEn || currentSlide.couponDiscountText;
  const activeHighlightTitle =
    activeLangTab === 'bn'
      ? currentSlide.customHighlightTitle || currentSlide.customHighlightTitleEn
      : currentSlide.customHighlightTitleEn || currentSlide.customHighlightTitle;
  const activeHighlightSubtitle =
    activeLangTab === 'bn'
      ? currentSlide.customHighlightSubtitle || currentSlide.customHighlightSubtitleEn
      : currentSlide.customHighlightSubtitleEn || currentSlide.customHighlightSubtitle;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            <span>{isBn ? 'গেট অফারস ও মাল্টি-স্লাইড পপআপ ম্যানেজার' : 'Get Offers & Multi-Slide Popup'}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isBn
              ? 'একাধিক আকর্ষণীয় অফার স্লাইড, লাইভ কাউন্টডাউন, ডিসকাউন্ট ভাউচার ও ক্যাম্পেইন যুক্ত করুন।'
              : 'Manage multiple rotating offer slides, live flash countdowns, coupon codes, and direct checkout routes.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isBn ? 'ডিফল্ট রিসেট' : 'Reset Default'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isBn ? 'সেভ ও প্রকাশ করুন' : 'Save & Publish'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-2xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{isBn ? 'সকল অফার স্লাইড ও সেটিংস সফলভাবে আপডেট করা হয়েছে!' : 'Offer slides & settings successfully updated across the live store!'}</span>
        </div>
      )}

      {/* Offer Popup Analytics */}
      <CollapsibleAnalyticsPanel
        title={isBn ? 'অফার স্লাইড অ্যানালিটিক্স' : 'Offer Slides Analytics'}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SaasDonutChart
            title={isBn ? 'স্লাইড অ্যাক্টিভেশন অবস্থা' : 'Offer Slides Status'}
            subtitle={isBn ? 'সক্রিয় বনাম বন্ধ অফার স্লাইড' : 'Enabled vs paused popup slides'}
            data={offerChartData.statusSlices}
            centerLabel={isBn ? 'মোট স্লাইড' : 'Total Slides'}
            onSelectSlice={(slice) => {
              const targetIdx = slides.findIndex((s) =>
                slice.id === 'enabled' ? s.enabled : !s.enabled
              );
              if (targetIdx >= 0) setSelectedSlideIndex(targetIdx);
            }}
          />
          <SaasBarChart
            title={isBn ? 'টার্গেট অ্যাকশন অনুযায়ী স্লাইড' : 'Slides by Target Action'}
            subtitle={isBn ? 'সিটিএ অ্যাকশন অনুসারে স্লাইড বিন্যাস' : 'Click a bar to jump to matching slide'}
            data={offerChartData.actionBars}
            primaryLabel={isBn ? 'স্লাইড সংখ্যা' : 'Slides'}
            onSelectBar={(bar) => {
              const targetIdx = slides.findIndex((s) => (s.actionType || 'shop') === bar.id);
              if (targetIdx >= 0) setSelectedSlideIndex(targetIdx);
            }}
          />
        </div>
      </CollapsibleAnalyticsPanel>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Slides List & Form Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. Global Timing & Auto-Slide Controls */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    popupState.enabled
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isBn ? 'পপআপ স্ট্যাটাস ও স্লাইড টাইমিং' : 'Popup Status & Slide Timing'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isBn ? 'পপআপ অন/অফ এবং একাধিক স্লাইড ঘোরার সময় নির্ধারণ করুন' : 'Master toggle & carousel auto-rotation delay'}
                  </p>
                </div>
              </div>

              {/* Master Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={popupState.enabled}
                  onChange={(e) => setPopupState((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-2.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                  {popupState.enabled ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'বন্ধ' : 'Disabled')}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Delay Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                  <span>{isBn ? 'পপআপ আসার সময়' : 'Popup Delay'}</span>
                </label>
                <select
                  value={popupState.delaySeconds || 2.5}
                  onChange={(e) => setPopupState((prev) => ({ ...prev, delaySeconds: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  <option value={1}>১ সেকেন্ড পর (1s)</option>
                  <option value={2}>২ সেকেন্ড পর (2s)</option>
                  <option value={2.5}>২.৫ সেকেন্ড পর (2.5s)</option>
                  <option value={3}>৩ সেকেন্ড পর (3s)</option>
                  <option value={5}>৫ সেকেন্ড পর (5s)</option>
                </select>
              </div>

              {/* Auto Slide Interval */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isBn ? 'স্লাইড ঘোরার সময়' : 'Slide Interval'}</span>
                </label>
                <select
                  value={popupState.autoSlideInterval || 4.5}
                  onChange={(e) => setPopupState((prev) => ({ ...prev, autoSlideInterval: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  <option value={3}>৩ সেকেন্ড পর পর</option>
                  <option value={4}>৪ সেকেন্ড পর পর</option>
                  <option value={4.5}>৪.৫ সেকেন্ড পর পর</option>
                  <option value={6}>৬ সেকেন্ড পর পর</option>
                  <option value={8}>৮ সেকেন্ড পর পর</option>
                </select>
              </div>

              {/* Show Once Per Session */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isBn ? 'ভিজিট ফ্রিকোয়েন্সি' : 'Frequency'}</span>
                </label>
                <select
                  value={popupState.showOncePerSession ? 'session' : 'always'}
                  onChange={(e) => setPopupState((prev) => ({ ...prev, showOncePerSession: e.target.value === 'session' }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  <option value="session">এক সেশনে ১ বার</option>
                  <option value="always">প্রতিবার পেজ লোডে</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Slide Carousel Manager (Add, Reorder, Select Slides) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isBn ? `সক্রিয় অফার স্লাইডস (${slides.length}টি)` : `Active Offer Slides (${slides.length})`}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleAddSlide}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isBn ? '+ নতুন অফার স্লাইড যোগ করুন' : '+ Add Slide'}</span>
              </button>
            </div>

            {/* Slide Selection Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {slides.map((slide, idx) => {
                const isSelected = selectedSlideIndex === idx;
                return (
                  <div
                    key={slide.id || idx}
                    onClick={() => setSelectedSlideIndex(idx)}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-xs ring-1 ring-amber-300 dark:ring-amber-800'
                        : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 bg-slate-50/60 dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                        #{idx + 1} {slide.badgeText ? slide.badgeText.replace(/^[^\w\s\u0980-\u09FF]+/, '') : `Slide ${idx + 1}`}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleToggleSlideEnabled(idx, e)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          slide.enabled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {slide.enabled ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'বন্ধ' : 'Off')}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <img
                        src={getOptimizedImageUrl(slide.imageUrl || PRESET_SAMPLE_IMAGES[0].url, 200)}
                        alt="thumb"
                        className="w-12 h-10 object-cover rounded-lg shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                          {slide.title || 'Untitled Slide'}
                        </p>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium block truncate">
                          {slide.highlightType === 'coupon' && `🎟️ কুপন: ${slide.couponCode || 'N/A'}`}
                          {slide.highlightType === 'countdown' && `⚡ লাইভ কাউন্টডাউন`}
                          {slide.highlightType === 'free_delivery' && `🚚 ফ্রি ডেলিভারি`}
                          {slide.highlightType === 'discount_badge' && `🏷️ ডিসকাউন্ট ব্যাজ`}
                          {slide.highlightType === 'hotline' && `📞 হোয়াটসঅ্যাপ অর্ডার`}
                          {slide.highlightType === 'custom_text' && `✨ কাস্টম নোটিশ`}
                          {slide.highlightType === 'none' && `🛍️ ডিরেক্ট বাটন`}
                        </span>
                      </div>
                    </div>

                    {/* Reorder and Delete Toolbar */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => handleMoveSlide(idx, 'up', e)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move Left/Up"
                        >
                          <MoveUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === slides.length - 1}
                          onClick={(e) => handleMoveSlide(idx, 'down', e)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Move Right/Down"
                        >
                          <MoveDown className="w-3 h-3" />
                        </button>
                      </div>

                      {slides.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSlide(idx, e)}
                          className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                          title="Delete Slide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Current Slide Details Editor */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isBn ? `স্লাইড #${selectedSlideIndex + 1} কনটেন্ট এডিটর` : `Slide #${selectedSlideIndex + 1} Details`}
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Fast Save Button in Header */}
                <button
                  type="button"
                  disabled={isSavingSingleSlide}
                  onClick={handleFastSaveSingleSlide}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Fast Save This Slide"
                >
                  <Zap className={`w-3.5 h-3.5 ${isSavingSingleSlide ? 'animate-spin' : 'fill-current'}`} />
                  <span>
                    {isSavingSingleSlide
                      ? (isBn ? 'সেভ হচ্ছে...' : 'Saving...')
                      : (isBn ? '⚡ স্লাইড সেভ' : '⚡ Save Slide')}
                  </span>
                </button>

                {/* Language Switch Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveLangTab('bn')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      activeLangTab === 'bn'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    বাংলা (BN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLangTab('en')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      activeLangTab === 'en'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    English (EN)
                  </button>
                </div>
              </div>
            </div>

            {/* Banner Image */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isBn ? 'ব্যানার ইমেজ (URL বা আপলোড)' : 'Banner Image (URL or Upload)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={currentSlide.imageUrl || ''}
                  onChange={(e) => handleUpdateCurrentSlide({ imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isBn ? 'আপলোড' : 'Upload'}</span>
                  <input type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
                </label>
              </div>

              {/* Sample Preset Thumbnails */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {PRESET_SAMPLE_IMAGES.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleUpdateCurrentSlide({ imageUrl: preset.url })}
                    className={`relative rounded-xl overflow-hidden border-2 h-14 transition-all cursor-pointer group ${
                      currentSlide.imageUrl === preset.url
                        ? 'border-amber-500 ring-2 ring-amber-300'
                        : 'border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[8px] font-bold px-1 truncate text-center">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Badge & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {activeLangTab === 'bn' ? 'ফ্লোটিং ব্যাজ' : 'Badge Text'}
                </label>
                <input
                  type="text"
                  value={(activeLangTab === 'bn' ? currentSlide.badgeText : currentSlide.badgeTextEn) || ''}
                  onChange={(e) =>
                    handleUpdateCurrentSlide(
                      activeLangTab === 'bn' ? { badgeText: e.target.value } : { badgeTextEn: e.target.value }
                    )
                  }
                  placeholder="🔥 মেগা অফার"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {activeLangTab === 'bn' ? 'মূল অফার শিরোনাম' : 'Offer Headline'}
                </label>
                <input
                  type="text"
                  value={(activeLangTab === 'bn' ? currentSlide.title : currentSlide.titleEn) || ''}
                  onChange={(e) =>
                    handleUpdateCurrentSlide(
                      activeLangTab === 'bn' ? { title: e.target.value } : { titleEn: e.target.value }
                    )
                  }
                  placeholder="সীমিত সময়ের জন্য বিশেষ এক্সক্লুসিভ অফার!"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {activeLangTab === 'bn' ? 'অফার বিবরণ / সাবটাইটেল' : 'Subtitle / Description'}
              </label>
              <textarea
                rows={2}
                value={(activeLangTab === 'bn' ? currentSlide.subtitle : currentSlide.subtitleEn) || ''}
                onChange={(e) =>
                  handleUpdateCurrentSlide(
                    activeLangTab === 'bn' ? { subtitle: e.target.value } : { subtitleEn: e.target.value }
                  )
                }
                placeholder="যেকোনো ট্রেন্ডি স্মার্ট গ্যাজেট ও অ্যাক্সেসরিজ অর্ডারে পান আকর্ষণীয় ছাড়..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* 4. FLEXIBLE HIGHLIGHT BOX TYPE SELECTOR */}
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>{isBn ? 'অফার ফিচার / হাইলাইট বক্স টাইপ' : 'Middle Highlight Box Feature'}</span>
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {isBn ? 'প্রমো কোড ছাড়াও অন্যান্য ফাংশন' : 'More options beyond promo code'}
                </span>
              </div>

              {/* Feature Selector Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { type: 'coupon' as OfferHighlightType, label: isBn ? '🎟️ প্রমো কুপন কোড' : '🎟️ Promo Coupon' },
                  { type: 'countdown' as OfferHighlightType, label: isBn ? '⚡ কাউন্টডাউন টাইমার' : '⚡ Live Countdown' },
                  { type: 'free_delivery' as OfferHighlightType, label: isBn ? '🚚 ফ্রি হোম ডেলিভারি' : '🚚 Free Delivery' },
                  { type: 'discount_badge' as OfferHighlightType, label: isBn ? '🏷️ ফ্ল্যাট মূল্যছাড়' : '🏷️ Discount Deal' },
                  { type: 'hotline' as OfferHighlightType, label: isBn ? '📞 হোয়াটসঅ্যাপ/কল' : '📞 WhatsApp Hotline' },
                  { type: 'custom_text' as OfferHighlightType, label: isBn ? '✨ কাস্টম হাইলাইটস' : '✨ Custom Notice' },
                  { type: 'none' as OfferHighlightType, label: isBn ? '🚫 সাধারণ (কোনো বক্স নেই)' : '🚫 None (Clean)' },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleUpdateCurrentSlide({ highlightType: item.type })}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-left truncate ${
                      currentSlide.highlightType === item.type
                        ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Feature Sub-Fields */}
              {currentSlide.highlightType === 'coupon' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      কুপন কোড (Coupon Code)
                    </label>
                    <input
                      type="text"
                      value={currentSlide.couponCode || ''}
                      onChange={(e) => handleUpdateCurrentSlide({ couponCode: e.target.value.toUpperCase() })}
                      placeholder="e.g. OFFER50"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-black uppercase text-amber-700 dark:text-amber-300 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ডিসকাউন্ট ব্যাজ টেক্সট
                    </label>
                    <input
                      type="text"
                      value={(activeLangTab === 'bn' ? currentSlide.couponDiscountText : currentSlide.couponDiscountTextEn) || ''}
                      onChange={(e) =>
                        handleUpdateCurrentSlide(
                          activeLangTab === 'bn'
                            ? { couponDiscountText: e.target.value }
                            : { couponDiscountTextEn: e.target.value }
                        )
                      }
                      placeholder="৫০% পর্যন্ত ছাড়"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {currentSlide.highlightType === 'countdown' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      কাউন্টডাউন শিরোনাম (Title)
                    </label>
                    <input
                      type="text"
                      value={(activeLangTab === 'bn' ? currentSlide.customHighlightTitle : currentSlide.customHighlightTitleEn) || ''}
                      onChange={(e) =>
                        handleUpdateCurrentSlide(
                          activeLangTab === 'bn'
                            ? { customHighlightTitle: e.target.value }
                            : { customHighlightTitleEn: e.target.value }
                        )
                      }
                      placeholder="⚡ অফার শেষ হতে বাকি:"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      কাউন্টডাউন সময়কাল (Hours)
                    </label>
                    <input
                      type="number"
                      value={currentSlide.countdownHours || 12}
                      onChange={(e) => handleUpdateCurrentSlide({ countdownHours: Number(e.target.value) || 12 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {(currentSlide.highlightType === 'discount_badge' ||
                currentSlide.highlightType === 'free_delivery' ||
                currentSlide.highlightType === 'custom_text') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      হাইলাইট শিরোনাম
                    </label>
                    <input
                      type="text"
                      value={(activeLangTab === 'bn' ? currentSlide.customHighlightTitle : currentSlide.customHighlightTitleEn) || ''}
                      onChange={(e) =>
                        handleUpdateCurrentSlide(
                          activeLangTab === 'bn'
                            ? { customHighlightTitle: e.target.value }
                            : { customHighlightTitleEn: e.target.value }
                        )
                      }
                      placeholder="e.g. 🎁 ফ্রি হোম ডেলিভারি সারা বাংলাদেশ"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      হাইলাইট সাব-টেক্সট
                    </label>
                    <input
                      type="text"
                      value={(activeLangTab === 'bn' ? currentSlide.customHighlightSubtitle : currentSlide.customHighlightSubtitleEn) || ''}
                      onChange={(e) =>
                        handleUpdateCurrentSlide(
                          activeLangTab === 'bn'
                            ? { customHighlightSubtitle: e.target.value }
                            : { customHighlightSubtitleEn: e.target.value }
                        )
                      }
                      placeholder="e.g. কোনো অতিরিক্ত চার্জ ছাড়াই দ্রুত ডেলিভারি"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {currentSlide.highlightType === 'hotline' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      হোয়াটসঅ্যাপ / হটলাইন নাম্বার
                    </label>
                    <input
                      type="text"
                      value={currentSlide.hotlineNumber || '+880 1719-143897'}
                      onChange={(e) => handleUpdateCurrentSlide({ hotlineNumber: e.target.value })}
                      placeholder="+880 1719-143897"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      বাটন টেক্সট
                    </label>
                    <input
                      type="text"
                      value={(activeLangTab === 'bn' ? currentSlide.customHighlightTitle : currentSlide.customHighlightTitleEn) || ''}
                      onChange={(e) =>
                        handleUpdateCurrentSlide(
                          activeLangTab === 'bn'
                            ? { customHighlightTitle: e.target.value }
                            : { customHighlightTitleEn: e.target.value }
                        )
                      }
                      placeholder="হোয়াটসঅ্যাপে মেসেজ দিন"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. CTA Action & Navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  বাটন টেক্সট
                </label>
                <input
                  type="text"
                  value={(activeLangTab === 'bn' ? currentSlide.buttonText : currentSlide.buttonTextEn) || ''}
                  onChange={(e) =>
                    handleUpdateCurrentSlide(
                      activeLangTab === 'bn' ? { buttonText: e.target.value } : { buttonTextEn: e.target.value }
                    )
                  }
                  placeholder="🛍️ এখনই অফারটি নিন"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ক্লিক করলে নিয়ে যাবে:
                </label>
                <select
                  value={currentSlide.actionType || 'shop'}
                  onChange={(e) => handleUpdateCurrentSlide({ actionType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                >
                  <option value="shop">🛍️ শপ পেজ (সকল পণ্য)</option>
                  <option value="flash_sale">⚡ ফ্ল্যাশ সেল সেকশন</option>
                  <option value="category">📁 নির্দিষ্ট ক্যাটাগরি</option>
                  <option value="product">🎁 নির্দিষ্ট পণ্য</option>
                  <option value="whatsapp">💬 হোয়াটসঅ্যাপে মেসেজ</option>
                  <option value="custom_url">🔗 কাস্টম লিংক</option>
                </select>
              </div>

              {/* Dynamic Target Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  টার্গেট অপশন:
                </label>
                {currentSlide.actionType === 'category' ? (
                  <select
                    value={currentSlide.actionTarget || ''}
                    onChange={(e) => handleUpdateCurrentSlide({ actionTarget: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- ক্যাটাগরি সিলেক্ট করুন --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                ) : currentSlide.actionType === 'product' ? (
                  <select
                    value={currentSlide.actionTarget || ''}
                    onChange={(e) => handleUpdateCurrentSlide({ actionTarget: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- প্রোডাক্ট সিলেক্ট করুন --</option>
                    {products.slice(0, 50).map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.name} (৳{prod.price})
                      </option>
                    ))}
                  </select>
                ) : currentSlide.actionType === 'whatsapp' ? (
                  <input
                    type="text"
                    value={currentSlide.actionTarget || currentSlide.hotlineNumber || '+880 1719-143897'}
                    onChange={(e) => handleUpdateCurrentSlide({ actionTarget: e.target.value })}
                    placeholder="WhatsApp Number"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-amber-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={currentSlide.actionTarget || ''}
                    onChange={(e) => handleUpdateCurrentSlide({ actionTarget: e.target.value })}
                    placeholder="/shop or https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500"
                  />
                )}
              </div>
            </div>

            {/* Inline Fast Save Toast */}
            {singleSlideSaveToast && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{singleSlideSaveToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSingleSlideSaveToast(null)}
                  className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Bottom Quick Save Slide Action Bar */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'এই স্লাইডের পরিবর্তনসমূহ সাথে সাথে স্টোরে সেভ হয়ে যাবে।'
                  : 'Changes to this slide will be instantly live across the store.'}
              </span>

              <button
                type="button"
                disabled={isSavingSingleSlide}
                onClick={handleFastSaveSingleSlide}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Zap className={`w-4 h-4 ${isSavingSingleSlide ? 'animate-spin' : 'fill-current'}`} />
                <span>
                  {isSavingSingleSlide
                    ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
                    : (isBn ? `⚡ স্লাইড #${selectedSlideIndex + 1} সরাসরি সেভ করুন` : `⚡ Save Slide #${selectedSlideIndex + 1}`)}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Live Multi-Slide Preview (5 Cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  {isBn ? 'লাইভ প্রিভিউ' : 'Interactive Live Preview'}
                </span>
              </div>

              {/* Device Preview Switcher */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                    previewDevice === 'desktop' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-md cursor-pointer transition-colors ${
                    previewDevice === 'mobile' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Mobile Preview"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Mockup Container */}
            <div className="relative p-2 sm:p-4 bg-slate-950/90 rounded-2xl flex items-center justify-center min-h-[480px]">
              <div
                className={`relative w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white transition-all ${
                  previewDevice === 'mobile' ? 'max-w-xs scale-95' : 'max-w-md'
                }`}
              >
                {/* Slide index counter & close button */}
                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
                  {slides.length > 1 && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-950/70 text-[10px] font-black text-white backdrop-blur-xs">
                      {selectedSlideIndex + 1} / {slides.length}
                    </span>
                  )}
                  <div className="w-7 h-7 rounded-full bg-slate-950/70 text-white flex items-center justify-center backdrop-blur-xs">
                    <X className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Banner Image */}
                <div className="relative w-full h-36 sm:h-44 bg-slate-950 overflow-hidden">
                  <img
                    src={getOptimizedImageUrl(currentSlide.imageUrl || PRESET_SAMPLE_IMAGES[0].url, 600)}
                    alt="Offer Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                  {/* Carousel Prev/Next Buttons */}
                  {slides.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/90"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSlideIndex((prev) => (prev + 1) % slides.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer hover:bg-black/90"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {/* Floating Badge */}
                  {activeBadge && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md uppercase">
                        <Flame className="w-3 h-3 fill-current" />
                        <span>{activeBadge}</span>
                      </span>
                    </div>
                  )}

                  {/* Headline Title */}
                  <div className="absolute bottom-2.5 left-3.5 right-3.5 z-10">
                    <h4 className="text-sm sm:text-base font-black text-white leading-tight drop-shadow-md">
                      {activeTitle || 'Special Offer Title'}
                    </h4>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-3">
                  {activeSubtitle && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {activeSubtitle}
                    </p>
                  )}

                  {/* DYNAMIC HIGHLIGHT PREVIEW */}
                  {currentSlide.highlightType === 'coupon' && currentSlide.couponCode && (
                    <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-dashed border-sky-400 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold text-sky-700 dark:text-sky-300 uppercase block">
                          {isBn ? 'কুপন কোড' : 'PROMO CODE'}
                        </span>
                        <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                          {currentSlide.couponCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (currentSlide.couponCode) {
                            navigator.clipboard.writeText(currentSlide.couponCode);
                            setCopiedPreviewCoupon(true);
                            setTimeout(() => setCopiedPreviewCoupon(false), 2000);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedPreviewCoupon ? <Check className="w-3 h-3 text-emerald-300" /> : <Tag className="w-3 h-3" />}
                        <span>{copiedPreviewCoupon ? (isBn ? 'কপি!' : 'Copied!') : (isBn ? 'কপি' : 'Copy')}</span>
                      </button>
                    </div>
                  )}

                  {currentSlide.highlightType === 'countdown' && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black text-rose-700 dark:text-rose-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{activeHighlightTitle || '⚡ অফার শেষ হতে বাকি:'}</span>
                      </span>
                      <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                        11h : 45m : 30s
                      </span>
                    </div>
                  )}

                  {currentSlide.highlightType === 'free_delivery' && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 truncate">
                        {activeHighlightTitle || '🚚 সম্পূর্ণ ফ্রি হোম ডেলিভারি সারা বাংলাদেশ'}
                      </span>
                    </div>
                  )}

                  {currentSlide.highlightType === 'discount_badge' && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 flex items-center gap-2">
                      <Percent className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 truncate">
                        {activeHighlightTitle || '🏷️ বিশেষ ফ্ল্যাট মূল্যছাড় ও ক্যাশব্যাক'}
                      </span>
                    </div>
                  )}

                  {currentSlide.highlightType === 'hotline' && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{currentSlide.hotlineNumber || '+880 1719-143897'}</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">
                        WhatsApp
                      </span>
                    </div>
                  )}

                  {/* CTA Button */}
                  <button
                    type="button"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{activeButtonText || (isBn ? '🛍️ অফারটি উপভোগ করুন' : '🛍️ Claim Offer Now')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Slide Dots Preview */}
                  {slides.length > 1 && (
                    <div className="flex items-center justify-center gap-1 pt-0.5">
                      {slides.map((_, dotIdx) => (
                        <div
                          key={dotIdx}
                          className={`h-1.5 rounded-full transition-all ${
                            selectedSlideIndex === dotIdx ? 'w-4 bg-sky-500' : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
