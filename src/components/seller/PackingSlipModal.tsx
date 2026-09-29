import React from 'react';
import { Printer, X, Package, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SellerSubOrder, SellerUser } from '../../types/seller';

interface PackingSlipModalProps {
  order: SellerSubOrder;
  seller: SellerUser;
  onClose: () => void;
}

export const PackingSlipModal: React.FC<PackingSlipModalProps> = ({ order, seller, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-300 my-auto flex flex-col">
        {/* Action Header (Hidden during actual print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm">Order Packing Slip & Courier Handover Note</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 space-y-6 text-xs font-sans print:p-0">
          {/* Top Brand & Order Identification */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-950">KenaX BD Marketplace</h1>
              <p className="text-[11px] text-slate-600 font-bold mt-0.5">Official Seller Packing Slip</p>
              <p className="text-[11px] text-slate-500 font-medium">Verified Merchant Order</p>
            </div>

            <div className="text-right">
              <div className="text-sm font-black font-mono bg-slate-100 px-3 py-1 rounded-lg border border-slate-300 inline-block">
                Sub-Order: #{order.id}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Parent: #{order.parentOrderId}</p>
              <p className="text-[10px] text-slate-500">Date: {new Date(order.createdAt).toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          {/* 2-Column Sender & Receiver Details */}
          <div className="grid grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            {/* Sender / Seller */}
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">From (Merchant):</p>
              <p className="font-black text-sm text-slate-900 mt-1">{seller.store.storeName}</p>
              <p className="text-slate-600 mt-0.5">{seller.store.address}</p>
              <p className="text-slate-600">{seller.store.upazila}, {seller.store.district}</p>
              <p className="font-bold text-slate-800 mt-1">Phone: {seller.phone}</p>
            </div>

            {/* Receiver / Customer */}
            <div className="border-l border-slate-200 pl-6">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Ship To (Customer):</p>
              <p className="font-black text-sm text-slate-900 mt-1">{order.customerInfo.name}</p>
              <p className="font-bold text-slate-800 mt-0.5 text-xs font-mono">{order.customerInfo.phone}</p>
              <p className="text-slate-700 mt-1 leading-relaxed">{order.customerInfo.address}</p>
              <p className="text-slate-600 font-semibold">{order.customerInfo.city} {order.customerInfo.district && `(${order.customerInfo.district})`}</p>
            </div>
          </div>

          {/* Items Checklist Table */}
          <div>
            <div className="flex items-center justify-between pb-2">
              <h4 className="font-black uppercase tracking-wider text-slate-800 text-[11px]">Packaged Items Checklist</h4>
              <span className="text-[10px] text-slate-500 font-semibold">{order.items.length} item(s)</span>
            </div>

            <table className="w-full text-left border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-2.5 border border-slate-300 w-10 text-center">✓</th>
                  <th className="p-2.5 border border-slate-300">Product Title & SKU</th>
                  <th className="p-2.5 border border-slate-300 text-center">Qty</th>
                  <th className="p-2.5 border border-slate-300 text-right">Unit Price</th>
                  <th className="p-2.5 border border-slate-300 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="p-2.5 border border-slate-300 text-center">
                      <div className="w-4 h-4 border-2 border-slate-400 rounded-sm mx-auto" />
                    </td>
                    <td className="p-2.5 border border-slate-300">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] font-mono text-slate-500">SKU: {item.sku || 'N/A'}</p>
                    </td>
                    <td className="p-2.5 border border-slate-300 text-center font-bold text-sm">{item.quantity}</td>
                    <td className="p-2.5 border border-slate-300 text-right font-mono">৳{item.price.toLocaleString('en-BD')}</td>
                    <td className="p-2.5 border border-slate-300 text-right font-mono font-bold">
                      ৳{(item.price * item.quantity).toLocaleString('en-BD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing & Courier Note */}
          <div className="flex items-start justify-between pt-2 border-t border-slate-200">
            <div className="space-y-1 max-w-xs text-[11px] text-slate-600">
              <p>
                <strong>Courier:</strong> {order.courierName || 'Steadfast Courier / Pathao Express'}
              </p>
              {order.trackingCode && (
                <p className="font-mono">
                  <strong>Tracking ID:</strong> {order.trackingCode}
                </p>
              )}
              <p>
                <strong>Payment:</strong>{' '}
                <span className="font-bold uppercase text-slate-900">{order.paymentStatus} (Cash on Delivery)</span>
              </p>
            </div>

            <div className="w-56 space-y-1.5 text-right font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>৳{order.subtotal.toLocaleString('en-BD')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge:</span>
                <span>৳{order.deliveryCharge.toLocaleString('en-BD')}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span>-৳{order.discount.toLocaleString('en-BD')}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-slate-950 text-sm pt-1.5 border-t-2 border-slate-900">
                <span>Total Collectible:</span>
                <span>৳{(order.subtotal + order.deliveryCharge - order.discount).toLocaleString('en-BD')}</span>
              </div>
            </div>
          </div>

          {/* Signatures & Barcode */}
          <div className="pt-6 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
            <div>
              <p className="font-mono tracking-widest text-xs font-bold text-slate-800">|||||| |||||||| |||| |||||||||| |||</p>
              <p className="font-mono mt-0.5">*{order.id}*</p>
            </div>

            <div className="text-right">
              <div className="w-36 border-b border-slate-400 mb-1" />
              <p>Packaged & Handed Over By</p>
              <p className="font-bold text-slate-800">{seller.fullName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
