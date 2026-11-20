import React, { useState } from 'react';
import { X, Save, Wallet, CreditCard, Calendar, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Dealer, DealerPayment, PaymentDirection, PaymentMethod, DealerTransaction } from '../../../types/dealer';

interface DealerPaymentModalProps {
  dealers: Dealer[];
  transactions: DealerTransaction[];
  selectedDealerId?: string;
  selectedTransactionId?: string;
  onSave: (payment: Omit<DealerPayment, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export const DealerPaymentModal: React.FC<DealerPaymentModalProps> = ({
  dealers,
  transactions,
  selectedDealerId,
  selectedTransactionId,
  onSave,
  onClose,
}) => {
  const [dealerId, setDealerId] = useState<string>(selectedDealerId || (dealers[0]?.id || ''));
  const [paymentDirection, setPaymentDirection] = useState<PaymentDirection>('paid_to_dealer');
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [relatedTransactionId, setRelatedTransactionId] = useState<string>(
    selectedTransactionId || ''
  );
  const [relatedInvoiceNumber, setRelatedInvoiceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Filter transactions for chosen dealer
  const dealerTxns = transactions.filter((t) => t.dealerId === dealerId && t.remainingAmount > 0);

  const handleTransactionSelect = (txnId: string) => {
    setRelatedTransactionId(txnId);
    const target = transactions.find((t) => t.id === txnId);
    if (target) {
      setAmount(target.remainingAmount);
      if (target.referenceNumber) {
        setRelatedInvoiceNumber(target.referenceNumber);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dealerId) {
      setError('Please select a dealer.');
      return;
    }
    if (amount <= 0) {
      setError('Payment amount must be greater than ৳0.');
      return;
    }

    const selectedDealer = dealers.find((d) => d.id === dealerId);

    onSave({
      dealerId,
      dealerName: selectedDealer?.name,
      dealerShopName: selectedDealer?.shopName,
      paymentDate,
      paymentDirection,
      amount: Number(amount),
      paymentMethod,
      transactionReference: transactionReference.trim() || undefined,
      relatedTransactionId: relatedTransactionId || undefined,
      relatedInvoiceNumber: relatedInvoiceNumber.trim() || undefined,
      recordedBy: 'Admin',
      notes: notes.trim() || undefined,
      verificationStatus: 'verified',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Record Dealer Payment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log cash, MFS, bank transfer or cheque transaction to update ledger
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Dealer Select */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Dealer <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={dealerId}
              onChange={(e) => {
                setDealerId(e.target.value);
                setRelatedTransactionId('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none cursor-pointer"
            >
              {dealers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.shopName || d.name} ({d.id})
                </option>
              ))}
            </select>
          </div>

          {/* Direction toggle */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
              Payment Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentDirection('paid_to_dealer')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentDirection === 'paid_to_dealer'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                }`}
              >
                <span>Paid to Dealer (আমরা দিয়েছি)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentDirection('received_from_dealer')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentDirection === 'received_from_dealer'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                }`}
              >
                <span>Received from Dealer (পেয়েছি)</span>
              </button>
            </div>
          </div>

          {/* Allocate to Pending Transaction */}
          {dealerTxns.length > 0 && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Allocate to Pending Transaction / Bill (Optional)
              </label>
              <select
                value={relatedTransactionId}
                onChange={(e) => handleTransactionSelect(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              >
                <option value="">-- General Payment / Unallocated --</option>
                {dealerTxns.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} &bull; Due: ৳{t.remainingAmount.toLocaleString('en-IN')} &bull; Ref: {t.referenceNumber || 'N/A'} ({new Date(t.transactionDate).toLocaleDateString('en-GB')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Amount Paid (৳ BDT) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                placeholder="e.g. 50000"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-400 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono font-extrabold text-sm outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              />
            </div>
          </div>

          {/* Method & Ref */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              >
                <option value="Bank Transfer">Bank Transfer (ব্যাংক ট্রান্সফার)</option>
                <option value="bKash">bKash (বিকাশ)</option>
                <option value="Nagad">Nagad (নগদ)</option>
                <option value="Rocket">Rocket (রকেট)</option>
                <option value="Cheque">Cheque (চেক)</option>
                <option value="Cash">Cash (নগদ ক্যাশ)</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                TrxID / Cheque # / Deposit Slip #
              </label>
              <input
                type="text"
                placeholder="e.g. BL99281729 or CHQ-4819"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Internal Reconcile Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Cleared via City Bank online portal, sent deposit slip on WhatsApp..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 resize-none"
            />
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
