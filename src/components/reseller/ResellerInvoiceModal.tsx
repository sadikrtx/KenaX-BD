import React, { useState } from 'react';
import {
  Printer,
  X,
  Package,
  ShieldCheck,
  CheckCircle2,
  Store,
  Phone,
  MapPin,
  Calendar,
  Truck,
  Copy,
  Check,
  Barcode,
  QrCode,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { Order } from '../../types';
import { ResellerUser } from '../../types/reseller';

interface ResellerInvoiceModalProps {
  order: Order;
  reseller: ResellerUser;
  onClose: () => void;
}

export const ResellerInvoiceModal: React.FC<ResellerInvoiceModalProps> = ({ order, reseller, onClose }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const storeName = reseller.subStoreTitle || reseller.businessName || reseller.fullName || 'গ্যাজেট মনি';
  const storePhone = reseller.subStorePhone || reseller.phone || '01887713212';
  const storeAddress = reseller.subStoreAddress || reseller.address || 'Dhaka, Bangladesh';
  const storeLogo = reseller.subStoreLogo;
  const customFooter = reseller.subStoreCustomInvoiceFooter || `${storeName} এর সাথে থাকার জন্য ধন্যবাদ!`;

  const item = order.items && order.items[0];
  const unitPrice = item?.price || Math.round(order.totalAmount / (item?.quantity || 1));
  const qty = item?.quantity || 1;
  const subtotal = unitPrice * qty;
  const deliveryFee = order.deliveryCharge || (order as any).deliveryFee || 70;
  const grandTotal = subtotal + deliveryFee;

  const advancePaid = (order as any).advancePaymentAmount || 0;
  const remainingCod = (order as any).remainingCodAmount !== undefined
    ? (order as any).remainingCodAmount
    : Math.max(0, grandTotal - advancePaid);

  const handleCopySummary = () => {
    const text = `🧾 ইনভয়েস স্লিপ #${order.id}\nমার্চেন্ট: ${storeName}\nকাস্টমার: ${order.customerName} (${order.customerMobile})\nঠিকানা: ${order.fullAddress || order.district}\nপণ্য: ${item?.name || 'প্রোডাক্ট'} (পরিমাণ: ${qty})\nমোট বিল: ৳${grandTotal}\nকুরিয়ারে প্রদেয় (COD): ৳${remainingCod}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Control Bar (Hidden when Printing) */}
        <div className="p-4 bg-slate-950 text-white flex items-center justify-between print:hidden border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>কাস্টমার ইনভয়েস ও মেমো</span>
                <span className="px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-400 text-[10px] border border-emerald-800 font-medium">
                  White-label
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">#{order.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer border border-emerald-500"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Beautiful Invoice Container */}
        <div id="printable-invoice" className="p-6 sm:p-8 space-y-6 text-xs font-sans print:p-6 print:text-black bg-white">
          
          {/* Header with Store Branding & Invoice Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                {storeLogo ? (
                  <img
                    src={storeLogo}
                    alt={storeName}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-slate-300 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight flex items-center gap-1.5">
                    <span>{storeName}</span>
                    <BadgeCheck className="w-4 h-4 text-emerald-600 inline" />
                  </h1>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{storeAddress}</span>
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 font-bold mt-1">
                অনুমোদিত অনলাইন শপ ও ড্রপশিপিং রিটেইলার
              </p>
              <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>হেল্পলাইন: <strong className="font-mono text-slate-900">{storePhone}</strong></span>
              </p>
            </div>

            <div className="text-left sm:text-right bg-slate-50 print:bg-transparent p-3.5 rounded-2xl border border-slate-200 print:border-none print:p-0">
              <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider block">
                অফিসিয়াল ক্যাশ মেমো / ইনভয়েস
              </span>
              <span className="font-mono font-black text-base text-slate-950 block mt-0.5">
                #{order.id}
              </span>
              <p className="text-[11px] text-slate-600 mt-1 flex items-center sm:justify-end gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>তারিখ: <strong className="text-slate-800">{new Date(order.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
              </p>
              <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 print:border-black print:text-black">
                {remainingCod === 0 ? 'পরিশোধিত (PAID)' : 'ক্যাশ অন ডেলিভারি (COD)'}
              </span>
            </div>
          </div>

          {/* Customer & Delivery Logistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 font-black text-[10px] uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>গ্রাহকের তথ্য ও ডেলিভারি ঠিকানা</span>
              </div>
              <p className="font-black text-sm text-slate-950 pt-0.5">{order.customerName}</p>
              <p className="font-mono font-bold text-slate-800 text-xs">{order.customerMobile}</p>
              <p className="text-slate-600 text-xs leading-relaxed pt-0.5">
                {order.fullAddress || `${order.area || ''}, ${order.district}`}
              </p>
            </div>

            {/* Courier Dispatch Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 font-black text-[10px] uppercase tracking-wider">
                <Truck className="w-3.5 h-3.5 text-sky-600" />
                <span>পার্সেল ও কুরিয়ার বিবরণ</span>
              </div>
              <p className="font-black text-sm text-slate-900 pt-0.5">
                এক্সপ্রেস হোম ডেলিভারি
              </p>
              <p className="text-xs text-slate-600">
                পার্সেল ট্র্যাকিং: <strong className="font-mono font-bold text-slate-900">{order.courierTrackingId || `KNX-${order.id.slice(-6)}`}</strong>
              </p>
              <p className="text-xs text-slate-600">
                ডেলিভারি এলাকা: <strong className="text-slate-900">{order.division?.includes('Outside') || order.district?.toLowerCase().includes('outside') ? 'ঢাকার বাইরে' : 'ঢাকার ভিতরে'}</strong>
              </p>
              {order.notes && order.notes.includes('Note:') && (
                <p className="text-[11px] text-amber-700 font-medium pt-0.5">
                  নোট: {order.notes.split('Note:')[1]?.trim()}
                </p>
              )}
            </div>
          </div>

          {/* Product Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-800 text-[10px] uppercase font-black border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">আইটেম ও বিবরণ</th>
                  <th className="py-3 px-3 text-center">পরিমাণ</th>
                  <th className="py-3 px-3 text-right">একক মূল্য</th>
                  <th className="py-3 px-4 text-right">মোট টাকা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">{item?.name || 'প্রোডাক্ট'}</p>
                    {(item?.selectedColor || item?.selectedSize) && (
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        {item.selectedColor ? `কালার: ${item.selectedColor} ` : ''}
                        {item.selectedSize ? `| সাইজ: ${item.selectedSize}` : ''}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-800">{qty} টি</td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                    ৳{unitPrice.toLocaleString('en-BD')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-slate-950">
                    ৳{subtotal.toLocaleString('en-BD')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Calculations & Official Stamp */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t-2 border-slate-200 pt-4">
            
            {/* Barcode & Authentic Badge */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center">
                <Barcode className="w-28 h-7 text-slate-900" />
                <span className="font-mono text-[9px] text-slate-500 tracking-widest mt-0.5">{order.id}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>১০০% আসল ও পরীক্ষিত পণ্য</span>
                </span>
                <p className="text-[10px] text-slate-500 leading-tight">
                  সরাসরি ভেরিফাইড হাব থেকে নিরাপদে প্যাকেজিং করে পাঠানো হয়েছে।
                </p>
              </div>
            </div>

            {/* Bill Summary */}
            <div className="w-full sm:w-68 space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>পণ্য উপ-মোট:</span>
                <span className="font-mono font-bold text-slate-900">৳{subtotal.toLocaleString('en-BD')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ডেলিভারি চার্জ:</span>
                <span className="font-mono font-bold text-slate-900">৳{deliveryFee.toLocaleString('en-BD')}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200 pt-1.5">
                <span>সর্বমোট বিল:</span>
                <span className="font-mono">৳{grandTotal.toLocaleString('en-BD')}</span>
              </div>

              {advancePaid > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>অগ্রিম পরিশোধিত:</span>
                  <span className="font-mono">- ৳{advancePaid.toLocaleString('en-BD')}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-black text-slate-950 border-t-2 border-slate-900 pt-2">
                <span>ক্যাশ কালেকশন (COD):</span>
                <span className="font-mono text-lg text-emerald-700 font-black">
                  ৳{remainingCod.toLocaleString('en-BD')}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Notice & Return Policy */}
          <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-800 text-xs">
              {customFooter}
            </p>
            <p>
              ডেলিভারি রাইডারের উপস্থিতিতে পার্সেল চেক করে গ্রহণ করুন। কোনো সমস্যায় আমাদের হেল্পলাইনে ({storePhone}) যোগাযোগ করুন।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
