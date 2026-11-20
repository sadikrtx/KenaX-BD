import React from 'react';
import { Rocket, Globe, Bot, PenTool, Share2, Store } from 'lucide-react';
import { Order } from '../../types';
import { getOrderSourceInfo } from '../../utils/orderSourceTimeUtils';
import { useLanguage } from '../../context/LanguageContext';

interface OrderSourceBadgeProps {
  order: Order;
  compact?: boolean;
  showDetails?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export const OrderSourceBadge: React.FC<OrderSourceBadgeProps> = ({
  order,
  compact = false,
  showDetails = false,
  iconOnly = false,
  className = '',
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const info = getOrderSourceInfo(order);

  const renderIcon = () => {
    switch (info.iconType) {
      case 'rocket':
        return <Rocket className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />;
      case 'bot':
        return <Bot className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'share':
        return <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'pen':
        return <PenTool className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />;
      case 'store':
        return <Store className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />;
      case 'globe':
      default:
        return <Store className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />;
    }
  };

  const tooltipTitle = `${isBn ? info.badgeTitleBn : info.badgeTitleEn}${info.details ? ` (${info.details})` : ''}`;

  if (iconOnly) {
    return (
      <span
        className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-md transition-all hover:scale-110 cursor-help shrink-0 shadow-2xs ${info.pillClass} ${className}`}
        title={tooltipTitle}
        aria-label={tooltipTitle}
      >
        {renderIcon()}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-medium text-[11px] select-none transition-colors ${info.pillClass} ${className}`}
      title={tooltipTitle}
    >
      {renderIcon()}
      <span>{compact ? (isBn ? info.shortLabelBn : info.shortLabelEn) : (isBn ? info.badgeTitleBn : info.badgeTitleEn)}</span>
      {showDetails && info.details && (
        <span className="text-[10px] opacity-75 truncate max-w-[100px]">
          ({info.details})
        </span>
      )}
    </div>
  );
};
