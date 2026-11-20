import React, { useState, useEffect } from 'react';
import { X, Save, Building2, Phone, Mail, MapPin, CreditCard, Shield, AlertCircle } from 'lucide-react';
import type { Dealer, DealerBusinessType, DealerCategory, DealerPaymentTerms, DealerStatus } from '../../../types/dealer';

interface DealerModalProps {
  dealer: Dealer | null; // null for new dealer, Dealer for edit
  existingDealers: Dealer[];
  onSave: (dealerData: Omit<Dealer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

export const DealerModal: React.FC<DealerModalProps> = ({
  dealer,
  existingDealers,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<{
    name: string;
    shopName: string;
    primaryPhone: string;
    alternativePhone: string;
    email: string;
    businessAddress: string;
    district: string;
    area: string;
    businessType: DealerBusinessType;
    contactPerson: string;
    category: DealerCategory;
    status: DealerStatus;
    paymentTerms: DealerPaymentTerms;
    creditLimit: number;
    openingBalance: number;
    openingBalanceType: 'payable' | 'receivable';
    tradeLicenseNumber: string;
    binOrVatNumber: string;
    bankName: string;
    branchName: string;
    accountName: string;
    accountNumber: string;
    bkash: string;
    nagad: string;
    rocket: string;
    notes: string;
  }>({
    name: '',
    shopName: '',
    primaryPhone: '',
    alternativePhone: '',
    email: '',
    businessAddress: '',
    district: 'Dhaka',
    area: '',
    businessType: 'wholesale',
    contactPerson: '',
    category: 'General',
    status: 'active',
    paymentTerms: 'credit_15',
    creditLimit: 200000,
    openingBalance: 0,
    openingBalanceType: 'payable',
    tradeLicenseNumber: '',
    binOrVatNumber: '',
    bankName: '',
    branchName: '',
    accountName: '',
    accountNumber: '',
    bkash: '',
    nagad: '',
    rocket: '',
    notes: '',
  });

  const [activeTab, setActiveTab] = useState<'basic' | 'financial' | 'banking'>('basic');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dealer) {
      setFormData({
        name: dealer.name || '',
        shopName: dealer.shopName || '',
        primaryPhone: dealer.primaryPhone || '',
        alternativePhone: dealer.alternativePhone || '',
        email: dealer.email || '',
        businessAddress: dealer.businessAddress || '',
        district: dealer.district || 'Dhaka',
        area: dealer.area || '',
        businessType: dealer.businessType || 'wholesale',
        contactPerson: dealer.contactPerson || '',
        category: dealer.category || 'General',
        status: dealer.status || 'active',
        paymentTerms: dealer.paymentTerms || 'credit_15',
        creditLimit: dealer.creditLimit || 0,
        openingBalance: dealer.openingBalance || 0,
        openingBalanceType: dealer.openingBalanceType || 'payable',
        tradeLicenseNumber: dealer.tradeLicenseNumber || '',
        binOrVatNumber: dealer.binOrVatNumber || '',
        bankName: dealer.bankAccountDetails?.bankName || '',
        branchName: dealer.bankAccountDetails?.branchName || '',
        accountName: dealer.bankAccountDetails?.accountName || '',
        accountNumber: dealer.bankAccountDetails?.accountNumber || '',
        bkash: dealer.mfsDetails?.bkash || '',
        nagad: dealer.mfsDetails?.nagad || '',
        rocket: dealer.mfsDetails?.rocket || '',
        notes: dealer.notes || '',
      });
    }
  }, [dealer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: Essential fields only
    if (!formData.name.trim()) {
      setError('Dealer Contact Person Name is required.');
      setActiveTab('basic');
      return;
    }
    if (!formData.shopName.trim()) {
      setError('Business / Enterprise Name is required.');
      setActiveTab('basic');
      return;
    }
    if (!formData.primaryPhone.trim()) {
      setError('Primary Mobile Number is required.');
      setActiveTab('basic');
      return;
    }

    // Check duplicate primary phone
    const cleanPhone = formData.primaryPhone.replace(/\D/g, '');
    const isDuplicate = existingDealers.some(
      (d) => d.id !== dealer?.id && d.primaryPhone.replace(/\D/g, '') === cleanPhone
    );
    if (isDuplicate) {
      setError('A dealer with this primary mobile number already exists in your directory.');
      setActiveTab('basic');
      return;
    }

    onSave({
      name: formData.name.trim(),
      shopName: formData.shopName.trim(),
      primaryPhone: formData.primaryPhone.trim(),
      alternativePhone: formData.alternativePhone.trim() || undefined,
      email: formData.email.trim() || undefined,
      businessAddress: formData.businessAddress.trim(),
      district: formData.district.trim() || undefined,
      area: formData.area.trim() || undefined,
      businessType: formData.businessType,
      contactPerson: formData.contactPerson.trim() || undefined,
      category: formData.category,
      status: formData.status,
      paymentTerms: formData.paymentTerms,
      creditLimit: Number(formData.creditLimit) || 0,
      openingBalance: Number(formData.openingBalance) || 0,
      openingBalanceType: formData.openingBalanceType,
      tradeLicenseNumber: formData.tradeLicenseNumber.trim() || undefined,
      binOrVatNumber: formData.binOrVatNumber.trim() || undefined,
      bankAccountDetails: formData.bankName
        ? {
            bankName: formData.bankName.trim(),
            branchName: formData.branchName.trim() || undefined,
            accountName: formData.accountName.trim() || undefined,
            accountNumber: formData.accountNumber.trim() || undefined,
          }
        : undefined,
      mfsDetails:
        formData.bkash || formData.nagad || formData.rocket
          ? {
              bkash: formData.bkash.trim() || undefined,
              nagad: formData.nagad.trim() || undefined,
              rocket: formData.rocket.trim() || undefined,
            }
          : undefined,
      notes: formData.notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {dealer ? `Edit Dealer: ${dealer.shopName || dealer.name}` : 'Register New Internal Dealer'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dealer ? `ID: ${dealer.id} &bull; Internal confidential profile` : 'Add an authorized wholesale dealer or vendor to your ledger'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-5 pt-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`pb-3 px-3 font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'basic'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            1. Basic Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`pb-3 px-3 font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'financial'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            2. Payment Terms & Limits
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('banking')}
            className={`pb-3 px-3 font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'banking'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            3. Banking & MFS
          </button>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business / Enterprise Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dhaka Tech Distribution"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Person Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Md. Shafiqul Islam"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="017XXXXXXXX"
                      value={formData.primaryPhone}
                      onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alternative Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="018XXXXXXXX"
                      value={formData.alternativePhone}
                      onChange={(e) => setFormData({ ...formData, alternativePhone: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="dealer@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business Type
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value as DealerBusinessType })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                  >
                    <option value="wholesale">Wholesaler (পাইকারি)</option>
                    <option value="importer">Direct Importer (আমদানিকারক)</option>
                    <option value="manufacturer">Manufacturer (উৎপাদনকারী)</option>
                    <option value="exclusive_distributor">Exclusive Distributor</option>
                    <option value="retail_distribution">Retail Distributor</option>
                    <option value="corporate">Corporate Dealer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Business Address / Shop Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    placeholder="Shop #, Market/Mall, Road, Area, Dhaka"
                    value={formData.businessAddress}
                    onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    District / Division
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dhaka"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Area / Thana
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Elephant Road"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category Group
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as DealerCategory })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                  >
                    <option value="General">General</option>
                    <option value="VIP">VIP</option>
                    <option value="Priority">Priority</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="New">New</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Terms (পেমেন্ট শর্ত)
                  </label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value as DealerPaymentTerms })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="advance">100% Advance Payment</option>
                    <option value="cod">Cash on Delivery (COD)</option>
                    <option value="credit_7">7 Days Credit</option>
                    <option value="credit_15">15 Days Credit (Recommended)</option>
                    <option value="credit_30">30 Days Credit (Monthly)</option>
                    <option value="credit_45">45 Days Extended Credit</option>
                    <option value="custom">Custom Schedule</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Credit Limit (৳ টাকা)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 500000"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Alert threshold when unpaid purchases approach this amount
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  Opening Balance (প্রারম্ভিক ব্যালেন্স)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Balance Amount (৳)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formData.openingBalance}
                      onChange={(e) => setFormData({ ...formData, openingBalance: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Direction
                    </label>
                    <select
                      value={formData.openingBalanceType}
                      onChange={(e) => setFormData({ ...formData, openingBalanceType: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                    >
                      <option value="payable">We Owe Dealer (Payable / দেনা)</option>
                      <option value="receivable">Dealer Owes Us (Receivable / পাওনা)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trade License Number
                  </label>
                  <input
                    type="text"
                    placeholder="TRAD/DSCC/019283"
                    value={formData.tradeLicenseNumber}
                    onChange={(e) => setFormData({ ...formData, tradeLicenseNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    BIN / VAT Registration #
                  </label>
                  <input
                    type="text"
                    placeholder="001928374-0102"
                    value={formData.binOrVatNumber}
                    onChange={(e) => setFormData({ ...formData, binOrVatNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Internal Notes & Relationship Terms
                </label>
                <textarea
                  rows={2}
                  placeholder="Special pricing agreements, return policies, product specialties..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs resize-none"
                />
              </div>
            </div>
          )}

          {activeTab === 'banking' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> Bank Account Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. City Bank PLC"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Branch Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Elephant Road Branch"
                      value={formData.branchName}
                      onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Account Name / Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dhaka Tech Distribution"
                      value={formData.accountName}
                      onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="1102938481001"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  Mobile Financial Services (MFS / বিকাশ, নগদ, রকেট)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-pink-600 mb-1">
                      bKash Number
                    </label>
                    <input
                      type="tel"
                      placeholder="017XXXXXXXX"
                      value={formData.bkash}
                      onChange={(e) => setFormData({ ...formData, bkash: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-orange-600 mb-1">
                      Nagad Number
                    </label>
                    <input
                      type="tel"
                      placeholder="018XXXXXXXX"
                      value={formData.nagad}
                      onChange={(e) => setFormData({ ...formData, nagad: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-600 mb-1">
                      Rocket Number
                    </label>
                    <input
                      type="tel"
                      placeholder="019XXXXXXXX"
                      value={formData.rocket}
                      onChange={(e) => setFormData({ ...formData, rocket: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{dealer ? 'Update Dealer' : 'Save Dealer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
