import { Order, WhatsAppSettings, WhatsAppTemplate, WhatsAppEventType, WhatsAppMessageRecord, WhatsAppConversation } from '../types';
import { db, isQuotaExceededError, markQuotaExceeded, isQuotaExceededFlag } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';

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

    // If Official Meta WhatsApp Cloud API configured
    if (activeSettings.provider === 'cloud_api') {
      try {
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: recipientPhone,
            type: 'text',
            text: message,
            orderId: order.id,
          }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          return { success: true, method: 'cloud_api', url: directUrl };
        } else {
          console.warn('Meta WhatsApp Cloud API dispatch note:', data.error);
        }
      } catch (cloudErr) {
        console.warn('Meta Cloud API dispatch fallback to direct link:', cloudErr);
      }
    }

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

/**
 * Normalizes phone numbers to standard format (e.g. "88017XXXXXXXX" or local "017XXXXXXXX")
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('880') && digits.length === 13) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `88${digits}`;
  }
  if (digits.length === 10) {
    return `880${digits}`;
  }
  return digits;
}

export function formatPhoneDisplay(phone: string): string {
  const clean = (phone || '').replace(/[^0-9]/g, '');
  if (clean.startsWith('8801') && clean.length === 13) {
    return `+880 ${clean.substring(3, 7)}-${clean.substring(7)}`;
  }
  if (clean.startsWith('01') && clean.length === 11) {
    return `${clean.substring(0, 5)}-${clean.substring(5)}`;
  }
  return phone;
}

/**
 * Calculates WhatsApp 24-hour Customer Service Window status for a conversation thread.
 * Under Meta Cloud API rules, free-form text replies are permitted within 24 hours of the customer's last message.
 */
export function get24hCustomerServiceWindow(messages: WhatsAppMessageRecord[]): {
  isActive: boolean;
  remainingMs: number;
  remainingHours: number;
  remainingMinutes: number;
  lastIncomingTime: string | null;
  formattedRemaining: string;
} {
  const incomingMessages = messages
    .filter((m) => m.direction === 'incoming')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (incomingMessages.length === 0) {
    return {
      isActive: false,
      remainingMs: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      lastIncomingTime: null,
      formattedRemaining: 'No customer message received yet',
    };
  }

  const lastIncoming = incomingMessages[0];
  const lastTime = new Date(lastIncoming.timestamp).getTime();
  const now = Date.now();
  const elapsedMs = now - lastTime;
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const remainingMs = Math.max(0, TWENTY_FOUR_HOURS_MS - elapsedMs);

  const isActive = remainingMs > 0;
  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  let formattedRemaining = '';
  if (isActive) {
    if (remainingHours > 0) {
      formattedRemaining = `${remainingHours}h ${remainingMinutes}m remaining`;
    } else {
      formattedRemaining = `${remainingMinutes}m remaining`;
    }
  } else {
    formattedRemaining = 'Expired (Template required)';
  }

  return {
    isActive,
    remainingMs,
    remainingHours,
    remainingMinutes,
    lastIncomingTime: lastIncoming.timestamp,
    formattedRemaining,
  };
}

/**
 * Groups a flat list of WhatsApp message records into threaded customer conversations.
 */
export function groupMessagesIntoConversations(messages: WhatsAppMessageRecord[]): WhatsAppConversation[] {
  const conversationMap = new Map<string, WhatsAppConversation>();

  // Process messages sorted chronologically
  const sorted = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const msg of sorted) {
    // Determine customer phone number (if incoming -> 'from', if outgoing -> 'to')
    const customerPhone = msg.direction === 'incoming' ? msg.from : msg.to || msg.from;
    if (!customerPhone) continue;

    const normalizedKey = normalizePhoneNumber(customerPhone);
    let conv = conversationMap.get(normalizedKey);

    if (!conv) {
      conv = {
        phoneNumber: customerPhone,
        customerName: msg.senderName || undefined,
        unreadCount: 0,
        totalMessages: 0,
        is24hWindowActive: false,
        messages: [],
      };
      conversationMap.set(normalizedKey, conv);
    }

    if (msg.senderName && !conv.customerName) {
      conv.customerName = msg.senderName;
    }

    conv.messages.push(msg);
    conv.totalMessages++;
    conv.lastMessage = msg;

    if (msg.direction === 'incoming' && msg.status !== 'read') {
      conv.unreadCount++;
    }
  }

  const result = Array.from(conversationMap.values()).map((conv) => {
    const windowStatus = get24hCustomerServiceWindow(conv.messages);
    return {
      ...conv,
      is24hWindowActive: windowStatus.isActive,
      windowExpiresAt: windowStatus.lastIncomingTime
        ? new Date(new Date(windowStatus.lastIncomingTime).getTime() + 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    };
  });

  // Sort conversations by latest message timestamp descending
  return result.sort((a, b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Send a reply message to customer via backend Meta Cloud API endpoint
 */
export async function sendWhatsAppReply(params: {
  to: string;
  text: string;
  orderId?: string;
  staffMember?: string;
  staffId?: string;
  staffRole?: string;
}): Promise<{
  success: boolean;
  messageId?: string;
  message?: WhatsAppMessageRecord;
  error?: string;
  isWindowExpired?: boolean;
}> {
  try {
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.to,
        type: 'text',
        text: params.text,
        orderId: params.orderId,
        staffMember: params.staffMember,
        staffId: params.staffId,
        staffRole: params.staffRole,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to send WhatsApp message',
        isWindowExpired: Boolean(data.isWindowExpired),
      };
    }

    return {
      success: true,
      messageId: data.messageId,
      message: data.message,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network communication error',
    };
  }
}

/**
 * Subscribe to live WhatsApp messages with Firestore real-time listener + HTTP polling fallback
 */
export function subscribeToWhatsAppMessages(
  callback: (messages: WhatsAppMessageRecord[], webhooks?: any[], configStatus?: any) => void
): () => void {
  let isSubscribed = true;

  // Initial HTTP fetch
  const fetchMessagesHttp = async () => {
    try {
      const res = await fetch('/api/whatsapp/messages');
      if (res.ok && isSubscribed) {
        const data = await res.json();
        callback(data.messages || [], data.webhooks || [], data.configStatus || null);
      }
    } catch (err) {
      console.warn('HTTP fetch WhatsApp messages error:', err);
    }
  };

  fetchMessagesHttp();

  // Firestore Realtime Subscription (if available)
  let firestoreUnsub: (() => void) | null = null;
  if (db && !isQuotaExceededFlag) {
    try {
      const messagesRef = collection(db, 'whatsapp_messages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(100));
      firestoreUnsub = onSnapshot(
        q,
        (snapshot) => {
          if (!isSubscribed) return;
          const firestoreMsgs: WhatsAppMessageRecord[] = [];
          snapshot.forEach((docSnap) => {
            firestoreMsgs.push(docSnap.data() as WhatsAppMessageRecord);
          });
          if (firestoreMsgs.length > 0) {
            callback(firestoreMsgs);
          }
        },
        (error) => {
          if (isQuotaExceededError(error)) {
            markQuotaExceeded();
          }
        }
      );
    } catch {
      // Fallback to polling
    }
  }

  // Polling interval (every 5 seconds)
  const pollInterval = setInterval(() => {
    if (isSubscribed) {
      fetchMessagesHttp();
    }
  }, 5000);

  return () => {
    isSubscribed = false;
    clearInterval(pollInterval);
    if (firestoreUnsub) {
      firestoreUnsub();
    }
  };
}

