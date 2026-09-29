import React, { useState } from 'react';

interface ClickableOrderIdProps {
  orderId: string;
  prefix?: string;
  className?: string;
  copiedClassName?: string;
}

export const ClickableOrderId: React.FC<ClickableOrderIdProps> = ({
  orderId,
  prefix = '#',
  className = 'font-mono text-xs font-bold text-sky-700 hover:text-sky-900 cursor-pointer transition-colors',
  copiedClassName = 'text-[10px] text-emerald-600 font-bold ml-1.5 animate-pulse',
}) => {
  const [copied, setCopied] = useState(false);

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
      title="Click to copy Order ID"
      className={`inline-flex items-center select-none cursor-pointer ${className}`}
    >
      <span>
        {prefix}
        {orderId}
      </span>
      {copied && <span className={copiedClassName}>Copied!</span>}
    </span>
  );
};
