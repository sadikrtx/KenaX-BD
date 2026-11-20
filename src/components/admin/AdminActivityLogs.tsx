import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Shield,
  Calendar,
  Laptop,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Download,
  Database,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ActivityLog, UserRole, StaffUser } from '../../types';
import { syncPendingActivityLogs } from '../../lib/firebase';
import { fetchActivityLogsPage, type PaginatedResult } from '../../lib/firestorePagination';
import { adminDataCache } from '../../lib/adminCache';
import {
  SaasDonutChart,
  SaasBarChart,
  SaasLineAreaChart,
  CollapsibleAnalyticsPanel,
  SAAS_CHART_COLORS,
} from './charts/AdminCharts';

interface AdminActivityLogsProps {
  logs: ActivityLog[];
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  cacheScope?: string;
}

export const AdminActivityLogs: React.FC<AdminActivityLogsProps> = ({
  logs,
  currentRole,
  currentStaff,
  cacheScope,
}) => {
  const effectiveScope =
    cacheScope || adminDataCache.makeScope(currentStaff?.id || currentStaff?.email || 'staff', currentRole);

  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Firestore cursor pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [pageResult, setPageResult] = useState<PaginatedResult<ActivityLog> | null>(null);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || moduleFilter !== 'all' || roleFilter !== 'all';

  const loadPage = useCallback(
    async (targetPage: number, targetSize: number, forceRefresh = false) => {
      setIsLoadingPage(true);
      try {
        const res = await fetchActivityLogsPage(effectiveScope, targetPage, targetSize, {
          forceRefresh,
          fallbackItems: logs,
        });
        setPageResult(res);
        if (res.page !== targetPage) {
          setCurrentPage(res.page);
        }
      } finally {
        setIsLoadingPage(false);
      }
    },
    [effectiveScope, logs]
  );

  useEffect(() => {
    if (!hasActiveFilters) {
      loadPage(currentPage, pageSize, false);
    }
  }, [currentPage, pageSize, hasActiveFilters, effectiveScope]);

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, moduleFilter, roleFilter, pageSize]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncPendingActivityLogs();
      adminDataCache.invalidateCollection(effectiveScope, 'activityLogs');
      setCurrentPage(1);
      await loadPage(1, pageSize, true);
      setSyncSuccessMsg('Cloud Firestore synced successfully!');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch (e) {
      console.error('Manual log sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'Staff Name', 'Staff Role', 'Module', 'Action', 'Details', 'Target ID', 'IP Address'];
    const rows = logs.map((l) => [
      `"${new Date(l.timestamp).toLocaleString('en-GB')}"`,
      `"${l.staffName || ''}"`,
      `"${l.staffRole || ''}"`,
      `"${l.module || ''}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.targetId || ''}"`,
      `"${l.ipAddress || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kenax-activity-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = useMemo(() => {
    const sourceLogs = hasActiveFilters ? logs : (pageResult?.items && pageResult.items.length > 0 ? pageResult.items : logs);
    if (!hasActiveFilters) {
      // On Page 1, seamlessly prepend any brand-new real-time logs not yet in the cursor snapshot
      if (currentPage === 1 && pageResult?.items) {
        const byId = new Map<string, ActivityLog>();
        logs.slice(0, pageSize).forEach((l) => {
          if (l?.id) byId.set(l.id, l);
        });
        pageResult.items.forEach((l) => {
          if (l?.id && !byId.has(l.id)) byId.set(l.id, l);
        });
        return Array.from(byId.values())
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, pageSize);
      }
      return sourceLogs.slice(0, pageSize);
    }

    return logs.filter((l) => {
      const matchesSearch =
        (l.staffName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.targetId || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesModule =
        moduleFilter === 'all' || (l.module || '').toLowerCase() === moduleFilter.toLowerCase();

      const matchesRole =
        roleFilter === 'all' ||
        (l.staffRole || '').toLowerCase().replace('_', ' ') === roleFilter.toLowerCase().replace('_', ' ');

      return matchesSearch && matchesModule && matchesRole;
    });
  }, [logs, pageResult, hasActiveFilters, currentPage, pageSize, searchQuery, moduleFilter, roleFilter]);

  const displayedLogs = useMemo(() => {
    if (!hasActiveFilters) return filteredLogs;
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, hasActiveFilters, currentPage, pageSize]);

  const totalKnownLogs = hasActiveFilters
    ? filteredLogs.length
    : Math.max(pageResult?.totalCount ?? 0, logs.length);
  const totalPages = Math.max(1, Math.ceil(totalKnownLogs / pageSize));
  const canGoPrev = currentPage > 1;
  const canGoNext = hasActiveFilters
    ? currentPage < totalPages
    : Boolean(pageResult?.hasNextPage) || currentPage < totalPages;

  const logAnalytics = useMemo(() => {
    const moduleMap = new Map<string, number>();
    const staffMap = new Map<string, number>();
    const dateMap = new Map<string, number>();

    const moduleColors: Record<string, string> = {
      orders: '#0284C7',
      inventory: '#D97706',
      payments: '#059669',
      staff: '#7C3AED',
      roles: '#7C3AED',
      products: '#4F46E5',
      customers: '#E11D48',
      settings: '#0D9488',
      delivery: '#2563EB',
      coupons: '#EA580C',
      reviews: '#DB2777',
    };

    logs.forEach((log) => {
      const mod = (log.module || 'other').toLowerCase();
      moduleMap.set(mod, (moduleMap.get(mod) || 0) + 1);

      const sName = (log.staffName || 'System').trim();
      staffMap.set(sName, (staffMap.get(sName) || 0) + 1);

      const d = new Date(log.timestamp);
      if (!isNaN(d.getTime())) {
        const dayKey = d.toISOString().slice(0, 10);
        dateMap.set(dayKey, (dateMap.get(dayKey) || 0) + 1);
      }
    });

    const moduleSlices = Array.from(moduleMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([mod, count], idx) => ({
        id: mod,
        label: mod.charAt(0).toUpperCase() + mod.slice(1),
        value: count,
        color: moduleColors[mod] || SAAS_CHART_COLORS[idx % SAAS_CHART_COLORS.length],
      }));

    const topStaffBars = Array.from(staffMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, count]) => ({
        id: name,
        label: name,
        value: count,
        color: '#0284C7',
      }));

    const dailyTrend = Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([iso, count]) => ({
        label: new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        primary: count,
      }));

    return { moduleSlices, topStaffBars, dailyTrend };
  }, [logs]);

  const getModuleBadge = (moduleName: string) => {
    switch (moduleName?.toLowerCase()) {
      case 'orders':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800">ORDERS</span>;
      case 'inventory':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">INVENTORY</span>;
      case 'payments':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">PAYMENTS</span>;
      case 'staff':
      case 'roles':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800">STAFF & RBAC</span>;
      case 'products':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">PRODUCTS</span>;
      case 'customers':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800">CUSTOMERS</span>;
      case 'settings':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800">SETTINGS</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 uppercase">{moduleName}</span>;
    }
  };

  return (
    <div className="space-y-6">

      {syncSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {syncSuccessMsg}
        </div>
      )}

      {/* Audit & Security Analytics */}
      <CollapsibleAnalyticsPanel
        title={`Audit Trail Analytics (${logs.length} Recorded Events)`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SaasDonutChart
            title="Events by Module"
            subtitle="Click a module slice to filter audit logs"
            data={logAnalytics.moduleSlices}
            centerLabel="Total Events"
            emptyText="No audit events logged yet"
            onSelectSlice={(slice) => {
              const mod = slice.id || slice.label.toLowerCase();
              setModuleFilter((prev) => (prev === mod ? 'all' : mod));
            }}
          />
          <SaasBarChart
            title="Top Active Team Members"
            subtitle="Click a bar to search logs by staff member"
            data={logAnalytics.topStaffBars}
            primaryLabel="Actions"
            orientation="horizontal"
            barColor="#0284C7"
            emptyText="No staff activity recorded"
            onSelectBar={(bar) => {
              const staffName = bar.id || bar.label;
              setSearchQuery((prev) => (prev === staffName ? '' : staffName));
            }}
          />
          <SaasLineAreaChart
            title="Daily Audit Activity"
            subtitle="Events recorded across recent active dates"
            data={logAnalytics.dailyTrend}
            primaryLabel="Audit Events"
            primaryFormat="number"
            primaryColor="#4F46E5"
            emptyText="Not enough daily timeline data"
          />
        </div>
      </CollapsibleAnalyticsPanel>

      {/* Filter and Search Bar with Action Buttons */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs by staff, action, details, ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Module Filter */}
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer"
          >
            <option value="all">All Modules ({totalKnownLogs})</option>
            <option value="orders">Orders</option>
            <option value="inventory">Inventory</option>
            <option value="payments">Payments</option>
            <option value="products">Products</option>
            <option value="staff">Staff &amp; Roles</option>
            <option value="delivery">Delivery</option>
            <option value="customers">Customers</option>
            <option value="coupons">Coupons</option>
            <option value="reviews">Reviews</option>
            <option value="settings">Settings</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="super admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="moderator">Moderator</option>
            <option value="integration">Muse AI (Integration)</option>
          </select>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
            title="Sync Cloud Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-sky-600' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Staff User</th>
                <th className="py-3.5 px-4">Module</th>
                <th className="py-3.5 px-4">Action Taken</th>
                <th className="py-3.5 px-4">Audit Details</th>
                <th className="py-3.5 px-4">IP & Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoadingPage && displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-sky-500" />
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading audit logs page...</p>
                  </td>
                </tr>
              ) : displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No activity logs found matching your filters</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Try resetting search keywords or module filters.</p>
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-GB')}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        <span>{log.staffName}</span>
                        {(log.staffRole === 'integration' || log.source === 'muse_integration') && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Muse AI
                          </span>
                        )}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize font-medium block">
                        {(log.staffRole || 'staff').replace('_', ' ')}
                        {log.staffEmail ? ` · ${log.staffEmail}` : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {getModuleBadge(log.module)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      <div>{log.action}</div>
                      {log.fromStatus && log.toStatus && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          {log.fromStatus} → {log.toStatus}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-sm">
                      <p className="line-clamp-2 leading-relaxed">{log.details}</p>
                      {log.targetId && (
                        <span className="inline-block mt-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          Ref: {log.targetId}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Cursor Pagination Footer */}
        <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="tabular-nums font-medium">
              Showing <strong className="font-bold text-slate-900 dark:text-white">{displayedLogs.length}</strong> of{' '}
              <strong className="font-bold text-slate-900 dark:text-white">{totalKnownLogs}</strong> audit events
            </span>
            <div className="flex items-center gap-1.5 sm:pl-3 sm:border-l border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || 25)}
                aria-label="Activity logs per page"
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!canGoPrev || isLoadingPage}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-2.5 py-1 font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={!canGoNext || isLoadingPage}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
