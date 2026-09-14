import React from 'react';
import {
  Wrench,
  Sparkles,
  Clock,
  Phone,
  MessageCircle,
  Mail,
  RefreshCw,
  Lock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { SiteSettings } from '../types';
import { KenaXLogo } from './KenaXLogo';

interface MaintenanceModalProps {
  siteSettings: SiteSettings;
  onOpenAdminLogin?: () => void;
}

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  siteSettings,
  onOpenAdminLogin,
}) => {
  const maintenance = siteSettings.maintenanceMode;
  const title =
    maintenance?.title?.trim() ||
    'Website is under maintenance, please try again later.';
  const message =
    maintenance?.message?.trim() ||
    'Website is under maintenance, please try again later.';
  const bengaliMessage =
    maintenance?.bengaliMessage?.trim() ||
    'Our website is currently undergoing scheduled system updates and maintenance. We apologize for any inconvenience caused.';
  const estimatedTime = maintenance?.estimatedEndTime?.trim();
  const phone = maintenance?.contactPhone || siteSettings.phone || '+880 1700-000000';
  const whatsapp = maintenance?.contactWhatsApp || phone;
  const email = maintenance?.contactEmail || siteSettings.email || 'support@kenaxbd.com';

  const cleanWhatsApp = whatsapp.replace(/\D/g, '');
  const formattedWhatsApp = cleanWhatsApp.startsWith('880')
    ? cleanWhatsApp
    : cleanWhatsApp.startsWith('0')
    ? `88${cleanWhatsApp}`
    : `880${cleanWhatsApp}`;

  return (
    <div
      id="maintenance-mode-overlay"
      className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Glow ambient background effects */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Banner */}
        <div className="px-6 pt-6 pb-2 text-center relative z-10 flex flex-col items-center">
          {/* Logo */}
          <div className="mb-4">
            <KenaXLogo size="md" />
          </div>

          {/* Icon Badge */}
          <div className="relative mb-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Wrench className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 p-1 bg-amber-500 rounded-full text-slate-950 shadow-md">
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
            </span>
          </div>

          {/* Status Chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 border border-amber-400/40 text-amber-300 mb-3 tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Maintenance Mode Active</span>
          </div>

          {/* Main Title */}
          <h2 className="text-lg sm:text-2xl font-black text-white leading-snug tracking-tight">
            {title}
          </h2>

          {/* Messages */}
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-2 max-w-lg leading-relaxed">
            {bengaliMessage}
          </p>

          {message && message !== title && (
            <p className="text-[11px] sm:text-xs text-amber-200/90 font-mono bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-xl mt-3 max-w-lg">
              "{message}"
            </p>
          )}

          {/* Estimated Completion Time if set */}
          {estimatedTime && (
            <div className="mt-4 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-sky-300 font-bold">
              <Clock className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Estimated End Time: {estimatedTime}</span>
            </div>
          )}
        </div>

        {/* Emergency Contact & Assistance Box */}
        <div className="p-5 sm:p-6 bg-slate-900/90 border-t border-white/10 mt-4 relative z-10 space-y-4">
          <div className="text-center">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Emergency Contact & Support
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Phone Hotline */}
            {phone && (
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 flex items-center gap-2.5 text-xs text-slate-200 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Hotline</span>
                  <span className="font-bold text-white truncate block text-[11px]">{phone}</span>
                </div>
              </a>
            )}

            {/* WhatsApp */}
            {whatsapp && (
              <a
                href={`https://wa.me/${formattedWhatsApp}?text=${encodeURIComponent(
                  'Hello KenaX BD, I need urgent assistance regarding my order.'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-emerald-400/80 block font-medium">WhatsApp</span>
                  <span className="font-bold text-emerald-200 truncate block text-[11px]">Live Chat ↗</span>
                </div>
              </a>
            )}

            {/* Email */}
            {email && (
              <a
                href={`mailto:${email}?subject=${encodeURIComponent(
                  'Urgent Support Request during Maintenance'
                )}`}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-sky-400/40 flex items-center gap-2.5 text-xs text-slate-200 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Support Email</span>
                  <span className="font-bold text-white truncate block text-[11px]">{email}</span>
                </div>
              </a>
            )}
          </div>

          {/* Action Buttons: Refresh & Staff Login */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-amber-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh & Check Status</span>
            </button>

            {/* Secret / Staff Admin Login shortcut */}
            {onOpenAdminLogin && (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-white/5"
                title="Staff / Admin Authentication"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Admin / Staff Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
