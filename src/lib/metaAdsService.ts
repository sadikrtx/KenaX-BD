import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Order } from '../types/index.ts';
import { updateOrderInStore } from '../db/orders.ts';
import { writeOrderToFirestore } from '../db/firestoreSync.ts';

export interface MetaUserData {
  email?: string;
  phone?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
  externalId?: string;
}

export interface MetaServerEventPayload {
  eventName: string;
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string;
  actionSource?: 'website' | 'app' | 'system_generated' | 'other';
  customData?: Record<string, any>;
  userData?: MetaUserData;
  testEventCode?: string;
}

export interface MetaServerEventLog {
  id: string;
  eventName: string;
  eventId: string;
  orderId?: string;
  status: 'sent' | 'failed' | 'skipped' | 'simulated';
  responseCode?: number;
  eventsReceived?: number;
  errorMessage?: string;
  payloadSummary: Record<string, any>;
  sentAt: string;
  timestamp: string;
  testEventCode?: string;
}

const LOGS_FILE = path.join(process.cwd(), 'data', 'meta_event_logs.json');
let serverLogs: MetaServerEventLog[] = [];

// Initialize logs from file
try {
  if (fs.existsSync(LOGS_FILE)) {
    const raw = fs.readFileSync(LOGS_FILE, 'utf-8');
    serverLogs = JSON.parse(raw);
  }
} catch {
  serverLogs = [];
}

function saveLogs() {
  try {
    const dir = path.dirname(LOGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOGS_FILE, JSON.stringify(serverLogs.slice(0, 150), null, 2), 'utf-8');
  } catch {}
}

function addServerLog(log: MetaServerEventLog) {
  serverLogs = [log, ...serverLogs.slice(0, 149)];
  saveLogs();
}

export function getMetaServerLogs(): MetaServerEventLog[] {
  return [...serverLogs];
}

export function clearMetaServerLogs(): void {
  serverLogs = [];
  saveLogs();
}

/**
 * SHA-256 Hashing for Meta Advanced Matching
 */
export function sha256Node(value?: string): string {
  if (!value || typeof value !== 'string') return '';
  const clean = value.trim().toLowerCase();
  if (!clean) return '';
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Normalize Bangladesh Phone Number to International Format (8801XXXXXXXXX)
 */
export function normalizeBdPhoneForMeta(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  if (digits.length === 10) return `880${digits}`;
  return digits;
}

/**
 * Retrieve active Meta Configuration (Environment Variables prioritize over server settings)
 */
export function getMetaConfig(): {
  enabled: boolean;
  pixelId: string;
  datasetId?: string;
  accessToken: string;
  testEventCode?: string;
  apiVersion: string;
  domainVerification?: string;
} {
  // 1. Check Server Settings file
  let settingsMeta: any = {};
  try {
    const settingsPath = path.join(process.cwd(), 'data', 'server_settings.json');
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      settingsMeta = parsed?.advertiserSettings?.meta || {};
    }
  } catch {}

  const pixelId = (
    process.env.META_PIXEL_ID ||
    process.env.PUBLIC_META_PIXEL_ID ||
    settingsMeta.pixelId ||
    settingsMeta.datasetId ||
    ''
  ).trim();

  const accessToken = (
    process.env.META_CAPI_ACCESS_TOKEN ||
    process.env.META_ACCESS_TOKEN ||
    settingsMeta.capiToken ||
    ''
  ).trim();

  const testEventCode = (
    process.env.META_TEST_EVENT_CODE ||
    settingsMeta.testEventCode ||
    ''
  ).trim();

  const apiVersion = (
    process.env.META_API_VERSION ||
    settingsMeta.apiVersion ||
    'v20.0'
  ).trim();

  const enabled = Boolean(
    settingsMeta.enabled !== false && (pixelId || accessToken)
  );

  return {
    enabled,
    pixelId,
    datasetId: settingsMeta.datasetId,
    accessToken,
    testEventCode: testEventCode || undefined,
    apiVersion,
    domainVerification: settingsMeta.domainVerification,
  };
}

/**
 * Send Event to Meta Conversions API (CAPI)
 */
export async function sendMetaServerEvent(
  params: MetaServerEventPayload
): Promise<{ success: boolean; message: string; responseCode?: number; eventsReceived?: number }> {
  const config = getMetaConfig();

  if (!config.enabled || !config.pixelId || !config.accessToken) {
    const log: MetaServerEventLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventName: params.eventName,
      eventId: params.eventId,
      status: 'skipped',
      errorMessage: 'Meta CAPI not configured (missing Pixel ID or Access Token)',
      payloadSummary: {
        eventName: params.eventName,
        value: params.customData?.value,
        currency: params.customData?.currency,
      },
      sentAt: new Date().toISOString(),
      timestamp: new Date().toLocaleTimeString(),
    };
    addServerLog(log);
    return { success: false, message: 'Meta CAPI not configured' };
  }

  const { pixelId, accessToken, apiVersion } = config;
  const testCode = params.testEventCode || config.testEventCode;

  // Prepare normalized and hashed user data
  const u = params.userData || {};
  const hashedEmail = u.email ? sha256Node(u.email) : undefined;
  const hashedPhone = u.phone ? sha256Node(normalizeBdPhoneForMeta(u.phone)) : undefined;

  let fn = u.firstName;
  let ln = u.lastName;
  if (!fn && u.name) {
    const parts = u.name.trim().split(' ');
    fn = parts[0];
    if (parts.length > 1) ln = parts.slice(1).join(' ');
  }

  const hashedFn = fn ? sha256Node(fn) : undefined;
  const hashedLn = ln ? sha256Node(ln) : undefined;
  const hashedCity = u.city ? sha256Node(u.city) : undefined;
  const hashedExternalId = u.externalId ? sha256Node(u.externalId) : undefined;

  const userDataPayload: Record<string, any> = {
    client_ip_address: u.clientIp || undefined,
    client_user_agent: u.clientUserAgent || undefined,
    fbp: u.fbp || undefined,
    fbc: u.fbc || undefined,
  };

  if (hashedEmail) userDataPayload.em = [hashedEmail];
  if (hashedPhone) userDataPayload.ph = [hashedPhone];
  if (hashedFn) userDataPayload.fn = [hashedFn];
  if (hashedLn) userDataPayload.ln = [hashedLn];
  if (hashedCity) userDataPayload.ct = [hashedCity];
  if (hashedExternalId) userDataPayload.external_id = [hashedExternalId];
  if (u.country) userDataPayload.country = [sha256Node(u.country || 'bd')];

  const eventObject: Record<string, any> = {
    event_name: params.eventName,
    event_time: params.eventTime || Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.eventSourceUrl || 'https://kenaxbd.com',
    action_source: params.actionSource || 'website',
    user_data: userDataPayload,
    custom_data: params.customData || {},
  };

  const payload: Record<string, any> = {
    data: [eventObject],
  };

  if (testCode) {
    payload.test_event_code = testCode;
  }

  const endpoint = `https://graph.facebook.com/${apiVersion}/${pixelId}/events?access_token=${accessToken}`;

  // Execute request with 1 safe retry for transient errors
  let attempt = 0;
  const maxAttempts = 2;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resJson: any = await response.json();

      if (response.ok && (resJson.events_received !== undefined || resJson.fbtrace_id)) {
        const received = resJson.events_received || 1;
        const log: MetaServerEventLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          eventName: params.eventName,
          eventId: params.eventId,
          status: 'sent',
          responseCode: response.status,
          eventsReceived: received,
          payloadSummary: {
            eventName: params.eventName,
            value: params.customData?.value,
            currency: params.customData?.currency,
            testCode: testCode || 'none',
          },
          sentAt: new Date().toISOString(),
          timestamp: new Date().toLocaleTimeString(),
          testEventCode: testCode,
        };
        addServerLog(log);

        return {
          success: true,
          message: `Meta CAPI delivered: ${received} event(s) processed`,
          responseCode: response.status,
          eventsReceived: received,
        };
      } else {
        const errorMsg = resJson.error?.message || `Meta API Error (${response.status})`;
        lastError = errorMsg;

        // If client error (4xx like invalid token or bad format), don't retry
        if (response.status >= 400 && response.status < 500) {
          break;
        }

        // For 5xx, wait 600ms and retry
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (err: any) {
      lastError = err.message || 'Network error';
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  const log: MetaServerEventLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    eventName: params.eventName,
    eventId: params.eventId,
    status: 'failed',
    errorMessage: lastError || 'Unknown CAPI failure',
    payloadSummary: {
      eventName: params.eventName,
      value: params.customData?.value,
    },
    sentAt: new Date().toISOString(),
    timestamp: new Date().toLocaleTimeString(),
    testEventCode: testCode,
  };
  addServerLog(log);

  return {
    success: false,
    message: lastError || 'Meta CAPI request failed',
  };
}

/**
 * Server-Side Purchase Event with Complete Idempotency Protection
 * Guarantees that refreshing, updating, or reopening an order NEVER sends duplicate Purchase events.
 */
export async function sendServerPurchaseEvent(
  order: Order,
  clientIp?: string,
  clientUserAgent?: string,
  isEnvPreview: boolean = false
): Promise<{ success: boolean; message: string; eventId?: string }> {
  if (!order || !order.id) {
    return { success: false, message: 'Invalid order object' };
  }

  // 1. Idempotency Check: Prevent duplicate conversions
  if (order.metaPurchaseSent && order.metaPurchaseStatus === 'sent') {
    return {
      success: true,
      message: `Purchase event already sent previously for order ${order.id}`,
      eventId: order.metaPurchaseEventId,
    };
  }

  // 2. Do not fire for cancelled, rejected or explicit fake test orders
  const statusLower = (order.orderStatus || order.status || '').toLowerCase();
  if (statusLower === 'cancelled' || statusLower === 'rejected' || order.isFakeOrder) {
    return {
      success: false,
      message: `Order ${order.id} is in status "${order.orderStatus}", skipping Meta Purchase event`,
    };
  }

  const eventId = `purchase-${order.id}`;
  const totalAmount = order.totalAmount || order.subtotal || 0;
  const contentIds = (order.items || []).map((i) => i.productId || i.id);
  const numItems = (order.items || []).reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  const contentNames = (order.items || []).map((i) => i.productName || i.name).join(', ');

  const customData = {
    content_name: contentNames || 'Order Items',
    content_ids: contentIds,
    content_type: 'product',
    value: totalAmount,
    currency: 'BDT',
    num_items: numItems,
    order_id: order.id,
    payment_type: order.paymentMethod || 'cash_on_delivery',
  };

  const userData: MetaUserData = {
    phone: order.customerMobile || order.deliveryMobile || order.phone,
    email: order.customerEmail,
    name: order.customerName || order.deliveryName,
    city: order.district || order.division || 'Dhaka',
    country: 'bd',
    clientIp: clientIp || undefined,
    clientUserAgent: clientUserAgent || undefined,
    fbp: order.attribution?.fbp,
    fbc: order.attribution?.fbc,
    externalId: order.customerId || undefined,
  };

  try {
    const result = await sendMetaServerEvent({
      eventName: 'Purchase',
      eventId,
      customData,
      userData,
      actionSource: 'website',
      eventSourceUrl: `https://kenaxbd.com/order-success?id=${encodeURIComponent(order.id)}`,
    });

    // 3. Persist Purchase tracking state onto the order record
    const updatedOrder: Order = {
      ...order,
      metaPurchaseEventId: eventId,
      metaPurchaseSent: result.success,
      metaPurchaseSentAt: new Date().toISOString(),
      metaPurchaseStatus: result.success ? 'sent' : 'failed',
      metaPurchaseError: result.success ? undefined : result.message,
    };

    updateOrderInStore(order.id, updatedOrder, isEnvPreview);
    writeOrderToFirestore(updatedOrder, isEnvPreview).catch(() => {});

    return {
      success: result.success,
      message: result.message,
      eventId,
    };
  } catch (err: any) {
    console.warn(`[Meta CAPI Purchase Exception for ${order.id}]:`, err.message);
    return {
      success: false,
      message: err.message,
      eventId,
    };
  }
}

/**
 * Health & Connection Status
 */
export function getMetaConnectionStatus() {
  const config = getMetaConfig();
  const recentLogs = getMetaServerLogs();
  const lastEvent = recentLogs[0];

  let connectionStatus: 'connected' | 'not_configured' | 'error' = 'not_configured';
  if (config.pixelId && config.accessToken) {
    if (lastEvent?.status === 'failed') {
      connectionStatus = 'error';
    } else {
      connectionStatus = 'connected';
    }
  }

  return {
    status: connectionStatus,
    enabled: config.enabled,
    pixelId: config.pixelId ? `${config.pixelId.slice(0, 4)}••••${config.pixelId.slice(-4)}` : '',
    hasToken: Boolean(config.accessToken),
    testMode: Boolean(config.testEventCode),
    testEventCode: config.testEventCode || null,
    apiVersion: config.apiVersion,
    lastEventAt: lastEvent?.sentAt || null,
    lastEventStatus: lastEvent?.status || null,
    totalLogsCount: recentLogs.length,
  };
}
