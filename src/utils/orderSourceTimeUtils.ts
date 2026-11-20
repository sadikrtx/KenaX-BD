/**
 * Order Source & Relative Time Utilities
 * Supports rich Bangla and English relative time formatting and source identification
 */

import type { Order } from '../types/index.ts';

export interface RelativeTimeResult {
  relativeTextBn: string;
  relativeTextEn: string;
  formattedDateBn: string;
  formattedTimeBn: string;
  formattedDateEn: string;
  formattedTimeEn: string;
  fullDateTimeBn: string;
  fullDateTimeEn: string;
  isRecent: boolean; // within 30 minutes
  minutesAgo: number;
}

// Convert English digits to Bengali digits
export const toBanglaNumber = (num: number | string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (digit) => banglaDigits[parseInt(digit, 10)] || digit);
};

const BANGLA_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const ENGLISH_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Format relative time (e.g., "১০ মিনিট পূর্বে", "২ ঘণ্টা পূর্বে")
 */
export const getOrderTimeDetails = (dateStr?: string): RelativeTimeResult => {
  if (!dateStr) {
    return {
      relativeTextBn: 'অজানা সময়',
      relativeTextEn: 'Unknown time',
      formattedDateBn: '--',
      formattedTimeBn: '--',
      formattedDateEn: '--',
      formattedTimeEn: '--',
      fullDateTimeBn: '--',
      fullDateTimeEn: '--',
      isRecent: false,
      minutesAgo: 999999,
    };
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return {
      relativeTextBn: dateStr,
      relativeTextEn: dateStr,
      formattedDateBn: dateStr,
      formattedTimeBn: '--',
      formattedDateEn: dateStr,
      formattedTimeEn: '--',
      fullDateTimeBn: dateStr,
      fullDateTimeEn: dateStr,
      isRecent: false,
      minutesAgo: 999999,
    };
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relativeTextBn = '';
  let relativeTextEn = '';

  if (diffSecs < 45) {
    relativeTextBn = 'এইমাত্র এসেছে';
    relativeTextEn = 'Just now';
  } else if (diffMins < 60) {
    const mins = Math.max(1, diffMins);
    relativeTextBn = `${toBanglaNumber(mins)} মিনিট পূর্বে`;
    relativeTextEn = `${mins}m ago`;
  } else if (diffHours < 24) {
    relativeTextBn = `${toBanglaNumber(diffHours)} ঘণ্টা পূর্বে`;
    relativeTextEn = `${diffHours}h ago`;
  } else if (diffDays === 1) {
    relativeTextBn = 'গতকাল';
    relativeTextEn = 'Yesterday';
  } else if (diffDays < 7) {
    relativeTextBn = `${toBanglaNumber(diffDays)} দিন পূর্বে`;
    relativeTextEn = `${diffDays}d ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    relativeTextBn = `${toBanglaNumber(weeks)} সপ্তাহ পূর্বে`;
    relativeTextEn = `${weeks}w ago`;
  } else {
    const months = Math.floor(diffDays / 30);
    relativeTextBn = `${toBanglaNumber(months)} মাস পূর্বে`;
    relativeTextEn = `${months}mo ago`;
  }

  // Exact Time Formatting
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const isPM = hours >= 12;
  const ampmBn = isPM ? 'পিএম' : 'এএম';
  const ampmEn = isPM ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  const formattedTimeEn = `${displayHours}:${minutes} ${ampmEn}`;
  const formattedTimeBn = `${toBanglaNumber(displayHours)}:${toBanglaNumber(minutes)} ${ampmBn}`;

  const day = d.getDate();
  const monthIdx = d.getMonth();
  const year = d.getFullYear();

  const formattedDateEn = `${day} ${ENGLISH_MONTHS[monthIdx]} ${year}`;
  const formattedDateBn = `${toBanglaNumber(day)} ${BANGLA_MONTHS[monthIdx]} ${toBanglaNumber(year)}`;

  return {
    relativeTextBn,
    relativeTextEn,
    formattedDateBn,
    formattedTimeBn,
    formattedDateEn,
    formattedTimeEn,
    fullDateTimeBn: `${formattedDateBn}, ${formattedTimeBn}`,
    fullDateTimeEn: `${formattedDateEn}, ${formattedTimeEn}`,
    isRecent: diffMins <= 30,
    minutesAgo: diffMins,
  };
};

export interface OrderSourceInfo {
  sourceKey: 'landing_page' | 'website_store' | 'chatbot' | 'manual' | 'reseller';
  badgeTitleBn: string;
  badgeTitleEn: string;
  shortLabelBn: string;
  shortLabelEn: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  pillClass: string;
  iconType: 'rocket' | 'globe' | 'store' | 'bot' | 'pen' | 'share';
  details?: string;
}

/**
 * Determine Order Source Information
 */
export const getOrderSourceInfo = (order: Order | any): OrderSourceInfo => {
  if (!order) {
    return {
      sourceKey: 'website_store',
      badgeTitleBn: 'ওয়েবসাইট স্টোর',
      badgeTitleEn: 'Website Store',
      shortLabelBn: 'ওয়েবসাইট',
      shortLabelEn: 'Store',
      bgClass: 'bg-sky-50 dark:bg-sky-950/40',
      textClass: 'text-sky-700 dark:text-sky-300',
      borderClass: 'border-sky-200 dark:border-sky-800',
      pillClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20',
      iconType: 'store',
    };
  }

  const ordSrc = ((order as any).orderSource || '').toLowerCase().trim();
  const src = ((order as any).source || '').toLowerCase().trim();
  const srcChannel = ((order as any).sourceChannel || '').toLowerCase().trim();

  // 1. Landing Page Detection
  if (
    ordSrc === 'landing_page' ||
    ordSrc === 'landing' ||
    src.includes('landing') ||
    srcChannel.includes('landing') ||
    (order as any).landingPageSlug ||
    (order as any).isLandingPageOrder
  ) {
    return {
      sourceKey: 'landing_page',
      badgeTitleBn: 'ল্যান্ডিং পেজ',
      badgeTitleEn: 'Landing Page',
      shortLabelBn: 'ল্যান্ডিং পেজ',
      shortLabelEn: 'Landing Page',
      bgClass: 'bg-purple-50 dark:bg-purple-950/40',
      textClass: 'text-purple-700 dark:text-purple-300',
      borderClass: 'border-purple-200 dark:border-purple-800',
      pillClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30',
      iconType: 'rocket',
      details: (order as any).landingPageSlug ? `Slug: ${(order as any).landingPageSlug}` : 'Direct 1-Click Order',
    };
  }

  // 2. Chatbot Detection
  if (
    ordSrc === 'chatbot' ||
    ordSrc === 'ai_bot' ||
    src.includes('bot') ||
    src.includes('chat') ||
    srcChannel.includes('bot') ||
    order.isAiBotOrder === true ||
    (order as any).createdByStaffName === 'Ordered by KenaX Bot'
  ) {
    return {
      sourceKey: 'chatbot',
      badgeTitleBn: 'এআই চ্যাটবট',
      badgeTitleEn: 'AI Chatbot',
      shortLabelBn: 'চ্যাটবট',
      shortLabelEn: 'AI Bot',
      bgClass: 'bg-amber-50 dark:bg-amber-950/40',
      textClass: 'text-amber-700 dark:text-amber-300',
      borderClass: 'border-amber-200 dark:border-amber-800',
      pillClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
      iconType: 'bot',
    };
  }

  // 3. Reseller / Dropshipping
  if (
    ordSrc === 'reseller' ||
    ordSrc === 'dropship' ||
    src.includes('reseller') ||
    (order as any).resellerId
  ) {
    return {
      sourceKey: 'reseller',
      badgeTitleBn: 'রিসেলার অর্ডার',
      badgeTitleEn: 'Reseller Network',
      shortLabelBn: 'রিসেলার',
      shortLabelEn: 'Reseller',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
      textClass: 'text-emerald-700 dark:text-emerald-300',
      borderClass: 'border-emerald-200 dark:border-emerald-800',
      pillClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
      iconType: 'share',
    };
  }

  // 4. Admin Manual Entry
  if (
    ordSrc === 'manual' &&
    (src.includes('admin') || (order as any).createdByStaffId || (order as any).createdByStaffName)
  ) {
    return {
      sourceKey: 'manual',
      badgeTitleBn: 'ম্যানুয়াল এন্ট্রি (অ্যাডমিন)',
      badgeTitleEn: 'Manual Entry (Admin)',
      shortLabelBn: 'ম্যানুয়াল',
      shortLabelEn: 'Manual',
      bgClass: 'bg-slate-100 dark:bg-slate-800',
      textClass: 'text-slate-700 dark:text-slate-300',
      borderClass: 'border-slate-200 dark:border-slate-700',
      pillClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20',
      iconType: 'pen',
      details: (order as any).createdByStaffName ? `By: ${(order as any).createdByStaffName}` : undefined,
    };
  }

  // 5. Default Website Store
  return {
    sourceKey: 'website_store',
    badgeTitleBn: 'ওয়েবসাইট স্টোর',
    badgeTitleEn: 'Website Store',
    shortLabelBn: 'ওয়েবসাইট স্টোর',
    shortLabelEn: 'Website Store',
    bgClass: 'bg-sky-50 dark:bg-sky-950/40',
    textClass: 'text-sky-700 dark:text-sky-300',
    borderClass: 'border-sky-200 dark:border-sky-800',
    pillClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30',
    iconType: 'store',
  };
};
