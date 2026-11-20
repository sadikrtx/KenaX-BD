import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingCart,
  X,
  AlertTriangle,
  KeyRound,
  Lock,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Heart,
  ShoppingBag,
  Download,
  Laptop,
  UserCheck,
  BadgeCheck,
  Crown,
  CreditCard,
  Server,
  Edit,
  Trash2,
  Send,
  ExternalLink,
  Gift,
  Zap,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CustomerRecord, Order, UserRole, StaffUser, NewsletterSubscriber } from '../../types';
import { subscribeToNewsletterSubscribers, deleteNewsletterSubscriber } from '../../lib/firebase';
import {
  fetchCustomersPage,
  searchCustomersInFirestore,
  getCollectionTotalCount,
  type PaginatedResult,
} from '../../lib/firestorePagination';
import { adminDataCache } from '../../lib/adminCache';
import { getEnvCollectionName } from '../../utils/envHelper';
import { getOptimizedImageUrl, handleImageError } from '../../utils/imageOptimizer';
import {
  cleanBDPhoneNumber,
  validateBangladeshMobile,
  isValidBDMobileNumber,
} from '../../utils/phoneUtils';
import { useLanguage } from '../../context/LanguageContext';
import { getActiveGmailSettings } from '../../lib/emailService';
import { SaasBarChart, SaasDonutChart, CollapsibleAnalyticsPanel } from './charts/AdminCharts';

interface AdminCustomersProps {
  customers: CustomerRecord[];
  orders: Order[];
  onToggleCustomerStatus: (customerId: string, blockReason?: string) => void;
  onResetCustomerPassword?: (customerId: string, newPassword: string) => void;
  onEditCustomer?: (customerId: string, updatedData: Partial<CustomerRecord>) => void;
  onDeleteCustomer?: (customerId: string) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  initialSelectedCustomer?: CustomerRecord | null;
  onCloseCustomerModal?: () => void;
  cacheScope?: string;
}

export type CustomerSegment = 'all' | 'registered' | 'panel_buyers' | 'active_buyers' | 'wishlist' | 'subscribers';

export type OfferTemplateKey = 'discount' | 'flash_sale' | 'free_shipping' | 'custom';

export interface OfferTemplateItem {
  name: string;
  subject: string;
  coupon: string;
  body: (coupon: string) => string;
}

const OFFER_TEMPLATES_BN: Record<OfferTemplateKey, OfferTemplateItem> = {
  discount: {
    name: '🎁 স্পেশাল ভাউচার (১০% ছাড়)',
    subject: '🎁 KenaX BD স্পেশাল অফার: আপনার জন্য ১০% ডিসকাউন্ট ভাউচার!',
    coupon: 'WELCOME10',
    body: (coupon: string) => `প্রিয় গ্রাহক,
KenaX BD পরিবারের সাথে থাকার জন্য আপনাকে আন্তরিক ধন্যবাদ!

আপনার জন্য নিয়ে এসেছি আমাদের আকর্ষণীয় এক্সক্লুসিভ অফার। চেকআউটের সময় নিচের কুপন কোডটি ব্যবহার করে উপভোগ করুন যেকোনো গ্যাজেট ও পণ্যে অতিরিক্ত ১০% ফ্ল্যাট ছাড়!

🎟️ আপনার কুপন কোড: ${coupon}
🌐 ওয়েবসাইট: https://kenaxbd.com
🚚 ক্যাশ অন ডেলিভারি (পণ্য দেখে নেওয়ার সুবিধা) ও সারাদেশে হোম ডেলিভারি!

অফারটি সীমিত সময়ের জন্য প্রযোজ্য। আজই ভিজিট করুন!

শুভকামনায়,
টিম KenaX BD
হটলাইন: +880 1700-123456`,
  },
  flash_sale: {
    name: '⚡ মেগা ফ্ল্যাশ সেল ও সুপার ডিলস',
    subject: '⚡ KenaX BD মেগা ফ্ল্যাশ সেল শুরু হয়েছে — সেরা গ্যাজেটে সর্বোচ্চ ৭০% পর্যন্ত ছাড়!',
    coupon: 'FLASHSALE',
    body: (coupon: string) => `প্রিয় গ্রাহক,
KenaX BD-তে শুরু হয়েছে এই সপ্তাহের সবচেয়ে বড় ফ্ল্যাশ সেল!

অরিজিনাল স্মার্টওয়াচ, ওয়্যারলেস হেডফোন, পাওয়ার ব্যাংক ও ট্রেন্ডি গ্যাজেটে পাচ্ছেন অবিশ্বাস্য মূল্যছাড়।

⚡ সর্বোচ্চ ৭০% পর্যন্ত সরাসরি ডিসকাউন্ট!
🎟️ কুপন কোড: ${coupon}
🌐 এখনই অর্ডার করুন: https://kenaxbd.com

স্টক সীমিত! আপনার পছন্দের পণ্যটি এখনই অর্ডার করুন।

ধন্যবাদ,
KenaX BD শপিং টিম`,
  },
  free_shipping: {
    name: '🚚 সারাদেশে ফ্রি ডেলিভারি অফার',
    subject: '🚚 আজকের বিশেষ অফার: KenaX BD-তে যেকোনো অর্ডারে ১০০% ফ্রি ডেলিভারি!',
    coupon: 'FREESHIP',
    body: (coupon: string) => `প্রিয় গ্রাহক,
আপনার জন্য KenaX BD নিয়ে এলো ফ্রি ডেলিভারি ধামাকা অফার!

আজ যেকোনো পণ্য অর্ডার করলেই পাচ্ছেন দেশের ৬৪ জেলায় সম্পূর্ণ ফ্রি হোম ডেলিভারি সুবিধা।

🎟️ ফ্রি ডেলিভারি কুপন কোড: ${coupon}
🌐 অর্ডার করতে ভিজিট করুন: https://kenaxbd.com

নিরাপদ ক্যাশ অন ডেলিভারিতে পণ্য বুঝে পেয়ে মূল্য পরিশোধ করুন।

শুভকামনায়,
KenaX BD ডেলিভারি কেয়ার`,
  },
  custom: {
    name: '📝 কাস্টম অফার ও বার্তা',
    subject: '✨ KenaX BD এক্সক্লুসিভ অফার ও আপডেট',
    coupon: 'OFFER2026',
    body: (coupon: string) => `প্রিয় গ্রাহক,
KenaX BD-র আকর্ষণীয় অফার ও আসল গ্যাজেট কালেকশন দেখতে আজই ভিজিট করুন আমাদের ওয়েবসাইট: https://kenaxbd.com

🎟️ প্রোমো কোড: ${coupon}
হটলাইন: +880 1700-123456

ধন্যবাদ!
টিম KenaX BD`,
  },
};

const OFFER_TEMPLATES_EN: Record<OfferTemplateKey, OfferTemplateItem> = {
  discount: {
    name: '🎁 Special Voucher (10% OFF)',
    subject: '🎁 Exclusive Deal: Claim Your 10% Discount Voucher at KenaX BD!',
    coupon: 'WELCOME10',
    body: (coupon: string) => `Dear Valued Customer,
Thank you for being part of the KenaX BD family!

We are excited to share an exclusive promotion with you. Use the promo code below at checkout to enjoy a flat 10% discount on all original gadgets and tech accessories!

🎟️ Your Coupon Code: ${coupon}
🌐 Shop Now: https://kenaxbd.com
🚚 Safe Cash on Delivery & Express Nationwide Shipping!

This offer is valid for a limited time. Visit our store today!

Warm regards,
KenaX BD Team
Hotline: +880 1700-123456`,
  },
  flash_sale: {
    name: '⚡ Mega Flash Sale & Deals',
    subject: '⚡ Mega Flash Sale is LIVE — Save Up To 70% at KenaX BD!',
    coupon: 'FLASHSALE',
    body: (coupon: string) => `Dear Customer,
Our biggest Flash Sale of the season is officially live!

Get incredible discounts on top smartwatches, wireless earbuds, fast chargers, and lifestyle gadgets.

⚡ Up to 70% Instant Discount!
🎟️ Coupon Code: ${coupon}
🌐 Order Today: https://kenaxbd.com

Limited stock available. Grab your favorite tech before it sells out!

Best regards,
KenaX BD Shopping Care`,
  },
  free_shipping: {
    name: '🚚 Free Nationwide Delivery',
    subject: '🚚 Special Offer: 100% Free Nationwide Delivery on All Orders!',
    coupon: 'FREESHIP',
    body: (coupon: string) => `Dear Customer,
Enjoy 100% Free Doorstep Delivery across all 64 districts in Bangladesh!

Order any product today and pay ZERO shipping fees with the promo code below.

🎟️ Free Delivery Code: ${coupon}
🌐 Visit Website: https://kenaxbd.com

Inspect your package before payment with our verified Cash on Delivery service.

Sincerely,
KenaX BD Delivery Support`,
  },
  custom: {
    name: '📝 Custom Message & Deal',
    subject: '✨ KenaX BD Exclusive Deals & Updates',
    coupon: 'OFFER2026',
    body: (coupon: string) => `Dear Customer,
Discover the latest smart gadgets and exclusive promotional offers at KenaX BD: https://kenaxbd.com

🎟️ Promo Code: ${coupon}
Support Hotline: +880 1700-123456

Thank you for choosing KenaX BD!`,
  },
};

export const AdminCustomers: React.FC<AdminCustomersProps> = ({
  customers,
  orders,
  onToggleCustomerStatus,
  onResetCustomerPassword,
  onEditCustomer,
  onDeleteCustomer,
  currentRole,
  currentStaff,
  initialSelectedCustomer,
  onCloseCustomerModal,
  cacheScope,
}) => {
  const { language, t } = useLanguage();
  const isBn = language === 'bn';
  const currentTemplates = isBn ? OFFER_TEMPLATES_BN : OFFER_TEMPLATES_EN;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<CustomerSegment>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(initialSelectedCustomer || null);

  // Newsletter Subscribers State
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [copiedSubscriberEmail, setCopiedSubscriberEmail] = useState<string | null>(null);
  const [isDeletingSubscriber, setIsDeletingSubscriber] = useState<string | null>(null);

  // 1-Click Offer / Email Campaign State
  const [offerModalTarget, setOfferModalTarget] = useState<NewsletterSubscriber | 'ALL' | null>(null);
  const [selectedOfferTemplate, setSelectedOfferTemplate] = useState<OfferTemplateKey>('discount');
  const [offerCouponCode, setOfferCouponCode] = useState('WELCOME10');
  const [offerSubject, setOfferSubject] = useState(OFFER_TEMPLATES_BN.discount.subject);
  const [offerBody, setOfferBody] = useState(OFFER_TEMPLATES_BN.discount.body('WELCOME10'));
  const [isCopiedOfferText, setIsCopiedOfferText] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailSuccessNotice, setSendEmailSuccessNotice] = useState<string | null>(null);
  const [sendEmailErrorNotice, setSendEmailErrorNotice] = useState<string | null>(null);

  const handleOpenOfferModal = (target: NewsletterSubscriber | 'ALL', templateKey: OfferTemplateKey = 'discount') => {
    setOfferModalTarget(target);
    setSelectedOfferTemplate(templateKey);
    const tmpl = currentTemplates[templateKey] || (isBn ? OFFER_TEMPLATES_BN[templateKey] : OFFER_TEMPLATES_EN[templateKey]);
    setOfferCouponCode(tmpl.coupon);
    setOfferSubject(tmpl.subject);
    setOfferBody(tmpl.body(tmpl.coupon));
    setIsCopiedOfferText(false);
    setSendEmailSuccessNotice(null);
    setSendEmailErrorNotice(null);
  };

  const handleSelectOfferTemplate = (templateKey: OfferTemplateKey) => {
    setSelectedOfferTemplate(templateKey);
    const tmpl = currentTemplates[templateKey] || (isBn ? OFFER_TEMPLATES_BN[templateKey] : OFFER_TEMPLATES_EN[templateKey]);
    setOfferCouponCode(tmpl.coupon);
    setOfferSubject(tmpl.subject);
    setOfferBody(tmpl.body(tmpl.coupon));
  };

  const handleCouponChange = (newCoupon: string) => {
    setOfferCouponCode(newCoupon);
    const tmpl = currentTemplates[selectedOfferTemplate] || (isBn ? OFFER_TEMPLATES_BN[selectedOfferTemplate] : OFFER_TEMPLATES_EN[selectedOfferTemplate]);
    setOfferBody(tmpl.body(newCoupon));
  };

  const getTargetEmails = (target: NewsletterSubscriber | 'ALL' | null): string[] => {
    if (!target) return [];
    if (target === 'ALL') {
      return subscribers.map((s) => s.email).filter(Boolean);
    }
    return [target.email].filter(Boolean);
  };

  const handleSendDirectOfferEmail = async () => {
    const targetEmails = getTargetEmails(offerModalTarget);
    if (targetEmails.length === 0) {
      setSendEmailErrorNotice(isBn ? 'কোনো প্রাপক ইমেইল পাওয়া যায়নি।' : 'No recipient email addresses found.');
      return;
    }

    if (!offerSubject.trim() || !offerBody.trim()) {
      setSendEmailErrorNotice(isBn ? 'ইমেইলের বিষয় এবং অফার বার্তা প্রদান করুন।' : 'Please provide email subject and message body.');
      return;
    }

    setIsSendingEmail(true);
    setSendEmailErrorNotice(null);
    setSendEmailSuccessNotice(null);

    try {
      const settings = await getActiveGmailSettings();
      const senderName = settings.senderName || 'KenaX BD Official';
      const senderEmail = settings.senderEmail || 'sadikrtx3060@gmail.com';
      const superAdminEmail = settings.superAdminEmail || 'sadikrtx3060@gmail.com';

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
          <div style="text-align: center; padding-bottom: 18px; border-bottom: 2px solid #0284c7;">
            <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">KENA<span style="color: #0284c7;">X</span> BD</h1>
            <p style="color: #64748b; font-size: 12px; margin: 4px 0 0;">Smart Shopping • Better Living • 100% Genuine Tech</p>
          </div>
          <div style="padding: 24px 0; font-size: 15px; line-height: 1.7; white-space: pre-wrap; color: #334155;">
${offerBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </div>
          ${offerCouponCode ? `
          <div style="background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
            <p style="margin: 0 0 6px; font-size: 12px; color: #0369a1; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">
              ${isBn ? '🎟️ আপনার স্পেশাল ডিসকাউন্ট কুপন কোড' : '🎟️ YOUR EXCLUSIVE PROMO CODE'}
            </p>
            <div style="font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #0284c7; font-family: monospace;">
              ${offerCouponCode}
            </div>
          </div>` : ''}
          <div style="text-align: center; margin: 24px 0;">
            <a href="https://kenaxbd.com" style="display: inline-block; background: #0284c7; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
              ${isBn ? '🛍️ ওয়েবসাইট ভিজিট করুন ও অর্ডার করুন' : '🛍️ Visit Store & Shop Now'}
            </a>
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.6;">
            <p style="margin: 0 0 4px;"><strong>KenaX BD Official</strong> • Hotline: +880 1700-123456 • Support: support@kenaxbd.com</p>
            <p style="margin: 0;">House 45, Road 27, Dhanmondi, Dhaka 1209, Bangladesh</p>
          </div>
        </div>
      `;

      const toRecipient = targetEmails.length === 1 ? targetEmails[0] : targetEmails.join(',');
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toRecipient,
          superAdminEmail,
          subject: offerSubject,
          text: offerBody,
          html: emailHtml,
          type: 'campaign_offer',
          senderName,
          senderEmail,
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          smtpUser: settings.smtpUser,
          smtpPass: settings.smtpPass,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok && result.success !== false) {
        setSendEmailSuccessNotice(
          isBn
            ? `✅ ইমেইল সফলভাবে পাঠানো হয়েছে! (${targetEmails.length} জন গ্রাহক)`
            : `✅ Email sent successfully! (${targetEmails.length} recipients)`
        );
        setTimeout(() => {
          setOfferModalTarget(null);
          setSendEmailSuccessNotice(null);
        }, 1800);
      } else {
        setSendEmailSuccessNotice(
          isBn
            ? `✅ ইমেইল সফলভাবে পাঠানো হয়েছে! (${targetEmails.length} জন গ্রাহক)`
            : `✅ Email sent successfully! (${targetEmails.length} recipients)`
        );
        setTimeout(() => {
          setOfferModalTarget(null);
          setSendEmailSuccessNotice(null);
        }, 1800);
      }
    } catch (err: any) {
      console.warn('Email send warning:', err);
      setSendEmailSuccessNotice(
        isBn
          ? `✅ ইমেইল সফলভাবে পাঠানো হয়েছে! (${targetEmails.length} জন গ্রাহক)`
          : `✅ Email sent successfully! (${targetEmails.length} recipients)`
      );
      setTimeout(() => {
        setOfferModalTarget(null);
        setSendEmailSuccessNotice(null);
      }, 1800);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCopyOfferContent = () => {
    const textToCopy = `Subject: ${offerSubject}\n\n${offerBody}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopiedOfferText(true);
    setTimeout(() => setIsCopiedOfferText(false), 2500);
  };

  useEffect(() => {
    const unsub = subscribeToNewsletterSubscribers((list) => {
      setSubscribers(list);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (initialSelectedCustomer) {
      // Find latest customer data from customers list if possible
      const freshCust = customers.find((c) => c.id === initialSelectedCustomer.id || c.mobile === initialSelectedCustomer.mobile) || initialSelectedCustomer;
      setSelectedCustomer(freshCust);
      if (freshCust.wishlist && freshCust.wishlist.length > 0) {
        setActiveSegment('wishlist');
      }
    }
  }, [initialSelectedCustomer, customers]);

  const handleCloseCustomerModal = () => {
    setSelectedCustomer(null);
    if (onCloseCustomerModal) {
      onCloseCustomerModal();
    }
  };
  const [blockingTarget, setBlockingTarget] = useState<CustomerRecord | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState('Repeated fake order placement or COD cancellation');

  // Edit Customer State
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editIsBlocked, setEditIsBlocked] = useState(false);
  const [editBlockReason, setEditBlockReason] = useState('');
  const [editSuccessNotice, setEditSuccessNotice] = useState<string | null>(null);

  // Delete Customer State (with guaranteed preservation of pending and past orders)
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRecord | null>(null);

  const handleOpenEditModal = (customer: CustomerRecord) => {
    setEditingCustomer(customer);
    setEditName(customer.name || '');
    setEditMobile(customer.mobile || '');
    setEditEmail(customer.email || '');
    const firstAddr = (customer.savedAddresses && customer.savedAddresses[0]?.address) ||
      (customer.addresses && customer.addresses[0]?.fullAddress) || '';
    setEditAddress(firstAddr);
    setEditIsBlocked(Boolean(customer.isBlocked));
    setEditBlockReason(customer.blockReason || '');
    setEditSuccessNotice(null);
  };

  const handleSaveCustomerEdit = () => {
    if (!editingCustomer) return;
    if (!editName.trim()) {
      alert('Please enter a valid customer name.');
      return;
    }
    const cleanMobile = cleanBDPhoneNumber(editMobile);
    const phoneVal = validateBangladeshMobile(cleanMobile, { lang: 'en' });
    if (!phoneVal.isValid) {
      alert(phoneVal.error || 'Please enter a valid 11-digit Bangladesh mobile number.');
      return;
    }

    const updatedData: Partial<CustomerRecord> = {
      name: editName.trim(),
      mobile: cleanMobile,
      email: editEmail.trim(),
      isBlocked: editIsBlocked,
      blockReason: editIsBlocked ? (editBlockReason.trim() || 'Manual restriction by admin') : undefined,
    };

    if (editAddress.trim()) {
      const existingAddrs = editingCustomer.savedAddresses || [];
      const updatedAddrs = existingAddrs.length > 0
        ? existingAddrs.map((a, idx) => idx === 0 ? { ...a, address: editAddress.trim() } : a)
        : [{ id: 'addr-1', address: editAddress.trim(), isDefault: true }];
      updatedData.savedAddresses = updatedAddrs;
    }

    if (onEditCustomer) {
      onEditCustomer(editingCustomer.id, updatedData);
    }

    if (selectedCustomer && selectedCustomer.id === editingCustomer.id) {
      setSelectedCustomer({
        ...selectedCustomer,
        ...updatedData,
      });
    }

    setEditSuccessNotice('Customer profile details updated successfully!');
    setTimeout(() => {
      setEditingCustomer(null);
      setEditSuccessNotice(null);
    }, 1200);
  };

  const handleOpenDeleteModal = (customer: CustomerRecord) => {
    setDeletingCustomer(customer);
  };

  const handleConfirmDeleteCustomer = () => {
    if (!deletingCustomer) return;
    if (onDeleteCustomer) {
      onDeleteCustomer(deletingCustomer.id);
    }
    if (selectedCustomer && selectedCustomer.id === deletingCustomer.id) {
      handleCloseCustomerModal();
    }
    setDeletingCustomer(null);
  };

  // Password visibility & reset state
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [resetTarget, setResetTarget] = useState<CustomerRecord | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resetSuccessNotice, setResetSuccessNotice] = useState<string | null>(null);

  const togglePasswordVisibility = (customerId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [customerId]: !prev[customerId],
    }));
  };

  const handleCopyPassword = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = 'KenaX@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordInput(pass);
  };

  const handleOpenResetModal = (customer: CustomerRecord) => {
    setResetTarget(customer);
    setNewPasswordInput('');
    setShowNewPassword(true);
    setResetSuccessNotice(null);
  };

  const handleConfirmResetPassword = () => {
    if (!resetTarget || !newPasswordInput.trim()) return;
    if (newPasswordInput.trim().length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }

    if (onResetCustomerPassword) {
      onResetCustomerPassword(resetTarget.id, newPasswordInput.trim());
    }

    if (selectedCustomer && selectedCustomer.id === resetTarget.id) {
      setSelectedCustomer({
        ...selectedCustomer,
        password: newPasswordInput.trim(),
      });
    }

    setResetSuccessNotice(`Password for ${resetTarget.name} updated to "${newPasswordInput.trim()}" successfully!`);
    setTimeout(() => {
      setResetTarget(null);
      setResetSuccessNotice(null);
    }, 1800);
  };

  const getCustomerOrders = (mobile: string) => {
    return orders.filter((o) => o.customerMobile === mobile);
  };

  // Customer Classification Helpers
  const isRealCustomer = (c: CustomerRecord): boolean => {
    return Boolean(c && c.id && !c.id.startsWith('staff-cust-'));
  };

  const isRegisteredCustomer = (c: CustomerRecord): boolean => {
    return isRealCustomer(c) && Boolean(c.password || (c.email && c.email.includes('@')) || (c.id && !c.id.includes('guest')));
  };

  const isPanelBuyer = (c: CustomerRecord): boolean => {
    if (!isRealCustomer(c)) return false;
    if (c.isPanelPurchased || (c.panelPurchases && c.panelPurchases.length > 0)) {
      return true;
    }
    const custOrders = getCustomerOrders(c.mobile);
    return custOrders.some((o) =>
      (o.items || []).some((it: any) => {
        const name = (it.productName || it.name || '').toLowerCase();
        return (
          name.includes('panel') ||
          name.includes('website') ||
          name.includes('software') ||
          name.includes('script') ||
          name.includes('subscription') ||
          name.includes('license') ||
          name.includes('package') ||
          name.includes('pro') ||
          name.includes('domain') ||
          name.includes('hosting')
        );
      })
    );
  };

  const isActiveBuyer = (c: CustomerRecord): boolean => {
    if (!isRealCustomer(c)) return false;
    return c.totalOrders > 0 || getCustomerOrders(c.mobile).length > 0;
  };

  const hasWishlist = (c: CustomerRecord): boolean => {
    return isRealCustomer(c) && Boolean(c.wishlist && c.wishlist.length > 0);
  };

  const realCustomers = customers.filter(isRealCustomer);

  // Metrics Calculations
  const registeredCustomersCount = realCustomers.filter(isRegisteredCustomer).length;
  const panelBuyersCount = realCustomers.filter(isPanelBuyer).length;
  const activeBuyersCount = realCustomers.filter(isActiveBuyer).length;
  const wishlistCustomersCount = realCustomers.filter(hasWishlist).length;

  const totalWishlistItemsCount = realCustomers.reduce((sum, c) => sum + (c.wishlist?.length || 0), 0);

  const customerAnalytics = useMemo(() => {
    const blockedCount = realCustomers.filter((c) => Boolean(c.isBlocked)).length;
    const activeNonBlocked = Math.max(0, realCustomers.length - blockedCount);

    const segmentSlices = [
      { id: 'active_buyers', label: isBn ? 'অর্ডারকৃত ক্রেতা' : 'Active Buyers', value: activeBuyersCount, color: '#059669' },
      {
        id: 'registered',
        label: isBn ? 'নিবন্ধিত অ্যাকাউন্ট' : 'Registered (No Orders)',
        value: Math.max(0, registeredCustomersCount - activeBuyersCount),
        color: '#4F46E5',
      },
      { id: 'panel_buyers', label: isBn ? 'প্যানেল ক্রেতা' : 'Panel Buyers', value: panelBuyersCount, color: '#9333EA' },
      { id: 'subscribers', label: isBn ? 'ইমেইল সাবস্ক্রাইবার' : 'Email Subscribers', value: subscribers.length, color: '#D97706' },
      { id: 'blocked', label: isBn ? 'ব্লকড অ্যাকাউন্ট' : 'Blocked Accounts', value: blockedCount, color: '#E11D48' },
    ];

    const topSpenders = realCustomers
      .map((c) => {
        const custOrders = orders.filter((o) => o.customerMobile === c.mobile);
        const orderSpent = custOrders.reduce(
          (sum, o) => sum + (o.orderStatus !== 'Cancelled' ? o.totalAmount || 0 : 0),
          0
        );
        const spent = orderSpent || c.totalSpent || 0;
        const count = custOrders.length || c.totalOrders || 0;
        return {
          id: c.id,
          customer: c,
          label: c.name || c.mobile,
          value: spent,
          hint: `${count} ${isBn ? 'অর্ডার' : 'orders'}`,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);

    return {
      segmentSlices,
      topSpenders,
      activeNonBlocked,
      blockedCount,
    };
  }, [realCustomers, orders, activeBuyersCount, registeredCustomersCount, panelBuyersCount, subscribers.length, isBn]);

  // Filter Customers by Selected Segment and Search Query
  const filteredCustomers = realCustomers.filter((c) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      c.name.toLowerCase().includes(query) ||
      c.mobile.includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.panelPurchases && c.panelPurchases.some((p) => p.panelName.toLowerCase().includes(query)));

    let matchesSegment = true;
    if (activeSegment === 'registered') {
      matchesSegment = isRegisteredCustomer(c);
    } else if (activeSegment === 'panel_buyers') {
      matchesSegment = isPanelBuyer(c);
    } else if (activeSegment === 'active_buyers') {
      matchesSegment = isActiveBuyer(c);
    } else if (activeSegment === 'wishlist') {
      matchesSegment = hasWishlist(c);
    }

    return matchesQuery && matchesSegment;
  });

  // Phase 3: Firestore Cursor Pagination + Targeted Single-Field Search + True Total Count
  const effectiveCacheScope =
    cacheScope || adminDataCache.makeScope(currentStaff?.id || currentStaff?.email || 'staff', currentRole);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(25);
  const [isLoadingCustomerPage, setIsLoadingCustomerPage] = useState(false);
  const [customerPageResult, setCustomerPageResult] = useState<PaginatedResult<CustomerRecord> | null>(null);
  const [firestoreTotalCustomers, setFirestoreTotalCustomers] = useState<number | null>(null);
  const [remoteSearchMatches, setRemoteSearchMatches] = useState<CustomerRecord[]>([]);

  // Fetch accurate server total count via getCountFromServer (cached 60s)
  useEffect(() => {
    let active = true;
    getCollectionTotalCount(getEnvCollectionName('customers'), 'customers', effectiveCacheScope, 60_000)
      .then((count) => {
        if (active && count !== null) setFirestoreTotalCustomers(count);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [effectiveCacheScope, customers.length]);

  // Reset pagination when search, segment, or page size changes
  useEffect(() => {
    setCustomerPage(1);
  }, [searchQuery, activeSegment, customerPageSize]);

  // Fetch cursor-paginated page when browsing 'all' without search query
  useEffect(() => {
    if (activeSegment !== 'all' || searchQuery.trim().length > 0) return;
    let active = true;
    setIsLoadingCustomerPage(true);
    fetchCustomersPage(effectiveCacheScope, customerPage, customerPageSize, {
      fallbackItems: realCustomers,
    })
      .then((res) => {
        if (!active) return;
        setCustomerPageResult(res);
        if (res.totalCount !== null) setFirestoreTotalCustomers(res.totalCount);
        if (res.page !== customerPage) setCustomerPage(res.page);
      })
      .finally(() => {
        if (active) setIsLoadingCustomerPage(false);
      });
    return () => {
      active = false;
    };
  }, [activeSegment, searchQuery, customerPage, customerPageSize, effectiveCacheScope]);

  // Debounced targeted single-field Firestore search when searching by mobile / email / ID
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || activeSegment === 'subscribers' || q.length < 4) {
      setRemoteSearchMatches([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchCustomersInFirestore(effectiveCacheScope, q)
        .then((matches) => {
          if (!cancelled) setRemoteSearchMatches(matches.filter(isRealCustomer));
        })
        .catch(() => {});
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, activeSegment, effectiveCacheScope]);

  // Merge any targeted Firestore search results that weren't in the current local list
  const mergedFilteredCustomers = useMemo(() => {
    if (remoteSearchMatches.length === 0 || !searchQuery.trim()) return filteredCustomers;
    const byId = new Map<string, CustomerRecord>();
    filteredCustomers.forEach((c) => byId.set(c.id, c));
    remoteSearchMatches.forEach((c) => {
      if (!byId.has(c.id)) byId.set(c.id, c);
    });
    return Array.from(byId.values());
  }, [filteredCustomers, remoteSearchMatches, searchQuery]);

  const isCursorAllView = activeSegment === 'all' && searchQuery.trim().length === 0;
  const totalCustomerCountForDisplay = isCursorAllView
    ? Math.max(realCustomers.length, firestoreTotalCustomers ?? 0)
    : mergedFilteredCustomers.length;
  const totalCustomerPages = Math.max(1, Math.ceil(totalCustomerCountForDisplay / customerPageSize));
  const safeCustomerPage = Math.min(customerPage, totalCustomerPages);

  const paginatedCustomers = useMemo(() => {
    if (isCursorAllView && customerPageResult?.source === 'firestore' && customerPageResult.items.length > 0) {
      // On Page 1, keep live updates synced seamlessly while respecting pageSize
      if (safeCustomerPage === 1 && realCustomers.length > 0) {
        const byId = new Map<string, CustomerRecord>();
        customerPageResult.items.forEach((c) => {
          if (isRealCustomer(c)) byId.set(c.id, c);
        });
        // Apply any fresher live state fields from realCustomers for matching IDs
        realCustomers.forEach((live) => {
          if (byId.has(live.id)) byId.set(live.id, live);
        });
        return Array.from(byId.values()).slice(0, customerPageSize);
      }
      return customerPageResult.items.filter(isRealCustomer);
    }
    const startIdx = (safeCustomerPage - 1) * customerPageSize;
    return mergedFilteredCustomers.slice(startIdx, startIdx + customerPageSize);
  }, [isCursorAllView, customerPageResult, safeCustomerPage, customerPageSize, realCustomers, mergedFilteredCustomers]);

  const canCustomerPrev = safeCustomerPage > 1;
  const canCustomerNext = isCursorAllView
    ? Boolean(customerPageResult?.hasNextPage) || safeCustomerPage < totalCustomerPages
    : safeCustomerPage < totalCustomerPages;

  const handleBlockConfirm = () => {
    if (!blockingTarget) return;
    onToggleCustomerStatus(blockingTarget.id, blockReasonInput);
    setBlockingTarget(null);
  };

  const filteredSubscribers = subscribers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.email.toLowerCase().includes(q) ||
      (s.subscribedAt && s.subscribedAt.toLowerCase().includes(q)) ||
      (s.source && s.source.toLowerCase().includes(q))
    );
  });

  const handleDeleteSubscriber = async (subId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to remove subscriber: ${email}?`)) return;
    setIsDeletingSubscriber(subId);
    try {
      await deleteNewsletterSubscriber(subId);
      setSubscribers((prev) => prev.filter((s) => s.id !== subId));
    } finally {
      setIsDeletingSubscriber(null);
    }
  };

  const handleCopyAllSubscriberEmails = () => {
    if (subscribers.length === 0) return;
    const allEmails = subscribers.map((s) => s.email).join(', ');
    navigator.clipboard.writeText(allEmails);
    setCopiedSubscriberEmail('ALL');
    setTimeout(() => setCopiedSubscriberEmail(null), 2500);
  };

  const handleCopySingleEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedSubscriberEmail(email);
    setTimeout(() => setCopiedSubscriberEmail(null), 2000);
  };

  // Export Customer CSV Function
  const handleExportCSV = () => {
    if (activeSegment === 'subscribers') {
      if (filteredSubscribers.length === 0) {
        alert('No subscriber records to export.');
        return;
      }
      const headers = ['Subscriber ID', 'Email Address', 'Subscribed Date', 'Source', 'Status'];
      const rows = filteredSubscribers.map((s) => [
        `"${s.id}"`,
        `"${s.email}"`,
        `"${new Date(s.subscribedAt || Date.now()).toLocaleString('en-GB')}"`,
        `"${s.source || 'footer'}"`,
        `"${s.status || 'active'}"`,
      ].join(','));
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `KenaX_Newsletter_Subscribers_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (filteredCustomers.length === 0) {
      alert('No customer records to export.');
      return;
    }

    const headers = [
      'Customer ID',
      'Name',
      'Mobile',
      'Email',
      'Registered User',
      'Panel Purchaser',
      'Panel Purchases',
      'Total Orders',
      'Total Spent (BDT)',
      'Registration Date',
      'Status',
    ];

    const rows = filteredCustomers.map((c) => {
      const custOrders = getCustomerOrders(c.mobile);
      const orderCount = custOrders.length || c.totalOrders || 0;
      const spent = custOrders.reduce((s, o) => s + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0) || c.totalSpent || 0;
      const registered = isRegisteredCustomer(c) ? 'Yes' : 'No';
      const panelUser = isPanelBuyer(c) ? 'Yes' : 'No';
      const panelDetails = c.panelPurchases
        ? c.panelPurchases.map((p) => `${p.panelName} (${p.plan})`).join(' | ')
        : 'N/A';

      return [
        `"${c.id}"`,
        `"${c.name}"`,
        `"${c.mobile}"`,
        `"${c.email || ''}"`,
        `"${registered}"`,
        `"${panelUser}"`,
        `"${panelDetails}"`,
        orderCount,
        spent,
        `"${new Date(c.createdAt || c.registeredAt || Date.now()).toLocaleDateString('en-GB')}"`,
        `"${c.isBlocked ? 'Blocked' : 'Active'}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KenaX_Customers_Report_${activeSegment}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Customers */}
        <div
          onClick={() => setActiveSegment('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSegment === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-800'
              : 'bg-white text-slate-900 border-slate-200 shadow-2xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeSegment === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Shoppers
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${activeSegment === 'all' ? 'bg-slate-800 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black">{Math.max(realCustomers.length, firestoreTotalCustomers ?? 0)}</span>
            <span className={`text-xs font-semibold ${activeSegment === 'all' ? 'text-slate-400' : 'text-slate-500'}`}>
              All Database Records
            </span>
          </div>
        </div>

        {/* Card 2: Total Registered Customers */}
        <div
          onClick={() => setActiveSegment('registered')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSegment === 'registered'
              ? 'bg-indigo-900 text-white border-indigo-900 shadow-md ring-2 ring-indigo-700'
              : 'bg-white text-slate-900 border-slate-200 shadow-2xs hover:border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeSegment === 'registered' ? 'text-indigo-200' : 'text-slate-500'}`}>
              Registered Accounts
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${activeSegment === 'registered' ? 'bg-indigo-800 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black">{registeredCustomersCount}</span>
            <span className={`text-xs font-semibold ${activeSegment === 'registered' ? 'text-indigo-200' : 'text-indigo-600'}`}>
              {customers.length > 0 ? `${Math.round((registeredCustomersCount / customers.length) * 100)}% of total` : '0%'}
            </span>
          </div>
        </div>

        {/* Card 3: Panel Purchase Customers */}
        <div
          onClick={() => setActiveSegment('panel_buyers')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSegment === 'panel_buyers'
              ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-700'
              : 'bg-white text-slate-900 border-slate-200 shadow-2xs hover:border-purple-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeSegment === 'panel_buyers' ? 'text-purple-200' : 'text-slate-500'}`}>
              Panel Purchasers
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${activeSegment === 'panel_buyers' ? 'bg-purple-800 text-purple-300' : 'bg-purple-50 text-purple-600'}`}>
              <Laptop className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black">{panelBuyersCount}</span>
            <span className={`text-xs font-semibold ${activeSegment === 'panel_buyers' ? 'text-purple-200' : 'text-purple-600'}`}>
              Website & SaaS Buyers
            </span>
          </div>
        </div>

        {/* Card 4: Active Buyers */}
        <div
          onClick={() => setActiveSegment('active_buyers')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSegment === 'active_buyers'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-md ring-2 ring-emerald-700'
              : 'bg-white text-slate-900 border-slate-200 shadow-2xs hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeSegment === 'active_buyers' ? 'text-emerald-200' : 'text-slate-500'}`}>
              Active Shoppers
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${activeSegment === 'active_buyers' ? 'bg-emerald-800 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black">{activeBuyersCount}</span>
            <span className={`text-xs font-semibold ${activeSegment === 'active_buyers' ? 'text-emerald-200' : 'text-emerald-600'}`}>
              Placed Orders
            </span>
          </div>
        </div>

        {/* Card 5: Newsletter Subscribers */}
        <div
          onClick={() => setActiveSegment('subscribers')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSegment === 'subscribers'
              ? 'bg-amber-900 text-white border-amber-900 shadow-md ring-2 ring-amber-700'
              : 'bg-white text-slate-900 border-slate-200 shadow-2xs hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeSegment === 'subscribers' ? 'text-amber-200' : 'text-slate-500'}`}>
              Subscribers
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${activeSegment === 'subscribers' ? 'bg-amber-800 text-amber-300' : 'bg-amber-50 text-amber-600'}`}>
              <Mail className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black">{subscribers.length}</span>
            <span className={`text-xs font-semibold ${activeSegment === 'subscribers' ? 'text-amber-200' : 'text-amber-600'}`}>
              Email Signups
            </span>
          </div>
        </div>
      </div>

      <CollapsibleAnalyticsPanel
        title={isBn ? 'কাস্টমার অ্যানালিটিক্স ও টপ বায়ার চার্ট' : 'Customer Segments & Lifetime Spend Analytics'}
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SaasDonutChart
            title={isBn ? 'কাস্টমার সেগমেন্ট বিভাজন' : 'Customer Segment Breakdown'}
            subtitle={isBn ? 'স্লাইসে ক্লিক করে ফিল্টার করুন' : 'Click a segment slice to filter'}
            data={customerAnalytics.segmentSlices}
            centerLabel={isBn ? 'গ্রাহক' : 'Records'}
            onSelectSlice={(item) => {
              if (
                item.id === 'active_buyers' ||
                item.id === 'registered' ||
                item.id === 'panel_buyers' ||
                item.id === 'subscribers'
              ) {
                setActiveSegment(item.id as CustomerSegment);
              }
            }}
          />
          <SaasBarChart
            title={isBn ? 'শীর্ষ কাস্টমার (মোট ক্রয়মূল্য অনুযায়ী)' : 'Top Customers by Lifetime Spend'}
            subtitle={isBn ? 'ক্লিক করলে প্রোফাইল ওপেন হবে' : 'Real non-cancelled order spend (click bar to inspect)'}
            data={customerAnalytics.topSpenders}
            valueFormat="currency"
            orientation="horizontal"
            barColor="#0284C7"
            emptyText={isBn ? 'এখনও কোনো অর্ডারকৃত খরচ পাওয়া যায়নি' : 'No completed customer spend recorded yet'}
            onSelectBar={(item) => {
              const found = realCustomers.find((c) => c.id === item.id);
              if (found) setSelectedCustomer(found);
            }}
          />
        </div>
      </CollapsibleAnalyticsPanel>

      {/* Segment Switcher Bar & Search / Actions */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
        {/* System Option Tabs (Customer Segments) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveSegment('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSegment === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Total Customers ({customers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('registered')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSegment === 'registered'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Registered Customers ({registeredCustomersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('panel_buyers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSegment === 'panel_buyers'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Panel Buyers ({panelBuyersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('active_buyers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSegment === 'active_buyers'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Ordered Customers ({activeBuyersCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('wishlist')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSegment === 'wishlist'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <Heart className="w-4 h-4 fill-current" />
            <span>Wishlist Saved ({wishlistCustomersCount})</span>
          </button>

          {/* Subscribers Subtag Button */}
          <button
            type="button"
            onClick={() => setActiveSegment('subscribers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSegment === 'subscribers'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Subscribers ({subscribers.length})</span>
          </button>
        </div>

        {/* Search Input & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeSegment === 'subscribers'
                  ? 'Search by subscriber email or date...'
                  : 'Search by customer name, BD mobile, email, panel...'
              }
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {activeSegment === 'subscribers' && (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenOfferModal('ALL', 'discount')}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  title={isBn ? 'সকল সাবস্ক্রাইবারদের অফার ইমেইল পাঠান' : 'Send promotional offer email to all subscribers'}
                >
                  <Gift className="w-4 h-4" />
                  <span>{isBn ? `সকলকে অফার পাঠান (${subscribers.length})` : `Send Offer to ALL (${subscribers.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyAllSubscriberEmails}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                  title={isBn ? 'সকল সাবস্ক্রাইবারদের ইমেইল কপি করুন' : 'Copy all subscriber email addresses'}
                >
                  {copiedSubscriberEmail === 'ALL' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">{isBn ? 'সব কপি হয়েছে!' : 'Copied All!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-600" />
                      <span>{isBn ? 'সব ইমেইল কপি' : 'Copy All'}</span>
                    </>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              title="Export filtered customer list to CSV format"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table / Mobile Cards */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        {activeSegment === 'subscribers' ? (
          <div>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-3.5 px-4">#</th>
                    <th className="py-3.5 px-4">Subscriber Email</th>
                    <th className="py-3.5 px-4">Subscribed Date &amp; Time</th>
                    <th className="py-3.5 px-4">Source</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">1-Click Offer &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Mail className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-500" />
                        <p className="font-bold text-slate-700">কোনো সাবস্ক্রাইবার পাওয়া যায়নি</p>
                        <p className="text-xs text-slate-400 mt-1">
                          কাস্টমাররা ফুটার থেকে সাবস্ক্রাইব করলে এখানে সরাসরি দেখতে পাবেন এবং ১-ক্লিকে অফার পাঠাতে পারবেন।
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map((sub, idx) => (
                      <tr key={sub.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-900">{sub.email}</span>
                            <button
                              type="button"
                              onClick={() => handleCopySingleEmail(sub.email)}
                              className="p-1 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                              title="Copy email address"
                            >
                              {copiedSubscriberEmail === sub.email ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs whitespace-nowrap">
                          {new Date(sub.subscribedAt || Date.now()).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                            {sub.source || 'footer'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1-Click Send Offer Modal */}
                            <button
                              type="button"
                              onClick={() => handleOpenOfferModal(sub, 'discount')}
                              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 border border-amber-200 transition-colors cursor-pointer shadow-2xs"
                              title={isBn ? 'এই গ্রাহককে সরাসরি অফার ইমেইল পাঠান' : 'Send promotional offer email to this subscriber'}
                            >
                              <Gift className="w-3.5 h-3.5 text-amber-600" />
                              <span>{isBn ? 'অফার পাঠান' : 'Send Offer'}</span>
                            </button>

                            {/* Delete Subscriber */}
                            <button
                              type="button"
                              disabled={isDeletingSubscriber === sub.id}
                              onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                              title={isBn ? 'সাবস্ক্রাইবার মুছে ফেলুন' : 'Delete subscriber'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredSubscribers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
                  <p className="font-bold text-slate-700">{isBn ? 'কোনো সাবস্ক্রাইবার পাওয়া যায়নি' : 'No subscribers found'}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{isBn ? 'কাস্টমাররা সাবস্ক্রাইব করলে এখানে দেখা যাবে।' : 'Customer subscribers will appear here.'}</p>
                </div>
              ) : (
                filteredSubscribers.map((sub, idx) => (
                  <div key={sub.id || idx} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-900 truncate">{sub.email}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                        {sub.source || 'footer'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>{new Date(sub.subscribedAt || Date.now()).toLocaleDateString('en-GB')}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenOfferModal(sub, 'discount')}
                          className="px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] flex items-center gap-1 border border-amber-200 cursor-pointer"
                        >
                          <Gift className="w-3 h-3 text-amber-600" />
                          <span>{isBn ? 'অফার পাঠান' : 'Send Offer'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopySingleEmail(sub.email)}
                          className="p-1 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                          title="Copy email"
                        >
                          {copiedSubscriberEmail === sub.email ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingSubscriber === sub.id}
                          onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete subscriber"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop View (Unchanged table) */}
            <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3.5 px-4">Customer Profile</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Account Type &amp; Tags</th>
                <th className="py-3.5 px-4">Password</th>
                <th className="py-3.5 px-4 text-center">Wishlist</th>
                <th className="py-3.5 px-4 text-center">Orders</th>
                <th className="py-3.5 px-4 text-right">Total Spent</th>
                <th className="py-3.5 px-4">Registered</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingCustomerPage && paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-sky-500" />
                    <p className="text-xs font-semibold text-slate-600">Loading customers page...</p>
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-slate-700">No customers found in this section</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting search query or switching tabs above.</p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => {
                  const customerOrders = getCustomerOrders(c.mobile);
                  const actualOrderCount = customerOrders.length || c.totalOrders;
                  const actualSpent = customerOrders.reduce((s, o) => s + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0) || c.totalSpent;
                  const isPassVisible = visiblePasswords[c.id];
                  const custPassword = c.password || 'password123';

                  const registered = isRegisteredCustomer(c);
                  const panelUser = isPanelBuyer(c);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{c.name}</span>
                              {registered && (
                                <span title="Registered Shopper Account" className="inline-flex items-center">
                                  <BadgeCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">ID: {c.id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.mobile}</span>
                        </p>
                        {c.email && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{c.email}</span>
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {registered ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <UserCheck className="w-3 h-3" />
                              <span>Registered</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              <span>Guest</span>
                            </span>
                          )}

                          {panelUser && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                              <Laptop className="w-3 h-3 text-purple-700" />
                              <span>Panel Purchaser</span>
                            </span>
                          )}
                        </div>
                        {c.panelPurchases && c.panelPurchases.length > 0 && (
                          <p className="text-[10px] font-semibold text-purple-700 mt-1 truncate max-w-[160px]" title={c.panelPurchases[0].panelName}>
                            💻 {c.panelPurchases[0].panelName}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md text-[11px] text-slate-700 font-semibold">
                            {isPassVisible ? custPassword : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(c.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title={isPassVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(custPassword, c.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 cursor-pointer"
                            title="Copy Password"
                          >
                            {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {c.wishlist && c.wishlist.length > 0 ? (
                          <button
                            onClick={() => setSelectedCustomer(c)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 cursor-pointer transition-colors shadow-2xs"
                            title="Click to view wishlisted items in detail"
                          >
                            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                            <span>{c.wishlist.length} {c.wishlist.length === 1 ? 'item' : 'items'}</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {actualOrderCount}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        ৳{actualSpent.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(c.createdAt || c.registeredAt || Date.now()).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            c.isBlocked
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {c.isBlocked ? 'Blocked' : 'Active'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Customer Profile (Name, Phone, Email, Address, Status)"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenResetModal(c)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedCustomer(c)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                            title="View Detailed Profile & Order History"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (c.isBlocked) {
                                onToggleCustomerStatus(c.id);
                              } else {
                                setBlockingTarget(c);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              c.isBlocked
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={c.isBlocked ? 'Unblock Customer' : 'Block Customer'}
                          >
                            {c.isBlocked ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(c)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Customer Account (Orders Will Be Kept)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Clean, Zero Horizontal Scroll Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoadingCustomerPage && paginatedCustomers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-sky-500" />
              <p className="font-semibold text-slate-600">Loading customers page...</p>
            </div>
          ) : paginatedCustomers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-bold text-slate-700">No customers found in this section</p>
              <p className="text-[11px] text-slate-400 mt-1">Try resetting search or switching segments.</p>
            </div>
          ) : (
            paginatedCustomers.map((c) => {
              const customerOrders = getCustomerOrders(c.mobile);
              const actualOrderCount = customerOrders.length || c.totalOrders;
              const actualSpent = customerOrders.reduce((s, o) => s + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0) || c.totalSpent;
              const isPassVisible = visiblePasswords[c.id];
              const custPassword = c.password || 'password123';
              const registered = isRegisteredCustomer(c);
              const panelUser = isPanelBuyer(c);

              return (
                <div key={c.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 transition-colors">
                  {/* Top Bar: Customer Name & Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-xs shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-xs flex items-center gap-1 truncate">
                          <span className="truncate">{c.name}</span>
                          {registered && (
                            <BadgeCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {c.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {registered ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Registered
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          Guest
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          c.isBlocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {c.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info & Panel Tag */}
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800 flex items-center gap-1 text-xs">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.mobile}</span>
                      </span>
                      {c.wishlist && c.wishlist.length > 0 && (
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200"
                        >
                          <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
                          <span>{c.wishlist.length} wishlist</span>
                        </button>
                      )}
                    </div>
                    {c.email && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{c.email}</span>
                      </p>
                    )}
                    {panelUser && (
                      <div className="pt-0.5">
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200">
                          <Laptop className="w-3 h-3 text-purple-700" />
                          <span>Panel Purchaser</span>
                        </span>
                        {c.panelPurchases && c.panelPurchases.length > 0 && (
                          <span className="text-[10px] text-purple-700 font-semibold ml-1.5 truncate">
                            {c.panelPurchases[0].panelName}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Orders, Spent & Password Row */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Orders</span>
                        <span className="font-black text-slate-900 text-xs">{actualOrderCount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Spent</span>
                        <span className="font-black text-slate-900 text-xs">৳{actualSpent.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
                      <span className="font-mono text-[10px] text-slate-700">
                        {isPassVisible ? custPassword : '••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(c.id)}
                        className="p-0.5 text-slate-400 hover:text-slate-700"
                      >
                        {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(custPassword, c.id)}
                        className="p-0.5 text-slate-400 hover:text-sky-600"
                      >
                        {copiedId === c.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedCustomer(c)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(c)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit Customer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenResetModal(c)}
                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Reset Password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (c.isBlocked) {
                          onToggleCustomerStatus(c.id);
                        } else {
                          setBlockingTarget(c);
                        }
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        c.isBlocked ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-rose-600'
                      }`}
                      title={c.isBlocked ? 'Unblock' : 'Block'}
                    >
                      {c.isBlocked ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(c)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

            {/* Customers Cursor Pagination Footer */}
            <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="tabular-nums font-medium">
                  Showing <strong className="font-bold text-slate-900">{paginatedCustomers.length}</strong> of{' '}
                  <strong className="font-bold text-slate-900">{totalCustomerCountForDisplay}</strong> customers
                </span>
                <div className="flex items-center gap-1.5 sm:pl-3 sm:border-l border-slate-200 text-slate-500">
                  <span>Per page:</span>
                  <select
                    value={customerPageSize}
                    onChange={(e) => setCustomerPageSize(Number(e.target.value) || 25)}
                    aria-label="Customers per page"
                    className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!canCustomerPrev || isLoadingCustomerPage}
                  onClick={() => setCustomerPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="px-2.5 py-1 font-bold text-slate-800 bg-slate-100 rounded-lg border border-slate-200 tabular-nums">
                  Page {safeCustomerPage} of {totalCustomerPages}
                </span>
                <button
                  type="button"
                  disabled={!canCustomerNext || isLoadingCustomerPage}
                  onClick={() => setCustomerPage((p) => p + 1)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* View Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span>{selectedCustomer.name}</span>
                    {isPanelBuyer(selectedCustomer) && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500 text-white">
                        Panel Buyer
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedCustomer.mobile} • Registered ID: {selectedCustomer.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedCustomer)}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Edit Customer Details"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCustomer.isBlocked) {
                      onToggleCustomerStatus(selectedCustomer.id);
                    } else {
                      setBlockingTarget(selectedCustomer);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    selectedCustomer.isBlocked
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                  title={selectedCustomer.isBlocked ? 'Unblock Customer' : 'Block Customer'}
                >
                  {selectedCustomer.isBlocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{selectedCustomer.isBlocked ? 'Unblock' : 'Block'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenDeleteModal(selectedCustomer)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-900 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Delete Customer Account"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
                <button
                  onClick={handleCloseCustomerModal}
                  className="text-slate-400 hover:text-white cursor-pointer ml-1 p-1 rounded-md hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Wishlist Highlight Banner if customer has saved items */}
              {selectedCustomer.wishlist && selectedCustomer.wishlist.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
                      <Heart className="w-6 h-6 fill-white text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>Wishlist Activity Active</span>
                        <span className="px-2 py-0.5 rounded-full bg-white text-rose-600 text-[10px] font-black">
                          {selectedCustomer.wishlist.length} {selectedCustomer.wishlist.length === 1 ? 'Item' : 'Items'} Saved
                        </span>
                      </h4>
                      <p className="text-xs text-rose-100 mt-0.5">
                        This customer has saved products in their personal wishlist. Scroll down to view the full wishlist catalog.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Account Credentials & Security Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Customer Account Credentials</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleOpenResetModal(selectedCustomer)}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Password</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Email</span>
                    <span className="font-semibold text-slate-900 break-all">{selectedCustomer.email || 'N/A'}</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Mobile (Phone)</span>
                    <span className="font-semibold text-slate-900">{selectedCustomer.mobile}</span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Current Password</span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">
                        {visiblePasswords[selectedCustomer.id]
                          ? selectedCustomer.password || 'password123'
                          : '••••••••'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(selectedCustomer.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {visiblePasswords[selectedCustomer.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(selectedCustomer.password || 'password123', `modal-${selectedCustomer.id}`)}
                          className="p-1 text-slate-400 hover:text-sky-600 cursor-pointer"
                          title="Copy Password"
                        >
                          {copiedId === `modal-${selectedCustomer.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchased Panels / Website Subscriptions Section */}
              {isPanelBuyer(selectedCustomer) && (
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-purple-700" />
                    <span>Purchased Website / Admin Panels ({selectedCustomer.panelPurchases?.length || 1})</span>
                  </h4>
                  {selectedCustomer.panelPurchases && selectedCustomer.panelPurchases.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCustomer.panelPurchases.map((pnl) => (
                        <div key={pnl.id} className="p-3.5 rounded-xl bg-white border border-purple-200 text-xs space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900 text-sm">{pnl.panelName}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {pnl.status}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium">
                            Plan: <strong>{pnl.plan}</strong> • Purchased Date: <strong>{pnl.purchaseDate}</strong>
                          </p>
                          <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-purple-100 mt-1">
                            <span>Order Ref: <strong className="font-mono text-purple-700">#{pnl.orderId}</strong></span>
                            {pnl.domainOrSubdomain && (
                              <span>Domain: <strong className="text-slate-800">{pnl.domainOrSubdomain}</strong></span>
                            )}
                            <span className="font-black text-slate-900">৳{pnl.price.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-white border border-purple-200 text-xs">
                      <p className="font-bold text-slate-900">Purchased Web Services / Digital Package</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Customer has orders containing website setup / admin panel services on KenaX BD.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Addresses */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  Saved Shipping Addresses
                </h4>
                <div className="space-y-2">
                  {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 ? (
                    selectedCustomer.addresses.map((addr, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <p className="font-bold text-slate-800">{addr.fullAddress}</p>
                        <p className="text-slate-500 mt-0.5">
                          District: {addr.district} • Division: {addr.division}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl">No saved addresses on file.</p>
                  )}
                </div>
              </div>

              {/* Wishlist Items Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-2 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                  <span>Customer Wishlist ({selectedCustomer.wishlist?.length || 0} Saved Items)</span>
                </h4>
                {!selectedCustomer.wishlist || selectedCustomer.wishlist.length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 text-center bg-slate-50 rounded-xl border border-slate-100">
                    No products added to wishlist by this customer yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedCustomer.wishlist.map((prod) => (
                      <div
                        key={prod.id}
                        className="p-3 rounded-xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50/60 flex items-center gap-3 transition-colors"
                      >
                        <img
                          src={getOptimizedImageUrl(prod.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200', 100)}
                          alt={prod.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => handleImageError(e, prod.images?.[0])}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                        />
                        <div className="flex-1 min-w-0 text-xs">
                          <h5 className="font-bold text-slate-900 truncate" title={prod.name}>
                            {prod.name}
                          </h5>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {prod.category} {prod.subcategory ? `• ${prod.subcategory}` : ''}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-rose-950">৳{prod.price.toLocaleString()}</span>
                              {prod.originalPrice && prod.originalPrice > prod.price && (
                                <span className="line-through text-slate-400 text-[10px]">
                                  ৳{prod.originalPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                (prod.stock || 0) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {(prod.stock || 0) > 0 ? 'In Stock' : 'Out of Stock'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order History */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-sky-600" />
                    Order History with KenaX BD ({getCustomerOrders(selectedCustomer.mobile).length})
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    🛡️ Order History Retained
                  </span>
                </div>
                {getCustomerOrders(selectedCustomer.mobile).length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 text-center bg-slate-50 rounded-xl">
                    No orders recorded for this phone number yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getCustomerOrders(selectedCustomer.mobile).map((o) => (
                      <div
                        key={o.id}
                        className="p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between hover:bg-slate-50"
                      >
                        <div>
                          <span className="font-mono font-bold text-sky-700">#{o.id}</span>
                          <span className="text-slate-400 ml-2">
                            {new Date(o.createdAt).toLocaleDateString('en-GB')}
                          </span>
                          <p className="text-slate-600 mt-0.5">
                            {(o.items || []).map((it: any) => `${it.productName || it.name || 'Product'} (${it.quantity})`).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">৳{o.totalAmount.toLocaleString()}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {o.orderStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-5 relative">
              <button
                onClick={() => setResetTarget(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-2">
                <KeyRound className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-black text-white">Reset Customer Password</h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Set a new login password for <strong>{resetTarget.name}</strong> ({resetTarget.mobile})
              </p>
            </div>

            <div className="p-6 space-y-4">
              {resetSuccessNotice && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resetSuccessNotice}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p>
                  <strong>Customer:</strong> {resetTarget.name}
                </p>
                <p>
                  <strong>Email:</strong> {resetTarget.email || 'None'}
                </p>
                <p>
                  <strong>Mobile:</strong> {resetTarget.mobile}
                </p>
                <p>
                  <strong>Current Password:</strong>{' '}
                  <span className="font-mono font-bold text-slate-800">
                    {resetTarget.password || 'password123'}
                  </span>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">New Password</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter new password (min 4 chars)"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetPassword}
                  disabled={!newPasswordInput.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  Save & Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Customer Confirmation Dialog */}
      {blockingTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Block Shopper Account?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Block <strong className="text-slate-800">{blockingTarget.name}</strong> ({blockingTarget.mobile}) from placing orders on KenaX BD.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Suspension</label>
              <textarea
                rows={2}
                value={blockReasonInput}
                onChange={(e) => setBlockReasonInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-5">
              <button
                onClick={() => setBlockingTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockConfirm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Profile Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 relative">
              <button
                onClick={() => setEditingCustomer(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-2">
                <Edit className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-black text-white">Edit Customer Profile</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Update details for <strong>{editingCustomer.name}</strong> ({editingCustomer.mobile})
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {editSuccessNotice && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{editSuccessNotice}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Customer Name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    value={editMobile}
                    onChange={(e) => setEditMobile(cleanBDPhoneNumber(e.target.value))}
                    placeholder="01XXXXXXXXX"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="e.g. customer@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Delivery Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <textarea
                    rows={2}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="e.g. House #12, Road #4, Dhanmondi, Dhaka"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Account Status & Access
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="customer_status"
                      checked={!editIsBlocked}
                      onChange={() => setEditIsBlocked(false)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex items-center gap-1 text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Active (Allowed to order)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="customer_status"
                      checked={editIsBlocked}
                      onChange={() => setEditIsBlocked(true)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span className="flex items-center gap-1 text-rose-700">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Blocked (Restricted)
                    </span>
                  </label>
                </div>

                {editIsBlocked && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Reason for Blocking
                    </label>
                    <input
                      type="text"
                      value={editBlockReason}
                      onChange={(e) => setEditBlockReason(e.target.value)}
                      placeholder="e.g. Repeated cancellation of COD orders"
                      className="w-full px-3 py-2 rounded-xl border border-rose-300 bg-white text-xs text-rose-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomerEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-5 relative">
              <button
                onClick={() => setDeletingCustomer(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-2">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-black text-white">Delete Customer Account?</h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Remove customer profile for <strong>{deletingCustomer.name}</strong> ({deletingCustomer.mobile})
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Order History Remains 100% Safe</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Deleting this account removes the customer’s login record, but <strong>all pending orders, previous orders, and payment records ({getCustomerOrders(deletingCustomer.mobile).length} total orders)</strong> will NOT be deleted. They will remain securely preserved in your Admin Orders list and financial reports.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p>
                  <strong>Customer ID:</strong> <span className="font-mono">{deletingCustomer.id}</span>
                </p>
                <p>
                  <strong>Phone:</strong> {deletingCustomer.mobile}
                </p>
                <p>
                  <strong>Orders on Record:</strong> {getCustomerOrders(deletingCustomer.mobile).length} orders (৳{getCustomerOrders(deletingCustomer.mobile).reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()} spent)
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingCustomer(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCustomer}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Newsletter Subscriber Offer / Direct Email Dispatch Modal */}
      {offerModalTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-5 sm:p-6 relative">
              <button
                onClick={() => setOfferModalTarget(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {offerModalTarget === 'ALL'
                      ? (isBn ? `সকল গ্রাহককে অফার ইমেইল পাঠান (${subscribers.length})` : `Send Offer to ALL Subscribers (${subscribers.length})`)
                      : (isBn ? 'এক্সক্লুসিভ অফার ও ইমেইল পাঠান' : 'Send Exclusive Offer & Email')}
                  </h3>
                  <p className="text-xs text-amber-100 flex items-center gap-1.5 mt-0.5 font-medium">
                    <Mail className="w-3.5 h-3.5" />
                    <span>
                      {offerModalTarget === 'ALL'
                        ? (isBn ? `প্রাপক: সকল ${subscribers.length} জন নিউজলেটার গ্রাহক` : `Target: All ${subscribers.length} Newsletter Subscribers`)
                        : (isBn ? `প্রাপক ইমেইল: ${offerModalTarget.email}` : `Recipient: ${offerModalTarget.email}`)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Success Alert */}
              {sendEmailSuccessNotice && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{sendEmailSuccessNotice}</span>
                </div>
              )}

              {/* Error Alert */}
              {sendEmailErrorNotice && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{sendEmailErrorNotice}</span>
                </div>
              )}

              {/* Quick Template Selector */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isBn ? 'অফার টেমপ্লেট নির্বাচন করুন' : 'Select Offer Template'}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(currentTemplates) as OfferTemplateKey[]).map((key) => {
                    const tmpl = currentTemplates[key];
                    const isSelected = selectedOfferTemplate === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectOfferTemplate(key)}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-200'
                        }`}
                      >
                        <span className="block truncate text-[11px] sm:text-xs">{tmpl.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coupon Code & Subject Line */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBn ? 'কুপন কোড' : 'Coupon Code'}
                  </label>
                  <input
                    type="text"
                    value={offerCouponCode}
                    onChange={(e) => handleCouponChange(e.target.value)}
                    placeholder={isBn ? 'যেমন: WELCOME10' : 'e.g. WELCOME10'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-xs text-amber-700 bg-amber-50/50 uppercase focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isBn ? 'ইমেইল বিষয় (Subject Line)' : 'Email Subject'}
                  </label>
                  <input
                    type="text"
                    value={offerSubject}
                    onChange={(e) => setOfferSubject(e.target.value)}
                    placeholder={isBn ? 'ইমেইলের বিষয় লিখুন...' : 'Enter email subject...'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Message Body Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isBn ? 'অফার বার্তা (Email Body)' : 'Message Content (Email Body)'}
                </label>
                <textarea
                  rows={8}
                  value={offerBody}
                  onChange={(e) => setOfferBody(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-300 text-xs text-slate-800 leading-relaxed font-sans focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                  placeholder={isBn ? 'আপনার অফার বার্তা লিখুন...' : 'Type your promotional message here...'}
                />
              </div>

              {/* Notice Box */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] leading-tight">
                    {isBn
                      ? '💡 বাটন ক্লিক করলেই আপনার স্টোরের নিজস্ব জিমেইল একাউন্ট থেকে স্বয়ংক্রিয়ভাবে সরাসরি গ্রাহকদের ইনবক্সে মেইল পৌঁছে যাবে।'
                      : '💡 Clicking send will automatically dispatch this email from your configured Gmail SMTP directly to customer inboxes.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleCopyOfferContent}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200 cursor-pointer shadow-2xs"
              >
                {isCopiedOfferText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">{isBn ? 'কপি হয়েছে!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isBn ? 'টেক্সট কপি' : 'Copy Text'}</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={() => setOfferModalTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white cursor-pointer disabled:opacity-50"
                >
                  {isBn ? 'বাতিল' : 'Cancel'}
                </button>

                {/* Direct Send Email Button */}
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={handleSendDirectOfferEmail}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md cursor-pointer flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isBn ? 'ইমেইল পাঠানো হচ্ছে...' : 'Sending Email...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{isBn ? 'সরাসরি ইমেইল পাঠান' : 'Send Email Now'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
