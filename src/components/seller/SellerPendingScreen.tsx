import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Edit,
  PhoneCall,
  LogOut,
  Sparkles,
  ShieldAlert,
  CreditCard,
  Building2,
  Check,
  Package,
  HelpCircle,
  MessageSquare,
  X,
} from 'lucide-react';
import { SellerUser, SellerPlanId } from '../../types/seller';
import { getSellerPlans, saveSellers, getSellers, setActiveSellerSession } from '../../lib/sellerStorage';
import { getPartnersFromStorage, savePartnersToStorage } from '../../lib/partnerStorage';

interface SellerPendingScreenProps {
  seller: SellerUser;
  onLogout: () => void;
  onStatusUpdated?: (updatedSeller: SellerUser) => void;
}

export const SellerPendingScreen: React.FC<SellerPendingScreenProps> = ({
  seller,
  onLogout,
  onStatusUpdated,
}) => {
  const plans = getSellerPlans();
  const selectedPlan =
    plans.find((p) => p.id === (seller.selectedPlanId || seller.planId)) || plans[0];

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // Form for updating TxID
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'none'>(
    seller.paymentMethod || 'bkash'
  );
  const [senderNumber, setSenderNumber] = useState(seller.paymentSenderNumber || seller.phone || '');
  const [txId, setTxId] = useState(seller.paymentTxId || '');
  const [proofNote, setProofNote] = useState(seller.paymentProofNote || '');

  // Handle Manual Refresh Status check
  const handleRefreshStatus = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const allSellers = getSellers();
      const latest = allSellers.find((s) => s.id === seller.id || s.username === seller.username);

      if (latest) {
        if (latest.accountStatus === 'active' || latest.verificationStatus === 'verified') {
          setNoticeMsg('🎉 আপনার একাউন্টটি অ্যাডমিন কর্তৃক এপ্রুভ হয়েছে! রিডাইরেক্ট করা হচ্ছে...');
          setTimeout(() => {
            if (onStatusUpdated) onStatusUpdated(latest);
          }, 1500);
        } else {
          setNoticeMsg('স্ট্যাটাস আপডেট: এখনও অ্যাডমিন প্যানেল থেকে ট্রানজেকশন ভেরিফিকেশন চলমান আছে।');
          if (onStatusUpdated) onStatusUpdated(latest);
        }
      } else {
        setNoticeMsg('একাউন্ট আপডেট চেক সম্পন্ন হয়েছে।');
      }
      setIsRefreshing(false);
    }, 800);
  };

  // Save updated payment TrxID
  const handleSaveUpdatedPayment = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedSeller: SellerUser = {
      ...seller,
      paymentMethod,
      paymentSenderNumber: senderNumber.trim(),
      paymentTxId: txId.trim(),
      paymentProofNote: proofNote.trim(),
      paymentSubmittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update in SellerStorage
    const allSellers = getSellers().map((s) => (s.id === seller.id ? updatedSeller : s));
    saveSellers(allSellers);
    setActiveSellerSession(updatedSeller);

    // Sync in PartnerStorage
    const allPartners = getPartnersFromStorage().map((p) => {
      if (p.id === seller.id || p.username === seller.username) {
        return {
          ...p,
          paymentMethod,
          paymentSenderNumber: senderNumber.trim(),
          paymentTxId: txId.trim(),
          paymentSubmittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    savePartnersToStorage(allPartners);

    setIsEditModalOpen(false);
    setNoticeMsg('আপনার ট্রানজেকশন তথ্য সফলভাবে আপডেট হয়েছে। অ্যাডমিন টিম দ্রুত এটি রিভিউ করবে।');
    if (onStatusUpdated) onStatusUpdated(updatedSeller);
  };

  const isFreePlan = selectedPlan.id === 'basic' || selectedPlan.monthlyPrice === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-md">
            K
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white flex items-center gap-2">
              <span>{seller.store.storeName}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Pending Approval
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Seller Merchant Application Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer border border-slate-700"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>লগআউট (Logout)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Notice Alert */}
        {noticeMsg && (
          <div className="p-4 rounded-2xl bg-sky-950/80 border border-sky-800 text-sky-200 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-fade-in shadow-lg">
            <span>{noticeMsg}</span>
            <button
              onClick={() => setNoticeMsg(null)}
              className="p-1 hover:bg-sky-900/50 rounded-lg text-sky-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hero Pending Status Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 p-6 sm:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>অ্যাকাউন্ট ভেরিফিকেশন পেন্ডিং (Pending Admin Verification)</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                ধন্যবাদ! আপনার সেলার অ্যাকাউন্ট রেজিস্ট্রেশন সফলভাবে জমা হয়েছে।
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                আমাদের অ্যাডমিন টিম আপনার নির্বাচন করা{' '}
                <strong className="text-sky-400 font-bold">{selectedPlan.name}</strong> প্ল্যান ও{' '}
                {isFreePlan ? 'তথ্যসমুহ' : 'পেমেন্ট ট্রানজেকশন (TrxID)'} ম্যানুয়ালি যাচাই করছে।
                যাচাই সম্পন্ন হলে সাথে সাথে আপনার অ্যাকাউন্টটি এপ্রুভ হয়ে যাবে এবং আপনি সেলার ড্যাশবোর্ডে প্রবেশ করতে পারবেন।
              </p>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <button
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'চেক করা হচ্ছে...' : 'স্ট্যাটাস রিফ্রেশ করুন'}</span>
              </button>

              <button
                onClick={() => {
                  const updatedSeller: SellerUser = {
                    ...seller,
                    accountStatus: 'active',
                    verificationStatus: 'verified',
                    subscriptionStatus: 'active',
                    subscriptionStartDate: new Date().toISOString(),
                    subscriptionEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  const allSellers = getSellers().map((s) => (s.id === seller.id ? updatedSeller : s));
                  saveSellers(allSellers);
                  savePartnersToStorage(
                    getPartnersFromStorage().map((p) =>
                      p.id === seller.id || p.username === seller.username ? { ...p, status: 'active' } : p
                    )
                  );
                  setActiveSellerSession(updatedSeller);
                  alert('🎉 Demo Auto-Approval Success! Dashboard access granted for 30 days.');
                  if (onStatusUpdated) onStatusUpdated(updatedSeller);
                }}
                className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>⚡ Instant Demo Approve</span>
              </button>

              <a
                href="https://wa.me/8801700000000?text=Hello%20Admin,%20I%20registered%20as%20seller%20and%20waiting%20for%20approval"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>হোয়াটসঅ্যাপে যোগাযোগ</span>
              </a>
            </div>
          </div>
        </div>

        {/* Details Section: 2 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Selected Plan Details Card */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                <h3 className="font-extrabold text-sm text-white">নির্বাচিত সেলার প্ল্যান (Selected Plan)</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {selectedPlan.id}
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">
                  {selectedPlan.monthlyPrice === 0
                    ? 'ফ্রি (Free Starter)'
                    : `৳${selectedPlan.monthlyPrice.toLocaleString('en-BD')}`}
                </span>
                {selectedPlan.monthlyPrice > 0 && (
                  <span className="text-xs text-slate-400 font-medium">/ মাস (Monthly)</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{selectedPlan.name}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex justify-between py-1 text-slate-300">
                <span className="text-slate-400">প্রোডাক্ট আপলোড লিমিট:</span>
                <span className="font-bold text-white">
                  {selectedPlan.productLimit === -1 ? 'আনলিমিটেড (Unlimited)' : `${selectedPlan.productLimit} টি প্রোডাক্ট`}
                </span>
              </div>
              <div className="flex justify-between py-1 text-slate-300">
                <span className="text-slate-400">মার্কেটপ্লেস কমিশন:</span>
                <span className="font-bold text-emerald-400">{selectedPlan.commissionRate}% কমিশন</span>
              </div>
              <div className="flex justify-between py-1 text-slate-300">
                <span className="text-slate-400">কাস্টম ডোমেইন সাপোর্ট:</span>
                <span className="font-bold text-white">
                  {selectedPlan.customDomainSupport ? 'হ্যাঁ (Included)' : 'না (Standard)'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                ফিচারসমূহ (Plan Features):
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {selectedPlan.features.slice(0, 5).map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Submitted Payment / Application Details Card */}
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 space-y-4 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-extrabold text-sm text-white">পেমেন্ট ও আবেদন তথ্য (Payment & Submission)</h3>
                </div>
                {!isFreePlan && (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-1 text-xs font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>এডিট ট্রানজেকশন</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 pt-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">শপের নাম:</span>
                  <span className="font-bold text-white">{seller.store.storeName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">মালিকের নাম:</span>
                  <span className="font-bold text-white">{seller.fullName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">মোবাইল নম্বর:</span>
                  <span className="font-bold text-white">{seller.phone}</span>
                </div>

                {!isFreePlan ? (
                  <>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">পেমেন্ট মেথড:</span>
                      <span className="font-extrabold uppercase text-sky-400">
                        {seller.paymentMethod || 'bKash'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">প্রেরক অ্যাকাউন্ট/নম্বর:</span>
                      <span className="font-mono font-bold text-white">
                        {seller.paymentSenderNumber || seller.phone}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                      <span className="text-slate-400">ট্রানজেকশন আইডি (TrxID):</span>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {seller.paymentTxId || 'Not provided'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">জমার সময়:</span>
                      <span className="font-mono text-slate-300 text-[11px]">
                        {seller.paymentSubmittedAt
                          ? new Date(seller.paymentSubmittedAt).toLocaleString('en-BD')
                          : new Date(seller.createdAt).toLocaleString('en-BD')}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-slate-300 text-xs leading-relaxed mt-2">
                    💡 আপনি ফ্রি স্টার্টার প্ল্যান সিলেক্ট করেছেন। কোন ধরনের পেমেন্ট ফি প্রয়োজন নেই। অ্যাডমিন কর্তৃক অ্যাকাউন্ট রিভিউ সম্পন্ন হওয়া মাত্রই অ্যাকাউন্ট সচল হবে।
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-[11px] text-slate-400 leading-normal">
                সাধারণত ২ থেকে ৬ ঘণ্টার মধ্যে অ্যাডমিন ভেরিফিকেশন সম্পন্ন হয়। জরুরি প্রয়োজনে আমাদের হেল্পলাইনে যোগাযোগ করুন।
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-slate-900 bg-slate-950 text-[11px] text-slate-500 flex items-center justify-center px-4">
        <span>© {new Date().getFullYear()} KenaX BD Seller Merchant Network. All Rights Reserved.</span>
      </footer>

      {/* Edit Payment Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 relative shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-sky-400" />
                <span>পেমেন্ট তথ্য আপডেট করুন</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpdatedPayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">পেমেন্ট মেথড (Payment Gateway)</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['bkash', 'nagad', 'rocket', 'bank'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-xl font-extrabold uppercase border text-center transition-all ${
                        paymentMethod === m
                          ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">যে নম্বর/অ্যাকাউন্ট থেকে টাকা পাঠিয়েছেন</label>
                <input
                  type="text"
                  required
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="01700000000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">সঠিক ট্রানজেকশন আইডি (TrxID)</label>
                <input
                  type="text"
                  required
                  value={txId}
                  onChange={(e) => setTxId(e.target.value)}
                  placeholder="e.g. 8XM912K3"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 focus:outline-hidden focus:border-sky-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">অতিরিক্ত কোনো নোট (Optional)</label>
                <textarea
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="আপনার কোনো বার্তা বা রেফারেন্স নাম্বার..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-md cursor-pointer"
                >
                  আপডেট তথ্য জমা দিন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerPendingScreen;
