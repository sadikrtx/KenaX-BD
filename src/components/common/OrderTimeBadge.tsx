import React from 'react';
import { Clock, Calendar, Sparkles } from 'lucide-react';
import { getOrderTimeDetails } from '../../utils/orderSourceTimeUtils';
import { useLanguage } from '../../context/LanguageContext';

interface OrderTimeBadgeProps {
  dateStr?: string;
  showExact?: boolean;
  showRelativeFirst?: boolean;
  className?: string;
}

export const OrderTimeBadge: React.FC<OrderTimeBadgeProps> = ({
  dateStr,
  className = '',
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const timeDetails = getOrderTimeDetails(dateStr);

  return (
    <div
      className={`flex flex-col items-start leading-tight space-y-0.5 select-none ${className}`}
      title={`${timeDetails.fullDateTimeBn} (${isBn ? timeDetails.relativeTextBn : timeDetails.relativeTextEn})`}
    >
      {/* Line 1: Exact Date (e.g. "৪ অক্টোবর ২০২৬" / "4 Oct 2026") */}
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
        {timeDetails.isRecent ? (
          <Sparkles className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
        ) : (
          <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
        )}
        <span>
          {isBn ? timeDetails.formattedDateBn : timeDetails.formattedDateEn}
        </span>
      </div>

      {/* Line 2: Original Time (e.g. "৯:১২ পিএম" / "9:12 PM") */}
      <div className="flex items-center gap-1 text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 pl-4 whitespace-nowrap">
        <Clock className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
        <span>
          {isBn ? timeDetails.formattedTimeBn : timeDetails.formattedTimeEn}
        </span>
      </div>
    </div>
  );
};
