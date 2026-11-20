import React, { useState, useEffect } from 'react';
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Zap,
  Sliders,
  Check,
  Eye,
  ShoppingBag,
  ShoppingCart,
  Code,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Plus,
  Trash2,
  Activity,
  ArrowRight,
} from 'lucide-react';
import {
  AdvertiserSettings,
  CampaignAdSpend,
  Order,
  Product,
  SiteSettings,
  UserRole,
} from '../../types';
import {
  sendManualGoogleTestEvent,
} from '../../utils/pixelTracker';
import { useLanguage } from '../../context/LanguageContext';
import { SaasBarChart, SaasDonutChart, SaasLineAreaChart, CollapsibleAnalyticsPanel } from './charts/AdminCharts';

interface AdminGoogleAdsProps {
  siteSettings: SiteSettings;
  onUpdateSettings: (newSettings: Partial<SiteSettings> | SiteSettings) => Promise<void> | void;
  products?: Product[];
  orders?: Order[];
  currentRole: UserRole;
  onRecordAudit?: (action: string, module: string, target: string, details: string) => void;
}

export const AdminGoogleAds: React.FC<AdminGoogleAdsProps> = ({
  siteSettings,
  onUpdateSettings,
  products = [],
  orders = [],
  currentRole,
  onRecordAudit,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [advertiserState, setAdvertiserState] = useState<AdvertiserSettings>(() => {
    return (
      siteSettings.advertiserSettings || {
        google: {
          enabled: true,
          ga4MeasurementId: '',
          gtmContainerId: '',
          googleAdsConversionId: '',
          googleAdsPurchaseLabel: '',
          googleAdsBeginCheckoutLabel: '',
          googleAdsAddToCartLabel: '',
          enableEnhancedConversions: true,
          enableEnhancedEcommerce: true,
          events: {
            pageView: true,
            viewItem: true,
            viewItemList: true,
            selectItem: true,
            search: true,
            addToCart: true,
            removeFromCart: true,
            beginCheckout: true,
            addPaymentInfo: true,
            purchase: true,
            signUp: true,
            generateLead: true,
          },
        },
      }
    );
  });

  useEffect(() => {
    if (siteSettings.advertiserSettings) {
      setAdvertiserState(siteSettings.advertiserSettings);
    }
  }, [siteSettings.advertiserSettings]);

  const [googleServerStatus, setGoogleServerStatus] = useState<{
    status: 'connected' | 'not_configured' | 'error';
    enabled: boolean;
    ga4Id: string | null;
    conversionId: string | null;
    hasEnhancedConversions: boolean;
    hasDataLayer: boolean;
    totalLogsCount: number;
  } | null>(null);

  const [googleMerchantHealth, setGoogleMerchantHealth] = useState<{
    totalEligibleProducts: number;
    inStockCount: number;
    outOfStockCount: number;
    merchantXmlUrl: string;
    merchantJsonUrl: string;
    currency: string;
  } | null>(null);

  const [isCheckingGoogleStatus, setIsCheckingGoogleStatus] = useState(false);
  const [googleServerLogs, setGoogleServerLogs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [googleTestEventStatus, setGoogleTestEventStatus] = useState<{
    running?: boolean;
    success?: boolean;
    message?: string;
  }>({});

  const checkLiveGoogleStatus = async () => {
    setIsCheckingGoogleStatus(true);
    try {
      const res = await fetch('/api/google/status');
      if (res.ok) {
        const data = await res.json();
        setGoogleServerStatus(data);
      }
    } catch {}

    try {
      const catRes = await fetch('/api/google/merchant/status');
      if (catRes.ok) {
        const catData = await catRes.json();
        setGoogleMerchantHealth(catData);
      }
    } catch {}

    try {
      const logsRes = await fetch('/api/google/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (Array.isArray(logsData.logs)) {
          setGoogleServerLogs(logsData.logs);
        }
      }
    } catch {}

    setIsCheckingGoogleStatus(false);
  };

  useEffect(() => {
    checkLiveGoogleStatus();
  }, []);

  const handleCopyText = (text: string, key: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {}
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const updatedSettings: SiteSettings = {
        ...siteSettings,
        advertiserSettings: advertiserState,
      };

      await onUpdateSettings(updatedSettings);

      setSaveSuccessMsg(
        isBn
          ? 'গুগল অ্যাডস সেটিংস সফলভাবে সংরক্ষিত হয়েছে!'
          : 'Google Ads settings successfully saved!'
      );
      setTimeout(() => setSaveSuccessMsg(null), 4000);

      checkLiveGoogleStatus();

      if (onRecordAudit) {
        onRecordAudit(
          'Google Ads Settings Updated',
          'marketing',
          'google-ads',
          `Updated GA4 ID (${advertiserState.google?.ga4MeasurementId || 'none'}), Google Ads Conversion ID (${advertiserState.google?.googleAdsConversionId || 'none'})`
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerGoogleTestEvent = async (
    eventName: 'page_view' | 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase'
  ) => {
    setGoogleTestEventStatus({ running: true });
    try {
      const payload: Record<string, any> = {
        test_timestamp: new Date().toISOString(),
        test_mode: true,
      };

      if (eventName === 'purchase') {
        payload.value = 1650;
        payload.currency = 'BDT';
        payload.transaction_id = `G-TEST-ORD-${Date.now().toString(36).toUpperCase()}`;
        payload.items = [
          {
            item_id: products[0]?.id || 'prod_test',
            item_name: products[0]?.name || 'Google Ads Featured Item',
            price: 1650,
            quantity: 1,
          },
        ];
      } else if (eventName === 'add_to_cart' || eventName === 'view_item') {
        payload.value = 1350;
        payload.currency = 'BDT';
        payload.items = [
          {
            item_id: products[0]?.id || 'prod_test',
            item_name: products[0]?.name || 'Google Ads Featured Item',
            price: 1350,
            quantity: 1,
          },
        ];
      }

      const res = await sendManualGoogleTestEvent(eventName, payload, {
        ...siteSettings,
        advertiserSettings: advertiserState,
      });

      setGoogleTestEventStatus({
        running: false,
        success: res.success,
        message: res.message,
      });

      checkLiveGoogleStatus();

      setTimeout(() => {
        setGoogleTestEventStatus({ running: false });
      }, 5000);
    } catch (err: any) {
      setGoogleTestEventStatus({
        running: false,
        success: false,
        message: err.message,
      });
    }
  };

  const handleClearGoogleLogs = async () => {
    try {
      await fetch('/api/google/logs', { method: 'DELETE' });
      setGoogleServerLogs([]);
      checkLiveGoogleStatus();
    } catch {}
  };

  const isGoogleActive = Boolean(
    advertiserState.google?.enabled &&
      (advertiserState.google?.ga4MeasurementId ||
        advertiserState.google?.gtmContainerId ||
        advertiserState.google?.googleAdsConversionId)
  );

  const googleChartsData = React.useMemo(() => {
    const inStock =
      googleMerchantHealth?.inStockCount ??
      products.filter((p) => (p.stock ?? 0) > 0).length;
    const outOfStock =
      googleMerchantHealth?.outOfStockCount ??
      Math.max(0, products.length - inStock);

    const feedSlices = [
      { label: isBn ? 'মার্চেন্ট ফিডে প্রস্তুত' : 'In Stock (Merchant Ready)', value: inStock, color: '#059669' },
      { label: isBn ? 'স্টক আউট' : 'Out of Stock', value: outOfStock, color: '#E11D48' },
    ];

    const googleAttributedOrders = orders.filter((o) => {
      const src = `${o.orderSource || ''} ${(o as any).utmSource || ''} ${(o as any).adNetwork || ''}`.toLowerCase();
      return src.includes('google') || src.includes('gclid');
    });
    const sourceOrders = googleAttributedOrders.length > 0 ? googleAttributedOrders : orders;

    const dailyMap = new Map<string, { label: string; ts: number; revenue: number; count: number }>();
    sourceOrders.forEach((o) => {
      const dt = o.createdAt ? new Date(o.createdAt) : null;
      if (!dt || isNaN(dt.getTime())) return;
      const key = dt.toISOString().slice(0, 10);
      const label = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const prev = dailyMap.get(key) || { label, ts: dt.getTime(), revenue: 0, count: 0 };
      if (o.orderStatus !== 'Cancelled') prev.revenue += o.totalAmount || 0;
      prev.count += 1;
      dailyMap.set(key, prev);
    });

    const conversionTrend = Array.from(dailyMap.values())
      .sort((a, b) => a.ts - b.ts)
      .slice(-8)
      .map((d) => ({
        label: d.label,
        primary: d.revenue,
        secondary: d.count,
      }));

    const eventMap = new Map<string, number>();
    googleServerLogs.forEach((log) => {
      const name = log.event || log.eventName || 'Event';
      eventMap.set(name, (eventMap.get(name) || 0) + 1);
    });
    const eventBars = Array.from(eventMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      feedSlices,
      conversionTrend,
      eventBars,
      hasChannelOrders: googleAttributedOrders.length > 0,
    };
  }, [googleMerchantHealth, products, orders, googleServerLogs, isBn]);

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{isBn ? 'গুগল অ্যাডস ও GA4 হাব' : 'Google Ads & GA4 Hub'}</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                {isBn ? 'গুগল ট্যাগ ও মার্চেন্ট ফিড' : 'Google Tag & Merchant Feed'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'গুগল ট্যাগ (gtag.js), GA4 মেজারমেন্ট, গুগল অ্যাডস কনভার্সন ট্র্যাকিং ও মার্চেন্ট ফিড কনফিগারেশন'
                : 'Configure Google Tag (gtag.js), GA4 Enhanced Ecommerce, Google Ads Conversions, and Merchant Center feed'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccessMsg && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {saveSuccessMsg}
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isSaving ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'সেটিংস সংরক্ষণ করুন' : 'Save Changes')}</span>
          </button>
        </div>
      </div>

      {/* 2. Live Server Status & Diagnostics Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 rounded-3xl p-6 border border-amber-900/40 text-white shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  {isBn ? 'লাইভ গুগল ট্র্যাকিং স্ট্যাটাস ও সার্ভার ডায়াগনস্টিকস' : 'Live Google Tracking Status & Server Diagnostics'}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isGoogleActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isGoogleActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'সংযুক্ত নয়' : 'Not Connected')}
                </span>
                {advertiserState.google?.enableEnhancedConversions && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    {isBn ? 'এনহ্যান্সড কনভার্সন চালু' : 'Enhanced Conversions Active'}
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-200/70 mt-0.5">
                {isBn
                  ? 'গুগল ট্যাগ (gtag.js), GA4 ই-কমার্স ডাটা লেয়ার ও গুগল মার্চেন্ট ফিড ইন্টিগ্রেশন'
                  : 'Google Tag (gtag.js), GA4 Enhanced Ecommerce data layer & Google Merchant Center'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={checkLiveGoogleStatus}
              disabled={isCheckingGoogleStatus}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGoogleStatus ? 'animate-spin' : ''}`} />
              <span>{isCheckingGoogleStatus ? (isBn ? 'যাচাই হচ্ছে...' : 'Checking...') : (isBn ? 'স্ট্যাটাস রিফ্রেশ' : 'Refresh Status')}</span>
            </button>
          </div>
        </div>

        {/* Quick Diagnostic Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-900/30">
            <span className="text-[11px] font-medium text-slate-400">{isBn ? 'GA4 মেজারমেন্ট আইডি' : 'GA4 Measurement ID'}</span>
            <p className="text-sm font-black text-white font-mono mt-0.5 truncate">
              {advertiserState.google?.ga4MeasurementId || (isBn ? 'সেট করা নেই' : 'Not configured')}
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-900/30">
            <span className="text-[11px] font-medium text-slate-400">{isBn ? 'গুগল অ্যাডস কনভার্সন আইডি' : 'Google Ads Conversion ID'}</span>
            <p className="text-sm font-black text-white font-mono mt-0.5 truncate">
              {advertiserState.google?.googleAdsConversionId || (isBn ? 'সেট করা নেই' : 'Not configured')}
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-900/30">
            <span className="text-[11px] font-medium text-slate-400">{isBn ? 'মার্চেন্ট ফিড পণ্য' : 'Google Merchant Feed'}</span>
            <p className="text-sm font-black text-white mt-0.5">
              {googleMerchantHealth?.totalEligibleProducts || products.length} {isBn ? 'টি পণ্য ফিডে' : 'products'}
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-900/30">
            <span className="text-[11px] font-medium text-slate-400">{isBn ? 'ট্র্যাক করা ইভেন্ট' : 'Tracked Events'}</span>
            <p className="text-sm font-black text-white mt-0.5">
              {googleServerLogs.length} {isBn ? 'টি সংরক্ষিত' : 'logged'}
            </p>
          </div>
        </div>
      </div>

      <CollapsibleAnalyticsPanel
        title={isBn ? 'মার্চেন্ট ফিড, GA4 ইভেন্ট ও কনভার্সন গ্রাফ' : 'Merchant Feed, GA4 Signals & Revenue Analytics'}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SaasDonutChart
            title={isBn ? 'মার্চেন্ট ফিড স্টক স্বাস্থ্য' : 'Merchant Catalog Health'}
            subtitle={isBn ? 'ইন-স্টক বনাম স্টক-আউট পণ্য' : 'In-stock eligible vs out-of-stock SKUs'}
            data={googleChartsData.feedSlices}
            centerLabel={isBn ? 'মোট পণ্য' : 'Feed SKUs'}
          />
          <SaasLineAreaChart
            title={
              googleChartsData.hasChannelOrders
                ? isBn ? 'গুগল থেকে আসা অর্ডার ও আয়' : 'Google Attributed Orders & Revenue'
                : isBn ? 'স্টোর কনভার্সন ও আয় ট্রেন্ড' : 'Storewide Conversion Trend'
            }
            subtitle={isBn ? 'দৈনিক অর্ডার ও বিক্রয় প্রবাহ' : 'Daily order count & revenue trend'}
            data={googleChartsData.conversionTrend}
            primaryLabel={isBn ? 'আয় (৳)' : 'Revenue (৳)'}
            secondaryLabel={isBn ? 'অর্ডার' : 'Orders'}
            primaryFormat="currency"
            secondaryFormat="number"
            primaryColor="#D97706"
            secondaryColor="#059669"
          />
          <SaasBarChart
            title={isBn ? 'GA4 / অ্যাডস ইভেন্ট লগ' : 'Captured GA4 / Ads Events'}
            subtitle={isBn ? 'ইভেন্ট টাইপ অনুযায়ী সংখ্যা' : 'Distribution by tracked Google tag events'}
            data={googleChartsData.eventBars}
            barColor="#D97706"
            emptyText={isBn ? 'এখনও কোনো ইভেন্ট লগ পাওয়া যায়নি' : 'Trigger a test event or wait for live traffic'}
          />
        </div>
      </CollapsibleAnalyticsPanel>

      {/* 3. Core Google Configuration Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>{isBn ? 'গুগল অ্যাডস ও GA4 কনফিগারেশন' : 'Google Ads & GA4 Tracking Configuration'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'গুগল অ্যানালিটিক্স ৪ মেজারমেন্ট আইডি, কনভার্সন আইডি এবং অ্যাকশন লেবেল সেট করুন'
                : 'Set GA4 Measurement ID, Google Ads Conversion ID, and action labels'}
            </p>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {advertiserState.google?.enabled
                ? (isBn ? 'গুগল ট্র্যাকিং সক্রিয়' : 'Google Tracking Enabled')
                : (isBn ? 'গুগল ট্র্যাকিং বন্ধ' : 'Google Tracking Disabled')}
            </span>
            <input
              type="checkbox"
              checked={Boolean(advertiserState.google?.enabled)}
              onChange={(e) =>
                setAdvertiserState((prev) => ({
                  ...prev,
                  google: {
                    ...(prev.google || {}),
                    enabled: e.target.checked,
                  },
                }))
              }
              className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* GA4 Measurement ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isBn ? 'GA4 মেজারমেন্ট আইডি (Google Analytics 4)' : 'GA4 Measurement ID (Google Analytics 4)'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={advertiserState.google?.ga4MeasurementId || ''}
                onChange={(e) =>
                  setAdvertiserState((prev) => ({
                    ...prev,
                    google: {
                      ...(prev.google || { enabled: true }),
                      ga4MeasurementId: e.target.value.trim(),
                    },
                  }))
                }
                placeholder="e.g. G-XXXXXXXXXX"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              {advertiserState.google?.ga4MeasurementId && (
                <button
                  type="button"
                  onClick={() => handleCopyText(advertiserState.google?.ga4MeasurementId || '', 'ga4_id')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  title="Copy GA4 ID"
                >
                  {copiedKey === 'ga4_id' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
            <span className="block text-[11px] text-slate-400 mt-1">
              {isBn
                ? 'Google Analytics > Admin > Data Streams থেকে Measurement ID কপি করুন।'
                : 'Copy Measurement ID from Google Analytics > Admin > Data Streams.'}
            </span>
          </div>

          {/* Google Ads Conversion ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isBn ? 'গুগল অ্যাডস কনভার্সন আইডি' : 'Google Ads Conversion ID'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={advertiserState.google?.googleAdsConversionId || ''}
                onChange={(e) =>
                  setAdvertiserState((prev) => ({
                    ...prev,
                    google: {
                      ...(prev.google || { enabled: true }),
                      googleAdsConversionId: e.target.value.trim(),
                    },
                  }))
                }
                placeholder="e.g. AW-123456789"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              {advertiserState.google?.googleAdsConversionId && (
                <button
                  type="button"
                  onClick={() => handleCopyText(advertiserState.google?.googleAdsConversionId || '', 'gads_id')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  title="Copy Conversion ID"
                >
                  {copiedKey === 'gads_id' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
            <span className="block text-[11px] text-slate-400 mt-1">
              {isBn
                ? 'Google Ads > Goals > Conversions থেকে Conversion ID (AW-XXXX) দিন।'
                : 'Enter your Conversion ID (AW-XXXX) from Google Ads > Conversions.'}
            </span>
          </div>

          {/* GTM Container ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isBn ? 'GTM কন্টেইনার আইডি (ঐচ্ছিক)' : 'Google Tag Manager Container ID (Optional)'}
            </label>
            <input
              type="text"
              value={advertiserState.google?.gtmContainerId || ''}
              onChange={(e) =>
                setAdvertiserState((prev) => ({
                  ...prev,
                  google: {
                    ...(prev.google || { enabled: true }),
                    gtmContainerId: e.target.value.trim(),
                  },
                }))
              }
              placeholder="e.g. GTM-XXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <span className="block text-[11px] text-slate-400 mt-1">
              {isBn
                ? 'যদি Google Tag Manager দিয়ে চালাতে চান তবে GTM ID দিন।'
                : 'Enter your GTM Container ID if managing tags via Google Tag Manager.'}
            </span>
          </div>
        </div>

        {/* Conversion Action Labels Grid */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
            {isBn ? 'গুগল অ্যাডস কনভার্সন অ্যাকশন লেবেলসমূহ' : 'Google Ads Conversion Action Labels'}
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isBn ? 'পারচেজ কনভার্সন লেবেল *' : 'Purchase Conversion Label *'}
              </label>
              <input
                type="text"
                value={advertiserState.google?.googleAdsPurchaseLabel || ''}
                onChange={(e) =>
                  setAdvertiserState((prev) => ({
                    ...prev,
                    google: {
                      ...(prev.google || { enabled: true }),
                      googleAdsPurchaseLabel: e.target.value.trim(),
                    },
                  }))
                }
                placeholder="e.g. abcDEF_purchase"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">
                {isBn ? 'সফল অর্ডার ট্র্যাকিং লেবেল' : 'Conversion label for verified purchases'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isBn ? 'চেকআউট শুরু কনভার্সন লেবেল' : 'Begin Checkout Conversion Label'}
              </label>
              <input
                type="text"
                value={advertiserState.google?.googleAdsBeginCheckoutLabel || ''}
                onChange={(e) =>
                  setAdvertiserState((prev) => ({
                    ...prev,
                    google: {
                      ...(prev.google || { enabled: true }),
                      googleAdsBeginCheckoutLabel: e.target.value.trim(),
                    },
                  }))
                }
                placeholder="e.g. abcDEF_checkout"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">
                {isBn ? 'চেকআউট শুরু ট্র্যাকিং' : 'Conversion label for initiated checkouts'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isBn ? 'কার্ট যুক্ত কনভার্সন লেবেল' : 'Add To Cart Conversion Label'}
              </label>
              <input
                type="text"
                value={advertiserState.google?.googleAdsAddToCartLabel || ''}
                onChange={(e) =>
                  setAdvertiserState((prev) => ({
                    ...prev,
                    google: {
                      ...(prev.google || { enabled: true }),
                      googleAdsAddToCartLabel: e.target.value.trim(),
                    },
                  }))
                }
                placeholder="e.g. abcDEF_cart"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">
                {isBn ? 'কার্ট অ্যাড ট্র্যাকিং' : 'Conversion label for add-to-cart'}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Conversions & Enhanced Ecommerce Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={advertiserState.google?.enableEnhancedConversions !== false}
                onChange={(e) =>
                  setAdvertiserState((prev) => ({
                    ...prev,
                    google: {
                      ...(prev.google || { enabled: true }),
                      enableEnhancedConversions: e.target.checked,
                    },
                  }))
                }
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {isBn ? 'গুগল অ্যাডস এনহ্যান্সড কনভার্সন (SHA-256 হ্যাশ)' : 'Google Ads Enhanced Conversions (SHA-256)'}
              </span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6.5">
              {isBn
                ? 'গ্রাহকের ফোন ও ইমেল প্রথম পক্ষীয় তথ্য হিসেবে হ্যাশ ফরম্যাটে পাঠিয়ে রূপান্তর পরিমাপের নির্ভুলতা বৃদ্ধি করে।'
                : 'Hashed customer data is sent securely to Google Ads to improve conversion measurement accuracy.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={advertiserState.google?.enableEnhancedEcommerce !== false}
                onChange={(e) =>
                  setAdvertiserState((prev) => ({
                    ...prev,
                    google: {
                      ...(prev.google || { enabled: true }),
                      enableEnhancedEcommerce: e.target.checked,
                    },
                  }))
                }
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {isBn ? 'GA4 এনহ্যান্সড ই-কমার্স ডাটা লেয়ার' : 'GA4 Enhanced Ecommerce & Data Layer'}
              </span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6.5">
              {isBn
                ? 'পণ্য দর্শন, কার্ট এবং পারচেজের ই-কমার্স ডাটা লেয়ার (window.dataLayer) GA4 ফরম্যাটে স্বয়ংক্রিয়ভাবে পুশ করে।'
                : 'Automatically pushes view_item, add_to_cart, and purchase events to window.dataLayer.'}
            </p>
          </div>
        </div>

        {/* Granular Event Toggles */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
            {isBn ? 'GA4 ও গুগল অ্যাডস স্ট্যান্ডার্ড কনভার্সন ইভেন্টসমূহ' : 'GA4 & Google Ads Standard Conversion Events'}
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'pageView', label: 'page_view', desc: isBn ? 'সব পেজ দর্শন' : 'Page views' },
              { key: 'viewItem', label: 'view_item', desc: isBn ? 'পণ্য ডিটেইলস' : 'Product view' },
              { key: 'viewItemList', label: 'view_item_list', desc: isBn ? 'ক্যাটালগ লিস্টিং' : 'Category view' },
              { key: 'selectItem', label: 'select_item', desc: isBn ? 'পণ্য ক্লিক' : 'Item click' },
              { key: 'search', label: 'search', desc: isBn ? 'অনুসন্ধান কুয়েরি' : 'Search queries' },
              { key: 'addToCart', label: 'add_to_cart', desc: isBn ? 'কার্ট যুক্ত' : 'Add to cart' },
              { key: 'beginCheckout', label: 'begin_checkout', desc: isBn ? 'চেকআউট শুরু' : 'Checkout start' },
              { key: 'purchase', label: 'purchase', desc: isBn ? 'সফল পারচেজ' : 'Completed order' },
              { key: 'signUp', label: 'sign_up', desc: isBn ? 'গ্রাহক নিবন্ধন' : 'User registration' },
              { key: 'generateLead', label: 'generate_lead', desc: isBn ? 'হোয়াটসঅ্যাপ ও লিড' : 'Lead generation' },
            ].map((ev) => {
              const isChecked =
                advertiserState.google?.events?.[ev.key as keyof typeof advertiserState.google.events] !== false;
              return (
                <label
                  key={ev.key}
                  className={`p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-white">{ev.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setAdvertiserState((prev) => ({
                          ...prev,
                          google: {
                            ...(prev.google || { enabled: true }),
                            events: {
                              pageView: true,
                              viewItem: true,
                              viewItemList: true,
                              selectItem: true,
                              search: true,
                              addToCart: true,
                              removeFromCart: true,
                              beginCheckout: true,
                              addPaymentInfo: true,
                              purchase: true,
                              signUp: true,
                              generateLead: true,
                              ...(prev.google?.events || {}),
                              [ev.key]: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{ev.desc}</p>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Google Merchant Center & Shopping Feed */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-600" />
              <span>{isBn ? 'গুগল মার্চেন্ট সেন্টার ও শপিং প্রোডাক্ট ফিড' : 'Google Merchant Center & Shopping Product Feeds'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'Google Shopping, Performance Max ও ফ্রি প্রোডাক্ট লিস্টিংয়ের জন্য লাইভ ফিড URL'
                : 'Live product feed URLs for Google Shopping and Performance Max campaigns'}
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {googleMerchantHealth?.totalEligibleProducts || products.length} {isBn ? 'টি পণ্য ফিডে প্রস্তুত' : 'Eligible Products'}
          </span>
        </div>

        {/* XML & JSON Feed Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* XML Google Shopping Feed */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-amber-600" />
                <span>{isBn ? 'গুগল মার্চেন্ট এক্সএমএল ফিড (সুপারিশকৃত)' : 'Google Merchant XML Feed (Recommended)'}</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                RSS 2.0 / BDT
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/google/merchant.xml` : 'https://kenaxbd.com/api/google/merchant.xml'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/api/google/merchant.xml` : 'https://kenaxbd.com/api/google/merchant.xml';
                  handleCopyText(url, 'g_xml_feed');
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedKey === 'g_xml_feed' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'g_xml_feed' ? (isBn ? 'কপি হয়েছে!' : 'Copied!') : (isBn ? 'এক্সএমএল লিংক কপি করুন' : 'Copy XML Link')}</span>
              </button>
              <a
                href="/api/google/merchant.xml"
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors"
                title="Open XML Feed"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* JSON Feed */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-yellow-600" />
                <span>{isBn ? 'গুগল মার্চেন্ট জেএসন ফিড' : 'Google Merchant JSON Feed'}</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/60 dark:text-yellow-300">
                JSON API
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/google/merchant.json` : 'https://kenaxbd.com/api/google/merchant.json'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/api/google/merchant.json` : 'https://kenaxbd.com/api/google/merchant.json';
                  handleCopyText(url, 'g_json_feed');
                }}
                className="px-3 py-1.5 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedKey === 'g_json_feed' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'g_json_feed' ? (isBn ? 'কপি হয়েছে!' : 'Copied!') : (isBn ? 'জেএসন লিংক কপি করুন' : 'Copy JSON Link')}</span>
              </button>
              <a
                href="/api/google/merchant.json"
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors"
                title="Open JSON Feed"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Step-by-Step Setup Guide */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{isBn ? 'গুগল মার্চেন্ট সেন্টারে ফিড সেটআপ করার নিয়মাবলী' : 'How to Setup Feed in Google Merchant Center'}</span>
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[11px] flex items-center justify-center">১</span>
              <p className="font-bold text-slate-900 dark:text-white text-[11px]">
                {isBn ? 'মার্চেন্ট সেন্টার খুলুন' : 'Open Merchant Center'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                {isBn ? 'Google Merchant Center > Products > Feeds এ যান।' : 'Navigate to Products > Feeds.'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[11px] flex items-center justify-center">২</span>
              <p className="font-bold text-slate-900 dark:text-white text-[11px]">
                {isBn ? 'Primary Feed তৈরি করুন' : 'Add Primary Feed'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                {isBn ? 'Target country: Bangladesh ও Language: Bengali/English দিন।' : 'Set country and currency to BDT.'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[11px] flex items-center justify-center">৩</span>
              <p className="font-bold text-slate-900 dark:text-white text-[11px]">
                {isBn ? 'Scheduled Fetch নির্বাচন করুন' : 'Choose Scheduled Fetch'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                {isBn ? 'উপরের XML লিংকটি পেস্ট করে "Daily" নির্বাচন করুন।' : 'Paste the XML feed URL and set Daily fetch.'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center">✓</span>
              <p className="font-bold text-slate-900 dark:text-white text-[11px]">
                {isBn ? 'Google Shopping সক্রিয়' : 'Shopping Ads Active'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                {isBn ? 'গুগল সার্চ ও শপিং ট্যাবে প্রোডাক্ট লিস্টিং স্বয়ংক্রিয়ভাবে চলবে।' : 'Products will list automatically on Google Shopping.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Live Test Event Simulator */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>{isBn ? 'লাইভ গুগল অ্যাডস ও GA4 টেস্ট ইভেন্ট সিমুলেটর' : 'Live Google Ads & GA4 Test Event Simulator'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'ব্রাউজার gtag.js এবং dataLayer ইভেন্ট ডেলিভারি যাচাই করার জন্য টেস্ট ইভেন্ট পাঠান'
                : 'Dispatch real-time test events to verify gtag.js and dataLayer event delivery'}
            </p>
          </div>

          {googleTestEventStatus.message && (
            <span
              className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 ${
                googleTestEventStatus.success
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {googleTestEventStatus.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{googleTestEventStatus.message}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => handleTriggerGoogleTestEvent('page_view')}
            disabled={googleTestEventStatus.running}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <Eye className="w-4 h-4 text-amber-600" />
            <span>{isBn ? 'টেস্ট page_view' : 'Test page_view'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerGoogleTestEvent('view_item')}
            disabled={googleTestEventStatus.running}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <ShoppingBag className="w-4 h-4 text-amber-600" />
            <span>{isBn ? 'টেস্ট view_item' : 'Test view_item'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerGoogleTestEvent('add_to_cart')}
            disabled={googleTestEventStatus.running}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <ShoppingCart className="w-4 h-4 text-amber-600" />
            <span>{isBn ? 'টেস্ট add_to_cart' : 'Test add_to_cart'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerGoogleTestEvent('begin_checkout')}
            disabled={googleTestEventStatus.running}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4 text-amber-600" />
            <span>{isBn ? 'টেস্ট begin_checkout' : 'Test begin_checkout'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerGoogleTestEvent('purchase')}
            disabled={googleTestEventStatus.running}
            className="p-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 font-bold text-xs text-amber-900 dark:text-amber-100 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span>{isBn ? 'টেস্ট purchase' : 'Test purchase'}</span>
          </button>
        </div>
      </div>

      {/* 6. Real-Time Google Event Logs Stream */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-amber-600" />
            <span>
              {isBn ? 'সাম্প্রতিক গুগল ইভেন্ট লগ' : 'Recent Google Ads & GA4 Event Logs'} ({googleServerLogs.length})
            </span>
          </h4>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={checkLiveGoogleStatus}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
            {googleServerLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearGoogleLogs}
                className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'লগ মুছুন' : 'Clear Logs'}</span>
              </button>
            )}
          </div>
        </div>

        {googleServerLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-bold text-slate-600 dark:text-slate-400">
              {isBn ? 'কোনো গুগল ইভেন্ট লগ এখনও নেই' : 'No Google event logs recorded yet'}
            </p>
            <p className="text-[11px] mt-0.5">
              {isBn ? 'উপরের বাটনগুলো চেপে টেস্ট ইভেন্ট পাঠিয়ে যাচাই করুন।' : 'Click the test buttons above to simulate live events.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="py-2.5 px-3">{isBn ? 'ইভেন্ট নাম' : 'Event Name'}</th>
                  <th className="py-2.5 px-3">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                  <th className="py-2.5 px-3">{isBn ? 'ডিডুপ্লিকেশন আইডি' : 'Deduplication ID'}</th>
                  <th className="py-2.5 px-3">{isBn ? 'সময়' : 'Timestamp'}</th>
                  <th className="py-2.5 px-3">{isBn ? 'বিস্তারিত / রেসপন্স' : 'Details / Response'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {googleServerLogs.slice(0, 30).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white font-sans">
                      {log.eventName}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          log.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : log.status === 'simulated'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-[11px]">
                      {log.eventId}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-sans text-[11px] max-w-[250px] truncate">
                      {log.details || log.error || 'Delivered'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
