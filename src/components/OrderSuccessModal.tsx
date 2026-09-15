import React, { useState } from 'react';
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Phone,
  Copy,
  Check,
  ShoppingBag,
  Clock,
  Download,
  ChevronRight,
  X,
  CreditCard,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import { Order } from '../types';
import { generateAndPrintInvoice } from '../utils/invoiceGenerator';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onTrackOrder: (order: Order) => void;
  onContinueShopping: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  order,
  onTrackOrder,
  onContinueShopping,
}) => {
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen || !order) return null;

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDownloadReceipt = () => {
    generateAndPrintInvoice(order);
  };

  const handleTrackClick = () => {
    onClose();
    onTrackOrder(order);
  };

  const handleContinueClick = () => {
    onClose();
    onContinueShopping();
  };

  const dueAmount =
    order.dueAmount !== undefined
      ? order.dueAmount
      : order.paymentOptionType === 'cod'
      ? order.totalAmount
      : 0;

  const items = order.items || [];
  const phoneToCall = order.deliveryMobile || order.customerMobile;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 select-none animate-in fade-in duration-200"
      aria-modal="true"
      role="dialog"
    >
      <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-lg sm:max-w-xl md:max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors cursor-pointer"
          title="Close Modal"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* 1. Ultra-Compact Header with Celebration Badge & Order ID */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white px-3.5 py-3 sm:px-5 sm:py-3.5 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-10 w-36 h-36 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between gap-2 relative z-10 pr-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white text-emerald-600 shadow-md flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200 bg-white/15 px-1.5 py-0.5 rounded-md">
                    Confirmed
                  </span>
                  <h2 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white truncate">
                    Your Order Received!
                  </h2>
                </div>
                <p className="text-[11px] text-emerald-100 truncate mt-0.5">
                  Thank you for shopping with KenaX BD!
                </p>
              </div>
            </div>

            {/* Order ID Pill with Copy */}
            <div className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-white/20 shrink-0">
              <span className="text-[10px] text-slate-300 font-medium">ID:</span>
              <span className="font-mono text-xs sm:text-sm font-black text-amber-300">
                #{order.id}
              </span>
              <button
                onClick={handleCopyOrderId}
                className="p-1 rounded hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Copy Order ID"
              >
                {copiedId ? (
                  <Check className="w-3 h-3 text-emerald-300" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-300 hover:text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Micro Verification Alert Banner */}
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-3.5 py-1.5 sm:px-5 flex items-center justify-between gap-2 text-amber-900 text-[11px] sm:text-xs flex-wrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
            <p className="truncate">
              <span className="font-bold text-amber-950">Verification Call:</span> We will call at{' '}
              <strong className="font-mono font-bold text-amber-950">{phoneToCall}</strong> to confirm.
            </p>
          </div>
        </div>

        {/* 3. Compact Main Content Body (Zero Scrollbar - Grid View) */}
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-2.5">
          {/* Top Quick Status Badges: ETA • Courier • Payment */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-1.5 sm:p-2">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Delivery ETA
              </span>
              <span className="font-bold text-slate-800 text-[11px] sm:text-xs flex items-center justify-center gap-1 truncate">
                <Clock className="w-3 h-3 text-sky-600 shrink-0" />
                <span className="truncate">{order.estimatedDelivery || '24-48 Hours'}</span>
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-1.5 sm:p-2">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Courier Partner
              </span>
              <span className="font-bold text-slate-800 text-[11px] sm:text-xs flex items-center justify-center gap-1 truncate">
                <Truck className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="truncate">{order.courierName || 'Steadfast'}</span>
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-1.5 sm:p-2">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Payment Mode
              </span>
              <span className="font-bold text-slate-800 text-[11px] sm:text-xs flex items-center justify-center gap-1 truncate">
                <CreditCard className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="truncate">{order.paymentMethod}</span>
              </span>
            </div>
          </div>

          {/* Dual Split Cards: Delivery Info (Left/Top) + Order & Total (Right/Bottom) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            {/* Delivery Details Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px] sm:text-xs uppercase tracking-wider mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Delivery Address</span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-700 space-y-0.5">
                  <p className="font-bold text-slate-900 truncate">
                    {order.deliveryName || order.customerName}
                  </p>
                  <p className="font-mono text-slate-600 text-[11px]">
                    {order.deliveryMobile || order.customerMobile}
                  </p>
                  <p className="text-slate-600 line-clamp-2 leading-relaxed mt-1">
                    {order.fullAddress}
                    {order.upazila ? `, ${order.upazila}` : ''}
                    {order.district ? `, ${order.district}` : ''}
                    {order.division ? `, ${order.division}` : ''}
                  </p>
                </div>
              </div>

              {/* Delivery Assurance */}
              <div className="mt-2 pt-1.5 border-t border-slate-200 flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Damage-free door delivery guaranteed</span>
              </div>
            </div>

            {/* Order Items & Financial Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-800 font-bold text-[11px] sm:text-xs uppercase tracking-wider mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>Items ({items.length})</span>
                  </div>
                  <span className="font-black text-slate-900 normal-case">
                    ৳{order.totalAmount.toLocaleString('en-BD')}
                  </span>
                </div>

                {/* Compact Items List (Max 2 items shown directly, count badge if more) */}
                <div className="space-y-1">
                  {items.slice(0, 2).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-1.5 p-1 rounded-lg bg-white border border-slate-200/80 text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img
                          src={
                            (item.productImage && item.productImage.trim() !== '')
                              ? item.productImage
                              : 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=120'
                          }
                          alt={item.productName}
                          className="w-6 h-6 object-contain rounded bg-slate-50 p-0.5 shrink-0 border border-slate-100"
                        />
                        <span className="font-semibold text-slate-800 truncate">
                          {item.productName}
                        </span>
                      </div>
                      <span className="text-slate-500 font-mono text-[10px] shrink-0 font-medium">
                        x{item.quantity} • ৳{(item.price * item.quantity).toLocaleString('en-BD')}
                      </span>
                    </div>
                  ))}
                  {items.length > 2 && (
                    <p className="text-[10px] text-slate-500 text-center font-medium">
                      +{items.length - 2} more item{items.length - 2 > 1 ? 's' : ''} in package
                    </p>
                  )}
                </div>
              </div>

              {/* Financial Quick Breakdown Row */}
              <div className="mt-2 pt-1.5 border-t border-slate-200 text-[11px] space-y-0.5">
                <div className="flex justify-between text-slate-600 text-[10px]">
                  <span>Subtotal: ৳{order.subtotal.toLocaleString('en-BD')}</span>
                  <span>Delivery: ৳{order.deliveryCharge}</span>
                  {order.discount > 0 && (
                    <span className="text-emerald-600 font-bold">
                      Disc: -৳{order.discount.toLocaleString('en-BD')}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between font-black text-slate-900 pt-1 text-xs">
                  <span>Grand Total:</span>
                  <span className="text-sky-600 font-mono text-sm">
                    ৳{order.totalAmount.toLocaleString('en-BD')}
                  </span>
                </div>
                {dueAmount > 0 && (
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 bg-amber-100/60 px-1.5 py-0.5 rounded">
                    <span>Due on Delivery:</span>
                    <span className="font-mono">৳{dueAmount.toLocaleString('en-BD')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Action Buttons Footer: 3 English Buttons (Download Receipt, Continue Shopping, Track Order) */}
        <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-slate-50 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2">
            {/* Button 1: Download Receipt */}
            <button
              type="button"
              onClick={handleDownloadReceipt}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer hover:border-slate-400 active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Download Receipt</span>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              {/* Button 2: Continue Shopping */}
              <button
                type="button"
                onClick={handleContinueClick}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center active:scale-95"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span>Continue Shopping</span>
              </button>

              {/* Button 3: Track Order */}
              <button
                type="button"
                onClick={handleTrackClick}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 active:from-sky-800 active:to-blue-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer hover:shadow-lg active:scale-95"
              >
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span>Track Order</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
