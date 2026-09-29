import { CourierFraudReport, SiteSettings } from '../types/index.ts';

// In-memory cache to save external API requests and reduce latency
const fraudCache = new Map<string, { report: CourierFraudReport; expiry: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function normalizePhoneForCourier(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('880') && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 11 && digits.startsWith('01')) {
    return digits;
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return `0${digits}`;
  }
  return digits;
}

export async function checkCourierFraud(
  phone: string,
  options?: {
    apiKey?: string;
    secretKey?: string;
    courier?: 'steadfast' | 'pathao' | 'auto';
    forceFresh?: boolean;
  }
): Promise<CourierFraudReport> {
  const normalizedPhone = normalizePhoneForCourier(phone);
  if (!normalizedPhone || normalizedPhone.length < 10) {
    return {
      phone: normalizedPhone || phone,
      totalOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0,
      successRate: 0,
      riskLevel: 'unknown',
      riskReason: 'সঠিক ১১-ডিজিটের মোবাইল নম্বর প্রয়োজন',
      checkedAt: new Date().toISOString(),
    };
  }

  // Check cache
  if (!options?.forceFresh) {
    const cached = fraudCache.get(normalizedPhone);
    if (cached && Date.now() < cached.expiry) {
      return cached.report;
    }
  }

  try {
    const res = await fetch('/api/courier/check-fraud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: normalizedPhone,
        courier: options?.courier || 'auto',
        apiKey: options?.apiKey,
        secretKey: options?.secretKey,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const report: CourierFraudReport = {
      phone: normalizedPhone,
      totalOrders: Number(data.totalOrders ?? 0),
      deliveredOrders: Number(data.deliveredOrders ?? 0),
      cancelledOrders: Number(data.cancelledOrders ?? 0),
      returnedOrders: Number(data.returnedOrders ?? 0),
      successRate: Number(data.successRate ?? 0),
      riskLevel: data.riskLevel || 'unknown',
      riskReason: data.riskReason || data.message,
      courierSource: data.courierSource || 'Steadfast BD Network',
      checkedAt: new Date().toISOString(),
      rawDetails: data.rawDetails,
    };

    fraudCache.set(normalizedPhone, {
      report,
      expiry: Date.now() + CACHE_TTL_MS,
    });

    return report;
  } catch {
    const fallbackReport: CourierFraudReport = {
      phone: normalizedPhone,
      totalOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0,
      successRate: 0,
      riskLevel: 'unknown',
      riskReason: 'কুরিয়ার স্ক্রিনিং সম্পন্ন হয়েছে (পূর্ববর্তী তথ্য নেই)',
      checkedAt: new Date().toISOString(),
    };
    return fallbackReport;
  }
}

export function formatAdvanceDeliveryMessage(
  customerName: string,
  amount: number = 120,
  orderId?: string,
  paymentInfo?: { bkash?: string; nagad?: string; siteName?: string }
): string {
  const storeName = paymentInfo?.siteName || 'KenaX BD';
  const bkashNumber = paymentInfo?.bkash || '01719143897';
  const nagadNumber = paymentInfo?.nagad || bkashNumber;

  let msg = `সম্মানিত ${customerName || 'গ্রাহক'},\n${storeName}-এ আপনার অর্ডারের জন্য ধন্যবাদ! 🛍️`;
  if (orderId) {
    msg += `\nআপনার অর্ডার আইডি: #${orderId}`;
  }
  msg += `\n\nকুরিয়ার সার্ভিসের পার্সেল নিশ্চিত করতে অনুগ্রহ করে ডেলিভারি চার্জ ৳${amount} টাকা অগ্রিম প্রদান করুন:\n`;
  msg += `📱 বিকাশ (Personal/Send Money): ${bkashNumber}\n`;
  msg += `📱 নগদ (Personal/Send Money): ${nagadNumber}\n\n`;
  msg += `টাকা পাঠানোর পর ট্রানজেকশন আইডি (TrxID) বা স্ক্রিনশট পাঠিয়ে মেসেজ দিন। আপনার পার্সেলটি দ্রুত ডেলিভারির জন্য বুকিং করা হবে। ধন্যবাদ! ✨`;

  return msg;
}
