import React, { useState } from 'react';
import {
  Wrench,
  Sparkles,
  Clock,
  Phone,
  MessageCircle,
  Mail,
  ShieldCheck,
  AlertTriangle,
  Save,
  CheckCircle,
  Eye,
  RefreshCw,
  Power,
  ShieldAlert,
  Server,
  Lock,
} from 'lucide-react';
import { MaintenanceModeSettings, SiteSettings, UserRole, StaffUser } from '../../types';
import { saveSettingsToDB } from '../../lib/firebase';

interface AdminMaintenanceSettingsProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: Partial<SiteSettings>) => Promise<void> | void;
  currentUserRole?: UserRole;
  currentStaff?: StaffUser | null;
}

export const AdminMaintenanceSettings: React.FC<AdminMaintenanceSettingsProps> = ({
  settings,
  onUpdateSettings,
  currentUserRole = 'admin',
  currentStaff,
}) => {
  const isSuperAdmin =
    currentUserRole === 'super_admin' ||
    currentStaff?.role === 'super_admin';

  const defaultMaintenance: MaintenanceModeSettings = {
    enabled: false,
    title: 'Website is under maintenance, please try again later.',
    message: 'Website is currently undergoing scheduled system updates and maintenance.',
    bengaliMessage:
      'Our website is currently undergoing scheduled system updates and maintenance. We apologize for any inconvenience caused.',
    estimatedEndTime: 'Within 2 Hours',
    contactPhone: settings.phone || '+880 1700-000000',
    contactWhatsApp: settings.bkashNumber || settings.phone || '+880 1700-000000',
    contactEmail: settings.email || 'support@kenaxbd.com',
    allowStaffBypass: true,
  };

  const initial = settings.maintenanceMode || defaultMaintenance;

  const [enabled, setEnabled] = useState<boolean>(Boolean(initial.enabled));
  const [title, setTitle] = useState<string>(
    initial.title || 'Website is under maintenance, please try again later.'
  );
  const [bengaliMessage, setBengaliMessage] = useState<string>(
    initial.bengaliMessage ||
      'Our website is currently undergoing scheduled system updates and maintenance. We apologize for any inconvenience caused.'
  );
  const [message, setMessage] = useState<string>(
    initial.message || 'Website is under maintenance, please try again later.'
  );
  const [estimatedEndTime, setEstimatedEndTime] = useState<string>(
    initial.estimatedEndTime || 'Within 2 Hours'
  );
  const [contactPhone, setContactPhone] = useState<string>(
    initial.contactPhone || settings.phone || '+880 1700-000000'
  );
  const [contactWhatsApp, setContactWhatsApp] = useState<string>(
    initial.contactWhatsApp || settings.phone || '+880 1700-000000'
  );
  const [contactEmail, setContactEmail] = useState<string>(
    initial.contactEmail || settings.email || 'support@kenaxbd.com'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // If not super admin, restrict view with a clear badge
  if (!isSuperAdmin) {
    return (
      <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center max-w-lg mx-auto my-6 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Super Admin Restricted Feature
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          System Maintenance Mode configuration is restricted to Super Admins only. Your current role: <span className="font-bold text-slate-700 uppercase">{currentUserRole}</span>.
        </p>
      </div>
    );
  }

  const handleSave = async (customEnabled?: boolean) => {
    setIsSaving(true);
    setSaveSuccessToast(null);

    const isModeActive = customEnabled !== undefined ? customEnabled : enabled;

    const maintenancePayload: MaintenanceModeSettings = {
      enabled: isModeActive,
      title: title.trim() || 'Website is under maintenance, please try again later.',
      bengaliMessage: bengaliMessage.trim(),
      message: message.trim(),
      estimatedEndTime: estimatedEndTime.trim(),
      contactPhone: contactPhone.trim(),
      contactWhatsApp: contactWhatsApp.trim(),
      contactEmail: contactEmail.trim(),
      allowStaffBypass: true,
    };

    try {
      // 1. Direct write to Firestore for instant real-time synchronization
      await saveSettingsToDB({ maintenanceMode: maintenancePayload });

      // 2. Update local state & parent
      await onUpdateSettings({ maintenanceMode: maintenancePayload });

      setSaveSuccessToast(
        isModeActive
          ? '🚨 Maintenance Mode is now ACTIVE! Public visitors will see the maintenance notice.'
          : '✅ Maintenance Mode turned OFF! Website is now fully accessible to all visitors.'
      );
      setTimeout(() => setSaveSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to update maintenance settings:', err);
      alert('Failed to save maintenance mode settings. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (presetType: 'urgent' | 'routine' | 'upgrade') => {
    if (presetType === 'urgent') {
      setTitle('Website is under maintenance, please try again later.');
      setBengaliMessage(
        'Urgent technical optimization and database updates in progress. All services will resume shortly.'
      );
      setMessage('Urgent system optimization in progress. All services will resume shortly.');
      setEstimatedEndTime('Within 30 Minutes');
    } else if (presetType === 'routine') {
      setTitle('Scheduled Routine Maintenance');
      setBengaliMessage(
        'Server routine maintenance is currently underway to ensure optimal shopping experience.'
      );
      setMessage('Website is under scheduled maintenance. Please visit again later.');
      setEstimatedEndTime('Today 6:00 PM');
    } else {
      setTitle('Major Store & Catalog Update');
      setBengaliMessage(
        'New product collections and store features are being updated. The store will open again shortly.'
      );
      setMessage('Exciting new updates are rolling out. Stay tuned!');
      setEstimatedEndTime('Within 1 Hour');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Status */}
      <div
        className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all ${
          enabled
            ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border-amber-300 shadow-xs'
            : 'bg-white border-slate-200 shadow-2xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
                enabled
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 animate-pulse'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Server className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                  Website Maintenance Mode
                </h3>
                {enabled && (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-500 text-white shadow-xs animate-pulse">
                    🚨 Active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Toggle Switch */}
          <div className="shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                const next = !enabled;
                setEnabled(next);
                handleSave(next);
              }}
              disabled={isSaving}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs min-h-[44px] ${
                enabled
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 active:scale-98'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20 active:scale-98'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{enabled ? 'Turn OFF Maintenance' : 'Turn ON Maintenance'}</span>
            </button>
          </div>
        </div>
      </div>

      {saveSuccessToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessToast}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Form: Configuration Details */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-600 shrink-0" />
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  Notice & Contact Settings
                </h4>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
                <span className="text-[10px] text-slate-400 font-bold shrink-0">
                  Presets:
                </span>
                <button
                  type="button"
                  onClick={() => applyPreset('urgent')}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 cursor-pointer shrink-0 transition-all"
                >
                  Urgent
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('routine')}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 cursor-pointer shrink-0 transition-all"
                >
                  Routine
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('upgrade')}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 cursor-pointer shrink-0 transition-all"
                >
                  Upgrade
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Maintenance Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Website is under maintenance, please try again later."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Main Customer Message */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Notice Message
              </label>
              <textarea
                rows={3}
                value={bengaliMessage}
                onChange={(e) => setBengaliMessage(e.target.value)}
                placeholder="Our website is currently undergoing scheduled system updates and maintenance..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-sky-500 leading-relaxed"
              />
            </div>

            {/* Secondary Note */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Secondary Subtitle (Optional)
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Website is under maintenance, please try again later."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Estimated Uptime */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estimated Service Resume Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={estimatedEndTime}
                  onChange={(e) => setEstimatedEndTime(e.target.value)}
                  placeholder="e.g. Within 2 Hours, Today 6:00 PM"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Emergency Contacts for Visitors */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <h5 className="text-xs font-bold text-slate-800">
                Emergency Support Contacts
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hotline Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    WhatsApp Number
                  </label>
                  <div className="relative">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={contactWhatsApp}
                      onChange={(e) => setContactWhatsApp(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Support Email
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="chk-active-maintenance"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer shrink-0"
                />
                <label
                  htmlFor="chk-active-maintenance"
                  className="text-xs font-bold text-slate-800 cursor-pointer select-none"
                >
                  Enable Maintenance Mode Now
                </label>
              </div>

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98 disabled:opacity-50 min-h-[44px]"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Sync Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Form: Live Interactive Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 text-white border border-amber-500/20 shadow-lg space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Live Visitor Popup Preview</span>
              </span>
              <span className="text-[10px] text-slate-400">What users see</span>
            </div>

            {/* Scaled-down replica of the popup */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 text-center space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Wrench className="w-5 h-5 animate-pulse" />
              </div>

              <h5 className="font-bold text-sm text-white leading-tight">
                {title || 'Website is under maintenance, please try again later.'}
              </h5>

              <p className="text-[11px] text-slate-300 leading-snug line-clamp-3">
                {bengaliMessage}
              </p>

              {estimatedEndTime && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-sky-300 font-semibold">
                  <Clock className="w-3 h-3 text-sky-400" />
                  <span>Estimated Time: {estimatedEndTime}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] text-slate-300">
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 truncate">
                  📞 {contactPhone}
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 truncate">
                  💬 WhatsApp ↗
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center">
                <span className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-[10px] inline-flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh & Check Status</span>
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
              💡 <strong>Tip:</strong> You can toggle Maintenance Mode on or off at any time from the Admin Dashboard.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
