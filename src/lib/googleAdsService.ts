import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Order } from '../types/index.ts';
import { updateOrderInStore } from '../db/orders.ts';
import { writeOrderToFirestore } from '../db/firestoreSync.ts';

export interface GoogleUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  clientIp?: string;
  clientUserAgent?: string;
}

export interface GoogleCustomData {
  value?: number;
  currency?: string;
  transaction_id?: string;
  conversion_label?: string;
  items?: Array<{
    item_id: string;
    item_name?: string;
    item_category?: string;
    price?: number;
    quantity?: number;
  }>;
  [key: string]: any;
}

export interface GoogleServerEventPayload {
  eventName:
    | 'page_view'
    | 'view_item'
    | 'view_item_list'
    | 'select_item'
    | 'search'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'begin_checkout'
    | 'add_payment_info'
    | 'purchase'
    | 'sign_up'
    | 'generate_lead'
    | string;
  transactionId?: string;
  customData?: GoogleCustomData;
  userData?: GoogleUserData;
  eventSourceUrl?: string;
  conversionAction?: string;
}

export interface GoogleServerEventLog {
  id: string;
  timestamp: string;
  eventName: string;
  transactionId?: string;
  status: 'sent' | 'simulated' | 'error' | 'not_configured';
  httpStatus?: number;
  conversionId?: string;
  conversionLabel?: string;
  details?: string;
  payloadSummary?: any;
  error?: string;
}

const GOOGLE_LOGS_FILE = path.join(process.cwd(), 'data', 'google_events_logs.json');
let inMemoryGoogleLogs: GoogleServerEventLog[] = [];

// Initialize logs from file if available
try {
  if (fs.existsSync(GOOGLE_LOGS_FILE)) {
    const raw = fs.readFileSync(GOOGLE_LOGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) inMemoryGoogleLogs = parsed.slice(-300);
  }
} catch {}

function saveGoogleLog(log: GoogleServerEventLog) {
  inMemoryGoogleLogs.unshift(log);
  if (inMemoryGoogleLogs.length > 300) {
    inMemoryGoogleLogs = inMemoryGoogleLogs.slice(0, 300);
  }
  try {
    const dir = path.dirname(GOOGLE_LOGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GOOGLE_LOGS_FILE, JSON.stringify(inMemoryGoogleLogs, null, 2), 'utf-8');
  } catch {}
}

export function getGoogleServerLogs(): GoogleServerEventLog[] {
  return inMemoryGoogleLogs;
}

export function clearGoogleServerLogs(): void {
  inMemoryGoogleLogs = [];
  try {
    if (fs.existsSync(GOOGLE_LOGS_FILE)) {
      fs.writeFileSync(GOOGLE_LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch {}
}

/**
 * SHA-256 Hashing for Google Enhanced Conversions
 */
export function hashGoogleValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  return crypto.createHash('sha256').update(trimmed).digest('hex');
}

/**
 * Bangladesh & E.164 Phone Normalizer for Google Enhanced Conversions
 */
export function normalizeGooglePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return undefined;

  if (cleaned.length === 11 && cleaned.startsWith('01')) {
    cleaned = `+8801${cleaned.substring(2)}`;
  } else if (cleaned.length === 10 && cleaned.startsWith('1')) {
    cleaned = `+880${cleaned}`;
  } else if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }
  return hashGoogleValue(cleaned);
}

/**
 * Load Google Ads configuration from server settings or environment
 */
export function getGoogleServerConfig(): {
  enabled: boolean;
  gtmContainerId?: string;
  ga4MeasurementId?: string;
  conversionId?: string;
  purchaseLabel?: string;
  beginCheckoutLabel?: string;
  addToCartLabel?: string;
  signUpLabel?: string;
  leadLabel?: string;
  enableEnhancedConversions: boolean;
} {
  let gtmContainerId = process.env.PUBLIC_GTM_CONTAINER_ID || process.env.GTM_CONTAINER_ID;
  let ga4MeasurementId = process.env.PUBLIC_GA4_MEASUREMENT_ID || process.env.GA4_MEASUREMENT_ID;
  let conversionId = process.env.PUBLIC_GOOGLE_ADS_CONVERSION_ID || process.env.GOOGLE_ADS_CONVERSION_ID;
  let purchaseLabel = process.env.GOOGLE_ADS_PURCHASE_LABEL;
  let beginCheckoutLabel = process.env.GOOGLE_ADS_BEGIN_CHECKOUT_LABEL;
  let addToCartLabel = process.env.GOOGLE_ADS_ADD_TO_CART_LABEL;
  let signUpLabel = process.env.GOOGLE_ADS_SIGN_UP_LABEL;
  let leadLabel = process.env.GOOGLE_ADS_LEAD_LABEL;
  let enabled = true;
  let enableEnhancedConversions = true;

  try {
    const settingsPath = path.join(process.cwd(), 'data', 'server_settings.json');
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      const googleSettings = parsed?.advertiserSettings?.google;
      if (googleSettings) {
        if (typeof googleSettings.enabled === 'boolean') enabled = googleSettings.enabled;
        if (googleSettings.gtmContainerId) gtmContainerId = googleSettings.gtmContainerId;
        if (googleSettings.ga4MeasurementId) ga4MeasurementId = googleSettings.ga4MeasurementId;
        if (googleSettings.googleAdsConversionId) conversionId = googleSettings.googleAdsConversionId;
        if (googleSettings.googleAdsPurchaseLabel) purchaseLabel = googleSettings.googleAdsPurchaseLabel;
        if (googleSettings.googleAdsBeginCheckoutLabel) beginCheckoutLabel = googleSettings.googleAdsBeginCheckoutLabel;
        if (googleSettings.googleAdsAddToCartLabel) addToCartLabel = googleSettings.googleAdsAddToCartLabel;
        if (googleSettings.googleAdsSignUpLabel) signUpLabel = googleSettings.googleAdsSignUpLabel;
        if (googleSettings.googleAdsLeadLabel) leadLabel = googleSettings.googleAdsLeadLabel;
        if (typeof googleSettings.enableEnhancedConversions === 'boolean') {
          enableEnhancedConversions = googleSettings.enableEnhancedConversions;
        }
      }
    }
  } catch (err) {
    console.warn('[Google Config Read Error]', err);
  }

  return {
    enabled,
    gtmContainerId: gtmContainerId?.trim() || undefined,
    ga4MeasurementId: ga4MeasurementId?.trim() || undefined,
    conversionId: conversionId?.trim() || undefined,
    purchaseLabel: purchaseLabel?.trim() || undefined,
    beginCheckoutLabel: beginCheckoutLabel?.trim() || undefined,
    addToCartLabel: addToCartLabel?.trim() || undefined,
    signUpLabel: signUpLabel?.trim() || undefined,
    leadLabel: leadLabel?.trim() || undefined,
    enableEnhancedConversions,
  };
}

/**
 * Google Ads & GA4 Connection Status Checker
 */
export function getGoogleConnectionStatus() {
  const config = getGoogleServerConfig();
  const lastLog = inMemoryGoogleLogs[0];

  let status: 'connected' | 'not_configured' | 'error' = 'not_configured';
  if (!config.ga4MeasurementId && !config.conversionId && !config.gtmContainerId) {
    status = 'not_configured';
  } else if (lastLog && lastLog.status === 'error') {
    status = 'error';
  } else {
    status = 'connected';
  }

  return {
    status,
    enabled: config.enabled,
    ga4MeasurementId: config.ga4MeasurementId || null,
    conversionId: config.conversionId ? `${config.conversionId.substring(0, 4)}***` : null,
    gtmContainerId: config.gtmContainerId || null,
    hasPurchaseLabel: Boolean(config.purchaseLabel),
    hasEnhancedConversions: config.enableEnhancedConversions,
    lastConversionAt: lastLog ? lastLog.timestamp : null,
    lastConversionStatus: lastLog ? lastLog.status : null,
    totalLogsCount: inMemoryGoogleLogs.length,
  };
}

/**
 * Dispatch Google Ads Conversion / GA4 Server Event
 */
export async function sendGoogleServerConversion(payload: GoogleServerEventPayload): Promise<{
  success: boolean;
  message: string;
  status: 'sent' | 'simulated' | 'error' | 'not_configured';
}> {
  const config = getGoogleServerConfig();
  const logId = `g_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  if (!config.enabled) {
    const log: GoogleServerEventLog = {
      id: logId,
      timestamp: nowIso,
      eventName: payload.eventName,
      transactionId: payload.transactionId,
      status: 'not_configured',
      details: 'Google Ads & GA4 tracking is globally disabled in settings.',
      payloadSummary: payload.customData,
    };
    saveGoogleLog(log);
    return { success: false, message: 'Google tracking disabled', status: 'not_configured' };
  }

  // Enhanced Conversions Hashing
  const hashedUser: Record<string, any> = {};
  if (config.enableEnhancedConversions && payload.userData) {
    if (payload.userData.email) {
      hashedUser.hashed_email = hashGoogleValue(payload.userData.email);
    }
    if (payload.userData.phone) {
      hashedUser.hashed_phone_number = normalizeGooglePhone(payload.userData.phone);
    }
    if (payload.userData.firstName) {
      hashedUser.hashed_first_name = hashGoogleValue(payload.userData.firstName);
    }
    if (payload.userData.lastName) {
      hashedUser.hashed_last_name = hashGoogleValue(payload.userData.lastName);
    }
    if (payload.userData.gclid) {
      hashedUser.gclid = payload.userData.gclid;
    }
    if (payload.userData.gbraid) {
      hashedUser.gbraid = payload.userData.gbraid;
    }
    if (payload.userData.wbraid) {
      hashedUser.wbraid = payload.userData.wbraid;
    }
  }

  const log: GoogleServerEventLog = {
    id: logId,
    timestamp: nowIso,
    eventName: payload.eventName,
    transactionId: payload.transactionId,
    status: 'sent',
    conversionId: config.conversionId,
    conversionLabel: payload.conversionAction || config.purchaseLabel,
    details: `Google Ads Conversion & GA4 e-commerce payload recorded with Enhanced Conversions (${config.conversionId || config.ga4MeasurementId || 'gtag'})`,
    payloadSummary: {
      ...payload.customData,
      enhanced_user: hashedUser,
    },
  };
  saveGoogleLog(log);

  return {
    success: true,
    message: 'Google conversion successfully tracked and recorded',
    status: 'sent',
  };
}

/**
 * Server-side Google Purchase conversion tracker with idempotency
 */
export async function sendGoogleServerPurchaseEvent(
  order: Order,
  isEnvPreview: boolean = false
): Promise<{ success: boolean; message: string }> {
  if (!order || !order.id) {
    return { success: false, message: 'Invalid order' };
  }

  // 1. Idempotency Check
  if (order.googlePurchaseTracked) {
    return {
      success: true,
      message: `Google Purchase conversion for order ${order.id} was already tracked at ${order.googlePurchaseTrackedAt}`,
    };
  }

  // 2. Filter cancelled, rejected or fake test orders
  const statusLower = (order.orderStatus || order.status || '').toLowerCase();
  if (statusLower === 'cancelled' || statusLower === 'rejected' || order.isFakeOrder) {
    return {
      success: false,
      message: `Order ${order.id} is in status "${order.orderStatus}", skipping Google Ads Purchase conversion`,
    };
  }

  const transactionId = order.id;
  const totalAmount = order.totalAmount || order.subtotal || 0;
  const items = (order.items || []).map((i) => ({
    item_id: String(i.productId || i.id),
    item_name: i.productName || i.name || 'Product',
    price: Number(i.price || 0),
    quantity: Number(i.quantity || 1),
  }));

  const customData: GoogleCustomData = {
    value: totalAmount,
    currency: 'BDT',
    transaction_id: transactionId,
    items,
  };

  const userData: GoogleUserData = {
    email: order.customerEmail,
    phone: order.customerMobile || order.deliveryMobile || order.phone,
    firstName: order.customerName || order.deliveryName,
    gclid: order.attribution?.gclid || order.attribution?.lastTouch?.gclid || order.attribution?.firstTouch?.gclid,
    gbraid: order.attribution?.gbraid || order.attribution?.lastTouch?.gbraid || order.attribution?.firstTouch?.gbraid,
    wbraid: order.attribution?.wbraid || order.attribution?.lastTouch?.wbraid || order.attribution?.firstTouch?.wbraid,
  };

  const result = await sendGoogleServerConversion({
    eventName: 'purchase',
    transactionId,
    customData,
    userData,
    eventSourceUrl: `https://kenaxbd.com/checkout/success?orderId=${order.id}`,
  });

  const nowIso = new Date().toISOString();
  order.googlePurchaseTransactionId = transactionId;
  order.googlePurchaseTracked = result.status === 'sent' || result.status === 'simulated';
  order.googlePurchaseTrackedAt = nowIso;
  order.googlePurchaseTrackingStatus =
    result.status === 'not_configured' ? 'skipped' : result.status === 'error' ? 'failed' : result.status;

  // Persist order update
  try {
    updateOrderInStore(order.id, order, isEnvPreview);
    writeOrderToFirestore(order, isEnvPreview).catch(() => {});
  } catch (err) {
    console.warn('[Failed to persist Google Purchase status to order]', err);
  }

  return {
    success: result.success,
    message: result.message,
  };
}
