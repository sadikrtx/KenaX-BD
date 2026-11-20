import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  PlusCircle,
  Columns3,
  X,
  Check,
  RotateCcw,
  Lock,
} from 'lucide-react';
import {
  ORDER_COLUMNS,
  ESSENTIAL_ORDER_COLUMNS,
  type OrderColumnId,
  type OrderFiltersState,
} from './orderHelpers';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  key: keyof OrderFiltersState;
  label: string;
  options: FilterOption[];
}

const FILTER_CONFIGS: FilterConfig[] = [
  {
    key: 'payment',
    label: 'Payment',
    options: [
      { value: 'cod', label: 'Cash on Delivery (COD)' },
      { value: 'bkash', label: 'bKash' },
      { value: 'nagad', label: 'Nagad' },
      { value: 'rocket', label: 'Rocket' },
    ],
  },
  {
    key: 'channel',
    label: 'Channel',
    options: [
      { value: 'website_store', label: 'Website Store' },
      { value: 'landing_page', label: 'Landing Page' },
      { value: 'chatbot', label: 'AI Chatbot' },
      { value: 'manual', label: 'Manual Entry' },
    ],
  },
  {
    key: 'address',
    label: 'Address',
    options: [
      { value: 'dhaka', label: 'Inside Dhaka' },
      { value: 'outside_dhaka', label: 'Outside Dhaka' },
      { value: 'incomplete', label: 'Incomplete Address' },
    ],
  },
  {
    key: 'onlinePayment',
    label: 'Online payment',
    options: [
      { value: 'paid', label: 'Paid / Verified' },
      { value: 'pending_verification', label: 'Pending Verification' },
      { value: 'unpaid', label: 'Unpaid / COD Due' },
      { value: 'online_only', label: 'Mobile Banking Only' },
    ],
  },
  {
    key: 'adNetwork',
    label: 'Ad network',
    options: [
      { value: 'meta', label: 'Meta Ads (FB / IG)' },
      { value: 'tiktok', label: 'TikTok Ads' },
      { value: 'google', label: 'Google Ads' },
      { value: 'organic', label: 'Organic / Direct' },
    ],
  },
  {
    key: 'siteUpdate',
    label: 'Site update',
    options: [
      { value: 'synced', label: 'Has Courier / Tracking' },
      { value: 'edited', label: 'Recently Edited' },
      { value: 'incomplete', label: 'Incomplete Checkout' },
    ],
  },
  {
    key: 'duplicates',
    label: 'Duplicates',
    options: [
      { value: 'any_duplicate', label: 'Any Duplicate (Phone/IP)' },
      { value: 'duplicate_phone', label: 'Duplicate Phone Number' },
      { value: 'duplicate_ip', label: 'Duplicate IP Address' },
    ],
  },
  {
    key: 'orderCheck',
    label: 'Order check',
    options: [
      { value: 'safe', label: 'Safe Buyer' },
      { value: 'moderate', label: 'Moderate Risk' },
      { value: 'high_risk', label: 'High Return Risk' },
      { value: 'no_data', label: 'Unchecked / No Data' },
      { value: 'ip_blocked', label: 'Blocked IP Only' },
    ],
  },
];

interface OrderFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filters: OrderFiltersState;
  onFilterChange: (key: keyof OrderFiltersState, value: string) => void;
  onClearAllFilters: () => void;
  visibleColumns: OrderColumnId[];
  onToggleColumn: (colId: OrderColumnId) => void;
  onResetColumns: () => void;
  isBn?: boolean;
}

interface PopoverCoords {
  top: number;
  left: number;
  maxHeight: number;
}

export const OrderFilterToolbar: React.FC<OrderFilterToolbarProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  onClearAllFilters,
  visibleColumns,
  onToggleColumn,
  onResetColumns,
  isBn = false,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<PopoverCoords>({
    top: 0,
    left: 0,
    maxHeight: 320,
  });

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const computePopoverPosition = useCallback((key: string, width = 224) => {
    const btn = triggerRefs.current[key];
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const alignRight = key === 'columns';
    let left = alignRight ? rect.right - width : rect.left;
    left = Math.max(12, Math.min(left, vw - width - 12));

    const spaceBelow = vh - rect.bottom - 16;
    const spaceAbove = rect.top - 16;
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(180, Math.min(340, openUpward ? spaceAbove : spaceBelow));
    const top = openUpward
      ? Math.max(12, rect.top - Math.min(300, maxHeight) - 6)
      : rect.bottom + 6;

    setPopoverCoords({ top, left, maxHeight });
  }, []);

  const toggleDropdown = (key: string) => {
    if (openDropdown === key) {
      setOpenDropdown(null);
      return;
    }
    computePopoverPosition(key, key === 'columns' ? 228 : 224);
    setOpenDropdown(key);
  };

  useEffect(() => {
    if (!openDropdown) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && popoverRef.current.contains(target)) return;
      const activeTrigger = triggerRefs.current[openDropdown];
      if (activeTrigger && activeTrigger.contains(target)) return;
      setOpenDropdown(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };

    const handleScrollOrResize = (e: Event) => {
      if (popoverRef.current && e.target instanceof Node && popoverRef.current.contains(e.target)) {
        return;
      }
      setOpenDropdown(null);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openDropdown]);

  const activeFilterCount =
    Object.values(filters).filter((v) => v !== 'all').length + (searchQuery.trim() ? 1 : 0);

  const activeFilterConfig =
    openDropdown && openDropdown !== 'columns'
      ? FILTER_CONFIGS.find((c) => c.key === openDropdown) || null
      : null;

  return (
    <div className="px-3 sm:px-5 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      {/* Strictly Single-Line Filter Strip Matching Reference Screenshot */}
      <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar">
        {/* Search Input */}
        <div className="relative w-44 xl:w-52 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isBn ? 'অর্ডার #, মোবাইল, নাম...' : 'Search order #, site order # or customer...'}
            className="w-full h-8 pl-8 pr-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[12px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70 dark:focus:ring-slate-700 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 8 Compact Multi-Select Dashed Filter Pills */}
        {FILTER_CONFIGS.map((cfg) => {
          const currentVal = filters[cfg.key];
          const selectedValues = currentVal === 'all' ? [] : currentVal.split(',').filter(Boolean);
          const isActive = selectedValues.length > 0;
          const isOpen = openDropdown === cfg.key;

          return (
            <button
              key={cfg.key}
              ref={(el) => {
                triggerRefs.current[cfg.key] = el;
              }}
              type="button"
              onClick={() => toggleDropdown(cfg.key)}
              aria-expanded={isOpen}
              className={`h-8 px-2 rounded-lg border text-[11.5px] font-medium whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'border-[#EA580C]/60 bg-orange-50/70 dark:bg-orange-950/40 text-[#C2410C] dark:text-orange-300 font-semibold'
                  : isOpen
                  ? 'border-slate-400 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white'
                  : 'border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-400'
              }`}
            >
              <PlusCircle className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#EA580C]' : 'text-slate-500'}`} />
              <span>{cfg.label}</span>
              {isActive && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#EA580C] text-white text-[10px] font-bold leading-tight tabular-nums">
                  {selectedValues.length}
                </span>
              )}
            </button>
          );
        })}

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClearAllFilters}
            className="h-8 px-2 rounded-lg text-[11.5px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear ({activeFilterCount})</span>
          </button>
        )}

        {/* Right-aligned Columns Button */}
        <button
          ref={(el) => {
            triggerRefs.current['columns'] = el;
          }}
          type="button"
          onClick={() => toggleDropdown('columns')}
          aria-expanded={openDropdown === 'columns'}
          className={`ml-auto h-8 px-2.5 rounded-lg border text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
            openDropdown === 'columns'
              ? 'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Columns3 className="w-3.5 h-3.5 text-slate-500" />
          <span>Columns</span>
        </button>
      </div>

      {/* Fixed-Position Popover for Active Filter (Square Multi-Select Checkboxes) */}
      {activeFilterConfig && (
        <div
          ref={popoverRef}
          style={{
            top: popoverCoords.top,
            left: popoverCoords.left,
            maxHeight: popoverCoords.maxHeight,
          }}
          className="fixed z-[95] w-56 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl py-2 overflow-y-auto"
        >
          <div className="px-3 pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Filter by {activeFilterConfig.label}
            </span>
            {filters[activeFilterConfig.key] !== 'all' && (
              <button
                type="button"
                onClick={() => onFilterChange(activeFilterConfig.key, 'all')}
                className="text-[11px] text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          {activeFilterConfig.options.map((opt) => {
            const currentVal = filters[activeFilterConfig.key];
            const selectedValues = currentVal === 'all' ? [] : currentVal.split(',').filter(Boolean);
            const isChecked = selectedValues.includes(opt.value);

            return (
              <label
                key={opt.value}
                className="px-3 py-1.5 flex items-center gap-2.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span
                  className={`w-4 h-4 rounded-[4px] flex items-center justify-center border transition-colors shrink-0 ${
                    isChecked
                      ? 'bg-[#EA580C] border-[#EA580C] text-white'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onFilterChange(activeFilterConfig.key, opt.value)}
                  className="sr-only"
                />
                <span
                  className={`${
                    isChecked
                      ? 'text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-700 dark:text-slate-200 font-medium'
                  }`}
                >
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Fixed-Position Popover for Columns Customizer (Locked Essential Columns) */}
      {openDropdown === 'columns' && (
        <div
          ref={popoverRef}
          style={{
            top: popoverCoords.top,
            left: popoverCoords.left,
            maxHeight: popoverCoords.maxHeight,
          }}
          className="fixed z-[95] w-60 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl py-2 overflow-y-auto"
        >
          <div className="px-3 pb-1.5 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              Visible Columns
            </span>
            <button
              type="button"
              onClick={onResetColumns}
              className="text-[11px] text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
          {ORDER_COLUMNS.map((col) => {
            const isEssential = Boolean(col.essential) || ESSENTIAL_ORDER_COLUMNS.includes(col.id);
            const isChecked = isEssential || visibleColumns.includes(col.id);

            return (
              <label
                key={col.id}
                title={isEssential ? `${col.label} is required and cannot be hidden` : col.label}
                className={`px-3 py-1.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                  isEssential
                    ? 'cursor-not-allowed opacity-85 bg-slate-50/60 dark:bg-slate-800/30'
                    : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-4 h-4 rounded-[4px] flex items-center justify-center border transition-colors shrink-0 ${
                      isChecked
                        ? isEssential
                          ? 'bg-[#EA580C]/85 border-[#EA580C]/85 text-white'
                          : 'bg-[#EA580C] border-[#EA580C] text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isEssential}
                    onChange={() => {
                      if (!isEssential) onToggleColumn(col.id);
                    }}
                    className="sr-only"
                  />
                  <span className="text-slate-700 dark:text-slate-200 font-medium truncate">
                    {col.label}
                  </span>
                </div>
                {isEssential && (
                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};
