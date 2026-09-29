import React, { useState } from 'react';
import {
  Store,
  Boxes,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Globe,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Phone,
  Building2,
  Check,
  ChevronRight,
  TrendingUp,
  Truck,
  DollarSign,
  Package,
  CreditCard,
  Clock,
  Zap,
} from 'lucide-react';
import { PartnerUser, PartnerRole } from '../../types';
import { authenticatePartner, savePartnersToStorage, getPartnersFromStorage } from '../../lib/partnerStorage';
import { saveSellers, getSellers, setActiveSellerSession, getSellerPlans } from '../../lib/sellerStorage';
import { SellerUser, SellerPlanId } from '../../types/seller';
import {
  cleanBDPhoneNumber,
  validateBangladeshMobile,
  isValidBDMobileNumber,
} from '../../utils/phoneUtils';

interface PartnerLoginPageProps {
  initialRole?: PartnerRole;
  onLoginSuccess: (partner: PartnerUser) => void;
  onBackToStore: () => void;
}

export const PartnerLoginPage: React.FC<PartnerLoginPageProps> = ({
  initialRole = 'seller',
  onLoginSuccess,
  onBackToStore,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<PartnerRole>(initialRole);
  const [lang, setLang] = useState<'bn' | 'en'>('bn');

  // Seller Registration Steps: 'plans' -> 'details'
  const [regStep, setRegStep] = useState<'plans' | 'details'>('plans');
  const [selectedPlanId, setSelectedPlanId] = useState<SellerPlanId>('standard');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Payment details for paid plans
  const [paymentGateway, setPaymentGateway] = useState<'bkash' | 'nagad' | 'rocket' | 'bank'>('bkash');
  const [paymentSenderPhone, setPaymentSenderPhone] = useState('');
  const [paymentTxId, setPaymentTxId] = useState('');
  const [paymentProofNote, setPaymentProofNote] = useState('');

  // Login Form
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Register Form
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regShopName, setRegShopName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regCity, setRegCity] = useState('Dhaka');
  const [regAddress, setRegAddress] = useState('');
  const [regAgreed, setRegAgreed] = useState(true);

  const sellerPlans = getSellerPlans();
  const currentSelectedPlan = sellerPlans.find((p) => p.id === selectedPlanId) || sellerPlans[1];

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const partner = authenticatePartner(identifier, password, selectedRole);
    if (partner) {
      onLoginSuccess(partner);
    } else {
      setErrorMsg(
        lang === 'bn'
          ? 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে সঠিক তথ্য প্রদান করুন।'
          : 'Invalid credentials or account suspended. Please verify your username and password.'
      );
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (regPassword !== regConfirmPassword) {
      setErrorMsg(lang === 'bn' ? 'উভয় পাসওয়ার্ড একই হতে হবে।' : 'Passwords do not match.');
      return;
    }

    if (!regAgreed) {
      setErrorMsg(
        lang === 'bn'
          ? 'অনুগ্রহ করে টার্মস ও কন্ডিশনে সম্মতি দিন।'
          : 'Please agree to terms and conditions.'
      );
      return;
    }

    const cleanPhone = cleanBDPhoneNumber(regPhone);
    const phoneValidation = validateBangladeshMobile(cleanPhone, { lang });
    if (!phoneValidation.isValid) {
      setErrorMsg(phoneValidation.error || (lang === 'bn' ? 'সঠিক মোবাইল নম্বর দিন।' : 'Enter a valid mobile number.'));
      return;
    }

    const cleanUsername = regUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const allPartners = getPartnersFromStorage();

    if (allPartners.some((p) => p.username.toLowerCase() === cleanUsername)) {
      setErrorMsg(
        lang === 'bn'
          ? 'এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে। অন্য একটি ইউজারনেম বেছে নিন।'
          : 'Username is already taken. Please choose another.'
      );
      return;
    }

    const isFreePlan = currentSelectedPlan.id === 'basic' || currentSelectedPlan.monthlyPrice === 0;

    // Validate Payment Info for Paid Plan
    if (selectedRole === 'seller' && !isFreePlan) {
      if (paymentSenderPhone.trim()) {
        const cleanSenderPhone = cleanBDPhoneNumber(paymentSenderPhone);
        const senderPhoneVal = validateBangladeshMobile(cleanSenderPhone, { lang });
        if (!senderPhoneVal.isValid) {
          setErrorMsg(senderPhoneVal.error || (lang === 'bn' ? 'সঠিক প্রেরক মোবাইল নম্বর দিন।' : 'Enter a valid sender mobile number.'));
          return;
        }
      }
      if (!paymentTxId.trim()) {
        setErrorMsg(
          lang === 'bn'
            ? 'পেইড প্ল্যানের ক্ষেত্রে অনুগ্রহ করে সঠিক ট্রানজেকশন আইডি (TrxID) প্রদান করুন।'
            : 'Please enter your payment Transaction ID (TrxID) for paid subscription.'
        );
        return;
      }
    }

    const newPartnerId = `${selectedRole.toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const planPrice = billingCycle === 'yearly' ? currentSelectedPlan.yearlyPrice : currentSelectedPlan.monthlyPrice;

    const newPartner: PartnerUser = {
      id: newPartnerId,
      type: selectedRole,
      name: regFullName.trim(),
      shopName: regShopName.trim() || regFullName.trim(),
      phone: regPhone.trim(),
      email: regEmail.trim(),
      username: cleanUsername,
      password: regPassword,
      status: selectedRole === 'seller' ? 'pending' : 'active',
      planId: selectedPlanId,
      selectedPlanId: selectedPlanId,
      billingCycle: billingCycle,
      paymentMethod: selectedRole === 'seller' ? (isFreePlan ? 'none' : paymentGateway) : undefined,
      paymentSenderNumber: selectedRole === 'seller' ? paymentSenderPhone.trim() || regPhone.trim() : undefined,
      paymentTxId: selectedRole === 'seller' ? paymentTxId.trim() : undefined,
      paymentAmount: selectedRole === 'seller' ? planPrice : undefined,
      paymentProofNote: selectedRole === 'seller' ? paymentProofNote.trim() : undefined,
      paymentSubmittedAt: new Date().toISOString(),
      commissionRate: selectedRole === 'seller' ? currentSelectedPlan.commissionRate : 15,
      walletBalance: 0,
      totalEarnings: 0,
      totalWithdrawn: 0,
      paymentDetails: {
        bkash: regPhone.trim(),
      },
      city: regCity,
      address: regAddress.trim(),
      createdAt: new Date().toISOString(),
    };

    // Save partner record
    const updatedPartners = [newPartner, ...allPartners];
    savePartnersToStorage(updatedPartners);

    // If Seller, create full SellerUser record in pending_approval state
    if (selectedRole === 'seller') {
      const allSellers = getSellers();
      const newSeller: SellerUser = {
        id: newPartner.id,
        fullName: newPartner.name,
        email: newPartner.email,
        phone: newPartner.phone,
        username: newPartner.username,
        password: newPartner.password,
        profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
        sellerType: 'registered_business',
        planId: selectedPlanId,
        selectedPlanId: selectedPlanId,
        billingCycle: billingCycle,
        paymentMethod: isFreePlan ? 'none' : paymentGateway,
        paymentSenderNumber: paymentSenderPhone.trim() || regPhone.trim(),
        paymentTxId: paymentTxId.trim(),
        paymentAmount: planPrice,
        paymentProofNote: paymentProofNote.trim(),
        paymentSubmittedAt: new Date().toISOString(),
        subscriptionStatus: 'trial',
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        onboardingStep: 1,
        onboardingCompleted: false,
        verificationStatus: 'pending',
        accountStatus: 'pending_approval',
        store: {
          storeName: newPartner.shopName,
          storeSlug: cleanUsername,
          logoUrl: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300',
          bannerUrl: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200',
          description: `Welcome to ${newPartner.shopName}! Official seller on KenaX BD.`,
          contactEmail: newPartner.email,
          contactPhone: newPartner.phone,
          address: newPartner.address || 'Dhaka, Bangladesh',
          district: newPartner.city || 'Dhaka',
          upazila: 'Central',
        },
        paymentInfo: {
          bkash: newPartner.phone,
        },
        walletBalance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        totalMarketplaceCommission: 0,
        totalWithdrawn: 0,
        rating: 5.0,
        totalReviews: 0,
        followersCount: 0,
        createdAt: new Date().toISOString(),
      };

      saveSellers([...allSellers, newSeller]);
      setActiveSellerSession(newSeller);
    }

    // Direct login success -> Will land on SellerPendingScreen for pending sellers
    onLoginSuccess(newPartner);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={onBackToStore}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'bn' ? 'মূল মার্কেটপ্লেসে ফিরে যান' : 'Back to Store'}</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer border border-slate-700"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang === 'bn' ? 'English' : 'বাংলা'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Value Proposition & Account Type Comparison */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 inline-block mb-3">
                KenaX BD Partner Network
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
                {lang === 'bn' ? 'আপনার বিজনেসের জন্য সঠিক অ্যাকাউন্ট নির্বাচন করুন' : 'Choose the Right Partner Account for Your Business'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                {lang === 'bn'
                  ? 'KenaX BD মার্কেটপ্লেসে নিজস্ব পণ্যের ভেন্ডর বা ইনভেন্টরি ছাড়া রিসেলার হিসেবে যুক্ত হয়ে ক্যারিয়ার শুরু করুন।'
                  : 'Join thousands of active sellers & resellers earning daily on Bangladesh’s premier multi-vendor e-commerce platform.'}
              </p>
            </div>

            {/* Account Types Comparison Cards */}
            <div className="space-y-3">
              {/* Option 1: Seller */}
              <div
                onClick={() => {
                  setSelectedRole('seller');
                  setErrorMsg(null);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedRole === 'seller'
                    ? 'bg-sky-950/40 border-sky-500 ring-1 ring-sky-500 shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold shrink-0 border border-sky-500/20">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>🏪 {lang === 'bn' ? 'সেলার অ্যাকাউন্ট (Seller)' : 'Become a Seller'}</span>
                      </h3>
                      {selectedRole === 'seller' && (
                        <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {lang === 'bn'
                        ? 'আপনার নিজস্ব পণ্যের দোকান তৈরি করুন, ইনভেন্টরি ও অর্ডার ম্যানেজ করে বিক্রয় করুন।'
                        : 'Sell your own physical products, set prices, package orders, and withdraw earnings.'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">Own Products</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">Manage Stock</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">Package Orders</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Reseller */}
              <div
                onClick={() => {
                  setSelectedRole('reseller');
                  setErrorMsg(null);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedRole === 'reseller'
                    ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500 shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-500/20">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>🛍️ {lang === 'bn' ? 'রিসেলার অ্যাকাউন্ট (Reseller)' : 'Become a Reseller'}</span>
                      </h3>
                      {selectedRole === 'reseller' && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {lang === 'bn'
                        ? 'কোনো ইনভেন্টরি কেনা ছাড়াই KenaX BD মার্কেটপ্লেসের পণ্য কাস্টমারদের কাছে বিক্রি করে লাভ আয় করুন।'
                        : 'Sell verified marketplace catalog products without stock. Add custom margins and earn dropship profit.'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">Zero Inventory</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">Set Custom Margins</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">Automated Delivery</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Login / Registration Card */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
              {/* Card Header & Mode Switcher */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                      selectedRole === 'seller' ? 'bg-sky-600 text-white' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {selectedRole === 'seller' ? <Store className="w-4 h-4" /> : <Boxes className="w-4 h-4" />}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">
                      {selectedRole === 'seller'
                        ? lang === 'bn'
                          ? 'সেলার পোর্টাল'
                          : 'Seller Portal'
                        : lang === 'bn'
                        ? 'রিসেলার হাব'
                        : 'Reseller Hub'}
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      {mode === 'login'
                        ? lang === 'bn'
                          ? 'আপনার অ্যাকাউন্টে সাইন ইন করুন'
                          : 'Sign in to access your dashboard'
                        : lang === 'bn'
                        ? 'নতুন অ্যাকাউন্ট রেজিস্ট্রেশন করুন'
                        : 'Create your new partner account'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      mode === 'login' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'bn' ? 'লগইন' : 'Login'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMsg(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      mode === 'register' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'bn' ? 'রেজিস্টার' : 'Register'}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* MODE 1: LOGIN FORM */}
              {mode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {lang === 'bn' ? 'ইউজারনেম বা মোবাইল নম্বর' : 'Username or Mobile Number'} *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="seller_apex or 01711..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">
                      {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'} *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-3 rounded-xl font-black text-white shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      selectedRole === 'seller'
                        ? 'bg-sky-600 hover:bg-sky-500'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    <span>
                      {selectedRole === 'seller'
                        ? lang === 'bn'
                          ? 'সেলার ড্যাশবোর্ডে প্রবেশ করুন'
                          : 'Enter Seller Dashboard'
                        : lang === 'bn'
                        ? 'রিসেলার ড্যাশবোর্ডে প্রবেশ করুন'
                        : 'Enter Reseller Dashboard'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <p>
                      <strong>Demo Seller Login:</strong> <code className="text-sky-400 font-bold">seller_apex</code> / <code className="text-sky-400">seller123</code>
                    </p>
                    <p>
                      <strong>Demo Reseller Login:</strong> <code className="text-emerald-400 font-bold">reseller_dhaka</code> / <code className="text-emerald-400">reseller123</code>
                    </p>
                  </div>
                </form>
              )}

              {/* MODE 2: REGISTRATION FORM */}
              {mode === 'register' && (
                <div className="space-y-4">
                  {/* Step Switcher Header for Seller */}
                  {selectedRole === 'seller' && (
                    <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setRegStep('plans')}
                        className={`flex-1 py-1.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                          regStep === 'plans'
                            ? 'bg-sky-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>১. প্ল্যান নির্বাচন (Select Plan)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRegStep('details')}
                        className={`flex-1 py-1.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                          regStep === 'details'
                            ? 'bg-sky-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>২. অ্যাকাউন্ট ও পেমেন্ট (Details & Payment)</span>
                      </button>
                    </div>
                  )}

                  {/* SELLER STEP 1: PLANS SELECTION */}
                  {selectedRole === 'seller' && regStep === 'plans' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-black text-white flex items-center gap-2">
                            <span>সাবস্ক্রিপশন প্ল্যান বেছে নিন</span>
                            <Sparkles className="w-4 h-4 text-sky-400" />
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            আপনার ব্যবসার প্রয়োজন অনুযায়ী প্ল্যান সিলেক্ট করুন।
                          </p>
                        </div>

                        {/* Billing Cycle Switcher */}
                        <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-bold">
                          <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-2.5 py-1 rounded-lg ${
                              billingCycle === 'monthly' ? 'bg-sky-600 text-white' : 'text-slate-400'
                            }`}
                          >
                            মাসিক (Monthly)
                          </button>
                          <button
                            type="button"
                            onClick={() => setBillingCycle('yearly')}
                            className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                              billingCycle === 'yearly' ? 'bg-sky-600 text-white' : 'text-slate-400'
                            }`}
                          >
                            <span>বার্ষিক (Yearly)</span>
                            <span className="text-[9px] px-1 rounded bg-amber-400 text-slate-950 font-black">
                              20% OFF
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* 3 Plans Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {sellerPlans.map((plan) => {
                          const isSelected = selectedPlanId === plan.id;
                          const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

                          return (
                            <div
                              key={plan.id}
                              onClick={() => setSelectedPlanId(plan.id)}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-sky-950/60 border-sky-500 ring-2 ring-sky-500/50 shadow-xl'
                                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {plan.id === 'standard' && (
                                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-400 text-slate-950 shadow-md">
                                  Most Popular
                                </span>
                              )}

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-extrabold text-xs text-white">{plan.name}</h4>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                                </div>

                                <div className="font-mono">
                                  <span className="text-lg font-black text-white">
                                    {plan.monthlyPrice === 0 ? '৳০ (Free)' : `৳${price.toLocaleString('en-BD')}`}
                                  </span>
                                  {plan.monthlyPrice > 0 && (
                                    <span className="text-[10px] text-slate-400">
                                      /{billingCycle === 'yearly' ? 'বছর' : 'মাস'}
                                    </span>
                                  )}
                                </div>

                                <ul className="space-y-1 text-[11px] text-slate-300 pt-2 border-t border-slate-800/80">
                                  <li className="flex items-center gap-1.5">
                                    <Check className="w-3 h-3 text-sky-400 shrink-0" />
                                    <span>
                                      {plan.productLimit === -1 ? 'আনলিমিটেড প্রোডাক্ট' : `${plan.productLimit} টি প্রোডাক্ট`}
                                    </span>
                                  </li>
                                  <li className="flex items-center gap-1.5">
                                    <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span>{plan.commissionRate}% কমিশন</span>
                                  </li>
                                  <li className="flex items-center gap-1.5 text-slate-400">
                                    <Check className="w-3 h-3 text-slate-500 shrink-0" />
                                    <span>
                                      {plan.customDomainSupport ? 'কাস্টম ডোমেইন সহ' : 'স্ট্যান্ডার্ড স্টোর'}
                                    </span>
                                  </li>
                                </ul>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPlanId(plan.id);
                                  setRegStep('details');
                                }}
                                className={`w-full mt-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-sky-600 text-white hover:bg-sky-500 shadow-md'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {isSelected ? 'সিলেক্ট করা হয়েছে ➔' : 'প্ল্যান বেছে নিন'}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setRegStep('details')}
                        className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>
                          {currentSelectedPlan.name} (৳
                          {(billingCycle === 'yearly'
                            ? currentSelectedPlan.yearlyPrice
                            : currentSelectedPlan.monthlyPrice
                          ).toLocaleString('en-BD')}
                          ) বেছে নিয়ে এগিয়ে যান
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* SELLER STEP 2 or RESELLER REGISTRATION */}
                  {(selectedRole === 'reseller' || regStep === 'details') && (
                    <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                      {/* Selected Plan Summary Chip for Seller */}
                      {selectedRole === 'seller' && (
                        <div className="p-3 rounded-2xl bg-sky-950/60 border border-sky-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-sky-400" />
                            <div>
                              <span className="font-extrabold text-white text-xs">
                                নির্বাচিত প্ল্যান: {currentSelectedPlan.name}
                              </span>
                              <span className="text-[11px] text-sky-300 ml-2 font-mono">
                                ৳
                                {(billingCycle === 'yearly'
                                  ? currentSelectedPlan.yearlyPrice
                                  : currentSelectedPlan.monthlyPrice
                                ).toLocaleString('en-BD')}{' '}
                                ({billingCycle})
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setRegStep('plans')}
                            className="text-[11px] font-bold text-sky-400 hover:underline"
                          >
                            পরিবর্তন
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-300 mb-1">
                            {lang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'} *
                          </label>
                          <input
                            type="text"
                            required
                            value={regFullName}
                            onChange={(e) => setRegFullName(e.target.value)}
                            placeholder="Md. Rahim Chowdhury"
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-300 mb-1">
                            {lang === 'bn' ? 'মোবাইল নম্বর (১১ ডিজিট)' : 'Mobile Number (11-Digit)'} *
                          </label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={11}
                            required
                            value={regPhone}
                            onChange={(e) => setRegPhone(cleanBDPhoneNumber(e.target.value))}
                            placeholder="01XXXXXXXXX"
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-300 mb-1">
                            {lang === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'} *
                          </label>
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="seller@example.com"
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-300 mb-1">
                            {selectedRole === 'seller'
                              ? lang === 'bn'
                                ? 'দোকানের নাম (Shop Name)'
                                : 'Shop Name *'
                              : lang === 'bn'
                              ? 'রিসেলার ব্র্যান্ড / এজেন্সির নাম'
                              : 'Reseller Business Name'} *
                          </label>
                          <input
                            type="text"
                            required
                            value={regShopName}
                            onChange={(e) => setRegShopName(e.target.value)}
                            placeholder={selectedRole === 'seller' ? 'Apex Gadgets BD' : 'Dhaka Express Dropship'}
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-bold text-slate-300 mb-1">
                            {lang === 'bn' ? 'ইউজারনেম' : 'Username'} *
                          </label>
                          <input
                            type="text"
                            required
                            value={regUsername}
                            onChange={(e) => setRegUsername(e.target.value)}
                            placeholder="apexgadgets"
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-300 mb-1">
                            {lang === 'bn' ? 'পাসওয়ার্ড' : 'Password'} *
                          </label>
                          <input
                            type="password"
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-300 mb-1">
                            {lang === 'bn' ? 'কনফার্ম পাসওয়ার্ড' : 'Confirm'} *
                          </label>
                          <input
                            type="password"
                            required
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-slate-300 mb-1">
                            {lang === 'bn' ? 'জেলা / শহর' : 'District / City'}
                          </label>
                          <input
                            type="text"
                            value={regCity}
                            onChange={(e) => setRegCity(e.target.value)}
                            placeholder="Dhaka"
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-300 mb-1">
                            {lang === 'bn' ? 'ঠিকানা' : 'Address'}
                          </label>
                          <input
                            type="text"
                            value={regAddress}
                            onChange={(e) => setRegAddress(e.target.value)}
                            placeholder="Dhanmondi, Dhaka"
                            className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500"
                          />
                        </div>
                      </div>

                      {/* Payment Submission Section for Paid Seller Plans */}
                      {selectedRole === 'seller' && currentSelectedPlan.monthlyPrice > 0 && (
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 pt-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4 text-emerald-400" />
                              <span>সাবস্ক্রিপশন পেমেন্ট তথ্য (Subscription Payment)</span>
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400 font-bold">
                              প্রদেয়: ৳
                              {(billingCycle === 'yearly'
                                ? currentSelectedPlan.yearlyPrice
                                : currentSelectedPlan.monthlyPrice
                              ).toLocaleString('en-BD')}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-[11px] text-amber-200 leading-normal">
                            📌 বিকাশ/নগদ <strong>01711002233</strong> এ Send Money/Payment করুন এবং নিচে ট্রানজেকশন নাম্বার (TrxID) দিন।
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block font-bold text-slate-300 mb-1">পেমেন্ট গেটওয়ে</label>
                              <select
                                value={paymentGateway}
                                onChange={(e) => setPaymentGateway(e.target.value as any)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white font-bold"
                              >
                                <option value="bkash">bKash (বিকাশ)</option>
                                <option value="nagad">Nagad (নগদ)</option>
                                <option value="rocket">Rocket (রকেট)</option>
                                <option value="bank">Bank Transfer</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-bold text-slate-300 mb-1">
                                {lang === 'bn' ? 'প্রেরক নম্বর (১১ ডিজিট)' : 'Sender Mobile (11-Digit)'}
                              </label>
                              <input
                                type="tel"
                                inputMode="numeric"
                                maxLength={11}
                                value={paymentSenderPhone}
                                onChange={(e) => setPaymentSenderPhone(cleanBDPhoneNumber(e.target.value))}
                                placeholder="01XXXXXXXXX"
                                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-slate-300 mb-1">ট্রানজেকশন আইডি (TrxID) *</label>
                              <input
                                type="text"
                                required
                                value={paymentTxId}
                                onChange={(e) => setPaymentTxId(e.target.value)}
                                placeholder="8XM912K3"
                                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-amber-400 font-mono font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <label className="flex items-start gap-2 pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regAgreed}
                          onChange={(e) => setRegAgreed(e.target.checked)}
                          className="mt-0.5 rounded text-sky-600 focus:ring-0"
                        />
                        <span className="text-[11px] text-slate-400 leading-tight">
                          {lang === 'bn'
                            ? 'আমি KenaX BD এর সেলার/রিসেলার নীতিমালা ও পলিসির সাথে সম্মত।'
                            : 'I agree to KenaX BD Marketplace Partner Terms of Service and Privacy Policy.'}
                        </span>
                      </label>

                      <button
                        type="submit"
                        className={`w-full py-3.5 rounded-2xl font-black text-white shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          selectedRole === 'seller'
                            ? 'bg-sky-600 hover:bg-sky-500'
                            : 'bg-emerald-600 hover:bg-emerald-500'
                        }`}
                      >
                        <span>
                          {selectedRole === 'seller'
                            ? lang === 'bn'
                              ? 'আবেদন জমা দিন (Submit for Approval)'
                              : 'Submit Registration for Approval'
                            : lang === 'bn'
                            ? 'রিসেলার অ্যাকাউন্ট তৈরি করুন'
                            : 'Create Reseller Account'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-12 px-4 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-center text-[11px] text-slate-500">
        <span>© {new Date().getFullYear()} KenaX BD Marketplace Engine. All rights reserved.</span>
      </footer>
    </div>
  );
};
export default PartnerLoginPage;
