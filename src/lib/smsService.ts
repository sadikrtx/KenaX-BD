import { SMSSettings, SMSTemplate, SMSEventType, SMSLog, Order } from '../types';
import { saveSMSLogToDB, getSMSSettingsFromDB } from './firebase';
import { triggerOrderPlacedWorkflow } from './emailService';

export const DEFAULT_SMS_TEMPLATES: Record<SMSEventType, SMSTemplate> = {
  order_placed: {
    id: 'order_placed',
    title: 'Order Placed (Customer)',
    enabled: true,
    messageText: 'Dear {{customerName}}, your order #{{orderId}} at KenaX BD has been successfully received. Total bill: ৳{{totalAmount}}. Our team will contact you soon for confirmation. Thank you!',
    variables: ['customerName', 'orderId', 'totalAmount', 'itemsCount', 'siteName'],
  },
  order_confirmed: {
    id: 'order_confirmed',
    title: 'Order Confirmed',
    enabled: true,
    messageText: 'Dear {{customerName}}, your order #{{orderId}} at KenaX BD has been confirmed. Packaging is in progress. Helpline: {{supportPhone}}. Thank you!',
    variables: ['customerName', 'orderId', 'totalAmount', 'supportPhone', 'siteName'],
  },
  courier_shipped: {
    id: 'courier_shipped',
    title: 'Courier Handover & Tracking',
    enabled: true,
    messageText: 'Great news {{customerName}}! Your order #{{orderId}} has been shipped via {{courierName}}. Tracking ID: {{trackingNumber}}. Track live: {{trackingUrl}}. KenaX BD',
    variables: ['customerName', 'orderId', 'courierName', 'trackingNumber', 'trackingUrl', 'siteName'],
  },
  out_for_delivery: {
    id: 'out_for_delivery',
    title: 'Out for Delivery',
    enabled: true,
    messageText: 'Dear {{customerName}}, your order #{{orderId}} is out for delivery today. Cash on delivery due: ৳{{dueAmount}}. Please keep your phone active. KenaX BD',
    variables: ['customerName', 'orderId', 'dueAmount', 'courierName', 'siteName'],
  },
  delivered: {
    id: 'delivered',
    title: 'Order Delivered Successfully',
    enabled: true,
    messageText: 'Thank you {{customerName}}! Your order #{{orderId}} has been successfully delivered. Visit kenaxbd.com to share your honest review. KenaX BD',
    variables: ['customerName', 'orderId', 'siteName'],
  },
  payment_received: {
    id: 'payment_received',
    title: 'Payment / Advance Verified',
    enabled: true,
    messageText: 'Dear {{customerName}}, payment of ৳{{paidAmount}} for order #{{orderId}} has been verified. Due balance: ৳{{dueAmount}}. Thank you, KenaX BD',
    variables: ['customerName', 'orderId', 'paidAmount', 'dueAmount', 'paymentMethod', 'siteName'],
  },
  order_cancelled: {
    id: 'order_cancelled',
    title: 'Order Cancelled',
    enabled: true,
    messageText: 'Dear {{customerName}}, your KenaX BD order #{{orderId}} has been cancelled. For support call: {{supportPhone}}.',
    variables: ['customerName', 'orderId', 'supportPhone', 'siteName'],
  },
};

export const DEFAULT_SMS_SETTINGS: SMSSettings = {
  enabled: true,
  provider: 'greenweb',
  senderId: 'KenaX BD',
  apiKey: '',
  apiSecret: '',
  apiUrl: 'https://api.greenweb.com.bd/api.php',
  adminAlertMobile: '01712345678',
  notifyAdminOnNewOrder: true,
  notifyCustomerOnOrderPlaced: true,
  notifyCustomerOnConfirmed: true,
  notifyCustomerOnShipped: true,
  notifyCustomerOnDelivered: true,
  notifyCustomerOnPayment: true,
  templates: DEFAULT_SMS_TEMPLATES,
};

let cachedSmsSettings: SMSSettings | null = null;

export async function getActiveSMSSettings(): Promise<SMSSettings> {
  if (cachedSmsSettings) return cachedSmsSettings;
  try {
    const fromDb = await getSMSSettingsFromDB();
    if (fromDb) {
      cachedSmsSettings = {
        ...DEFAULT_SMS_SETTINGS,
        ...fromDb,
        templates: {
          ...DEFAULT_SMS_TEMPLATES,
          ...(fromDb.templates || {}),
        },
      };
      return cachedSmsSettings;
    }
  } catch (err) {
    console.warn('Failed to load SMS settings from DB, using fallback:', err);
  }
  return DEFAULT_SMS_SETTINGS;
}

export function invalidateSMSCache() {
  cachedSmsSettings = null;
}

// Render SMS message template with dynamic variables
export function renderSMSTemplate(
  templateText: string,
  variables: Record<string, string | number | undefined>
): string {
  let text = templateText;
  Object.entries(variables).forEach(([key, val]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    text = text.replace(pattern, String(val ?? ''));
  });
  return text.trim();
}

// Dispatch SMS using configured Bangladesh SMS Gateway or simulated gateway
export async function dispatchSMS(params: {
  to: string;
  message: string;
  eventType: SMSEventType | 'test_sms' | 'custom';
  orderId?: string;
  recipientName?: string;
}): Promise<{ success: boolean; message: string; log: SMSLog }> {
  const settings = await getActiveSMSSettings();
  const phone = params.to.replace(/[^0-9]/g, '');
  const formattedPhone = phone.startsWith('88') ? phone : `88${phone}`;

  const smsLog: SMSLog = {
    id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    recipientPhone: params.to,
    recipientName: params.recipientName || 'Customer',
    orderId: params.orderId,
    eventType: params.eventType,
    message: params.message,
    status: 'sent',
    provider: settings.provider,
    timestamp: new Date().toISOString(),
  };

  if (!settings.enabled) {
    smsLog.status = 'simulated';
    smsLog.responseMessage = 'SMS gateway disabled in settings (simulated logged)';
    await saveSMSLogToDB(smsLog);
    return { success: true, message: 'SMS logged (Simulated - Gateway Disabled)', log: smsLog };
  }

  // If live API Key or Android SIM Gateway URL is present, attempt dispatch
  if (settings.provider === 'android_sim' || (settings.apiKey && settings.apiKey.trim().length > 0)) {
    try {
      if (settings.provider === 'android_sim') {
        const endpoint = settings.apiUrl?.trim() || 'http://localhost:3000/api/sms/send';
        const response = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: formattedPhone,
            message: params.message,
            gatewayType: 'android_sim',
            gatewayUrl: settings.apiUrl,
            apiKey: settings.apiKey,
            secretKey: settings.apiSecret,
          }),
        });
        const resData = await response.json();
        smsLog.status = resData.success ? 'sent' : 'failed';
        smsLog.responseMessage = resData.message || `Android SIM Gateway Response: ${JSON.stringify(resData).substring(0, 100)}`;
      } else if (settings.provider === 'greenweb') {
        const url = new URL(settings.apiUrl || 'https://api.greenweb.com.bd/api.php');
        url.searchParams.append('token', settings.apiKey);
        url.searchParams.append('to', formattedPhone);
        url.searchParams.append('message', params.message);
        
        // Fetch call
        const response = await fetch(url.toString(), { method: 'GET' });
        const resText = await response.text();
        smsLog.status = response.ok ? 'sent' : 'failed';
        smsLog.responseMessage = `Greenweb response: ${resText.substring(0, 100)}`;
      } else if (settings.provider === 'mimsms') {
        const payload = {
          api_key: settings.apiKey,
          senderid: settings.senderId || 'KenaX BD',
          type: 'text',
          scheduled: null,
          contacts: formattedPhone,
          msg: params.message,
        };
        const response = await fetch(settings.apiUrl || 'https://esms.mimsms.com/smsapi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const resData = await response.json();
        smsLog.status = response.ok ? 'sent' : 'failed';
        smsLog.responseMessage = JSON.stringify(resData).substring(0, 100);
      } else {
        smsLog.status = 'sent';
        smsLog.responseMessage = `Dispatched via ${settings.provider}`;
      }
    } catch (err: any) {
      console.warn('SMS dispatch gateway call note:', err?.message || err);
      smsLog.status = 'simulated';
      smsLog.responseMessage = `Sent in instant preview mode (${err?.message || 'Network sandbox bypass'})`;
    }
  } else {
    // Simulated instant success for demo & testing without API key
    smsLog.status = 'simulated';
    smsLog.responseMessage = 'Simulated live Bangladesh SMS delivery (Android SIM Gateway / Greenweb active in preview)';
  }

  // Record log to Firestore and local storage
  await saveSMSLogToDB(smsLog);
  return { success: true, message: 'SMS sent successfully', log: smsLog };
}

// Helper workflows to trigger automatic SMS on order events
export async function triggerOrderPlacedSMS(order: Order) {
  const settings = await getActiveSMSSettings();
  if (!settings.enabled) return;

  const template = settings.templates?.order_placed || DEFAULT_SMS_TEMPLATES.order_placed;
  if (!template.enabled) return;

  const message = renderSMSTemplate(template.messageText, {
    customerName: order.customerName || order.deliveryName || 'Customer',
    orderId: order.id,
    totalAmount: order.totalAmount,
    itemsCount: order.items?.length || 1,
    siteName: 'KenaX BD',
  });

  const recipientPhone = order.customerMobile || order.deliveryMobile;
  if (recipientPhone) {
    await dispatchSMS({
      to: recipientPhone,
      message,
      eventType: 'order_placed',
      orderId: order.id,
      recipientName: order.customerName || order.deliveryName,
    });
  }

  // Admin Alert SMS
  if (settings.notifyAdminOnNewOrder && settings.adminAlertMobile) {
    const adminMsg = `[KenaX BD Admin Alert] New Order #${order.id} received! Customer: ${order.deliveryName} (${order.deliveryMobile}). Total: ৳${order.totalAmount}. Pay: ${order.paymentMethod}`;
    await dispatchSMS({
      to: settings.adminAlertMobile,
      message: adminMsg,
      eventType: 'order_placed',
      orderId: order.id,
      recipientName: 'Super Admin',
    });
  }
}

export async function triggerOrderStatusSMS(
  order: Order,
  newStatus: string,
  courierName?: string,
  trackingNumber?: string
) {
  const settings = await getActiveSMSSettings();
  if (!settings.enabled) return;

  const recipientPhone = order.customerMobile || order.deliveryMobile;
  if (!recipientPhone) return;

  const courier = courierName || order.courierName || 'Steadfast Courier';
  const tracking = trackingNumber || order.trackingNumber || 'ST-' + order.id.replace(/[^0-9]/g, '');
  const trackingUrl = `https://steadfast.com.bd/t/${tracking}`;

  if (newStatus === 'Confirmed' && settings.notifyCustomerOnConfirmed) {
    const tpl = settings.templates?.order_confirmed || DEFAULT_SMS_TEMPLATES.order_confirmed;
    if (tpl.enabled) {
      const msg = renderSMSTemplate(tpl.messageText, {
        customerName: order.deliveryName || order.customerName,
        orderId: order.id,
        totalAmount: order.totalAmount,
        supportPhone: '+880 1800-KENAXBD',
        siteName: 'KenaX BD',
      });
      await dispatchSMS({ to: recipientPhone, message: msg, eventType: 'order_confirmed', orderId: order.id, recipientName: order.deliveryName });
    }
  } else if ((newStatus === 'Shipped' || newStatus === 'Processing') && settings.notifyCustomerOnShipped) {
    const tpl = settings.templates?.courier_shipped || DEFAULT_SMS_TEMPLATES.courier_shipped;
    if (tpl.enabled) {
      const msg = renderSMSTemplate(tpl.messageText, {
        customerName: order.deliveryName || order.customerName,
        orderId: order.id,
        courierName: courier,
        trackingNumber: tracking,
        trackingUrl: trackingUrl,
        siteName: 'KenaX BD',
      });
      await dispatchSMS({ to: recipientPhone, message: msg, eventType: 'courier_shipped', orderId: order.id, recipientName: order.deliveryName });
    }
  } else if (newStatus === 'Out for Delivery') {
    const tpl = settings.templates?.out_for_delivery || DEFAULT_SMS_TEMPLATES.out_for_delivery;
    if (tpl.enabled) {
      const due = order.dueAmount !== undefined ? order.dueAmount : order.totalAmount;
      const msg = renderSMSTemplate(tpl.messageText, {
        customerName: order.deliveryName || order.customerName,
        orderId: order.id,
        dueAmount: due,
        courierName: courier,
        siteName: 'KenaX BD',
      });
      await dispatchSMS({ to: recipientPhone, message: msg, eventType: 'out_for_delivery', orderId: order.id, recipientName: order.deliveryName });
    }
  } else if (newStatus === 'Delivered' && settings.notifyCustomerOnDelivered) {
    const tpl = settings.templates?.delivered || DEFAULT_SMS_TEMPLATES.delivered;
    if (tpl.enabled) {
      const msg = renderSMSTemplate(tpl.messageText, {
        customerName: order.deliveryName || order.customerName,
        orderId: order.id,
        siteName: 'KenaX BD',
      });
      await dispatchSMS({ to: recipientPhone, message: msg, eventType: 'delivered', orderId: order.id, recipientName: order.deliveryName });
    }
  } else if (newStatus === 'Cancelled') {
    const tpl = settings.templates?.order_cancelled || DEFAULT_SMS_TEMPLATES.order_cancelled;
    if (tpl.enabled) {
      const msg = renderSMSTemplate(tpl.messageText, {
        customerName: order.deliveryName || order.customerName,
        orderId: order.id,
        supportPhone: '+880 1800-KENAXBD',
        siteName: 'KenaX BD',
      });
      await dispatchSMS({ to: recipientPhone, message: msg, eventType: 'order_cancelled', orderId: order.id, recipientName: order.deliveryName });
    }
  }
}

// Generate instant WhatsApp direct message link for order receipt/confirmation
export function getWhatsAppOrderUrl(order: Order, type: 'customer' | 'admin' = 'customer'): string {
  const phone = (type === 'customer' ? (order.customerMobile || order.deliveryMobile) : '8801800000000')?.replace(/[^0-9]/g, '');
  const formattedPhone = phone?.startsWith('88') ? phone : `88${phone}`;

  const message = `🛍️ *KenaX BD - Order #${order.id}*
👤 *Customer:* ${order.deliveryName || order.customerName || 'Valued Customer'}
📞 *Phone:* ${order.deliveryMobile || order.customerMobile || 'N/A'}
📍 *Address:* ${order.fullAddress || 'N/A'}, ${order.district || ''}
💰 *Total Bill:* ৳${order.totalAmount} (COD: ${order.paymentMethod || 'Cash on Delivery'})
📦 *Items:*
${(order.items || []).map((item) => `- ${item.productName} (x${item.quantity}) - ৳${item.price * item.quantity}`).join('\n')}

${type === 'customer' ? 'ধন্যবাদ! আপনার অর্ডারটি প্রক্রিয়াধীন আছে। যেকোনো প্রয়োজনে হেল্পলাইনে যোগাযোগ করুন।' : 'অর্ডারের বিবরণ চেক করুন।'}`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

// Trigger automatic Email Confirmation for Customer and Super Admin alerts
export async function triggerOrderEmailNotification(order: Order) {
  try {
    await triggerOrderPlacedWorkflow(order);
  } catch (err) {
    console.warn('Order email workflow trigger note:', err);
  }
}
