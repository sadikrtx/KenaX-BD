import { Order, WhatsAppSettings, WhatsAppTemplate, WhatsAppEventType } from '../types';
import { db, isQuotaExceededError, markQuotaExceeded, isQuotaExceededFlag } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export const DEFAULT_WHATSAPP_TEMPLATES: Record<WhatsAppEventType, WhatsAppTemplate> = {
  order_placed: {
    id: 'order_placed',
    title: 'Order Placed (Pending)',
    banglaTitle: 'Order Placed (Pending)',
    category: 'Transactional',
    enabled: true,
    message: `🛍️ *{{siteName}} - Order Successfully Received!*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,
Your order has been successfully placed at {{siteName}}.

📦 *Order ID:* #{{orderId}}
💰 *Total Amount:* ৳{{totalAmount}}
💳 *Payment Method:* {{paymentMethod}}
💵 *Due on Delivery:* ৳{{dueAmount}}
📍 *Delivery Address:* {{fullAddress}}, {{district}}

🛒 *Ordered Items:*
{{itemsList}}

Our team will contact you soon to confirm the order.
📞 Helpline: {{helpline}}
Thank you for shopping with {{siteName}}!`,
    variables: ['{{siteName}}', '{{customerName}}', '{{orderId}}', '{{totalAmount}}', '{{paymentMethod}}', '{{dueAmount}}', '{{fullAddress}}', '{{district}}', '{{itemsList}}', '{{helpline}}'],
  },

  order_confirmed: {
    id: 'order_confirmed',
    title: 'Order Confirmed',
    banglaTitle: 'Order Confirmed & Packaging',
    category: 'Transactional',
    enabled: true,
    message: `✅ *Order Confirmed - {{siteName}}*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,
Your order *#{{orderId}}* has been confirmed and sent to packaging.

💰 *Total Value:* ৳{{totalAmount}}
📍 *Address:* {{fullAddress}}

🚚 Your parcel will be handed over to the courier shortly.
For support: {{helpline}}`,
    variables: ['{{siteName}}', '{{customerName}}', '{{orderId}}', '{{totalAmount}}', '{{fullAddress}}', '{{helpline}}'],
  },

  order_shipped: {
    id: 'order_shipped',
    title: 'Order Shipped / Handed to Courier',
    banglaTitle: 'Order Shipped & Live Tracking',
    category: 'Transactional',
    enabled: true,
    message: `🚚 *Your parcel has been handed over to courier!*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,
Your order *#{{orderId}}* has been booked with {{courierName}}.

📦 *Courier:* {{courierName}}
🔢 *Tracking Code:* {{trackingNumber}}
🌐 *Live Track Parcel:* {{trackingUrl}}
💵 *Due Amount:* ৳{{dueAmount}}

Courier representative will call you upon delivery.
📞 Customer Care: {{helpline}}`,
    variables: ['{{customerName}}', '{{orderId}}', '{{courierName}}', '{{trackingNumber}}', '{{trackingUrl}}', '{{dueAmount}}', '{{helpline}}'],
  },

  out_for_delivery: {
    id: 'out_for_delivery',
    title: 'Out For Delivery',
    banglaTitle: 'Out For Delivery (Rider on the way)',
    category: 'Transactional',
    enabled: true,
    message: `🚴‍♂️ *Your parcel will be delivered today!*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,
The delivery rider is on the way to your address for order *#{{orderId}}*.

💵 *Cash on Delivery Due:* ৳{{dueAmount}}
Please keep your phone active so the rider can contact you.

Thank you,
{{siteName}}`,
    variables: ['{{customerName}}', '{{orderId}}', '{{dueAmount}}', '{{siteName}}'],
  },

  order_delivered: {
    id: 'order_delivered',
    title: 'Order Delivered & Review',
    banglaTitle: 'Order Delivered & Review Request',
    category: 'Transactional',
    enabled: true,
    message: `🎉 *Congratulations! Parcel Delivered Successfully*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,
Your order from {{siteName}} has been successfully delivered.

We hope you love your product. Your honest review helps us improve our service.
Stay with us for special discounts on your next purchase!
🌐 {{siteName}} | Helpline: {{helpline}}`,
    variables: ['{{customerName}}', '{{siteName}}', '{{helpline}}'],
  },

  payment_received: {
    id: 'payment_received',
    title: 'Payment / Advance Verified',
    banglaTitle: 'Payment Verification Receipt',
    category: 'Transactional',
    enabled: true,
    message: `💳 *Payment Successfully Received - {{siteName}}*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,
Your payment of ৳{{paidAmount}} for order *#{{orderId}}* has been verified.

💰 *Total Order Price:* ৳{{totalAmount}}
✅ *Paid Amount:* ৳{{paidAmount}}
💵 *Due Balance:* ৳{{dueAmount}}

Your order is being dispatched promptly.
Thank you!`,
    variables: ['{{siteName}}', '{{customerName}}', '{{orderId}}', '{{paidAmount}}', '{{totalAmount}}', '{{dueAmount}}'],
  },

  cart_recovery: {
    id: 'cart_recovery',
    title: 'Abandoned Cart Recovery',
    banglaTitle: 'Abandoned Cart Reminder',
    category: 'Marketing',
    enabled: true,
    message: `👋 *Dear customer, your cart items are waiting!*
━━━━━━━━━━━━━━━━━━━━
You selected some great products at {{siteName}} but did not complete your order.

Stock is running out fast! Confirm your order now for prompt home delivery.
🛒 *Visit to complete order:* {{siteName}}
📞 Chat with us on WhatsApp for any queries.`,
    variables: ['{{siteName}}'],
  },

  marketing_broadcast: {
    id: 'marketing_broadcast',
    title: 'Special Promo / Festival Offer',
    banglaTitle: 'Special Festival Offer & Promo',
    category: 'Marketing',
    enabled: true,
    message: `🔥 *{{siteName}} Mega Discount Offer!*
━━━━━━━━━━━━━━━━━━━━
Dear Customer,
Exciting discounts and cash on delivery offers are live on our website!

🚚 Fastest nationwide home delivery
🛡️ 100% original product guarantee

Click now to explore offers: {{siteName}}
📞 Helpline: {{helpline}}`,
    variables: ['{{siteName}}', '{{helpline}}'],
  },
};

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  enabled: true,
  businessNumber: '8801800000000',
  senderName: 'KenaX BD Official',
  provider: 'direct_link',
  instanceId: '',
  apiKey: '',
  webhookUrl: '',
  autoSendOnNewOrder: true,
  autoSendOnShipped: true,
  autoSendOnDelivered: true,
  autoSendOnPayment: true,
  templates: DEFAULT_WHATSAPP_TEMPLATES,
};

const SETTINGS_DOC_ID = 'whatsapp_settings_config';
const LOCAL_STORAGE_KEY = 'kenax_whatsapp_settings';

export async function getWhatsAppSettingsFromDB(): Promise<WhatsAppSettings> {
  try {
    if (db) {
      const snap = await getDoc(doc(db, 'system_settings', SETTINGS_DOC_ID));
      if (snap.exists()) {
        const data = snap.data() as Partial<WhatsAppSettings>;
        const merged: WhatsAppSettings = {
          ...DEFAULT_WHATSAPP_SETTINGS,
          ...data,
          templates: {
            ...DEFAULT_WHATSAPP_TEMPLATES,
            ...(data.templates || {}),
          },
        };
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    }
  } catch (err) {
    console.warn('[WhatsApp Settings DB Read Fallback]:', err);
  }

  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      return {
        ...DEFAULT_WHATSAPP_SETTINGS,
        ...parsed,
        templates: {
          ...DEFAULT_WHATSAPP_TEMPLATES,
          ...(parsed.templates || {}),
        },
      };
    }
  } catch {}

  return DEFAULT_WHATSAPP_SETTINGS;
}

export async function saveWhatsAppSettingsToDB(settings: WhatsAppSettings): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  } catch {}

  if (isQuotaExceededFlag) return;

  try {
    if (db) {
      await setDoc(doc(db, 'system_settings', SETTINGS_DOC_ID), {
        ...settings,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded(err);
    } else {
      console.warn('[WhatsApp Settings DB Save Error]:', err);
    }
  }
}

export function subscribeToWhatsAppSettings(callback: (settings: WhatsAppSettings) => void): () => void {
  try {
    if (db && !isQuotaExceededFlag) {
      const unsubscribe = onSnapshot(
        doc(db, 'system_settings', SETTINGS_DOC_ID),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Partial<WhatsAppSettings>;
            callback({
              ...DEFAULT_WHATSAPP_SETTINGS,
              ...data,
              templates: {
                ...DEFAULT_WHATSAPP_TEMPLATES,
                ...(data.templates || {}),
              },
            });
          }
        },
        (error) => {
          if (isQuotaExceededError(error)) {
            markQuotaExceeded(error);
          } else {
            console.warn('[WhatsApp Settings onSnapshot warning]:', error);
          }
        }
      );
      return unsubscribe;
    }
  } catch (err) {
    console.warn('[WhatsApp subscribe error]:', err);
  }
  return () => {};
}

// Helper to format dynamic placeholders in message template
export function formatWhatsAppMessage(
  templateText: string,
  data: {
    order?: Order;
    customerName?: string;
    customerMobile?: string;
    totalAmount?: number;
    paidAmount?: number;
    dueAmount?: number;
    paymentMethod?: string;
    itemsList?: string;
    fullAddress?: string;
    district?: string;
    courierName?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    siteName?: string;
    helpline?: string;
  }
): string {
  const order = data.order;
  const siteName = data.siteName || 'KenaX BD';
  const helpline = data.helpline || '+880 1800-KENAXBD';

  const customerName = data.customerName || order?.deliveryName || order?.customerName || 'সম্মানিত গ্রাহক';
  const customerMobile = data.customerMobile || order?.deliveryMobile || order?.customerMobile || '';
  const orderId = order?.id || 'KNX-' + Date.now().toString().slice(-6);
  const totalAmount = data.totalAmount ?? order?.totalAmount ?? 0;
  const paidAmount = data.paidAmount ?? order?.paidAmount ?? (order?.paymentOptionType === 'full' ? order?.totalAmount : 0);
  const dueAmount = data.dueAmount ?? order?.dueAmount ?? (totalAmount - (paidAmount || 0));
  const paymentMethod = data.paymentMethod || order?.paymentMethod || 'Cash on Delivery';
  const fullAddress = data.fullAddress || order?.fullAddress || 'N/A';
  const district = data.district || order?.district || '';
  const courierName = data.courierName || order?.courierName || 'Steadfast Courier';
  const trackingNumber = data.trackingNumber || order?.trackingNumber || `TRK-${orderId}`;
  const trackingUrl = data.trackingUrl || order?.trackingUrl || `https://steadfast.com.bd/t/${trackingNumber}`;

  let itemsFormatted = data.itemsList;
  if (!itemsFormatted && order?.items) {
    itemsFormatted = order.items
      .map((item) => `• ${item.productName} (x${item.quantity}) - ৳${item.price * item.quantity}`)
      .join('\n');
  }

  let formatted = templateText
    .replace(/\{\{siteName\}\}/g, siteName)
    .replace(/\{\{helpline\}\}/g, helpline)
    .replace(/\{\{customerName\}\}/g, customerName)
    .replace(/\{\{customerMobile\}\}/g, customerMobile)
    .replace(/\{\{orderId\}\}/g, orderId)
    .replace(/\{\{totalAmount\}\}/g, totalAmount.toLocaleString('en-BD'))
    .replace(/\{\{paidAmount\}\}/g, (paidAmount || 0).toLocaleString('en-BD'))
    .replace(/\{\{dueAmount\}\}/g, (dueAmount || 0).toLocaleString('en-BD'))
    .replace(/\{\{paymentMethod\}\}/g, paymentMethod)
    .replace(/\{\{fullAddress\}\}/g, fullAddress)
    .replace(/\{\{district\}\}/g, district)
    .replace(/\{\{courierName\}\}/g, courierName)
    .replace(/\{\{trackingNumber\}\}/g, trackingNumber)
    .replace(/\{\{trackingUrl\}\}/g, trackingUrl)
    .replace(/\{\{itemsList\}\}/g, itemsFormatted || '1x পণ্য');

  return formatted;
}

// Generate instant wa.me clickable link
export function generateWhatsAppDirectLink(phone: string, message: string): string {
  let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '88' + cleanPhone;
  } else if (!cleanPhone.startsWith('88') && cleanPhone.length === 10) {
    cleanPhone = '880' + cleanPhone;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// Trigger automatic WhatsApp message dispatch (supports UltraMsg / Webhook / Direct)
export async function triggerWhatsAppDispatch(
  recipientPhone: string,
  eventType: WhatsAppEventType,
  order: Order,
  settings?: WhatsAppSettings
): Promise<{ success: boolean; method: string; url?: string }> {
  try {
    const activeSettings = settings || (await getWhatsAppSettingsFromDB());
    if (!activeSettings.enabled) {
      return { success: false, method: 'disabled' };
    }

    const tpl = activeSettings.templates[eventType] || DEFAULT_WHATSAPP_TEMPLATES[eventType];
    if (!tpl || !tpl.enabled) {
      return { success: false, method: 'template_disabled' };
    }

    const message = formatWhatsAppMessage(tpl.message, { order });
    const directUrl = generateWhatsAppDirectLink(recipientPhone, message);

    // If commercial API configured (UltraMsg / GreenAPI / Wasender)
    if (activeSettings.provider === 'ultramsg' && activeSettings.instanceId && activeSettings.apiKey) {
      try {
        await fetch(`https://api.ultramsg.com/${activeSettings.instanceId}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: activeSettings.apiKey,
            to: recipientPhone.replace(/[^0-9]/g, ''),
            body: message,
          }),
        });
        return { success: true, method: 'ultramsg_api' };
      } catch (err) {
        console.warn('UltraMsg dispatch failed, falling back to direct link:', err);
      }
    }

    return { success: true, method: 'direct_link', url: directUrl };
  } catch (err) {
    console.warn('WhatsApp dispatch error:', err);
    return { success: false, method: 'error' };
  }
}
