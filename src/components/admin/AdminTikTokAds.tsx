import React, { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Sparkles,
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
  sendManualTikTokTestEvent,
} from '../../utils/pixelTracker';
import { useLanguage } from '../../context/LanguageContext';
import { SaasBarChart, SaasDonutChart, SaasLineAreaChart, CollapsibleAnalyticsPanel } from './charts/AdminCharts';

interface AdminTikTokAdsProps {
  siteSettings: SiteSettings;
  onUpdateSettings: (newSettings: Partial<SiteSettings> | SiteSettings) => Promise<void> | void;
  products?: Product[];
  orders?: Order[];
  currentRole: UserRole;
  onRecordAudit?: (action: string, module: string, target: string, details: string) => void;
}

export const AdminTikTokAds: React.FC<AdminTikTokAdsProps> = ({
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
        tiktok: {
          enabled: true,
          pixelId: '',
          eventsApiToken: '',
          testEventCode: '',
          enableAdvancedMatching: true,
          events: {
            pageView: true,
            viewContent: true,
            addToCart: true,
            initiateCheckout: true,
            purchase: true,
            search: true,
            completeRegistration: true,
            contact: true,
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

  const [tiktokServerStatus, setTiktokServerStatus] = useState<{
    status: 'connected' | 'not_configured' | 'error';
    enabled: boolean;
    pixelId: string;
    hasToken: boolean;
    testMode: boolean;
    testEventCode: string | null;
    lastEventAt: string | null;
    lastEventStatus: string | null;
    totalLogsCount: number;
  } | null>(null);

  const [tiktokCatalogHealth, setTiktokCatalogHealth] = useState<{
    totalEligibleProducts: number;
    inStockCount: number;
    outOfStockCount: number;
    catalogXmlUrl: string;
    catalogJsonUrl: string;
    currency: string;
  } | null>(null);

  const [isCheckingTikTokStatus, setIsCheckingTikTokStatus] = useState(false);
  const [showTikTokToken, setShowTikTokToken] = useState(false);
  const [tiktokServerLogs, setTiktokServerLogs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [tiktokTestEventStatus, setTiktokTestEventStatus] = useState<{
    running?: boolean;
    success?: boolean;
    message?: string;
  }>({});

  const checkLiveTikTokStatus = async () => {
    setIsCheckingTikTokStatus(true);
    try {
      const res = await fetch('/api/tiktok/status');
      if (res.ok) {
        const data = await res.json();
        setTiktokServerStatus(data);
      }
    } catch {}

    try {
      const catRes = await fetch('/api/tiktok/catalog/status');
      if (catRes.ok) {
        const catData = await catRes.json();
        setTiktokCatalogHealth(catData);
      }
    } catch {}

    try {
      const logsRes = await fetch('/api/tiktok/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (Array.isArray(logsData.logs)) {
          setTiktokServerLogs(logsData.logs);
        }
      }
    } catch {}

    setIsCheckingTikTokStatus(false);
  };

  useEffect(() => {
    checkLiveTikTokStatus();
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
          ? 'টিকটক অ্যাডস সেটিংস সফলভাবে সংরক্ষিত হয়েছে!'
          : 'TikTok Ads settings successfully saved!'
      );
      setTimeout(() => setSaveSuccessMsg(null), 4000);

      checkLiveTikTokStatus();

      if (onRecordAudit) {
        onRecordAudit(
          'TikTok Ads Settings Updated',
          'marketing',
          'tiktok-ads',
          `Updated TikTok Pixel ID (${advertiserState.tiktok?.pixelId || 'none'})`
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerTikTokTestEvent = async (
    eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'CompletePayment'
  ) => {
    setTiktokTestEventStatus({ running: true });
    try {
      const payload: Record<string, any> = {
        test_timestamp: new Date().toISOString(),
        test_mode: true,
      };

      if (eventName === 'CompletePayment') {
        payload.value = 1800;
        payload.currency = 'BDT';
        payload.order_id = `TT-TEST-ORD-${Date.now().toString(36).toUpperCase()}`;
        payload.description = 'TikTok Ads Test Purchase';
        payload.contents = [
          {
            content_id: products[0]?.id || 'prod_test',
            content_name: products[0]?.name || 'TikTok Trending Product',
            price: 1800,
            quantity: 1,
          },
        ];
      } else if (eventName === 'AddToCart' || eventName === 'ViewContent') {
        payload.value = 1450;
        payload.currency = 'BDT';
        payload.content_id = products[0]?.id || 'prod_test';
        payload.content_name = products[0]?.name || 'TikTok Trending Product';
      }

      const res = await sendManualTikTokTestEvent(eventName, payload, {
        ...siteSettings,
        advertiserSettings: advertiserState,
      });

      setTiktokTestEventStatus({
        running: false,
        success: res.success,
        message: res.message,
      });

      checkLiveTikTokStatus();

      setTimeout(() => {
        setTiktokTestEventStatus({ running: false });
      }, 5000);
    } catch (err: any) {
      setTiktokTestEventStatus({
        running: false,
        success: false,
        message: err.message,
      });
    }
  };

  const handleClearTikTokLogs = async () => {
    try {
      await fetch('/api/tiktok/logs', { method: 'DELETE' });
      setTiktokServerLogs([]);
      checkLiveTikTokStatus();
    } catch {}
  };

  const isTikTokActive = Boolean(advertiserState.tiktok?.enabled && advertiserState.tiktok?.pixelId);
  const isEventsApiActive = Boolean(isTikTokActive && advertiserState.tiktok?.eventsApiToken);

  const tiktokChartsData = React.useMemo(() => {
    const inStock =
      tiktokCatalogHealth?.inStockCount ??
      products.filter((p) => (p.stock ?? 0) > 0).length;
    const outOfStock =
      tiktokCatalogHealth?.outOfStockCount ??
      Math.max(0, products.length - inStock);

    const feedSlices = [
      { label: isBn ? 'স্টকে আছে (ফিডযোগ্য)' : 'In Stock (Eligible)', value: inStock, color: '#059669' },
      { label: isBn ? 'স্টক আউট' : 'Out of Stock', value: outOfStock, color: '#E11D48' },
    ];

    const tiktokAttributedOrders = orders.filter((o) => {
      const src = `${o.orderSource || ''} ${(o as any).utmSource || ''} ${(o as any).adNetwork || ''}`.toLowerCase();
      return src.includes('tiktok');
    });
    const sourceOrders = tiktokAttributedOrders.length > 0 ? tiktokAttributedOrders : orders;

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

    const orderTrend = Array.from(dailyMap.values())
      .sort((a, b) => a.ts - b.ts)
      .slice(-8)
      .map((d) => ({
        label: d.label,
        primary: d.revenue,
        secondary: d.count,
      }));

    const eventMap = new Map<string, number>();
    tiktokServerLogs.forEach((log) => {
      const name = log.event || log.event_name || 'Event';
      eventMap.set(name, (eventMap.get(name) || 0) + 1);
    });
    const eventBars = Array.from(eventMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      feedSlices,
      orderTrend,
      eventBars,
      hasChannelOrders: tiktokAttributedOrders.length > 0,
    };
  }, [tiktokCatalogHealth, products, orders, tiktokServerLogs, isBn]);

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{isBn ? 'টিকটক অ্যাডস ও পিক্সেল হাব' : 'TikTok Ads & Pixel Hub'}</span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                {isBn ? 'টিকটক পিক্সেল ও ইভেন্টস এপিআই' : 'TikTok Pixel & Events API'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'টিকটক ব্রাউজার পিক্সেল, সার্ভার-সাইড ইভেন্টস এপিআই ও ক্যাটালগ প্রোডাক্ট ফিড কনফিগারেশন'
                : 'Configure TikTok browser pixel, server-side Events API, and product catalog feeds'}
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
            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isSaving ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'সেটিংস সংরক্ষণ করুন' : 'Save Changes')}</span>
          </button>
        </div>
      </div>

      {/* 2. Live Server Status & Diagnostics Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-rose-950/40 to-slate-900 rounded-3xl p-6 border border-rose-900/40 text-white shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  {isBn ? 'লাইভ টিকটক ট্র্যাকিং স্ট্যাটাস ও সার্ভার ডায়াগনস্টিকস' : 'Live TikTok Tracking Status & Server Diagnostics'}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isTikTokActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isTikTokActive ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'সংযুক্ত নয়' : 'Not Connected')}
                </span>
                {isEventsApiActive && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {isBn ? 'ইভেন্টস এপিআই যুক্ত' : 'Events API Active'}
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-200/70 mt-0.5">
                {isBn
                  ? 'ডুয়াল টিকটক ট্র্যাকিং (ব্রাউজার + সার্ভার), অটোমেটিক ডিডুপ্লিকেশন ও অ্যাডভান্সড ম্যাচিং'
                  : 'Dual TikTok tracking (Browser + Server), automatic deduplication & advanced matching'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={checkLiveTikTokStatus}
              disabled={isCheckingTikTokStatus}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingTikTokStatus ? 'animate-spin' : ''}`} />
              <span>{isCheckingTikTokStatus ? (isBn ? 'যাচাই হচ্ছে...' : 'Checking...') : (isBn ? 'স্ট্যাটাস রিফ্রেশ' : 'Refresh Status')}</span>
            </button>
          </div>
        </div>

        {/* Quick Diagnostic Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-rose-900/30">
            <span className="text-[11px] font-medium text-slate-400">{isBn ? 'টিকটক পিক্সেল আইডি' : 'TikTok Pixel ID'}</span>
            <p className="text-sm font-black text-white font-mono mt-0.5 truncate">
              {advertiserState.tiktok?.pixelId || (isBn ? 'সেট করা নেই' : 'Not configured')}
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-rose-900/30">
            <span className="text-[11px] font-medium text-slate-400">{isBn ? 'ইভেন্টস এপিআই টোকেন' : 'Events API Token'}</span>
            <p className="text-sm font-black text-white mt-0.5 flex items-center gap-1.5">
              {advertiserState.tiktok?.eventsApiToken ? (
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

          <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-rose-900/30">
            <span className="text-[11px] font-medium text-slate-400">{isBn ? 'টিকটক ফিড পণ্য' : 'TikTok Catalog Feed'}</span>
            <p className="text-sm font-black text-white mt-0.5">
              {tiktokCatalogHealth?.totalEligibleProducts || products.length} {isBn ? 'টি পণ্য ফিডে' : 'products'}
            </p>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-rose-900/30">
            <span className="text-[11px] font-medium text-slate-400">{isBn ? 'সার্ভার ইভেন্ট লগ' : 'Server Event Logs'}</span>
            <p className="text-sm font-black text-white mt-0.5">
              {tiktokServerLogs.length} {isBn ? 'টি সংরক্ষিত' : 'logged'}
            </p>
          </div>
        </div>
      </div>

      <CollapsibleAnalyticsPanel
        title={isBn ? 'টিকটক ক্যাটালগ, ইভেন্ট ও কনভার্সন গ্রাফ' : 'TikTok Catalog, Signals & Revenue Analytics'}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SaasDonutChart
            title={isBn ? 'টিকটক ক্যাটালগ স্টক স্বাস্থ্য' : 'Catalog Feed Readiness'}
            subtitle={isBn ? 'স্টকে থাকা বনাম স্টক-আউট পণ্য' : 'In-stock eligible vs out-of-stock SKUs'}
            data={tiktokChartsData.feedSlices}
            centerLabel={isBn ? 'মোট পণ্য' : 'Feed SKUs'}
          />
          <SaasLineAreaChart
            title={
              tiktokChartsData.hasChannelOrders
                ? isBn ? 'টিকটক থেকে আসা অর্ডার ও আয়' : 'TikTok Attributed Orders & Revenue'
                : isBn ? 'স্টোর অর্ডার ও রেভিনিউ ট্রেন্ড' : 'Storewide Conversion Trend'
            }
            subtitle={isBn ? 'দৈনিক অর্ডার ও আয়ের তুলনা' : 'Daily order volume & billing trend'}
            data={tiktokChartsData.orderTrend}
            primaryLabel={isBn ? 'আয় (৳)' : 'Revenue (৳)'}
            secondaryLabel={isBn ? 'অর্ডার' : 'Orders'}
            primaryFormat="currency"
            secondaryFormat="number"
            primaryColor="#E11D48"
            secondaryColor="#0284C7"
          />
          <SaasBarChart
            title={isBn ? 'সার্ভার ইভেন্ট লগ (Events API)' : 'Logged Server Pixel Events'}
            subtitle={isBn ? 'সার্ভার-সাইড সিগন্যাল অনুযায়ী বিভাজন' : 'Live events captured via Events API'}
            data={tiktokChartsData.eventBars}
            barColor="#E11D48"
            emptyText={isBn ? 'এখনও কোনো সার্ভার ইভেন্ট লগ নেই' : 'Send a test event or wait for live traffic'}
          />
        </div>
      </CollapsibleAnalyticsPanel>

      {/* 3. Core TikTok Configuration Form */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-rose-600" />
              <span>{isBn ? 'টিকটক পিক্সেল ও ইভেন্টস এপিআই কনফিগারেশন' : 'TikTok Pixel & Events API Configuration'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'টিকটক অ্যাডস ম্যানেজার থেকে প্রাপ্ত পিক্সেল কোড আইডি ও এক্সেস টোকেন দিন'
                : 'Enter your TikTok Pixel ID and Events API Access Token from Ads Manager'}
            </p>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {advertiserState.tiktok?.enabled
                ? (isBn ? 'টিকটক ট্র্যাকিং সক্রিয়' : 'TikTok Tracking Enabled')
                : (isBn ? 'টিকটক ট্র্যাকিং বন্ধ' : 'TikTok Tracking Disabled')}
            </span>
            <input
              type="checkbox"
              checked={Boolean(advertiserState.tiktok?.enabled)}
              onChange={(e) =>
                setAdvertiserState((prev) => ({
                  ...prev,
                  tiktok: {
                    ...(prev.tiktok || { pixelId: '' }),
                    enabled: e.target.checked,
                  },
                }))
              }
              className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* TikTok Pixel ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isBn ? 'টিকটক পিক্সেল আইডি (TikTok Pixel ID) *' : 'TikTok Pixel ID *'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={advertiserState.tiktok?.pixelId || ''}
                onChange={(e) =>
                  setAdvertiserState((prev) => ({
                    ...prev,
                    tiktok: {
                      ...(prev.tiktok || { enabled: true }),
                      pixelId: e.target.value.trim(),
                    },
                  }))
                }
                placeholder="e.g. CXXXXXXXXXXXXXXX"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              {advertiserState.tiktok?.pixelId && (
                <button
                  type="button"
                  onClick={() => handleCopyText(advertiserState.tiktok?.pixelId || '', 'tt_pixel_id')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  title="Copy Pixel ID"
                >
                  {copiedKey === 'tt_pixel_id' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
            <span className="block text-[11px] text-slate-400 mt-1">
              {isBn
                ? 'টিকটক অ্যাডস ম্যানেজার > Assets > Events থেকে পিক্সেল আইডি কপি করুন।'
                : 'Copy your Pixel ID from TikTok Ads Manager > Assets > Events.'}
            </span>
          </div>

          {/* Events API Token */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isBn ? 'টিকটক ইভেন্টস এপিআই এক্সেস টোকেন' : 'TikTok Events API Access Token'}
              </label>
              <button
                type="button"
                onClick={() => setShowTikTokToken(!showTikTokToken)}
                className="text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {showTikTokToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showTikTokToken ? (isBn ? 'লুকান' : 'Hide') : (isBn ? 'দেখান' : 'Show')}</span>
              </button>
            </div>
            <input
              type={showTikTokToken ? 'text' : 'password'}
              value={advertiserState.tiktok?.eventsApiToken || ''}
              onChange={(e) =>
                setAdvertiserState((prev) => ({
                  ...prev,
                  tiktok: {
                    ...(prev.tiktok || { enabled: true, pixelId: '' }),
                    eventsApiToken: e.target.value.trim(),
                  },
                }))
              }
              placeholder="e.g. 7f9b8c7e6a5d4c3b2a1..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
            <span className="block text-[11px] text-slate-400 mt-1">
              {isBn
                ? 'TikTok Events Manager > Settings > Generate Access Token থেকে টোকেন কপি করুন।'
                : 'Generate your token from TikTok Events Manager > Settings > Events API.'}
            </span>
          </div>

          {/* Test Event Code */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isBn ? 'টেস্ট ইভেন্ট কোড (ঐচ্ছিক / লাইভ ডিবাগিংয়ের জন্য)' : 'Test Event Code (Optional / Live Testing)'}
            </label>
            <input
              type="text"
              value={advertiserState.tiktok?.testEventCode || ''}
              onChange={(e) =>
                setAdvertiserState((prev) => ({
                  ...prev,
                  tiktok: {
                    ...(prev.tiktok || { enabled: true, pixelId: '' }),
                    testEventCode: e.target.value.trim(),
                  },
                }))
              }
              placeholder="e.g. TEST12345"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
            <span className="block text-[11px] text-slate-400 mt-1">
              {isBn
                ? 'TikTok Events Manager > Test Events ট্যাব থেকে প্রাপ্ত কোডটি দিন।'
                : 'Enter code from TikTok Events Manager > Test Events tab.'}
            </span>
          </div>

          {/* Advanced Matching */}
          <div className="flex flex-col justify-center">
            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={advertiserState.tiktok?.enableAdvancedMatching !== false}
                  onChange={(e) =>
                    setAdvertiserState((prev) => ({
                      ...prev,
                      tiktok: {
                        ...(prev.tiktok || { enabled: true, pixelId: '' }),
                        enableAdvancedMatching: e.target.checked,
                      },
                    }))
                  }
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {isBn ? 'অ্যাডভান্সড ম্যাচিং সক্রিয় করুন (ফোন ও ইমেইল হ্যাশ)' : 'Enable Advanced Matching (SHA-256)'}
                </span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6.5">
                {isBn
                  ? 'চেকআউট প্রক্রিয়ায় কাস্টমারের মোবাইল নম্বর ও ইমেল নিরাপদ SHA-256 হ্যাশ আকারে টিকটকে পাঠানো হয়।'
                  : 'Customer phone and email are securely hashed using SHA-256 to increase TikTok match rate.'}
              </p>
            </div>
          </div>
        </div>

        {/* Granular Event Toggles */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
            {isBn ? 'সক্রিয় কনভার্সন ইভেন্টসমূহ (Pixel & Events API)' : 'Active Conversion Events (Pixel & Events API)'}
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'pageView', label: isBn ? 'PageView (সব পেজ)' : 'PageView (All Pages)', desc: isBn ? 'সাইট ব্রাউজিং' : 'Site navigation' },
              { key: 'viewContent', label: isBn ? 'ViewContent (পণ্য দর্শন)' : 'ViewContent (Product)', desc: isBn ? 'প্রোডাক্ট ভিউ' : 'Product view' },
              { key: 'search', label: isBn ? 'Search (অনুসন্ধান)' : 'Search (Queries)', desc: isBn ? 'সার্চ কুয়েরি' : 'Search queries' },
              { key: 'addToCart', label: isBn ? 'AddToCart (কার্ট যুক্ত)' : 'AddToCart (Cart)', desc: isBn ? 'কার্ট এড' : 'Add to cart' },
              { key: 'initiateCheckout', label: isBn ? 'InitiateCheckout (চেকআউট শুরু)' : 'InitiateCheckout', desc: isBn ? 'অর্ডার ফর্ম শুরু' : 'Checkout started' },
              { key: 'purchase', label: isBn ? 'CompletePayment (সফল পারচেজ)' : 'CompletePayment (Purchase)', desc: isBn ? 'সার্ভার ভেরিফাইড অর্ডার' : 'Verified order' },
              { key: 'completeRegistration', label: isBn ? 'CompleteRegistration (নিবন্ধন)' : 'CompleteRegistration', desc: isBn ? 'গ্রাহক একাউন্ট' : 'User account' },
              { key: 'contact', label: isBn ? 'Contact / Lead (যোগাযোগ)' : 'Contact / Lead', desc: isBn ? 'হোয়াটসঅ্যাপ ও কল' : 'WhatsApp & Calls' },
            ].map((ev) => {
              const isChecked = advertiserState.tiktok?.events?.[ev.key as keyof typeof advertiserState.tiktok.events] !== false;
              return (
                <label
                  key={ev.key}
                  className={`p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                    isChecked
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
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
                          tiktok: {
                            ...(prev.tiktok || { enabled: true, pixelId: '' }),
                            events: {
                              pageView: true,
                              viewContent: true,
                              addToCart: true,
                              initiateCheckout: true,
                              purchase: true,
                              search: true,
                              completeRegistration: true,
                              contact: true,
                              ...(prev.tiktok?.events || {}),
                              [ev.key]: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{ev.desc}</p>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. TikTok Product Catalog & Dynamic Showcase Feed */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-rose-600" />
              <span>{isBn ? 'টিকটক প্রোডাক্ট ক্যাটালগ ফিড (Video Shopping Ads)' : 'TikTok Product Catalog Feeds (Dynamic Showcase)'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'টিকটক শপিং বিজ্ঞাপন ও অটোমেটিক প্রোডাক্ট ক্যাটালগ সিঙ্কের জন্য লাইভ ফিড URL'
                : 'Live dynamic product feed URLs for TikTok Video Shopping and Catalog Ads'}
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            {tiktokCatalogHealth?.totalEligibleProducts || products.length} {isBn ? 'টি পণ্য ফিডে প্রস্তুত' : 'Eligible Products'}
          </span>
        </div>

        {/* XML & JSON Feed Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* XML RSS 2.0 Feed */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-rose-600" />
                <span>{isBn ? 'টিকটক ক্যাটালগ এক্সএমএল ফিড (সুপারিশকৃত)' : 'TikTok Catalog XML Feed (Recommended)'}</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                RSS 2.0 / BDT
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/tiktok/catalog.xml` : 'https://kenaxbd.com/api/tiktok/catalog.xml'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/api/tiktok/catalog.xml` : 'https://kenaxbd.com/api/tiktok/catalog.xml';
                  handleCopyText(url, 'tt_xml_feed');
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedKey === 'tt_xml_feed' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'tt_xml_feed' ? (isBn ? 'কপি হয়েছে!' : 'Copied!') : (isBn ? 'এক্সএমএল লিংক কপি করুন' : 'Copy XML Link')}</span>
              </button>
              <a
                href="/api/tiktok/catalog.xml"
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
                <Code className="w-3.5 h-3.5 text-pink-600" />
                <span>{isBn ? 'টিকটক ক্যাটালগ জেএসন ফিড' : 'TikTok Catalog JSON Feed'}</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-100 text-pink-700 dark:bg-pink-900/60 dark:text-pink-300">
                JSON API
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/tiktok/catalog.json` : 'https://kenaxbd.com/api/tiktok/catalog.json'}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? `${window.location.origin}/api/tiktok/catalog.json` : 'https://kenaxbd.com/api/tiktok/catalog.json';
                  handleCopyText(url, 'tt_json_feed');
                }}
                className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedKey === 'tt_json_feed' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'tt_json_feed' ? (isBn ? 'কপি হয়েছে!' : 'Copied!') : (isBn ? 'জেএসন লিংক কপি করুন' : 'Copy JSON Link')}</span>
              </button>
              <a
                href="/api/tiktok/catalog.json"
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
            <span>{isBn ? 'টিকটক বিজনেস সেন্টারে ক্যাটালগ সেটআপ করার নিয়মাবলী' : 'How to Setup Product Catalog in TikTok Ads Manager'}</span>
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[11px] flex items-center justify-center">১</span>
              <p className="font-bold text-slate-900 dark:text-white text-[11px]">
                {isBn ? 'বিজনেস সেন্টার খুলুন' : 'Open Business Center'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                {isBn ? 'Assets > Catalogs এ গিয়ে "Create Catalog" নির্বাচন করুন।' : 'Go to Assets > Catalogs and click "Create Catalog".'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[11px] flex items-center justify-center">২</span>
              <p className="font-bold text-slate-900 dark:text-white text-[11px]">
                {isBn ? 'ডাটা ফিড সিলেক্ট করুন' : 'Select Data Feed'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                {isBn ? '"Add Products" > "Data Feed Schedule" বেছে নিন।' : 'Choose "Add Products" > "Data Feed Schedule".'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[11px] flex items-center justify-center">৩</span>
              <p className="font-bold text-slate-900 dark:text-white text-[11px]">
                {isBn ? 'ফিড URL দিন' : 'Paste Feed URL'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                {isBn ? 'উপরের XML লিংকটি পেস্ট করে "Hourly" নির্বাচন করুন।' : 'Paste the XML Catalog URL and choose "Hourly".'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center">✓</span>
              <p className="font-bold text-slate-900 dark:text-white text-[11px]">
                {isBn ? 'অটো-সিঙ্ক সক্রিয়' : 'Automatic Sync Active'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                {isBn ? 'টিকটক ভিডিও শপিং বিজ্ঞাপনে সব পণ্য দেখা যাবে।' : 'Products will sync automatically for TikTok ads.'}
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
              <Zap className="w-4 h-4 text-rose-600" />
              <span>{isBn ? 'লাইভ টিকটক টেস্ট ইভেন্ট সিমুলেটর' : 'Live TikTok Test Event Simulator'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isBn
                ? 'ব্রাউজার পিক্সেল ও সার্ভার Events API একসাথে ট্র্যাকিং যাচাই করার জন্য টেস্ট ইভেন্ট পাঠান'
                : 'Dispatch real-time test events to verify TikTok browser and server delivery'}
            </p>
          </div>

          {tiktokTestEventStatus.message && (
            <span
              className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 ${
                tiktokTestEventStatus.success
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {tiktokTestEventStatus.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              <span>{tiktokTestEventStatus.message}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => handleTriggerTikTokTestEvent('PageView')}
            disabled={tiktokTestEventStatus.running}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <Eye className="w-4 h-4 text-rose-600" />
            <span>{isBn ? 'টেস্ট PageView' : 'Test PageView'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerTikTokTestEvent('ViewContent')}
            disabled={tiktokTestEventStatus.running}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <ShoppingBag className="w-4 h-4 text-rose-600" />
            <span>{isBn ? 'টেস্ট ViewContent' : 'Test ViewContent'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerTikTokTestEvent('AddToCart')}
            disabled={tiktokTestEventStatus.running}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <ShoppingCart className="w-4 h-4 text-rose-600" />
            <span>{isBn ? 'টেস্ট AddToCart' : 'Test AddToCart'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerTikTokTestEvent('InitiateCheckout')}
            disabled={tiktokTestEventStatus.running}
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4 text-rose-600" />
            <span>{isBn ? 'টেস্ট Checkout' : 'Test Checkout'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerTikTokTestEvent('CompletePayment')}
            disabled={tiktokTestEventStatus.running}
            className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 font-bold text-xs text-rose-900 dark:text-rose-100 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
          >
            <DollarSign className="w-4 h-4 text-rose-600" />
            <span>{isBn ? 'টেস্ট Purchase (CAPI)' : 'Test Purchase (CAPI)'}</span>
          </button>
        </div>
      </div>

      {/* 6. Real-Time TikTok Event Logs Stream */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-rose-600" />
            <span>
              {isBn ? 'সাম্প্রতিক টিকটক সার্ভার ও ব্রাউজার ইভেন্ট লগ' : 'Recent TikTok Server & Browser Event Logs'} ({tiktokServerLogs.length})
            </span>
          </h4>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={checkLiveTikTokStatus}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isBn ? 'রিফ্রেশ' : 'Refresh'}</span>
            </button>
            {tiktokServerLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearTikTokLogs}
                className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'লগ মুছুন' : 'Clear Logs'}</span>
              </button>
            )}
          </div>
        </div>

        {tiktokServerLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-bold text-slate-600 dark:text-slate-400">
              {isBn ? 'কোনো টিকটক ইভেন্ট লগ এখনও নেই' : 'No TikTok event logs recorded yet'}
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
                {tiktokServerLogs.slice(0, 30).map((log) => (
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
