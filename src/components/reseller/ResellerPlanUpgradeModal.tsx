import React, { useState } from 'react';
import {
  X,
  Crown,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { ResellerPlan, ResellerUser, ResellerPlanUpgradeRequest } from '../../types/reseller';
import {
  getAdminPaymentInfo,
  createResellerPlanRequest,
  AdminOfficialPaymentInfo,
} from '../../lib/resellerStorage';
import {
  cleanBDPhoneNumber,
  validateBangladeshMobile,
  isValidBDMobileNumber,
} from '../../utils/phoneUtils';

interface ResellerPlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: ResellerPlan;
  reseller: ResellerUser;
  lang?: 'bn' | 'en';
  onSuccess: (request: ResellerPlanUpgradeRequest) => void;
}

export const ResellerPlanUpgradeModal: React.FC<ResellerPlanUpgradeModalProps> = ({
  isOpen,
  onClose,
  targetPlan,
  reseller,
  lang = 'bn',
  onSuccess,
}) => {
  const isBn = lang === 'bn';
  const [adminInfo] = useState<AdminOfficialPaymentInfo>(() => getAdminPaymentInfo());
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [senderPhone, setSenderPhone] = useState(reseller.phone || '');
  const [transactionId, setTransactionId] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const price = billingCycle === 'monthly' ? targetPlan.monthlyPrice : targetPlan.yearlyPrice;
  const savings = billingCycle === 'yearly' ? targetPlan.monthlyPrice * 12 - targetPlan.yearlyPrice : 0;

  const handleCopy = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanTrx = transactionId.trim().toUpperCase();
    const cleanSender = cleanBDPhoneNumber(senderPhone);
    const phoneVal = validateBangladeshMobile(cleanSender, { lang: isBn ? 'bn' : 'en' });

    if (!phoneVal.isValid) {
      setErrorMsg(phoneVal.error || (isBn ? 'সঠিক প্রেরক মোবাইল নম্বর দিন।' : 'Please enter a valid sender mobile number.'));
      return;
    }

    if (!cleanTrx || cleanTrx.length < 4) {
      setErrorMsg(
        isBn
          ? 'অনুগ্রহ করে সঠিক ট্রানজ্যাকশন আইডি (TrxID) লিখুন।'
          : 'Please enter a valid Transaction ID (TrxID).'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedAdminNumber =
        paymentMethod === 'bkash'
          ? adminInfo.bkash
          : paymentMethod === 'nagad'
          ? adminInfo.nagad
          : adminInfo.rocket;

      const newReq = createResellerPlanRequest({
        resellerId: reseller.id,
        resellerName: reseller.fullName || reseller.username,
        resellerPhone: reseller.phone,
        resellerBusinessName: reseller.businessName,
        currentPlanId: reseller.planId,
        targetPlanId: targetPlan.id,
        targetPlanName: targetPlan.name,
        billingCycle,
        amount: price,
        paymentMethod,
        senderPhone: cleanSender,
        transactionId: cleanTrx,
        adminPaymentNumber: selectedAdminNumber,
        proofNote: proofNote.trim(),
      });

      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(newReq);
        onClose();
      }, 400);
    } catch {
      setIsSubmitting(false);
      setErrorMsg(
        isBn
          ? 'রিকোয়েস্ট জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
          : 'Failed to submit upgrade request. Please try again.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 text-xs">
        
        {/* Header - Compact & Clean */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-white leading-tight">
                  {targetPlan.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[9px] sm:text-[10px] border border-amber-500/30">
                  {isBn ? 'ভিআইপি মেম্বারশিপ' : 'VIP MEMBERSHIP'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                {isBn
                  ? 'আপনার সমস্ত পূর্ববর্তী ডাটা ও ব্যালেন্স অক্ষুণ্ণ রেখে ভিআইপি সুবিধা সক্রিয় হবে।'
                  : 'Upgrade without losing existing store orders, customers, or wallet balance.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Scrollable Form Body - Ultra Compact & Responsive */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 scrollbar-none">
          
          {/* Plan Duration & Price Card */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {isBn ? 'মোট প্রদেয় ফি' : 'Total Payable Amount'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                  ৳{price.toLocaleString('en-BD')}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  / {billingCycle === 'yearly' ? (isBn ? '১ বছর' : '1 Year') : (isBn ? '১ মাস' : '1 Month')}
                </span>
              </div>
            </div>

            {/* Toggle Monthly / Yearly */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isBn ? 'মাসিক' : 'Monthly'}
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  billingCycle === 'yearly'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{isBn ? 'বাৎসরিক' : 'Yearly'}</span>
                {savings > 0 && (
                  <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1 py-0.2 rounded font-black">
                    {isBn ? 'ছাড়' : 'Save'}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Step 1: Select 1 of 3 Payment Methods (Single Selection View) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] sm:text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>{isBn ? 'পেমেন্ট মেথড নির্বাচন করুন (যেকোনো ১টি):' : 'Select Payment Method (Choose 1):'}</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-bold">
                {isBn ? 'সেন্ড মানি করুন' : 'Send Money'}
              </span>
            </div>

            {/* 3 Main Method Tab Buttons */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {/* 1. bKash Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('bkash')}
                className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                  paymentMethod === 'bkash'
                    ? 'bg-pink-950/60 border-pink-500 text-pink-300 ring-2 ring-pink-500/40 shadow-md'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                <span>{isBn ? 'বিকাশ' : 'bKash'}</span>
              </button>

              {/* 2. Nagad Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('nagad')}
                className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                  paymentMethod === 'nagad'
                    ? 'bg-amber-950/60 border-amber-500 text-amber-300 ring-2 ring-amber-500/40 shadow-md'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>{isBn ? 'নগদ' : 'Nagad'}</span>
              </button>

              {/* 3. Rocket Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('rocket')}
                className={`py-2 px-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                  paymentMethod === 'rocket'
                    ? 'bg-purple-950/60 border-purple-500 text-purple-300 ring-2 ring-purple-500/40 shadow-md'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span>{isBn ? 'রকেট' : 'Rocket'}</span>
              </button>
            </div>

            {/* ONLY Selected Payment Method Card Appears */}
            <div className="animate-in fade-in zoom-in-98 duration-150">
              {paymentMethod === 'bkash' && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-pink-950/40 via-slate-950 to-pink-950/30 border border-pink-500/40 shadow-md">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
                      <span className="font-black text-pink-300 text-xs">
                        {isBn
                          ? `অফিসিয়াল বিকাশ নম্বর (${adminInfo.bkashType || 'সেন্ড মানি'})`
                          : `Official bKash Number (${adminInfo.bkashType || 'Personal / Send Money'})`}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-pink-400/80 uppercase">
                      {isBn ? '১-ট্যাপ কপি' : '1-Tap Copy'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-xl border border-pink-500/30 mt-1.5">
                    <span className="font-mono font-black text-white text-sm sm:text-base tracking-wider select-all">
                      {adminInfo.bkash}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('bkash', adminInfo.bkash)}
                      className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      {copiedKey === 'bkash' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{isBn ? 'কপি হয়েছে' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{isBn ? 'কপি করুন' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-pink-200/70 mt-1.5">
                    {isBn
                      ? '* আপনার বিকাশ অ্যাপ থেকে উপরের নম্বরে সেন্ড মানি করুন।'
                      : '* Send Money from your bKash app to the official number above.'}
                  </p>
                </div>
              )}

              {paymentMethod === 'nagad' && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-amber-950/30 border border-amber-500/40 shadow-md">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="font-black text-amber-300 text-xs">
                        {isBn
                          ? `অফিসিয়াল নগদ নম্বর (${adminInfo.nagadType || 'সেন্ড মানি'})`
                          : `Official Nagad Number (${adminInfo.nagadType || 'Personal / Send Money'})`}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400/80 uppercase">
                      {isBn ? '১-ট্যাপ কপি' : '1-Tap Copy'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-xl border border-amber-500/30 mt-1.5">
                    <span className="font-mono font-black text-white text-sm sm:text-base tracking-wider select-all">
                      {adminInfo.nagad}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('nagad', adminInfo.nagad)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      {copiedKey === 'nagad' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{isBn ? 'কপি হয়েছে' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{isBn ? 'কপি করুন' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-200/70 mt-1.5">
                    {isBn
                      ? '* আপনার নগদ অ্যাপ থেকে উপরের নম্বরে সেন্ড মানি করুন।'
                      : '* Send Money from your Nagad app to the official number above.'}
                  </p>
                </div>
              )}

              {paymentMethod === 'rocket' && (
                <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-950 to-purple-950/30 border border-purple-500/40 shadow-md">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      <span className="font-black text-purple-300 text-xs">
                        {isBn
                          ? `অফিসিয়াল রকেট নম্বর (${adminInfo.rocketType || 'সেন্ড মানি'})`
                          : `Official Rocket Number (${adminInfo.rocketType || 'Personal'})`}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-purple-400/80 uppercase">
                      {isBn ? '১-ট্যাপ কপি' : '1-Tap Copy'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-xl border border-purple-500/30 mt-1.5">
                    <span className="font-mono font-black text-white text-sm sm:text-base tracking-wider select-all">
                      {adminInfo.rocket}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('rocket', adminInfo.rocket)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      {copiedKey === 'rocket' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{isBn ? 'কপি হয়েছে' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{isBn ? 'কপি করুন' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-purple-200/70 mt-1.5">
                    {isBn
                      ? '* আপনার রকেট অ্যাকাউন্ট থেকে উপরের নম্বরে সেন্ড মানি করুন।'
                      : '* Send Money from your Rocket account to the official number above.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Input Verification Info (Compact 2-Columns) */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <label className="text-[11px] sm:text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[10px]">
                2
              </span>
              <span>{isBn ? 'পেমেন্ট ভেরিফিকেশন তথ্য লিখুন:' : 'Payment Verification Details:'}</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Sender Phone Number */}
              <div className="space-y-1">
                <label className="text-[10px] sm:text-[11px] font-bold text-slate-300 block">
                  {isBn ? 'প্রেরক মোবাইল নম্বর *' : 'Sender Mobile Number *'}
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  required
                  placeholder="01XXXXXXXXX"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(cleanBDPhoneNumber(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Transaction ID */}
              <div className="space-y-1">
                <label className="text-[10px] sm:text-[11px] font-bold text-slate-300 block">
                  {isBn ? 'ট্রানজ্যাকশন আইডি (TrxID) *' : 'Transaction ID (TrxID) *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isBn ? 'যেমন: 9J8A7K2L1' : 'e.g. 9J8A7K2L1'}
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono uppercase font-bold text-emerald-400 placeholder-slate-500 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Optional Reference / Note */}
              <div className="space-y-1 sm:col-span-2">
                <input
                  type="text"
                  placeholder={isBn ? 'রেফারেন্স অথবা অতিরিক্ত মন্তব্য (ঐচ্ছিক)...' : 'Reference or optional note...'}
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-[11px] text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Zero Data Loss Guarantee Badge */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-2 text-indigo-300 text-[10px] sm:text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="leading-tight">
              <strong className="text-white">
                {isBn ? '১০০% সুরক্ষিত ডাটা নিশ্চয়তা:' : '100% Data Protection Guarantee:'}
              </strong>{' '}
              {isBn
                ? 'আপনার পূর্ববর্তী সমস্ত কাস্টমার, অর্ডার হিস্ট্রি এবং ওয়ালেট ব্যালেন্স নতুন VIP মেম্বারশিপের সাথে স্বয়ংক্রিয়ভাবে সমন্বয় করা হবে।'
                : 'All your previous customer list, order history, and wallet balance will automatically transfer to your new VIP membership.'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-700 text-rose-300 text-[11px] flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Bottom Submit Action */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !transactionId.trim() || !senderPhone.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isBn ? 'জমা হচ্ছে...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isBn ? 'পেমেন্ট রিকোয়েস্ট জমা দিন ↗' : 'Submit Upgrade Request ↗'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
