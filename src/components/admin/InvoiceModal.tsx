import React, { useState, useRef } from 'react';
import { Printer, X, Download, FileText, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { Order, SiteSettings } from '../../types';
import { KenaXLogo } from '../KenaXLogo';
import { KenaXOfficialSeal } from '../KenaXOfficialSeal';

interface InvoiceModalProps {
  order: Order | null;
  settings: SiteSettings;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, settings, onClose }) => {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadInvoiceImage = async () => {
    if (!invoiceRef.current) return;
    try {
      setIsGeneratingImage(true);
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2.5, // 2.5x High Resolution for crystal clear text and seal
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `KenaX_Invoice_INV-${order.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (error) {
      console.error('Failed to generate invoice image:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 md:p-8">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 my-6 sm:my-8 flex flex-col">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="print:hidden bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-sky-400 shrink-0" />
            <h3 className="font-bold text-sm sm:text-base truncate">
              Order Invoice #{order.id}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download Invoice as PNG Image Button */}
            <button
              onClick={handleDownloadInvoiceImage}
              disabled={isGeneratingImage}
              title="Download Invoice as Image (PNG)"
              className="px-3.5 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:opacity-75 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
              {isGeneratingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Image...</span>
                </>
              ) : isDownloaded ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Image Saved!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Invoice (Image)</span>
                </>
              )}
            </button>

            {/* Print / PDF Button */}
            <button
              onClick={handlePrint}
              title="Print Invoice / Save as PDF"
              className="px-3 sm:px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-98 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print / PDF</span>
              <span className="sm:hidden">Print</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              title="Close Modal"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable / Renderable Invoice Container with Generous Top and Bottom Spacing */}
        <div
          ref={invoiceRef}
          id="invoice-print-area"
          className="px-6 sm:px-10 md:px-12 pt-8 sm:pt-10 pb-10 sm:pb-12 text-slate-800 bg-white"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b-2 border-slate-200">
            <div>
              <KenaXLogo className="h-9 mb-2.5" />
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                <strong className="text-slate-700">{settings.siteName || 'KenaX BD'}</strong> - Smart Shopping, Better Living.
                <br />
                Dhaka, Bangladesh • Support: {settings.phone || '+880 1700-123456'}
                <br />
                Email: {settings.email || 'support@kenaxbd.com'}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-block px-3.5 py-1 bg-sky-100 text-sky-800 text-xs font-extrabold rounded-md uppercase tracking-wider mb-2">
                INVOICE / BILL
              </span>
              <p className="text-xs text-slate-500">
                Invoice No: <span className="font-bold text-slate-800 font-mono">INV-{order.id}</span>
              </p>
              <p className="text-xs text-slate-500">
                Date: <span className="font-semibold text-slate-800">{formattedDate}</span>
              </p>
              <p className="text-xs text-slate-500">
                Payment: <span className="font-semibold text-slate-800">{order.paymentMethod}</span>
              </p>
            </div>
          </div>

          {/* Customer & Delivery Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
            <div>
              <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">Billed To:</h4>
              <p className="font-bold text-sm text-slate-900">{order.customerName}</p>
              <p className="text-slate-600 mt-0.5">Phone: <strong className="text-slate-800">{order.customerMobile}</strong></p>
              {order.customerEmail && <p className="text-slate-600">Email: {order.customerEmail}</p>}
            </div>
            <div>
              <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-[11px]">Delivery Address:</h4>
              <p className="text-slate-800 font-medium">
                {order.fullAddress || (typeof order.deliveryAddress === 'object' ? (order.deliveryAddress as any)?.fullAddress : order.deliveryAddress) || `${order.division || order.customerDivision || 'Dhaka'}, Bangladesh`}
              </p>
              <p className="text-slate-500 mt-1">
                Courier: <span className="font-semibold text-slate-700">{order.courierName || 'Standard Delivery'}</span>
              </p>
              {order.trackingNumber && (
                <p className="text-slate-500">
                  Tracking Code: <span className="font-mono font-bold text-sky-700">{order.trackingNumber}</span>
                </p>
              )}
            </div>
          </div>

          {/* Order Items Table */}
          <div className="py-6 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Product Description</th>
                  <th className="py-2.5 px-2 text-right">Unit Price</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(order.items || []).map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-3 px-2 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-2">
                      <p className="font-bold text-slate-900">{item.productName || item.name || 'Item'}</p>
                      {item.variantName && (
                        <p className="text-[11px] text-slate-500">Variant: {item.variantName}</p>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right font-medium">৳{item.price.toLocaleString()}</td>
                    <td className="py-3 px-2 text-center font-bold">{item.quantity}</td>
                    <td className="py-3 px-2 text-right font-bold text-slate-900">
                      ৳{(item.price * item.quantity).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Calculation & Official KenaX BD Seal */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-5 border-t-2 border-slate-200">
            {/* Left: Terms & Conditions */}
            <div className="text-xs text-slate-500 max-w-xs space-y-1.5">
              <p className="font-bold text-slate-700">Terms & Conditions:</p>
              <p>• 7-day hassle-free replacement warranty on eligible defective items.</p>
              <p>• Please check the parcel in front of the delivery rider.</p>
              <p>• For support call {settings.phone || '+880 1700-123456'} or visit kenaxbd.com.</p>
            </div>

            {/* Right: Subtotal, Total & Official Verification Seal */}
            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-medium">৳{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge:</span>
                <span className="font-medium">৳{order.deliveryCharge.toLocaleString()}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount ({order.couponCode || 'PROMO'}):</span>
                  <span>-৳{order.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total:</span>
                <span className="text-sky-700">৳{order.totalAmount.toLocaleString()}</span>
              </div>
              <div className="pt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">Payment Status:</span>
                <span
                  className={`inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-md ${
                    order.paymentStatus === 'Verified' || order.paymentStatus === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>

              {/* Official Seal Stamp */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <div className="text-right">
                  <p className="text-[11px] font-black uppercase text-slate-800 tracking-tight">
                    Authorized Seal
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Verified Digital Invoice
                  </p>
                </div>
                <div className="shrink-0">
                  <KenaXOfficialSeal size={95} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer note with extra bottom space */}
          <div className="mt-10 pt-5 border-t border-dashed border-slate-200 text-center text-[11px] text-slate-400">
            Thank you for shopping with KenaX BD! We appreciate your business.
          </div>
        </div>
      </div>
    </div>
  );
};

