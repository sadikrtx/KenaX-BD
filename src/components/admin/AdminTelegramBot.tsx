import React, { useState, useEffect } from 'react';
import {
  Bot,
  Send,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Sliders,
  Sparkles,
  Info,
  Clock,
  UserCheck,
  ShoppingCart,
  Users,
  Eye,
  FileText,
  Key,
  ShieldAlert,
  ArrowRight,
  Package,
  Megaphone,
  Tag,
  Ticket,
  Radio,
  Share2,
  X,
  Edit3,
  Lock,
  Unlock,
  Save,
  CheckCheck,
  EyeOff,
  Smartphone,
} from 'lucide-react';
import {
  TelegramBotSettings,
  TelegramTemplate,
  TelegramEventType,
  TelegramLog,
  Order,
  Product,
  UserRole,
  StaffUser,
} from '../../types';
import {
  DEFAULT_TELEGRAM_BOT_SETTINGS,
  DEFAULT_TELEGRAM_TEMPLATES,
  getTelegramSettingsFromDB,
  getTelegramSettingsSync,
  saveTelegramSettingsToDB,
  subscribeToTelegramSettings,
  testTelegramBotConnection,
  sendTelegramMessage,
  sendTelegramPhoto,
  formatTelegramMessage,
  getTelegramLogsFromDB,
  getStatusInfo,
  triggerTelegramNewProductWorkflow,
  triggerTelegramProductDiscountWorkflow,
} from '../../lib/telegramBotService';
import { hasPermission } from '../../lib/permissions';

interface AdminTelegramBotProps {
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  orders: Order[];
  products?: Product[];
  onRecordAudit?: (action: string, category: string, target: string, details: string) => void;
}

export const AdminTelegramBot: React.FC<AdminTelegramBotProps> = ({
  currentRole,
  currentStaff,
  orders,
  products = [],
  onRecordAudit,
}) => {
  // Synchronous initialization prevents any blank flash or lost settings on reload
  const [settings, setSettings] = useState<TelegramBotSettings>(() => getTelegramSettingsSync());
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<TelegramEventType>('admin_new_order');
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'miniapp' | 'channel' | 'templates' | 'quick-sender' | 'logs'>('settings');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);

  // Lock / Edit states for persistent settings
  const [isEditingToken, setIsEditingToken] = useState<boolean>(() => !getTelegramSettingsSync().botToken);
  const [isEditingSuperAdmin, setIsEditingSuperAdmin] = useState<boolean>(() => !getTelegramSettingsSync().superAdminChatId);
  const [isEditingAdminChats, setIsEditingAdminChats] = useState<boolean>(() => !getTelegramSettingsSync().adminChatIds || getTelegramSettingsSync().adminChatIds.length === 0);
  const [isEditingChannel, setIsEditingChannel] = useState<boolean>(() => !getTelegramSettingsSync().channelId);
  const [showTokenValue, setShowTokenValue] = useState<boolean>(false);

  // Bot Connection Testing
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    tested: boolean;
    success: boolean;
    botInfo?: { id: number; firstName: string; username: string };
    error?: string;
  } | null>(null);

  // Quick Sender State
  const [testChatId, setTestChatId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id || '');
  const [testSending, setTestSending] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ success: boolean; message?: string } | null>(null);

  // Channel Test Broadcast State
  const [selectedChannelProduct, setSelectedChannelProduct] = useState<Product | null>(products[0] || null);
  const [channelBroadcasting, setChannelBroadcasting] = useState(false);
  const [channelBroadcastResult, setChannelBroadcastResult] = useState<{ success: boolean; message?: string } | null>(null);

  // Logs
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const canViewTelegram = hasPermission(currentRole, currentStaff?.permissions, 'telegram.view');
  const canSendTelegram = hasPermission(currentRole, currentStaff?.permissions, 'telegram.send');
  const canManageTelegramRules = hasPermission(currentRole, currentStaff?.permissions, 'telegram.rules');
  const canManageTelegramTemplates = hasPermission(currentRole, currentStaff?.permissions, 'telegram.templates');
  const canManageTelegramSettings = hasPermission(currentRole, currentStaff?.permissions, 'telegram.settings');
  const canEdit = canManageTelegramSettings;

  // Auto-switch subtab if active subtab is restricted
  useEffect(() => {
    if (activeSubTab === 'settings' && !canManageTelegramSettings) {
      if (canSendTelegram) setActiveSubTab('quick-sender');
      else if (canManageTelegramTemplates) setActiveSubTab('templates');
      else if (canViewTelegram) setActiveSubTab('miniapp');
    } else if (activeSubTab === 'templates' && !canManageTelegramTemplates) {
      if (canManageTelegramSettings) setActiveSubTab('settings');
      else if (canSendTelegram) setActiveSubTab('quick-sender');
      else if (canViewTelegram) setActiveSubTab('miniapp');
    } else if (activeSubTab === 'quick-sender' && !canSendTelegram) {
      if (canManageTelegramSettings) setActiveSubTab('settings');
      else if (canManageTelegramTemplates) setActiveSubTab('templates');
      else if (canViewTelegram) setActiveSubTab('miniapp');
    }
  }, [canViewTelegram, canSendTelegram, canManageTelegramRules, canManageTelegramTemplates, canManageTelegramSettings, activeSubTab]);

  // Load Settings and sync on Mount
  useEffect(() => {
    // 1. Instant local read
    const initialLocal = getTelegramSettingsSync();
    setSettings((prev) => ({
      ...DEFAULT_TELEGRAM_BOT_SETTINGS,
      ...prev,
      ...initialLocal,
    }));
    if (initialLocal.botToken) setIsEditingToken(false);
    if (initialLocal.superAdminChatId) setIsEditingSuperAdmin(false);
    if (initialLocal.adminChatIds && initialLocal.adminChatIds.length > 0) setIsEditingAdminChats(false);
    if (initialLocal.channelId) setIsEditingChannel(false);

    if (initialLocal.superAdminChatId && !testChatId) {
      setTestChatId(initialLocal.superAdminChatId);
    }

    // 2. Fetch remote DB updates
    getTelegramSettingsFromDB().then((data) => {
      setSettings((prev) => ({
        ...DEFAULT_TELEGRAM_BOT_SETTINGS,
        ...prev,
        ...data,
        customerNotifyStatuses: {
          ...DEFAULT_TELEGRAM_BOT_SETTINGS.customerNotifyStatuses,
          ...(prev.customerNotifyStatuses || {}),
          ...(data.customerNotifyStatuses || {}),
        },
        templates: {
          ...DEFAULT_TELEGRAM_TEMPLATES,
          ...(prev.templates || {}),
          ...(data.templates || {}),
        },
      }));
      if (data.botToken) setIsEditingToken(false);
      if (data.superAdminChatId) setIsEditingSuperAdmin(false);
      if (data.adminChatIds && data.adminChatIds.length > 0) setIsEditingAdminChats(false);
      if (data.channelId) setIsEditingChannel(false);

      if (data.superAdminChatId && !testChatId) {
        setTestChatId(data.superAdminChatId);
      }
    });

    // 3. Realtime subscription
    const unsub = subscribeToTelegramSettings((live) => {
      setSettings((prev) => ({
        ...DEFAULT_TELEGRAM_BOT_SETTINGS,
        ...prev,
        ...live,
      }));
    });

    loadLogs();

    return () => unsub();
  }, []);

  useEffect(() => {
    if (products.length > 0 && !selectedChannelProduct) {
      setSelectedChannelProduct(products[0]);
    }
  }, [products]);

  const loadLogs = async () => {
    const data = await getTelegramLogsFromDB();
    setLogs(data);
  };

  const handleTestConnection = async () => {
    if (!settings.botToken.trim()) {
      setConnectionResult({
        tested: true,
        success: false,
        error: 'Please enter a Bot Token from @BotFather first.',
      });
      return;
    }

    setTestingConnection(true);
    setConnectionResult(null);

    const res = await testTelegramBotConnection(settings.botToken);
    setTestingConnection(false);

    if (res.success && res.botInfo) {
      setConnectionResult({
        tested: true,
        success: true,
        botInfo: res.botInfo,
      });
      const updated = {
        ...settings,
        botUsername: res.botInfo.username || settings.botUsername,
        enabled: true,
      };
      setSettings(updated);
      setIsEditingToken(false);
      // Automatically persist to Server and Firestore immediately so it's permanent
      await saveTelegramSettingsToDB(updated);
      setSaveToastMessage(`✅ Telegram Bot Connected: ${res.botInfo.firstName} (@${res.botInfo.username}) এবং সেটিংস পার্মানেন্টলি সেভ হয়েছে!`);
      setTimeout(() => setSaveToastMessage(null), 6000);
    } else {
      setConnectionResult({
        tested: true,
        success: false,
        error: res.error || 'Connection failed. Check token validity.',
      });
    }
  };

  const handleQuickSaveToken = async () => {
    if (!settings.botToken.trim()) return;
    setIsEditingToken(false);
    await saveTelegramSettingsToDB(settings);
    setSaveToastMessage('✅ বট এপিআই টোকেন কনফার্ম ও ক্লাউডে পার্মানেন্টলি সেভ হয়েছে!');
    setTimeout(() => setSaveToastMessage(null), 5000);
  };

  const handleQuickSaveSuperAdmin = async () => {
    if (!settings.superAdminChatId.trim()) return;
    setIsEditingSuperAdmin(false);
    await saveTelegramSettingsToDB(settings);
    setSaveToastMessage('✅ সুপার অ্যাডমিন চ্যাট আইডি কনফার্ম ও ক্লাউডে পার্মানেন্টলি সেভ হয়েছে!');
    setTimeout(() => setSaveToastMessage(null), 5000);
  };

  const handleQuickSaveAdminChats = async () => {
    setIsEditingAdminChats(false);
    await saveTelegramSettingsToDB(settings);
    setSaveToastMessage('✅ ম্যানেজার ও গ্রুপ আইডি কনফার্ম ও ক্লাউডে পার্মানেন্টলি সেভ হয়েছে!');
    setTimeout(() => setSaveToastMessage(null), 5000);
  };

  const handleQuickSaveChannel = async () => {
    setIsEditingChannel(false);
    await saveTelegramSettingsToDB(settings);
    setSaveToastMessage('✅ পাবলিক চ্যানেল আইডি কনফার্ম ও ক্লাউডে পার্মানেন্টলি সেভ হয়েছে!');
    setTimeout(() => setSaveToastMessage(null), 5000);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);

    const success = await saveTelegramSettingsToDB(settings);
    setSaving(false);

    if (success) {
      setSaveSuccess(true);
      if (settings.botToken) setIsEditingToken(false);
      if (settings.superAdminChatId) setIsEditingSuperAdmin(false);
      if (settings.adminChatIds && settings.adminChatIds.length > 0) setIsEditingAdminChats(false);
      if (settings.channelId) setIsEditingChannel(false);

      setSaveToastMessage('✅ টেলিগ্রাম বট, চ্যাট আইডি ও চ্যানেল সেটিংস সফলভাবে ক্লাউড ও সার্ভারে পার্মানেন্টলি সেভ হয়েছে! (Settings Permanently Saved Across All Devices)');
      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
      setTimeout(() => {
        setSaveToastMessage(null);
      }, 6000);

      onRecordAudit?.(
        'Telegram Bot Settings Updated',
        'settings',
        'telegram-bot',
        `Updated Telegram bot tokens, chat IDs, channel ${settings.channelId || 'N/A'}, and alert templates`
      );
    } else {
      setSaveToastMessage('❌ সেটিংস সেভ করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
      setTimeout(() => setSaveToastMessage(null), 5000);
    }
  };

  const handleTemplateChange = (text: string) => {
    setSettings((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [selectedTemplateKey]: {
          ...(prev.templates[selectedTemplateKey] || DEFAULT_TELEGRAM_TEMPLATES[selectedTemplateKey]),
          message: text,
        },
      },
    }));
  };

  const handleResetTemplate = () => {
    setSettings((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [selectedTemplateKey]: DEFAULT_TELEGRAM_TEMPLATES[selectedTemplateKey],
      },
    }));
  };

  const handleCopyVar = (v: string) => {
    navigator.clipboard.writeText(v);
    setCopiedVar(v);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  // Sample Data for Previews
  const currentOrder: Order = orders.find((o) => o.id === selectedOrderId) || orders[0] || {
    id: 'KNX-882194',
    customerId: 'cust-demo',
    customerName: 'তানভীর আহমেদ (Tanvir)',
    customerEmail: 'tanvir@gmail.com',
    customerMobile: '01712345678',
    deliveryName: 'তানভীর আহমেদ',
    deliveryMobile: '01712345678',
    division: 'Dhaka',
    district: 'Dhaka City',
    upazila: 'Dhanmondi',
    area: 'Road 27',
    fullAddress: 'House 45, Road 27, Dhanmondi, Dhaka',
    items: [
      {
        productId: 'p1',
        productName: 'Ultra Smart Watch AMOLED Display',
        name: 'Ultra Smart Watch AMOLED Display',
        productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200',
        price: 2450,
        quantity: 1,
        total: 2450,
      },
      {
        productId: 'p2',
        productName: 'BassPro ANC Earbuds TWS',
        name: 'BassPro ANC Earbuds TWS',
        productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200',
        price: 1850,
        quantity: 2,
        total: 3700,
      },
    ],
    subtotal: 6150,
    deliveryCharge: 60,
    discount: 200,
    totalAmount: 6010,
    paidAmount: 60,
    dueAmount: 5950,
    paymentMethod: 'bKash',
    paymentStatus: 'Pending',
    orderStatus: 'Pending',
    courierName: 'Steadfast Courier',
    trackingNumber: 'STF-8492048',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: [],
  };

  const sampleItemsList = currentOrder.items
    ?.map(
      (item, idx) =>
        `   ${idx + 1}. <b>${item.productName || item.name}</b>\n      └ <i>${item.quantity} pcs × ৳${(item.price || 0)?.toLocaleString()} = ৳${((item.price || 0) * item.quantity)?.toLocaleString()}</i>`
    )
    .join('\n');

  const statusMeta = getStatusInfo('Confirmed');

  const sampleProduct: Product = selectedChannelProduct || products[0] || {
    id: 'prod-ultra-watch',
    sku: 'KNX-WCH-01',
    name: 'Ultra Watch 9 Pro AMOLED Display',
    brand: 'KenaX Tech',
    price: 2450,
    originalPrice: 3200,
    category: 'Smart Watches',
    productType: 'own',
    stock: 45,
    rating: 4.8,
    reviewsCount: 24,
    description: 'Super AMOLED Curved Display, Bluetooth calling, 7-day battery life, and IP68 waterproof rating.',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500'],
  };

  const sampleVars: Record<string, string> = {
    '{{orderId}}': currentOrder.id,
    '{{customerName}}': currentOrder.customerName,
    '{{customerPhone}}': currentOrder.customerMobile || '01712345678',
    '{{customerEmail}}': currentOrder.customerEmail || 'customer@gmail.com',
    '{{fullAddress}}': currentOrder.fullAddress || `${currentOrder.district}, ${currentOrder.division}`,
    '{{itemsList}}': sampleItemsList,
    '{{subtotal}}': (currentOrder.subtotal || 6150)?.toLocaleString(),
    '{{deliveryCharge}}': (currentOrder.deliveryCharge || 60)?.toLocaleString(),
    '{{discount}}': (currentOrder.discount || 200)?.toLocaleString(),
    '{{totalAmount}}': currentOrder.totalAmount?.toLocaleString(),
    '{{paidAmount}}': (currentOrder.paidAmount || 60)?.toLocaleString(),
    '{{dueAmount}}': (currentOrder.dueAmount || 5950)?.toLocaleString(),
    '{{paymentMethod}}': currentOrder.paymentMethod,
    '{{paymentStatus}}': currentOrder.paymentStatus,
    '{{orderDate}}': new Date(currentOrder.createdAt)?.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    '{{siteName}}': 'KenaX BD',
    '{{staffName}}': currentStaff?.name || 'Sadik Rahman (Admin)',
    '{{staffRole}}': (currentStaff?.role || 'Moderator').toUpperCase(),
    '{{staffEmail}}': currentStaff?.email || 'admin@kenaxbd.com',
    '{{actionTime}}': new Date()?.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    '{{prevStatus}}': 'Pending',
    '{{newStatus}}': 'Confirmed',
    '{{statusEmoji}}': statusMeta.emoji,
    '{{statusMessage}}': statusMeta.message,
    '{{courierName}}': currentOrder.courierName || 'Steadfast Courier',
    '{{trackingNumber}}': currentOrder.trackingNumber || 'STF-8492048',
    '{{courierSection}}': `🚚 <b>Courier Partner:</b> Steadfast Courier\n🔢 <b>Tracking Number:</b> <code>STF-8492048</code>`,
    '{{helpline}}': '+880 1700-123456',
    // Product & Channel variables
    '{{productName}}': sampleProduct.name,
    '{{category}}': sampleProduct.category || 'Electronics',
    '{{sku}}': sampleProduct.sku || 'KNX-884',
    '{{price}}': sampleProduct.price?.toLocaleString(),
    '{{originalPrice}}': (sampleProduct.originalPrice || 3200)?.toLocaleString(),
    '{{originalPriceSection}}': `<s>৳${(sampleProduct.originalPrice || 3200)?.toLocaleString()}</s> <i>(Save ৳750 • 23% OFF)</i>`,
    '{{discountText}}': '23% OFF Special Deal!',
    '{{productDescription}}': '• Super AMOLED Display\n• 7-day battery life\n• IP68 Waterproof',
    '{{productLink}}': `https://kenaxbd.com/product/${sampleProduct.id}`,
    '{{stock}}': String(sampleProduct.stock || 45),
    '{{supplierName}}': sampleProduct.supplierName || 'In-House Warehouse',
    '{{channelBroadcastStatus}}': settings.channelId ? `✅ Broadcast to ${settings.channelId}` : 'ℹ️ No Channel Configured',
    '{{newPrice}}': sampleProduct.price?.toLocaleString(),
    '{{oldPrice}}': (sampleProduct.originalPrice || 3200)?.toLocaleString(),
    '{{saveAmount}}': '750',
    '{{discountPercent}}': '23',
    '{{couponCode}}': 'KENAX10',
    '{{discountValue}}': '10% DISCOUNT',
    '{{minSpend}}': '1,500',
    '{{minOrder}}': '1,500',
    '{{validityDate}}': 'March 31, 2026',
    '{{storeLink}}': 'https://kenaxbd.com',
    '{{promoType}}': 'Product Flash Sale',
    '{{promoIdentifier}}': sampleProduct.name,
    '{{discountSummary}}': '৳750 OFF (23% Discount)',
    '{{expiryInfo}}': 'Active on Product Catalog',
  };

  const activeTemplate = settings.templates[selectedTemplateKey] || DEFAULT_TELEGRAM_TEMPLATES[selectedTemplateKey] || {
    id: selectedTemplateKey,
    title: 'Template',
    banglaTitle: '',
    message: '',
    variables: [],
    enabled: true,
  };
  const renderedPreviewText = formatTelegramMessage(activeTemplate?.message || '', sampleVars);

  const handleSendTestMessage = async () => {
    if (!settings.botToken.trim()) {
      setTestSendResult({ success: false, message: 'Please enter a Bot Token first.' });
      return;
    }
    const targetChat = testChatId.trim();
    if (!targetChat) {
      setTestSendResult({ success: false, message: 'Please enter a target Chat ID.' });
      return;
    }

    setTestSending(true);
    setTestSendResult(null);

    const res = await sendTelegramMessage({
      botToken: settings.botToken,
      chatId: targetChat,
      text: renderedPreviewText,
      parseMode: 'HTML',
    });

    setTestSending(false);

    if (res.success) {
      setTestSendResult({
        success: true,
        message: `Message sent successfully to Telegram Chat ID: ${targetChat}`,
      });
      loadLogs();
    } else {
      setTestSendResult({
        success: false,
        message: res.error || 'Failed to send message to Telegram.',
      });
    }
  };

  // Live Channel Broadcast Test Handler
  const handleTestChannelBroadcast = async () => {
    if (!settings.botToken.trim()) {
      setChannelBroadcastResult({ success: false, message: 'Please configure and test your Bot Token first.' });
      return;
    }
    const channelTarget = settings.channelId?.trim();
    if (!channelTarget) {
      setChannelBroadcastResult({
        success: false,
        message: 'Please enter a Public Telegram Channel Username or Channel ID (e.g. @kenax_offers or -100...) first.',
      });
      return;
    }

    if (!selectedChannelProduct) {
      setChannelBroadcastResult({ success: false, message: 'Please select a product to broadcast.' });
      return;
    }

    setChannelBroadcasting(true);
    setChannelBroadcastResult(null);

    try {
      await triggerTelegramNewProductWorkflow({
        product: selectedChannelProduct,
        staffUser: currentStaff,
        customSettings: settings,
        supplierName: selectedChannelProduct.supplierName,
      });

      setChannelBroadcasting(false);
      setChannelBroadcastResult({
        success: true,
        message: `✅ Test product card successfully dispatched to channel ${channelTarget}!`,
      });
      loadLogs();
    } catch (err: any) {
      setChannelBroadcasting(false);
      setChannelBroadcastResult({
        success: false,
        message: err.message || 'Failed to broadcast to Telegram Channel.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner on Save */}
      {saveToastMessage && (
        <div
          className={`p-4 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-xl transition-all animate-in fade-in slide-in-from-top-4 duration-300 border ${
            saveToastMessage.startsWith('✅')
              ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/50 shadow-emerald-950/40'
              : 'bg-rose-950/90 text-rose-100 border-rose-500/50 shadow-rose-950/40'
          }`}
        >
          <div className="flex items-center gap-3">
            {saveToastMessage.startsWith('✅') ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{saveToastMessage}</span>
          </div>
          <button
            onClick={() => setSaveToastMessage(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 rounded-2xl p-6 border border-sky-800/40 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <Bot className="w-7 h-7 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-white">Telegram Bot & Channel Automation</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                  Live Chatbot & Broadcast Hub
                </span>
                {settings.botUsername && (
                  <a
                    href={`https://t.me/${settings.botUsername.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    @{settings.botUsername.replace('@', '')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {settings.channelId && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-950 text-indigo-300 border border-indigo-700/50 flex items-center gap-1">
                    <Megaphone className="w-3 h-3 text-indigo-400" />
                    Channel: {settings.channelId}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Automate real-time alerts for New Orders, Customer Statuses, Super Admin Staff Activity Tracking, and Public Channel Broadcasts for New Products, Deals & Promo Codes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSettings}
              disabled={saving || !canEdit}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-900/30'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/30 active:scale-95 disabled:opacity-50'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved!
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sub Navigation Pills */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
          {canManageTelegramSettings && (
            <button
              onClick={() => setActiveSubTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeSubTab === 'settings'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Bot Setup & Chat IDs
            </button>
          )}
          {canViewTelegram && (
            <button
              onClick={() => setActiveSubTab('miniapp')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeSubTab === 'miniapp'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-300" />
              Telegram Mini App & Store
            </button>
          )}
          {(canSendTelegram || canManageTelegramSettings) && (
            <button
              onClick={() => setActiveSubTab('channel')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeSubTab === 'channel'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              Public Channel Broadcast & Deals
            </button>
          )}
          {canManageTelegramTemplates && (
            <button
              onClick={() => setActiveSubTab('templates')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeSubTab === 'templates'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Message Templates & Emojis
            </button>
          )}
          {canSendTelegram && (
            <button
              onClick={() => setActiveSubTab('quick-sender')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeSubTab === 'quick-sender'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Live Test & Send
            </button>
          )}
          {canViewTelegram && (
            <button
              onClick={() => {
                setActiveSubTab('logs');
                loadLogs();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                activeSubTab === 'logs'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Dispatch Logs & Audit Trail ({logs.length})
            </button>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: BOT SETUP & CHAT IDS */}
      {activeSubTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bot API Credentials (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bot Token Configuration Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                      Telegram Bot API Token
                      {settings.botToken && !isEditingToken && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          কানেক্টেড ও সেভড
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Provided by Telegram @BotFather</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                  </label>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {settings.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Bot Token Display: Locked Mode */}
              {settings.botToken && !isEditingToken ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {settings.botUsername ? `@${settings.botUsername.replace('@', '')}` : 'Bot Token Configured'}
                      </span>
                      {settings.botUsername && (
                        <a
                          href={`https://t.me/${settings.botUsername.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-0.5 hover:underline"
                        >
                          ওপেন করুন <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingToken(true)}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        এডিট / পরিবর্তন করুন
                      </button>
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testingConnection}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {testingConnection ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            টেস্টিং...
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 text-amber-400" />
                            টেস্ট কানেকশন
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="font-mono text-xs text-slate-600 dark:text-slate-300 select-all truncate">
                      {showTokenValue
                        ? settings.botToken
                        : `${settings.botToken.substring(0, 10)}••••••••••••••••••••••••${settings.botToken.slice(-4)}`}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowTokenValue(!showTokenValue)}
                        title={showTokenValue ? 'Hide token' : 'Show token'}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer transition-colors"
                      >
                        {showTokenValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(settings.botToken);
                          setSaveToastMessage('✓ Bot Token কপি করা হয়েছে');
                          setTimeout(() => setSaveToastMessage(null), 3000);
                        }}
                        title="Copy token"
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    টোকেন সুরক্ষিত ও সেভড আছে। পরিবর্তনের জন্য <b>"এডিট / পরিবর্তন করুন"</b> বাটনে ক্লিক করুন।
                  </p>
                </div>
              ) : (
                /* Bot Token Input: Edit Mode */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Bot Token (HTTP API)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={settings.botToken}
                        onChange={(e) => setSettings((prev) => ({ ...prev, botToken: e.target.value }))}
                        placeholder="e.g. 7123456789:AAFk-yH7xQ938L... from @BotFather"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-hidden bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleTestConnection}
                          disabled={testingConnection || !settings.botToken.trim()}
                          className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all shadow-xs"
                        >
                          {testingConnection ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              টেস্টিং...
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                              টেস্ট ও কানেক্ট
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleQuickSaveToken}
                          disabled={!settings.botToken.trim()}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          কনফার্ম ও সেভ
                        </button>
                        {settings.botToken && (
                          <button
                            type="button"
                            onClick={() => setIsEditingToken(false)}
                            className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
                          >
                            বাতিল
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                      বট বানাতে: টেলিগ্রামে <b>@BotFather</b> সার্চ করে <code>/newbot</code> পাঠান, প্রাপ্ত API Token এখানে দিন। টেস্টে ক্লিক করলে স্বয়ংক্রিয়ভাবে কানেক্ট ও সেভ হবে।
                    </p>
                  </div>
                </div>
              )}

              {/* Test Connection Feedback Banner */}
              {connectionResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs border flex items-start gap-2.5 ${
                    connectionResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {connectionResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    {connectionResult.success && connectionResult.botInfo ? (
                      <div>
                        <p className="font-bold">
                          ✓ Telegram Bot Connected: {connectionResult.botInfo.firstName} (@{connectionResult.botInfo.username})
                        </p>
                        <p className="text-[11px] mt-0.5 opacity-90">
                          Bot ID: {connectionResult.botInfo.id} • ভেরিফাইড এবং স্বয়ংক্রিয়ভাবে পার্মানেন্টলি সেভ হয়েছে।
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold">Connection Failed</p>
                        <p className="text-[11px] mt-0.5">{connectionResult.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Target Chat IDs Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Authorized Telegram Chat IDs</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Specify who receives operational & audit alerts</p>
                  </div>
                </div>
              </div>

              {/* 1. Super Admin Chat ID (Special for Staff Activity) */}
              <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Super Admin Telegram Chat ID (Privileged Staff Audit)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                      SUPER ADMIN ONLY
                    </span>
                    {settings.superAdminChatId && !isEditingSuperAdmin && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> কনফার্মড
                      </span>
                    )}
                  </div>
                </div>

                {settings.superAdminChatId && !isEditingSuperAdmin ? (
                  <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span className="font-mono text-xs font-bold text-purple-950 dark:text-purple-200">
                        Chat ID: {settings.superAdminChatId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(settings.superAdminChatId);
                          setSaveToastMessage('✓ Super Admin Chat ID কপি করা হয়েছে');
                          setTimeout(() => setSaveToastMessage(null), 3000);
                        }}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer"
                        title="Copy ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingSuperAdmin(true)}
                        className="px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-950 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" /> এডিট
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settings.superAdminChatId}
                        onChange={(e) => setSettings((prev) => ({ ...prev, superAdminChatId: e.target.value }))}
                        placeholder="e.g. 1234567890 (Personal Telegram Chat ID)"
                        className="flex-1 px-3.5 py-2 rounded-lg border border-purple-300 dark:border-purple-700 font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleQuickSaveSuperAdmin}
                        disabled={!settings.superAdminChatId.trim()}
                        className="px-3.5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        কনফার্ম ও সেভ
                      </button>
                      {settings.superAdminChatId && (
                        <button
                          type="button"
                          onClick={() => setIsEditingSuperAdmin(false)}
                          className="px-2.5 py-2 rounded-lg border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 text-xs font-semibold cursor-pointer"
                        >
                          বাতিল
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-purple-700 dark:text-purple-300 leading-relaxed">
                  🔒 <b>Staff Activity Tracking:</b> Whenever an admin, manager, or moderator changes an order status, creates a product, adds a discount or coupon, this Chat ID receives the alert with <b>full staff identity</b> (Staff Name, Role, Email, action timestamp).
                </p>
              </div>

              {/* 2. Admin & Manager Chat IDs */}
              <div className="space-y-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Admin & Manager Chat IDs / Group ID
                  </label>
                  {settings.adminChatIds && settings.adminChatIds.length > 0 && !isEditingAdminChats && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 flex items-center gap-1">
                      <Check className="w-3 h-3 text-sky-600 dark:text-sky-400" /> কনফিগার ও কানেক্টেড ({settings.adminChatIds.length} টি)
                    </span>
                  )}
                </div>

                {settings.adminChatIds && settings.adminChatIds.length > 0 && !isEditingAdminChats ? (
                  <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {settings.adminChatIds?.map((id, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-mono text-xs font-semibold flex items-center gap-1"
                        >
                          👥 {id}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingAdminChats(true)}
                      className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> এডিট
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settings.adminChatIds.join(', ')}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            adminChatIds: e.target.value.split(',')?.map((s) => s.trim()).filter(Boolean),
                          }))
                        }
                        placeholder="e.g. 987654321, -100192837465 (Comma separated or Group ID)"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleQuickSaveAdminChats}
                        className="px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        কনফার্ম ও সেভ
                      </button>
                      {settings.adminChatIds && settings.adminChatIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsEditingAdminChats(false)}
                          className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                        >
                          বাতিল
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enter personal Chat IDs or Telegram Group/Channel IDs (e.g. <code>-100...</code>). Receives New Order & Customer registration alerts.
                </p>
              </div>

              {/* 3. Moderator Chat IDs */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Moderator / Staff Chat IDs (Optional)
                </label>
                <input
                  type="text"
                  value={(settings.moderatorChatIds || []).join(', ')}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      moderatorChatIds: e.target.value.split(',')?.map((s) => s.trim()).filter(Boolean),
                    }))
                  }
                  placeholder="e.g. 556677889"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-hidden bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Helper note on getting Chat ID */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">How to find your Telegram Chat ID:</span>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Open Telegram and search for <b>@userinfobot</b> or <b>@RawDataBot</b>. Press <code>/start</code> and it will immediately reply with your numeric <code>Id</code>. For groups/channels, add your bot as admin and send a message.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Automated Event Trigger Toggles (Right 1 col) */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Automation Triggers</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Toggle operational alerts</p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* 1. New Order Alert */}
                <div className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      New Order Notification
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Alerts Admin, Staff & Super Admin when customer places an order.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyAdminOnNewOrder}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, notifyAdminOnNewOrder: e.target.checked }))
                    }
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 dark:border-slate-700 focus:ring-sky-500 cursor-pointer mt-1"
                  />
                </div>

                {/* 2. New User Registration */}
                <div className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      New User Registration
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Alerts Admin & Moderator when a new user registers an account.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyAdminOnUserRegister}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, notifyAdminOnUserRegister: e.target.checked }))
                    }
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 dark:border-slate-700 focus:ring-sky-500 cursor-pointer mt-1"
                  />
                </div>

                {/* 3. Customer Order Placed Notification */}
                <div className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Customer Order Placed (Pending)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Sends Telegram message to customer with order summary and Pending status.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyCustomerOnOrderPlaced}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, notifyCustomerOnOrderPlaced: e.target.checked }))
                    }
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 dark:border-slate-700 focus:ring-sky-500 cursor-pointer mt-1"
                  />
                </div>

                {/* 4. Super Admin Staff Activity Alert */}
                <div className="py-3 flex items-start justify-between gap-3 bg-purple-50/50 dark:bg-purple-950/40 -mx-6 px-6">
                  <div>
                    <p className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      Super Admin Staff Order Activity Alert
                    </p>
                    <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
                      Includes staff name, role, email & status change (Pending ➔ Confirmed, etc.).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifySuperAdminOnStaffActivity}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, notifySuperAdminOnStaffActivity: e.target.checked }))
                    }
                    className="w-4 h-4 text-purple-600 rounded border-purple-300 dark:border-purple-700 focus:ring-purple-500 cursor-pointer mt-1"
                  />
                </div>

                {/* 5. Customer Status Updates */}
                <div className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Customer Status Transition Alerts
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Notifies customer on status change (Without internal staff info).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyCustomerOnStatusUpdate}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, notifyCustomerOnStatusUpdate: e.target.checked }))
                    }
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 dark:border-slate-700 focus:ring-sky-500 cursor-pointer mt-1"
                  />
                </div>
              </div>

              {/* Status checkboxes */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Customer Status Alerts Enabled:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(settings.customerNotifyStatuses)?.map(([stKey, isChecked]) => (
                    <label
                      key={stKey}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            customerNotifyStatuses: {
                              ...prev.customerNotifyStatuses,
                              [stKey]: e.target.checked,
                            },
                          }))
                        }
                        className="w-3.5 h-3.5 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                      />
                      <span className="capitalize font-medium text-slate-800 text-[11px]">{stKey}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: TELEGRAM MINI APP & CATALOG HUB */}
      {activeSubTab === 'miniapp' && (
        <div className="space-y-6">
          {/* Top Status & Store WebApp Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 border border-indigo-800/40 text-white shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Smartphone className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-white">Telegram Mini App & Instant Store</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
                      settings.telegramMiniAppEnabled !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${settings.telegramMiniAppEnabled !== false ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                      {settings.telegramMiniAppEnabled !== false ? 'Active Mini App' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Allows customers to browse products, select variations, add to cart, and place orders directly inside Telegram without leaving the app.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.telegramMiniAppEnabled !== false}
                    onChange={(e) => setSettings((prev) => ({ ...prev, telegramMiniAppEnabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
                <span className="text-xs font-semibold text-slate-200">
                  {settings.telegramMiniAppEnabled !== false ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* URL Display Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 flex items-center justify-between gap-3">
                <div className="overflow-hidden">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Store WebApp Target URL</span>
                  <span className="font-mono text-xs text-amber-300 truncate block">
                    {window.location.origin}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin);
                    setSaveToastMessage('✓ Store WebApp URL copied');
                    setTimeout(() => setSaveToastMessage(null), 3000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>

              <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 flex items-center justify-between gap-3">
                <div className="overflow-hidden">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Telegram Short App Link</span>
                  <span className="font-mono text-xs text-sky-300 truncate block">
                    {settings.botUsername ? `https://t.me/${settings.botUsername.replace('@', '')}?startapp=shop` : 'Configure Bot Username First'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!settings.botUsername}
                  onClick={() => {
                    if (!settings.botUsername) return;
                    const url = `https://t.me/${settings.botUsername.replace('@', '')}?startapp=shop`;
                    navigator.clipboard.writeText(url);
                    setSaveToastMessage('✓ Telegram Short Link copied');
                    setTimeout(() => setSaveToastMessage(null), 3000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Link
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Setup Steps & Mini App Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* BotFather Setup Guide */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">Quick BotFather Setup Guide (3 Steps)</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Configure the native Telegram bottom menu button in 60 seconds</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Open BotFather on Telegram</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Search for <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-sky-400 font-bold hover:underline">@BotFather</a> in Telegram and send the command <code>/mybots</code>. Select your bot <span className="font-bold text-slate-800 dark:text-slate-200">@{settings.botUsername?.replace('@', '') || 'YourBot'}</span>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Configure Menu Button</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        Click <span className="font-bold text-slate-800 dark:text-slate-200">Bot Settings</span> ➔ <span className="font-bold text-slate-800 dark:text-slate-200">Menu Button</span> ➔ <span className="font-bold text-slate-800 dark:text-slate-200">Configure menu button</span>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Paste WebApp URL & Set Button Title</p>
                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <p>When BotFather asks for the URL, paste your WebApp URL:</p>
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-800 dark:text-slate-200">
                          <span className="truncate">{window.location.origin}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.origin);
                              setSaveToastMessage('✓ URL Copied for BotFather');
                              setTimeout(() => setSaveToastMessage(null), 3000);
                            }}
                            className="text-sky-600 dark:text-sky-400 font-bold hover:underline shrink-0 ml-auto cursor-pointer"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="pt-1">Then set the button title to: <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-bold text-slate-900 dark:text-white">{settings.telegramMiniAppButtonTitle || '🛍️ Open KenaX Store'}</code></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini App Controls */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">Mini App Preferences & Feature Toggles</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Customize how the store behaves inside Telegram</p>
                  </div>
                </div>

                <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Button Title */}
                  <div className="pt-3 first:pt-0 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Telegram Bottom Menu Button Title
                    </label>
                    <input
                      type="text"
                      value={settings.telegramMiniAppButtonTitle || '🛍️ Open KenaX Store'}
                      onChange={(e) => setSettings((prev) => ({ ...prev, telegramMiniAppButtonTitle: e.target.value }))}
                      placeholder="e.g. 🛍️ Open KenaX Store"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      The text displayed on the persistent button at the bottom of the Telegram chat.
                    </p>
                  </div>

                  {/* Toggle: Auto-Fill Customer Details */}
                  <div className="pt-4 flex items-center justify-between gap-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Auto-Fill Customer Details from Telegram</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Automatically populates customer name & username during checkout</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.telegramMiniAppAutoFill !== false}
                        onChange={(e) => setSettings((prev) => ({ ...prev, telegramMiniAppAutoFill: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  {/* Toggle: Haptic Feedback */}
                  <div className="pt-4 flex items-center justify-between gap-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Haptic Vibration Feedback</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Provides tactile vibration feedback when tapping items & placing orders</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.telegramMiniAppHaptics !== false}
                        onChange={(e) => setSettings((prev) => ({ ...prev, telegramMiniAppHaptics: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  {/* Toggle: Auto Theme Sync */}
                  <div className="pt-4 flex items-center justify-between gap-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Telegram Native Dark/Light Theme Sync</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Automatically syncs color palette with customer's Telegram app theme</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.telegramMiniAppThemeSync !== false}
                        onChange={(e) => setSettings((prev) => ({ ...prev, telegramMiniAppThemeSync: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>

                  {/* Toggle: Track Order Button */}
                  <div className="pt-4 flex items-center justify-between gap-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white">Track Order on Telegram Link on Thank You Page</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Prominently invites web customers to connect with Telegram for live status updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={settings.telegramMiniAppTrackOrderButton !== false}
                        onChange={(e) => setSettings((prev) => ({ ...prev, telegramMiniAppTrackOrderButton: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={saving || !canEdit}
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Save Mini App Preferences
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col: Mobile Mockup Preview */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Telegram App Preview</h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">How your store appears inside the Telegram chat view</p>

                {/* Mobile Frame Container */}
                <div className="w-full max-w-[280px] mx-auto bg-slate-900 rounded-[32px] p-3 border-4 border-slate-800 shadow-2xl relative">
                  {/* Phone Notch */}
                  <div className="w-24 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2" />

                  {/* Telegram App Header */}
                  <div className="bg-slate-800 px-3 py-2 rounded-t-xl flex items-center gap-2 text-white">
                    <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs font-bold text-white">
                      KB
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate">KenaX BD Official Bot</p>
                      <p className="text-[10px] text-sky-300">bot</p>
                    </div>
                  </div>

                  {/* Chat Body */}
                  <div className="bg-slate-950 p-2.5 min-h-[260px] space-y-2 text-[11px] text-slate-200">
                    <div className="bg-slate-800 p-2 rounded-xl text-slate-300 max-w-[85%]">
                      Welcome to KenaX BD! Tap the menu button below to browse our shop & order.
                    </div>

                    <div className="bg-sky-900/60 p-2 rounded-xl border border-sky-700/50 text-sky-100 ml-auto max-w-[85%] text-right">
                      /start
                    </div>

                    <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-slate-200 space-y-1">
                      <p className="font-bold text-amber-400">🛍️ KenaX Instant Store Ready!</p>
                      <p className="text-[10px] text-slate-300">Fast checkout, live tracking & 100% authentic tech gadgets.</p>
                    </div>
                  </div>

                  {/* Telegram Persistent Menu Bar */}
                  <div className="bg-slate-800 p-2 rounded-b-xl border-t border-slate-700 mt-1">
                    <div className="bg-sky-500 text-white font-bold text-xs py-2 px-3 rounded-xl text-center shadow-md flex items-center justify-center gap-1.5 cursor-pointer">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{settings.telegramMiniAppButtonTitle || '🛍️ Open KenaX Store'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PUBLIC CHANNEL BROADCAST & DEALS */}
      {activeSubTab === 'channel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Channel Setup & Toggles (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Public Telegram Channel Linking</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Broadcast new arrivals, discounts, and promo codes automatically to your subscribers
                    </p>
                  </div>
                </div>
              </div>

              {/* Channel ID / Username input */}
              <div className="space-y-3 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                    Telegram Public Channel ID / Username (@channel_name or -100...)
                  </label>
                  {settings.channelId && !isEditingChannel && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 flex items-center gap-1">
                      <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> চ্যানেল কানেক্টেড ও সেভড
                    </span>
                  )}
                </div>

                {settings.channelId && !isEditingChannel ? (
                  <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-mono text-xs font-bold text-indigo-950 dark:text-indigo-200">
                        {settings.channelId}
                      </span>
                      {settings.channelId.startsWith('@') && (
                        <a
                          href={`https://t.me/${settings.channelId.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-0.5 hover:underline ml-2"
                        >
                          চ্যানেল দেখুন <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingChannel(true)}
                      className="px-2.5 py-1 rounded-md bg-indigo-100 dark:bg-indigo-950 hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> এডিট / পরিবর্তন করুন
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settings.channelId || ''}
                        onChange={(e) => setSettings((prev) => ({ ...prev, channelId: e.target.value }))}
                        placeholder="e.g. @kenax_deals or -1002049283746"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleQuickSaveChannel}
                        disabled={!settings.channelId?.trim()}
                        className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors shadow-xs shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        কনফার্ম ও সেভ
                      </button>
                      {settings.channelId && (
                        <button
                          type="button"
                          onClick={() => setIsEditingChannel(false)}
                          className="px-3 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-xs font-semibold cursor-pointer"
                        >
                          বাতিল
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1.5 leading-relaxed">
                  💡 <b>Requirement:</b> Add your bot as an <b>Administrator</b> in your Telegram channel with <i>"Post Messages"</i> permission enabled.
                </p>
              </div>

              {/* Channel Broadcast Feature Toggles */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Automated Channel Broadcast Workflows
                </h4>

                <div className="space-y-3">
                  {/* 1. New Product Alert */}
                  <label className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 mt-0.5">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          🚀 Post New Products to Telegram Channel
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          When a new product is added, automatically broadcast an attractive card with Photo, Title, Price, Discount badge & Direct Buy Link.
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.postNewProductsToChannel ?? true}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, postNewProductsToChannel: e.target.checked }))
                      }
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer mt-1"
                    />
                  </label>

                  {/* 2. Product Discount / Deals */}
                  <label className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 mt-0.5">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          🏷️ Post Price Drops & Discounts to Channel
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          When product prices are reduced, dispatch a flash sale alert to channel subscribers with old price vs new price.
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.postDiscountsToChannel ?? true}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, postDiscountsToChannel: e.target.checked }))
                      }
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer mt-1"
                    />
                  </label>

                  {/* 3. Promo Codes & Coupons */}
                  <label className="flex items-start justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 mt-0.5">
                        <Ticket className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          🎟️ Post Coupon Codes to Channel
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          Broadcast new promo voucher codes with copyable tag, discount percentage, min spend, and validity.
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.postCouponsToChannel ?? true}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, postCouponsToChannel: e.target.checked }))
                      }
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer mt-1"
                    />
                  </label>
                </div>
              </div>

              {/* Super Admin Audit Toggles for Products / Discounts */}
              <div className="p-4 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-purple-700 dark:text-purple-300" />
                  <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider">
                    Super Admin Staff Activity Alerts for Catalog Actions
                  </h4>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-xs text-purple-900 dark:text-purple-200 font-medium cursor-pointer">
                    <span>Alert Super Admin when staff adds a new product (with staff name & email)</span>
                    <input
                      type="checkbox"
                      checked={settings.notifySuperAdminOnProductCreated ?? true}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, notifySuperAdminOnProductCreated: e.target.checked }))
                      }
                      className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-purple-900 dark:text-purple-200 font-medium cursor-pointer">
                    <span>Alert Super Admin on staff discount & coupon creation</span>
                    <input
                      type="checkbox"
                      checked={settings.notifySuperAdminOnDiscountCreated ?? true}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          notifySuperAdminOnDiscountCreated: e.target.checked,
                          notifySuperAdminOnCouponCreated: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Channel Live Broadcast Tester & Realistic Channel Post Mockup (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-800 text-white space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-sm text-white">Live Channel Post Simulator</h4>
                    <p className="text-[11px] text-slate-400">Broadcast real product to your channel</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Channel Post
                </span>
              </div>

              {/* Product Selection for Test Broadcast */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Product to Broadcast:
                </label>
                <select
                  value={selectedChannelProduct?.id || ''}
                  onChange={(e) => {
                    const found = products.find((p) => p.id === e.target.value);
                    if (found) setSelectedChannelProduct(found);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                >
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (৳{p.price?.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Realistic Channel Message Card Preview */}
              <div className="bg-[#1e293b] rounded-2xl p-4 border border-slate-700 space-y-3">
                {sampleProduct.image && (
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-800">
                    <img
                      src={sampleProduct.image}
                      alt={sampleProduct.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px] shadow-sm">
                      NEW ARRIVAL 🔥
                    </div>
                  </div>
                )}
                <div className="space-y-1.5 text-xs leading-relaxed text-slate-200">
                  <p className="font-black text-white text-sm">🔥 NEW ARRIVAL: {sampleProduct.name}</p>
                  <p className="text-slate-300 text-[11px]">{sampleProduct.description?.slice(0, 80)}...</p>
                  <div className="pt-1 flex items-center gap-2">
                    <span className="font-black text-emerald-400 text-sm">৳{sampleProduct.price?.toLocaleString()}</span>
                    {sampleProduct.originalPrice && sampleProduct.originalPrice > sampleProduct.price && (
                      <span className="text-slate-400 line-through text-xs">৳{sampleProduct.originalPrice?.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="pt-2">
                    <a
                      href={`https://kenaxbd.com/product/${sampleProduct.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Order Now Online
                    </a>
                  </div>
                </div>
              </div>

              {/* Broadcast Action Button */}
              <button
                type="button"
                onClick={handleTestChannelBroadcast}
                disabled={channelBroadcasting || !settings.botToken || !settings.channelId}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 disabled:opacity-40 transition-all"
              >
                {channelBroadcasting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Broadcasting to {settings.channelId || 'Channel'}...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Broadcast Test Card to {settings.channelId || 'Channel'}
                  </>
                )}
              </button>

              {channelBroadcastResult && (
                <div
                  className={`p-3 rounded-xl text-xs border flex items-start gap-2 ${
                    channelBroadcastResult.success
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                  }`}
                >
                  {channelBroadcastResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{channelBroadcastResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MESSAGE TEMPLATES & EMOJIS */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Template Selector & Editor (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Event Selector Cards */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Select Chatbot Event Template
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    {
                      key: 'admin_new_order',
                      title: 'New Order Alert',
                      badge: 'Admin & Staff',
                      icon: ShoppingCart,
                      color: 'text-sky-600 dark:text-sky-400',
                    },
                    {
                      key: 'admin_user_registered',
                      title: 'New User Registered',
                      badge: 'Admin & Moderator',
                      icon: Users,
                      color: 'text-indigo-600 dark:text-indigo-400',
                    },
                    {
                      key: 'super_admin_staff_activity',
                      title: 'Staff Order Action',
                      badge: 'Super Admin (Staff Info)',
                      icon: ShieldAlert,
                      color: 'text-purple-600 dark:text-purple-400',
                    },
                    {
                      key: 'customer_order_placed',
                      title: 'Order Placed (Pending)',
                      badge: 'Customer Bot Alert',
                      icon: Bot,
                      color: 'text-emerald-600 dark:text-emerald-400',
                    },
                    {
                      key: 'customer_order_status_update',
                      title: 'Customer Status Update',
                      badge: 'Customer (No Staff Info)',
                      icon: Package,
                      color: 'text-amber-600 dark:text-amber-400',
                    },
                    {
                      key: 'customer_order_delivered',
                      title: 'Customer Order Delivered & Review',
                      badge: 'Customer Review Request',
                      icon: CheckCircle2,
                      color: 'text-emerald-600 dark:text-emerald-400',
                    },
                    {
                      key: 'channel_new_product',
                      title: 'Channel: New Product',
                      badge: 'Public Channel',
                      icon: Megaphone,
                      color: 'text-indigo-600 dark:text-indigo-400',
                    },
                    {
                      key: 'channel_discount_alert',
                      title: 'Channel: Discount Alert',
                      badge: 'Public Channel',
                      icon: Tag,
                      color: 'text-rose-600 dark:text-rose-400',
                    },
                    {
                      key: 'channel_coupon_alert',
                      title: 'Channel: Coupon Promo',
                      badge: 'Public Channel',
                      icon: Ticket,
                      color: 'text-amber-600 dark:text-amber-400',
                    },
                    {
                      key: 'super_admin_product_created',
                      title: 'Staff Product Created',
                      badge: 'Super Admin (Staff Info)',
                      icon: ShieldCheck,
                      color: 'text-purple-600 dark:text-purple-400',
                    },
                  ] as const
                )?.map((ev) => {
                  const isSelected = selectedTemplateKey === ev.key;
                  const Icon = ev.icon;
                  return (
                    <button
                      key={ev.key}
                      onClick={() => setSelectedTemplateKey(ev.key)}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/60 dark:border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 ${ev.color}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {ev.badge}
                        </span>
                      </div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white mt-1">{ev.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template Message Code Editor */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">{activeTemplate.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{activeTemplate.banglaTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Reset to Default
                </button>
              </div>

              {/* Variable Chips */}
              <div>
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Click to Copy Variable Tag:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(activeTemplate.variables || [])?.map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => handleCopyVar(variable)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/80 text-slate-700 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-300 hover:border-sky-300 border border-slate-200 dark:border-slate-700 font-mono text-[11px] transition-all cursor-pointer flex items-center gap-1"
                    >
                      {variable}
                      {copiedVar === variable ? (
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                  <span>HTML Formatting supported: &lt;b&gt;, &lt;i&gt;, &lt;code&gt;, &lt;s&gt;, &lt;pre&gt;</span>
                  <span>{activeTemplate.message?.length || 0} characters</span>
                </div>
                <textarea
                  rows={14}
                  value={activeTemplate.message}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-hidden bg-slate-950 text-emerald-400 leading-relaxed shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Live Realistic Telegram Mockup Phone Preview (5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 rounded-3xl p-4 shadow-2xl border border-slate-800 sticky top-6">
              {/* Telegram App Header Mockup */}
              <div className="bg-slate-800 text-white px-4 py-3 rounded-2xl flex items-center justify-between border border-slate-700 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center font-bold text-sm shadow-md">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">
                      {settings.botUsername ? `@${settings.botUsername.replace('@', '')}` : 'KenaX Alert Bot'}
                    </h4>
                    <p className="text-[10px] text-sky-400 font-medium">bot • official alerts</p>
                  </div>
                </div>
                <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  Telegram Live
                </div>
              </div>

              {/* Telegram Chat Wallpaper Area */}
              <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800 min-h-[460px] flex flex-col justify-end relative overflow-hidden">
                {/* Telegram Chat Bubble */}
                <div className="bg-[#1e293b] text-slate-100 rounded-2xl rounded-bl-xs p-4 border border-slate-700/80 shadow-lg text-xs leading-relaxed max-w-[95%]">
                  <div
                    className="whitespace-pre-wrap font-sans space-y-1"
                    dangerouslySetInnerHTML={{ __html: renderedPreviewText }}
                  />
                  <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                    <span>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Check className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                </div>
              </div>

              <p className="text-center text-[11px] text-slate-400 mt-3 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Live Preview with dynamic bindings
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: LIVE TEST & QUICK SENDER */}
      {activeSubTab === 'quick-sender' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Live Interactive Telegram Test Sender</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dispatch a real Telegram message right now to test bot tokens and chat IDs
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Target Telegram Chat ID (Your Phone / Group / Channel)
                </label>
                <input
                  type="text"
                  value={testChatId}
                  onChange={(e) => setTestChatId(e.target.value)}
                  placeholder="e.g. 1234567890 or @channel_username"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-hidden bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Template to Dispatch
                </label>
                <select
                  value={selectedTemplateKey}
                  onChange={(e) => setSelectedTemplateKey(e.target.value as TelegramEventType)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="admin_new_order">🚨 New Order Alert (Admin & Staff)</option>
                  <option value="admin_user_registered">🎉 New User Registration</option>
                  <option value="super_admin_staff_activity">🛡️ Super Admin Staff Activity (Staff Info)</option>
                  <option value="customer_order_placed">🛍️ Customer Order Placed (Pending)</option>
                  <option value="customer_order_status_update">🔔 Customer Status Update</option>
                  <option value="customer_order_delivered">⭐ Customer Order Delivered & Review</option>
                  <option value="channel_new_product">📢 Channel: New Product Broadcast</option>
                  <option value="channel_discount_alert">🏷️ Channel: Discount Alert</option>
                  <option value="channel_coupon_alert">🎟️ Channel: Coupon Promo Code</option>
                  <option value="super_admin_product_created">🛡️ Super Admin: Staff Product Created</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Select Order for Data Binding
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-hidden bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {orders?.map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      #{ord.id} - {ord.customerName} (৳{ord.totalAmount?.toLocaleString()}) [{ord.orderStatus}]
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={testSending || !settings.botToken.trim() || !testChatId.trim()}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-sky-600/20 disabled:opacity-40 transition-all"
              >
                {testSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending to Telegram...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Live Telegram Message Now
                  </>
                )}
              </button>

              {testSendResult && (
                <div
                  className={`p-3 rounded-xl text-xs border flex items-start gap-2 ${
                    testSendResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {testSendResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{testSendResult.message}</span>
                </div>
              )}
            </div>

            {/* Formatted Text Preview */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Raw Formatted Message Preview
              </label>
              <div
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono leading-relaxed max-h-[350px] overflow-y-auto whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: renderedPreviewText }}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: DISPATCH LOGS & AUDIT TRAIL */}
      {activeSubTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Telegram Dispatch Audit Logs</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">History of automated alerts sent via Telegram</p>
              </div>
            </div>
            <button
              onClick={loadLogs}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <Bot className="w-10 h-10 mx-auto mb-2 opacity-40 text-sky-500" />
              No Telegram alerts dispatched yet. Send a test message or place an order to see live logs!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Event Type</th>
                    <th className="py-2.5 px-3">Recipient Type</th>
                    <th className="py-2.5 px-3">Chat / Channel ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Message Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs?.map((lg) => (
                    <tr key={lg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(lg.timestamp)?.toLocaleString('en-US', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                          {lg.eventType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lg.recipientType === 'super_admin'
                              ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300'
                              : lg.recipientType === 'customer'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                              : 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300'
                          }`}
                        >
                          {lg.recipientType.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">{lg.recipientChatId}</td>
                      <td className="py-2.5 px-3">
                        {lg.status === 'sent' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <Check className="w-3 h-3" />
                            Sent
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 truncate max-w-xs">
                        {lg.messagePreview}
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
