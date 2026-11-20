import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Calendar, Hash, DollarSign } from 'lucide-react';
import type { Dealer, DealerDocument, DealerDocumentType, DealerTransaction } from '../../../types/dealer';

interface DealerDocumentModalProps {
  dealers: Dealer[];
  transactions: DealerTransaction[];
  selectedDealerId?: string;
  selectedTransactionId?: string;
  onSave: (doc: Omit<DealerDocument, 'id' | 'uploadedAt'>) => void;
  onClose: () => void;
}

export const DealerDocumentModal: React.FC<DealerDocumentModalProps> = ({
  dealers,
  transactions,
  selectedDealerId,
  selectedTransactionId,
  onSave,
  onClose,
}) => {
  const [dealerId, setDealerId] = useState<string>(selectedDealerId || (dealers[0]?.id || ''));
  const [transactionId, setTransactionId] = useState<string>(selectedTransactionId || '');
  const [documentType, setDocumentType] = useState<DealerDocumentType>('dealer_invoice');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [invoiceTotal, setInvoiceTotal] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>('');

  // File state
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [fileType, setFileType] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15 MB limit.');
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setFileType(file.type || 'application/octet-stream');
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFileUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!dealerId) {
      setError('Please select a dealer.');
      return;
    }
    if (!fileUrl) {
      setError('Please upload a document file (PDF, Image, Scan).');
      return;
    }

    const selectedDealer = dealers.find((d) => d.id === dealerId);

    onSave({
      dealerId,
      dealerName: selectedDealer?.name,
      dealerShopName: selectedDealer?.shopName,
      transactionId: transactionId || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      invoiceDate: invoiceDate || undefined,
      invoiceTotal: invoiceTotal > 0 ? Number(invoiceTotal) : undefined,
      dueDate: dueDate || undefined,
      documentType,
      title: title.trim() || fileName,
      description: description.trim() || undefined,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      uploadedBy: 'Admin',
      verificationStatus: 'unverified',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <UploadCloud className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Upload Dealer Invoice / Document
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Attach bills, receipts, delivery challans, or agreements to dealer account
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
          {/* File Picker Zone */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Document File (PDF, Image, Scan) <span className="text-rose-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                fileName
                  ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <UploadCloud className={`w-8 h-8 mx-auto mb-1.5 ${fileName ? 'text-emerald-500' : 'text-slate-400'}`} />
              {fileName ? (
                <div>
                  <div className="font-extrabold text-xs text-emerald-700 dark:text-emerald-400">
                    {fileName}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {(fileSize / 1024).toFixed(1)} KB &bull; Click to change file
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Click to browse or drag file here
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Supports PDF, JPG, PNG, WebP (Max 15 MB)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dealer & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Dealer Account <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={dealerId}
                onChange={(e) => setDealerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              >
                {dealers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.shopName || d.name} ({d.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Document Category
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DealerDocumentType)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
              >
                <option value="dealer_invoice">Dealer Invoice (ইনভয়েস)</option>
                <option value="purchase_bill">Purchase Bill (ক্রয় বিল)</option>
                <option value="payment_receipt">Payment Receipt (মানি রিসিট)</option>
                <option value="payment_proof">Bank / MFS Proof</option>
                <option value="delivery_challan">Delivery Challan (চালান)</option>
                <option value="return_note">Return / Credit Note</option>
                <option value="agreement">Trade Agreement / Contract</option>
                <option value="other">Other Document</option>
              </select>
            </div>
          </div>

          {/* Document Title */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Document Title
            </label>
            <input
              type="text"
              placeholder="e.g. Consignment #9928 Invoice Slip"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
            />
          </div>

          {/* Invoice Specific Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                Invoice / Bill #
              </label>
              <input
                type="text"
                placeholder="INV-2026-99"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                Invoice Total (৳)
              </label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 75000"
                value={invoiceTotal || ''}
                onChange={(e) => setInvoiceTotal(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-emerald-600"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Link to Transaction */}
          {transactions.filter((t) => t.dealerId === dealerId).length > 0 && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Link to Transaction Record (Optional)
              </label>
              <select
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              >
                <option value="">-- No linked transaction --</option>
                {transactions
                  .filter((t) => t.dealerId === dealerId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id} &bull; ৳{t.totalAmount.toLocaleString('en-IN')} &bull; {t.items[0]?.productName || 'Purchase'} ({new Date(t.transactionDate).toLocaleDateString('en-GB')})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description / Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Scanned copy received with consignment..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Save &amp; Attach Document</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
