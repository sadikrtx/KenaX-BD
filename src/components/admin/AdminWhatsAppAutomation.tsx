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
  Pin,
  Edit2,
  Save,
  X,
  Tag,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
  Paperclip,
  Link2,
  FileDown,
  Maximize2,
  Upload,
  Mail,
  MailCheck,
  Plus,
  MessageSquarePlus,
  RotateCcw,
  UserPlus,
  Play,
  Pause,
  Trash2,
  Volume2,
  Square,
  Eye,
  Download,
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
  detectMediaFromText,
  MediaPreviewTarget,
  WhatsAppAudioPlayer,
  WhatsAppMediaCard,
  WhatsAppMediaPreviewModal,
  useWhatsAppVoiceRecorder,
} from './WhatsAppMediaViewer';
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
  subscribeToWhatsAppCustomNames,
  saveWhatsAppCustomNameInDB,
  subscribeToWhatsAppPinnedChats,
  toggleWhatsAppPinnedChatInDB,
  markConversationAsRead,
  markAllConversationsAsRead,
  markConversationAsUnread,
  normalizePhoneNumber,
  isPhoneMatch,
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
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'read' | 'new' | 'pinned'>('all');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Pinning & Custom Naming State
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [isEditingNameModal, setIsEditingNameModal] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Send Media & Rich Content State
  const [isSendMediaModal, setIsSendMediaModal] = useState(false);
  const [mediaTypeToSend, setMediaTypeToSend] = useState<'image' | 'video' | 'voice' | 'document' | 'link'>('image');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaCaptionInput, setMediaCaptionInput] = useState('');
  const [mediaFilenameInput, setMediaFilenameInput] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [sendingMedia, setSendingMedia] = useState(false);
  const [activeMediaPreview, setActiveMediaPreview] = useState<MediaPreviewTarget | null>(null);

  // New Chat Modal State (for messaging any random number)
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [newChatInitialMessage, setNewChatInitialMessage] = useState('');
  const [startingNewChat, setStartingNewChat] = useState(false);

  // Quick Sender State
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [testSendPhone, setTestSendPhone] = useState<string>('01700000000');
  const [copiedMsg, setCopiedMsg] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canAccessInbox = hasPermission(currentRole, currentStaff?.permissions, 'whatsapp.inbox');
  const canReply = hasPermission(currentRole, currentStaff?.permissions, 'whatsapp.reply');
  const canManageTemplates = hasPermission(currentRole, currentStaff?.permissions, 'whatsapp.templates');
  const canManageSettings = hasPermission(currentRole, currentStaff?.permissions, 'whatsapp.settings');
  const canSend = canReply;
  const canEdit = canManageSettings || canManageTemplates;

  // Auto-switch subtab if current tab is restricted
  useEffect(() => {
    if (activeSubTab === 'inbox' && !canAccessInbox) {
      if (canManageTemplates) setActiveSubTab('templates');
      else if (canReply) setActiveSubTab('quick-sender');
      else if (canManageSettings) setActiveSubTab('settings');
    } else if (activeSubTab === 'templates' && !canManageTemplates) {
      if (canAccessInbox) setActiveSubTab('inbox');
      else if (canManageSettings) setActiveSubTab('settings');
    } else if (activeSubTab === 'settings' && !canManageSettings) {
      if (canAccessInbox) setActiveSubTab('inbox');
      else if (canManageTemplates) setActiveSubTab('templates');
    } else if (activeSubTab === 'webhooks' && !canManageSettings) {
      if (canAccessInbox) setActiveSubTab('inbox');
      else if (canManageTemplates) setActiveSubTab('templates');
    }
  }, [canAccessInbox, canReply, canManageTemplates, canManageSettings, activeSubTab]);

  // Real-time subscription to WhatsApp messages, settings, custom names, and pinned chats
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

    const unsubNames = subscribeToWhatsAppCustomNames((names) => {
      setCustomNames(names || {});
    });

    const unsubPinned = subscribeToWhatsAppPinnedChats((pinnedList) => {
      setPinnedChats(pinnedList || []);
    });

    return () => {
      unsubSettings();
      unsubMessages();
      unsubNames();
      unsubPinned();
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

  // Group messages into conversations (incorporating custom names and pinned chats)
  const conversations = useMemo(() => {
    return groupMessagesIntoConversations(liveMessages, customNames, pinnedChats);
  }, [liveMessages, customNames, pinnedChats]);

  // Filter counts for tabs (All, Unread, Read, New, Pinned)
  const filterCounts = useMemo(() => {
    let unread = 0;
    let read = 0;
    let newCount = 0;
    let pinned = 0;

    conversations.forEach((conv) => {
      if (conv.unreadCount > 0) unread++;
      else read++;

      const lastMsgTime = conv.lastMessage ? new Date(conv.lastMessage.timestamp).getTime() : 0;
      if (Date.now() - lastMsgTime < 24 * 60 * 60 * 1000 || conv.totalMessages <= 3) {
        newCount++;
      }

      if (conv.isPinned) pinned++;
    });

    return { all: conversations.length, unread, read, newCount, pinned };
  }, [conversations]);

  // Filtered conversations list based on tab filter & search
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      // 1. Search filter
      if (inboxSearchQuery.trim()) {
        const q = inboxSearchQuery.toLowerCase();
        const matchPhone = conv.phoneNumber.toLowerCase().includes(q);
        const matchName = conv.customerName?.toLowerCase().includes(q);
        const matchMsg = conv.messages.some((m) => m.text?.toLowerCase().includes(q));
        if (!matchPhone && !matchName && !matchMsg) return false;
      }

      // 2. Tab Filter
      if (inboxFilter === 'unread') {
        return conv.unreadCount > 0;
      }
      if (inboxFilter === 'read') {
        return conv.unreadCount === 0;
      }
      if (inboxFilter === 'new') {
        const lastMsgTime = conv.lastMessage ? new Date(conv.lastMessage.timestamp).getTime() : 0;
        return Date.now() - lastMsgTime < 24 * 60 * 60 * 1000 || conv.totalMessages <= 3;
      }
      if (inboxFilter === 'pinned') {
        return conv.isPinned === true;
      }

      return true; // 'all'
    });
  }, [conversations, inboxSearchQuery, inboxFilter]);

  // Select conversation and automatically mark unread messages as read
  const handleSelectConversation = (phone: string) => {
    if (selectedPhone === phone) {
      setSelectedPhone('');
      return;
    }
    setSelectedPhone(phone);
    setReplyError(null);

    const hasUnread = liveMessages.some(
      (m) =>
        m.direction === 'incoming' &&
        m.status !== 'read' &&
        (isPhoneMatch(m.from, phone) || isPhoneMatch(m.to, phone))
    );

    if (hasUnread) {
      // Optimistically mark messages as read immediately for instant countdown & badge dismissal
      setLiveMessages((prev) =>
        prev.map((m) => {
          if (
            m.direction === 'incoming' &&
            m.status !== 'read' &&
            (isPhoneMatch(m.from, phone) || isPhoneMatch(m.to, phone))
          ) {
            return {
              ...m,
              status: 'read',
              readAt: new Date().toISOString(),
              readBy: currentStaff?.name || 'Admin',
            };
          }
          return m;
        })
      );

      // Persist read status to Firestore & backend server
      markConversationAsRead(phone, currentStaff?.name || 'Admin');
    }
  };

  // Explicit Mark as Read button action
  const handleMarkAsReadManual = (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLiveMessages((prev) =>
      prev.map((m) => {
        if (
          m.direction === 'incoming' &&
          m.status !== 'read' &&
          (isPhoneMatch(m.from, phone) || isPhoneMatch(m.to, phone))
        ) {
          return {
            ...m,
            status: 'read',
            readAt: new Date().toISOString(),
            readBy: currentStaff?.name || 'Admin',
          };
        }
        return m;
      })
    );
    markConversationAsRead(phone, currentStaff?.name || 'Admin');
    setReplySuccess('Marked conversation as read');
    setTimeout(() => setReplySuccess(null), 2500);
  };

  // Mark all unread conversations as read
  const handleMarkAllAsReadManual = () => {
    setLiveMessages((prev) =>
      prev.map((m) => {
        if (m.direction === 'incoming' && m.status !== 'read') {
          return {
            ...m,
            status: 'read',
            readAt: new Date().toISOString(),
            readBy: currentStaff?.name || 'Admin',
          };
        }
        return m;
      })
    );
    markAllConversationsAsRead(currentStaff?.name || 'Admin');
    setReplySuccess('All conversations marked as read');
    setTimeout(() => setReplySuccess(null), 2500);
  };

  // Explicit Mark as Unread button action
  const handleMarkAsUnreadManual = (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLiveMessages((prev) => {
      const copy = [...prev];
      const incoming = copy.filter(
        (m) =>
          m.direction === 'incoming' &&
          (isPhoneMatch(m.from, phone) || isPhoneMatch(m.to, phone))
      );
      if (incoming.length > 0) {
        incoming.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        incoming[0] = { ...incoming[0], status: 'received' };
      }
      return copy;
    });
    markConversationAsUnread(phone);
    setReplySuccess('Marked conversation as unread');
    setTimeout(() => setReplySuccess(null), 2500);
  };

  // Toggle Pinned status for a conversation
  const handleTogglePin = async (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = await toggleWhatsAppPinnedChatInDB(phone);
    setPinnedChats(updated);
    if (onRecordAudit) {
      const isNowPinned = updated.includes(phone.replace(/[^0-9]/g, ''));
      onRecordAudit(
        isNowPinned ? 'PIN_WHATSAPP_CHAT' : 'UNPIN_WHATSAPP_CHAT',
        'WhatsApp',
        phone,
        isNowPinned ? 'Pinned conversation to top' : 'Unpinned conversation'
      );
    }
  };

  // Open Edit Customer Name modal
  const handleOpenEditName = () => {
    if (!activeConversation) return;
    setEditingNameValue(activeConversation.customerName || '');
    setIsEditingNameModal(true);
  };

  // Save Custom Customer Name
  const handleSaveCustomName = async () => {
    if (!activeConversation || savingName) return;
    setSavingName(true);
    try {
      const updatedMap = await saveWhatsAppCustomNameInDB(
        activeConversation.phoneNumber,
        editingNameValue
      );
      setCustomNames(updatedMap);
      setIsEditingNameModal(false);
      if (onRecordAudit) {
        onRecordAudit(
          'UPDATE_CUSTOMER_NAME',
          'WhatsApp',
          activeConversation.phoneNumber,
          `Set custom customer name to "${editingNameValue.trim()}"`
        );
      }
    } catch (err) {
      console.warn('Error saving customer name:', err);
    } finally {
      setSavingName(false);
    }
  };

  // Direct Voice Note Recording & Sending Handler
  const handleSendVoiceDirect = async (audioDataUrl: string) => {
    if (!activeConversation) return;
    setReplyError(null);
    try {
      const res = await sendWhatsAppReply({
        to: activeConversation.phoneNumber,
        type: 'voice',
        text: '[🎙️ Voice Note / অডিও বার্তা]',
        mediaUrl: audioDataUrl,
        mediaType: 'voice',
        orderId: linkedOrder?.id,
        staffMember: currentStaff?.name || (currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Admin' : 'Staff'),
        staffId: currentStaff?.id,
        staffRole: currentRole,
      });

      if (res.success) {
        setReplySuccess('🎙️ Voice note recorded & sent successfully via WhatsApp!');
        setTimeout(() => setReplySuccess(null), 4000);
        if (onRecordAudit) {
          onRecordAudit(
            'SEND_WHATSAPP_VOICE',
            'WhatsApp',
            activeConversation.phoneNumber,
            'Sent voice note audio recording via WhatsApp'
          );
        }
      } else {
        setReplyError(res.error || 'Failed to send voice note.');
      }
    } catch (err: any) {
      setReplyError(err.message || 'Error occurred sending voice note.');
    }
  };

  const voiceRecorder = useWhatsAppVoiceRecorder(handleSendVoiceDirect);

  // Helper to send media (Image, Video, Voice note, Document, Link)
  const handleSendMedia = async () => {
    if (!activeConversation || (!mediaUrlInput.trim() && !voiceRecorder.recordedAudioUrl) || sendingMedia) return;
    setSendingMedia(true);
    setReplyError(null);
    try {
      const isLink = mediaTypeToSend === 'link';
      const actualMediaUrl = mediaTypeToSend === 'voice' && voiceRecorder.recordedAudioUrl
        ? voiceRecorder.recordedAudioUrl
        : mediaUrlInput.trim();

      const res = await sendWhatsAppReply({
        to: activeConversation.phoneNumber,
        type: isLink ? 'text' : mediaTypeToSend,
        text: isLink ? actualMediaUrl : (mediaCaptionInput.trim() || undefined),
        mediaUrl: isLink ? undefined : actualMediaUrl,
        mediaType: isLink ? undefined : (mediaTypeToSend as any),
        mediaCaption: isLink ? undefined : (mediaCaptionInput.trim() || undefined),
        filename: mediaFilenameInput.trim() || undefined,
        orderId: linkedOrder?.id,
        staffMember: currentStaff?.name || (currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Admin' : 'Staff'),
        staffId: currentStaff?.id,
        staffRole: currentRole,
      });

      if (res.success) {
        setReplySuccess(`${mediaTypeToSend.toUpperCase()} sent successfully via WhatsApp!`);
        setIsSendMediaModal(false);
        setMediaUrlInput('');
        setMediaCaptionInput('');
        setMediaFilenameInput('');
        voiceRecorder.cancelRecording();
        setTimeout(() => setReplySuccess(null), 4000);
      } else {
        setReplyError(res.error || 'Failed to send media message.');
      }
    } catch (err: any) {
      setReplyError(err.message || 'Error occurred sending media.');
    } finally {
      setSendingMedia(false);
    }
  };

  // Render message text with auto-clickable URLs
  const renderFormattedTextWithLinks = (text?: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const href = part.startsWith('www.') ? `https://${part}` : part;
        return (
          <a
            key={i}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold text-blue-600 hover:text-blue-800 dark:text-blue-300 break-all inline-flex items-center gap-0.5 mx-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {part} <ExternalLink className="w-3 h-3 inline shrink-0" />
          </a>
        );
      }
      return part;
    });
  };

  // Active selected conversation (null when no chat selected)
  const activeConversation = useMemo(() => {
    if (!selectedPhone) return null;
    const found = conversations.find((c) => isPhoneMatch(c.phoneNumber, selectedPhone));
    if (found) {
      if (isPhoneMatch(found.phoneNumber, '01719143897')) {
        return { ...found, customerName: 'KenaX BD', isPinned: true };
      }
      return found;
    }

    // Support messaging random numbers not yet in conversations list
    const normalizedKey = normalizePhoneNumber(selectedPhone);
    const isStoreNum = isPhoneMatch(selectedPhone, '01719143897');
    const customName = isStoreNum ? 'KenaX BD' : (customNames[normalizedKey] || undefined);
    const relatedMsgs = liveMessages.filter(
      (m) => isPhoneMatch(m.from, selectedPhone) || isPhoneMatch(m.to, selectedPhone)
    );

    return {
      phoneNumber: selectedPhone,
      customerName: customName,
      isPinned: pinnedChats.some((p) => isPhoneMatch(p, selectedPhone)) || isStoreNum,
      unreadCount: 0,
      totalMessages: relatedMsgs.length,
      is24hWindowActive: true,
      messages: relatedMsgs,
      lastMessage: relatedMsgs[relatedMsgs.length - 1],
    };
  }, [conversations, selectedPhone, customNames, pinnedChats, liveMessages]);

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

  // Re-open 24h customer service window by posting a re-engagement ping
  const handleReset24hWindow = async () => {
    if (!activeConversation) return;
    try {
      await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object: 'whatsapp_business_account',
          entry: [
            {
              changes: [
                {
                  value: {
                    messaging_product: 'whatsapp',
                    metadata: { display_phone_number: 'KenaX BD', phone_number_id: '1282711991587859' },
                    contacts: [{ profile: { name: activeConversation.customerName || 'Customer' }, wa_id: activeConversation.phoneNumber }],
                    messages: [
                      {
                        from: activeConversation.phoneNumber,
                        id: `wamid.admin_reset_${Date.now()}`,
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        type: 'text',
                        text: { body: 'Customer Re-engaged / Session Window Re-opened' },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        }),
      });
      setReplySuccess('24-Hour Customer Service Window re-opened successfully!');
      setTimeout(() => setReplySuccess(null), 3000);
    } catch (err: any) {
      console.error('Error resetting 24h window:', err);
    }
  };

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

  // Start new chat with any random phone number
  const handleStartNewChat = (phone: string, name?: string) => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return;
    setSelectedPhone(cleanPhone);
    if (name?.trim()) {
      saveWhatsAppCustomNameInDB(cleanPhone, name.trim());
      setCustomNames((prev) => ({ ...prev, [normalizePhoneNumber(cleanPhone)]: name.trim() }));
    }
    setInboxSearchQuery('');
    setReplyError(null);
    setIsNewChatModalOpen(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  // Submit Start New Chat modal form
  const handleConfirmStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatPhone.trim() || startingNewChat) return;
    setStartingNewChat(true);

    const targetPhone = newChatPhone.trim();
    const contactName = newChatName.trim();
    const initMsg = newChatInitialMessage.trim();

    if (contactName) {
      await saveWhatsAppCustomNameInDB(targetPhone, contactName);
      setCustomNames((prev) => ({ ...prev, [normalizePhoneNumber(targetPhone)]: contactName }));
    }

    setSelectedPhone(targetPhone);
    setIsNewChatModalOpen(false);
    setNewChatPhone('');
    setNewChatName('');
    setNewChatInitialMessage('');
    setStartingNewChat(false);

    if (initMsg) {
      setReplyText(initMsg);
      setTimeout(() => {
        handleSendReply();
      }, 100);
    } else {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  // Retry sending a failed message
  const handleRetryMessage = async (msg: WhatsAppMessageRecord) => {
    const recipient = msg.to || activeConversation?.phoneNumber;
    if (!recipient || !msg.text || sendingReply) return;
    setSendingReply(true);
    setReplyError(null);

    try {
      const res = await sendWhatsAppReply({
        to: recipient,
        text: msg.text,
        orderId: msg.orderId,
        staffMember: currentStaff?.name || 'Admin',
        staffId: currentStaff?.id,
        staffRole: currentStaff?.role || currentRole,
      });

      if (res.success && res.message) {
        setLiveMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...res.message!, status: 'sent' } : m))
        );
        setReplySuccess('Message re-sent successfully!');
        setTimeout(() => setReplySuccess(null), 3000);
      } else {
        setLiveMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, status: 'failed', error: res.error } : m))
        );
        setReplyError(res.error || 'Retry failed to send message.');
      }
    } catch (err: any) {
      setReplyError(err.message || 'Retry failed.');
    } finally {
      setSendingReply(false);
    }
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
    customerName: 'Tanvir Ahmed',
    customerEmail: 'tanvir@gmail.com',
    customerMobile: '01712345678',
    customerPhone: '01712345678',
    phone: '01712345678',
    deliveryName: 'Tanvir Ahmed',
    deliveryMobile: '01712345678',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhanmondi',
    area: 'Dhanmondi 27',
    fullAddress: 'House 12, Road 27, Dhanmondi, Dhaka',
    address: 'House 12, Road 27, Dhanmondi, Dhaka',
    shippingAddress: 'House 12, Road 27, Dhanmondi, Dhaka',
    items: [
      {
        productId: 'prod-1',
        productName: 'T900 Ultra 2 Smartwatch',
        productImage: '',
        selectedColor: 'Black',
        selectedSize: 'Standard',
        costPrice: 950,
        supplierName: 'Shopbase Reseller',
        supplierUrl: 'https://shopbasebd.com/store/products/details/32718',
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
  const renderedMessage = formatWhatsAppMessage(activeTemplate.message, {
    order: sampleOrder,
    isAdmin: selectedTemplateKey === 'admin_pinned_order_alert' || selectedTemplateKey === 'admin_pinned_status_alert',
    staff: currentStaff ? {
      name: currentStaff.name,
      role: currentStaff.role,
      id: currentStaff.id,
      email: currentStaff.email,
    } : {
      name: 'Sadik Rahman',
      role: 'Super Admin',
      id: 'ADM-01',
    },
    oldStatus: 'Pending',
    newStatus: 'Confirmed',
  });

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
          {canAccessInbox && (
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
          )}

          {canManageTemplates && (
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
          )}

          {(canReply || canManageTemplates) && (
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
          )}

          {canManageSettings && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: LIVE INBOX & TWO-WAY CHAT (MAIN REQUIREMENT) */}
      {activeSubTab === 'inbox' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px] sm:min-h-[680px]">
          {/* Left Column: Conversations List (4 cols on lg, full width on mobile when no chat active) */}
          <div className={`lg:col-span-4 border-r border-slate-200/80 dark:border-slate-800 flex-col bg-slate-50/50 dark:bg-slate-900/60 ${selectedPhone ? 'hidden lg:flex' : 'flex'}`}>
            {/* Search & Filter Header */}
            <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Customer Conversations
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewChatPhone('');
                      setNewChatName('');
                      setNewChatInitialMessage('');
                      setIsNewChatModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    title="Direct message any phone number"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Chat</span>
                  </button>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                    {filteredConversations.length} / {conversations.length}
                  </span>
                </div>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, phone, or enter any number to chat..."
                  value={inboxSearchQuery}
                  onChange={(e) => setInboxSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Inbox Filter Pills (All, Unread, Read, New, Pinned) */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-1">
                {[
                  { id: 'all', label: 'All', count: filterCounts.all },
                  { id: 'unread', label: 'Unread', count: filterCounts.unread },
                  { id: 'read', label: 'Read', count: filterCounts.read },
                  { id: 'new', label: 'New', count: filterCounts.newCount },
                  { id: 'pinned', label: 'Pinned', count: filterCounts.pinned },
                ].map((tab) => {
                  const isActive = inboxFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setInboxFilter(tab.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap border ${
                        isActive
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                          isActive
                            ? 'bg-emerald-700/80 text-emerald-100'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}

                {filterCounts.unread > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsReadManual}
                    className="ml-auto px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    title="Mark all conversations as read"
                  >
                    <CheckCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>Mark All Read</span>
                  </button>
                )}
              </div>
            </div>

            {/* Conversation Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 max-h-[580px]">
              {/* Direct search-to-chat action if search query contains phone digits */}
              {(() => {
                const searchDigits = inboxSearchQuery.replace(/[^0-9]/g, '');
                if (searchDigits.length >= 7) {
                  const match = conversations.find((c) => isPhoneMatch(c.phoneNumber, inboxSearchQuery));
                  return (
                    <div className="p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleStartNewChat(inboxSearchQuery)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleStartNewChat(inboxSearchQuery);
                        }}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:border-emerald-500 hover:shadow-xs transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-colors">
                            <MessageSquarePlus className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {match ? 'Open Conversation:' : 'Start New Chat:'} {formatPhoneDisplay(inboxSearchQuery)}
                              </span>
                              <span className="px-1.5 py-0.2 text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded">
                                {match ? 'Existing' : 'Direct Message'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              Click to open conversation window and send message
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 group-hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 transition-colors shadow-xs"
                        >
                          Open →
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {filteredConversations.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Matching Conversations</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                    {inboxSearchQuery
                      ? `No chats found matching search "${inboxSearchQuery}".`
                      : `No conversations in the "${inboxFilter.toUpperCase()}" filter category.`}
                  </p>
                  {(inboxSearchQuery || inboxFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setInboxSearchQuery('');
                        setInboxFilter('all');
                      }}
                      className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors cursor-pointer mt-2 inline-block"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                    const isSelected = selectedPhone === conv.phoneNumber;
                    const lastMsg = conv.lastMessage;
                    const windowInfo = get24hCustomerServiceWindow(conv.messages);
                    const isStoreOfficial = isPhoneMatch(conv.phoneNumber, '01719143897');
                    const displayName = isStoreOfficial ? 'KenaX BD' : (conv.customerName || formatPhoneDisplay(conv.phoneNumber));

                    return (
                      <div
                        key={conv.phoneNumber}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          handleSelectConversation(conv.phoneNumber);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleSelectConversation(conv.phoneNumber);
                          }
                        }}
                        className={`w-full p-3.5 text-left flex items-start gap-3 transition-all cursor-pointer relative group ${
                          isSelected
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-l-4 border-emerald-600 shadow-xs'
                            : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border-l-4 border-transparent'
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 relative ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : isStoreOfficial
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {isStoreOfficial
                            ? 'K'
                            : conv.customerName
                            ? conv.customerName.charAt(0).toUpperCase()
                            : <User className="w-4 h-4" />}
                          {(conv.isPinned || isStoreOfficial) && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-sm" title="Pinned Chat">
                              <Pin className="w-2.5 h-2.5 fill-white" />
                            </div>
                          )}
                        </div>

                        {/* Thread Preview */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {displayName}
                              </span>
                              {isStoreOfficial ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded">
                                  Store Official
                                </span>
                              ) : conv.isPinned ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded">
                                  <Pin className="w-2.5 h-2.5 fill-amber-700" /> Pinned
                                </span>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {conv.unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black shrink-0">
                                  {conv.unreadCount} unread
                                </span>
                              )}

                              {/* Quick Mark Read / Unread */}
                              {conv.unreadCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={(e) => handleMarkAsReadManual(conv.phoneNumber, e)}
                                  className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 transition-colors cursor-pointer"
                                  title="Mark as Read"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => handleMarkAsUnreadManual(conv.phoneNumber, e)}
                                  className="p-1 rounded-md text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-colors cursor-pointer"
                                  title="Mark as Unread"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Quick Pin Toggle */}
                              <button
                                type="button"
                                onClick={(e) => handleTogglePin(conv.phoneNumber, e)}
                                className={`p-1 rounded-md transition-colors cursor-pointer ${
                                  conv.isPinned
                                    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 hover:bg-amber-100'
                                    : 'text-slate-300 dark:text-slate-600 hover:text-amber-600 hover:bg-slate-200/60 opacity-0 group-hover:opacity-100'
                                }`}
                                title={conv.isPinned ? 'Unpin chat' : 'Pin chat to top'}
                              >
                                <Pin className={`w-3.5 h-3.5 ${conv.isPinned ? 'fill-amber-600' : ''}`} />
                              </button>

                              {lastMsg && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                  {new Date(lastMsg.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mb-1 truncate">
                            {formatPhoneDisplay(conv.phoneNumber)}
                            {isStoreOfficial && (
                              <span className="text-emerald-700 dark:text-emerald-400 font-sans font-bold ml-1.5 text-[10px]">
                                (Pinned Business WhatsApp)
                              </span>
                            )}
                          </p>

                          <p className="text-xs text-slate-600 dark:text-slate-300 truncate leading-snug">
                            {lastMsg?.direction === 'outgoing' && (
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400 mr-1">You:</span>
                            )}
                            {lastMsg?.text || '[Media / Template Message]'}
                          </p>

                          {/* Status and 24h pill */}
                          <div className="mt-2 flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {windowInfo.isActive ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  24h Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                  <Clock className="w-2.5 h-2.5" />
                                  24h Expired
                                </span>
                              )}

                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                {conv.totalMessages} msgs
                              </span>
                            </div>

                            {isSelected ? (
                              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0">
                                <X className="w-2.5 h-2.5" /> Click to Hide
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 transition-colors shrink-0">
                                Click to Open
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Right Column: Active Conversation & Reply Composer (8 cols on lg, full width on mobile when chat active) */}
          <div className={`lg:col-span-8 flex-col bg-white dark:bg-slate-900 ${!selectedPhone ? 'hidden lg:flex' : 'flex'}`}>
            {activeConversation ? (
              <>
                {/* Chat Top Header */}
                <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 bg-slate-50/70 dark:bg-slate-800/50">
                  {(() => {
                    const isStoreActive = isPhoneMatch(activeConversation.phoneNumber, '01719143897');
                    const headerName = isStoreActive ? 'KenaX BD' : (activeConversation.customerName || 'Customer');

                    return (
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {/* Mobile Back Button (returns to conversations list) */}
                        <button
                          type="button"
                          onClick={() => setSelectedPhone('')}
                          className="lg:hidden p-1.5 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                          title="Back to conversations"
                          aria-label="Back to conversations list"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl font-black flex items-center justify-center text-sm shadow-sm shrink-0 relative ${
                            isStoreActive ? 'bg-emerald-700 text-white' : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isStoreActive
                            ? 'K'
                            : activeConversation.customerName
                            ? activeConversation.customerName.charAt(0).toUpperCase()
                            : <User className="w-5 h-5" />}
                          {(activeConversation.isPinned || isStoreActive) && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full shadow-sm">
                              <Pin className="w-2.5 h-2.5 fill-white" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm font-black text-slate-900 dark:text-white truncate">
                              {headerName}
                            </h2>
                            {isStoreActive ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black tracking-wide uppercase">
                                KenaX BD (Official Store)
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleOpenEditName}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-slate-200/60 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                                title="Set or edit customer custom name"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>{activeConversation.customerName ? 'Edit Name' : 'Set Name'}</span>
                              </button>
                            )}
                            {linkedOrder && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold font-mono">
                                Order #{linkedOrder.id}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex-wrap">
                            <span>{formatPhoneDisplay(activeConversation.phoneNumber)}</span>
                            {isStoreActive && (
                              <span className="text-emerald-700 dark:text-emerald-400 font-sans font-bold text-[11px]">
                                • Official Business WhatsApp
                              </span>
                            )}
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
                              className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 font-sans font-bold text-[11px] ml-1"
                            >
                              Open in WhatsApp <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Header Actions: Pin Chat, 24-Hour Window Badge, & Close Chat */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(activeConversation.phoneNumber, e)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        activeConversation.isPinned
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title={activeConversation.isPinned ? 'Unpin this conversation' : 'Pin conversation to top'}
                    >
                      <Pin className={`w-3.5 h-3.5 ${activeConversation.isPinned ? 'fill-amber-600 text-amber-600' : 'text-slate-500'}`} />
                      <span>{activeConversation.isPinned ? 'Pinned' : 'Pin Chat'}</span>
                    </button>

                    {/* Mark as Read / Unread in Header */}
                    {activeConversation.unreadCount > 0 ? (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsReadManual(activeConversation.phoneNumber, e)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 shadow-xs"
                        title="Mark all messages in this conversation as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Mark as Read</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsUnreadManual(activeConversation.phoneNumber, e)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                        title="Mark this conversation as unread"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span>Mark Unread</span>
                      </button>
                    )}

                    {activeWindowStatus?.isActive ? (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>24h Window Active: {activeWindowStatus.formattedRemaining}</span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>24h Session Expired (Template Required)</span>
                      </div>
                    )}

                    {/* Close Chat Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedPhone('')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-700 shadow-2xs"
                      title="Close / Hide Chatbox"
                    >
                      <X className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span>Close Chat</span>
                    </button>
                  </div>
                </div>

                {/* 24-Hour Window Advisory Banner (if expired) */}
                {!activeWindowStatus?.isActive && (
                  <div className="px-4 py-3 bg-amber-50/90 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2 max-w-xl">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">24-Hour Window Expired:</span> Customer last messaged &gt; 24h ago. Under Meta Cloud API rules, free-form text may be rejected. Use a pre-approved template or reset window below.
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveSubTab('templates')}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        title="Send an official pre-approved WhatsApp template message"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Send Template
                      </button>
                      <button
                        type="button"
                        onClick={handleReset24hWindow}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-bold rounded-xl text-[11px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                        title="Re-open 24h customer session window for freeform chat"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        Re-open 24h Window
                      </button>
                    </div>
                  </div>
                )}

                {/* Message History Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[420px] bg-slate-50/40 dark:bg-slate-950/60">
                  {activeConversation.messages.map((msg) => {
                    const isIncoming = msg.direction === 'incoming';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isIncoming ? 'items-start' : 'items-end'}`}
                      >
                        {/* Sender Label & Staff Attribution */}
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {isIncoming
                              ? (isPhoneMatch(msg.from, '01719143897')
                                  ? 'KenaX BD'
                                  : (msg.senderName || activeConversation.customerName || 'Customer'))
                              : msg.staffMember
                              ? `👤 ${msg.staffMember} (${msg.staffRole || 'Staff'}) • KenaX BD`
                              : 'KenaX BD'}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
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
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs'
                              : 'bg-emerald-600 text-white rounded-tr-xs shadow-emerald-600/10'
                          }`}
                        >
                          {/* Rich Media Display & Auto-Detected Links */}
                          {(() => {
                            const rawAudio = (msg as any).rawPayload?.audio || (msg as any).rawPayload?.voice;
                            const rawImage = (msg as any).rawPayload?.image;
                            const rawVideo = (msg as any).rawPayload?.video;
                            const rawDoc = (msg as any).rawPayload?.document;
                            const rawMediaObj = rawAudio || rawImage || rawVideo || rawDoc;

                            const rawMediaId = rawMediaObj?.id;
                            const rawMimeType = rawMediaObj?.mime_type || (rawAudio ? 'audio/ogg' : rawImage ? 'image/jpeg' : rawVideo ? 'video/mp4' : undefined);
                            
                            let inferredType = (msg.mediaType || msg.messageType || '') as string;
                            if (!inferredType || inferredType === 'text') {
                              if (rawAudio) inferredType = 'voice';
                              else if (rawImage) inferredType = 'image';
                              else if (rawVideo) inferredType = 'video';
                              else if (rawDoc) inferredType = 'document';
                              else inferredType = 'document';
                            }

                            const resolvedUrl = msg.mediaUrl || (rawMediaId ? `/api/whatsapp/media/${rawMediaId}` : undefined);
                            const resolvedFilename = msg.filename || rawDoc?.filename || (inferredType === 'voice' || inferredType === 'audio' ? 'voice_note.ogg' : inferredType === 'image' ? 'photo.jpg' : inferredType === 'video' ? 'video.mp4' : 'document.pdf');

                            const explicitMediaTarget = resolvedUrl
                              ? {
                                  type: inferredType as any,
                                  url: resolvedUrl,
                                  filename: resolvedFilename,
                                  title: resolvedFilename,
                                  mediaId: rawMediaId,
                                  mimeType: rawMimeType,
                                }
                              : null;

                            const detectedInText = detectMediaFromText(msg.text).filter(
                              (item) => !resolvedUrl || item.url !== resolvedUrl
                            );

                            const allMediaToRender = [
                              ...(explicitMediaTarget ? [explicitMediaTarget] : []),
                              ...detectedInText,
                            ];

                            if (allMediaToRender.length === 0) return null;

                            return (
                              <div className="mb-2.5 space-y-2">
                                {allMediaToRender.map((target, idx) => (
                                  <WhatsAppMediaCard
                                    key={idx}
                                    target={target}
                                    isIncoming={isIncoming}
                                    onOpenModal={setActiveMediaPreview}
                                  />
                                ))}
                              </div>
                            );
                          })()}

                          {/* Message Text with Link formatting */}
                          <p className="whitespace-pre-wrap font-sans">
                            {renderFormattedTextWithLinks(msg.text)}
                          </p>

                          {msg.orderId && (
                            <div
                              className={`mt-2 pt-1.5 border-t text-[10px] font-mono font-bold flex items-center gap-1 ${
                                isIncoming
                                  ? 'border-slate-100 dark:border-slate-800 text-emerald-700 dark:text-emerald-400'
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
                          <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-slate-400 dark:text-slate-500">
                            {msg.status === 'sending' && (
                              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                Sending...
                              </span>
                            )}
                            {msg.status === 'sent' && (
                              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                <Check className="w-3 h-3 text-slate-400" />
                                Sent to Meta
                              </span>
                            )}
                            {msg.status === 'delivered' && (
                              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                                <CheckCheck className="w-3 h-3 text-slate-400" />
                                Delivered
                              </span>
                            )}
                            {msg.status === 'read' && (
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold">
                                <CheckCheck className="w-3 h-3 text-blue-500" />
                                Read by Customer
                              </span>
                            )}
                            {msg.status === 'failed' && (
                              <div className="flex flex-col gap-1 mt-0.5">
                                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                                  <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                  Failed: {msg.error || 'Message undeliverable'}
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <a
                                    href={`https://wa.me/${(msg.to || activeConversation.phoneNumber).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg.text || '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded transition-colors shadow-xs"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    WhatsApp Web
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleRetryMessage(msg)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[9px] font-bold rounded transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    Retry
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Reply Chips */}
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0">
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
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-800 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap transition-colors cursor-pointer shrink-0"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Error Banner */}
                {replyError && (
                  <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
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
                  <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{replySuccess}</span>
                  </div>
                )}

                {/* Message Composer (Bottom) */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  {/* Active Recording State */}
                  {voiceRecorder.isRecording ? (
                    <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/80 border-2 border-amber-300 dark:border-amber-700 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Mic className="w-4 h-4 text-rose-600 animate-bounce" />
                            Recording Voice Note... / ভয়েস রেকর্ড হচ্ছে...
                          </p>
                          <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 font-bold">
                            Duration: {Math.floor(voiceRecorder.recordingSeconds / 60)}:{(voiceRecorder.recordingSeconds % 60).toString().padStart(2, '0')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Cancel / Trash */}
                        <button
                          type="button"
                          onClick={voiceRecorder.cancelRecording}
                          className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-200 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Discard Recording"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Cancel</span>
                        </button>

                        {/* Stop & Review */}
                        <button
                          type="button"
                          onClick={() => voiceRecorder.stopRecording(false)}
                          className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Stop & Listen Preview"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          <span className="hidden sm:inline">Review</span>
                        </button>

                        {/* Instant Send */}
                        <button
                          type="button"
                          onClick={() => voiceRecorder.stopRecording(true)}
                          disabled={voiceRecorder.isSendingVoice}
                          className="px-3.5 sm:px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                          title="Send Voice Note Directly"
                        >
                          {voiceRecorder.isSendingVoice ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Send Voice</span>
                        </button>
                      </div>
                    </div>
                  ) : voiceRecorder.recordedAudioUrl ? (
                    /* Review Recorded Audio State */
                    <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 mb-1.5 flex items-center gap-1">
                          <Mic className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> Listen to Recorded Voice Note (প্রিভিউ শুনুন):
                        </p>
                        <WhatsAppAudioPlayer src={voiceRecorder.recordedAudioUrl} className="w-full max-w-md" />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={voiceRecorder.cancelRecording}
                          className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-200 hover:text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <button
                          type="button"
                          onClick={voiceRecorder.sendRecordedAudio}
                          disabled={voiceRecorder.isSendingVoice}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/25 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {voiceRecorder.isSendingVoice ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Send Voice Now</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Regular Text Composer */
                    <div className="relative">
                      <textarea
                        ref={textareaRef}
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Type reply to ${formatPhoneDisplay(activeConversation.phoneNumber)}... (Press Enter to send, Shift+Enter for new line)`}
                        disabled={sendingReply || !canSend}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none font-sans"
                      />
                    </div>
                  )}

                  {voiceRecorder.recorderError && (
                    <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
                      <span>{voiceRecorder.recorderError}</span>
                      <button
                        type="button"
                        onClick={voiceRecorder.cancelRecording}
                        className="text-rose-500 hover:text-rose-800 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Sender Identity:
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200">
                        {currentStaff?.name || (currentRole === 'super_admin' ? 'Super Admin' : currentRole === 'admin' ? 'Admin' : 'Staff')} ({currentRole})
                      </span>
                      <span className="hidden md:inline text-slate-400">
                        • Recipient: {formatPhoneDisplay(activeConversation.phoneNumber)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      {/* Media Attachment Action Buttons */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            setMediaTypeToSend('image');
                            setIsSendMediaModal(true);
                          }}
                          className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg text-slate-700 hover:text-emerald-700 hover:bg-white transition-all cursor-pointer flex items-center justify-center hover:shadow-2xs active:scale-95"
                          title="Attach Media (Image, Video, Document, Link)"
                          aria-label="Attach Media"
                        >
                          <ImageIcon className="w-4 h-4 text-emerald-600" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (voiceRecorder.isRecording) {
                              voiceRecorder.stopRecording(false);
                            } else {
                              voiceRecorder.startRecording();
                            }
                          }}
                          className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg transition-all cursor-pointer flex items-center justify-center hover:shadow-2xs active:scale-95 ${
                            voiceRecorder.isRecording
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'text-slate-700 hover:text-amber-700 hover:bg-white'
                          }`}
                          title="Record Voice Note / সরাসরি ভয়েস রেকর্ড করুন"
                          aria-label="Record Voice Note"
                        >
                          <Mic className={`w-4 h-4 ${voiceRecorder.isRecording ? 'text-white' : 'text-amber-600'}`} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || sendingReply || !canSend}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      >
                        {sendingReply ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span className="hidden sm:inline">Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-4 bg-slate-50/30">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shadow-inner">
                    <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white">
                    ✓
                  </span>
                </div>

                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    No Chat Selected
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Click any customer name or phone number on the left list to open their chatbox. Click the same number again to hide/close the chatbox.
                  </p>
                </div>

                <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full max-w-md text-left">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Chats</p>
                    <p className="text-sm sm:text-base font-black text-slate-800">{filterCounts.all}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Unread</p>
                    <p className="text-sm sm:text-base font-black text-emerald-700">{filterCounts.unread}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pinned</p>
                    <p className="text-sm sm:text-base font-black text-amber-700">{filterCounts.pinned}</p>
                  </div>
                </div>
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

              {/* Pinned Admin WhatsApp Alert Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    Pinned Admin WhatsApp Number (For Live Order & Staff Alerts)
                  </label>
                  {pinnedChats.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, pinnedAdminNumber: pinnedChats[0] })}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      Use Pinned Chat #{pinnedChats[0]}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={settings.pinnedAdminNumber || ''}
                  onChange={(e) => setSettings({ ...settings, pinnedAdminNumber: e.target.value })}
                  placeholder="e.g. 8801700000000 (Receives Instant Order & Staff Status Reports)"
                  disabled={!canEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50/40 text-xs sm:text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  All new orders placed and staff status confirmations (with staff name & role) will automatically be sent to this pinned number.
                </p>
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

              {/* Automated Triggers Section */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Automated Event Triggers
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSendToPinnedAdmin !== false}
                      onChange={(e) => setSettings({ ...settings, autoSendToPinnedAdmin: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>Notify Pinned Admin Number</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSendOnRegistration !== false}
                      onChange={(e) => setSettings({ ...settings, autoSendOnRegistration: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>User Registration Welcome</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSendOnNewOrder}
                      onChange={(e) => setSettings({ ...settings, autoSendOnNewOrder: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>New Order Customer Confirmation</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSendOnStatusChange !== false}
                      onChange={(e) => setSettings({ ...settings, autoSendOnStatusChange: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>Order Status Transition Alerts</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/60 sm:col-span-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSendOnPaymentUpdate !== false}
                      onChange={(e) => setSettings({ ...settings, autoSendOnPaymentUpdate: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <span>Staff Payment Details Update Security Alert</span>
                  </label>
                </div>
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

      {/* Start New Conversation Modal (Direct message to any phone number) */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <MessageSquarePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Start New WhatsApp Chat</h3>
                  <p className="text-xs text-slate-500">
                    Message any customer or phone number directly
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmStartNewChat} className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Recipient Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 01712345678 or +8801712345678"
                    value={newChatPhone}
                    onChange={(e) => setNewChatPhone(e.target.value)}
                    autoFocus
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enter an 11-digit Bangladeshi number (01...) or international (+880...)
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Rahim Ahmed / Dhaka Client"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Message <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Type an opening message to dispatch immediately, or leave blank to just open the chatbox..."
                  value={newChatInitialMessage}
                  onChange={(e) => setNewChatInitialMessage(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newChatPhone.trim() || startingNewChat}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {startingNewChat ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="w-3.5 h-3.5" />
                  )}
                  <span>Open Conversation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Custom Name Modal */}
      {isEditingNameModal && activeConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Set Customer Name</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {formatPhoneDisplay(activeConversation.phoneNumber)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingNameModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Custom Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. VIP Customer - Salam (Dhaka)"
                value={editingNameValue}
                onChange={(e) => setEditingNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCustomName();
                }}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This custom name will be saved permanently in Firestore & synchronized across all staff devices for easy customer identification.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {editingNameValue.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => setEditingNameValue('')}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer mr-auto"
                >
                  Clear Name
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsEditingNameModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomName}
                disabled={savingName}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingName ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Custom Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Media Modal (Image, Video, Voice Note, Document, Link) */}
      {isSendMediaModal && activeConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  {mediaTypeToSend === 'image' && <ImageIcon className="w-5 h-5 text-emerald-600" />}
                  {mediaTypeToSend === 'video' && <VideoIcon className="w-5 h-5 text-purple-600" />}
                  {mediaTypeToSend === 'voice' && <Mic className="w-5 h-5 text-amber-600" />}
                  {mediaTypeToSend === 'document' && <Paperclip className="w-5 h-5 text-blue-600" />}
                  {mediaTypeToSend === 'link' && <Link2 className="w-5 h-5 text-sky-600" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Send {mediaTypeToSend === 'voice' ? 'Voice Note / Audio' : mediaTypeToSend.toUpperCase()} via WhatsApp
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Recipient: {formatPhoneDisplay(activeConversation.phoneNumber)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSendMediaModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Type Tabs inside modal (Shows Image, Video, Voice, Document, Link with icons & text) */}
            <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1.5 rounded-2xl mt-4">
              {[
                { id: 'image', label: 'Image', icon: ImageIcon, color: 'text-emerald-600' },
                { id: 'video', label: 'Video', icon: VideoIcon, color: 'text-purple-600' },
                { id: 'voice', label: 'Voice', icon: Mic, color: 'text-amber-600' },
                { id: 'document', label: 'Doc', icon: Paperclip, color: 'text-blue-600' },
                { id: 'link', label: 'Link', icon: Link2, color: 'text-sky-600' },
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isSelected = mediaTypeToSend === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setMediaTypeToSend(tab.id as any)}
                    className={`py-2 px-1 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold ${
                      isSelected
                        ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/80 font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${tab.color}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="py-4 space-y-3">
              {/* Special UI when sending Voice: Direct Live Recorder */}
              {mediaTypeToSend === 'voice' && (
                <div className="p-4 bg-amber-50/80 border-2 border-amber-300 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-amber-600" />
                      Option 1: Record Voice Live (সরাসরি রেকর্ড করুন)
                    </span>
                    {voiceRecorder.isRecording && (
                      <span className="text-xs font-mono font-bold text-rose-600 animate-pulse">
                        ● Recording {Math.floor(voiceRecorder.recordingSeconds / 60)}:{(voiceRecorder.recordingSeconds % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>

                  {voiceRecorder.isRecording ? (
                    <div className="flex items-center justify-center gap-3 py-2">
                      <button
                        type="button"
                        onClick={voiceRecorder.cancelRecording}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold hover:bg-rose-100 hover:text-rose-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => voiceRecorder.stopRecording(false)}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" /> Stop Recording
                      </button>
                    </div>
                  ) : voiceRecorder.recordedAudioUrl ? (
                    <div className="space-y-2">
                      <WhatsAppAudioPlayer src={voiceRecorder.recordedAudioUrl} />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={voiceRecorder.cancelRecording}
                          className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold cursor-pointer"
                        >
                          Re-record
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2">
                      <button
                        type="button"
                        onClick={() => voiceRecorder.startRecording()}
                        className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95 transition-all"
                      >
                        <Mic className="w-4 h-4" /> Tap to Start Recording
                      </button>
                      <p className="text-[10px] text-slate-500 mt-1">Microphone will record and send voice note directly.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Option 2: Device File Upload (for image, video, voice, doc) */}
              {mediaTypeToSend !== 'link' && (
                <div className="p-3.5 bg-slate-50 border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl transition-all">
                  <label className="flex flex-col items-center justify-center cursor-pointer space-y-1.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-800">
                        {uploadedFileName
                          ? `📁 File Attached: ${uploadedFileName}`
                          : `Choose ${mediaTypeToSend.toUpperCase()} File from Device`}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Click to upload directly from phone or PC (JPEG, PNG, MP4, MP3, PDF)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept={
                        mediaTypeToSend === 'image'
                          ? 'image/*'
                          : mediaTypeToSend === 'video'
                          ? 'video/*'
                          : mediaTypeToSend === 'voice'
                          ? 'audio/*'
                          : mediaTypeToSend === 'document'
                          ? '.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip'
                          : '*'
                      }
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadedFileName(file.name);
                          if (mediaTypeToSend === 'document' || !mediaFilenameInput) {
                            setMediaFilenameInput(file.name);
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') {
                              setMediaUrlInput(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Option 3: Paste Direct Link or URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {mediaTypeToSend === 'link'
                    ? 'Web Link URL (https://...)'
                    : 'Or Paste Web Link / Media URL (Google Drive, Dropbox, direct URL)'}
                </label>
                <input
                  type="url"
                  placeholder={
                    mediaTypeToSend === 'image'
                      ? 'https://example.com/product-image.jpg or Google Drive Link'
                      : mediaTypeToSend === 'video'
                      ? 'https://example.com/demo-video.mp4 or Google Drive Link'
                      : mediaTypeToSend === 'voice'
                      ? 'https://example.com/voice-note.mp3 or Google Drive Link'
                      : mediaTypeToSend === 'document'
                      ? 'https://example.com/invoice.pdf or Google Drive Link'
                      : 'https://kenaxbd.com/product/123'
                  }
                  value={
                    mediaUrlInput.startsWith('data:')
                      ? `[Attached Device File: ${uploadedFileName || 'Local File'}]`
                      : mediaUrlInput
                  }
                  onChange={(e) => {
                    setUploadedFileName('');
                    setMediaUrlInput(e.target.value);
                  }}
                  autoFocus={mediaTypeToSend === 'link'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />
              </div>

              {mediaTypeToSend === 'document' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Document Filename (e.g. Order_Invoice_1042.pdf)
                  </label>
                  <input
                    type="text"
                    placeholder="Invoice_1042.pdf"
                    value={mediaFilenameInput}
                    onChange={(e) => setMediaFilenameInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              )}

              {mediaTypeToSend !== 'voice' && mediaTypeToSend !== 'link' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Caption Text (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add a message caption to accompany this media..."
                    value={mediaCaptionInput}
                    onChange={(e) => setMediaCaptionInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Image preview if URL or device file */}
              {mediaTypeToSend === 'image' && mediaUrlInput && (
                <div className="p-2 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center max-h-40 overflow-hidden">
                  <img
                    src={mediaUrlInput}
                    alt="Preview"
                    className="max-h-36 object-contain rounded-lg"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-500 leading-relaxed">
                {mediaTypeToSend === 'link'
                  ? 'Meta Cloud API will automatically render an interactive preview card with title & thumbnail for this link.'
                  : 'Media will be dispatched directly to the recipient’s WhatsApp using Meta Official Cloud API.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSendMediaModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendMedia}
                disabled={(!mediaUrlInput.trim() && !voiceRecorder.recordedAudioUrl) || sendingMedia}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {sendingMedia ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send {mediaTypeToSend.toUpperCase()} Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal WhatsApp Media Preview Modal */}
      <WhatsAppMediaPreviewModal
        target={activeMediaPreview}
        onClose={() => setActiveMediaPreview(null)}
      />
    </div>
  );
};
