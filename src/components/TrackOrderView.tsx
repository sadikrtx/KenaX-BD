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
} from 'lucide-react';
import { Order, OrderStatus, CustomerRecord } from '../types';
import { fetchSingleOrderFromDB } from '../lib/firebase';

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
  const [searchInput, setSearchInput] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(initialOrder || null);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sync if initialOrder changes (e.g. from newly placed checkout or customer dashboard click)
  useEffect(() => {
    if (initialOrder) {
      setSearchedOrder(initialOrder);
      setErrorMessage('');
      setHasSearched(false);
    }
  }, [initialOrder]);

  // Keep searchedOrder in sync with real-time updates to orders prop (e.g. when Admin changes status)
  useEffect(() => {
    if (searchedOrder) {
      const liveOrder = orders.find((o) => o.id === searchedOrder.id);
      if (liveOrder && (liveOrder.orderStatus !== searchedOrder.orderStatus || liveOrder.updatedAt !== searchedOrder.updatedAt)) {
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

  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const query = searchInput.trim();

    if (!query) {
      setErrorMessage('Please enter an Order ID or phone number to track.');
      setSearchedOrder(null);
      setHasSearched(true);
      return;
    }

    setHasSearched(true);
    setIsSearching(true);
    const cleanQuery = query.toUpperCase();

    // 1. Find in orders array matching ID, trackingNumber, or phone
    let found = orders.find((o) => {
      const orderId = (o.id || '').toUpperCase();
      const tracking = (o.trackingNumber || '').toUpperCase();
      const cMobile = (o.customerMobile || '').replace(/\D/g, '');
      const dMobile = (o.deliveryMobile || '').replace(/\D/g, '');
      const cleanDigits = query.replace(/\D/g, '');

      return (
        orderId === cleanQuery ||
        orderId === `KB-${cleanQuery}` ||
        cleanQuery === orderId.replace(/^KB-/, '') ||
        tracking === cleanQuery ||
        (cleanDigits.length >= 7 && (cMobile.includes(cleanDigits) || dMobile.includes(cleanDigits)))
      );
    });

    // 2. If not found in memory, query Cloud Firestore directly
    if (!found) {
      try {
        const cloudOrder = await fetchSingleOrderFromDB(query);
        if (cloudOrder) {
          found = cloudOrder;
        }
      } catch (err) {
        console.warn('Track order Cloud search error:', err);
      }
    }

    setIsSearching(false);

    if (found) {
      setSearchedOrder(found);
      setErrorMessage('');
      if (onSelectTrackOrder) onSelectTrackOrder(found);
    } else {
      setSearchedOrder(null);
      setErrorMessage(
        `Order Not Found: We could not locate any order with ID "${query}". Please verify your Order ID (e.g. KB-89241) or registered phone number.`
      );
    }
  };

  const handleResetSearch = () => {
    setSearchInput('');
    setErrorMessage('');
    setHasSearched(false);
    setSearchedOrder(null);
    if (onSelectTrackOrder) onSelectTrackOrder(null);
  };

  const getStepStatus = (step: OrderStatus, currentStatus: OrderStatus) => {
    const stepIdx = statusSteps.indexOf(step);
    const currIdx = statusSteps.indexOf(currentStatus);

    if (currentStatus === 'Cancelled') {
      return step === 'Pending' ? 'completed' : 'cancelled';
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
            (o.customerMobile === currentCustomer.phone || o.deliveryMobile === currentCustomer.phone)) ||
          (currentCustomer.email && o.customerEmail === currentCustomer.email)
      )
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* 1. Header with Strictly English UI */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
          <Truck className="w-3.5 h-3.5" />
          <span>Live Parcel Tracking</span>
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
          Track Your Order
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
          Enter your Order ID (e.g., KB-89241) or your 11-digit mobile number to check real-time
          courier dispatch and delivery status.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Enter Order ID (e.g. KB-89241) or Mobile..."
              className="w-full pl-4 pr-10 py-3 rounded-2xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Track Order</span>
          </button>
        </form>

        {/* Quick helper tag if order active */}
        {searchedOrder && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs">
            <span className="text-slate-500">Currently viewing:</span>
            <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
              #{searchedOrder.id}
            </span>
            <button
              onClick={handleResetSearch}
              className="text-sky-600 hover:text-sky-800 font-semibold underline cursor-pointer ml-1"
            >
              Track Another Order
            </button>
          </div>
        )}
      </div>

      {/* 2. Customer Recent Orders Quick Switcher (If Logged In & Has Placed Orders) */}
      {customerOrders.length > 0 && !searchedOrder && (
        <div className="mb-8 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-sky-600" />
              <span>Your Placed Orders ({customerOrders.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500">Click any order to view live tracking</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customerOrders.map((ord) => (
              <button
                key={ord.id}
                onClick={() => {
                  setSearchedOrder(ord);
                  setErrorMessage('');
                  setHasSearched(true);
                  if (onSelectTrackOrder) onSelectTrackOrder(ord);
                }}
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-sky-700">
                    #{ord.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      ord.orderStatus === 'Delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ord.orderStatus === 'Cancelled'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-sky-100 text-sky-800'
                    }`}
                  >
                    {ord.orderStatus}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  ৳{ord.totalAmount.toLocaleString('en-BD')} • {new Date(ord.createdAt).toLocaleDateString('en-BD')}
                </p>
                <span className="text-[11px] font-bold text-sky-600 group-hover:underline flex items-center gap-1 mt-1.5">
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
        <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-xs text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Order Not Found</h2>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">{errorMessage}</p>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-1.5 max-w-md mx-auto mb-6">
            <p className="font-bold text-slate-800">Quick Tracking Tips:</p>
            <p>• Make sure to type the full Order ID (e.g. <b>KB-89241</b>).</p>
            <p>• If searching by mobile, enter your 11-digit Bangladeshi number.</p>
            <p>• Newly placed orders may take up to 60 seconds to sync across our system.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setErrorMessage('');
                setSearchInput('');
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Try Another Search
            </button>
            {onNavigateShop && (
              <button
                onClick={onNavigateShop}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Browse Shop
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. CASE B: No Order Selected (Logged out or haven't searched/placed any order) */}
      {!searchedOrder && !errorMessage && (
        <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 shadow-xs text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mx-auto mb-4">
            <FileSearch className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
            No Active Order Selected
          </h2>
          <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
            You haven't placed an order in this session, or no active parcel is currently loaded.
            Please type your Order ID in the search box above to track real-time dispatch and delivery progress.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md mx-auto mb-8">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 text-xs block mb-1">Check Order ID</span>
              <p className="text-[11px] text-slate-500">
                Found on your checkout confirmation page, SMS message, or invoice receipt.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-900 text-xs block mb-1">Nationwide Delivery</span>
              <p className="text-[11px] text-slate-500">
                Real-time sync with Steadfast, Pathao, RedX, and Sundarban Courier.
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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
          {/* Top Banner */}
          <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800">
            {/* Left/Main Column: Order Info & Status & Payment */}
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
                  Order Details
                </span>
                <span className="text-xs bg-slate-800 px-2.5 py-0.5 rounded-full font-mono text-slate-300 border border-slate-700/60">
                  #{searchedOrder.id}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    searchedOrder.orderStatus === 'Delivered'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : searchedOrder.orderStatus === 'Cancelled'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : searchedOrder.orderStatus === 'Shipped'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : searchedOrder.orderStatus === 'Processing'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                  }`}
                >
                  ● {searchedOrder.orderStatus}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Status: <span className="text-sky-400">{searchedOrder.orderStatus}</span>
              </h2>

              <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span>Placed on <b className="text-white">{new Date(searchedOrder.createdAt).toLocaleDateString('en-BD')}</b></span>
                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1.5 flex-wrap">
                  Payment: <b className="text-white">{searchedOrder.paymentMethod}</b>
                  <span
                    className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      searchedOrder.paymentStatus === 'Paid'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    ({searchedOrder.paymentStatus})
                  </span>
                </span>
              </div>
            </div>

            {/* Right/Amount Column */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-between md:justify-end gap-3 shrink-0">
              <span className="text-xs sm:text-sm text-slate-400 font-medium">Total Amount:</span>
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
                  Delivery Progress
                </h3>
              </div>
              <div className="shrink-0">
                <span className="text-[10px] sm:text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-sky-200">
                  Current Status: <b className="font-black text-sky-900">{searchedOrder.orderStatus}</b>
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
                        searchedOrder.orderStatus === 'Cancelled'
                          ? 0
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
                    const state = getStepStatus(step, searchedOrder.orderStatus);
                    const isCompleted = state === 'completed';
                    const isCurrent = searchedOrder.orderStatus === step;
                    const isCancelled = searchedOrder.orderStatus === 'Cancelled';

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
                            <span className="text-[10px] sm:text-xs font-black">
                              {idx + 1}
                            </span>
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
                            {step}
                          </span>
                          {isCurrent && (
                            <span className="hidden sm:inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 tracking-wide uppercase">
                              Active
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
                <span>Immutable Delivery Address Snapshot</span>
              </h4>

              <div className="space-y-1.5 text-xs text-slate-700">
                <p>
                  Recipient Name: <b>{searchedOrder.deliveryName}</b>
                </p>
                <p>
                  Mobile Number: <b>{searchedOrder.deliveryMobile}</b>
                </p>
                <p>
                  Division & District: <b>{searchedOrder.division}, {searchedOrder.district}</b>
                </p>
                <p>
                  Upazila / Thana: <b>{searchedOrder.upazila}</b> {searchedOrder.area && `(${searchedOrder.area})`}
                </p>
                <p className="pt-1 text-slate-800">
                  Detailed Address: <b>{searchedOrder.fullAddress}</b>
                </p>
                {searchedOrder.deliveryInstructions && (
                  <p className="text-slate-500 italic pt-1">
                    Instructions: "{searchedOrder.deliveryInstructions}"
                  </p>
                )}
              </div>

              {/* Courier info */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500 block">Assigned Courier:</span>
                  <span className="font-bold text-slate-900">
                    {searchedOrder.courierName || 'Steadfast Courier'}
                  </span>
                </div>
                {searchedOrder.trackingNumber && (
                  <div className="text-right">
                    <span className="text-slate-500 block">Tracking #:</span>
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
                <span>Parcel Items ({(searchedOrder.items || []).length})</span>
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(searchedOrder.items || []).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200"
                  >
                    <img
                      src={
                        (item.productImage && item.productImage.trim() !== '')
                          ? item.productImage
                          : 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=120'
                      }
                      alt={item.productName}
                      className="w-10 h-10 object-contain rounded-lg bg-slate-50 p-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.productName}</p>
                      <p className="text-[11px] text-slate-500">
                        Qty: {item.quantity} × ৳{item.price.toLocaleString('en-BD')}
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
                  <span>Subtotal:</span>
                  <span>৳ {searchedOrder.subtotal.toLocaleString('en-BD')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge:</span>
                  <span>৳ {searchedOrder.deliveryCharge}</span>
                </div>
                {searchedOrder.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount:</span>
                    <span>- ৳ {searchedOrder.discount.toLocaleString('en-BD')}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Paid/Payable:</span>
                  <span className="text-sky-600">৳ {searchedOrder.totalAmount.toLocaleString('en-BD')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions Bar */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Genuine Parcel Delivery Guaranteed</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetSearch}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold cursor-pointer transition-colors"
              >
                Track Another Order
              </button>
              {onNavigateShop && (
                <button
                  onClick={onNavigateShop}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer transition-colors"
                >
                  Continue Shopping
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
