import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Crown,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  ShieldCheck,
  Copy,
  Check,
  ArrowUpRight,
  CreditCard,
  Layers,
  Award,
} from 'lucide-react';
import { ResellerUser, ResellerPlan, ResellerPlanId } from '../../types/reseller';

interface ResellerMembershipCountdownProps {
  reseller: ResellerUser;
  currentPlan: ResellerPlan;
  lang?: 'bn' | 'en';
  onUpgradeClick?: (plan?: ResellerPlan) => void;
  onRenewClick?: () => void;
}

export const ResellerMembershipCountdown: React.FC<ResellerMembershipCountdownProps> = ({
  reseller,
  currentPlan,
  lang = 'bn',
  onUpgradeClick,
  onRenewClick,
}) => {
  const isBn = lang === 'bn';
  const isFreePlan = reseller.planId === 'basic' && currentPlan.monthlyPrice === 0;

  // Determine end date
  const targetDate = useMemo(() => {
    if (reseller.subscriptionEndDate) {
      return new Date(reseller.subscriptionEndDate);
    }
    // Default 30 days from start or created date
    const start = reseller.subscriptionStartDate ? new Date(reseller.subscriptionStartDate) : new Date(reseller.createdAt || Date.now());
    const end = new Date(start);
    end.setDate(end.getDate() + 30);
    return end;
  }, [reseller.subscriptionEndDate, reseller.subscriptionStartDate, reseller.createdAt]);

  const startDate = useMemo(() => {
    return reseller.subscriptionStartDate
      ? new Date(reseller.subscriptionStartDate)
      : new Date(reseller.createdAt || Date.now() - 7 * 86400000);
  }, [reseller.subscriptionStartDate, reseller.createdAt]);

  // Live timer tick every second
  const [timeLeft, setTimeLeft] = useState<{
    totalMs: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({
    totalMs: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = targetDate.getTime() - now;

      if (diff <= 0) {
        setTimeLeft({
          totalMs: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft({
          totalMs: diff,
          days,
          hours,
          minutes,
          seconds,
          isExpired: false,
        });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Calculate percentage of time elapsed
  const progressPercentage = useMemo(() => {
    const totalDuration = targetDate.getTime() - startDate.getTime();
    if (totalDuration <= 0) return 100;
    const elapsed = Date.now() - startDate.getTime();
    const percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    return Math.round(percent);
  }, [targetDate, startDate]);

  // Formatted exact Date & Time in Bengali or English
  const formattedExactEndDateTime = useMemo(() => {
    try {
      const optionsDate: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      const optionsTime: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };

      if (isBn) {
        const datePart = targetDate.toLocaleDateString('bn-BD', optionsDate);
        const timePart = targetDate.toLocaleTimeString('bn-BD', optionsTime);
        return `${datePart}, ${timePart}`;
      } else {
        const datePart = targetDate.toLocaleDateString('en-US', optionsDate);
        const timePart = targetDate.toLocaleTimeString('en-US', optionsTime);
        return `${datePart} at ${timePart}`;
      }
    } catch {
      return targetDate.toLocaleString();
    }
  }, [targetDate, isBn]);

  // Reseller Formatted ID
  const resellerIdCode = useMemo(() => {
    if (reseller.referralCode && reseller.referralCode.startsWith('KX-RES-')) {
      return reseller.referralCode;
    }
    const raw = reseller.id.replace('reseller-', '').toUpperCase();
    return `KX-RES-${raw.slice(0, 5) || '8492'}`;
  }, [reseller.referralCode, reseller.id]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(resellerIdCode);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const isExpiringSoon = !timeLeft.isExpired && timeLeft.days <= 5 && !isFreePlan;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. HERO ACTIVE MEMBERSHIP & LIVE COUNTDOWN CARD */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-emerald-500/30 shadow-2xl p-5 sm:p-7 text-white space-y-6">
        {/* Background ambient lighting effects */}
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Top Header Strip: Plan Name + Status Pill + Reseller ID Badge */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10 border-b border-slate-800/80 pb-5">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg shrink-0 ${
              reseller.planId === 'premium'
                ? 'bg-gradient-to-tr from-amber-500 via-yellow-500 to-amber-400 text-slate-950 shadow-amber-500/20'
                : reseller.planId === 'standard'
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-gradient-to-tr from-slate-700 to-slate-600 text-white'
            }`}>
              {reseller.planId === 'premium' ? (
                <Crown className="w-6 h-6" />
              ) : reseller.planId === 'standard' ? (
                <Zap className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isBn ? 'সক্রিয় মেম্বারশিপ' : 'Active Membership'}</span>
                </span>
                {reseller.isVIP && (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>VIP Member</span>
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
                <span>{currentPlan.name}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-400 font-mono">
                  ({currentPlan.monthlyPrice === 0 ? (isBn ? 'ফ্রি লাইফটাইম' : 'Free Lifetime') : `৳${currentPlan.monthlyPrice}/মাস`})
                </span>
              </h2>
            </div>
          </div>

          {/* Quick Reseller ID Holographic Chip */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-2 sm:p-2.5 rounded-2xl border border-slate-800 shadow-inner shrink-0">
            <div className="px-2">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                {isBn ? 'রিসেলার আইডি' : 'Reseller ID'}
              </span>
              <span className="text-xs sm:text-sm font-mono font-black text-emerald-400 tracking-wider">
                {resellerIdCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyId}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-slate-700"
              title={isBn ? 'রিসেলার আইডি কপি করুন' : 'Copy Reseller ID'}
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">{isBn ? 'কপিকৃত!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isBn ? 'কপি' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Middle Section: Live Digital Time Countdown Clocks */}
        {!isFreePlan ? (
          <div className="space-y-4 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${isExpiringSoon ? 'text-amber-400 animate-bounce' : 'text-emerald-400'}`} />
                <h4 className="text-xs sm:text-sm font-black text-slate-200">
                  {isBn ? 'মেম্বারশিপ মেয়াদের বাকি সময় (কাউন্টডাউন):' : 'Membership Expiration Countdown:'}
                </h4>
              </div>

              {timeLeft.isExpired ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {isBn ? 'মেয়াদ শেষ হয়েছে' : 'Expired'}
                </span>
              ) : isExpiringSoon ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  {isBn ? 'শীঘ্রই শেষ হবে' : 'Expiring Soon'}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                  {isBn ? 'সবকিছু স্বাভাবিক' : 'Active & Normal'}
                </span>
              )}
            </div>

            {/* 4-Box Digital Clock Display */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-xl">
              {/* Days */}
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-center shadow-inner relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <div className="text-xl sm:text-3xl font-mono font-black text-emerald-400 tabular-nums">
                  {String(timeLeft.days).padStart(2, '0')}
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mt-0.5 tracking-wider">
                  {isBn ? 'দিন' : 'Days'}
                </div>
              </div>

              {/* Hours */}
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-center shadow-inner relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <div className="text-xl sm:text-3xl font-mono font-black text-sky-400 tabular-nums">
                  {String(timeLeft.hours).padStart(2, '0')}
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mt-0.5 tracking-wider">
                  {isBn ? 'ঘণ্টা' : 'Hours'}
                </div>
              </div>

              {/* Minutes */}
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-center shadow-inner relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <div className="text-xl sm:text-3xl font-mono font-black text-indigo-400 tabular-nums">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mt-0.5 tracking-wider">
                  {isBn ? 'মিনিট' : 'Minutes'}
                </div>
              </div>

              {/* Seconds */}
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-center shadow-inner relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                <div className="text-xl sm:text-3xl font-mono font-black text-amber-400 tabular-nums animate-pulse">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase mt-0.5 tracking-wider">
                  {isBn ? 'সেকেন্ড' : 'Seconds'}
                </div>
              </div>
            </div>

            {/* Time Elapsed Progress Bar */}
            <div className="space-y-1.5 max-w-xl">
              <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                <span>{isBn ? 'মেয়াদ অতিক্রমের অগ্রগতি:' : 'Billing Cycle Elapsed:'}</span>
                <span className="font-mono font-bold text-slate-300">{progressPercentage}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPercentage > 85
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Free Plan Lifetime Banner */
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3 text-xs relative z-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">
                {isBn ? 'জীবনব্যাপী ফ্রি বেসিক অ্যাক্সেস সক্রিয়' : 'Lifetime Free Basic Access Active'}
              </h4>
              <p className="text-slate-400 text-xs mt-0.5">
                {isBn
                  ? 'আপনার অ্যাকাউন্টের কোনো মেয়াদোত্তীর্ণ হওয়ার তারিখ নেই। উচ্চতর লাভ এবং আনলিমিটেড অর্ডারের জন্য যেকোনো সময় স্ট্যান্ডার্ড বা ভিআইপি প্ল্যানে আপগ্রেড করতে পারেন।'
                  : 'Your basic membership has no expiry date. Upgrade to Standard or VIP anytime for higher margins and zero advance delivery fees.'}
              </p>
            </div>
          </div>
        )}

        {/* Bottom Target Expiry Info Strip with Exact Date & Time */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                {isBn ? 'সুনির্দিষ্ট মেয়াদ সমাপ্তির সময় ও তারিখ' : 'Exact Membership Expiration Schedule'}
              </span>
              <p className="text-xs sm:text-sm font-black text-emerald-300 mt-0.5">
                {isFreePlan
                  ? (isBn ? 'আজীবন ফ্রি সাবস্ক্রিপশন (মেয়াদোত্তীর্ণ নেই)' : 'Lifetime Access (Never Expires)')
                  : (isBn
                      ? `মেয়াদ শেষ হবে: ${formattedExactEndDateTime}`
                      : `Expires on: ${formattedExactEndDateTime}`)}
              </p>
            </div>
          </div>

          {/* Quick Action Upgrade / Renew Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            {onRenewClick && !isFreePlan && (
              <button
                type="button"
                onClick={onRenewClick}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isBn ? 'মেম্বারশিপ রিনিউ' : 'Renew Plan'}</span>
              </button>
            )}

            {onUpgradeClick && (
              <button
                type="button"
                onClick={() => onUpgradeClick()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-950/40"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>{isBn ? 'ভিআইপি প্ল্যান আপগ্রেড ↗' : 'Upgrade VIP ↗'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
