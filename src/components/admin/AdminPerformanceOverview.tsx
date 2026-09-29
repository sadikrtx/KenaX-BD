import React, { useState } from 'react';
import {
  Shield,
  Users,
  Award,
  TrendingUp,
  CheckCircle,
  Clock,
  ShoppingBag,
  Star,
  Activity,
  FileText,
  Search,
  Lock,
} from 'lucide-react';
import { StaffUser, Order, Review, ActivityLog, UserRole } from '../../types';

interface AdminPerformanceOverviewProps {
  staffList: StaffUser[];
  orders: Order[];
  reviews: Review[];
  activityLogs: ActivityLog[];
  currentRole: UserRole;
  currentStaff: StaffUser | null;
}

export const AdminPerformanceOverview: React.FC<AdminPerformanceOverviewProps> = ({
  staffList,
  orders,
  reviews,
  activityLogs,
  currentRole,
  currentStaff,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter staff members based on roles (moderators, managers, admins, super_admin)
  const teamMembers = staffList.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Calculate metrics per staff member
  const getStaffMetrics = (staff: StaffUser) => {
    // Activities logged by this staff member
    const logs = activityLogs.filter(
      (l) => l.staffId === staff.id || l.staffName.toLowerCase() === staff.name.toLowerCase()
    );

    // Orders handled/created by this staff
    const handledOrders = orders.filter(
      (o) =>
        o.createdByStaffId === staff.id ||
        o.handledByStaffId === staff.id ||
        (o.timeline && o.timeline.some((t) => t.updatedBy && t.updatedBy.toLowerCase().includes(staff.name.toLowerCase())))
    );

    const totalOrdersProcessed = handledOrders.length;
    const totalRevenueHandled = handledOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // For moderators, count review moderations
    const reviewsModeratedCount = staff.role === 'moderator' ? reviews.length : Math.floor(logs.length * 0.4);

    return {
      totalActions: logs.length,
      ordersProcessed: totalOrdersProcessed,
      revenueHandled: totalRevenueHandled,
      reviewsModerated: reviewsModeratedCount,
      lastActive: staff.lastLogin || staff.createdAt,
      recentLogs: logs.slice(0, 5),
    };
  };

  // If logged in as Moderator or Manager, they can ONLY see their own performance dashboard!
  const isStrictRoleRestricted = currentRole === 'moderator' || currentRole === 'manager';
  const effectiveStaffList = isStrictRoleRestricted && currentStaff
    ? (teamMembers.some((s) => s.id === currentStaff.id)
        ? teamMembers.filter((s) => s.id === currentStaff.id)
        : [currentStaff])
    : teamMembers;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 border border-sky-400/30 text-sky-400">
              Super Admin & Staff Performance Core
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            {isStrictRoleRestricted ? `${currentStaff?.name || 'Staff'} Performance Dashboard` : 'Team Performance & Activity Analytics'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {isStrictRoleRestricted
              ? 'Secure personal performance metrics and workload tracking for your assigned role.'
              : 'Monitor real-time task completion, order processing volume, and audit logs for every Moderator, Manager, and Admin.'}
          </p>
        </div>

        {!isStrictRoleRestricted && (
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff member..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>
        )}
      </div>

      {/* Role Segregation Notice */}
      {isStrictRoleRestricted && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
          <Lock className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-bold">Access Isolation Active:</span> As a <b>{currentRole.toUpperCase()}</b>, you can only view your own secure performance dashboard. Other staff dashboards are strictly isolated for privacy and security.
          </div>
        </div>
      )}

      {/* Staff Performance Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {effectiveStaffList.map((staff) => {
          const metrics = getStaffMetrics(staff);
          const isSuper = staff.role === 'super_admin';
          const isManager = staff.role === 'manager';
          const isModerator = staff.role === 'moderator';

          return (
            <div
              key={staff.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-5"
            >
              <div>
                {/* Top card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-black flex items-center justify-center text-base shadow-sm shrink-0 border dark:border-slate-700">
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">{staff.name}</h3>
                        {staff.isRemoved && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Removed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-400">{staff.email}</p>
                      {staff.isRemoved && (
                        <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 inline-flex items-center gap-1">
                          <span>this staff removed</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isSuper
                        ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        : isManager
                        ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {staff.role.replace('_', ' ')}
                  </span>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/70 text-center">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Orders Handled</span>
                    <p className="text-lg font-black text-slate-900 dark:text-white mt-1">{metrics.ordersProcessed}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/70 text-center">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Audit Actions</span>
                    <p className="text-lg font-black text-sky-700 dark:text-sky-400 mt-1">{metrics.totalActions}</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/70 text-center">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                      {isModerator ? 'Reviews Moderated' : 'Revenue Managed'}
                    </span>
                    <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {isModerator ? metrics.reviewsModerated : `৳${metrics.revenueHandled.toLocaleString()}`}
                    </p>
                  </div>
                </div>

                {/* Recent Activity Log for this staff */}
                <div className="mt-5 space-y-2.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Recent Activity & Workload Trail</span>
                  </h4>

                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {metrics.recentLogs.length > 0 ? (
                      metrics.recentLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/70 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0"></span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{log.action}</span>
                            <span className="text-slate-400 dark:text-slate-400 truncate max-w-[180px] sm:max-w-xs">({log.details})</span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-400 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2 text-center bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                        No recent activity logs recorded yet for {staff.name}.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer status */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${staff.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{staff.isActive ? 'Active Staff Account' : 'Suspended'}</span>
                </div>
                <span>Last login: {new Date(staff.lastLogin || staff.createdAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          );
        })}

        {effectiveStaffList.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 dark:text-slate-500 text-xs italic bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            No staff members found matching your search query.
          </div>
        )}
      </div>
    </div>
  );
};
