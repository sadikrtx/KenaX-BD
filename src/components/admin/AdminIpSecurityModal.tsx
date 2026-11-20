import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Search,
  Filter,
  X,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  Copy,
  ExternalLink,
  Globe,
  AlertTriangle,
  User,
  ShoppingBag,
  Clock,
  Calendar,
  Lock,
  Unlock,
  Eye,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { IpRecord, IpSummaryStats, Order } from '../../types';
import { formatIpForDisplay } from '../../utils/ipUtils';

interface AdminIpSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onFilterOrdersByIp?: (ip: string) => void;
  currentStaffName?: string;
  onOrderUpdated?: (orderId: string, updates: Partial<Order>) => void;
}

export const AdminIpSecurityModal: React.FC<AdminIpSecurityModalProps> = ({
  isOpen,
  onClose,
  orders = [],
  onFilterOrdersByIp,
  currentStaffName = 'Admin',
  onOrderUpdated,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [records, setRecords] = useState<IpRecord[]>([]);
  const [stats, setStats] = useState<IpSummaryStats>({
    totalIps: 0,
    totalActive: 0,
    totalBlocked: 0,
    totalSuspicious: 0,
    totalOrdersTracked: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Blocked' | 'multiple'>('all');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Block Modal State
  const [blockingIp, setBlockingIp] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('Fake Orders / Fraud Investigation');
  const [customReason, setCustomReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Manual Block IP state
  const [manualIpInput, setManualIpInput] = useState('');
  const [showManualBlockModal, setShowManualBlockModal] = useState(false);

  // IP Details Drawer state
  const [selectedIpRecord, setSelectedIpRecord] = useState<IpRecord | null>(null);

  const fetchIpRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ip-management/records');
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load IP records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIpRecords();
    }
  }, [isOpen]);

  const handleCopy = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 1800);
  };

  const handleBlockIp = async (ipToBlock: string, reason: string) => {
    setIsSubmittingAction(true);
    try {
      const res = await fetch('/api/ip-management/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: ipToBlock,
          reason,
          blockedBy: currentStaffName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local records
        setRecords((prev) =>
          prev.map((r) => (r.ip === ipToBlock ? { ...r, status: 'Blocked', blockReason: reason } : r))
        );
        setStats((prev) => ({
          ...prev,
          totalBlocked: prev.totalBlocked + 1,
          totalActive: Math.max(0, prev.totalActive - 1),
        }));
        if (selectedIpRecord && selectedIpRecord.ip === ipToBlock) {
          setSelectedIpRecord((prev) => (prev ? { ...prev, status: 'Blocked', blockReason: reason } : null));
        }
        setBlockingIp(null);
        setShowManualBlockModal(false);
        setManualIpInput('');
      }
    } catch (err) {
      console.error('Error blocking IP:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleUnblockIp = async (ipToUnblock: string) => {
    setIsSubmittingAction(true);
    try {
      const res = await fetch('/api/ip-management/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: ipToUnblock,
          unblockedBy: currentStaffName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRecords((prev) =>
          prev.map((r) => (r.ip === ipToUnblock ? { ...r, status: 'Active', blockReason: undefined } : r))
        );
        setStats((prev) => ({
          ...prev,
          totalBlocked: Math.max(0, prev.totalBlocked - 1),
          totalActive: prev.totalActive + 1,
        }));
        if (selectedIpRecord && selectedIpRecord.ip === ipToUnblock) {
          setSelectedIpRecord((prev) => (prev ? { ...prev, status: 'Active', blockReason: undefined } : null));
        }
      }
    } catch (err) {
      console.error('Error unblocking IP:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleSyncDatabase = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ip-management/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchIpRecords();
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 1. Status Filter
      if (statusFilter === 'Active' && r.status !== 'Active' && r.status !== 'Whitelisted') return false;
      if (statusFilter === 'Blocked' && r.status !== 'Blocked') return false;
      if (statusFilter === 'multiple' && (r.totalOrders < 2 && r.customerNames.length < 2)) return false;

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesIp = r.ip.toLowerCase().includes(q);
        const matchesReason = r.blockReason?.toLowerCase().includes(q);
        const matchesCustomer = r.customerNames.some((n) => n.toLowerCase().includes(q));
        const matchesPhone = r.customerPhones.some((p) => p.includes(q));
        const matchesEmail = r.customerEmails.some((e) => e.toLowerCase().includes(q));
        const matchesOrder = r.orderIds.some((oid) => oid.toLowerCase().includes(q));
        return matchesIp || matchesReason || matchesCustomer || matchesPhone || matchesEmail || matchesOrder;
      }

      return true;
    });
  }, [records, statusFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden my-auto max-h-[94vh] flex flex-col transition-all">
        {/* Modal Top Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-6 relative overflow-hidden shrink-0 border-b border-indigo-500/20">
          <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute left-1/4 -top-8 w-36 h-36 bg-sky-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 font-extrabold text-[11px] tracking-wide uppercase">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>{isBn ? 'গ্রাহক আইপি ট্র্যাকিং ও নিরাপত্তা হাব' : 'Customer IP Tracking & Security Hub'}</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white mt-1.5 tracking-tight flex items-center gap-2">
                <span>{isBn ? 'আইপি ট্র্যাকিং, সার্চ ও ব্লক/আনব্লক সিস্টেম' : 'IP Tracking, Search & Block System'}</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {isBn
                  ? 'রিয়েল-টাইম ক্লায়েন্ট আইপি ট্র্যাকিং, ফ্রড প্রতিরোধ, ফেক অর্ডার ডিটেকশন এবং ব্লকড আইপি তালিকা পরিচালনা করুন।'
                  : 'Real-time client IP tracking, fraud prevention, fake order detection, and customer network management.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncDatabase}
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/15 cursor-pointer"
                title={isBn ? 'অর্ডার থেকে আইপি ডেটা রিফ্রেশ করুন' : 'Sync IP data from orders'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isBn ? 'রিফ্রেশ' : 'Sync'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center cursor-pointer transition-all border border-white/15 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stat Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 sm:p-5 bg-slate-50 dark:bg-slate-850/60 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {isBn ? 'মোট ট্র্যাকড আইপি' : 'Total Tracked IPs'}
              </span>
              <Globe className="w-4 h-4 text-sky-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
              {stats.totalIps}
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {isBn ? 'সক্রিয় / অ্যাক্টিভ' : 'Active IPs'}
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
              {stats.totalActive}
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                {isBn ? 'ব্লকড আইপি' : 'Blocked IPs'}
              </span>
              <ShieldX className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
              {stats.totalBlocked}
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                {isBn ? 'একাধিক অর্ডার / সন্দেহজনক' : 'Multiple Orders'}
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
              {stats.totalSuspicious}
            </p>
          </div>
        </div>

        {/* Search, Filter Tabs & Manual Add Bar */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* Global Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBn ? 'আইপি, গ্রাহকের নাম, মোবাইল, অর্ডার আইডি দিয়ে খুঁজুন...' : 'Search by IP, customer name, mobile, order ID...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {isBn ? 'সকল আইপি' : 'All IPs'} ({records.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('Active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'Active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isBn ? 'সক্রিয়' : 'Active'}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('Blocked')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'Blocked'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <ShieldX className="w-3.5 h-3.5" />
              <span>{isBn ? 'ব্লকড' : 'Blocked'}</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('multiple')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'multiple'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isBn ? 'একাধিক অর্ডার' : 'Multi-Orders'}</span>
            </button>
          </div>

          {/* Manual Block IP button */}
          <button
            type="button"
            onClick={() => setShowManualBlockModal(true)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? '+ আইপি ব্লক করুন' : '+ Block Custom IP'}</span>
          </button>
        </div>

        {/* Records Table / List */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-500" />
              <p className="text-xs font-bold">{isBn ? 'আইপি ডাটাবেজ লোড হচ্ছে...' : 'Loading IP database...'}</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <Globe className="w-10 h-10 mx-auto text-slate-400 opacity-60" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {isBn ? 'কোনো আইপি রেকর্ড পাওয়া যায়নি' : 'No matching IP records found'}
              </p>
              <p className="text-xs text-slate-400">
                {isBn ? 'সার্চ কুয়েরি পরিবর্তন করে পুনরায় চেষ্টা করুন।' : 'Try modifying your search or filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">{isBn ? 'আইপি অ্যাড্রেস' : 'IP Address'}</th>
                      <th className="py-3 px-4">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                      <th className="py-3 px-4 text-center">{isBn ? 'অর্ডার সংখ্যা' : 'Orders'}</th>
                      <th className="py-3 px-4">{isBn ? 'গ্রাহক / ফোন' : 'Customer / Phone'}</th>
                      <th className="py-3 px-4">{isBn ? 'সর্বশেষ অবস্থান / তারিখ' : 'Last Seen'}</th>
                      <th className="py-3 px-4 text-right">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredRecords.map((record) => {
                      const isBlocked = record.status === 'Blocked';
                      return (
                        <tr key={record.ip} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          {/* IP */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                                {record.ip}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(record.ip, e)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                title="Copy IP"
                              >
                                {copiedIp === record.ip ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            {record.blockReason && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5 font-medium line-clamp-1">
                                🚫 {record.blockReason}
                              </p>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isBlocked
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              }`}
                            >
                              {isBlocked ? <ShieldX className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                              <span>{record.status}</span>
                            </span>
                          </td>

                          {/* Orders Count */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                                record.totalOrders > 2
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300'
                                  : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {record.totalOrders} {isBn ? 'অর্ডার' : 'orders'}
                            </span>
                          </td>

                          {/* Customer & Phone */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <p className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                                {record.customerNames[0] || 'Unknown Customer'}
                                {record.customerNames.length > 1 && (
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 ml-1 font-semibold">
                                    (+{record.customerNames.length - 1} names)
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {record.customerPhones[0] || 'No Phone'}
                              </p>
                            </div>
                          </td>

                          {/* Location & Last Seen */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-700 dark:text-slate-300">
                                {record.locations[0] || 'Bangladesh'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(record.lastSeen).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Filter Orders by this IP */}
                              {onFilterOrdersByIp && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onFilterOrdersByIp(record.ip);
                                    onClose();
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title={isBn ? 'এই আইপির সকল অর্ডার দেখুন' : 'View all orders from this IP'}
                                >
                                  <ShoppingBag className="w-3 h-3" />
                                  <span>{isBn ? 'অর্ডারসমূহ' : 'Orders'}</span>
                                </button>
                              )}

                              {/* Block / Unblock Toggle */}
                              {isBlocked ? (
                                <button
                                  type="button"
                                  disabled={isSubmittingAction}
                                  onClick={() => handleUnblockIp(record.ip)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-xs"
                                  title={isBn ? 'আইপি আনব্লক করুন' : 'Unblock IP'}
                                >
                                  <Unlock className="w-3 h-3" />
                                  <span>{isBn ? 'আনব্লক' : 'Unblock'}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBlockingIp(record.ip);
                                    setBlockReason('Fraud / Fake Orders');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                                  title={isBn ? 'আইপি ব্লক করুন' : 'Block IP'}
                                >
                                  <Lock className="w-3 h-3" />
                                  <span>{isBn ? 'ব্লক' : 'Block'}</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            {isBn ? 'স্বয়ংক্রিয় সার্ভার-সাইড ক্লায়েন্ট আইপি ভ্যালিডেশন সক্রিয়' : 'Server-side verified client IP tracking active'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 cursor-pointer"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>

      {/* Block Confirmation Modal */}
      {blockingIp && (
        <div className="fixed inset-0 z-[130] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center">
                <ShieldX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  {isBn ? 'আইপি অ্যাড্রেস ব্লক নিশ্চিতকরণ' : 'Confirm Block IP'}
                </h3>
                <p className="font-mono text-xs font-bold text-rose-600">{blockingIp}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isBn
                ? 'এই আইপি ব্লক করা হলে এই আইপি থেকে নতুন কোনো কাস্টমার চেকআউট বা অর্ডার সম্পন্ন করতে পারবে না।'
                : 'Blocking this IP will immediately prevent any customer orders or checkouts originating from this IP.'}
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                {isBn ? 'ব্লক করার কারণ নির্বাচন করুন:' : 'Select Block Reason:'}
              </label>
              <select
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold cursor-pointer"
              >
                <option value="Fake Orders / Fraud Investigation">Fake Orders / Fraud Investigation (ফেক অর্ডার)</option>
                <option value="Spam Orders / Bot Activity">Spam Orders / Bot Activity (স্প্যাম/বট ট্র্যাফিক)</option>
                <option value="Multiple COD Return & Refusal">Multiple COD Return & Refusal (ডেলিভারি রিজেক্ট)</option>
                <option value="Payment Verification Abuse">Payment Verification Abuse (ভুয়া পেমেন্ট সাবমিশন)</option>
                <option value="custom">Other / Custom Reason (অন্যান্য কারণ)</option>
              </select>

              {blockReason === 'custom' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="কারণ বিস্তারিত লিখুন..."
                  className="w-full px-3 py-2 mt-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlockingIp(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={() => handleBlockIp(blockingIp, blockReason === 'custom' ? customReason || 'Custom Security Reason' : blockReason)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <ShieldX className="w-4 h-4" />
                <span>{isBn ? 'হ্যাঁ, ব্লক করুন' : 'Confirm Block'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add IP to Blocklist Modal */}
      {showManualBlockModal && (
        <div className="fixed inset-0 z-[130] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-600" />
                <span>{isBn ? 'ম্যানুয়াল আইপি ব্লক তালিকাভুক্তি' : 'Manual IP Blocklist Entry'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowManualBlockModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isBn ? 'আইপি অ্যাড্রেস (IPv4 / IPv6) *' : 'IP Address (IPv4 / IPv6) *'}
                </label>
                <input
                  type="text"
                  value={manualIpInput}
                  onChange={(e) => setManualIpInput(e.target.value.trim())}
                  placeholder="যেমন: 103.145.118.24"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isBn ? 'ব্লক করার কারণ:' : 'Reason for Blocking:'}
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="যেমন: পুনরাবৃত্তি ভুয়া অর্ডার ও কুরিয়ার রিটার্ন..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualBlockModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!manualIpInput || isSubmittingAction}
                onClick={() => handleBlockIp(manualIpInput, customReason || 'Manual Security Block')}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <ShieldX className="w-4 h-4" />
                <span>{isBn ? 'ব্লক তালিকায় যুক্ত করুন' : 'Add to Blocklist'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
