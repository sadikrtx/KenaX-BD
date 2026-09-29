import React, { useState } from 'react';
import {
  Boxes,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Package,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Check,
  Smartphone,
  Globe,
  X,
  AlertCircle,
  Building2,
  TrendingUp,
} from 'lucide-react';
import { ResellerPlan, ResellerUser, ResellerPlanId } from '../../types/reseller';
import { Product } from '../../types';
import { getResellerPlans, getResellers, saveResellers, setActiveResellerSession } from '../../lib/resellerStorage';

interface ResellerOnboardingWizardProps {
  onComplete: (reseller: ResellerUser) => void;
  onCancel: () => void;
  initialResellerData?: Partial<ResellerUser>;
  sampleProducts?: Product[];
}

export const ResellerOnboardingWizard: React.FC<ResellerOnboardingWizardProps> = ({
  onComplete,
  onCancel,
  initialResellerData,
  sampleProducts = [],
}) => {
  const plans = getResellerPlans().filter((p) => p.status === 'active');
  const [step, setStep] = useState<number>(1);
  const totalSteps = 5;

  // Form State
  const [fullName, setFullName] = useState(initialResellerData?.fullName || '');
  const [phone, setPhone] = useState(initialResellerData?.phone || '');
  const [email, setEmail] = useState(initialResellerData?.email || '');
  const [businessName, setBusinessName] = useState(initialResellerData?.businessName || '');
  const [district, setDistrict] = useState(initialResellerData?.district || 'Dhaka');
  const [area, setArea] = useState(initialResellerData?.area || 'Mirpur');
  const [address, setAddress] = useState(initialResellerData?.address || '');

  // Step 2: Plan
  const [selectedPlanId, setSelectedPlanId] = useState<ResellerPlanId>(
    initialResellerData?.planId || 'basic'
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Step 3: Payment info
  const [bkash, setBkash] = useState(initialResellerData?.paymentInfo?.bkash || phone);
  const [nagad, setNagad] = useState(initialResellerData?.paymentInfo?.nagad || '');
  const [bankName, setBankName] = useState(initialResellerData?.paymentInfo?.bankName || '');
  const [bankAccount, setBankAccount] = useState(initialResellerData?.paymentInfo?.bankAccount || '');
  const [accountHolderName, setAccountHolderName] = useState(
    initialResellerData?.paymentInfo?.accountHolderName || fullName
  );

  // Step 4: Sample product demo profit calculator
  const sampleProduct = sampleProducts[0] || {
    id: 'prod-watch-demo',
    name: 'Ultra Pro AMOLED Smartwatch 2026',
    price: 1850,
    images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600'],
  };
  const [sampleSellingPrice, setSampleSellingPrice] = useState<number>(2350);

  // Step 5: Terms & Finish
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handleNext = () => {
    setErrorMsg(null);
    if (step === 1) {
      if (!fullName.trim() || !phone.trim()) {
        setErrorMsg('Please enter your full name and phone number.');
        return;
      }
    }
    if (step === 3) {
      if (!bkash && !nagad && !bankAccount) {
        setErrorMsg('Please provide at least one payout method (bKash, Nagad, or Bank).');
        return;
      }
    }
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = () => {
    const existing = initialResellerData || {};
    const resellerId = existing.id || `RESELLER-${Date.now().toString().slice(-6)}`;

    const completedReseller: ResellerUser = {
      id: resellerId,
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || `${phone.trim()}@kenaxbd.reseller`,
      username: existing.username || `reseller_${phone.slice(-4)}`,
      password: existing.password || 'reseller123',
      district,
      area,
      address,
      businessName: businessName.trim() || `${fullName.trim()}'s Resale Store`,
      profilePhoto:
        existing.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
      planId: selectedPlanId,
      billingCycle,
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      onboardingStep: 5,
      onboardingCompleted: true,
      isVIP: selectedPlanId === 'premium',
      referralCode: existing.referralCode || `KX-RES-${Math.floor(1000 + Math.random() * 9000)}`,
      totalReferralEarnings: 0,
      walletBalance: existing.walletBalance || 0,
      pendingProfit: existing.pendingProfit || 0,
      totalProfit: existing.totalProfit || 0,
      totalSales: existing.totalSales || 0,
      totalWithdrawn: existing.totalWithdrawn || 0,
      activeCustomersCount: existing.activeCustomersCount || 0,
      paymentInfo: {
        bkash,
        nagad,
        bankName,
        bankAccount,
        accountHolderName,
      },
      accountStatus: 'active',
      createdAt: existing.createdAt || new Date().toISOString(),
    };

    const all = getResellers();
    const idx = all.findIndex((r) => r.id === completedReseller.id);
    if (idx !== -1) {
      all[idx] = completedReseller;
    } else {
      all.unshift(completedReseller);
    }
    saveResellers(all);
    setActiveResellerSession(completedReseller);
    onComplete(completedReseller);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Bar */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">KenaX BD Reseller Setup Wizard</h1>
            <p className="text-[10px] text-slate-400">Step {step} of {totalSteps}: {
              step === 1 ? 'Personal & Business Details' :
              step === 2 ? 'Choose Reseller Plan' :
              step === 3 ? 'Payout / Wallet Setup' :
              step === 4 ? 'Profit Calculator Preview' :
              'Finish & Launch Dashboard'
            }</p>
          </div>
        </div>

        <button
          onClick={onCancel}
          className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800"
        >
          Cancel
        </button>
      </header>

      {/* Main Form Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="bg-slate-900 rounded-3xl max-w-3xl w-full p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="text-emerald-400">Step {step} / {totalSteps}</span>
              <span>{Math.round((step / totalSteps) * 100)}% Completed</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Personal & Business Info */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-left space-y-1">
                <h2 className="text-lg font-black text-white">Let's set up your Reseller Profile</h2>
                <p className="text-xs text-slate-400">
                  Enter your contact details so we can attribute your customer orders and dispatch parcels correctly.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Shakil Ahmed"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Mobile Number (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01799887766"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="shakil@example.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Reseller Business / Agency Name</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Dhaka Express Dropship"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">District / City</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Dhaka"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Area / Thana</label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Mirpur 10"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Choose Reseller Plan */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-white">Choose Your Reseller Membership Plan</h2>
                  <p className="text-xs text-slate-400">
                    Select a tier that matches your monthly order volume and business goals.
                  </p>
                </div>

                {/* Billing Cycle Toggle */}
                <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold self-start">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      billingCycle === 'monthly' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      billingCycle === 'yearly' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    <span>Yearly</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black">2 Mo Free</span>
                  </button>
                </div>
              </div>

              {/* Plan Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {plans.map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  const price = billingCycle === 'monthly' ? p.monthlyPrice : p.yearlyPrice;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlanId(p.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500 shadow-xl'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {p.id === 'basic' ? 'Free Starter' : p.id === 'standard' ? 'Active Reseller' : 'Enterprise VIP'}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>

                        <h3 className="font-black text-white text-sm">{p.name}</h3>

                        <div className="mt-2 mb-3">
                          <span className="text-xl font-black text-white">
                            {price === 0 ? 'Free' : `৳${price.toLocaleString('en-BD')}`}
                          </span>
                          {price > 0 && (
                            <span className="text-[10px] text-slate-400 ml-1">
                              /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                            </span>
                          )}
                        </div>

                        <ul className="space-y-1.5 border-t border-slate-800 pt-3">
                          {p.features.slice(0, 4).map((f, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-300">
                              <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80">
                        <button
                          type="button"
                          className={`w-full py-1.5 rounded-xl font-bold text-xs ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select Plan'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Payment & Payout Setup */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-left space-y-1">
                <h2 className="text-lg font-black text-white">Configure Your Payout & Profit Wallet</h2>
                <p className="text-xs text-slate-400">
                  Where would you like to receive your profit withdrawals once orders are delivered to your customers?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold">
                    <Smartphone className="w-4 h-4" />
                    <span>bKash Personal / Agent</span>
                  </div>
                  <input
                    type="tel"
                    value={bkash}
                    onChange={(e) => setBkash(e.target.value)}
                    placeholder="01799887766"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white"
                  />
                </div>

                <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-orange-400 font-bold">
                    <Smartphone className="w-4 h-4" />
                    <span>Nagad Number</span>
                  </div>
                  <input
                    type="tel"
                    value={nagad}
                    onChange={(e) => setNagad(e.target.value)}
                    placeholder="01799887766"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white"
                  />
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-sky-400 font-bold">
                  <Building2 className="w-4 h-4" />
                  <span>Bank Account Details (Optional)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Bank Name (e.g. Islami Bank)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white"
                  />
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Account Number"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono"
                  />
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Account Holder Name"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Live Profit Calculator Demo */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-left space-y-1">
                <h2 className="text-lg font-black text-white">How You Earn Profit on KenaX BD</h2>
                <p className="text-xs text-slate-400">
                  Try adjusting the customer selling price below to see your estimated profit calculation in real-time.
                </p>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                <div className="sm:col-span-4 flex items-center gap-3">
                  <img
                    src={sampleProduct.images[0]}
                    alt={sampleProduct.name}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-800"
                  />
                  <div>
                    <h4 className="font-bold text-white text-xs line-clamp-2">{sampleProduct.name}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Wholesale Base Cost: <strong>৳{sampleProduct.price}</strong></p>
                  </div>
                </div>

                <div className="sm:col-span-8 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-bold text-slate-300">Your Selling Price to Customer (৳):</label>
                    <input
                      type="number"
                      min={sampleProduct.price}
                      step="50"
                      value={sampleSellingPrice}
                      onChange={(e) => setSampleSellingPrice(Math.max(sampleProduct.price, parseFloat(e.target.value) || 0))}
                      className="w-32 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-white font-bold text-right"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 space-y-1.5">
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>Customer Payable:</span>
                      <span className="font-bold">৳{sampleSellingPrice.toLocaleString('en-BD')}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>Wholesale Product Cost:</span>
                      <span>- ৳{sampleProduct.price.toLocaleString('en-BD')}</span>
                    </div>
                    <div className="flex justify-between text-slate-300 text-[11px]">
                      <span>Inside Dhaka Delivery:</span>
                      <span>৳60 (Paid by Customer)</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-black text-sm border-t border-emerald-800/60 pt-1.5">
                      <span>Your Net Profit:</span>
                      <span>৳{(sampleSellingPrice - sampleProduct.price).toLocaleString('en-BD')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Confirmation & Finish */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-black text-white">You're Ready to Resell & Earn!</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Your profile and wallet are configured under the <strong>{selectedPlan.name}</strong>. You can now browse wholesale catalog items, create drop-ship orders, and track deliveries.
                </p>
              </div>

              <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reseller Name:</span>
                  <span className="font-bold text-white">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Selected Plan:</span>
                  <span className="font-bold text-emerald-400">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payout Account:</span>
                  <span className="font-bold text-white">{bkash || nagad || bankAccount}</span>
                </div>
              </div>

              <label className="flex items-center justify-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-0"
                />
                <span className="text-xs text-slate-400">
                  I agree to KenaX BD Marketplace Reseller Terms of Service & Privacy Policy.
                </span>
              </label>
            </div>
          )}

          {/* Action Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-all cursor-pointer"
            >
              <span>{step === totalSteps ? 'Launch Reseller Dashboard' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
