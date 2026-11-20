import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ClickableOrderIdProps {
  orderId: string;
  prefix?: string;
  className?: string;
  copiedClassName?: string;
}

export const ClickableOrderId: React.FC<ClickableOrderIdProps> = ({
  orderId,
  prefix = '#',
  className = 'font-mono text-xs font-bold text-sky-700 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-300 cursor-pointer transition-colors',
  copiedClassName = 'text-[9px] text-emerald-600 dark:text-emerald-400 font-bold ml-1.5 animate-pulse bg-emerald-50 dark:bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800',
}) => {
  const [copied, setCopied] = useState(false);
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy Order ID:', err);
    }
  };

  return (
    <span
      onClick={handleCopy}
      title={isBn ? 'অর্ডার আইডি কপি করতে ক্লিক করুন' : 'Click to copy Order ID'}
      className={`inline-flex items-center select-none cursor-pointer active:scale-95 transition-transform whitespace-nowrap shrink-0 ${className}`}
    >
      <span className="whitespace-nowrap">
        {prefix}
        {orderId}
      </span>
      {copied && (
        <span className={copiedClassName}>
          {isBn ? '✓ কপি হয়েছে!' : '✓ Copied!'}
        </span>
      )}
    </span>
  );
};
