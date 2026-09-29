import React, { useState } from 'react';
import {
  User,
  Store,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Building2,
  Smartphone,
  Save,
  CheckCircle2,
  ShieldCheck,
  Star,
  Globe,
  Share2,
  Calendar,
  Lock,
  DollarSign,
  Package,
  Award,
  Sparkles,
  Camera,
  RefreshCw,
  Bell,
  Check,
  Crown,
} from 'lucide-react';
import { ResellerUser, ResellerPaymentInfo } from '../../types/reseller';

interface ResellerProfilePanelProps {
  reseller: ResellerUser;
  lang: 'bn' | 'en';
  isDarkMode: boolean;
  onUpdateReseller: (updated: ResellerUser) => void;
  showToast: (msg: string) => void;
}

export const ResellerProfilePanel: React.FC<ResellerProfilePanelProps> = ({
  reseller,
  lang,
  isDarkMode,
  onUpdateReseller,
  showToast,
}) => {
  // Form State
  const [fullName, setFullName] = useState(reseller.fullName || '');
  const [businessName, setBusinessName] = useState(reseller.businessName || '');
  const [phone, setPhone] = useState(reseller.phone || '');
  const [email, setEmail] = useState(reseller.email || '');
  const [profilePhoto, setProfilePhoto] = useState(
    reseller.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300'
  );
  const [district, setDistrict] = useState(reseller.district || 'ঢাকা');
  const [area, setArea] = useState(reseller.area || 'মিরপুর');
  const [address, setAddress] = useState(reseller.address || '');

  // Payout info
  const [bkash, setBkash] = useState(reseller.paymentInfo?.bkash || '');
  const [nagad, setNagad] = useState(reseller.paymentInfo?.nagad || '');
  const [rocket, setRocket] = useState(reseller.paymentInfo?.rocket || '');
  const [bankName, setBankName] = useState(reseller.paymentInfo?.bankName || '');
  const [bankAccount, setBankAccount] = useState(reseller.paymentInfo?.bankAccount || '');
  const [bankBranch, setBankBranch] = useState(reseller.paymentInfo?.bankBranch || '');
  const [accountHolderName, setAccountHolderName] = useState(reseller.paymentInfo?.accountHolderName || '');
  const [routingNumber, setRoutingNumber] = useState(reseller.paymentInfo?.routingNumber || '');

  // Business & Social
  const [bio, setBio] = useState('স্মার্ট ড্রপশিপিং ও অনলাইন রিসেলিং পার্টনার। দ্রুত ডেলিভারি ও ১০০% অথেনটিক কোয়ালিটি।');
  const [whatsapp, setWhatsapp] = useState(reseller.phone || '');
  const [facebookPage, setFacebookPage] = useState('https://facebook.com/');

  const [isSaving, setIsSaving] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'payout' | 'business' | 'security'>('profile');

  // Preset Avatars
  const presetAvatars = [
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=300',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
  ];

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    const updatedPaymentInfo: ResellerPaymentInfo = {
      bkash: bkash.trim(),
      nagad: nagad.trim(),
      rocket: rocket.trim(),
      bankName: bankName.trim(),
      bankAccount: bankAccount.trim(),
      bankBranch: bankBranch.trim(),
      accountHolderName: accountHolderName.trim() || fullName.trim(),
      routingNumber: routingNumber.trim(),
    };

    const updatedReseller: ResellerUser = {
      ...reseller,
      fullName: fullName.trim(),
      businessName: businessName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      profilePhoto: profilePhoto.trim(),
      district: district.trim(),
      area: area.trim(),
      address: address.trim(),
      paymentInfo: updatedPaymentInfo,
      updatedAt: new Date().toISOString(),
    };

    setTimeout(() => {
      onUpdateReseller(updatedReseller);
      setIsSaving(false);
      showToast(
        lang === 'bn'
          ? '✅ আপনার প্রোফাইল ও অ্যাকাউন্ট তথ্য সফলভাবে আপডেট হয়েছে!'
          : '✅ Profile & Account information updated successfully!'
      );
    }, 400);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 text-xs">
      {/* Top Banner Card */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-2xl p-4 sm:p-6 lg:p-8 text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
          {/* Avatar with edit overlay */}
          <div className="relative group shrink-0">
            <img
              src={profilePhoto}
              alt={fullName}
              className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl object-cover border-3 sm:border-4 border-indigo-500/40 shadow-2xl bg-slate-800"
            />
            <div className="absolute -bottom-1.5 -right-1.5 sm:-bottom-2 sm:-right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-lg">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          {/* Profile Header Details */}
          <div className="space-y-1.5 sm:space-y-2 flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                {lang === 'bn' ? 'মাই একাউন্ট' : 'My Account'}
              </span>
              {reseller.isVIP ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] sm:text-[10px] font-bold flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>VIP Diamond</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] sm:text-[10px] font-bold">
                  Pro Verified
                </span>
              )}
            </div>

            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              {businessName || fullName || 'KenaX BD Reseller'}
            </h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 sm:gap-4 text-slate-300 text-[11px] sm:text-xs">
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>{fullName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono">{phone}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{district}, {area}</span>
              </div>
            </div>

            <p className="text-[10px] sm:text-[11px] text-slate-400 max-w-xl">
              {lang === 'bn'
                ? 'আপনার ব্যক্তিগত প্রোফাইল ও বিকাশ/নগদ/ব্যাংক ওয়ালেট পেআউট নাম্বার পরিচালনা করুন।'
                : 'Manage your profile and bKash/Nagad/Bank payout numbers.'}
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="bg-slate-800/80 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-700/80 shadow-lg shrink-0 space-y-2 text-center sm:text-right w-full md:w-auto">
            <div>
              <div className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold">
                {lang === 'bn' ? 'ওয়ালেট ব্যালেন্স' : 'Wallet Balance'}
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                ৳{(reseller.walletBalance || 0).toLocaleString('en-BD')}
              </div>
            </div>

            {/* Reseller ID Copy Button */}
            <div className="flex items-center justify-center sm:justify-end gap-1.5 pt-1 border-t border-slate-700/60">
              <span className="text-[10px] font-mono font-bold text-emerald-300">
                {reseller.referralCode || reseller.id}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(reseller.referralCode || reseller.id);
                  showToast(lang === 'bn' ? '✅ রিসেলার আইডি কপি করা হয়েছে!' : '✅ Reseller ID copied!');
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Copy ID"
              >
                <span>{lang === 'bn' ? 'কপি' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tab Navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('profile')}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'ব্যক্তিগত তথ্য' : 'Personal'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('payout')}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'payout'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'পেআউট (বিকাশ/নগদ)' : 'Payout'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('business')}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'business'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'শপ ও সোশ্যাল' : 'Store'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('security')}
          className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl font-bold text-[11px] sm:text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
            activeSubTab === 'security'
              ? 'bg-slate-800 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'নিরাপত্তা' : 'Security'}</span>
        </button>
      </div>

      {/* SUB TAB CONTENT */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* TAB 1: PERSONAL DETAILS */}
        {activeSubTab === 'profile' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                <span>{lang === 'bn' ? 'ব্যক্তিগত প্রোফাইল তথ্য' : 'Personal Profile Information'}</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                {lang === 'bn'
                  ? 'আপনার নাম, মোবাইল নাম্বার, প্রোফাইল ছবি ও ডেলিভারি লোকেশন সংক্রান্ত তথ্য আপডেট করুন।'
                  : 'Update your official name, mobile number, avatar, and operational location.'}
              </p>
            </div>

            {/* Avatar Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {lang === 'bn' ? 'প্রোফাইল ছবি পছন্দ করুন বা লিংক দিন' : 'Select Avatar or Photo URL'}
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {presetAvatars.map((avUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setProfilePhoto(avUrl)}
                    className={`relative w-12 h-12 rounded-2xl overflow-hidden border-2 transition-transform cursor-pointer hover:scale-105 ${
                      profilePhoto === avUrl ? 'border-indigo-600 ring-2 ring-indigo-500/40 scale-105' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <img src={avUrl} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                    {profilePhoto === avUrl && (
                      <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white font-black" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="https://example.com/my-photo.jpg"
                value={profilePhoto}
                onChange={(e) => setProfilePhoto(e.target.value)}
                className="w-full mt-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                />
              </div>

              {/* Mobile Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Phone'} *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono font-medium"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                />
              </div>

              {/* District */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'জেলা' : 'District'} *
                </label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                />
              </div>

              {/* Area / Upazila */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'থানা / এরিয়া' : 'Area / Police Station'} *
                </label>
                <input
                  type="text"
                  required
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                />
              </div>

              {/* Detailed Address */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'সম্পূর্ণ ঠিকানা' : 'Full Detailed Address'}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="রোড #, বাড়ি #, সেক্টর, ইত্যাদি"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAYOUT ACCOUNTS (BKASH, NAGAD, ROCKET, BANK) */}
        {activeSubTab === 'payout' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                <span>{lang === 'bn' ? 'উপার্জন ও প্রফিট পেআউট অ্যাকাউন্ট' : 'Earnings Payout Accounts'}</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                {lang === 'bn'
                  ? 'আপনার বিক্রয় থেকে অর্জিত লাভ উত্তোলনের জন্য সঠিক বিকাশ, নগদ ও ব্যাংক একাউন্ট নম্বর দিন।'
                  : 'Specify verified mobile wallet and bank account numbers where your reseller earnings will be transferred.'}
              </p>
            </div>

            {/* Mobile Wallets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* bKash */}
              <div className="p-4 rounded-2xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-pink-700 dark:text-pink-300 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>bKash (বিকাশ)</span>
                  </span>
                  <span className="text-[10px] bg-pink-100 dark:bg-pink-900/60 text-pink-800 dark:text-pink-200 px-2 py-0.5 rounded-full font-bold">
                    Personal
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="01XXXXXXXXX"
                  value={bkash}
                  onChange={(e) => setBkash(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-pink-300 dark:border-pink-800 text-xs text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              {/* Nagad */}
              <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Nagad (নগদ)</span>
                  </span>
                  <span className="text-[10px] bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200 px-2 py-0.5 rounded-full font-bold">
                    Personal
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="01XXXXXXXXX"
                  value={nagad}
                  onChange={(e) => setNagad(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-800 text-xs text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              {/* Rocket */}
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Rocket (রকেট)</span>
                  </span>
                  <span className="text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full font-bold">
                    Personal
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="01XXXXXXXXX-X"
                  value={rocket}
                  onChange={(e) => setRocket(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-800 text-xs text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <span>{lang === 'bn' ? 'ব্যাংক ট্রান্সফার অ্যাকাউন্ট বিবরণী' : 'Bank Transfer Account Details'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'bn' ? 'ব্যাংকের নাম' : 'Bank Name'}
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: Islami Bank / City Bank / BRAC Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'bn' ? 'অ্যাকাউন্ট নম্বর' : 'Account Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="2050XXXXXXXXXXXXX"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'bn' ? 'অ্যাকাউন্ট হোল্ডারের নাম' : 'Account Holder Name'}
                  </label>
                  <input
                    type="text"
                    placeholder={fullName}
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'bn' ? 'ব্রাঞ্চ ও রাউটিং নম্বর' : 'Branch & Routing Number'}
                  </label>
                  <input
                    type="text"
                    placeholder="মিরপুর ব্রাঞ্চ, রাউটিং: 125XXXXXX"
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BUSINESS & SOCIAL */}
        {activeSubTab === 'business' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-purple-500" />
                <span>{lang === 'bn' ? 'শপ ও সোশ্যাল মিডিয়া প্রোফাইল' : 'Store & Social Media Hub'}</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                {lang === 'bn'
                  ? 'আপনার ফেসবুক পেইজ, হোয়াটসঅ্যাপ বিজনেস ও কাস্টমার ব্র্যান্ডিং সংক্রান্ত তথ্য।'
                  : 'Manage your storefront identity, customer WhatsApp helpline, and social links.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'রিসেলিং শপের নাম' : 'Reseller Business/Shop Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="যেমন: Smart Gadget BD"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'হোয়াটসঅ্যাপ বিজনেস নম্বর' : 'WhatsApp Business Number'}
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono outline-none"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'ফেসবুক পেজ / শপ লিংক' : 'Facebook Page / Store Link'}
                </label>
                <input
                  type="text"
                  value={facebookPage}
                  onChange={(e) => setFacebookPage(e.target.value)}
                  placeholder="https://facebook.com/yourshop"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'bn' ? 'শপের পরিচিতি ও বায়ো (Bio)' : 'Shop Description / Bio'}
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SECURITY & NOTIFICATION SETTINGS */}
        {activeSubTab === 'security' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-500" />
                <span>{lang === 'bn' ? 'নিরাপত্তা ও নোটিফিকেশন প্রেফারেন্স' : 'Security & System Preferences'}</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                {lang === 'bn'
                  ? 'আপনার অ্যাকাউন্টের সুরক্ষা এবং অর্ডার নোটিফিকেশন নিয়ন্ত্রণ করুন।'
                  : 'Manage two-step verification, transaction security PIN, and instant order alerts.'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'এসএমএস অর্ডার নোটিফিকেশন' : 'SMS Order Alerts'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'bn' ? 'পার্সেল ডেলিভারি ও প্রফিট ক্রেডিট হলে এসএমএস পাঠানো হবে।' : 'Get instant SMS when parcel is delivered.'}
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-600 rounded cursor-pointer" />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    {lang === 'bn' ? 'উইথড্রয়াল ট্রানজ্যাকশন সিকিউরিটি পিন' : 'Withdrawal Security PIN'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'bn' ? 'টাকা তোলার সময় ওয়ান-টাইম সিকিউরিটি পিন চাইবে।' : 'Require PIN before approving wallet cashout.'}
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="w-4 h-4 accent-indigo-600 rounded cursor-pointer" />
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM SUBMIT BUTTON */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-xl shadow-emerald-950/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{lang === 'bn' ? 'প্রোফাইল তথ্য সংরক্ষণ করুন' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
