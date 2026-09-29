import React, { useState, useMemo } from 'react';
import {
  Globe,
  Sparkles,
  Smartphone,
  Monitor,
  Copy,
  CheckCircle2,
  Share2,
  ExternalLink,
  Flame,
  Clock,
  ShieldCheck,
  Truck,
  MessageSquare,
  Sliders,
  DollarSign,
  Package,
  Layers,
  ArrowUpRight,
  Eye,
  Rocket,
  TrendingUp,
} from 'lucide-react';
import { Product } from '../../types';
import { ResellerUser } from '../../types/reseller';

interface ResellerLandingPagePanelProps {
  reseller: ResellerUser;
  products: Product[];
  lang?: 'bn' | 'en';
  onOpenOrderModal: (product: Product) => void;
  onUpgradePlanClick: () => void;
  isFeatureAllowed?: boolean;
}

export const ResellerLandingPagePanel: React.FC<ResellerLandingPagePanelProps> = ({
  reseller,
  products = [],
  lang = 'bn',
  onOpenOrderModal,
  onUpgradePlanClick,
  isFeatureAllowed = true,
}) => {
  const isBn = lang === 'bn';
  const allowedProducts = useMemo(() => {
    return products.filter((p) => p.allowReselling !== false);
  }, [products]);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    allowedProducts[0]?.id || ''
  );
  const [headline, setHeadline] = useState(
    isBn
      ? 'সীমিত সময়ের জন্য বিশেষ ৫০% অফার! স্টক ফুরিয়ে যাওয়ার আগেই অর্ডার করুন'
      : 'Limited Time 50% Special Offer! Order now before stock runs out'
  );
  const [urgencyTimerMinutes, setUrgencyTimerMinutes] = useState(25);
  const [pixelId, setPixelId] = useState('678912345098765');
  const [whatsappNumber, setWhatsappNumber] = useState(reseller.phone || '01700000000');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Boost Campaign State
  const [boostBudget, setBoostBudget] = useState(500); // ৳500 per day
  const [boostDays, setBoostDays] = useState(3);
  const [boostTargetAudience, setBoostTargetAudience] = useState<'all_bd' | 'dhaka' | 'youth' | 'women'>('all_bd');
  const [boostSubmitted, setBoostSubmitted] = useState(false);

  const selectedProduct = useMemo(() => {
    return allowedProducts.find((p) => p.id === selectedProductId) || allowedProducts[0] || null;
  }, [allowedProducts, selectedProductId]);

  const wholesalePrice = selectedProduct?.resellerPrice || selectedProduct?.price || 0;
  const suggestedPrice = selectedProduct?.suggestedResellerRetailPrice || Math.round((selectedProduct?.price || 0) * 1.25);
  const profitMargin = suggestedPrice - wholesalePrice;

  const publicLandingUrl = `https://kenaxbd.com/landing/${selectedProduct?.slug || selectedProduct?.id || 'prod'}?ref=${reseller.referralCode || reseller.id}&pixel=${pixelId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLandingUrl);
    setCopiedUrl(true);
    setToastMsg(isBn ? 'ল্যান্ডিং পেজ লিংক কপি হয়েছে!' : 'Landing page URL copied to clipboard!');
    setTimeout(() => {
      setCopiedUrl(false);
      setToastMsg(null), 2500;
    });
  };

  const handleLaunchBoost = (e: React.FormEvent) => {
    e.preventDefault();
    setBoostSubmitted(true);
    setTimeout(() => {
      setBoostSubmitted(false);
      setToastMsg(
        isBn
          ? 'বুস্টিং ক্যাম্পেইন সফলভাবে তৈরি হয়েছে! আমাদের ডিজিটাল অ্যাড টিম কনফিগারেশন রিভিউ করছে।'
          : 'Boost campaign requested successfully! Digital ad team is reviewing the launch.'
      );
      setTimeout(() => setToastMsg(null), 3500);
    }, 1200);
  };

  if (!isFeatureAllowed && !reseller.isVIP && reseller.planId === 'basic') {
    return (
      <div className="p-8 sm:p-12 text-center bg-slate-900 rounded-3xl border border-amber-800/40 space-y-4 max-w-2xl mx-auto animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto border border-amber-500/30">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-lg sm:text-xl font-black text-white">
          {isBn ? '👑 প্রিমিয়াম ভিআইপি ফিচার: ল্যান্ডিং পেজ ও বুস্টিং' : '👑 Premium VIP Feature: Landing Page & Boosting'}
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          {isBn
            ? 'ল্যান্ডিং পেজ ক্রিয়েটর ফিচারটি প্রিমিয়াম ভিআইপি রিসেলারদের জন্য সংরক্ষিত। ল্যান্ডিং পেজের মাধ্যমে আপনি ফেসবুক/টিকটক বুস্টিং করে সরাসরি প্রতিদিন ৫০+ সেল জেনারেট করতে পারবেন।'
            : 'The Landing Page Generator is reserved for Premium VIP resellers to run Meta Pixel ads and generate 50+ sales daily.'}
        </p>
        <button
          type="button"
          onClick={onUpgradePlanClick}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 font-black text-xs transition-all shadow-xl cursor-pointer"
        >
          {isBn ? 'প্ল্যান আপগ্রেড করুন ↗' : 'Upgrade Plan ↗'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-emerald-950/80 border border-indigo-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
              {isBn ? 'প্রিমিয়াম ভিআইপি সার্ভিস' : 'Premium VIP Service'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-emerald-400 font-bold">Meta Pixel & TikTok Ads Ready</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white mt-1">
            {isBn ? 'প্রোডাক্ট ল্যান্ডিং পেজ ক্রিয়েটর ও ফেসবুক বুস্টিং' : 'Single Product Landing Page & Ad Booster'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            {isBn
              ? 'যেকোনো প্রোডাক্ট পছন্দ করে ১-ক্লিকে ফেসবুক বুস্টিং ও বিজ্ঞাপনের জন্য হাই-কনভার্টিং ল্যান্ডিং পেজ তৈরি ও পরিচালনা করুন।'
              : 'Generate 1-click high-converting single product landing pages with your custom pixel and launch ad boosts.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950 cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            <span>{copiedUrl ? (isBn ? 'কপি হয়েছে!' : 'Copied!') : (isBn ? 'ল্যান্ডিং পেজ লিংক কপি' : 'Copy Page Link')}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls & Right Mockup Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form Settings (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>{isBn ? 'ল্যান্ডিং পেজ কনফিগারেশন' : 'Landing Page Settings'}</span>
            </h3>

            {/* Product Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isBn ? 'বুস্টিংয়ের জন্য প্রোডাক্ট নির্বাচন করুন:' : 'Select Product for Boosting:'}
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-medium focus:border-emerald-500"
              >
                {allowedProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ({isBn ? 'মুনাফা:' : 'Profit:'} +৳{(p.suggestedResellerRetailPrice || Math.round(p.price * 1.25)) - (p.resellerPrice || p.price)})
                  </option>
                ))}
              </select>
            </div>

            {/* Headline */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isBn ? 'অফার হেডলাইন ও শিরোনাম:' : 'Offer Headline:'}
              </label>
              <textarea
                rows={2}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-emerald-500"
              />
            </div>

            {/* Urgency Countdown Timer */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isBn ? 'কাউন্টডাউন টাইমার (মিনিট):' : 'Offer Countdown (Minutes):'}
              </label>
              <input
                type="number"
                value={urgencyTimerMinutes}
                onChange={(e) => setUrgencyTimerMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-emerald-500"
                min={5}
                max={180}
              />
            </div>

            {/* Meta Pixel ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>{isBn ? 'মেটা / ফেসবুক পিক্সেল আইডি:' : 'Meta / Facebook Pixel ID:'}</span>
                <span className="text-[10px] text-emerald-400 font-normal">Conversion Tracking</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789012345"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:border-emerald-500"
              />
            </div>

            {/* WhatsApp Contact */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                {isBn ? 'হোয়াটসঅ্যাপ অর্ডার নম্বর:' : 'Direct WhatsApp Contact:'}
              </label>
              <input
                type="text"
                placeholder="017XXXXXXXX"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:border-emerald-500"
              />
            </div>

            {/* Profit Margin Box */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>{isBn ? 'কাস্টমার COD মূল্য:' : 'Customer COD Price:'}</span>
                <span className="font-bold text-white">৳{suggestedPrice}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{isBn ? 'হোলসেল কেনা খরচ:' : 'Wholesale Base Cost:'}</span>
                <span className="text-slate-300">৳{wholesalePrice}</span>
              </div>
              <div className="flex justify-between font-black text-emerald-400 border-t border-emerald-800/40 pt-1 text-sm">
                <span>{isBn ? 'প্রতি অর্ডারে আপনার লাভ:' : 'Your Profit / Order:'}</span>
                <span>+৳{profitMargin}</span>
              </div>
            </div>
          </div>

          {/* Ad Boost Campaign Launcher Box */}
          <div className="bg-slate-900 rounded-3xl border border-indigo-900/60 p-5 space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Rocket className="w-4 h-4 text-indigo-400" />
              <span>{isBn ? 'ফেসবুক/মেটা বুস্ট ক্যাম্পেইন সেটআপ' : 'Facebook / Meta Ad Boost Setup'}</span>
            </h3>

            <form onSubmit={handleLaunchBoost} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  {isBn ? 'দৈনিক বাজেট (Daily Ad Budget):' : 'Daily Ad Budget:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[300, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBoostBudget(amt)}
                      className={`py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                        boostBudget === amt
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      ৳{amt}/{isBn ? 'দিন' : 'day'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {isBn ? 'মেয়াদ (Days):' : 'Duration (Days):'}
                  </label>
                  <select
                    value={boostDays}
                    onChange={(e) => setBoostDays(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value={3}>3 {isBn ? 'দিন' : 'Days'}</option>
                    <option value={7}>7 {isBn ? 'দিন' : 'Days'}</option>
                    <option value={14}>14 {isBn ? 'দিন' : 'Days'}</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {isBn ? 'টার্গেট অডিয়েন্স:' : 'Target Audience:'}
                  </label>
                  <select
                    value={boostTargetAudience}
                    onChange={(e) => setBoostTargetAudience(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="all_bd">{isBn ? 'সারা বাংলাদেশ' : 'All Bangladesh'}</option>
                    <option value="dhaka">{isBn ? 'ঢাকা মেট্রো' : 'Dhaka Metro'}</option>
                    <option value="youth">{isBn ? '১৮-৩৫ বছর' : '18-35 Youth'}</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={boostSubmitted}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Rocket className="w-4 h-4" />
                <span>
                  {boostSubmitted
                    ? isBn ? 'ক্যাম্পেইন পাঠানো হচ্ছে...' : 'Submitting Boost...'
                    : isBn ? `বুস্ট ক্যাম্পেইন শুরু করুন (মোট: ৳${boostBudget * boostDays})` : `Launch Boost Campaign (Total: ৳${boostBudget * boostDays})`}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Interactive Mockup Preview (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-black text-white">
                {isBn ? 'লাইভ ল্যান্ডিং পেজ প্রিভিউ' : 'Live Ad Landing Page Preview'}
              </h3>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  previewDevice === 'mobile' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                  previewDevice === 'desktop' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
            </div>
          </div>

          {/* Device Mockup Container */}
          <div className="flex justify-center p-2 sm:p-4 bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden">
            <div
              className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-200 ${
                previewDevice === 'mobile' ? 'w-full max-w-sm' : 'w-full'
              }`}
            >
              {/* Urgency Banner */}
              <div className="bg-gradient-to-r from-rose-600 to-amber-600 text-white px-3 py-2 text-center text-xs font-bold flex items-center justify-center gap-1.5">
                <Flame className="w-3.5 h-3.5 fill-white animate-bounce" />
                <span>
                  {isBn
                    ? `অফার শেষ হতে বাকি: ${urgencyTimerMinutes}:45 মিনিট!`
                    : `Offer expires in: ${urgencyTimerMinutes}:45 mins!`}
                </span>
              </div>

              {/* Product Info Mockup */}
              <div className="p-4 space-y-3">
                <h4 className="font-black text-white text-xs sm:text-sm text-center leading-snug">
                  {headline}
                </h4>

                {selectedProduct && (
                  <div className="aspect-square max-h-56 mx-auto bg-slate-950 rounded-xl overflow-hidden p-2 flex items-center justify-center border border-slate-800">
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div className="text-center space-y-1">
                  <h5 className="font-bold text-white text-xs">{selectedProduct?.name}</h5>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg font-black text-emerald-400">৳{suggestedPrice}</span>
                    <span className="text-xs text-slate-500 line-through">৳{Math.round(suggestedPrice * 1.45)}</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-black">
                      Save 30%
                    </span>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800 text-[10px] text-center text-slate-400">
                  <div className="flex flex-col items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isBn ? 'সারা দেশে COD' : 'Nationwide COD'}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isBn ? '১০০% অরিজিনাল' : '100% Original'}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isBn ? '২-৩ দিনে ডেলিভারি' : 'Fast Delivery'}</span>
                  </div>
                </div>

                {/* Order Form Mockup */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-[11px]">
                  <p className="font-bold text-white text-center text-xs">
                    🛍️ {isBn ? 'অর্ডার কনফার্ম করতে নিচের ফর্মটি পূরণ করুন' : 'Fill Form to Confirm COD Order'}
                  </p>
                  <input
                    type="text"
                    disabled
                    placeholder={isBn ? 'আপনার নাম (Customer Name)' : 'Customer Name'}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 text-xs"
                  />
                  <input
                    type="text"
                    disabled
                    placeholder={isBn ? 'মোবাইল নম্বর (017XXXXXXXX)' : 'Mobile (017XXXXXXXX)'}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 text-xs"
                  />
                  <input
                    type="text"
                    disabled
                    placeholder={isBn ? 'সম্পূর্ণ ঠিকানা (Full Delivery Address)' : 'Full Delivery Address'}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 text-xs"
                  />
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs text-center shadow-md cursor-not-allowed"
                  >
                    {isBn ? `অর্ডার কনফার্ম করুন — ৳${suggestedPrice} (ক্যাশ অন ডেলিভারি)` : `Confirm Order — ৳${suggestedPrice} (Cash on Delivery)`}
                  </button>
                </div>

                {/* WhatsApp Chat Button */}
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-800/80 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{isBn ? 'হোয়াটসঅ্যাপে প্রশ্ন করুন' : 'Chat on WhatsApp'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
