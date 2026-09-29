import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  History,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertTriangle,
  Eye,
  RefreshCw,
  Search,
  Code,
  Smartphone,
  Monitor,
  RotateCcw,
  Sparkles,
  Shield,
  User,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  X,
  Sliders,
  FileText,
  Copy,
  Layers,
} from 'lucide-react';
import {
  EmailLog,
  EmailTemplate,
  EmailTemplateType,
  GmailAlertSettings,
  UserRole,
  StaffUser,
  Order,
  CustomerRecord,
} from '../../types';
import {
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_GMAIL_SETTINGS,
  getActiveEmailTemplates,
  getActiveGmailSettings,
  renderEmailTemplate,
  generateEmailHtml,
  dispatchEmail,
  invalidateEmailCache,
} from '../../lib/emailService';
import {
  getEmailLogsFromDB,
  saveEmailTemplatesToDB,
  saveGmailAlertSettingsToDB,
  subscribeToEmailLogs,
} from '../../lib/firebase';

interface AdminGmailAlertsProps {
  currentRole: UserRole;
  currentStaff?: StaffUser | null;
  orders: Order[];
  customers: CustomerRecord[];
}

export const AdminGmailAlerts: React.FC<AdminGmailAlertsProps> = ({
  currentRole,
  currentStaff,
  orders,
  customers,
}) => {
  // Main Navigation Tabs
  const [activeTab, setActiveTab] = useState<'templates' | 'logs' | 'settings'>('templates');

  // Templates state
  const [templates, setTemplates] = useState<Record<EmailTemplateType, EmailTemplate>>(DEFAULT_EMAIL_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<EmailTemplateType>('user_welcome');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate>(DEFAULT_EMAIL_TEMPLATES.user_welcome);
  const [templateFilterCategory, setTemplateFilterCategory] = useState<'all' | 'user' | 'staff' | 'super_admin'>('all');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // Active focused field for visual insertion
  const [lastFocusedField, setLastFocusedField] = useState<
    'subject' | 'headline' | 'bodyMessage' | 'highlightNote' | 'buttonText' | 'buttonUrl' | 'footerNote'
  >('bodyMessage');

  // Test Email State
  const [testEmailAddress, setTestEmailAddress] = useState('sadikrtx3060@gmail.com');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  // Gmail SMTP Settings State
  const [settings, setSettings] = useState<GmailAlertSettings>(DEFAULT_GMAIL_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);

  // Email Logs State
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilterRole, setLogFilterRole] = useState<string>('all');
  const [logFilterType, setLogFilterType] = useState<string>('all');
  const [logFilterStatus, setLogFilterStatus] = useState<string>('all');
  const [selectedLogForModal, setSelectedLogForModal] = useState<EmailLog | null>(null);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // Load initial templates, settings and logs
  useEffect(() => {
    async function loadData() {
      const loadedTemplates = await getActiveEmailTemplates();
      setTemplates(loadedTemplates);
      setEditingTemplate(loadedTemplates[selectedTemplateId] || DEFAULT_EMAIL_TEMPLATES[selectedTemplateId]);

      const loadedSettings = await getActiveGmailSettings();
      setSettings(loadedSettings);

      const loadedLogs = await getEmailLogsFromDB();
      setLogs(loadedLogs);
    }
    loadData();

    // Subscribe to real-time email logs
    const unsubscribe = subscribeToEmailLogs((freshLogs) => {
      setLogs(freshLogs);
    });

    return () => unsubscribe();
  }, []);

  // When selected template changes, update the editing draft
  useEffect(() => {
    if (templates[selectedTemplateId]) {
      setEditingTemplate({ ...templates[selectedTemplateId] });
      setTemplateSaveSuccess(false);
    }
  }, [selectedTemplateId, templates]);

  // Update a visual text field and automatically synchronize htmlContent
  const updateVisualField = (
    field: 'subject' | 'headline' | 'bodyMessage' | 'highlightNote' | 'buttonText' | 'buttonUrl' | 'footerNote',
    value: string
  ) => {
    const updated: EmailTemplate = {
      ...editingTemplate,
      [field]: value,
    };
    // Re-generate HTML content from the new structured fields
    updated.htmlContent = generateEmailHtml(updated);
    setEditingTemplate(updated);
  };

  // Insert variable into active field
  const handleInsertVariable = (variable: string) => {
    const tag = `{{${variable}}}`;
    const currentVal = (editingTemplate[lastFocusedField] as string) || '';
    const newVal = currentVal ? `${currentVal} ${tag}` : tag;
    updateVisualField(lastFocusedField, newVal);

    // Trigger copy feedback
    setCopiedVariable(tag);
    setTimeout(() => setCopiedVariable(null), 2500);
  };

  // Handle Save Template
  const handleSaveTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      const updated = {
        ...templates,
        [editingTemplate.id]: editingTemplate,
      };
      setTemplates(updated);
      await saveEmailTemplatesToDB(updated);
      invalidateEmailCache();
      setTemplateSaveSuccess(true);
      setTimeout(() => setTemplateSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save template:', err);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Handle Reset to Default Template
  const handleResetTemplate = () => {
    const defaultTpl = DEFAULT_EMAIL_TEMPLATES[selectedTemplateId];
    if (defaultTpl) {
      setEditingTemplate({ ...defaultTpl });
    }
  };

  // Handle Send Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setTestEmailResult({ status: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setIsSendingTest(true);
    setTestEmailResult(null);

    try {
      const res = await dispatchEmail({
        type: editingTemplate.id,
        to: testEmailAddress,
        recipientRole:
          editingTemplate.category === 'super_admin'
            ? 'Super Admin'
            : editingTemplate.category === 'staff'
            ? 'Admin'
            : 'Customer',
        data: editingTemplate.sampleData,
        actorName: currentStaff?.name || 'Admin Tester',
        actorRole: currentRole,
        orderId: editingTemplate.sampleData?.orderId || 'TEST-998',
        isTest: true,
      });

      if (res.success) {
        setTestEmailResult({
          status: 'success',
          message: `Email successfully dispatched (${res.log.status}) to ${testEmailAddress}! Saved to activity logs.`,
        });
      } else {
        setTestEmailResult({
          status: 'error',
          message: res.log.error || 'Failed to dispatch email.',
        });
      }
    } catch (err: any) {
      setTestEmailResult({
        status: 'error',
        message: err?.message || 'Server communication failed.',
      });
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setTestEmailResult(null), 6000);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await saveGmailAlertSettingsToDB(settings);
      invalidateEmailCache();
      setSettingsSaveSuccess(true);
      setTimeout(() => setSettingsSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle Refresh Logs
  const handleRefreshLogs = async () => {
    setIsRefreshingLogs(true);
    const fresh = await getEmailLogsFromDB();
    setLogs(fresh);
    setTimeout(() => setIsRefreshingLogs(false), 400);
  };

  // Render live preview for currently edited template
  const previewRender = renderEmailTemplate(editingTemplate, editingTemplate.sampleData);
  const previewHtmlForBrowser = useMemo(() => {
    return previewRender.html || '';
  }, [previewRender.html]);

  // Filtered Templates List
  const filteredTemplateList: EmailTemplate[] = (Object.values(templates) as EmailTemplate[]).filter((tpl) => {
    if (templateFilterCategory === 'all') return true;
    return tpl.category === templateFilterCategory;
  });

  // Filtered Logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchQuery === '' ||
      log.to?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.orderId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      logFilterRole === 'all' ||
      log.recipientRole?.toLowerCase() === logFilterRole.toLowerCase();

    const matchesType = logFilterType === 'all' || log.type === logFilterType;

    const matchesStatus =
      logFilterStatus === 'all' ||
      log.status?.toLowerCase() === logFilterStatus.toLowerCase();

    return matchesSearch && matchesRole && matchesType && matchesStatus;
  });

  return (
    <div id="admin-gmail-alerts-hub" className="space-y-6">
      {/* Header Banner - Fully Responsive */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="p-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">
                <Mail className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 bg-red-950/60 px-2.5 py-1 rounded border border-red-800/40">
                Gmail &amp; SMTP Hub
              </span>
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Engine Active
              </span>
            </div>
            
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-100">
              Gmail Alerts &amp; Template Manager
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-slate-800/90 border border-slate-700/80 px-4 py-2.5 rounded-xl text-left sm:text-right shadow-sm">
              <span className="text-[10px] text-slate-400 block font-mono uppercase tracking-wider">
                Super Admin Target
              </span>
              <span className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1.5 justify-start sm:justify-end mt-0.5">
                <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {settings.superAdminEmail || 'sadikrtx3060@gmail.com'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar - Touch Friendly & Responsive */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            id="tab-btn-templates"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'templates'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Templates &amp; Messages
            <span className="text-[11px] px-2 py-0.5 bg-black/30 rounded-full font-mono">10</span>
          </button>

          <button
            type="button"
            id="tab-btn-logs"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'logs'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Activity Logs
            {logs.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 bg-black/30 rounded-full font-mono">
                {logs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-btn-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'settings'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            SMTP &amp; Notifications
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: TEMPLATE EDITOR & LIVE PREVIEW */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Mobile Template Selector (Visible on Mobile & Tablet < lg) */}
          <div className="block lg:hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-red-600" />
                Select Email to Edit
              </label>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                {filteredTemplateList.length} templates
              </span>
            </div>

            {/* Mobile Dropdown */}
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value as EmailTemplateType)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {filteredTemplateList.map((tpl) => (
                <option key={tpl.id} value={tpl.id} className="dark:bg-slate-800 dark:text-white">
                  {tpl.category === 'super_admin' ? '👑 ' : tpl.category === 'staff' ? '👥 ' : '🛍️ '}
                  {tpl.title}
                </option>
              ))}
            </select>

            {/* Category Quick Chips for Mobile */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {(['all', 'user', 'staff', 'super_admin'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTemplateFilterCategory(cat)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all ${
                    templateFilterCategory === cat
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat === 'all'
                    ? 'All'
                    : cat === 'user'
                    ? 'Customers'
                    : cat === 'staff'
                    ? 'Staff'
                    : 'Super'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Template Selection List (Hidden on mobile, visible on Desktop >= lg) */}
            <div className="hidden lg:block lg:col-span-4 space-y-4">
              {/* Category Filter */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <button
                    type="button"
                    onClick={() => setTemplateFilterCategory('all')}
                    className={`py-1.5 rounded-lg text-center transition-all ${
                      templateFilterCategory === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold'
                        : 'hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateFilterCategory('user')}
                    className={`py-1.5 rounded-lg text-center transition-all ${
                      templateFilterCategory === 'user'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold'
                        : 'hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Customers
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateFilterCategory('staff')}
                    className={`py-1.5 rounded-lg text-center transition-all ${
                      templateFilterCategory === 'staff'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold'
                        : 'hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateFilterCategory('super_admin')}
                    className={`py-1.5 rounded-lg text-center transition-all ${
                      templateFilterCategory === 'super_admin'
                        ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm font-bold'
                        : 'hover:text-purple-700 dark:hover:text-purple-300'
                    }`}
                  >
                    Super
                  </button>
                </div>
              </div>

              {/* Template Card Items */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[620px] overflow-y-auto">
                {filteredTemplateList.map((tpl) => {
                  const isSelected = tpl.id === selectedTemplateId;
                  const isSuperAdmin = tpl.category === 'super_admin';
                  const isStaff = tpl.category === 'staff';

                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`w-full text-left p-3.5 transition-all relative flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-red-50/90 dark:bg-red-950/40 border-l-4 border-red-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isSuperAdmin
                              ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : isStaff
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {isSuperAdmin
                            ? '👑 Super Admin'
                            : isStaff
                            ? '👥 Staff Alert'
                            : '🛍️ Customer'}
                        </span>

                        <span
                          className={`text-[11px] font-semibold flex items-center gap-1 ${
                            tpl.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {tpl.enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {tpl.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {tpl.title}
                      </h4>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 font-mono">
                        {tpl.subject}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Test Send Box on Desktop */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700 shadow-md space-y-3">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-red-400" />
                  <h3 className="text-sm font-bold text-slate-200">Send Live Test Email</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Test this edited template in your actual inbox using sample dynamic data.
                </p>

                <div className="space-y-2.5">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="Recipient email..."
                    className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />

                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    {isSendingTest ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {isSendingTest ? 'Dispatching...' : 'Send Test Email Now'}
                  </button>

                  {testEmailResult && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                        testEmailResult.status === 'success'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {testEmailResult.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <span>{testEmailResult.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Template Editor & Live Preview */}
            <div className="lg:col-span-8 space-y-6">
              {/* Editor Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-5">
                {/* Template Title & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                        {editingTemplate.title}
                      </h2>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {editingTemplate.id}
                      </span>
                    </div>
                    {editingTemplate.description ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{editingTemplate.description}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={editingTemplate.enabled}
                        onChange={(e) =>
                          setEditingTemplate({ ...editingTemplate, enabled: e.target.checked })
                        }
                        className="rounded text-red-600 focus:ring-red-500"
                      />
                      Active
                    </label>

                    <button
                      type="button"
                      onClick={handleResetTemplate}
                      title="Reset this template to original default"
                      className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSavingTemplate ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      {isSavingTemplate ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>

                {/* Save Feedback Banner */}
                {templateSaveSuccess && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Email template updated and saved successfully! Changes are live across all notifications.</span>
                  </div>
                )}

                {/* Dynamic Variables Pill Bar */}
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Insert Dynamic Variables (Click to add):
                    </span>
                    {copiedVariable && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded animate-pulse">
                        Added {copiedVariable}!
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {editingTemplate.variables.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => handleInsertVariable(variable)}
                        className="text-[11px] font-mono bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-200 transition-all shadow-2xs active:scale-95"
                      >
                        {`{{${variable}}}`}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Clicking a tag inserts it into your currently focused message field.
                  </p>
                </div>

                {/* Visual Message & Content Editor */}
                <div className="space-y-4">
                    {/* Subject Line */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Email Subject Line
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.subject}
                        onFocus={() => setLastFocusedField('subject')}
                        onChange={(e) => updateVisualField('subject', e.target.value)}
                        placeholder="Enter email subject line..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-red-500 font-medium transition-colors"
                      />
                    </div>

                    {/* Headline / Greeting */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Greeting / Main Headline
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.headline || ''}
                        onFocus={() => setLastFocusedField('headline')}
                        onChange={(e) => updateVisualField('headline', e.target.value)}
                        placeholder="e.g. Hello, {{customerName}}! 👋"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-red-500 font-medium transition-colors"
                      />
                    </div>

                    {/* Main Message Body Text */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Main Message / Body Text
                        </label>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          Primary message content sent to recipient
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={editingTemplate.bodyMessage || ''}
                        onFocus={() => setLastFocusedField('bodyMessage')}
                        onChange={(e) => updateVisualField('bodyMessage', e.target.value)}
                        placeholder="Type the message here that you want the customer or admin to read..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-red-500 leading-relaxed transition-colors"
                      />
                    </div>

                    {/* Highlight Note Banner */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Highlight / Callout Box Note
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.highlightNote || ''}
                        onFocus={() => setLastFocusedField('highlightNote')}
                        onChange={(e) => updateVisualField('highlightNote', e.target.value)}
                        placeholder="e.g. ⚡ Special Privilege: Enjoy express doorstep delivery..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-red-500 font-medium transition-colors"
                      />
                    </div>

                    {/* Action Button Label & Link */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                          Action Button Label
                        </label>
                        <input
                          type="text"
                          value={editingTemplate.buttonText || ''}
                          onFocus={() => setLastFocusedField('buttonText')}
                          onChange={(e) => updateVisualField('buttonText', e.target.value)}
                          placeholder="e.g. Start Shopping Now"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-red-500 font-medium transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                          Action Button URL / Variable
                        </label>
                        <input
                          type="text"
                          value={editingTemplate.buttonUrl || ''}
                          onFocus={() => setLastFocusedField('buttonUrl')}
                          onChange={(e) => updateVisualField('buttonUrl', e.target.value)}
                          placeholder="e.g. {{loginUrl}} or {{orderUrl}}"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-red-500 font-medium transition-colors"
                        />
                      </div>
                    </div>

                    {/* Footer Support Note */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        Footer &amp; Support Assistance Note
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.footerNote || ''}
                        onFocus={() => setLastFocusedField('footerNote')}
                        onChange={(e) => updateVisualField('footerNote', e.target.value)}
                        placeholder="e.g. Need assistance? Reach our dedicated support desk at {{supportPhone}}..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-red-500 font-medium transition-colors"
                      />
                    </div>
                  </div>

                {/* Mobile Test Send Box (Visible on mobile/tablet < lg) */}
                <div className="block lg:hidden pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-red-400" />
                      <h4 className="text-xs font-bold text-slate-200">Send Live Test Email</h4>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        placeholder="Recipient email..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={handleSendTestEmail}
                        disabled={isSendingTest}
                        className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        {isSendingTest ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        {isSendingTest ? 'Sending...' : 'Test Now'}
                      </button>
                    </div>

                    {testEmailResult && (
                      <div
                        className={`p-2 rounded-lg text-xs ${
                          testEmailResult.status === 'success'
                            ? 'bg-emerald-950/80 text-emerald-300'
                            : 'bg-rose-950/80 text-rose-300'
                        }`}
                      >
                        {testEmailResult.message}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Responsive Preview Pane */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-red-600" />
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Live Email Preview (Inbox View)
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        previewDevice === 'desktop'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                      Desktop (600px)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        previewDevice === 'mobile'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Mobile (380px)
                    </button>
                  </div>
                </div>

                {/* Subject Preview Bar */}
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 sm:p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1">
                    <span className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] block">
                      Inbox Subject Preview
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">
                      {previewRender.subject}
                    </span>
                  </div>
                  <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] block font-mono">Sender:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                      {settings.senderName || 'KenaX BD'} &lt;{settings.senderEmail || 'support@kenaxbd.com'}&gt;
                    </span>
                  </div>
                </div>

                {/* Sandboxed Iframe Preview (with realistic phone border in mobile mode) */}
                <div className="bg-slate-950 p-4 sm:p-6 rounded-2xl flex justify-center overflow-x-auto min-h-[440px] shadow-inner">
                  {previewDevice === 'mobile' ? (
                    <div className="w-[380px] max-w-full bg-slate-900 p-3 rounded-[36px] shadow-2xl border-4 border-slate-700 flex flex-col items-center">
                      {/* Phone Speaker Notch */}
                      <div className="w-24 h-4 bg-black rounded-full mb-3 shrink-0" />
                      <div className="w-full bg-white rounded-[24px] overflow-hidden">
                        <iframe
                          title="Live Mobile Email Preview"
                          srcDoc={previewHtmlForBrowser}
                          className="w-full h-[540px] border-0"
                          sandbox="allow-same-origin"
                        />
                      </div>
                      <div className="w-32 h-1 bg-slate-600 rounded-full mt-3 shrink-0" />
                    </div>
                  ) : (
                    <div className="w-full max-w-[640px] bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-800">
                      <iframe
                        title="Live Desktop Email Preview"
                        srcDoc={previewHtmlForBrowser}
                        className="w-full h-[560px] border-0"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: SENT ACTIVITY LOGS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email, subject, order ID..."
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Role filter */}
              <select
                value={logFilterRole}
                onChange={(e) => setLogFilterRole(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-red-500"
              >
                <option value="all">Role (All)</option>
                <option value="Customer">Customer</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Admin">Staff / Admin</option>
              </select>

              {/* Status filter */}
              <select
                value={logFilterStatus}
                onChange={(e) => setLogFilterStatus(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-700 bg-white focus:outline-none focus:border-red-500"
              >
                <option value="all">Status (All)</option>
                <option value="Delivered">Delivered</option>
                <option value="Sent">Sent</option>
                <option value="Simulated">Simulated</option>
                <option value="Failed">Failed</option>
              </select>

              <button
                type="button"
                onClick={handleRefreshLogs}
                disabled={isRefreshingLogs}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Mobile Logs Card View (Shown on mobile < md) */}
          <div className="block md:hidden space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
                <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No activity logs found</p>
                <p className="text-xs text-slate-400 mt-1">Dispatched emails will appear here.</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const dateStr = new Date(log.timestamp).toLocaleString('en-US', {
                  timeZone: 'Asia/Dhaka',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">{dateStr}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'Sent'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-slate-900 text-xs font-mono break-all">
                        {log.to}
                      </div>
                      <div className="text-xs font-medium text-slate-700 mt-0.5 line-clamp-1">
                        {log.subject}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                        {log.recipientRole}
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedLogForModal(log)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Logs Table (Shown on screens >= md) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Recipient &amp; Role</th>
                    <th className="py-3.5 px-4">Subject &amp; Template</th>
                    <th className="py-3.5 px-4">Triggered By</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No email dispatch activity found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Records will automatically appear here when customer registration, cart updates, or test emails are dispatched.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const dateStr = new Date(log.timestamp).toLocaleString('en-US', {
                        timeZone: 'Asia/Dhaka',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      });

                      const isSuperAdminRecipient = log.recipientRole === 'Super Admin';
                      const isCustomerRecipient = log.recipientRole === 'Customer';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-all">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="text-slate-500 font-mono text-[11px] block">
                              {dateStr}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ID: {log.id.slice(0, 14)}...
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 font-mono">
                              {log.to}
                            </div>
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 ${
                                isSuperAdminRecipient
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                  : isCustomerRecipient
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {log.recipientRole || 'Recipient'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-medium text-slate-900 line-clamp-1">
                              {log.subject}
                            </div>
                            <span className="text-[11px] text-slate-500 block line-clamp-1">
                              {log.templateName}
                            </span>
                            {log.orderId && (
                              <span className="text-[10px] font-mono text-red-600 font-bold bg-red-50 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                                #{log.orderId}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-medium text-slate-800 block">
                              {log.actorName || 'System'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {log.actorRole || 'automated'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                log.status === 'Delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : log.status === 'Sent'
                                  ? 'bg-sky-100 text-sky-800'
                                  : log.status === 'Failed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  log.status === 'Delivered'
                                    ? 'bg-emerald-600'
                                    : log.status === 'Sent'
                                    ? 'bg-sky-600'
                                    : log.status === 'Failed'
                                    ? 'bg-rose-600'
                                    : 'bg-amber-600'
                                }`}
                              />
                              {log.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedLogForModal(log)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Email
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: GMAIL & SMTP CONFIGURATION */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Settings Form */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Gmail &amp; Notification Settings
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure sender identities, super admin targets, and automated trigger rules.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 transition-all disabled:opacity-50"
              >
                {isSavingSettings ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            {settingsSaveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Gmail notification settings saved to cloud database successfully!</span>
              </div>
            )}

            {/* Master Toggle */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Automated Email Engine (Master Switch)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  When enabled, all transactional and alert emails will be dispatched in real-time.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
              </label>
            </div>

            {/* Email Addresses Setup */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Super Admin Target Email
                </label>
                <input
                  type="email"
                  value={settings.superAdminEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, superAdminEmail: e.target.value })
                  }
                  placeholder="sadikrtx3060@gmail.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-mono font-medium focus:outline-none focus:border-red-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Staff audit trails and order alerts will be dispatched to this address.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={settings.senderName}
                  onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                  placeholder="KenaX BD Official"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-red-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  This name will be displayed as sender in recipient inboxes.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sender / Reply-To Email
                </label>
                <input
                  type="email"
                  value={settings.senderEmail}
                  onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
                  placeholder="support@kenaxbd.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-mono font-medium focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Staff Alert Recipient Emails (Comma separated)
                </label>
                <input
                  type="text"
                  value={settings.staffAlertEmails?.join(', ') || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      staffAlertEmails: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="admin@kenaxbd.com, manager@kenaxbd.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-mono font-medium focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Email Template Footer Contact Information */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Email Template Footer Contact Details
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Admin can edit, update, or remove these contact details displayed at the footer of all email templates.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Footer Hotline Numbers
                  </label>
                  <input
                    type="text"
                    value={settings.footerHotline !== undefined ? settings.footerHotline : '+880 1700-123456 / +880 1911-987654'}
                    onChange={(e) => setSettings({ ...settings, footerHotline: e.target.value })}
                    placeholder="+880 1700-123456 / +880 1911-987654 (leave empty to remove)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Footer Official Email
                  </label>
                  <input
                    type="email"
                    value={settings.footerEmail !== undefined ? settings.footerEmail : 'support@kenaxbd.com'}
                    onChange={(e) => setSettings({ ...settings, footerEmail: e.target.value })}
                    placeholder="support@kenaxbd.com (leave empty to remove)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Footer Physical Store Address
                  </label>
                  <input
                    type="text"
                    value={settings.footerAddress !== undefined ? settings.footerAddress : 'House 45, Road 27, Dhanmondi, Dhaka 1209, Bangladesh'}
                    onChange={(e) => setSettings({ ...settings, footerAddress: e.target.value })}
                    placeholder="House 45, Road 27, Dhanmondi, Dhaka 1209, Bangladesh (leave empty to remove)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Footer Trust Badges / Tagline Text
                  </label>
                  <input
                    type="text"
                    value={settings.footerTrustText !== undefined ? settings.footerTrustText : '✓ 100% Genuine Tech • ✓ Cash on Delivery • ✓ 24-48h Nationwide Delivery'}
                    onChange={(e) => setSettings({ ...settings, footerTrustText: e.target.value })}
                    placeholder="✓ 100% Genuine Tech • ✓ Cash on Delivery • ✓ 24-48h Nationwide Delivery"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Event Specific Notification Rules */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                Automated Event Trigger Controls:
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">New Customer Registration</span>
                    <span className="text-[11px] text-slate-500">Welcome email to customer &amp; staff notification</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnUserRegister}
                    onChange={(e) => setSettings({ ...settings, notifyOnUserRegister: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                </label>

                <label className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Product Added to Cart</span>
                    <span className="text-[11px] text-slate-500">Cart reminder to customer &amp; staff lead alert</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnAddToCart}
                    onChange={(e) => setSettings({ ...settings, notifyOnAddToCart: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                </label>

                <label className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Wishlist Activity</span>
                    <span className="text-[11px] text-slate-500">Notify staff of customer interest and saved items</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnWishlist}
                    onChange={(e) => setSettings({ ...settings, notifyOnWishlist: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                </label>

                <label className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">New Order Placement</span>
                    <span className="text-[11px] text-slate-500">Order confirmation &amp; staff dispatch notification</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnNewOrder}
                    onChange={(e) => setSettings({ ...settings, notifyOnNewOrder: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                </label>

                <label className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between cursor-pointer md:col-span-2">
                  <div>
                    <span className="text-xs font-bold text-purple-900 block flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-purple-600" />
                      Super Admin Staff Audit Trail (sadikrtx3060@gmail.com)
                    </span>
                    <span className="text-[11px] text-purple-700">
                      Detailed security audit dispatch whenever staff modifies order or customer status.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnStaffAudit}
                    onChange={(e) => setSettings({ ...settings, notifyOnStaffAudit: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Deliverability & Setup Guide */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <h4 className="text-sm font-bold text-slate-100">Primary Inbox Deliverability</h4>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                All KenaX BD emails are built following Google approved RFC standards to bypass spam filters and land directly in the Primary Inbox.
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-200 block">Smart MIME &amp; Dual-Body Format</span>
                    <span className="text-slate-400 text-[11px]">
                      Responsive HTML with inline styles plus fallback plain-text pass spam heuristic filters.
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-200 block">List-Unsubscribe &amp; Header Compliance</span>
                    <span className="text-slate-400 text-[11px]">
                      Standardized headers adhering strictly to Google and Yahoo bulk-sender guidelines.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gmail App Password Setup Instructions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-sky-500" />
                How to Connect Live Gmail SMTP
              </h4>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                To send emails directly from your Google account to customer inboxes, generate a 16-character <strong>App Password</strong>:
              </p>

              <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">
                <li>Go to your Google Account <em>Security</em> tab and ensure <strong>2-Step Verification</strong> is ON.</li>
                <li>Open the <strong>App Passwords</strong> page.</li>
                <li>Enter app name <code className="bg-slate-200 px-1 rounded">KenaX BD</code> and click <em>Create</em>.</li>
                <li>Use the generated 16-character password to dispatch directly from your Gmail account.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: VIEW FULL EMAIL CONTENT */}
      {/* ---------------------------------------------------- */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-red-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Email Dispatch Record Details
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {selectedLogForModal.id}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Meta Info */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block font-semibold">Recipient (To):</span>
                <span className="font-bold text-slate-900 font-mono">{selectedLogForModal.to}</span>
                <span className="text-[10px] text-slate-500 block">
                  Role: {selectedLogForModal.recipientRole}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Timestamp:</span>
                <span className="text-slate-700 font-mono">
                  {new Date(selectedLogForModal.timestamp).toLocaleString('en-US', {
                    timeZone: 'Asia/Dhaka',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-400 block font-semibold">Subject:</span>
                <span className="font-bold text-slate-900">{selectedLogForModal.subject}</span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Dispatch Status:</span>
                <span
                  className={`inline-block font-bold text-[11px] px-2 py-0.5 rounded ${
                    selectedLogForModal.status === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedLogForModal.status === 'Sent'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedLogForModal.status}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Triggered By Staff:</span>
                <span className="text-slate-800 font-medium">
                  {selectedLogForModal.actorName} ({selectedLogForModal.actorRole})
                </span>
              </div>
            </div>

            {/* Email HTML Body */}
            <div className="p-4 flex-1 overflow-y-auto bg-slate-900 flex justify-center">
              <div className="w-full max-w-[600px] bg-white rounded-lg shadow-lg overflow-hidden">
                <iframe
                  title="Sent Email Content"
                  srcDoc={selectedLogForModal.html || `<p>${selectedLogForModal.subject}</p>`}
                  className="w-full h-[380px] border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
