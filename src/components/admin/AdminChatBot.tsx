import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  MessageSquare,
  Phone,
  ShieldCheck,
  Send,
  Save,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Sliders,
  ShoppingBag,
  Clock,
  Check,
  Copy,
  AlertCircle,
  HelpCircle,
  Zap,
  Globe,
  Radio,
  CheckCircle,
  Eye,
  Printer,
  ArrowRight,
  X,
  PhoneCall,
  Filter,
  CheckCheck,
  Layers,
} from 'lucide-react';
import { SiWhatsapp, SiTelegram, SiMessenger } from 'react-icons/si';
import { SiteSettings, Order, Product, UserRole, StaffUser, OrderStatus, ChatBotRule } from '../../types';
import { DEFAULT_CHATBOT_RULES } from '../../data/defaultChatBotRules';
import { AdminChatBotRuleMatrix } from './AdminChatBotRuleMatrix';
import { evaluateChatBotRules } from '../../lib/chatBotRuleMatcher';
import { hasPermission } from '../../lib/permissions';

interface AdminChatBotProps {
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  siteSettings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => Promise<void>;
  orders: Order[];
  products: Product[];
  onUpdateOrderStatus?: (
    orderId: string,
    newStatus: OrderStatus,
    courierName?: string,
    trackingNumber?: string,
    handledByStaff?: { id?: string; name?: string; role?: string },
    adminNotes?: string
  ) => void;
  onPrintInvoice?: (order: Order) => void;
  onNavigateToConfirmedOrders?: () => void;
  onNavigateToOrders?: () => void;
}

export const AdminChatBot: React.FC<AdminChatBotProps> = ({
  currentRole,
  currentStaff,
  siteSettings,
  onUpdateSettings,
  orders = [],
  products = [],
  onUpdateOrderStatus,
  onPrintInvoice,
  onNavigateToConfirmedOrders,
  onNavigateToOrders,
}) => {
  // Granular RBAC Permissions
  const canAccessAi =
    hasPermission(currentRole, currentStaff?.permissions, 'chatbot.ai') ||
    hasPermission(currentRole, currentStaff?.permissions, 'settings.view');
  const canManageRules =
    hasPermission(currentRole, currentStaff?.permissions, 'chatbot.rules') ||
    hasPermission(currentRole, currentStaff?.permissions, 'settings.view');
  const canViewOrders =
    hasPermission(currentRole, currentStaff?.permissions, 'orders.view') ||
    hasPermission(currentRole, currentStaff?.permissions, 'settings.view');

  // Tabs: "kenax-bot", "rules-matrix", "orders", "test-chat"
  const [activeTab, setActiveTab] = useState<'kenax-bot' | 'rules-matrix' | 'orders' | 'test-chat'>('kenax-bot');

  // Auto-switch tab if current tab is forbidden
  useEffect(() => {
    if (activeTab === 'kenax-bot' && !canAccessAi) {
      if (canManageRules) setActiveTab('rules-matrix');
      else if (canViewOrders) setActiveTab('orders');
      else setActiveTab('test-chat');
    } else if (activeTab === 'rules-matrix' && !canManageRules) {
      if (canAccessAi) setActiveTab('kenax-bot');
      else if (canViewOrders) setActiveTab('orders');
      else setActiveTab('test-chat');
    } else if (activeTab === 'orders' && !canViewOrders) {
      if (canAccessAi) setActiveTab('kenax-bot');
      else if (canManageRules) setActiveTab('rules-matrix');
      else setActiveTab('test-chat');
    }
  }, [activeTab, canAccessAi, canManageRules, canViewOrders]);

  // Form states initialized from siteSettings
  const [aiBotEnabled, setAiBotEnabled] = useState<boolean>(siteSettings.aiBotEnabled ?? true);
  const [aiBotName, setAiBotName] = useState<string>(siteSettings.aiBotName || 'KenaX AI Bot');
  const [aiBotWelcomeMessage, setAiBotWelcomeMessage] = useState<string>(
    siteSettings.aiBotWelcomeMessage ||
      'হ্যালো! আমি KenaX AI Bot। যেকোনো প্রোডাক্ট তথ্য, অর্ডার বুকিং বা অফিশিয়াল প্রতিনিধির সাথে সরাসরি কথা বলতে আমাকে বলুন!'
  );
  const [aiBotAllowOrdering, setAiBotAllowOrdering] = useState<boolean>(siteSettings.aiBotAllowOrdering ?? true);

  // ChatBot Rules state initialized from siteSettings or DEFAULT_CHATBOT_RULES
  const [chatBotRules, setChatBotRules] = useState<ChatBotRule[]>(() => {
    if (siteSettings.chatBotRules && Array.isArray(siteSettings.chatBotRules) && siteSettings.chatBotRules.length > 0) {
      return siteSettings.chatBotRules;
    }
    return DEFAULT_CHATBOT_RULES;
  });

  // Official Channel Numbers
  const [officialWhatsAppAgentNumber, setOfficialWhatsAppAgentNumber] = useState<string>(
    siteSettings.officialWhatsAppAgentNumber || siteSettings.whatsappNumber || '01719143897'
  );
  const [whatsappSuperAdminNumber, setWhatsappSuperAdminNumber] = useState<string>(
    siteSettings.whatsappSuperAdminNumber || '01887713212'
  );
  const [telegramBotUsername, setTelegramBotUsername] = useState<string>(
    siteSettings.telegramBotUsername || 'kenaxbd_bot'
  );
  const [messengerLink, setMessengerLink] = useState<string>(
    siteSettings.messengerLink || 'https://m.me/kenaxbd'
  );

  // Custom Prompt
  const defaultPrompt = `You are "KenaX AI Bot", the official intelligent shopping & customer support assistant for "KenaX BD" (কেম্যাক্স বিডি).
Official Contacts:
- Official WhatsApp Agent: ${officialWhatsAppAgentNumber} (https://wa.me/88${officialWhatsAppAgentNumber.replace(/[^0-9]/g, '')})
- WhatsApp Super Admin: ${whatsappSuperAdminNumber} (https://wa.me/88${whatsappSuperAdminNumber.replace(/[^0-9]/g, '')})
- Telegram Bot: @${telegramBotUsername} (https://t.me/${telegramBotUsername.replace('@', '')})
- Messenger: ${messengerLink}
Delivery: Inside Dhaka ৳60, Outside Dhaka ৳120. Cash on delivery available.
When customers ask to place an order, collect product name, quantity, customer name, 11-digit mobile, and delivery address. All orders placed are marked as "Pending" for admin verification.`;

  const [aiBotPrompt, setAiBotPrompt] = useState<string>(siteSettings.aiBotPrompt || defaultPrompt);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto sync rules handler
  const handleChangeRules = (newRules: ChatBotRule[]) => {
    setChatBotRules(newRules);
    onUpdateSettings({
      ...siteSettings,
      chatBotRules: newRules,
    }).catch((err) => console.error('Auto sync rules failed:', err));
  };

  // Interactive Live Test Chat State
  const [testMessages, setTestMessages] = useState<
    Array<{
      id: string;
      sender: 'user' | 'bot';
      text: string;
      timestamp: string;
      actionLinks?: Array<{ label: string; url: string; type: string }>;
    }>
  >([
    {
      id: 'welcome',
      sender: 'bot',
      text: `স্বাগতম! আমি ${aiBotName}। আমি কাস্টমারদের স্মার্ট উত্তর প্রদান করতে পারি, সরাসরি অর্ডার বুক করে 'Pending' হিসেবে সেভ করতে পারি, এবং আমাদের অফিসিয়াল WhatsApp এজেন্ট (${officialWhatsAppAgentNumber}) ও সুপার অ্যাডমিন (${whatsappSuperAdminNumber}) নম্বর দিতে পারি। কীভাবে সাহায্য করব?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [testInput, setTestInput] = useState('');
  const [isTestThinking, setIsTestThinking] = useState(false);

  // Filter orders that are Pending or created via Bot
  const [aiOrdersFilter, setAiOrdersFilter] = useState<'pending_ai' | 'confirmed_ai' | 'all_ai' | 'all_pending'>('pending_ai');
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [selectedViewOrder, setSelectedViewOrder] = useState<Order | null>(null);

  const isOrderPending = (o: Order) => {
    const s = (o.orderStatus || (o as any).status || 'Pending').toString().trim().toLowerCase();
    return s === 'pending' || s === 'payment verification' || s === 'unconfirmed';
  };

  const isOrderConfirmed = (o: Order) => {
    const s = (o.orderStatus || (o as any).status || '').toString().trim().toLowerCase();
    return (
      s === 'confirmed' ||
      s === 'processing' ||
      s === 'packed' ||
      s === 'picked' ||
      s === 'shipped' ||
      s === 'out for delivery' ||
      s === 'delivered' ||
      s === 'completed'
    );
  };

  const isAiOrder = (o: Order | any) => {
    if (!o) return false;
    const ordSrc = ((o as any).orderSource || '').toLowerCase().trim();
    if (ordSrc === 'chatbot' || ordSrc === 'ai_bot') {
      return true;
    }
    if (ordSrc === 'manual' || ordSrc === 'website' || ordSrc === 'landing_page' || ordSrc === 'admin') {
      return false;
    }
    // Legacy fallback only if orderSource is completely unset
    return (o as any).isAiBotOrder === true && (o as any).createdByStaffName === 'Ordered by KenaX Bot';
  };

  const allAiOrders = orders.filter(isAiOrder);
  const pendingAiOrders = allAiOrders.filter(isOrderPending);
  const confirmedAiOrders = allAiOrders.filter(isOrderConfirmed);
  const allPendingOrders = orders.filter(isOrderPending);

  // Backward compatibility
  const pendingOrders = pendingAiOrders.length > 0 ? pendingAiOrders : allPendingOrders;
  const aiBotOrders = allAiOrders;

  const handleConfirmOrder = (order: Order) => {
    if (!onUpdateOrderStatus) return;
    setConfirmingOrderId(order.id);
    const activeStaff = currentStaff
      ? { id: currentStaff.id, name: currentStaff.name, role: currentStaff.role }
      : undefined;

    try {
      onUpdateOrderStatus(
        order.id,
        'Confirmed',
        order.courierName || 'Steadfast Courier',
        order.trackingNumber,
        activeStaff,
        `Confirmed from AI Chatbot Orders tab by ${currentStaff?.name || 'Admin'}`
      );
      setActionFeedback(`অর্ডার #${order.id} সফলভাবে কনফার্ম করা হয়েছে এবং Confirmed Orders সেকশনে পাঠানো হয়েছে!`);
      if (selectedViewOrder?.id === order.id) {
        setSelectedViewOrder(null);
      }
      setTimeout(() => setActionFeedback(null), 8000);
    } catch (err: any) {
      setActionFeedback(`অর্ডার কনফার্ম করতে সমস্যা হয়েছে: ${err?.message || 'Error'}`);
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updated: SiteSettings = {
        ...siteSettings,
        aiBotEnabled,
        aiBotName,
        aiBotWelcomeMessage,
        aiBotAllowOrdering,
        officialWhatsAppAgentNumber,
        whatsappNumber: officialWhatsAppAgentNumber,
        whatsappSuperAdminNumber,
        telegramBotUsername,
        messengerLink,
        aiBotPrompt,
        chatBotRules,
      };

      await onUpdateSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save AI Bot settings', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Live Test Chat handler
  const handleSendTestMessage = async () => {
    const text = testInput.trim();
    if (!text || isTestThinking) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user' as const,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTestMessages((prev) => [...prev, userMsg]);
    setTestInput('');
    setIsTestThinking(true);

    try {
      // 1. Check if matches any active ChatBot rule
      const ruleMatch = evaluateChatBotRules(text, chatBotRules, siteSettings, 'bn');
      if (ruleMatch) {
        const actionLinks: Array<{ label: string; url: string; type: string }> = [];
        if (ruleMatch.actionData?.quickButtons) {
          ruleMatch.actionData.quickButtons.forEach((btn: any) => {
            actionLinks.push({
              label: btn.label,
              url: btn.payload || '#',
              type: btn.action || 'button',
            });
          });
        }
        if (ruleMatch.actionType === 'connect_whatsapp') {
          actionLinks.push({
            label: `WhatsApp Agent (${officialWhatsAppAgentNumber})`,
            url: `https://wa.me/88${officialWhatsAppAgentNumber.replace(/[^0-9]/g, '')}`,
            type: 'whatsapp',
          });
        }

        const botMsg = {
          id: `b-${Date.now()}`,
          sender: 'bot' as const,
          text: `[Rule #${ruleMatch.matchedRule.priority}: ${ruleMatch.matchedRule.name}]\n\n${ruleMatch.replyText}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionLinks: actionLinks.length > 0 ? actionLinks : undefined,
        };

        setTestMessages((prev) => [...prev, botMsg]);
        setIsTestThinking(false);
        return;
      }

      // 2. Otherwise invoke Gemini AI chat
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          botSettings: {
            aiBotName,
            officialWhatsAppAgentNumber,
            whatsappSuperAdminNumber,
            telegramBotUsername,
            messengerLink,
          },
          productsList: products.slice(0, 15),
        }),
      });

      const data = await res.json();
      const botMsg = {
        id: `b-${Date.now()}`,
        sender: 'bot' as const,
        text: data.reply || 'আমি আপনাকে সাহায্য করতে প্রস্তুত।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionLinks: data.actionLinks,
      };

      setTestMessages((prev) => [...prev, botMsg]);
    } catch {
      setTestMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: `অফিসিয়াল WhatsApp এজেন্ট: ${officialWhatsAppAgentNumber} | সুপার অ্যাডমিন: ${whatsappSuperAdminNumber}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTestThinking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Compact Top Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 text-white border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Chat Bot Management
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Gemini 3.8 Flash Online
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                AI Shopping Assistant, Live Support & Order Automation Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className={`w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-95'
              }`}
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved successfully!</span>
                </>
              ) : isSaving ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Channels Row - Compact */}
        <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0">
              <SiWhatsapp className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-emerald-300 font-semibold truncate">Official Agent</p>
              <p className="font-mono font-bold text-white text-[11px] truncate">{officialWhatsAppAgentNumber}</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-purple-300 font-semibold truncate">Super Admin</p>
              <p className="font-mono font-bold text-white text-[11px] truncate">{whatsappSuperAdminNumber}</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#24A1DE]/20 text-[#24A1DE] flex items-center justify-center shrink-0">
              <SiTelegram className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-sky-300 font-semibold truncate">Telegram Bot</p>
              <p className="font-mono font-bold text-white text-[11px] truncate">@{telegramBotUsername}</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2 sm:p-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0084FF]/20 text-[#0084FF] flex items-center justify-center shrink-0">
              <SiMessenger className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-blue-300 font-semibold truncate">Messenger</p>
              <p className="font-bold text-white text-[11px] truncate">m.me/kenaxbd</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation - Single line on mobile without scrollbar */}
      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-1 shadow-2xs">
        {canAccessAi && (
          <button
            type="button"
            onClick={() => setActiveTab('kenax-bot')}
            className={`py-2 px-1 sm:px-3 text-[11px] sm:text-xs font-bold rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'kenax-bot'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs ring-1 ring-black/5 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">KenaX Bot</span>
          </button>
        )}

        {canManageRules && (
          <button
            type="button"
            onClick={() => setActiveTab('rules-matrix')}
            className={`py-2 px-1 sm:px-3 text-[11px] sm:text-xs font-bold rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'rules-matrix'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs ring-1 ring-black/5 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate">Rule Matrix</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {chatBotRules.filter((r) => r.enabled).length}
            </span>
          </button>
        )}

        {canViewOrders && (
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 sm:px-3 text-[11px] sm:text-xs font-bold rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs ring-1 ring-black/5 font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
            <span className="truncate">All Orders</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                pendingAiOrders.length > 0 || allPendingOrders.length > 0
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {pendingAiOrders.length > 0 ? pendingAiOrders.length : allPendingOrders.length}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('test-chat')}
          className={`py-2 px-1 sm:px-3 text-[11px] sm:text-xs font-bold rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-center ${
            activeTab === 'test-chat'
              ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs ring-1 ring-black/5 font-extrabold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
          <span className="truncate">Live Chat</span>
        </button>
      </div>

      {/* TAB 1: KenaX Bot Core Settings */}
      {activeTab === 'kenax-bot' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1.1 Activation & Toggles */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>KenaX Bot Engine & Order Settings</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* AI Bot Storefront Toggle */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Enable KenaX AI Bot</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Show AI Bot floating trigger on store</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiBotEnabled}
                      onChange={(e) => setAiBotEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Direct Order Booking via Bot Toggle */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <span>Smart Order via AI Bot</span>
                      <span className="bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[10px] font-black px-1.5 py-0.2 rounded">
                        Pending
                      </span>
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Allow customers to order in chat; orders save as Pending
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiBotAllowOrdering}
                      onChange={(e) => setAiBotAllowOrdering(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Bot Name & Welcome Greeting */}
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bot Display Name</label>
                  <input
                    type="text"
                    value={aiBotName}
                    onChange={(e) => setAiBotName(e.target.value)}
                    placeholder="KenaX AI Bot"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Welcome Greeting Message</label>
                  <textarea
                    rows={3}
                    value={aiBotWelcomeMessage}
                    onChange={(e) => setAiBotWelcomeMessage(e.target.value)}
                    placeholder="Welcome greeting in Bengali/English..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    This message is displayed to customers when opening the KenaX AI Chatbot for the first time.
                  </p>
                </div>
              </div>
            </div>

            {/* 1.2 OFFICIAL CONTACT NUMBERS & CHANNELS CONFIGURATION */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#25D366]" />
                  <span>Official Support Numbers & Channels</span>
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Provided by AI when customers ask for contacts</span>
              </div>

              <div className="space-y-4">
                {/* 1. Official WhatsApp Agent Number */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <SiWhatsapp className="w-4 h-4 text-[#25D366]" />
                      <span>Official WhatsApp Agent Number</span>
                      <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                        24/7 Agent
                      </span>
                    </label>
                    <a
                      href={`https://wa.me/88${officialWhatsAppAgentNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 font-bold flex items-center gap-1"
                    >
                      <span>Test Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={officialWhatsAppAgentNumber}
                      onChange={(e) => setOfficialWhatsAppAgentNumber(e.target.value)}
                      placeholder="01719143897"
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(officialWhatsAppAgentNumber, 'agent')}
                      className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {copiedKey === 'agent' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Default: <strong className="text-slate-800 dark:text-slate-200">01719143897</strong>. When user asks for agent, AI provides this number and a direct clickable WhatsApp chat link.
                  </p>
                </div>

                {/* 2. WhatsApp Super Admin Number */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>WhatsApp Super Admin Number</span>
                      <span className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800">
                        Direct Inbox
                      </span>
                    </label>
                    <a
                      href={`https://wa.me/88${whatsappSuperAdminNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-purple-700 dark:text-purple-400 hover:text-purple-900 font-bold flex items-center gap-1"
                    >
                      <span>Test Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={whatsappSuperAdminNumber}
                      onChange={(e) => setWhatsappSuperAdminNumber(e.target.value)}
                      placeholder="01887713212"
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(whatsappSuperAdminNumber, 'admin')}
                      className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {copiedKey === 'admin' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Default: <strong className="text-slate-800 dark:text-slate-200">01887713212</strong>. When requested, AI provides this number with direct clickable WhatsApp inbox redirection.
                  </p>
                </div>

                {/* 3. Telegram Bot Username & Messenger */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <SiTelegram className="w-4 h-4 text-[#24A1DE]" />
                        <span>Telegram Bot</span>
                      </label>
                      <a
                        href={`https://t.me/${telegramBotUsername.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-sky-700 dark:text-sky-400 hover:text-sky-900 font-bold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="text"
                      value={telegramBotUsername}
                      onChange={(e) => setTelegramBotUsername(e.target.value)}
                      placeholder="kenaxbd_bot"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 font-mono font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <SiMessenger className="w-4 h-4 text-[#0084FF]" />
                        <span>Facebook Messenger</span>
                      </label>
                      <a
                        href={messengerLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-700 dark:text-blue-400 hover:text-blue-900 font-bold flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="text"
                      value={messengerLink}
                      onChange={(e) => setMessengerLink(e.target.value)}
                      placeholder="https://m.me/kenaxbd"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 font-mono font-medium text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 1.3 Bot System Instructions & AI Persona */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>AI System Instructions & Persona</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Governs how Gemini AI behaves, answers delivery queries, and takes orders
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAiBotPrompt(defaultPrompt)}
                  className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              </div>

              <textarea
                rows={6}
                value={aiBotPrompt}
                onChange={(e) => setAiBotPrompt(e.target.value)}
                className="w-full p-3.5 text-xs rounded-2xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-100 leading-relaxed"
              />
            </div>
          </div>

          {/* Right Column: AI Bot Quick Stats & Knowledge Snapshot */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>AI Bot Status Summary</span>
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Model Engine</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Gemini 3.8 Flash
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                  <span className="text-xs text-slate-600 dark:text-slate-400">AI Order Taking</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      aiBotAllowOrdering
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {aiBotAllowOrdering ? 'Enabled (Pending)' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Total Products Loaded</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{products.length} Products</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Pending Orders</span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    {pendingOrders.length} Orders
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('test-chat')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Open Test Chat Simulator</span>
                </button>
              </div>
            </div>

            {/* Delivery Charge Info Snapshot */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/30 rounded-3xl p-6 border border-emerald-200/80 dark:border-emerald-800/80 space-y-3">
              <h4 className="font-extrabold text-xs text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>AI Automated Delivery Guidance</span>
              </h4>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                The AI automatically applies your store delivery fees when answering and creating orders:
              </p>
              <ul className="text-xs space-y-1.5 text-emerald-900 dark:text-emerald-200 font-semibold">
                <li className="flex items-center justify-between">
                  <span>ঢাকা সিটি (Inside Dhaka):</span>
                  <span className="font-mono font-bold">৳{siteSettings.insideDhakaDeliveryCharge || 60}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>ঢাকার বাইরে (Outside Dhaka):</span>
                  <span className="font-mono font-bold">৳{siteSettings.outsideDhakaDeliveryCharge || 120}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>ক্যাশ অন ডেলিভারি (COD):</span>
                  <span className="text-emerald-700 dark:text-emerald-300">উপলব্ধ</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Rule Matrix & Trigger Automation */}
      {activeTab === 'rules-matrix' && (
        <AdminChatBotRuleMatrix
          rules={chatBotRules}
          onChangeRules={handleChangeRules}
          siteSettings={siteSettings}
          onSaveAll={handleSaveSettings}
          isSaving={isSaving}
          canManageRules={canManageRules}
        />
      )}

      {/* TAB 3: AI Orders Placed (Status: Pending & Confirmed Management) */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4 sm:space-y-5">
          {/* Header & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  AI Bot Orders Management
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review and quickly confirm customer orders placed through KenaX AI Bot.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Pending: <strong>{pendingAiOrders.length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Confirmed: <strong>{confirmedAiOrders.length}</strong></span>
              </div>
              {onNavigateToConfirmedOrders && (
                <button
                  type="button"
                  onClick={onNavigateToConfirmedOrders}
                  className="px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Open Confirmed Orders Directory"
                >
                  <span>Confirmed Orders</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{actionFeedback}</span>
              </div>
              {onNavigateToConfirmedOrders && (
                <button
                  type="button"
                  onClick={onNavigateToConfirmedOrders}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <span>View in Confirmed</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Sub-filter Switcher - Compact single line on mobile and desktop */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setAiOrdersFilter('pending_ai')}
              className={`py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 text-center truncate ${
                aiOrdersFilter === 'pending_ai'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <Clock className="w-3 h-3 shrink-0 hidden sm:inline" />
              <span className="truncate">Pending AI ({pendingAiOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAiOrdersFilter('confirmed_ai')}
              className={`py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 text-center truncate ${
                aiOrdersFilter === 'confirmed_ai'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <CheckCircle className="w-3 h-3 shrink-0 hidden sm:inline" />
              <span className="truncate">Confirmed AI ({confirmedAiOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAiOrdersFilter('all_ai')}
              className={`py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 text-center truncate ${
                aiOrdersFilter === 'all_ai'
                  ? 'bg-slate-900 dark:bg-slate-950 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <ShoppingBag className="w-3 h-3 shrink-0 hidden sm:inline" />
              <span className="truncate">All AI ({allAiOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAiOrdersFilter('all_pending')}
              className={`py-1.5 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 text-center truncate ${
                aiOrdersFilter === 'all_pending'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <span className="truncate">Store Pending ({allPendingOrders.length})</span>
            </button>
          </div>

          {/* Orders Content */}
          {(() => {
            const currentOrdersList =
              aiOrdersFilter === 'pending_ai'
                ? pendingAiOrders
                : aiOrdersFilter === 'confirmed_ai'
                ? confirmedAiOrders
                : aiOrdersFilter === 'all_ai'
                ? allAiOrders
                : allPendingOrders;

            if (currentOrdersList.length === 0) {
              return (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {aiOrdersFilter === 'pending_ai'
                      ? 'No Pending AI Orders'
                      : aiOrdersFilter === 'confirmed_ai'
                      ? 'No Confirmed AI Orders Yet'
                      : aiOrdersFilter === 'all_ai'
                      ? 'No AI Orders Found'
                      : 'No Pending Orders in Store'}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-md mx-auto">
                    {allPendingOrders.length > 0 && aiOrdersFilter === 'pending_ai' ? (
                      <span>
                        There are <strong>{allPendingOrders.length} pending orders</strong> from other channels.{' '}
                        <button
                          type="button"
                          onClick={() => setAiOrdersFilter('all_pending')}
                          className="text-emerald-700 dark:text-emerald-400 underline font-bold cursor-pointer hover:text-emerald-800"
                        >
                          View all pending orders
                        </button>
                      </span>
                    ) : (
                      'When customers place orders via AI Chatbot or website, they will appear here for instant 1-click confirmation.'
                    )}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/50">
                        <th className="p-3 font-bold">Order ID</th>
                        <th className="p-3 font-bold">Customer Name</th>
                        <th className="p-3 font-bold">Phone Number</th>
                        <th className="p-3 font-bold">Delivery Address</th>
                        <th className="p-3 font-bold">Products</th>
                        <th className="p-3 font-bold">Total (BDT)</th>
                        <th className="p-3 font-bold">Status</th>
                        <th className="p-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {currentOrdersList.map((ord) => {
                        const isPending = isOrderPending(ord);
                        const isConfirmed = isOrderConfirmed(ord);
                        const phone = ord.deliveryMobile || ord.customerMobile || '';
                        const cleanPhone = phone.replace(/[^0-9]/g, '');

                        return (
                          <tr key={ord.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span>#{ord.id}</span>
                                {isAiOrder(ord) && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold inline-flex items-center gap-0.5">
                                    <Bot className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                    <span>Ordered by KenaX Bot</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 block mt-0.5">
                                {new Date(ord.createdAt || Date.now()).toLocaleDateString('en-GB')}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                              {ord.deliveryName || ord.customerName}
                            </td>
                            <td className="p-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <a href={`tel:${phone}`} className="hover:underline text-slate-800 dark:text-slate-200">
                                  {phone}
                                </a>
                                {cleanPhone && (
                                  <a
                                    href={`https://wa.me/880${cleanPhone.replace(/^0+/, '')}?text=${encodeURIComponent(
                                      `Hello ${ord.deliveryName || ord.customerName}, contacting regarding order #${ord.id}.`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
                                    title="WhatsApp Chat"
                                  >
                                    <SiWhatsapp className="w-3 h-3 text-[#25D366]" />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                              {ord.fullAddress || ord.deliveryAddress || `${ord.district || ''}, ${ord.division || ''}`}
                            </td>
                            <td className="p-3 font-medium text-slate-700 dark:text-slate-300 max-w-xs truncate">
                              {ord.items && ord.items.length > 0
                                ? ord.items.map((i) => `${i.productName || i.name} (x${i.quantity})`).join(', ')
                                : 'Product Item'}
                            </td>
                            <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400 font-mono whitespace-nowrap">
                              <div>৳{ord.totalAmount?.toLocaleString()}</div>
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                {ord.paymentMethod || 'COD'}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              {isPending ? (
                                <span className="bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 flex items-center gap-1 w-fit">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                              ) : isConfirmed ? (
                                <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 w-fit">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>{ord.orderStatus || 'Confirmed'}</span>
                                </span>
                              ) : (
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 flex items-center gap-1 w-fit">
                                  <span>{ord.orderStatus}</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Confirm Button for Pending Orders */}
                                {isPending && onUpdateOrderStatus && (
                                  <button
                                    type="button"
                                    disabled={confirmingOrderId === ord.id}
                                    onClick={() => handleConfirmOrder(ord)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                    title="Confirm this order (moves to Confirmed Orders)"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>
                                      {confirmingOrderId === ord.id ? 'Confirming...' : 'Confirm Order'}
                                    </span>
                                  </button>
                                )}

                                {/* If already Confirmed, quick link to Confirmed Orders directory */}
                                {isConfirmed && onNavigateToConfirmedOrders && (
                                  <button
                                    type="button"
                                    onClick={onNavigateToConfirmedOrders}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                                    title="View in Confirmed Orders directory"
                                  >
                                    <span>View in Confirmed</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}

                                {/* View Details Modal Trigger */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedViewOrder(ord)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                                  title="View Order Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Details</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden space-y-3">
                  {currentOrdersList.map((ord) => {
                    const isPending = isOrderPending(ord);
                    const isConfirmed = isOrderConfirmed(ord);
                    const phone = ord.deliveryMobile || ord.customerMobile || '';
                    const cleanPhone = phone.replace(/[^0-9]/g, '');

                    return (
                      <div
                        key={ord.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">#{ord.id}</span>
                            {isAiOrder(ord) && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-bold inline-flex items-center gap-0.5">
                                <Bot className="w-2.5 h-2.5 text-indigo-600" />
                                <span>Ordered by KenaX Bot</span>
                              </span>
                            )}
                          </div>
                          {isPending ? (
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          ) : isConfirmed ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>Confirmed</span>
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                              {ord.orderStatus}
                            </span>
                          )}
                        </div>

                        <div className="text-xs space-y-0.5 text-slate-700">
                          <p className="font-bold text-slate-900 text-sm">
                            {ord.deliveryName || ord.customerName}
                          </p>
                          <div className="flex items-center gap-2 text-slate-600 font-mono">
                            <span>{phone}</span>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/880${cleanPhone.replace(/^0+/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#25D366] font-bold flex items-center gap-1"
                              >
                                <SiWhatsapp className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                          <p className="text-slate-500 text-[11px] leading-relaxed truncate">
                            {ord.fullAddress || ord.deliveryAddress || `${ord.district || ''}, ${ord.division || ''}`}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px]">Total:</span>{' '}
                            <strong className="text-emerald-700 font-bold text-sm">৳{ord.totalAmount}</strong>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {ord.paymentMethod || 'COD'}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          {isPending && onUpdateOrderStatus && (
                            <button
                              type="button"
                              disabled={confirmingOrderId === ord.id}
                              onClick={() => handleConfirmOrder(ord)}
                              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{confirmingOrderId === ord.id ? 'Confirming...' : 'Confirm Order'}</span>
                            </button>
                          )}

                          {isConfirmed && onNavigateToConfirmedOrders && (
                            <button
                              type="button"
                              onClick={onNavigateToConfirmedOrders}
                              className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1 border border-indigo-200 cursor-pointer"
                            >
                              <span>View in Confirmed</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedViewOrder(ord)}
                            className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Quick Order Details Modal */}
          {selectedViewOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-sm text-slate-900">
                          Order Details #{selectedViewOrder.id}
                        </h4>
                        {isAiOrder(selectedViewOrder) && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold inline-flex items-center gap-0.5">
                            <Bot className="w-2.5 h-2.5 text-indigo-600" />
                            <span>Ordered by KenaX Bot</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(selectedViewOrder.createdAt || Date.now()).toLocaleString('en-GB')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedViewOrder(null)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Customer Information */}
                <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1.5 text-xs">
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedViewOrder.deliveryName || selectedViewOrder.customerName}
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 font-mono">
                    <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedViewOrder.deliveryMobile || selectedViewOrder.customerMobile}</span>
                  </div>
                  <div className="text-slate-600 leading-relaxed pt-1 border-t border-slate-200/60">
                    <strong className="text-slate-700">Address:</strong>{' '}
                    {selectedViewOrder.fullAddress ||
                      selectedViewOrder.deliveryAddress ||
                      `${selectedViewOrder.district || ''}, ${selectedViewOrder.division || ''}`}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Ordered Products
                  </h5>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                    {selectedViewOrder.items && selectedViewOrder.items.length > 0 ? (
                      selectedViewOrder.items.map((item, idx) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-800">{item.productName || item.name}</p>
                            <span className="text-[11px] text-slate-400">Quantity: {item.quantity}</span>
                          </div>
                          <div className="font-mono font-bold text-slate-900">
                            ৳{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-slate-500">Custom Item</div>
                    )}
                  </div>
                </div>

                {/* Total & Delivery breakdown */}
                <div className="bg-emerald-50/60 p-3.5 rounded-2xl space-y-1.5 text-xs text-emerald-950 font-semibold border border-emerald-100">
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span className="font-mono font-bold">৳{selectedViewOrder.deliveryCharge || 0}</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200/60 pt-1.5 text-sm font-extrabold text-emerald-900">
                    <span>Total Amount:</span>
                    <span className="font-mono text-base font-black">
                      ৳{selectedViewOrder.totalAmount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-800">
                    <span>Payment Method:</span>
                    <span>{selectedViewOrder.paymentMethod || 'Cash on Delivery'}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-emerald-800">
                    <span>Current Status:</span>
                    <span className="font-bold">{selectedViewOrder.orderStatus}</span>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  {isOrderPending(selectedViewOrder) && onUpdateOrderStatus ? (
                    <button
                      type="button"
                      disabled={confirmingOrderId === selectedViewOrder.id}
                      onClick={() => handleConfirmOrder(selectedViewOrder)}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {confirmingOrderId === selectedViewOrder.id
                          ? 'Confirming...'
                          : 'Confirm Order (Move to Confirmed)'}
                      </span>
                    </button>
                  ) : (
                    onNavigateToConfirmedOrders && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedViewOrder(null);
                          onNavigateToConfirmedOrders();
                        }}
                        className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <span>View in Confirmed Orders</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )
                  )}

                  {onPrintInvoice && (
                    <button
                      type="button"
                      onClick={() => onPrintInvoice(selectedViewOrder)}
                      className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Invoice</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedViewOrder(null)}
                    className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Live Interactive Test Simulator */}
      {activeTab === 'test-chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[560px]">
            {/* Simulator Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">{aiBotName} (Live Simulator)</h4>
                  <p className="text-[10px] text-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Gemini 3.8 Flash Online</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setTestMessages([
                    {
                      id: `w-${Date.now()}`,
                      sender: 'bot',
                      text: `চ্যাট রিসেট করা হয়েছে। আমি ${aiBotName}। কীভাবে সাহায্য করতে পারি?`,
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }
                className="text-[11px] text-slate-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Chat</span>
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC] dark:bg-slate-950">
              {testMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 shadow-sm rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Action Links Buttons if any */}
                    {msg.actionLinks && msg.actionLinks.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                        {msg.actionLinks.map((al, idx) => (
                          <a
                            key={idx}
                            href={al.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                          >
                            {al.type === 'agent' || al.type === 'super-admin' ? (
                              <SiWhatsapp className="w-3.5 h-3.5 text-[#25D366]" />
                            ) : al.type === 'telegram' ? (
                              <SiTelegram className="w-3.5 h-3.5 text-[#24A1DE]" />
                            ) : (
                              <SiMessenger className="w-3.5 h-3.5 text-[#0084FF]" />
                            )}
                            <span>{al.label}</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isTestThinking && (
                <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit text-xs text-slate-500 dark:text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                  <span>KenaX Bot ভাবছে...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTestMessage()}
                placeholder="যেমন: এজেন্ট নম্বর দাও, অথবা 'Redmi Note 13 অর্ডার করতে চাই'..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={isTestThinking || !testInput.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Prompts to Try */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Click to Test Prompts</span>
            </h4>
            <div className="space-y-2">
              {[
                'WhatsApp এজেন্ট নম্বর কত?',
                'WhatsApp সুপার অ্যাডমিন নম্বর দাও',
                'টেলিগ্রাম বট লিংক দাও',
                'ডেলিভারি চার্জ কত?',
                'আমি Redmi Buds 5 অর্ডার করতে চাই',
                'ক্যাশ অন ডেলিভারি আছে কি?',
              ].map((promptText, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setTestInput(promptText);
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:border-emerald-200 dark:hover:border-emerald-800 text-xs text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>{promptText}</span>
                  <Send className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
