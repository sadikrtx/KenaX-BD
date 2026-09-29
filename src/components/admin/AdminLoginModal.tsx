import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Key,
  Shield,
  ArrowRight,
  AlertCircle,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { UserRole, StaffUser } from '../../types';
import { KenaXLogo } from '../KenaXLogo';

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
  staffList,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = inputVal.trim().toLowerCase();
    const cleanDigits = cleanInput.replace(/[\s\-\+\(\)]/g, '');

    // Find staff account from staffList (by email, phone, or super_admin role)
    let foundStaff = staffList.find(
      (s) =>
        (s.email && s.email.trim().toLowerCase() === cleanInput) ||
        (s.phone && s.phone.replace(/[\s\-\+\(\)]/g, '').toLowerCase() === cleanDigits)
    );

    const isSuperAdminIdentifier =
      cleanInput === 'super@kenaxbd.com' ||
      cleanInput === 'super@gmail.com' ||
      cleanInput === 'sadikrtx3060@gmail.com' ||
      cleanInput === 'admin' ||
      cleanInput === 'superadmin' ||
      cleanInput === 'super_admin' ||
      cleanDigits === '01700123456';

    if (!foundStaff && isSuperAdminIdentifier) {
      foundStaff = staffList.find((s) => s.role === 'super_admin') || {
        id: 'staff-super-2',
        name: 'Super Admin',
        email: cleanInput.includes('@') ? cleanInput : 'super@kenaxbd.com',
        phone: '+880 1700-123456',
        password: 'sadik@1234',
        role: 'super_admin' as const,
        permissions: ['*'],
        isActive: true,
        createdAt: new Date().toISOString(),
      };
    }

    if (!foundStaff) {
      setErrorMsg('No staff account found for this Email or Mobile Number.');
      return;
    }

    if (foundStaff.isRemoved) {
      setErrorMsg(
        'এই অ্যাকাউন্টটি সরিয়ে দেওয়া হয়েছে (This account has been removed)। এই ইমেল বা ফোন দিয়ে কোনো সক্রিয় ডেটা পাওয়া যায় নি। অনুগ্রহ করে সুপার অ্যাডমিনের সাথে যোগাযোগ করুন অথবা নতুন অ্যাকাউন্ট খুলুন।'
      );
      return;
    }

    if (!foundStaff.isActive || foundStaff.status === 'suspended') {
      setErrorMsg('Your staff account has been suspended by the Super Admin.');
      return;
    }

    const expectedPassword =
      foundStaff.password ||
      (foundStaff.role === 'super_admin' ? 'sadik@1234' : '123456');

    if (password !== expectedPassword) {
      setErrorMsg('Incorrect password. Access denied.');
      return;
    }

    onLoginSuccess(foundStaff);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-slate-950 text-white p-6 relative border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">Staff Portal</span>
          </div>
          <h3 className="text-xl font-black text-white">Staff & Management Access</h3>
          <p className="text-xs text-slate-400 mt-1">
            Restricted to Super Admin, Admin, Manager, and Moderator accounts
          </p>
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Staff Email or Mobile Number</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={inputVal}
                  onChange={(e) => {
                    setInputVal(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="e.g. yourname@gmail.com, super@kenaxbd.com or 017..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Staff Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Enter staff security password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Authenticate & Enter Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              🔒 <span className="font-semibold text-slate-700 dark:text-slate-300">Security Protected:</span> General visitors and customers cannot access management areas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
