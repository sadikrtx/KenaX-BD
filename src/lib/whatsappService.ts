import { Order, WhatsAppSettings, WhatsAppTemplate, WhatsAppEventType, WhatsAppMessageRecord, WhatsAppConversation, Product } from '../types/index.ts';
import { INITIAL_PRODUCTS } from '../data/initialProducts.ts';
import { db, isQuotaExceededError, markQuotaExceeded, isQuotaExceededFlag } from './firebase.ts';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export const DEFAULT_WHATSAPP_TEMPLATES: Record<WhatsAppEventType, WhatsAppTemplate> = {
  user_registered: {
    id: 'user_registered',
    title: 'New Account Registration Welcome',
    banglaTitle: 'New User Welcome & Registration',
    category: 'Transactional',
    enabled: true,
    message: `✨ *Welcome to {{siteName}}!*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,

Your user account has been successfully created.

👤 *Name:* {{customerName}}
📱 *Phone:* {{phone}}
📧 *Email:* {{email}}
🔑 *Account ID:* #{{userId}}

Enjoy hassle-free online shopping with 100% original products and fast nationwide delivery!

🌐 *Shop Now:* {{siteName}}
📞 Helpline: {{helpline}}`,
    variables: ['{{siteName}}', '{{customerName}}', '{{phone}}', '{{email}}', '{{userId}}', '{{helpline}}'],
  },

  order_placed: {
    id: 'order_placed',
    title: 'Order Placed (Customer Confirmation)',
    banglaTitle: 'Order Received Confirmation',
    category: 'Transactional',
    enabled: true,
    message: `🛍️ *{{siteName}} - Order Successfully Received!*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,

Your order has been successfully placed at {{siteName}}.

📦 *Order ID:* #{{orderId}}
📞 *Phone:* {{phone}}
💰 *Total Amount:* ৳{{totalAmount}}
💳 *Payment Method:* {{paymentMethod}}
💵 *Due Balance:* ৳{{dueAmount}}
📍 *Delivery Address:* {{fullAddress}}
🏙️ *Thana/Upazila:* {{upazila}}
📌 *District:* {{district}}
🗺️ *Division:* {{division}}

🛒 *Ordered Items:*
{{itemsList}}

🤖 *Subscribe for Live Order Updates on Telegram Bot:*
👉 {{telegramBotUrl}}

Our support team will verify your order shortly.
📞 Helpline: {{helpline}}
Thank you for choosing {{siteName}}!`,
    variables: ['{{siteName}}', '{{customerName}}', '{{phone}}', '{{orderId}}', '{{totalAmount}}', '{{paymentMethod}}', '{{dueAmount}}', '{{fullAddress}}', '{{upazila}}', '{{district}}', '{{division}}', '{{itemsList}}', '{{telegramBotUrl}}', '{{helpline}}'],
  },

  admin_pinned_order_alert: {
    id: 'admin_pinned_order_alert',
    title: 'New Order Alert (Pinned Admin)',
    banglaTitle: 'Pinned Admin Alert - New Order',
    category: 'Support',
    enabled: true,
    message: `🚨 *[NEW ORDER ALERT]*
━━━━━━━━━━━━━━━━━━━━
📦 *Order ID:* #{{orderId}}
👤 *Customer:* {{customerName}}
📞 *Phone:* {{phone}}
✉️ *Email:* {{email}}
📍 *Address:* {{fullAddress}}
🏙️ *Thana/Upazila:* {{upazila}}
📌 *District:* {{district}}
🗺️ *Division:* {{division}}

🛒 *Items:*
{{itemsList}}

💰 *Final Selling Price:* ৳{{totalAmount}} ({{paymentMethod}})
💵 *Cost Price:* ৳{{costPrice}}
{{supplierInfo}}
🕒 *Placed At:* {{timestamp}}
⚡ *Action Required:* Review & Confirm in Admin Panel.`,
    variables: [
      '{{orderId}}',
      '{{customerName}}',
      '{{phone}}',
      '{{email}}',
      '{{fullAddress}}',
      '{{upazila}}',
      '{{district}}',
      '{{division}}',
      '{{itemsList}}',
      '{{totalAmount}}',
      '{{paymentMethod}}',
      '{{costPrice}}',
      '{{supplierInfo}}',
      '{{supplierName}}',
      '{{productLink}}',
      '{{timestamp}}'
    ],
  },

  admin_pinned_registration_alert: {
    id: 'admin_pinned_registration_alert',
    title: 'New Registration Alert (Pinned Admin)',
    banglaTitle: 'Pinned Admin Alert - New Registration',
    category: 'Support',
    enabled: true,
    message: `👤 *[NEW CUSTOMER REGISTRATION]*
━━━━━━━━━━━━━━━━━━━━
📌 *Customer Name:* {{customerName}}
📞 *Phone:* {{phone}}
✉️ *Email:* {{email}}
🆔 *User ID:* {{userId}}
🕒 *Registered At:* {{timestamp}}
⚡ *Action Required:* Welcome customer or check profile.`,
    variables: ['{{customerName}}', '{{phone}}', '{{email}}', '{{userId}}', '{{timestamp}}'],
  },

  order_confirmed: {
    id: 'order_confirmed',
    title: 'Order Confirmed Status',
    banglaTitle: 'Order Confirmed Status',
    category: 'Transactional',
    enabled: true,
    message: `✅ *Order Confirmed - {{siteName}}*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,

Great news! Your order *#{{orderId}}* has been verified and confirmed.

📦 *Order ID:* #{{orderId}}
💰 *Total Value:* ৳{{totalAmount}}
📍 *Address:* {{fullAddress}}

🚚 Our warehouse team is packaging your order for courier pickup.

🤖 *Track Live Order Status on Telegram Bot:*
👉 {{telegramBotUrl}}

📞 Support Helpline: {{helpline}}`,
    variables: ['{{siteName}}', '{{customerName}}', '{{orderId}}', '{{totalAmount}}', '{{fullAddress}}', '{{telegramBotUrl}}', '{{helpline}}'],
  },

  admin_pinned_status_alert: {
    id: 'admin_pinned_status_alert',
    title: 'Order Status Change (Staff Activity Alert)',
    banglaTitle: 'Pinned Admin Alert - Staff Status Activity',
    category: 'Support',
    enabled: true,
    message: `⚡ *STAFF ACTIVITY - ORDER STATUS UPDATE*
━━━━━━━━━━━━━━━━━━━━
🔄 *Status Update:* {{oldStatus}} ➡️ {{newStatus}}
👨‍💼 *Updated By Staff:* {{staffName}} (Role: {{staffRole}})
🆔 *Staff ID:* {{staffId}}

📦 *Order Details:*
• *Order ID:* #{{orderId}}
• *Total Value:* ৳{{totalAmount}} ({{paymentMethod}})
• *Paid:* ৳{{paidAmount}} | *Due:* ৳{{dueAmount}}

👤 *Customer Information:*
• *Name:* {{customerName}}
• *Phone:* {{phone}}
• *Email:* {{email}}
• *Address:* {{fullAddress}}
• *Thana/Upazila:* {{upazila}}
• *District:* {{district}}
• *Division:* {{division}}

🛒 *Ordered Items:*
{{itemsList}}

🚚 *Logistics Information:*
• *Courier Partner:* {{courierName}}
• *Tracking ID:* {{trackingNumber}}

🕒 *Activity Time:* {{timestamp}}`,
    variables: [
      '{{oldStatus}}',
      '{{newStatus}}',
      '{{statusUpdate}}',
      '{{staffName}}',
      '{{staffRole}}',
      '{{staffId}}',
      '{{orderId}}',
      '{{totalAmount}}',
      '{{paymentMethod}}',
      '{{paidAmount}}',
      '{{dueAmount}}',
      '{{customerName}}',
      '{{phone}}',
      '{{email}}',
      '{{fullAddress}}',
      '{{upazila}}',
      '{{district}}',
      '{{division}}',
      '{{itemsList}}',
      '{{courierName}}',
      '{{trackingNumber}}',
      '{{costPrice}}',
      '{{supplierInfo}}',
      '{{timestamp}}',
    ],
  },

  admin_pinned_fake_order_alert: {
    id: 'admin_pinned_fake_order_alert',
    title: 'Staff Fake Order Action Alert',
    banglaTitle: 'Pinned Admin Alert - Staff Marked Fake Order',
    category: 'Support',
    enabled: true,
    message: `🚨 *[FAKE ORDER ALERT - STAFF ACTION]*
━━━━━━━━━━━━━━━━━━━━
👨‍💼 *স্টাফ:* {{staffName}} (Role: {{staffRole}}, ID: {{staffId}})
⚠️ *অ্যাকশন:* অর্ডার *#{{orderId}}* কে *ফেক অর্ডার (Fake Order)* হিসেবে চিহ্নিত করেছেন।

📦 *অর্ডার বিবরণ:*
• অর্ডার আইডি: #{{orderId}}
• কাস্টমার: {{customerName}}
• মোবাইল: {{phone}}
• ঠিকানা: {{fullAddress}}
• মোট মূল্য: ৳{{totalAmount}} ({{paymentMethod}})

🛒 *আইটেমসমূহ:*
{{itemsList}}

🕒 সময়: {{timestamp}}
⚡ সুপার অ্যাডমিন চাইলে ড্যাশবোর্ড থেকে আনফেক (Unfake) করতে পারবেন।`,
    variables: [
      '{{staffName}}',
      '{{staffRole}}',
      '{{staffId}}',
      '{{orderId}}',
      '{{customerName}}',
      '{{phone}}',
      '{{fullAddress}}',
      '{{totalAmount}}',
      '{{paymentMethod}}',
      '{{itemsList}}',
      '{{timestamp}}',
    ],
  },

  order_shipped: {
    id: 'order_shipped',
    title: 'Order Shipped / Handed to Courier',
    banglaTitle: 'Order Shipped & Live Tracking',
    category: 'Transactional',
    enabled: true,
    message: `🚚 *Your Parcel is Handed Over to Courier!*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,

Your order *#{{orderId}}* has been dispatched via {{courierName}}.

📦 *Courier Partner:* {{courierName}}
🔢 *Tracking Code:* {{trackingNumber}}
🌐 *Live Track Parcel:* {{trackingUrl}}
💵 *Cash Due on Delivery:* ৳{{dueAmount}}

🤖 *Get Instant Push Notifications on Telegram Bot:*
👉 {{telegramBotUrl}}

The delivery agent will contact your phone number before arrival.
📞 Helpline: {{helpline}}`,
    variables: ['{{customerName}}', '{{orderId}}', '{{courierName}}', '{{trackingNumber}}', '{{trackingUrl}}', '{{dueAmount}}', '{{telegramBotUrl}}', '{{helpline}}'],
  },

  out_for_delivery: {
    id: 'out_for_delivery',
    title: 'Out For Delivery (Rider Active)',
    banglaTitle: 'Out For Delivery',
    category: 'Transactional',
    enabled: true,
    message: `🚴‍♂️ *Parcel Out For Delivery Today!*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,

The delivery rider is currently on the way to your address for order *#{{orderId}}*.

💵 *Cash on Delivery Due:* ৳{{dueAmount}}
Please keep your contact phone active to receive the delivery call.

Thank you for shopping with {{siteName}}!`,
    variables: ['{{customerName}}', '{{orderId}}', '{{dueAmount}}', '{{siteName}}'],
  },

  order_delivered: {
    id: 'order_delivered',
    title: 'Order Delivered & Customer Review Request',
    banglaTitle: 'অর্ডার ডেলিভারড ও ওয়েবসাইট রিভিউ রিকোয়েস্ট',
    category: 'Transactional',
    enabled: true,
    message: `🎉 *Order Delivered Successfully!*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,

Your order *#{{orderId}}* from {{siteName}} has been successfully delivered! 📦

⭐ *We Value Your Feedback!*
Please take a moment to leave a product review on our official website:
👉 *Website Review Link:* https://kenaxbd.ai.studio

Thank you for choosing {{siteName}}!
🌐 Website: https://kenaxbd.ai.studio | Helpline: {{helpline}}`,
    variables: ['{{customerName}}', '{{orderId}}', '{{siteName}}', '{{helpline}}'],
  },

  order_cancelled: {
    id: 'order_cancelled',
    title: 'Order Cancelled Notice',
    banglaTitle: 'Order Cancelled Notice',
    category: 'Transactional',
    enabled: true,
    message: `❌ *Order Cancellation Notice - {{siteName}}*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,

Your order *#{{orderId}}* has been cancelled.

📝 Note: {{cancelReason}}

If you have any questions, please contact our support desk: {{helpline}}.`,
    variables: ['{{siteName}}', '{{customerName}}', '{{orderId}}', '{{cancelReason}}', '{{helpline}}'],
  },

  payment_received: {
    id: 'payment_received',
    title: 'Payment / Advance Verified',
    banglaTitle: 'Payment Verification Receipt',
    category: 'Transactional',
    enabled: true,
    message: `💳 *Payment Successfully Verified - {{siteName}}*
━━━━━━━━━━━━━━━━━━━━
Dear *{{customerName}}*,

Your payment of ৳{{paidAmount}} for order *#{{orderId}}* has been verified.

💰 *Total Order Price:* ৳{{totalAmount}}
✅ *Paid Amount:* ৳{{paidAmount}}
💵 *Remaining Due:* ৳{{dueAmount}}

Your order status has been updated.
Thank you!`,
    variables: ['{{siteName}}', '{{customerName}}', '{{orderId}}', '{{paidAmount}}', '{{totalAmount}}', '{{dueAmount}}'],
  },

  payment_number_updated: {
    id: 'payment_number_updated',
    title: 'Payment Details / Account Numbers Updated',
    banglaTitle: 'Security Alert - Payment Numbers Updated',
    category: 'Support',
    enabled: true,
    message: `🛡️ *[SECURITY ALERT: PAYMENT NUMBERS UPDATED]*
━━━━━━━━━━━━━━━━━━━━
An administrative payment account number was modified in the site settings.

👨‍💼 *Updated By Staff:* {{staffName}} ({{staffRole}})
📱 *Staff ID:* {{staffId}}
💳 *Payment Gateway / Method:* {{paymentMethod}}
🔢 *New Account Number:* {{newNumber}}
📝 *Gateway Instructions:* {{instructions}}
🕒 *Timestamp:* {{timestamp}}

If this change was unexpected, please review the Admin Settings immediately.`,
    variables: ['{{staffName}}', '{{staffRole}}', '{{staffId}}', '{{paymentMethod}}', '{{newNumber}}', '{{instructions}}', '{{timestamp}}'],
  },

  cart_recovery: {
    id: 'cart_recovery',
    title: 'Abandoned Cart Recovery',
    banglaTitle: 'Abandoned Cart Reminder',
    category: 'Marketing',
    enabled: true,
    message: `👋 *Dear customer, items are waiting in your cart!*
━━━━━━━━━━━━━━━━━━━━
You added items to your cart at {{siteName}} but did not complete checkout.

Stock is limited! Complete your order now to secure prompt home delivery.
🛒 *Checkout Link:* {{siteName}}
📞 Need assistance? Reply directly to this WhatsApp chat.`,
    variables: ['{{siteName}}'],
  },

  marketing_broadcast: {
    id: 'marketing_broadcast',
    title: 'Special Promo / Festival Offer',
    banglaTitle: 'Special Offer & Promotion',
    category: 'Marketing',
    enabled: true,
    message: `🔥 *Special Promotion - {{siteName}}!*
━━━━━━━━━━━━━━━━━━━━
Dear Customer,

Exciting new discounts and Cash on Delivery deals are live on our store!

🚚 Nationwide fast delivery
🛡️ 100% genuine product guarantee

Explore deals now: {{siteName}}
📞 Helpline: {{helpline}}`,
    variables: ['{{siteName}}', '{{helpline}}'],
  },
};

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  enabled: true,
  businessNumber: '8801800000000',
  pinnedAdminNumber: '01887713212',
  senderName: 'KenaX BD Official',
  provider: 'direct_link',
  instanceId: '',
  apiKey: '',
  webhookUrl: '',
  autoSendOnRegistration: true,
  autoSendOnNewOrder: true,
  autoSendOnStatusChange: true,
  autoSendOnShipped: true,
  autoSendOnDelivered: true,
  autoSendOnPayment: true,
  autoSendOnPaymentUpdate: true,
  autoSendToPinnedAdmin: true,
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
        const incomingTemplates = { ...(data.templates || {}) };

        // Seamlessly upgrade legacy admin_pinned_order_alert template if it lacks new requested fields
        if (
          incomingTemplates.admin_pinned_order_alert &&
          (!incomingTemplates.admin_pinned_order_alert.message?.includes('{{costPrice}}') ||
           !incomingTemplates.admin_pinned_order_alert.message?.includes('{{email}}'))
        ) {
          incomingTemplates.admin_pinned_order_alert = DEFAULT_WHATSAPP_TEMPLATES.admin_pinned_order_alert;
        }

        // Seamlessly upgrade legacy admin_pinned_status_alert template
        if (
          incomingTemplates.admin_pinned_status_alert &&
          (!incomingTemplates.admin_pinned_status_alert.message?.includes('{{itemsList}}') ||
           !incomingTemplates.admin_pinned_status_alert.message?.includes('{{fullAddress}}'))
        ) {
          incomingTemplates.admin_pinned_status_alert = DEFAULT_WHATSAPP_TEMPLATES.admin_pinned_status_alert;
        }

        if (
          incomingTemplates.order_placed &&
          !incomingTemplates.order_placed.message?.includes('{{phone}}')
        ) {
          incomingTemplates.order_placed = DEFAULT_WHATSAPP_TEMPLATES.order_placed;
        }

        const merged: WhatsAppSettings = {
          ...DEFAULT_WHATSAPP_SETTINGS,
          ...data,
          pinnedAdminNumber: (data.pinnedAdminNumber || '').trim() || '01887713212',
          templates: {
            ...DEFAULT_WHATSAPP_TEMPLATES,
            ...incomingTemplates,
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
      const incomingTemplates = { ...(parsed.templates || {}) };

      if (
        incomingTemplates.admin_pinned_order_alert &&
        (!incomingTemplates.admin_pinned_order_alert.message?.includes('{{costPrice}}') ||
         !incomingTemplates.admin_pinned_order_alert.message?.includes('{{email}}'))
      ) {
        incomingTemplates.admin_pinned_order_alert = DEFAULT_WHATSAPP_TEMPLATES.admin_pinned_order_alert;
      }

      if (
        incomingTemplates.admin_pinned_status_alert &&
        (!incomingTemplates.admin_pinned_status_alert.message?.includes('{{itemsList}}') ||
         !incomingTemplates.admin_pinned_status_alert.message?.includes('{{fullAddress}}'))
      ) {
        incomingTemplates.admin_pinned_status_alert = DEFAULT_WHATSAPP_TEMPLATES.admin_pinned_status_alert;
      }

      if (
        incomingTemplates.order_placed &&
        !incomingTemplates.order_placed.message?.includes('{{phone}}')
      ) {
        incomingTemplates.order_placed = DEFAULT_WHATSAPP_TEMPLATES.order_placed;
      }

      return {
        ...DEFAULT_WHATSAPP_SETTINGS,
        ...parsed,
        pinnedAdminNumber: (parsed.pinnedAdminNumber || '').trim() || '01887713212',
        templates: {
          ...DEFAULT_WHATSAPP_TEMPLATES,
          ...incomingTemplates,
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

// Helper to look up product data for cost prices, suppliers and product links
export function findProductDetails(productId?: string): Partial<Product> | undefined {
  if (!productId) return undefined;
  try {
    const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('kenax_products_cache') : null;
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const found = list.find((p: any) => p.id === productId);
        if (found) return found;
      }
    }
  } catch {}
  return INITIAL_PRODUCTS.find((p) => p.id === productId);
}

// Helper to resolve clean customer phone number without leaving blanks
export function resolveCustomerPhone(order?: any, user?: any, fallbackPhone?: string): string {
  const customerMobile = (order?.customerMobile || '').trim();
  const deliveryMobile = (order?.deliveryMobile || '').trim();
  const customerPhone = (order?.customerPhone || '').trim();
  const phone = (order?.phone || '').trim();
  const mobile = (order?.mobile || '').trim();
  const userPhone = (user?.phone || user?.mobile || '').trim();
  const fallback = (fallbackPhone || '').trim();

  // If both customer account phone and delivery mobile are present and different
  if (customerMobile && deliveryMobile && customerMobile !== deliveryMobile) {
    return `${customerMobile} (Delivery: ${deliveryMobile})`;
  }

  return customerMobile || deliveryMobile || customerPhone || phone || mobile || userPhone || fallback || '';
}

// Helper to resolve customer email
export function resolveCustomerEmail(order?: any, user?: any): string {
  const email = (order?.customerEmail || order?.email || user?.email || '').trim();
  if (!email || email.toLowerCase() === 'customer@kenaxbd.com') {
    return 'Not provided';
  }
  return email;
}

// Helper to resolve complete structured address
export function resolveAddressDetails(order?: any) {
  if (!order) {
    return {
      fullAddress: 'N/A',
      streetAddress: 'N/A',
      division: 'N/A',
      district: 'N/A',
      upazila: 'N/A',
      area: 'N/A',
      postalCode: '',
    };
  }

  const division = (order.division || order.customerDivision || '').trim();
  const district = (order.district || order.city || '').trim();
  const upazila = (order.upazila || order.thana || '').trim();
  const area = (order.area || '').trim();
  const houseRoad = (order.houseRoad || '').trim();
  const rawAddress = (order.fullAddress || order.deliveryAddress || order.shippingAddress || order.address || '').trim();
  const postalCode = (order.postalCode || '').trim();

  // Street/House details
  const streetParts = [
    rawAddress,
    houseRoad && !rawAddress.toLowerCase().includes(houseRoad.toLowerCase()) ? houseRoad : '',
    area && !rawAddress.toLowerCase().includes(area.toLowerCase()) ? area : '',
  ].filter(Boolean);

  const cleanStreetAddress = streetParts.length > 0 ? streetParts.join(', ') : (rawAddress || 'Address provided');

  // Complete full address without missing division, district, upazila/thana
  const fullParts = [
    cleanStreetAddress,
    upazila && !cleanStreetAddress.toLowerCase().includes(upazila.toLowerCase()) ? upazila : '',
    district && !cleanStreetAddress.toLowerCase().includes(district.toLowerCase()) ? district : '',
    division && !cleanStreetAddress.toLowerCase().includes(division.toLowerCase()) ? `${division} Division` : '',
    postalCode ? `Postal: ${postalCode}` : '',
  ].filter(Boolean);

  const comprehensiveFullAddress = fullParts.join(', ') || cleanStreetAddress;

  return {
    fullAddress: comprehensiveFullAddress,
    streetAddress: cleanStreetAddress,
    division: division || 'N/A',
    district: district || 'N/A',
    upazila: upazila || 'N/A',
    area: area || 'N/A',
    postalCode: postalCode || '',
  };
}

// Format items list with product name, variation (only if present), quantity, price, and admin cost/supplier details
export function formatWhatsAppItemsList(items: any[], isAdmin: boolean = false): string {
  if (!Array.isArray(items) || items.length === 0) {
    return '1x Item';
  }

  return items
    .map((item) => {
      const title = item.productName || item.name || item.title || 'Product';
      const qty = item.quantity || 1;
      const unitPrice = item.price || 0;
      const itemTotal = unitPrice * qty;

      // Extract variation parts: Color, Size, Variant
      const color = (item.selectedColor || item.color || '').trim();
      const size = (item.selectedSize || item.size || '').trim();
      const rawVariant = (item.selectedVariation || item.variant || '').trim();

      const varParts: string[] = [];
      if (color) varParts.push(`Color: ${color}`);
      if (size) varParts.push(`Size: ${size}`);
      if (rawVariant) {
        const norm = rawVariant.toLowerCase();
        const redundant = (color && norm.includes(color.toLowerCase())) || (size && norm.includes(size.toLowerCase()));
        if (!redundant) varParts.push(`Variant: ${rawVariant}`);
      }

      // If no variation exists, do not display any variation bracket
      const variationStr = varParts.length > 0 ? ` [${varParts.join(' | ')}]` : '';
      let line = `• ${title}${variationStr} (Qty: ${qty}) - ৳${itemTotal.toLocaleString('en-BD')}`;

      if (isAdmin) {
        const prodMatch = findProductDetails(item.productId);
        const costPrice = Number(item.costPrice ?? prodMatch?.costPrice ?? 0);
        const supplierName = (item.supplierName || prodMatch?.supplierName || '').trim();
        const supplierUrl = (item.supplierUrl || prodMatch?.supplierUrl || '').trim();

        const adminDetails: string[] = [];
        if (costPrice > 0) {
          adminDetails.push(`Cost Price: ৳${(costPrice * qty).toLocaleString('en-BD')} (Unit: ৳${costPrice.toLocaleString('en-BD')})`);
        }
        if (supplierName) {
          adminDetails.push(`Supplier: ${supplierName}`);
        }
        if (supplierUrl) {
          adminDetails.push(`Product Link: ${supplierUrl}`);
        }

        if (adminDetails.length > 0) {
          line += '\n  ' + adminDetails.join('\n  ');
        }
      }

      return line;
    })
    .join('\n');
}

// Format order status cleanly in Title Case
export function formatOrderStatusName(status?: string): string {
  if (!status) return 'Pending';
  const clean = status.trim().toLowerCase().replace(/_/g, ' ');
  return clean
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper to format dynamic placeholders in message template
export function formatWhatsAppMessage(
  templateText: string,
  data: {
    order?: Order;
    customerName?: string;
    customerMobile?: string;
    customerPhone?: string;
    phone?: string;
    customerEmail?: string;
    email?: string;
    totalAmount?: number;
    paidAmount?: number;
    dueAmount?: number;
    costPrice?: number;
    paymentMethod?: string;
    itemsList?: string;
    fullAddress?: string;
    streetAddress?: string;
    district?: string;
    division?: string;
    upazila?: string;
    area?: string;
    courierName?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    siteName?: string;
    helpline?: string;
    supplierInfo?: string;
    supplierName?: string;
    productLink?: string;
    isAdmin?: boolean;
    staff?: { name?: string; role?: string; id?: string; email?: string };
    staffName?: string;
    staffRole?: string;
    staffId?: string;
    oldStatus?: string;
    newStatus?: string;
    statusUpdate?: string;
    statusTransition?: string;
    timestamp?: string;
  }
): string {
  const order = data.order;
  const siteName = data.siteName || 'KenaX BD';
  const helpline = data.helpline || '+880 1800-KENAXBD';

  const customerName = data.customerName || order?.deliveryName || order?.customerName || 'Valued Customer';
  const resolvedPhone = data.phone || data.customerPhone || data.customerMobile || resolveCustomerPhone(order);
  const resolvedEmail = data.email || data.customerEmail || resolveCustomerEmail(order);
  const orderId = order?.id || 'KNX-' + Date.now().toString().slice(-6);

  const totalAmount = data.totalAmount ?? order?.totalAmount ?? 0;
  const isOrderCompleted = order?.orderStatus === 'Completed' || data.newStatus === 'Completed';
  const isOrderFullyPaid = order?.paymentStatus === 'Paid' || isOrderCompleted;

  const paidAmount = isOrderFullyPaid
    ? totalAmount
    : (data.paidAmount ?? order?.paidAmount ?? (order?.paymentOptionType === 'full' ? totalAmount : 0));
  const dueAmount = isOrderFullyPaid
    ? 0
    : (data.dueAmount ?? order?.dueAmount ?? Math.max(0, totalAmount - (paidAmount || 0)));
  const paymentMethod = data.paymentMethod || order?.paymentMethod || 'Cash on Delivery';

  const addr = resolveAddressDetails(order);
  const fullAddress = data.fullAddress || addr.fullAddress;
  const streetAddress = data.streetAddress || addr.streetAddress;
  const district = data.district || addr.district;
  const division = data.division || addr.division;
  const upazila = data.upazila || addr.upazila;
  const area = data.area || addr.area;

  const courierName = data.courierName || order?.courierName || 'Steadfast Courier';
  const trackingNumber = data.trackingNumber || order?.trackingNumber || `TRK-${orderId}`;
  const trackingUrl = data.trackingUrl || order?.trackingUrl || `https://steadfast.com.bd/t/${trackingNumber}`;

  // Staff and status activity resolution
  const rawOld = data.oldStatus || order?.orderStatus || 'Pending';
  const rawNew = data.newStatus || (order?.orderStatus === 'Pending' ? 'Confirmed' : order?.orderStatus || 'Confirmed');
  const formattedOld = formatOrderStatusName(rawOld);
  const formattedNew = formatOrderStatusName(rawNew);
  const statusUpdateStr = data.statusUpdate || data.statusTransition || `${formattedOld} ➡️ ${formattedNew}`;

  const staffName = data.staffName || data.staff?.name || order?.handledByStaffName || 'Admin Staff';
  const staffRole = data.staffRole || data.staff?.role || order?.handledByStaffRole || 'Super Admin';
  const staffId = data.staffId || data.staff?.id || order?.handledByStaffId || 'STAFF-01';
  const timestamp = data.timestamp || new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  // Calculate order cost and supplier details if available
  let calculatedCostPrice = 0;
  const suppliersSet = new Set<string>();
  const supplierLinksList: string[] = [];

  if (Array.isArray(order?.items)) {
    order.items.forEach((item) => {
      const prod = findProductDetails(item.productId);
      const itemCost = Number(item.costPrice ?? prod?.costPrice ?? 0);
      const itemQty = Number(item.quantity || 1);
      calculatedCostPrice += itemCost * itemQty;

      const suppName = (item.supplierName || prod?.supplierName || '').trim();
      const suppUrl = (item.supplierUrl || prod?.supplierUrl || '').trim();
      if (suppName) suppliersSet.add(suppName);
      if (suppUrl && !supplierLinksList.includes(suppUrl)) supplierLinksList.push(suppUrl);
    });
  }

  const finalCostPrice = data.costPrice ?? calculatedCostPrice;
  const supplierNameResolved = data.supplierName || Array.from(suppliersSet).join(', ');
  const productLinkResolved = data.productLink || supplierLinksList.join('\n🔗 *Product Link:* ');

  let supplierInfoBlock = data.supplierInfo || '';
  if (!supplierInfoBlock && (supplierNameResolved || productLinkResolved)) {
    const parts: string[] = [];
    if (supplierNameResolved) parts.push(`🏢 *Supplier:* ${supplierNameResolved}`);
    if (productLinkResolved) parts.push(`🔗 *Product Link:* ${productLinkResolved}`);
    supplierInfoBlock = parts.join('\n');
  }

  let itemsFormatted = data.itemsList;
  if (!itemsFormatted && order?.items) {
    itemsFormatted = formatWhatsAppItemsList(order.items, data.isAdmin ?? false);
  }

  let formatted = templateText
    .replace(/\{\{siteName\}\}/g, siteName)
    .replace(/\{\{helpline\}\}/g, helpline)
    .replace(/\{\{customerName\}\}/g, customerName)
    .replace(/\{\{customerMobile\}\}/g, resolvedPhone)
    .replace(/\{\{phone\}\}/g, resolvedPhone)
    .replace(/\{\{email\}\}/g, resolvedEmail)
    .replace(/\{\{customerEmail\}\}/g, resolvedEmail)
    .replace(/\{\{orderId\}\}/g, orderId)
    .replace(/\{\{totalAmount\}\}/g, totalAmount.toLocaleString('en-BD'))
    .replace(/\{\{paidAmount\}\}/g, (paidAmount || 0).toLocaleString('en-BD'))
    .replace(/\{\{dueAmount\}\}/g, (dueAmount || 0).toLocaleString('en-BD'))
    .replace(/\{\{costPrice\}\}/g, finalCostPrice > 0 ? finalCostPrice.toLocaleString('en-BD') : '0')
    .replace(/\{\{totalCostPrice\}\}/g, finalCostPrice > 0 ? finalCostPrice.toLocaleString('en-BD') : '0')
    .replace(/\{\{paymentMethod\}\}/g, paymentMethod)
    .replace(/\{\{fullAddress\}\}/g, fullAddress)
    .replace(/\{\{streetAddress\}\}/g, streetAddress)
    .replace(/\{\{district\}\}/g, district)
    .replace(/\{\{division\}\}/g, division)
    .replace(/\{\{upazila\}\}/g, upazila)
    .replace(/\{\{thana\}\}/g, upazila)
    .replace(/\{\{area\}\}/g, area)
    .replace(/\{\{courierName\}\}/g, courierName)
    .replace(/\{\{trackingNumber\}\}/g, trackingNumber)
    .replace(/\{\{trackingUrl\}\}/g, trackingUrl)
    .replace(/\{\{itemsList\}\}/g, itemsFormatted || '1x Item')
    .replace(/\{\{supplierInfo\}\}/g, supplierInfoBlock)
    .replace(/\{\{supplierName\}\}/g, supplierNameResolved)
    .replace(/\{\{productLink\}\}/g, productLinkResolved)
    .replace(/\{\{staffName\}\}/g, staffName)
    .replace(/\{\{staffRole\}\}/g, staffRole)
    .replace(/\{\{staffId\}\}/g, staffId)
    .replace(/\{\{oldStatus\}\}/g, formattedOld)
    .replace(/\{\{newStatus\}\}/g, formattedNew)
    .replace(/\{\{statusUpdate\}\}/g, statusUpdateStr)
    .replace(/\{\{statusTransition\}\}/g, statusUpdateStr)
    .replace(/\{\{timestamp\}\}/g, timestamp);

  return formatted.replace(/\n{3,}/g, '\n\n').trim();
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

/**
 * Accurately compares two phone numbers across any format (local, international, with/without country code, spaces)
 */
export function isPhoneMatch(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const n1 = normalizePhoneNumber(p1);
  const n2 = normalizePhoneNumber(p2);
  if (n1 && n2 && n1 === n2) return true;
  const d1 = (p1 || '').replace(/[^0-9]/g, '');
  const d2 = (p2 || '').replace(/[^0-9]/g, '');
  if (d1.length >= 10 && d2.length >= 10) {
    return d1.slice(-10) === d2.slice(-10);
  }
  return false;
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
 * Custom Names DB & Cache Functions
 */
export async function getWhatsAppCustomNamesFromDB(): Promise<Record<string, string>> {
  try {
    const cached = localStorage.getItem('kenax_whatsapp_custom_names');
    const localMap: Record<string, string> = cached ? JSON.parse(cached) : {};
    // Ensure KenaX BD default custom name for official business number 01719143897
    if (!localMap['8801719143897']) localMap['8801719143897'] = 'KenaX BD';
    if (!localMap['01719143897']) localMap['01719143897'] = 'KenaX BD';

    if (db && !isQuotaExceededFlag) {
      const snap = await getDoc(doc(db, 'whatsapp_metadata', 'custom_names'));
      if (snap.exists()) {
        const firestoreMap = snap.data() as Record<string, string>;
        const merged = { ...localMap, ...firestoreMap };
        if (!merged['8801719143897']) merged['8801719143897'] = 'KenaX BD';
        if (!merged['01719143897']) merged['01719143897'] = 'KenaX BD';
        try {
          localStorage.setItem('kenax_whatsapp_custom_names', JSON.stringify(merged));
        } catch {}
        return merged;
      }
    }
    return localMap;
  } catch {
    return { '8801719143897': 'KenaX BD', '01719143897': 'KenaX BD' };
  }
}

export async function saveWhatsAppCustomNameInDB(phone: string, customName: string): Promise<Record<string, string>> {
  if (!phone) return {};
  const normKey = normalizePhoneNumber(phone);
  try {
    const current = await getWhatsAppCustomNamesFromDB();
    if (customName.trim()) {
      current[normKey] = customName.trim();
    } else {
      delete current[normKey];
    }
    try {
      localStorage.setItem('kenax_whatsapp_custom_names', JSON.stringify(current));
    } catch {}
    if (db && !isQuotaExceededFlag) {
      await setDoc(doc(db, 'whatsapp_metadata', 'custom_names'), current, { merge: true });
    }
    return current;
  } catch (err) {
    console.warn('Failed to save WhatsApp custom name:', err);
    return {};
  }
}

export function subscribeToWhatsAppCustomNames(callback: (names: Record<string, string>) => void): () => void {
  let isSubscribed = true;
  getWhatsAppCustomNamesFromDB().then((names) => {
    if (isSubscribed) callback(names);
  });

  if (db && !isQuotaExceededFlag) {
    try {
      return onSnapshot(doc(db, 'whatsapp_metadata', 'custom_names'), (snapshot) => {
        if (!isSubscribed) return;
        if (snapshot.exists()) {
          const names = snapshot.data() as Record<string, string>;
          try {
            localStorage.setItem('kenax_whatsapp_custom_names', JSON.stringify(names));
          } catch {}
          callback(names);
        }
      });
    } catch {}
  }

  return () => {
    isSubscribed = false;
  };
}

/**
 * Pinned Chats DB & Cache Functions
 * Single authoritative source is Firestore with server API and localStorage cache
 */
export async function getWhatsAppPinnedChatsFromDB(): Promise<string[]> {
  try {
    if (db && !isQuotaExceededFlag) {
      const snap = await getDoc(doc(db, 'whatsapp_metadata', 'pinned_chats'));
      if (snap.exists()) {
        const data = snap.data();
        const firestoreList: string[] = Array.isArray(data?.list)
          ? data.list.map((p: string) => normalizePhoneNumber(p))
          : [];
        try {
          localStorage.setItem('kenax_whatsapp_pinned_chats', JSON.stringify(firestoreList));
        } catch {}
        return firestoreList;
      }
    }

    // Try server API fallback
    const res = await fetch('/api/whatsapp/pinned');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.pinned)) {
        const list = data.pinned.map((p: string) => normalizePhoneNumber(p));
        try {
          localStorage.setItem('kenax_whatsapp_pinned_chats', JSON.stringify(list));
        } catch {}
        return list;
      }
    }

    const cached = localStorage.getItem('kenax_whatsapp_pinned_chats');
    return cached ? JSON.parse(cached).map((p: string) => normalizePhoneNumber(p)) : [];
  } catch {
    const cached = localStorage.getItem('kenax_whatsapp_pinned_chats');
    return cached ? JSON.parse(cached).map((p: string) => normalizePhoneNumber(p)) : [];
  }
}

export async function toggleWhatsAppPinnedChatInDB(phone: string): Promise<string[]> {
  if (!phone) return [];
  const normKey = normalizePhoneNumber(phone);
  try {
    const currentList = await getWhatsAppPinnedChatsFromDB();
    let newList: string[];
    if (currentList.includes(normKey)) {
      newList = currentList.filter((p) => p !== normKey);
    } else {
      newList = [normKey, ...currentList.filter((p) => p !== normKey)];
    }

    // Immediately cache locally
    try {
      localStorage.setItem('kenax_whatsapp_pinned_chats', JSON.stringify(newList));
    } catch {}

    // Persist to Firestore
    if (db && !isQuotaExceededFlag) {
      await setDoc(
        doc(db, 'whatsapp_metadata', 'pinned_chats'),
        {
          list: newList,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // Persist to server API
    fetch('/api/whatsapp/pinned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normKey }),
    }).catch(() => {});

    return newList;
  } catch (err) {
    console.warn('Failed to toggle pinned chat:', err);
    return [];
  }
}

export function subscribeToWhatsAppPinnedChats(callback: (pinnedList: string[]) => void): () => void {
  let isSubscribed = true;
  getWhatsAppPinnedChatsFromDB().then((list) => {
    if (isSubscribed) callback(list);
  });

  let unsubFirestore: (() => void) | null = null;
  if (db && !isQuotaExceededFlag) {
    try {
      unsubFirestore = onSnapshot(doc(db, 'whatsapp_metadata', 'pinned_chats'), (snapshot) => {
        if (!isSubscribed) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          const list: string[] = Array.isArray(data?.list)
            ? data.list.map((p: string) => normalizePhoneNumber(p))
            : [];
          try {
            localStorage.setItem('kenax_whatsapp_pinned_chats', JSON.stringify(list));
          } catch {}
          callback(list);
        }
      });
    } catch {}
  }

  return () => {
    isSubscribed = false;
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}

// Global in-memory cache and subscriber registry for WhatsApp messages across components
const activeSubscribers = new Set<(messages: WhatsAppMessageRecord[], webhooks?: any[], configStatus?: any) => void>();
let inMemoryWhatsAppMessages = new Map<string, WhatsAppMessageRecord>();
let lastWebhooks: any[] = [];
let lastConfigStatus: any = null;
let isInMemoryLoadedFromCache = false;

function initInMemoryFromCache() {
  if (isInMemoryLoadedFromCache) return;
  isInMemoryLoadedFromCache = true;
  try {
    const cached = localStorage.getItem('kenax_whatsapp_messages_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        parsed.forEach((m) => {
          if (m && m.id) {
            inMemoryWhatsAppMessages.set(m.id, m);
          }
        });
      }
    }
  } catch {}
}

export function broadcastWhatsAppMessages(webhooks?: any[], configStatus?: any) {
  if (webhooks !== undefined) lastWebhooks = webhooks;
  if (configStatus !== undefined) lastConfigStatus = configStatus;

  const allMsgs = Array.from(inMemoryWhatsAppMessages.values()).sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
  );

  try {
    localStorage.setItem('kenax_whatsapp_messages_cache', JSON.stringify(allMsgs.slice(0, 1000)));
  } catch {}

  activeSubscribers.forEach((cb) => {
    try {
      cb(allMsgs, lastWebhooks, lastConfigStatus);
    } catch {}
  });
}

function mergeIntoInMemoryMessages(incomingList: WhatsAppMessageRecord[]): boolean {
  let changed = false;
  incomingList.forEach((incoming) => {
    if (!incoming || !incoming.id) return;
    const existing = inMemoryWhatsAppMessages.get(incoming.id);
    if (!existing) {
      inMemoryWhatsAppMessages.set(incoming.id, incoming);
      changed = true;
    } else {
      // PREVENT RACE CONDITIONS: Never downgrade a confirmed 'read' status back to 'received'!
      const isExistingRead = existing.status === 'read';
      const isIncomingRead = incoming.status === 'read';

      let resolvedStatus = existing.status;
      if (isExistingRead && !isIncomingRead) {
        // Only allow switching to 'received' if incoming explicitly has a newer updatedAt timestamp
        if (
          incoming.status === 'received' &&
          incoming.updatedAt &&
          existing.updatedAt &&
          new Date(incoming.updatedAt).getTime() > new Date(existing.updatedAt).getTime()
        ) {
          resolvedStatus = 'received';
        } else {
          resolvedStatus = 'read';
        }
      } else if (!isExistingRead && isIncomingRead) {
        resolvedStatus = 'read';
      } else {
        resolvedStatus = incoming.status || existing.status;
      }

      const merged: WhatsAppMessageRecord = {
        ...existing,
        ...incoming,
        status: resolvedStatus,
        readAt: existing.readAt || incoming.readAt,
        readBy: existing.readBy || incoming.readBy,
        updatedAt: [existing.updatedAt, incoming.updatedAt].filter(Boolean).sort().reverse()[0],
      };

      if (
        existing.status !== merged.status ||
        existing.readAt !== merged.readAt ||
        existing.text !== merged.text
      ) {
        changed = true;
      }
      inMemoryWhatsAppMessages.set(incoming.id, merged);
    }
  });
  return changed;
}

/**
 * Mark all incoming unread messages for a customer phone as read
 */
export async function markConversationAsRead(phone: string, staffMember?: string): Promise<void> {
  if (!phone) return;
  initInMemoryFromCache();
  const nowISO = new Date().toISOString();
  let changed = false;

  // 1. Instantly update in-memory state and notify all UI subscribers with 0ms delay!
  inMemoryWhatsAppMessages.forEach((m, id) => {
    if (
      m.direction === 'incoming' &&
      m.status !== 'read' &&
      (isPhoneMatch(m.from, phone) || isPhoneMatch(m.to, phone))
    ) {
      m.status = 'read';
      m.readAt = nowISO;
      m.readBy = staffMember || 'Admin';
      m.updatedAt = nowISO;
      inMemoryWhatsAppMessages.set(id, { ...m });
      changed = true;
    }
  });

  if (changed) {
    broadcastWhatsAppMessages();
  }

  // 2. Call backend server API
  fetch('/api/whatsapp/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, staffMember }),
  }).catch(() => {});

  // 3. Update in Firestore directly for real-time sync across connected clients
  if (db && !isQuotaExceededFlag) {
    try {
      const snap = await getDocs(collection(db, 'whatsapp_messages'));
      const updatePromises: Promise<any>[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          data.direction === 'incoming' &&
          data.status !== 'read' &&
          (isPhoneMatch(data.from, phone) || isPhoneMatch(data.to, phone))
        ) {
          updatePromises.push(
            setDoc(
              doc(db, 'whatsapp_messages', docSnap.id),
              {
                status: 'read',
                readAt: nowISO,
                readBy: staffMember || 'Admin',
                updatedAt: nowISO,
              },
              { merge: true }
            )
          );
        }
      });
      await Promise.allSettled(updatePromises);
    } catch {}
  }
}

/**
 * Marks ALL unread incoming messages across all customer conversations as read
 */
export async function markAllConversationsAsRead(staffMember?: string): Promise<void> {
  initInMemoryFromCache();
  const nowISO = new Date().toISOString();
  let changed = false;

  inMemoryWhatsAppMessages.forEach((m, id) => {
    if (m.direction === 'incoming' && m.status !== 'read') {
      m.status = 'read';
      m.readAt = nowISO;
      m.readBy = staffMember || 'Admin';
      m.updatedAt = nowISO;
      inMemoryWhatsAppMessages.set(id, { ...m });
      changed = true;
    }
  });

  if (changed) {
    broadcastWhatsAppMessages();
  }

  fetch('/api/whatsapp/read-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffMember }),
  }).catch(() => {});

  if (db && !isQuotaExceededFlag) {
    try {
      const snap = await getDocs(collection(db, 'whatsapp_messages'));
      const updatePromises: Promise<any>[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.direction === 'incoming' && data.status !== 'read') {
          updatePromises.push(
            setDoc(
              doc(db, 'whatsapp_messages', docSnap.id),
              {
                status: 'read',
                readAt: nowISO,
                readBy: staffMember || 'Admin',
                updatedAt: nowISO,
              },
              { merge: true }
            )
          );
        }
      });
      await Promise.allSettled(updatePromises);
    } catch {}
  }
}

/**
 * Mark a customer conversation as unread (sets newest incoming message to 'received')
 */
export async function markConversationAsUnread(phone: string): Promise<void> {
  if (!phone) return;
  initInMemoryFromCache();
  const nowISO = new Date().toISOString();

  // 1. Find newest incoming message in memory
  const incoming = Array.from(inMemoryWhatsAppMessages.values()).filter(
    (m) =>
      m.direction === 'incoming' &&
      (isPhoneMatch(m.from, phone) || isPhoneMatch(m.to, phone))
  );

  let newestId: string | null = null;
  if (incoming.length > 0) {
    incoming.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    incoming[0].status = 'received';
    incoming[0].updatedAt = nowISO;
    newestId = incoming[0].id;
    inMemoryWhatsAppMessages.set(newestId, { ...incoming[0] });
    broadcastWhatsAppMessages();
  }

  // 2. Call backend server API
  fetch('/api/whatsapp/unread', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  }).catch(() => {});

  // 3. Update Firestore
  if (db && !isQuotaExceededFlag && newestId) {
    try {
      const snap = await getDocs(collection(db, 'whatsapp_messages'));
      let newestDocId: string | null = null;
      let newestTime = 0;
      snap.forEach((d) => {
        const data = d.data();
        if (
          data.direction === 'incoming' &&
          (isPhoneMatch(data.from, phone) || isPhoneMatch(data.to, phone))
        ) {
          const t = new Date(data.timestamp || 0).getTime();
          if (t > newestTime) {
            newestTime = t;
            newestDocId = d.id;
          }
        }
      });
      if (newestDocId) {
        await setDoc(
          doc(db, 'whatsapp_messages', newestDocId),
          {
            status: 'received',
            updatedAt: nowISO,
          },
          { merge: true }
        ).catch(() => {});
      }
    } catch {}
  }
}

/**
 * Groups a flat list of WhatsApp message records into threaded customer conversations.
 */
export function groupMessagesIntoConversations(
  messages: WhatsAppMessageRecord[],
  customNamesMap?: Record<string, string>,
  pinnedList?: string[]
): WhatsAppConversation[] {
  const conversationMap = new Map<string, WhatsAppConversation>();
  const pinnedSet = new Set((pinnedList || []).map((p) => normalizePhoneNumber(p)));

  // Process messages sorted chronologically
  const sorted = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const msg of sorted) {
    // Determine customer phone number (if incoming -> 'from', if outgoing -> 'to')
    const customerPhone = msg.direction === 'incoming' ? msg.from : msg.to || msg.from;
    if (!customerPhone) continue;

    const normalizedKey = normalizePhoneNumber(customerPhone);
    const isStoreOfficialNumber = isPhoneMatch(customerPhone, '01719143897');
    let conv = conversationMap.get(normalizedKey);

    if (!conv) {
      let customName = customNamesMap ? customNamesMap[normalizedKey] : undefined;
      if (!customName && isStoreOfficialNumber) {
        customName = 'KenaX BD';
      }
      conv = {
        phoneNumber: customerPhone,
        customerName: customName || msg.senderName || (isStoreOfficialNumber ? 'KenaX BD' : undefined),
        isPinned: pinnedSet.has(normalizedKey) || isStoreOfficialNumber,
        unreadCount: 0,
        totalMessages: 0,
        is24hWindowActive: false,
        messages: [],
      };
      conversationMap.set(normalizedKey, conv);
    }

    if (isStoreOfficialNumber) {
      conv.customerName = 'KenaX BD';
      conv.isPinned = true;
    } else if (customNamesMap && customNamesMap[normalizedKey]) {
      conv.customerName = customNamesMap[normalizedKey];
    } else if (msg.senderName && !conv.customerName) {
      conv.customerName = msg.senderName;
    }

    // Keep pinning in sync with updated pinnedSet
    conv.isPinned = pinnedSet.has(normalizedKey) || isStoreOfficialNumber;

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

  // Sort conversations: Pinned chats FIRST, then latest message timestamp descending
  return result.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
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
  text?: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'document' | 'template';
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'voice' | 'document';
  mediaCaption?: string;
  filename?: string;
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
        type: params.type || (params.mediaUrl ? (params.mediaType || 'image') : 'text'),
        text: params.text || '',
        mediaUrl: params.mediaUrl,
        mediaType: params.mediaType,
        mediaCaption: params.mediaCaption,
        filename: params.filename,
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
  initInMemoryFromCache();
  activeSubscribers.add(callback);

  // Send current in-memory messages immediately to the newly mounted component
  const initialMsgs = Array.from(inMemoryWhatsAppMessages.values()).sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
  );
  callback(initialMsgs, lastWebhooks, lastConfigStatus);

  let isSubscribed = true;

  // Initial HTTP fetch
  const fetchMessagesHttp = async () => {
    try {
      const res = await fetch('/api/whatsapp/messages');
      if (res.ok && isSubscribed) {
        const data = await res.json();
        const serverMsgs: WhatsAppMessageRecord[] = data.messages || [];
        const changed = mergeIntoInMemoryMessages(serverMsgs);
        if (changed || data.webhooks?.length || data.configStatus) {
          broadcastWhatsAppMessages(data.webhooks || [], data.configStatus || null);
        }
      }
    } catch (err) {
      console.warn('HTTP fetch WhatsApp messages error:', err);
    }
  };

  fetchMessagesHttp();

  // Firestore Realtime Subscription (fetches all stored messages so history is never lost)
  let firestoreUnsub: (() => void) | null = null;
  if (db && !isQuotaExceededFlag) {
    try {
      const messagesRef = collection(db, 'whatsapp_messages');
      firestoreUnsub = onSnapshot(
        messagesRef,
        (snapshot) => {
          if (!isSubscribed) return;
          const incomingDocs: WhatsAppMessageRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as WhatsAppMessageRecord;
            if (data && data.id && (data.text || data.from || data.to)) {
              incomingDocs.push(data);
            }
          });
          const changed = mergeIntoInMemoryMessages(incomingDocs);
          if (changed) {
            broadcastWhatsAppMessages();
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
    activeSubscribers.delete(callback);
    clearInterval(pollInterval);
    if (firestoreUnsub) {
      firestoreUnsub();
    }
  };
}

/**
 * Automatically triggers WhatsApp template messages for system events:
 * - User Account Registration
 * - New Order Placed (Sends to Customer & Pinned Admin)
 * - Order Status Transitions (Pending -> Confirmed, Shipped, Delivered, etc. with Staff details)
 * - Staff Payment Number Updates (Security Alert to Pinned Admin)
 */
export async function triggerWhatsAppEvent(params: {
  event: WhatsAppEventType | 'order_status_changed';
  customerPhone?: string;
  order?: Order | any;
  user?: { name: string; email: string; phone: string; id: string };
  staff?: { name?: string; role?: string; id?: string };
  statusChange?: { oldStatus: string; newStatus: string };
  paymentUpdate?: { gateway: string; newNumber: string; instructions?: string };
  customVariables?: Record<string, string>;
}): Promise<{ success: boolean; sentCount: number; errors?: string[] }> {
  try {
    const settings = await getWhatsAppSettingsFromDB();
    if (!settings.enabled) {
      return { success: false, sentCount: 0, errors: ['WhatsApp Automation Disabled'] };
    }

    const errors: string[] = [];
    let sentCount = 0;

    // Helper to replace template variables
    const renderTemplate = (templateStr: string, vars: Record<string, string>): string => {
      let result = templateStr;
      Object.entries(vars).forEach(([key, val]) => {
        const pattern = new RegExp(key.replace(/[{()}]/g, '\\$&'), 'g');
        result = result.replace(pattern, val || '');
      });
      return result;
    };

    // Shared default variable values
    const siteName = settings.senderName || 'KenaX BD Official';
    const helpline = settings.businessNumber || '01800000000';
    const nowFormatted = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // 1. Determine Pinned Admin Number (must not be the sender's own number 01719143897, which fails Meta delivery)
    let pinnedAdminNumber = settings.pinnedAdminNumber?.trim();
    if (!pinnedAdminNumber || isPhoneMatch(pinnedAdminNumber, '01719143897')) {
      const pinnedList = await getWhatsAppPinnedChatsFromDB();
      const nonStorePinned = pinnedList.find((p) => !isPhoneMatch(p, '01719143897'));
      if (nonStorePinned) {
        pinnedAdminNumber = nonStorePinned;
      } else {
        pinnedAdminNumber = '01887713212';
      }
    }

    const resolvedPhone = resolveCustomerPhone(params.order, params.user, params.customerPhone);
    const resolvedEmail = resolveCustomerEmail(params.order, params.user);
    const addr = resolveAddressDetails(params.order);

    // Calculate order cost and supplier details if available
    let totalCostPrice = 0;
    const suppliersSet = new Set<string>();
    const supplierLinksList: string[] = [];

    if (Array.isArray(params.order?.items)) {
      params.order.items.forEach((item: any) => {
        const prod = findProductDetails(item.productId);
        const itemCost = Number(item.costPrice ?? prod?.costPrice ?? 0);
        const itemQty = Number(item.quantity || 1);
        totalCostPrice += itemCost * itemQty;

        const suppName = (item.supplierName || prod?.supplierName || '').trim();
        const suppUrl = (item.supplierUrl || prod?.supplierUrl || '').trim();
        if (suppName) suppliersSet.add(suppName);
        if (suppUrl && !supplierLinksList.includes(suppUrl)) supplierLinksList.push(suppUrl);
      });
    }

    const supplierNameResolved = Array.from(suppliersSet).join(', ');
    const productLinkResolved = supplierLinksList.join('\n🔗 *Product Link:* ');

    let supplierInfoBlock = '';
    if (supplierNameResolved || productLinkResolved) {
      const parts: string[] = [];
      if (supplierNameResolved) parts.push(`🏢 *Supplier:* ${supplierNameResolved}`);
      if (productLinkResolved) parts.push(`🔗 *Product Link:* ${productLinkResolved}`);
      supplierInfoBlock = parts.join('\n');
    }

    const adminItemsFormatted = params.order?.items
      ? formatWhatsAppItemsList(params.order.items, true)
      : '1x Item';

    const customerItemsFormatted = params.order?.items
      ? formatWhatsAppItemsList(params.order.items, false)
      : '1x Item';

    // Prepare variables map based on params
    const vars: Record<string, string> = {
      '{{siteName}}': siteName,
      '{{helpline}}': helpline,
      '{{timestamp}}': nowFormatted,
      '{{phone}}': resolvedPhone,
      '{{customerMobile}}': resolvedPhone,
      '{{customerPhone}}': resolvedPhone,
      '{{email}}': resolvedEmail,
      '{{customerEmail}}': resolvedEmail,
      '{{fullAddress}}': addr.fullAddress,
      '{{streetAddress}}': addr.streetAddress,
      '{{upazila}}': addr.upazila,
      '{{thana}}': addr.upazila,
      '{{district}}': addr.district,
      '{{division}}': addr.division,
      '{{area}}': addr.area,
      '{{costPrice}}': totalCostPrice > 0 ? totalCostPrice.toLocaleString('en-BD') : '0',
      '{{totalCostPrice}}': totalCostPrice > 0 ? totalCostPrice.toLocaleString('en-BD') : '0',
      '{{supplierInfo}}': supplierInfoBlock,
      '{{supplierName}}': supplierNameResolved,
      '{{productLink}}': productLinkResolved,
      '{{itemsList}}': customerItemsFormatted,
      ...(params.customVariables || {}),
    };

    if (params.user) {
      vars['{{customerName}}'] = params.user.name || 'Valued Customer';
      vars['{{userId}}'] = params.user.id || '';
    }

    const staffName =
      params.staff?.name ||
      params.order?.handledByStaffName ||
      'Admin Staff';
    const staffRole =
      params.staff?.role ||
      params.order?.handledByStaffRole ||
      'Super Admin';
    const staffId =
      params.staff?.id ||
      params.order?.handledByStaffId ||
      '';

    vars['{{staffName}}'] = staffName;
    vars['{{staffRole}}'] = staffRole;
    vars['{{staffId}}'] = staffId;

    const rawOld = params.statusChange?.oldStatus || params.order?.orderStatus || 'Pending';
    const rawNew = params.statusChange?.newStatus || params.order?.orderStatus || 'Confirmed';
    const formattedOld = formatOrderStatusName(rawOld);
    const formattedNew = formatOrderStatusName(rawNew);
    const statusTransitionStr = `${formattedOld} ➡️ ${formattedNew}`;

    vars['{{oldStatus}}'] = formattedOld;
    vars['{{newStatus}}'] = formattedNew;
    vars['{{statusTransition}}'] = statusTransitionStr;
    vars['{{statusUpdate}}'] = statusTransitionStr;

    if (params.paymentUpdate) {
      vars['{{paymentMethod}}'] = params.paymentUpdate.gateway || 'bKash / Nagad';
      vars['{{newNumber}}'] = params.paymentUpdate.newNumber || '';
      vars['{{instructions}}'] = params.paymentUpdate.instructions || 'Standard Payment Gateway Number Update';
    }

    if (params.order) {
      const o = params.order;
      const orderIdVal = o.id || o.orderId || '';
      const isCompleted = o.orderStatus === 'Completed' || params.statusChange?.newStatus === 'Completed';
      const isPaid = o.paymentStatus === 'Paid' || isCompleted;
      const totalNum = o.totalAmount || o.total || 0;
      const paidNum = isPaid ? totalNum : (o.paidAmount || 0);
      const dueNum = isPaid ? 0 : Math.max(0, totalNum - paidNum);

      vars['{{orderId}}'] = orderIdVal;
      vars['{{customerName}}'] = o.customerName || vars['{{customerName}}'] || 'Valued Customer';
      vars['{{totalAmount}}'] = String(totalNum);
      vars['{{paidAmount}}'] = String(paidNum);
      vars['{{dueAmount}}'] = isPaid ? '0 (পেইড / Fully Paid)' : String(dueNum);
      vars['{{paymentMethod}}'] = String(o.paymentMethod || 'Cash on Delivery').toUpperCase();
      vars['{{courierName}}'] = o.courierName || 'Steadfast Courier';
      vars['{{trackingNumber}}'] = o.trackingId || o.trackingNumber || 'N/A';
      vars['{{trackingUrl}}'] = o.trackingUrl || `https://steadfast.com.bd/t/${o.trackingId || ''}`;
      vars['{{cancelReason}}'] = o.cancelReason || 'Customer or Stock constraint';
      vars['{{telegramBotUrl}}'] = orderIdVal
        ? `https://t.me/KenaX_Official_Bot?start=order_${orderIdVal}`
        : 'https://t.me/KenaX_Official_Bot';
    } else {
      vars['{{telegramBotUrl}}'] = 'https://t.me/KenaX_Official_Bot';
    }

    // Helper to send to a specific recipient phone
    const sendToPhone = async (phoneToUse: string, eventType: WhatsAppEventType) => {
      if (!phoneToUse) return;
      const template = settings.templates?.[eventType] || DEFAULT_WHATSAPP_TEMPLATES[eventType];
      if (!template || template.enabled === false || !template.message) return;

      // Meta Cloud API strictly forbids sending to own sender number (+8801719143897), which triggers Error 131026
      if (isPhoneMatch(phoneToUse, '01719143897')) {
        console.info(`[WhatsApp Service] Skipping Meta Cloud API dispatch to own business number (${phoneToUse}). Recorded internally.`);
        sentCount++;
        return;
      }

      const eventVars = {
        ...vars,
        '{{itemsList}}': (eventType === 'admin_pinned_order_alert' || eventType === 'admin_pinned_status_alert')
          ? adminItemsFormatted
          : customerItemsFormatted,
      };

      const messageText = renderTemplate(template.message, eventVars);
      const res = await sendWhatsAppReply({
        to: phoneToUse,
        text: messageText,
        orderId: params.order?.id,
        staffMember: staffName,
        staffRole: staffRole,
      });

      if (res.success) {
        sentCount++;
      } else if (res.error) {
        errors.push(`Failed sending ${eventType} to ${phoneToUse}: ${res.error}`);
      }
    };

    // DISPATCH LOGIC BASED ON EVENT TYPE
    const customerPhone = resolvedPhone || params.customerPhone || params.order?.customerPhone || params.user?.phone;

    if (params.event === 'user_registered') {
      if (customerPhone && settings.autoSendOnRegistration !== false) {
        await sendToPhone(customerPhone, 'user_registered');
      }
      if (pinnedAdminNumber) {
        await sendToPhone(pinnedAdminNumber, 'admin_pinned_registration_alert');
      }
    } else if (params.event === 'order_placed') {
      // 1) Send confirmation to Customer
      if (customerPhone && settings.autoSendOnNewOrder) {
        await sendToPhone(customerPhone, 'order_placed');
      }
      // 2) Send alert to Pinned Admin
      if (pinnedAdminNumber && settings.autoSendToPinnedAdmin !== false) {
        await sendToPhone(pinnedAdminNumber, 'admin_pinned_order_alert');
      }
    } else if (params.event === 'order_status_changed' || params.event === 'order_confirmed' || params.event === 'order_shipped' || params.event === 'out_for_delivery' || params.event === 'order_delivered' || params.event === 'order_cancelled' || (params.event as string) === 'admin_pinned_fake_order_alert') {
      const newStatusLower = (params.statusChange?.newStatus || params.order?.orderStatus || '').toLowerCase();

      // If marked as Fake Order: Send high-priority alert to Pinned Admin with full staff details!
      if (newStatusLower === 'fake order' || newStatusLower === 'fake' || (params.event as string) === 'admin_pinned_fake_order_alert') {
        if (pinnedAdminNumber) {
          await sendToPhone(pinnedAdminNumber, 'admin_pinned_fake_order_alert');
        }
      } else {
        // Map status change to specific customer template
        const targetCustomerEvent: WhatsAppEventType =
          newStatusLower === 'confirmed'
            ? 'order_confirmed'
            : newStatusLower === 'shipped'
            ? 'order_shipped'
            : newStatusLower === 'out_for_delivery' || newStatusLower === 'out for delivery'
            ? 'out_for_delivery'
            : newStatusLower === 'delivered'
            ? 'order_delivered'
            : newStatusLower === 'cancelled'
            ? 'order_cancelled'
            : 'order_confirmed';

        if (customerPhone && settings.autoSendOnStatusChange !== false) {
          await sendToPhone(customerPhone, targetCustomerEvent);
        }

        // Always send status update alert to Pinned Admin with staff details!
        if (pinnedAdminNumber && settings.autoSendToPinnedAdmin !== false) {
          await sendToPhone(pinnedAdminNumber, 'admin_pinned_status_alert');
        }
      }
    } else if (params.event === 'payment_received') {
      // 1) Send payment verification confirmation to Customer
      if (customerPhone && settings.autoSendOnStatusChange !== false) {
        await sendToPhone(customerPhone, 'payment_received');
      }
      // 2) Send payment verification alert to Pinned Admin with staff details!
      if (pinnedAdminNumber && settings.autoSendToPinnedAdmin !== false) {
        await sendToPhone(pinnedAdminNumber, 'admin_pinned_status_alert');
      }
    } else if (params.event === 'payment_number_updated') {
      // Send security alert to Pinned Admin when staff updates payment gateway numbers
      if (pinnedAdminNumber) {
        await sendToPhone(pinnedAdminNumber, 'payment_number_updated');
      }
    } else {
      // Generic dispatch
      if (customerPhone) {
        await sendToPhone(customerPhone, params.event as WhatsAppEventType);
      }
    }

    return { success: sentCount > 0, sentCount, errors };
  } catch (err: any) {
    console.error('Error triggering WhatsApp event:', err);
    return { success: false, sentCount: 0, errors: [err.message || 'Unknown error'] };
  }
}

