import { AdvertiserSettings, Order, Product, SiteSettings } from '../types/index.ts';

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
  errorMessage?: string;
}

// In-memory circular event buffer (up to 100 events)
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
    localStorage.setItem(EVENT_LOGS_CACHE_KEY, JSON.stringify(eventLogs.slice(0, 80)));
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
  eventLogs = [log, ...eventLogs.slice(0, 99)];
  notifyListeners();
}

// Simple SHA-256 Hasher for Meta & TikTok Advanced Matching
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
    // Fallback: sanitized clean representation if subtle crypto fails
    return clean;
  }
}

// Format Phone Number for Meta/TikTok (Country code prefix + digits only, e.g. "88017XXXXXXXX")
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
 * Send Server-Side Meta Conversions API (CAPI) Event
 */
async function sendMetaCAPI(
  eventName: string,
  eventId: string,
  customData: Record<string, any>,
  userData: {
    phone?: string;
    email?: string;
    name?: string;
    clientIp?: string;
    clientUserAgent?: string;
  },
  settings?: SiteSettings | null
): Promise<{ success: boolean; message?: string }> {
  const meta = settings?.advertiserSettings?.meta;
  if (!meta?.enabled || !meta?.pixelId || !meta?.capiToken) {
    return { success: false, message: 'CAPI not configured or disabled' };
  }

  const pixelId = meta.pixelId.trim();
  const token = meta.capiToken.trim();
  const testCode = meta.testEventCode?.trim();

  try {
    const hashedEmail = userData.email ? await sha256Hash(userData.email) : undefined;
    const hashedPhone = userData.phone ? await sha256Hash(normalizeBdPhone(userData.phone)) : undefined;
    const nameParts = (userData.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const hashedFirstName = firstName ? await sha256Hash(firstName) : undefined;

    const payload: any = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: typeof window !== 'undefined' ? window.location.href : '',
          action_source: 'website',
          user_data: {
            em: hashedEmail ? [hashedEmail] : undefined,
            ph: hashedPhone ? [hashedPhone] : undefined,
            fn: hashedFirstName ? [hashedFirstName] : undefined,
            client_user_agent: navigator.userAgent,
          },
          custom_data: customData,
        },
      ],
    };

    if (testCode) {
      payload.test_event_code = testCode;
    }

    const response = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const resJson = await response.json();
    if (response.ok && resJson.events_received) {
      return { success: true, message: `Received ${resJson.events_received} event(s)` };
    } else {
      return {
        success: false,
        message: resJson.error?.message || 'Meta CAPI request failed',
      };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'CAPI network error' };
  }
}

/**
 * 1. TRACK PAGE VIEW
 */
export async function trackPixelPageView(
  pageTitle: string = document.title,
  settings?: SiteSettings | null
) {
  const eventId = `pageview-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const adv = settings?.advertiserSettings;

  // Meta Pixel
  if (adv?.meta?.enabled && adv.meta.events?.pageView !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'PageView', {}, { eventID: eventId });
      }
    } catch {}
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
        window.gtag('event', 'page_view', { page_title: pageTitle });
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
    channel: 'Meta • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: { pageTitle, url: window.location.href },
    status: 'sent',
    eventId,
  });
}

/**
 * 2. TRACK VIEW CONTENT (Product Detail View)
 */
export async function trackPixelViewContent(product: Product, settings?: SiteSettings | null) {
  if (!product) return;
  const eventId = `viewcontent-${product.id}-${Date.now()}`;
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

  // Meta Pixel
  if (adv?.meta?.enabled && adv.meta.events?.viewContent !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'ViewContent', metaPayload, { eventID: eventId });
      }
    } catch {}

    // CAPI Dispatch if token available
    if (adv.meta.capiToken) {
      sendMetaCAPI('ViewContent', eventId, metaPayload, {}, settings);
    }
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
    channel: 'Meta • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: metaPayload,
    status: 'sent',
    eventId,
  });
}

/**
 * 3. TRACK ADD TO CART
 */
export async function trackPixelAddToCart(
  product: Product,
  quantity: number = 1,
  variant?: string,
  settings?: SiteSettings | null
) {
  if (!product) return;
  const eventId = `addtocart-${product.id}-${Date.now()}`;
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

  // Meta Pixel
  if (adv?.meta?.enabled && adv.meta.events?.addToCart !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'AddToCart', metaPayload, { eventID: eventId });
      }
    } catch {}

    if (adv.meta.capiToken) {
      sendMetaCAPI('AddToCart', eventId, metaPayload, {}, settings);
    }
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
    channel: 'Meta • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: metaPayload,
    status: 'sent',
    eventId,
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
  const eventId = `initcheckout-${Date.now()}`;
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

  // Meta Pixel
  if (adv?.meta?.enabled && adv.meta.events?.initiateCheckout !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'InitiateCheckout', metaPayload, { eventID: eventId });
      }
    } catch {}

    if (adv.meta.capiToken) {
      sendMetaCAPI('InitiateCheckout', eventId, metaPayload, {}, settings);
    }
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
    channel: 'Meta • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: metaPayload,
    status: 'sent',
    eventId,
  });
}

/**
 * 5. TRACK PURCHASE (Real Client Pixel + Server-Side CAPI)
 */
export async function trackPixelPurchase(order: Order, settings?: SiteSettings | null) {
  if (!order) return;
  const eventId = `purchase-${order.id}`;
  const adv = settings?.advertiserSettings;
  const totalAmount = order.totalAmount || order.subtotal || 0;
  const contentIds = (order.items || []).map((i) => i.productId);
  const numItems = (order.items || []).reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  const contentNames = (order.items || []).map((i) => i.productName).join(', ');

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
    phone: order.customerMobile || order.deliveryMobile,
    email: order.customerEmail,
    name: order.customerName || order.deliveryName,
  };

  let capiResult: { success: boolean; message?: string } = { success: false };

  // Meta Pixel
  if (adv?.meta?.enabled && adv.meta.events?.purchase !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'Purchase', metaPayload, { eventID: eventId });
      }
    } catch (e) {
      console.warn('[Meta Pixel Purchase Error]', e);
    }

    // High Priority Server-Side CAPI
    if (adv.meta.capiToken) {
      capiResult = await sendMetaCAPI('Purchase', eventId, metaPayload, userData, settings);
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
        // GA4 purchase
        window.gtag('event', 'purchase', {
          transaction_id: order.id,
          value: totalAmount,
          currency: 'BDT',
          tax: 0,
          shipping: order.deliveryCharge || 0,
          items: (order.items || []).map((i) => ({
            item_id: i.productId,
            item_name: i.productName,
            price: i.price,
            quantity: i.quantity,
          })),
        });

        // Google Ads Purchase Conversion Label
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
    channel: 'Meta Pixel + CAPI • TikTok • Google Ads',
    timestamp: new Date().toLocaleTimeString(),
    payload: {
      ...metaPayload,
      customerPhone: userData.phone ? `${userData.phone.slice(0, 5)}***` : 'N/A',
      customerName: userData.name,
      capiDelivered: capiResult.success,
      capiMessage: capiResult.message,
    },
    status: 'sent',
    eventId,
    capiStatus: capiResult.success ? 'sent' : adv?.meta?.capiToken ? 'failed' : 'skipped',
    errorMessage: capiResult.success ? undefined : capiResult.message,
  });
}

/**
 * 6. TRACK SEARCH
 */
export async function trackPixelSearch(query: string, resultsCount: number = 0, settings?: SiteSettings | null) {
  if (!query || !query.trim()) return;
  const eventId = `search-${Date.now()}`;
  const adv = settings?.advertiserSettings;

  if (adv?.meta?.enabled && adv.meta.events?.search !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'Search', { search_string: query }, { eventID: eventId });
      }
    } catch {}
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
    channel: 'Meta • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: { search_string: query, resultsCount },
    status: 'sent',
    eventId,
  });
}

/**
 * 7. TRACK CONTACT / LEAD (WhatsApp, Messenger, Phone calls)
 */
export async function trackPixelContact(channel: 'whatsapp' | 'messenger' | 'phone' | 'telegram', details?: string, settings?: SiteSettings | null) {
  const eventId = `contact-${channel}-${Date.now()}`;
  const adv = settings?.advertiserSettings;

  if (adv?.meta?.enabled && adv.meta.events?.contact !== false) {
    try {
      if (window.fbq) {
        window.fbq('track', 'Contact', { channel, details }, { eventID: eventId });
      }
    } catch {}
  }

  if (adv?.tiktok?.enabled && adv.tiktok.events?.contact !== false) {
    try {
      if (window.ttq) {
        window.ttq.track('Contact', { channel, details });
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
    eventName: 'Contact',
    platform: 'all',
    channel: 'Meta • TikTok • Google',
    timestamp: new Date().toLocaleTimeString(),
    payload: { channel, details },
    status: 'sent',
    eventId,
  });
}

/**
 * 8. MANUAL TEST EVENT SENDER FOR META CAPI & PIXEL
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

  // Server-Side CAPI
  let capiMessage = 'Browser pixel triggered';
  let capiSuccess = true;

  if (adv?.meta?.capiToken && adv.meta.pixelId) {
    const res = await sendMetaCAPI(
      eventName,
      eventId,
      customPayload,
      {
        phone: '01700000000',
        email: 'test@kenaxbd.com',
        name: 'Test Customer',
      },
      settings
    );
    capiSuccess = res.success;
    capiMessage = res.message || (res.success ? 'Delivered to Meta Graph API' : 'CAPI Failed');
  }

  addEventLog({
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    eventName: `Test: ${eventName}`,
    platform: 'meta',
    channel: 'Meta Pixel + CAPI (Test Mode)',
    timestamp: new Date().toLocaleTimeString(),
    payload: { ...customPayload, testEventCode: adv?.meta?.testEventCode || 'None' },
    status: capiSuccess ? 'sent' : 'failed',
    eventId,
    capiStatus: capiSuccess ? 'sent' : 'failed',
    errorMessage: capiSuccess ? undefined : capiMessage,
  });

  return {
    success: capiSuccess,
    message: capiMessage,
  };
}
