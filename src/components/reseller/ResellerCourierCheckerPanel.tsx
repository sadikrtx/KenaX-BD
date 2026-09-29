import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Phone,
  User,
  MapPin,
  Calendar,
  Layers,
  Activity,
  Check,
} from 'lucide-react';
import { checkCourierFraud, normalizePhoneForCourier } from '../../lib/courierFraudService';
import { CourierFraudReport } from '../../types';

interface ResellerCourierCheckerPanelProps {
  lang?: 'bn' | 'en';
}

export const ResellerCourierCheckerPanel: React.FC<ResellerCourierCheckerPanelProps> = ({
  lang = 'bn',
}) => {
  const isBn = lang === 'bn';
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [report, setReport] = useState<CourierFraudReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCheckCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const clean = normalizePhoneForCourier(phoneNumber);
    if (!clean || clean.length < 11) {
      setErrorMsg(isBn ? 'অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন' : 'Please enter a valid 11-digit mobile number');
      return;
    }

    setIsSearching(true);
    try {
      // Call live Steadfast API gateway via courierFraudService
      const result = await checkCourierFraud(clean, { courier: 'steadfast', forceFresh: true });
      setReport(result);
    } catch {
      setErrorMsg(isBn ? 'কুরিয়ার সার্ভারের সাথে যোগাযোগ করা যায়নি। পুনরায় চেষ্টা করুন।' : 'Failed to connect to courier server. Please retry.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950/80 to-slate-900 border border-sky-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>{isBn ? 'স্টিডফাস্ট লাইভ এপিআই' : 'Steadfast Live API Gateway'}</span>
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-300 font-bold">100% Verified Delivery History</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white mt-1">
            {isBn ? 'স্টিডফাস্ট কুরিয়ার ফ্রড ও কাস্টমার ডেলিভারি রিপোর্ট' : 'Steadfast Courier Fraud & Delivery Checker'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            {isBn
              ? 'অর্ডার পাঠানোর আগে কাস্টমারের মোবাইল নম্বর দিয়ে স্টিডফাস্ট কুরিয়ারের লাইভ ডাটাবেজ থেকে নির্ভুল ডেলিভারি সাকসেস রেট এবং রিটার্ন রিপোর্ট যাচাই করুন।'
              : 'Check live Steadfast API records to verify customer successful deliveries, cancellations, and return risk before dispatching.'}
          </p>
        </div>
      </div>

      {/* Phone Search Box */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 max-w-2xl mx-auto shadow-2xs">
        <form onSubmit={handleCheckCourier} className="space-y-3">
          <label className="text-xs font-black text-slate-900 dark:text-white block">
            {isBn ? 'গ্রাহকের ১১ ডিজিটের মোবাইল নম্বর লিখুন (Steadfast Database Search):' : 'Enter Customer 11-digit Mobile Number:'}
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                placeholder="017XXXXXXXX or 018XXXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:border-sky-500 shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || phoneNumber.replace(/[^0-9]/g, '').length < 11}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-950 transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSearching ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isBn ? 'যাচাই হচ্ছে...' : 'Checking API...'}</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>{isBn ? 'রিপোর্ট চেক করুন' : 'Check Report'}</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </p>
          )}

          <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap pt-1">
            <span>{isBn ? 'দ্রুত ট্রায়াল:' : 'Quick trials:'}</span>
            <button
              type="button"
              onClick={() => setPhoneNumber('01711223344')}
              className="text-emerald-400 hover:underline cursor-pointer font-mono"
            >
              01711223344
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setPhoneNumber('01899887766')}
              className="text-amber-400 hover:underline cursor-pointer font-mono"
            >
              01899887766
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setPhoneNumber('01988776655')}
              className="text-rose-400 hover:underline cursor-pointer font-mono"
            >
              01988776655
            </button>
          </div>
        </form>
      </div>

      {/* Result Display from Steadfast API */}
      {report && (
        <div className="space-y-4 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2">
          {/* Main Risk Status Banner */}
          <div
            className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              report.riskLevel === 'safe' || report.successRate >= 80
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : report.riskLevel === 'moderate' || (report.successRate >= 50 && report.successRate < 80)
                ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-md shrink-0 ${
                  report.riskLevel === 'safe' || report.successRate >= 80
                    ? 'bg-emerald-600 text-white'
                    : report.riskLevel === 'moderate' || (report.successRate >= 50 && report.successRate < 80)
                    ? 'bg-amber-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {report.riskLevel === 'safe' || report.successRate >= 80 ? (
                  <ShieldCheck className="w-7 h-7" />
                ) : (
                  <ShieldAlert className="w-7 h-7" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-white">
                    {report.riskLevel === 'safe' || report.successRate >= 80
                      ? isBn ? 'নিরাপদ কাস্টমার (Safe Customer)' : 'Safe Customer'
                      : report.riskLevel === 'moderate' || (report.successRate >= 50 && report.successRate < 80)
                      ? isBn ? 'মাঝারি ঝুঁকি (Moderate Risk)' : 'Moderate Risk'
                      : isBn ? 'উচ্চ রিটার্ন ঝুঁকি! (High Return Risk)' : 'High Return Risk Alert!'}
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-950/80 text-white">
                    {report.phone}
                  </span>
                </div>
                <p className="text-xs mt-1 text-slate-200">
                  {report.riskReason || (report.successRate >= 80
                    ? isBn ? 'বিশ্বস্ত কাস্টমার! ক্যাশ অন ডেলিভারি (COD) তে প্রোডাক্ট পাঠানো যাবে।' : 'Trusted buyer. Safe for direct Cash on Delivery dispatch.'
                    : isBn ? 'সতর্কতা: রিটার্ন ঝুঁকি এড়াতে অবশ্যই ডেলিভারি চার্জ অগ্রিম গ্রহণ করুন।' : 'Notice: Please collect delivery charge in advance to avoid return losses.')}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {isBn ? 'ডেলিভারি সাকসেস রেট' : 'Success Rate'}
              </span>
              <p
                className={`text-2xl font-black tabular-nums ${
                  report.successRate >= 80
                    ? 'text-emerald-400'
                    : report.successRate >= 50
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {report.successRate}%
              </p>
            </div>
          </div>

          {/* 4 Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-2xs">
              <span className="text-slate-500 dark:text-slate-400">{isBn ? 'মোট পার্সেল' : 'Total Parcels'}</span>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{report.totalOrders}</p>
            </div>
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 text-center shadow-2xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{isBn ? 'সফল ডেলিভারি' : 'Delivered'}</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{report.deliveredOrders}</p>
            </div>
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/40 text-center shadow-2xs">
              <span className="text-rose-600 dark:text-rose-400 font-bold">{isBn ? 'রিটার্ন / বাতিল' : 'Returned / Cancelled'}</span>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                {report.returnedOrders + report.cancelledOrders}
              </p>
            </div>
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-center shadow-2xs">
              <span className="text-amber-600 dark:text-amber-400 font-bold">{isBn ? 'অগ্রিম চার্জ পলিসি' : 'Advance Policy'}</span>
              <p className="text-xs font-black text-slate-900 dark:text-white mt-1">
                {report.successRate < 80 || report.riskLevel === 'high_risk'
                  ? isBn ? '⚠️ অগ্রিম আবশ্যক' : '⚠️ Advance Required'
                  : isBn ? '✅ ০ অগ্রিম (COD)' : '✅ Full COD Eligible'}
              </p>
            </div>
          </div>

          {/* Verified Source Stamp */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shadow-2xs">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-sky-400" />
              <span>{isBn ? 'ডাটাবেজ সোর্স: স্টিডফাস্ট কুরিয়ার এপিআই' : 'Source: Steadfast Courier Gateway'}</span>
            </span>
            <span className="font-mono text-slate-500">
              {new Date(report.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
