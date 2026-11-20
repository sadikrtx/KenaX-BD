import React from 'react';
import { ORDER_STATUS_TABS, type OrderTabId } from './orderHelpers';

interface OrderStatusTabsProps {
  activeTab: OrderTabId;
  onSelectTab: (tabId: OrderTabId) => void;
  counts: Record<OrderTabId, number>;
  isBn?: boolean;
}

export const OrderStatusTabs: React.FC<OrderStatusTabsProps> = ({
  activeTab,
  onSelectTab,
  counts,
  isBn = false,
}) => {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div
        role="tablist"
        aria-label="Order Status Navigation"
        className="flex items-center gap-1 overflow-x-auto px-3 sm:px-5 no-scrollbar scroll-smooth"
      >
        {ORDER_STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id] ?? 0;
          const formattedCount = String(count).padStart(2, '0');

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectTab(tab.id)}
              className={`relative shrink-0 px-2.5 sm:px-3 py-3 text-[12.5px] font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer border-b-2 -mb-[1px] ${
                isActive
                  ? 'border-[#EA580C] text-slate-900 dark:text-white font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span>{isBn ? tab.labelBn : tab.label}</span>
              <span
                className={`text-[11px] font-semibold tabular-nums ${
                  isActive
                    ? 'text-[#EA580C]'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {formattedCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
