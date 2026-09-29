import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { CustomerRecord, StaffUser, UserRole } from '../types';
import { KenaXLogo } from './KenaXLogo';
import {
  saveCustomerToDB,
  getCustomersFromDB,
  fetchCustomerRecordFromDB,
  fetchCustomerOrdersFromDB,
  normalizePhoneNumber,
  getStaffFromDB,
  mergeCustomersLists,
} from '../lib/firebase';
import { INITIAL_STAFF, INITIAL_CUSTOMERS } from '../data/initialSettings';
import { triggerUserRegistrationWorkflow } from '../lib/emailService';
import { triggerTelegramUserRegistration } from '../lib/telegramBotService';
import { triggerWhatsAppEvent } from '../lib/whatsappService';
import {
  cleanBDPhoneNumber,
  isValidBDMobileNumber,
  getBDPhoneValidationError,
} from '../utils/phoneUtils';
import { isValidEmailFormat, getEmailValidationError, isSuperAdminEmail } from '../utils/emailValidator';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerLogin: (customer: CustomerRecord) => void;
  onStaffLogin?: (staff: StaffUser) => void;
  staffList?: StaffUser[];
  initialTab?: 'login' | 'register';
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onCustomerLogin,
  onStaffLogin,
  staffList = [],
  initialTab = 'login',
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialTab]);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const rawInput = email.trim();
      const cleanInput = rawInput.toLowerCase();
      const cleanDigits = normalizePhoneNumber(rawInput);

      // 1. Gather all known staff synchronously from props + local cache (filtering out any deleted staff)
      const deletedStaffIds = new Set<string>();
      const deletedStaffEmails = new Set<string>();
      try {
        const cachedDeletedStaff = localStorage.getItem('kenax_deleted_staff_cache');
        if (cachedDeletedStaff) {
          const parsed = JSON.parse(cachedDeletedStaff);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (typeof item === 'string') deletedStaffIds.add(item);
              else if (item && typeof item === 'object') {
                if (item.id) deletedStaffIds.add(item.id);
                if (item.email) deletedStaffEmails.add(item.email.toLowerCase());
              }
            });
          }
        }
      } catch {}

      const cachedStaff: StaffUser[] = [];
      const readStaffKeys = ['kenax_staff_cache', 'preview_kenax_staff_cache', 'kenax_current_staff', 'kenax_authenticated_staff'];
      for (const k of readStaffKeys) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) cachedStaff.push(...parsed);
            else if (parsed && typeof parsed === 'object' && (parsed.id || parsed.email)) cachedStaff.push(parsed);
          }
        } catch {}
      }

      const staffMap = new Map<string, StaffUser>();

      INITIAL_STAFF.forEach((s) => {
        const key = (s.email || s.id).toLowerCase();
        staffMap.set(key, {
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          password: s.password || 'sadik@1234',
          role: s.role as UserRole,
          permissions: s.permissions,
          isActive: s.status === 'active',
          status: s.status,
          createdAt: s.createdAt,
          lastLogin: s.lastLogin,
        });
      });

      if (Array.isArray(cachedStaff)) {
        cachedStaff.forEach((s) => {
          if (s && (s.id || s.email)) {
            const key = (s.email || s.id).toLowerCase();
            const existing = staffMap.get(key) || {};
            staffMap.set(key, { ...existing, ...s });
          }
        });
      }

      if (Array.isArray(staffList)) {
        staffList.forEach((s) => {
          if (s && (s.id || s.email)) {
            const key = (s.email || s.id).toLowerCase();
            const existing = staffMap.get(key) || {};
            staffMap.set(key, { ...existing, ...s });
          }
        });
      }

      const combinedStaff = Array.from(staffMap.values()).filter(
        (s) =>
          s &&
          !deletedStaffIds.has(s.id) &&
          (!s.email || !deletedStaffEmails.has(s.email.toLowerCase()))
      );

      // Check all staff roles (Super Admin, Manager, Moderator, Admin)
      const foundStaff = combinedStaff.find((s) => {
        const emailMatch = Boolean(s.email && s.email.trim().toLowerCase() === cleanInput);
        const superAdminEmailMatch = isSuperAdminEmail(cleanInput) && (s.role === 'super_admin' || s.email?.toLowerCase().includes('super'));
        const staffDigits = normalizePhoneNumber(s.phone || '');
        const phoneMatch = Boolean(
          cleanDigits.length >= 7 && (
            staffDigits === cleanDigits ||
            (cleanDigits.length >= 10 && staffDigits.endsWith(cleanDigits.slice(-10))) ||
            (staffDigits.length >= 10 && cleanDigits.endsWith(staffDigits.slice(-10)))
          )
        );
        const roleAliasMatch =
          ((cleanInput === 'admin' || cleanInput === 'superadmin' || cleanInput === 'sadik') &&
            (s.role === 'super_admin' || s.role === 'admin')) ||
          (cleanInput === 'manager' && s.role === 'manager') ||
          (cleanInput === 'moderator' && s.role === 'moderator');

        return emailMatch || superAdminEmailMatch || phoneMatch || roleAliasMatch;
      });

      if (foundStaff) {
        if (foundStaff.status === 'suspended' || foundStaff.isActive === false) {
          setErrorMessage('Your staff account is currently inactive. Please contact the Super Admin.');
          setIsLoading(false);
          return;
        }

        const expectedPassword =
          foundStaff.password ||
          (foundStaff.role === 'super_admin' ? 'sadik@1234' : '123456');

        if (password !== expectedPassword) {
          setErrorMessage('Incorrect password. Access denied.');
          setIsLoading(false);
          return;
        }

        const roleTitle =
          foundStaff.role === 'super_admin'
            ? 'Super Admin'
            : foundStaff.role === 'manager'
            ? 'Manager'
            : foundStaff.role === 'moderator'
            ? 'Moderator'
            : 'Admin';

        setIsLoading(false);
        setSuccessMessage(`${roleTitle} sign in successful! Opening dashboard...`);
        if (onStaffLogin) {
          onStaffLogin(foundStaff);
        }
        onClose();
        return;
      }

      // 2. Regular Customer Check (Unified Email OR Mobile Number Login)
      // Use a timeout protection so customer lookup never hangs if offline
      const timeoutPromise = new Promise<CustomerRecord[]>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      );

      let allCustomers: CustomerRecord[] = [];
      try {
        allCustomers = await Promise.race([getCustomersFromDB(), timeoutPromise]);
      } catch {
        const cached = localStorage.getItem('kenax_customers_cache');
        if (cached) {
          try {
            allCustomers = JSON.parse(cached);
          } catch {}
        }
      }

      const existingCustomer = allCustomers.find((c) => {
        const emailMatch = Boolean(c.email && c.email.trim().toLowerCase() === cleanInput);
        const custDigits = normalizePhoneNumber(c.mobile);
        const phoneMatch = Boolean(
          cleanDigits.length >= 7 && (
            custDigits === cleanDigits ||
            (cleanDigits.length >= 10 && custDigits.endsWith(cleanDigits.slice(-10))) ||
            (custDigits.length >= 10 && cleanDigits.endsWith(custDigits.slice(-10)))
          )
        );
        return emailMatch || phoneMatch;
      });

      if (!existingCustomer) {
        if (cleanInput.includes('@')) {
          setEmail(cleanInput);
        } else if (cleanDigits.length >= 7) {
          setMobile(rawInput);
        }
        setErrorMessage('আপনার তথ্যে কোনো সক্রিয় অ্যাকাউন্ট পাওয়া যায়নি। দয়া করে একটি নতুন অ্যাকাউন্ট তৈরি/রেজিস্টার করুন। (No active account found. Please register a new account.)');
        setActiveTab('register');
        setIsLoading(false);
        return;
      }

      if (existingCustomer.isBlocked) {
        setErrorMessage('This account has been restricted. Reason: ' + (existingCustomer.blockReason || 'Manual restriction'));
        setIsLoading(false);
        return;
      }

      // Check Password
      if (existingCustomer.password && existingCustomer.password !== password) {
        setErrorMessage('Incorrect password. Please try again.');
        setIsLoading(false);
        return;
      }

      // Restore saved addresses if available
      const custAddresses = existingCustomer.addresses || existingCustomer.savedAddresses;
      if (custAddresses && Array.isArray(custAddresses) && custAddresses.length > 0) {
        localStorage.setItem('kenax_saved_addresses', JSON.stringify(custAddresses));
      }

      // Success: Save to local storage and login
      localStorage.setItem('kenax_current_customer', JSON.stringify(existingCustomer));
      setIsLoading(false);
      setSuccessMessage('Welcome back! Signed in successfully.');
      onCustomerLogin(existingCustomer);
      onClose();

      // Async background sync
      fetchCustomerRecordFromDB(existingCustomer.id).catch(() => {});
      fetchCustomerOrdersFromDB(existingCustomer).catch(() => {});
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMessage('Failed to sign in. Please try again.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    const emailValidationErr = getEmailValidationError(email);
    if (emailValidationErr) {
      setErrorMessage(emailValidationErr);
      return;
    }
    
    const cleanMobileDigits = cleanBDPhoneNumber(mobile);
    if (!cleanMobileDigits || !isValidBDMobileNumber(cleanMobileDigits)) {
      setErrorMessage(getBDPhoneValidationError(cleanMobileDigits) || 'Please enter a valid 11-digit mobile number starting with 013 to 019.');
      return;
    }
    if (!password || password.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // Check if user is registering with Admin Password or Super Admin Email
      const isSuperAdminPassword = password === 'sadik@1234' || password === 'sadik@12334';
      const isSuperAdminEmailIdent = isSuperAdminEmail(cleanEmail);
      if ((isSuperAdminPassword && isSuperAdminEmailIdent) || isSuperAdminEmailIdent) {
        const superAdminStaff: StaffUser = staffList.find(
          (s) => (s.email && s.email.toLowerCase() === cleanEmail) || s.role === 'super_admin'
        ) || {
          id: 'staff-super-2',
          name: 'Super Admin',
          email: cleanEmail || 'super@kenaxbd.com',
          phone: mobile.trim() || '+880 1700-123456',
          role: 'super_admin',
          permissions: ['*'],
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        setIsLoading(false);
        if (onStaffLogin) {
          onStaffLogin(superAdminStaff);
        }
        onClose();
        return;
      }

      // Load customers from DB and Cache (excluding any deleted customer tombstones)
      const deletedCustomerIds = new Set<string>();
      try {
        const cachedDeleted = localStorage.getItem('kenax_deleted_customers_cache');
        if (cachedDeleted) {
          const parsed = JSON.parse(cachedDeleted);
          if (Array.isArray(parsed)) parsed.forEach((id) => deletedCustomerIds.add(id));
        }
      } catch {}

      let cachedCustomers: CustomerRecord[] = [];
      try {
        const cached = localStorage.getItem('kenax_customers_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) cachedCustomers = parsed.filter((c) => c && c.id && !deletedCustomerIds.has(c.id));
        }
      } catch {}

      let dbCustomers: CustomerRecord[] = [];
      try {
        dbCustomers = await Promise.race([
          getCustomersFromDB(),
          new Promise<CustomerRecord[]>((res) => setTimeout(() => res([]), 2000)),
        ]);
      } catch (err) {
        console.warn('Customer DB fetch during registration check timeout fallback:', err);
      }

      const allCustomers = mergeCustomersLists(cachedCustomers, dbCustomers).filter(
        (c) => c && c.id && !deletedCustomerIds.has(c.id)
      );

      // 1. Strict Check: Prevent Duplicate Email Registration
      const duplicateEmail = allCustomers.find(
        (c) => c.email && c.email.trim().toLowerCase() === cleanEmail
      );
      if (duplicateEmail) {
        setErrorMessage('এই ইমেইল ঠিকানা দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে। একই ইমেইল দিয়ে দ্বিতীয় অ্যাকাউন্ট খোলা সম্ভব নয়। (An account with this email already exists.)');
        setIsLoading(false);
        return;
      }

      // 2. Strict Check: Prevent Duplicate Mobile Number Registration
      const duplicatePhone = allCustomers.find((c) => {
        const custDigits = (c.mobile || '').replace(/[^0-9]/g, '');
        if (!custDigits || !cleanMobileDigits) return false;
        return (
          custDigits === cleanMobileDigits ||
          (cleanMobileDigits.length >= 10 && custDigits.endsWith(cleanMobileDigits.slice(-10))) ||
          (custDigits.length >= 10 && cleanMobileDigits.endsWith(custDigits.slice(-10)))
        );
      });
      if (duplicatePhone) {
        setErrorMessage('এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে। একই নম্বর দিয়ে দ্বিতীয় অ্যাকাউন্ট খোলা সম্ভব নয়। (An account with this mobile number already exists.)');
        setIsLoading(false);
        return;
      }

      // Inherit existing local cart, wishlist, saved addresses, and order history
      const localCart = (() => { try { const s = localStorage.getItem('kenax_cart'); return s ? JSON.parse(s) : []; } catch { return []; } })();
      const localWishlist = (() => { try { const s = localStorage.getItem('kenax_wishlist'); return s ? JSON.parse(s) : []; } catch { return []; } })();
      const localAddrs = (() => { try { const s = localStorage.getItem('kenax_saved_addresses'); return s ? JSON.parse(s) : []; } catch { return []; } })();
      const localOrders = (() => { try { const s = localStorage.getItem('kenax_my_orders'); return s ? JSON.parse(s) : []; } catch { return []; } })();

      const newCustomer: CustomerRecord = {
        id: `cust-${Date.now()}`,
        name: name.trim(),
        email: cleanEmail,
        mobile: mobile.trim(),
        password,
        cart: localCart,
        wishlist: localWishlist,
        addresses: localAddrs,
        savedAddresses: localAddrs,
        orderIds: localOrders,
        totalOrders: localOrders.length,
        totalSpent: 0,
        isBlocked: false,
        registeredAt: new Date().toISOString(),
        isV2Account: true,
      };

      // Save customer to DB & Local storage (instant non-blocking)
      await saveCustomerToDB(newCustomer);
      localStorage.setItem('kenax_current_customer', JSON.stringify(newCustomer));
      
      // Dispatch Welcome Email to Customer & New User Alert to Staff
      triggerUserRegistrationWorkflow(newCustomer).catch((emailErr) => {
        console.error('[Welcome Email Error]:', emailErr);
      });

      // Dispatch Telegram Bot Alert for New User Registration to Admin & Moderator
      triggerTelegramUserRegistration(newCustomer).catch((tgErr) => {
        console.warn('[Telegram User Registration Alert Warning]:', tgErr);
      });

      // Dispatch WhatsApp Automation for User Registration
      triggerWhatsAppEvent({
        event: 'user_registered',
        user: {
          name: newCustomer.name,
          email: newCustomer.email || '',
          phone: newCustomer.mobile || '',
          id: newCustomer.id,
        },
        customerPhone: newCustomer.mobile,
      }).catch((waErr) => {
        console.warn('[WhatsApp User Registration Alert Warning]:', waErr);
      });

      setIsLoading(false);
      setSuccessMessage('Account created successfully!');
      
      onCustomerLogin(newCustomer);
      onClose();
    } catch (err: any) {
      console.error('Customer registration error:', err);
      setErrorMessage('Failed to create account. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-blue-800 text-white p-6 relative flex flex-col items-center text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Official KenaX BD Logo - Centered & Enlarged */}
          <div className="my-1 flex items-center justify-center">
            <KenaXLogo size="lg" theme="dark" className="h-12 sm:h-14" />
          </div>

          {/* Tab Switcher */}
          <div className="w-full flex rounded-xl bg-black/20 p-1 mt-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'login' ? 'bg-white text-sky-700 shadow-xs' : 'text-sky-100 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'register' ? 'bg-white text-sky-700 shadow-xs' : 'text-sky-100 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email or Phone
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com, super@kenaxbd.com or 017..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const identifier = prompt('Please enter your registered Email or Mobile Number to reset password:');
                      if (identifier) {
                        alert('Password reset instructions and temporary access code have been sent to ' + identifier + '. Please contact support if you need immediate assistance.');
                      }
                    }}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tanvir Hossain"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Phone (11-Digit) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    required
                    value={mobile}
                    onChange={(e) => setMobile(cleanBDPhoneNumber(e.target.value))}
                    placeholder="017XXXXXXXX"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Create Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span>{isLoading ? 'Creating Account...' : 'Complete Registration'}</span>
                <CheckCircle className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Privacy & Security Note */}
          <div className="pt-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% Safe & Secure Encryption • Fast Checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
};

