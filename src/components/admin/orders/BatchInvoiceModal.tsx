import React from 'react';
import { Printer, X } from 'lucide-react';
import type { Order, SiteSettings } from '../../../types/index.ts';

interface BatchInvoiceModalProps {
  orders: Order[];
  settings?: SiteSettings;
  onClose: () => void;
  onPrintSingle: (order: Order) => void;
}

export const BatchInvoiceModal: React.FC<BatchInvoiceModalProps> = ({
  orders,
  settings,
  onClose,
  onPrintSingle,
}) => {
  if (orders.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Batch Invoices ({orders.length} selected)
            </h3>
            <p className="text-xs text-slate-500">
              Preview selected order invoices or print all together.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="h-8 px-3.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print All ({orders.length})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 bg-slate-50 dark:bg-slate-950">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 break-inside-avoid"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {settings?.siteName || 'KenaX BD'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Invoice #{order.id} · {new Date(order.createdAt).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onPrintSingle(order)}
                  className="print:hidden text-xs font-medium text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Full Template View</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Customer</p>
                  <p className="text-slate-900 dark:text-white font-medium">
                    {order.deliveryName || order.customerName}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {order.deliveryMobile || order.customerMobile}
                  </p>
                  <p className="text-slate-500">
                    {order.fullAddress || order.deliveryAddress || ''}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Payment & Status</p>
                  <p className="text-slate-800 dark:text-slate-200">
                    {order.paymentMethod} ({order.paymentStatus})
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Status: {order.orderStatus}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-100 dark:border-slate-800">
                      <th className="py-1.5 text-left font-medium">Item</th>
                      <th className="py-1.5 text-right font-medium">Qty</th>
                      <th className="py-1.5 text-right font-medium">Price</th>
                      <th className="py-1.5 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(order.items || []).map((item, i) => (
                      <tr key={i}>
                        <td className="py-1.5 text-slate-800 dark:text-slate-200">
                          {item.productName || item.name}
                          {item.variant ? ` (${item.variant})` : ''}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{item.quantity || 1}</td>
                        <td className="py-1.5 text-right tabular-nums">৳{item.price}</td>
                        <td className="py-1.5 text-right font-semibold tabular-nums">
                          ৳{(item.price || 0) * (item.quantity || 1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
                <div className="space-y-1 text-right">
                  <p className="text-slate-500">
                    Delivery: ৳{order.deliveryCharge || 0} · Discount: ৳{order.discount || 0}
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    Grand Total: ৳{(order.totalAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
