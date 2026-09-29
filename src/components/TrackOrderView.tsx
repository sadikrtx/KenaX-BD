import React, { useState, useEffect } from 'react';
import {
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  RotateCcw,
  Receipt,
  Phone,
  FileSearch,
  Loader2,
  Lock,
} from 'lucide-react';
import { Order, OrderStatus, CustomerRecord } from '../types';
import { fetchSingleOrderFromDB } from '../lib/firebase';
import { CartItemImage } from './CartItemImage';
import {
  cleanBDPhoneNumber,
  isValidBDMobileNumber,
  isSameBDPhone,
  getBDPhoneValidationError,
} from '../utils/phoneUtils';
import { useLanguage } from '../context/LanguageContext';

export interface TrackOrderViewProps {
  orders: Order[];
  initialOrder?: Order | null;
  currentCustomer?: CustomerRecord | null;
  onNavigateShop?: () => void;
  onNavigateHome?: () => void;
  onSelectTrackOrder?: (order: Order | null) => void;
}

export const TrackOrderView: React.FC<TrackOrderViewProps> = ({
  orders,
  initialOrder,
  currentCustomer,
  onNavigateShop,
  onNavigateHome,
  onSelectTrackOrder,
}) => {
  const { t } = useLanguage();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [phoneInput, setPhoneInput] = useState(
    currentCustomer?.phone ? cleanBDPhoneNumber(currentCustomer.phone) : ''
  );
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(initialOrder || null);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Sync if initialOrder changes (e.g. from newly placed checkout or customer dashboard click)
  useEffect(() => {
    if (initialOrder) {
      setSearchedOrder(initialOrder);
      setOrderIdInput(initialOrder.id);
      if (initialOrder.deliveryMobile || initialOrder.customerMobile) {
        setPhoneInput(cleanBDPhoneNumber(initialOrder.deliveryMobile || initialOrder.customerMobile));
      }
      setErrorMessage('');
      setHasSearched(false);
    }
  }, [initialOrder]);

  // Sync default phone if customer logs in
  useEffect(() => {
    if (currentCustomer?.phone && !phoneInput) {
      setPhoneInput(cleanBDPhoneNumber(currentCustomer.phone));
    }
  }, [currentCustomer]);

  // Keep searchedOrder in sync with real-time updates to orders prop (e.g. when Admin changes status)
  useEffect(() => {
    if (searchedOrder) {
      const liveOrder = orders.find((o) => o.id === searchedOrder.id);
      if (
        liveOrder &&
        (liveOrder.orderStatus !== searchedOrder.orderStatus ||
          liveOrder.updatedAt !== searchedOrder.updatedAt)
      ) {
        setSearchedOrder(liveOrder);
      }
    }
  }, [orders]);

  const statusSteps: OrderStatus[] = [
    'Pending',
    'Confirmed',
    'Processing',
    'Packed',
    'Shipped',
    'Out for Delivery',
    'Delivered',
  ];

  const getStatusLabel = (status: OrderStatus | string) => {
    switch (status) {
      case 'Pending':
      case 'Payment Verification':
      case 'Unconfirmed':
        return t('অপেক্ষমাণ', 'Pending');
      case 'Confirmed':
        return t('নিশ্চিত', 'Confirmed');
      case 'Processing':
        return t('প্রসেসিং', 'Processing');
      case 'Packed':
        return t('প্যাকেটজাত', 'Packed');
      case 'Shipped':
        return t('শিপড / পাঠানো হয়েছে', 'Shipped');
      case 'Out for Delivery':
        return t('ডেলিভারির পথে', 'Out for Delivery');
      case 'Delivered':
      case 'Completed':
        return t('ডেলিভারি সম্পন্ন', 'Delivered');
      case 'Returned':
        return t('ডেলিভারি রিটার্ন', 'Delivery Returned');
      case 'Cancelled':
      case 'Rejected':
        return t('বাতিল / রিজেক্টেড', 'Cancelled');
      case 'Fake Order':
        return t('বাতিল (ফেক অর্ডার)', 'Cancelled (Fake Order)');
      default:
        return status;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const rawOrderId = orderIdInput.trim();
    const rawPhone = cleanBDPhoneNumber(phoneInput);

    // 1. Validation: Both Order ID and Phone Number are required
    if (!rawOrderId && !rawPhone) {
      setErrorMessage(t('আপনার অর্ডার ট্র্যাক করতে অর্ডার আইডি এবং ১১ ডিজিটের মোবাইল নম্বর উভয়ই দিন।', 'Please enter both your Order ID and 11-digit mobile number to track your order.'));
      setSearchedOrder(null);
      setHasSearched(true);
      return;
    }

    if (!rawOrderId) {
      setErrorMessage(t('অনুগ্রহ করে আপনার অর্ডার আইডি লিখুন (যেমন: KB-89241 বা 89241)।', 'Please enter your Order ID (e.g., KB-89241 or 89241).'));
      setSearchedOrder(null);
      setHasSearched(true);
      return;
    }

    if (!rawPhone) {
      setErrorMessage(t('অর্ডার করার সময় ব্যবহৃত ১১ ডিজিটের মোবাইল নম্বরটি লিখুন।', 'Please enter the 11-digit mobile number used when placing the order.'));
      setSearchedOrder(null);
      setHasSearched(true);
      return;
    }

    if (!isValidBDMobileNumber(rawPhone)) {
      setErrorMessage(t('ভুল মোবাইল নম্বর: অবশ্যই ০১৩, ০১৪, ০১৫, ০১৬, ০১৭, ০১৮ অথবা ০১৯ দিয়ে শুরু হওয়া ১১ ডিজিট হতে হবে।', 'Invalid Mobile Number: Must be an 11-digit number starting with 013, 014, 015, 016, 017, 018, or 019.'));
      setSearchedOrder(null);
      setHasSearched(true);
      return;
    }

    setHasSearched(true);
    setIsSearching(true);

    const cleanQuery = rawOrderId.toUpperCase();
    const queryWithoutPrefix = cleanQuery.replace(/^KB-/, '');

    // 2. Search in memory orders list
    let matchedOrder: Order | null = null;

    for (const ord of orders) {
      const ordIdUpper = (ord.id || '').toUpperCase();
      const ordIdWithoutPrefix = ordIdUpper.replace(/^KB-/, '');
      const trackingUpper = (ord.trackingNumber || '').toUpperCase();

      const isIdMatch =
        ordIdUpper === cleanQuery ||
        ordIdUpper === `KB-${cleanQuery}` ||
        ordIdWithoutPrefix === queryWithoutPrefix ||
        trackingUpper === cleanQuery;

      if (isIdMatch) {
        // MUST verify that the phone number matches this order
        const isPhoneMatch =
          isSameBDPhone(ord.customerMobile, rawPhone) ||
          isSameBDPhone(ord.deliveryMobile, rawPhone);

        if (isPhoneMatch) {
          matchedOrder = ord;
          break;
        }
      }
    }

    // 3. If not found in memory, query Cloud Firestore
    if (!matchedOrder) {
      try {
        const cloudOrder = await fetchSingleOrderFromDB(rawOrderId);
        if (cloudOrder) {
          // Verify cloud order's phone number as well
          const isPhoneMatch =
            isSameBDPhone(cloudOrder.customerMobile, rawPhone) ||
            isSameBDPhone(cloudOrder.deliveryMobile, rawPhone);

          if (isPhoneMatch) {
            matchedOrder = cloudOrder;
          }
        }
      } catch (err) {
        console.warn('Track order Cloud search error:', err);
      }
    }

    setIsSearching(false);

    if (matchedOrder) {
      setSearchedOrder(matchedOrder);
      setErrorMessage('');
      if (onSelectTrackOrder) onSelectTrackOrder(matchedOrder);
    } else {
      setSearchedOrder(null);
      setErrorMessage(
        `Order Not Found: No matching order was found for Order ID "${rawOrderId}" with mobile number "${rawPhone}". Please verify that both the Order ID and the 11-digit mobile number are correct.`
      );
    }
  };

  const handleResetSearch = () => {
    setOrderIdInput('');
    if (!currentCustomer?.phone) {
      setPhoneInput('');
    }
    setErrorMessage('');
    setHasSearched(false);
    setSearchedOrder(null);
    if (onSelectTrackOrder) onSelectTrackOrder(null);
  };

  const getStepStatus = (step: OrderStatus, currentStatus: OrderStatus) => {
    const effectiveStatus = (currentStatus === 'Completed') ? 'Delivered' : currentStatus;
    const stepIdx = statusSteps.indexOf(step);
    const currIdx = statusSteps.indexOf(effectiveStatus);

    if (currentStatus === 'Cancelled' || currentStatus === 'Rejected' || currentStatus === 'Fake Order') {
      return step === 'Pending' ? 'completed' : 'cancelled';
    }

    if (currentStatus === 'Returned') {
      return stepIdx <= 4 ? 'completed' : 'cancelled';
    }

    if (currIdx >= stepIdx) {
      return 'completed';
    }
    return 'upcoming';
  };

  // Find customer's own placed orders if logged in
  const customerOrders = currentCustomer
    ? orders.filter(
        (o) =>
          (currentCustomer.id && o.customerId === currentCustomer.id) ||
          (currentCustomer.phone &&
            (isSameBDPhone(o.customerMobile, currentCustomer.phone) ||
              isSameBDPhone(o.deliveryMobile, currentCustomer.phone))) ||
          (currentCustomer.email && o.customerEmail === currentCustomer.email)
      )
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* 1. Header with Tracking Guidance */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
          <Truck className="w-3.5 h-3.5" />
          <span>{t('লাইভ পার্সেল ট্র্যাকিং', 'Live Parcel Tracking')}</span>
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
          {t('আপনার অর্ডার ট্র্যাক করুন', 'Track Your Order')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
          {t(
            'রিয়েল-টাইম ডেলিভারি স্ট্যাটাস দেখতে আপনার অর্ডার আইডি এবং ১১ ডিজিটের মোবাইল নম্বর দিন।',
            'Enter your Order ID and your registered 11-digit Mobile Number (013–019) to verify and view real-time delivery status.'
          )}
        </p>

        {/* Multi-Field Strict Search Bar */}
        <form onSubmit={handleSearch} className="mt-6 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {/* Input 1: Order ID / Tracking ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('অর্ডার আইডি / ট্র্যাকিং আইডি', 'Order ID / Tracking ID')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Receipt className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderIdInput}
                  onChange={(e) => {
                    setOrderIdInput(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder={t('উদা: KB-89241 বা 89241', 'e.g. KB-89241 or 89241')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs"
                  required
                />
              </div>
            </div>

            {/* Input 2: 11-Digit Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('নিবন্ধিত মোবাইল নম্বর (১১ ডিজিট)', 'Registered Mobile Number (11-Digit)')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={phoneInput}
                  onChange={(e) => {
                    // Strictly numbers only, max 11 chars
                    const cleaned = cleanBDPhoneNumber(e.target.value);
                    setPhoneInput(cleaned);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="017XXXXXXXX"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono shadow-2xs"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>{t('নিরাপত্তার স্বার্থে উভয় তথ্য মিলিয়ে দেখা হবে।', 'Both credentials must match for order security.')}</span>
            </span>

            <div className="flex items-center gap-2">
              {(orderIdInput || phoneInput) && (
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  {t('মুছুন', 'Clear')}
                </button>
              )}
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors disabled:opacity-60"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('যাচাই করা হচ্ছে...', 'Verifying...')}</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>{t('অর্ডার ট্র্যাক করুন', 'Track Order')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Quick helper tag if order active */}
        {searchedOrder && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs">
            <span className="text-slate-500">{t('বর্তমান প্রদর্শিত:', 'Currently viewing:')}</span>
            <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              #{searchedOrder.id}
            </span>
            <button
              onClick={handleResetSearch}
              className="text-sky-600 hover:text-sky-800 font-semibold underline cursor-pointer ml-1"
            >
              {t('অন্য অর্ডার ট্র্যাক করুন', 'Track Another Order')}
            </button>
          </div>
        )}
      </div>

      {/* 2. Customer Recent Orders Quick Switcher (If Logged In & Has Placed Orders) */}
      {customerOrders.length > 0 && !searchedOrder && (
        <div className="mb-8 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Your Placed Orders ({customerOrders.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Click any order to view live tracking</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customerOrders.map((ord) => (
              <button
                key={ord.id}
                onClick={() => {
                  setSearchedOrder(ord);
                  setOrderIdInput(ord.id);
                  if (ord.deliveryMobile || ord.customerMobile) {
                    setPhoneInput(cleanBDPhoneNumber(ord.deliveryMobile || ord.customerMobile));
                  }
                  setErrorMessage('');
                  setHasSearched(true);
                  if (onSelectTrackOrder) onSelectTrackOrder(ord);
                }}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-slate-800/60 transition-all cursor-pointer group bg-slate-50/50 dark:bg-slate-850"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-400">
                    #{ord.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ord.orderStatus === 'Delivered' || ord.orderStatus === 'Completed'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                        : ord.orderStatus === 'Returned'
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                        : ord.orderStatus === 'Cancelled' || ord.orderStatus === 'Rejected' || ord.orderStatus === 'Fake Order'
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                        : 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300'
                    }`}
                  >
                    {ord.orderStatus === 'Completed' ? 'Delivered' : ord.orderStatus === 'Returned' ? 'Returned' : ord.orderStatus}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  ৳{ord.totalAmount.toLocaleString('en-BD')} • {new Date(ord.createdAt).toLocaleDateString('en-BD')}
                </p>
                <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 group-hover:underline flex items-center gap-1 mt-1.5">
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. CASE A: Error / Not Found Message */}
      {errorMessage && (
        <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-xs text-center max-w-2xl mx-auto animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-100 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Order Not Found</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">{errorMessage}</p>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left text-xs text-slate-600 dark:text-slate-400 space-y-1.5 max-w-md mx-auto mb-6">
            <p className="font-bold text-slate-800 dark:text-slate-200">Tracking Tips & Requirements:</p>
            <p>• Make sure to enter the exact <b>Order ID</b> (e.g. <b>KB-89241</b>).</p>
            <p>• Make sure to enter the registered <b>11-digit Bangladeshi mobile number</b> (013–019) used during checkout.</p>
            <p>• For customer privacy, orders cannot be tracked with mismatched phone numbers.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setErrorMessage('');
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Try Again
            </button>
            {onNavigateShop && (
              <button
                onClick={onNavigateShop}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Browse Shop
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. CASE B: No Order Selected (Logged out or haven't searched yet) */}
      {!searchedOrder && !errorMessage && (
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/80 border border-sky-100 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 mx-auto mb-4">
            <FileSearch className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">
            Track Any Active Parcel
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 max-w-md mx-auto leading-relaxed">
            Please enter your <b>Order ID</b> and your <b>11-digit Mobile Number</b> in the search box
            above to view live delivery timeline, courier status, and dispatch details.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md mx-auto mb-8">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block mb-1">1. Check Your Order ID</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Found on your checkout confirmation screen, SMS message, or invoice receipt.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block mb-1">2. Enter 11-Digit Mobile</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                The mobile number (013–019) entered during checkout for authentication.
              </p>
            </div>
          </div>

          {onNavigateShop && (
            <button
              onClick={onNavigateShop}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-xs cursor-pointer transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Start Shopping</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* 5. CASE C: Active Order Found & Displayed */}
      {searchedOrder && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-200">
          {/* Top Banner */}
          <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800">
            {/* Left/Main Column: Order Info & Status & Payment */}
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                  {t('অর্ডার বিবরণ', 'Order Details')}
                </span>
                <span className="text-xs bg-slate-800 px-2.5 py-0.5 rounded-full font-mono text-slate-300 border border-slate-700/60">
                  #{searchedOrder.id}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    searchedOrder.orderStatus === 'Delivered' || searchedOrder.orderStatus === 'Completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : searchedOrder.orderStatus === 'Returned'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : searchedOrder.orderStatus === 'Cancelled' || searchedOrder.orderStatus === 'Rejected'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : searchedOrder.orderStatus === 'Shipped'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : searchedOrder.orderStatus === 'Processing'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                  }`}
                >
                  ● {getStatusLabel(searchedOrder.orderStatus)}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {t('স্ট্যাটাস:', 'Status:')} <span className="text-sky-400">{getStatusLabel(searchedOrder.orderStatus)}</span>
              </h2>

              <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span>
                  {t('অর্ডারের তারিখ:', 'Placed on')}{' '}
                  <b className="text-white">{new Date(searchedOrder.createdAt).toLocaleDateString('en-BD')}</b>
                </span>
                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1.5 flex-wrap">
                  {t('পেমেন্ট:', 'Payment:')}{' '}
                  <b className="text-white">
                    {searchedOrder.paymentMethod === 'Cash on Delivery'
                      ? t('ক্যাশ অন ডেলিভারি', 'Cash on Delivery')
                      : searchedOrder.paymentMethod}
                  </b>
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      searchedOrder.paymentStatus === 'Paid' || searchedOrder.orderStatus === 'Delivered' || searchedOrder.orderStatus === 'Completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : searchedOrder.orderStatus === 'Returned'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    ({searchedOrder.orderStatus === 'Returned'
                      ? t('ডেলিভারি রিটার্ন (অপরিশোধিত)', 'Delivery Returned (Unpaid)')
                      : searchedOrder.paymentStatus === 'Paid' || searchedOrder.orderStatus === 'Delivered' || searchedOrder.orderStatus === 'Completed'
                      ? t('পরিশোধিত', 'Paid')
                      : t('অপরিশোধিত', 'Unpaid')})
                  </span>
                </span>
              </div>
            </div>

            {/* Right/Amount Column */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-between md:justify-end gap-3 shrink-0">
              <span className="text-xs sm:text-sm text-slate-400 font-medium">{t('সর্বমোট মূল্য:', 'Total Amount:')}</span>
              <span className="text-lg sm:text-2xl font-black text-sky-400">
                ৳ {searchedOrder.totalAmount.toLocaleString('en-BD')}
              </span>
            </div>
          </div>

          {/* Timeline Visualizer */}
          <div className="p-3 sm:p-7 border-b border-slate-100 bg-slate-50/60 overflow-hidden">
            {/* Delivery Progress & Current Status Header */}
            <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0"></span>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 truncate">
                  {t('ডেলিভারি অগ্রগতি', 'Delivery Progress')}
                </h3>
              </div>
              <div className="shrink-0">
                <span className="text-[10px] sm:text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-sky-200">
                  {t('বর্তমান স্ট্যাটাস:', 'Current Status:')}{' '}
                  <b className="font-black text-sky-900">{getStatusLabel(searchedOrder.orderStatus)}</b>
                </span>
              </div>
            </div>

            {/* 7-Step Responsive Node Line */}
            <div className="py-2 w-full">
              <div className="w-full relative">
                {/* Connecting Track Line behind the circles */}
                <div className="absolute top-3 sm:top-5 left-[7.14%] right-[7.14%] h-1 sm:h-1.5 bg-slate-200 rounded-full z-0 -translate-y-1/2">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 via-sky-600 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${
                        searchedOrder.orderStatus === 'Cancelled' || searchedOrder.orderStatus === 'Rejected' || searchedOrder.orderStatus === 'Fake Order'
                          ? 0
                          : searchedOrder.orderStatus === 'Delivered' || searchedOrder.orderStatus === 'Completed'
                          ? 100
                          : searchedOrder.orderStatus === 'Returned'
                          ? 60
                          : Math.max(
                              0,
                              Math.min(
                                100,
                                (statusSteps.indexOf(searchedOrder.orderStatus) / (statusSteps.length - 1)) * 100
                              )
                            )
                      }%`,
                    }}
                  />
                </div>

                {/* 7 Step Nodes Grid */}
                <div className="grid grid-cols-7 relative z-10">
                  {statusSteps.map((step, idx) => {
                    const effectiveStatus = searchedOrder.orderStatus === 'Completed' ? 'Delivered' : searchedOrder.orderStatus;
                    const state = getStepStatus(step, searchedOrder.orderStatus);
                    const isCompleted = state === 'completed';
                    const isCurrent = effectiveStatus === step;
                    const isCancelled = searchedOrder.orderStatus === 'Cancelled' || searchedOrder.orderStatus === 'Rejected' || searchedOrder.orderStatus === 'Fake Order';

                    return (
                      <div key={idx} className="flex flex-col items-center text-center px-0.5">
                        {/* Circle Badge */}
                        <div
                          className={`w-6 h-6 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isCurrent
                              ? 'bg-emerald-600 text-white ring-2 sm:ring-4 ring-emerald-100 shadow-md scale-105 sm:scale-110'
                              : isCompleted
                              ? 'bg-sky-600 text-white ring-1 sm:ring-2 ring-sky-100 shadow-xs'
                              : isCancelled
                              ? 'bg-rose-50 text-rose-400 border border-rose-200'
                              : 'bg-white text-slate-400 border border-slate-200 shadow-xs'
                          }`}
                          title={`Step ${idx + 1}: ${step}`}
                        >
                          {isCompleted && !isCurrent ? (
                            <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
                          ) : (
                            <span className="text-[10px] sm:text-xs font-black">{idx + 1}</span>
                          )}
                        </div>

                        {/* Step Label */}
                        <div className="mt-1.5 text-center">
                          <span
                            className={`block text-[8px] sm:text-xs font-bold leading-tight tracking-tighter sm:tracking-normal ${
                              isCurrent
                                ? 'text-emerald-700 font-black'
                                : isCompleted
                                ? 'text-slate-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {getStatusLabel(step)}
                          </span>
                          {isCurrent && (
                            <span className="hidden sm:inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 tracking-wide uppercase">
                              {t('চলমান', 'Active')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid: Delivery Snapshot & Items */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Delivery Snapshot */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span>{t('ডেলিভারি ঠিকানা বিবরণ', 'Delivery Address Snapshot')}</span>
              </h4>

              <div className="space-y-1.5 text-xs text-slate-700">
                <p>
                  {t('গ্রাহকের নাম:', 'Recipient Name:')} <b>{searchedOrder.deliveryName}</b>
                </p>
                <p>
                  {t('মোবাইল নম্বর:', 'Mobile Number:')} <b>{searchedOrder.deliveryMobile}</b>
                </p>
                <p>
                  {t('বিভাগ ও জেলা:', 'Division & District:')} <b>{searchedOrder.division}, {searchedOrder.district}</b>
                </p>
                <p>
                  {t('উপজেলা / থানা:', 'Upazila / Thana:')} <b>{searchedOrder.upazila}</b> {searchedOrder.area && `(${searchedOrder.area})`}
                </p>
                <p className="pt-1 text-slate-800">
                  {t('বিস্তারিত ঠিকানা:', 'Detailed Address:')} <b>{searchedOrder.fullAddress}</b>
                </p>
                {searchedOrder.deliveryInstructions && (
                  <p className="text-slate-500 italic pt-1">
                    {t('নির্দেশনা:', 'Instructions:')} "{searchedOrder.deliveryInstructions}"
                  </p>
                )}
              </div>

              {/* Courier info */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">{t('নির্ধারিত কুরিয়ার:', 'Assigned Courier:')}</span>
                  <span className="font-bold text-slate-900">
                    {searchedOrder.courierName || 'Steadfast Courier'}
                  </span>
                </div>
                {searchedOrder.trackingNumber && (
                  <div className="text-right">
                    <span className="text-slate-500 block">{t('ট্র্যাকিং নম্বর:', 'Tracking #:')}</span>
                    <span className="font-mono font-bold text-sky-600">
                      {searchedOrder.trackingNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-sky-600" />
                <span>{t('অর্ডারের পণ্যসমূহ', 'Parcel Items')} ({(searchedOrder.items || []).length})</span>
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(searchedOrder.items || []).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200"
                  >
                    <CartItemImage item={item} sizeClassName="w-10 h-10 rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.productName}</p>
                      <p className="text-[11px] text-slate-500">
                        {t('পরিমাণ:', 'Qty:')} {item.quantity} × ৳{item.price.toLocaleString('en-BD')}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      ৳{(item.price * item.quantity).toLocaleString('en-BD')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>{t('সাবটোটাল:', 'Subtotal:')}</span>
                  <span>৳ {searchedOrder.subtotal.toLocaleString('en-BD')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('ডেলিভারি চার্জ:', 'Delivery Charge:')}</span>
                  <span>৳ {searchedOrder.deliveryCharge}</span>
                </div>
                {searchedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>{t('ডিসকাউন্ট:', 'Discount:')}</span>
                    <span>- ৳ {searchedOrder.discount.toLocaleString('en-BD')}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>{t('সর্বমোট প্রদেয়:', 'Total Paid/Payable:')}</span>
                  <span className="text-sky-600">৳ {searchedOrder.totalAmount.toLocaleString('en-BD')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{t('১০০% আসল পণ্য ডেলিভারির নিশ্চয়তা', '100% Genuine Parcel Delivery Guaranteed')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetSearch}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold cursor-pointer transition-colors"
              >
                {t('অন্য অর্ডার ট্র্যাক করুন', 'Track Another Order')}
              </button>
              {onNavigateShop && (
                <button
                  onClick={onNavigateShop}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer transition-colors"
                >
                  {t('শপিং চালিয়ে যান', 'Continue Shopping')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
