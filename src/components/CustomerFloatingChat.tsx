import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  ExternalLink,
  ShieldCheck,
  Check,
  Sparkles,
  User,
  Bot,
  Phone,
  ShoppingBag,
  RotateCcw,
  Clock,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Truck,
  CreditCard,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Tag,
  Layers,
  Info,
  Star,
  Copy,
  MapPin,
  Headphones,
  ChevronDown,
} from 'lucide-react';
import { SiWhatsapp, SiTelegram, SiMessenger } from 'react-icons/si';
import { CustomerRecord, SiteSettings, Order, Product } from '../types';
import {
  BANGLADESH_LOCATIONS,
  BANGLADESH_DIVISION_NAMES_BN,
  BANGLADESH_DISTRICT_NAMES_BN,
} from '../data/bangladeshData';
import { ClickableOrderId } from './common/ClickableOrderId';
import { KenaXLogo } from './KenaXLogo';
import { evaluateChatBotRules, searchCatalogHierarchicalMatrix } from '../lib/chatBotRuleMatcher';
import { getEnvApiHeaders } from '../utils/envHelper';
import { enrichProductsWithPopularity, getSortedPopularProducts } from '../utils/productPopularity';

interface CustomerFloatingChatProps {
  currentCustomer: CustomerRecord | null;
  siteSettings: SiteSettings;
  onAddOrder?: (newOrder: Order) => Promise<void> | void;
  products?: Product[];
  onOpenProductDetail?: (product: Product) => void;
  orders?: Order[];
  wishlist?: Product[];
  cart?: any[];
}

export interface OrderCartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedColorImage?: string;
  selectedSize?: string;
}

interface ChatMessage {
  id: string;
  sender: 'customer' | 'support' | 'bot';
  text: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  actionLinks?: Array<{ label: string; url: string; type: string }>;
  suggestedProducts?: any[];
  productSectionTitle?: string;
  productTitleChips?: string[];
  categoryChips?: string[];
  quickReplies?: Array<{ label: string; text: string; icon?: string }>;
  isTrackForm?: boolean;
  trackedOrder?: any;
  orderData?: {
    orderId: string;
    productName: string;
    productId?: string;
    productImage?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    totalAmount: number;
    deliveryCharge: number;
    customerName: string;
    customerMobile: string;
    deliveryAddress: string;
    deliveryZone: 'dhaka' | 'outside';
    paymentMethod: 'cod' | 'advance_delivery' | 'full_advance';
    selectedColor?: string;
    selectedSize?: string;
    variant?: string;
    status: 'pending';
  };
}

// Helper function to render formatted text with bold Markdown (**bold**), bullet items, and paragraphs cleanly
function renderFormattedMessage(text: string) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed text-xs">
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lIdx} className="h-1" />;
        }

        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const contentText = isBullet ? trimmed.replace(/^[•\-\*]\s*/, '') : trimmed;

        // Parse **bold** syntax
        const parts = contentText.split(/(\*\*.*?\*\*)/g);
        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            const boldInner = part.slice(2, -2);
            return (
              <strong key={pIdx} className="font-black text-slate-950 dark:text-white">
                {boldInner}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={lIdx} className="flex items-start gap-1.5 pl-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">•</span>
              <span className="flex-1 text-slate-800 dark:text-slate-200">{renderedParts}</span>
            </div>
          );
        }

        return (
          <p key={lIdx} className="text-slate-800 dark:text-slate-200">
            {renderedParts}
          </p>
        );
      })}
    </div>
  );
}

export const CustomerFloatingChat: React.FC<CustomerFloatingChatProps> = ({
  currentCustomer,
  siteSettings,
  onAddOrder,
  products = [],
  onOpenProductDetail,
  orders = [],
  wishlist = [],
  cart = [],
}) => {
  // Active chat modal: 'none' | 'ai_bot' | 'whatsapp' | 'telegram'
  const [activeChatModal, setActiveChatModal] = useState<'none' | 'ai_bot' | 'whatsapp' | 'telegram'>('none');
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showGreetingTooltip, setShowGreetingTooltip] = useState(true);
  const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(false);

  // Refs for tracking outside clicks
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const supportMenuRef = useRef<HTMLDivElement>(null);

  // Official Channel Numbers
  const officialAgentNumber = siteSettings.officialWhatsAppAgentNumber || siteSettings.whatsappNumber || '01719143897';
  const superAdminNumber = siteSettings.whatsappSuperAdminNumber || '01887713212';
  const telegramBotUsername = siteSettings.telegramBotUsername || 'kenaxbd_bot';
  const messengerUrl = siteSettings.messengerLink || 'https://m.me/kenaxbd';
  const botName = siteSettings.aiBotName || 'KenaX AI Bot';

  // Delivery Charges
  const insideDhakaFee = siteSettings.insideDhakaDeliveryCharge || siteSettings.insideDhakaDeliveryFee || 60;
  const outsideDhakaFee = siteSettings.outsideDhakaDeliveryCharge || siteSettings.outsideDhakaDeliveryFee || 120;

  // Active user details - persisted in sessionStorage (cleared on browser tab close, preserved on refresh)
  const [guestName, setGuestName] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kenax_customer_chat_profile');
      if (saved) return JSON.parse(saved).name || '';
    } catch {}
    return '';
  });

  const [guestPhone, setGuestPhone] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kenax_customer_chat_profile');
      if (saved) return JSON.parse(saved).phone || '';
    } catch {}
    return '';
  });

  // Clear legacy localStorage chat data on mount
  useEffect(() => {
    try {
      localStorage.removeItem('kenax_ai_chat_messages_v5');
      localStorage.removeItem('kenax_ai_chat_messages_v2');
      localStorage.removeItem('kenax_wa_chat_messages');
      localStorage.removeItem('kenax_tg_chat_messages');
      localStorage.removeItem('kenax_customer_chat_profile');
    } catch {}
  }, []);

  const activeCustomerName = currentCustomer?.name || guestName || 'সম্মানিত গ্রাহক';
  const activeCustomerPhone = currentCustomer?.mobile || guestPhone || '';

  // Track product IDs shown in current session to prevent repeating same items
  const [shownProductIds, setShownProductIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('kenax_shown_product_ids');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('kenax_shown_product_ids', JSON.stringify(shownProductIds));
    } catch {}
  }, [shownProductIds]);

  // Handle click outside to close speed dial or chat modal (hover will not close it)
  useEffect(() => {
    if (!isSpeedDialOpen && activeChatModal === 'none') return;

    const handleDocumentPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (chatContainerRef.current && target && !chatContainerRef.current.contains(target)) {
        setIsSpeedDialOpen(false);
        setActiveChatModal('none');
      }
    };

    document.addEventListener('mousedown', handleDocumentPointerDown);
    document.addEventListener('touchstart', handleDocumentPointerDown, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleDocumentPointerDown);
      document.removeEventListener('touchstart', handleDocumentPointerDown);
    };
  }, [isSpeedDialOpen, activeChatModal]);

  // Close support menu when clicking outside
  useEffect(() => {
    if (!isSupportMenuOpen) return;

    const handleSupportClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (supportMenuRef.current && target && !supportMenuRef.current.contains(target)) {
        setIsSupportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleSupportClickOutside);
    document.addEventListener('touchstart', handleSupportClickOutside, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleSupportClickOutside);
      document.removeEventListener('touchstart', handleSupportClickOutside);
    };
  }, [isSupportMenuOpen]);

  // Quick initial product list for suggestions
  const initialPopularProducts = (products.length > 0 ? products : []).slice(0, 4);

  // Language Selection State: 'bn' | 'en' (sessionStorage)
  const [selectedLanguage, setSelectedLanguage] = useState<'bn' | 'en'>('bn');

  // -------------------------------------------------------------
  // AI BOT MESSAGES STATE & LOGIC (sessionStorage)
  // -------------------------------------------------------------
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('kenax_ai_chat_messages_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter((m) => m && m.id !== 'ai-welcome-lang');
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch {}
    return [
      {
        id: `welcome-${Date.now()}`,
        sender: 'bot',
        text: `আসসালামু আলাইকুম স্যার! **KenaX BD**-তে আপনাকে স্বাগতম। আমি আপনার ব্যক্তিগত শপিং অ্যাসিস্ট্যান্ট **${botName}**।\n\nআজ আপনাকে কীভাবে সহায়তা করতে পারি বলুন? আপনি কি কোনো নির্দিষ্ট পণ্য সম্পর্কে জানতে চান নাকি আমাদের আকর্ষণীয় কালেকশন দেখতে চান?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        quickReplies: [
          { label: '🛍️ পণ্য অর্ডার করতে চাই', text: 'আমি একটি পণ্য অর্ডার করতে চাই' },
          { label: '👶 বেবি ও বাচ্চাদের প্রোডাক্ট', text: 'বাচ্চাদের জন্য কী কী প্রোডাক্ট আছে দেখান' },
          { label: '🔥 সকল পণ্যসমূহ দেখুন', text: 'আপনাদের স্টোরে কী কী প্রোডাক্ট আছে দেখান' },
          { label: '🚚 ডেলিভারি চার্জ কত?', text: 'ডেলিভারি চার্জ এবং সময় কত?' },
          { label: '📦 অর্ডার ট্র্যাক করুন', text: 'আমার অর্ডার ট্র্যাক করতে চাই' },
        ],
      },
    ];
  });

  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(true);
  const aiScrollRef = useRef<HTMLDivElement>(null);
  const latestBotMsgRef = useRef<HTMLDivElement>(null);
  const orderFormRef = useRef<HTMLDivElement>(null);
  const shouldScrollToOrderFormTop = useRef<boolean>(false);

  // In-Chat Interactive Step-by-Step Order State
  const [activeOrderProduct, setActiveOrderProduct] = useState<any | null>(null);
  const [lastActiveOrderProduct, setLastActiveOrderProduct] = useState<any | null>(null);
  const [orderCartItems, setOrderCartItems] = useState<OrderCartItem[]>([]);

  const [orderProductName, setOrderProductName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [orderProductQty, setOrderProductQty] = useState(1);
  const [orderSelectedColor, setOrderSelectedColor] = useState<string>('');
  const [orderSelectedColorImage, setOrderSelectedColorImage] = useState<string>('');
  const [orderSelectedSize, setOrderSelectedSize] = useState<string>('');
  const [orderCustomerName, setOrderCustomerName] = useState(() => currentCustomer?.name || '');
  const [orderCustomerMobile, setOrderCustomerMobile] = useState(() => currentCustomer?.mobile || '');
  const [orderCustomerEmail, setOrderCustomerEmail] = useState(() => currentCustomer?.email || '');

  // Synchronize customer order form details with logged-in status
  useEffect(() => {
    if (currentCustomer) {
      setOrderCustomerName(currentCustomer.name || '');
      setOrderCustomerMobile(currentCustomer.mobile || '');
      setOrderCustomerEmail(currentCustomer.email || '');
      setOrderCreateAccount(false);
      setOrderPassword('');
      const defaultAddr: any = currentCustomer.savedAddresses?.find((a: any) => a?.isDefault) || currentCustomer.savedAddresses?.[0] || (currentCustomer as any).addresses?.[0];
      const addrStr = typeof defaultAddr === 'string' ? defaultAddr : defaultAddr?.address || '';
      if (addrStr) {
        setOrderAddress(addrStr);
        setOrderAddressDetails(addrStr);
      }
    } else {
      // When logged out, do NOT prefill name, number, or email
      setOrderCustomerName('');
      setOrderCustomerMobile('');
      setOrderCustomerEmail('');
      setOrderAddress('');
      setOrderAddressDetails('');
      setOrderCreateAccount(false);
      setOrderPassword('');
    }
  }, [currentCustomer]);
  
  // 3-Level Address Selectors State
  const [orderDivision, setOrderDivision] = useState<string>('Dhaka');
  const [orderDistrict, setOrderDistrict] = useState<string>('Dhaka');
  const [orderUpazila, setOrderUpazila] = useState<string>('Dhanmondi');
  const [orderAddressDetails, setOrderAddressDetails] = useState<string>('');
  const [orderDeliveryZone, setOrderDeliveryZone] = useState<'dhaka' | 'outside'>('dhaka');
  const [orderAddress, setOrderAddress] = useState('');

  // Payment & Transaction States
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<'cod' | 'advance_delivery' | 'full_advance'>('cod');
  const [orderPaymentProvider, setOrderPaymentProvider] = useState<'bkash' | 'nagad' | ''>('');
  const [orderSenderMobile, setOrderSenderMobile] = useState<string>('');
  const [orderTrxId, setOrderTrxId] = useState<string>('');
  const [orderCreateAccount, setOrderCreateAccount] = useState<boolean>(false);
  const [orderPassword, setOrderPassword] = useState<string>('');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [inquiredProductIds, setInquiredProductIds] = useState<string[]>([]);
  const [productButtonStages, setProductButtonStages] = useState<Record<string, 'details' | 'reviews' | 'page'>>({});
  const [isOrderBoxMinimized, setIsOrderBoxMinimized] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  // Input Refs for Form Validation Focus & Auto-scroll
  const inputNameRef = useRef<HTMLInputElement>(null);
  const inputMobileRef = useRef<HTMLInputElement>(null);
  const inputAddressRef = useRef<HTMLTextAreaElement>(null);
  const inputSenderMobileRef = useRef<HTMLInputElement>(null);
  const inputTrxIdRef = useRef<HTMLInputElement>(null);

  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderFormError, setOrderFormError] = useState('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Order Tracking Form State
  const [trackFormOrderId, setTrackFormOrderId] = useState('');
  const [trackFormPhone, setTrackFormPhone] = useState('');
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackErrorMsg, setTrackErrorMsg] = useState('');

  const normalizeColorName = (name: string): string => {
    if (!name) return 'Black';
    const lower = name.trim().toLowerCase();
    if (lower.includes('black') || lower.includes('ব্ল্যাক') || lower.includes('কালো')) return 'Black';
    if (lower.includes('white') || lower.includes('হোয়াইট') || lower.includes('হোয়াইট') || lower.includes('সাদা')) return 'White';
    if (lower.includes('teal') || lower.includes('টিল')) return 'Teal';
    if (lower.includes('red') || lower.includes('লাল')) return 'Red';
    if (lower.includes('blue') || lower.includes('ব্লু') || lower.includes('নীল')) return 'Blue';
    if (lower.includes('green') || lower.includes('গ্রিন') || lower.includes('সবুজ')) return 'Green';
    if (lower.includes('yellow') || lower.includes('হলুদ')) return 'Yellow';
    if (lower.includes('purple') || lower.includes('পার্পল') || lower.includes('বেগুনি')) return 'Purple';
    if (lower.includes('navy') || lower.includes('নেভি')) return 'Navy';
    if (lower.includes('maroon') || lower.includes('মেরুন')) return 'Maroon';
    return name.trim();
  };

  // Helper to safely extract colors from any product structure
  const getProductColors = (product: any): Array<{ name: string; hexCode?: string; imageUrl?: string }> => {
    if (!product) return [];
    let list: Array<{ name: string; hexCode?: string; imageUrl?: string }> = [];
    if (Array.isArray(product.colors) && product.colors.length > 0) {
      list = product.colors.map((c: any) => ({
        name: normalizeColorName(typeof c === 'string' ? c : (c.name || c.colorName || 'Black')),
        hexCode: c.hexCode || c.colorCode || '#000000',
        imageUrl: c.imageUrl || '',
      }));
    } else if (Array.isArray(product.variations)) {
      const colorVar = product.variations.find((v: any) => v.type === 'color' || (v.name && v.name.toLowerCase().includes('color')) || (v.name && v.name.includes('কালার')));
      if (colorVar) {
        if (Array.isArray(colorVar.colorItems) && colorVar.colorItems.length > 0) {
          list = colorVar.colorItems.map((c: any) => ({
            name: normalizeColorName(c.name || c.colorName || 'Black'),
            hexCode: c.hexCode || c.colorCode || '#000000',
            imageUrl: c.imageUrl || '',
          }));
        } else if (Array.isArray(colorVar.options || colorVar.values)) {
          list = (colorVar.options || colorVar.values).map((opt: string) => ({
            name: normalizeColorName(opt),
            hexCode: '#000000',
            imageUrl: '',
          }));
        }
      }
    }

    if (list.length === 0) {
      list = [
        { name: 'Black', hexCode: '#000000', imageUrl: '' },
        { name: 'White', hexCode: '#FFFFFF', imageUrl: '' },
        { name: 'Teal', hexCode: '#008080', imageUrl: '' },
      ];
    }
    return list;
  };

  // Helper to safely extract sizes from any product structure
  const getProductSizes = (product: any): string[] => {
    if (!product) return ['S', 'M', 'L', 'XL'];
    let list: string[] = [];
    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      list = product.sizes.map((s: any) => (typeof s === 'string' ? s : s.name || s.value || '')).filter(Boolean);
    } else if (Array.isArray(product.variations)) {
      const sizeVar = product.variations.find((v: any) => v.type === 'size' || (v.name && v.name.toLowerCase().includes('size')) || (v.name && v.name.includes('সাইজ')));
      if (sizeVar && Array.isArray(sizeVar.options || sizeVar.values)) {
        list = (sizeVar.options || sizeVar.values).filter(Boolean);
      }
    }
    if (list.length === 0) {
      list = ['S', 'M', 'L', 'XL'];
    }
    return list;
  };

  // Real-time dynamic categories derived directly from live active store products
  const dynamicCategories = React.useMemo(() => {
    const map = new Map<string, number>();
    (products || []).forEach((p) => {
      const cat = (p.category || 'অন্যান্য').trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [products]);

  // WhatsApp Messages State (sessionStorage)
  const [waMessages, setWaMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('kenax_wa_chat_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [waInput, setWaInput] = useState('');
  const [isSendingWa, setIsSendingWa] = useState(false);
  const waScrollRef = useRef<HTMLDivElement>(null);

  // Telegram Messages State (sessionStorage)
  const [tgMessages, setTgMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('kenax_tg_chat_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'tg-welcome',
        sender: 'bot',
        text: '🤖 স্বাগতম KenaX BD টেলিগ্রাম সাপোর্ট বটে! এখানে বার্তা পাঠালে তা সরাসরি আমাদের অফিশিয়াল টেলিগ্রাম বট ও অ্যাডমিন প্যানেলে পৌঁছে যাবে।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
      },
    ];
  });
  const [tgInput, setTgInput] = useState('');
  const [isSendingTg, setIsSendingTg] = useState(false);
  const tgScrollRef = useRef<HTMLDivElement>(null);

  // Save messages to session cache (preserved on refresh, cleared on tab close)
  useEffect(() => {
    try {
      sessionStorage.setItem('kenax_ai_chat_messages_v5', JSON.stringify(aiMessages));
    } catch {}
  }, [aiMessages]);

  useEffect(() => {
    try {
      sessionStorage.setItem('kenax_wa_chat_messages', JSON.stringify(waMessages));
    } catch {}
  }, [waMessages]);

  useEffect(() => {
    try {
      sessionStorage.setItem('kenax_tg_chat_messages', JSON.stringify(tgMessages));
    } catch {}
  }, [tgMessages]);

  // Auto-scroll chat bodies (Scrolls to top of bot response so user reads from top down through products)
  useEffect(() => {
    if (activeChatModal === 'ai_bot') {
      if (shouldScrollToOrderFormTop.current && orderFormRef.current) {
        shouldScrollToOrderFormTop.current = false;
        if (aiScrollRef.current) {
          aiScrollRef.current.scrollTop = Math.max(0, orderFormRef.current.offsetTop - 12);
        }
      } else {
        const lastMsg = aiMessages[aiMessages.length - 1];
        if (lastMsg && lastMsg.sender === 'bot') {
          // When bot replies (with products, answers, or guides), scroll to the top of the bot's message inside chat container
          const timer = setTimeout(() => {
            if (latestBotMsgRef.current && aiScrollRef.current) {
              aiScrollRef.current.scrollTop = Math.max(0, latestBotMsgRef.current.offsetTop - 12);
            } else if (aiScrollRef.current) {
              aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
            }
          }, 80);
          return () => clearTimeout(timer);
        } else if (aiScrollRef.current) {
          // When customer sends message or bot is thinking, scroll to bottom
          aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
        }
      }
    }
    if (activeChatModal === 'whatsapp' && waScrollRef.current) {
      waScrollRef.current.scrollTop = waScrollRef.current.scrollHeight;
    }
    if (activeChatModal === 'telegram' && tgScrollRef.current) {
      tgScrollRef.current.scrollTop = tgScrollRef.current.scrollHeight;
    }
  }, [aiMessages, waMessages, tgMessages, activeChatModal, showAiSuggestions, isAiThinking, isOrderModalOpen, isOrderBoxMinimized, activeOrderProduct]);

  // Auto dismiss greeting tooltip after 9s
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGreetingTooltip(false);
    }, 9000);
    return () => clearTimeout(timer);
  }, []);

  // Close chat modal when clicking outside the chat widget
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chatContainerRef.current &&
        !chatContainerRef.current.contains(event.target as Node) &&
        activeChatModal !== 'none'
      ) {
        setActiveChatModal('none');
        setIsSpeedDialOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeChatModal]);

  // Reset / Clear Chat
  const handleClearChat = () => {
    const resetMsg: ChatMessage = {
      id: `ai-reset-${Date.now()}`,
      sender: 'bot',
      text: `আসসালামু আলাইকুম! KenaX BD-তে স্বাগতম। আমি আপনাকে কীভাবে সহায়তা করতে পারি? বলুন।`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickReplies: [
        { label: '🛍️ অর্ডার করতে চাই', text: 'আমি একটি পণ্য অর্ডার করতে চাই' },
        { label: '👶 বেবি ও বাচ্চাদের প্রোডাক্ট', text: 'বাচ্চাদের জন্য কী কী প্রোডাক্ট আছে দেখান' },
        { label: '🔥 জনপ্রিয় পণ্যসমূহ', text: 'আপনাদের সেরা ও জনপ্রিয় পণ্যগুলো দেখান' },
        { label: '✨ আরও প্রোডাক্ট দেখান', text: 'আরও অন্যরকম প্রোডাক্ট দেখাও' },
        { label: 'ℹ️ আমাদের সম্পর্কে', text: 'KenaX BD সম্পর্কে জানতে চাই' },
        { label: '🚚 ডেলিভারি চার্জ কত?', text: 'ডেলিভারি চার্জ ও ডেলিভারির নিয়মগুলো বলুন' },
        { label: '📞 কাস্টমার সাপোর্ট', text: 'কাস্টমার সাপোর্ট ও যোগাযোগের নম্বর দিন' },
      ],
    };
    setAiMessages([resetMsg]);
    setShownProductIds([]);
    try {
      sessionStorage.removeItem('kenax_shown_product_ids');
    } catch {}
    setActiveOrderProduct(null);
    setOrderProductName('');
    setSelectedProductId(undefined);
  };

  // -------------------------------------------------------------
  // HIDE ORDER FORM HANDLER
  // -------------------------------------------------------------
  const handleHideOrderForm = () => {
    setActiveOrderProduct(null);
    setOrderCartItems([]);
    setIsOrderBoxMinimized(false);
  };

  // -------------------------------------------------------------
  // INQUIRE ABOUT PRODUCT (DETAILS & SPECIFICATIONS)
  // -------------------------------------------------------------
  const handleInquireProduct = (product: any) => {
    const pName = product.name || product.title;
    const pId = String(product.id || pName);
    setInquiredProductIds((prev) => (prev.includes(pId) ? prev : [...prev, pId]));
    setProductButtonStages((prev) => ({ ...prev, [pId]: 'reviews' }));
    handleSendAiMessage(`${pName} সম্পর্কে বিস্তারিত জানতে চাই`, product);
  };

  // -------------------------------------------------------------
  // VIEW REVIEWS & RATINGS OF PRODUCT
  // -------------------------------------------------------------
  const handleViewReviews = (product: any) => {
    const pName = product.name || product.title;
    const pId = String(product.id || pName);
    setProductButtonStages((prev) => ({ ...prev, [pId]: 'page' }));
    handleSendAiMessage(`${pName} এর কাস্টমার রিভিউ ও রেটিং দেখতে চাই`, product);
  };

  // -------------------------------------------------------------
  // GO TO FULL PRODUCT PAGE
  // -------------------------------------------------------------
  const handleGoToProductPage = (product: any) => {
    const pName = product.name || product.title;
    const pId = String(product.id || pName);
    setProductButtonStages((prev) => ({ ...prev, [pId]: 'details' }));
    if (onOpenProductDetail) {
      onOpenProductDetail(product);
      setActiveChatModal('none');
    } else {
      handleSendAiMessage(`${pName} এর মূল প্রোডাক্ট পেজে যেতে চাই`, product);
    }
  };

  // -------------------------------------------------------------
  // SELECT PRODUCT DIRECTLY FROM SUGGESTION CARDS / CHIPS
  // -------------------------------------------------------------
  const handleSelectProductForOrder = (product: any) => {
    const pName = product.name || product.title;
    const pId = String(product.id || pName);

    // Check if product is already in the order form / cart
    const isAlreadyInCart =
      (activeOrderProduct && (String(activeOrderProduct.id) === pId || activeOrderProduct.name === pName)) ||
      orderCartItems.some((item) => String(item.product.id) === pId || item.product.name === pName);

    if (isAlreadyInCart) {
      // Re-open the existing form for this same product without incrementing quantity or duplicating!
      setActiveOrderProduct(product);
      setLastActiveOrderProduct(product);
      setIsOrderBoxMinimized(false);
      setFieldErrors({});

      // Scroll to start of the order form so user can begin from top
      shouldScrollToOrderFormTop.current = true;
      setTimeout(() => {
        if (aiScrollRef.current && orderFormRef.current) {
          aiScrollRef.current.scrollTop = Math.max(0, orderFormRef.current.offsetTop - 12);
        }
      }, 100);
      return;
    }

    setOrderProductName(pName);
    setSelectedProductId(product.id);
    setActiveOrderProduct(product);
    setLastActiveOrderProduct(product);
    setIsOrderBoxMinimized(false);
    setFieldErrors({});

    const availableColors = getProductColors(product);
    const availableSizes = getProductSizes(product);

    const defaultColor = availableColors.length > 0 ? availableColors[0].name : '';
    const defaultColorImg = availableColors.length > 0 ? (availableColors[0].imageUrl || '') : '';
    const defaultSize = availableSizes.length > 0 ? availableSizes[0] : '';

    if (availableColors.length > 0) {
      setOrderSelectedColor(defaultColor);
      setOrderSelectedColorImage(defaultColorImg);
    } else {
      setOrderSelectedColor('');
      setOrderSelectedColorImage('');
    }

    if (availableSizes.length > 0) {
      setOrderSelectedSize(defaultSize);
    } else {
      setOrderSelectedSize('');
    }

    setOrderCartItems((prevItems) => {
      return [
        ...prevItems,
        {
          product,
          quantity: 1,
          selectedColor: defaultColor,
          selectedColorImage: defaultColorImg,
          selectedSize: defaultSize,
        },
      ];
    });

    const userSelectMsg: ChatMessage = {
      id: `ai-u-sel-${Date.now()}`,
      sender: 'customer',
      text: `আমি "${pName}" কার্টে/অর্ডারে যোগ করতে চাই।`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    const unitPrice = Number(product.price) || 1200;

    let variationGuide = '';
    if (availableColors.length > 0) {
      variationGuide += `\n🎨 **কালার:** ${availableColors.map((c) => c.name).join(', ')}`;
    }
    if (availableSizes.length > 0) {
      variationGuide += `\n📏 **সাইজ:** ${availableSizes.join(', ')}`;
    }

    const botGuideMsg: ChatMessage = {
      id: `ai-b-sel-${Date.now()}`,
      sender: 'bot',
      text: `✨ চমৎকার পছন্দ! **${pName}** আপনার অর্ডার কার্টে যুক্ত করা হয়েছে (প্রোডাক্টের মূল্য: ৳${unitPrice.toLocaleString()})।${variationGuide}\n\nঅর্ডার কনফার্মেশন ফর্মটি নিচে শুরু থেকে খোলা হয়েছে — নাম, মোবাইল নম্বর ও ঠিকানা দিয়ে **'অর্ডার কনফার্ম করুন'** বাটনে চাপ দিন।`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quickReplies: [
        { label: '💵 Cash on Delivery', text: 'Cash on Delivery-তে নিতে চাই' },
        { label: '🚚 ডেলিভারি চার্জ অগ্রিম', text: 'শুধু ডেলিভারি চার্জ অগ্রিম দেব' },
        { label: '💳 ফুল পেমেন্ট করব', text: 'সম্পূর্ণ টাকা অগ্রিম দেব' },
      ],
    };

    setAiMessages((prev) => [...prev, userSelectMsg, botGuideMsg]);

    // Scroll to start of the order form
    shouldScrollToOrderFormTop.current = true;
    setTimeout(() => {
      if (aiScrollRef.current && orderFormRef.current) {
        aiScrollRef.current.scrollTop = Math.max(0, orderFormRef.current.offsetTop - 12);
      }
    }, 100);
  };

  // Helper for Order Status Bangla details
  const getStatusBanglaDetails = (status: string = 'pending') => {
    const s = String(status).toLowerCase();
    if (s.includes('confirm') || s.includes('approve')) {
      return {
        badge: '✅ কনফার্মড (Confirmed)',
        description: 'আপনার অর্ডারটি কনফার্ম হয়েছে এবং ডেলিভারির জন্য প্যাকিং সম্পন্ন করা হচ্ছে।',
        color: 'bg-emerald-100 text-emerald-900 border-emerald-300'
      };
    }
    if (s.includes('process') || s.includes('pack')) {
      return {
        badge: '📦 প্রসেসিং চলছে (Processing)',
        description: 'আপনার পণ্যের কোয়ালিটি চেক ও প্যাকিং সম্পন্ন হচ্ছে।',
        color: 'bg-blue-100 text-blue-900 border-blue-300'
      };
    }
    if (s.includes('ship') || s.includes('transit')) {
      return {
        badge: '🚚 শিপড (Shipped)',
        description: 'আপনার অর্ডারটি কুরিয়ারে হস্তান্তরিত হয়ে আপনার ঠিকানার উদ্দেশ্যে বের হয়েছে।',
        color: 'bg-purple-100 text-purple-900 border-purple-300'
      };
    }
    if (s.includes('deliver') || s.includes('complete')) {
      return {
        badge: '🎉 ডেলিভারড (Delivered)',
        description: 'পার্সেলটি আপনার ঠিকানায় সফলভাবে ডেলিভারি করা হয়েছে। KenaX BD-তে কেনাকাটার জন্য ধন্যবাদ!',
        color: 'bg-teal-100 text-teal-900 border-teal-300'
      };
    }
    if (s.includes('cancel')) {
      return {
        badge: '❌ বাতিলকৃত (Cancelled)',
        description: 'যেকোনো একটি কারণে এই অর্ডারটি বাতিল করা হয়েছে। বিস্তারিত জানতে আমাদের সাপোর্টে কল করুন।',
        color: 'bg-rose-100 text-rose-900 border-rose-300'
      };
    }
    return {
      badge: '⏳ পেন্ডিং (Pending)',
      description: 'আপনার অর্ডারটি সিস্টেমে গ্রহণ করা হয়েছে। দ্রুতই আমাদের প্রতিনিধি কল করে কনফার্ম করবেন।',
      color: 'bg-amber-100 text-amber-900 border-amber-300'
    };
  };

  // Handle Order Tracking execution
  const handleExecuteTrackOrder = async (orderIdInput: string, phoneInput: string) => {
    const cleanId = orderIdInput.trim();
    const cleanPhone = phoneInput.replace(/[^0-9]/g, '');

    if (!cleanId || !cleanPhone || cleanPhone.length < 11) {
      setTrackErrorMsg('অনুগ্রহ করে সঠিক অর্ডার আইডি এবং ১১ ডিজিটের মোবাইল নম্বর উভয়ই লিখুন।');
      return;
    }

    // Automatically hide/minimize any active open order form box when tracking
    if (activeOrderProduct) {
      setLastActiveOrderProduct(activeOrderProduct);
      setActiveOrderProduct(null);
    }
    setIsOrderBoxMinimized(true);

    setIsTrackingLoading(true);
    setTrackErrorMsg('');

    try {
      const res = await fetch('/api/track-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: cleanId, mobile: cleanPhone }),
      });
      const data = await res.json();

      if (data.success && data.order) {
        // EXACT MATCH FOUND!
        const ord = data.order;
        const stDetails = getStatusBanglaDetails(ord.status);

        const ordItem = Array.isArray(ord.items) && ord.items.length > 0 ? ord.items[0] : null;
        const prodTitle = ordItem?.name || ordItem?.productName || ord.productName || 'অর্ডারকৃত পণ্য';
        const matchedProd = products?.find(
          (p) => p.id === ordItem?.productId || p.id === ordItem?.id || p.name.toLowerCase().includes(prodTitle.toLowerCase())
        );

        const botMsg: ChatMessage = {
          id: `ai-track-res-${Date.now()}`,
          sender: 'bot',
          text: `📦 **আপনার অর্ডার ট্র্যাকিং রিপোর্ট:**\n\n🔹 **অর্ডার আইডি:** #${ord.id}\n🔹 **গ্রাহকের নাম:** ${ord.customerName || ord.deliveryName || 'সম্মানিত গ্রাহক'}\n🔹 **মোবাইল নম্বর:** ${ord.customerMobile || ord.deliveryMobile}\n\n🟢 **অর্ডারের বর্তমান অবস্থা:** ${stDetails.badge}\n📝 **স্ট্যাটাস বিবরণ:** ${stDetails.description}\n\n📍 **ডেলিভারি ঠিকানা:** ${ord.deliveryAddress || ord.fullAddress || 'N/A'}\n💰 **মোট পরিশোধযোগ্য (বকেয়া):** ৳${Number(ord.dueAmount ?? (ord.totalAmount || ord.total || 0)).toLocaleString()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          trackedOrder: ord,
          suggestedProducts: [], // Strictly NO suggested products shown on order tracking
        };

        setAiMessages((prev) => [...prev, botMsg]);
      } else if (data.matchType === 'mismatch') {
        // MISMATCH SCENARIO
        const botMsg: ChatMessage = {
          id: `ai-track-mismatch-${Date.now()}`,
          sender: 'bot',
          text: `❌ **অর্ডারের তথ্যে গরমিল রয়েছে!**\n\nআপনার এই নাম্বারে কোন অর্ডার নাই কিংবা এই অর্ডার আইডিতে ভুল। আপনি সঠিক নাম্বার কিংবা সঠিক অর্ডার আইডি দিয়ে পুনরায় চেষ্টা করুন।`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isTrackForm: true, // Re-open tracking form card
          suggestedProducts: [], // Strictly NO products shown
        };
        setAiMessages((prev) => [...prev, botMsg]);
      } else {
        // NO ORDER FOUND FOR THAT MOBILE / ORDER ID
        const botMsg: ChatMessage = {
          id: `ai-track-notfound-${Date.now()}`,
          sender: 'bot',
          text: `❌ **কোনো অর্ডার পাওয়া যায়নি!**\n\nআপনার প্রদত্ত অর্ডার আইডি বা মোবাইল নম্বর দিয়ে কোনো অর্ডার রেকর্ড পাওয়া যায়নি। অনুগ্রহ করে সঠিক তথ্য দিয়ে পুনরায় চেষ্টা করুন:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isTrackForm: true,
          suggestedProducts: [],
        };
        setAiMessages((prev) => [...prev, botMsg]);
      }
    } catch {
      setTrackErrorMsg('সার্ভারে যোগাযোগ করতে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  // -------------------------------------------------------------
  // SEND MESSAGE TO AI BOT
  // -------------------------------------------------------------
  const handleSendAiMessage = async (customText?: string, explicitTargetProduct?: any) => {
    const textToSend = (customText || aiInput).trim();
    if (!textToSend || isAiThinking) return;

    // Special trigger: open order modal directly
    if (textToSend === 'অর্ডার ফর্ম খুলুন' || textToSend === '📝 অর্ডার ফর্ম খুলুন') {
      setIsOrderModalOpen(true);
      setAiInput('');
      return;
    }

    // Special trigger: Order Tracking Request
    const lowerTxt = textToSend.toLowerCase().trim();
    const isTrackTrigger =
      textToSend.includes('অর্ডার ট্র্যাক') ||
      textToSend.includes('অর্ডার ট্র্যাকিং') ||
      textToSend.includes('অর্ডার ট্রাক') ||
      textToSend.includes('অর্ডার কোথায়') ||
      textToSend.includes('অর্ডার কই') ||
      textToSend.includes('অর্ডার স্ট্যাটাস') ||
      textToSend.includes('অর্ডার স্টেটাস') ||
      textToSend.includes('অর্ডার চেক') ||
      textToSend.includes('পার্সেল ট্র্যাক') ||
      textToSend.includes('পার্সেল কোথায়') ||
      textToSend.includes('ডেলিভারি কোথায়') ||
      textToSend.includes('ডেলিভারি স্ট্যাটাস') ||
      lowerTxt.includes('track order') ||
      lowerTxt.includes('track my order') ||
      lowerTxt.includes('order track') ||
      lowerTxt.includes('order status') ||
      lowerTxt.includes('tracking') ||
      lowerTxt.includes('track') ||
      lowerTxt.includes('ট্র্যাক') ||
      lowerTxt === 'status' ||
      lowerTxt === 'স্ট্যাটাস' ||
      lowerTxt === 'অর্ডার স্ট্যাটাস';

    if (isTrackTrigger) {
      if (activeOrderProduct) {
        setLastActiveOrderProduct(activeOrderProduct);
        setActiveOrderProduct(null);
      }
      setIsOrderBoxMinimized(true);

      const userMsg: ChatMessage = {
        id: `ai-u-${Date.now()}`,
        sender: 'customer',
        text: textToSend,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'sent',
      };

      const trackFormMsg: ChatMessage = {
        id: `ai-track-form-${Date.now()}`,
        sender: 'bot',
        text: `🔍 **অর্ডার ট্র্যাকিং সিস্টেম**\n\nআপনার অর্ডারের সঠিক বর্তমান অবস্থা জানতে নিচে আপনার **অর্ডার আইডি** এবং **১১ ডিজিটের মোবাইল নম্বর** দিন:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isTrackForm: true,
        suggestedProducts: [], // CRITICAL: NO PRODUCTS OR CATEGORIES SHOWN AT THIS STAGE
      };

      setAiMessages((prev) => [...prev, userMsg, trackFormMsg]);
      setAiInput('');
      return;
    }

    // Determine and update language choice
    const textLower = textToSend.toLowerCase().trim();
    let currentLang = selectedLanguage;

    if (
      textToSend === 'আমি বাংলায় কথা বলতে চাই' ||
      textLower === 'বাংলা' ||
      textLower === 'bangla' ||
      textLower === 'bengali'
    ) {
      currentLang = 'bn';
      setSelectedLanguage('bn');
      try { sessionStorage.setItem('kenax_ai_chat_lang', 'bn'); } catch {}
    } else if (
      textToSend === 'I want to speak in English' ||
      textLower === 'english' ||
      textLower === 'en'
    ) {
      currentLang = 'en';
      setSelectedLanguage('en');
      try { sessionStorage.setItem('kenax_ai_chat_lang', 'en'); } catch {}
    } else {
      // Auto switch language if customer writes in Bengali script or Banglish
      const hasBanglaScript = /[\u0980-\u09FF]/.test(textToSend);
      const banglishKeywords = [
        'kemon', 'koto', 'dam', 'daam', 'taka', 'tk', 'kivabe', 'kora', 'jabe', 'chai',
        'dekhau', 'dekhan', 'dekhi', 'nibo', 'nite', 'thikana', 'nam', 'bhai', 'apnadr',
        'কেমন', 'কত', 'দাম', 'টাকা', 'চাই'
      ];
      const hasBanglish = banglishKeywords.some((w) => textLower.includes(w));

      if (currentLang === 'en' && (hasBanglaScript || hasBanglish)) {
        currentLang = 'bn';
        setSelectedLanguage('bn');
        try { sessionStorage.setItem('kenax_ai_chat_lang', 'bn'); } catch {}
      }
    }

    const userMsgId = `ai-u-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'customer',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setIsAiThinking(true);

    try {
      // Check if this is an order or product inquiry so it goes directly to Gemini AI
      const isOrderOrProductQuery =
        /(?:order|অর্ডার|কিনতে|নিতে চাই|buy|বুকিং|পণ্য|প্রোডাক্ট|দাম|price|স্টক|stock|কালেকশন|লিস্ট|list|দেখান|dekhan)/i.test(textToSend);

      // Check Rule Matrix only for generic non-product queries
      const ruleMatch = !isOrderOrProductQuery
        ? evaluateChatBotRules(
            textToSend,
            siteSettings.chatBotRules,
            siteSettings,
            currentLang === 'en' ? 'en' : 'bn'
          )
        : null;

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
            label: `WhatsApp Agent (${officialAgentNumber})`,
            url: `https://wa.me/88${officialAgentNumber.replace(/[^0-9]/g, '')}`,
            type: 'whatsapp',
          });
        }

        let suggestedProds: any[] = [];
        if (ruleMatch.actionType === 'suggest_products') {
          suggestedProds = getSortedPopularProducts(products || [], orders || [], wishlist || [], cart || [], 4);
        }

        const botMsg: ChatMessage = {
          id: `ai-b-${Date.now()}`,
          sender: 'bot',
          text: ruleMatch.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionLinks: actionLinks.length > 0 ? actionLinks : undefined,
          suggestedProducts: suggestedProds.length > 0 ? suggestedProds : undefined,
        };

        setAiMessages((prev) => [...prev, botMsg]);
        setIsAiThinking(false);
        return;
      }

      // Pre-compute popularity-enriched product catalog (Favorites, Add to Cart, Buy Now Orders)
      const enrichedProducts = enrichProductsWithPopularity(
        products || [],
        orders || [],
        wishlist || [],
        cart || []
      );

      // Evaluate hierarchical search rule matrix (Main -> Sub -> Child -> Title Words -> Description/Specs)
      const hierarchicalMatch = searchCatalogHierarchicalMatrix(
        textToSend,
        enrichedProducts as any,
        (siteSettings?.categories as any) || [],
        currentLang === 'en' ? 'en' : 'bn'
      );

      // Build previous conversation history
      const historyPayload = aiMessages.slice(-6).map((m) => ({
        role: m.sender === 'customer' ? 'user' : 'model',
        text: m.text,
      }));

      let botReply = '';
      let actionLinks: any[] = [];
      let suggestedProds: any[] = hierarchicalMatch ? hierarchicalMatch.products : [];
      let productSectionTitle: string | undefined = hierarchicalMatch ? hierarchicalMatch.title : undefined;
      let data: any = {};

      try {
        const res = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getEnvApiHeaders() },
          body: JSON.stringify({
            message: textToSend,
            language: currentLang,
            history: historyPayload,
            excludeProductIds: shownProductIds,
            orderContext: {
              productName: orderProductName,
              productId: selectedProductId,
              customerName: orderCustomerName,
              customerMobile: orderCustomerMobile,
              deliveryAddress: orderAddress,
              deliveryZone: orderDeliveryZone,
              paymentMethod: orderPaymentMethod,
            },
            botSettings: {
              aiBotName: botName,
              officialWhatsAppAgentNumber: officialAgentNumber,
              whatsappSuperAdminNumber: superAdminNumber,
              telegramBotUsername: telegramBotUsername,
              messengerLink: messengerUrl,
            },
            productsList: enrichedProducts,
          }),
        });

        data = await res.json();
        botReply = data.reply || (hierarchicalMatch ? hierarchicalMatch.replyMessage : 'আমি আপনাকে সাহায্য করতে প্রস্তুত।');
        actionLinks = data.actionLinks || [];
        if (data.suggestedProducts && Array.isArray(data.suggestedProducts) && data.suggestedProducts.length > 0) {
          suggestedProds = data.suggestedProducts;
          if (data.productSectionTitle) {
            productSectionTitle = data.productSectionTitle;
          }
        }
      } catch {
        botReply = hierarchicalMatch ? hierarchicalMatch.replyMessage : 'KenaX BD-তে স্বাগতম! আপনি কোন পণ্যটি সম্পর্কে জানতে বা অর্ডার করতে চান? আমাকে জানান, আমি সাহায্য করছি।';
      }

      // Check if user query is asking for other/more diverse products
      const qLower = textToSend.toLowerCase();
      const rLower = (botReply || '').toLowerCase();

      const isShowMoreOrDifferentProductsQuery =
        qLower.includes('অন্যরকম') ||
        qLower.includes('অন্য রকম') ||
        qLower.includes('অন্যান্য') ||
        qLower.includes('অন্য প্রোডাক্ট') ||
        qLower.includes('অন্য পণ্য') ||
        qLower.includes('অন্যগুলো') ||
        qLower.includes('আরও প্রোডাক্ট') ||
        qLower.includes('আরো প্রোডাক্ট') ||
        qLower.includes('আরও পণ্য') ||
        qLower.includes('আরো পণ্য') ||
        qLower.includes('আরও দেখাও') ||
        qLower.includes('আরো দেখাও') ||
        qLower.includes('অন্য কিছু') ||
        qLower.includes('ভিন্ন') ||
        qLower.includes('different') ||
        qLower.includes('other') ||
        qLower.includes('more products') ||
        qLower.includes('show more') ||
        qLower.includes('next');

      // Check if user query is product or category related
      const isProductRelatedQuery =
        Boolean(hierarchicalMatch) ||
        isShowMoreOrDifferentProductsQuery ||
        qLower.includes('product') ||
        qLower.includes('প্রোডাক্ট') ||
        qLower.includes('পণ্য') ||
        qLower.includes('পন্য') ||
        qLower.includes('আইটেম') ||
        qLower.includes('লিস্ট') ||
        qLower.includes('list') ||
        qLower.includes('suggest') ||
        qLower.includes('সাজেস্ট') ||
        qLower.includes('জনপ্রিয়') ||
        qLower.includes('popular') ||
        qLower.includes('কালেকশন') ||
        qLower.includes('collection') ||
        qLower.includes('ক্যাটালগ') ||
        qLower.includes('ক্যাটাগরি') ||
        qLower.includes('category') ||
        qLower.includes('দেখান') ||
        qLower.includes('dekhan') ||
        qLower.includes('dekhau') ||
        qLower.includes('দাম') ||
        qLower.includes('price') ||
        qLower.includes('অর্ডার') ||
        qLower.includes('কিনব') ||
        qLower.includes('নিতে চাই') ||
        qLower.includes('রিভিউ') ||
        qLower.includes('review') ||
        qLower.includes('স্টক') ||
        dynamicCategories.some((cat) => qLower.includes(cat.name.toLowerCase())) ||
        products.some((p) => {
          const pName = (p.name || '').toLowerCase();
          const pBn = (p.banglaName || '').toLowerCase();
          return (pName.length > 2 && qLower.includes(pName)) || (pBn.length > 2 && qLower.includes(pBn));
        });

      if (!isProductRelatedQuery && !hierarchicalMatch) {
        suggestedProds = [];
        productSectionTitle = undefined;
        if (activeOrderProduct) {
          setIsOrderBoxMinimized(true);
        }
      } else {
        setIsOrderBoxMinimized(false);
      }

      // Check if user is inquiring about a single specific product
      const isSingleProductInquiry =
        !isShowMoreOrDifferentProductsQuery &&
        (qLower.includes('সম্পর্কে') ||
        qLower.includes('details') ||
        qLower.includes('বিস্তারিত') ||
        qLower.includes('description') ||
        qLower.includes('বিবরণ') ||
        qLower.includes('জানতে চাই') ||
        Boolean(explicitTargetProduct));

      // Check general store browsing inquiry (when user wants to see all/store products)
      const isGeneralBrowsingQuery =
        qLower.includes('সব প্রোডাক্ট') ||
        qLower.includes('সব পণ্য') ||
        qLower.includes('সবগুলো') ||
        qLower.includes('সকল পণ্য') ||
        qLower.includes('সব কালেকশন') ||
        qLower.includes('সকল কালেকশন') ||
        qLower.includes('সব দেখাও') ||
        qLower.includes('all products') ||
        qLower.includes('store products');

      // Guarantee product suggestion cards if bot or user discusses products
      if (explicitTargetProduct) {
        suggestedProds = [explicitTargetProduct];
        productSectionTitle = `🛍️ ${explicitTargetProduct.name || explicitTargetProduct.banglaName || 'পণ্য বিস্তারিত'}`;
      } else if (isProductRelatedQuery && products && products.length > 0) {
        if (isShowMoreOrDifferentProductsQuery) {
          const excludeSet = new Set(shownProductIds);
          let pool = products.filter((p) => !excludeSet.has(p.id));
          if (pool.length === 0) pool = [...products];

          const catMap = new Map<string, any[]>();
          pool.forEach((p) => {
            const c = p.category || 'Other';
            if (!catMap.has(c)) catMap.set(c, []);
            catMap.get(c)!.push(p);
          });

          const diverse: any[] = [];
          const cats = Array.from(catMap.keys());
          let round = 0;
          while (diverse.length < 3 && round < 10) {
            for (const c of cats) {
              const list = catMap.get(c)!;
              if (list.length > round && diverse.length < 3) {
                diverse.push(list[round]);
              }
            }
            round++;
          }
          suggestedProds = diverse.length > 0 ? diverse : pool.slice(0, 3);
          productSectionTitle = currentLang === 'en' ? '🛍️ More Diverse Products' : '🛍️ আরও বৈচিত্র্যময় পণ্যসমূহ:';
        } else if (suggestedProds.length > 0) {
          // STRICT RULE: Keep the exact 1-3 matching products from server (never pad with unrelated products!)
          suggestedProds = suggestedProds.slice(0, suggestedProds.length === 1 ? 1 : 3);
        } else if (hierarchicalMatch && hierarchicalMatch.products.length > 0) {
          suggestedProds = hierarchicalMatch.products.slice(0, hierarchicalMatch.products.length === 1 ? 1 : 3);
          productSectionTitle = hierarchicalMatch.title;
        } else if (isGeneralBrowsingQuery) {
          const featuredOrStock = products.filter((p) => p.isFeatured || (p.stock && p.stock > 0));
          suggestedProds = featuredOrStock.slice(0, 3);
          productSectionTitle = currentLang === 'en' ? '🛍️ Featured Products:' : '🛍️ নির্বাচিত সেরা পণ্যসমূহ:';
        }

        // Keep track of shown product IDs across conversational session
        if (suggestedProds && suggestedProds.length > 0) {
          const newIds = suggestedProds.map((p: any) => p.id).filter(Boolean);
          setShownProductIds((prev) => {
            const combined = Array.from(new Set([...prev, ...newIds]));
            return combined.length >= (products?.length || 0) ? newIds : combined;
          });
        }
      }

      // If user query is order tracking related, strictly suppress suggested product cards
      const isTrackingQuery =
        qLower.includes('track') ||
        qLower.includes('ট্র্যাক') ||
        qLower.includes('স্ট্যাটাস') ||
        qLower.includes('status') ||
        qLower.includes('কখন আসবে') ||
        qLower.includes('অর্ডার কোথায়') ||
        qLower.includes('অর্ডার আইডি') ||
        qLower.includes('অর্ডার নম্বর');

      if (isTrackingQuery) {
        suggestedProds = [];
        productSectionTitle = undefined;
        if (activeOrderProduct) {
          setLastActiveOrderProduct(activeOrderProduct);
          setActiveOrderProduct(null);
        }
        setIsOrderBoxMinimized(true);
      } else if (!isSingleProductInquiry && isGeneralBrowsingQuery && (!botReply || botReply.length < 25)) {
        botReply = 'আপনি কী ধরনের পণ্য চান তা সম্পর্কে বলুন। নিচে আমাদের ট্রেন্ডিং ও সেরা পণ্যগুলো দেওয়া হলো, আপনার পছন্দেরটিতে ক্লিক করে সরাসরি অর্ডার করতে পারেন:';
        if (!suggestedProds || suggestedProds.length === 0) {
          suggestedProds = (products || []).filter((p) => p.isFeatured || (p.stock && p.stock > 0)).slice(0, 3);
          productSectionTitle = currentLang === 'en' ? '🛍️ Recommended for You:' : '🛍️ আপনার জন্য সুপারিশকৃত পণ্যসমূহ:';
        }
      }

      // Channel link guarantee & External link suppression rules
      const lower = textToSend.toLowerCase();
      const isOrderIntent =
        lower.includes('order') ||
        lower.includes('অর্ডার') ||
        lower.includes('কিনতে') ||
        lower.includes('নিতে চাই') ||
        lower.includes('buy') ||
        lower.includes('বুকিং') ||
        lower.includes('order korte chai');

      // STRICT RULE: If ordering or inquiring about products, NEVER inject external social/messenger links!
      if (isOrderIntent || isProductRelatedQuery) {
        actionLinks = [];
        if (isOrderIntent && (!suggestedProds || suggestedProds.length === 0) && isGeneralBrowsingQuery && products && products.length > 0) {
          suggestedProds = products.slice(0, 3);
          productSectionTitle = currentLang === 'en' ? '🛍️ Available Products to Order:' : '🛍️ অর্ডারের জন্য উপলব্ধ পণ্যসমূহ:';
        }
      } else {
        // Only attach external links if user explicitly asks for them
        const wantsAgent = lower.includes('whatsapp agent') || lower.includes('হোয়াটসঅ্যাপ এজেন্ট') || lower.includes('এজেন্ট নম্বর');
        const wantsSuperAdmin = lower.includes('super admin') || lower.includes('সুপার এডমিন') || lower.includes('মালিকের নম্বর');
        const wantsTelegram = lower.includes('telegram') || lower.includes('টেলিগ্রাম');
        const wantsMessenger = lower.includes('messenger') || lower.includes('মেসেঞ্জার');

        actionLinks = [];
        if (wantsAgent) {
          actionLinks.push({
            label: `হোয়াটসঅ্যাপ এজেন্ট`,
            url: `https://wa.me/88${officialAgentNumber.replace(/[^0-9]/g, '')}`,
            type: 'agent',
          });
        }
        if (wantsSuperAdmin) {
          actionLinks.push({
            label: `সুপার অ্যাডমিন`,
            url: `https://wa.me/88${superAdminNumber.replace(/[^0-9]/g, '')}`,
            type: 'super-admin',
          });
        }
        if (wantsTelegram) {
          actionLinks.push({
            label: `টেলিগ্রাম`,
            url: `https://t.me/${telegramBotUsername.replace('@', '')}`,
            type: 'telegram',
          });
        }
        if (wantsMessenger) {
          actionLinks.push({
            label: `মেসেঞ্জার`,
            url: messengerUrl,
            type: 'messenger',
          });
        }
      }

      // Check if order intent or details detected
      let finalOrderData: any = null;
      if (data.detectedOrder && data.detectedOrder.isOrder) {
        const det = data.detectedOrder;
        if (det.productName) setOrderProductName(det.productName);
        if (det.productId) setSelectedProductId(det.productId);
        if (det.customerName && det.customerName !== 'Customer') setOrderCustomerName(det.customerName);
        if (det.customerMobile) setOrderCustomerMobile(det.customerMobile);
        if (det.deliveryAddress && det.deliveryAddress.length > 5) setOrderAddress(det.deliveryAddress);
        if (det.division === 'Outside Dhaka') setOrderDeliveryZone('outside');
        if (det.paymentMethod) setOrderPaymentMethod(det.paymentMethod);

        // If complete order was placed via chat text
        if (det.isComplete && det.customerMobile && (det.productName || orderProductName)) {
          const matchedProd = products.find(
            (p) =>
              p.name.toLowerCase().includes((det.productName || orderProductName).toLowerCase()) ||
              (det.productName || orderProductName).toLowerCase().includes(p.name.toLowerCase())
          );
          const uPrice = matchedProd?.price || det.unitPrice || 1200;
          const dFee = det.division === 'Outside Dhaka' ? outsideDhakaFee : insideDhakaFee;
          const totalAmt = uPrice * (det.quantity || 1) + dFee;
          const ordId = `KB-ORD-${Date.now().toString(36).toUpperCase()}`;

          finalOrderData = {
            orderId: ordId,
            productName: matchedProd?.name || det.productName || orderProductName,
            productId: matchedProd?.id || det.productId,
            productImage: matchedProd?.featuredImage || matchedProd?.images?.[0] || '',
            quantity: det.quantity || 1,
            unitPrice: uPrice,
            subtotal: uPrice * (det.quantity || 1),
            deliveryCharge: dFee,
            totalAmount: totalAmt,
            customerName: det.customerName || orderCustomerName || 'সম্মানিত গ্রাহক',
            customerMobile: det.customerMobile || orderCustomerMobile,
            deliveryAddress: det.deliveryAddress || orderAddress,
            deliveryZone: det.division === 'Outside Dhaka' ? 'outside' : 'dhaka',
            paymentMethod: det.paymentMethod || orderPaymentMethod || 'cod',
            status: 'pending',
          };

          // Save order to store
          const newOrder: Order = {
            id: ordId,
            customerId: currentCustomer?.id || `guest-${Date.now()}`,
            customerName: finalOrderData.customerName,
            customerEmail: currentCustomer?.email || 'guest@kenaxbd.com',
            customerMobile: finalOrderData.customerMobile,
            deliveryName: finalOrderData.customerName,
            deliveryMobile: finalOrderData.customerMobile,
            deliveryAddress: finalOrderData.deliveryAddress,
            fullAddress: finalOrderData.deliveryAddress,
            division: finalOrderData.deliveryZone === 'dhaka' ? 'Dhaka' : 'Outside Dhaka',
            district: finalOrderData.deliveryZone === 'dhaka' ? 'Dhaka City' : 'Nationwide',
            items: [
              {
                id: matchedProd?.id || `item-${Date.now()}`,
                productId: matchedProd?.id || `item-${Date.now()}`,
                productName: finalOrderData.productName,
                name: finalOrderData.productName,
                price: uPrice,
                quantity: det.quantity || 1,
                image: matchedProd?.featuredImage || matchedProd?.images?.[0] || '',
              },
            ],
            subtotal: uPrice * (det.quantity || 1),
            deliveryFee: dFee,
            deliveryCharge: dFee,
            total: totalAmt,
            totalAmount: totalAmt,
            paymentMethod: finalOrderData.paymentMethod,
            paymentStatus: 'unpaid',
            orderStatus: 'Pending',
            status: 'Pending',
            isV2Order: true,
            createdAt: new Date().toISOString(),
            isAiBotOrder: true,
            orderSource: 'chatbot',
            source: 'Ordered by KenaX Bot',
            sourceChannel: 'Ordered by KenaX Bot',
            createdByStaffName: 'Ordered by KenaX Bot',
            notes: `Auto-booked by ${botName} with status pending.`,
          } as any;

          if (onAddOrder) {
            await onAddOrder(newOrder);
          }
          try {
            await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newOrder),
            });
          } catch {}
        }
      }

      // Quick replies setup - actionable choices only
      const dynamicQuickReplies: Array<{ label: string; text: string }> = [
        { label: '🛍️ পণ্য অর্ডার করতে চাই', text: 'আমি একটি পণ্য অর্ডার করতে চাই' },
        { label: '✨ অন্য প্রোডাক্ট দেখান', text: 'আরও অন্যরকম প্রোডাক্ট দেখাও' },
        { label: '🚚 ডেলিভারি চার্জ কত?', text: 'ডেলিভারি চার্জ ও নিয়ম বলুন' },
        { label: '📦 অর্ডার ট্র্যাক করুন', text: 'আমার অর্ডার ট্র্যাক করতে চাই' },
      ];

      const botMsg: ChatMessage = {
        id: `ai-b-${Date.now()}`,
        sender: 'bot',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        suggestedProducts: suggestedProds.length > 0 ? suggestedProds : undefined,
        productSectionTitle: productSectionTitle || (suggestedProds.length > 0 ? (currentLang === 'en' ? 'Featured Products:' : 'পণ্যসমূহ:') : undefined),
        actionLinks,
        quickReplies: dynamicQuickReplies.length > 0 ? dynamicQuickReplies : undefined,
        orderData: finalOrderData,
      };

      setAiMessages((prev) => [...prev, botMsg]);
    } catch {
      // Offline fallback
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'bot',
          text: `KenaX BD-তে স্বাগতম! আপনি কোন পণ্যটি সম্পর্কে জানতে বা অর্ডার করতে চান? আমাকে জানান, আমি সাহায্য করছি।`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  // -------------------------------------------------------------
  // PLACE ORDER THROUGH MANUAL IN-CHAT FORM (STATUS: PENDING)
  // -------------------------------------------------------------
  const handleConfirmAiOrder = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setFieldErrors({});

    let activeCart = [...orderCartItems];
    if (activeCart.length === 0 && activeOrderProduct) {
      const availC = getProductColors(activeOrderProduct);
      const availS = getProductSizes(activeOrderProduct);
      activeCart = [
        {
          product: activeOrderProduct,
          quantity: orderProductQty || 1,
          selectedColor: orderSelectedColor || (availC.length > 0 ? availC[0].name : undefined),
          selectedColorImage: orderSelectedColorImage || (availC.length > 0 ? availC[0].imageUrl : undefined),
          selectedSize: orderSelectedSize || (availS.length > 0 ? availS[0] : undefined),
        },
      ];
    }

    if (activeCart.length === 0) {
      setOrderFormError('আপনার অর্ডার ফর্মে কোনো পণ্য পাওয়া যায়নি। লিস্ট থেকে পণ্য অর্ডার দিন।');
      return;
    }

    if (!orderCustomerName.trim()) {
      setOrderFormError('অনুগ্রহ করে স্যার, আপনার নাম লিখুন!');
      setFieldErrors({ name: true });
      setTimeout(() => {
        inputNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inputNameRef.current?.focus();
      }, 50);
      return;
    }

    const cleanPhone = orderCustomerMobile.replace(/[^0-9]/g, '');
    const validBdPrefixes = ['013', '014', '015', '016', '017', '018', '019'];
    const hasValidPrefix = validBdPrefixes.some((prefix) => cleanPhone.startsWith(prefix));

    if (!cleanPhone || cleanPhone.length !== 11 || !hasValidPrefix) {
      setOrderFormError('অনুগ্রহ করে সঠিক মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।');
      setFieldErrors({ mobile: true });
      setTimeout(() => {
        inputMobileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inputMobileRef.current?.focus();
      }, 50);
      return;
    }

    const emailRegex = /^[^s@]+@[^s@]+.[^s@]{2,}$/;
    if (orderCustomerEmail.trim() && !emailRegex.test(orderCustomerEmail.trim())) {
      setOrderFormError('অনুগ্রহ করে সঠিক ফরম্যাটের ইমেইল লিখুন (যেমন: name@example.com)!');
      setFieldErrors({ email: true });
      return;
    }

    if (orderCreateAccount) {
      if (!orderCustomerEmail.trim() || !emailRegex.test(orderCustomerEmail.trim())) {
        setOrderFormError('অ্যাকাউন্ট তৈরি করার জন্য সঠিক ইমেইল অ্যাড্রেস লিখুন (যেমন: name@example.com)!');
        setFieldErrors({ email: true });
        return;
      }
      if (!orderPassword.trim() || orderPassword.trim().length < 6) {
        setOrderFormError('অ্যাকাউন্টের জন্য কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড লিখুন!');
        setFieldErrors({ password: true });
        return;
      }
    }

    if (!orderAddressDetails.trim()) {
      setOrderFormError('অনুগ্রহ করে স্যার, আপনার বিস্তারিত ঠিকানা (বাসা/রোড/গ্রাম/এলাকা) লিখুন!');
      setFieldErrors({ address: true });
      setTimeout(() => {
        inputAddressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inputAddressRef.current?.focus();
      }, 50);
      return;
    }

    if (orderPaymentMethod === 'advance_delivery' || orderPaymentMethod === 'full_advance') {
      const providerLabel = orderPaymentProvider === 'bkash' ? 'বিকাশ' : 'নগদ';
      if (!orderSenderMobile.trim() || orderSenderMobile.trim().length < 11) {
        setOrderFormError(`অনুগ্রহ করে স্যার, আপনার ${providerLabel} সেন্ডার মোবাইল নম্বরটি ফিলআপ করুন!`);
        setFieldErrors({ senderMobile: true });
        setTimeout(() => {
          inputSenderMobileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          inputSenderMobileRef.current?.focus();
        }, 50);
        return;
      }

      if (!orderTrxId.trim() || orderTrxId.trim().length < 4) {
        setOrderFormError(`অনুগ্রহ করে স্যার, ${providerLabel} পেমেন্টের ট্রানজেকশন আইডি (TrxID) ফিলআপ করুন!`);
        setFieldErrors({ trxId: true });
        setTimeout(() => {
          inputTrxIdRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          inputTrxIdRef.current?.focus();
        }, 50);
        return;
      }
    }

    setOrderFormError('');
    setOrderSubmitting(true);

    try {
      const subtotal = activeCart.reduce(
        (sum, item) => sum + (Number(item.product.price) || 0) * item.quantity,
        0
      );
      const deliveryCharge = subtotal >= 5000 ? 0 : (orderDeliveryZone === 'dhaka' ? insideDhakaFee : outsideDhakaFee);
      const totalAmount = subtotal + deliveryCharge;

      const orderId = `KB-ORD-${Date.now().toString(36).toUpperCase()}`;

      const divisionNameBn = BANGLADESH_DIVISION_NAMES_BN[orderDivision] || orderDivision;
      const districtNameBn = BANGLADESH_DISTRICT_NAMES_BN[orderDistrict] || orderDistrict;
      const fullComputedAddress = [
        orderAddressDetails.trim(),
        orderUpazila,
        districtNameBn.split(' ')[0],
        divisionNameBn.split(' ')[0],
      ].filter(Boolean).join(', ');

      const orderItemsList = activeCart.map((item) => {
        const uPrice = Number(item.product.price) || 0;
        const variationParts = [];
        if (item.selectedColor) variationParts.push(`Color: ${item.selectedColor}`);
        if (item.selectedSize) variationParts.push(`Size: ${item.selectedSize}`);
        const varStr = variationParts.join(' | ');

        return {
          id: item.product.id || `item-${Date.now()}`,
          productId: item.product.id || `item-${Date.now()}`,
          productName: item.product.name,
          name: item.product.name,
          price: uPrice,
          quantity: item.quantity,
          image: item.selectedColorImage || item.product.featuredImage || item.product.images?.[0] || '',
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize,
          variant: varStr || undefined,
        };
      });

      const mainProductName = activeCart
        .map((i) => `${i.product.name} (x${i.quantity})`)
        .join(', ');

      const firstProd = activeCart[0]?.product;

      const newOrder: Order = {
        id: orderId,
        customerId: currentCustomer?.id || `guest-${Date.now()}`,
        customerName: orderCustomerName.trim(),
        customerEmail: orderCustomerEmail.trim() || currentCustomer?.email || 'guest@kenaxbd.com',
        customerMobile: cleanPhone,
        deliveryName: orderCustomerName.trim(),
        deliveryMobile: cleanPhone,
        deliveryAddress: fullComputedAddress,
        fullAddress: fullComputedAddress,
        division: orderDivision,
        district: orderDistrict,
        upazila: orderUpazila,
        productName: mainProductName,
        items: orderItemsList,
        subtotal,
        deliveryFee: deliveryCharge,
        deliveryCharge,
        total: totalAmount,
        totalAmount,
        paymentMethod: orderPaymentMethod,
        paymentStatus: orderPaymentMethod === 'cod' ? 'unpaid' : 'paid',
        transactionId: orderTrxId.trim() || undefined,
        senderNumber: orderSenderMobile.trim() || undefined,
        orderStatus: 'Pending',
        status: 'Pending',
        isV2Order: true,
        createdAt: new Date().toISOString(),
        isAiBotOrder: true,
        orderSource: 'chatbot',
        source: 'Ordered by KenaX Bot',
        sourceChannel: 'Ordered by KenaX Bot',
        createdByStaffName: 'Ordered by KenaX Bot',
        notes: `Order placed via ${botName} in web chat (${activeCart.length} items). Payment: ${orderPaymentMethod}${orderTrxId ? ` (TrxID: ${orderTrxId})` : ''}. Address: ${fullComputedAddress}.`,
      } as any;

      if (onAddOrder) {
        await onAddOrder(newOrder);
      }

      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrder),
        });

        if (orderCreateAccount) {
          const newCustData = {
            id: `cust-${Date.now()}`,
            name: orderCustomerName.trim(),
            email: orderCustomerEmail.trim(),
            phone: cleanPhone,
            password: orderPassword.trim(),
            address: fullComputedAddress,
            createdAt: new Date().toISOString(),
            accountType: 'customer',
            source: 'ai_bot',
            notes: 'Account registered via KenaX AI Chat during checkout',
          };

          await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCustData),
          });

          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: `notif-cust-${Date.now()}`,
              title: 'নতুন কাস্টমার অ্যাকাউন্ট তৈরি করা হয়েছে (এআই চ্যাট)',
              message: `এআই চ্যাটবোটের মাধ্যমে নতুন গ্রাহক অ্যাকাউন্ট তৈরি করা হয়েছে: ${orderCustomerName.trim()} (ইমেইল: ${orderCustomerEmail.trim()}, মোবাইল: ${cleanPhone})`,
              createdAt: new Date().toISOString(),
              type: 'customer_registered',
              read: false,
            }),
          });
        }
      } catch {}

      const confirmMsg: ChatMessage = {
        id: `ai-ord-confirm-${Date.now()}`,
        sender: 'bot',
        text: `🎉 **ধন্যবাদ ${orderCustomerName}! আপনার অর্ডারটি সফলভাবে 'Pending' (অপেক্ষমাণ) হিসেবে গ্রহণ করা হয়েছে।**\n\nঅর্ডার আইডি: **#${orderId}**।\nঅর্ডারকৃত পণ্য: **${mainProductName}**\nঠিকানা: **${fullComputedAddress}**\nমোট বিল: **৳${totalAmount.toLocaleString()}**\n${orderCreateAccount ? `🔐 **আপনার নামে নতুন কাস্টমার অ্যাকাউন্ট তৈরি সম্পন্ন হয়েছে!** (ইমেইল: ${orderCustomerEmail.trim()})\n` : ''}আমাদের প্রতিনিধি শীঘ্রই কল দিয়ে অর্ডারটি কনফার্ম করবেন।`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read',
        orderData: {
          orderId,
          productName: mainProductName,
          productId: firstProd?.id,
          productImage: firstProd?.featuredImage || firstProd?.images?.[0] || '',
          quantity: activeCart.reduce((s, i) => s + i.quantity, 0),
          unitPrice: subtotal / Math.max(1, activeCart.reduce((s, i) => s + i.quantity, 0)),
          subtotal,
          totalAmount,
          deliveryCharge,
          customerName: orderCustomerName.trim(),
          customerMobile: cleanPhone,
          deliveryAddress: fullComputedAddress,
          deliveryZone: orderDeliveryZone,
          paymentMethod: orderPaymentMethod,
          status: 'pending',
        },
        actionLinks: undefined,
      };

      setAiMessages((prev) => [...prev, confirmMsg]);
      setOrderCartItems([]);
      setActiveOrderProduct(null);
      setIsOrderBoxMinimized(true);
      setIsOrderModalOpen(false);
      setOrderProductName('');
      setSelectedProductId(undefined);
      setOrderProductQty(1);
      setOrderSelectedColor('');
      setOrderSelectedColorImage('');
      setOrderSelectedSize('');
      setOrderAddressDetails('');
      setOrderSenderMobile('');
      setOrderTrxId('');
      setOrderCreateAccount(false);
      setOrderPassword('');
    } catch (err) {
      console.error('Failed to submit AI order', err);
      setOrderFormError('অর্ডার সাবমিট করতে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setOrderSubmitting(false);
    }
  };

  // WhatsApp Send
  const handleSendWhatsAppMessage = async (customText?: string) => {
    const textToSend = (customText || waInput).trim();
    if (!textToSend || isSendingWa) return;

    const phoneToUse = activeCustomerPhone || '01700000000';
    const msgId = `wa-web-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: msgId,
      sender: 'customer',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setWaMessages((prev) => [...prev, newMsg]);
    setWaInput('');
    setIsSendingWa(true);

    try {
      await fetch('/api/whatsapp/customer-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: activeCustomerName,
          senderPhone: phoneToUse,
          text: textToSend,
        }),
      });
    } catch {}
    setIsSendingWa(false);
  };

  // Telegram Send
  const handleSendTelegramMessage = async (customText?: string) => {
    const textToSend = (customText || tgInput).trim();
    if (!textToSend || isSendingTg) return;

    const msgId = `tg-web-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: msgId,
      sender: 'customer',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setTgMessages((prev) => [...prev, newMsg]);
    setTgInput('');
    setIsSendingTg(true);

    try {
      await fetch('/api/telegram/customer-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: activeCustomerName,
          senderPhone: activeCustomerPhone || 'Not provided',
          text: textToSend,
        }),
      });
    } catch {}
    setIsSendingTg(false);
  };

  return (
    <>
      <div
        ref={chatContainerRef}
        className={`fixed bottom-[84px] sm:bottom-24 md:bottom-6 right-3.5 sm:right-6 md:right-6 z-[99999] flex flex-col items-end pointer-events-none select-none font-sans`}
      >
        {/* 1. GREETING TOOLTIP (When closed) */}
        <AnimatePresence>
          {showGreetingTooltip && activeChatModal === 'none' && !isSpeedDialOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setShowGreetingTooltip(false);
                setActiveChatModal('ai_bot');
              }}
              className="pointer-events-auto mb-3 max-w-[250px] bg-slate-900/95 backdrop-blur-md text-white text-xs p-3 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-start gap-2.5 cursor-pointer hover:border-emerald-400 transition-all group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-md shadow-emerald-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-extrabold text-white text-[11px]">{botName}</p>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-slate-300 text-[10px] mt-0.5 leading-snug">
                  পণ্য সম্পর্কে জানতে, সরাসরি অর্ডার দিতে বা এজেন্টের সাথে কথা বলতে ক্লিক করুন!
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGreetingTooltip(false);
                }}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. THE MAIN COMPACT AI CHATBOT MODAL (FULL PAGE ON MOBILE) */}
        <AnimatePresence>
          {activeChatModal === 'ai_bot' && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="pointer-events-auto fixed inset-0 z-[100] w-full h-[100dvh] md:static md:w-[430px] md:h-[620px] md:max-h-[640px] md:mb-2 bg-white dark:bg-slate-950 md:rounded-3xl shadow-2xl md:border md:border-slate-200 dark:md:border-slate-800 flex flex-col overflow-hidden ring-1 ring-black/5 dark:ring-white/10"
            >
              {/* Header */}
              <div className="px-3.5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* On Mobile: Prominent Back button */}
                  <button
                    type="button"
                    onClick={() => setActiveChatModal('none')}
                    className="md:hidden flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 font-bold transition-all cursor-pointer shrink-0"
                    aria-label="Back"
                    title="ফিরে যান"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  </button>

                  {/* Clean KenaX BD Logo */}
                  <div className="relative shrink-0 flex items-center">
                    <KenaXLogo size="xs" customLogoUrl={siteSettings?.customLogo} siteName="KenaX BD" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 absolute -bottom-0.5 -right-0.5 animate-pulse" />
                  </div>

                  <div className="min-w-0 flex flex-col justify-center">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate leading-tight">
                      {siteSettings.siteName || 'KenaX BD'}
                    </h3>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold truncate leading-tight mt-0.5">
                      {selectedLanguage === 'en' ? 'Online • 24/7 Live Support' : 'অনলাইন • ২৪/৭ লাইভ সাপোর্ট'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Customer Support Channels Dropdown */}
                  <div className="relative" ref={supportMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsSupportMenuOpen((prev) => !prev)}
                      className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 active:scale-95 text-emerald-800 dark:text-emerald-300 transition-all flex items-center justify-center cursor-pointer border border-emerald-200 dark:border-emerald-800/80"
                      title="কাস্টমার সাপোর্ট"
                    >
                      <Headphones className="w-4 h-4 shrink-0 text-emerald-800 dark:text-emerald-300" />
                    </button>

                    {/* Compact Dropdown Popover */}
                    {isSupportMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                        {/* 1. Super Admin */}
                        <a
                          href={`https://wa.me/88${superAdminNumber.replace(/[^0-9]/g, '').replace(/^88/, '')}?text=${encodeURIComponent('হ্যালো সুপার অ্যাডমিন, KenaX BD সংক্রান্ত সহায়তার জন্য নক দিচ্ছি।')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsSupportMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/50 text-slate-800 dark:text-slate-200 hover:text-purple-950 dark:hover:text-purple-300 transition-all group cursor-pointer border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                        >
                          <div className="w-7 h-7 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            <SiWhatsapp className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-black text-slate-900 dark:text-white leading-none">সুপার অ্যাডমিন</p>
                        </a>

                        {/* 2. Customer Care */}
                        <a
                          href={`https://wa.me/88${officialAgentNumber.replace(/[^0-9]/g, '').replace(/^88/, '')}?text=${encodeURIComponent('হ্যালো, KenaX BD পণ্য ও হেল্প সংক্রান্ত সহায়তার প্রয়োজন।')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsSupportMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-slate-800 dark:text-slate-200 hover:text-emerald-950 dark:hover:text-emerald-300 transition-all group cursor-pointer border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                        >
                          <div className="w-7 h-7 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            <SiWhatsapp className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-black text-slate-900 dark:text-white leading-none">কাস্টমার কেয়ার</p>
                        </a>

                        {/* 3. Telegram */}
                        <a
                          href={telegramBotUsername.startsWith('http') ? telegramBotUsername : `https://t.me/${telegramBotUsername.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsSupportMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-800 dark:text-slate-200 hover:text-sky-950 dark:hover:text-sky-300 transition-all group cursor-pointer border border-transparent hover:border-sky-200 dark:hover:border-sky-800"
                        >
                          <div className="w-7 h-7 rounded-xl bg-[#24A1DE] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            <SiTelegram className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-black text-slate-900 dark:text-white leading-none">Telegram</p>
                        </a>

                        {/* 4. Messenger */}
                        <a
                          href={messengerUrl.startsWith('http') ? messengerUrl : `https://m.me/${messengerUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setIsSupportMenuOpen(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-800 dark:text-slate-200 hover:text-blue-950 dark:hover:text-blue-300 transition-all group cursor-pointer border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                        >
                          <div className="w-7 h-7 rounded-xl bg-[#0084FF] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            <SiMessenger className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-black text-slate-900 dark:text-white leading-none">মেসেঞ্জার</p>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Close button (Desktop only - mobile uses the Back button on the left) */}
                  <button
                    type="button"
                    onClick={() => setActiveChatModal('none')}
                    className="hidden md:flex p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer items-center justify-center"
                    aria-label="Close"
                    title="বন্ধ করুন"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div ref={aiScrollRef} className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#F8FAFC] dark:bg-slate-950 flex flex-col">
                {/* Animated Brand Logo Header */}
                <div className="flex flex-col items-center justify-center pt-2 pb-1">
                  <motion.div
                    animate={{
                      scale: [1, 1.05, 1],
                      y: [0, -3, 0],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3.2,
                      ease: "easeInOut",
                    }}
                    className="relative p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-center group"
                  >
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-sky-500/20 to-teal-500/20 blur-xs -z-10 animate-pulse" />
                    <KenaXLogo size="md" customLogoUrl={siteSettings?.customLogo} siteName="KenaX BD" />
                  </motion.div>
                </div>

                {aiMessages.map((msg, mIdx) => {
                  if (msg.id === 'ai-welcome-lang') {
                    return null;
                  }
                  const isLatestBotMsg = msg.sender === 'bot' && mIdx === aiMessages.length - 1;

                  return (
                    <div
                      key={msg.id}
                      ref={isLatestBotMsg ? latestBotMsgRef : undefined}
                      className={`flex flex-col scroll-mt-3 ${msg.sender === 'customer' ? 'items-end' : 'items-start'}`}
                    >
                    <div
                      className={`max-w-[90%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'customer'
                          ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-sm rounded-tl-none'
                      }`}
                    >
                      {msg.sender === 'customer' ? (
                        <p className="whitespace-pre-line text-xs font-medium">{msg.text}</p>
                      ) : (
                        renderFormattedMessage(msg.text)
                      )}

                      {/* 1. SUGGESTED PRODUCT CARDS (STYLISH, MODERN & COMPACT) */}
                      {msg.suggestedProducts && msg.suggestedProducts.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{msg.productSectionTitle || (selectedLanguage === 'en' ? 'Featured Products:' : 'পণ্যসমূহ:')}</span>
                            </p>
                            <span className="text-[9px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800 font-semibold">
                              {msg.suggestedProducts.length} টি পণ্য
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {msg.suggestedProducts.map((prod: any, idx: number) => {
                              const pImg = prod.featuredImage || prod.image || (Array.isArray(prod.images) ? prod.images[0] : '');
                              const pPrice = Number(prod.price) || 0;
                              const pOldPrice = Number(prod.originalPrice) || pPrice;
                              const pName = prod.name || prod.title;
                              const discountPercent = pOldPrice > pPrice ? Math.round(((pOldPrice - pPrice) / pOldPrice) * 100) : 0;

                              return (
                                <div
                                  key={prod.id || idx}
                                  className="p-3 rounded-2xl bg-white dark:bg-slate-900/90 hover:bg-emerald-50/30 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all flex flex-col gap-2.5 group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {pImg ? (
                                      <img
                                        src={pImg}
                                        alt={pName}
                                        className="w-16 h-16 rounded-xl object-cover bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs"
                                      />
                                    ) : (
                                      <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 p-1 shadow-xs">
                                        <KenaXLogo size="xs" theme="dark" customLogoUrl={siteSettings?.customLogo} siteName="KenaX BD" />
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {prod.category && (
                                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-semibold px-1.5 py-0.5 rounded border border-slate-200/80 dark:border-slate-700">
                                            {prod.category}
                                          </span>
                                        )}
                                        <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5">
                                          <CheckCircle2 className="w-2.5 h-2.5" /> স্টকে আছে
                                        </span>
                                      </div>

                                      <p className="font-bold text-slate-900 dark:text-white text-xs leading-snug line-clamp-2">
                                        {pName}
                                      </p>

                                      {/* Variations tags preview */}
                                      {(() => {
                                        const pCols = getProductColors(prod);
                                        const pSzs = getProductSizes(prod);
                                        if (pCols.length === 0 && pSzs.length === 0) return null;
                                        return (
                                          <div className="flex flex-wrap gap-1 py-0.5">
                                            {pCols.length > 0 && (
                                              <span className="text-[9px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 px-1.5 py-0.5 rounded font-medium">
                                                🎨 কালার: {pCols.map(c => c.name).join(', ')}
                                              </span>
                                            )}
                                            {pSzs.length > 0 && (
                                              <span className="text-[9px] bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 rounded font-medium">
                                                📏 সাইজ: {pSzs.join(', ')}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}

                                      {/* Clear Price Breakdown */}
                                      <div className="flex flex-col gap-0.5 text-xs bg-emerald-50/70 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">প্রোডাক্টের মূল্য:</span>
                                          <span className="font-black text-emerald-800 dark:text-emerald-300 text-xs">৳{pPrice.toLocaleString()}</span>
                                        </div>
                                        {pOldPrice > pPrice && (
                                          <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-emerald-200/50 dark:border-emerald-800/50">
                                            <span className="text-slate-500 dark:text-slate-400">পূর্বের মূল্য: <span className="line-through text-slate-400 dark:text-slate-500">৳{pOldPrice.toLocaleString()}</span></span>
                                            <span className="text-emerald-800 dark:text-emerald-300 font-bold bg-white/90 dark:bg-slate-800 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-700">
                                              ৳{(pOldPrice - pPrice).toLocaleString()} ছাড়
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Single Product Inquiry Description View */}
                                  {msg.suggestedProducts.length === 1 && prod.description && (
                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                                      <p className="font-extrabold text-[11px] text-slate-900 dark:text-white mb-1 flex items-center gap-1">
                                        <Info className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                        <span>পণ্যের বিবরণ ও বিস্তারিত:</span>
                                      </p>
                                      <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
                                        {prod.description}
                                      </div>
                                    </div>
                                  )}

                                  {/* DYNAMIC SEQUENTIAL ACTION BUTTONS */}
                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    {(() => {
                                      const pId = String(prod.id || pName);
                                      const stage = productButtonStages[pId] || (inquiredProductIds.includes(pId) ? 'reviews' : 'details');

                                      if (stage === 'page') {
                                        return (
                                          <button
                                            type="button"
                                            onClick={() => handleGoToProductPage(prod)}
                                            className="w-full py-2 px-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 active:scale-98 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700/80 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                                            title="প্রোডাক্ট পেজে যান"
                                          >
                                            <ExternalLink className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                            <span className="truncate">প্রোডাক্ট পেজে যান</span>
                                          </button>
                                        );
                                      }

                                      if (stage === 'reviews') {
                                        return (
                                          <button
                                            type="button"
                                            onClick={() => handleViewReviews(prod)}
                                            className="w-full py-2 px-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 active:scale-98 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                                            title="রিভিউ দেখতে চাই"
                                          >
                                            <Star className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500 shrink-0" />
                                            <span className="truncate">রিভিউ দেখতে চাই</span>
                                          </button>
                                        );
                                      }

                                      return (
                                        <button
                                          type="button"
                                          onClick={() => handleInquireProduct(prod)}
                                          className="w-full py-2 px-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 active:scale-98 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer"
                                          title="প্রোডাক্ট সম্পর্কে জানতে চাই"
                                        >
                                          <Info className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                          <span className="truncate">প্রোডাক্ট সম্পর্কে জানুন</span>
                                        </button>
                                      );
                                    })()}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const isCurrentlySelected =
                                          activeOrderProduct?.id === prod.id ||
                                          orderCartItems.some((i) => i.product.id === prod.id);
                                        if (isCurrentlySelected && !isOrderBoxMinimized) {
                                          handleHideOrderForm();
                                        } else {
                                          handleSelectProductForOrder(prod);
                                        }
                                      }}
                                      className="w-full py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer"
                                      title="অর্ডার দিন"
                                    >
                                      <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">
                                        {orderCartItems.some((i) => i.product.id === prod.id) && !isOrderBoxMinimized
                                          ? 'অর্ডার ফর্ম হাইড করুন'
                                          : 'অর্ডার দিন'}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. IN-CHAT ORDER CONFIRMATION CARD (STATUS: PENDING) */}
                      {msg.orderData && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/70 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-300 dark:border-emerald-700/60 text-slate-800 dark:text-slate-100 space-y-2.5 shadow-sm">
                          <div className="flex items-center justify-between border-b border-emerald-200/80 dark:border-emerald-800/60 pb-2">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <ClickableOrderId orderId={msg.orderData.orderId} className="text-emerald-950 dark:text-emerald-200 bg-white/80 dark:bg-slate-900 border-emerald-300 dark:border-emerald-700" />
                            </div>
                            <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700/60 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                              <span>Pending (অপেক্ষমাণ)</span>
                            </span>
                          </div>

                          <div className="flex items-start gap-2.5 bg-white/80 dark:bg-slate-900/90 p-2 rounded-xl border border-emerald-100 dark:border-emerald-800/60">
                            {msg.orderData.productImage ? (
                              <img
                                src={msg.orderData.productImage}
                                alt={msg.orderData.productName}
                                className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                                KB
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-slate-900 dark:text-white text-xs line-clamp-1">
                                {msg.orderData.productName}
                              </p>
                              {(msg.orderData.selectedColor || msg.orderData.selectedSize || msg.orderData.variant) && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                  {msg.orderData.selectedColor && (
                                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/60">
                                      কালার: {msg.orderData.selectedColor}
                                    </span>
                                  )}
                                  {msg.orderData.selectedSize && (
                                    <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                                      সাইজ: {msg.orderData.selectedSize}
                                    </span>
                                  )}
                                </div>
                              )}
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                                পরিমাণ: {msg.orderData.quantity} টি | একক মূল্য: ৳{msg.orderData.unitPrice}
                              </p>
                            </div>
                          </div>

                          <div className="text-xs space-y-1.5 bg-emerald-100/50 dark:bg-slate-950/80 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-[11px]">
                              <span>পণ্যের মোট মূল্য:</span>
                              <span className="font-bold text-slate-900 dark:text-white">৳{msg.orderData.subtotal}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-[11px]">
                              <span>ডেলিভারি চার্জ:</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {msg.orderData.deliveryCharge === 0 ? 'ফ্রি ডেলিভারি' : `৳${msg.orderData.deliveryCharge}`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-900 dark:text-white text-xs font-black pt-1 border-t border-emerald-200 dark:border-emerald-800/60">
                              <span>সর্বমোট প্রদেয় টাকা:</span>
                              <span className="text-emerald-800 dark:text-emerald-400 text-sm font-black">৳{msg.orderData.totalAmount}</span>
                            </div>
                          </div>

                          <div className="text-[11px] space-y-1 text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/90 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              👤 গ্রাহক: <span className="font-normal text-slate-700 dark:text-slate-300">{msg.orderData.customerName}</span> ({msg.orderData.customerMobile})
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              📍 ঠিকানা: <span className="font-normal text-slate-700 dark:text-slate-300">{msg.orderData.deliveryAddress}</span>
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              💳 পেমেন্ট: <span className="font-normal text-slate-700 dark:text-slate-300">{msg.orderData.paymentMethod === 'cod' ? 'Cash on Delivery (ক্যাশ অন ডেলিভারি)' : msg.orderData.paymentMethod === 'advance_delivery' ? 'ডেলিভারি চার্জ অগ্রিম' : 'সম্পূর্ণ মূল্য অগ্রিম (bKash/Nagad)'}</span>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* INTERACTIVE ORDER TRACKING INPUTS BOX */}
                      {msg.isTrackForm && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/70 dark:from-amber-950/40 dark:to-slate-900 border border-amber-300 dark:border-amber-700/60 text-slate-800 dark:text-slate-100 space-y-3 shadow-sm">
                          <div className="flex items-center gap-2 border-b border-amber-200/80 dark:border-amber-800/60 pb-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
                              <Search className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-slate-900 dark:text-white">অর্ডার স্ট্যাটাস ট্র্যাকিং</h5>
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">আপনার অর্ডারের সঠিক বর্তমান অবস্থা দেখতে তথ্য দিন</p>
                            </div>
                          </div>

                          <div className="space-y-2.5">
                            <div>
                              <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                                আপনার অর্ডার আইডি লিখুন <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={trackFormOrderId}
                                onChange={(e) => {
                                  setTrackFormOrderId(e.target.value);
                                  if (trackErrorMsg) setTrackErrorMsg('');
                                }}
                                placeholder="আপনার অর্ডার আইডি লিখুন"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono font-extrabold focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                                আপনার নাম্বার লিখুন <span className="text-rose-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={trackFormPhone}
                                onChange={(e) => {
                                  setTrackFormPhone(e.target.value);
                                  if (trackErrorMsg) setTrackErrorMsg('');
                                }}
                                placeholder="আপনার নাম্বার লিখুন"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-mono font-extrabold focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs"
                              />
                            </div>

                            {trackErrorMsg && (
                              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 p-2 rounded-lg border border-rose-200 dark:border-rose-800 leading-snug">
                                ⚠️ {trackErrorMsg}
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={() => handleExecuteTrackOrder(trackFormOrderId, trackFormPhone)}
                              disabled={isTrackingLoading}
                              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isTrackingLoading ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                  <span>অর্ডার স্ট্যাটাস খুঁজা হচ্ছে...</span>
                                </span>
                              ) : (
                                <>
                                  <Search className="w-3.5 h-3.5 shrink-0" />
                                  <span>অর্ডার স্ট্যাটাস ট্র্যাক করুন 🔍</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TRACKED ORDER DETAILS & STATUS DISPLAY CARD */}
                      {msg.trackedOrder && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 text-slate-800 dark:text-slate-100 space-y-3 shadow-md">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-1.5">
                              <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span className="font-extrabold text-xs text-slate-900 dark:text-white font-mono">
                                #{msg.trackedOrder.id}
                              </span>
                            </div>
                            {(() => {
                              const st = getStatusBanglaDetails(msg.trackedOrder.status);
                              return (
                                <span className={`font-black text-[10px] px-2.5 py-0.5 rounded-full border ${st.color} flex items-center gap-1`}>
                                  <span>{st.badge}</span>
                                </span>
                              );
                            })()}
                          </div>

                          {/* Order Items List */}
                          <div className="space-y-2">
                            <p className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>অর্ডারকৃত পণ্যসমূহ:</span>
                            </p>
                            {(Array.isArray(msg.trackedOrder.items) && msg.trackedOrder.items.length > 0
                              ? msg.trackedOrder.items
                              : [{
                                  name: msg.trackedOrder.productName || 'অর্ডারকৃত পণ্য',
                                  quantity: 1,
                                  price: msg.trackedOrder.totalAmount || msg.trackedOrder.total,
                                  image: msg.trackedOrder.productImage || ''
                                }]
                            ).map((item: any, iIdx: number) => {
                              const iImg = item.image || item.featuredImage || (Array.isArray(item.images) ? item.images[0] : '');
                              return (
                                <div key={iIdx} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                  {iImg ? (
                                    <img src={iImg} alt={item.name} className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 flex items-center justify-center font-bold text-xs shrink-0">
                                      KB
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-extrabold text-slate-900 dark:text-white text-xs truncate">{item.name || item.productName}</p>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                                      পরিমাণ: {item.quantity || 1} টি | মূল্য: ৳{Number(item.price || 0).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Amount & Status Summary */}
                          <div className="text-xs space-y-1.5 bg-amber-50/60 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-800/60">
                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-[11px]">
                              <span>সর্বমোট মূল্য:</span>
                              <span className="font-extrabold text-slate-900 dark:text-white">৳{Number(msg.trackedOrder.totalAmount || msg.trackedOrder.total || 0).toLocaleString()}</span>
                            </div>
                            {msg.trackedOrder.deliveryFee !== undefined && (
                              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 text-[11px]">
                                <span>ডেলিভারি চার্জ:</span>
                                <span className="font-bold text-slate-900 dark:text-white">৳{Number(msg.trackedOrder.deliveryFee || msg.trackedOrder.deliveryCharge || 0).toLocaleString()}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-slate-900 dark:text-white text-xs font-black pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                              <span>ক্যাশ অন ডেলিভারিতে প্রদেয়:</span>
                              <span className="text-emerald-700 dark:text-emerald-400 text-sm font-black">
                                ৳{Number((msg.trackedOrder.dueAmount ?? (msg.trackedOrder.totalAmount || msg.trackedOrder.total || 0))).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Delivery address & info */}
                          <div className="text-[11px] space-y-1 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              👤 গ্রাহক: <span className="font-normal text-slate-700 dark:text-slate-300">{msg.trackedOrder.customerName || msg.trackedOrder.deliveryName || 'সম্মানিত গ্রাহক'}</span> ({msg.trackedOrder.customerMobile || msg.trackedOrder.deliveryMobile})
                            </p>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              📍 ঠিকানা: <span className="font-normal text-slate-700 dark:text-slate-300">{msg.trackedOrder.deliveryAddress || msg.trackedOrder.fullAddress || 'N/A'}</span>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 3. DYNAMIC QUICK REPLIES BUTTONS */}
                      {msg.quickReplies && msg.quickReplies.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                          {msg.quickReplies.map((qr, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSendAiMessage(qr.text)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-slate-800 dark:text-slate-200 hover:text-emerald-900 dark:hover:text-emerald-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                            >
                              {qr.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 4. ACTION LINKS BUTTONS (হোয়াটসঅ্যাপ এজেন্ট, সুপার অ্যাডমিন, টেলিগ্রাম, মেসেঞ্জার) */}
                      {msg.actionLinks && msg.actionLinks.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                          <div className={`grid ${msg.actionLinks.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                            {msg.actionLinks.map((link, idx) => (
                              <a
                                key={idx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`px-3 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer ${
                                  link.type === 'agent'
                                    ? 'bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-[#25D366]/20'
                                    : link.type === 'super-admin'
                                    ? 'bg-purple-700 hover:bg-purple-800 text-white shadow-purple-700/20'
                                    : link.type === 'telegram'
                                    ? 'bg-[#24A1DE] hover:bg-[#1f8fc5] text-white shadow-[#24A1DE]/20'
                                    : 'bg-[#0084FF] hover:bg-[#0070da] text-white shadow-[#0084FF]/20'
                                }`}
                              >
                                {link.type === 'agent' || link.type === 'super-admin' ? (
                                  <SiWhatsapp className="w-4 h-4 shrink-0" />
                                ) : link.type === 'telegram' ? (
                                  <SiTelegram className="w-4 h-4 shrink-0" />
                                ) : (
                                  <SiMessenger className="w-4 h-4 shrink-0" />
                                )}
                                <span>{link.label}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-0.5 px-1">{msg.timestamp}</span>
                  </div>
                  );
                })}

                {/* 5. INLINE STEP-BY-STEP ORDER WIDGET WHEN PRODUCT IS SELECTED OR CART HAS ITEMS */}
                {(activeOrderProduct || orderCartItems.length > 0) && !isOrderBoxMinimized && (
                  <div
                    ref={orderFormRef}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-md text-slate-800 dark:text-slate-100 space-y-3 scroll-mt-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                            অর্ডার কনফার্মেশন ফর্ম {orderCartItems.length > 1 ? `(${orderCartItems.length} টি প্রোডাক্ট কার্টে)` : ''}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">স্টেপ-বাই-স্টেপ তথ্য পূরণ করুন</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleHideOrderForm}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="হাইড করুন"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Product Summary & Quantity List */}
                    {(() => {
                      let displayCartItems = [...orderCartItems];
                      if (displayCartItems.length === 0 && activeOrderProduct) {
                        displayCartItems = [
                          {
                            product: activeOrderProduct,
                            quantity: orderProductQty || 1,
                            selectedColor: orderSelectedColor,
                            selectedColorImage: orderSelectedColorImage,
                            selectedSize: orderSelectedSize,
                          },
                        ];
                      }

                      const firstItemProd = displayCartItems[0]?.product || activeOrderProduct;
                      const availColors = getProductColors(firstItemProd);
                      const availSizes = getProductSizes(firstItemProd);

                      return (
                        <div className="space-y-2.5">
                          <div className="space-y-2">
                            {displayCartItems.map((cItem, iIdx) => {
                              const cDisplayImg =
                                cItem.selectedColorImage ||
                                cItem.product.featuredImage ||
                                cItem.product.images?.[0];
                              const cUnitPrice = Number(cItem.product.price) || 0;

                              return (
                                <div
                                  key={iIdx}
                                  className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                                >
                                  {cDisplayImg ? (
                                    <img
                                      src={cDisplayImg}
                                      alt={cItem.product.name}
                                      className="w-12 h-12 rounded-lg object-cover bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                                      KB
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                      {cItem.product.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                        প্রোডাক্টের মূল্য:
                                      </span>
                                      <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                                        ৳{cUnitPrice}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (orderCartItems.length > 0) {
                                          setOrderCartItems((prev) =>
                                            prev.map((it, idx) =>
                                              idx === iIdx
                                                ? { ...it, quantity: Math.max(1, it.quantity - 1) }
                                                : it
                                            )
                                          );
                                        } else {
                                          setOrderProductQty((q) => Math.max(1, q - 1));
                                        }
                                      }}
                                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    >
                                      -
                                    </button>
                                    <span className="w-5 text-center font-bold text-xs text-slate-900 dark:text-white">
                                      {cItem.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (orderCartItems.length > 0) {
                                          setOrderCartItems((prev) =>
                                            prev.map((it, idx) =>
                                              idx === iIdx ? { ...it, quantity: it.quantity + 1 } : it
                                            )
                                          );
                                        } else {
                                          setOrderProductQty((q) => q + 1);
                                        }
                                      }}
                                      className="w-6 h-6 rounded flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                    >
                                      +
                                    </button>
                                    {orderCartItems.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOrderCartItems((prev) =>
                                            prev.filter((_, idx) => idx !== iIdx)
                                          );
                                        }}
                                        className="w-6 h-6 rounded flex items-center justify-center font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer ml-0.5"
                                        title="কার্ট থেকে রিমুভ করুন"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {orderFormError && (
                            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
                              <span>⚠️</span>
                              <span>{orderFormError}</span>
                            </div>
                          )}

                          {/* Step 1: Customer Details */}
                          <div className="space-y-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <span>১. কাস্টমার তথ্য:</span>
                              <span className="text-rose-500">*</span>
                            </label>
                            
                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
                                {selectedLanguage === 'en' ? 'Your Name *' : 'আপনার নাম *'}
                              </label>
                              <input
                                ref={inputNameRef}
                                type="text"
                                placeholder={selectedLanguage === 'en' ? 'Enter your name' : 'আপনার নাম লিখুন'}
                                value={orderCustomerName}
                                onChange={(e) => {
                                  setOrderCustomerName(e.target.value);
                                  if (e.target.value.trim()) setFieldErrors((prev) => ({ ...prev, name: false }));
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-emerald-500 transition-all ${
                                  fieldErrors.name ? 'border-2 border-rose-500 bg-rose-50/90 dark:bg-rose-950/90 ring-2 ring-rose-300 animate-pulse' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                                }`}
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
                                {selectedLanguage === 'en' ? 'Your Mobile Number *' : 'আপনার মোবাইল নাম্বার *'}
                              </label>
                              <input
                                ref={inputMobileRef}
                                type="tel"
                                maxLength={11}
                                placeholder="01XXXXXXXXX"
                                value={orderCustomerMobile}
                                onChange={(e) => {
                                  // Accept ONLY numeric digits, no english letters or characters
                                  const digitsOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                                  setOrderCustomerMobile(digitsOnly);
                                  if (digitsOnly.length === 11 && ['013','014','015','016','017','018','019'].some(p => digitsOnly.startsWith(p))) {
                                    setFieldErrors((prev) => ({ ...prev, mobile: false }));
                                  }
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-emerald-500 transition-all ${
                                  fieldErrors.mobile ? 'border-2 border-rose-500 bg-rose-50/90 dark:bg-rose-950/90 ring-2 ring-rose-300 animate-pulse' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                                }`}
                              />
                            </div>

                             <div>
                              <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">
                                {orderCreateAccount
                                  ? (selectedLanguage === 'en' ? 'Your Email Address * (Required for Account)' : 'আপনার ইমেইল অ্যাড্রেস * (অ্যাকাউন্ট খোলার জন্য আবশ্যক)')
                                  : (selectedLanguage === 'en' ? 'Your Email (Optional)' : 'আপনার ইমেইল (ঐচ্ছিক)')}
                              </label>
                              <input
                                type="email"
                                placeholder="Enter your email"
                                value={orderCustomerEmail}
                                onChange={(e) => {
                                  setOrderCustomerEmail(e.target.value);
                                  if (e.target.value.trim()) setFieldErrors((prev) => ({ ...prev, email: false }));
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-emerald-500 transition-all ${
                                  fieldErrors.email ? 'border-2 border-rose-500 bg-rose-50/90 dark:bg-rose-950/90 ring-2 ring-rose-300 animate-pulse' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                                }`}
                              />
                            </div>

                            {/* Create Account Checkbox - Only shown for logged-out visitors */}
                            {!currentCustomer && (
                              <>
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={orderCreateAccount}
                                      onChange={(e) => {
                                        setOrderCreateAccount(e.target.checked);
                                        if (!e.target.checked) {
                                          setFieldErrors((prev) => ({ ...prev, email: false, password: false }));
                                        }
                                      }}
                                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      🔐 {selectedLanguage === 'en' ? 'Create Account' : 'ক্রিয়েট অ্যাকাউন্ট (অ্যাকাউন্ট খুলুন)'}
                                    </span>
                                  </label>
                                </div>

                                {orderCreateAccount && (
                                  <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2 mt-1 animate-fadeIn">
                                    <div>
                                      <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                                        {selectedLanguage === 'en' ? 'Password * (min 6 characters)' : 'পাসওয়ার্ড লিখুন * (কমপক্ষে ৬ অক্ষর)'}
                                      </label>
                                      <input
                                        type="password"
                                        placeholder={selectedLanguage === 'en' ? 'Enter password' : 'পাসওয়ার্ড লিখুন'}
                                        value={orderPassword}
                                        onChange={(e) => {
                                          setOrderPassword(e.target.value);
                                          if (e.target.value.trim().length >= 6) {
                                            setFieldErrors((prev) => ({ ...prev, password: false }));
                                          }
                                        }}
                                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-emerald-500 transition-all ${
                                          fieldErrors.password ? 'border-2 border-rose-500 bg-rose-50/90 dark:bg-rose-950/90 ring-2 ring-rose-300 animate-pulse' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                                        }`}
                                      />
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Step 2: Delivery Address & Dropdowns */}
                          <div className="space-y-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <span>২. {selectedLanguage === 'en' ? 'Delivery Address' : 'ডেলিভারি ঠিকানা'}:</span>
                                <span className="text-rose-500">*</span>
                              </span>
                            </label>

                            {/* Dhaka vs Outside Dhaka toggle */}
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderDeliveryZone('dhaka');
                                  setOrderDivision('Dhaka');
                                  setOrderDistrict('Dhaka');
                                  const upz = BANGLADESH_LOCATIONS['Dhaka']?.districts['Dhaka']?.upazilas || [];
                                  setOrderUpazila(upz[0] || 'Dhanmondi');
                                }}
                                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                  orderDeliveryZone === 'dhaka'
                                    ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-bold'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs'
                                }`}
                              >
                                <p className="text-[11px] font-bold text-slate-900 dark:text-white">📍 ঢাকা সিটি</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">চার্জ: ৳{insideDhakaFee}</p>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOrderDeliveryZone('outside');
                                  if (orderDivision === 'Dhaka' && orderDistrict === 'Dhaka') {
                                    setOrderDivision('Chattogram');
                                    setOrderDistrict('Chattogram');
                                    const upz = BANGLADESH_LOCATIONS['Chattogram']?.districts['Chattogram']?.upazilas || [];
                                    setOrderUpazila(upz[0] || 'Kotwali');
                                  }
                                }}
                                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                  orderDeliveryZone === 'outside'
                                    ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-bold'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs'
                                }`}
                              >
                                <p className="text-[11px] font-bold text-slate-900 dark:text-white">📍 ঢাকার বাইরে</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">চার্জ: ৳{outsideDhakaFee}</p>
                              </button>
                            </div>

                            {/* 3 Dropdown Selectors: Division, District, Upazila */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1">
                              <div>
                                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">বিভাগ *</label>
                                <select
                                  value={orderDivision}
                                  onChange={(e) => {
                                    const newDiv = e.target.value;
                                    setOrderDivision(newDiv);
                                    const districts = Object.keys(BANGLADESH_LOCATIONS[newDiv]?.districts || {});
                                    const firstDist = districts[0] || '';
                                    setOrderDistrict(firstDist);
                                    const upazilas = BANGLADESH_LOCATIONS[newDiv]?.districts[firstDist]?.upazilas || [];
                                    setOrderUpazila(upazilas[0] || '');
                                    if (newDiv === 'Dhaka' && firstDist === 'Dhaka') {
                                      setOrderDeliveryZone('dhaka');
                                    } else {
                                      setOrderDeliveryZone('outside');
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-emerald-500 cursor-pointer"
                                >
                                  {Object.keys(BANGLADESH_LOCATIONS).map((divKey) => (
                                    <option key={divKey} value={divKey} className="dark:bg-slate-900">
                                      {BANGLADESH_DIVISION_NAMES_BN[divKey] || divKey}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">জেলা *</label>
                                <select
                                  value={orderDistrict}
                                  onChange={(e) => {
                                    const newDist = e.target.value;
                                    setOrderDistrict(newDist);
                                    const upazilas = BANGLADESH_LOCATIONS[orderDivision]?.districts[newDist]?.upazilas || [];
                                    setOrderUpazila(upazilas[0] || '');
                                    if (orderDivision === 'Dhaka' && newDist === 'Dhaka') {
                                      setOrderDeliveryZone('dhaka');
                                    } else {
                                      setOrderDeliveryZone('outside');
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-emerald-500 cursor-pointer"
                                >
                                  {Object.keys(BANGLADESH_LOCATIONS[orderDivision]?.districts || {}).map((distKey) => (
                                    <option key={distKey} value={distKey} className="dark:bg-slate-900">
                                      {BANGLADESH_DISTRICT_NAMES_BN[distKey] || distKey}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">উপজেলা / থানা *</label>
                                <select
                                  value={orderUpazila}
                                  onChange={(e) => setOrderUpazila(e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-emerald-500 cursor-pointer"
                                >
                                  {(BANGLADESH_LOCATIONS[orderDivision]?.districts[orderDistrict]?.upazilas || []).map((upz) => (
                                    <option key={upz} value={upz} className="dark:bg-slate-900">
                                      {upz}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mb-0.5">বিস্তারিত ঠিকানা *</label>
                              <textarea
                                ref={inputAddressRef}
                                rows={2}
                                placeholder="এখানে বিস্তারিত ঠিকানা লিখুন (বাসা/রোড/গ্রাম)"
                                value={orderAddressDetails}
                                onChange={(e) => {
                                  setOrderAddressDetails(e.target.value);
                                  if (e.target.value.trim()) setFieldErrors((prev) => ({ ...prev, address: false }));
                                }}
                                className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-emerald-500 resize-none transition-all ${
                                  fieldErrors.address ? 'border-2 border-rose-500 bg-rose-50/90 dark:bg-rose-950/90 ring-2 ring-rose-300 animate-pulse' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Step 3: Color Selection (If Colors available) */}
                          {availColors.length > 0 && (
                            <div className="space-y-1.5 p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1">
                                  <span>৩. কালার নির্বাচন করুন:</span>
                                  <span className="text-rose-500">*</span>
                                </label>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {availColors.map((colorItem, cIdx) => {
                                  const isSelected = orderSelectedColor === colorItem.name;
                                  return (
                                    <button
                                      key={cIdx}
                                      type="button"
                                      onClick={() => {
                                        setOrderSelectedColor(colorItem.name);
                                        if (colorItem.imageUrl) {
                                          setOrderSelectedColorImage(colorItem.imageUrl);
                                        }
                                      }}
                                      className={`p-1.5 rounded-lg border flex items-center gap-2 transition-all cursor-pointer text-left ${
                                        isSelected
                                          ? 'border-purple-600 bg-white dark:bg-slate-900 shadow-xs ring-2 ring-purple-400 font-bold text-purple-950 dark:text-purple-200'
                                          : 'border-purple-200/80 dark:border-purple-800/60 bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                                      }`}
                                    >
                                      <span
                                        className="w-4 h-4 rounded-full border border-black/10 shrink-0 shadow-xs"
                                        style={{ backgroundColor: colorItem.hexCode || '#10B981' }}
                                      />
                                      <span className="text-[11px] truncate flex-1">{colorItem.name}</span>
                                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Step 4: Size Selection (If Sizes available) */}
                          {availSizes.length > 0 && (
                            <div className="space-y-1.5 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1">
                                  <span>{availColors.length > 0 ? '৪' : '৩'}. সাইজ নির্বাচন করুন:</span>
                                  <span className="text-rose-500">*</span>
                                </label>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {availSizes.map((sizeName, sIdx) => {
                                  const isSelected = orderSelectedSize === sizeName;
                                  return (
                                    <button
                                      key={sIdx}
                                      type="button"
                                      onClick={() => setOrderSelectedSize(sizeName)}
                                      className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                        isSelected
                                          ? 'border-amber-600 bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                                          : 'border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 hover:bg-amber-100/60 dark:hover:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                                      }`}
                                    >
                                      <span>{sizeName}</span>
                                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Step 5: Payment Method */}
                          <div className="space-y-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                              {availColors.length > 0 && availSizes.length > 0 ? '৫' : (availColors.length > 0 || availSizes.length > 0) ? '৪' : '৩'}. পেমেন্ট পদ্ধতি:
                            </label>
                            <div className="grid grid-cols-1 gap-1.5">
                              <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${orderPaymentMethod === 'cod' ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 shadow-xs' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'}`}>
                                <input
                                  type="radio"
                                  name="inlinePayment"
                                  checked={orderPaymentMethod === 'cod'}
                                  onChange={() => setOrderPaymentMethod('cod')}
                                  className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <div className="text-left">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white block">💵 Cash on Delivery</span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">পণ্য হাতে পেয়ে মূল্য পরিশোধ করবেন</span>
                                </div>
                              </label>

                              <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${orderPaymentMethod === 'advance_delivery' ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 shadow-xs' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'}`}>
                                <input
                                  type="radio"
                                  name="inlinePayment"
                                  checked={orderPaymentMethod === 'advance_delivery'}
                                  onChange={() => setOrderPaymentMethod('advance_delivery')}
                                  className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <div className="text-left">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white block">⚡ ডেলিভারি চার্জ অগ্রিম</span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">বাকি টাকা ডেলিভারির সময় ক্যাশে পরিশোধ</span>
                                </div>
                              </label>

                              <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${orderPaymentMethod === 'full_advance' ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 shadow-xs' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'}`}>
                                <input
                                  type="radio"
                                  name="inlinePayment"
                                  checked={orderPaymentMethod === 'full_advance'}
                                  onChange={() => setOrderPaymentMethod('full_advance')}
                                  className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <div className="text-left">
                                  <span className="text-xs font-bold text-slate-900 dark:text-white block">📱 সম্পূর্ণ মূল্য পরিশোধ</span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400">অগ্রিম পেমেন্ট করে ফাস্ট ডেলিভারি পান</span>
                                </div>
                              </label>
                            </div>

                            {/* ADVANCE PAYMENT DETAILS & SENDER NUMBER / TRXID (ONLY WHEN NOT COD) */}
                            {(orderPaymentMethod === 'advance_delivery' || orderPaymentMethod === 'full_advance') && (
                              <div className="mt-2 p-3 rounded-xl bg-slate-900 text-white space-y-2.5 border border-slate-800">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                  <span className="text-[11px] font-bold text-emerald-400">
                                    {orderPaymentMethod === 'advance_delivery' ? '⚡ ডেলিভারি চার্জ অগ্রিম পেমেন্ট করুন' : '📱 সম্পূর্ণ পেমেন্ট করুন'}
                                  </span>
                                  <span className="text-[11px] font-extrabold text-amber-300 bg-amber-950 px-2 py-0.5 rounded-md border border-amber-800">
                                    {orderPaymentMethod === 'advance_delivery'
                                      ? `৳${orderDeliveryZone === 'dhaka' ? insideDhakaFee : outsideDhakaFee}`
                                      : `৳${((Number(activeOrderProduct.price) || 0) * orderProductQty) + (((Number(activeOrderProduct.price) || 0) * orderProductQty) >= 5000 ? 0 : (orderDeliveryZone === 'dhaka' ? insideDhakaFee : outsideDhakaFee))}`
                                    }
                                  </span>
                                </div>

                                {/* Bkash vs Nagad Selector Buttons */}
                                <div>
                                  <label className="text-[10px] font-bold text-slate-300 block mb-1">
                                    পেমেন্ট মেথড বেছে নিন (বিকাশ নাকি নগদ):
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setOrderPaymentProvider('bkash')}
                                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                        orderPaymentProvider === 'bkash'
                                          ? 'bg-pink-600 border-pink-400 text-white shadow-md ring-2 ring-pink-400'
                                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                                      }`}
                                    >
                                      <span>🌸 বিকাশ (bKash)</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setOrderPaymentProvider('nagad')}
                                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                        orderPaymentProvider === 'nagad'
                                          ? 'bg-amber-600 border-amber-400 text-white shadow-md ring-2 ring-amber-400'
                                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                                      }`}
                                    >
                                      <span>🍊 নগদ (Nagad)</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Conditional Payment Info Box */}
                                {(() => {
                                  const bkashGateway = siteSettings?.paymentGateways?.find(
                                    (g) => g.id === 'bkash' || g.name.toLowerCase().includes('bkash')
                                  );
                                  const nagadGateway = siteSettings?.paymentGateways?.find(
                                    (g) => g.id === 'nagad' || g.name.toLowerCase().includes('nagad')
                                  );

                                  const bkashNum = bkashGateway?.accountNumber || siteSettings?.bkashNumber || '01719143897';
                                  const bkashType = bkashGateway?.accountType || siteSettings?.bkashType || 'Personal';

                                  const nagadNum = nagadGateway?.accountNumber || siteSettings?.nagadNumber || '01887713212';
                                  const nagadType = nagadGateway?.accountType || siteSettings?.nagadType || 'Merchant';

                                  if (!orderPaymentProvider) {
                                    return null;
                                  }

                                  if (orderPaymentProvider === 'bkash') {
                                    return (
                                      <div className="p-2.5 rounded-xl bg-pink-950/70 border border-pink-700/60 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-mono font-black text-white tracking-wider">
                                              {bkashNum}
                                            </p>
                                            {bkashType && (
                                              <span className="text-[10px] font-bold text-pink-200 bg-pink-900/80 px-2 py-0.5 rounded-md border border-pink-700/60">
                                                ({bkashType})
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const cleanNum = bkashNum.replace(/\s*\([^)]*\)/g, '').trim();
                                              navigator.clipboard?.writeText(cleanNum || bkashNum);
                                              setCopiedNumber('bkash');
                                              setTimeout(() => setCopiedNumber(null), 2000);
                                            }}
                                            className="p-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                                            title="নম্বর কপি করুন"
                                          >
                                            {copiedNumber === 'bkash' ? (
                                              <Check className="w-3.5 h-3.5 text-emerald-300" />
                                            ) : (
                                              <Copy className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                        </div>
                                        <p className="text-[11px] font-semibold text-pink-200">
                                          {bkashType.toLowerCase().includes('merchant') ? 'এই নাম্বারে পেমেন্ট করুন।' : 'এই নাম্বারে সেন্ড মানি করুন।'}
                                        </p>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-700/60 space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="text-sm font-mono font-black text-white tracking-wider">
                                            {nagadNum}
                                          </p>
                                          {nagadType && (
                                            <span className="text-[10px] font-bold text-amber-200 bg-amber-900/80 px-2 py-0.5 rounded-md border border-amber-700/60">
                                              ({nagadType})
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const cleanNum = nagadNum.replace(/\s*\([^)]*\)/g, '').trim();
                                            navigator.clipboard?.writeText(cleanNum || nagadNum);
                                            setCopiedNumber('nagad');
                                            setTimeout(() => setCopiedNumber(null), 2000);
                                          }}
                                          className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                                          title="নম্বর কপি করুন"
                                        >
                                          {copiedNumber === 'nagad' ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>
                                      <p className="text-[11px] font-semibold text-amber-200">
                                        {nagadType.toLowerCase().includes('merchant') ? 'এই নাম্বারে পেমেন্ট করুন।' : 'এই নাম্বারে সেন্ড মানি করুন।'}
                                      </p>
                                    </div>
                                  );
                                })()}

                                {/* Sender Phone & TrxID Inputs */}
                                <div className="space-y-2 pt-1">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-200 block mb-1">
                                      আপনার {orderPaymentProvider === 'bkash' ? 'বিকাশ' : 'নগদ'} সেন্ডার নাম্বার *
                                    </label>
                                    <input
                                      ref={inputSenderMobileRef}
                                      type="tel"
                                      placeholder="যে নাম্বার থেকে টাকা পাঠাইছেন"
                                      value={orderSenderMobile}
                                      onChange={(e) => {
                                        setOrderSenderMobile(e.target.value);
                                        if (e.target.value.trim().length >= 11) setFieldErrors((prev) => ({ ...prev, senderMobile: false }));
                                      }}
                                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold text-white placeholder:text-slate-500 focus:outline-emerald-500 transition-all ${
                                        fieldErrors.senderMobile ? 'border-2 border-rose-500 bg-rose-950/80 ring-2 ring-rose-400 animate-pulse' : 'border-slate-700 bg-slate-800'
                                      }`}
                                    />
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-200 block mb-1">
                                      {orderPaymentProvider === 'bkash' ? 'বিকাশ' : 'নগদ'} ট্রানজেকশন আইডি *
                                    </label>
                                    <input
                                      ref={inputTrxIdRef}
                                      type="text"
                                      placeholder="পেমেন্ট কনফার্মেশনের ট্রানজেকশন আইডি লিখুন"
                                      value={orderTrxId}
                                      onChange={(e) => {
                                        setOrderTrxId(e.target.value);
                                        if (e.target.value.trim().length >= 4) setFieldErrors((prev) => ({ ...prev, trxId: false }));
                                      }}
                                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold text-emerald-400 placeholder:text-slate-500 focus:outline-emerald-500 transition-all ${
                                        fieldErrors.trxId ? 'border-2 border-rose-500 bg-rose-950/80 ring-2 ring-rose-400 animate-pulse' : 'border-slate-700 bg-slate-800'
                                      }`}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Step 6: Summary & Calculation */}
                          {(() => {
                            let displayCartItems = [...orderCartItems];
                            if (displayCartItems.length === 0 && activeOrderProduct) {
                              displayCartItems = [
                                {
                                  product: activeOrderProduct,
                                  quantity: orderProductQty || 1,
                                  selectedColor: orderSelectedColor,
                                  selectedColorImage: orderSelectedColorImage,
                                  selectedSize: orderSelectedSize,
                                },
                              ];
                            }

                            const subtotal = displayCartItems.reduce(
                              (sum, item) => sum + (Number(item.product.price) || 0) * item.quantity,
                              0
                            );
                            const totalQty = displayCartItems.reduce((s, i) => s + i.quantity, 0);
                            const delCharge =
                              subtotal >= 5000
                                ? 0
                                : orderDeliveryZone === 'dhaka'
                                ? insideDhakaFee
                                : outsideDhakaFee;
                            const grandTotal = subtotal + delCharge;

                            return (
                              <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs space-y-1">
                                <div className="flex justify-between text-slate-700 dark:text-slate-300 text-[11px]">
                                  <span>পণ্যের মোট মূল্য ({totalQty} টি):</span>
                                  <span className="font-bold text-slate-900 dark:text-white">৳{subtotal.toLocaleString()}</span>
                                </div>
                                {(orderSelectedColor || orderSelectedSize) && (
                                  <div className="flex justify-between text-purple-900 dark:text-purple-200 text-[11px] bg-white/60 dark:bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/60">
                                    <span>নির্বাচিত ভেরিয়েশন:</span>
                                    <span className="font-bold">
                                      {[orderSelectedColor ? `কালার: ${orderSelectedColor}` : '', orderSelectedSize ? `সাইজ: ${orderSelectedSize}` : ''].filter(Boolean).join(' | ')}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between text-slate-700 dark:text-slate-300 text-[11px]">
                                  <span>ডেলিভারি চার্জ:</span>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {subtotal >= 5000 ? 'ফ্রি ডেলিভারি 🎁' : `৳${delCharge}`}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-slate-900 dark:text-white font-extrabold text-xs pt-1 border-t border-emerald-200 dark:border-emerald-800/60">
                                  <span>সর্বমোট প্রদেয় টাকা:</span>
                                  <span className="text-emerald-800 dark:text-emerald-400 text-sm font-black">
                                    ৳{grandTotal.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}

                    {/* Step 5: Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={orderSubmitting}
                        onClick={() => handleConfirmAiOrder({ preventDefault: () => {} } as any)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>{orderSubmitting ? 'অর্ডার সাবমিট হচ্ছে...' : '🛍️ অর্ডার কনফার্ম করুন'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleHideOrderForm}
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                      >
                        হাইড / বাতিল
                      </button>
                    </div>
                  </div>
                )}

                {isAiThinking && (
                  <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit text-xs text-slate-500 dark:text-slate-300 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[11px] font-medium">{botName} ভাবছে...</span>
                  </div>
                )}
              </div>

              {/* QUICK SUGGESTIONS PILLS */}
              {showAiSuggestions && (
                <div className="bg-white dark:bg-slate-900 px-2.5 py-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none text-[10px]">
                  {selectedLanguage === 'en' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSendAiMessage('I want to place an order')}
                        className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <span>🛍️ Place an Order</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendAiMessage('I want to track my order')}
                        className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer border border-amber-300/80 dark:border-amber-700/60"
                      >
                        <span>📦 Track Order</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendAiMessage('Show me your popular products')}
                        className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>🔥 Popular Products</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendAiMessage('Tell me about KenaX BD')}
                        className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>ℹ️ About Us</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendAiMessage('What are the delivery charges?')}
                        className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>🚚 Delivery Charges</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendAiMessage('Give me customer support contact')}
                        className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border border-emerald-200/60 dark:border-emerald-800/60"
                      >
                        <span>📞 Customer Support</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSendAiMessage('আমি একটি পণ্য অর্ডার করতে চাই')}
                        className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <span>🛍️ অর্ডার করতে চাই</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendAiMessage('আমার অর্ডার ট্র্যাক করুন')}
                        className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer border border-amber-300/80 dark:border-amber-700/60"
                      >
                        <span>📦 অর্ডার ট্র্যাক করুন</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendAiMessage('আপনাদের সেরা ও জনপ্রিয় পণ্যগুলো দেখান')}
                        className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>🔥 জনপ্রিয় পণ্যসমূহ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendAiMessage('KenaX BD সম্পর্কে জানতে চাই')}
                        className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>ℹ️ আমাদের সম্পর্কে</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendAiMessage('ডেলিভারি চার্জ ও ডেলিভারির নিয়মগুলো বলুন')}
                        className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>🚚 ডেলিভারি চার্জ কত?</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendAiMessage('কাস্টমার সাপোর্ট মেনু দিন')}
                        className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border border-emerald-200/60 dark:border-emerald-800/60"
                      >
                        <span>📞 কাস্টমার সাপোর্ট</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-2.5 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] md:pb-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const isCurrentlyOpen = activeOrderProduct && !isOrderBoxMinimized;

                    if (isCurrentlyOpen) {
                      // IF OPEN -> TOGGLE TO HIDE
                      handleHideOrderForm();
                    } else {
                      // IF HIDDEN -> TOGGLE TO OPEN
                      const prodToOpen = activeOrderProduct || lastActiveOrderProduct;
                      if (prodToOpen) {
                        if (!activeOrderProduct) setActiveOrderProduct(prodToOpen);
                        setIsOrderBoxMinimized(false);
                        shouldScrollToOrderFormTop.current = true;
                        setTimeout(() => {
                          orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 100);
                        const promptMsg: ChatMessage = {
                          id: `ai-reopen-input-${Date.now()}`,
                          sender: 'bot',
                          text: selectedLanguage === 'en'
                            ? `Sir, the order details form for **${prodToOpen.name || prodToOpen.title}** is opened.`
                            : `স্যার, আপনার নির্বাচন করা **${prodToOpen.name || prodToOpen.title}** এর অর্ডার ফর্মটি আবার অন করা হয়েছে।`,
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        };
                        setAiMessages((prev) => [...prev, promptMsg]);
                      } else {
                        const promptMsg: ChatMessage = {
                          id: `ai-order-prompt-input-${Date.now()}`,
                          sender: 'bot',
                          text: selectedLanguage === 'en'
                            ? `Sir, please select a product or tell me which product you want to order!`
                            : `স্যার, পছন্দমতো যেকোনো প্রোডাক্ট সিলেক্ট করুন অথবা যে পণ্যটি অর্ডার করতে চান তার নাম লিখে জানান!`,
                          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        };
                        setAiMessages((prev) => [...prev, promptMsg]);
                      }
                    }
                  }}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                    activeOrderProduct && !isOrderBoxMinimized
                      ? 'bg-rose-500 hover:bg-rose-600 text-white font-black shadow-sm ring-2 ring-rose-300 dark:ring-rose-900'
                      : (activeOrderProduct || lastActiveOrderProduct)
                      ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-sm ring-2 ring-amber-300 animate-bounce'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold'
                  }`}
                  title={
                    activeOrderProduct && !isOrderBoxMinimized
                      ? 'অর্ডার ফর্ম হাইড করুন'
                      : 'অর্ডার ফর্ম অন করুন'
                  }
                >
                  <ShoppingBag className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
                  placeholder={
                    selectedLanguage === 'en'
                      ? 'Ask KenaX AI or type product/order ID...'
                      : 'কেনাকাটা চালিয়ে যান বা প্রোডাক্টের নাম বলুন...'
                  }
                  className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-normal"
                />

                <button
                  type="button"
                  onClick={() => handleSendAiMessage()}
                  disabled={isAiThinking || !aiInput.trim()}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-all cursor-pointer shadow-md shadow-emerald-600/20 shrink-0"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. OPTIONAL SPEED DIAL ICONS (WhatsApp, Telegram, Messenger) */}
        <AnimatePresence>
          {isSpeedDialOpen && activeChatModal === 'none' && (
            <div className="flex flex-col items-center gap-2.5 mb-3 pointer-events-auto">
              {/* Messenger */}
              <motion.a
                href={messengerUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                className="w-11 h-11 rounded-full bg-[#0084FF] text-white flex items-center justify-center shadow-lg shadow-blue-600/30 hover:scale-110 transition-transform cursor-pointer ring-2 ring-white"
                title="Facebook Messenger"
              >
                <SiMessenger className="w-5 h-5" />
              </motion.a>

              {/* Telegram */}
              <motion.a
                href={`https://t.me/${telegramBotUsername.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                className="w-11 h-11 rounded-full bg-[#24A1DE] text-white flex items-center justify-center shadow-lg shadow-sky-600/30 hover:scale-110 transition-transform cursor-pointer ring-2 ring-white"
                title="Telegram Bot"
              >
                <SiTelegram className="w-5 h-5" />
              </motion.a>

              {/* WhatsApp Agent */}
              <motion.a
                href={`https://wa.me/88${officialAgentNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                className="w-11 h-11 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 hover:scale-110 transition-transform cursor-pointer ring-2 ring-white"
                title={`WhatsApp Agent: ${officialAgentNumber}`}
              >
                <SiWhatsapp className="w-5 h-5" />
              </motion.a>
            </div>
          )}
        </AnimatePresence>

        {/* 4. THE MAIN FLOATING TRIGGER BUTTON - AI CHATBOT WITH KENAX BD LOGO */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            if (activeChatModal !== 'none') {
              setActiveChatModal('none');
              setIsSpeedDialOpen(false);
            } else {
              setActiveChatModal('ai_bot');
              setShowGreetingTooltip(false);
              setHasUnread(false);
            }
          }}
          className={`pointer-events-auto relative w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-2xl transition-all cursor-pointer ${
            activeChatModal !== 'none'
              ? 'bg-slate-900 text-white shadow-slate-900/40 ring-2 ring-slate-700'
              : 'bg-white dark:bg-slate-900 border-2 border-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.3)] ring-4 ring-emerald-100/90 dark:ring-emerald-950/60'
          }`}
          aria-label="KenaX AI Chatbot"
          title="KenaX AI Chatbot - কথা বলুন বা অর্ডার করুন"
        >
          {activeChatModal !== 'none' ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <div className="relative flex items-center justify-center p-1 w-full h-full overflow-hidden">
              {siteSettings?.customLogo ? (
                <img
                  src={siteSettings.customLogo}
                  alt={siteSettings.siteName || 'KenaX BD'}
                  className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <KenaXLogo size="xs" customLogoUrl={siteSettings?.customLogo} siteName="KenaX BD" />
              )}
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute top-1 right-1 animate-pulse" />
            </div>
          )}

          {hasUnread && activeChatModal === 'none' && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-md">
              1
            </span>
          )}
        </motion.button>
      </div>
    </>
  );
};
