import React, { useState } from 'react';
import {
  Store,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Package,
  Building2,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Check,
  Upload,
  Layers,
  Image as ImageIcon,
  Smartphone,
  Globe,
  X,
  AlertCircle,
} from 'lucide-react';
import { SellerPlan, SellerUser, SellerPlanId } from '../../types/seller';
import { Product } from '../../types';
import { getSellerPlans, getSellers, saveSellers, setActiveSellerSession } from '../../lib/sellerStorage';

interface SellerOnboardingWizardProps {
  onComplete: (seller: SellerUser) => void;
  onCancel: () => void;
  initialSellerData?: Partial<SellerUser>;
}

export const SellerOnboardingWizard: React.FC<SellerOnboardingWizardProps> = ({
  onComplete,
  onCancel,
  initialSellerData,
}) => {
  const plans = getSellerPlans().filter((p) => p.status === 'active');
  const [step, setStep] = useState<number>(1);
  const totalSteps = 8;

  // Form State
  const [fullName, setFullName] = useState(initialSellerData?.fullName || '');
  const [email, setEmail] = useState(initialSellerData?.email || '');
  const [phone, setPhone] = useState(initialSellerData?.phone || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sellerType, setSellerType] = useState<SellerUser['sellerType']>('registered_business');

  // Step 2: Plan
  const [selectedPlanId, setSelectedPlanId] = useState<SellerPlanId>('standard');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Step 3: Store
  const [storeName, setStoreName] = useState(initialSellerData?.store?.storeName || '');
  const [storeSlug, setStoreSlug] = useState(initialSellerData?.store?.storeSlug || '');
  const [description, setDescription] = useState(initialSellerData?.store?.description || '');
  const [logoUrl, setLogoUrl] = useState(
    initialSellerData?.store?.logoUrl ||
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300'
  );
  const [bannerUrl, setBannerUrl] = useState(
    initialSellerData?.store?.bannerUrl ||
      'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1200'
  );

  // Step 4: Business Info
  const [address, setAddress] = useState(initialSellerData?.store?.address || '');
  const [district, setDistrict] = useState(initialSellerData?.store?.district || 'Dhaka');
  const [upazila, setUpazila] = useState(initialSellerData?.store?.upazila || 'Dhanmondi');
  const [tradeLicenseNo, setTradeLicenseNo] = useState(initialSellerData?.tradeLicenseNo || '');
  const [nidNumber, setNidNumber] = useState(initialSellerData?.nidNumber || '');

  // Step 5: Payment Info
  const [bkash, setBkash] = useState(initialSellerData?.paymentInfo?.bkash || '');
  const [nagad, setNagad] = useState(initialSellerData?.paymentInfo?.nagad || '');
  const [bankName, setBankName] = useState(initialSellerData?.paymentInfo?.bankName || '');
  const [bankAccount, setBankAccount] = useState(initialSellerData?.paymentInfo?.bankAccount || '');
  const [bankBranch, setBankBranch] = useState(initialSellerData?.paymentInfo?.bankBranch || '');
  const [accountHolderName, setAccountHolderName] = useState(
    initialSellerData?.paymentInfo?.accountHolderName || ''
  );

  // Step 6: First Product
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('Smartwatch');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('20');
  const [productImage, setProductImage] = useState(
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600'
  );

  // Step 7: Terms Agreement
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [agreedPolicy, setAgreedPolicy] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper auto-slug
  const handleStoreNameChange = (val: string) => {
    setStoreName(val);
    if (!storeSlug || storeSlug === storeName.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
      setStoreSlug(val.toLowerCase().trim().replace(/[^a-z0-9]/g, '-'));
    }
  };

  // Next Step Validation
  const handleNext = () => {
    setErrorMsg(null);

    if (step === 1) {
      if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
        setErrorMsg('Please fill in all required registration fields.');
        return;
      }
      if (password !== confirmPassword && !initialSellerData?.password) {
        setErrorMsg('Passwords do not match. Please re-enter.');
        return;
      }
    }

    if (step === 3) {
      if (!storeName.trim() || !storeSlug.trim()) {
        setErrorMsg('Please provide your Store Name and custom URL slug.');
        return;
      }
    }

    if (step === 4) {
      if (!address.trim() || !district.trim()) {
        setErrorMsg('Please provide your full business/pickup address and district.');
        return;
      }
    }

    if (step === 5) {
      if (!bkash.trim() && !nagad.trim() && !bankAccount.trim()) {
        setErrorMsg('Please provide at least one payout method (bKash, Nagad, or Bank Account).');
        return;
      }
    }

    if (step === 7) {
      if (!agreedTerms || !agreedPolicy) {
        setErrorMsg('You must agree to KenaX BD Marketplace Terms & Policies to proceed.');
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      finalizeRegistration();
    }
  };

  const finalizeRegistration = () => {
    const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
    const newSellerId = initialSellerData?.id || `seller-${Date.now().toString().slice(-6)}`;
    const username = email.split('@')[0].replace(/[^a-z0-9_]/gi, '_') || `seller_${Date.now().toString().slice(-4)}`;

    const newSeller: SellerUser = {
      id: newSellerId,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      username: username.toLowerCase(),
      password: password || initialSellerData?.password || 'seller123',
      sellerType,
      planId: selectedPlanId,
      billingCycle,
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 86400000).toISOString(),
      onboardingStep: 8,
      onboardingCompleted: true,
      verificationStatus: 'verified', // Auto-verified in demo
      accountStatus: 'active',
      tradeLicenseNo: tradeLicenseNo.trim(),
      nidNumber: nidNumber.trim(),
      store: {
        storeName: storeName.trim(),
        storeSlug: storeSlug.trim(),
        logoUrl: logoUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        description: description.trim() || `Official storefront of ${storeName}`,
        contactEmail: email.trim(),
        contactPhone: phone.trim(),
        address: address.trim(),
        district: district.trim(),
        upazila: upazila.trim(),
        featuredCategories: [productCategory || 'Electronics'],
      },
      paymentInfo: {
        bkash: bkash.trim(),
        nagad: nagad.trim(),
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
        bankBranch: bankBranch.trim(),
        accountHolderName: accountHolderName.trim() || fullName.trim(),
      },
      walletBalance: 0,
      pendingBalance: 0,
      totalEarnings: 0,
      totalMarketplaceCommission: 0,
      totalWithdrawn: 0,
      rating: 5.0,
      totalReviews: 0,
      followersCount: 1,
      createdAt: new Date().toISOString(),
    };

    const allSellers = getSellers();
    const existingIndex = allSellers.findIndex((s) => s.id === newSeller.id);
    let updatedList: SellerUser[];
    if (existingIndex >= 0) {
      updatedList = allSellers.map((s) => (s.id === newSeller.id ? newSeller : s));
    } else {
      updatedList = [newSeller, ...allSellers];
    }

    saveSellers(updatedList);
    setActiveSellerSession(newSeller);
    onComplete(newSeller);
  };

  const selectedPlanObj = plans.find((p) => p.id === selectedPlanId) || plans[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header with Progress */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">Become a KenaX BD Seller</h2>
                <p className="text-xs text-slate-400">8-Step Merchant Onboarding Wizard</p>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar & Step Numbers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>
                Step {step} of {totalSteps}:{' '}
                {step === 1 && 'Create Account'}
                {step === 2 && 'Choose Seller Plan'}
                {step === 3 && 'Create Shop Profile'}
                {step === 4 && 'Business & Pickup Information'}
                {step === 5 && 'Payment & Withdrawal Setup'}
                {step === 6 && 'Add First Product (Optional)'}
                {step === 7 && 'Agreement & Policies'}
                {step === 8 && 'Launch Seller Hub'}
              </span>
              <span className="text-sky-400">{Math.round((step / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Wizard Step Content (Scrollable) */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: CREATE ACCOUNT */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 1: Merchant Account Details</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Enter your primary contact and login credentials.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahim Chowdhury"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seller@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Seller Entity Type</label>
                  <select
                    value={sellerType}
                    onChange={(e) => setSellerType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="registered_business">Registered Business / Company</option>
                    <option value="individual">Individual / Sole Proprietor</option>
                    <option value="authorized_distributor">Authorized Brand Distributor</option>
                    <option value="brand">Direct Brand / Manufacturer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE PLAN */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 2: Choose Your Seller Plan</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Select a plan suited for your inventory scale and sales velocity.
                  </p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                      billingCycle === 'monthly' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-colors flex items-center gap-1 ${
                      billingCycle === 'yearly' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    <span>Yearly</span>
                    <span className="text-[9px] bg-amber-400 text-slate-950 px-1 py-0.2 rounded font-black">Save 20%</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  const price = billingCycle === 'yearly' ? p.yearlyPrice : p.monthlyPrice;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 shadow-md ring-2 ring-sky-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      {p.id === 'standard' && (
                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black bg-sky-600 text-white uppercase tracking-wider">
                          Most Popular
                        </span>
                      )}

                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{p.name}</h4>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            ৳{price.toLocaleString('en-BD')}
                          </span>
                          <span className="text-slate-400 text-[10px]">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                          {p.commissionRate}% Marketplace Commission
                        </div>

                        <ul className="mt-3 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{p.productLimit === -1 ? 'Unlimited' : p.productLimit} Products</span>
                          </li>
                          {p.features.slice(1, 4).map((feat, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <span
                          className={`block w-full py-1.5 rounded-xl text-center font-bold text-xs ${
                            isSelected
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select Plan'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: CREATE SHOP */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 3: Create Shop Profile & Branding</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Set up your store name, URL, and visual banners.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shop / Store Name *</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => handleStoreNameChange(e.target.value)}
                    placeholder="e.g. Apex Electronics BD"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Store URL Slug *</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-300 dark:border-slate-700 rounded-l-xl text-slate-500 font-mono text-[11px]">
                      kenaxbd.com/store/
                    </span>
                    <input
                      type="text"
                      required
                      value={storeSlug}
                      onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="apex-electronics"
                      className="w-full px-3 py-2.5 rounded-r-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Store Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell customers about your products, warranty, and specialities..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Store Logo URL</label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Store Banner URL</label>
                  <input
                    type="url"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BUSINESS INFO */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 4: Business & Courier Pickup Information</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Couriers will collect your packaged parcels from this pickup address.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Pickup Address (Shop/Warehouse) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Shop No, Level, Building Name, Road No, Area"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">District *</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Dhaka, Chittagong, Sylhet"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Thana / Upazila</label>
                  <input
                    type="text"
                    value={upazila}
                    onChange={(e) => setUpazila(e.target.value)}
                    placeholder="e.g. Dhanmondi, Uttara, Mirpur"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Trade License No (Optional)</label>
                  <input
                    type="text"
                    value={tradeLicenseNo}
                    onChange={(e) => setTradeLicenseNo(e.target.value)}
                    placeholder="e.g. TRAD-DHK-99201"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">National ID / NID Number (Optional)</label>
                  <input
                    type="text"
                    value={nidNumber}
                    onChange={(e) => setNidNumber(e.target.value)}
                    placeholder="10 or 17 digit NID number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: PAYMENT INFO */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 5: Configure Payment & Withdrawal Methods</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  Your sales earnings will be directly disbursed to these verified accounts upon withdrawal request.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">bKash Personal / Merchant</label>
                  <input
                    type="tel"
                    value={bkash}
                    onChange={(e) => setBkash(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nagad Mobile Account</label>
                  <input
                    type="tel"
                    value={nagad}
                    onChange={(e) => setNagad(e.target.value)}
                    placeholder="018xxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white">Bank Account Details (Recommended for large payouts)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. City Bank, BRAC Bank, DBBL"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      placeholder="Account Number"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                      placeholder="e.g. Gulshan Branch"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder="As per bank cheque"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: ADD FIRST PRODUCT */}
          {step === 6 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 6: Add Your First Product</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  Upload an initial item to jumpstart your store catalogue (you can add more later).
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Product Title</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. T800 Ultra Smartwatch with Wireless Charger"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Smartwatch">Smartwatch</option>
                    <option value="Earbuds & Audio">Earbuds & Audio</option>
                    <option value="Mobile Accessories">Mobile Accessories</option>
                    <option value="Gadgets">Gadgets</option>
                    <option value="Fashion & Lifestyle">Fashion & Lifestyle</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Selling Price (৳)</label>
                  <input
                    type="number"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="1850"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    placeholder="20"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Product Image URL</label>
                <input
                  type="url"
                  value={productImage}
                  onChange={(e) => setProductImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>
            </div>
          )}

          {/* STEP 7: AGREEMENT & POLICIES */}
          {step === 7 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Step 7: Marketplace Seller Agreement</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Review standard vendor commitments for authentic product sales.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  1. <strong>Authenticity Guarantee:</strong> All items listed by seller must be 100% genuine and match product specifications.
                </p>
                <p>
                  2. <strong>Timely Dispatch:</strong> Packaged orders must be marked ready for pickup within 24-48 hours.
                </p>
                <p>
                  3. <strong>Marketplace Commission:</strong> The platform will deduct {selectedPlanObj.commissionRate}% commission on completed orders.
                </p>
                <p>
                  4. <strong>Payout Settlement:</strong> Available wallet balances can be withdrawn at any time to your configured payment method.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                  />
                  <span className="text-slate-800 dark:text-slate-200 font-bold">
                    I agree to KenaX BD Marketplace Terms & Conditions.
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedPolicy}
                    onChange={(e) => setAgreedPolicy(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                  />
                  <span className="text-slate-800 dark:text-slate-200 font-bold">
                    I agree to the Seller Code of Conduct & Return Policies.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 8: LAUNCH & ENTER DASHBOARD */}
          {step === 8 && (
            <div className="text-center py-6 space-y-4 animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Store Successfully Configured!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Welcome to KenaX BD Seller Platform, <strong className="text-sky-600">{fullName}</strong>. Your store{' '}
                  <strong className="text-emerald-600">{storeName}</strong> is now live on the marketplace.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-w-md mx-auto text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedPlanObj.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Commission Rate:</span>
                  <span className="font-bold text-emerald-600">{selectedPlanObj.commissionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Store URL:</span>
                  <span className="font-mono text-sky-600">kenaxbd.com/store/{storeSlug}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>{step === totalSteps ? 'Enter Seller Dashboard' : 'Next Step'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
