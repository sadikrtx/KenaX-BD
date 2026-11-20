import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Shield,
  ArrowRight,
  AlertCircle,
  Sparkles,
  X,
  Store,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import { StaffUser } from '../../types';
import { authenticateStaffFromDB } from '../../lib/firebase';
import { saveStaffSession } from '../../lib/passwordHash';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (staff: StaffUser) => void;
  staffList: StaffUser[];
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  // Staff Login Form state
  const [staffInputVal, setStaffInputVal] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffErrorMsg, setStaffErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await authenticateStaffFromDB(staffInputVal, staffPassword);
      if (!result.success || !result.staff) {
        setStaffErrorMsg(result.error || 'Invalid credentials. Access denied.');
        setIsSubmitting(false);
        return;
      }

      // Persist ONLY non-secret session metadata (never password or passwordHash)
      saveStaffSession(result.staff);
      setIsSubmitting(false);
      onLoginSuccess(result.staff);
    } catch (err: any) {
      setStaffErrorMsg(
        err?.message || 'Unable to verify credentials against Cloud Firestore. Please check your internet connection and try again.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header: Exclusively Staff Portal */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 text-white p-5 sm:p-6 relative border-b border-slate-800">
          <button
            onClick={onClose}
            aria-label="Close portal modal"
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[11px] font-black tracking-wider uppercase mb-2.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Staff Portal • /admin</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-sky-400" />
            <span>স্টাফ পোর্টাল (Staff Login Portal)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            অ্যাডমিন প্যানেলে প্রবেশ করতে আপনার অনুমোদিত স্টাফ ইমেইল/মোবাইল নম্বর এবং পাসওয়ার্ড দিয়ে লগইন করুন।
          </p>
        </div>

        {/* Content Body: Staff Sign In */}
        <div className="p-5 sm:p-6 space-y-4">
          {staffErrorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{staffErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleStaffSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                স্টাফ ইমেইল অথবা মোবাইল নম্বর
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={staffInputVal}
                  onChange={(e) => {
                    setStaffInputVal(e.target.value);
                    setStaffErrorMsg(null);
                  }}
                  placeholder="Enter staff email or phone number"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  নিরাপত্তা পাসওয়ার্ড (Password)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">RBAC Protected</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={staffPassword}
                  onChange={(e) => {
                    setStaffPassword(e.target.value);
                    setStaffErrorMsg(null);
                  }}
                  placeholder="গোপন পাসওয়ার্ড লিখুন"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>লগইন করুন (Login to Admin Panel)</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Store className="w-3.5 h-3.5" />
              <span>স্টোরে ফিরে যান (Return to Store)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginModal;
