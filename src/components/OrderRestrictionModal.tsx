import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  PhoneCall,
  X,
  MessageCircle,
  Send,
  ExternalLink,
  Lock,
  Headphones,
  CheckCircle2,
} from 'lucide-react';
import { SiteSettings } from '../types';

export type RestrictionReason = 'blocked_ip' | 'duplicate_order' | 'low_success_rate' | string;

interface OrderRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: RestrictionReason;
  customMessage?: string;
  siteSettings?: SiteSettings;
  customerPhone?: string;
}

export const OrderRestrictionModal: React.FC<OrderRestrictionModalProps> = ({
  isOpen,
  onClose,
  reason = 'blocked_ip',
  customMessage,
  siteSettings,
  customerPhone,
}) => {
  if (!isOpen) return null;

  // Resolve official WhatsApp Number (defaulting to primary contact/gateway number: 01719143897)
  const rawWaNum =
    siteSettings?.officialWhatsAppAgentNumber ||
    siteSettings?.whatsappNumber ||
    siteSettings?.whatsappSuperAdminNumber ||
    siteSettings?.bkashNumber ||
    '01719143897';

  // Format clean international WhatsApp number digits (e.g., 8801719143897)
  let cleanWaDigits = rawWaNum.replace(/\D/g, '');
  if (cleanWaDigits.startsWith('0')) {
    cleanWaDigits = '88' + cleanWaDigits;
  } else if (!cleanWaDigits.startsWith('880') && cleanWaDigits.length === 10) {
    cleanWaDigits = '880' + cleanWaDigits;
  }

  // Pre-filled WhatsApp message
  let waMessageText = 'হ্যালো KenaX BD! আমি একটি প্রোডাক্ট অর্ডার করতে যোগাযোগ করছি।';
  if (reason === 'duplicate_order') {
    waMessageText = `হ্যালো KenaX BD! আমার মোবাইল (${customerPhone || 'আমার নম্বর'}) দিয়ে অর্ডার প্রক্রিয়া করতে সমস্যা হচ্ছে। সাহায্য করুন।`;
  } else if (reason === 'low_success_rate') {
    waMessageText = 'হ্যালো KenaX BD! আমার অর্ডারটি সরাসরি ভেরিফাই করে কনফার্ম করতে চাই।';
  } else if (reason === 'blocked_ip') {
    waMessageText = 'হ্যালো KenaX BD! আমার আইপি চেকআউট রেস্ট্রিকশন নোটিশ দেখাচ্ছে। দয়া করে আমার অর্ডারটি প্রসেস করে দিন।';
  }

  const waUrl = `https://wa.me/${cleanWaDigits}?text=${encodeURIComponent(waMessageText)}`;

  // Messenger Link
  const rawMessenger = siteSettings?.messengerLink || 'https://m.me/kenaxbd';
  const messengerUrl = rawMessenger.startsWith('http') ? rawMessenger : `https://${rawMessenger}`;

  // Telegram Username / Link
  const rawTgBot = siteSettings?.telegramBotUsername || 'kenaxbd_bot';
  const tgUrl = rawTgBot.startsWith('http')
    ? rawTgBot
    : `https://t.me/${rawTgBot.replace('@', '')}`;

  // Phone Call Hotline
  const hotlinePhone = siteSettings?.phone || '+880 1719-143897';
  const cleanCallNumber = hotlinePhone.replace(/[^0-9+]/g, '');

  // Dynamic Titles & Descriptions based on exact Reason
  const isDuplicate = reason === 'duplicate_order';
  const isLowSuccess = reason === 'low_success_rate';
  const isBlockedIp = reason === 'blocked_ip';

  const modalTitle = isDuplicate
    ? 'ডুপ্লিকেট অর্ডার সতর্কতা - যোগাযোগ করুন'
    : isLowSuccess
    ? 'অর্ডার কনফার্মেশনের জন্য যোগাযোগ করুন'
    : 'অর্ডার করতে সরাসরি যোগাযোগ করুন';

  const modalBadgeText = isDuplicate
    ? 'Duplicate Order Notice'
    : isLowSuccess
    ? 'Success Rate Verification'
    : 'Order Verification Needed';

  const defaultDescription = isDuplicate
    ? 'আপনার প্রদানকৃত মোবাইল নম্বর থেকে ইতিমধ্যে একটি অর্ডার সিস্টেমে জমা হয়েছে। আপনি যদি একই অথবা নতুন কোনো আইটেম যোগ করতে চান, তবে দয়া করে নিচের যেকোনো উপায়ে আমাদের প্রতিনিধিকে মেসেজ বা কল দিন।'
    : isLowSuccess
    ? 'আপনার পূর্ববর্তী ডেলিভারি সাকসেস রেট কম অথবা তথ্য যাচাইকরণের প্রয়োজন রয়েছে। আপনার অর্ডারটি দ্রুত ম্যানুয়ালি কনফার্ম করতে অনুগ্রহ করে মেসেঞ্জার, হোয়াটসঅ্যাপ বা টেলিগ্রামে আমাদের টিমের সাথে যোগাযোগ করুন।'
    : 'আপনার এলাকা বা নেটওয়ার্ক থেকে সরাসরি অর্ডার সাময়িকভাবে সীমিত রয়েছে। আপনার পছন্দের পণ্যটির অর্ডার খুব সহজেই সম্পন্ন করতে নিচের যেকোনো মাধ্যমে আমাদের সাপোর্ট টিমে সরাসরি যোগাযোগ করুন।';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200 my-auto">
        {/* Header Ribbon / Banner */}
        <div className="relative px-5 py-6 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 text-white overflow-hidden">
          {/* Subtle background glow circle */}
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-white shrink-0 shadow-lg">
              {isDuplicate ? (
                <AlertTriangle className="w-7 h-7 text-amber-100" />
              ) : isLowSuccess ? (
                <Lock className="w-7 h-7 text-amber-100" />
              ) : (
                <ShieldAlert className="w-7 h-7 text-white" />
              )}
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 mb-1 text-[10px] font-black uppercase tracking-wider bg-black/20 text-white/90 rounded-full border border-white/20">
                {modalBadgeText}
              </span>
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-white leading-snug">
                {modalTitle}
              </h3>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Bengali Explanatory Message Box */}
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-sm leading-relaxed space-y-2">
            <p className="font-semibold">{customMessage || defaultDescription}</p>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>নিচের যেকোনো একটি মাধ্যমে যোগাযোগ করলেই আপনার অর্ডার কনফার্ম করে দেয়া হবে:</span>
            </p>
          </div>

          {/* Action Contact Buttons Grid */}
          <div className="space-y-3">
            {/* 1. WhatsApp Button (Primary Official Contact Number) */}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer ring-2 ring-emerald-500/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-black flex items-center gap-1.5">
                    <span>WhatsApp এ অর্ডার করতে মেসেজ দিন</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </div>
                  <div className="text-xs text-emerald-100 font-medium">
                    হোয়াটসঅ্যাপ নম্বর: {rawWaNum}
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-black bg-white/20 rounded-xl shrink-0 group-hover:bg-white/30 transition-colors">
                মেসেজ পাঠান
              </span>
            </a>

            {/* 2. Facebook Messenger Button */}
            <a
              href={messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-lg shadow-sky-600/20 active:scale-[0.98] transition-all cursor-pointer ring-2 ring-sky-500/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-sm font-black flex items-center gap-1.5">
                    <span>Facebook Messenger এ কথা বলুন</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </div>
                  <div className="text-xs text-sky-100 font-medium">
                    KenaX BD Official Page
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-black bg-white/20 rounded-xl shrink-0 group-hover:bg-white/30 transition-colors">
                কথা বলুন
              </span>
            </a>

            {/* 3. Telegram Contact Button */}
            <a
              href={tgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all cursor-pointer ring-2 ring-blue-500/30"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-black flex items-center gap-1.5">
                    <span>Telegram এ নক দিন</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </div>
                  <div className="text-xs text-blue-100 font-medium">
                    @{rawTgBot.replace('@', '')}
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 text-xs font-black bg-white/20 rounded-xl shrink-0 group-hover:bg-white/30 transition-colors">
                মেসেজ
              </span>
            </a>
          </div>

          {/* Hotline Phone Call Alternative */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  নতুবা সরাসরি কল করুন
                </p>
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {hotlinePhone}
                </p>
              </div>
            </div>
            <a
              href={`tel:${cleanCallNumber}`}
              className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all shrink-0 active:scale-95"
            >
              কল করুন
            </a>
          </div>

          {/* Close Action */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer text-center"
          >
            ঠিক আছে, বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
