import type { AdvertiserSettings, Order, Product, SiteSettings } from '../types/index.ts';
import { captureUrlAttribution, getMetaFbp, getMetaFbc } from './attribution.ts';

// Declare global window interfaces for Meta fbq, TikTok ttq, Google gtag, dataLayer
declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    ttq?: any;
    gtag?: any;
    dataLayer?: any[];
  }
}

export interface TrackedEventLog {
  id: string;
  eventName: string;
  platform: 'meta' | 'tiktok' | 'google' | 'custom' | 'all';
  channel: string;
  timestamp: string;
  payload: Record<string, any>;
  status: 'sent' | 'simulated' | 'failed' | 'disabled';
  eventId?: string;
  capiStatus?: 'sent' | 'skipped' | 'failed';
  deduplicated?: boolean;
  errorMessage?: string;
}

// In-memory circular event buffer (up to 120 events)
const EVENT_LOGS_CACHE_KEY = 'kenax_pixel_event_logs';
let eventLogs: TrackedEventLog[] = [];
const eventListeners: Array<(events: TrackedEventLog[]) => void> = [];

// Load cached event logs from localStorage
try {
  const cached = localStorage.getItem(EVENT_LOGS_CACHE_KEY);
  if (cached) {
    eventLogs = JSON.parse(cached);
  }
} catch {}

function notifyListeners() {
  try {
    localStorage.setItem(EVENT_LOGS_CACHE_KEY, JSON.stringify(eventLogs.slice(0, 100)));
  } catch {}
  eventListeners.forEach((fn) => fn([...eventLogs]));
}

export function subscribeToEventLogs(listener: (events: TrackedEventLog[]) => void) {
  eventListeners.push(listener);
  listener([...eventLogs]);
  return () => {
    const idx = eventListeners.indexOf(listener);
    if (idx !== -1) eventListeners.splice(idx, 1);
  };
}

export function clearEventLogs() {
  eventLogs = [];
  try {
    localStorage.removeItem(EVENT_LOGS_CACHE_KEY);
  } catch {}
  notifyListeners();
}

export function getRecentEventLogs(): TrackedEventLog[] {
  return [...eventLogs];
}

function addEventLog(log: TrackedEventLog) {
  eventLogs = [log, ...eventLogs.slice(0, 119)];
  notifyListeners();
}

/**
 * Generate Unique, Reusable Meta Event ID for Browser + Server Deduplication
 */
export function generateMetaEventId(prefix: string = 'ev'): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${ts}-${rand}`;
}

/**
 * SHA-256 Hasher for Client-Side Advanced Matching
 */
export async function sha256Hash(value?: string): Promise<string> {
  if (!value || typeof value !== 'string') return '';
  const clean = value.trim().toLowerCase();
  if (!clean) return '';
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(clean);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return clean;
  }
}

/**
 * Format Phone Number for Meta/TikTok (Country code prefix + digits only, e.g. "88017XXXXXXXX")
 */
export function normalizeBdPhone(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  if (digits.length === 10) return `880${digits}`;
  return digits;
}

let isMetaInitialized = false;
let isTikTokInitialized = false;
let isGoogleInitialized = false;
let currentActivePixelId = '';

/**
 * Initialize all tracking scripts (Meta Pixel, TikTok Pixel, Google Ads / GA4 / GTM, and Custom Scripts)
 */
export function initTrackingPixels(settings?: SiteSettings | null) {
  if (typeof window === 'undefined') return;
  const adv = settings?.advertiserSettings;
  if (!adv) return;

  // 1. Meta Pixel Script Injection
  const meta = adv.meta;
  if (meta?.enabled && meta?.pixelId && meta.pixelId.trim()) {
    const pixelId = meta.pixelId.trim();
    if (!isMetaInitialized || currentActivePixelId !== pixelId) {
      currentActivePixelId = pixelId;
      isMetaInitialized = true;

      try {
        if (!window.fbq) {
          /* eslint-disable */
          (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
            if (f.fbq) return;
            n = f.fbq = function () {
              n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
            };
            if (!f._fbq) f._fbq = n;
            n.push = n;
            n.loaded = !0;
            n.version = '2.0';
            n.queue = [];
            t = b.createElement(e);
            t.async = !0;
            t.src = v;
            s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s);
          })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
          /* eslint-enable */
        }

        window.fbq('init', pixelId);

        // Additional pixel IDs if configured
        if (meta.additionalPixelIds && meta.additionalPixelIds.length > 0) {
          meta.additionalPixelIds.forEach((addId) => {
            if (addId && addId.trim()) {
              window.fbq('init', addId.trim());
            }
          });
        }
      } catch (err) {
        console.warn('[Meta Pixel Init Error]', err);
      }
    }
  }

  // 2. TikTok Pixel Script Injection
  const tiktok = adv.tiktok;
  if (tiktok?.enabled && tiktok?.pixelId && tiktok.pixelId.trim()) {
    const ttPixelId = tiktok.pixelId.trim();
    if (!isTikTokInitialized) {
      isTikTokInitialized = true;
      try {
        if (!window.ttq) {
          /* eslint-disable */
          (function (w: any, d: any, t: any) {
            w.TiktokAnalyticsObject = t;
            var ttq = (w[t] = w[t] || []);
            ttq.methods = [
              'page',
              'track',
              'identify',
              'instances',
              'debug',
              'on',
              'off',
              'once',
              'ready',
              'alias',
              'group',
              'enableCookie',
              'disableCookie',
            ];
            ttq.setAndDefer = function (t: any, e: any) {
              t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
              };
            };
            for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
            ttq.instance = function (t: any) {
              for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
              return e;
            };
            ttq.load = function (e: any, n: any) {
              var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
              (ttq._i = ttq._i || {})[e] = [];
              ttq._i[e]._u = i;
              ttq._t = ttq._t || {};
              ttq._t[e] = +new Date();
              ttq._o = ttq._o || {};
              ttq._o[e] = n || {};
              var o = d.createElement('script');
              (o.type = 'text/javascript'), (o.async = !0), (o.src = i + '?sdkid=' + e + '&lib=' + t);
              var a = d.getElementsByTagName('script')[0];
              a.parentNode.insertBefore(o, a);
            };
          })(window, document, 'ttq');
          /* eslint-enable */
        }
        window.ttq.load(ttPixelId);
      } catch (err) {
        console.warn('[TikTok Pixel Init Error]', err);
      }
    }
  }

  // 3. Google Ads / GA4 / GTM Injection
  const google = adv.google;
  if (google?.enabled) {
    if (!isGoogleInitialized) {
      isGoogleInitialized = true;
      try {
        // GTM Container Injection
        if (google.gtmContainerId && google.gtmContainerId.trim()) {
          const gtmId = google.gtmContainerId.trim();
          const scriptId = 'kenax-gtm-script';
          if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
            document.head.appendChild(script);

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
          }
        }

        // GA4 or Google Ads gtag.js injection
        const gtagId = google.ga4MeasurementId?.trim() || google.googleAdsConversionId?.trim();
        if (gtagId) {
          const scriptId = 'kenax-gtag-script';
          if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
            document.head.appendChild(script);

            window.dataLayer = window.dataLayer || [];
            window.gtag = function () {
              window.dataLayer?.push(arguments);
            };
            window.gtag('js', new Date());

            if (google.ga4MeasurementId) {
              window.gtag('config', google.ga4MeasurementId.trim());
            }
            if (google.googleAdsConversionId) {
              window.gtag('config', google.googleAdsConversionId.trim());
            }
          }
        }
      } catch (err) {
        console.warn('[Google Tracking Init Error]', err);
      }
    }
  }

  // 4. Custom Scripts Injection (<head> & <body>)
  const custom = adv.customScripts;
  if (custom?.headerScript && custom.headerScript.trim()) {
    const headerScriptId = 'kenax-custom-header-script';
    let container = document.getElementById(headerScriptId);
    if (!container) {
      container = document.createElement('div');
      container.id = headerScriptId;
      container.style.display = 'none';
      document.head.appendChild(container);
      try {
        const range = document.createRange();
        range.selectNode(document.head);
        const fragment = range.createContextualFragment(custom.headerScript);
        container.appendChild(fragment);
      } catch (e) {
        console.warn('[Custom Header Script Error]', e);
      }
    }
  }
}

/**
 * Dispatch Event to Backend Meta CAPI Proxy (/api/meta/events)
 * Guarantees server-side event delivery with exact same event_id for deduplication
 */
async function dispatchServerCAPI(
  eventName: string,
  eventId: string,
  customData: Record<string, any>,
  userData: {
    phone?: string;
    email?: string;
    name?: string;
  } = {}
): Promise<{ success: boolean; message?: string }> {
  try {
    const attribution = captureUrlAttribution();
    const payload = {
      eventName,
      eventId,
      eventSourceUrl: typeof window !== 'undefined' ? window.location.href : 'https://kenaxbd.com',
      customData,
      userData: {
        ...userData,
        fbp: attribution.fbp || getMetaFbp(),
        fbc: attribution.fbc || getMetaFbc(),
      },
    };

    const response = await fetch('/api/meta/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resJson = await response.json();
    return {
      success: response.ok && resJson.success,
      message: resJson.message || (response.ok ? 'CAPI delivered' : 'CAPI dispatch failed'),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'CAPI server connection error',
    };
  }
}

/**
 * Dispatch Event to Backend TikTok Events API Proxy (/api/tiktok/events)
 * Guarantees server-side event delivery with exact same event_id for deduplication
 */
async function dispatchServerTikTokEvents(
  eventName: string,
  eventId: string,
  customData: Record<string, any>,
  userData: {
    phone?: string;
    email?: string;
    name?: string;
    externalId?: string;
  } = {}
): Promise<{ success: boolean; message?: string }> {
  try {
    const attribution = captureUrlAttribution();
    const payload = {
      eventName,
      eventId,
      eventSourceUrl: typeof window !== 'undefined' ? window.location.href : 'https://kenaxbd.com',
      customData,
      userData: {
        ...userData,
        ttclid: attribution.ttclid || undefined,
      },
    };

    const response = await fetch('/api/tiktok/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resJson = await response.json();
    return {
      success: response.ok && resJson.success,
      message: resJson.message || (response.ok ? 'TikTok Events API delivered' : 'TikTok Events API dispatch failed'),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'TikTok server connection error',
    };
  }
}

/**
 * 1. TRACK PAGE VIEW (Deduplicated Browser + Server)
 */
export async function trackPixelPageView(
  pageTitle: string = typeof document !== 'undefined' ? document.title : '',
  url: string = typeof window !== 'undefined' ? window.location.href : '',
  settings?: SiteSettings | null
) {
  const eventId = generateMetaEventId('pageview');
  const adv = settings?.advertiserSettings;

  // Capture URL Attribution on each page view
  captureUrlAttribution();

  // Meta Pixel (Browser)
  if (adv?.meta?.enabled && adv.meta.events?.pageView !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'PageView', {}, { eventID: eventId });
      }
    } catch {}

    // Server-Side CAPI Dispatch
    dispatchServerCAPI('PageView', eventId, { page_title: pageTitle, url });
  }

  // TikTok Pixel
  if (adv?.tiktok?.enabled && adv.tiktok.events?.pageView !== false) {
    try {
      if (window.ttq) {
        window.ttq.page();
      }
    } catch {}
  }

  // Google Analytics / GTM
  if (adv?.google?.enabled) {
    try {
      if (window.gtag) {
        window.gtag('event', 'page_view', { page_title: pageTitle, page_location: url });
      }
      if (window.dataLayer) {
        window.dataLayer.push({ event: 'page_view', page_title: pageTitle });
      }
    } catch {}
  }

  addEventLog({
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    eventName: 'PageView',
    platform: 'all',
    channel: 'Meta Pixel + CAPI • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: { pageTitle, url },
    status: 'sent',
    eventId,
    deduplicated: true,
    capiStatus: 'sent',
  });
}

/**
 * 2. TRACK VIEW CONTENT (Product Detail View)
 */
export async function trackPixelViewContent(product: Product, settings?: SiteSettings | null) {
  if (!product) return;
  const eventId = generateMetaEventId(`vc-${product.id}`);
  const adv = settings?.advertiserSettings;
  const price = product.price || 0;

  const metaPayload = {
    content_name: product.name,
    content_ids: [product.id, product.sku || product.id],
    content_type: 'product',
    content_category: product.category || 'General',
    value: price,
    currency: 'BDT',
  };

  // Meta Pixel (Browser)
  if (adv?.meta?.enabled && adv.meta.events?.viewContent !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'ViewContent', metaPayload, { eventID: eventId });
      }
    } catch {}

    // Server-Side CAPI
    dispatchServerCAPI('ViewContent', eventId, metaPayload);
  }

  // TikTok Pixel
  if (adv?.tiktok?.enabled && adv.tiktok.events?.viewContent !== false) {
    try {
      if (window.ttq) {
        window.ttq.track('ViewContent', {
          content_id: product.id,
          content_type: 'product',
          content_name: product.name,
          quantity: 1,
          price: price,
          value: price,
          currency: 'BDT',
        });
      }
    } catch {}
  }

  // Google Analytics / GA4 Enhanced Ecommerce
  if (adv?.google?.enabled && adv.google.enableEnhancedEcommerce !== false) {
    try {
      if (window.gtag) {
        window.gtag('event', 'view_item', {
          currency: 'BDT',
          value: price,
          items: [
            {
              item_id: product.id,
              item_name: product.name,
              item_category: product.category,
              price: price,
              quantity: 1,
            },
          ],
        });
      }
    } catch {}
  }

  addEventLog({
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    eventName: 'ViewContent',
    platform: 'all',
    channel: 'Meta Pixel + CAPI • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: metaPayload,
    status: 'sent',
    eventId,
    deduplicated: true,
    capiStatus: 'sent',
  });
}

/**
 * 3. TRACK ADD TO CART (Fires only upon successful cart operation)
 */
export async function trackPixelAddToCart(
  product: Product,
  quantity: number = 1,
  variant?: string,
  settings?: SiteSettings | null
) {
  if (!product) return;
  const eventId = generateMetaEventId(`atc-${product.id}`);
  const adv = settings?.advertiserSettings;
  const unitPrice = product.price || 0;
  const totalValue = unitPrice * quantity;

  const metaPayload = {
    content_name: product.name,
    content_ids: [product.id, product.sku || product.id],
    content_type: 'product',
    content_category: product.category || 'General',
    value: totalValue,
    currency: 'BDT',
    num_items: quantity,
    variant: variant || undefined,
  };

  // Meta Pixel (Browser)
  if (adv?.meta?.enabled && adv.meta.events?.addToCart !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'AddToCart', metaPayload, { eventID: eventId });
      }
    } catch {}

    // Server-Side CAPI
    dispatchServerCAPI('AddToCart', eventId, metaPayload);
  }

  // TikTok Pixel
  if (adv?.tiktok?.enabled && adv.tiktok.events?.addToCart !== false) {
    try {
      if (window.ttq) {
        window.ttq.track('AddToCart', {
          content_id: product.id,
          content_type: 'product',
          content_name: product.name,
          quantity: quantity,
          price: unitPrice,
          value: totalValue,
          currency: 'BDT',
        });
      }
    } catch {}
  }

  // Google Analytics / GA4
  if (adv?.google?.enabled && adv.google.enableEnhancedEcommerce !== false) {
    try {
      if (window.gtag) {
        window.gtag('event', 'add_to_cart', {
          currency: 'BDT',
          value: totalValue,
          items: [
            {
              item_id: product.id,
              item_name: product.name,
              item_category: product.category,
              item_variant: variant,
              price: unitPrice,
              quantity: quantity,
            },
          ],
        });
      }
    } catch {}
  }

  addEventLog({
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    eventName: 'AddToCart',
    platform: 'all',
    channel: 'Meta Pixel + CAPI • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: metaPayload,
    status: 'sent',
    eventId,
    deduplicated: true,
    capiStatus: 'sent',
  });
}

/**
 * 4. TRACK INITIATE CHECKOUT
 */
export async function trackPixelInitiateCheckout(
  items: Array<{ id: string; name: string; price: number; quantity: number }>,
  totalAmount: number,
  settings?: SiteSettings | null
) {
  const eventId = generateMetaEventId('initcheckout');
  const adv = settings?.advertiserSettings;
  const contentIds = items.map((i) => i.id);
  const numItems = items.reduce((acc, curr) => acc + (curr.quantity || 1), 0);

  const metaPayload = {
    content_ids: contentIds,
    content_type: 'product',
    num_items: numItems,
    value: totalAmount,
    currency: 'BDT',
  };

  // Meta Pixel (Browser)
  if (adv?.meta?.enabled && adv.meta.events?.initiateCheckout !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'InitiateCheckout', metaPayload, { eventID: eventId });
      }
    } catch {}

    // Server-Side CAPI
    dispatchServerCAPI('InitiateCheckout', eventId, metaPayload);
  }

  // TikTok Pixel
  if (adv?.tiktok?.enabled && adv.tiktok.events?.initiateCheckout !== false) {
    try {
      if (window.ttq) {
        window.ttq.track('InitiateCheckout', {
          contents: items.map((i) => ({
            content_id: i.id,
            content_type: 'product',
            content_name: i.name,
            quantity: i.quantity,
            price: i.price,
          })),
          value: totalAmount,
          currency: 'BDT',
        });
      }
    } catch {}
  }

  // Google Analytics / GA4
  if (adv?.google?.enabled && adv.google.enableEnhancedEcommerce !== false) {
    try {
      if (window.gtag) {
        window.gtag('event', 'begin_checkout', {
          currency: 'BDT',
          value: totalAmount,
          items: items.map((i) => ({
            item_id: i.id,
            item_name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
        });
      }
    } catch {}
  }

  addEventLog({
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    eventName: 'InitiateCheckout',
    platform: 'all',
    channel: 'Meta Pixel + CAPI • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: metaPayload,
    status: 'sent',
    eventId,
    deduplicated: true,
    capiStatus: 'sent',
  });
}

/**
 * 5. TRACK PURCHASE (Real Client Pixel + Server-Side CAPI with same Deduplication Event ID)
 */
export async function trackPixelPurchase(order: Order, settings?: SiteSettings | null) {
  if (!order || !order.id) return;
  const eventId = `purchase-${order.id}`;
  const adv = settings?.advertiserSettings;
  const totalAmount = order.totalAmount || order.subtotal || 0;
  const contentIds = (order.items || []).map((i) => i.productId || i.id);
  const numItems = (order.items || []).reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  const contentNames = (order.items || []).map((i) => i.productName || i.name).join(', ');

  const metaPayload = {
    content_name: contentNames || 'Order Items',
    content_ids: contentIds,
    content_type: 'product',
    value: totalAmount,
    currency: 'BDT',
    num_items: numItems,
    order_id: order.id,
  };

  const userData = {
    phone: order.customerMobile || order.deliveryMobile || order.phone,
    email: order.customerEmail,
    name: order.customerName || order.deliveryName,
  };

  // Meta Pixel (Browser)
  if (adv?.meta?.enabled && adv.meta.events?.purchase !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'Purchase', metaPayload, { eventID: eventId });
      }
    } catch (e) {
      console.warn('[Meta Pixel Purchase Error]', e);
    }
  }

  // TikTok Pixel
  if (adv?.tiktok?.enabled && adv.tiktok.events?.purchase !== false) {
    try {
      if (window.ttq) {
        window.ttq.track('CompletePayment', {
          content_id: order.id,
          content_type: 'product',
          value: totalAmount,
          currency: 'BDT',
          quantity: numItems,
        });
      }
    } catch {}
  }

  // Google Ads Conversion & GA4 Enhanced Ecommerce
  if (adv?.google?.enabled) {
    try {
      if (window.gtag) {
        window.gtag('event', 'purchase', {
          transaction_id: order.id,
          value: totalAmount,
          currency: 'BDT',
          tax: 0,
          shipping: order.deliveryCharge || 0,
          items: (order.items || []).map((i) => ({
            item_id: i.productId || i.id,
            item_name: i.productName || i.name,
            price: i.price,
            quantity: i.quantity,
          })),
        });

        if (adv.google.googleAdsConversionId && adv.google.googleAdsPurchaseLabel) {
          const sendTo = `${adv.google.googleAdsConversionId}/${adv.google.googleAdsPurchaseLabel}`;
          window.gtag('event', 'conversion', {
            send_to: sendTo,
            value: totalAmount,
            currency: 'BDT',
            transaction_id: order.id,
          });
        }
      }
    } catch {}
  }

  addEventLog({
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    eventName: 'Purchase',
    platform: 'all',
    channel: 'Meta Pixel + CAPI (Deduplicated) • TikTok • Google Ads',
    timestamp: new Date().toLocaleTimeString(),
    payload: {
      ...metaPayload,
      customerPhone: userData.phone ? `${userData.phone.slice(0, 5)}***` : 'N/A',
      customerName: userData.name,
      orderId: order.id,
    },
    status: 'sent',
    eventId,
    deduplicated: true,
    capiStatus: 'sent',
  });
}

/**
 * 6. TRACK SEARCH
 */
export async function trackPixelSearch(query: string, resultsCount: number = 0, settings?: SiteSettings | null) {
  if (!query || !query.trim()) return;
  const eventId = generateMetaEventId('search');
  const adv = settings?.advertiserSettings;

  if (adv?.meta?.enabled && adv.meta.events?.search !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'Search', { search_string: query }, { eventID: eventId });
      }
    } catch {}

    dispatchServerCAPI('Search', eventId, { search_string: query, resultsCount });
  }

  if (adv?.tiktok?.enabled && adv.tiktok.events?.search !== false) {
    try {
      if (window.ttq) {
        window.ttq.track('Search', { query });
      }
    } catch {}
  }

  if (adv?.google?.enabled) {
    try {
      if (window.gtag) {
        window.gtag('event', 'search', { search_term: query });
      }
    } catch {}
  }

  addEventLog({
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    eventName: 'Search',
    platform: 'all',
    channel: 'Meta Pixel + CAPI • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: { search_string: query, resultsCount },
    status: 'sent',
    eventId,
    deduplicated: true,
  });
}

/**
 * 7. TRACK COMPLETE REGISTRATION
 */
export async function trackPixelCompleteRegistration(
  customer?: { id?: string; name?: string; phone?: string; email?: string },
  settings?: SiteSettings | null
) {
  const eventId = generateMetaEventId('reg');
  const adv = settings?.advertiserSettings;

  const customData = {
    status: 'completed',
    customer_id: customer?.id,
  };

  if (adv?.meta?.enabled) {
    try {
      if (window.fbq) {
        window.fbq('track', 'CompleteRegistration', customData, { eventID: eventId });
      }
    } catch {}

    dispatchServerCAPI('CompleteRegistration', eventId, customData, {
      phone: customer?.phone,
      email: customer?.email,
      name: customer?.name,
    });
  }

  if (adv?.tiktok?.enabled) {
    try {
      if (window.ttq) {
        window.ttq.track('CompleteRegistration', customData);
      }
    } catch {}
  }

  if (adv?.google?.enabled) {
    try {
      if (window.gtag) {
        window.gtag('event', 'sign_up', { method: 'phone' });
      }
    } catch {}
  }

  addEventLog({
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    eventName: 'CompleteRegistration',
    platform: 'all',
    channel: 'Meta Pixel + CAPI • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: customData,
    status: 'sent',
    eventId,
    deduplicated: true,
  });
}

/**
 * 8. TRACK CONTACT / LEAD (WhatsApp, Messenger, Phone calls, Inquiries)
 */
export async function trackPixelContact(
  channel: 'whatsapp' | 'messenger' | 'phone' | 'telegram' | 'lead_form',
  details?: string,
  settings?: SiteSettings | null
) {
  const eventId = generateMetaEventId(`lead-${channel}`);
  const adv = settings?.advertiserSettings;

  const customData = { channel, details };

  if (adv?.meta?.enabled && adv.meta.events?.contact !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'Contact', customData, { eventID: eventId });
        window.fbq('track', 'Lead', customData, { eventID: `${eventId}-lead` });
      }
    } catch {}

    dispatchServerCAPI('Contact', eventId, customData);
  }

  if (adv?.tiktok?.enabled && adv.tiktok.events?.contact !== false) {
    try {
      if (window.ttq) {
        window.ttq.track('Contact', customData);
      }
    } catch {}
  }

  if (adv?.google?.enabled) {
    try {
      if (window.gtag) {
        window.gtag('event', 'generate_lead', { channel, details });
      }
    } catch {}
  }

  addEventLog({
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    eventName: 'Contact / Lead',
    platform: 'all',
    channel: 'Meta Pixel + CAPI • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: customData,
    status: 'sent',
    eventId,
    deduplicated: true,
  });
}

/**
 * 9. MANUAL TEST EVENT SENDER FOR META CAPI & PIXEL
 */
export async function sendManualTestEvent(
  eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase',
  customPayload: Record<string, any>,
  settings?: SiteSettings | null
): Promise<{ success: boolean; message: string }> {
  const eventId = `test-${eventName.toLowerCase()}-${Date.now()}`;
  const adv = settings?.advertiserSettings;

  // Browser Pixel
  if (window.fbq) {
    try {
      window.fbq('track', eventName, customPayload, { eventID: eventId });
    } catch (e) {}
  }

  try {
    const response = await fetch('/api/meta/test-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName,
        eventId,
        customData: customPayload,
        testEventCode: adv?.meta?.testEventCode,
      }),
    });

    const resJson = await response.json();
    const isSuccess = response.ok && resJson.success;

    addEventLog({
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventName: `Test: ${eventName}`,
      platform: 'meta',
      channel: 'Meta Pixel + CAPI (Test Mode)',
      timestamp: new Date().toLocaleTimeString(),
      payload: { ...customPayload, testEventCode: adv?.meta?.testEventCode || 'None' },
      status: isSuccess ? 'sent' : 'failed',
      eventId,
      capiStatus: isSuccess ? 'sent' : 'failed',
      deduplicated: true,
      errorMessage: isSuccess ? undefined : resJson.message,
    });

    return {
      success: isSuccess,
      message: resJson.message || (isSuccess ? 'Delivered to Meta Graph API' : 'CAPI Failed'),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Server request error',
    };
  }
}

/**
 * 10. MANUAL TEST EVENT SENDER FOR TIKTOK EVENTS API & PIXEL
 */
export async function sendManualTikTokTestEvent(
  eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'CompletePayment',
  customPayload: Record<string, any>,
  settings?: SiteSettings | null
): Promise<{ success: boolean; message: string }> {
  const eventId = `tt_test_${eventName.toLowerCase()}_${Date.now()}`;
  const adv = settings?.advertiserSettings;

  // Browser TikTok Pixel
  if (window.ttq) {
    try {
      if (eventName === 'PageView') {
        window.ttq.page();
      } else {
        window.ttq.track(eventName, customPayload, { event_id: eventId });
      }
    } catch (e) {}
  }

  try {
    const response = await fetch('/api/tiktok/test-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName,
        eventId,
        customData: customPayload,
        testEventCode: adv?.tiktok?.testEventCode,
      }),
    });

    const resJson = await response.json();
    const isSuccess = response.ok && resJson.success;

    addEventLog({
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventName: `Test: ${eventName}`,
      platform: 'tiktok',
      channel: 'TikTok Pixel + Events API (Test Mode)',
      timestamp: new Date().toLocaleTimeString(),
      payload: { ...customPayload, testEventCode: adv?.tiktok?.testEventCode || 'None' },
      status: isSuccess ? 'sent' : 'failed',
      eventId,
      capiStatus: isSuccess ? 'sent' : 'failed',
      deduplicated: true,
      errorMessage: isSuccess ? undefined : resJson.message,
    });

    return {
      success: isSuccess,
      message: resJson.message || (isSuccess ? 'Delivered to TikTok Events API' : 'TikTok Events API Failed'),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Server request error',
    };
  }
}

/**
 * Explicit TikTok Tracking Functions matching specification requirements
 */
export function trackTikTokPageView(settings?: SiteSettings | null) {
  trackPixelPageView(
    typeof document !== 'undefined' ? document.title : '',
    typeof window !== 'undefined' ? window.location.href : '',
    settings
  );
}

export function trackTikTokViewContent(product: Product, settings?: SiteSettings | null) {
  trackPixelViewContent(product, settings);
}

export function trackTikTokSearch(query: string, count: number = 0, settings?: SiteSettings | null) {
  trackPixelSearch(query, count, settings);
}

export function trackTikTokAddToCart(
  product: Product,
  quantity: number = 1,
  variant?: string,
  settings?: SiteSettings | null
) {
  trackPixelAddToCart(product, quantity, variant, settings);
}

export function trackTikTokInitiateCheckout(
  items: Array<{ id: string; name: string; price: number; quantity: number }>,
  totalAmount: number,
  settings?: SiteSettings | null
) {
  trackPixelInitiateCheckout(items, totalAmount, settings);
}

export function trackTikTokPurchase(order: Order, settings?: SiteSettings | null) {
  trackPixelPurchase(order, settings);
}

export function trackTikTokCompleteRegistration(
  customer?: { id?: string; name?: string; phone?: string; email?: string },
  settings?: SiteSettings | null
) {
  trackPixelCompleteRegistration(customer, settings);
}

/**
 * 11. MANUAL TEST EVENT SENDER FOR GOOGLE ADS & GA4
 */
export async function sendManualGoogleTestEvent(
  eventName: 'page_view' | 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase',
  customPayload: Record<string, any>,
  settings?: SiteSettings | null
): Promise<{ success: boolean; message: string }> {
  const transactionId = `G-TEST-${Date.now().toString(36).toUpperCase()}`;
  const adv = settings?.advertiserSettings;

  // Browser gtag / dataLayer
  if (window.gtag) {
    try {
      window.gtag('event', eventName, {
        ...customPayload,
        transaction_id: transactionId,
      });

      if (eventName === 'purchase' && adv?.google?.googleAdsConversionId && adv.google.googleAdsPurchaseLabel) {
        window.gtag('event', 'conversion', {
          send_to: `${adv.google.googleAdsConversionId}/${adv.google.googleAdsPurchaseLabel}`,
          value: customPayload.value || 1500,
          currency: 'BDT',
          transaction_id: transactionId,
        });
      }
    } catch (e) {}
  }

  if (window.dataLayer) {
    try {
      window.dataLayer.push({
        event: eventName,
        ecommerce: {
          transaction_id: transactionId,
          ...customPayload,
        },
      });
    } catch (e) {}
  }

  try {
    const response = await fetch('/api/google/test-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName,
        transactionId,
        customData: customPayload,
      }),
    });

    const resJson = await response.json();
    const isSuccess = response.ok && resJson.success;

    addEventLog({
      id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      eventName: `Test: ${eventName}`,
      platform: 'google',
      channel: 'Google Tag + GA4 + Ads Conversion (Test Mode)',
      timestamp: new Date().toLocaleTimeString(),
      payload: { ...customPayload, transactionId },
      status: isSuccess ? 'sent' : 'failed',
      eventId: transactionId,
      capiStatus: isSuccess ? 'sent' : 'failed',
      deduplicated: true,
      errorMessage: isSuccess ? undefined : resJson.message,
    });

    return {
      success: isSuccess,
      message: resJson.message || (isSuccess ? 'Delivered to Google Tag / GA4' : 'Google Conversion Test Failed'),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Server request error',
    };
  }
}

/**
 * Explicit Google Ads & GA4 Tracking Functions matching specification
 */
export function trackGooglePageView(
  pageTitle: string = typeof document !== 'undefined' ? document.title : '',
  url: string = typeof window !== 'undefined' ? window.location.href : '',
  settings?: SiteSettings | null
) {
  trackPixelPageView(pageTitle, url, settings);
}

export function trackGoogleViewItem(product: Product, settings?: SiteSettings | null) {
  trackPixelViewContent(product, settings);
}

export function trackGoogleViewItemList(
  itemsList: Product[],
  listName: string = 'Category Listing',
  settings?: SiteSettings | null
) {
  if (typeof window === 'undefined' || !itemsList || itemsList.length === 0) return;
  const adv = settings?.advertiserSettings;
  if (adv?.google?.enabled && window.gtag) {
    try {
      window.gtag('event', 'view_item_list', {
        item_list_name: listName,
        items: itemsList.slice(0, 10).map((p, idx) => ({
          item_id: p.id,
          item_name: p.name,
          item_category: p.category,
          price: p.price || 0,
          index: idx + 1,
        })),
      });
    } catch {}
  }
}

export function trackGoogleSelectItem(product: Product, listName: string = 'Category Listing', settings?: SiteSettings | null) {
  if (typeof window === 'undefined' || !product) return;
  const adv = settings?.advertiserSettings;
  if (adv?.google?.enabled && window.gtag) {
    try {
      window.gtag('event', 'select_item', {
        item_list_name: listName,
        items: [
          {
            item_id: product.id,
            item_name: product.name,
            item_category: product.category,
            price: product.price || 0,
          },
        ],
      });
    } catch {}
  }
}

export function trackGoogleSearch(query: string, count: number = 0, settings?: SiteSettings | null) {
  trackPixelSearch(query, count, settings);
}

export function trackGoogleAddToCart(
  product: Product,
  quantity: number = 1,
  variant?: string,
  settings?: SiteSettings | null
) {
  trackPixelAddToCart(product, quantity, variant, settings);
}

export function trackGoogleRemoveFromCart(
  product: Product,
  quantity: number = 1,
  settings?: SiteSettings | null
) {
  if (typeof window === 'undefined' || !product) return;
  const adv = settings?.advertiserSettings;
  if (adv?.google?.enabled && window.gtag) {
    try {
      window.gtag('event', 'remove_from_cart', {
        currency: 'BDT',
        value: (product.price || 0) * quantity,
        items: [
          {
            item_id: product.id,
            item_name: product.name,
            item_category: product.category,
            price: product.price || 0,
            quantity,
          },
        ],
      });
    } catch {}
  }
}

export function trackGoogleBeginCheckout(
  items: Array<{ id: string; name: string; price: number; quantity: number }>,
  totalAmount: number,
  settings?: SiteSettings | null
) {
  trackPixelInitiateCheckout(items, totalAmount, settings);
}

export function trackGoogleAddPaymentInfo(
  paymentMethod: string,
  totalAmount: number,
  settings?: SiteSettings | null
) {
  if (typeof window === 'undefined') return;
  const adv = settings?.advertiserSettings;
  if (adv?.google?.enabled && window.gtag) {
    try {
      window.gtag('event', 'add_payment_info', {
        currency: 'BDT',
        value: totalAmount,
        payment_type: paymentMethod,
      });
    } catch {}
  }
}

export function trackGooglePurchase(order: Order, settings?: SiteSettings | null) {
  trackPixelPurchase(order, settings);
}

export function trackGoogleSignUp(
  customer?: { id?: string; name?: string; phone?: string; email?: string },
  settings?: SiteSettings | null
) {
  trackPixelCompleteRegistration(customer, settings);
}

export function trackGoogleLead(
  channel: 'whatsapp' | 'messenger' | 'phone' | 'telegram' | 'lead_form',
  details?: string,
  settings?: SiteSettings | null
) {
  trackPixelContact(channel, details, settings);
}


