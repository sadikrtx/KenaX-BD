import { ProductHighlight } from '../types/index.ts';

export const DEFAULT_PRODUCT_HIGHLIGHTS: ProductHighlight[] = [
  {
    id: 'hl-1',
    text: 'Original product specifications & brand warranty',
    icon: 'check-circle',
    iconColor: 'emerald',
    active: true,
  },
  {
    id: 'hl-2',
    text: 'Cash on Delivery home delivery available across Bangladesh',
    icon: 'check-circle',
    iconColor: 'emerald',
    active: true,
  },
  {
    id: 'hl-3',
    text: 'Secure protective packaging for safe transit',
    icon: 'check-circle',
    iconColor: 'emerald',
    active: true,
  },
  {
    id: 'hl-4',
    text: 'Direct support & assistance from KenaX BD team',
    icon: 'check-circle',
    iconColor: 'emerald',
    active: true,
  },
];

export interface HighlightIconOption {
  id: string;
  label: string;
}

export const PRESET_HIGHLIGHT_ICONS: HighlightIconOption[] = [
  { id: 'check-circle', label: 'গোল টিক (Check Circle)' },
  { id: 'shield-check', label: 'ওয়ারেন্টি ও সিকিউরিটি (Shield Check)' },
  { id: 'truck', label: 'হোম ডেলিভারি (Truck)' },
  { id: 'zap', label: 'সুপারফাস্ট / ইনস্ট্যান্ট (Zap)' },
  { id: 'sparkles', label: 'প্রিমিয়াম কোয়ালিটি (Sparkles)' },
  { id: 'star', label: 'টপ রেটেড (Star)' },
  { id: 'award', label: '১০০% অথেনটিক (Award)' },
  { id: 'package-check', label: 'ইনট্যাক্ট বক্স প্যাকেজিং (Package Check)' },
  { id: 'refresh-cw', label: 'রিপ্লেসমেন্ট সুবিধা (Refresh / Return)' },
  { id: 'headphones', label: 'কাস্টমার সাপোর্ট (Headphones)' },
  { id: 'clock', label: 'দ্রুত ডেলিভারি ও রেসপন্স (Clock)' },
  { id: 'badge-percent', label: 'সেরা ডিসকাউন্ট অফার (Badge Percent)' },
  { id: 'heart', label: 'জনপ্রিয় পছন্দ (Heart)' },
  { id: 'flame', label: 'হট কালেকশন (Flame)' },
  { id: 'thumbs-up', label: 'সবার পছন্দ (Thumbs Up)' },
  { id: 'gift', label: 'ফ্রি গিফট বা বোনাস (Gift)' },
  { id: 'battery-charging', label: 'লং ব্যাটারি লাইফ (Battery)' },
  { id: 'tag', label: 'বিশেষ মূল্যছাড় (Tag)' },
];

export const PRESET_HIGHLIGHT_EMOJIS = [
  '✅', '🛡️', '⚡', '🚚', '📦', '⭐', '🔥', '✨', '💯', '🎁', '💎', '🏆', '🏷️', '⏱️', '🎯', '👍', '👌', '🌟', '🔋', '🎉'
];

export interface HighlightColorOption {
  id: string;
  label: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
}

export const PRESET_HIGHLIGHT_COLORS: HighlightColorOption[] = [
  { id: 'emerald', label: 'Emerald Green', bgClass: 'bg-emerald-500', textClass: 'text-emerald-600', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'sky', label: 'Sky Blue', bgClass: 'bg-sky-500', textClass: 'text-sky-600', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  { id: 'indigo', label: 'Indigo', bgClass: 'bg-indigo-500', textClass: 'text-indigo-600', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'amber', label: 'Amber Gold', bgClass: 'bg-amber-500', textClass: 'text-amber-600', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'rose', label: 'Rose Red', bgClass: 'bg-rose-500', textClass: 'text-rose-600', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'purple', label: 'Purple', bgClass: 'bg-purple-500', textClass: 'text-purple-600', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'teal', label: 'Teal Cyan', bgClass: 'bg-teal-500', textClass: 'text-teal-600', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'slate', label: 'Slate Dark', bgClass: 'bg-slate-700', textClass: 'text-slate-700', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' },
];

export const COMMON_BENEFIT_SUGGESTIONS = [
  { text: '১০০% অরিজিনাল ও অথেনটিক ব্র্যান্ড প্রোডাক্ট', icon: 'shield-check', iconColor: 'emerald' },
  { text: '৭ দিনের সহজ রিপ্লেসমেন্ট গ্যারান্টি', icon: 'refresh-cw', iconColor: 'sky' },
  { text: 'সারা বাংলাদেশে দ্রুত ক্যাশ অন হোম ডেলিভারি', icon: 'truck', iconColor: 'emerald' },
  { text: 'নিরাপদ ইনট্যাক্ট ও বাবল র‍্যাপ প্রটেক্টিভ প্যাকেজিং', icon: 'package-check', iconColor: 'indigo' },
  { text: '২৪ থেকে ৪৮ ঘণ্টার ভেতর সুপারফাস্ট ডেলিভারি', icon: 'zap', iconColor: 'amber' },
  { text: 'অফিসিয়াল ক্যাশ মেমো ও ওয়ারেন্টি সুবিধা', icon: 'award', iconColor: 'rose' },
  { text: 'কেনার পর সার্বক্ষণিক ডেডিকেটেড কাস্টমার সাপোর্ট', icon: 'headphones', iconColor: 'purple' },
  { text: 'সীমিত সময়ের জন্য আকর্ষণীয় অফার মূল্য', icon: 'badge-percent', iconColor: 'rose' },
];
