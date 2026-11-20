import React, { useState, useEffect } from 'react';
import {
  Target,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Zap,
  Globe,
  Sliders,
  Check,
  Eye,
  EyeOff,
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
  getRecentEventLogs,
  sendManualTestEvent,
  subscribeToEventLogs,
  TrackedEventLog,
  clearEventLogs,
} from '../../utils/pixelTracker';
import { useLanguage } from '../../context/LanguageContext';
import { SaasBarChart, SaasDonutChart, SaasLineAreaChart, CollapsibleAnalyticsPanel } from './charts/AdminCharts';

interface AdminFacebookAdsProps {
  siteSettings: SiteSettings;
  onUpdateSettings: (newSettings: Partial<SiteSettings> | SiteSettings) => Promise<void> | void;
  products?: Product[];
  orders?: Order[];
  currentRole: UserRole;
  onRecordAudit?: (action: string, module: string, target: string, details: string) => void;
}

export const AdminFacebookAds: React.FC<AdminFacebookAdsProps> = ({
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
        meta: {
          enabled: true,
          pixelId: '',
          capiToken: '',
          testEventCode: '',
          enableAdvancedMatching: true,
          events: {
            pageView: true,
            viewContent: true,
            addToCart: true,
            initiateCheckout: true,
            purchase: true,
            search: true,
            contact: true,
          },
        },
        adSpends: [],
        savedUTMs: [],
      }
    );
  });

  useEffect(() => {
    if (siteSettings.advertiserSettings) {
      setAdvertiserState(siteSettings.advertiserSettings);
    }
  }, [siteSettings.advertiserSettings]);

  const [metaServerStatus, setMetaServerStatus] = useState<{
    status: 'connected' | 'not_configured' | 'error';
    enabled: boolean;
    pixelId: string;
    hasToken: boolean;
    testMode: boolean;
    testEventCode: string | null;
    apiVersion: string;
    lastEventAt: string | null;
    lastEventStatus: string | null;
    totalLogsCount: number;
  } | null>(null);

  const [catalogHealth, setCatalogHealth] = useState<{
    totalEligibleProducts: number;
    inStockCount: number;
    outOfStockCount: number;
    catalogXmlUrl: string;
    catalogJsonUrl: string;
    currency: string;
  } | null>(null);

  const [isCheckingMetaStatus, setIsCheckingMetaStatus] = useState(false);
  const [showCapiToken, setShowCapiToken] = useState(false);
  const [metaServerLogs, setMetaServerLogs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [testEventStatus, setTestEventStatus] = useState<{
    running?: boolean;
    success?: boolean;
    message?: string;
  }>({});

  const checkLiveMetaStatus = async () => {
    setIsCheckingMetaStatus(true);
    try {
      const res = await fetch('/api/meta/status');
      if (res.ok) {
        const data = await res.json();
        setMetaServerStatus(data);
      }
    } catch {}

    try {
      const catRes = await fetch('/api/meta/catalog/status');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCatalogHealth(catData);
      }
    } catch {}

    try {
      const logsRes = await fetch('/api/meta/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (Array.isArray(logsData.logs)) {
          setMetaServerLogs(logsData.logs);
        }
      }
    } catch {}

    setIsCheckingMetaStatus(false);
  };

  useEffect(() => {
    checkLiveMetaStatus();
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
          ? 'ফেসবুক অ্যাডস সেটিংস সফলভাবে সংরক্ষিত হয়েছে!'
          : 'Facebook Ads settings successfully saved!'
      );
      setTimeout(() => setSaveSuccessMsg(null), 4000);

      checkLiveMetaStatus();

      if (onRecordAudit) {
        onRecordAudit(
          'Facebook Ads Settings Updated',
          'marketing',
          'facebook-ads',
          `Updated Meta Pixel ID (${advertiserState.meta?.pixelId || 'none'}), CAPI status`
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerTestEvent = async (
    eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase'
  ) => {
    setTestEventStatus({ running: true });
    try {
      const payload: Record<string, any> = {
        test_timestamp: new Date().toISOString(),
        test_mode: true,
      };

      if (eventName === 'Purchase') {
        payload.value = 1500;
        payload.currency = 'BDT';
        payload.order_id = `TEST-ORD-${Date.now().toString(36).toUpperCase()}`;
        payload.num_items = 1;
        payload.content_name = products[0]?.name || 'Test Product';
        payload.content_ids = [products[0]?.id || 'prod_test'];
      } else if (eventName === 'AddToCart' || eventName === 'ViewContent') {
        payload.value = 1200;
        payload.currency = 'BDT';
        payload.content_name = products[0]?.name || 'Test Product';
        payload.content_ids = [products[0]?.id || 'prod_test'];
      }

      const res = await sendManualTestEvent(eventName, payload, {
        ...siteSettings,
        advertiserSettings: advertiserState,
      });

      setTestEventStatus({
        running: false,
        success: res.success,
        message: res.message,
      });

      checkLiveMetaStatus();

      setTimeout(() => {
        setTestEventStatus({ running: false });
      }, 5000);
    } catch (err: any) {
      setTestEventStatus({
        running: false,
        success: false,
        message: err.message,
      });
    }
  };

  const handleClearMetaLogs = async () => {
    try {
      await fetch('/api/meta/logs', { method: 'DELETE' });
      setMetaServerLogs([]);
      checkLiveMetaStatus();
    } catch {}
  };

  const isMetaActive = Boolean(advertiserState.meta?.enabled && advertiserState.meta?.pixelId);
  const isCapiActive = Boolean(isMetaActive && advertiserState.meta?.capiToken);

  const metaChartsData = React.useMemo(() => {
    const inStock =
      catalogHealth?.inStockCount ??
      products.filter((p) => (p.stock ?? 0) > 0).length;
    const outOfStock =
      catalogHealth?.outOfStockCount ??
      Math.max(0, products.length - inStock);

    const feedSlices = [
      { label: isBn ? 'স্টকে আছে (ফিড প্রস্তুত)' : 'In Stock (Feed Ready)', value: inStock, color: '#059669' },
      { label: isBn ? 'স্টক আউট' : 'Out of Stock', value: outOfStock, color: '#E11D48' },
    ];

    const metaAttributedOrders = orders.filter((o) => {
      const src = `${o.orderSource || ''} ${(o as any).utmSource || ''} ${(o as any).adNetwork || ''}`.toLowerCase();
      return src.includes('facebook') || src.includes('meta') || src.includes('fb') || src.includes('instagram');
    });
    const sourceOrders = metaAttributedOrders.length > 0 ? metaAttributedOrders : orders;

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
    metaServerLogs.forEach((log) => {
      const name = log.event_name || log.event || 'Event';
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
      hasChannelOrders: metaAttributedOrders.length > 0,
    };
  }, [catalogHealth, products, orders, metaServerLogs, isBn]);

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{isBn ? 'ফেসবুক অ্যাডস ও পিক্সেল হাব' : 'Facebook Ads & Pixel Hub'}</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                {isBn ? 'মেটা পিক্সেল ও সার্ভার এপিআই' : 'Meta Pixel & Conversions API'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'ব্রাউজার পিক্সেল, সার্ভার-সাইড কনভার্সন এপিআই (CAPI) ও প্রোডাক্ট ক্যাটালগ ফিড কনফিগারেশন'
                : 'Configure browser pixel, server-side Conversions API (CAPI), and product catalog feeds'}
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
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isSaving ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'সেটিংস সংরক্ষণ করুন' : 'Save Changes')}</span>
          </button>
        </div>
      </div>

      {/* 2. Live Server Status & Diagnostics Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950/50 to-slate-900 rounded-3xl p-6 border border-blue-900/40 text-white shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  {isBn ? 'লাইভ মেটা ট্র্যাকিং স্ট্যাটাস ও সার্ভার ডায়াগনস্টিকস' : 'Live Meta Tracking Status & Server Diagnostics'}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isMetaActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isMetaActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'সংযুক্ত নয়' : 'Not Connected')}
                </span>
                {isCapiActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {isBn ? 'সার্ভার এপিআই যুক্ত' : 'Server CAPI Active'}
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-200/70 mt-0.5">
                {isBn
                  ? 'ডুয়াল ট্র্যাকিং (ব্রাউজার + সার্ভার), অটোমেটিক ডিডুপ্লিকেশন ও অ্যাডভান্সড ম্যাচিং'
                  : 'Dual tracking (Browser + Server), automatic deduplication & advanced customer matching'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={checkLiveMetaStatus}
              disabled={isCheckingMetaStatus}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingMetaStatus ? 'animate-spin' : ''}`} />
              <span>{isCheckingMetaStatus ? (isBn ? 'যাচাই হচ্ছে...' : 'Checking...') : (isBn ? 'স্ট্যাটাস রিফ্রেশ' : 'Refresh Status')}</span>
            </button>
          </div>
        </div>

        {/* Quick Diagnostic Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-blue-900/30">
            <span className="text-[11px] font-medium text-slate-400">{isBn ? 'মেটা পিক্সেল আইডি' : 'Meta Pixel ID'}</span>
            <p className="text-sm font-black text-white font-mono mt-0.5 truncate">
              {advertiserState.meta?.pixelId || (isBn ? 'সেট করা নেই' : 'Not configured')}
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-blue-900/30">
            <span className="text-[11px] font-medium text-slate-400">{isBn ? 'সার্ভার এপিআই টোকেন' : 'Conversions API Token'}</span>
            <p className="text-sm font-black text-white mt-0.5 flex items-center gap-1.5">
              {advertiserState.meta?.capiToken ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{isBn ? 'সংযুক্ত' : 'Configured'}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>{isBn ? 'দেওয়া হয়নি' : 'Not set'}</span>
                </>
              )}
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-blue-900/30">
            <span className="text-[11px] font-medium text-slate-400">{isBn ? 'ক্যাটালগ প্রোডাক্ট ফিড' : 'Catalog Product Feed'}</span>
            <p className="text-sm font-black text-white mt-0.5">
              {catalogHealth?.totalEligibleProducts || products.length} {isBn ? 'টি পণ্য যুক্ত' : 'products'}
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-blue-900/30">
            <span className="text-[11px] font-medium text-slate-400">{isBn ? 'মোট সার্ভার ইভেন্ট লগ' : 'Server Event Logs'}</span>
            <p className="text-sm font-black text-white mt-0.5">
              {metaServerLogs.length} {isBn ? 'টি সংরক্ষিত' : 'logged'}
            </p>
          </div>
        </div>
      </div>

      <CollapsibleAnalyticsPanel
        title={isBn ? 'মেটা ক্যাটালগ, CAPI সিগন্যাল ও কনভার্সন গ্রাফ' : 'Meta Catalog, CAPI Signals & Revenue Analytics'}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SaasDonutChart
            title={isBn ? 'মেটা ক্যাটালগ স্টক স্বাস্থ্য' : 'Meta Catalog Feed Health'}
            subtitle={isBn ? 'ইন-স্টক বনাম স্টক-আউট পণ্য' : 'In-stock eligible vs out-of-stock SKUs'}
            data={metaChartsData.feedSlices}
            centerLabel={isBn ? 'মোট পণ্য' : 'Feed SKUs'}
          />
          <SaasLineAreaChart
            title={
              metaChartsData.hasChannelOrders
                ? isBn ? 'মেটা অ্যাডস থেকে আসা অর্ডার ও আয়' : 'Meta Attributed Orders & Revenue'
                : isBn ? 'স্টোর কনভার্সন ও আয় ট্রেন্ড' : 'Storewide Conversion Trend'
            }
            subtitle={isBn ? 'দৈনিক অর্ডার ও বিক্রয় ট্রেন্ড' : 'Daily order volume & revenue'}
            data={metaChartsData.conversionTrend}
            primaryLabel={isBn ? 'আয় (৳)' : 'Revenue (৳)'}
            secondaryLabel={isBn ? 'অর্ডার' : 'Orders'}
            primaryFormat="currency"
            secondaryFormat="number"
            primaryColor="#2563EB"
            secondaryColor="#059669"
          />
          <SaasBarChart
            title={isBn ? 'CAPI সার্ভার ইভেন্ট লগ' : 'CAPI Server Event Breakdown'}
            subtitle={isBn ? 'সার্ভার-সাইড মেটা ইভেন্ট বিভাজন' : 'Live events sent to Meta Conversions API'}
            data={metaChartsData.eventBars}
            barColor="#2563EB"
            emptyText={isBn ? 'এখনও কোনো CAPI ইভেন্ট লগ নেই' : 'Send a test event or wait for live traffic'}
          />
        </div>
      </CollapsibleAnalyticsPanel>

      {/* 3. Core Meta Configuration Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>{isBn ? 'মেটা পিক্সেল ও কনভার্সন এপিআই কনফিগারেশন' : 'Meta Pixel & Conversions API Configuration'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'ফেসবুক ইভেন্টস ম্যানেজার থেকে প্রাপ্ত পিক্সেল আইডি ও এক্সেস টোকেন প্রবেশ করান'
                : 'Enter your Meta Pixel ID and Conversions API Access Token from Events Manager'}
            </p>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {advertiserState.meta?.enabled
                ? (isBn ? 'ফেসবুক ট্র্যাকিং সক্রিয়' : 'Facebook Tracking Enabled')
                : (isBn ? 'ফেসবুক ট্র্যাকিং বন্ধ' : 'Facebook Tracking Disabled')}
            </span>
            <input
              type="checkbox"
              checked={Boolean(advertiserState.meta?.enabled)}
              onChange={(e) =>
                setAdvertiserState((prev) => ({
                  ...prev,
                  meta: {
                    ...(prev.meta || { pixelId: '' }),
                    enabled: e.target.checked,
                  },
                }))
              }
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Primary Pixel ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isBn ? 'মেটা পিক্সেল আইডি (Meta Pixel ID) *' : 'Meta Pixel ID *'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={advertiserState.meta?.pixelId || ''}
                onChange={(e) =>
                  setAdvertiserState((prev) => ({
                    ...prev,
                    meta: {
                      ...(prev.meta || { enabled: true }),
                      pixelId: e.target.value.trim(),
                    },
                  }))
                }
                placeholder="e.g. 123456789012345"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {advertiserState.meta?.pixelId && (
                <button
                  type="button"
                  onClick={() => handleCopyText(advertiserState.meta?.pixelId || '', 'meta_pixel_id')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  title="Copy Pixel ID"
                >
                  {copiedKey === 'meta_pixel_id' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
            <span className="block text-[11px] text-slate-400 mt-1">
              {isBn
                ? 'মেটা ইভেন্টস ম্যানেজার থেকে প্রাপ্ত ১৫-১৬ সংখ্যার পিক্সেল আইডি দিন।'
                : 'Enter your 15-16 digit Meta Pixel ID from Events Manager.'}
            </span>
          </div>

          {/* CAPI Token */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isBn ? 'মেটা কনভার্সন এপিআই অ্যাক্সেস টোকেন (CAPI Token)' : 'Conversions API Access Token (System User)'}
              </label>
              <button
                type="button"
                onClick={() => setShowCapiToken(!showCapiToken)}
                className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {showCapiToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showCapiToken ? (isBn ? 'লুকান' : 'Hide') : (isBn ? 'দেখান' : 'Show')}</span>
              </button>
            </div>
            <input
              type={showCapiToken ? 'text' : 'password'}
              value={advertiserState.meta?.capiToken || ''}
              onChange={(e) =>
                setAdvertiserState((prev) => ({
                  ...prev,
                  meta: {
                    ...(prev.meta || { enabled: true, pixelId: '' }),
                    capiToken: e.target.value.trim(),
                  },
                }))
              }
              placeholder="e.g. EAAB..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <span className="block text-[11px] text-slate-400 mt-1">
              {isBn
                ? 'ইভেন্টস ম্যানেজার > সেটিংস > জেনারেট অ্যাক্সেস টোকেন থেকে টোকেন কপি করুন।'
                : 'Generate your access token from Meta Events Manager > Settings > Conversions API.'}
            </span>
          </div>

          {/* Test Event Code */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isBn ? 'টেস্ট ইভেন্ট কোড (ঐচ্ছিক / লাইভ ডিবাগিংয়ের জন্য)' : 'Test Event Code (Optional / For Live Testing)'}
            </label>
            <input
              type="text"
              value={advertiserState.meta?.testEventCode || ''}
              onChange={(e) =>
                setAdvertiserState((prev) => ({
                  ...prev,
                  meta: {
                    ...(prev.meta || { enabled: true, pixelId: '' }),
                    testEventCode: e.target.value.trim(),
                  },
                }))
              }
              placeholder="e.g. TEST12345"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <span className="block text-[11px] text-slate-400 mt-1">
              {isBn
                ? 'ইভেন্টস ম্যানেজার > টেস্ট ইভেন্টস ট্যাব থেকে প্রাপ্ত কোডটি এখানে দিন। লাইভ অর্ডারে এটি লাগবে না।'
                : 'Enter code from Events Manager > Test Events tab. Leave blank for live production orders.'}
            </span>
          </div>

          {/* Advanced Matching */}
          <div className="flex flex-col justify-center">
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={advertiserState.meta?.enableAdvancedMatching !== false}
                  onChange={(e) =>
                    setAdvertiserState((prev) => ({
                      ...prev,
                      meta: {
                        ...(prev.meta || { enabled: true, pixelId: '' }),
                        enableAdvancedMatching: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {isBn ? 'অ্যাডভান্সড ম্যাচিং সক্রিয় করুন (ফোন ও ইমেইল হ্যাশ)' : 'Enable Advanced Matching (SHA-256)'}
                </span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6.5">
                {isBn
                  ? 'চেকআউট প্রক্রিয়ায় কাস্টমারের মোবাইল নম্বর ও ইমেল নিরাপদ SHA-256 হ্যাশ আকারে মেটাতে পাঠানো হয়, যা ম্যাচ রেট বৃদ্ধি করে।'
                  : 'Customer phone and email are securely hashed using SHA-256 to increase Meta event match quality.'}
              </p>
            </div>
          </div>
        </div>

        {/* Granular Event Toggles */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
            {isBn ? 'সক্রিয় কনভার্সন ইভেন্টসমূহ (Pixel & CAPI)' : 'Active Conversion Events (Pixel & CAPI)'}
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'pageView', label: isBn ? 'PageView (সব পেজ)' : 'PageView (All Pages)', desc: isBn ? 'সাইট ব্রাউজিং' : 'Page navigation' },
              { key: 'viewContent', label: isBn ? 'ViewContent (পণ্য ভিউ)' : 'ViewContent (Product)', desc: isBn ? 'প্রোডাক্ট দর্শন' : 'Product view' },
              { key: 'search', label: isBn ? 'Search (অনুসন্ধান)' : 'Search (Queries)', desc: isBn ? 'সার্চ কুয়েরি' : 'Search queries' },
              { key: 'addToCart', label: isBn ? 'AddToCart (কার্ট যুক্ত)' : 'AddToCart (Cart)', desc: isBn ? 'কার্ট অ্যাকশন' : 'Add to cart' },
              { key: 'initiateCheckout', label: isBn ? 'InitiateCheckout (চেকআউট শুরু)' : 'InitiateCheckout', desc: isBn ? 'অর্ডার ফর্ম খোলা' : 'Checkout started' },
              { key: 'purchase', label: isBn ? 'Purchase (সফল অর্ডার)' : 'Purchase (Completed Order)', desc: isBn ? 'সার্ভার ভেরিফাইড অর্ডার' : 'Verified orders' },
              { key: 'contact', label: isBn ? 'Contact / Lead (যোগাযোগ)' : 'Contact / Lead', desc: isBn ? 'হোয়াটসঅ্যাপ ও কল' : 'WhatsApp & Calls' },
            ].map((ev) => {
              const isChecked = advertiserState.meta?.events?.[ev.key as keyof typeof advertiserState.meta.events] !== false;
              return (
                <label
                  key={ev.key}
                  className={`p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{ev.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setAdvertiserState((prev) => ({
                          ...prev,
                          meta: {
                            ...(prev.meta || { enabled: true, pixelId: '' }),
                            events: {
                              pageView: true,
                              viewContent: true,
                              addToCart: true,
                              initiateCheckout: true,
                              purchase: true,
                              search: true,
                              contact: true,
                              ...(prev.meta?.events || {}),
                              [ev.key]: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{ev.desc}</p>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Meta Product Catalog Feeds (XML & JSON) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <span>{isBn ? 'মেটা প্রোডাক্ট ক্যাটালগ ফিড (Facebook Dynamic Ads)' : 'Meta Product Catalog Feeds (Dynamic Ads)'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'ফেসবুক কমার্স ম্যানেজার ও ইনস্টাগ্রাম শপে অটোমেটিক প্রোডাক্ট সিঙ্কের জন্য লাইভ ফিড URL'
                : 'Live dynamic product feed URLs for Meta Commerce Manager and Instagram Shopping'}
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
            {catalogHealth?.totalEligibleProducts || products.length} {isBn ? 'টি পণ্য ফিডে প্রস্তুত' : 'Eligible Products'}
          </span>
        </div>

        {/* XML & JSON Feed Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* XML RSS 2.0 Feed */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-blue-600" />
                <span>{isBn ? 'মেটা ক্যাটালগ এক্সএমএল ফিড (সুপারিশকৃত)' : 'Meta Catalog XML Feed (Recommended)'}</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                RSS 2.0 / BDT
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/meta/catalog.xml` : 'https://kenaxbd.com/api/meta/catalog.xml'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/api/meta/catalog.xml` : 'https://kenaxbd.com/api/meta/catalog.xml';
                  handleCopyText(url, 'fb_xml_feed');
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedKey === 'fb_xml_feed' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'fb_xml_feed' ? (isBn ? 'কপি হয়েছে!' : 'Copied!') : (isBn ? 'এক্সএমএল লিংক কপি করুন' : 'Copy XML Link')}</span>
              </button>
              <a
                href="/api/meta/catalog.xml"
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
                <Code className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isBn ? 'মেটা ক্যাটালগ জেএসন ফিড' : 'Meta Catalog JSON Feed'}</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                JSON API
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/meta/catalog.json` : 'https://kenaxbd.com/api/meta/catalog.json'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/api/meta/catalog.json` : 'https://kenaxbd.com/api/meta/catalog.json';
                  handleCopyText(url, 'fb_json_feed');
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedKey === 'fb_json_feed' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'fb_json_feed' ? (isBn ? 'কপি হয়েছে!' : 'Copied!') : (isBn ? 'জেএসন লিংক কপি করুন' : 'Copy JSON Link')}</span>
              </button>
              <a
                href="/api/meta/catalog.json"
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
            <span>{isBn ? 'মেটা কমার্স ম্যানেজারে ক্যাটালগ সেটআপ করার নিয়মাবলী' : 'How to Setup Product Catalog in Meta Commerce Manager'}</span>
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">১</span>
              <p className="font-bold text-slate-900 dark:text-white text-[11px]">
                {isBn ? 'কমার্স ম্যানেজার খুলুন' : 'Open Commerce Manager'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                {isBn ? 'ফেসবুক বিজনেস সুইট থেকে ক্যাটালগ অপশনে যান।' : 'Navigate to Catalog > Data Sources in Commerce Manager.'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">২</span>
              <p className="font-bold text-slate-900 dark:text-white text-[11px]">
                {isBn ? 'ডাটা ফিড সিলেক্ট করুন' : 'Select Data Feed'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                {isBn ? '"Data Feed Schedule" বেছে নিন।' : 'Choose "Data Feed" and "Scheduled Feed".'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">৩</span>
              <p className="font-bold text-slate-900 dark:text-white text-[11px]">
                {isBn ? 'ফিড URL দিন' : 'Paste Feed URL'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                {isBn ? 'উপরের XML লিংকটি পেস্ট করুন।' : 'Paste the XML Catalog URL from above.'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center">✓</span>
              <p className="font-bold text-slate-900 dark:text-white text-[11px]">
                {isBn ? 'অটো-সিঙ্ক সক্রিয়' : 'Automatic Sync Active'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                {isBn ? 'প্রতি ঘণ্টায় নতুন পণ্য স্বয়ংক্রিয়ভাবে মেটাতে আপডেট হবে।' : 'Products will update hourly automatically.'}
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
              <Zap className="w-4 h-4 text-blue-600" />
              <span>{isBn ? 'লাইভ মেটা টেস্ট ইভেন্ট সিমুলেটর' : 'Live Meta Test Event Simulator'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'ব্রাউজার পিক্সেল ও সার্ভার CAPI একসাথে ট্র্যাকিং যাচাই করার জন্য টেস্ট ইভেন্ট পাঠান'
                : 'Dispatch real-time test events to verify dual browser and server delivery'}
            </p>
          </div>

          {testEventStatus.message && (
            <span
              className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 ${
                testEventStatus.success
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {testEventStatus.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{testEventStatus.message}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => handleTriggerTestEvent('PageView')}
            disabled={testEventStatus.running}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>{isBn ? 'টেস্ট PageView' : 'Test PageView'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerTestEvent('ViewContent')}
            disabled={testEventStatus.running}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            <span>{isBn ? 'টেস্ট ViewContent' : 'Test ViewContent'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerTestEvent('AddToCart')}
            disabled={testEventStatus.running}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span>{isBn ? 'টেস্ট AddToCart' : 'Test AddToCart'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerTestEvent('InitiateCheckout')}
            disabled={testEventStatus.running}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4 text-blue-600" />
            <span>{isBn ? 'টেস্ট Checkout' : 'Test Checkout'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerTestEvent('Purchase')}
            disabled={testEventStatus.running}
            className="p-3 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 font-bold text-xs text-blue-900 dark:text-blue-100 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span>{isBn ? 'টেস্ট Purchase (CAPI)' : 'Test Purchase (CAPI)'}</span>
          </button>
        </div>
      </div>

      {/* 6. Real-Time Meta Event Logs Stream */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-blue-600" />
            <span>
              {isBn ? 'সাম্প্রতিক মেটা সার্ভার ও ব্রাউজার ইভেন্ট লগ' : 'Recent Meta Server & Browser Event Logs'} ({metaServerLogs.length})
            </span>
          </h4>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={checkLiveMetaStatus}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
            {metaServerLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearMetaLogs}
                className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'লগ মুছুন' : 'Clear Logs'}</span>
              </button>
            )}
          </div>
        </div>

        {metaServerLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-bold text-slate-600 dark:text-slate-400">
              {isBn ? 'কোনো মেটা ইভেন্ট লগ এখনও নেই' : 'No Meta event logs recorded yet'}
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
                {metaServerLogs.slice(0, 30).map((log) => (
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
