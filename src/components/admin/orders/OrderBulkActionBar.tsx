import React, { useState } from 'react';
import {
  UserPlus,
  RefreshCw,
  Download,
  Printer,
  ShieldAlert,
  X,
  ChevronDown,
} from 'lucide-react';
import type { OrderStatus, StaffUser } from '../../../types/index.ts';
import { SELECTABLE_ORDER_STATUSES } from './orderHelpers';

interface OrderBulkActionBarProps {
  selectedCount: number;
  staffList: StaffUser[];
  canMarkSpam: boolean;
  isBusy?: boolean;
  onClearSelection: () => void;
  onBulkAssignStaff: (staff: StaffUser | null) => void;
  onBulkChangeStatus: (status: OrderStatus) => void;
  onBulkExport: () => void;
  onBulkPrintInvoices: () => void;
  onBulkMarkSpam: () => void;
}

export const OrderBulkActionBar: React.FC<OrderBulkActionBarProps> = ({
  selectedCount,
  staffList,
  canMarkSpam,
  isBusy = false,
  onClearSelection,
  onBulkAssignStaff,
  onBulkChangeStatus,
  onBulkExport,
  onBulkPrintInvoices,
  onBulkMarkSpam,
}) => {
  const [openMenu, setOpenMenu] = useState<'assign' | 'status' | null>(null);

  if (selectedCount === 0) return null;

  return (
    <div className="px-3 sm:px-5 py-2.5 bg-slate-900 dark:bg-slate-800 text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-150">
      <div className="flex items-center gap-2.5">
        <span className="px-2.5 py-0.5 rounded-md bg-[#EA580C] text-white text-xs font-semibold tabular-nums">
          {selectedCount} selected
        </span>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-xs text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Bulk Assign Staff */}
        <div className="relative">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setOpenMenu(openMenu === 'assign' ? null : 'assign')}
            className="h-8 px-3 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 border border-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-300" />
            <span>Assign Staff</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {openMenu === 'assign' && (
            <div className="absolute right-0 sm:left-0 top-full mt-1.5 z-50 w-52 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onBulkAssignStaff(null);
                  setOpenMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Unassigned
              </button>
              {staffList.filter((s) => s.status !== 'suspended').map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    onBulkAssignStaff(st);
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium truncate">{st.name}</span>
                  <span className="text-[10px] text-slate-400 uppercase">{st.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bulk Change Status */}
        <div className="relative">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setOpenMenu(openMenu === 'status' ? null : 'status')}
            className="h-8 px-3 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 border border-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
            <span>Change Status</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {openMenu === 'status' && (
            <div className="absolute right-0 sm:left-0 top-full mt-1.5 z-50 w-48 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 max-h-64 overflow-y-auto">
              {SELECTABLE_ORDER_STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    onBulkChangeStatus(st);
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export Selected */}
        <button
          type="button"
          disabled={isBusy}
          onClick={onBulkExport}
          className="h-8 px-3 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 border border-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5 text-slate-300" />
          <span>Export Selected</span>
        </button>

        {/* Print Invoices */}
        <button
          type="button"
          disabled={isBusy}
          onClick={onBulkPrintInvoices}
          className="h-8 px-3 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 border border-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Printer className="w-3.5 h-3.5 text-slate-300" />
          <span>Print Invoices</span>
        </button>

        {/* Mark as Spam */}
        {canMarkSpam && (
          <button
            type="button"
            disabled={isBusy}
            onClick={onBulkMarkSpam}
            className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Mark as Spam</span>
          </button>
        )}
      </div>
    </div>
  );
};
