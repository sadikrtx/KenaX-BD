import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import type { DealerDocument } from '../../../types/dealer';

interface DocumentPreviewModalProps {
  document: DealerDocument | null;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ document: doc, onClose }) => {
  if (!doc) return null;

  const isPdf = doc.fileType?.includes('pdf') || doc.fileName?.toLowerCase().endsWith('.pdf');
  const isImage =
    doc.fileType?.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(doc.fileName || '') ||
    doc.fileUrl.startsWith('data:image/');

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName || 'dealer-document';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1">
                {doc.title || doc.fileName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {doc.dealerShopName || doc.dealerName} &bull; {doc.documentType.replace('_', ' ').toUpperCase()} &bull;{' '}
                {(doc.fileSize / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/60 dark:bg-slate-950 flex items-center justify-center min-h-[360px] max-h-[70vh]">
          {isImage ? (
            <img
              src={doc.fileUrl}
              alt={doc.title}
              className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-md border border-slate-200 dark:border-slate-800 bg-white"
            />
          ) : isPdf ? (
            <iframe
              src={doc.fileUrl}
              title={doc.title}
              className="w-full h-[65vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
            />
          ) : (
            <div className="text-center p-8 space-y-3">
              <FileText className="w-16 h-16 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Preview not directly supported in browser
              </div>
              <p className="text-xs text-slate-500 max-w-sm">
                This document is securely stored. You can download it to view on your device.
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" /> Download Original Document
              </button>
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-slate-500 dark:text-slate-400">
            {doc.invoiceNumber && (
              <span>
                Invoice #: <strong className="text-slate-800 dark:text-white font-mono">{doc.invoiceNumber}</strong>
              </span>
            )}
            {doc.invoiceTotal !== undefined && (
              <span>
                Total: <strong className="text-emerald-600 font-bold">৳{doc.invoiceTotal.toLocaleString('en-IN')}</strong>
              </span>
            )}
            {doc.invoiceDate && (
              <span>
                Date: <strong className="text-slate-800 dark:text-white">{new Date(doc.invoiceDate).toLocaleDateString('en-GB')}</strong>
              </span>
            )}
            <span>
              Uploaded by: <strong className="text-slate-800 dark:text-white">{doc.uploadedBy}</strong>
            </span>
          </div>

          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {doc.verificationStatus}
          </span>
        </div>
      </div>
    </div>
  );
};
