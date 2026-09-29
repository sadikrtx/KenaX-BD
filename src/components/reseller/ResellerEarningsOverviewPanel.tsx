import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  CreditCard,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building2,
  Smartphone,
  ChevronRight,
  Filter,
  Plus,
  ShieldCheck,
  Info,
  Save,
  Trash2,
  Copy,
  Users,
  Sparkles,
  Share2,
} from 'lucide-react';
import { ResellerUser, ResellerTransaction, ResellerWithdrawal, ResellerPaymentInfo } from '../../types/reseller';
import {
  cleanBDPhoneNumber,
  validateBangladeshMobile,
  isValidBDMobileNumber,
} from '../../utils/phoneUtils';

interface ResellerEarningsOverviewPanelProps {
  reseller: ResellerUser;
  transactions: ResellerTransaction[];
  withdrawals: ResellerWithdrawal[];
  lang?: 'bn' | 'en';
  onRequestWithdrawalClick: () => void;
  onAddBalanceClick?: () => void;
  onUpdatePaymentInfo?: (info: ResellerPaymentInfo) => void;
}

export const ResellerEarningsOverviewPanel: React.FC<ResellerEarningsOverviewPanelProps> = ({
  reseller,
  transactions,
  withdrawals,
  lang = 'bn',
  onRequestWithdrawalClick,
  onAddBalanceClick,
  onUpdatePaymentInfo,
}) => {
  const isBn = lang === 'bn';
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '3m' | '1y'>('30d');
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Saved Account Numbers Form State
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<ResellerPaymentInfo>(() => ({
    bkash: reseller.paymentInfo?.bkash || '01711223344',
    nagad: reseller.paymentInfo?.nagad || '01899887766',
    rocket: reseller.paymentInfo?.rocket || '',
    bankName: reseller.paymentInfo?.bankName || 'City Bank Limited',
    bankAccount: reseller.paymentInfo?.bankAccount || '110293847501',
    bankBranch: reseller.paymentInfo?.bankBranch || 'Dhanmondi Branch',
    accountHolderName: reseller.paymentInfo?.accountHolderName || reseller.fullName,
  }));

  const handleSavePaymentInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentForm.bkash?.trim()) {
      const cleanBkash = cleanBDPhoneNumber(paymentForm.bkash);
      const val = validateBangladeshMobile(cleanBkash, { lang: isBn ? 'bn' : 'en' });
      if (!val.isValid) {
        alert(val.error || (isBn ? 'সঠিক বিকাশ মোবাইল নম্বর দিন।' : 'Enter a valid bKash mobile number.'));
        return;
      }
    }
    if (paymentForm.nagad?.trim()) {
      const cleanNagad = cleanBDPhoneNumber(paymentForm.nagad);
      const val = validateBangladeshMobile(cleanNagad, { lang: isBn ? 'bn' : 'en' });
      if (!val.isValid) {
        alert(val.error || (isBn ? 'সঠিক নগদ মোবাইল নম্বর দিন।' : 'Enter a valid Nagad mobile number.'));
        return;
      }
    }
    if (paymentForm.rocket?.trim()) {
      const cleanRocket = cleanBDPhoneNumber(paymentForm.rocket);
      const val = validateBangladeshMobile(cleanRocket, { lang: isBn ? 'bn' : 'en' });
      if (!val.isValid) {
        alert(val.error || (isBn ? 'সঠিক রকেট মোবাইল নম্বর দিন।' : 'Enter a valid Rocket mobile number.'));
        return;
      }
    }

    if (onUpdatePaymentInfo) {
      onUpdatePaymentInfo(paymentForm);
    }
    setIsEditingPayment(false);
    setToastMsg(isBn ? 'আপনার পেমেন্ট অ্যাকাউন্ট নম্বর সফলভাবে সংরক্ষিত হয়েছে!' : 'Payment account details saved successfully!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCopyReferral = () => {
    const refLink = `https://kenaxbd.com/join?ref=${reseller.referralCode || reseller.id}`;
    navigator.clipboard.writeText(refLink);
    setCopiedReferral(true);
    setToastMsg(isBn ? 'রেফারেল লিংক কপি হয়েছে!' : 'Referral link copied!');
    setTimeout(() => {
      setCopiedReferral(false);
      setToastMsg(null);
    }, 2500);
  };

  // Simulated chart data
  const chartData = useMemo(() => {
    if (timeRange === '7d') {
      return [
        { label: isBn ? 'সোম' : 'Mon', profit: 650, sales: 3200 },
        { label: isBn ? 'মঙ্গল' : 'Tue', profit: 920, sales: 4500 },
        { label: isBn ? 'বুধ' : 'Wed', profit: 1250, sales: 5800 },
        { label: isBn ? 'বৃহঃ' : 'Thu', profit: 800, sales: 3900 },
        { label: isBn ? 'শুক্র' : 'Fri', profit: 1450, sales: 7100 },
        { label: isBn ? 'শনি' : 'Sat', profit: 2100, sales: 9800 },
        { label: isBn ? 'রবি' : 'Sun', profit: 1850, sales: 8600 },
      ];
    } else if (timeRange === '30d') {
      return [
        { label: isBn ? 'সপ্তাহ ১' : 'Wk 1', profit: 4500, sales: 22000 },
        { label: isBn ? 'সপ্তাহ ২' : 'Wk 2', profit: 6800, sales: 31000 },
        { label: isBn ? 'সপ্তাহ ৩' : 'Wk 3', profit: 5400, sales: 26500 },
        { label: isBn ? 'সপ্তাহ ৪' : 'Wk 4', profit: 8900, sales: 42000 },
      ];
    } else {
      return [
        { label: isBn ? 'জানু' : 'Jan', profit: 18500, sales: 92000 },
        { label: isBn ? 'ফেব্রু' : 'Feb', profit: 24200, sales: 118000 },
        { label: isBn ? 'মার্চ' : 'Mar', profit: 29800, sales: 145000 },
      ];
    }
  }, [timeRange, isBn]);

  const maxProfitInChart = Math.max(...chartData.map((d) => d.profit), 1000);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 dark:text-white">
              {isBn ? 'উপার্জন ও ওয়ালেট ব্যালেন্স' : 'Earnings & Wallet'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {isBn ? 'লাইভ ব্যালেন্স' : 'Live Balance'}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {isBn
              ? 'আপনার সর্বমোট উপার্জিত লাভ, কুরিয়ার পেন্ডিং ব্যালেন্স ও ইনস্ট্যান্ট উইথড্রল।'
              : 'Lifetime profit margins, in-transit funds, and instant withdrawals.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onAddBalanceClick && (
            <button
              type="button"
              onClick={onAddBalanceClick}
              className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isBn ? 'ডিপোজিট' : 'Deposit'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRequestWithdrawalClick}
            className="flex-1 sm:flex-none px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{isBn ? 'উইথড্রল করুন ↗' : 'Withdraw ↗'}</span>
          </button>
        </div>
      </div>

      {/* Main 4 KPI Balances */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Available Wallet Balance */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/80 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5 sm:space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
            <span className="truncate">{isBn ? 'উত্তোলনযোগ্য ব্যালেন্স' : 'Available'}</span>
            <DollarSign className="w-3.5 h-3.5 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
            ৳{reseller.walletBalance.toLocaleString('en-BD')}
          </p>
          <div className="pt-1.5 flex items-center justify-between text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-300 font-bold border-t border-emerald-200 dark:border-emerald-800/60">
            <span className="truncate">{isBn ? 'রেডি' : 'Ready'}</span>
            <button
              type="button"
              onClick={onRequestWithdrawalClick}
              className="underline hover:text-emerald-800 dark:hover:text-white cursor-pointer shrink-0"
            >
              {isBn ? 'টাকা তুলুন ↗' : 'Withdraw ↗'}
            </button>
          </div>
        </div>

        {/* Pending In-Transit Profit */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 sm:space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400">
            <span className="truncate">{isBn ? 'কুরিয়ার পেন্ডিং' : 'In-Transit'}</span>
            <Clock className="w-3.5 h-3.5 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
            ৳{reseller.pendingProfit.toLocaleString('en-BD')}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800 truncate">
            {isBn ? 'ডেলিভারিতে যুক্ত হবে' : 'Unlocks on delivery'}
          </p>
        </div>

        {/* Lifetime Total Earnings */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 sm:space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold uppercase text-purple-600 dark:text-purple-400">
            <span className="truncate">{isBn ? 'মোট লাভ' : 'Total Profit'}</span>
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-purple-600 dark:text-purple-400 tabular-nums">
            ৳{reseller.totalProfit.toLocaleString('en-BD')}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800 truncate">
            {isBn ? 'সর্বমোট মার্জিন লাভ' : 'Cumulative margin'}
          </p>
        </div>

        {/* Total Withdrawn */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 sm:space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold uppercase text-sky-400">
            <span className="truncate">{isBn ? 'মোট উত্তোলিত' : 'Withdrawn'}</span>
            <Receipt className="w-3.5 h-3.5 shrink-0" />
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-black text-sky-400 tabular-nums">
            ৳{reseller.totalWithdrawn.toLocaleString('en-BD')}
          </p>
          <p className="text-[10px] sm:text-[11px] text-slate-500 pt-1.5 border-t border-slate-800 truncate">
            {isBn ? 'পরিশোধিত অর্থ' : 'Paid to accounts'}
          </p>
        </div>
      </div>

      {/* Saved Payout Accounts Manager (bKash & Nagad Account Saving System) */}
      <div className="bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-black text-white">
                {isBn ? 'সংরক্ষিত পেমেন্ট অ্যাকাউন্ট (bKash & Nagad)' : 'Saved Payout Accounts'}
              </h3>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
              {isBn
                ? 'উইথড্র করার সময় আর বারবার নম্বর লিখতে হবে না।'
                : 'Save accounts for 1-tap seamless withdrawals.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingPayment(!isEditingPayment)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
          >
            {isEditingPayment ? (isBn ? 'বাতিল করুন' : 'Cancel') : (isBn ? 'অ্যাকাউন্ট সম্পাদনা / পরিবর্তন' : 'Edit Accounts')}
          </button>
        </div>

        {isEditingPayment ? (
          <form onSubmit={handleSavePaymentInfo} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* bKash */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isBn ? 'বিকাশ পার্সোনাল নম্বর (১১ ডিজিট):' : 'bKash Personal No (11-Digit):'}</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={paymentForm.bkash || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bkash: cleanBDPhoneNumber(e.target.value) })}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-pink-500"
                />
              </div>

              {/* Nagad */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isBn ? 'নগদ পার্সোনাল নম্বর (১১ ডিজিট):' : 'Nagad Personal No (11-Digit):'}</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={paymentForm.nagad || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, nagad: cleanBDPhoneNumber(e.target.value) })}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-amber-500"
                />
              </div>

              {/* Rocket */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{isBn ? 'রকেট নম্বর (১১ ডিজিট - ঐচ্ছিক):' : 'Rocket No (11-Digit - Optional):'}</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={paymentForm.rocket || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, rocket: cleanBDPhoneNumber(e.target.value) })}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-purple-500"
                />
              </div>
            </div>

            {/* Bank details */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'ব্যাংক ট্রান্সফার তথ্য (Bank Details):' : 'Bank Transfer Information:'}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    {isBn ? 'ব্যাংকের নাম' : 'Bank Name'}
                  </label>
                  <input
                    type="text"
                    value={paymentForm.bankName || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                    placeholder="e.g. City Bank / Islami Bank"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    {isBn ? 'অ্যাকাউন্ট নম্বর' : 'Account Number'}
                  </label>
                  <input
                    type="text"
                    value={paymentForm.bankAccount || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, bankAccount: e.target.value })}
                    placeholder="e.g. 110293847501"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">
                    {isBn ? 'ব্রাঞ্চ ও হোল্ডারের নাম' : 'Branch & Holder Name'}
                  </label>
                  <input
                    type="text"
                    value={paymentForm.accountHolderName || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, accountHolderName: e.target.value })}
                    placeholder="Full Name as on Bank"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isBn ? 'সংরক্ষণ করুন' : 'Save Accounts'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* bKash Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-pink-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                  ৳
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-300">bKash (বিকাশ)</p>
                  <p className="text-xs font-black text-white font-mono">{paymentForm.bkash || 'সংরক্ষণ করা হয়নি'}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                {isBn ? 'সংরক্ষিত' : 'Saved'}
              </span>
            </div>

            {/* Nagad Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  ৳
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-300">Nagad (নগদ)</p>
                  <p className="text-xs font-black text-white font-mono">{paymentForm.nagad || 'সংরক্ষণ করা হয়নি'}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                {isBn ? 'সংরক্ষিত' : 'Saved'}
              </span>
            </div>

            {/* Bank Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-sky-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-300">{paymentForm.bankName || 'City Bank'}</p>
                  <p className="text-xs font-black text-white font-mono">{paymentForm.bankAccount || '110293847501'}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                {isBn ? 'সংরক্ষিত' : 'Saved'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Locked Referral Earnings & Bonus Section ('আপকামিং' - Locked for future development) */}
      <div className="relative p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-amber-500/20 space-y-4 overflow-hidden shadow-lg">
        {/* Top Upcoming Tag & Lock Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
                <span>🔒 আপকামিং</span>
                <span>(Upcoming)</span>
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-bold text-amber-400">
                {isBn ? 'এই সেকশনটি বর্তমানে লক অবস্থায় রয়েছে' : 'This feature is currently locked'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mt-1.5 flex items-center gap-2">
              <span>{isBn ? 'রেফারেল উপার্জন ও বোনাস আর্নিং' : 'Referral Earnings & Bonus Rewards'}</span>
              <span className="text-[10px] font-black text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800/60 uppercase">
                {isBn ? 'লকড' : 'Locked'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {isBn
                ? 'এই ফিচারটির কার্যক্রম বর্তমানে প্রক্রিয়াধীন রয়েছে (আপকামিং)। ভবিষ্যতে নেটওয়ার্ক রেফারেল সিস্টেম উন্মুক্ত হলে অন্যান্য রিসেলারদের রেফার করে সরাসরি তাদের সেলস থেকে লাইফটাইম কমিশন ও সাপ্তাহিক বোনাস ওয়ালেটে জমা হবে।'
                : 'Referral earnings and network bonus features will be available soon in upcoming platform updates.'}
            </p>
          </div>

          {/* Referral Stats Pill (Locked) */}
          <div className="text-right shrink-0 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 opacity-80">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">
              {isBn ? 'রেফারেল বোনাস স্ট্যাটাস' : 'Referral Status'}
            </span>
            <span className="text-xs sm:text-sm font-black text-amber-400 flex items-center justify-end gap-1 mt-0.5">
              <span>🔒 {isBn ? 'আপকামিং (লক করা)' : 'Upcoming (Locked)'}</span>
            </span>
          </div>
        </div>

        {/* Disabled Link Box with Lock Notice */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 font-bold text-base shadow-xs">
              🔒
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-200">
                {isBn ? 'রেফারেল নেটওয়ার্ক প্রোগ্রাম বর্তমানে স্থগিত রয়েছে' : 'Referral Program is currently on hold'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isBn
                  ? 'অ্যাডমিন থেকে এই সেকশনটি চালু হলে আপনার ব্যক্তিগত রেফারেল কোড ও বোনাস হিস্ট্রি স্বয়ংক্রিয়ভাবে সক্রিয় হবে।'
                  : 'Referral links and payout tracking will be activated once unlocked by the admin.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-slate-700/60 shrink-0 opacity-80"
          >
            <span>🔒 {isBn ? 'আপকামিং - শীঘ্রই আসছে' : 'Upcoming - Locked'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
