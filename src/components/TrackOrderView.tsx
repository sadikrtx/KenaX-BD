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
  PhoneCall,
  FileSearch,
  Loader2,
  Lock,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Navigation,
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { Order, OrderStatus, CustomerRecord } from '../types';
import { fetchSingleOrderFromDB, getCustomersFromDB } from '../lib/firebase';
import { CartItemImage } from './CartItemImage';
import {
  cleanBDPhoneNumber,
  isValidBDMobileNumber,
  isSameBDPhone,
  getBDPhoneValidationError,
} from '../utils/phoneUtils';
import { resolveCourierTrackingUrl } from '../utils/courierUtils';
import { useLanguage } from '../context/LanguageContext';

export interface TrackOrderViewProps {
  orders: Order[];
  initialOrder?: Order | null;
  currentCustomer?: CustomerRecord | null;
  customers?: CustomerRecord[];
  onNavigateShop?: () => void;
  onNavigateHome?: () => void;
  onSelectTrackOrder?: (order: Order | null) => void;
}

/**
 * Smart Multi-Channel Phone Verification:
 * Matches if the entered phone is EITHER:
 * 1. The mobile number entered when placing the order / buying the product (customerMobile / deliveryMobile / phone)
 * 2. The registered account mobile number used to create the customer account (even if the order used a different number)
 * 3. The currently logged-in account mobile number (if the order belongs to this customer)
 */
export function isOrderMatchingTrackingPhone(
  order: Order,
  searchPhone: string,
  allCustomers: CustomerRecord[] = [],
  loggedInCustomer?: CustomerRecord | null
): boolean {
  if (!order || !searchPhone) return false;
  const cleanSearchPhone = cleanBDPhoneNumber(searchPhone);
  if (!cleanSearchPhone) return false;

  // 1. Direct Order Contact Numbers (Entered at checkout / guest buying)
  const orderPhones = [
    order.customerMobile,
    order.deliveryMobile,
    order.customerPhone,
    order.phone,
    order.mobile,
  ].filter(Boolean) as string[];

  for (const op of orderPhones) {
    if (isSameBDPhone(op, cleanSearchPhone)) {
      return true;
    }
  }

  // 2. Currently Logged-in Customer Account Phone (Registered Account Number)
  if (loggedInCustomer && loggedInCustomer.phone) {
    if (isSameBDPhone(loggedInCustomer.phone, cleanSearchPhone)) {
      if (
        (order.customerId && order.customerId === loggedInCustomer.id) ||
        (order.customerEmail && loggedInCustomer.email && order.customerEmail.toLowerCase().trim() === loggedInCustomer.email.toLowerCase().trim()) ||
        (loggedInCustomer.orderIds && Array.isArray(loggedInCustomer.orderIds) && loggedInCustomer.orderIds.includes(order.id))
      ) {
        return true;
      }
    }
  }

  // 3. Registered Customer Accounts in DB (Lookup account matching entered phone)
  for (const cust of allCustomers) {
    if (!cust) continue;
    const custPhones = [
      cust.phone,
      (cust as any).mobileNumber,
      (cust as any).mobile,
      (cust as any).deliveryMobile,
    ].filter(Boolean) as string[];

    const hasPhoneMatch = custPhones.some((cp) => isSameBDPhone(cp, cleanSearchPhone));

    if (hasPhoneMatch) {
      // Check if this customer account is associated with this order (by customerId, orderIds array, or email)
      const isOwner =
        (order.customerId && order.customerId !== 'cust-guest' && order.customerId === cust.id) ||
        (cust.orderIds && Array.isArray(cust.orderIds) && cust.orderIds.includes(order.id)) ||
        (order.customerEmail && cust.email && order.customerEmail.toLowerCase().trim() === cust.email.toLowerCase().trim());

      if (isOwner) {
        return true;
      }
    }
  }

  // 4. If the order has an explicit customerId, look up that customer record directly
  if (order.customerId && order.customerId !== 'cust-guest') {
    const owner = allCustomers.find((c) => c && c.id === order.customerId);
    if (owner && owner.phone && isSameBDPhone(owner.phone, cleanSearchPhone)) {
      return true;
    }
  }

  // 5. If the order has a customer email, look up that customer record directly
  if (order.customerEmail && order.customerEmail.trim()) {
    const targetEmail = order.customerEmail.toLowerCase().trim();
    const owner = allCustomers.find((c) => c && c.email && c.email.toLowerCase().trim() === targetEmail);
    if (owner && owner.phone && isSameBDPhone(owner.phone, cleanSearchPhone)) {
      return true;
    }
  }

  return false;
}

export const TrackOrderView: React.FC<TrackOrderViewProps> = ({
  orders,
  initialOrder,
  currentCustomer,
  customers = [],
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
  const [customerRecords, setCustomerRecords] = useState<CustomerRecord[]>(customers);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [itemsExpanded, setItemsExpanded] = useState(true);

  const handleCopy = (text: string, type: 'id' | 'tracking') => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      if (type === 'id') {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else {
        setCopiedTracking(true);
        setTimeout(() => setCopiedTracking(false), 2000);
      }
    } catch {}
  };

  // Sync customers from DB & local cache on mount
  useEffect(() => {
    getCustomersFromDB().then((list) => {
      if (list && list.length > 0) {
        setCustomerRecords(list);
      }
    });
  }, []);

  useEffect(() => {
    if (customers && customers.length > 0) {
      setCustomerRecords(customers);
    }
  }, [customers]);

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

  const getStepDescription = (step: OrderStatus | string) => {
    switch (step) {
      case 'Pending':
      case 'Payment Verification':
      case 'Unconfirmed':
        return t(
          'আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। দ্রুততম সময়ে ভেরিফিকেশন সম্পন্ন হবে।',
          'Your order has been received and is queued for verification.'
        );
      case 'Confirmed':
        return t(
          'অর্ডারটি কনফার্ম করা হয়েছে। ওয়্যারহাউস থেকে পণ্য সংগ্রহ ও প্যাকিংয়ের জন্য প্রস্তুত হচ্ছে।',
          'Order confirmed and routed to warehouse for fulfillment.'
        );
      case 'Processing':
        return t(
          'পণ্যটি গুদাম থেকে সংগ্রহ করে কোয়ালিটি টেস্ট ও প্যাকিং প্রস্তুত করা হচ্ছে।',
          'Items undergoing strict quality checks and packing preparation.'
        );
      case 'Packed':
        return t(
          'পণ্যটির সুরক্ষিত প্যাকিং ও ইনভয়েস সংযুক্ত করা সম্পন্ন হয়েছে, কুরিয়ারে হস্তান্তরের জন্য প্রস্তুত।',
          'Parcel safely packed, labeled, and staged for courier handover.'
        );
      case 'Shipped':
        return t(
          'পার্সেলটি নির্ধারিত কুরিয়ার সার্ভিসে হস্তান্তর করা হয়েছে। গন্তব্যে রওনা হয়েছে।',
          'Parcel handed over to courier partner and transit dispatched.'
        );
      case 'Out for Delivery':
        return t(
          'কুরিয়ার ডেলিভারি রাইডার আপনার ঠিকানায় পার্সেলটি নিয়ে বের হয়েছেন। খুব শীঘ্রই কল করবেন।',
          'Courier delivery agent is out for final doorstep delivery.'
        );
      case 'Delivered':
      case 'Completed':
        return t(
          'পার্সেলটি সফলভাবে আপনার হাতে পৌঁছে দেওয়া হয়েছে। KenaX BD-এর সাথে কেনাকাটার জন্য ধন্যবাদ!',
          'Parcel successfully delivered. Thank you for shopping with KenaX BD!'
        );
      case 'Returned':
        return t(
          'পার্সেলটি ডেলিভারি সম্পন্ন হতে ব্যর্থ হয়ে ওয়্যারহাউসে রিটার্ন হয়েছে।',
          'Delivery attempt was unsuccessful and parcel returned.'
        );
      case 'Cancelled':
      case 'Rejected':
      case 'Fake Order':
        return t(
          'অর্ডারটি বাতিল বা রিজেক্ট করা হয়েছে। কোনো প্রশ্ন থাকলে সাপোর্টে যোগাযোগ করুন।',
          'Order has been cancelled or rejected. Contact support for details.'
        );
      default:
        return '';
    }
  };

  const getStepIcon = (step: OrderStatus | string) => {
    switch (step) {
      case 'Pending':
      case 'Payment Verification':
      case 'Unconfirmed':
        return Clock;
      case 'Confirmed':
        return CheckCircle2;
      case 'Processing':
        return RotateCcw;
      case 'Packed':
        return PackageCheck;
      case 'Shipped':
        return Truck;
      case 'Out for Delivery':
        return Navigation;
      case 'Delivered':
      case 'Completed':
        return Sparkles;
      default:
        return Package;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const rawOrderId = orderIdInput.trim();
    const rawPhone = cleanBDPhoneNumber(phoneInput);

    // 1. Validation: Both Tracking ID and Phone Number are required
    if (!rawOrderId && !rawPhone) {
      setErrorMessage(t('আপনার অর্ডার ট্র্যাক করতে ট্র্যাকিং আইডি এবং মোবাইল নম্বর দিন।', 'Please enter your Tracking ID and mobile number to track your order.'));
      setSearchedOrder(null);
      setHasSearched(true);
      return;
    }

    if (!rawOrderId) {
      setErrorMessage(t('অনুগ্রহ করে আপনার ট্র্যাকিং আইডি লিখুন (যেমন: KB-89241 বা 89241)।', 'Please enter your Tracking ID (e.g., KB-89241 or 89241).'));
      setSearchedOrder(null);
      setHasSearched(true);
      return;
    }

    if (!rawPhone) {
      setErrorMessage(t('অনুগ্রহ করে আপনার মোবাইল নম্বরটি লিখুন।', 'Please enter your mobile number.'));
      setSearchedOrder(null);
      setHasSearched(true);
      return;
    }

    if (!isValidBDMobileNumber(rawPhone)) {
      setErrorMessage(t('ভুল মোবাইল নম্বর: অবশ্যই ০১৩, ০১৪, ০১৫, ০১৬, ০১৭, ০১৮ অথবা ০১৯ দিয়ে শুরু হওয়া ১১ ডিজিটের নম্বর হতে হবে।', 'Invalid Mobile Number: Must be a valid 11-digit number starting with 013, 014, 015, 016, 017, 018, or 019.'));
      setSearchedOrder(null);
      setHasSearched(true);
      return;
    }

    setHasSearched(true);
    setIsSearching(true);

    // Refresh latest customer accounts from DB if needed
    let latestCustomers = customerRecords;
    try {
      const freshCusts = await getCustomersFromDB();
      if (freshCusts && freshCusts.length > 0) {
        latestCustomers = freshCusts;
        setCustomerRecords(freshCusts);
      }
    } catch {}

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
        // Dual Phone Verification: Matches if either checkout phone OR registered account phone
        const isPhoneMatch = isOrderMatchingTrackingPhone(ord, rawPhone, latestCustomers, currentCustomer);

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
          const isPhoneMatch = isOrderMatchingTrackingPhone(cloudOrder, rawPhone, latestCustomers, currentCustomer);

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
        t(
          `অর্ডার পাওয়া যায়নি: #${rawOrderId} ট্র্যাকিং আইডির সাথে "${rawPhone}" মোবাইল নম্বরের কোনো মিল পাওয়া যায়নি। অনুগ্রহ করে সঠিক ট্র্যাকিং আইডি ও মোবাইল নম্বর দিয়ে পুনরায় চেষ্টা করুন।`,
          `Order Not Found: No matching order found for #${rawOrderId} with mobile number "${rawPhone}". Please verify your Tracking ID and mobile number and try again.`
        )
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

        {/* Multi-Field Dual-Source Search Bar */}
        <form onSubmit={handleSearch} className="mt-6 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {/* Input 1: Tracking ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('ট্র্যাকিং আইডি', 'Tracking ID')} <span className="text-rose-500">*</span>
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

            {/* Input 2: Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('মোবাইল নম্বর', 'Mobile Number')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={phoneInput}
                  onChange={(e) => {
                    const cleaned = cleanBDPhoneNumber(e.target.value);
                    setPhoneInput(cleaned);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="01XXXXXXXXX"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono shadow-2xs"
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
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
            <p>• Make sure to enter the exact <b>Tracking ID</b> (e.g. <b>KB-89241</b>).</p>
            <p>• Make sure to enter the <b>Mobile Number</b> used during order or registration.</p>
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
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{t('লাইভ পার্সেল ট্র্যাকিং', 'Live Parcel Tracking')}</span>
                </span>

                {/* Click to Copy Order ID directly (No separate copy icon) */}
                <button
                  type="button"
                  onClick={() => handleCopy(searchedOrder.id, 'id')}
                  className="inline-flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 active:scale-95 px-2.5 py-0.5 rounded-full font-mono text-slate-200 border border-slate-700 transition-all cursor-pointer"
                  title={t('অর্ডার আইডি কপি করতে ক্লিক করুন', 'Click to copy Order ID')}
                >
                  <span>#{searchedOrder.id}</span>
                  {copiedId && (
                    <span className="text-emerald-400 text-[10px] font-sans font-bold">
                      {t('✓ কপি হয়েছে', '✓ Copied!')}
                    </span>
                  )}
                </button>

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
                      : t('ক্যাশ অন ডেলিভারিতে প্রদেয়', 'Due on Delivery')})
                  </span>
                </span>
              </div>
            </div>

            {/* Right/Amount Column */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-between md:justify-end gap-3 shrink-0">
              <span className="text-xs sm:text-sm text-slate-400 font-medium">{t('সর্বমোট প্রদেয়:', 'Total Due:')}</span>
              <span className="text-lg sm:text-2xl font-black text-sky-400">
                ৳ {searchedOrder.totalAmount.toLocaleString('en-BD')}
              </span>
            </div>
          </div>

          {/* Current Milestone Highlight Card */}
          <div className="p-4 sm:p-6 bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-emerald-500/10 dark:from-sky-950/40 dark:via-slate-900 dark:to-emerald-950/30 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-600/20 ring-4 ring-sky-100 dark:ring-sky-950">
                  {React.createElement(getStepIcon(searchedOrder.orderStatus), { className: 'w-5 h-5' })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300">
                      {t('বর্তমান ধাপ', 'Current Milestone')}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {getStatusLabel(searchedOrder.orderStatus)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                    {getStepDescription(searchedOrder.orderStatus)}
                  </p>
                </div>
              </div>

              {/* Courier Live Button if assigned AND order is Shipped or beyond */}
              {(() => {
                const s = (searchedOrder.orderStatus || '').toLowerCase().trim();
                const isShippedOrBeyond = s === 'shipped' || s === 'out for delivery' || s === 'delivered' || s === 'completed';
                if (!isShippedOrBeyond || (!searchedOrder.trackingNumber && !searchedOrder.trackingUrl)) {
                  return null;
                }
                return (
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 pt-1 sm:pt-0">
                    {searchedOrder.trackingNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopy(searchedOrder.trackingNumber || '', 'tracking')}
                        className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-sky-400 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                        title="কুরিয়ার ট্র্যাকিং কোড কপি করুন"
                      >
                        <span>{searchedOrder.trackingNumber}</span>
                        {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                    )}
                    <a
                      href={
                        searchedOrder.trackingUrl ||
                        resolveCourierTrackingUrl(searchedOrder.courierName, searchedOrder.trackingNumber)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="কুরিয়ার লাইভ ট্র্যাকিং পেজ দেখুন"
                    >
                      <span>{t('কুরিয়ার লাইভ', 'Courier Live')}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ============================================================== */}
          {/* ORDER TRACKING TIMELINE - STRAIGHT VERTICAL PROGRESS FLOW DOWNWARD */}
          {/* ============================================================== */}
          <div className="p-4 sm:p-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {t('অর্ডার ডেলিভারি অগ্রগতি', 'Order Delivery Progress')}
                </h3>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {searchedOrder.orderStatus === 'Delivered' || searchedOrder.orderStatus === 'Completed'
                  ? '৭/৭ সম্পন্ন'
                  : `${Math.max(1, statusSteps.indexOf(searchedOrder.orderStatus) + 1)}/৭ ধাপ`}
              </span>
            </div>

            {/* Straight Vertical Timeline Container - Steps Going Downward */}
            <div className="relative pl-7 sm:pl-10 space-y-4 sm:space-y-5 max-w-3xl">
              {/* Connecting Vertical Track Line Running Straight Down */}
              <div className="absolute left-[13px] sm:left-[19px] top-4 bottom-4 w-1 bg-slate-200 dark:bg-slate-800 rounded-full">
                {/* Active progress fill moving downwards */}
                <div
                  className="w-full bg-gradient-to-b from-sky-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{
                    height: `${
                      searchedOrder.orderStatus === 'Cancelled' || searchedOrder.orderStatus === 'Rejected' || searchedOrder.orderStatus === 'Fake Order'
                        ? '14%'
                        : searchedOrder.orderStatus === 'Delivered' || searchedOrder.orderStatus === 'Completed'
                        ? '100%'
                        : searchedOrder.orderStatus === 'Returned'
                        ? '65%'
                        : `${Math.max(8, ((statusSteps.indexOf(searchedOrder.orderStatus) + 0.5) / statusSteps.length) * 100)}%`
                    }`,
                  }}
                />
              </div>

              {/* 7 Vertical Step Nodes Running Straight Down */}
              {statusSteps.map((step, idx) => {
                const effectiveStatus = searchedOrder.orderStatus === 'Completed' ? 'Delivered' : searchedOrder.orderStatus;
                const state = getStepStatus(step, searchedOrder.orderStatus);
                const isCompleted = state === 'completed';
                const isCurrent = effectiveStatus === step;
                const isCancelled = searchedOrder.orderStatus === 'Cancelled' || searchedOrder.orderStatus === 'Rejected' || searchedOrder.orderStatus === 'Fake Order';
                const StepIcon = getStepIcon(step);

                return (
                  <div key={idx} className="relative flex items-start gap-3 sm:gap-4">
                    {/* Circle Node on the straight vertical line */}
                    <div
                      className={`relative z-10 w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 -ml-7 sm:-ml-10 ${
                        isCurrent
                          ? 'bg-gradient-to-tr from-sky-600 to-indigo-600 text-white ring-4 ring-sky-300/40 dark:ring-sky-500/30 shadow-md shadow-sky-500/30 scale-105'
                          : isCompleted
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isCancelled
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-500 border border-rose-300 dark:border-rose-800'
                          : 'bg-white dark:bg-slate-800 text-slate-400 border-2 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isCompleted && !isCurrent ? (
                        <Check className="w-3.5 h-3.5 sm:w-5 sm:h-5 stroke-[3]" />
                      ) : (
                        <StepIcon className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                      )}
                    </div>

                    {/* Step Content Card */}
                    <div
                      className={`flex-1 rounded-2xl p-3 sm:p-4 transition-all ${
                        isCurrent
                          ? 'bg-white dark:bg-slate-850 border-2 border-sky-400/80 dark:border-sky-500/80 shadow-md ring-2 ring-sky-400/10'
                          : isCompleted
                          ? 'bg-white/80 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800'
                          : 'bg-transparent border border-transparent opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-xs sm:text-sm font-bold truncate ${
                              isCurrent
                                ? 'text-sky-700 dark:text-sky-300 font-black'
                                : isCompleted
                                ? 'text-slate-800 dark:text-slate-200'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {idx + 1}. {getStatusLabel(step)}
                          </span>
                        </div>

                        {/* Status badge pill */}
                        {isCurrent && (
                          <span className="shrink-0 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-emerald-500 text-white tracking-wide uppercase shadow-xs animate-pulse">
                            {t('চলমান', 'Active')}
                          </span>
                        )}
                        {isCompleted && !isCurrent && (
                          <span className="shrink-0 text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>{t('সম্পন্ন', 'Done')}</span>
                          </span>
                        )}
                      </div>

                      {/* When Active: Show helpful detailed description */}
                      {isCurrent && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          <p>{getStepDescription(step)}</p>
                          {searchedOrder.courierName && (step === 'Shipped' || step === 'Out for Delivery') && (
                            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 bg-sky-50 dark:bg-sky-950/60 p-2.5 rounded-xl border border-sky-200 dark:border-sky-800/80">
                              <span className="text-xs font-bold text-sky-800 dark:text-sky-300">
                                🚚 {searchedOrder.courierName}
                              </span>
                              <div className="flex items-center gap-2">
                                {searchedOrder.trackingNumber && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(searchedOrder.trackingNumber || '', 'tracking')}
                                    className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 underline hover:text-sky-700 cursor-pointer"
                                  >
                                    #{searchedOrder.trackingNumber}
                                  </button>
                                )}
                                {(searchedOrder.trackingUrl || searchedOrder.trackingNumber) && (
                                  <a
                                    href={searchedOrder.trackingUrl || resolveCourierTrackingUrl(searchedOrder.courierName, searchedOrder.trackingNumber)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-0.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                  >
                                    <span>{t('কুরিয়ার লাইভ', 'Courier Live')}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Grid: Delivery Snapshot & Items */}
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Delivery Snapshot */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>{t('ডেলিভারি ঠিকানা বিবরণ', 'Delivery Address Snapshot')}</span>
              </h4>

              <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <p>
                  {t('গ্রাহকের নাম:', 'Recipient Name:')}{' '}
                  <b className="text-slate-900 dark:text-white">{searchedOrder.deliveryName || searchedOrder.customerName}</b>
                </p>
                <div className="flex items-center gap-2">
                  <span>{t('মোবাইল নম্বর:', 'Mobile Number:')}</span>
                  <b className="text-slate-900 dark:text-white font-mono">{searchedOrder.deliveryMobile || searchedOrder.customerMobile}</b>
                  {(searchedOrder.deliveryMobile || searchedOrder.customerMobile) && (
                    <a
                      href={`tel:${searchedOrder.deliveryMobile || searchedOrder.customerMobile}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{t('কল', 'Call')}</span>
                    </a>
                  )}
                </div>
                <p>
                  {t('বিভাগ ও জেলা:', 'Division & District:')}{' '}
                  <b className="text-slate-900 dark:text-white">{searchedOrder.division}, {searchedOrder.district}</b>
                </p>
                <p>
                  {t('উপজেলা / থানা:', 'Upazila / Thana:')}{' '}
                  <b className="text-slate-900 dark:text-white">{searchedOrder.upazila}</b> {searchedOrder.area && `(${searchedOrder.area})`}
                </p>
                <p className="pt-1 text-slate-800 dark:text-slate-200">
                  {t('বিস্তারিত ঠিকানা:', 'Detailed Address:')}{' '}
                  <b className="text-slate-900 dark:text-white">{searchedOrder.fullAddress}</b>
                </p>
                {searchedOrder.deliveryInstructions && (
                  <p className="text-slate-500 italic pt-1">
                    {t('নির্দেশনা:', 'Instructions:')} "{searchedOrder.deliveryInstructions}"
                  </p>
                )}
              </div>

              {/* Courier info (Visible when order is Shipped or beyond) */}
              {(() => {
                const s = (searchedOrder.orderStatus || '').toLowerCase().trim();
                const isShippedOrBeyond = s === 'shipped' || s === 'out for delivery' || s === 'delivered' || s === 'completed';
                if (!isShippedOrBeyond) {
                  return (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{t('কুরিয়ার স্ট্যাটাস:', 'Courier Status:')}</span>
                      <span className="font-medium italic text-sky-700 dark:text-sky-300">
                        {t('অর্ডার প্যাকেজিং শেষে শিফট হলে কুরিয়ার তথ্য ও লাইভ লিঙ্ক যুক্ত হবে', 'Courier live tracking will appear once shipped')}
                      </span>
                    </div>
                  );
                }
                return (
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{t('নির্ধারিত কুরিয়ার:', 'Assigned Courier:')}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {searchedOrder.courierName || 'Steadfast Courier'}
                      </span>
                    </div>
                    {(searchedOrder.trackingNumber || searchedOrder.trackingUrl) && (
                      <div className="flex items-center gap-2">
                        {searchedOrder.trackingNumber && (
                          <div className="text-right">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t('ট্র্যাকিং নম্বর:', 'Tracking #:')}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(searchedOrder.trackingNumber || '', 'tracking')}
                              className="font-mono font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 ml-auto text-xs"
                            >
                              <span>{searchedOrder.trackingNumber}</span>
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <a
                          href={searchedOrder.trackingUrl || resolveCourierTrackingUrl(searchedOrder.courierName, searchedOrder.trackingNumber)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0"
                          title="কুরিয়ার লাইভ ট্র্যাকিং পেজ দেখুন"
                        >
                          <span>{t('কুরিয়ার লাইভ', 'Courier Live')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Order Items */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>{t('অর্ডারের পণ্যসমূহ', 'Parcel Items')} ({(searchedOrder.items || []).length})</span>
                </h4>
                {(searchedOrder.items || []).length > 2 && (
                  <button
                    type="button"
                    onClick={() => setItemsExpanded((p) => !p)}
                    className="text-[11px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{itemsExpanded ? t('সংক্ষেপ', 'Collapse') : t('সব দেখুন', 'Expand')}</span>
                    {itemsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>

              <div className={`space-y-2 overflow-y-auto pr-1 ${itemsExpanded ? 'max-h-56' : 'max-h-28'}`}>
                {(searchedOrder.items || []).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <CartItemImage item={item} sizeClassName="w-10 h-10 rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.productName}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t('পরিমাণ:', 'Qty:')} {item.quantity} × ৳{item.price.toLocaleString('en-BD')}
                        {item.selectedColor && ` • ${item.selectedColor}`}
                        {item.selectedSize && ` (${item.selectedSize})`}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      ৳{(item.price * item.quantity).toLocaleString('en-BD')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>{t('সাবটোটাল:', 'Subtotal:')}</span>
                  <span>৳ {searchedOrder.subtotal.toLocaleString('en-BD')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('ডেলিভারি চার্জ:', 'Delivery Charge:')}</span>
                  <span>৳ {searchedOrder.deliveryCharge}</span>
                </div>
                {searchedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>{t('ডিসকাউন্ট:', 'Discount:')}</span>
                    <span>- ৳ {searchedOrder.discount.toLocaleString('en-BD')}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>{t('সর্বমোট প্রদেয়:', 'Total Paid/Payable:')}</span>
                  <span className="text-sky-600 dark:text-sky-400">৳ {searchedOrder.totalAmount.toLocaleString('en-BD')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Support & Fast Actions Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <a
                href="tel:01719143897"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 shadow-2xs transition-all active:scale-95"
              >
                <Phone className="w-3.5 h-3.5 text-sky-600" />
                <span>{t('সাপোর্টে কল দিন', 'Call Support')}</span>
              </a>

              <a
                href="https://wa.me/8801719143897"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold shadow-xs transition-all active:scale-95"
              >
                <SiWhatsapp className="w-3.5 h-3.5" />
                <span>{t('হোয়াটসঅ্যাপ', 'WhatsApp')}</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetSearch}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold cursor-pointer transition-colors"
              >
                {t('অন্য অর্ডার ট্র্যাক করুন', 'Track Another')}
              </button>
              {onNavigateShop && (
                <button
                  type="button"
                  onClick={onNavigateShop}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer transition-colors"
                >
                  {t('শপিং চালিয়ে যান', 'Shop More')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
