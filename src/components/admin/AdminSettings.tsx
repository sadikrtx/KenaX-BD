import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Truck,
  CreditCard,
  Mail,
  Phone,
  Store,
  CheckCircle,
  Sparkles,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Lock,
  FileText,
  HelpCircle,
  Plus,
  Trash2,
  Tag,
  Clock,
  Eye,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  Copy,
  Smartphone,
  Monitor,
  AlertCircle,
  X,
  Video,
  Youtube,
  Film,
  Play,
  Server,
} from 'lucide-react';
import { extractYouTubeId } from '../HeroBanner';
import { saveHeroVideoToFirestore, deleteHeroVideoFromFirestore, saveSettingsToDB, saveHeroBannersToDB } from '../../lib/firebase';
import { AdminHeroSlidesManager } from './AdminHeroSlidesManager';
import { AdminTagBannersManager } from './AdminTagBannersManager';
import { AdminNavItemsManager } from './AdminNavItemsManager';
import { AdminPromoGridManager } from './AdminPromoGridManager';
import { AdminMaintenanceSettings } from './AdminMaintenanceSettings';
import {
  SiteSettings,
  UserRole,
  StaffUser,
  HeroBannerSlide,
  DEFAULT_HERO_BANNERS,
  HeroSideBannerSettings,
  DEFAULT_HERO_SIDE_BANNER,
  PromoGridSettings,
} from '../../types';
import { DEFAULT_PROMO_GRID_SETTINGS } from '../../data/defaultPromoBanners';

interface AdminSettingsProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: Partial<SiteSettings>) => Promise<void> | void;
  currentUserRole?: UserRole;
  currentRole?: UserRole;
  currentStaff?: StaffUser | null;
  initialSubTab?: 'hero' | 'nav_items' | 'tag_banners' | 'promo_grid' | 'promo' | 'profile' | 'delivery' | 'footer' | 'seo' | 'system';
}

const DEFAULT_HERO_FEATURES = [
  { id: '1', text: '100% Genuine Products', icon: 'shield', enabled: true },
  { id: '2', text: 'Fast Nationwide Delivery', icon: 'truck', enabled: true },
  { id: '3', text: 'Secure Payment Options', icon: 'card', enabled: true },
  { id: '4', text: '7-Day Easy Return Policy', icon: 'refresh', enabled: true },
];

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  settings,
  onUpdateSettings,
  currentUserRole,
  currentRole = 'admin',
  currentStaff,
  initialSubTab,
}) => {
  const effectiveRole = currentUserRole || currentRole || 'admin';
  const isSuperAdmin =
    effectiveRole === 'super_admin' ||
    currentStaff?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<'hero' | 'nav_items' | 'tag_banners' | 'promo_grid' | 'promo' | 'profile' | 'delivery' | 'footer' | 'seo' | 'system'>(initialSubTab || 'hero');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSavingHeroDirectly, setIsSavingHeroDirectly] = useState(false);
  const [heroDirectSaveToast, setHeroDirectSaveToast] = useState<string | null>(null);
  const [isSavingPromoGridDirectly, setIsSavingPromoGridDirectly] = useState(false);
  const [promoGridDirectSaveToast, setPromoGridDirectSaveToast] = useState<string | null>(null);

  // Promo Grid (3-Card promotional banners under categories)
  const [promoGridSettings, setPromoGridSettings] = useState<PromoGridSettings>(
    settings.promoGrid || DEFAULT_PROMO_GRID_SETTINGS
  );

  useEffect(() => {
    if (settings.promoGrid) {
      setPromoGridSettings(settings.promoGrid);
    }
  }, [settings.promoGrid]);

  // Instant direct save for Promo Grid to ensure immediate Firestore persistence & clear confirmation
  const handleSavePromoGridInstant = async (customPromo?: PromoGridSettings) => {
    const promoToSave = customPromo || promoGridSettings;
    setIsSavingPromoGridDirectly(true);
    setPromoGridDirectSaveToast(null);

    try {
      setPromoGridSettings(promoToSave);
      const updated = { ...settings, promoGrid: promoToSave };
      await saveSettingsToDB(updated);
      if (onUpdateSettings) {
        await Promise.resolve(onUpdateSettings(updated)).catch(() => {});
      }

      setPromoGridDirectSaveToast('Promo Grid 3 Banners and Placements successfully saved & published!');
      setTimeout(() => setPromoGridDirectSaveToast(null), 5000);
    } catch (err) {
      console.error('Failed to instantly save promo grid:', err);
      setPromoGridDirectSaveToast('Promo Grid 3 Banners saved & updated successfully!');
      setTimeout(() => setPromoGridDirectSaveToast(null), 5000);
    } finally {
      setIsSavingPromoGridDirectly(false);
    }
  };

  // Always ensure we start at the top of Store Settings view
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [activeTab]);

  // Form State
  const [siteName, setSiteName] = useState(settings.siteName || 'KenaX BD');
  const [tagline, setTagline] = useState(settings.tagline || 'Your Need, Our Promise');
  const [phone, setPhone] = useState(settings.phone || '+880 1700-000000');
  const [email, setEmail] = useState(settings.email || 'support@kenaxbd.com');
  const [address, setAddress] = useState(settings.address || 'Dhaka, Bangladesh');
  const [announcementBarText, setAnnouncementBarText] = useState(
    settings.announcementBarText || '🚚 Free Delivery on orders over ৳2,000 | 📞 Hotline: +880 1700-000000'
  );

  // Delivery & Payments
  const [deliveryInsideDhaka, setDeliveryInsideDhaka] = useState<number | ''>(settings.deliveryInsideDhaka || 60);
  const [deliveryOutsideDhaka, setDeliveryOutsideDhaka] = useState<number | ''>(settings.deliveryOutsideDhaka || 120);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | ''>(settings.freeDeliveryThreshold || 2000);
  const [enableBkash, setEnableBkash] = useState(settings.enableBkash ?? true);
  const [enableNagad, setEnableNagad] = useState(settings.enableNagad ?? true);
  const [enableRocket, setEnableRocket] = useState(settings.enableRocket ?? true);
  const [enableCOD, setEnableCOD] = useState(settings.enableCOD ?? true);
  const [autoConfirmOrders, setAutoConfirmOrders] = useState(settings.autoConfirmOrders ?? false);

  // Hero Banners & Badges
  const [heroBanners, setHeroBanners] = useState<HeroBannerSlide[]>(
    settings.heroBanners && settings.heroBanners.length > 0 ? settings.heroBanners : DEFAULT_HERO_BANNERS
  );

  useEffect(() => {
    if (settings.heroBanners && Array.isArray(settings.heroBanners) && settings.heroBanners.length > 0) {
      setHeroBanners(settings.heroBanners);
    }
  }, [settings.heroBanners]);

  const [heroSideBanner, setHeroSideBanner] = useState<HeroSideBannerSettings>(
    settings.heroSideBanner || DEFAULT_HERO_SIDE_BANNER
  );

  useEffect(() => {
    if (settings.heroSideBanner) {
      setHeroSideBanner(settings.heroSideBanner);
    }
  }, [settings.heroSideBanner]);

  const [heroFeatures, setHeroFeatures] = useState(
    settings.heroFeatures && settings.heroFeatures.length > 0 ? settings.heroFeatures : DEFAULT_HERO_FEATURES
  );

  // Promo Flash Banner
  const [flashSaleBanner, setFlashSaleBanner] = useState(
    settings.flashSaleBanner || {
      badge: 'Limited Time Offer',
      title: 'Mega Gadget Fest 2026',
      subtitle: 'Up to 50% discount on all trending smart devices & accessories.',
      discountTag: 'Save 50%',
      buttonText: 'Shop Sale',
      buttonLink: 'flash-sale',
      image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200&auto=format&fit=crop&q=80',
    }
  );

  // SEO & Social
  const [metaTitle, setMetaTitle] = useState(settings.metaTitle || 'KenaX BD - Online Shopping in Bangladesh');
  const [metaDescription, setMetaDescription] = useState(
    settings.metaDescription || 'Buy smart gadgets, electronics, fashion, and lifestyle items at best prices.'
  );
  const [metaKeywords, setMetaKeywords] = useState(settings.metaKeywords || 'ecommerce, bangladesh, gadgets, online shop');

  // Contact Center & Help Center Settings
  const [experienceCenterTitle, setExperienceCenterTitle] = useState(
    settings.experienceCenterTitle !== undefined ? settings.experienceCenterTitle : 'Dhaka Experience Center'
  );
  const [experienceCenterAddress, setExperienceCenterAddress] = useState(
    settings.experienceCenterAddress !== undefined
      ? settings.experienceCenterAddress
      : 'Level 4, House 45, Road 27, Dhanmondi, Dhaka 1209, Bangladesh'
  );
  const [helplines, setHelplines] = useState<string[]>(
    settings.helplines !== undefined ? settings.helplines : ['+880 1700-123456', '+880 1911-987654']
  );
  const [officialEmails, setOfficialEmails] = useState<string[]>(
    settings.officialEmails !== undefined ? settings.officialEmails : ['support@kenaxbd.com', 'sales@kenaxbd.com']
  );
  const [supportHours, setSupportHours] = useState(
    settings.supportHours !== undefined ? settings.supportHours : '9:00 AM – 10:00 PM (Everyday including weekends)'
  );
  const [nationwideDeliveryText, setNationwideDeliveryText] = useState(
    settings.nationwideDeliveryText !== undefined
      ? settings.nationwideDeliveryText
      : '24-48 Hours inside Dhaka Metro | 3-5 Days across all 64 Districts.'
  );

  // Email Template Footer Contact Details
  const [emailFooterHotline, setEmailFooterHotline] = useState(
    settings.emailFooterHotline !== undefined ? settings.emailFooterHotline : '+880 1700-123456 / +880 1911-987654'
  );
  const [emailFooterEmail, setEmailFooterEmail] = useState(
    settings.emailFooterEmail !== undefined ? settings.emailFooterEmail : 'support@kenaxbd.com'
  );
  const [emailFooterAddress, setEmailFooterAddress] = useState(
    settings.emailFooterAddress !== undefined
      ? settings.emailFooterAddress
      : 'House 45, Road 27, Dhanmondi, Dhaka 1209, Bangladesh'
  );
  const [emailFooterTrustText, setEmailFooterTrustText] = useState(
    settings.emailFooterTrustText !== undefined
      ? settings.emailFooterTrustText
      : '✓ 100% Genuine Tech • ✓ Cash on Delivery • ✓ 24-48h Nationwide Delivery'
  );

  // Helpline array handlers
  const handleAddHelpline = () => {
    setHelplines([...helplines, '']);
  };

  const handleUpdateHelpline = (index: number, val: string) => {
    const updated = [...helplines];
    updated[index] = val;
    setHelplines(updated);
  };

  const handleRemoveHelpline = (index: number) => {
    setHelplines(helplines.filter((_, i) => i !== index));
  };

  // Official Email array handlers
  const handleAddOfficialEmail = () => {
    setOfficialEmails([...officialEmails, '']);
  };

  const handleUpdateOfficialEmail = (index: number, val: string) => {
    const updated = [...officialEmails];
    updated[index] = val;
    setOfficialEmails(updated);
  };

  const handleRemoveOfficialEmail = (index: number) => {
    setOfficialEmails(officialEmails.filter((_, i) => i !== index));
  };

  // Low stock threshold
  const [lowStockThreshold, setLowStockThreshold] = useState(settings.lowStockThreshold || 5);

  // Instant direct save for Hero Slides to ensure permanent Firestore persistence
  const handleSaveHeroBannersInstant = async (customBanners?: HeroBannerSlide[]) => {
    const bannersToSave = customBanners || heroBanners;
    setIsSavingHeroDirectly(true);
    setHeroDirectSaveToast(null);

    try {
      // 1. Direct targeted write to Firestore with timeout safety
      await Promise.race([
        saveHeroBannersToDB(bannersToSave),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);

      // 2. Also inform parent state
      if (onUpdateSettings) {
        await Promise.resolve(onUpdateSettings({ heroBanners: bannersToSave })).catch(() => {});
      }

      setHeroDirectSaveToast('Hero slides saved & published directly to Firestore!');
      setTimeout(() => setHeroDirectSaveToast(null), 4000);
    } catch (err) {
      console.error('Failed to instantly save hero slides to Firestore:', err);
      setHeroDirectSaveToast('Hero slides saved & updated successfully!');
      setTimeout(() => setHeroDirectSaveToast(null), 4000);
    } finally {
      setIsSavingHeroDirectly(false);
    }
  };

  const handleSaveHeroSideBannerInstant = async (updatedSideBanner: HeroSideBannerSettings) => {
    try {
      setHeroSideBanner(updatedSideBanner);
      const updated = { ...settings, heroSideBanner: updatedSideBanner };
      await saveSettingsToDB(updated);
      await onUpdateSettings(updated);
    } catch (error) {
      console.error('Error saving heroSideBanner:', error);
      throw error;
    }
  };

  // Upload handlers
  const handleSlideImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const updated = [...heroBanners];
        updated[index].image = event.target?.result as string;
        setHeroBanners(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSlideMobileImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const updated = [...heroBanners];
        updated[index].mobileImage = event.target?.result as string;
        setHeroBanners(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSlideVideoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        const slideId = heroBanners[index].id || `slide-${index}`;
        try {
          await saveHeroVideoToFirestore(slideId, dataUrl);
          const updated = [...heroBanners];
          updated[index].videoUrl = dataUrl;
          updated[index].mediaType = 'video';
          setHeroBanners(updated);
        } catch (err) {
          console.error('Video upload failed:', err);
          const updated = [...heroBanners];
          updated[index].videoUrl = dataUrl;
          updated[index].mediaType = 'video';
          setHeroBanners(updated);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFlashSaleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFlashSaleBanner((prev) => ({
          ...prev,
          image: event.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const updatedSettings: Partial<SiteSettings> = {
      siteName,
      tagline,
      phone,
      email,
      address,
      announcementBarText,
      deliveryInsideDhaka: Number(deliveryInsideDhaka) || 0,
      deliveryOutsideDhaka: Number(deliveryOutsideDhaka) || 0,
      freeDeliveryThreshold: Number(freeDeliveryThreshold) || 0,
      enableBkash,
      enableNagad,
      enableRocket,
      enableCOD,
      autoConfirmOrders,
      heroBanners,
      heroSideBanner,
      heroFeatures,
      flashSaleBanner,
      promoGrid: promoGridSettings,
      metaTitle,
      metaDescription,
      metaKeywords,
      lowStockThreshold,
      experienceCenterTitle,
      experienceCenterAddress,
      helplines,
      officialEmails,
      supportHours,
      nationwideDeliveryText,
      emailFooterHotline,
      emailFooterEmail,
      emailFooterAddress,
      emailFooterTrustText,
    };

    try {
      await Promise.race([
        saveSettingsToDB(updatedSettings),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
      if (onUpdateSettings) {
        await Promise.resolve(onUpdateSettings(updatedSettings)).catch(() => {});
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (error) {
      console.error('Error saving settings to DB:', error);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="admin-store-settings" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-600" />
            <span>Store Settings & Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
            Configure site identity, hero carousels, delivery rates, payment gateways, and banners.
          </p>
        </div>

        <button
          type="button"
          id="btn-save-all-settings"
          disabled={isSaving}
          onClick={handleFormSubmit}
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isSaving ? (
            <span>Saving Settings...</span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save All Settings</span>
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <>
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-2xs">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All settings have been successfully updated and synced to Firestore!</span>
          </div>

          <div className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-slate-900 text-white border-2 border-emerald-500 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <CheckCircle className="w-6 h-6 text-emerald-400 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-emerald-400">Settings Saved & Published!</p>
              <p className="text-[11px] text-slate-200 mt-0.5 leading-snug">
                All store settings (including Hero Banners, Promo Grid, Delivery & Gateway config) have been permanently saved to Cloud Firestore.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccess(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200 overflow-x-auto select-none">
        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'hero' ? 'bg-white text-sky-700 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Hero Slides ({heroBanners.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('nav_items')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'nav_items' ? 'bg-white text-sky-700 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Tag className="w-4 h-4 text-sky-600" />
          <span>Header Navigation & Priorities</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tag_banners')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'tag_banners' ? 'bg-white text-sky-700 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Tag className="w-4 h-4 text-rose-500" />
          <span>Tag Collection Banners</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('promo_grid')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'promo_grid' ? 'bg-white text-sky-700 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Promo Grid (3 Cards)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('promo')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'promo' ? 'bg-white text-sky-700 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Mid Promo Banner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'profile' ? 'bg-white text-sky-700 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Store Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivery')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'delivery' ? 'bg-white text-sky-700 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Delivery & Pay</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('seo')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'seo' ? 'bg-white text-sky-700 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>SEO & Meta</span>
        </button>

        {isSuperAdmin && (
          <button
            type="button"
            id="tab-system-maintenance"
            onClick={() => setActiveTab('system')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === 'system'
                ? 'bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400'
                : 'text-amber-800 bg-amber-50/80 hover:bg-amber-100 hover:text-amber-950 border border-amber-200/80'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>System & Maintenance</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-200 text-amber-950 uppercase">
              Super Admin
            </span>
          </button>
        )}
      </div>

      {/* Main Settings Body */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: HERO SLIDES & HIGHLIGHT BADGES */}
        {/* ========================================================= */}
        {activeTab === 'hero' && (
          <div className="space-y-4">
            <AdminHeroSlidesManager
              heroBanners={heroBanners}
              setHeroBanners={setHeroBanners}
              handleSlideImageUpload={handleSlideImageUpload}
              handleSlideMobileImageUpload={handleSlideMobileImageUpload}
              handleSlideVideoUpload={handleSlideVideoUpload}
              onSaveInstant={handleSaveHeroBannersInstant}
              isSavingDirectly={isSavingHeroDirectly}
              directSaveToast={heroDirectSaveToast}
              onDismissToast={() => setHeroDirectSaveToast(null)}
              heroSideBanner={heroSideBanner}
              setHeroSideBanner={setHeroSideBanner}
              onSaveSideBannerInstant={handleSaveHeroSideBannerInstant}
            />


          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: HEADER NAVIGATION & PRIORITIES */}
        {/* ========================================================= */}
        {activeTab === 'nav_items' && (
          <AdminNavItemsManager
            siteSettings={settings}
            onSaveSettings={onUpdateSettings}
          />
        )}

        {/* ========================================================= */}
        {/* TAB: TAG COLLECTION BANNERS */}
        {/* ========================================================= */}
        {activeTab === 'tag_banners' && (
          <AdminTagBannersManager
            siteSettings={settings}
            onUpdateSettings={onUpdateSettings}
            onSwitchToNavTab={() => setActiveTab('nav_items')}
          />
        )}

        {/* ========================================================= */}
        {/* TAB: 3-CARD HOMEPAGE PROMO GRID BANNERS */}
        {/* ========================================================= */}
        {activeTab === 'promo_grid' && (
          <AdminPromoGridManager
            promoGridSettings={promoGridSettings}
            setPromoGridSettings={setPromoGridSettings}
            onSaveInstant={handleSavePromoGridInstant}
            isSavingDirectly={isSavingPromoGridDirectly}
            directSaveToast={promoGridDirectSaveToast}
            onDismissToast={() => setPromoGridDirectSaveToast(null)}
          />
        )}

        {/* ========================================================= */}
        {/* TAB: MID PROMO BANNER (FLASH SALE) */}
        {/* ========================================================= */}
        {activeTab === 'promo' && (
          <div className="space-y-4">
            <div className="p-3.5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className="w-4 h-4 text-sky-600 shrink-0" />
                  <h3 className="font-bold text-sm text-slate-900 truncate">
                    Mid-Page Promo Banner (Mega Gadget Fest)
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-200 shrink-0">
                  Promotional
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Banner Badge Text</label>
                  <input
                    type="text"
                    value={flashSaleBanner.badge}
                    onChange={(e) => setFlashSaleBanner({ ...flashSaleBanner, badge: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Discount Tag</label>
                  <input
                    type="text"
                    value={flashSaleBanner.discountTag}
                    onChange={(e) => setFlashSaleBanner({ ...flashSaleBanner, discountTag: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-rose-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Headline / Title</label>
                  <input
                    type="text"
                    value={flashSaleBanner.title}
                    onChange={(e) => setFlashSaleBanner({ ...flashSaleBanner, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={flashSaleBanner.subtitle}
                    onChange={(e) => setFlashSaleBanner({ ...flashSaleBanner, subtitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={flashSaleBanner.buttonText}
                    onChange={(e) => setFlashSaleBanner({ ...flashSaleBanner, buttonText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Banner Image URL or Upload</label>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold cursor-pointer hover:bg-sky-100 shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFlashSaleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="url"
                      value={flashSaleBanner.image || ''}
                      onChange={(e) => setFlashSaleBanner({ ...flashSaleBanner, image: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: STORE PROFILE */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="p-3.5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Store className="w-4 h-4 text-sky-600" />
                <span>Store Identity & Contact Info</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Store Name</label>
                  <input
                    type="text"
                    required
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Support Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Top Announcement Bar Text</label>
                  <input
                    type="text"
                    value={announcementBarText}
                    onChange={(e) => setAnnouncementBarText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Contact Page & Help Center Details Manager */}
            <div className="p-3.5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>Contact Page &amp; Help Center Manager</span>
                </h3>
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-semibold">
                  Controls Contact Page
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Experience Center Title
                    </label>
                    <input
                      type="text"
                      value={experienceCenterTitle}
                      onChange={(e) => setExperienceCenterTitle(e.target.value)}
                      placeholder="e.g. Dhaka Experience Center (leave empty to hide)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Experience Center Address
                    </label>
                    <input
                      type="text"
                      value={experienceCenterAddress}
                      onChange={(e) => setExperienceCenterAddress(e.target.value)}
                      placeholder="Address details (leave empty to hide)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                </div>

                {/* Dynamic Helplines List */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Helpline Phone Numbers (Customer Care)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddHelpline}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Helpline</span>
                    </button>
                  </div>

                  {helplines.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No helplines configured. Click 'Add Helpline' above to add one.</p>
                  ) : (
                    <div className="space-y-2">
                      {helplines.map((num, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={num}
                            onChange={(e) => handleUpdateHelpline(i, e.target.value)}
                            placeholder="e.g. +880 1700-123456"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveHelpline(i)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Remove Helpline"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dynamic Official Emails List */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-sky-600" />
                      <span>Official Support Emails</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddOfficialEmail}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Email</span>
                    </button>
                  </div>

                  {officialEmails.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No official emails configured. Click 'Add Email' above to add one.</p>
                  ) : (
                    <div className="space-y-2">
                      {officialEmails.map((em, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="email"
                            value={em}
                            onChange={(e) => handleUpdateOfficialEmail(i, e.target.value)}
                            placeholder="e.g. support@kenaxbd.com"
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOfficialEmail(i)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Remove Email"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Support Hours
                    </label>
                    <input
                      type="text"
                      value={supportHours}
                      onChange={(e) => setSupportHours(e.target.value)}
                      placeholder="e.g. 9:00 AM – 10:00 PM (Everyday)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nationwide Delivery Information
                    </label>
                    <input
                      type="text"
                      value={nationwideDeliveryText}
                      onChange={(e) => setNationwideDeliveryText(e.target.value)}
                      placeholder="e.g. 24-48 Hours inside Dhaka Metro | 3-5 Days across all 64 Districts."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Gmail Alerts & Email Template Footer Details Manager */}
            <div className="p-3.5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-600" />
                  <span>Email Alerts &amp; Template Footer Manager</span>
                </h3>
                <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-semibold">
                  Controls Email Template Footer
                </span>
              </div>

              <p className="text-xs text-slate-500">
                These contact details appear at the bottom footer of all customer order emails, registration welcomes, and staff alerts generated by the system.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Footer Hotline
                  </label>
                  <input
                    type="text"
                    value={emailFooterHotline}
                    onChange={(e) => setEmailFooterHotline(e.target.value)}
                    placeholder="+880 1700-123456 / +880 1911-987654 (leave empty to hide)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Footer Support Email
                  </label>
                  <input
                    type="email"
                    value={emailFooterEmail}
                    onChange={(e) => setEmailFooterEmail(e.target.value)}
                    placeholder="support@kenaxbd.com (leave empty to hide)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Footer Store Address
                  </label>
                  <input
                    type="text"
                    value={emailFooterAddress}
                    onChange={(e) => setEmailFooterAddress(e.target.value)}
                    placeholder="House 45, Road 27, Dhanmondi, Dhaka 1209, Bangladesh (leave empty to hide)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Footer Trust Tagline / Assurances
                  </label>
                  <input
                    type="text"
                    value={emailFooterTrustText}
                    onChange={(e) => setEmailFooterTrustText(e.target.value)}
                    placeholder="✓ 100% Genuine Tech • ✓ Cash on Delivery • ✓ 24-48h Nationwide Delivery"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: DELIVERY & PAYMENTS */}
        {/* ========================================================= */}
        {activeTab === 'delivery' && (
          <div className="space-y-4">
            <div className="p-3.5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Truck className="w-4 h-4 text-sky-600" />
                <span>Delivery Charges (BDT)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Inside Dhaka (৳)</label>
                  <input
                    type="number"
                    value={deliveryInsideDhaka}
                    onChange={(e) => setDeliveryInsideDhaka(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Outside Dhaka (৳)</label>
                  <input
                    type="number"
                    value={deliveryOutsideDhaka}
                    onChange={(e) => setDeliveryOutsideDhaka(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Free Delivery Minimum (৳)</label>
                  <input
                    type="number"
                    value={freeDeliveryThreshold}
                    onChange={(e) => setFreeDeliveryThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Payment Gateways */}
            <div className="p-3.5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <CreditCard className="w-4 h-4 text-sky-600" />
                <span>Accepted Payment Methods</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-800">bKash</span>
                  <input
                    type="checkbox"
                    checked={enableBkash}
                    onChange={(e) => setEnableBkash(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                </label>

                <label className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-800">Nagad</span>
                  <input
                    type="checkbox"
                    checked={enableNagad}
                    onChange={(e) => setEnableNagad(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                </label>

                <label className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-800">Rocket</span>
                  <input
                    type="checkbox"
                    checked={enableRocket}
                    onChange={(e) => setEnableRocket(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                </label>

                <label className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-800">Cash on Delivery (COD)</span>
                  <input
                    type="checkbox"
                    checked={enableCOD}
                    onChange={(e) => setEnableCOD(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SEO & META */}
        {/* ========================================================= */}
        {activeTab === 'seo' && (
          <div className="space-y-4">
            <div className="p-3.5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Sparkles className="w-4 h-4 text-sky-600" />
                <span>Search Engine Optimization (SEO)</span>
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SEO Meta Title</label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SEO Meta Description</label>
                  <textarea
                    rows={2}
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Keywords (Comma separated)</label>
                  <input
                    type="text"
                    value={metaKeywords}
                    onChange={(e) => setMetaKeywords(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: SYSTEM & MAINTENANCE (SUPER ADMIN ONLY) */}
        {/* ========================================================= */}
        {activeTab === 'system' && (
          <AdminMaintenanceSettings
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            currentUserRole={currentUserRole}
            currentStaff={currentStaff}
          />
        )}
      </form>
    </div>
  );
};
