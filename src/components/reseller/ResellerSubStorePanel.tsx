import React, { useState } from 'react';
import {
  Globe,
  Store,
  Sparkles,
  Smartphone,
  Monitor,
  Copy,
  CheckCircle2,
  Share2,
  ExternalLink,
  Printer,
  Image as ImageIcon,
  Phone,
  MapPin,
  Save,
  Palette,
  Check,
  Code,
  ShieldCheck,
  Sliders,
  Package,
} from 'lucide-react';
import { ResellerUser } from '../../types/reseller';
import { Product } from '../../types';
import { updateResellerSubStoreConfig } from '../../lib/resellerStorage';

interface ResellerSubStorePanelProps {
  reseller: ResellerUser;
  products: Product[];
  lang?: 'bn' | 'en';
  onResellerUpdated: (updated: ResellerUser) => void;
  onUpgradePlanClick: () => void;
}

export const ResellerSubStorePanel: React.FC<ResellerSubStorePanelProps> = ({
  reseller,
  products = [],
  lang = 'bn',
  onResellerUpdated,
  onUpgradePlanClick,
}) => {
  const isBn = lang === 'bn';
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('desktop');

  // Form State
  const [subDomain, setSubDomain] = useState(
    reseller.subDomain || reseller.username || 'my-shop'
  );
  const [subStoreTitle, setSubStoreTitle] = useState(
    reseller.subStoreTitle || reseller.businessName || `${reseller.fullName}'s Store`
  );
  const [subStoreLogo, setSubStoreLogo] = useState(
    reseller.subStoreLogo || reseller.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
  );
  const [subStorePhone, setSubStorePhone] = useState(
    reseller.subStorePhone || reseller.phone || ''
  );
  const [subStoreAddress, setSubStoreAddress] = useState(
    reseller.subStoreAddress || reseller.address || 'Dhaka, Bangladesh'
  );
  const [subStoreTagline, setSubStoreTagline] = useState(
    reseller.subStoreTagline || 'অরিজিনাল ও অথেন্টিক গ্যাজেট ও ফ্যাশন কালেকশন'
  );
  const [subStoreThemeColor, setSubStoreThemeColor] = useState(
    reseller.subStoreThemeColor || '#10b981'
  );
  const [subStoreFbPixelId, setSubStoreFbPixelId] = useState(
    reseller.subStoreFbPixelId || reseller.subStoreFbPixelId || '678912345098765'
  );
  const [subStoreTikTokPixelId, setSubStoreTikTokPixelId] = useState(
    reseller.subStoreTikTokPixelId || 'CTIKTOK12398745'
  );
  const [subStoreCapiToken, setSubStoreCapiToken] = useState(
    reseller.subStoreCapiToken || ''
  );
  const [subStoreCustomInvoiceFooter, setSubStoreCustomInvoiceFooter] = useState(
    reseller.subStoreCustomInvoiceFooter ||
      `কেনাকাটার জন্য ধন্যবাদ! যেকোনো প্রয়োজনে ফোন করুন: ${reseller.phone}`
  );
  const [subStoreEnabled, setSubStoreEnabled] = useState(
    reseller.subStoreEnabled !== false
  );

  const publicStoreUrl = `https://kenaxbd.com/store/${subDomain.toLowerCase().trim()}?ref=${reseller.referralCode || reseller.id}`;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicStoreUrl);
    setCopiedUrl(true);
    showToast(isBn ? 'আপনার ওয়েবসাইট লিংক কপি হয়েছে!' : 'Storefront link copied!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSaveSubStore = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateResellerSubStoreConfig(reseller.id, {
      subDomain: subDomain.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      subStoreTitle,
      subStoreLogo,
      subStorePhone,
      subStoreAddress,
      subStoreTagline,
      subStoreThemeColor,
      subStoreFbPixelId,
      subStoreTikTokPixelId,
      subStoreCapiToken,
      subStoreCustomInvoiceFooter,
      subStoreEnabled,
    });

    if (updated) {
      onResellerUpdated(updated);
      showToast(isBn ? '🎉 সাব-স্টোর ও ইনভয়েস লোগো সফলভাবে সংরক্ষিত হয়েছে!' : '🎉 Sub-store & Invoice branding updated successfully!');
    }
  };

  // Preset Logos using SVG Data URIs (Hermetic & Production safe)
  const presetLogos = [
    {
      name: 'Fashion Hub',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%230f172a"/><path d="M30 40 L50 25 L70 40 L80 40 L80 85 L20 85 L20 40 Z" fill="none" stroke="%2310b981" stroke-width="5"/><circle cx="50" cy="50" r="10" fill="%2338bdf8"/></svg>',
    },
    {
      name: 'Gadget Store',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23064e3b"/><rect x="25" y="20" width="50" height="60" rx="8" fill="none" stroke="%2334d399" stroke-width="5"/><circle cx="50" cy="70" r="4" fill="%23fbbf24"/></svg>',
    },
    {
      name: 'Luxury Seal',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%23451a03"/><path d="M25 65 L35 35 L50 50 L65 35 L75 65 Z" fill="%23f59e0b"/><circle cx="50" cy="30" r="5" fill="%23fef08a"/></svg>',
    },
    {
      name: 'Modern Store',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%231e1b4b"/><path d="M30 35 C30 20 70 20 70 35 L80 40 L75 80 L25 80 L20 40 Z" fill="none" stroke="%23818cf8" stroke-width="5"/></svg>',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border border-emerald-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{isBn ? 'প্রিমিয়াম ভিআইপি ফিচার' : 'VIP Exclusive Feature'}</span>
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-emerald-400 font-bold">100% White-Label Customer Invoice & Website</span>
          </div>
          <h2 className="text-base sm:text-xl font-black">
            {isBn ? '🌐 ডেডিকেটেড অনলাইন ওয়েবসাইট ও হোয়াইট-লেবেল ইনভয়েস লোগো' : 'Dedicated Online Storefront & Custom Invoice Logo'}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {isBn
              ? 'আপনার ব্র্যান্ড নামে নিজস্ব সাব-ডোমেইন ওয়েবসাইট চালু করুন। কাস্টমারের ইনভয়েসে আপনার দোকানের নিজস্ব লোগো, নাম, মোবাইল নাম্বার ও কাস্টম মেসেজ প্রিন্ট হবে!'
              : 'Launch your dedicated online e-commerce website under your store name with custom logos, phone numbers, and personalized customer invoices.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedUrl ? (isBn ? 'কপি হয়েছে' : 'Copied!') : (isBn ? 'সাইট লিংক কপি' : 'Copy Site Link')}</span>
          </button>
          <a
            href={publicStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
          >
            <ExternalLink className="w-4 h-4 text-emerald-400" />
            <span>{isBn ? 'লাইভ ওয়েবসাইট ভিউ ↗' : 'View Live Store ↗'}</span>
          </a>
        </div>
      </div>

      {/* Main Grid: Form Settings & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Settings */}
        <form onSubmit={handleSaveSubStore} className="lg:col-span-7 space-y-5">
          {/* Card 1: Subdomain & Basic Store Details */}
          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-500" />
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {isBn ? '১. সাব-ডোমেইন ও শপ পরিচিতি' : '1. Subdomain & Store Identity'}
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={subStoreEnabled}
                  onChange={(e) => setSubStoreEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>{isBn ? 'স্টোর অ্যাক্টিভ রাখুন' : 'Enable Sub-Store'}</span>
              </label>
            </div>

            <div className="space-y-3">
              {/* Subdomain Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'আপনার সাব-ডোমেইন অ্যাড্রেস (Subdomain Slug):' : 'Your Subdomain URL Slug:'}
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">
                  <span className="px-3 text-slate-500 font-mono select-none bg-slate-100 dark:bg-slate-900 py-2.5 border-r border-slate-200 dark:border-slate-800 shrink-0">
                    kenaxbd.com/store/
                  </span>
                  <input
                    type="text"
                    value={subDomain}
                    onChange={(e) => setSubDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="my-fashion-hub"
                    required
                    className="flex-1 px-3 py-2.5 bg-transparent text-slate-900 dark:text-white font-mono focus:outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {isBn ? 'কাস্টমাররা সরাসরি এই লিংকে প্রবেশ করে আপনার শপ দেখতে পারবে।' : 'Customers visit this direct white-label store link.'}
                </p>
              </div>

              {/* Store Title & Tagline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isBn ? 'দোকানের নাম (Store Name):' : 'Store Name:'}
                  </label>
                  <input
                    type="text"
                    value={subStoreTitle}
                    onChange={(e) => setSubStoreTitle(e.target.value)}
                    placeholder="Shakil Gadget & Fashion"
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isBn ? 'ব্র্যান্ড থিম কালার (Theme Accent):' : 'Brand Theme Color:'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={subStoreThemeColor}
                      onChange={(e) => setSubStoreThemeColor(e.target.value)}
                      className="w-10 h-9 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer p-0.5 bg-transparent"
                    />
                    <input
                      type="text"
                      value={subStoreThemeColor}
                      onChange={(e) => setSubStoreThemeColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'দোকানের স্লোগান / ট্যাগলাইন:' : 'Store Tagline:'}
                </label>
                <input
                  type="text"
                  value={subStoreTagline}
                  onChange={(e) => setSubStoreTagline(e.target.value)}
                  placeholder="অরিজিনাল ও অথেন্টিক প্রোডাক্ট কিনুন লাভজনক দামে"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Custom Logo & White-Label Invoice Branding */}
          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Printer className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {isBn ? '২. হোয়াইট-লেবেল ইনভয়েস লোগো ও ফোন নাম্বার' : '2. White-Label Invoice Branding & Logo'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isBn ? 'কাস্টমারের প্রিন্ট ইনভয়েসে আপনার লোগো ও সাপোর্ট মোবাইল প্রিন্ট হবে।' : 'Printed directly on customer delivery receipts.'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Logo URL & Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'লোগো ইমেজ ইউআরএল (Logo Image URL):' : 'Custom Logo Image URL:'}
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    {subStoreLogo ? (
                      <img src={subStoreLogo} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <input
                    type="url"
                    value={subStoreLogo}
                    onChange={(e) => setSubStoreLogo(e.target.value)}
                    placeholder="https://yourdomain.com/logo.png"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                {/* Preset Avatars */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-bold">{isBn ? 'স্যাম্পল লোগো:' : 'Presets:'}</span>
                  {presetLogos.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSubStoreLogo(p.url)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isBn ? 'ইনভয়েসে প্রসেসিং ফোন নম্বর:' : 'Invoice Contact Phone:'}
                  </label>
                  <input
                    type="tel"
                    value={subStorePhone}
                    onChange={(e) => setSubStorePhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isBn ? 'ইনভয়েস ঠিকানা:' : 'Invoice Store Address:'}
                  </label>
                  <input
                    type="text"
                    value={subStoreAddress}
                    onChange={(e) => setSubStoreAddress(e.target.value)}
                    placeholder="Dhaka, Bangladesh"
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Custom Invoice Footer Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'ইনভয়েসের নিচের ধন্যবাদ মেসেজ (Custom Footer Message):' : 'Custom Invoice Thank You Footer:'}
                </label>
                <input
                  type="text"
                  value={subStoreCustomInvoiceFooter}
                  onChange={(e) => setSubStoreCustomInvoiceFooter(e.target.value)}
                  placeholder="কেনাকাটার জন্য ধন্যবাদ! যেকোনো প্রয়োজনে ফোন করুন..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Meta Facebook & TikTok Pixel Ads Setup */}
          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Code className="w-5 h-5 text-sky-500" />
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  {isBn ? '৩. মেটা ফেসবুক পিক্সেল ও টিকটক এডস ট্র্যাকিং' : '3. Facebook Pixel & TikTok Ad Tracking'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isBn ? 'আপনার ওয়েবসাইটের ট্রাফিক ও কনভার্সন সেলস সরাসরি আপনার অ্যাডস ম্যানেজারে হিট করবে।' : 'Track ViewContent, AddToCart, and Purchases directly.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'মেটা ফেসবুক পিক্সেল আইডি (Meta Pixel ID):' : 'Meta Pixel ID:'}
                </label>
                <input
                  type="text"
                  value={subStoreFbPixelId}
                  onChange={(e) => setSubStoreFbPixelId(e.target.value)}
                  placeholder="678912345098765"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isBn ? 'টিকটক পিক্সেল আইডি (TikTok Pixel ID):' : 'TikTok Pixel ID:'}
                </label>
                <input
                  type="text"
                  value={subStoreTikTokPixelId}
                  onChange={(e) => setSubStoreTikTokPixelId(e.target.value)}
                  placeholder="CTIKTOK12398745"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isBn ? 'ফেসবুক কনভার্সন এপিআই টোকেন (Meta CAPI Token - Optional):' : 'Meta Conversions API Token (CAPI):'}
              </label>
              <input
                type="password"
                value={subStoreCapiToken}
                onChange={(e) => setSubStoreCapiToken(e.target.value)}
                placeholder="EAAG1234567890abcdef..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isBn ? 'সেটিংস সংরক্ষণ ও ওয়েবসাইট সিঙ্ক করুন' : 'Save Settings & Sync Website'}</span>
          </button>
        </form>

        {/* Right Column: Live White-Label Store & Invoice Mockup Preview */}
        <div className="lg:col-span-5 space-y-5">
          {/* Device Preview Selector Header */}
          <div className="p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-500" />
                <span>{isBn ? 'লাইভ ওয়েবসাইট প্রিভিউ' : 'Live Storefront Mockup'}</span>
              </h3>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    previewDevice === 'mobile'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    previewDevice === 'desktop'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
              </div>
            </div>

            {/* Interactive Live Website Frame */}
            <div className={`mx-auto transition-all duration-200 bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden border-4 border-slate-800 shadow-2xl p-2.5 ${
              previewDevice === 'mobile' ? 'max-w-xs' : 'w-full'
            }`}>
              {/* Storefront Navigation Bar Mockup */}
              <div
                className="p-3 rounded-xl text-white flex items-center justify-between shadow-md mb-3"
                style={{ backgroundColor: subStoreThemeColor || '#10b981' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={subStoreLogo}
                    alt={subStoreTitle}
                    className="w-7 h-7 rounded-lg object-cover bg-white p-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate leading-tight">{subStoreTitle}</p>
                    <p className="text-[9px] opacity-90 truncate leading-none">{subStoreTagline}</p>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/20 font-bold shrink-0">
                  Cart (0)
                </span>
              </div>

              {/* Sample Product Catalog Grid Mockup */}
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                  {isBn ? 'জনপ্রিয় প্রোডাক্টস (Sample Products)' : 'Featured Collection'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {products.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      className="bg-slate-900 rounded-xl p-2 border border-slate-800 flex flex-col justify-between"
                    >
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-full aspect-square object-contain rounded-lg bg-slate-950 p-1 mb-1.5"
                      />
                      <p className="text-[10px] font-bold text-white line-clamp-1">{p.name}</p>
                      <div className="flex items-center justify-between mt-1 text-[10px]">
                        <span className="text-emerald-400 font-black">৳{p.suggestedResellerRetailPrice || Math.round(p.price * 1.2)}</span>
                        <span className="bg-emerald-600 text-white px-1.5 py-0.2 rounded text-[8px] font-bold">Order</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* White-Label Printed Customer Invoice Mockup */}
          <div className="p-5 rounded-2xl sm:rounded-3xl bg-white text-slate-900 border border-slate-300 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-xs sm:text-sm text-slate-900">
                  {isBn ? 'ইনভয়েস প্রিন্ট রসিদ মকআপ (Invoice Sample)' : 'Printed White-Label Receipt Preview'}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Customer Copy
              </span>
            </div>

            {/* Printed Header with Custom Reseller Store Logo & Name */}
            <div className="flex items-start justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <img
                  src={subStoreLogo}
                  alt={subStoreTitle}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-300 shrink-0"
                />
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-slate-900">{subStoreTitle}</h4>
                  <p className="text-[10px] text-slate-600 flex items-center gap-1">
                    <Phone className="w-2.5 h-2.5" />
                    <span>{subStorePhone}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{subStoreAddress}</span>
                  </p>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-600 font-mono">
                <p className="font-bold text-slate-900">INVOICE #INV-8890</p>
                <p>{new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            {/* Invoice Line Items */}
            <div className="text-xs space-y-1.5 font-mono">
              <div className="flex justify-between font-bold border-b border-slate-200 pb-1 text-[11px]">
                <span>Item</span>
                <span>Qty x Price</span>
                <span>Total</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-700">
                <span className="truncate max-w-[140px]">{products[0]?.name || 'Premium Product'}</span>
                <span>1 x ৳1,450</span>
                <span className="font-bold">৳1,450</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-700 border-t border-slate-100 pt-1">
                <span>Delivery Fee</span>
                <span>Steadfast</span>
                <span>৳120</span>
              </div>
              <div className="flex justify-between text-xs font-black text-emerald-800 border-t border-slate-300 pt-1">
                <span>Total Payable</span>
                <span>COD</span>
                <span>৳1,570</span>
              </div>
            </div>

            {/* Custom Thank-you Footer */}
            <div className="p-2.5 bg-slate-100 rounded-xl text-center text-[10px] font-bold text-slate-700 border border-slate-200">
              {subStoreCustomInvoiceFooter}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ResellerSubStorePanel;
