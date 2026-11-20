import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Smartphone,
  MapPin,
  Shield,
  MessageSquare,
  Copy,
  Clock,
  Truck,
  Percent,
  AlertTriangle,
  CheckCircle,
  Save,
  DollarSign,
  Package,
  RotateCcw,
  Check,
  Ban,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import {
  SiteSettings,
  OrderSecuritySettings,
  DEFAULT_ORDER_SECURITY_SETTINGS,
} from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface AdminOrderSettingsProps {
  settings: SiteSettings;
  onUpdateSettings?: (newSettings: Partial<SiteSettings>) => Promise<void> | void;
  canManageSettings?: boolean;
}

export const AdminOrderSettings: React.FC<AdminOrderSettingsProps> = ({
  settings,
  onUpdateSettings,
  canManageSettings = true,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const initialSettings: OrderSecuritySettings = {
    ...DEFAULT_ORDER_SECURITY_SETTINGS,
    ...(settings?.orderSecuritySettings || {}),
  };

  const [orderConfig, setOrderConfig] = useState<OrderSecuritySettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.orderSecuritySettings) {
      setOrderConfig({
        ...DEFAULT_ORDER_SECURITY_SETTINGS,
        ...settings.orderSecuritySettings,
      });
    }
  }, [settings?.orderSecuritySettings]);

  const handleToggle = (key: keyof OrderSecuritySettings) => {
    setOrderConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleFieldChange = <K extends keyof OrderSecuritySettings>(
    key: K,
    value: OrderSecuritySettings[K]
  ) => {
    setOrderConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSettings = async () => {
    if (!onUpdateSettings) return;
    setIsSaving(true);
    try {
      await onUpdateSettings({
        orderSecuritySettings: orderConfig,
        // Sync legacy top-level keys
        autoFraudCheckOnOrder: orderConfig.courierProtection,
        fraudAlertThresholdPercent: orderConfig.courierSuccessRatioThreshold,
        advanceDeliveryFeeAmount: orderConfig.advanceDeliveryFeeAmount,
      });

      setSaveSuccess(true);
      setToastNotice(
        isBn
          ? 'অর্ডার সেটিংস সফলভাবে সংরক্ষিত হয়েছে!'
          : 'Order settings saved successfully!'
      );
      setTimeout(() => {
        setSaveSuccess(false);
        setToastNotice(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to save order security settings:', err);
      setToastNotice(isBn ? 'সেভ করতে সমস্যা হয়েছে।' : 'Failed to save order settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        isBn
          ? 'আপনি কি ডিফল্ট অর্ডার সেটিংসে ফিরে যেতে চান?'
          : 'Reset to default order settings?'
      )
    ) {
      setOrderConfig(DEFAULT_ORDER_SECURITY_SETTINGS);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-red-700 dark:text-red-500" />
            <span>{isBn ? 'অর্ডার সেটিংস ও সিকিউরিটি' : 'Order Settings & Protection'}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isBn ? 'ডিফল্ট রিসেট' : 'Reset Default'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving || !canManageSettings}
            onClick={handleSaveSettings}
            className="px-6 py-2.5 rounded-xl bg-[#8B0000] hover:bg-[#700000] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isBn ? 'সেভ সেটিংস' : 'Save Settings'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastNotice && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg animate-in fade-in ${
            saveSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-600/20'
              : 'bg-rose-600 text-white shadow-rose-600/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{toastNotice}</span>
          </div>
          <button
            onClick={() => setToastNotice(null)}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Order Settings Cards Stack (Matching Screenshot Structure) */}
      <div className="space-y-4">
        {/* 1. Mobile number verification */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-red-700 dark:text-red-500">
                {isBn ? 'মোবাইল নম্বর ভেরিফিকেশন' : 'Mobile number verification'}
              </h3>
            </div>

            {/* Red Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={orderConfig.mobileNumberVerification}
                onChange={() => handleToggle('mobileNumberVerification')}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B0000]"></div>
            </label>
          </div>
        </div>

        {/* 2. Location fields */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-red-700 dark:text-red-500">
                {isBn ? 'লোকেশন ফিল্ড' : 'Location fields'}
              </h3>
            </div>

            {/* Red Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={orderConfig.locationFieldsRequired}
                onChange={() => handleToggle('locationFieldsRequired')}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B0000]"></div>
            </label>
          </div>
        </div>

        {/* 3. VPN protection */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-red-700 dark:text-red-500">
                {isBn ? 'ভিপিএন প্রটেকশন' : 'VPN protection'}
              </h3>
            </div>

            {/* Red Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={orderConfig.vpnProtection}
                onChange={() => handleToggle('vpnProtection')}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B0000]"></div>
            </label>
          </div>
        </div>

        {/* 4. Order confirmation SMS */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-red-700 dark:text-red-500">
                {isBn ? 'অর্ডার কনফার্মেশন এসএমএস' : 'Order confirmation SMS'}
              </h3>
            </div>

            {/* Red Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={orderConfig.orderConfirmationSms}
                onChange={() => handleToggle('orderConfirmationSms')}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B0000]"></div>
            </label>
          </div>
        </div>

        {/* 5. Duplicate order block (With Minutes Input) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-red-700 dark:text-red-500">
                {isBn ? 'ডুপ্লিকেট অর্ডার ব্লক' : 'Duplicate order block'}
              </h3>
            </div>

            {/* Red Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={orderConfig.duplicateOrderBlock}
                onChange={() => handleToggle('duplicateOrderBlock')}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B0000]"></div>
            </label>
          </div>

          {/* Block Time Input Field */}
          {orderConfig.duplicateOrderBlock && (
            <div className="pt-1 animate-in fade-in space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isBn ? 'অর্ডার ব্লক টাইম (মিনিট) *' : 'Order block time (minutes) *'}
              </label>
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Clock className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={orderConfig.duplicateOrderBlockMinutes || 15}
                  onChange={(e) =>
                    handleFieldChange(
                      'duplicateOrderBlockMinutes',
                      Math.max(1, Number(e.target.value) || 15)
                    )
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* 6. Courier protection (With Success Ratio Input) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-red-700 dark:text-red-500">
                {isBn ? 'কোরিয়ার প্রটেকশন' : 'Courier protection'}
              </h3>
            </div>

            {/* Red Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={orderConfig.courierProtection}
                onChange={() => handleToggle('courierProtection')}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B0000]"></div>
            </label>
          </div>

          {/* Success Ratio Input Field */}
          {orderConfig.courierProtection && (
            <div className="pt-1 animate-in fade-in space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {isBn ? 'সাকসেস রেশিও (%)' : 'Success ratio'}
              </label>
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Percent className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={orderConfig.courierSuccessRatioThreshold || 70}
                  onChange={(e) =>
                    handleFieldChange(
                      'courierSuccessRatioThreshold',
                      Math.min(100, Math.max(1, Number(e.target.value) || 70))
                    )
                  }
                  placeholder={isBn ? 'যেমন: 70' : 'Enter success ratio'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* 7. Extra Store Protection Features */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Shield className="w-4 h-4 text-red-700 dark:text-red-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isBn ? 'অতিরিক্ত ফ্রড ও অর্ডার নিরাপত্তা সেটিংস' : 'Advanced Fraud & Security Limits'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fake Number Blocker */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {isBn ? 'অচল/ফেক মোবাইল নাম্বার ব্লক' : 'Block Invalid Mobile Numbers'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={orderConfig.blockFakeMobileNumbers ?? true}
                  onChange={() => handleToggle('blockFakeMobileNumbers')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8B0000]"></div>
              </label>
            </div>

            {/* Advance Delivery Fee Requirement for High Risk */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {isBn ? 'হাই-রিস্কে অগ্রিম ডেলিভারি ফি' : 'Advance Fee for High Risk'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={orderConfig.advanceDeliveryFeeForHighRisk ?? false}
                  onChange={() => handleToggle('advanceDeliveryFeeForHighRisk')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8B0000]"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Save Action Button (Matching Screenshot Red Style) */}
      <div className="pt-4 flex items-center justify-end">
        <button
          type="button"
          disabled={isSaving || !canManageSettings}
          onClick={handleSaveSettings}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#8B0000] hover:bg-[#700000] text-white font-bold text-sm shadow-lg shadow-red-950/20 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <span>{isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isBn ? 'সেভ সেটিংস' : 'Save Settings'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminOrderSettings;
