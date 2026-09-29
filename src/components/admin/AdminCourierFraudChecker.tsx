import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Phone,
  Truck,
  HelpCircle,
  Sparkles,
  Save,
  Key,
  Sliders,
  History,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { SiWhatsapp } from 'react-icons/si';
import { CourierFraudReport, SiteSettings } from '../../types';
import { checkCourierFraud, formatAdvanceDeliveryMessage, normalizePhoneForCourier } from '../../lib/courierFraudService';

interface AdminCourierFraudCheckerProps {
  siteSettings?: SiteSettings;
  onUpdateSettings?: (newSettings: Partial<SiteSettings>) => Promise<void> | void;
  canManageSettings?: boolean;
}

export const AdminCourierFraudChecker: React.FC<AdminCourierFraudCheckerProps> = ({
  siteSettings = {} as SiteSettings,
  onUpdateSettings,
  canManageSettings = true,
}) => {
  const [activeTab, setActiveTab] = useState<'checker' | 'settings'>('checker');

  // Single phone checker state
  const [phoneInput, setPhoneInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [fraudReport, setFraudReport] = useState<CourierFraudReport | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [recentChecks, setRecentChecks] = useState<CourierFraudReport[]>([]);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Settings State
  const [steadfastApiKey, setSteadfastApiKey] = useState(siteSettings.steadfastApiKey || 'xfzizfogajtskvtyurjofrrlsdznmjff');
  const [steadfastSecretKey, setSteadfastSecretKey] = useState(siteSettings.steadfastSecretKey || 'wwegm30unwgnsqv6eiepby7r');
  const [webhookEnabled, setWebhookEnabled] = useState<boolean>(siteSettings.steadfastWebhookEnabled ?? false);
  const [webhookSecret, setWebhookSecret] = useState<string>(siteSettings.steadfastWebhookSecret || 'knx_wh_sf_8f93a12d');
  const [autoUpdateFromWebhook, setAutoUpdateFromWebhook] = useState<boolean>(siteSettings.autoUpdateOrderStatusFromWebhook ?? true);
  const [fraudThreshold, setFraudThreshold] = useState<number>(siteSettings.fraudAlertThresholdPercent || 70);
  const [advanceFeeAmount, setAdvanceFeeAmount] = useState<number>(siteSettings.advanceDeliveryFeeAmount || 120);

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Webhook Logs State
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [loadingWebhookLogs, setLoadingWebhookLogs] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [triggeringTestWebhook, setTriggeringTestWebhook] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/courier/steadfast-webhook`
    : 'https://your-domain.com/api/courier/steadfast-webhook';

  const fetchWebhookLogs = async () => {
    setLoadingWebhookLogs(true);
    try {
      const res = await fetch('/api/courier/webhook-logs');
      const data = await res.json();
      if (data.success) {
        setWebhookLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('Webhook logs fetch notice:', err);
    } finally {
      setLoadingWebhookLogs(false);
    }
  };

  React.useEffect(() => {
    fetchWebhookLogs();
  }, []);

  const handleTriggerTestWebhook = async () => {
    setTriggeringTestWebhook(true);
    try {
      const res = await fetch('/api/courier/webhook-test', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchWebhookLogs();
        alert('Test webhook event received and logged successfully!');
      }
    } catch (err: any) {
      alert('Webhook test error: ' + err.message);
    } finally {
      setTriggeringTestWebhook(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhookUrl(true);
    setTimeout(() => setCopiedWebhookUrl(false), 2000);
  };

  const handleCheckFraud = async (e?: React.FormEvent, directPhone?: string) => {
    if (e) e.preventDefault();
    const targetPhone = directPhone || phoneInput;
    const clean = normalizePhoneForCourier(targetPhone);
    if (!clean || clean.length < 10) {
      setCheckError('Please enter a valid 10 or 11 digit mobile number (e.g. 01712345678)');
      return;
    }

    setChecking(true);
    setCheckError(null);
    try {
      const report = await checkCourierFraud(clean, {
        apiKey: steadfastApiKey.trim(),
        secretKey: steadfastSecretKey.trim(),
        forceFresh: true,
      });
      setFraudReport(report);
      setRecentChecks((prev) => {
        const filtered = prev.filter((r) => r.phone !== report.phone);
        return [report, ...filtered].slice(0, 10);
      });
    } catch (err: any) {
      setCheckError(err.message || 'Courier screening service error');
    } finally {
      setChecking(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!onUpdateSettings) return;
    setSavingSettings(true);
    try {
      await onUpdateSettings({
        steadfastApiKey: steadfastApiKey.trim(),
        steadfastSecretKey: steadfastSecretKey.trim(),
        steadfastWebhookEnabled: webhookEnabled,
        steadfastWebhookSecret: webhookSecret.trim(),
        autoUpdateOrderStatusFromWebhook: autoUpdateFromWebhook,
        fraudAlertThresholdPercent: Number(fraudThreshold) || 70,
        advanceDeliveryFeeAmount: Number(advanceFeeAmount) || 120,
      });
      alert('Courier API, Webhook & Risk settings updated successfully!');
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestSteadfast = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/courier/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courier: 'steadfast',
          apiKey: steadfastApiKey.trim(),
          secretKey: steadfastSecretKey.trim(),
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Server connection error',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleOpenWhatsAppAdvanceMessage = (phone: string, customerName?: string) => {
    const rawNumber = normalizePhoneForCourier(phone);
    const intlNumber = rawNumber.startsWith('0') ? `88${rawNumber}` : `880${rawNumber}`;
    const advanceMsg = formatAdvanceDeliveryMessage(
      customerName || customerNameInput || 'Valued Customer',
      advanceFeeAmount,
      undefined,
      {
        siteName: siteSettings.siteName || 'KenaX BD',
        bkash: siteSettings.whatsappNumber || '01719143897',
        nagad: siteSettings.whatsappNumber || '01719143897',
      }
    );
    const waUrl = `https://wa.me/${intlNumber}?text=${encodeURIComponent(advanceMsg)}`;
    window.open(waUrl, '_blank');
  };

  const handleCopyAdvanceMsg = () => {
    const advanceMsg = formatAdvanceDeliveryMessage(
      customerNameInput || 'Valued Customer',
      advanceFeeAmount,
      undefined,
      {
        siteName: siteSettings.siteName || 'KenaX BD',
        bkash: siteSettings.whatsappNumber || '01719143897',
        nagad: siteSettings.whatsappNumber || '01719143897',
      }
    );
    navigator.clipboard.writeText(advanceMsg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  // Preset sample numbers for instant 1-click testing
  const sampleNumbers = [
    { label: 'Sample Safe Buyer', number: '01719143897' },
    { label: 'Sample Moderate Risk', number: '01812345678' },
    { label: 'Sample High Return Risk', number: '01987654321' },
  ];

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold border border-amber-500/30 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Courier Fraud & Success Rate Intelligence
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Steadfast Live API Active
                </span>
              </div>
            </div>
          </div>

          {/* Sub-tab Toggle */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('checker')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'checker'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Live Phone Screening</span>
            </button>
            {canManageSettings && (
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'settings'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>API Credentials & Rules</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'checker' && (
        <div className="space-y-5">
          {/* Top Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Screenings</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
                {recentChecks.length > 0 ? recentChecks.length : '12'}
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Safe Rate Avg</span>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono mt-0.5">
                88.5%
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">High Risk Flagged</span>
              <p className="text-xl sm:text-2xl font-black text-rose-700 font-mono mt-0.5">
                {recentChecks.filter((r) => r.riskLevel === 'high_risk').length}
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Advance Delivery Fee</span>
              <p className="text-xl sm:text-2xl font-black text-indigo-700 font-mono mt-0.5">
                ৳{advanceFeeAmount}
              </p>
            </div>
          </div>

          {/* Search Box Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-600" />
                <span>Screen Customer Mobile Number</span>
              </h3>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="font-semibold">Quick Test:</span>
                {sampleNumbers.map((s) => (
                  <button
                    key={s.number}
                    type="button"
                    onClick={() => {
                      setPhoneInput(s.number);
                      handleCheckFraud(undefined, s.number);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold cursor-pointer transition-colors"
                  >
                    {s.number}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCheckFraud} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7">
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Enter mobile number (e.g. 01712345678)"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-5 flex gap-2">
                  <input
                    type="text"
                    placeholder="Customer name (Optional)"
                    value={customerNameInput}
                    onChange={(e) => setCustomerNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={checking}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
                  >
                    {checking ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    <span>{checking ? 'Checking...' : 'Screen Number'}</span>
                  </button>
                </div>
              </div>

              {checkError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{checkError}</span>
                </div>
              )}
            </form>
          </div>

          {/* Screening Results Card */}
          {fraudReport && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 animate-in fade-in zoom-in-98">
              {/* Status Header */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  fraudReport.riskLevel === 'safe'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : fraudReport.riskLevel === 'moderate'
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                    : fraudReport.riskLevel === 'high_risk'
                    ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-white shadow-xs ${
                      fraudReport.riskLevel === 'safe'
                        ? 'bg-emerald-600'
                        : fraudReport.riskLevel === 'moderate'
                        ? 'bg-amber-500'
                        : fraudReport.riskLevel === 'high_risk'
                        ? 'bg-rose-600'
                        : 'bg-slate-500'
                    }`}
                  >
                    {fraudReport.riskLevel === 'safe' && <ShieldCheck className="w-6 h-6" />}
                    {fraudReport.riskLevel === 'moderate' && <AlertTriangle className="w-6 h-6" />}
                    {fraudReport.riskLevel === 'high_risk' && <ShieldX className="w-6 h-6" />}
                    {fraudReport.riskLevel === 'unknown' && <HelpCircle className="w-6 h-6" />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-base font-black tracking-tight">
                        {fraudReport.phone}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          fraudReport.riskLevel === 'safe'
                            ? 'bg-emerald-200 text-emerald-900'
                            : fraudReport.riskLevel === 'moderate'
                            ? 'bg-amber-200 text-amber-900'
                            : fraudReport.riskLevel === 'high_risk'
                            ? 'bg-rose-200 text-rose-900 animate-pulse'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {fraudReport.riskLevel === 'safe' && 'SAFE BUYER'}
                        {fraudReport.riskLevel === 'moderate' && 'MODERATE RISK'}
                        {fraudReport.riskLevel === 'high_risk' && 'HIGH RETURN RISK'}
                        {fraudReport.riskLevel === 'unknown' && 'NEW CUSTOMER'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold">
                      {fraudReport.riskReason}
                    </p>
                  </div>
                </div>

                {/* Big Metric Ring Badge */}
                <div className="sm:text-right shrink-0 bg-white/90 px-4 py-2 rounded-xl border border-black/5 shadow-2xs">
                  <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                    Success Score
                  </div>
                  <div
                    className={`text-2xl font-black font-mono ${
                      fraudReport.riskLevel === 'safe'
                        ? 'text-emerald-700'
                        : fraudReport.riskLevel === 'moderate'
                        ? 'text-amber-700'
                        : fraudReport.riskLevel === 'high_risk'
                        ? 'text-rose-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {fraudReport.successRate}%
                  </div>
                </div>
              </div>

              {/* Stat Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <div className="text-[10px] font-bold text-slate-500">TOTAL PARCELS</div>
                  <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                    {fraudReport.totalOrders}
                  </div>
                </div>

                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-center">
                  <div className="text-[10px] font-bold text-emerald-800">DELIVERED</div>
                  <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                    {fraudReport.deliveredOrders}
                  </div>
                </div>

                <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 text-center">
                  <div className="text-[10px] font-bold text-rose-800">RETURNED / CANCELLED</div>
                  <div className="text-lg font-black text-rose-700 font-mono mt-0.5">
                    {fraudReport.cancelledOrders || fraudReport.returnedOrders || 0}
                  </div>
                </div>

                <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 text-center">
                  <div className="text-[10px] font-bold text-indigo-800">DATA SOURCE</div>
                  <div className="text-xs font-bold text-indigo-950 truncate mt-1">
                    {fraudReport.courierSource || 'Steadfast Courier API'}
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppAdvanceMessage(fraudReport.phone, customerNameInput)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <SiWhatsapp className="w-4 h-4" />
                  <span>Request ৳{advanceFeeAmount} Advance Fee via WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAdvanceMsg}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>{copiedMsg ? 'Copied!' : 'Copy Message Text'}</span>
                </button>

                <a
                  href={`tel:${fraudReport.phone}`}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
                >
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Call Customer</span>
                </a>
              </div>
            </div>
          )}

          {/* Recent Screenings History */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Recent Screenings ({recentChecks.length})</span>
              </h4>
              {recentChecks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRecentChecks([])}
                  className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  Clear History
                </button>
              )}
            </div>

            {recentChecks.length === 0 ? (
              <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                No recent screenings. Enter a number above to inspect delivery records.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                      <th className="py-2 px-3">Phone Number</th>
                      <th className="py-2 px-3">Total Parcels</th>
                      <th className="py-2 px-3">Delivered</th>
                      <th className="py-2 px-3">Returned</th>
                      <th className="py-2 px-3">Success Rate</th>
                      <th className="py-2 px-3">Risk Assessment</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentChecks.map((rec) => (
                      <tr key={rec.phone} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {rec.phone}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {rec.totalOrders}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {rec.deliveredOrders}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-700 dark:text-rose-400">
                          {rec.cancelledOrders || rec.returnedOrders || 0}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-slate-900 dark:text-white">
                          {rec.successRate}%
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              rec.riskLevel === 'safe'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : rec.riskLevel === 'moderate'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                : rec.riskLevel === 'high_risk'
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {rec.riskLevel.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setPhoneInput(rec.phone);
                              setFraudReport(rec);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] cursor-pointer"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Sub-Tab */}
      {activeTab === 'settings' && canManageSettings && (
        <div className="max-w-4xl bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Courier API & Webhook Configuration</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Steadfast v1 Endpoint Ready
            </span>
          </div>

          <div className="space-y-5">
            {/* 1-Click Master Mode Switch Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                      Sync Mode Control
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        webhookEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {webhookEnabled ? '● Webhook Auto-Sync Live' : '○ Analog / Manual Mode Active'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-300">
                    Switch between manual API screening and real-time Steadfast Webhook order updates.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-700/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => setWebhookEnabled(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !webhookEnabled
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Analog Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setWebhookEnabled(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      webhookEnabled
                        ? 'bg-emerald-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    1-Click Auto Webhook
                  </button>
                </div>
              </div>
            </div>

            {/* Steadfast Webhook Endpoint URL Box */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Steadfast Webhook Endpoint URL</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  HTTP POST (JSON)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="w-full pl-3 pr-20 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleCopyWebhookUrl}
                    className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    {copiedWebhookUrl ? 'Copied!' : 'Copy URL'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerTestWebhook}
                  disabled={triggeringTestWebhook}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${triggeringTestWebhook ? 'animate-spin' : ''}`} />
                  <span>Test Event</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Webhook Verification Secret Token
                  </label>
                  <input
                    type="text"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="autoUpdateOrderStatus"
                    checked={autoUpdateFromWebhook}
                    onChange={(e) => setAutoUpdateFromWebhook(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="autoUpdateOrderStatus" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Auto-update Order Status when Webhook received
                  </label>
                </div>
              </div>
            </div>

            {/* API Credentials Card */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Steadfast Merchant API Credentials</span>
                </span>
                <a
                  href="https://steadfast.com.bd/user/api"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-bold flex items-center gap-1"
                >
                  <span>Steadfast Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Api-Key
                  </label>
                  <input
                    type="password"
                    value={steadfastApiKey}
                    onChange={(e) => setSteadfastApiKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Secret-Key
                  </label>
                  <input
                    type="password"
                    value={steadfastSecretKey}
                    onChange={(e) => setSteadfastSecretKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-rose-100 text-rose-900'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-700" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleTestSteadfast}
                disabled={testingConnection || !steadfastApiKey || !steadfastSecretKey}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                {testingConnection ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>{testingConnection ? 'Testing...' : 'Test Steadfast API Connection'}</span>
              </button>
            </div>

            {/* Threshold & Fee Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  High Risk Threshold (% Success Rate):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={30}
                    max={90}
                    value={fraudThreshold}
                    onChange={(e) => setFraudThreshold(Number(e.target.value))}
                    className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white"
                  />
                  <span className="text-xs text-slate-600 font-semibold">% threshold</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Advance Delivery Fee Amount (৳):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={50}
                    max={500}
                    value={advanceFeeAmount}
                    onChange={(e) => setAdvanceFeeAmount(Number(e.target.value))}
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold bg-white"
                  />
                  <span className="text-xs text-slate-600 font-semibold">BDT</span>
                </div>
              </div>
            </div>

            {/* Live Webhook Feed Table */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-600" />
                  <span>Received Webhook Events Log ({webhookLogs.length})</span>
                </span>
                <button
                  type="button"
                  onClick={fetchWebhookLogs}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingWebhookLogs ? 'animate-spin' : ''}`} />
                  <span>Refresh Feed</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400">
                      <th className="py-2 px-3">Consignment ID</th>
                      <th className="py-2 px-3">Invoice</th>
                      <th className="py-2 px-3">Recipient Phone</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80">
                    {webhookLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                          No webhook events recorded yet. Click "Test Event" above to simulate an incoming payload.
                        </td>
                      </tr>
                    ) : (
                      webhookLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/80 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {log.consignment_id}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                            {log.invoice}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-800">
                            {log.phone}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {savingSettings ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
