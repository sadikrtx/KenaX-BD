import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Phone,
  User,
  MapPin,
  Store,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Check,
  AlertCircle,
  Sparkles,
  Layers,
  Copy,
  Search,
  Activity,
  CreditCard,
  Lock,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { Product, Order } from '../../types';
import { ResellerUser, ResellerCustomer } from '../../types/reseller';
import { checkCourierFraud, normalizePhoneForCourier } from '../../lib/courierFraudService';
import { triggerTelegramResellerOrderWorkflow } from '../../lib/telegramBotService';
import { CourierFraudReport } from '../../types';
import {
  cleanBDPhoneNumber,
  validateBangladeshMobile,
  isValidBDMobileNumber,
} from '../../utils/phoneUtils';

interface ResellerOrderProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  reseller: ResellerUser;
  customers: ResellerCustomer[];
  orders: Order[];
  lang?: 'bn' | 'en';
  onOrderPlaced: (order: Order, earnedProfit: number) => void;
}

// Official company payment numbers for advance delivery charge collection
const COMPANY_PAYMENT_NUMBERS = {
  bkash: '01887713212',
  nagad: '01887713212',
  rocket: '01887713212',
};

export const ResellerOrderProcessModal: React.FC<ResellerOrderProcessModalProps> = ({
  isOpen,
  onClose,
  product,
  reseller,
  customers,
  orders,
  lang = 'bn',
  onOrderPlaced,
}) => {
  const isBn = lang === 'bn';

  // Store Information
  const storeName = reseller.businessName || reseller.fullName || 'গ্যাজেট মনি';

  // Customer State
  const [customerMode, setCustomerMode] = useState<'new' | 'existing'>('new');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerDistrict, setCustomerDistrict] = useState<'dhaka' | 'outside'>('dhaka');
  const [customerAddress, setCustomerAddress] = useState('');
  const [courierPreference, setCourierPreference] = useState<'steadfast' | 'pathao' | 'redx'>('steadfast');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Courier Fraud Checker State
  const [isCheckingFraud, setIsCheckingFraud] = useState(false);
  const [fraudReport, setFraudReport] = useState<CourierFraudReport | null>(null);
  const [fraudError, setFraudError] = useState<string | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  // Variations (Color & Size)
  const hasColors = Boolean(product.colors && product.colors.length > 0);
  const colorList = useMemo(() => {
    if (!hasColors || !product.colors) return [];
    return product.colors.map((c) => (typeof c === 'string' ? c : c.name));
  }, [hasColors, product.colors]);

  const hasSizes = Boolean(product.sizes && product.sizes.length > 0);
  const sizeList = useMemo(() => {
    if (!hasSizes || !product.sizes) return [];
    return product.sizes;
  }, [hasSizes, product.sizes]);

  const [selectedColor, setSelectedColor] = useState<string>(() => (colorList[0] || ''));
  const [selectedSize, setSelectedSize] = useState<string>(() => (sizeList[0] || ''));
  const [quantity, setQuantity] = useState<number>(1);

  // Wholesale Cost, Suggested Selling, and Maximum Selling Price
  const wholesaleCost = product.resellerPrice || product.price;
  const suggestedSelling =
    product.suggestedResellerRetailPrice || Math.round(wholesaleCost * 1.25);
  const maxSellingPrice =
    product.maxResellerRetailPrice ||
    product.maxRetailPrice ||
    Math.round((product.suggestedResellerRetailPrice || wholesaleCost * 1.25) * 1.2);
  const [sellingPrice, setSellingPrice] = useState<number>(suggestedSelling);

  // Delivery Charge: Dhaka (৳৭০) vs Outside Dhaka (৳১৩০)
  const deliveryFee = customerDistrict === 'dhaka' ? 70 : 130;

  // Real-time calculations
  const productSubtotal = sellingPrice * quantity;
  const totalCustomerBill = productSubtotal + deliveryFee;
  const netProfit = (sellingPrice - wholesaleCost) * quantity;

  // Advance delivery charge from customer flag (active after 5 delivered orders)
  const [hasTakenAdvanceDeliveryFromCustomer, setHasTakenAdvanceDeliveryFromCustomer] = useState<'no' | 'yes'>('no');

  // ==========================================
  // 5-DELIVERED ORDERS RULE LOGIC
  // ==========================================
  // Count how many orders of this reseller are verified as 'Delivered' or 'Completed'
  const deliveredOrdersCount = useMemo(() => {
    return orders.filter(
      (o) =>
        (o.resellerId === reseller.id ||
          (o as any).resellerId === reseller.id ||
          (o.notes && o.notes.includes(reseller.id))) &&
        (o.orderStatus === 'Delivered' || o.orderStatus === 'Completed')
    ).length;
  }, [orders, reseller.id]);

  // Is the 5-order advance requirement active?
  const isFiveOrderRuleActive = deliveredOrdersCount < 5;

  // Real-time collectable COD calculation
  const collectableCodAmount = useMemo(() => {
    if (isFiveOrderRuleActive) {
      return productSubtotal;
    }
    if (hasTakenAdvanceDeliveryFromCustomer === 'yes') {
      return productSubtotal;
    }
    return totalCustomerBill;
  }, [isFiveOrderRuleActive, hasTakenAdvanceDeliveryFromCustomer, productSubtotal, totalCustomerBill]);

  // Payment method and transaction details for advance delivery payment
  const [advanceMethod, setAdvanceMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [advanceSenderPhone, setAdvanceSenderPhone] = useState('');
  const [advanceTrxId, setAdvanceTrxId] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isTermsAgreed, setIsTermsAgreed] = useState(true);

  if (!isOpen) return null;

  // Phone input formatting: ONLY 11 DIGITS (0-9)
  const handlePhoneChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 11);
    setCustomerPhone(digitsOnly);
    // Reset fraud report if phone changes
    if (fraudReport && fraudReport.phone !== digitsOnly) {
      setFraudReport(null);
    }
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(e.key)) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // 1-Click Courier Fraud Checker Handler
  const handleRunFraudCheck = async () => {
    const clean = normalizePhoneForCourier(customerPhone);
    if (!clean || clean.length < 11) {
      setFraudError('সঠিক ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন');
      return;
    }
    setIsCheckingFraud(true);
    setFraudError(null);
    try {
      const res = await checkCourierFraud(clean, { courier: 'steadfast', forceFresh: true });
      setFraudReport(res);
    } catch {
      setFraudError('কুরিয়ার ডাটাবেজের সাথে যোগাযোগ করা যায়নি');
    } finally {
      setIsCheckingFraud(false);
    }
  };

  // Copy payment number helper
  const handleCopyPaymentNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    setTimeout(() => setCopiedNumber(null), 2500);
  };

  // Quick Profit Margin Presets
  const handleSetProfitPreset = (profitPerItem: number) => {
    setSellingPrice(wholesaleCost + profitPerItem);
  };

  // Select customer from directory
  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone.replace(/\D/g, '').slice(0, 11));
      setCustomerAddress(found.address);
      if (found.district && found.district.toLowerCase().includes('dhaka')) {
        setCustomerDistrict('dhaka');
      } else {
        setCustomerDistrict('outside');
      }
    }
  };

  // Submit and Place Order
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!customerName.trim()) {
      setValidationError('কাস্টমারের নাম প্রদান করুন।');
      return;
    }

    const cleanCustomerPhone = cleanBDPhoneNumber(customerPhone);
    const phoneVal = validateBangladeshMobile(cleanCustomerPhone, { lang: 'bn' });
    if (!phoneVal.isValid) {
      setValidationError(phoneVal.error || 'কাস্টমারের ১১ ডিজিটের সঠিক মোবাইল নম্বর প্রদান করুন।');
      return;
    }

    if (!customerAddress.trim()) {
      setValidationError('কাস্টমারের সম্পূর্ণ ডেলিভারি ঠিকানা প্রদান করুন।');
      return;
    }

    if (sellingPrice < wholesaleCost) {
      setValidationError(`আপনার বিক্রয় মূল্য পাইকারি রেট (৳${wholesaleCost}) এর কম হতে পারবে না।`);
      return;
    }

    // Advance Payment Validation for New Resellers (< 5 delivered orders)
    if (isFiveOrderRuleActive) {
      const cleanSender = cleanBDPhoneNumber(advanceSenderPhone);
      const senderVal = validateBangladeshMobile(cleanSender, { lang: 'bn' });
      if (!senderVal.isValid) {
        setValidationError(senderVal.error || 'যে বিকাশ/নগদ নম্বর থেকে ডেলিভারি চার্জ পাঠিয়েছেন সেই ১১ ডিজিট নম্বর লিখুন।');
        return;
      }
      if (!advanceTrxId.trim()) {
        setValidationError('পেমেন্টের TrxID (ট্রানজ্যাকশন আইডি) প্রদান করুন।');
        return;
      }
    }

    if (!isTermsAgreed) {
      setValidationError('অর্ডার সম্পন্ন করতে ড্রপশিপিং শর্তাবলীতে সম্মতি দিন।');
      return;
    }

    const orderId = `ORD-RES-${Date.now().toString().slice(-6)}`;
    const effectiveAdvance = isFiveOrderRuleActive ? deliveryFee : 0;
    const remainingCod = Math.max(0, totalCustomerBill - effectiveAdvance);

    const newOrder: Order = {
      id: orderId,
      customerId: selectedCustomerId || `CUST-${Date.now().toString().slice(-4)}`,
      customerName: customerName.trim(),
      customerEmail: `${customerPhone.trim()}@customer.kenaxbd.com`,
      customerMobile: customerPhone.trim(),
      deliveryName: customerName.trim(),
      deliveryMobile: customerPhone.trim(),
      division: customerDistrict === 'dhaka' ? 'Dhaka' : 'Outside Dhaka',
      district: customerDistrict === 'dhaka' ? 'Dhaka' : 'Outside Dhaka',
      upazila: customerDistrict === 'dhaka' ? 'Dhaka' : 'Outside Dhaka',
      area: customerDistrict === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
      fullAddress: customerAddress.trim(),
      items: [
        {
          productId: product.id,
          productName: product.name,
          name: product.name,
          productImage: product.images?.[0] || '',
          quantity,
          price: sellingPrice,
          total: sellingPrice * quantity,
          costPrice: wholesaleCost,
          selectedColor: hasColors ? selectedColor : undefined,
          selectedSize: hasSizes ? selectedSize : undefined,
        },
      ],
      subtotal: productSubtotal,
      deliveryCharge: deliveryFee,
      discountAmount: 0,
      totalAmount: totalCustomerBill,
      orderStatus: 'Pending',
      paymentStatus: isFiveOrderRuleActive ? 'Partially Paid' : 'Cash on Delivery',
      paymentMethod: isFiveOrderRuleActive
        ? `Advance Delivery Charge (${advanceMethod.toUpperCase()}) + COD`
        : 'Cash on Delivery (Full COD)',
      createdAt: new Date().toISOString(),
      timeline: [
        {
          status: 'Pending',
          timestamp: new Date().toISOString(),
          note: isFiveOrderRuleActive
            ? `রিসেলার অর্ডার তৈরি করেছেন: ${storeName}। ডেলিভারি চার্জ ৳${deliveryFee} অগ্রিম পরিশোধিত (${advanceMethod.toUpperCase()} | TrxID: ${advanceTrxId}) - ভেরিফিকেশন পেন্ডিং।`
            : `রিসেলার অর্ডার তৈরি করেছেন: ${storeName} (ফুল ক্যাশ অন ডেলিভারি - ৫টি ডেলিভারি উত্তীর্ণ রিসেলার)।`,
        },
      ],
      notes: `[Dropship: ${storeName} | ResellerID: ${reseller.id}]. ${
        hasColors ? `Color: ${selectedColor}. ` : ''
      }${hasSizes ? `Size: ${selectedSize}. ` : ''}Qty: ${quantity}. Reseller Profit: ৳${netProfit}. Advance Paid (Reseller): ৳${effectiveAdvance}. Customer Advance Delivery: ${
        !isFiveOrderRuleActive && hasTakenAdvanceDeliveryFromCustomer === 'yes' ? 'Yes (৳' + deliveryFee + ')' : 'No'
      }. Collectable COD: ৳${collectableCodAmount}. ${specialInstructions ? `Note: ${specialInstructions}` : ''}`,
      ...( {
        resellerId: reseller.id,
        resellerStoreName: storeName,
        resellerStudentName: reseller.fullName || reseller.username || 'Reseller Student',
        resellerProfit: netProfit,
        resellerSellingPrice: sellingPrice,
        basePrice: wholesaleCost,
        advancePaymentAmount: effectiveAdvance,
        advancePaymentMethod: advanceMethod,
        advancePaymentTrxId: advanceTrxId,
        advancePaymentSender: advanceSenderPhone,
        remainingCodAmount: collectableCodAmount,
        advanceDeliveryTakenFromCustomer: !isFiveOrderRuleActive && hasTakenAdvanceDeliveryFromCustomer === 'yes',
        deliveryPaymentStatus: isFiveOrderRuleActive ? 'Pending Verification' : 'COD Verified',
        specialInstructions,
      } as any ),
    };

    // Trigger dedicated Telegram Alert for Reseller Order
    triggerTelegramResellerOrderWorkflow({
      order: newOrder,
      resellerStoreName: storeName,
      resellerStudentName: reseller.fullName || reseller.username,
      resellerPhone: advanceSenderPhone || reseller.phone,
      resellerProfit: netProfit,
    }).catch((err) => console.warn('[Telegram Reseller Workflow Notice]:', err));

    onOrderPlaced(newOrder, netProfit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="min-h-screen p-3 sm:p-6 lg:p-8 flex flex-col justify-start max-w-6xl mx-auto">
        {/* Top Header Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
              title="ফিরে যান"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white">
                  {isBn ? 'রিসেল অর্ডার তৈরি করুন' : 'Create Dropship Order'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  হোয়াইট-লেবেল
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Store className="w-3.5 h-3.5 text-sky-400" />
                <span>স্টোর: <strong className="text-slate-200 font-semibold">{storeName}</strong></span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-950/90 border border-rose-800 text-rose-200 font-bold text-xs flex items-center gap-3 shadow-xl">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{validationError}</span>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-16">
          {/* ============================================================== */}
          {/* LEFT COLUMN: PRODUCT, CUSTOMER INFO, COURIER CHECK & ADVANCE   */}
          {/* ============================================================== */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Product Summary & Variations */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-16 h-16 rounded-2xl object-contain bg-slate-950 border border-slate-800 shrink-0 p-1.5"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                    {product.category}
                  </span>
                  <h3 className="font-bold text-white text-sm sm:text-base line-clamp-1">{product.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>পাইকারি কেনা: <strong className="text-white font-mono">৳{wholesaleCost}</strong></span>
                    <span>•</span>
                    <span>স্টক: <strong className="text-emerald-400">{product.stock} টি</strong></span>
                  </div>
                </div>
              </div>

              {/* Conditional Variations */}
              {(hasColors || hasSizes) && (
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  {hasColors && (
                    <div>
                      <label className="block text-slate-300 font-bold text-xs mb-1.5">
                        কালার সিলেক্ট করুন *
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {colorList.map((c, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedColor(c)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              selectedColor === c
                                ? 'bg-sky-600 text-white border-sky-400 shadow-md ring-2 ring-sky-500/30'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasSizes && (
                    <div>
                      <label className="block text-slate-300 font-bold text-xs mb-1.5">
                        সাইজ সিলেক্ট করুন *
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {sizeList.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedSize(s)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              selectedSize === s
                                ? 'bg-sky-600 text-white border-sky-400 shadow-md ring-2 ring-sky-500/30'
                                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">অর্ডারের পরিমাণ (Quantity):</span>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3.5 py-1.5 text-slate-300 hover:bg-slate-800 font-black cursor-pointer text-sm"
                  >
                    -
                  </button>
                  <span className="w-10 text-center font-bold text-white tabular-nums text-xs">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock || 50, q + 1))}
                    className="px-3.5 py-1.5 text-slate-300 hover:bg-slate-800 font-black cursor-pointer text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Customer Information & Courier Fraud Checker */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-white text-xs sm:text-sm">কাস্টমারের তথ্য ও ঠিকানা</h3>
                </div>

                {customers.length > 0 && (
                  <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCustomerMode('new')}
                      className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                        customerMode === 'new' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      নতুন
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerMode('existing')}
                      className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                        customerMode === 'existing' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      সংরক্ষিত ({customers.length})
                    </button>
                  </div>
                )}
              </div>

              {customerMode === 'existing' && (
                <div>
                  <label className="block text-slate-300 font-bold text-xs mb-1">
                    কাস্টমার নির্বাচন করুন *
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium cursor-pointer"
                  >
                    <option value="">নির্বাচন করুন...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) — {c.district || 'ঢাকা'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-slate-300 font-bold text-xs mb-1">
                    কাস্টমারের নাম *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. তানভীর হাসান"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-medium focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* 11-digit Phone Number with Fraud Checker */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-300 font-bold text-xs">
                      ১১ ডিজিট মোবাইল নম্বর *
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {customerPhone.length}/১১
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="tel"
                      required
                      inputMode="numeric"
                      value={customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onKeyDown={handlePhoneKeyDown}
                      placeholder="017XXXXXXXX"
                      maxLength={11}
                      className={`w-full pl-3.5 pr-24 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-bold font-mono tracking-wider focus:outline-hidden border ${
                        customerPhone.length === 11 && customerPhone.startsWith('01')
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'border-slate-700'
                      }`}
                    />

                    {/* Integrated Fraud Checker Trigger Button */}
                    <button
                      type="button"
                      onClick={handleRunFraudCheck}
                      disabled={isCheckingFraud || customerPhone.length < 11}
                      className="absolute right-1.5 top-1.5 px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                      title="স্টিডফাস্ট কুরিয়ার ডাটাবেজে গ্রাহকের ডেলিভারি সাকসেস রেকর্ড যাচাই করুন"
                    >
                      {isCheckingFraud ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Search className="w-3 h-3" />
                      )}
                      <span>ফ্রড চেক</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Courier Fraud Checker Live Report Result Card */}
              {fraudReport && (
                <div
                  className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in ${
                    fraudReport.riskLevel === 'safe' || fraudReport.successRate >= 80
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                      : fraudReport.riskLevel === 'high_risk' || (fraudReport.successRate < 60 && fraudReport.totalOrders > 0)
                      ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                      : 'bg-amber-950/50 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {fraudReport.successRate >= 80 ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">
                          স্টিডফাস্ট কুরিয়ার রিপোর্ট:
                        </span>
                        <span className="font-black px-2 py-0.2 rounded-md bg-black/40 text-[11px]">
                          সাকসেস রেট {fraudReport.successRate}%
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        মোট পার্সেল: {fraudReport.totalOrders} | সফল ডেলিভারি: {fraudReport.deliveredOrders} | রিটার্ন: {fraudReport.returnedOrders}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider self-start sm:self-auto bg-black/40">
                    {fraudReport.successRate >= 80 ? '✅ নিরাপদ গ্রাহক' : '⚠️ সতর্ক থাকুন'}
                  </span>
                </div>
              )}

              {fraudError && (
                <p className="text-xs text-rose-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{fraudError}</span>
                </p>
              )}

              {/* Delivery Location Cards: Dhaka (৳৭০) vs Outside (৳১৩০) */}
              <div>
                <label className="block text-slate-300 font-bold text-xs mb-2">
                  ডেলিভারি লোকেশন ও চার্জ *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setCustomerDistrict('dhaka')}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      customerDistrict === 'dhaka'
                        ? 'bg-emerald-950/70 border-emerald-500 text-white ring-2 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Truck className={`w-4 h-4 ${customerDistrict === 'dhaka' ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="font-bold text-xs">ঢাকার ভিতরে (১-২ দিন)</span>
                    </div>
                    <span className="font-black text-xs text-emerald-400 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                      ৳৭০
                    </span>
                  </div>

                  <div
                    onClick={() => setCustomerDistrict('outside')}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      customerDistrict === 'outside'
                        ? 'bg-emerald-950/70 border-emerald-500 text-white ring-2 ring-emerald-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className={`w-4 h-4 ${customerDistrict === 'outside' ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="font-bold text-xs">ঢাকার বাহিরে (২-৩ দিন)</span>
                    </div>
                    <span className="font-black text-xs text-emerald-400 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                      ৳১৩০
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-slate-300 font-bold text-xs mb-1">
                  কাস্টমারের সম্পূর্ণ ঠিকানা (বাসা, রোড, থানা, জেলা) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. বাড়ি নং #৪৫, রোড নং #৩, মিরপুর-১০, ঢাকা"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs leading-relaxed focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Order Note */}
              <div>
                <label className="block text-slate-300 font-bold text-xs mb-1">
                  অর্ডার নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. ডেলিভারির আগে কাস্টমারকে কল দিন বা বিশেষ নির্দেশনা..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Advance delivery charge from customer checkbox (shown ONLY when 5 orders completed) */}
              {!isFiveOrderRuleActive && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-xs font-bold text-slate-200">
                    ডেলিভারি চার্জ অগ্রিম নিয়েছেন?
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setHasTakenAdvanceDeliveryFromCustomer('yes')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        hasTakenAdvanceDeliveryFromCustomer === 'yes'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      হ্যাঁ
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasTakenAdvanceDeliveryFromCustomer('no')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                        hasTakenAdvanceDeliveryFromCustomer === 'no'
                          ? 'bg-slate-800 text-white border-slate-700 shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      না
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. 5-Order Delivery Charge Advance Payment Rule Card */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-sm">
              {/* Status Header & 5-Order Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isFiveOrderRuleActive ? (
                      <Lock className="w-4 h-4 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <h4 className="font-bold text-white text-xs sm:text-sm">
                      {isFiveOrderRuleActive
                        ? '৫টি অর্ডার সফল ডেলিভারি শর্ত (অগ্রিম ডেলিভারি চার্জ)'
                        : '🎉 ফুল ক্যাশ অন ডেলিভারি আনলকড (৫টি সফল ডেলিভারি সম্পন্ন)'}
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      isFiveOrderRuleActive
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {deliveredOrdersCount} / ৫টি সফল ডেলিভারি
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isFiveOrderRuleActive ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (deliveredOrdersCount / 5) * 100)}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isFiveOrderRuleActive ? (
                    <>
                      নতুন রিসেলারদের প্রথম ৫টি অর্ডারের ডেলিভারি চার্জ (<strong>৳{deliveryFee}</strong>) কোম্পানির নাম্বারে অগ্রিম পরিশোধ করতে হবে। ৫টি অর্ডার সফলভাবে ডেলিভারি সম্পন্ন হলে পরবর্তী যেকোনো অর্ডারে কোনো অগ্রিম ছাড়াই <strong>সম্পূর্ণ ক্যাশ অন ডেলিভারি (COD)</strong> সুবিধা আনলক হয়ে যাবে।
                    </>
                  ) : (
                    <>
                      অভিনন্দন! আপনার ৫টি সফল ডেলিভারির শর্ত পূরণ হয়েছে। আপনি এখন কোনো প্রকার অগ্রিম ছাড়াই সরাসরি ক্যাশ অন ডেলিভারিতে অর্ডার প্লেস করতে পারবেন।
                    </>
                  )}
                </p>
              </div>

              {/* If 5-order rule is active: Show Payment numbers with 1-click Copy & Inputs */}
              {isFiveOrderRuleActive ? (
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>ডেলিভারি চার্জ পরিশোধ করুন: <strong>৳{deliveryFee}</strong></span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      সেন্ড মানি (Personal)
                    </span>
                  </div>

                  {/* Company Numbers with 1-click Copy */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* bKash */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-pink-400 font-bold block">বিকাশ (bKash)</span>
                        <span className="text-xs font-mono font-bold text-white">
                          {COMPANY_PAYMENT_NUMBERS.bkash}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPaymentNumber(COMPANY_PAYMENT_NUMBERS.bkash)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                        title="নম্বর কপি করুন"
                      >
                        {copiedNumber === COMPANY_PAYMENT_NUMBERS.bkash ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Nagad */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-amber-400 font-bold block">নগদ (Nagad)</span>
                        <span className="text-xs font-mono font-bold text-white">
                          {COMPANY_PAYMENT_NUMBERS.nagad}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPaymentNumber(COMPANY_PAYMENT_NUMBERS.nagad)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                        title="নম্বর কপি করুন"
                      >
                        {copiedNumber === COMPANY_PAYMENT_NUMBERS.nagad ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Rocket */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-purple-400 font-bold block">রকেট (Rocket)</span>
                        <span className="text-xs font-mono font-bold text-white">
                          {COMPANY_PAYMENT_NUMBERS.rocket}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPaymentNumber(COMPANY_PAYMENT_NUMBERS.rocket)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                        title="নম্বর কপি করুন"
                      >
                        {copiedNumber === COMPANY_PAYMENT_NUMBERS.rocket ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Payment Verification Form Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-slate-300 font-bold text-[11px] mb-1">
                        পেমেন্ট মাধ্যম *
                      </label>
                      <select
                        value={advanceMethod}
                        onChange={(e) => setAdvanceMethod(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold"
                      >
                        <option value="bkash">বিকাশ (bKash)</option>
                        <option value="nagad">নগদ (Nagad)</option>
                        <option value="rocket">রকেট (Rocket)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold text-[11px] mb-1">
                        যে নম্বর থেকে পাঠিয়েছেন *
                      </label>
                      <input
                        type="tel"
                        required
                        value={advanceSenderPhone}
                        onChange={(e) => setAdvanceSenderPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold text-[11px] mb-1">
                        TrxID (ট্রানজ্যাকশন আইডি) *
                      </label>
                      <input
                        type="text"
                        required
                        value={advanceTrxId}
                        onChange={(e) => setAdvanceTrxId(e.target.value)}
                        placeholder="e.g. 9J87KXYZ"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold uppercase"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-amber-400/90 flex items-center gap-1">
                    <Activity className="w-3 h-3 shrink-0" />
                    <span>পেমেন্ট সাবমিট করলে অর্ডারটি "পেমেন্ট ভেরিফিকেশন পেন্ডিং"-এ থাকবে। অ্যাডমিন চেক করে কনফার্ম করবেন।</span>
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    এই অর্ডারের জন্য কোনো অগ্রিম পেমেন্টের প্রয়োজন নেই। পার্সেল ডেলিভারি শেষে কাস্টমার থেকে সম্পূর্ণ বিল সংগ্রহ করা হবে এবং প্রফিট সরাসরি আপনার ওয়ালেটে জমা হবে।
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: PRICING, NET PROFIT CALCULATION & SUBMIT         */}
          {/* ============================================================== */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
            <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    প্রাইসিং ও কাস্টমার বিলিং হিসাব
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                  রিসেল বিল
                </span>
              </div>

              {/* Selling Price Input */}
              <div className="space-y-2">
                <label className="block text-slate-200 font-bold text-xs">
                  আপনার বিক্রয় মূল্য (প্রতি পিস) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-black text-sm">৳</span>
                  <input
                    type="number"
                    required
                    min={wholesaleCost}
                    step="10"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || wholesaleCost)}
                    className="w-full pl-8 pr-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-700 text-white font-black text-lg focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[100, 200, 300, 500].map((profit) => (
                    <button
                      key={profit}
                      type="button"
                      onClick={() => handleSetProfitPreset(profit)}
                      className={`py-1 px-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                        sellingPrice === wholesaleCost + profit
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      +৳{profit} লাভ
                    </button>
                  ))}
                </div>

                {/* Maximum Selling Price guidance */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400 font-medium">
                    ম্যাক্সিমাম সেলিং প্রাইস: <strong className="text-amber-300 font-mono font-bold">৳{maxSellingPrice}</strong>
                  </span>
                  {sellingPrice > maxSellingPrice ? (
                    <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-500/30">
                      💡 সর্বোচ্চ ৳{maxSellingPrice} সেল করলে ভালো
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                      ✓ সেরা রেঞ্জের মধ্যে
                    </span>
                  )}
                </div>
              </div>

              {/* Net Profit Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-950 border border-emerald-500/50 shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>আপনার সম্ভাব্য নিট লাভ:</span>
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-white tabular-nums mt-0.5 block">
                    +৳{netProfit.toLocaleString('en-BD')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold">কুরিয়ার COD কালেকশন:</span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    ৳{collectableCodAmount.toLocaleString('en-BD')}
                  </span>
                </div>
              </div>

              {/* Clean Cost Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>হোলসেল কেনা খরচ ({quantity} টি × ৳{wholesaleCost}):</span>
                  <span className="font-semibold text-slate-200">৳{(wholesaleCost * quantity).toLocaleString('en-BD')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>পণ্য সাব-টোটাল ({quantity} টি × ৳{sellingPrice}):</span>
                  <span className="font-bold text-white">৳{productSubtotal.toLocaleString('en-BD')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>ডেলিভারি চার্জ ({customerDistrict === 'dhaka' ? 'ঢাকার ভিতরে' : 'ঢাকার বাইরে'}):</span>
                  <span className="font-bold text-white">৳{deliveryFee}</span>
                </div>
                <div className="flex justify-between font-black text-white text-sm border-t border-slate-800 pt-2">
                  <span>কাস্টমার মোট বিল:</span>
                  <span className="text-emerald-400">৳{totalCustomerBill.toLocaleString('en-BD')}</span>
                </div>
                {isFiveOrderRuleActive && (
                  <div className="flex justify-between text-amber-400 font-bold text-xs pt-1">
                    <span>অগ্রিম ডেলিভারি পরিশোধ (রিসেলার):</span>
                    <span>- ৳{deliveryFee}</span>
                  </div>
                )}
                {!isFiveOrderRuleActive && hasTakenAdvanceDeliveryFromCustomer === 'yes' && (
                  <div className="flex justify-between text-emerald-400 font-bold text-xs pt-1">
                    <span>অগ্রিম ডেলিভারি নেওয়া হয়েছে (কাস্টমার):</span>
                    <span>- ৳{deliveryFee}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-slate-200 text-xs border-t border-slate-800/80 pt-2">
                  <span>কাস্টমার থেকে কুরিয়ার কালেকশন (COD):</span>
                  <span className="text-amber-400 font-mono text-sm">
                    ৳{collectableCodAmount.toLocaleString('en-BD')}
                  </span>
                </div>
              </div>

              {/* Agreement */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  required
                  checked={isTermsAgreed}
                  onChange={(e) => setIsTermsAgreed(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 mt-0.5 rounded cursor-pointer shrink-0"
                />
                <span className="leading-snug text-[11px]">
                  আমি কাস্টমার ও ডেলিভারি তথ্যের সত্যতা নিশ্চিত করছি এবং ড্রপশিপিং শর্তাবলীতে সম্মতি জানাচ্ছি।
                </span>
              </label>

              {/* Submit Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>অর্ডার কনফার্ম ও প্লেস করুন</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs transition-colors cursor-pointer border border-slate-800"
                >
                  বাতিল করুন
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
