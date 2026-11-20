import React, { useState, useEffect, useMemo } from 'react';
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
  HelpCircle,
  Check,
  Send,
  Eye,
  EyeOff,
  ShoppingBag,
  ShoppingCart,
  QrCode,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  AdvertiserSettings,
  CampaignAdSpend,
  Order,
  Product,
  SavedUTMLink,
  SiteSettings,
  UserRole,
} from '../../types';
import {
  getRecentEventLogs,
  sendManualTestEvent,
  sendManualTikTokTestEvent,
  sendManualGoogleTestEvent,
  subscribeToEventLogs,
  TrackedEventLog,
  clearEventLogs,
} from '../../utils/pixelTracker';
import { FacebookROIVisualizer } from './FacebookROIVisualizer';
import { QuickCampaignToggleOverlay } from './QuickCampaignToggleOverlay';
import {
  SaasDonutChart,
  SaasBarChart,
  SaasLineAreaChart,
  CollapsibleAnalyticsPanel,
  SAAS_CHART_COLORS,
} from './charts/AdminCharts';

interface AdminAdvertiserProps {
  siteSettings: SiteSettings;
  onUpdateSettings: (newSettings: Partial<SiteSettings> | SiteSettings) => Promise<void> | void;
  products?: Product[];
  orders?: Order[];
  currentRole: UserRole;
  onRecordAudit?: (action: string, module: string, target: string, details: string) => void;
}

export const AdminAdvertiser: React.FC<AdminAdvertiserProps> = ({
  siteSettings,
  onUpdateSettings,
  products = [],
  orders = [],
  currentRole,
  onRecordAudit,
}) => {
  // Active Tab: 'overview' | 'meta' | 'catalog' | 'tiktok' | 'google' | 'utm' | 'roas' | 'stream' | 'custom_scripts'
  const [activeTab, setActiveTab] = useState<
    'overview' | 'meta' | 'catalog' | 'tiktok' | 'google' | 'utm' | 'roas' | 'stream' | 'custom_scripts'
  >('overview');

  // Live Meta & Catalog Server Status
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

  // Live TikTok & Catalog Server Status
  const [tiktokServerStatus, setTiktokServerStatus] = useState<{
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

  const [tiktokCatalogHealth, setTiktokCatalogHealth] = useState<{
    totalEligibleProducts: number;
    inStockCount: number;
    outOfStockCount: number;
    catalogXmlUrl: string;
    catalogJsonUrl: string;
    currency: string;
  } | null>(null);

  const [isCheckingTiktokStatus, setIsCheckingTiktokStatus] = useState(false);
  const [showTikTokToken, setShowTikTokToken] = useState(false);
  const [tiktokServerLogs, setTiktokServerLogs] = useState<any[]>([]);
  const [tiktokTestEventStatus, setTiktokTestEventStatus] = useState<{
    running: boolean;
    success?: boolean;
    message?: string;
  }>({ running: false });

  // Live Google & Merchant Center Server Status
  const [googleServerStatus, setGoogleServerStatus] = useState<{
    status: 'connected' | 'not_configured' | 'error';
    enabled: boolean;
    ga4MeasurementId: string | null;
    conversionId: string | null;
    gtmContainerId: string | null;
    hasPurchaseLabel: boolean;
    hasEnhancedConversions: boolean;
    lastConversionAt: string | null;
    lastConversionStatus: string | null;
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
  const [googleTestEventStatus, setGoogleTestEventStatus] = useState<{
    running: boolean;
    success?: boolean;
    message?: string;
  }>({ running: false });

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
      const cRes = await fetch('/api/meta/catalog/status');
      if (cRes.ok) {
        const cData = await cRes.json();
        setCatalogHealth(cData);
      }
    } catch {}
    setIsCheckingMetaStatus(false);
  };

  const checkLiveTikTokStatus = async () => {
    setIsCheckingTiktokStatus(true);
    try {
      const res = await fetch('/api/tiktok/status');
      if (res.ok) {
        const data = await res.json();
        setTiktokServerStatus(data);
      }
    } catch {}
    try {
      const cRes = await fetch('/api/tiktok/catalog/status');
      if (cRes.ok) {
        const cData = await cRes.json();
        setTiktokCatalogHealth(cData);
      }
    } catch {}
    try {
      const logsRes = await fetch('/api/tiktok/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setTiktokServerLogs(Array.isArray(logsData) ? logsData : []);
      }
    } catch {}
    setIsCheckingTiktokStatus(false);
  };

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
      const cRes = await fetch('/api/google/merchant/status');
      if (cRes.ok) {
        const cData = await cRes.json();
        setGoogleMerchantHealth(cData);
      }
    } catch {}
    try {
      const logsRes = await fetch('/api/google/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setGoogleServerLogs(Array.isArray(logsData) ? logsData : []);
      }
    } catch {}
    setIsCheckingGoogleStatus(false);
  };

  useEffect(() => {
    checkLiveMetaStatus();
    checkLiveTikTokStatus();
    checkLiveGoogleStatus();
  }, []);

  // Local Form Settings state
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
        tiktok: {
          enabled: false,
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
        google: {
          enabled: false,
          gtmContainerId: '',
          ga4MeasurementId: '',
          googleAdsConversionId: '',
          googleAdsPurchaseLabel: '',
          googleAdsBeginCheckoutLabel: '',
          googleAdsAddToCartLabel: '',
          googleAdsSignUpLabel: '',
          googleAdsLeadLabel: '',
          enableEnhancedConversions: true,
          enableEnhancedEcommerce: true,
          enableRemarketingTag: true,
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
        customScripts: {
          headerScript: '',
          footerScript: '',
        },
        adSpends: [],
        savedUTMs: [],
      }
    );
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  // Live Event Stream state
  const [liveEvents, setLiveEvents] = useState<TrackedEventLog[]>(() => getRecentEventLogs());
  const [selectedLog, setSelectedLog] = useState<TrackedEventLog | null>(null);
  const [streamFilter, setStreamFilter] = useState<'all' | 'meta' | 'tiktok' | 'google'>('all');

  // Test Event trigger state
  const [testEventStatus, setTestEventStatus] = useState<{
    running: boolean;
    success?: boolean;
    message?: string;
  }>({ running: false });

  // UTM Generator Form state
  const [utmTargetPage, setUtmTargetPage] = useState<'home' | 'shop' | 'product' | 'flash-sale'>('home');
  const [utmSelectedProductId, setUtmSelectedProductId] = useState<string>(products[0]?.id || '');
  const [utmPlatform, setUtmPlatform] = useState<string>('facebook_feed');
  const [utmSource, setUtmSource] = useState<string>('facebook');
  const [utmMedium, setUtmMedium] = useState<string>('cpc');
  const [utmCampaign, setUtmCampaign] = useState<string>('mega_sale_boost');
  const [utmContent, setUtmContent] = useState<string>('video_ad_1');
  const [utmTerm, setUtmTerm] = useState<string>('');
  const [generatedUrl, setGeneratedUrl] = useState<string>('');

  // Ad Spend Form state
  const [isAddSpendModalOpen, setIsAddSpendModalOpen] = useState(false);
  const [newSpendName, setNewSpendName] = useState('');
  const [newSpendPlatform, setNewSpendPlatform] = useState<CampaignAdSpend['platform']>('facebook');
  const [newSpendAmount, setNewSpendAmount] = useState<number>(1000);
  const [newSpendDate, setNewSpendDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newSpendProductId, setNewSpendProductId] = useState<string>('');
  const [newSpendUtmCampaign, setNewSpendUtmCampaign] = useState<string>('');
  const [newSpendNotes, setNewSpendNotes] = useState<string>('');

  // Subscribe to live event logs
  useEffect(() => {
    const unsub = subscribeToEventLogs((logs) => {
      setLiveEvents(logs);
    });
    return unsub;
  }, []);

  // Update UTM Preset source and medium when platform changes
  const handlePlatformPresetChange = (preset: string) => {
    setUtmPlatform(preset);
    switch (preset) {
      case 'facebook_feed':
        setUtmSource('facebook');
        setUtmMedium('cpc');
        break;
      case 'facebook_reels':
        setUtmSource('facebook');
        setUtmMedium('reels');
        break;
      case 'instagram_ad':
        setUtmSource('instagram');
        setUtmMedium('story');
        break;
      case 'tiktok_infeed':
        setUtmSource('tiktok');
        setUtmMedium('infeed_ad');
        break;
      case 'google_search':
        setUtmSource('google');
        setUtmMedium('search_ad');
        break;
      case 'youtube_promo':
        setUtmSource('youtube');
        setUtmMedium('video_banner');
        break;
      case 'sms_blast':
        setUtmSource('sms');
        setUtmMedium('broadcast');
        break;
      case 'whatsapp_promo':
        setUtmSource('whatsapp');
        setUtmMedium('direct_message');
        break;
      case 'influencer':
        setUtmSource('influencer');
        setUtmMedium('promo_link');
        break;
      default:
        break;
    }
  };

  // Re-calculate generated UTM Link
  useEffect(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://kenaxbd.com';
    let targetPath = '/';

    if (utmTargetPage === 'shop') {
      targetPath = '/?view=shop';
    } else if (utmTargetPage === 'flash-sale') {
      targetPath = '/?view=tag:Flash%20Sale';
    } else if (utmTargetPage === 'product' && utmSelectedProductId) {
      const prod = products.find((p) => p.id === utmSelectedProductId);
      if (prod?.landingPage?.enabled && prod?.landingPage?.slug) {
        targetPath = `/?lp=${encodeURIComponent(prod.landingPage.slug)}`;
      } else {
        targetPath = `/?product=${encodeURIComponent(utmSelectedProductId)}`;
      }
    }

    const separator = targetPath.includes('?') ? '&' : '?';
    const params = new URLSearchParams();
    if (utmSource) params.set('utm_source', utmSource.trim());
    if (utmMedium) params.set('utm_medium', utmMedium.trim());
    if (utmCampaign) params.set('utm_campaign', utmCampaign.trim());
    if (utmContent) params.set('utm_content', utmContent.trim());
    if (utmTerm) params.set('utm_term', utmTerm.trim());

    const queryString = params.toString();
    const finalUrl = `${baseUrl}${targetPath}${queryString ? `${separator}${queryString}` : ''}`;
    setGeneratedUrl(finalUrl);
  }, [utmTargetPage, utmSelectedProductId, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, products]);

  // Copy helper
  const handleCopyText = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Save Settings to SiteSettings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      await onUpdateSettings({
        ...siteSettings,
        advertiserSettings: advertiserState,
      });

      if (onRecordAudit) {
        onRecordAudit(
          'Advertiser & Pixel Settings Updated',
          'marketing',
          'advertiserSettings',
          `Updated Meta Pixel (${advertiserState.meta?.pixelId || 'None'}), TikTok Pixel, and Google Ads tracking configuration`
        );
      }

      setSaveSuccessMsg('সেটিংস সফলভাবে সংরক্ষিত হয়েছে (Settings successfully saved!)');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`সেটিংস সংরক্ষণ ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Save new UTM to list
  const handleSaveCurrentUTM = () => {
    if (!generatedUrl) return;
    const targetLabel =
      utmTargetPage === 'product'
        ? products.find((p) => p.id === utmSelectedProductId)?.name || 'Product Page'
        : utmTargetPage === 'shop'
        ? 'All Products Catalog'
        : utmTargetPage === 'flash-sale'
        ? 'Flash Sale Deals'
        : 'Storefront Homepage';

    const newUTM: SavedUTMLink = {
      id: `utm-${Date.now()}`,
      name: `${utmCampaign} (${utmPlatform})`,
      fullUrl: generatedUrl,
      platform: utmPlatform,
      productOrPage: targetLabel,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      createdAt: new Date().toLocaleDateString(),
    };

    setAdvertiserState((prev) => ({
      ...prev,
      savedUTMs: [newUTM, ...(prev.savedUTMs || [])],
    }));

    handleCopyText(generatedUrl, 'new-utm');
  };

  const handleDeleteSavedUTM = (id: string) => {
    setAdvertiserState((prev) => ({
      ...prev,
      savedUTMs: (prev.savedUTMs || []).filter((u) => u.id !== id),
    }));
  };

  // Add Ad Spend Log
  const handleAddAdSpend = () => {
    if (!newSpendName.trim() || newSpendAmount <= 0) return;
    const prod = products.find((p) => p.id === newSpendProductId);

    const newSpend: CampaignAdSpend = {
      id: `spend-${Date.now()}`,
      name: newSpendName.trim(),
      platform: newSpendPlatform,
      spendBDT: Number(newSpendAmount),
      startDate: newSpendDate,
      productId: newSpendProductId || undefined,
      productName: prod?.name || undefined,
      utmCampaign: newSpendUtmCampaign || undefined,
      notes: newSpendNotes.trim() || undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setAdvertiserState((prev) => ({
      ...prev,
      adSpends: [newSpend, ...(prev.adSpends || [])],
    }));

    setIsAddSpendModalOpen(false);
    setNewSpendName('');
    setNewSpendAmount(1000);
    setNewSpendNotes('');
    setNewSpendUtmCampaign('');
  };

  const handleDeleteAdSpend = (id: string) => {
    setAdvertiserState((prev) => ({
      ...prev,
      adSpends: (prev.adSpends || []).filter((s) => s.id !== id),
    }));
  };

  const handleToggleAdSpendStatus = (id: string) => {
    setAdvertiserState((prev) => ({
      ...prev,
      adSpends: (prev.adSpends || []).map((s) => {
        if (s.id !== id) return s;
        const nextStatus: CampaignAdSpend['status'] =
          s.status === 'active' ? 'paused' : s.status === 'paused' ? 'completed' : 'active';
        return { ...s, status: nextStatus };
      }),
    }));
  };

  // Quick toggle Active/Paused status for campaigns from overlay without leaving view
  const handleQuickToggleCampaignStatus = async (campaignId: string, newStatus: 'active' | 'paused') => {
    setAdvertiserState((prev) => {
      const updatedSpends = (prev.adSpends || []).map((s) => {
        if (s.id !== campaignId) return s;
        return { ...s, status: newStatus };
      });

      const updatedSettings: SiteSettings = {
        ...siteSettings,
        advertiserSettings: {
          ...prev,
          adSpends: updatedSpends,
        },
      };

      // Persist to store settings
      onUpdateSettings(updatedSettings);

      return {
        ...prev,
        adSpends: updatedSpends,
      };
    });

    if (onRecordAudit) {
      const campaign = advertiserState.adSpends?.find((c) => c.id === campaignId);
      onRecordAudit(
        'Campaign Status Toggled',
        'marketing',
        campaignId,
        `Toggled campaign "${campaign?.name || campaignId}" status to ${newStatus}`
      );
    }
  };

  // Pull latest Facebook campaign spend data using placeholder API call and update admin dashboard state
  const [isSyncingMetaSpend, setIsSyncingMetaSpend] = useState(false);
  const [metaSyncMessage, setMetaSyncMessage] = useState<string | null>(null);

  const pullLatestFacebookSpendData = async () => {
    setIsSyncingMetaSpend(true);
    setMetaSyncMessage(null);
    try {
      // Simulated placeholder API call to Meta Marketing API (Graph API)
      await new Promise((resolve) => setTimeout(resolve, 800));

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0];
      const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0];

      // Simulated latest campaign spends pulled from Meta Marketing API
      const fetchedCampaigns: CampaignAdSpend[] = [
        {
          id: 'fb-camp-eid-boost',
          name: 'FB - Eid Mega Sale Catalog Boost',
          platform: 'facebook',
          spendBDT: 3450,
          startDate: fiveDaysAgo,
          productName: products[0]?.name || 'Featured Products',
          utmCampaign: 'eid_mega_sale',
          status: 'active',
          notes: 'High conversion Feed ad targeting active online shoppers (pulled via Meta API)',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'fb-camp-reels-sneakers',
          name: 'FB Reels - Trendy Video Creative',
          platform: 'facebook',
          spendBDT: 2100,
          startDate: threeDaysAgo,
          productName: products[1]?.name || 'Fashion Collection',
          utmCampaign: 'reels_viral_v1',
          status: 'active',
          notes: 'Dynamic Reels placement with 9:16 vertical video creative',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'fb-camp-retargeting-cart',
          name: 'FB Retargeting - Cart Abandoners (3D)',
          platform: 'facebook',
          spendBDT: 1850,
          startDate: yesterday,
          productName: 'Dynamic Store Catalog',
          utmCampaign: 'cart_recovery_ads',
          status: 'active',
          notes: 'Excludes customers who purchased in last 14 days',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'fb-camp-lookalike-buyers',
          name: 'FB Lookalike 1% - Top VIP Customers',
          platform: 'facebook',
          spendBDT: 2800,
          startDate: today,
          productName: 'Storewide Best Sellers',
          utmCampaign: 'vip_lookalike',
          status: 'paused',
          notes: 'Seeded from verified purchase pixel events',
          createdAt: new Date().toISOString(),
        },
      ];

      // Merge into advertiserState.adSpends, updating existing or adding new
      setAdvertiserState((prev) => {
        const existingSpends = [...(prev.adSpends || [])];
        fetchedCampaigns.forEach((fetched) => {
          const index = existingSpends.findIndex((s) => s.id === fetched.id || s.name === fetched.name);
          if (index >= 0) {
            existingSpends[index] = { ...existingSpends[index], ...fetched };
          } else {
            existingSpends.unshift(fetched);
          }
        });

        const updatedSettings: SiteSettings = {
          ...siteSettings,
          advertiserSettings: {
            ...prev,
            adSpends: existingSpends,
          },
        };

        // Persist to store settings
        onUpdateSettings(updatedSettings);

        return {
          ...prev,
          adSpends: existingSpends,
        };
      });

      if (onRecordAudit) {
        onRecordAudit(
          'Meta Ads Spend Synced',
          'marketing',
          'facebook_ads',
          `Synced ${fetchedCampaigns.length} campaigns from Meta Marketing API placeholder`
        );
      }

      setMetaSyncMessage(`Meta Ads Sync: ${fetchedCampaigns.length} campaigns successfully fetched & dashboard updated!`);
      setTimeout(() => setMetaSyncMessage(null), 5000);
    } catch (err: any) {
      setMetaSyncMessage(`Sync failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSyncingMetaSpend(false);
    }
  };

  // Trigger Live Test Event
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
        payload.content_name = 'Test Campaign Product';
      } else if (eventName === 'AddToCart' || eventName === 'ViewContent') {
        payload.value = 1200;
        payload.currency = 'BDT';
        payload.content_name = products[0]?.name || 'Test Product';
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

  // Trigger Live TikTok Test Event
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

  // Trigger Live Google Ads & GA4 Test Event
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

  // Analytics & ROI computations
  const totalAdSpendBDT = (advertiserState.adSpends || []).reduce((acc, curr) => acc + (curr.spendBDT || 0), 0);
  const totalStoreRevenueBDT = orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
    .reduce((acc, curr) => acc + (curr.totalAmount || curr.subtotal || 0), 0);

  const overallROAS =
    totalAdSpendBDT > 0 ? ((totalStoreRevenueBDT / totalAdSpendBDT) * 100).toFixed(0) : '0';
  const overallROASMultiplier =
    totalAdSpendBDT > 0 ? (totalStoreRevenueBDT / totalAdSpendBDT).toFixed(2) : '0.00';

  const isMetaActive = Boolean(advertiserState.meta?.enabled && advertiserState.meta?.pixelId);
  const isCapiActive = Boolean(isMetaActive && advertiserState.meta?.capiToken);
  const isTikTokActive = Boolean(advertiserState.tiktok?.enabled && advertiserState.tiktok?.pixelId);
  const isGoogleActive = Boolean(
    advertiserState.google?.enabled &&
      (advertiserState.google?.ga4MeasurementId ||
        advertiserState.google?.gtmContainerId ||
        advertiserState.google?.googleAdsConversionId)
  );

  const advertiserAnalytics = useMemo(() => {
    const spendByPlatform = new Map<string, number>();
    (advertiserState.adSpends || []).forEach((s) => {
      const p = (s.platform || 'other').toLowerCase();
      spendByPlatform.set(p, (spendByPlatform.get(p) || 0) + (s.spendBDT || 0));
    });

    const platformColors: Record<string, string> = {
      facebook: '#2563EB',
      meta: '#2563EB',
      tiktok: '#E11D48',
      google: '#D97706',
      youtube: '#DC2626',
    };

    const spendSlices = Array.from(spendByPlatform.entries())
      .filter(([, val]) => val > 0)
      .map(([p, val]) => ({
        id: p,
        label: p.charAt(0).toUpperCase() + p.slice(1),
        value: val,
        color: platformColors[p] || '#4F46E5',
      }));

    // Tracked pixel events by eventName
    const eventMap = new Map<string, number>();
    liveEvents.forEach((ev) => {
      const name = ev.eventName || 'Event';
      eventMap.set(name, (eventMap.get(name) || 0) + 1);
    });
    const eventBars = Array.from(eventMap.entries())
      .map(([name, count]) => ({
        id: name,
        label: name,
        value: count,
        color: '#4F46E5',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);

    // Daily Store Revenue vs Logged Ad Spend
    const dateMap = new Map<string, { rev: number; spend: number }>();
    orders.forEach((o) => {
      if (o.status === 'cancelled' || o.status === 'refunded') return;
      const d = new Date(o.createdAt);
      if (!isNaN(d.getTime())) {
        const key = d.toISOString().slice(0, 10);
        const cur = dateMap.get(key) || { rev: 0, spend: 0 };
        cur.rev += o.totalAmount || o.subtotal || 0;
        dateMap.set(key, cur);
      }
    });
    (advertiserState.adSpends || []).forEach((sp) => {
      if (!sp.startDate) return;
      const key = String(sp.startDate).slice(0, 10);
      const cur = dateMap.get(key) || { rev: 0, spend: 0 };
      cur.spend += sp.spendBDT || 0;
      dateMap.set(key, cur);
    });

    const roiTrend = Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([iso, v]) => ({
        label: new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        primary: v.rev,
        secondary: v.spend,
      }));

    return { spendSlices, eventBars, roiTrend };
  }, [advertiserState.adSpends, liveEvents, orders]);

  return (
    <div className="space-y-6">
      {/* 1. Header Bar with Save & Status Indicators */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Advertiser & Marketing Command Center</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Meta • TikTok • Google
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ফেসবুক মেটা পিক্সেল, কনভার্সন এপিআই (CAPI), টিকটক পিক্সেল, গুগল অ্যাডস ও আরওএএস (ROAS) ট্র্যাকার
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccessMsg && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              {saveSuccessMsg}
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেভ সেটিংস (Save Changes)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Channel Status Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Meta Pixel & CAPI Card */}
        <div
          onClick={() => setActiveTab('meta')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            isMetaActive
              ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 hover:border-blue-400'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Facebook / Meta</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isMetaActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            />
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{isMetaActive ? 'Pixel Active' : 'Not Connected'}</span>
            {isCapiActive && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                + CAPI
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">
            {advertiserState.meta?.pixelId ? `ID: ${advertiserState.meta.pixelId}` : 'Click to setup pixel'}
          </p>
        </div>

        {/* TikTok Ads Card */}
        <div
          onClick={() => setActiveTab('tiktok')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            isTikTokActive
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 hover:border-rose-400'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">TikTok Ads</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isTikTokActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            />
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white">
            {isTikTokActive ? 'Pixel Active' : 'Not Connected'}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">
            {advertiserState.tiktok?.pixelId ? `ID: ${advertiserState.tiktok.pixelId}` : 'Click to setup TikTok'}
          </p>
        </div>

        {/* Google Ads / GA4 Card */}
        <div
          onClick={() => setActiveTab('google')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            isGoogleActive
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 hover:border-amber-400'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Google Ads & GA4</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isGoogleActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            />
          </div>
          <div className="text-sm font-black text-slate-900 dark:text-white">
            {isGoogleActive ? 'Tracking Active' : 'Not Connected'}
          </div>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">
            {advertiserState.google?.ga4MeasurementId || advertiserState.google?.googleAdsConversionId || 'Setup GTM / Ads'}
          </p>
        </div>

        {/* Total ROAS / Ad Spend Card */}
        <div
          onClick={() => setActiveTab('roas')}
          className="p-4 rounded-2xl border bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 transition-all cursor-pointer hover:border-emerald-400"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Total Tracked ROAS</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-sm font-black text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
            <span>{overallROASMultiplier}x</span>
            <span className="text-[10px] font-bold text-emerald-700">({overallROAS}%)</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            Spend: ৳{totalAdSpendBDT.toLocaleString()} • Rev: ৳{totalStoreRevenueBDT.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Omnichannel Marketing & ROAS Analytics */}
      <CollapsibleAnalyticsPanel
        title={`Omnichannel Marketing Analytics (${overallROASMultiplier}x ROAS • ${liveEvents.length} Live Events)`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SaasDonutChart
            title="Ad Spend Share by Channel"
            subtitle="Logged budget distribution across Meta, TikTok & Google"
            data={advertiserAnalytics.spendSlices}
            valueFormat="currency"
            centerLabel="Total Spend"
            emptyText="Log campaign ad spend to view channel split"
            onSelectSlice={(slice) => {
              const id = slice.id || slice.label.toLowerCase();
              if (id === 'facebook' || id === 'meta') setActiveTab('meta');
              else if (id === 'tiktok') setActiveTab('tiktok');
              else if (id === 'google') setActiveTab('google');
              else setActiveTab('roas');
            }}
          />
          <SaasBarChart
            title="Captured Pixel & CAPI Events"
            subtitle="Click a bar to inspect full live event stream"
            data={advertiserAnalytics.eventBars}
            primaryLabel="Events"
            orientation="horizontal"
            barColor="#4F46E5"
            emptyText="No pixel events captured yet"
            onSelectBar={() => setActiveTab('stream')}
          />
          <SaasLineAreaChart
            title="Store Revenue vs Ad Spend"
            subtitle="Daily revenue generated vs logged campaign spend"
            data={advertiserAnalytics.roiTrend}
            primaryLabel="Revenue"
            secondaryLabel="Ad Spend"
            primaryFormat="currency"
            secondaryFormat="currency"
            primaryColor="#059669"
            secondaryColor="#E11D48"
            emptyText="No daily revenue or ad spend data"
          />
        </div>
      </CollapsibleAnalyticsPanel>

      {/* 3. Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'overview', label: 'Overview & Guide', icon: Sliders },
          { id: 'meta', label: 'Facebook Ads (Pixel & CAPI)', icon: Target },
          { id: 'catalog', label: 'Meta Product Catalog (Feed)', icon: ShoppingBag },
          { id: 'tiktok', label: 'TikTok Ads', icon: Zap },
          { id: 'google', label: 'Google Ads & GA4', icon: Globe },
          { id: 'utm', label: 'Smart UTM Generator', icon: Share2 },
          { id: 'roas', label: 'Ad Spend & ROAS Tracker', icon: DollarSign },
          { id: 'stream', label: `Live Event Stream (${liveEvents.length})`, icon: Activity },
          { id: 'custom_scripts', label: 'Custom Scripts & Header Code', icon: Code },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Tab Content Area */}

      {/* TAB 1: OVERVIEW & QUICK GUIDE */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Feature Highlights */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>KenaX BD Advertising & Retargeting Engine</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  আপনার ফেসবুক, ইনস্টাগ্রাম, টিকটক এবং গুগল ক্যাম্পেইনগুলোর বিজ্ঞাপন খরচ (Ad Spend) থেকে সর্বোচ্চ সেলস ও আরওএএস (ROAS) নিশ্চিত করার জন্য তৈরি করা হয়েছে এই অ্যাডভার্টাইজার হাব। এটি ব্রাউজার পিক্সেলের পাশাপাশি <b>সার্ভার-সাইড মেটা কনভার্সন এপিআই (Meta CAPI)</b> সাপোর্ট করে—যাতে iOS 14.5+ বা AdBlocker থাকলেও ১০০% অর্ডার ও ইভেন্ট নির্ভুলভাবে ট্র্যাক হয়।
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                    <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-indigo-600" />
                      <span>ডুয়াল মেটা ট্র্যাকিং (Pixel + CAPI)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ব্রাউজারে ফায়ার হওয়া ইভেন্টের সাথে সার্ভার ডেটা স্বয়ংক্রিয়ভাবে ডিডুপ্লিকেট (`event_id`) হয়ে মেটা ইভেন্টস ম্যানেজারে পৌঁছায়।
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 space-y-1">
                    <h4 className="text-xs font-black text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                      <span>অ্যাডভান্সড ম্যাচিং (SHA-256)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      কাস্টমারের মোবাইল নম্বর ও ইমেইল নিরাপদ SHA-256 হ্যাশ ফরম্যাটে মেটা ও টিকটকে পাঠানো হয়, যা ৯০%+ ম্যাচ কোয়ালিটি দেয়।
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 space-y-1">
                    <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>স্মার্ট UTM ট্র্যাকার ও বুস্ট লিঙ্ক</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ১-ক্লিকে ফেসবুক রিলস, পোস্ট বুস্ট বা টিকটকের জন্য ট্র্যাকেবল ট্র্যাকিং লিঙ্ক ও কিউআর কোড জেনারেট করুন।
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-1">
                    <h4 className="text-xs font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-rose-600" />
                      <span>ROAS & Ad Spend ক্যালকুলেটর</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      বিজ্ঞাপনে কত খরচ করলেন এবং তা থেকে কত টাকার পণ্য বিক্রি হলো তা স্বয়ংক্রিয়ভাবে হিসাব রাখুন।
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Test Event Trigger Box */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-black text-sm">লাইভ পিক্সেল ও CAPI টেস্ট ইভেন্ট ডিসপ্যাচার</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Live Diagnostics
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  নিচের বাটনগুলোতে ক্লিক করে আপনি সাথে সাথে মেটা ও টিকটক সার্ভারে টেস্ট ইভেন্ট পাঠাতে পারবেন এবং মেটা ইভেন্টস ম্যানেজার (Events Manager &gt; Test Events) এ রিয়েল-টাইম চেক করতে পারবেন:
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleTriggerTestEvent('PageView')}
                    disabled={testEventStatus.running}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Send className="w-3 h-3 text-sky-400" />
                    <span>Send Test PageView</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTriggerTestEvent('AddToCart')}
                    disabled={testEventStatus.running}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <ShoppingCart className="w-3 h-3 text-amber-400" />
                    <span>Send Test AddToCart (৳1,200)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTriggerTestEvent('Purchase')}
                    disabled={testEventStatus.running}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Send Test Purchase (৳1,500)</span>
                  </button>
                </div>

                {testEventStatus.message && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      testEventStatus.success
                        ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                        : 'bg-rose-950/80 border border-rose-700 text-rose-300'
                    }`}
                  >
                    {testEventStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{testEventStatus.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links & Setup Guide */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Quick Navigation
                </h4>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('meta')}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-100 dark:border-slate-800 text-left flex items-center justify-between group cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600">
                        Configure Facebook Pixel & CAPI
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('tiktok')}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-100 dark:border-slate-800 text-left flex items-center justify-between group cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 text-rose-600" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600">
                        Configure TikTok Ads Pixel
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('google')}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-slate-100 dark:border-slate-800 text-left flex items-center justify-between group cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600">
                        Google Analytics & Ads Conversion
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('utm')}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-100 dark:border-slate-800 text-left flex items-center justify-between group cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <Share2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600">
                        Generate Boost Campaign Links
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Useful External Links */}
              <div className="bg-slate-50 dark:bg-slate-900/80 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                  <span>Official Manager Portals</span>
                </h4>
                <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <li>
                    <a
                      href="https://business.facebook.com/events_manager2"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Meta Events Manager (Pixel & CAPI)</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://ads.tiktok.com/marketing_api/docs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>TikTok Ads Manager & Events API</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://tagmanager.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Google Tag Manager (GTM)</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: META / FACEBOOK ADS (PIXEL & CAPI) */}
      {activeTab === 'meta' && (
        <div className="space-y-6">
          {/* Top Action Bar: Latest Spend Sync & Status */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg border border-blue-800/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-blue-400 shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <span>Facebook & Instagram Marketing Hub</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Meta Graph v19.0
                  </span>
                </h3>
                <p className="text-xs text-blue-200/80">
                  Manage Meta Pixel, Server-side CAPI tracking, and analyze campaign spend ROI trends
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={pullLatestFacebookSpendData}
                disabled={isSyncingMetaSpend}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                title="Pull latest ad spend and performance from Meta Marketing API"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMetaSpend ? 'animate-spin' : ''}`} />
                <span>{isSyncingMetaSpend ? 'Pulling Meta Spend...' : 'Pull Latest Campaign Spend'}</span>
              </button>
            </div>
          </div>

          {/* Sync Feedback Message */}
          {metaSyncMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{metaSyncMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setMetaSyncMessage(null)}
                className="text-xs text-emerald-600 hover:text-emerald-800 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* D3 Performance ROI Visualization (Spending vs. Revenue Trends) */}
          <FacebookROIVisualizer
            adSpends={advertiserState.adSpends || []}
            orders={orders}
            onRefreshData={pullLatestFacebookSpendData}
            isSyncing={isSyncingMetaSpend}
          />

          {/* Meta Pixel & CAPI Configuration Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span>Meta Pixel & Conversions API (CAPI) Settings</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ফেসবুক ও ইনস্টাগ্রাম বিজ্ঞাপনের জন্য ক্লায়েন্ট-সাইড পিক্সেল ও সার্ভার-সাইড CAPI কনফিগার করুন
                </p>
              </div>

              {/* Master Enable Toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {advertiserState.meta?.enabled ? 'Meta Tracking Enabled' : 'Meta Tracking Disabled'}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Primary Pixel ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Meta Pixel ID / Dataset ID <span className="text-rose-500">*</span>
              </label>
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="block text-[11px] text-slate-400 mt-1">
                মেটা ইভেন্টস ম্যানেজার (Meta Events Manager) থেকে আপনার পিক্সেল বা ডেটাসেট আইডি এখানে বসান।
              </span>
            </div>

            {/* 2. Test Event Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Test Event Code (Optional for Live Testing)</span>
                <span className="text-[10px] font-normal text-slate-400">Events Manager &gt; Test Events</span>
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
                মেটা টেস্ট ইভেন্টস ট্যাবের কোড দিলে লাইভ ব্রাউজিংয়ের ইভেন্ট সাথে সাথে মেটা ড্যাশবোর্ডে শো করবে।
              </span>
            </div>

            {/* 3. Conversions API (CAPI) Access Token */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Meta Conversions API (CAPI) Access Token
                </label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showToken ? 'Hide Token' : 'Show Token'}</span>
                </button>
              </div>
              <textarea
                rows={3}
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
                placeholder="EAAG..."
                className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  !showToken ? 'filter blur-[3px] select-none focus:filter-none' : ''
                }`}
              />
              <span className="block text-[11px] text-slate-400 mt-1">
                Meta Events Manager &gt; Settings &gt; Conversions API &gt; "Generate access token" থেকে টোকেনটি কপি করে বসান।
              </span>
            </div>

            {/* 4. Domain Verification Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Meta Domain Verification Tag
              </label>
              <input
                type="text"
                value={advertiserState.meta?.domainVerification || ''}
                onChange={(e) =>
                  setAdvertiserState((prev) => ({
                    ...prev,
                    meta: {
                      ...(prev.meta || { enabled: true, pixelId: '' }),
                      domainVerification: e.target.value.trim(),
                    },
                  }))
                }
                placeholder="e.g. abcdef0123456789"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="block text-[11px] text-slate-400 mt-1">
                Facebook Business Manager &gt; Brand Safety &gt; Domains এর মেটা ভেরিফিকেশন কোড।
              </span>
            </div>

            {/* 5. Advanced Matching */}
            <div className="flex items-center">
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 cursor-pointer">
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
                  className="w-4 h-4 rounded text-blue-600 mt-0.5"
                />
                <div>
                  <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                    Automatic Advanced Matching (SHA-256)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    অর্ডারের সময় কাস্টমারের ফোন নম্বর ও নাম মেটাতে সিকিউর হ্যাশ ফরম্যাটে পাঠানো হবে যেন ফেসবুক সঠিক গ্রাহককে চিহ্নিত করতে পারে।
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Standard Event Toggles */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Standard Events to Dispatch
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { key: 'pageView', label: 'PageView (পেজ ভিউ)' },
                { key: 'viewContent', label: 'ViewContent (প্রোডাক্ট ভিউ)' },
                { key: 'addToCart', label: 'AddToCart (কার্টে যুক্ত)' },
                { key: 'initiateCheckout', label: 'InitiateCheckout (চেকআউট)' },
                { key: 'purchase', label: 'Purchase (অর্ডার সম্পন্ন)' },
                { key: 'search', label: 'Search (প্রোডাক্ট সার্চ)' },
                { key: 'contact', label: 'Contact / Lead (হোয়াটসঅ্যাপ/কল)' },
              ].map((ev) => (
                <label
                  key={ev.key}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={
                      advertiserState.meta?.events?.[ev.key as keyof typeof advertiserState.meta.events] !== false
                    }
                    onChange={(e) =>
                      setAdvertiserState((prev) => ({
                        ...prev,
                        meta: {
                          ...(prev.meta || { enabled: true, pixelId: '' }),
                          events: {
                            ...(prev.meta?.events || {
                              pageView: true,
                              viewContent: true,
                              addToCart: true,
                              initiateCheckout: true,
                              purchase: true,
                              search: true,
                              contact: true,
                            }),
                            [ev.key]: e.target.checked,
                          },
                        },
                      }))
                    }
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">{ev.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* TAB: META PRODUCT CATALOG FEED & COMMERCE MANAGER */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Facebook Commerce Manager &amp; Dynamic Product Ads (DPA)</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Meta Product Catalog &amp; Scheduled XML Data Feed
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                  আপনার সম্পূর্ণ প্রোডাক্ট ক্যাটালগ স্বয়ংক্রিয়ভাবে ফেসবুক ক্যাটালগ ম্যানেজারে সিঙ্ক করুন। ডাইনামিক প্রোডাক্ট অ্যাড, ইনস্টাগ্রাম শপিং এবং অ্যাডভান্টেজ+ ক্যাটালগ বিজ্ঞাপনের জন্য রেডি।
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={checkLiveMetaStatus}
                  disabled={isCheckingMetaStatus}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingMetaStatus ? 'animate-spin' : ''}`} />
                  <span>{isCheckingMetaStatus ? 'Checking...' : 'Refresh Feed Status'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Catalog KPI Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Feed Items</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {catalogHealth?.totalEligibleProducts ?? products.length}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">100% Valid &amp; Active</span>
            </div>
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm text-center">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">In Stock Products</span>
              <p className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                {catalogHealth?.inStockCount ?? products.filter((p) => p.stockStatus !== 'out_of_stock' && (p.stock || 0) > 0).length}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Available for Ads</span>
            </div>
            <div className="bg-amber-50/60 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm text-center">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Out of Stock</span>
              <p className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-1">
                {catalogHealth?.outOfStockCount ?? products.filter((p) => p.stockStatus === 'out_of_stock' || (p.stock || 0) <= 0).length}
              </p>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Auto-Flagged Out of Stock</span>
            </div>
            <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-sm text-center">
              <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Feed Currency</span>
              <p className="text-2xl font-black text-blue-950 dark:text-blue-100 mt-1">BDT (৳)</p>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Bangladesh Standard</span>
            </div>
          </div>

          {/* Feed URL Copy Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Primary XML RSS 2.0 Feed */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    XML
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      Primary Facebook Catalog XML Feed URL
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      RSS 2.0 / Google Merchant Feed Format (Recommended by Meta)
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-bold">
                  Live
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/api/meta/catalog.xml`}
                  className="flex-1 bg-transparent px-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/meta/catalog.xml`);
                    setCopiedKey('xml_feed');
                    setTimeout(() => setCopiedKey(null), 2500);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  {copiedKey === 'xml_feed' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'xml_feed' ? 'Copied!' : 'Copy XML Link'}</span>
                </button>
                <a
                  href="/api/meta/catalog.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors"
                  title="Open Raw XML Feed"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* 2. JSON Catalog Feed */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                    JSON
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      Direct JSON Product Catalog Feed
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      REST API payload for custom integrations &amp; debugging
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 text-[10px] font-bold">
                  JSON API
                </span>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/api/meta/catalog.json`}
                  className="flex-1 bg-transparent px-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/meta/catalog.json`);
                    setCopiedKey('json_feed');
                    setTimeout(() => setCopiedKey(null), 2500);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  {copiedKey === 'json_feed' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'json_feed' ? 'Copied!' : 'Copy JSON Link'}</span>
                </button>
                <a
                  href="/api/meta/catalog.json"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors"
                  title="Open JSON Feed"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Setup Guide Step-by-Step */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>How to Connect Catalog in Facebook Commerce Manager</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                  ১
                </span>
                <h5 className="font-bold text-slate-900 dark:text-white">Commerce Manager খুলুন</h5>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Meta Business Suite &gt; Commerce Manager &gt; Catalogs সেকশনে যান এবং আপনার ক্যাটালগ সিলেক্ট করুন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                  ২
                </span>
                <h5 className="font-bold text-slate-900 dark:text-white">Data Sources এ যান</h5>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  বামদিকের মেনু থেকে "Data sources" সিলেক্ট করে "Add items" &gt; "Data feed" অপশন পছন্দ করুন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                  ৩
                </span>
                <h5 className="font-bold text-slate-900 dark:text-white">XML Feed Link দিন</h5>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  "Use a URL" অপশনে উপরের <code>/api/meta/catalog.xml</code> লিংকটি পেস্ট করুন।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                  ৪
                </span>
                <h5 className="font-bold text-slate-900 dark:text-white">Scheduled Upload সেট করুন</h5>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Frequency: "Hourly" বা "Daily" এবং Default Currency: <strong>BDT (Bangladeshi Taka)</strong> সিলেক্ট করে সেভ করুন।
                </p>
              </div>
            </div>
          </div>

          {/* Live Products in Catalog Preview Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span>Live Catalog Products Preview ({products.length} Products)</span>
              </h3>
              <span className="text-xs text-slate-400 font-semibold">
                Auto-synced with store inventory &amp; prices
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase">
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3">Catalog ID / SKU</th>
                    <th className="py-3 px-3">Price (BDT)</th>
                    <th className="py-3 px-3">Availability</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Direct URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.slice(0, 15).map((p) => {
                    const isOut = p.stockStatus === 'out_of_stock' || (typeof p.stock === 'number' && p.stock <= 0);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 flex items-center gap-3">
                          <img
                            src={p.images?.[0] || 'https://placehold.co/80x80'}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{p.name}</p>
                            <span className="text-[10px] text-slate-400">{p.brand || 'KenaX BD'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {p.sku || p.id}
                        </td>
                        <td className="py-3 px-3 font-black text-slate-900 dark:text-white">
                          ৳{(p.price || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOut
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {isOut ? 'Out of stock' : 'In stock'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">{p.category}</td>
                        <td className="py-3 px-3">
                          <a
                            href={`/?product=${encodeURIComponent(p.slug || p.id)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                          >
                            <span>View</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
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

      {/* TAB 3: TIKTOK ADS */}
      {activeTab === 'tiktok' && (
        <div className="space-y-6">
          {/* 1. TikTok Live Server Status & Diagnostics Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-rose-950/40 to-slate-900 rounded-3xl p-6 border border-rose-900/40 text-white shadow-lg space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/30">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black tracking-tight text-white">
                      TikTok Ads &amp; Events API Command Center
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        tiktokServerStatus?.status === 'connected'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : tiktokServerStatus?.status === 'error'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {tiktokServerStatus?.status === 'connected'
                        ? 'Connected • Live'
                        : tiktokServerStatus?.status === 'error'
                        ? 'Connection Error'
                        : 'Not Configured'}
                    </span>
                    {tiktokServerStatus?.testMode && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                        Test Mode: {tiktokServerStatus.testEventCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-rose-200/70 mt-0.5">
                    TikTok Pixel • Server-Side Events API (Deduplicated) • Dynamic Catalog Feed &amp; Attribution
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={checkLiveTikTokStatus}
                  disabled={isCheckingTiktokStatus}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingTiktokStatus ? 'animate-spin' : ''}`} />
                  <span>{isCheckingTiktokStatus ? 'Checking...' : 'Refresh Status'}</span>
                </button>
              </div>
            </div>

            {/* TikTok Quick Diagnostic Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-rose-900/30">
                <span className="text-[11px] font-medium text-slate-400">TikTok Pixel ID</span>
                <p className="text-sm font-black text-white font-mono mt-0.5 truncate">
                  {advertiserState.tiktok?.pixelId || 'Not set'}
                </p>
              </div>

              <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-rose-900/30">
                <span className="text-[11px] font-medium text-slate-400">Events API Token</span>
                <p className="text-sm font-black text-white mt-0.5 flex items-center gap-1.5">
                  {advertiserState.tiktok?.eventsApiToken ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Configured</span>
                    </>
                  ) : (
                    <span className="text-slate-400 font-normal text-xs">Browser Pixel Only</span>
                  )}
                </p>
              </div>

              <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-rose-900/30">
                <span className="text-[11px] font-medium text-slate-400">Events API Version</span>
                <p className="text-sm font-black text-white font-mono mt-0.5">
                  {advertiserState.tiktok?.apiVersion || 'v1.3'}
                </p>
              </div>

              <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-rose-900/30">
                <span className="text-[11px] font-medium text-slate-400">Server Logs Count</span>
                <p className="text-sm font-black text-white mt-0.5">
                  {tiktokServerLogs.length} events logged
                </p>
              </div>
            </div>
          </div>

          {/* 2. Main TikTok Settings & Event Toggles */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-rose-600" />
                  <span>TikTok Pixel &amp; Events API Configuration</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  পিক্সেল আইডি এবং সার্ভার কনভার্সন এপিআই অ্যাক্সেস টোকেন কনফিগার করুন
                </p>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {advertiserState.tiktok?.enabled ? 'TikTok Tracking Enabled' : 'TikTok Tracking Disabled'}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Pixel ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Primary TikTok Pixel ID <span className="text-rose-500">*</span>
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
                    placeholder="e.g. C8XXXXXXXXXXXXXXXX"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  {advertiserState.tiktok?.pixelId && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(advertiserState.tiktok?.pixelId || '', 'tt_pixel')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      title="Copy Pixel ID"
                    >
                      {copiedKey === 'tt_pixel' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <span className="block text-[11px] text-slate-400 mt-1">
                  TikTok Ads Manager &gt; Tools &gt; Events &gt; Web Events থেকে Pixel ID কপি করুন।
                </span>
              </div>

              {/* Events API Access Token */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    TikTok Events API Access Token (Server CAPI)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTikTokToken(!showTikTokToken)}
                    className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {showTikTokToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showTikTokToken ? 'Hide Token' : 'Show Token'}</span>
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
                  TikTok Events Manager &gt; Settings &gt; Generate Access Token থেকে সার্ভার টোকেন দিন।
                </span>
              </div>

              {/* Test Event Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  TikTok Test Event Code (Optional for Live Debugging)
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
                  TikTok Events Manager &gt; Test Events ট্যাব থেকে প্রাপ্ত কোডটি এখানে দিন। লাইভ অর্ডারে এটি লাগবে না।
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
                      Enable Advanced Matching (SHA-256 Hashed Phone &amp; Email)
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6.5">
                    অর্ডার ও চেকআউট প্রক্রিয়ায় কাস্টমারের মোবাইল নম্বর ও ইমেল নিরাপদ SHA-256 হ্যাশ আকারে টিকটকে পাঠানো হয়, যা ইভেন্ট ম্যাচ রেট বৃদ্ধি করে।
                  </p>
                </div>
              </div>
            </div>

            {/* Granular Event Toggles */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Active Conversion Events (TikTok Pixel &amp; Events API)
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'pageView', label: 'PageView (সব পেজ)', desc: 'সাইট ব্রাউজিং' },
                  { key: 'viewContent', label: 'ViewContent (পণ্য দর্শন)', desc: 'প্রোডাক্ট ভিউ' },
                  { key: 'search', label: 'Search (অনুসন্ধান)', desc: 'সার্চ কুয়েরি' },
                  { key: 'addToCart', label: 'AddToCart (কার্ট যুক্ত)', desc: 'কার্ট এড' },
                  { key: 'initiateCheckout', label: 'InitiateCheckout (চেকআউট শুরু)', desc: 'অর্ডার ফর্ম শুরু' },
                  { key: 'purchase', label: 'CompletePayment (সফল পারচেজ)', desc: 'সার্ভার ভেরিফাইড অর্ডার' },
                  { key: 'completeRegistration', label: 'CompleteRegistration (রেজিস্ট্রেশন)', desc: 'গ্রাহক একাউন্ট' },
                  { key: 'contact', label: 'Contact / Lead (যোগাযোগ)', desc: 'হোয়াটসঅ্যাপ ও কল' },
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

          {/* 3. TikTok Product Catalog & Dynamic Showcase Feed */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-rose-600" />
                  <span>TikTok Product Catalog Feed (Video Shopping Ads &amp; Dynamic Showcase)</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  টিকটক শপিং বিজ্ঞাপন ও অটোমেটিক প্রোডাক্ট ক্যাটালগ সিঙ্কের জন্য লাইভ ফিড URL
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                {tiktokCatalogHealth?.totalEligibleProducts || products.length} Eligible Products in Feed
              </span>
            </div>

            {/* XML & JSON Feed Link Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* XML RSS 2.0 Feed */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-rose-600" />
                    <span>TikTok Catalog XML Feed (Recommended)</span>
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
                    <span>{copiedKey === 'tt_xml_feed' ? 'Copied!' : 'Copy XML Link'}</span>
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
                    <span>TikTok Catalog JSON Feed</span>
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
                    <span>{copiedKey === 'tt_json_feed' ? 'Copied!' : 'Copy JSON Link'}</span>
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

            {/* TikTok Catalog Setup Steps */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
              <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>How to Setup Product Catalog in TikTok Ads Manager</span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[11px] flex items-center justify-center">১</span>
                  <p className="font-bold text-slate-900 dark:text-white text-[11px]">TikTok Business Center খুলুন</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">Assets &gt; Catalogs এ গিয়ে "Create Catalog" সিলেক্ট করুন।</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[11px] flex items-center justify-center">২</span>
                  <p className="font-bold text-slate-900 dark:text-white text-[11px]">Data Feed অপশন সিলেক্ট করুন</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">"Add Products" &gt; "Data Feed Schedule" বেছে নিন।</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[11px] flex items-center justify-center">৩</span>
                  <p className="font-bold text-slate-900 dark:text-white text-[11px]">XML Feed লিংক দিন</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">উপরের <code>/api/tiktok/catalog.xml</code> লিংকটি পেস্ট করুন।</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[11px] flex items-center justify-center">৪</span>
                  <p className="font-bold text-slate-900 dark:text-white text-[11px]">BDT কারেন্সি নির্ধারণ করুন</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">Default Currency <strong>BDT</strong> এবং Hourly/Daily সিঙ্ক কনফার্ম করুন।</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Live TikTok Events API Diagnostics & Tester */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-600" />
                  <span>Live TikTok Conversion Diagnostics &amp; Test Events</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  TikTok Events Manager এ ইভেন্ট সঠিক পৌঁছাচ্ছে কিনা তা সরাসরি এক ক্লিকে পরীক্ষা করুন
                </p>
              </div>

              {tiktokTestEventStatus.running ? (
                <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending to TikTok Events API...</span>
                </span>
              ) : tiktokTestEventStatus.message ? (
                <span
                  className={`text-xs font-bold flex items-center gap-1.5 ${
                    tiktokTestEventStatus.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
                  }`}
                >
                  {tiktokTestEventStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{tiktokTestEventStatus.message}</span>
                </span>
              ) : null}
            </div>

            {/* Test Trigger Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => handleTriggerTikTokTestEvent('PageView')}
                disabled={tiktokTestEventStatus.running}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
              >
                <Eye className="w-4 h-4 text-rose-600" />
                <span>Test PageView</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerTikTokTestEvent('ViewContent')}
                disabled={tiktokTestEventStatus.running}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4 text-rose-600" />
                <span>Test ViewContent</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerTikTokTestEvent('AddToCart')}
                disabled={tiktokTestEventStatus.running}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
              >
                <ShoppingCart className="w-4 h-4 text-rose-600" />
                <span>Test AddToCart</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerTikTokTestEvent('InitiateCheckout')}
                disabled={tiktokTestEventStatus.running}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4 text-rose-600" />
                <span>Test Checkout</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerTikTokTestEvent('CompletePayment')}
                disabled={tiktokTestEventStatus.running}
                className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 font-bold text-xs text-rose-900 dark:text-rose-100 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4 text-rose-600" />
                <span>Test Purchase (CAPI)</span>
              </button>
            </div>
          </div>

          {/* 5. Real-Time TikTok Event Logs Stream */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-rose-600" />
                <span>Recent TikTok Server &amp; Browser Event Logs ({tiktokServerLogs.length})</span>
              </h4>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={checkLiveTikTokStatus}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
                {tiktokServerLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearTikTokLogs}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>
            </div>

            {tiktokServerLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <Zap className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-600 dark:text-slate-400">কোনো TikTok ইভেন্ট লগ এখনও নেই</p>
                <p className="text-[11px] mt-0.5">উপরের বাটনগুলো চেপে টেস্ট ইভেন্ট পাঠিয়ে যাচাই করুন।</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Event Name</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Deduplication ID</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Details / Response</th>
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
      )}

      {/* TAB 4: GOOGLE ADS, GA4 & MERCHANT CENTER */}
      {activeTab === 'google' && (
        <div className="space-y-6">
          {/* 1. Google Live Server Status & Diagnostics Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-900 rounded-3xl p-6 border border-amber-900/40 text-white shadow-lg space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black tracking-tight text-white">
                      Google Ads, GA4 &amp; Merchant Center Hub
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        googleServerStatus?.status === 'connected'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : googleServerStatus?.status === 'error'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {googleServerStatus?.status === 'connected'
                        ? 'Connected • Active'
                        : googleServerStatus?.status === 'error'
                        ? 'Connection Error'
                        : 'Not Configured'}
                    </span>
                    {googleServerStatus?.hasEnhancedConversions && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                        Enhanced Conversions (SHA-256)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-200/70 mt-0.5">
                    Google Tag (gtag.js) • GA4 Enhanced Ecommerce • Google Ads Conversion Tracking &amp; Merchant Feed
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
                  <span>{isCheckingGoogleStatus ? 'Checking...' : 'Refresh Status'}</span>
                </button>
              </div>
            </div>

            {/* Google Quick Diagnostic Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-900/30">
                <span className="text-[11px] font-medium text-slate-400">GA4 Measurement ID</span>
                <p className="text-sm font-black text-white font-mono mt-0.5 truncate">
                  {advertiserState.google?.ga4MeasurementId || 'Not configured'}
                </p>
              </div>

              <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-900/30">
                <span className="text-[11px] font-medium text-slate-400">Google Ads Conversion ID</span>
                <p className="text-sm font-black text-white font-mono mt-0.5 truncate">
                  {advertiserState.google?.googleAdsConversionId || 'Not configured'}
                </p>
              </div>

              <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-900/30">
                <span className="text-[11px] font-medium text-slate-400">GTM Container ID</span>
                <p className="text-sm font-black text-white font-mono mt-0.5 truncate">
                  {advertiserState.google?.gtmContainerId || 'Optional (None)'}
                </p>
              </div>

              <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-900/30">
                <span className="text-[11px] font-medium text-slate-400">Tracked Conversions</span>
                <p className="text-sm font-black text-white mt-0.5">
                  {googleServerLogs.length} events logged
                </p>
              </div>
            </div>
          </div>

          {/* 2. Core Google Tag & Google Ads Configuration */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  <span>Google Ads &amp; GA4 Tracking Configuration</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  গুগল ট্যাগ ম্যানেজার, GA4 মেজারমেন্ট আইডি এবং গুগল অ্যাডস কনভার্সন অ্যাকশন লেবেল সেট করুন
                </p>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {advertiserState.google?.enabled ? 'Google Tracking Enabled' : 'Google Tracking Disabled'}
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
                  GA4 Measurement ID (Google Analytics 4)
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
                  Google Analytics &gt; Admin &gt; Data Streams থেকে Measurement ID কপি করুন।
                </span>
              </div>

              {/* Google Ads Conversion ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Google Ads Conversion ID
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
                  Google Ads &gt; Goals &gt; Conversions &gt; Summary থেকে Conversion ID (AW-XXXX) দিন।
                </span>
              </div>

              {/* GTM Container ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Google Tag Manager Container ID (Optional)
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
                  যদি GTM দিয়ে কাস্টম ট্যাগ চালাতে চান তবে GTM Container ID দিন।
                </span>
              </div>
            </div>

            {/* Conversion Action Labels Grid */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Google Ads Conversion Action Labels
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Purchase Conversion Label <span className="text-amber-500">*</span>
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
                  <span className="text-[10px] text-slate-400">পারচেজ ট্র্যাকিং লেবেল</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Begin Checkout Conversion Label
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
                  <span className="text-[10px] text-slate-400">চেকআউট শুরু ট্র্যাকিং</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Add To Cart Conversion Label
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
                  <span className="text-[10px] text-slate-400">কার্ট অ্যাড ট্র্যাকিং</span>
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
                    Google Ads Enhanced Conversions (SHA-256 Hashing)
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6.5">
                  গ্রাহকের ফোন ও ইমেল প্রথম পক্ষীয় তথ্য হিসেবে হ্যাশ ফরম্যাটে পাঠিয়ে রূপান্তর পরিমাপের নির্ভুলতা বৃদ্ধি করে।
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
                    GA4 Enhanced Ecommerce &amp; Dynamic Remarketing
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6.5">
                  ভিউ আইটেম, কার্ট এবং পারচেজের ই-কমার্স ডেটা লেয়ার (`window.dataLayer`) GA4 ফরম্যাটে স্বয়ংক্রিয়ভাবে পুশ করে।
                </p>
              </div>
            </div>

            {/* Granular Event Toggles */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                GA4 &amp; Google Ads Standard Conversion Events
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'pageView', label: 'page_view', desc: 'সব পেজ দর্শন' },
                  { key: 'viewItem', label: 'view_item', desc: 'পণ্য ডিটেইলস' },
                  { key: 'viewItemList', label: 'view_item_list', desc: 'ক্যাটালগ লিস্টিং' },
                  { key: 'selectItem', label: 'select_item', desc: 'প্রোডাক্ট ক্লিক' },
                  { key: 'search', label: 'search', desc: 'অনুসন্ধান কুয়েরি' },
                  { key: 'addToCart', label: 'add_to_cart', desc: 'কার্ট যুক্ত' },
                  { key: 'beginCheckout', label: 'begin_checkout', desc: 'চেকআউট শুরু' },
                  { key: 'purchase', label: 'purchase', desc: 'সফল পারচেজ' },
                  { key: 'signUp', label: 'sign_up', desc: 'গ্রাহক নিবন্ধন' },
                  { key: 'generateLead', label: 'generate_lead', desc: 'হোয়াটসঅ্যাপ ও লিড' },
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

          {/* 3. Google Merchant Center & Shopping Feed */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  <span>Google Merchant Center &amp; Shopping Product Feed</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Google Shopping, Performance Max ও ফ্রি প্রোডাক্ট লিস্টিংয়ের জন্য লাইভ ফিড URL
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {googleMerchantHealth?.totalEligibleProducts || products.length} Eligible Products in Feed
              </span>
            </div>

            {/* XML & JSON Feed Link Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* XML Google Shopping Feed */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-amber-600" />
                    <span>Google Merchant XML Feed (Google Shopping)</span>
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
                    <span>{copiedKey === 'g_xml_feed' ? 'Copied!' : 'Copy XML Link'}</span>
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
                    <span>Google Merchant JSON Feed</span>
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
                    <span>{copiedKey === 'g_json_feed' ? 'Copied!' : 'Copy JSON Link'}</span>
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

            {/* Google Merchant Setup Steps */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
              <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>How to Setup Feed in Google Merchant Center</span>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[11px] flex items-center justify-center">১</span>
                  <p className="font-bold text-slate-900 dark:text-white text-[11px]">Google Merchant Center খুলুন</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">Products &gt; Feeds এ যান এবং "+" বাটনে ক্লিক করুন।</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[11px] flex items-center justify-center">২</span>
                  <p className="font-bold text-slate-900 dark:text-white text-[11px]">Scheduled Fetch অপশন পছন্দ করুন</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">ফিড তৈরির অপশনে "Scheduled fetch" সিলেক্ট করুন।</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[11px] flex items-center justify-center">৩</span>
                  <p className="font-bold text-slate-900 dark:text-white text-[11px]">XML Feed URL দিন</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">File URL বক্সে <code>/api/google/merchant.xml</code> লিংকটি পেস্ট করুন।</p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[11px] flex items-center justify-center">৪</span>
                  <p className="font-bold text-slate-900 dark:text-white text-[11px]">Fetch Frequency ও Currency</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px]">Fetch frequency "Daily" এবং Target Country: <strong>Bangladesh (BDT)</strong> নিশ্চিত করুন।</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Live Google Ads & GA4 Diagnostics & Tester */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-600" />
                  <span>Live Google Conversion Diagnostics &amp; Test Events</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  GA4 ও Google Ads এ ই-কমার্স ইভেন্ট সঠিক ফায়ার হচ্ছে কিনা তা সরাসরি এক ক্লিকে পরীক্ষা করুন
                </p>
              </div>

              {googleTestEventStatus.running ? (
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending to Google Tag / GA4...</span>
                </span>
              ) : googleTestEventStatus.message ? (
                <span
                  className={`text-xs font-bold flex items-center gap-1.5 ${
                    googleTestEventStatus.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                  }`}
                >
                  {googleTestEventStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{googleTestEventStatus.message}</span>
                </span>
              ) : null}
            </div>

            {/* Test Trigger Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => handleTriggerGoogleTestEvent('page_view')}
                disabled={googleTestEventStatus.running}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
              >
                <Eye className="w-4 h-4 text-amber-600" />
                <span>Test page_view</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerGoogleTestEvent('view_item')}
                disabled={googleTestEventStatus.running}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span>Test view_item</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerGoogleTestEvent('add_to_cart')}
                disabled={googleTestEventStatus.running}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
              >
                <ShoppingCart className="w-4 h-4 text-amber-600" />
                <span>Test add_to_cart</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerGoogleTestEvent('begin_checkout')}
                disabled={googleTestEventStatus.running}
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 font-bold text-xs text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4 text-amber-600" />
                <span>Test begin_checkout</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerGoogleTestEvent('purchase')}
                disabled={googleTestEventStatus.running}
                className="p-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 font-bold text-xs text-amber-900 dark:text-amber-100 transition-all cursor-pointer flex flex-col items-center gap-1 disabled:opacity-50"
              >
                <DollarSign className="w-4 h-4 text-amber-600" />
                <span>Test purchase (Ads)</span>
              </button>
            </div>
          </div>

          {/* 5. Real-Time Google Event Logs Stream */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-amber-600" />
                <span>Recent Google Ads &amp; GA4 Event Logs ({googleServerLogs.length})</span>
              </h4>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={checkLiveGoogleStatus}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
                {googleServerLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearGoogleLogs}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 hover:bg-amber-100 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
              </div>
            </div>

            {googleServerLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <Globe className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-600 dark:text-slate-400">কোনো Google Ads বা GA4 ইভেন্ট লগ এখনও নেই</p>
                <p className="text-[11px] mt-0.5">উপরের বাটনগুলো চেপে টেস্ট ইভেন্ট পাঠিয়ে যাচাই করুন।</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Event Name</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Transaction / Event ID</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Details / Target</th>
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
                          {log.transactionId || 'N/A'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-sans text-[11px] max-w-[250px] truncate">
                          {log.details || log.error || 'Tracked'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SMART UTM GENERATOR & CAMPAIGN LINKS */}
      {activeTab === 'utm' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-600" />
                <span>Smart UTM & Boost Link Generator (ক্যাম্পেইন লিঙ্ক বিল্ডার)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ফেসবুক পোস্ট বুস্ট, রিলস, টিকটক ভিডিও বা এসএমএস ব্রডকাস্টের জন্য পারফেক্ট ট্র্যাকিং লিঙ্ক তৈরি করুন
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Target Page */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Destination Page
                </label>
                <select
                  value={utmTargetPage}
                  onChange={(e) => setUtmTargetPage(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="home">Store Homepage (হোমপেজ)</option>
                  <option value="shop">All Products Catalog (শপ পেজ)</option>
                  <option value="flash-sale">Flash Sale / Deals (ফ্ল্যাশ সেল)</option>
                  <option value="product">Specific Product / Landing Page (নির্দিষ্ট পণ্য)</option>
                </select>
              </div>

              {/* Product Selector if Product selected */}
              {utmTargetPage === 'product' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Target Product
                  </label>
                  <select
                    value={utmSelectedProductId}
                    onChange={(e) => setUtmSelectedProductId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (৳{p.price})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quick Platform Preset */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Platform / Ad Format Preset
                </label>
                <select
                  value={utmPlatform}
                  onChange={(e) => handlePlatformPresetChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="facebook_feed">Facebook Feed Ad (ক্যাম্পেইন বুস্ট)</option>
                  <option value="facebook_reels">Facebook Reels Ad (রিলস বিজ্ঞাপন)</option>
                  <option value="instagram_ad">Instagram Story / Ad</option>
                  <option value="tiktok_infeed">TikTok In-Feed Ad</option>
                  <option value="google_search">Google Search Ad</option>
                  <option value="youtube_promo">YouTube Video / Banner</option>
                  <option value="sms_blast">SMS Blast Broadcast</option>
                  <option value="whatsapp_promo">WhatsApp Direct Message</option>
                  <option value="influencer">Influencer / Affiliate Promo</option>
                </select>
              </div>
            </div>

            {/* Custom UTM Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  utm_source
                </label>
                <input
                  type="text"
                  value={utmSource}
                  onChange={(e) => setUtmSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  utm_medium
                </label>
                <input
                  type="text"
                  value={utmMedium}
                  onChange={(e) => setUtmMedium(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  utm_campaign (ক্যাম্পেইন নাম)
                </label>
                <input
                  type="text"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="e.g. eid_mega_sale"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  utm_content (অ্যাড ভ্যারিয়েন্ট)
                </label>
                <input
                  type="text"
                  value={utmContent}
                  onChange={(e) => setUtmContent(e.target.value)}
                  placeholder="e.g. video_v1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {/* Generated Output Box */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Generated Campaign URL</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(generatedUrl, 'gen-url')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedKey === 'gen-url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'gen-url' ? 'Copied!' : 'Copy Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveCurrentUTM}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save to List</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-sky-400 break-all select-all border border-slate-800">
                {generatedUrl}
              </div>
            </div>
          </div>

          {/* Saved Campaign Links List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Saved Campaign Links ({advertiserState.savedUTMs?.length || 0})</span>
            </h4>

            {(!advertiserState.savedUTMs || advertiserState.savedUTMs.length === 0) ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                এখনো কোনো ক্যাম্পেইন লিঙ্ক সেভ করা হয়নি। উপরে লিঙ্ক তৈরি করে 'Save to List' এ ক্লিক করুন।
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {advertiserState.savedUTMs.map((u) => (
                  <div key={u.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">{u.name}</h5>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {u.productOrPage}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-sky-600 dark:text-sky-400 truncate mt-0.5 select-all">
                        {u.fullUrl}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyText(u.fullUrl, u.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedKey === u.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === u.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSavedUTM(u.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: AD SPEND & ROAS TRACKER */}
      {activeTab === 'roas' && (
        <div className="space-y-6">
          {/* Metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Ad Spend (বিজ্ঞাপন খরচ)</span>
              <div className="text-2xl font-black text-rose-600">৳ {totalAdSpendBDT.toLocaleString()}</div>
              <p className="text-[10px] text-slate-400">Recorded across all campaigns</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Store Order Revenue</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">৳ {totalStoreRevenueBDT.toLocaleString()}</div>
              <p className="text-[10px] text-slate-400">{orders.length} total orders recorded</p>
            </div>

            <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-1">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Return on Ad Spend (ROAS)</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{overallROASMultiplier}x</div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">{overallROAS}% return on investment</p>
            </div>

            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Net Marketing Profit</span>
              <div className="text-2xl font-black text-indigo-600">
                ৳ {(totalStoreRevenueBDT - totalAdSpendBDT).toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-400">Revenue minus advertising cost</p>
            </div>
          </div>

          {/* Ad Spend Campaigns Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Campaign Ad Spend Logs (বুস্ট খরচ হিসাব)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  ফেসবুক ও টিকটকে প্রতি ক্যাম্পেইনে কত খরচ হয়েছে তা সংরক্ষণ করুন
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddSpendModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Log New Ad Spend</span>
              </button>
            </div>

            {(!advertiserState.adSpends || advertiserState.adSpends.length === 0) ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                কোনো ক্যাম্পেইন খরচ এখনও যোগ করা হয়নি। '+ Log New Ad Spend' বাটনে ক্লিক করে খরচ রেকর্ড করুন।
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3 rounded-l-xl">Campaign / Platform</th>
                      <th className="px-4 py-3">Spend Amount</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Target Product / UTM</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right rounded-r-xl">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {advertiserState.adSpends.map((spend) => (
                      <tr key={spend.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{spend.name}</div>
                          <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                            {spend.platform}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          ৳ {spend.spendBDT.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">{spend.startDate}</td>
                        <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">
                          {spend.productName || spend.utmCampaign || 'Storewide'}
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleAdSpendStatus(spend.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                              spend.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                : spend.status === 'paused'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {spend.status}
                          </button>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteAdSpend(spend.id)}
                            className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: LIVE EVENT STREAM & DIAGNOSTICS */}
      {activeTab === 'stream' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <span>Live Event Stream & Diagnostics Monitor</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                রিয়েল-টাইমে ব্রাউজার ও সার্ভার থেকে মেটা/টিকটক/গুগলে পাঠানো শেষ ১০০টি ইভেন্টের লাইভ লগ
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={streamFilter}
                onChange={(e) => setStreamFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 font-semibold"
              >
                <option value="all">All Channels</option>
                <option value="meta">Meta / Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="google">Google</option>
              </select>

              <button
                type="button"
                onClick={clearEventLogs}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Clear Stream
              </button>
            </div>
          </div>

          {liveEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <Activity className="w-8 h-8 text-slate-300 mx-auto" />
              <p>এখনো কোনো ইভেন্ট ফায়ার হয়নি। স্টোর ভিজিট করলে বা টেস্ট বাটন চাপলে লাইভ ইভেন্ট দেখতে পাবেন।</p>
            </div>
          ) : (
            <div className="space-y-2">
              {liveEvents
                .filter((e) => (streamFilter === 'all' ? true : e.platform === streamFilter))
                .slice(0, 30)
                .map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedLog(selectedLog?.id === ev.id ? null : ev)}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-extrabold text-slate-900 dark:text-white">{ev.eventName}</span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {ev.channel}
                        </span>
                        {ev.capiStatus === 'sent' && (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded">
                            CAPI Sent
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{ev.timestamp}</span>
                    </div>

                    {selectedLog?.id === ev.id && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 animate-in fade-in space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Event Payload:</div>
                        <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 text-[11px] font-mono overflow-x-auto">
                          {JSON.stringify(ev.payload, null, 2)}
                        </pre>
                        {ev.errorMessage && (
                          <p className="text-[11px] text-rose-500 font-semibold">{ev.errorMessage}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 8: CUSTOM SCRIPTS & HEADER/FOOTER CODE */}
      {activeTab === 'custom_scripts' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-indigo-600" />
              <span>Custom Tracking Scripts (Header & Body Code Injection)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pinterest Tag, Snapchat Pixel, Microsoft Clarity, Hotjar বা যেকোনো কাস্টম জাভাস্ক্রিপ্ট কোড এখানে যোগ করুন
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Header Code (Injected into &lt;head&gt;)
              </label>
              <textarea
                rows={6}
                value={advertiserState.customScripts?.headerScript || ''}
                onChange={(e) =>
                  setAdvertiserState((prev) => ({
                    ...prev,
                    customScripts: {
                      ...(prev.customScripts || {}),
                      headerScript: e.target.value,
                    },
                  }))
                }
                placeholder="<!-- Paste your custom tracking snippet here, e.g. Clarity, Hotjar, Pinterest -->"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Log New Ad Spend */}
      {isAddSpendModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>+ Log Campaign Ad Spend</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSpendModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Campaign Name / Boost Title *
                </label>
                <input
                  type="text"
                  required
                  value={newSpendName}
                  onChange={(e) => setNewSpendName(e.target.value)}
                  placeholder="e.g. Smart Watch Video Ad #1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Platform</label>
                  <select
                    value={newSpendPlatform}
                    onChange={(e) => setNewSpendPlatform(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="facebook">Facebook Ads</option>
                    <option value="tiktok">TikTok Ads</option>
                    <option value="google">Google Ads</option>
                    <option value="youtube">YouTube Ads</option>
                    <option value="influencer">Influencer</option>
                    <option value="sms">SMS Blast</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Spend Amount (৳ BDT) *</label>
                  <input
                    type="number"
                    min={1}
                    value={newSpendAmount}
                    onChange={(e) => setNewSpendAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Campaign Date</label>
                <input
                  type="date"
                  value={newSpendDate}
                  onChange={(e) => setNewSpendDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Linked Product (Optional)</label>
                <select
                  value={newSpendProductId}
                  onChange={(e) => setNewSpendProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">Storewide / Multiple Products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={newSpendNotes}
                  onChange={(e) => setNewSpendNotes(e.target.value)}
                  placeholder="e.g. Target audience: Dhaka & Chittagong 22-35 age"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddSpendModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddAdSpend}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Add Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Small Overlay to Quickly Toggle 'Active/Paused' Status for Individual Ad Campaigns without leaving the view */}
      <QuickCampaignToggleOverlay
        campaigns={advertiserState.adSpends || []}
        onToggleStatus={handleQuickToggleCampaignStatus}
        onAddNewSpend={() => setIsAddSpendModalOpen(true)}
      />
    </div>
  );
};
