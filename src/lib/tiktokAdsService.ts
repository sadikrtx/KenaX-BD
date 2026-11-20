import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Order } from '../types/index.ts';
import { updateOrderInStore } from '../db/orders.ts';
import { writeOrderToFirestore } from '../db/firestoreSync.ts';

export interface TikTokUserData {
  email?: string;
  phone?: string;
  name?: string;
  externalId?: string;
  ttclid?: string;
  clientIp?: string;
  clientUserAgent?: string;
}

export interface TikTokCustomData {
  value?: number;
  currency?: string;
  content_type?: string;
  contents?: Array<{
    content_id: string;
    content_name?: string;
    content_category?: string;
    price?: number;
    quantity?: number;
  }>;
  content_id?: string;
  content_name?: string;
  content_category?: string;
  query?: string;
  order_id?: string;
  description?: string;
  [key: string]: any;
}

export interface TikTokServerEventPayload {
  eventName:
    | 'PageView'
    | 'ViewContent'
    | 'Search'
    | 'AddToCart'
    | 'InitiateCheckout'
    | 'PlaceAnOrder'
    | 'CompletePayment'
    | 'CompleteRegistration'
    | 'Contact'
    | string;
  eventId: string; // Unique deduplication ID
  eventTime?: number; // Unix timestamp in seconds
  customData?: TikTokCustomData;
  userData?: TikTokUserData;
  eventSourceUrl?: string;
  testEventCode?: string;
}

export interface TikTokServerEventLog {
  id: string;
  timestamp: string;
  eventName: string;
  eventId: string;
  status: 'sent' | 'simulated' | 'error' | 'not_configured';
  httpStatus?: number;
  pixelId?: string;
  testEventCode?: string;
  details?: string;
  payloadSummary?: any;
  error?: string;
}

const TIKTOK_LOGS_FILE = path.join(process.cwd(), 'data', 'tiktok_events_logs.json');
let inMemoryTikTokLogs: TikTokServerEventLog[] = [];

// Initialize logs from file if available
try {
  if (fs.existsSync(TIKTOK_LOGS_FILE)) {
    const raw = fs.readFileSync(TIKTOK_LOGS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) inMemoryTikTokLogs = parsed.slice(-300);
  }
} catch {}

function saveTikTokLog(log: TikTokServerEventLog) {
  inMemoryTikTokLogs.unshift(log);
  if (inMemoryTikTokLogs.length > 300) {
    inMemoryTikTokLogs = inMemoryTikTokLogs.slice(0, 300);
  }
  try {
    const dir = path.dirname(TIKTOK_LOGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(TIKTOK_LOGS_FILE, JSON.stringify(inMemoryTikTokLogs, null, 2), 'utf-8');
  } catch {}
}

export function getTikTokServerLogs(): TikTokServerEventLog[] {
  return inMemoryTikTokLogs;
}

export function clearTikTokServerLogs(): void {
  inMemoryTikTokLogs = [];
  try {
    if (fs.existsSync(TIKTOK_LOGS_FILE)) {
      fs.writeFileSync(TIKTOK_LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch {}
}

/**
 * Normalization & SHA-256 Hashing according to TikTok Events API specifications
 */
export function hashTikTokValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  return crypto.createHash('sha256').update(trimmed).digest('hex');
}

/**
 * Bangladesh & Global Phone Number Normalizer for TikTok
 * Formats phone numbers in standard E.164 (without '+' or leading '0' if local BD)
 */
export function normalizeTikTokPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return undefined;

  // Convert Bangladeshi phone numbers (01XXXXXXXXX -> 8801XXXXXXXXX)
  if (cleaned.length === 11 && cleaned.startsWith('01')) {
    cleaned = `88${cleaned}`;
  } else if (cleaned.length === 10 && cleaned.startsWith('1')) {
    cleaned = `880${cleaned}`;
  }
  return hashTikTokValue(cleaned);
}

/**
 * Load TikTok credentials from server settings or environment variables
 */
export function getTikTokServerConfig(): {
  pixelId?: string;
  accessToken?: string;
  testEventCode?: string;
  enabled: boolean;
  apiVersion: string;
} {
  let pixelId = process.env.PUBLIC_TIKTOK_PIXEL_ID || process.env.TIKTOK_PIXEL_ID;
  let accessToken = process.env.TIKTOK_ACCESS_TOKEN || process.env.TIKTOK_EVENTS_API_TOKEN;
  let testEventCode = process.env.TIKTOK_TEST_EVENT_CODE;
  let enabled = true;
  let apiVersion = process.env.TIKTOK_API_VERSION || 'v1.3';

  try {
    const settingsPath = path.join(process.cwd(), 'data', 'server_settings.json');
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      const tiktokSettings = parsed?.advertiserSettings?.tiktok;
      if (tiktokSettings) {
        if (tiktokSettings.pixelId) pixelId = tiktokSettings.pixelId;
        if (tiktokSettings.eventsApiToken) accessToken = tiktokSettings.eventsApiToken;
        if (tiktokSettings.testEventCode) testEventCode = tiktokSettings.testEventCode;
        if (typeof tiktokSettings.enabled === 'boolean') enabled = tiktokSettings.enabled;
        if (tiktokSettings.apiVersion) apiVersion = tiktokSettings.apiVersion;
      }
    }
  } catch (err) {
    console.warn('[TikTok Config Read Error]', err);
  }

  return {
    pixelId: pixelId?.trim() || undefined,
    accessToken: accessToken?.trim() || undefined,
    testEventCode: testEventCode?.trim() || undefined,
    enabled,
    apiVersion,
  };
}

/**
 * TikTok Connection Status Checker
 */
export function getTikTokConnectionStatus() {
  const config = getTikTokServerConfig();
  const lastLog = inMemoryTikTokLogs[0];

  let status: 'connected' | 'not_configured' | 'error' = 'not_configured';
  if (!config.pixelId) {
    status = 'not_configured';
  } else if (config.accessToken) {
    if (lastLog && lastLog.status === 'error') {
      status = 'error';
    } else {
      status = 'connected';
    }
  } else {
    // Pixel only configured
    status = 'connected';
  }

  return {
    status,
    enabled: config.enabled,
    pixelId: config.pixelId ? `${config.pixelId.substring(0, 4)}***${config.pixelId.slice(-3)}` : 'Not configured',
    hasToken: Boolean(config.accessToken),
    testMode: Boolean(config.testEventCode),
    testEventCode: config.testEventCode || null,
    apiVersion: config.apiVersion,
    lastEventAt: lastLog ? lastLog.timestamp : null,
    lastEventStatus: lastLog ? lastLog.status : null,
    totalLogsCount: inMemoryTikTokLogs.length,
  };
}

/**
 * Send Single / Batch Event to TikTok Events API
 * Endpoint: https://business-api.tiktok.com/open_api/v1.3/event/track/
 */
export async function sendTikTokServerEvent(payload: TikTokServerEventPayload): Promise<{
  success: boolean;
  message: string;
  status: 'sent' | 'simulated' | 'error' | 'not_configured';
  response?: any;
}> {
  const config = getTikTokServerConfig();
  const logId = `tt_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  // Validate configuration
  if (!config.enabled) {
    const log: TikTokServerEventLog = {
      id: logId,
      timestamp: nowIso,
      eventName: payload.eventName,
      eventId: payload.eventId,
      status: 'not_configured',
      details: 'TikTok Tracking is globally disabled in settings.',
      payloadSummary: payload.customData,
    };
    saveTikTokLog(log);
    return { success: false, message: 'TikTok tracking disabled', status: 'not_configured' };
  }

  if (!config.pixelId) {
    const log: TikTokServerEventLog = {
      id: logId,
      timestamp: nowIso,
      eventName: payload.eventName,
      eventId: payload.eventId,
      status: 'not_configured',
      details: 'TikTok Pixel ID is not configured.',
      payloadSummary: payload.customData,
    };
    saveTikTokLog(log);
    return { success: false, message: 'TikTok Pixel ID missing', status: 'not_configured' };
  }

  const activeTestCode = payload.testEventCode || config.testEventCode;

  // Build TikTok User Object (with SHA-256 Hashing)
  const user: Record<string, any> = {};
  if (payload.userData?.email) {
    user.email = hashTikTokValue(payload.userData.email);
  }
  if (payload.userData?.phone) {
    user.phone_number = normalizeTikTokPhone(payload.userData.phone);
  }
  if (payload.userData?.externalId) {
    user.external_id = hashTikTokValue(payload.userData.externalId);
  }
  if (payload.userData?.ttclid) {
    user.ttclid = payload.userData.ttclid;
  }
  if (payload.userData?.clientIp) {
    user.ip = payload.userData.clientIp;
  }
  if (payload.userData?.clientUserAgent) {
    user.user_agent = payload.userData.clientUserAgent;
  }

  // Build TikTok Properties
  const properties: Record<string, any> = {};
  if (payload.customData?.value !== undefined) {
    properties.value = Number(payload.customData.value);
    properties.currency = payload.customData.currency || 'BDT';
  }
  if (payload.customData?.query) {
    properties.query = payload.customData.query;
  }
  if (payload.customData?.description) {
    properties.description = payload.customData.description;
  }
  if (payload.customData?.order_id) {
    properties.order_id = payload.customData.order_id;
  }

  if (payload.customData?.contents && Array.isArray(payload.customData.contents)) {
    properties.contents = payload.customData.contents.map((c) => ({
      content_id: String(c.content_id),
      content_type: 'product',
      content_name: c.content_name || undefined,
      content_category: c.content_category || undefined,
      price: c.price !== undefined ? Number(c.price) : undefined,
      quantity: c.quantity !== undefined ? Number(c.quantity) : 1,
    }));
  } else if (payload.customData?.content_id) {
    properties.contents = [
      {
        content_id: String(payload.customData.content_id),
        content_type: 'product',
        content_name: payload.customData.content_name || undefined,
        content_category: payload.customData.content_category || undefined,
        price: payload.customData.value !== undefined ? Number(payload.customData.value) : undefined,
        quantity: 1,
      },
    ];
  }

  const eventTime = payload.eventTime || Math.floor(Date.now() / 1000);

  const eventData: Record<string, any> = {
    event: payload.eventName,
    event_time: eventTime,
    event_id: payload.eventId,
    user,
    properties,
  };

  if (payload.eventSourceUrl) {
    eventData.page = {
      url: payload.eventSourceUrl,
    };
  }

  // If no Access Token is provided, record simulation log
  if (!config.accessToken) {
    const log: TikTokServerEventLog = {
      id: logId,
      timestamp: nowIso,
      eventName: payload.eventName,
      eventId: payload.eventId,
      status: 'simulated',
      pixelId: config.pixelId,
      testEventCode: activeTestCode,
      details: 'TikTok Pixel ID configured. Events API Token not provided; browser-side pixel will fire while server event is simulated.',
      payloadSummary: {
        event: payload.eventName,
        eventId: payload.eventId,
        properties,
      },
    };
    saveTikTokLog(log);
    return {
      success: true,
      message: 'Server event simulated (Access Token not set; browser tracking active)',
      status: 'simulated',
    };
  }

  // Real HTTP Call to TikTok Events API
  const requestBody: Record<string, any> = {
    pixel_code: config.pixelId,
    event: payload.eventName,
    event_time: eventTime,
    event_id: payload.eventId,
    user,
    properties,
  };

  if (payload.eventSourceUrl) {
    requestBody.page = {
      url: payload.eventSourceUrl,
    };
  }

  if (activeTestCode) {
    requestBody.test_event_code = activeTestCode;
  }

  const apiUrl = `https://business-api.tiktok.com/open_api/${config.apiVersion}/event/track/`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': config.accessToken,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const jsonRes = await res.json().catch(() => ({}));

    if (!res.ok || jsonRes.code !== 0) {
      const errorMsg = jsonRes.message || `HTTP ${res.status} TikTok Events API Error`;
      const log: TikTokServerEventLog = {
        id: logId,
        timestamp: nowIso,
        eventName: payload.eventName,
        eventId: payload.eventId,
        status: 'error',
        httpStatus: res.status,
        pixelId: config.pixelId,
        testEventCode: activeTestCode,
        error: errorMsg,
        details: JSON.stringify(jsonRes),
        payloadSummary: requestBody,
      };
      saveTikTokLog(log);
      return { success: false, message: errorMsg, status: 'error', response: jsonRes };
    }

    const log: TikTokServerEventLog = {
      id: logId,
      timestamp: nowIso,
      eventName: payload.eventName,
      eventId: payload.eventId,
      status: 'sent',
      httpStatus: res.status,
      pixelId: config.pixelId,
      testEventCode: activeTestCode,
      details: `Delivered to TikTok Events API (${activeTestCode ? 'Test Mode: ' + activeTestCode : 'Live'})`,
      payloadSummary: requestBody,
    };
    saveTikTokLog(log);

    return {
      success: true,
      message: 'Event successfully dispatched to TikTok Events API',
      status: 'sent',
      response: jsonRes,
    };
  } catch (err: any) {
    console.error('[TikTok Events API Network Error]', err);
    const log: TikTokServerEventLog = {
      id: logId,
      timestamp: nowIso,
      eventName: payload.eventName,
      eventId: payload.eventId,
      status: 'error',
      pixelId: config.pixelId,
      testEventCode: activeTestCode,
      error: err.name === 'AbortError' ? 'TikTok Events API request timed out (8s)' : err.message,
      payloadSummary: requestBody,
    };
    saveTikTokLog(log);
    return { success: false, message: err.message, status: 'error' };
  }
}

/**
 * Server-side TikTok Purchase (CompletePayment) conversion tracker with strict idempotency
 */
export async function sendTikTokServerPurchaseEvent(
  order: Order,
  isEnvPreview: boolean = false
): Promise<{ success: boolean; message: string }> {
  if (!order || !order.id) {
    return { success: false, message: 'Invalid order' };
  }

  // 1. Idempotency Check
  if (order.tiktokPurchaseSent) {
    return {
      success: true,
      message: `TikTok Purchase event for order ${order.id} was already recorded at ${order.tiktokPurchaseSentAt}`,
    };
  }

  // 2. Filter cancelled, rejected or fake test orders
  const statusLower = (order.orderStatus || order.status || '').toLowerCase();
  if (statusLower === 'cancelled' || statusLower === 'rejected' || order.isFakeOrder) {
    return {
      success: false,
      message: `Order ${order.id} is in status "${order.orderStatus}", skipping TikTok Purchase event`,
    };
  }

  const eventId = `tt_purchase_${order.id}`;
  const totalAmount = order.totalAmount || order.subtotal || 0;
  const contents = (order.items || []).map((i) => ({
    content_id: String(i.productId || i.id),
    content_name: i.productName || i.name || 'Product',
    price: Number(i.price || 0),
    quantity: Number(i.quantity || 1),
  }));

  const customData: TikTokCustomData = {
    value: totalAmount,
    currency: 'BDT',
    content_type: 'product',
    contents,
    order_id: order.id,
    description: `Order ${order.id} - ${order.paymentMethod || 'COD'}`,
  };

  const userData: TikTokUserData = {
    email: order.customerEmail,
    phone: order.customerMobile || order.deliveryMobile || order.phone,
    name: order.customerName || order.deliveryName,
    externalId: order.customerId,
    ttclid: order.attribution?.ttclid || order.attribution?.lastTouch?.ttclid || order.attribution?.firstTouch?.ttclid,
  };

  const result = await sendTikTokServerEvent({
    eventName: 'CompletePayment', // TikTok standard for Purchase
    eventId,
    customData,
    userData,
    eventSourceUrl: `https://kenaxbd.com/checkout/success?orderId=${order.id}`,
  });

  // Mark idempotency on order
  const nowIso = new Date().toISOString();
  order.tiktokPurchaseEventId = eventId;
  order.tiktokPurchaseSent = result.status === 'sent' || result.status === 'simulated';
  order.tiktokPurchaseSentAt = nowIso;
  order.tiktokPurchaseStatus =
    result.status === 'not_configured'
      ? 'skipped'
      : result.status === 'error'
      ? 'failed'
      : result.status;
  if (!result.success && result.status === 'error') {
    order.tiktokPurchaseError = result.message;
  }

  // Persist order update
  try {
    updateOrderInStore(order.id, order, isEnvPreview);
    writeOrderToFirestore(order, isEnvPreview).catch(() => {});
  } catch (err) {
    console.warn('[Failed to persist TikTok Purchase status to order]', err);
  }

  return {
    success: result.success,
    message: result.message,
  };
}
