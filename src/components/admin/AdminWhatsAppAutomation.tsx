import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Smartphone,
  Send,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Sliders,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Radio,
  FileText,
  Key,
  Info,
  Phone,
  Truck,
  Package,
  ShoppingBag,
  Clock,
  ChevronRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  WhatsAppSettings,
  WhatsAppTemplate,
  WhatsAppEventType,
  Order,
  UserRole,
  StaffUser,
} from '../../types';
import {
  DEFAULT_WHATSAPP_SETTINGS,
  DEFAULT_WHATSAPP_TEMPLATES,
  getWhatsAppSettingsFromDB,
  saveWhatsAppSettingsToDB,
  subscribeToWhatsAppSettings,
  formatWhatsAppMessage,
  generateWhatsAppDirectLink,
} from '../../lib/whatsappService';
import { hasPermission } from '../../lib/permissions';

interface AdminWhatsAppAutomationProps {
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  orders: Order[];
  onRecordAudit?: (action: string, category: string, target: string, details: string) => void;
}

export const AdminWhatsAppAutomation: React.FC<AdminWhatsAppAutomationProps> = ({
  currentRole,
  currentStaff,
  orders,
  onRecordAudit,
}) => {
  const [settings, setSettings] = useState<WhatsAppSettings>(DEFAULT_WHATSAPP_SETTINGS);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<WhatsAppEventType>('order_placed');
  const [activeSubTab, setActiveSubTab] = useState<'templates' | 'quick-sender' | 'settings'>('templates');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Quick Sender State
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [customPhone, setCustomPhone] = useState<string>('01700000000');
  const [customName, setCustomName] = useState<string>('কাস্টমার সাহেব');
  const [testSendPhone, setTestSendPhone] = useState<string>('01700000000');
  const [copiedMsg, setCopiedMsg] = useState(false);

  const canEdit = hasPermission(currentRole, currentStaff?.permissions, 'settings.view');

  // Sample order for live preview if no real orders
  const sampleOrder: Order = orders.find((o) => o.id === selectedOrderId) || orders[0] || {
    id: 'KNX-882194',
    customerId: 'cust-demo',
    customerName: 'তানভীর আহমেদ',
    customerEmail: 'tanvir@gmail.com',
    customerMobile: '01712345678',
    deliveryName: 'তানভীর আহমেদ',
    deliveryMobile: '01712345678',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhanmondi',
    area: 'Dhanmondi 27',
    fullAddress: 'হাউজ #১২, রোড #২৭, ধানমন্ডি, ঢাকা',
    items: [
      {
        productId: 'prod-1',
        productName: 'T900 Ultra 2 Smartwatch',
        productImage: '',
        quantity: 1,
        price: 1450,
        total: 1450,
      },
      {
        productId: 'prod-2',
        productName: 'Magnetic Wireless Powerbank 10000mAh',
        productImage: '',
        quantity: 1,
        price: 1250,
        total: 1250,
      },
    ],
    subtotal: 2700,
    deliveryCharge: 60,
    discount: 100,
    totalAmount: 2660,
    paidAmount: 0,
    dueAmount: 2660,
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'Pending',
    orderStatus: 'Confirmed',
    courierName: 'Steadfast Courier',
    trackingNumber: 'STDF-8821940',
    trackingUrl: 'https://steadfast.com.bd/t/STDF-8821940',
    timeline: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  useEffect(() => {
    getWhatsAppSettingsFromDB().then((data) => {
      setSettings(data);
    });

    const unsubscribe = subscribeToWhatsAppSettings((liveData) => {
      setSettings(liveData);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await saveWhatsAppSettingsToDB(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onRecordAudit) {
        onRecordAudit(
          'WhatsApp Settings Updated',
          'settings',
          'whatsapp_automation',
          `Updated WhatsApp templates and automation settings by ${currentStaff?.name || currentRole}`
        );
      }
    } catch (err) {
      console.error('Failed to save WhatsApp settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (field: keyof WhatsAppTemplate, value: any) => {
    setSettings((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [selectedTemplateKey]: {
          ...(prev.templates[selectedTemplateKey] || DEFAULT_WHATSAPP_TEMPLATES[selectedTemplateKey]),
          [field]: value,
        },
      },
    }));
  };

  const handleInsertVariable = (variable: string) => {
    const currentTemplate = settings.templates[selectedTemplateKey] || DEFAULT_WHATSAPP_TEMPLATES[selectedTemplateKey];
    const newMsg = (currentTemplate.message || '') + ' ' + variable;
    handleTemplateChange('message', newMsg);
  };

  const activeTemplate = settings.templates[selectedTemplateKey] || DEFAULT_WHATSAPP_TEMPLATES[selectedTemplateKey];
  const renderedMessage = formatWhatsAppMessage(activeTemplate.message, { order: sampleOrder });

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(renderedMessage);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const directWhatsAppUrl = generateWhatsAppDirectLink(
    sampleOrder.deliveryMobile || sampleOrder.customerMobile || testSendPhone,
    renderedMessage
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-emerald-900/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 overflow-hidden">
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                WhatsApp Automation & Smart Alerts
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                100% Free Direct Messaging
              </span>
            </div>
            <h1 className="text-base sm:text-3xl font-black tracking-tight text-white flex items-center gap-2 sm:gap-3 whitespace-nowrap overflow-hidden text-ellipsis">
              <MessageSquare className="w-5 h-5 sm:w-8 sm:h-8 text-emerald-400 shrink-0" />
              <span className="truncate">WhatsApp Automation & Templates</span>
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Send instant WhatsApp order confirmations, live courier tracking, invoices, and promotional offers.
            </p>
          </div>

          {/* Quick status counters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-left">
              <p className="text-[11px] text-slate-400 font-medium">Active Mode</p>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                {settings.provider === 'direct_link' ? '1-Click Direct WhatsApp' : settings.provider}
              </p>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-left">
              <p className="text-[11px] text-slate-400 font-medium">Ready Templates</p>
              <p className="text-sm font-bold text-white">8 Pre-built Events</p>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-left">
              <p className="text-[11px] text-slate-400 font-medium">Automations</p>
              <p className="text-sm font-bold text-emerald-400">Auto Live Links</p>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('templates')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'templates'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            WhatsApp Templates & Live Editor
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('quick-sender')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'quick-sender'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Send className="w-4 h-4" />
            Direct 1-Click Order Sender
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            WhatsApp Settings & API
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-bold">
            WhatsApp settings and templates saved and synced successfully!
          </p>
        </div>
      )}

      {/* SUB-TAB 1: TEMPLATES & LIVE EDITOR */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Selector List (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2 h-fit">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-3 py-1">
              Select Event Template
            </h3>
            {(Object.keys(DEFAULT_WHATSAPP_TEMPLATES) as WhatsAppEventType[]).map((key) => {
              const tpl = settings.templates?.[key] || DEFAULT_WHATSAPP_TEMPLATES[key];
              const isSelected = selectedTemplateKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTemplateKey(key)}
                  className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
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
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {tpl.enabled ? 'Active' : 'Off'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Middle Column: Template Editor (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {activeTemplate.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Trigger Event: {activeTemplate.id}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeTemplate.enabled}
                    onChange={(e) => handleTemplateChange('enabled', e.target.checked)}
                    disabled={!canEdit}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Template Title
                </label>
                <input
                  type="text"
                  value={activeTemplate.title}
                  onChange={(e) => handleTemplateChange('title', e.target.value)}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    WhatsApp Message Text
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {activeTemplate.message.length} chars
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={activeTemplate.message}
                  onChange={(e) => handleTemplateChange('message', e.target.value)}
                  disabled={!canEdit}
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50"
                  placeholder="WhatsApp message body..."
                />
              </div>

              {/* Dynamic Variables Pill Toolbar */}
              <div>
                <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Click to Insert Variables:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: '{{customerName}}', label: 'Customer Name' },
                    { tag: '{{orderId}}', label: 'Order ID' },
                    { tag: '{{totalAmount}}', label: 'Total ৳' },
                    { tag: '{{dueAmount}}', label: 'Due ৳' },
                    { tag: '{{paidAmount}}', label: 'Paid ৳' },
                    { tag: '{{paymentMethod}}', label: 'Payment Method' },
                    { tag: '{{fullAddress}}', label: 'Address' },
                    { tag: '{{district}}', label: 'District' },
                    { tag: '{{courierName}}', label: 'Courier' },
                    { tag: '{{trackingNumber}}', label: 'Tracking No' },
                    { tag: '{{trackingUrl}}', label: 'Live Link' },
                    { tag: '{{itemsList}}', label: 'Ordered Items' },
                    { tag: '{{siteName}}', label: 'Site Name' },
                    { tag: '{{helpline}}', label: 'Helpline No' },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertVariable(v.tag)}
                      disabled={!canEdit}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 border border-emerald-200/80 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>{v.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Template Button */}
              {canEdit && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Save WhatsApp Template
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Interactive Smartphone Simulator (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 rounded-3xl p-4 sm:p-5 border-4 border-slate-800 shadow-2xl relative">
              {/* Phone Header Notch & Status bar */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-3 px-2">
                <span>9:41 AM</span>
                <div className="w-16 h-4 bg-slate-800 rounded-full mx-auto" />
                <span>100% 🔋</span>
              </div>

              {/* WhatsApp App Bar */}
              <div className="bg-emerald-800 text-white rounded-2xl p-3 flex items-center justify-between gap-2 shadow-md mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/20">
                    K
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate flex items-center gap-1">
                      {settings.senderName || 'KenaX BD Official'}
                      <CheckCircle2 className="w-3 h-3 text-emerald-300 fill-emerald-300 inline" />
                    </p>
                    <p className="text-[9px] text-emerald-200">Online • Official Business</p>
                  </div>
                </div>
                <Phone className="w-4 h-4 text-emerald-200 shrink-0" />
              </div>

              {/* Chat Canvas (WhatsApp Background pattern style) */}
              <div className="bg-[#0b141a] rounded-2xl p-3 border border-slate-800 min-h-[340px] max-h-[460px] overflow-y-auto space-y-3">
                <div className="text-center">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#182229] text-[9px] text-slate-400 uppercase font-mono">
                    TODAY
                  </span>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="flex justify-end">
                  <div className="bg-[#005c4b] text-white rounded-2xl rounded-tr-xs p-3.5 max-w-[92%] shadow-sm text-xs leading-relaxed space-y-1 relative">
                    <p className="whitespace-pre-wrap font-sans text-[11.5px]">
                      {renderedMessage}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/80 pt-1">
                      <span>Just now</span>
                      <span className="text-sky-300 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons under Phone simulator */}
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                <a
                  href={directWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer text-center"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Test Send via WhatsApp Web / App</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedMsg ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Message Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Full WhatsApp Text</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DIRECT 1-CLICK ORDER SENDER */}
      {activeSubTab === 'quick-sender' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <Send className="w-5 h-5 text-emerald-600" />
              Send 1-Click WhatsApp Message for Any Order
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Live Order
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.id} - {o.customerName || o.deliveryName} (৳{o.totalAmount} • {o.orderStatus} • {o.customerMobile || o.deliveryMobile})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Event Template
              </label>
              <select
                value={selectedTemplateKey}
                onChange={(e) => setSelectedTemplateKey(e.target.value as WhatsAppEventType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
              >
                {(Object.keys(DEFAULT_WHATSAPP_TEMPLATES) as WhatsAppEventType[]).map((key) => {
                  const tpl = settings.templates?.[key] || DEFAULT_WHATSAPP_TEMPLATES[key];
                  return (
                    <option key={key} value={key}>
                      {tpl.title}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Selected Order Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Customer Name:</span>
                <span>{sampleOrder.deliveryName || sampleOrder.customerName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Mobile Number:</span>
                <span className="font-mono">{sampleOrder.deliveryMobile || sampleOrder.customerMobile}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Bill:</span>
                <span className="font-mono text-emerald-700 font-bold">৳{sampleOrder.totalAmount}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Courier & Tracking:</span>
                <span>{sampleOrder.courierName} ({sampleOrder.trackingNumber || 'Not assigned'})</span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={directWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer text-center"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open in WhatsApp Web / App</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Right Live Preview of this customized text */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Message Preview
            </h3>
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-[380px] overflow-y-auto border border-slate-800">
              {renderedMessage}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: WHATSAPP SETTINGS & AUTOMATION RULES */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-emerald-600" />
                    WhatsApp Configuration & Store Info
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
                    WhatsApp Provider Mode
                  </label>
                  <select
                    value={settings.provider}
                    onChange={(e) => setSettings({ ...settings, provider: e.target.value as any })}
                    disabled={!canEdit}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    <option value="direct_link">1-Click Direct WhatsApp (100% Free / Recommended)</option>
                    <option value="ultramsg">UltraMsg API (Automated Cloud Dispatch)</option>
                    <option value="wasender">Wasender Gateway</option>
                    <option value="green_api">Green API</option>
                    <option value="cloud_api">Meta WhatsApp Cloud API</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Store WhatsApp Support Number
                  </label>
                  <input
                    type="text"
                    value={settings.businessNumber || ''}
                    onChange={(e) => setSettings({ ...settings, businessNumber: e.target.value })}
                    placeholder="8801800000000"
                    disabled={!canEdit}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={settings.senderName || ''}
                    onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                    placeholder="KenaX BD Official"
                    disabled={!canEdit}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {settings.provider !== 'direct_link' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Instance ID
                      </label>
                      <input
                        type="text"
                        value={settings.instanceId || ''}
                        onChange={(e) => setSettings({ ...settings, instanceId: e.target.value })}
                        placeholder="instance12345"
                        disabled={!canEdit}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        API Token / Secret Key
                      </label>
                      <input
                        type="password"
                        value={settings.apiKey || ''}
                        onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                        placeholder="Enter API token key"
                        disabled={!canEdit}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Automation Triggers Checklist */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                <Zap className="w-5 h-5 text-amber-500" />
                Automatic WhatsApp Triggers
              </h2>

              <div className="space-y-3">
                {[
                  {
                    key: 'autoSendOnNewOrder',
                    label: 'Send WhatsApp confirmation link on new order',
                  },
                  {
                    key: 'autoSendOnShipped',
                    label: 'WhatsApp alert with tracking link on courier dispatch',
                  },
                  {
                    key: 'autoSendOnDelivered',
                    label: '5-Star review request after successful delivery',
                  },
                  {
                    key: 'autoSendOnPayment',
                    label: 'Payment verification receipt',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer"
                  >
                    <div className="space-y-0.5 pr-4">
                      <p className="text-xs sm:text-sm font-bold text-slate-900">{item.label}</p>
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
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 mt-1 cursor-pointer"
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
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center gap-2 shadow-md shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save WhatsApp Settings
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
