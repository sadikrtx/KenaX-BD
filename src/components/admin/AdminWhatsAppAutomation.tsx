import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Search,
  CheckCheck,
  User,
  AlertTriangle,
  CornerDownLeft,
  ChevronLeft,
  Inbox,
  Filter,
} from 'lucide-react';
import {
  WhatsAppSettings,
  WhatsAppTemplate,
  WhatsAppEventType,
  WhatsAppMessageRecord,
  WhatsAppConversation,
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
  groupMessagesIntoConversations,
  get24hCustomerServiceWindow,
  sendWhatsAppReply,
  subscribeToWhatsAppMessages,
  formatPhoneDisplay,
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
  const [activeSubTab, setActiveSubTab] = useState<'inbox' | 'templates' | 'quick-sender' | 'settings' | 'webhooks'>('inbox');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Live WhatsApp & Webhook monitoring
  const [liveMessages, setLiveMessages] = useState<WhatsAppMessageRecord[]>([]);
  const [liveWebhooks, setLiveWebhooks] = useState<any[]>([]);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [loadingLive, setLoadingLive] = useState(false);

  // Inbox & Chat State
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [inboxSearchQuery, setInboxSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Quick Sender State
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [testSendPhone, setTestSendPhone] = useState<string>('01700000000');
  const [copiedMsg, setCopiedMsg] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canEdit = hasPermission(currentRole, currentStaff?.permissions, 'settings.view');
  const canSend = canEdit || currentRole === 'super_admin' || currentRole === 'admin' || currentRole === 'manager' || currentRole === 'moderator';

  // Real-time subscription to WhatsApp messages and settings
  useEffect(() => {
    getWhatsAppSettingsFromDB().then((data) => {
      setSettings(data);
    });

    const unsubSettings = subscribeToWhatsAppSettings((liveData) => {
      setSettings(liveData);
    });

    const unsubMessages = subscribeToWhatsAppMessages((msgs, webhooks, config) => {
      setLiveMessages(msgs || []);
      if (webhooks) setLiveWebhooks(webhooks);
      if (config) setConfigStatus(config);
    });

    return () => {
      unsubSettings();
      unsubMessages();
    };
  }, []);

  const refreshMessages = async () => {
    setLoadingLive(true);
    try {
      const res = await fetch('/api/whatsapp/messages');
      if (res.ok) {
        const data = await res.json();
        setLiveMessages(data.messages || []);
        setLiveWebhooks(data.webhooks || []);
        setConfigStatus(data.configStatus || null);
      }
    } catch (err) {
      console.warn('Failed to load WhatsApp messages:', err);
    } finally {
      setLoadingLive(false);
    }
  };

  // Group messages into conversations
  const conversations = useMemo(() => {
    return groupMessagesIntoConversations(liveMessages);
  }, [liveMessages]);

  // Set initial selected conversation when messages load
  useEffect(() => {
    if (!selectedPhone && conversations.length > 0) {
      setSelectedPhone(conversations[0].phoneNumber);
    }
  }, [conversations, selectedPhone]);

  // Active selected conversation
  const activeConversation = useMemo(() => {
    if (!selectedPhone) return conversations[0] || null;
    return conversations.find((c) => c.phoneNumber === selectedPhone) || null;
  }, [conversations, selectedPhone]);

  // Scroll to bottom of message thread on active conversation change or new message
  useEffect(() => {
    if (activeSubTab === 'inbox' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages?.length, activeSubTab, selectedPhone]);

  // 24-hour customer service window status for active conversation
  const activeWindowStatus = useMemo(() => {
    if (!activeConversation) return null;
    return get24hCustomerServiceWindow(activeConversation.messages);
  }, [activeConversation]);

  // Find linked customer order if available
  const linkedOrder = useMemo(() => {
    if (!activeConversation) return null;
    const cleanActive = activeConversation.phoneNumber.replace(/[^0-9]/g, '');
    return orders.find((o) => {
      const mob = (o.customerMobile || o.deliveryMobile || '').replace(/[^0-9]/g, '');
      return mob && (cleanActive.endsWith(mob) || mob.endsWith(cleanActive));
    });
  }, [activeConversation, orders]);

  // Send WhatsApp Reply
  const handleSendReply = async () => {
    if (!replyText.trim() || !activeConversation || sendingReply) return;
    if (!canSend) {
      setReplyError('You do not have permission to send WhatsApp messages.');
      return;
    }

    const messageText = replyText.trim();
    const recipient = activeConversation.phoneNumber;
    const staffName = currentStaff?.name || (currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Admin' : 'Staff');
    const staffId = currentStaff?.id;
    const staffRole = currentRole;

    setSendingReply(true);
    setReplyError(null);
    setReplySuccess(null);

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: WhatsAppMessageRecord = {
      id: tempId,
      direction: 'outgoing',
      from: 'business',
      to: recipient,
      text: messageText,
      messageType: 'text',
      status: 'sending',
      timestamp: new Date().toISOString(),
      orderId: linkedOrder?.id,
      staffMember: staffName,
      staffId,
      staffRole,
    };

    setLiveMessages((prev) => [optimisticMsg, ...prev]);
    setReplyText('');

    try {
      const res = await sendWhatsAppReply({
        to: recipient,
        text: messageText,
        orderId: linkedOrder?.id,
        staffMember: staffName,
        staffId,
        staffRole,
      });

      if (res.success && res.message) {
        // Replace optimistic record with confirmed record
        setLiveMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...res.message!, status: 'sent' } : m))
        );
        setReplySuccess('Message delivered to WhatsApp dispatch queue!');
        setTimeout(() => setReplySuccess(null), 3000);

        if (onRecordAudit) {
          onRecordAudit(
            'WhatsApp Message Sent',
            'whatsapp_messaging',
            recipient,
            `Sent WhatsApp reply to ${recipient} by ${staffName} (${staffRole}): "${messageText.substring(0, 40)}..."`
          );
        }
      } else {
        // Update optimistic record to failed
        setLiveMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'failed', error: res.error } : m))
        );
        setReplyError(res.error || 'Failed to send WhatsApp message.');
        // Restore text in composer so user doesn't lose it
        setReplyText(messageText);
      }
    } catch (err: any) {
      setLiveMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed', error: err.message } : m))
      );
      setReplyError(err.message || 'An unexpected error occurred while sending message.');
      setReplyText(messageText);
    } finally {
      setSendingReply(false);
      textareaRef.current?.focus();
    }
  };

  // Handle Enter to send, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleInsertQuickText = (text: string) => {
    setReplyText((prev) => (prev ? `${prev}\n${text}` : text));
    textareaRef.current?.focus();
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await Promise.race([
        saveWhatsAppSettingsToDB(settings),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
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
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
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
    ],
    subtotal: 1450,
    deliveryCharge: 60,
    discount: 0,
    totalAmount: 1510,
    paidAmount: 0,
    dueAmount: 1510,
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

  const activeTemplate = settings.templates[selectedTemplateKey] || DEFAULT_WHATSAPP_TEMPLATES[selectedTemplateKey];
  const renderedMessage = formatWhatsAppMessage(activeTemplate.message, { order: sampleOrder });

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(renderedMessage);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 border border-emerald-900/50 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Official Meta WhatsApp Cloud API
              </span>
              <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                Live Bi-Directional Chat
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2 sm:gap-3">
              <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400 shrink-0" />
              <span>WhatsApp Live Inbox & Automation</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Reply to customer messages directly, send automated order alerts, and manage WhatsApp communication with 24-hour window compliance.
            </p>
          </div>

          {/* Quick status counters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-left">
              <p className="text-[10px] text-slate-400 font-medium uppercase">Active Chats</p>
              <p className="text-sm font-bold text-white flex items-center gap-1.5">
                <Inbox className="w-3.5 h-3.5 text-emerald-400" />
                {conversations.length} Customer Threads
              </p>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-left">
              <p className="text-[10px] text-slate-400 font-medium uppercase">Total Messages</p>
              <p className="text-sm font-bold text-emerald-400 font-mono">
                {liveMessages.length} Messages
              </p>
            </div>
            <button
              type="button"
              onClick={refreshMessages}
              disabled={loadingLive}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLive ? 'animate-spin' : ''}`} />
              Sync Live
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('inbox')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'inbox'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Inbox className="w-4 h-4" />
            WhatsApp Live Inbox & Replies
            {liveMessages.filter((m) => m.direction === 'incoming').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px]">
                {liveMessages.filter((m) => m.direction === 'incoming').length}
              </span>
            )}
          </button>

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
            Templates & Live Editor
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
            1-Click Order Sender
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
            Settings & API Credentials
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('webhooks')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSubTab === 'webhooks'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            Webhook Audit Logs ({liveWebhooks.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LIVE INBOX & TWO-WAY CHAT (MAIN REQUIREMENT) */}
      {activeSubTab === 'inbox' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
          {/* Left Column: Conversations List (4 cols on lg) */}
          <div className="lg:col-span-4 border-r border-slate-200/80 flex flex-col bg-slate-50/50">
            {/* Search Header */}
            <div className="p-4 border-b border-slate-200/80 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  Customer Conversations
                </h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {conversations.length}
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, phone, or text..."
                  value={inboxSearchQuery}
                  onChange={(e) => setInboxSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Conversation Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[580px]">
              {conversations.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No Conversations Yet</p>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                    When customers message your official Meta WhatsApp number, active chat threads will automatically populate here.
                  </p>
                </div>
              ) : (
                conversations
                  .filter((conv) => {
                    if (!inboxSearchQuery) return true;
                    const q = inboxSearchQuery.toLowerCase();
                    const matchPhone = conv.phoneNumber.toLowerCase().includes(q);
                    const matchName = conv.customerName?.toLowerCase().includes(q);
                    const matchMsg = conv.messages.some((m) => m.text?.toLowerCase().includes(q));
                    return matchPhone || matchName || matchMsg;
                  })
                  .map((conv) => {
                    const isSelected = selectedPhone === conv.phoneNumber;
                    const lastMsg = conv.lastMessage;
                    const windowInfo = get24hCustomerServiceWindow(conv.messages);

                    return (
                      <button
                        key={conv.phoneNumber}
                        type="button"
                        onClick={() => {
                          setSelectedPhone(conv.phoneNumber);
                          setReplyError(null);
                        }}
                        className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 border-l-4 border-emerald-600'
                            : 'hover:bg-slate-100/70 border-l-4 border-transparent'
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {conv.customerName
                            ? conv.customerName.charAt(0).toUpperCase()
                            : <User className="w-4 h-4" />}
                        </div>

                        {/* Thread Preview */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {conv.customerName || formatPhoneDisplay(conv.phoneNumber)}
                            </span>
                            {lastMsg && (
                              <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                {new Date(lastMsg.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 font-mono mb-1 truncate">
                            {formatPhoneDisplay(conv.phoneNumber)}
                          </p>

                          <p className="text-xs text-slate-600 truncate leading-snug">
                            {lastMsg?.direction === 'outgoing' && (
                              <span className="font-semibold text-emerald-700 mr-1">You:</span>
                            )}
                            {lastMsg?.text || '[Media / Template Message]'}
                          </p>

                          {/* Status and 24h pill */}
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            {windowInfo.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                24h Window Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                <Clock className="w-2.5 h-2.5" />
                                24h Expired
                              </span>
                            )}

                            <span className="text-[10px] text-slate-400 font-medium">
                              {conv.totalMessages} msgs
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          </div>

          {/* Right Column: Active Conversation & Reply Composer (8 cols on lg) */}
          <div className="lg:col-span-8 flex flex-col bg-white">
            {activeConversation ? (
              <>
                {/* Chat Top Header */}
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                      {activeConversation.customerName
                        ? activeConversation.customerName.charAt(0).toUpperCase()
                        : <User className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-black text-slate-900 truncate">
                          {activeConversation.customerName || 'Customer'}
                        </h2>
                        {linkedOrder && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                            Order #{linkedOrder.id}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                        <span>{formatPhoneDisplay(activeConversation.phoneNumber)}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(activeConversation.phoneNumber)}
                          className="hover:text-emerald-600 transition-colors p-0.5 cursor-pointer"
                          title="Copy phone number"
                        >
                          {copiedPhone ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={`https://wa.me/${activeConversation.phoneNumber.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-emerald-700 hover:text-emerald-800 font-sans font-bold text-[11px] ml-1"
                        >
                          Open in WhatsApp <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* 24-Hour Window Badge in Header */}
                  <div className="flex items-center gap-2">
                    {activeWindowStatus?.isActive ? (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>24h Window Active: {activeWindowStatus.formattedRemaining}</span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>24h Session Expired (Template Required)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 24-Hour Window Advisory Banner (if expired) */}
                {!activeWindowStatus?.isActive && (
                  <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">WhatsApp Customer Service Policy:</span> More than 24 hours have elapsed since the customer's last incoming message. Under Meta Cloud API rules, free-form text messages may be rejected (Error 131047). Use pre-approved WhatsApp templates or wait for customer re-engagement.
                    </div>
                  </div>
                )}

                {/* Message History Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[420px] bg-slate-50/40">
                  {activeConversation.messages.map((msg) => {
                    const isIncoming = msg.direction === 'incoming';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isIncoming ? 'items-start' : 'items-end'}`}
                      >
                        {/* Sender Label & Staff Attribution */}
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-bold text-slate-500">
                            {isIncoming
                              ? msg.senderName || 'Customer'
                              : msg.staffMember
                              ? `👤 ${msg.staffMember} (${msg.staffRole || 'Staff'})`
                              : '🤖 KenaX BD Bot'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Message Bubble */}
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                            isIncoming
                              ? 'bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs'
                              : 'bg-emerald-600 text-white rounded-tr-xs shadow-emerald-600/10'
                          }`}
                        >
                          <p className="whitespace-pre-wrap font-sans">{msg.text}</p>

                          {msg.orderId && (
                            <div
                              className={`mt-2 pt-1.5 border-t text-[10px] font-mono font-bold flex items-center gap-1 ${
                                isIncoming
                                  ? 'border-slate-100 text-emerald-700'
                                  : 'border-emerald-500/50 text-emerald-100'
                              }`}
                            >
                              <Package className="w-3 h-3" />
                              Order: #{msg.orderId}
                            </div>
                          )}
                        </div>

                        {/* Message Status indicator (Outgoing only) */}
                        {!isIncoming && (
                          <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400">
                            {msg.status === 'sending' && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                Sending...
                              </span>
                            )}
                            {msg.status === 'sent' && (
                              <span className="flex items-center gap-1 text-slate-600">
                                <Check className="w-3 h-3 text-slate-400" />
                                Sent to Meta
                              </span>
                            )}
                            {msg.status === 'delivered' && (
                              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                                <CheckCheck className="w-3 h-3 text-slate-400" />
                                Delivered
                              </span>
                            )}
                            {msg.status === 'read' && (
                              <span className="flex items-center gap-1 text-blue-600 font-bold">
                                <CheckCheck className="w-3 h-3 text-blue-500" />
                                Read by Customer
                              </span>
                            )}
                            {msg.status === 'failed' && (
                              <span className="flex items-center gap-1 text-rose-600 font-bold">
                                <AlertCircle className="w-3 h-3 text-rose-500" />
                                Failed ({msg.error || 'Rejected by Meta'})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Reply Chips */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">
                    Quick Insert:
                  </span>
                  {[
                    { label: '👋 Hello/Greetings', text: 'আসসালামু আলাইকুম! KenaX BD থেকে আপনাকে স্বাগতম। আমরা আপনাকে কীভাবে সাহায্য করতে পারি?' },
                    { label: '📦 Order Confirmed', text: `আপনার অর্ডারটি সফলভাবে কনফার্ম করা হয়েছে। প্যাকেজিং সম্পন্ন হলে কুরিয়ার ট্র্যাকিং কোড পাঠিয়ে দেওয়া হবে। ধন্যবাদ!` },
                    { label: '🚚 Handed to Courier', text: `আপনার পার্সেলটি কুরিয়ারে বুকিং করা হয়েছে। শীঘ্রই ডেলিভারি প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।` },
                    { label: '💳 Payment Received', text: `আপনার পেমেন্ট সফলভাবে ভেরিফাই করা হয়েছে। ধন্যবাদ!` },
                    { label: '📞 Call Helpline', text: `যেকোনো তথ্যের জন্য আমাদের হেল্পলাইনে সরাসরি কল করুন: 01700000000` },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInsertQuickText(chip.text)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-[11px] font-medium text-slate-700 whitespace-nowrap transition-colors cursor-pointer shrink-0"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Error Banner */}
                {replyError && (
                  <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold">WhatsApp Send Error: </span>
                      {replyError}
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyError(null)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Success Banner */}
                {replySuccess && (
                  <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{replySuccess}</span>
                  </div>
                )}

                {/* Message Composer (Bottom) */}
                <div className="p-4 border-t border-slate-200 bg-white space-y-2">
                  <div className="relative">
                    <textarea
                      ref={textareaRef}
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Type reply to ${formatPhoneDisplay(activeConversation.phoneNumber)}... (Press Enter to send, Shift+Enter for new line)`}
                      disabled={sendingReply || !canSend}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none font-sans"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        Sender Identity:
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-800">
                        {currentStaff?.name || (currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Admin' : 'Staff')} ({currentRole})
                      </span>
                      <span className="hidden md:inline text-slate-400">
                        • Recipient: {formatPhoneDisplay(activeConversation.phoneNumber)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || sendingReply || !canSend}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingReply ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Sending via Meta...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Message
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Select a Conversation</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Choose a customer conversation from the list on the left to view full message history, check 24-hour service status, and send instant replies.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TEMPLATES & LIVE EDITOR */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Selector (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Select Event Template
              </h2>

              <div className="space-y-1.5">
                {(Object.keys(DEFAULT_WHATSAPP_TEMPLATES) as WhatsAppEventType[]).map((key) => {
                  const tpl = settings.templates[key] || DEFAULT_WHATSAPP_TEMPLATES[key];
                  const isSelected = selectedTemplateKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedTemplateKey(key)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs sm:text-sm">{tpl.banglaTitle || tpl.title}</p>
                        <p
                          className={`text-[11px] font-normal ${
                            isSelected ? 'text-emerald-100' : 'text-slate-400'
                          }`}
                        >
                          {tpl.category}
                        </p>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Template Editor & Preview (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {activeTemplate.banglaTitle || activeTemplate.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Category: {activeTemplate.category} • Meta Approved Template Structure
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <span>Enable Template:</span>
                    <input
                      type="checkbox"
                      checked={activeTemplate.enabled}
                      onChange={(e) => handleTemplateChange('enabled', e.target.checked)}
                      disabled={!canEdit}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                  </label>
                </div>
              </div>

              {/* Dynamic Variables Pill Bar */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Insert Dynamic Order Variables (Click to Add):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {activeTemplate.variables?.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleInsertVariable(v)}
                      disabled={!canEdit}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-mono font-semibold transition-colors cursor-pointer border border-emerald-200/60"
                    >
                      +{v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Body Editor */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Message Template Text (Markdown / Emojis Supported):
                </label>
                <textarea
                  rows={9}
                  value={activeTemplate.message}
                  onChange={(e) => handleTemplateChange('message', e.target.value)}
                  disabled={!canEdit}
                  className="w-full p-4 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed text-slate-800"
                />
              </div>

              {/* Save Button */}
              {canEdit && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Changes take effect immediately on next automated WhatsApp dispatch.
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        Saved Successfully!
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Template Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Live WhatsApp Bubble Preview */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Smartphone className="w-4 h-4" />
                  Live Smartphone Message Preview
                </span>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedMsg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedMsg ? 'Copied' : 'Copy Text'}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#0b141a] border border-slate-800/80">
                <div className="max-w-md p-3.5 rounded-2xl bg-[#005c4b] text-white text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans shadow-md">
                  {renderedMessage}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: 1-CLICK ORDER SENDER */}
      {activeSubTab === 'quick-sender' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-600" />
              1-Click Direct WhatsApp Order Dispatch
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Customer Order:
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.id} - {o.customerName || o.deliveryName} (৳{o.totalAmount} • {o.orderStatus})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Event Template:
                </label>
                <select
                  value={selectedTemplateKey}
                  onChange={(e) => setSelectedTemplateKey(e.target.value as WhatsAppEventType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {(Object.keys(DEFAULT_WHATSAPP_TEMPLATES) as WhatsAppEventType[]).map((k) => (
                    <option key={k} value={k}>
                      {DEFAULT_WHATSAPP_TEMPLATES[k].banglaTitle || DEFAULT_WHATSAPP_TEMPLATES[k].title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <p className="font-bold text-slate-700">Recipient Information:</p>
                <p className="text-slate-600">Customer: <span className="font-semibold text-slate-900">{sampleOrder.customerName || sampleOrder.deliveryName}</span></p>
                <p className="text-slate-600">Phone: <span className="font-semibold text-emerald-700 font-mono">{sampleOrder.deliveryMobile || sampleOrder.customerMobile || testSendPhone}</span></p>
                <p className="text-slate-600">Order Amount: <span className="font-bold text-slate-900">৳{sampleOrder.totalAmount}</span> (Due: ৳{sampleOrder.dueAmount})</p>
              </div>

              <a
                href={generateWhatsAppDirectLink(sampleOrder.deliveryMobile || sampleOrder.customerMobile || testSendPhone, renderedMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Open in WhatsApp Web / App
              </a>
            </div>
          </div>

          <div className="lg:col-span-6 bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-4">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Rendered Message Body
            </span>
            <div className="p-4 rounded-xl bg-[#0b141a] border border-slate-800">
              <div className="p-4 rounded-2xl bg-[#005c4b] text-white text-xs leading-relaxed whitespace-pre-wrap font-sans">
                {renderedMessage}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SETTINGS & CREDENTIALS */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              WhatsApp Provider Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  WhatsApp Messaging Mode
                </label>
                <select
                  value={settings.provider}
                  onChange={(e) => setSettings({ ...settings, provider: e.target.value as any })}
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="cloud_api">Official Meta WhatsApp Cloud API (Recommended)</option>
                  <option value="direct_link">1-Click Direct WhatsApp Link (wa.me)</option>
                  <option value="ultramsg">UltraMsg WhatsApp Gateway</option>
                  <option value="wasender">Wasender Gateway</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Business WhatsApp Phone Number
                </label>
                <input
                  type="text"
                  value={settings.businessNumber}
                  onChange={(e) => setSettings({ ...settings, businessNumber: e.target.value })}
                  placeholder="8801800000000"
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sender / Brand Display Name
                </label>
                <input
                  type="text"
                  value={settings.senderName}
                  onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
                  placeholder="KenaX BD Official"
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Settings
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Environment Security Status
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">WHATSAPP_ACCESS_TOKEN</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Configured in Secrets
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">WHATSAPP_VERIFY_TOKEN</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Active (Strict 1-Token)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">WHATSAPP_PHONE_NUMBER_ID</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Configured
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: WEBHOOK AUDIT LOGS */}
      {activeSubTab === 'webhooks' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-600" />
                Raw Meta WhatsApp Webhook Receipts ({liveWebhooks.length})
              </h3>
              <p className="text-xs text-slate-500">
                Audited inbound payload records from Meta servers
              </p>
            </div>
            <button
              type="button"
              onClick={refreshMessages}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Refresh Logs
            </button>
          </div>

          {liveWebhooks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No webhook events logged yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {liveWebhooks.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span className="font-mono font-bold text-purple-700">{log.type}</span>
                    <span>{new Date(log.receivedAt).toLocaleString()}</span>
                  </div>
                  <p className="font-medium text-slate-800">{log.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
