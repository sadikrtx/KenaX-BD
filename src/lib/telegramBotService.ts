import {
  Order,
  CustomerRecord,
  StaffUser,
  Product,
  Coupon,
  TelegramBotSettings,
  TelegramTemplate,
  TelegramEventType,
  TelegramLog,
} from '../types/index.ts';
import { db } from './firebase.ts';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';

export const DEFAULT_TELEGRAM_TEMPLATES: Record<TelegramEventType, TelegramTemplate> = {
  admin_new_order: {
    id: 'admin_new_order',
    title: 'New Order Alert (Admin & Staff)',
    banglaTitle: 'নতুন অর্ডার অ্যালার্ট (অ্যাডমিন ও স্টাফদের জন্য)',
    recipientType: 'admin',
    enabled: true,
    message: `🚨 <b>[NEW ORDER ALERT]</b> — <code>#{{orderId}}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🛍️ <b>Store:</b> {{siteName}}
⏰ <b>Time:</b> {{orderTime}}

👤 <b>Customer Information:</b>
• <b>Name:</b> {{customerName}}
• <b>Mobile:</b> <code>{{customerMobile}}</code>
• <b>District:</b> {{district}}
• <b>Address:</b> {{fullAddress}}

📦 <b>Ordered Products:</b>
{{itemsList}}

💵 <b>Payment & Financials:</b>
• <b>Subtotal:</b> ৳{{subtotal}}
• <b>Delivery Fee:</b> ৳{{deliveryCharge}}
• <b>Discount:</b> ৳{{discount}}
• <b>Total Payable:</b> <b>৳{{totalAmount}}</b>
• <b>Payment Method:</b> {{paymentMethod}}
• <b>Advance Paid:</b> ৳{{paidAmount}}
• <b>Due on Delivery:</b> <b>৳{{dueAmount}}</b>

⚡ <b>Order Status:</b> ⏳ <b>PENDING CONFIRMATION</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👉 <i>Please review order in the Admin Dashboard to confirm and dispatch!</i>`,
    variables: [
      '{{orderId}}',
      '{{siteName}}',
      '{{orderTime}}',
      '{{customerName}}',
      '{{customerMobile}}',
      '{{district}}',
      '{{fullAddress}}',
      '{{itemsList}}',
      '{{subtotal}}',
      '{{deliveryCharge}}',
      '{{discount}}',
      '{{totalAmount}}',
      '{{paymentMethod}}',
      '{{paidAmount}}',
      '{{dueAmount}}',
    ],
  },

  admin_user_registered: {
    id: 'admin_user_registered',
    title: 'New Account Registration Alert',
    banglaTitle: 'নতুন অ্যাকাউন্ট রেজিস্ট্রেশন অ্যালার্ট (অ্যাডমিন/মডারেটর)',
    recipientType: 'admin',
    enabled: true,
    message: `🎉 <b>[NEW ACCOUNT REGISTERED]</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
A new customer has just created an account on <b>{{siteName}}</b>!

👤 <b>Customer Details:</b>
• <b>Customer ID:</b> <code>{{customerId}}</code>
• <b>Full Name:</b> <b>{{customerName}}</b>
• <b>Phone Number:</b> <code>{{customerMobile}}</code>
• <b>Email:</b> {{customerEmail}}
• <b>Registered At:</b> {{registeredTime}}

📊 <b>Account Status:</b>
• <b>Role:</b> Verified Customer
• <b>Status:</b> Active
━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 <i>Engage with this customer for exclusive welcome deals & personalized support.</i>`,
    variables: [
      '{{siteName}}',
      '{{customerId}}',
      '{{customerName}}',
      '{{customerMobile}}',
      '{{customerEmail}}',
      '{{registeredTime}}',
    ],
  },

  super_admin_staff_activity: {
    id: 'super_admin_staff_activity',
    title: 'Staff Order Status Activity (Super Admin Only)',
    banglaTitle: 'স্টাফ অ্যাক্টিভিটি নোটিফিকেশন (সুপার অ্যাডমিনের জন্য স্টাফ ইনফোসহ)',
    recipientType: 'super_admin',
    enabled: true,
    message: `🛡️ <b>[STAFF ACTION AUDIT ALERT]</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
An order status was updated by staff member!

👨‍💼 <b>Staff Information:</b>
• <b>Staff Name:</b> <b>{{staffName}}</b>
• <b>Assigned Role:</b> <code>{{staffRole}}</code>
• <b>Email:</b> {{staffEmail}}
• <b>Action Time:</b> {{actionTime}}

🔄 <b>Status Transition:</b>
<b>{{previousStatus}}</b> ➔ <b>{{newStatus}}</b>

📦 <b>Order Details:</b>
• <b>Order ID:</b> <code>#{{orderId}}</code>
• <b>Customer:</b> {{customerName}} (<code>{{customerMobile}}</code>)
• <b>Order Amount:</b> <b>৳{{totalAmount}}</b>
• <b>Courier Partner:</b> {{courierName}}
• <b>Tracking Code:</b> <code>{{trackingNumber}}</code>

📝 <b>Audit Summary:</b>
Staff <b>{{staffName}}</b> ({{staffRole}}) moved order <code>#{{orderId}}</code> from <b>{{previousStatus}}</b> to <b>{{newStatus}}</b>.
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 <i>KenaX BD Admin Audit Trail & Security Guard</i>`,
    variables: [
      '{{staffName}}',
      '{{staffRole}}',
      '{{staffEmail}}',
      '{{actionTime}}',
      '{{previousStatus}}',
      '{{newStatus}}',
      '{{orderId}}',
      '{{customerName}}',
      '{{customerMobile}}',
      '{{totalAmount}}',
      '{{courierName}}',
      '{{trackingNumber}}',
    ],
  },

  customer_order_placed: {
    id: 'customer_order_placed',
    title: 'Customer Order Placed (Pending)',
    banglaTitle: 'কাস্টমার অর্ডার প্লেসড নোটিফিকেশন (পেন্ডিং স্ট্যাটাস)',
    recipientType: 'customer',
    enabled: true,
    message: `🛍️ <b>Order Placed Successfully!</b> — <code>#{{orderId}}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear <b>{{customerName}}</b>,
Thank you for shopping with <b>{{siteName}}</b>! Your order has been placed.

📦 <b>Current Status:</b> ⏳ <b>Pending Confirmation</b>
Our customer care team is verifying your order and will confirm it shortly.

🛒 <b>Items in Your Order:</b>
{{itemsList}}

💰 <b>Total Payable:</b> <b>৳{{totalAmount}}</b>
💳 <b>Payment Method:</b> {{paymentMethod}}
💵 <b>Due on Delivery:</b> <b>৳{{dueAmount}}</b>
📍 <b>Delivery Address:</b> {{fullAddress}}, {{district}}

📞 <b>Need Help? Helpline:</b> {{helpline}}
━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ <i>We will notify you via Telegram the moment your order is confirmed!</i>`,
    variables: [
      '{{orderId}}',
      '{{customerName}}',
      '{{siteName}}',
      '{{itemsList}}',
      '{{totalAmount}}',
      '{{paymentMethod}}',
      '{{dueAmount}}',
      '{{fullAddress}}',
      '{{district}}',
      '{{helpline}}',
    ],
  },

  customer_order_status_update: {
    id: 'customer_order_status_update',
    title: 'Customer Order Status Update',
    banglaTitle: 'কাস্টমার অর্ডার স্ট্যাটাস আপডেট (স্টাফ ইনফো ছাড়া)',
    recipientType: 'customer',
    enabled: true,
    message: `🔔 <b>Order Update: Status Changed!</b> — <code>#{{orderId}}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear <b>{{customerName}}</b>,
Here is the latest update for your order at <b>{{siteName}}</b>:

📊 <b>Current Status:</b> {{statusEmoji}} <b>{{newStatus}}</b>

📦 <b>Order ID:</b> <code>#{{orderId}}</code>
💰 <b>Total Amount:</b> ৳{{totalAmount}}
💵 <b>Due on Delivery:</b> ৳{{dueAmount}}
📍 <b>Delivery Destination:</b> {{fullAddress}}

{{courierSection}}

💬 <b>Status Note:</b>
<i>{{statusMessage}}</i>

📞 <b>Customer Support Hotline:</b> {{helpline}}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for choosing <b>{{siteName}}</b>!`,
    variables: [
      '{{orderId}}',
      '{{customerName}}',
      '{{siteName}}',
      '{{statusEmoji}}',
      '{{newStatus}}',
      '{{totalAmount}}',
      '{{dueAmount}}',
      '{{fullAddress}}',
      '{{courierSection}}',
      '{{statusMessage}}',
      '{{helpline}}',
    ],
  },

  customer_order_delivered: {
    id: 'customer_order_delivered',
    title: 'Customer Order Delivered & Review Request',
    banglaTitle: 'কাস্টমার অর্ডার ডেলিভারড এবং ওয়েবসাইট রিভিউ রিকোয়েস্ট',
    recipientType: 'customer',
    enabled: true,
    message: `🎉 <b>Order Delivered Successfully!</b> — <code>#{{orderId}}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear <b>{{customerName}}</b>,
Your order <code>#{{orderId}}</code> from <b>{{siteName}}</b> has been successfully delivered! 📦

⭐ <b>How was your experience?</b>
We would love to hear your feedback! Please leave an authentic product review on our website:
👉 <b>Website Review Link:</b> <a href="https://kenaxbd.ai.studio">https://kenaxbd.ai.studio</a>

📞 <b>Support Helpline:</b> {{helpline}}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for shopping with <b>{{siteName}}</b>!`,
    variables: [
      '{{orderId}}',
      '{{customerName}}',
      '{{siteName}}',
      '{{helpline}}',
    ],
  },

  channel_new_product: {
    id: 'channel_new_product',
    title: 'New Product Broadcast (Public Channel)',
    banglaTitle: 'টেলিগ্রাম চ্যানেলে নতুন প্রোডাক্ট পোস্ট',
    recipientType: 'customer',
    enabled: true,
    message: `🆕 <b>[NEW ARRIVAL]</b> — <b>{{productName}}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🛍️ <b>Category:</b> {{category}}
🏷️ <b>SKU:</b> <code>{{sku}}</code>

💵 <b>Price:</b> <b>৳{{price}}</b> {{originalPriceSection}}
⚡ <b>Stock Status:</b> In Stock & Ready to Ship

📝 <b>Highlights:</b>
{{productDescription}}

🚚 <i>Cash on Delivery Available Nationwide across Bangladesh!</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👉 <b>Order Now:</b> <a href="{{productLink}}">Click Here to Buy</a>`,
    variables: [
      '{{productName}}',
      '{{category}}',
      '{{sku}}',
      '{{price}}',
      '{{originalPrice}}',
      '{{originalPriceSection}}',
      '{{discountText}}',
      '{{productDescription}}',
      '{{productLink}}',
      '{{siteName}}',
    ],
  },

  super_admin_product_created: {
    id: 'super_admin_product_created',
    title: 'New Product Added Alert (Super Admin Only)',
    banglaTitle: 'নতুন প্রোডাক্ট অ্যাড স্টাফ ইনফো অ্যালার্ট (সুপার অ্যাডমিন)',
    recipientType: 'super_admin',
    enabled: true,
    message: `📦 <b>[STAFF ACTION] New Product Added</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
A new product has been published to the catalog!

👨‍💼 <b>Added By Staff:</b>
• <b>Name:</b> <b>{{staffName}}</b>
• <b>Role:</b> <code>{{staffRole}}</code>
• <b>Email:</b> {{staffEmail}}
• <b>Time:</b> {{actionTime}}

🛍️ <b>Product Information:</b>
• <b>Title:</b> <b>{{productName}}</b>
• <b>SKU:</b> <code>{{sku}}</code>
• <b>Category:</b> {{category}}
• <b>Selling Price:</b> ৳{{price}}
• <b>Stock Available:</b> {{stock}} units
• <b>Supplier:</b> {{supplierName}}

📢 <b>Broadcast Status:</b> {{channelBroadcastStatus}}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 <i>KenaX BD Admin Security & Product Audit Trail</i>`,
    variables: [
      '{{staffName}}',
      '{{staffRole}}',
      '{{staffEmail}}',
      '{{actionTime}}',
      '{{productName}}',
      '{{sku}}',
      '{{category}}',
      '{{price}}',
      '{{stock}}',
      '{{supplierName}}',
      '{{channelBroadcastStatus}}',
    ],
  },

  channel_discount_alert: {
    id: 'channel_discount_alert',
    title: 'Product Discount & Mega Deal Broadcast (Channel)',
    banglaTitle: 'টেলিগ্রাম চ্যানেলে ডিসকাউন্ট ও স্পেশাল অফার পোস্ট',
    recipientType: 'customer',
    enabled: true,
    message: `🔥 <b>[SPECIAL DISCOUNT ALERT]</b> — <b>{{productName}}</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Huge savings offer live right now on <b>{{siteName}}</b>!

💰 <b>Discounted Price:</b> <b>৳{{newPrice}}</b>
<s>Original Price: ৳{{oldPrice}}</s>
🏷️ <b>You Save:</b> <b>৳{{saveAmount}} ({{discountPercent}}% OFF)</b>

📦 <b>Item:</b> {{productName}}
⚡ <i>Limited time promotional offer while stocks last!</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👉 <b>Grab Deal Now:</b> <a href="{{productLink}}">Buy with Discount</a>`,
    variables: [
      '{{productName}}',
      '{{newPrice}}',
      '{{oldPrice}}',
      '{{saveAmount}}',
      '{{discountPercent}}',
      '{{productLink}}',
      '{{siteName}}',
    ],
  },

  channel_coupon_alert: {
    id: 'channel_coupon_alert',
    title: 'New Promo Code / Coupon Broadcast (Channel)',
    banglaTitle: 'টেলিগ্রাম চ্যানেলে নতুন প্রোমো কোড / কুপন পোস্ট',
    recipientType: 'customer',
    enabled: true,
    message: `🎟️ <b>[EXCLUSIVE PROMO CODE]</b> — <code>{{couponCode}}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 Use promo code <b>{{couponCode}}</b> at checkout for special savings!

✨ <b>Discount:</b> <b>{{discountValue}}</b>
🛒 <b>Minimum Order:</b> ৳{{minOrder}}
⏳ <b>Validity:</b> {{validityDate}}

🛍️ <b>How to redeem:</b>
1. Visit <b>{{siteName}}</b>
2. Add your favorite items to cart
3. Enter coupon <code>{{couponCode}}</code> on checkout & enjoy instant discount!
━━━━━━━━━━━━━━━━━━━━━━━━━━
👉 <b>Shop Now:</b> <a href="{{storeLink}}">Visit Storefront</a>`,
    variables: [
      '{{couponCode}}',
      '{{discountValue}}',
      '{{minOrder}}',
      '{{validityDate}}',
      '{{siteName}}',
      '{{storeLink}}',
    ],
  },

  super_admin_discount_coupon_activity: {
    id: 'super_admin_discount_coupon_activity',
    title: 'Discount / Coupon Created Alert (Super Admin Only)',
    banglaTitle: 'কুপন/ডিসকাউন্ট তৈরি অ্যালার্ট (সুপার অ্যাডমিনের জন্য স্টাফ ইনফোসহ)',
    recipientType: 'super_admin',
    enabled: true,
    message: `🏷️ <b>[STAFF ACTION] Discount / Promo Code Created</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
A new discount campaign or coupon code was created!

👨‍💼 <b>Created By Staff:</b>
• <b>Staff Name:</b> <b>{{staffName}}</b>
• <b>Assigned Role:</b> <code>{{staffRole}}</code>
• <b>Email:</b> {{staffEmail}}
• <b>Created At:</b> {{actionTime}}

🎟️ <b>Promotion Details:</b>
• <b>Type:</b> {{promoType}}
• <b>Code / Target:</b> <code>{{promoIdentifier}}</code>
• <b>Discount:</b> <b>{{discountSummary}}</b>
• <b>Min Spend:</b> ৳{{minSpend}}
• <b>Expiry:</b> {{expiryInfo}}

📢 <b>Channel Broadcast:</b> {{channelBroadcastStatus}}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 <i>KenaX BD Financial & Promotion Audit Guard</i>`,
    variables: [
      '{{staffName}}',
      '{{staffRole}}',
      '{{staffEmail}}',
      '{{actionTime}}',
      '{{promoType}}',
      '{{promoIdentifier}}',
      '{{discountSummary}}',
      '{{minSpend}}',
      '{{expiryInfo}}',
      '{{channelBroadcastStatus}}',
    ],
  },

  admin_fake_order_alert: {
    id: 'admin_fake_order_alert',
    title: 'Staff Fake Order Action Alert',
    banglaTitle: 'স্টাফ কর্তৃক ফেক অর্ডার চিহ্নিত অ্যালার্ট (সুপার অ্যাডমিন ও অ্যাডমিন)',
    recipientType: 'super_admin',
    enabled: true,
    message: `🚨 <b>[FAKE ORDER ALERT - STAFF ACTION]</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ <b>স্টাফ কর্তৃক একটি অর্ডারকে 'ফেক অর্ডার' হিসেবে চিহ্নিত করা হয়েছে:</b>

👨‍💼 <b>স্টাফের বিবরণ:</b>
• <b>নাম:</b> <b>{{staffName}}</b>
• <b>পদবী:</b> <code>{{staffRole}}</code>
• <b>স্টাফ আইডি:</b> {{staffId}}

🆔 <b>অর্ডার আইডি:</b> <code>#{{orderId}}</code>
📦 <b>আইটেমসমূহ:</b>
{{itemsList}}

💰 <b>মোট টাকা:</b> <b>৳{{totalAmount}}</b> ({{paymentMethod}})
👤 <b>কাস্টমার:</b> {{customerName}}
📱 <b>মোবাইল:</b> <code>{{customerMobile}}</code>
📍 <b>ঠিকানা:</b> {{fullAddress}}
🕒 <b>অ্যাকশন সময়:</b> {{actionTime}}
📝 <b>স্টাফের নোট/কারণ:</b> <i>{{note}}</i>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 <b>রিয়েল করার অনুমতি:</b> <i>শুধুমাত্র সুপার অ্যাডমিন এই অর্ডারটি আনফেক (রিয়েল) করতে পারবেন।</i>`,
    variables: [
      '{{staffName}}',
      '{{staffRole}}',
      '{{staffId}}',
      '{{orderId}}',
      '{{itemsList}}',
      '{{totalAmount}}',
      '{{paymentMethod}}',
      '{{customerName}}',
      '{{customerMobile}}',
      '{{fullAddress}}',
      '{{actionTime}}',
      '{{note}}',
    ],
  },
};

export const DEFAULT_TELEGRAM_BOT_SETTINGS: TelegramBotSettings = {
  enabled: true,
  botToken: '',
  botUsername: '',
  superAdminChatId: '',
  adminChatIds: [],
  moderatorChatIds: [],
  channelId: '',
  channelUsername: '',
  notifyAdminOnNewOrder: true,
  notifyStaffOnNewOrder: true,
  notifyAdminOnUserRegister: true,
  notifyCustomerOnOrderPlaced: true,
  notifySuperAdminOnStaffActivity: true,
  notifyCustomerOnStatusUpdate: true,
  postNewProductsToChannel: true,
  postDiscountsToChannel: true,
  postCouponsToChannel: true,
  notifySuperAdminOnProductCreated: true,
  notifySuperAdminOnDiscountCreated: true,
  notifySuperAdminOnCouponCreated: true,
  telegramMiniAppEnabled: true,
  telegramMiniAppButtonTitle: '🛍️ Open KenaX Store',
  telegramMiniAppAutoFill: true,
  telegramMiniAppHaptics: true,
  telegramMiniAppThemeSync: true,
  telegramMiniAppTrackOrderButton: true,
  customerNotifyStatuses: {
    confirmed: true,
    processing: true,
    picked: true,
    shipped: true,
    delivered: true,
    cancelled: true,
    refunded: true,
  },
  templates: DEFAULT_TELEGRAM_TEMPLATES,
};

const SETTINGS_DOC_ID = 'telegram_bot_settings';
const LOCAL_STORAGE_KEY = 'kenax_telegram_bot_settings';
const LOCAL_LOGS_KEY = 'kenax_telegram_logs';

/**
 * Synchronously read settings from localStorage to eliminate blank flashes on page load/refresh
 */
export function getTelegramSettingsSync(): TelegramBotSettings {
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      return {
        ...DEFAULT_TELEGRAM_BOT_SETTINGS,
        ...parsed,
        customerNotifyStatuses: {
          ...DEFAULT_TELEGRAM_BOT_SETTINGS.customerNotifyStatuses,
          ...(parsed.customerNotifyStatuses || {}),
        },
        templates: {
          ...DEFAULT_TELEGRAM_TEMPLATES,
          ...(parsed.templates || {}),
        },
      };
    }
  } catch {}
  return DEFAULT_TELEGRAM_BOT_SETTINGS;
}

/**
 * Get Telegram settings from Server API and Firestore, or fallback to localStorage
 */
export async function getTelegramSettingsFromDB(): Promise<TelegramBotSettings> {
  const localSettings = getTelegramSettingsSync();
  let serverSettings: Partial<TelegramBotSettings> | null = null;
  let firestoreSettings: Partial<TelegramBotSettings> | null = null;

  // 1. Fetch from Express Server API with fast timeout (or skip if static netlify)
  if (typeof window !== 'undefined' && !window.location.hostname.includes('netlify.app')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('/api/telegram/settings', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.settings) {
          serverSettings = data.settings;
        }
      }
    } catch (e) {
      // Non-blocking fallback
    }
  }

  // 2. Fetch from Firestore with 3.5s timeout
  try {
    if (db) {
      const fetchFirestore = async () => {
        const snap = await getDoc(doc(db, 'system_settings', SETTINGS_DOC_ID));
        if (snap.exists()) {
          return snap.data() as Partial<TelegramBotSettings>;
        }
        return null;
      };

      firestoreSettings = await Promise.race([
        fetchFirestore(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
      ]);
    }
  } catch (err) {
    console.warn('[Telegram Settings DB Read Fallback]:', err);
  }

  const merged: TelegramBotSettings = {
    ...DEFAULT_TELEGRAM_BOT_SETTINGS,
    ...localSettings,
    ...(firestoreSettings || {}),
    ...(serverSettings || {}),
    customerNotifyStatuses: {
      ...DEFAULT_TELEGRAM_BOT_SETTINGS.customerNotifyStatuses,
      ...(localSettings.customerNotifyStatuses || {}),
      ...(firestoreSettings?.customerNotifyStatuses || {}),
      ...(serverSettings?.customerNotifyStatuses || {}),
    },
    templates: {
      ...DEFAULT_TELEGRAM_TEMPLATES,
      ...(localSettings.templates || {}),
      ...(firestoreSettings?.templates || {}),
      ...(serverSettings?.templates || {}),
    },
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
  } catch {}

  return merged;
}

/**
 * Save Telegram settings to Server API, Firestore, and localStorage
 * Guaranteed to resolve promptly without hanging
 */
export async function saveTelegramSettingsToDB(settings: TelegramBotSettings): Promise<boolean> {
  // 1. Immediate LocalStorage Write
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  } catch {}

  const payload = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  // 2. Server API Write (synchronous disk persistence)
  const serverSavePromise = fetch('/api/telegram/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: payload }),
  }).catch((err) => {
    console.warn('[Telegram Settings Server POST Notice]:', err);
    return null;
  });

  // 3. Firestore Write with 3.5s safety timeout
  const firestoreSavePromise = (async () => {
    if (!db) return true;
    try {
      await setDoc(doc(db, 'system_settings', SETTINGS_DOC_ID), payload, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Telegram Settings Firestore Write Warning]:', err);
      return false;
    }
  })();

  const firestoreWithTimeout = Promise.race([
    firestoreSavePromise,
    new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 3500)),
  ]);

  // Wait for both writes to settle promptly
  try {
    await Promise.allSettled([serverSavePromise, firestoreWithTimeout]);
  } catch {}

  return true;
}

/**
 * Subscribe to Telegram settings in real-time
 */
export function subscribeToTelegramSettings(callback: (settings: TelegramBotSettings) => void): () => void {
  try {
    if (db) {
      const unsub = onSnapshot(doc(db, 'system_settings', SETTINGS_DOC_ID), (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<TelegramBotSettings>;
          const localSettings = getTelegramSettingsSync();
          const merged: TelegramBotSettings = {
            ...DEFAULT_TELEGRAM_BOT_SETTINGS,
            ...localSettings,
            ...data,
            customerNotifyStatuses: {
              ...DEFAULT_TELEGRAM_BOT_SETTINGS.customerNotifyStatuses,
              ...(localSettings.customerNotifyStatuses || {}),
              ...(data.customerNotifyStatuses || {}),
            },
            templates: {
              ...DEFAULT_TELEGRAM_TEMPLATES,
              ...(localSettings.templates || {}),
              ...(data.templates || {}),
            },
          };
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          callback(merged);
        }
      });
      return unsub;
    }
  } catch {}
  return () => {};
}

/**
 * Test Telegram bot connection using Server proxy or direct getMe endpoint
 */
export async function testTelegramBotConnection(token: string): Promise<{
  success: boolean;
  botInfo?: {
    id: number;
    firstName: string;
    username: string;
    canJoinGroups: boolean;
  };
  error?: string;
}> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { success: false, error: 'Bot token cannot be empty.' };
  }

  // 1. Try server-side endpoint first (immune to client-side CORS / adblock / DNS blocks)
  try {
    const sRes = await fetch('/api/telegram/test-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanToken }),
    });
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData && (sData.success || sData.botInfo)) {
        return {
          success: true,
          botInfo: sData.botInfo,
        };
      } else if (sData && sData.error) {
        return {
          success: false,
          error: sData.error,
        };
      }
    }
  } catch (serverErr) {
    // Fallback to direct client fetch
  }

  // 2. Direct client fetch fallback
  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`, {
      method: 'GET',
    });
    const data = await res.json();
    if (data.ok && data.result) {
      return {
        success: true,
        botInfo: {
          id: data.result.id,
          firstName: data.result.first_name,
          username: data.result.username || '',
          canJoinGroups: !!data.result.can_join_groups,
        },
      };
    }
    return {
      success: false,
      error: data.description || 'Telegram API returned error.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network request to Telegram API failed.',
    };
  }
}

/**
 * Send raw Telegram message
 */
export async function sendTelegramMessage(params: {
  botToken: string;
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const token = params.botToken.trim();
  const chatId = params.chatId.trim();

  if (!token) {
    return { success: false, error: 'Telegram Bot Token is not configured.' };
  }
  if (!chatId) {
    return { success: false, error: 'Telegram Chat ID is missing.' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: params.text,
        parse_mode: params.parseMode || 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (data.ok && data.result) {
      return { success: true, messageId: data.result.message_id };
    }
    return {
      success: false,
      error: data.description || 'Failed to dispatch Telegram message.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Telegram network request failed.',
    };
  }
}

/**
 * Send photo to Telegram chat or channel with caption
 */
export async function sendTelegramPhoto(params: {
  botToken: string;
  chatId: string;
  photoUrl: string;
  caption?: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const token = params.botToken.trim();
  const chatId = params.chatId.trim();
  const photo = params.photoUrl?.trim();

  if (!token) {
    return { success: false, error: 'Telegram Bot Token is not configured.' };
  }
  if (!chatId) {
    return { success: false, error: 'Telegram Chat ID / Channel ID is missing.' };
  }

  // If photo is not a valid web URL (e.g. data URL or empty), fallback to text message
  if (!photo || photo.startsWith('data:') || !photo.startsWith('http')) {
    if (params.caption) {
      return sendTelegramMessage({
        botToken: token,
        chatId,
        text: params.caption,
        parseMode: params.parseMode,
      });
    }
    return { success: false, error: 'Invalid photo URL.' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photo,
        caption: params.caption || '',
        parse_mode: params.parseMode || 'HTML',
      }),
    });

    const data = await res.json();
    if (data.ok && data.result) {
      return { success: true, messageId: data.result.message_id };
    }

    // Fallback to text message if photo delivery failed
    if (params.caption) {
      return sendTelegramMessage({
        botToken: token,
        chatId,
        text: params.caption,
        parseMode: params.parseMode,
      });
    }

    return {
      success: false,
      error: data.description || 'Failed to dispatch Telegram photo.',
    };
  } catch (err: any) {
    // Fallback to text message if network error
    if (params.caption) {
      return sendTelegramMessage({
        botToken: token,
        chatId,
        text: params.caption,
        parseMode: params.parseMode,
      });
    }
    return {
      success: false,
      error: err.message || 'Telegram photo request failed.',
    };
  }
}

/**
 * Save Telegram dispatch log
 */
export async function saveTelegramLogToDB(log: Omit<TelegramLog, 'id'>): Promise<void> {
  const fullLog: TelegramLog = {
    ...log,
    id: `TLG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  // 1. LocalStorage
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
    const updated = [fullLog, ...existing].slice(0, 100);
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(updated));
  } catch {}

  // 2. Server API
  fetch('/api/telegram/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ log: fullLog }),
  }).catch(() => {});

  // 3. Firestore
  try {
    if (db) {
      await addDoc(collection(db, 'telegram_logs'), fullLog);
    }
  } catch (err) {
    console.warn('[Telegram Log Firestore Write Warning]:', err);
  }
}

/**
 * Retrieve Telegram logs
 */
export async function getTelegramLogsFromDB(): Promise<TelegramLog[]> {
  // 1. Server API
  try {
    const sRes = await fetch('/api/telegram/logs');
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData && sData.success && Array.isArray(sData.logs) && sData.logs.length > 0) {
        return sData.logs;
      }
    }
  } catch {}

  // 2. Firestore
  try {
    if (db) {
      const q = query(collection(db, 'telegram_logs'), orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as TelegramLog);
      }
    }
  } catch (err) {
    console.warn('[Telegram Logs DB Query Warning]:', err);
  }

  // 3. LocalStorage fallback
  try {
    const local = localStorage.getItem(LOCAL_LOGS_KEY);
    if (local) {
      return JSON.parse(local);
    }
  } catch {}

  return [];
}

/**
 * Format message template with variables
 */
export function formatTelegramMessage(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(key).join(value ?? '');
  }
  return result;
}

/**
 * Status Emojis and readable text for order transitions
 */
export function getStatusInfo(status: string): { emoji: string; title: string; message: string } {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return {
        emoji: '✅',
        title: 'Order Confirmed',
        message: 'Your order has been confirmed by our management! We have queued it for inspection and packaging.',
      };
    case 'processing':
      return {
        emoji: '⚙️',
        title: 'Processing & Quality Check',
        message: 'Your items are being carefully inspected and securely bubble-wrapped for safe transit.',
      };
    case 'picked':
    case 'packaging':
      return {
        emoji: '📦',
        title: 'Packed & Ready to Handover',
        message: 'Your parcel is packed with high-grade security seal and ready for courier pickup.',
      };
    case 'shipped':
      return {
        emoji: '🚚',
        title: 'Shipped / In Transit',
        message: 'Your parcel has been handed over to our verified courier service and is on the way to your city!',
      };
    case 'out_for_delivery':
      return {
        emoji: '🚴‍♂️',
        title: 'Out for Delivery Today',
        message: 'Delivery rider is in your area today! Please keep your contact phone active for delivery verification.',
      };
    case 'delivered':
      return {
        emoji: '🎉',
        title: 'Delivered Successfully',
        message: 'Your parcel has been handed over successfully! Thank you for ordering from KenaX BD.',
      };
    case 'cancelled':
      return {
        emoji: '❌',
        title: 'Order Cancelled',
        message: 'This order has been cancelled. If this was not requested by you, please reach our customer support hotline.',
      };
    case 'refunded':
      return {
        emoji: '💸',
        title: 'Refund Processed',
        message: 'Refund for this order has been processed to your designated account.',
      };
    default:
      return {
        emoji: '⏳',
        title: status.toUpperCase(),
        message: `Order status has been updated to ${status}.`,
      };
  }
}

// -------------------------------------------------------------
// WORKFLOW DISPATCHERS
// -------------------------------------------------------------

/**
 * 1. Trigger New Order Alert:
 *    - Notifies Admin & Staff / Moderator Chat IDs
 *    - Notifies Customer if they have a Telegram Chat ID or Username
 */
export async function triggerTelegramNewOrder(
  order: Order,
  customSettings?: TelegramBotSettings
): Promise<void> {
  try {
    const settings = customSettings || (await getTelegramSettingsFromDB());
    if (!settings.enabled || !settings.botToken) return;

    const itemsSummary = (order.items || [])
      .map(
        (it, idx) =>
          `  ${idx + 1}. <b>${it.productName || it.name || 'Product'}</b> x${it.quantity} — ৳${(it.price * it.quantity).toLocaleString()}`
      )
      .join('\n');

    const vars: Record<string, string> = {
      '{{orderId}}': order.id,
      '{{siteName}}': 'KenaX BD',
      '{{orderTime}}': new Date(order.createdAt || Date.now()).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      '{{customerName}}': order.customerName || 'Customer',
      '{{customerMobile}}': order.customerMobile || order.deliveryMobile || 'N/A',
      '{{district}}': order.district || 'Bangladesh',
      '{{fullAddress}}': order.fullAddress || 'N/A',
      '{{itemsList}}': itemsSummary || 'Standard Order Items',
      '{{subtotal}}': (order.subtotal || 0).toLocaleString(),
      '{{deliveryCharge}}': (order.deliveryCharge || 0).toLocaleString(),
      '{{discount}}': (order.discount || 0).toLocaleString(),
      '{{totalAmount}}': (order.totalAmount || 0).toLocaleString(),
      '{{paymentMethod}}': order.paymentMethod || 'Cash on Delivery',
      '{{paidAmount}}': (order.paidAmount || 0).toLocaleString(),
      '{{dueAmount}}': (order.dueAmount || order.totalAmount || 0).toLocaleString(),
      '{{helpline}}': '+880 1700-123456',
    };

    // 1. Send to Admin, Staff & Super Admin
    if (settings.notifyAdminOnNewOrder) {
      const template = settings.templates.admin_new_order;
      if (template?.enabled) {
        const text = formatTelegramMessage(template.message, vars);

        // Collect all target admin chat IDs
        const targets = new Set<string>();
        if (settings.superAdminChatId) targets.add(settings.superAdminChatId.trim());
        (settings.adminChatIds || []).forEach((c) => c && targets.add(c.trim()));
        (settings.moderatorChatIds || []).forEach((c) => c && targets.add(c.trim()));

        for (const chatId of targets) {
          if (!chatId) continue;
          const result = await sendTelegramMessage({
            botToken: settings.botToken,
            chatId,
            text,
          });

          await saveTelegramLogToDB({
            timestamp: new Date().toISOString(),
            eventType: 'admin_new_order',
            recipientChatId: chatId,
            recipientType: chatId === settings.superAdminChatId ? 'super_admin' : 'admin',
            recipientName: 'Admin / Staff',
            orderId: order.id,
            status: result.success ? 'sent' : 'failed',
            errorMessage: result.error,
            messagePreview: `[New Order Alert] #${order.id} - ৳${order.totalAmount}`,
          });
        }
      }
    }

    // 2. Send to Customer if customer has a Telegram Chat ID
    const customerChatId = order.telegramChatId || order.deliveryMobile;
    if (settings.notifyCustomerOnOrderPlaced && order.telegramChatId) {
      const custTemplate = settings.templates.customer_order_placed;
      if (custTemplate?.enabled) {
        const custText = formatTelegramMessage(custTemplate.message, vars);
        const result = await sendTelegramMessage({
          botToken: settings.botToken,
          chatId: order.telegramChatId,
          text: custText,
        });

        await saveTelegramLogToDB({
          timestamp: new Date().toISOString(),
          eventType: 'customer_order_placed',
          recipientChatId: order.telegramChatId,
          recipientType: 'customer',
          recipientName: order.customerName,
          orderId: order.id,
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          messagePreview: `[Order Placed - Pending] #${order.id} for ${order.customerName}`,
        });
      }
    }
  } catch (err) {
    console.error('[Telegram New Order Workflow Error]:', err);
  }
}

/**
 * 2. Trigger User Registration Alert:
 *    - Notifies Super Admin & Admin / Moderator Chat IDs
 */
export async function triggerTelegramUserRegistration(
  customer: CustomerRecord,
  customSettings?: TelegramBotSettings
): Promise<void> {
  try {
    const settings = customSettings || (await getTelegramSettingsFromDB());
    if (!settings.enabled || !settings.botToken || !settings.notifyAdminOnUserRegister) return;

    const template = settings.templates.admin_user_registered;
    if (!template?.enabled) return;

    const vars: Record<string, string> = {
      '{{siteName}}': 'KenaX BD',
      '{{customerId}}': customer.id,
      '{{customerName}}': customer.name || 'New Customer',
      '{{customerMobile}}': customer.mobile || customer.phone || 'N/A',
      '{{customerEmail}}': customer.email || 'N/A',
      '{{registeredTime}}': new Date(customer.registeredAt || Date.now()).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    };

    const text = formatTelegramMessage(template.message, vars);

    const targets = new Set<string>();
    if (settings.superAdminChatId) targets.add(settings.superAdminChatId.trim());
    (settings.adminChatIds || []).forEach((c) => c && targets.add(c.trim()));
    (settings.moderatorChatIds || []).forEach((c) => c && targets.add(c.trim()));

    for (const chatId of targets) {
      if (!chatId) continue;
      const result = await sendTelegramMessage({
        botToken: settings.botToken,
        chatId,
        text,
      });

      await saveTelegramLogToDB({
        timestamp: new Date().toISOString(),
        eventType: 'admin_user_registered',
        recipientChatId: chatId,
        recipientType: chatId === settings.superAdminChatId ? 'super_admin' : 'admin',
        recipientName: 'Admin / Moderator',
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.error,
        messagePreview: `[New User Registration] ${customer.name} (${customer.mobile || customer.email})`,
      });
    }
  } catch (err) {
    console.error('[Telegram User Registration Workflow Error]:', err);
  }
}

/**
 * 3. Trigger Order Status Change Workflow:
 *    - When Admin/Manager/Moderator updates status (e.g. Pending -> Confirmed, Processing, Picked, Shipped, Cancelled):
 *      a) Sends alert to SUPER ADMIN with FULL STAFF INFORMATION (staff name, role, email, timestamp, transition).
 *      b) Sends alert to CUSTOMER WITHOUT STAFF INFORMATION (purely customer-focused status message, courier tracking, due amount).
 */
export async function triggerTelegramOrderStatusChange(params: {
  order: Order;
  prevStatus: string;
  newStatus: string;
  staffUser?: StaffUser | { id?: string; name?: string; role?: any; email?: string } | null;
  courierName?: string;
  trackingNumber?: string;
  customSettings?: TelegramBotSettings;
}): Promise<void> {
  const { order, prevStatus, newStatus, staffUser, courierName, trackingNumber, customSettings } = params;

  try {
    const settings = customSettings || (await getTelegramSettingsFromDB());
    if (!settings.enabled || !settings.botToken) return;

    const statusInfo = getStatusInfo(newStatus);

    // Courier tracking section
    const courierDisplay = courierName || order.courierName || '';
    const trackingDisplay = trackingNumber || order.trackingNumber || '';
    let courierSection = '';
    if (courierDisplay || trackingDisplay) {
      courierSection = `🚚 <b>Courier Partner:</b> ${courierDisplay || 'Standard Express'}\n🔢 <b>Tracking Number:</b> <code>${trackingDisplay || 'Awaiting assignment'}</code>`;
    }

    // Common template variables
    const baseVars: Record<string, string> = {
      '{{orderId}}': order.id,
      '{{siteName}}': 'KenaX BD',
      '{{customerName}}': order.customerName || 'Customer',
      '{{customerMobile}}': order.customerMobile || order.deliveryMobile || 'N/A',
      '{{previousStatus}}': prevStatus || order.orderStatus || 'Pending',
      '{{newStatus}}': newStatus,
      '{{statusEmoji}}': statusInfo.emoji,
      '{{statusMessage}}': statusInfo.message,
      '{{totalAmount}}': (order.totalAmount || 0).toLocaleString(),
      '{{dueAmount}}': (order.dueAmount || order.totalAmount || 0).toLocaleString(),
      '{{fullAddress}}': order.fullAddress || 'Customer Address',
      '{{courierName}}': courierDisplay || 'N/A',
      '{{trackingNumber}}': trackingDisplay || 'N/A',
      '{{courierSection}}': courierSection,
      '{{helpline}}': '+880 1700-123456',
    };

    // A) Send Super Admin Notification WITH STAFF INFORMATION
    if (settings.notifySuperAdminOnStaffActivity !== false && settings.superAdminChatId) {
      const saTemplate = settings.templates?.super_admin_staff_activity || DEFAULT_TELEGRAM_TEMPLATES.super_admin_staff_activity;
      if (saTemplate && saTemplate.enabled !== false) {
        const staffVars: Record<string, string> = {
          ...baseVars,
          '{{staffName}}': staffUser?.name || 'System / Admin',
          '{{staffRole}}': (staffUser?.role || 'Staff').toUpperCase(),
          '{{staffEmail}}': staffUser?.email || 'N/A',
          '{{actionTime}}': new Date().toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
        };

        const saText = formatTelegramMessage(saTemplate.message, staffVars);
        const result = await sendTelegramMessage({
          botToken: settings.botToken,
          chatId: settings.superAdminChatId,
          text: saText,
        });

        await saveTelegramLogToDB({
          timestamp: new Date().toISOString(),
          eventType: 'super_admin_staff_activity',
          recipientChatId: settings.superAdminChatId,
          recipientType: 'super_admin',
          recipientName: 'Super Admin',
          orderId: order.id,
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          messagePreview: `[Staff Action] ${staffUser?.name || 'Staff'} changed #${order.id} to ${newStatus}`,
        });
      }
    }

    // B) Send Customer Notification WITHOUT STAFF INFORMATION
    const statusKey = newStatus.toLowerCase() as keyof typeof settings.customerNotifyStatuses;
    const isStatusAllowed = settings.customerNotifyStatuses[statusKey] ?? true;
    const customerChatId = order.telegramChatId || (order as any).customerTelegramChatId;

    if (settings.notifyCustomerOnStatusUpdate && isStatusAllowed && customerChatId) {
      const isDelivered =
        newStatus.toLowerCase() === 'delivered' ||
        newStatus.toLowerCase() === 'delivered successfully' ||
        newStatus.toLowerCase() === 'completed';

      const custTemplate = isDelivered
        ? settings.templates.customer_order_delivered || DEFAULT_TELEGRAM_TEMPLATES.customer_order_delivered
        : settings.templates.customer_order_status_update || DEFAULT_TELEGRAM_TEMPLATES.customer_order_status_update;

      if (custTemplate?.enabled) {
        const custText = formatTelegramMessage(custTemplate.message, baseVars);
        const result = await sendTelegramMessage({
          botToken: settings.botToken,
          chatId: customerChatId,
          text: custText,
        });

        await saveTelegramLogToDB({
          timestamp: new Date().toISOString(),
          eventType: isDelivered ? 'customer_order_delivered' : 'customer_order_status_update',
          recipientChatId: customerChatId,
          recipientType: 'customer',
          recipientName: order.customerName,
          orderId: order.id,
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          messagePreview: isDelivered
            ? `[Customer Delivered Review Request] #${order.id}`
            : `[Customer Status Update] #${order.id} ➔ ${newStatus}`,
        });
      }
    }
  } catch (err) {
    console.error('[Telegram Order Status Change Workflow Error]:', err);
  }
}

/**
 * 4. Trigger New Product Added Workflow:
 *    - Posts attractive new product alert to Telegram Channel (with Photo & Direct Buy Link)
 *    - Alerts Super Admin with creator Staff information (Name, Role, Email, Timestamp, Product info)
 */
export async function triggerTelegramNewProductWorkflow(params: {
  product: Product;
  staffUser?: StaffUser | null;
  customSettings?: TelegramBotSettings;
  supplierName?: string;
}): Promise<void> {
  const { product, staffUser, customSettings, supplierName } = params;

  try {
    const settings = customSettings || (await getTelegramSettingsFromDB());
    if (!settings.enabled || !settings.botToken) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kenaxbd.com';
    const productLink = `${origin}/product/${encodeURIComponent(product.id || product.slug || product.sku)}`;

    let originalPriceSection = '';
    let discountText = '';
    if (product.originalPrice && product.originalPrice > product.price) {
      const diff = product.originalPrice - product.price;
      const pct = Math.round((diff / product.originalPrice) * 100);
      originalPriceSection = `<s>৳${product.originalPrice.toLocaleString()}</s> <i>(Save ৳${diff.toLocaleString()} • ${pct}% OFF)</i>`;
      discountText = `${pct}% OFF Special Deal!`;
    }

    const firstImage =
      (product.images && product.images[0]) || product.image || product.thumbnail || '';

    // Description summary: clean 2-3 lines
    const cleanDesc = (product.description || 'Exclusive premium quality product.')
      .replace(/<[^>]*>/g, '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join('\n• ');

    const vars: Record<string, string> = {
      '{{productName}}': product.name,
      '{{category}}': product.category || 'General',
      '{{sku}}': product.sku || 'N/A',
      '{{price}}': (product.price || 0).toLocaleString(),
      '{{originalPrice}}': (product.originalPrice || product.price || 0).toLocaleString(),
      '{{originalPriceSection}}': originalPriceSection,
      '{{discountText}}': discountText,
      '{{productDescription}}': cleanDesc ? `• ${cleanDesc}` : 'Top rated collection',
      '{{productLink}}': productLink,
      '{{siteName}}': 'KenaX BD',
    };

    let channelSentSuccess = false;

    // A) Post to Public Telegram Channel
    const channelTarget = settings.channelId?.trim();
    if (settings.postNewProductsToChannel && channelTarget) {
      const chTemplate = settings.templates.channel_new_product;
      if (chTemplate?.enabled) {
        const messageText = formatTelegramMessage(chTemplate.message, vars);

        let result;
        if (firstImage && firstImage.startsWith('http')) {
          result = await sendTelegramPhoto({
            botToken: settings.botToken,
            chatId: channelTarget,
            photoUrl: firstImage,
            caption: messageText,
          });
        } else {
          result = await sendTelegramMessage({
            botToken: settings.botToken,
            chatId: channelTarget,
            text: messageText,
          });
        }

        channelSentSuccess = result.success;

        await saveTelegramLogToDB({
          timestamp: new Date().toISOString(),
          eventType: 'channel_new_product',
          recipientChatId: channelTarget,
          recipientType: 'customer',
          recipientName: 'Telegram Public Channel',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          messagePreview: `[Channel Broadcast] New Product: ${product.name} (৳${product.price})`,
        });
      }
    }

    // B) Alert Super Admin with creator Staff information
    const saChatId = settings.superAdminChatId?.trim();
    if (settings.notifySuperAdminOnProductCreated && saChatId) {
      const saTemplate = settings.templates.super_admin_product_created;
      if (saTemplate?.enabled) {
        const staffVars: Record<string, string> = {
          ...vars,
          '{{staffName}}': staffUser?.name || 'Super Admin / Store Owner',
          '{{staffRole}}': (staffUser?.role || 'super_admin').toUpperCase(),
          '{{staffEmail}}': staffUser?.email || 'admin@kenaxbd.com',
          '{{actionTime}}': new Date().toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          '{{stock}}': String(product.stock ?? 10),
          '{{supplierName}}': supplierName || product.supplierName || 'In-House Warehouse',
          '{{channelBroadcastStatus}}': channelTarget
            ? channelSentSuccess
              ? `✅ Posted to Channel (${channelTarget})`
              : `⚠️ Channel Post Pending / Skipped`
            : 'ℹ️ No Channel Configured',
        };

        const saText = formatTelegramMessage(saTemplate.message, staffVars);
        const result = await sendTelegramMessage({
          botToken: settings.botToken,
          chatId: saChatId,
          text: saText,
        });

        await saveTelegramLogToDB({
          timestamp: new Date().toISOString(),
          eventType: 'super_admin_product_created',
          recipientChatId: saChatId,
          recipientType: 'super_admin',
          recipientName: 'Super Admin',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          messagePreview: `[Staff Product Added] ${staffUser?.name || 'Staff'} created ${product.name}`,
        });
      }
    }
  } catch (err) {
    console.error('[Telegram New Product Workflow Error]:', err);
  }
}

/**
 * 5. Trigger Product Discount Workflow:
 *    - Broadcasts special discount/deal to Telegram Channel
 *    - Alerts Super Admin with Staff creator information
 */
export async function triggerTelegramProductDiscountWorkflow(params: {
  product: Product;
  previousPrice: number;
  staffUser?: StaffUser | null;
  customSettings?: TelegramBotSettings;
}): Promise<void> {
  const { product, previousPrice, staffUser, customSettings } = params;

  try {
    const settings = customSettings || (await getTelegramSettingsFromDB());
    if (!settings.enabled || !settings.botToken) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kenaxbd.com';
    const productLink = `${origin}/product/${encodeURIComponent(product.id || product.slug || product.sku)}`;

    const oldPrice = previousPrice || product.originalPrice || product.price;
    const newPrice = product.price;
    const saveAmount = Math.max(0, oldPrice - newPrice);
    const discountPercent = oldPrice > 0 ? Math.round((saveAmount / oldPrice) * 100) : 0;

    const vars: Record<string, string> = {
      '{{productName}}': product.name,
      '{{newPrice}}': newPrice.toLocaleString(),
      '{{oldPrice}}': oldPrice.toLocaleString(),
      '{{saveAmount}}': saveAmount.toLocaleString(),
      '{{discountPercent}}': String(discountPercent),
      '{{productLink}}': productLink,
      '{{siteName}}': 'KenaX BD',
    };

    let channelSentSuccess = false;

    // A) Post to Public Telegram Channel
    const channelTarget = settings.channelId?.trim();
    if (settings.postDiscountsToChannel && channelTarget && discountPercent > 0) {
      const chTemplate = settings.templates.channel_discount_alert;
      if (chTemplate?.enabled) {
        const messageText = formatTelegramMessage(chTemplate.message, vars);
        const firstImage =
          (product.images && product.images[0]) || product.image || product.thumbnail || '';

        let result;
        if (firstImage && firstImage.startsWith('http')) {
          result = await sendTelegramPhoto({
            botToken: settings.botToken,
            chatId: channelTarget,
            photoUrl: firstImage,
            caption: messageText,
          });
        } else {
          result = await sendTelegramMessage({
            botToken: settings.botToken,
            chatId: channelTarget,
            text: messageText,
          });
        }

        channelSentSuccess = result.success;

        await saveTelegramLogToDB({
          timestamp: new Date().toISOString(),
          eventType: 'channel_discount_alert',
          recipientChatId: channelTarget,
          recipientType: 'customer',
          recipientName: 'Telegram Public Channel',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          messagePreview: `[Discount Alert] ${product.name} (Now ৳${newPrice}, Save ${discountPercent}%)`,
        });
      }
    }

    // B) Alert Super Admin with creator Staff information
    const saChatId = settings.superAdminChatId?.trim();
    if (settings.notifySuperAdminOnDiscountCreated && saChatId) {
      const saTemplate = settings.templates.super_admin_discount_coupon_activity;
      if (saTemplate?.enabled) {
        const staffVars: Record<string, string> = {
          '{{staffName}}': staffUser?.name || 'Super Admin / Staff',
          '{{staffRole}}': (staffUser?.role || 'staff').toUpperCase(),
          '{{staffEmail}}': staffUser?.email || 'admin@kenaxbd.com',
          '{{actionTime}}': new Date().toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          '{{promoType}}': 'Product Price Discount',
          '{{promoIdentifier}}': product.name,
          '{{discountSummary}}': `৳${saveAmount.toLocaleString()} OFF (${discountPercent}% Discount)`,
          '{{minSpend}}': 'N/A',
          '{{expiryInfo}}': 'Active on Product Catalog',
          '{{channelBroadcastStatus}}': channelTarget
            ? channelSentSuccess
              ? `✅ Broadcast to Channel (${channelTarget})`
              : '⚠️ Broadcast Skipped/Pending'
            : 'ℹ️ No Channel Configured',
        };

        const saText = formatTelegramMessage(saTemplate.message, staffVars);
        const result = await sendTelegramMessage({
          botToken: settings.botToken,
          chatId: saChatId,
          text: saText,
        });

        await saveTelegramLogToDB({
          timestamp: new Date().toISOString(),
          eventType: 'super_admin_discount_coupon_activity',
          recipientChatId: saChatId,
          recipientType: 'super_admin',
          recipientName: 'Super Admin',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          messagePreview: `[Staff Discount Created] ${staffUser?.name || 'Staff'} set ${discountPercent}% discount on ${product.name}`,
        });
      }
    }
  } catch (err) {
    console.error('[Telegram Product Discount Workflow Error]:', err);
  }
}

/**
 * 6. Trigger Promo Code / Coupon Workflow:
 *    - Broadcasts exclusive coupon code to Telegram Channel
 *    - Alerts Super Admin with creator Staff information
 */
export async function triggerTelegramCouponWorkflow(params: {
  coupon: Coupon;
  action: 'create' | 'update';
  staffUser?: StaffUser | null;
  customSettings?: TelegramBotSettings;
}): Promise<void> {
  const { coupon, action, staffUser, customSettings } = params;

  try {
    const settings = customSettings || (await getTelegramSettingsFromDB());
    if (!settings.enabled || !settings.botToken) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kenaxbd.com';
    const discountValue =
      coupon.discountType === 'fixed'
        ? `৳${coupon.discountAmount || coupon.discountPercent || 0} FLAT OFF`
        : `${coupon.discountPercent || coupon.discountAmount || 0}% DISCOUNT`;

    const validityDate = coupon.expiryDate
      ? new Date(coupon.expiryDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Unlimited / Ongoing Campaign';

    const vars: Record<string, string> = {
      '{{couponCode}}': coupon.code.toUpperCase(),
      '{{discountValue}}': discountValue,
      '{{minOrder}}': (coupon.minSpend || coupon.minPurchase || 0).toLocaleString(),
      '{{validityDate}}': validityDate,
      '{{siteName}}': 'KenaX BD',
      '{{storeLink}}': origin,
    };

    let channelSentSuccess = false;

    // A) Post to Public Telegram Channel
    const channelTarget = settings.channelId?.trim();
    if (settings.postCouponsToChannel && channelTarget && action === 'create') {
      const chTemplate = settings.templates.channel_coupon_alert;
      if (chTemplate?.enabled) {
        const messageText = formatTelegramMessage(chTemplate.message, vars);

        const result = await sendTelegramMessage({
          botToken: settings.botToken,
          chatId: channelTarget,
          text: messageText,
        });

        channelSentSuccess = result.success;

        await saveTelegramLogToDB({
          timestamp: new Date().toISOString(),
          eventType: 'channel_coupon_alert',
          recipientChatId: channelTarget,
          recipientType: 'customer',
          recipientName: 'Telegram Public Channel',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          messagePreview: `[Coupon Broadcast] Code: ${coupon.code.toUpperCase()} (${discountValue})`,
        });
      }
    }

    // B) Alert Super Admin with creator Staff information
    const saChatId = settings.superAdminChatId?.trim();
    if (settings.notifySuperAdminOnCouponCreated && saChatId) {
      const saTemplate = settings.templates.super_admin_discount_coupon_activity;
      if (saTemplate?.enabled) {
        const staffVars: Record<string, string> = {
          '{{staffName}}': staffUser?.name || 'Super Admin / Staff',
          '{{staffRole}}': (staffUser?.role || 'staff').toUpperCase(),
          '{{staffEmail}}': staffUser?.email || 'admin@kenaxbd.com',
          '{{actionTime}}': new Date().toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          '{{promoType}}': `Promo Code / Coupon (${action.toUpperCase()})`,
          '{{promoIdentifier}}': coupon.code.toUpperCase(),
          '{{discountSummary}}': discountValue,
          '{{minSpend}}': (coupon.minSpend || coupon.minPurchase || 0).toLocaleString(),
          '{{expiryInfo}}': validityDate,
          '{{channelBroadcastStatus}}': channelTarget
            ? channelSentSuccess
              ? `✅ Broadcast to Channel (${channelTarget})`
              : '⚠️ Broadcast Skipped/Pending'
            : 'ℹ️ No Channel Configured',
        };

        const saText = formatTelegramMessage(saTemplate.message, staffVars);
        const result = await sendTelegramMessage({
          botToken: settings.botToken,
          chatId: saChatId,
          text: saText,
        });

        await saveTelegramLogToDB({
          timestamp: new Date().toISOString(),
          eventType: 'super_admin_discount_coupon_activity',
          recipientChatId: saChatId,
          recipientType: 'super_admin',
          recipientName: 'Super Admin',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          messagePreview: `[Staff Coupon Action] ${staffUser?.name || 'Staff'} ${action}d coupon ${coupon.code.toUpperCase()}`,
        });
      }
    }
  } catch (err) {
    console.error('[Telegram Coupon Workflow Error]:', err);
  }
}

/**
 * 6. Trigger Reseller Dropship Order Workflow:
 *    - Sends attractive notification to Admin & Super Admin with Reseller Store, Student Name, Customer info & Net Margin.
 */
export async function triggerTelegramResellerOrderWorkflow(params: {
  order: Order;
  resellerStoreName?: string;
  resellerStudentName?: string;
  resellerPhone?: string;
  resellerProfit?: number;
  customSettings?: TelegramBotSettings;
}): Promise<void> {
  const { order, resellerStoreName, resellerStudentName, resellerPhone, resellerProfit, customSettings } = params;

  try {
    const settings = customSettings || (await getTelegramSettingsFromDB());
    if (!settings.enabled || !settings.botToken) return;

    const store = resellerStoreName || (order as any).resellerStoreName || 'Reseller Partner Store';
    const student = resellerStudentName || (order as any).resellerStudentName || (order as any).resellerName || 'Verified Reseller';
    const phone = resellerPhone || (order as any).resellerPhone || (order as any).advancePaymentSender || 'N/A';
    const profit = resellerProfit !== undefined ? resellerProfit : (Number((order as any).resellerProfit) || 0);

    const itemsSummary = (order.items || [])
      .map(
        (it, idx) =>
          `  ${idx + 1}. <b>${it.productName || it.name || 'Product'}</b> x${it.quantity} — ৳${(it.price * it.quantity).toLocaleString()}`
      )
      .join('\n');

    const msg = `🚀 <b>[NEW RESELLER DROPSHIP ORDER]</b> — <code>#${order.id}</code>
━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️ <b>Reseller & Student Information:</b>
• <b>Store / Page:</b> 🏪 <b>${store}</b>
• <b>Student / Reseller:</b> 🎓 <b>${student}</b>
• <b>Phone:</b> <code>${phone}</code>
• <b>Reseller ID:</b> <code>#${(order as any).resellerId || 'reseller'}</code>
• <b>Expected Profit:</b> <b>৳${profit.toLocaleString()}</b>

👤 <b>Customer Delivery Information:</b>
• <b>Name:</b> ${order.customerName || 'Customer'}
• <b>Mobile:</b> <code>${order.customerMobile || order.deliveryMobile || 'N/A'}</code>
• <b>District:</b> ${order.district || 'Bangladesh'}
• <b>Full Address:</b> ${order.fullAddress || 'N/A'}

📦 <b>Ordered Products:</b>
${itemsSummary}

💰 <b>Payment & Settlement:</b>
• <b>Total Customer COD:</b> <b>৳${(order.totalAmount || 0).toLocaleString()}</b>
• <b>Advance Paid:</b> ৳${((order as any).advancePaymentAmount || order.paidAmount || 0).toLocaleString()}
• <b>Due on Delivery:</b> <b>৳${((order as any).remainingCodAmount || order.totalAmount || 0).toLocaleString()}</b>
• <b>Reseller Net Margin:</b> <b>+৳${profit.toLocaleString()}</b>

⚡ <b>Order Status:</b> ⏳ <b>PENDING CONFIRMATION (RESELLER HUB)</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━
👉 <i>Please review & confirm in Admin Reseller Orders Panel!</i>`;

    const targets = new Set<string>();
    if (settings.superAdminChatId) targets.add(settings.superAdminChatId.trim());
    (settings.adminChatIds || []).forEach((c) => c && targets.add(c.trim()));
    (settings.moderatorChatIds || []).forEach((c) => c && targets.add(c.trim()));

    for (const chatId of targets) {
      if (!chatId) continue;
      const result = await sendTelegramMessage({
        botToken: settings.botToken,
        chatId,
        text: msg,
      });

      await saveTelegramLogToDB({
        timestamp: new Date().toISOString(),
        eventType: 'admin_new_order',
        recipientChatId: chatId,
        recipientType: chatId === settings.superAdminChatId ? 'super_admin' : 'admin',
        recipientName: 'Admin / Moderator',
        orderId: order.id,
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.error,
        messagePreview: `[Reseller Order #${order.id}] ${store} (${student}) - ৳${order.totalAmount}`,
      });
    }
  } catch (err) {
    console.error('[Telegram Reseller Order Workflow Error]:', err);
  }
}

/**
 * Trigger Fake Order Alert to Super Admin & Admins when a staff member marks an order as Fake
 */
export async function triggerTelegramFakeOrderAlert(params: {
  order: Order;
  staffName?: string;
  staffRole?: string;
  staffId?: string;
  staffEmail?: string;
  note?: string;
  customSettings?: TelegramBotSettings;
}): Promise<void> {
  const { order, staffName, staffRole, staffId, staffEmail, note, customSettings } = params;

  try {
    const settings = customSettings || (await getTelegramSettingsFromDB());
    if (!settings.enabled || !settings.botToken) return;

    const itemsSummary = (order.items || [])
      .map(
        (it, idx) =>
          `  ${idx + 1}. <b>${it.productName || it.name || 'Product'}</b> x${it.quantity} — ৳${(it.price * it.quantity).toLocaleString()}`
      )
      .join('\n');

    const template =
      settings.templates?.admin_fake_order_alert || DEFAULT_TELEGRAM_TEMPLATES.admin_fake_order_alert;
    if (!template || template.enabled === false) return;

    const vars: Record<string, string> = {
      '{{staffName}}': staffName || 'Staff Member',
      '{{staffRole}}': (staffRole || 'Staff').toUpperCase(),
      '{{staffId}}': staffId || 'N/A',
      '{{staffEmail}}': staffEmail || 'N/A',
      '{{orderId}}': order.id,
      '{{itemsList}}': itemsSummary || 'Standard Order Items',
      '{{totalAmount}}': (order.totalAmount || 0).toLocaleString(),
      '{{paymentMethod}}': order.paymentMethod || 'Cash on Delivery',
      '{{customerName}}': order.customerName || 'Customer',
      '{{customerMobile}}': order.customerMobile || order.deliveryMobile || 'N/A',
      '{{fullAddress}}': order.fullAddress || 'N/A',
      '{{actionTime}}': new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      '{{note}}': note || 'Marked as Fake Order by Staff',
    };

    const text = formatTelegramMessage(template.message, vars);

    const targets = new Set<string>();
    if (settings.superAdminChatId) targets.add(settings.superAdminChatId.trim());
    (settings.adminChatIds || []).forEach((c) => c && targets.add(c.trim()));

    for (const chatId of targets) {
      if (!chatId) continue;
      const result = await sendTelegramMessage({
        botToken: settings.botToken,
        chatId,
        text,
      });

      await saveTelegramLogToDB({
        timestamp: new Date().toISOString(),
        eventType: 'super_admin_staff_activity',
        recipientChatId: chatId,
        recipientType: chatId === settings.superAdminChatId ? 'super_admin' : 'admin',
        recipientName: 'Super Admin / Admin',
        orderId: order.id,
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.error,
        messagePreview: `[Fake Order Alert #${order.id}] Marked by ${staffName || 'Staff'}`,
      });
    }
  } catch (err) {
    console.error('[Telegram Fake Order Alert Workflow Error]:', err);
  }
}


