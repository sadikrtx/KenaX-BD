import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Shield,
  ArrowRight,
  AlertCircle,
  X,
  Store,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { StaffUser } from '../../types';
import { authenticateStaffFromDB, authenticateSuperAdminWithGoogle } from '../../lib/firebase';
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
  const [staffInputVal, setStaffInputVal] = useState('sadikrtx3060@gmail.com');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffErrorMsg, setStaffErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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

  const handleGoogleSuperAdminLogin = async () => {
    setStaffErrorMsg(null);
    setIsGoogleSubmitting(true);
    try {
      const result = await authenticateSuperAdminWithGoogle();
      if (!result.success || !result.staff) {
        setStaffErrorMsg(result.error || 'Google Sign-In failed. Please use sadikrtx3060@gmail.com.');
        setIsGoogleSubmitting(false);
        return;
      }
      saveStaffSession(result.staff);
      setIsGoogleSubmitting(false);
      onLoginSuccess(result.staff);
    } catch (err: any) {
      setStaffErrorMsg(err?.message || 'Google Sign-In failed. Please try again.');
      setIsGoogleSubmitting(false);
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
            অ্যাডমিন প্যানেলে প্রবেশ করতে আপনার অনুমোদিত স্টাফ ইমেইল (<span className="text-sky-300 font-mono">sadikrtx3060@gmail.com</span>) এবং পাসওয়ার্ড অথবা Google দিয়ে লগইন করুন।
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

          {/* 1-Click Super Admin Google Sign-In (Works reliably on published Firebase Hosting & Cloud Run) */}
          <button
            type="button"
            onClick={handleGoogleSuperAdminLogin}
            disabled={isGoogleSubmitting || isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shadow-sm border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-98 disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
              />
              <path
                fill="#FBBC05"
                d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 21.4 7.4 24 12 24z"
              />
            </svg>
            <span>
              {isGoogleSubmitting
                ? 'Google ভেরিফাই করা হচ্ছে...'
                : 'Google দিয়ে সুপার অ্যাডমিন লগইন (sadikrtx3060@gmail.com)'}
            </span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              অথবা পাসওয়ার্ড দিয়ে লগইন
            </span>
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          </div>

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
                  placeholder="sadikrtx3060@gmail.com অথবা মোবাইল নম্বর"
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
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isSubmitting ? 'লগইন হচ্ছে...' : 'লগইন করুন (Login to Admin Panel)'}</span>
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
