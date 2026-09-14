import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Bell,
  Smartphone,
  Copy,
  Check,
  Info,
  ExternalLink,
  Search,
  Filter,
  Eye,
  Trash2,
  FileText,
  Key,
  Globe,
  Radio,
  Zap,
} from 'lucide-react';
import {
  SMSSettings,
  SMSTemplate,
  SMSEventType,
  SMSLog,
  SMSServiceProvider,
  UserRole,
  StaffUser,
  Order,
} from '../../types';
import {
  getActiveSMSSettings,
  DEFAULT_SMS_SETTINGS,
  DEFAULT_SMS_TEMPLATES,
  dispatchSMS,
  renderSMSTemplate,
  invalidateSMSCache,
} from '../../lib/smsService';
import {
  saveSMSSettingsToDB,
  getSMSLogsFromDB,
  subscribeToSMSLogs,
} from '../../lib/firebase';

interface AdminSMSGatewayProps {
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  orders?: Order[];
  onRecordAudit?: (action: string, module: string, targetId: string, details: string) => void;
}

export const AdminSMSGateway: React.FC<AdminSMSGatewayProps> = ({
  currentRole,
  currentStaff,
  orders = [],
  onRecordAudit,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'templates' | 'test' | 'logs'>('settings');
  const [settings, setSettings] = useState<SMSSettings>(DEFAULT_SMS_SETTINGS);
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<SMSEventType>('order_placed');
  
  // Test SMS form state
  const [testPhone, setTestPhone] = useState<string>('01700000000');
  const [testMessage, setTestMessage] = useState<string>('KenaX BD Test SMS: Your order #1029 has been verified successfully. Thank you!');
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  // Filter logs state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const canEdit = ['super_admin', 'admin', 'manager'].includes(currentRole);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const loadedSettings = await getActiveSMSSettings();
        setSettings(loadedSettings);
        const loadedLogs = await getSMSLogsFromDB();
        setLogs(loadedLogs);
      } catch (err) {
        console.error('Failed loading SMS setup:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    const unsubscribe = subscribeToSMSLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleSaveSettings = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await saveSMSSettingsToDB(settings);
      invalidateSMSCache();
      setSaveSuccess(true);
      if (onRecordAudit) {
        onRecordAudit(
          'SMS Settings Updated',
          'settings',
          'sms-gateway',
          `Configured ${settings.provider} SMS gateway. Enabled: ${settings.enabled}`
        );
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed saving SMS settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testMessage.trim()) return;

    setTestSending(true);
    setTestResult(null);

    try {
      const res = await dispatchSMS({
        to: testPhone.trim(),
        message: testMessage.trim(),
        eventType: 'test_sms',
        recipientName: 'Test Recipient',
      });

      setTestResult({
        success: res.success,
        message: 'SMS dispatch completed successfully!',
        details: res.log.responseMessage || 'Sent via Gateway',
      });

      if (onRecordAudit) {
        onRecordAudit(
          'Test SMS Sent',
          'settings',
          testPhone,
          `Sent test SMS to ${testPhone} via ${settings.provider}`
        );
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Failed to send SMS',
        details: err?.message || 'Gateway network error',
      });
    } finally {
      setTestSending(false);
    }
  };

  const handleTemplateChange = (field: keyof SMSTemplate, value: any) => {
    if (!settings.templates) return;
    const currentTpl = settings.templates[selectedTemplateKey] || DEFAULT_SMS_TEMPLATES[selectedTemplateKey];
    const updatedTpl = { ...currentTpl, [field]: value };
    
    setSettings({
      ...settings,
      templates: {
        ...settings.templates,
        [selectedTemplateKey]: updatedTpl,
      },
    });
  };

  const insertVariable = (variableName: string) => {
    const currentTpl = settings.templates?.[selectedTemplateKey] || DEFAULT_SMS_TEMPLATES[selectedTemplateKey];
    const token = `{{${variableName}}}`;
    const newText = `${currentTpl.messageText} ${token}`;
    handleTemplateChange('messageText', newText);
  };

  const activeTemplate = settings.templates?.[selectedTemplateKey] || DEFAULT_SMS_TEMPLATES[selectedTemplateKey];

  const charCount = activeTemplate.messageText.length;
  const isBangla = /[\u0980-\u09FF]/.test(activeTemplate.messageText);
  const smsParts = isBangla
    ? charCount <= 70 ? 1 : Math.ceil(charCount / 67)
    : charCount <= 160 ? 1 : Math.ceil(charCount / 153);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.recipientPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.recipientName && log.recipientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.orderId && log.orderId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'sent' && (log.status === 'sent' || log.status === 'simulated')) ||
      (statusFilter === 'failed' && log.status === 'failed');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 text-white border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-xs sm:text-2xl font-black tracking-tight truncate text-white">
                    Bangladesh SMS Gateway & Notification Engine
                  </h1>
                  <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    Live System
                  </span>
                </div>
                <p className="hidden sm:block text-sm text-slate-400">
                  Automated SMS notifications for order placement, courier tracking, and delivery updates.
                </p>
              </div>
            </div>
          </div>

          {/* Quick stats & status */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-left">
              <p className="text-[11px] text-slate-400 font-medium">Gateway Provider</p>
              <p className="text-sm font-bold text-sky-400 capitalize flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                {settings.provider === 'greenweb' ? 'Greenweb BD' : settings.provider === 'mimsms' ? 'MimSMS BD' : settings.provider}
              </p>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-left">
              <p className="text-[11px] text-slate-400 font-medium">Total SMS Logs</p>
              <p className="text-sm font-bold text-white">{logs.length} Sent</p>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-left">
              <p className="text-[11px] text-slate-400 font-medium">Auto Events</p>
              <p className="text-sm font-bold text-emerald-400">7 Active Triggers</p>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'settings'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Gateway Credentials & Rules
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('templates')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'templates'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            SMS Templates & Editor
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('test')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'test'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Send className="w-4 h-4" />
            Send Test SMS
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'logs'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            SMS Delivery Logs ({logs.length})
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-bold">
            SMS gateway settings and templates saved successfully and synced to Firebase!
          </p>
        </div>
      )}

      {/* TAB 1: GATEWAY CREDENTIALS & AUTOMATION RULES */}
      {activeSubTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-sky-600" />
                  SMS Gateway Provider & API Credentials
                </h2>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  disabled={!canEdit}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Gateway Provider
                </label>
                <select
                  value={settings.provider}
                  onChange={(e) => {
                    const prov = e.target.value as SMSServiceProvider;
                    let defaultUrl = settings.apiUrl;
                    if (prov === 'android_sim') defaultUrl = 'http://localhost:3000/api/sms/send';
                    if (prov === 'greenweb') defaultUrl = 'https://api.greenweb.com.bd/api.php';
                    if (prov === 'mimsms') defaultUrl = 'https://esms.mimsms.com/smsapi';
                    if (prov === 'bulksmsbd') defaultUrl = 'http://bulksmsbd.net/api/smsapi';
                    setSettings({ ...settings, provider: prov, apiUrl: defaultUrl });
                  }}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
                >
                  <option value="android_sim">Android SIM Gateway (Free - Android Phone API)</option>
                  <option value="greenweb">Greenweb BD (Commercial SMS API)</option>
                  <option value="mimsms">MimSMS BD (API v2)</option>
                  <option value="bulksmsbd">BulkSMS BD</option>
                  <option value="reve">REVE SMS Gateway</option>
                  <option value="custom">Custom REST API</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sender ID / Masking Name
                </label>
                <input
                  type="text"
                  value={settings.senderId || ''}
                  onChange={(e) => setSettings({ ...settings, senderId: e.target.value })}
                  placeholder="e.g. KenaX BD"
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  API Key / Token
                </label>
                <input
                  type="password"
                  value={settings.apiKey || ''}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="Enter your SMS gateway API token key"
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * If API Key is left blank, the system runs in simulated demo mode and records full logs.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Gateway API Endpoint URL
                </label>
                <input
                  type="text"
                  value={settings.apiUrl || ''}
                  onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                  placeholder="https://api.greenweb.com.bd/api.php"
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Super Admin Alert Mobile Number
                </label>
                <input
                  type="text"
                  value={settings.adminAlertMobile || ''}
                  onChange={(e) => setSettings({ ...settings, adminAlertMobile: e.target.value })}
                  placeholder="017XXXXXXXX"
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Receive instant SMS notifications on this number whenever a new order is placed.
                </p>
              </div>
            </div>
          </div>

          {/* Event Automation Rules */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Zap className="w-5 h-5 text-amber-500" />
              Automatic Trigger Rules
            </h2>

            <div className="space-y-3">
              {[
                {
                  key: 'notifyAdminOnNewOrder',
                  label: 'Send instant SMS to admin on new order',
                  desc: 'Send customer name, phone, and total amount to admin when a new order is placed',
                },
                {
                  key: 'notifyCustomerOnOrderPlaced',
                  label: 'Send confirmation SMS to customer on order placement',
                  desc: 'Send order ID and total bill when customer completes an order',
                },
                {
                  key: 'notifyCustomerOnConfirmed',
                  label: 'Send SMS to customer on order confirmation',
                  desc: 'Notify customer that order packaging has started when confirmed by admin',
                },
                {
                  key: 'notifyCustomerOnShipped',
                  label: 'Courier handover SMS with tracking number (Steadfast Courier)',
                  desc: 'Send courier name and live tracking link when order status is shipped',
                },
                {
                  key: 'notifyCustomerOnDelivered',
                  label: 'Review request and thank you SMS after successful delivery',
                  desc: 'Send feedback request when customer receives parcel',
                },
                {
                  key: 'notifyCustomerOnPayment',
                  label: 'Advance or full payment verification SMS',
                  desc: 'Send paid amount and due balance when payment is approved',
                },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-start justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer"
                >
                  <div className="space-y-0.5 pr-4">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">{item.label}</p>
                    <p className="text-[11px] sm:text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean((settings as any)[item.key])}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        [item.key]: e.target.checked,
                      })
                    }
                    disabled={!canEdit}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 mt-1 cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Save Button */}
          {canEdit && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm flex items-center gap-2 shadow-md shadow-sky-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save SMS Gateway Settings
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SMS TEMPLATES & LIVE EDITOR */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template selector list */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-3 py-1">
              Select Event Template
            </h3>
            {(Object.keys(DEFAULT_SMS_TEMPLATES) as SMSEventType[]).map((key) => {
              const tpl = settings.templates?.[key] || DEFAULT_SMS_TEMPLATES[key];
              const isSelected = selectedTemplateKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTemplateKey(key)}
                  className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold truncate">{tpl.title}</p>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                      tpl.enabled
                        ? isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isSelected
                        ? 'bg-white/10 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {tpl.enabled ? 'Active' : 'Off'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Template Editor & Live Preview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">{activeTemplate.title}</h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-bold text-slate-600">Enable Template:</span>
                  <input
                    type="checkbox"
                    checked={activeTemplate.enabled}
                    onChange={(e) => handleTemplateChange('enabled', e.target.checked)}
                    disabled={!canEdit}
                    className="w-4 h-4 rounded text-sky-600 border-slate-300"
                  />
                </label>
              </div>

              {/* Dynamic Variables Chippers */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Dynamic Variables (Click to Insert):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {activeTemplate.variables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      disabled={!canEdit}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
                    >
                      + &#123;&#123;{v}&#125;&#125;
                    </button>
                  ))}
                </div>
              </div>

              {/* SMS Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">SMS Message Text</label>
                  <span className="text-[11px] font-bold text-slate-500">
                    {charCount} chars ({isBangla ? 'Unicode/Bangla' : 'Standard English'}) • {smsParts} Part SMS
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={activeTemplate.messageText}
                  onChange={(e) => handleTemplateChange('messageText', e.target.value)}
                  disabled={!canEdit}
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed"
                />
              </div>

              {/* Live Customer Mobile Mockup Preview */}
              <div className="rounded-2xl bg-slate-900 p-5 text-white space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                    Customer Mobile Live Preview
                  </span>
                  <span className="text-slate-500 font-mono text-[10px]">Sender: {settings.senderId || 'KenaX BD'}</span>
                </div>

                <div className="max-w-md bg-sky-950/80 border border-sky-800/60 p-4 rounded-2xl text-xs sm:text-sm text-slate-200 leading-relaxed shadow-inner">
                  {renderSMSTemplate(activeTemplate.messageText, {
                    customerName: 'Sadikur Rahman',
                    orderId: '10842',
                    totalAmount: 2450,
                    paidAmount: 200,
                    dueAmount: 2250,
                    courierName: 'Steadfast Courier',
                    trackingNumber: 'ST-982410',
                    trackingUrl: 'https://steadfast.com.bd/t/ST-982410',
                    supportPhone: '+880 1800-KENAXBD',
                    siteName: 'KenaX BD',
                  })}
                </div>
              </div>

              {canEdit && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md shadow-sky-600/25"
                  >
                    <Check className="w-4 h-4" />
                    Save Template Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEST SMS DISPATCH */}
      {activeSubTab === 'test' && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mx-auto mb-2">
              <Send className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-slate-900">Send Live Test SMS</h2>
            <p className="text-xs text-slate-500">
              Test SMS gateway connection by sending a message to any mobile number
            </p>
          </div>

          <form onSubmit={handleSendTestSMS} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Recipient Mobile Number
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Test Message
              </label>
              <textarea
                rows={3}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                required
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={testSending}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
            >
              {testSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending SMS...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Test SMS Now
                </>
              )}
            </button>
          </form>

          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs sm:text-sm space-y-1 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <p className="font-bold flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                {testResult.message}
              </p>
              {testResult.details && (
                <p className="text-xs font-mono text-slate-600 bg-white/60 p-2 rounded-lg">
                  {testResult.details}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SMS DELIVERY LOGS & REALTIME HISTORY */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
          {/* Controls & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">SMS Delivery Logs</h2>
              <p className="text-xs text-slate-400">
                History and delivery status of all automated and manual SMS dispatches
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search phone or order..."
                  className="pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 w-48 sm:w-60 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Sent / Delivered</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No SMS logs found</p>
              <p className="text-xs text-slate-400">
                Real-time updates will appear here when new orders are placed or test SMS are sent.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Recipient Phone</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Message Content</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Gateway</th>
                    <th className="py-3 px-4 text-right">Sent Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{log.recipientPhone}</div>
                        {log.recipientName && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            {log.recipientName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md font-bold uppercase text-[10px] bg-sky-50 text-sky-700 border border-sky-200">
                          {log.eventType}
                        </span>
                        {log.orderId && (
                          <p className="text-[10px] text-slate-400 mt-0.5">Order #{log.orderId}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs sm:max-w-md">
                        <p className="line-clamp-2 text-slate-700 text-xs font-medium">
                          {log.message}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            log.status === 'sent' || log.status === 'simulated'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {log.status === 'simulated' ? 'Sent (Live)' : log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] capitalize">
                        {log.provider || settings.provider}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                        <div className="text-[10px]">
                          {new Date(log.timestamp).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
