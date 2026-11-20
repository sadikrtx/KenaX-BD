import React, { useState } from 'react';
import { X, Plus, Trash2, Save, ShoppingCart, Calculator, Calendar, FileText, AlertCircle } from 'lucide-react';
import type {
  Dealer,
  DealerTransaction,
  DealerTransactionItem,
  DealerTransactionType,
  DealerTransactionStatus,
} from '../../../types/dealer';
import type { Product } from '../../../types';

interface DealerTransactionModalProps {
  dealers: Dealer[];
  products?: Product[];
  selectedDealerId?: string;
  onSave: (txn: Omit<DealerTransaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

export const DealerTransactionModal: React.FC<DealerTransactionModalProps> = ({
  dealers,
  products = [],
  selectedDealerId,
  onSave,
  onClose,
}) => {
  const [dealerId, setDealerId] = useState<string>(selectedDealerId || (dealers[0]?.id || ''));
  const [transactionType, setTransactionType] = useState<DealerTransactionType>('purchase');
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentDueDate, setPaymentDueDate] = useState<string>('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<DealerTransactionStatus>('pending');

  // Line items
  const [items, setItems] = useState<DealerTransactionItem[]>([
    {
      id: `item-${Date.now()}-1`,
      productName: '',
      quantity: 1,
      unit: 'pcs',
      unitPrice: 0,
      lineTotal: 0,
    },
  ]);

  // Adjustments & Totals
  const [discount, setDiscount] = useState<number>(0);
  const [transportCharge, setTransportCharge] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Auto calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);
  const totalAmount = Math.max(0, subtotal - discount + transportCharge + otherCharges);
  const remainingAmount = Math.max(0, totalAmount - amountPaid);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length + 1}`,
        productName: '',
        quantity: 1,
        unit: 'pcs',
        unitPrice: 0,
        lineTotal: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof DealerTransactionItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: val };

      // If product chosen from KenaX product list
      if (field === 'productId') {
        const prod = products.find((p) => p.id === val);
        if (prod) {
          item.productName = prod.title || prod.name || '';
          item.sku = prod.sku || '';
          if (prod.costPrice) {
            item.unitPrice = Number(prod.costPrice);
          }
        }
      }

      // Recompute line total
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      item.lineTotal = qty * price;

      copy[index] = item;
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dealerId) {
      setError('Please select a dealer.');
      return;
    }

    const validItems = items.filter((i) => i.productName.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one product with name and quantity.');
      return;
    }

    const selectedDealer = dealers.find((d) => d.id === dealerId);

    onSave({
      dealerId,
      dealerName: selectedDealer?.name,
      dealerShopName: selectedDealer?.shopName,
      transactionDate,
      transactionType,
      referenceNumber: referenceNumber.trim() || undefined,
      items: validItems,
      subtotal,
      discount,
      transportCharge,
      otherCharges,
      totalAmount,
      amountPaid,
      remainingAmount,
      paymentDueDate: paymentDueDate || undefined,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      status: remainingAmount === 0 && totalAmount > 0 ? 'completed' : amountPaid > 0 ? 'partially_paid' : status,
      notes: notes.trim() || undefined,
      createdBy: 'Admin',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Record Dealer Purchase / Business Transaction
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log goods purchased, unit pricing, discounts &amp; accounts payable
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

        {error && (
          <div className="mx-5 mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top Transaction Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Dealer <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={dealerId}
                onChange={(e) => setDealerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                {dealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.shopName || d.name} ({d.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Type
              </label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value as DealerTransactionType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
              >
                <option value="purchase">Purchase from Dealer (ক্রয়)</option>
                <option value="sale_to_dealer">Sale to Dealer (বিক্রয়)</option>
                <option value="return_outward">Return Outward (পণ্য ফেরত)</option>
                <option value="adjustment_credit">Credit Adjustment (ছাড়/ডিসকাউন্ট)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Transaction Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bill / Challan Ref #
              </label>
              <input
                type="text"
                placeholder="e.g. INV-88219"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-500" /> Purchased Products &amp; Line Items
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Product
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    {/* Product Name / Select */}
                    <div className="sm:col-span-5">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Product Title &bull; Item #{idx + 1}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. T900 Ultra 2 Smartwatch"
                        value={item.productName}
                        onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs font-bold"
                      />
                    </div>

                    {/* SKU / Variant */}
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        SKU / Variant
                      </label>
                      <input
                        type="text"
                        placeholder="Orange 49mm"
                        value={item.variant || item.sku || ''}
                        onChange={(e) => handleItemChange(idx, 'variant', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs font-bold text-center"
                      />
                    </div>

                    {/* Unit */}
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Unit
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs font-bold"
                      >
                        <option value="pcs">pcs</option>
                        <option value="box">box</option>
                        <option value="kg">kg</option>
                        <option value="pack">pack</option>
                        <option value="set">set</option>
                        <option value="dozen">dozen</option>
                      </select>
                    </div>

                    {/* Unit Cost */}
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Cost (৳)
                      </label>
                      <input
                        type="number"
                        min={0}
                        required
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-xs font-mono font-bold text-right"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="sm:col-span-1 text-right">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Total
                      </label>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono">
                        ৳{item.lineTotal.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Action */}
                    <div className="sm:col-span-1 text-center pt-3 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculations & Due Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delivery, Schedule & Notes */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={paymentDueDate}
                    onChange={(e) => setPaymentDueDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Internal Notes &amp; Consignment Details
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Consignment arriving via SA Paribahan Kurigram branch..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-none"
                />
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>Subtotal ({items.length} items):</span>
                <span className="font-bold font-mono">৳{subtotal.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>Dealer Discount:</span>
                <div className="w-28">
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-right rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                <span>Transport / Courier Charge:</span>
                <div className="w-28">
                  <input
                    type="number"
                    min={0}
                    value={transportCharge}
                    onChange={(e) => setTransportCharge(Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-right rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-200 dark:border-indigo-800 flex justify-between items-center font-extrabold text-sm text-slate-900 dark:text-white">
                <span>Total Transaction Amount:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  ৳{totalAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-2 flex justify-between items-center text-slate-700 dark:text-slate-200 font-bold">
                <span>Amount Paid Now (Cash/Advance):</span>
                <div className="w-32">
                  <input
                    type="number"
                    min={0}
                    max={totalAmount}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 text-right rounded-lg border border-emerald-400 bg-white dark:bg-slate-800 font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 flex justify-between items-center">
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  Remaining Accounts Payable (Due):
                </span>
                <span className="font-extrabold text-base font-mono text-rose-600 dark:text-rose-400">
                  ৳{remainingAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Record Transaction</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
