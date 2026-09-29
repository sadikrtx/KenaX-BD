import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Target,
  Share2,
  DollarSign,
  Activity,
  Code,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Zap,
  Globe,
  Sliders,
  Check,
  Send,
  Eye,
  ShoppingBag,
  ShoppingCart,
  Play,
  Pause,
  BarChart3,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { ResellerUser, ResellerAdCampaign } from '../../types/reseller';
import { Product } from '../../types';
import {
  getResellerAdCampaigns,
  createResellerAdCampaign,
  updateResellerAdCampaignStatus,
} from '../../lib/resellerStorage';

interface ResellerAdsTrackerPanelProps {
  reseller: ResellerUser;
  products: Product[];
  lang?: 'bn' | 'en';
  onUpgradePlanClick: () => void;
  isFeatureAllowed?: boolean;
}

export const ResellerAdsTrackerPanel: React.FC<ResellerAdsTrackerPanelProps> = ({
  reseller,
  products = [],
  lang = 'bn',
  onUpgradePlanClick,
  isFeatureAllowed = true,
}) => {
  const isBn = lang === 'bn';
  const [campaigns, setCampaigns] = useState<ResellerAdCampaign[]>(() =>
    getResellerAdCampaigns().filter((c) => c.resellerId === reseller.id || reseller.isVIP)
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Campaign Form
  const [campaignTitle, setCampaignTitle] = useState('');
  const [platform, setPlatform] = useState<'facebook' | 'tiktok' | 'google' | 'instagram'>('facebook');
  const [pixelId, setPixelId] = useState(reseller.subStoreFbPixelId || '678912345098765');
  const [dailyLimitBDT, setDailyLimitBDT] = useState(500);
  const [budgetBDT, setBudgetBDT] = useState(2500);
  const [targetAudience, setTargetAudience] = useState('Dhaka & Chittagong (Age 18-38, Shopping Enthusiasts)');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Aggregated Performance Metrics
  const totalAdSpend = useMemo(() => campaigns.reduce((acc, c) => acc + c.spentBDT, 0), [campaigns]);
  const totalRevenue = useMemo(() => campaigns.reduce((acc, c) => acc + c.revenueBDT, 0), [campaigns]);
  const totalConversions = useMemo(() => campaigns.reduce((acc, c) => acc + c.conversions, 0), [campaigns]);
  const totalClicks = useMemo(() => campaigns.reduce((acc, c) => acc + c.clicks, 0), [campaigns]);
  const overallRoas = totalAdSpend > 0 ? (totalRevenue / totalAdSpend).toFixed(1) : '0.0';

  const handleToggleStatus = (campaignId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    updateResellerAdCampaignStatus(campaignId, nextStatus);
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaignId ? { ...c, status: nextStatus } : c))
    );
    showToast(isBn ? `ক্যাম্পেইন স্ট্যাটাস পরিবর্তন হয়েছে: ${nextStatus.toUpperCase()}` : `Campaign status set to ${nextStatus}`);
  };

  const handleCreateCampaignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle.trim()) {
      alert(isBn ? 'অনুগ্রহ করে ক্যাম্পেইনের নাম লিখুন।' : 'Enter a campaign title.');
      return;
    }

    const created = createResellerAdCampaign({
      resellerId: reseller.id,
      resellerName: reseller.fullName,
      resellerStoreName: reseller.subStoreTitle || reseller.businessName || reseller.fullName,
      campaignTitle,
      platform,
      pixelId,
      budgetBDT: Number(budgetBDT),
      spentBDT: 0,
      dailyLimitBDT: Number(dailyLimitBDT),
      targetAudience,
      clicks: 0,
      impressions: 0,
      conversions: 0,
      revenueBDT: 0,
      roas: 0,
      status: 'active',
      productIds: [selectedProductId],
    });

    setCampaigns([created, ...campaigns]);
    setIsCreateModalOpen(false);
    setCampaignTitle('');
    showToast(isBn ? '🎉 মেটা/টিকটক পিক্সেল অ্যাড ক্যাম্পেইন সফলভাবে চালু হয়েছে!' : '🎉 Ad campaign launched successfully!');
  };

  if (!isFeatureAllowed && !reseller.isVIP && reseller.planId === 'basic') {
    return (
      <div className="p-8 sm:p-12 text-center bg-slate-900 rounded-3xl border border-amber-800/40 space-y-4 max-w-2xl mx-auto animate-in fade-in text-white">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto border border-amber-500/30">
          <Target className="w-8 h-8" />
        </div>
        <h2 className="text-lg sm:text-xl font-black">
          {isBn ? '👑 প্রিমিয়াম ভিআইপি ফিচার: মেটা/টিকটক পিক্সেল এডস ট্র্যাকার' : '👑 VIP Exclusive: Meta & TikTok Pixel Ad Tracker'}
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          {isBn
            ? 'পিক্সেল ট্র্যাকিং ও অ্যাডস ক্যাম্পেইন ম্যানেজার ফিচারটি ভিআইপি রিসেলারদের জন্য উন্মুক্ত। পিক্সেল ট্র্যাকিংয়ের মাধ্যমে রিয়েল-টাইম ROAS ও কনভার্সন সেলস মনিটর করুন।'
            : 'Track Facebook & TikTok Pixel conversions, Return on Ad Spend (ROAS), and live CAPI events.'}
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
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg text-white">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase border border-indigo-500/30 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{isBn ? 'মেটা ও টিকটক এডিএস ট্র্যাকার' : 'Meta & TikTok CAPI Ads Hub'}</span>
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-emerald-400 font-bold">Real-time ROAS & Conversion Tracking</span>
          </div>
          <h2 className="text-base sm:text-xl font-black mt-1">
            {isBn ? '🎯 ফেসবুক/টিকটক পিক্সেল এডস ক্যাম্পেইন ও রিয়েল-টাইম ROAS ট্র্যাকিং' : 'Facebook & TikTok Ads Campaign & Live ROAS Analytics'}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {isBn
              ? 'আপনার শপের ফেসবুক ও টিকটক পিক্সেল অ্যাডস স্পেন্ড, ক্লিকস, কনভার্সন সেলস ও লাইভ ROAS ট্র্যাকিং করুন।'
              : 'Monitor ad spend, click-through rates, purchase conversions, and live return on ad spend (ROAS).'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isBn ? 'নতুন এড ক্যাম্পেইন চালু করুন' : 'Launch New Ad Campaign'}</span>
        </button>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Ad Spend */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{isBn ? 'মোট এডস স্পেন্ড (Ad Spend)' : 'Total Ad Spend'}</span>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            ৳{totalAdSpend.toLocaleString('en-BD')}
          </p>
          <p className="text-[10px] text-slate-500">{campaigns.length} {isBn ? 'টি সক্রিয় ক্যাম্পেইন' : 'campaigns'}</p>
        </div>

        {/* Metric 2: Total Conversions */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{isBn ? 'কনভার্সন সেলস (Purchases)' : 'Conversion Orders'}</span>
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {totalConversions}
          </p>
          <p className="text-[10px] text-slate-500">{totalClicks.toLocaleString('en-BD')} {isBn ? 'মোট ক্লিকস' : 'total clicks'}</p>
        </div>

        {/* Metric 3: Total Sales Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{isBn ? 'এডস থেকে মোট রেভিনিউ' : 'Ad Revenue'}</span>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
            ৳{totalRevenue.toLocaleString('en-BD')}
          </p>
          <p className="text-[10px] text-slate-500">{isBn ? 'পিক্সেল ভেরিফাইড সেলস' : 'Pixel verified'}</p>
        </div>

        {/* Metric 4: ROAS */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/80 dark:to-slate-900 border border-amber-300 dark:border-amber-800 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
            <span>{isBn ? 'গড় ROAS (Return On Spend)' : 'Average ROAS'}</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg sm:text-2xl font-black text-amber-700 dark:text-amber-300 tabular-nums">
            {overallRoas}x ROAS
          </p>
          <p className="text-[10px] text-amber-800 dark:text-amber-400 font-bold">
            {isBn ? '৳১ স্পেন্ডে ৳' + overallRoas + ' ইনকাম' : `৳1 spend returns ৳${overallRoas}`}
          </p>
        </div>
      </div>

      {/* Campaigns Table & List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              {isBn ? 'আপনার সক্রিয় অ্যাডস ক্যাম্পেইন তালিকা' : 'Active Ad Campaigns & Pixel Conversion Performance'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isBn ? 'ফেসবুক ও টিকটক পিক্সেল ডেটা রিয়েল-টাইমে আপডেট হচ্ছে।' : 'Live conversion events synced from Facebook & TikTok CAPI.'}
            </p>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Target className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {isBn ? 'কোনো অ্যাডস ক্যাম্পেইন পাওয়া যায়নি' : 'No ad campaigns found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {isBn ? 'আপনার প্রথম পিক্সেল ট্র্যাকিং অ্যাড ক্যাম্পেইন তৈরি করতে "নতুন এড ক্যাম্পেইন চালু করুন" বাটনে চাপ দিন।' : 'Launch your first Facebook/TikTok ad campaign to start tracking CAPI conversions.'}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? 'নতুন এড ক্যাম্পেইন তৈরি করুন' : 'Create Campaign'}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">{isBn ? 'ক্যাম্পেইন নাম' : 'Campaign'}</th>
                  <th className="px-4 py-3">{isBn ? 'প্ল্যাটফর্ম ও পিক্সেল' : 'Platform & Pixel'}</th>
                  <th className="px-4 py-3 text-right">{isBn ? 'দৈনিক বাজেট' : 'Daily Limit'}</th>
                  <th className="px-4 py-3 text-right">{isBn ? 'মোট স্পেন্ড' : 'Total Spend'}</th>
                  <th className="px-4 py-3 text-center">{isBn ? 'ক্লিকস/সেলস' : 'Clicks / Sales'}</th>
                  <th className="px-4 py-3 text-right">{isBn ? 'রেভিনিউ' : 'Revenue'}</th>
                  <th className="px-4 py-3 text-center">{isBn ? 'ROAS' : 'ROAS'}</th>
                  <th className="px-4 py-3 text-center">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="px-4 py-3 text-right">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white max-w-xs">
                      <p className="line-clamp-2">{c.campaignTitle}</p>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">{c.targetAudience}</p>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-block mb-1">
                        {c.platform}
                      </span>
                      <p className="font-mono text-[10px] text-slate-500">ID: {c.pixelId}</p>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      ৳{c.dailyLimitBDT}/day
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                      ৳{c.spentBDT.toLocaleString('en-BD')}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <p className="font-mono font-bold text-slate-900 dark:text-white">{c.clicks} clicks</p>
                      <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{c.conversions} sales</p>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono font-black text-sky-600 dark:text-sky-400">
                      ৳{c.revenueBDT.toLocaleString('en-BD')}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-1 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        {c.roas}x
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c.id, c.status)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        title={c.status === 'active' ? 'Pause Campaign' : 'Activate Campaign'}
                      >
                        {c.status === 'active' ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Launch New Ad Campaign */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl text-slate-900 dark:text-white my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                <h3 className="font-black text-base">
                  {isBn ? 'নতুন ফেসবুক/টিকটক পিক্সেল এডস তৈরি করুন' : 'Launch New Meta / TikTok Ad Campaign'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">
                  {isBn ? 'ক্যাম্পেইন নাম (Campaign Name):' : 'Campaign Title:'}
                </label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="🔥 Win Winter Hoodie & Jacket Special Ad"
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{isBn ? 'প্ল্যাটফর্ম:' : 'Platform:'}</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                  >
                    <option value="facebook">Meta Facebook Ads</option>
                    <option value="tiktok">TikTok Spark Ads</option>
                    <option value="google">Google Shopping Ads</option>
                    <option value="instagram">Instagram Direct Ad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">{isBn ? 'পিক্সেল আইডি:' : 'Pixel ID:'}</label>
                  <input
                    type="text"
                    value={pixelId}
                    onChange={(e) => setPixelId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{isBn ? 'দৈনিক স্পেন্ড লিমিট (BDT):' : 'Daily Limit (BDT):'}</label>
                  <input
                    type="number"
                    value={dailyLimitBDT}
                    onChange={(e) => setDailyLimitBDT(Number(e.target.value))}
                    min={200}
                    step={100}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">{isBn ? 'মোট বাজেট (BDT):' : 'Total Budget (BDT):'}</label>
                  <input
                    type="number"
                    value={budgetBDT}
                    onChange={(e) => setBudgetBDT(Number(e.target.value))}
                    min={500}
                    step={500}
                    required
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{isBn ? 'টার্গেট প্রডাক্ট:' : 'Promoted Product:'}</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Wholesale: ৳{p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{isBn ? 'টার্গেট অডিয়েন্স:' : 'Target Audience:'}</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Dhaka, Chittagong, Sylhet (Age 18-35)"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-md"
                >
                  {isBn ? 'ক্যাম্পেইন চালু করুন 🚀' : 'Launch Campaign 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ResellerAdsTrackerPanel;
