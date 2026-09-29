import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Globe,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Eye,
  Edit3,
  Sliders,
  Play,
  Clock,
  ShieldCheck,
  Truck,
  Plus,
  Trash2,
  Save,
  X,
  Layers,
  ShoppingBag,
  Package,
  TrendingUp,
  Share2,
  Palette,
  Check,
  AlertCircle,
  RefreshCw,
  Video,
  Star,
  ChevronRight,
  Monitor,
  Smartphone,
  Tag,
  ArrowRight,
  Flame,
  HelpCircle,
  DollarSign,
  HeartHandshake,
  MessageSquare,
  FileText,
  SlidersHorizontal,
  LayoutGrid,
} from 'lucide-react';
import {
  Product,
  Category,
  UserRole,
  StaffUser,
  LandingPageConfig,
  LandingPageFeature,
  LandingPageReview,
  ColorVariation,
} from '../../types';
import { hasPermission } from '../../lib/permissions';
import { getOptimizedImageUrl } from '../../utils/imageOptimizer';
import { ProductLandingPageView } from '../ProductLandingPageView';
import { ProductVideoPlayer } from '../ProductVideoPlayer';

interface AdminLandingPagesProps {
  products: Product[];
  categories: Category[];
  onUpdateProduct: (product: Product) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
  onPreviewLandingPage?: (product: Product) => void;
}

export const COLOR_THEMES = [
  {
    id: 'emerald',
    name: 'Emerald Luxury (রয়্যাল এমারেল্ড)',
    desc: 'সর্বোচ্চ ট্রাস্ট ও সর্বোচ্চ কনভার্সন রেট',
    bg: 'bg-emerald-600',
    ring: 'ring-emerald-400',
    hex: '#059669',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'indigo',
    name: 'Midnight Indigo (মিডনাইট ইন্ডিগো)',
    desc: 'প্রিমিয়াম ইলেকট্রনিক্স ও টেক গ্যাজেট',
    bg: 'bg-indigo-600',
    ring: 'ring-indigo-400',
    hex: '#4f46e5',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  {
    id: 'sky',
    name: 'Sapphire Azure (রয়্যাল স্যাফায়ার ব্লু)',
    desc: 'মডার্ন, ফ্রেশ ও প্রফেশনাল লুক',
    bg: 'bg-sky-600',
    ring: 'ring-sky-400',
    hex: '#0284c7',
    badge: 'bg-sky-100 text-sky-800',
  },
  {
    id: 'rose',
    name: 'Velvet Ruby (রয়্যাল রুবি রেড)',
    desc: 'হট সেলস, ফ্ল্যাশ ডিল ও ডিসকাউন্ট অফার',
    bg: 'bg-rose-600',
    ring: 'ring-rose-400',
    hex: '#e11d48',
    badge: 'bg-rose-100 text-rose-800',
  },
  {
    id: 'amber',
    name: 'Imperial 24K Gold (গোল্ডেন লাক্সারি)',
    desc: 'লাক্সারি লাইফস্টাইল, প্রিমিয়াম গিফট ও ওয়াচ',
    bg: 'bg-amber-600',
    ring: 'ring-amber-400',
    hex: '#d97706',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'purple',
    name: 'Amethyst Crown (রয়্যাল পার্পল)',
    desc: 'বিউটি, কসমেটিক্স, ফ্যাশন ও ক্লদিং',
    bg: 'bg-purple-600',
    ring: 'ring-purple-400',
    hex: '#9333ea',
    badge: 'bg-purple-100 text-purple-800',
  },
  {
    id: 'slate',
    name: 'Titanium Obsidian (টাইটানিয়াম ব্ল্যাক)',
    desc: 'স্লিক ডার্ক মোড, মিনিমালিস্ট ও হাই-এন্ড লুক',
    bg: 'bg-slate-900',
    ring: 'ring-slate-400',
    hex: '#0f172a',
    badge: 'bg-slate-200 text-slate-900',
  },
];

const DEFAULT_WHY_US = [
  '১০০% অরিজিনাল ও ইনস্পেক্টেড কোয়ালিটি পণ্য',
  'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা (পণ্য দেখে পেমেন্ট)',
  'দ্রুততম সময়ে হোম ডেলিভারি সার্ভিস',
  '৭ দিনের সহজ রিপ্লেসমেন্ট ও রিটার্ন গ্যারান্টি',
  'সার্বক্ষণিক কাস্টমার সাপোর্ট ও আন্তরিক বিক্রয়োত্তর সেবা',
];

const DEFAULT_BADGES = [
  '১০০% ক্যাশ অন ডেলিভারি',
  '৭ দিনের রিপ্লেসমেন্ট',
  'দ্রুত হোম ডেলিভারি',
  'অরিজিনাল কোয়ালিটি',
];

export const AdminLandingPages: React.FC<AdminLandingPagesProps> = ({
  products,
  categories,
  onUpdateProduct,
  currentRole,
  currentStaff,
}) => {
  const staffPermissions = currentStaff?.permissions || [];
  const canManage =
    hasPermission(currentRole, staffPermissions, 'landing_pages.manage') ||
    hasPermission(currentRole, staffPermissions, 'products.manage') ||
    hasPermission(currentRole, staffPermissions, 'products.edit');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'not_set'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Editor Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editorTab, setEditorTab] = useState<
    | 'basic'
    | 'overview'
    | 'theme'
    | 'urgency'
    | 'features'
    | 'why_us'
    | 'reviews'
    | 'order_form'
    | 'similar'
    | 'ad_tracking'
  >('basic');

  const [lpForm, setLpForm] = useState<LandingPageConfig>({
    enabled: true,
    slug: '',
    headline: '',
    subHeadline: '',
    accentColor: 'emerald',
    topBannerText: '🔥 ধামাকা অফার! সীমিত সময়ের জন্য বিশেষ ছাড় চলছে',
    showCountdown: true,
    countdownHours: 24,
    videoUrl: '',
    features: [],
    whyChooseUs: DEFAULT_WHY_US,
    badges: DEFAULT_BADGES,
    customOrderTitle: 'অর্ডার করতে নিচের ফর্মে আপনার নাম, ঠিকানা ও মোবাইল নাম্বার লিখুন',
    customOrderSubtitle: 'পণ্য হাতে পেয়ে দেখে ডেলিভারি ম্যানের কাছে পেমেন্ট করার ১০০% নিশ্চয়তা',
    customButtonText: 'ক্যাশ অন ডেলিভারিতে অর্ডার কনফার্ম করুন',
    showSimilarProducts: true,
    similarSectionTitle: 'সম্পর্কিত অন্যান্য আকর্ষণীয় পণ্যসমূহ',
    similarProductIds: [],
    customReviews: [],
    guaranteeText: 'পণ্য পছন্দ না হলে বা কোনো সমস্যা থাকলে ৭ দিনের ভেতর সহজ রিপ্লেসমেন্ট সুবিধা।',
    deliveryInsideDhakaFee: 70,
    deliveryOutsideDhakaFee: 130,
  });

  // Live Preview Modal State
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.banglaName && p.banglaName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.landingPage?.slug && p.landingPage.slug.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;

      const isConfigured = Boolean(p.landingPage);
      const isActive = Boolean(p.landingPage?.enabled);

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = isActive;
      else if (statusFilter === 'inactive') matchesStatus = isConfigured && !isActive;
      else if (statusFilter === 'not_set') matchesStatus = !isConfigured;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.landingPage?.enabled).length;
    const inactive = products.filter((p) => p.landingPage && !p.landingPage.enabled).length;
    const notSet = total - (active + inactive);
    return { total, active, inactive, notSet };
  }, [products]);

  // Handle Quick Active/Inactive Toggle
  const handleToggleActive = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canManage) {
      showToast('আপনার ল্যান্ডিং পেজ পরিবর্তন করার অনুমতি নেই');
      return;
    }

    const currentLp = product.landingPage;
    let updatedLp: LandingPageConfig;

    if (currentLp) {
      updatedLp = {
        ...currentLp,
        enabled: !currentLp.enabled,
        updatedAt: new Date().toISOString(),
      };
    } else {
      const slug = (product.name || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      updatedLp = {
        enabled: true,
        slug: `offer-${slug}`,
        headline: product.banglaName
          ? `${product.banglaName} - স্পেশাল ধামাকা অফার!`
          : `${product.name} - Special Offer!`,
        subHeadline:
          product.shortDescription ||
          '১০০% অরিজিনাল কোয়ালিটি ও ক্যাশ অন ডেলিভারি সুবিধাসহ আজই অর্ডার করুন।',
        accentColor: 'emerald',
        topBannerText: '🔥 সীমিত সময়ের স্পেশাল অফার! আজই অর্ডার করুন',
        showCountdown: true,
        countdownHours: 24,
        videoUrl: product.videoUrl || '',
        features: (product.keyHighlights || []).map((kh, idx) => ({
          id: `f-${idx}`,
          title: kh.text,
          desc: 'প্রিমিয়াম কোয়ালিটি এবং নির্ভরযোগ্য পারফরম্যান্স।',
          icon: kh.icon || 'check-circle',
        })),
        whyChooseUs: DEFAULT_WHY_US,
        badges: DEFAULT_BADGES,
        customOrderTitle: 'অর্ডার করতে নিচের ফর্মটি সঠিক তথ্য দিয়ে পূরণ করুন',
        customOrderSubtitle: 'পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধের সুযোগ (ক্যাশ অন ডেলিভারি)',
        customButtonText: 'ক্যাশ অন ডেলিভারিতে অর্ডার কনফার্ম করুন',
        showSimilarProducts: true,
        similarSectionTitle: 'সম্পর্কিত অন্যান্য আকর্ষণীয় পণ্যসমূহ',
        similarProductIds: [],
        customReviews: [
          {
            id: 'rev-1',
            name: 'তানভীর আহমেদ',
            location: 'মিরপুর, ঢাকা',
            rating: 5,
            comment: 'পণ্যটি হাতে পেয়ে খুবই সন্তুষ্ট! ছবির সাথে হুবহু মিল আছে এবং ডেলিভারিও খুব দ্রুত পেয়েছি।',
            date: '২ দিন আগে',
          },
          {
            id: 'rev-2',
            name: 'সাদিয়া ইসলাম',
            location: 'চট্টগ্রাম',
            rating: 5,
            comment: 'কোয়ালিটি অসাধারণ, ক্যাশ অন ডেলিভারিতে চেক করে নিতে পেরে নিশ্চিন্ত হলাম। ধন্যবাদ!',
            date: '৪ দিন আগে',
          },
        ],
        guaranteeText: 'পণ্য পছন্দ না হলে বা কোনো সমস্যা থাকলে ৭ দিনের সহজ রিপ্লেসমেন্ট গ্যারান্টি।',
        deliveryInsideDhakaFee: 70,
        deliveryOutsideDhakaFee: 130,
        updatedAt: new Date().toISOString(),
      };
    }

    const updatedProduct = { ...product, landingPage: updatedLp };
    onUpdateProduct(updatedProduct);

    // Maintain permanent active landing page state across refreshes/reloads/offline/online
    if (updatedLp.enabled) {
      localStorage.setItem('kenax_landing_page_active', 'true');
      localStorage.setItem('kenax_active_landing_product_id', product.id);
    } else {
      if (localStorage.getItem('kenax_active_landing_product_id') === product.id) {
        localStorage.removeItem('kenax_landing_page_active');
        localStorage.removeItem('kenax_active_landing_product_id');
      }
    }

    showToast(
      updatedLp.enabled
        ? `"${product.name}" এর ল্যান্ডিং পেজ সফলভাবে সক্রিয় (Active) করা হয়েছে!`
        : `"${product.name}" এর ল্যান্ডিং পেজ নিষ্ক্রিয় (Inactive) করা হয়েছে।`
    );
  };

  // Open Full Editor Modal
  const handleOpenEditor = (product: Product) => {
    setEditingProduct(product);
    setEditorTab('basic');

    const defaultSlug = (product.name || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (product.landingPage) {
      setLpForm({
        ...product.landingPage,
        enabled: product.landingPage.enabled !== false,
        slug: product.landingPage.slug || `offer-${defaultSlug}`,
        headline:
          product.landingPage.headline ||
          (product.banglaName
            ? `${product.banglaName} - স্পেশাল ধামাকা অফার!`
            : `${product.name} - Special Offer!`),
        subHeadline:
          product.landingPage.subHeadline ||
          product.shortDescription ||
          '১০০% অরিজিনাল কোয়ালিটি ও ক্যাশ অন ডেলিভারি সুবিধাসহ আজই অর্ডার করুন।',
        accentColor: product.landingPage.accentColor || 'emerald',
        topBannerText:
          product.landingPage.topBannerText || '🔥 সীমিত সময়ের স্পেশাল অফার! আজই অর্ডার করুন',
        showCountdown: product.landingPage.showCountdown !== false,
        countdownHours: product.landingPage.countdownHours || 24,
        videoUrl: product.landingPage.videoUrl || product.videoUrl || '',
        features:
          product.landingPage.features && product.landingPage.features.length > 0
            ? product.landingPage.features
            : (product.keyHighlights || []).map((kh, idx) => ({
                id: `f-${idx}`,
                title: kh.text,
                desc: 'প্রিমিয়াম কোয়ালিটি এবং দীর্ঘস্থায়ী পারফরম্যান্স।',
                icon: kh.icon || 'check-circle',
              })),
        whyChooseUs: product.landingPage.whyChooseUs || DEFAULT_WHY_US,
        badges: product.landingPage.badges || DEFAULT_BADGES,
        customOrderTitle:
          product.landingPage.customOrderTitle ||
          'অর্ডার করতে নিচের ফর্মে আপনার নাম, ঠিকানা ও মোবাইল নাম্বার লিখুন',
        customOrderSubtitle:
          product.landingPage.customOrderSubtitle ||
          'পণ্য হাতে পেয়ে দেখে ডেলিভারি ম্যানের কাছে পেমেন্ট করার ১০০% নিশ্চয়তা',
        customButtonText:
          product.landingPage.customButtonText || 'ক্যাশ অন ডেলিভারিতে অর্ডার কনফার্ম করুন',
        showSimilarProducts: product.landingPage.showSimilarProducts !== false,
        similarSectionTitle:
          product.landingPage.similarSectionTitle || 'সম্পর্কিত অন্যান্য আকর্ষণীয় পণ্যসমূহ',
        similarProductIds: product.landingPage.similarProductIds || [],
        customReviews:
          product.landingPage.customReviews && product.landingPage.customReviews.length > 0
            ? product.landingPage.customReviews
            : [
                {
                  id: 'rev-1',
                  name: 'তানভীর আহমেদ',
                  location: 'মিরপুর, ঢাকা',
                  rating: 5,
                  comment:
                    'পণ্যটি হাতে পেয়ে খুবই সন্তুষ্ট! ছবির সাথে হুবহু মিল আছে এবং ডেলিভারিও খুব দ্রুত পেয়েছি।',
                  date: '২ দিন আগে',
                },
                {
                  id: 'rev-2',
                  name: 'সাদিয়া ইসলাম',
                  location: 'চট্টগ্রাম',
                  rating: 5,
                  comment:
                    'কোয়ালিটি অসাধারণ, ক্যাশ অন ডেলিভারিতে চেক করে নিতে পেরে নিশ্চিন্ত হলাম। ধন্যবাদ!',
                  date: '৪ দিন আগে',
                },
              ],
        guaranteeText:
          product.landingPage.guaranteeText ||
          'পণ্য পছন্দ না হলে বা কোনো সমস্যা থাকলে ৭ দিনের ভেতর সহজ রিপ্লেসমেন্ট সুবিধা।',
        deliveryInsideDhakaFee: product.landingPage.deliveryInsideDhakaFee ?? 70,
        deliveryOutsideDhakaFee: product.landingPage.deliveryOutsideDhakaFee ?? 130,
        descriptionSectionTitle:
          product.landingPage.descriptionSectionTitle || 'প্রোডাক্টের বিস্তারিত বিবরণ ও গুরুত্বপূর্ণ তথ্য',
        descriptionSectionSubtitle:
          product.landingPage.descriptionSectionSubtitle || 'প্রোডাক্ট পরিচিতি ও ওভারভিউ',
        customDescription:
          product.landingPage.customDescription !== undefined
            ? product.landingPage.customDescription
            : product.description || product.shortDescription || '',
        showProductOverview: product.landingPage.showProductOverview !== false,
      });
    } else {
      setLpForm({
        enabled: true,
        slug: `offer-${defaultSlug}`,
        headline: product.banglaName
          ? `${product.banglaName} - স্পেশাল ধামাকা অফার!`
          : `${product.name} - Special Offer!`,
        subHeadline:
          product.shortDescription ||
          '১০০% অরিজিনাল কোয়ালিটি ও ক্যাশ অন ডেলিভারি সুবিধাসহ আজই অর্ডার করুন।',
        accentColor: 'emerald',
        topBannerText: '🔥 সীমিত সময়ের স্পেশাল অফার! আজই অর্ডার করুন',
        topBadgeText: 'সীমিত সময়ের ধামাকা অফার',
        stockStatusText: 'ইন স্টক (লিমিটেড অফার)',
        priceSectionTitle: 'স্পেশাল অফার মূল্য:',
        savingsBadgeText: 'সাশ্রয়!',
        colorSelectLabel: 'পছন্দের কালার নির্বাচন করুন:',
        variantSelectLabel: 'সাইজ / ভ্যারিয়েন্ট নির্বাচন করুন:',
        countdownTitle: 'স্পেশাল অফারটি শেষ হতে বাকি:',
        countdownSubtitle: 'অফার শেষ হলে পূর্বের মূল্যে ফিরে যাবে',
        descriptionSectionTitle: 'প্রোডাক্টের বিস্তারিত বিবরণ ও গুরুত্বপূর্ণ তথ্য',
        descriptionSectionSubtitle: 'প্রোডাক্ট পরিচিতি ও ওভারভিউ',
        customDescription: product.description || product.shortDescription || '',
        showProductOverview: true,
        videoTitle: 'প্রোডাক্টটির আসল কোয়ালিটি ও আনবক্সিং ভিডিও দেখে নিন',
        videoSubtitle: 'প্রোডাক্ট লাইভ ভিডিও ও আনবক্সিং',
        featuresSectionTitle: 'প্রোডাক্টের বিশেষ ফিচার ও আকর্ষণীয় সুবিধাসমূহ',
        featuresSectionSubtitle: 'কেন এটি আপনার জন্য সেরা?',
        whyUsSectionTitle: 'কেন আমাদের থেকেই অর্ডার করবেন?',
        whyUsSectionSubtitle: 'নিরাপদ অনলাইন শপিং',
        reviewsSectionTitle: 'আমাদের সম্মানিত ক্রেতাদের অভিজ্ঞতা',
        reviewsSectionSubtitle: 'কাস্টমারদের মতামত',
        orderFormBadgeText: '১০০% ক্যাশ অন ডেলিভারি',
        step1Title: '১. প্রডাক্ট ও পরিমাণ নির্ধারণ করুন',
        step2Title: '২. আপনার ডেলিভারি এরিয়া সিলেক্ট করুন',
        step3Title: '৩. আপনার নাম ও ঠিকানা লিখুন',
        insideDhakaLabel: 'ঢাকার ভেতরে',
        outsideDhakaLabel: 'ঢাকার বাইরে',
        nameInputLabel: 'আপনার নাম *',
        nameInputPlaceholder: 'আপনার পুরো নাম লিখুন',
        phoneInputLabel: 'মোবাইল নাম্বার *',
        phoneInputPlaceholder: '০১৭XXXXXXXX (১১ ডিজিটের মোবাইল নাম্বার)',
        addressInputLabel: 'সম্পূর্ণ ডেলিভারি ঠিকানা *',
        addressInputPlaceholder: 'বাসা/রোড নাম্বার, গ্রাম/মহল্লা, থানা ও জেলার নাম লিখুন...',
        noteInputLabel: 'অতিরিক্ত কোনো নির্দেশনা (ঐচ্ছিক)',
        noteInputPlaceholder: 'ডেলিভারি সংক্রান্ত কোনো বিশেষ নির্দেশনা থাকলে লিখুন...',
        orderSecurityNotice: '🔒 আপনার সকল তথ্য ১০০% সুরক্ষিত এবং পণ্য হাতে পাওয়ার পর মূল্য পরিশোধ করতে পারবেন।',
        orderSuccessTitle: 'আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!',
        orderSuccessSubtitle: 'আমাদের প্রতিনিধি শীঘ্রই আপনার সাথে ফোনে যোগাযোগ করে অর্ডার কনফার্ম করবেন এবং দ্রুত পার্সেল পাঠানো হবে।',
        stickyBarButtonText: 'অর্ডার করুন',
        stickyBarSubtext: 'অফার মূল্য',
        similarSectionSubtitle: 'সম্পর্কিত পণ্যসমূহ',
        showCountdown: true,
        countdownHours: 24,
        videoUrl: product.videoUrl || '',
        features: (product.keyHighlights || []).map((kh, idx) => ({
          id: `f-${idx}`,
          title: kh.text,
          desc: 'প্রিমিয়াম কোয়ালিটি এবং নির্ভরযোগ্য পারফরম্যান্স।',
          icon: kh.icon || 'check-circle',
        })),
        whyChooseUs: DEFAULT_WHY_US,
        badges: DEFAULT_BADGES,
        showFeatures: true,
        customOrderTitle: 'অর্ডার করতে নিচের ফর্মে আপনার নাম, ঠিকানা ও মোবাইল নাম্বার লিখুন',
        customOrderSubtitle:
          'পণ্য হাতে পেয়ে দেখে ডেলিভারি ম্যানের কাছে পেমেন্ট করার ১০০% নিশ্চয়তা',
        customButtonText: 'অর্ডার কনফার্ম করুন',
        showSimilarProducts: true,
        similarSectionTitle: 'সম্পর্কিত অন্যান্য আকর্ষণীয় পণ্যসমূহ',
        similarProductIds: [],
        customReviews: [
          {
            id: 'rev-1',
            name: 'তানভীর আহমেদ',
            location: 'মিরপুর, ঢাকা',
            rating: 5,
            comment:
              'পণ্যটি হাতে পেয়ে খুবই সন্তুষ্ট! ছবির সাথে হুবহু মিল আছে এবং ডেলিভারিও খুব দ্রুত পেয়েছি।',
            date: '২ দিন আগে',
          },
          {
            id: 'rev-2',
            name: 'সাদিয়া ইসলাম',
            location: 'চট্টগ্রাম',
            rating: 5,
            comment:
              'কোয়ালিটি অসাধারণ, ক্যাশ অন ডেলিভারিতে চেক করে নিতে পেরে নিশ্চিন্ত হলাম। ধন্যবাদ!',
            date: '৪ দিন আগে',
          },
        ],
        guaranteeText:
          'পণ্য পছন্দ না হলে বা কোনো সমস্যা থাকলে ৭ দিনের ভেতর সহজ রিপ্লেসমেন্ট সুবিধা।',
        deliveryInsideDhakaFee: 70,
        deliveryOutsideDhakaFee: 130,
      });
    }
  };

  // Save Landing Page Configuration
  const handleSaveLpConfig = () => {
    if (!editingProduct) return;
    if (!canManage) {
      showToast('আপনার ল্যান্ডিং পেজ সেভ করার অনুমতি নেই');
      return;
    }

    const cleanSlug = (lpForm.slug || editingProduct.id)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '-');

    const updatedConfig: LandingPageConfig = {
      ...lpForm,
      slug: cleanSlug,
      updatedAt: new Date().toISOString(),
    };

    const updatedProduct = {
      ...editingProduct,
      landingPage: updatedConfig,
    };

    onUpdateProduct(updatedProduct);

    // Maintain permanent active landing page state across refreshes/reloads/offline/online
    if (updatedConfig.enabled) {
      localStorage.setItem('kenax_landing_page_active', 'true');
      localStorage.setItem('kenax_active_landing_product_id', editingProduct.id);
    } else {
      if (localStorage.getItem('kenax_active_landing_product_id') === editingProduct.id) {
        localStorage.removeItem('kenax_landing_page_active');
        localStorage.removeItem('kenax_active_landing_product_id');
      }
    }

    setEditingProduct(null);
    showToast(`"${editingProduct.name}" এর ল্যান্ডিং পেজ সফলভাবে সেভ হয়েছে!`);
  };

  // Copy Direct Ad Link
  const handleCopyAdLink = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const slug = product.landingPage?.slug || product.id;
    const baseUrl = window.location.origin + window.location.pathname;
    const directUrl = `${baseUrl}?lp=${encodeURIComponent(slug)}`;

    navigator.clipboard.writeText(directUrl);
    setCopiedUrlId(product.id);
    showToast('ফেসবুক অ্যাডের ডিরেক্ট ল্যান্ডিং লিংক কপি হয়েছে!');
    setTimeout(() => setCopiedUrlId(null), 2500);
  };

  // Feature Items Helpers
  const handleAddFeature = () => {
    const newF: LandingPageFeature = {
      id: `f-${Date.now()}`,
      title: 'নতুন আকর্ষণীয় সুবিধা',
      desc: 'এই প্রোডাক্টের একটি বিশেষ সুবিধা বা ব্যবহারিক গুণাবলী এখানে লিখুন।',
      icon: 'check-circle',
    };
    setLpForm((prev) => ({
      ...prev,
      features: [...(prev.features || []), newF],
    }));
  };

  const handleUpdateFeature = (index: number, field: keyof LandingPageFeature, val: string) => {
    setLpForm((prev) => {
      const updated = [...(prev.features || [])];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: val };
      }
      return { ...prev, features: updated };
    });
  };

  const handleRemoveFeature = (index: number) => {
    setLpForm((prev) => ({
      ...prev,
      features: (prev.features || []).filter((_, idx) => idx !== index),
    }));
  };

  // Review Items Helpers
  const handleAddReview = () => {
    const newR: LandingPageReview = {
      id: `r-${Date.now()}`,
      name: 'নতুন কাস্টমারের নাম',
      location: 'ঢাকা',
      rating: 5,
      comment: 'খুবই ভালো প্রডাক্ট, যেমন ছবিতে দেখেছি ঠিক তেমনই পেয়েছি। অনেক ধন্যবাদ!',
      date: 'সম্প্রতি',
    };
    setLpForm((prev) => ({
      ...prev,
      customReviews: [...(prev.customReviews || []), newR],
    }));
  };

  const handleUpdateReview = (index: number, field: keyof LandingPageReview, val: any) => {
    setLpForm((prev) => {
      const updated = [...(prev.customReviews || [])];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: val };
      }
      return { ...prev, customReviews: updated };
    });
  };

  const handleRemoveReview = (index: number) => {
    setLpForm((prev) => ({
      ...prev,
      customReviews: (prev.customReviews || []).filter((_, idx) => idx !== index),
    }));
  };

  // Why Us Items Helpers
  const handleAddWhyUs = () => {
    setLpForm((prev) => ({
      ...prev,
      whyChooseUs: [...(prev.whyChooseUs || []), 'নতুন সেবা বা সুবিধার বিবরণ'],
    }));
  };

  const handleUpdateWhyUs = (index: number, text: string) => {
    setLpForm((prev) => {
      const updated = [...(prev.whyChooseUs || [])];
      updated[index] = text;
      return { ...prev, whyChooseUs: updated };
    });
  };

  const handleRemoveWhyUs = (index: number) => {
    setLpForm((prev) => ({
      ...prev,
      whyChooseUs: (prev.whyChooseUs || []).filter((_, idx) => idx !== index),
    }));
  };

  const tabsList = [
    { id: 'basic', label: 'হেডলাইন ও স্লাগ', icon: Globe, count: null },
    { id: 'overview', label: 'প্রোডাক্ট বিবরণ ও ওভারভিউ', icon: FileText, count: null },
    { id: 'theme', label: 'থিম কালার ও ব্যানার', icon: Palette, count: null },
    { id: 'urgency', label: 'কাউন্টডাউন ও ডেলিভারি ফি', icon: Clock, count: null },
    { id: 'features', label: 'ফিচার ও সুবিধাসমূহ', icon: CheckCircle2, count: lpForm.features?.length || 0 },
    { id: 'why_us', label: 'কেন আমাদের থেকে কিনবেন?', icon: HeartHandshake, count: lpForm.whyChooseUs?.length || 0 },
    { id: 'reviews', label: 'কাস্টমার রিভিউ', icon: Star, count: lpForm.customReviews?.length || 0 },
    { id: 'order_form', label: 'অর্ডার ফর্ম ও বাটন', icon: ShoppingBag, count: null },
    { id: 'similar', label: 'সিমিলার প্রোডাক্ট সেকশন', icon: Layers, count: null },
    { id: 'ad_tracking', label: 'Facebook Ad Tracking', icon: Share2, count: null },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs sm:text-sm font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Facebook Ads Direct Conversion Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              প্রোডাক্ট ল্যান্ডিং পেজ ম্যানেজার
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              প্রতিটি প্রোডাক্টের জন্য আলাদা আল্ট্রা-হাই কনভার্সন ল্যান্ডিং পেজ তৈরি করুন। ফেসবুক বিজ্ঞাপনে সরাসরি লিংক ব্যবহার করে দ্রুত ১-ক্লিক ক্যাশ অন ডেলিভারি সেল বাড়ান।
            </p>
          </div>

          {/* KPI Mini Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-2xl border border-white/10 text-center">
              <span className="text-xs font-medium text-slate-300">মোট প্রোডাক্ট</span>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5">{stats.total}</p>
            </div>
            <div className="bg-emerald-500/20 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-500/30 text-center">
              <span className="text-xs font-medium text-emerald-300">সক্রিয় পেজ (Active)</span>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{stats.active}</p>
            </div>
            <div className="bg-amber-500/20 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-500/30 text-center">
              <span className="text-xs font-medium text-amber-300">পজ করা (Paused)</span>
              <p className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">{stats.inactive}</p>
            </div>
            <div className="bg-slate-800/80 backdrop-blur-xs p-3.5 rounded-2xl border border-slate-700 text-center">
              <span className="text-xs font-medium text-slate-400">সাধারণ স্টোর</span>
              <p className="text-xl sm:text-2xl font-black text-slate-200 mt-0.5">{stats.notSet}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="প্রোডাক্টের নাম, SKU বা স্লাগ লিখে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-10 pr-4 py-2.5 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
          />
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 lg:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            সবগুলো ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>সক্রিয় ({stats.active})</span>
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              statusFilter === 'inactive'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
            }`}
          >
            পজ করা ({stats.inactive})
          </button>
          <button
            onClick={() => setStatusFilter('not_set')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              statusFilter === 'not_set'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            সাধারণ ({stats.notSet})
          </button>
        </div>

        {/* Category Filter & View Mode */}
        <div className="flex items-center gap-2.5 shrink-0 justify-between lg:justify-end">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">সব ক্যাটাগরি</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                viewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400'
              }`}
              title="Table View"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid / Table */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">কোনো প্রোডাক্ট পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            আপনার ফিল্টার বা সার্চ শব্দের সাথে কোনো প্রোডাক্ট মেলেনি।
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
            className="mt-4 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-200 cursor-pointer"
          >
            সব ফিল্টার ক্লিয়ার করুন
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const hasLp = Boolean(product.landingPage);
            const isActive = Boolean(product.landingPage?.enabled);
            const theme =
              COLOR_THEMES.find((t) => t.id === product.landingPage?.accentColor) || COLOR_THEMES[0];
            const baseUrl = window.location.origin + window.location.pathname;
            const slug = product.landingPage?.slug || product.id;
            const directAdUrl = `${baseUrl}?lp=${encodeURIComponent(slug)}`;

            return (
              <div
                key={product.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                  isActive
                    ? 'border-emerald-300 dark:border-emerald-800 shadow-md ring-1 ring-emerald-200/60 dark:ring-emerald-900/40'
                    : hasLp
                    ? 'border-amber-200 dark:border-amber-800 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Card Top */}
                <div className="p-5 space-y-4">
                  {/* Status Bar & Toggle */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Landing Page Active
                        </span>
                      ) : hasLp ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <XCircle className="w-3.5 h-3.5" />
                          Paused / Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Standard Store View
                        </span>
                      )}
                    </div>

                    {/* Quick On/Off Switch */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleActive(product, e)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isActive ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      title={
                        isActive
                          ? 'ল্যান্ডিং পেজ বন্ধ করতে ক্লিক করুন'
                          : 'ল্যান্ডিং পেজ চালু করতে ক্লিক করুন'
                      }
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Product Details Header */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-18 h-18 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 relative">
                      <img
                        src={getOptimizedImageUrl(product.images?.[0] || '', 120)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {product.discountPercent ? (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black">
                          -{product.discountPercent}%
                        </span>
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {product.category}
                        </span>
                        <span>•</span>
                        <span>SKU: {product.sku || 'N/A'}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug">
                        {product.name}
                      </h3>
                      {product.banglaName && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                          {product.banglaName}
                        </p>
                      )}
                      <div className="flex items-baseline gap-2 mt-1.5">
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          ৳{product.price.toLocaleString()}
                        </span>
                        {product.originalPrice > product.price && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 line-through font-medium">
                            ৳{product.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Landing Page Highlights & Details */}
                  {hasLp && (
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">কালার থিম:</span>
                        <span className="flex items-center gap-1.5 font-bold">
                          <span className={`w-3 h-3 rounded-full ${theme.bg}`} />
                          <span className="text-slate-800 dark:text-slate-200">{theme.name.split(' ')[0]}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">সিমিলার প্রোডাক্ট:</span>
                        <span
                          className={`font-bold ${
                            product.landingPage?.showSimilarProducts !== false
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {product.landingPage?.showSimilarProducts !== false ? '✅ অন (Active)' : '❌ অফ'}
                        </span>
                      </div>
                      {product.landingPage?.videoUrl && (
                        <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 dark:text-indigo-300 font-bold">
                          <Play className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400" />
                          <span>ভিডিও এম্বেড যুক্ত আছে</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Direct Ad URL Generator Box */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                      Facebook Ad Direct Landing URL
                    </label>
                    <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <input
                        type="text"
                        readOnly
                        value={directAdUrl}
                        className="w-full bg-transparent text-[11px] font-mono text-slate-700 dark:text-slate-300 px-2 select-all focus:outline-none"
                      />
                      <button
                        onClick={(e) => handleCopyAdLink(product, e)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-indigo-50 dark:hover:bg-slate-600 hover:text-indigo-600 text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer shrink-0"
                        title="Copy Facebook Ad Link"
                      >
                        {copiedUrlId === product.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setPreviewProduct(product)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>প্রিভিউ</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditor(product)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>কাস্টমাইজ করুন</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="py-3.5 px-4">প্রোডাক্ট</th>
                  <th className="py-3.5 px-4">ক্যাটাগরি</th>
                  <th className="py-3.5 px-4 text-center">স্ট্যাটাস</th>
                  <th className="py-3.5 px-4">কালার থিম</th>
                  <th className="py-3.5 px-4 text-center">সিমিলার প্রোডাক্ট</th>
                  <th className="py-3.5 px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const isActive = Boolean(product.landingPage?.enabled);
                  const theme =
                    COLOR_THEMES.find((t) => t.id === product.landingPage?.accentColor) || COLOR_THEMES[0];
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getOptimizedImageUrl(product.images?.[0] || '', 80)}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 line-clamp-1">{product.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">৳{product.price}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{product.category}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-black cursor-pointer transition-all ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isActive ? '● Active' : '○ Paused'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                          <span className={`w-3 h-3 rounded-full ${theme.bg}`} />
                          <span>{theme.name.split(' ')[0]}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            product.landingPage?.showSimilarProducts !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {product.landingPage?.showSimilarProducts !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setPreviewProduct(product)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                            title="Preview Landing Page"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditor(product)}
                            className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Page</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- EXPANSIVE HIGH-VISIBILITY LANDING PAGE BUILDER MODAL ----------------- */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-6xl w-full h-[95vh] md:h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={getOptimizedImageUrl(editingProduct.images?.[0] || '', 80)}
                  alt=""
                  className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                      Landing Page Customizer
                    </span>
                    <span className="text-xs text-slate-400 font-mono">৳{editingProduct.price}</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-black text-white truncate mt-0.5">
                    {editingProduct.name}
                  </h2>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Active Switch */}
                <button
                  type="button"
                  onClick={() => setLpForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    lpForm.enabled
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      lpForm.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span>{lpForm.enabled ? 'Active (সচল)' : 'Paused (বন্ধ)'}</span>
                </button>

                <button
                  onClick={() => setEditingProduct(null)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile Section Dropdown & Quick Scroll */}
            <div className="md:hidden bg-slate-100 p-2.5 border-b border-slate-200 flex items-center gap-2">
              <label className="text-[11px] font-bold text-slate-600 shrink-0">সেকশন:</label>
              <select
                value={editorTab}
                onChange={(e) => setEditorTab(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {tabsList.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label} {tab.count !== null ? `(${tab.count})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Main Editor Body: Responsive Two-Column Layout on PC, Clean Stacked on Mobile */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Desktop Left Tab Navigation Column */}
              <div className="hidden md:flex flex-col w-64 lg:w-72 bg-slate-50 border-r border-slate-200 p-3 space-y-1 overflow-y-auto shrink-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-2">
                  কাস্টমাইজেশন সেকশন
                </p>
                {tabsList.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = editorTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setEditorTab(tab.id as any)}
                      className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                          : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span className="truncate">{tab.label}</span>
                      </div>
                      {tab.count !== null && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Form Workspace (Full Scrollable Area) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 text-slate-800 bg-white">
                {/* 1. BASIC & SLUG */}
                {editorTab === 'basic' && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-indigo-600" />
                        <span>১. হেডলাইন, ট্যাগ ও ফেসবুক অ্যাড স্লাগ (URL Slug)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        ল্যান্ডিং পেজের শিরোনাম, মূল্য সেকশন এবং ফেসবুক বিজ্ঞাপনের লিংক এখান থেকে কাস্টমাইজ করুন।
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>কাস্টম ল্যান্ডিং পেজ স্লাগ (URL Slug)</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                        <span className="text-xs text-slate-400 font-mono pl-2 truncate">
                          {window.location.origin}/?lp=
                        </span>
                        <input
                          type="text"
                          value={lpForm.slug || ''}
                          onChange={(e) =>
                            setLpForm((prev) => ({
                              ...prev,
                              slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
                            }))
                          }
                          placeholder="offer-t800-smartwatch"
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        ফেসবুক অ্যাডের ডেস্টিনেশন URL হিসেবে এটি ব্যবহার করবেন।
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          টপ ব্যাজ টেক্সট (Top Urgency Badge)
                        </label>
                        <input
                          type="text"
                          value={lpForm.topBadgeText || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, topBadgeText: e.target.value }))}
                          placeholder="যেমন: সীমিত সময়ের ধামাকা অফার"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          স্টক স্ট্যাটাস টেক্সট (Stock Status)
                        </label>
                        <input
                          type="text"
                          value={lpForm.stockStatusText || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, stockStatusText: e.target.value }))}
                          placeholder="যেমন: ইন স্টক (লিমিটেড অফার)"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800">
                        মূল আকর্ষণীয় হেডলাইন (Hero Catchy Headline)
                      </label>
                      <input
                        type="text"
                        value={lpForm.headline || ''}
                        onChange={(e) => setLpForm((prev) => ({ ...prev, headline: e.target.value }))}
                        placeholder="যেমন: অরিজিনাল T800 Ultra Smartwatch - ধামাকা অফারে ৫০% ছাড়ে কিনুন!"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800">
                        সাব-হেডলাইন বা অফার বর্ণনা (Sub-headline / Value Proposition)
                      </label>
                      <textarea
                        rows={3}
                        value={lpForm.subHeadline || ''}
                        onChange={(e) => setLpForm((prev) => ({ ...prev, subHeadline: e.target.value }))}
                        placeholder="অরিজিনাল কোয়ালিটি, ব্লুটুথ কলিং, হেলথ ট্র্যাকিং এবং ক্যাশ অন ডেলিভারি সুবিধাসহ আজই অর্ডার করুন।"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          প্রাইস সেকশন টাইটেল (Price Header)
                        </label>
                        <input
                          type="text"
                          value={lpForm.priceSectionTitle || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, priceSectionTitle: e.target.value }))}
                          placeholder="যেমন: স্পেশাল অফার মূল্য:"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          সাশ্রয় ব্যাজ টেক্সট (Savings Label)
                        </label>
                        <input
                          type="text"
                          value={lpForm.savingsBadgeText || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, savingsBadgeText: e.target.value }))}
                          placeholder="যেমন: সাশ্রয়!"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          কালার সিলেক্টর টাইটেল
                        </label>
                        <input
                          type="text"
                          value={lpForm.colorSelectLabel || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, colorSelectLabel: e.target.value }))}
                          placeholder="যেমন: পছন্দের কালার নির্বাচন করুন:"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          ভ্যারিয়েন্ট/সাইজ সিলেক্টর টাইটেল
                        </label>
                        <input
                          type="text"
                          value={lpForm.variantSelectLabel || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, variantSelectLabel: e.target.value }))}
                          placeholder="যেমন: সাইজ / ভ্যারিয়েন্ট নির্বাচন করুন:"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* 3-Color Selector Customization */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Palette className="w-4 h-4 text-emerald-600" />
                          <span>ল্যান্ডিং পেজ ৩-কালার সিলেক্টর (যেমন: কালো, সাদা, নেভি ব্লু কালার দিয়ে টি-শার্ট)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setLpForm((prev) => ({
                              ...prev,
                              customColors: [
                                { name: 'কালো', colorName: 'Black', colorCode: '#0f172a', hexCode: '#0f172a' },
                                { name: 'সাদা', colorName: 'White', colorCode: '#f8fafc', hexCode: '#f8fafc' },
                                { name: 'নেভি ব্লু', colorName: 'Navy Blue', colorCode: '#1e3a8a', hexCode: '#1e3a8a' },
                              ],
                            }));
                          }}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>স্ট্যান্ডার্ড ৩টি কালার লোড করুন</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        ল্যান্ডিং পেজে কাস্টমারদের আকর্ষণ করতে ৩টি পছন্দের কালার কার্ড দেখানো হয়। আপনি চাইলে কালার নাম, কোড বা প্রতি কালারের আলাদা ছবি দিতে পারেন।
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {([0, 1, 2] as const).map((idx) => {
                          const defaultThree: ColorVariation[] = [
                            { name: 'কালো', colorName: 'Black', colorCode: '#0f172a', hexCode: '#0f172a', imageUrl: '' },
                            { name: 'সাদা', colorName: 'White', colorCode: '#f8fafc', hexCode: '#f8fafc', imageUrl: '' },
                            { name: 'নেভি ব্লু', colorName: 'Navy Blue', colorCode: '#1e3a8a', hexCode: '#1e3a8a', imageUrl: '' },
                          ];
                          const colorsList: ColorVariation[] =
                            lpForm.customColors && lpForm.customColors.length >= 3
                              ? lpForm.customColors
                              : defaultThree;
                          const cItem: ColorVariation = colorsList[idx] || defaultThree[idx];

                          return (
                            <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-700">কালার #{idx + 1}</span>
                                <input
                                  type="color"
                                  value={cItem.colorCode || defaultThree[idx].colorCode}
                                  onChange={(e) => {
                                    const next = [...colorsList];
                                    next[idx] = { ...cItem, colorCode: e.target.value, hexCode: e.target.value };
                                    setLpForm((prev) => ({ ...prev, customColors: next }));
                                  }}
                                  className="w-6 h-6 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder={`কালার নাম (যেমন: ${defaultThree[idx].name})`}
                                value={cItem.name || ''}
                                onChange={(e) => {
                                  const next = [...colorsList];
                                  next[idx] = { ...cItem, name: e.target.value };
                                  setLpForm((prev) => ({ ...prev, customColors: next }));
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                              <input
                                type="url"
                                placeholder="কালারের ইমেজ লিংক (ঐচ্ছিক)"
                                value={cItem.imageUrl || ''}
                                onChange={(e) => {
                                  const next = [...colorsList];
                                  next[idx] = { ...cItem, imageUrl: e.target.value };
                                  setLpForm((prev) => ({ ...prev, customColors: next }));
                                }}
                                className="w-full px-2 py-1 rounded-lg border border-slate-200 text-[10px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Video Section Customization */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-indigo-600" />
                          <span>প্রোডাক্ট আনবক্সিং / রিভিউ ভিডিও সেটিংস</span>
                        </span>
                        {lpForm.videoUrl && (
                          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ভিডিও যুক্ত আছে
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={lpForm.videoUrl || ''}
                        onChange={(e) => setLpForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                        placeholder="TikTok, YouTube, Shorts, Reels, বা MP4 ভিডিও লিংক দিন..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <input
                          type="text"
                          value={lpForm.videoTitle || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, videoTitle: e.target.value }))}
                          placeholder="ভিডিও টাইটেল (যেমন: আসল কোয়ালিটি ভিডিও দেখে নিন)"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          value={lpForm.videoSubtitle || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, videoSubtitle: e.target.value }))}
                          placeholder="ভিডিও সাব-টাইটেল (যেমন: প্রোডাক্ট লাইভ ভিডিও ও আনবক্সিং)"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Video Aspect Ratio Selector */}
                      <div className="pt-2 border-t border-slate-200/80">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
                          ভিডিও রেশিও (Aspect Ratio):
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { value: 'auto', label: '🔄 অটো-ডিটেক্ট', desc: 'আসল রেশিও' },
                            { value: '9:16', label: '📱 ৯:১৬', desc: 'TikTok / Shorts' },
                            { value: '16:9', label: '🖥️ ১৬:৯', desc: 'YouTube / ওয়াইড' },
                            { value: '1:1', label: '🔲 ১:১', desc: 'স্কয়ার / চারকোনা' },
                            { value: '4:3', label: '📺 ৪:৩', desc: 'স্ট্যান্ডার্ড' },
                          ].map((opt) => {
                            const isSelected = (lpForm.videoAspectRatio || 'auto') === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  setLpForm((prev) => ({
                                    ...prev,
                                    videoAspectRatio: opt.value as any,
                                  }))
                                }
                                className={`px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <div className="text-xs font-bold">{opt.label}</div>
                                <div className="text-[10px] text-slate-500">{opt.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Live Video Preview inside Admin Form */}
                      {lpForm.videoUrl && lpForm.videoUrl.trim() !== '' && (
                        <div className="pt-2">
                          <p className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <Play className="w-3 h-3 text-emerald-600" />
                            <span>ভিডিও লাইভ প্রিভিউ (অরিজিনাল কোয়ালিটি):</span>
                          </p>
                          <div
                            className={`mx-auto rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-md ${
                              (lpForm.videoAspectRatio || 'auto') === '9:16'
                                ? 'max-w-[260px] aspect-[9/16]'
                                : (lpForm.videoAspectRatio || 'auto') === '1:1'
                                ? 'max-w-[320px] aspect-square'
                                : (lpForm.videoAspectRatio || 'auto') === '4:3'
                                ? 'max-w-md aspect-[4/3]'
                                : 'max-w-md aspect-video'
                            }`}
                          >
                            <ProductVideoPlayer
                              videoUrl={lpForm.videoUrl}
                              title="Admin Preview"
                              aspectRatio={lpForm.videoAspectRatio || 'auto'}
                              autoPlay={false}
                              loop={true}
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 1.5. PRODUCT OVERVIEW & DETAILED DESCRIPTION */}
                {editorTab === 'overview' && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <span>প্রোডাক্ট বিবরণ ও বিস্তারিত ওভারভিউ সেটিংস</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        ল্যান্ডিং পেজের ভেতরে প্রদর্শিত প্রোডাক্ট বিবরণ, স্পেসিফিকেশন ও গুরুত্বপূর্ণ তথ্য সহজে সম্পাদনা করুন।
                      </p>
                    </div>

                    {/* Enable / Disable Overview Section */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          প্রোডাক্ট ওভারভিউ সেকশন প্রদর্শন করুন
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ল্যান্ডিং পেজে এই সেকশনটি গ্রাহকদের জন্য দৃশ্যমান থাকবে কি না
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setLpForm((prev) => ({
                            ...prev,
                            showProductOverview: prev.showProductOverview === false ? true : false,
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          lpForm.showProductOverview !== false ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            lpForm.showProductOverview !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          সেকশন শিরোনাম (Section Title)
                        </label>
                        <input
                          type="text"
                          value={lpForm.descriptionSectionTitle || ''}
                          onChange={(e) =>
                            setLpForm((prev) => ({ ...prev, descriptionSectionTitle: e.target.value }))
                          }
                          placeholder="প্রোডাক্টের বিস্তারিত বিবরণ ও গুরুত্বপূর্ণ তথ্য"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          টপ ব্যাজ / সাব-টাইটেল (Section Subtitle)
                        </label>
                        <input
                          type="text"
                          value={lpForm.descriptionSectionSubtitle || ''}
                          onChange={(e) =>
                            setLpForm((prev) => ({ ...prev, descriptionSectionSubtitle: e.target.value }))
                          }
                          placeholder="প্রোডাক্ট পরিচিতি ও ওভারভিউ"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          কাস্টম বিবরণ ও পয়েন্টসমূহ (Custom Description / Specs)
                        </label>
                        {editingProduct && (
                          <button
                            type="button"
                            onClick={() => {
                              setLpForm((prev) => ({
                                ...prev,
                                customDescription:
                                  editingProduct.description || editingProduct.shortDescription || '',
                              }));
                            }}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            মূল প্রোডাক্ট থেকে বিবরণ আনুন
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={8}
                        value={
                          lpForm.customDescription !== undefined
                            ? lpForm.customDescription
                            : editingProduct?.description || editingProduct?.shortDescription || ''
                        }
                        onChange={(e) =>
                          setLpForm((prev) => ({ ...prev, customDescription: e.target.value }))
                        }
                        placeholder="প্রতি লাইনে একটি করে বৈশিষ্ট্য বা পয়েন্ট লিখুন। লাইনের শুরুতে • বা - দিলে স্বয়ংক্রিয়ভাবে আকর্ষণীয় চেকমার্ক আইকনসহ প্রদর্শিত হবে।"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white leading-relaxed font-bangla"
                      />
                      <p className="text-[11px] text-slate-500">
                        টিপস: প্রতিটি পয়েন্ট আলাদা লাইনে লিখুন। গ্রাহকরা সহজে পড়তে পারবে এবং দ্রুত অর্ডার করতে আগ্রহী হবে।
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. THEME & BANNERS */}
                {editorTab === 'theme' && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Palette className="w-5 h-5 text-indigo-600" />
                        <span>২. কালার থিম ও টপ নোটিফিকেশন ব্যানার</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        আপনার ব্র্যান্ড ও প্রডাক্ট টাইপের সাথে মানানসই প্রিমিয়াম কালার স্কিম নির্বাচন করুন।
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-800">
                        ল্যান্ডিং পেজের কালার থিম প্রিসেট (Luxury Theme Presets)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {COLOR_THEMES.map((th) => {
                          const isSelected = (lpForm.accentColor || 'emerald') === th.id;
                          return (
                            <div
                              key={th.id}
                              onClick={() => setLpForm((prev) => ({ ...prev, accentColor: th.id as any }))}
                              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                                isSelected
                                  ? 'border-slate-900 bg-slate-50 ring-2 ring-indigo-400/40 shadow-xs'
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <div
                                className={`w-10 h-10 rounded-xl ${th.bg} shrink-0 flex items-center justify-center text-white shadow-xs mt-0.5`}
                              >
                                {isSelected ? <Check className="w-5 h-5 stroke-[3]" /> : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-slate-900">{th.name}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{th.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-100">
                      <label className="text-xs font-bold text-slate-800">
                        টপ অ্যানিমেটেড ব্যানার টেক্সট (Urgency Promo Announcement)
                      </label>
                      <input
                        type="text"
                        value={lpForm.topBannerText || ''}
                        onChange={(e) => setLpForm((prev) => ({ ...prev, topBannerText: e.target.value }))}
                        placeholder="🔥 ধামাকা অফার! সীমিত সময়ের জন্য বিশেষ ছাড় চলছে..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* 3. URGENCY & COUNTDOWN & DELIVERY FEES */}
                {editorTab === 'urgency' && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        <span>৩. লাইভ কাউন্টডাউন টাইমার ও ডেলিভারি চার্জ নির্ধারণ</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        তাড়াতাড়ি অর্ডার করানোর জন্য কাউন্টডাউন এবং ল্যান্ডিং পেজের বিশেষ ডেলিভারি ফি সেট করুন।
                      </p>
                    </div>

                    {/* Countdown Timer Box */}
                    <div className="p-5 rounded-3xl bg-amber-50/70 border border-amber-200/80 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                              লাইভ কাউন্টডাউন টাইমার (Ticking Urgency Clock)
                            </h4>
                            <p className="text-[11px] text-amber-800">
                              অফার শেষ হওয়ার রিয়েল-টাইম টাইমার ডিসপ্লে করুন
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setLpForm((prev) => ({ ...prev, showCountdown: !prev.showCountdown }))
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            lpForm.showCountdown !== false ? 'bg-amber-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              lpForm.showCountdown !== false ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {lpForm.showCountdown !== false && (
                        <div className="pt-3 border-t border-amber-200/60 space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="text-xs font-bold text-slate-700">টাইমার মেয়াদ (ঘণ্টা):</label>
                            <input
                              type="number"
                              min="1"
                              max="168"
                              value={lpForm.countdownHours || 24}
                              onChange={(e) =>
                                setLpForm((prev) => ({
                                  ...prev,
                                  countdownHours: parseInt(e.target.value) || 24,
                                }))
                              }
                              className="w-24 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                            <span className="text-xs text-slate-500">
                              ঘণ্টা (রিয়েলটাইম কাউন্টডাউন)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">কাউন্টডাউন টাইটেল</label>
                              <input
                                type="text"
                                value={lpForm.countdownTitle || ''}
                                onChange={(e) => setLpForm((prev) => ({ ...prev, countdownTitle: e.target.value }))}
                                placeholder="যেমন: স্পেশাল অফারটি শেষ হতে বাকি:"
                                className="w-full bg-white border border-amber-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">কাউন্টডাউন সাব-টাইটেল</label>
                              <input
                                type="text"
                                value={lpForm.countdownSubtitle || ''}
                                onChange={(e) => setLpForm((prev) => ({ ...prev, countdownSubtitle: e.target.value }))}
                                placeholder="যেমন: অফার শেষ হলে পূর্বের মূল্যে ফিরে যাবে"
                                className="w-full bg-white border border-amber-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Custom Delivery Charges Override */}
                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                      <div className="flex items-center gap-3">
                        <Truck className="w-5 h-5 text-indigo-600" />
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            ল্যান্ডিং পেজ ডেলিভারি চার্জ ও লেবেল (Delivery Settings)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            ফ্রি ডেলিভারি অফার দিতে চাইলে ফি 0 লিখুন
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2 p-3 bg-white rounded-2xl border border-slate-200">
                          <label className="text-xs font-bold text-slate-700">
                            ঢাকার ভেতরের লেবেল ও চার্জ
                          </label>
                          <input
                            type="text"
                            value={lpForm.insideDhakaLabel || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, insideDhakaLabel: e.target.value }))}
                            placeholder="যেমন: ঢাকার ভেতরে"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                              ৳
                            </span>
                            <input
                              type="number"
                              value={lpForm.deliveryInsideDhakaFee ?? 70}
                              onChange={(e) =>
                                setLpForm((prev) => ({
                                  ...prev,
                                  deliveryInsideDhakaFee: parseInt(e.target.value) || 0,
                                }))
                              }
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 p-3 bg-white rounded-2xl border border-slate-200">
                          <label className="text-xs font-bold text-slate-700">
                            ঢাকার বাইরের লেবেল ও চার্জ
                          </label>
                          <input
                            type="text"
                            value={lpForm.outsideDhakaLabel || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, outsideDhakaLabel: e.target.value }))}
                            placeholder="যেমন: ঢাকার বাইরে"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                              ৳
                            </span>
                            <input
                              type="number"
                              value={lpForm.deliveryOutsideDhakaFee ?? 130}
                              onChange={(e) =>
                                setLpForm((prev) => ({
                                  ...prev,
                                  deliveryOutsideDhakaFee: parseInt(e.target.value) || 0,
                                }))
                              }
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800">
                        রিপ্লেসমেন্ট ও গ্যারান্টি টেক্সট (Trust & Warranty Guarantee)
                      </label>
                      <input
                        type="text"
                        value={lpForm.guaranteeText || ''}
                        onChange={(e) => setLpForm((prev) => ({ ...prev, guaranteeText: e.target.value }))}
                        placeholder="পণ্য পছন্দ না হলে বা কোনো সমস্যা থাকলে ৭ দিনের ভেতর সহজ রিপ্লেসমেন্ট সুবিধা।"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* 4. FEATURES & HIGHLIGHTS */}
                {editorTab === 'features' && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span>৪. প্রোডাক্টের আকর্ষণীয় বৈশিষ্ট্যসমূহ (Feature Highlights)</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          প্রোডাক্টের মূল ফিচার ও সুবিধাগুলো কার্ড আকারে শো করবে।
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddFeature}
                        className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                      >
                        <Plus className="w-4 h-4" />
                        <span>নতুন ফিচার যোগ করুন</span>
                      </button>
                    </div>

                    {/* Toggle showFeatures ON/OFF */}
                    <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-emerald-950">
                            ফিচার ও আকর্ষণীয় সুবিধাসমূহ সেকশন প্রদর্শন করুন (Active / Hide)
                          </h4>
                          <p className="text-[11px] text-emerald-800">
                            এই সুইচটি বন্ধ (Off) রাখলে ল্যান্ডিং পেজে "প্রোডাক্টের বিশেষ ফিচার ও আকর্ষণীয় সুবিধাসমূহ" সেকশনটি সম্পূর্ণ হাইড হয়ে যাবে।
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setLpForm((prev) => ({ ...prev, showFeatures: prev.showFeatures === false ? true : false }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          lpForm.showFeatures !== false ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            lpForm.showFeatures !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Features Header Customization */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800">ফিচার সেকশন টাইটেল</label>
                        <input
                          type="text"
                          value={lpForm.featuresSectionTitle || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, featuresSectionTitle: e.target.value }))}
                          placeholder="যেমন: প্রোডাক্টের বিশেষ ফিচার ও আকর্ষণীয় সুবিধাসমূহ"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800">ফিচার সেকশন সাব-টাইটেল</label>
                        <input
                          type="text"
                          value={lpForm.featuresSectionSubtitle || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, featuresSectionSubtitle: e.target.value }))}
                          placeholder="যেমন: কেন এটি আপনার জন্য সেরা?"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(lpForm.features || []).map((feat, fIdx) => (
                        <div
                          key={feat.id || fIdx}
                          className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3.5"
                        >
                          <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                            {fIdx + 1}
                          </div>
                          <div className="flex-1 space-y-2.5">
                            <input
                              type="text"
                              value={feat.title}
                              onChange={(e) => handleUpdateFeature(fIdx, 'title', e.target.value)}
                              placeholder="ফিচারের শিরোনাম (যেমন: ওয়াটারপ্রুফ ও লং ব্যাটারি ব্যাকআপ)"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              type="text"
                              value={feat.desc}
                              onChange={(e) => handleUpdateFeature(fIdx, 'desc', e.target.value)}
                              placeholder="সংক্ষিপ্ত বর্ণনা..."
                              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(fIdx)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. WHY CHOOSE US */}
                {editorTab === 'why_us' && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <HeartHandshake className="w-5 h-5 text-indigo-600" />
                          <span>৫. কেন আমাদের থেকেই কিনবেন? (Why Choose Us)</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          বিশ্বাসযোগ্যতা ও কনফিডেন্স তৈরি করার জন্য বুলেট পয়েন্টসমূহ।
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddWhyUs}
                        className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                      >
                        <Plus className="w-4 h-4" />
                        <span>নতুন পয়েন্ট যোগ করুন</span>
                      </button>
                    </div>

                    {/* Why Us Header Customization */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800">সেকশন টাইটেল</label>
                        <input
                          type="text"
                          value={lpForm.whyUsSectionTitle || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, whyUsSectionTitle: e.target.value }))}
                          placeholder="যেমন: কেন আমাদের থেকেই অর্ডার করবেন?"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800">সেকশন সাব-টাইটেল</label>
                        <input
                          type="text"
                          value={lpForm.whyUsSectionSubtitle || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, whyUsSectionSubtitle: e.target.value }))}
                          placeholder="যেমন: নিরাপদ অনলাইন শপিং"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {(lpForm.whyChooseUs || []).map((point, wIdx) => (
                        <div
                          key={wIdx}
                          className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3"
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <input
                            type="text"
                            value={point}
                            onChange={(e) => handleUpdateWhyUs(wIdx, e.target.value)}
                            placeholder="যেমন: পণ্য হাতে পেয়ে দেখে মূল্য পরিশোধের সুযোগ..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveWhyUs(wIdx)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. VERIFIED REVIEWS */}
                {editorTab === 'reviews' && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                          <span>৬. কাস্টমার রিভিউ ও টেস্টমোনিয়াল (Social Proof Reviews)</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          প্রকৃত কাস্টমার রিভিউ ল্যান্ডিং পেজে সেল বাড়ানোর সবচেয়ে বড় ফ্যাক্টর।
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddReview}
                        className="px-4 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
                      >
                        <Plus className="w-4 h-4" />
                        <span>রিভিউ যোগ করুন</span>
                      </button>
                    </div>

                    {/* Reviews Header Customization */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800">রিভিউ সেকশন টাইটেল</label>
                        <input
                          type="text"
                          value={lpForm.reviewsSectionTitle || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, reviewsSectionTitle: e.target.value }))}
                          placeholder="যেমন: আমাদের সম্মানিত ক্রেতাদের অভিজ্ঞতা"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-800">রিভিউ সেকশন সাব-টাইটেল</label>
                        <input
                          type="text"
                          value={lpForm.reviewsSectionSubtitle || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, reviewsSectionSubtitle: e.target.value }))}
                          placeholder="যেমন: কাস্টমারদের মতামত"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(lpForm.customReviews || []).map((rev, rIdx) => (
                        <div
                          key={rev.id || rIdx}
                          className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-black text-slate-800">
                              রিভিউ #{rIdx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveReview(rIdx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <input
                              type="text"
                              value={rev.name}
                              onChange={(e) => handleUpdateReview(rIdx, 'name', e.target.value)}
                              placeholder="কাস্টমারের নাম"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              type="text"
                              value={rev.location || ''}
                              onChange={(e) => handleUpdateReview(rIdx, 'location', e.target.value)}
                              placeholder="ঠিকানা (যেমন: মিরপুর, ঢাকা)"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <select
                              value={rev.rating}
                              onChange={(e) =>
                                handleUpdateReview(rIdx, 'rating', parseInt(e.target.value) || 5)
                              }
                              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-amber-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="5">⭐⭐⭐⭐⭐ (5 Star)</option>
                              <option value="4">⭐⭐⭐⭐ (4 Star)</option>
                            </select>
                          </div>

                          <textarea
                            rows={2}
                            value={rev.comment}
                            onChange={(e) => handleUpdateReview(rIdx, 'comment', e.target.value)}
                            placeholder="কাস্টমারের অভিজ্ঞতা ও পজিটিভ কমেন্ট..."
                            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. ORDER FORM & BUTTON */}
                {editorTab === 'order_form' && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-indigo-600" />
                        <span>৭. অর্ডার ফর্ম, ইনপুট ফিল্ড ও বাটন কাস্টমাইজেশন</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        ১-ক্লিক ক্যাশ অন ডেলিভারি ফর্মের প্রতিটি হেডিং, ইনপুট লেবেল ও কনফার্ম বাটন কাস্টমাইজ করুন।
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          ফর্ম টপ ব্যাজ (Order Form Badge)
                        </label>
                        <input
                          type="text"
                          value={lpForm.orderFormBadgeText || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, orderFormBadgeText: e.target.value }))}
                          placeholder="যেমন: ১০০% ক্যাশ অন ডেলিভারি"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-800">
                          অর্ডার সাবমিট বাটন টেক্সট (Submit Order Button)
                        </label>
                        <input
                          type="text"
                          value={lpForm.customButtonText || ''}
                          onChange={(e) => setLpForm((prev) => ({ ...prev, customButtonText: e.target.value }))}
                          placeholder="অর্ডার কনফার্ম করুন"
                          className="w-full bg-emerald-50 border border-emerald-300 rounded-xl px-3.5 py-2.5 text-xs font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800">
                        অর্ডার ফর্মের টাইটেল (Order Form Heading)
                      </label>
                      <input
                        type="text"
                        value={lpForm.customOrderTitle || ''}
                        onChange={(e) => setLpForm((prev) => ({ ...prev, customOrderTitle: e.target.value }))}
                        placeholder="অর্ডার করতে নিচের ফর্মে আপনার নাম, ঠিকানা ও মোবাইল নাম্বার লিখুন"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800">
                        অর্ডার ফর্মের সাব-টাইটেল (Form Guarantee Subtitle)
                      </label>
                      <input
                        type="text"
                        value={lpForm.customOrderSubtitle || ''}
                        onChange={(e) =>
                          setLpForm((prev) => ({ ...prev, customOrderSubtitle: e.target.value }))
                        }
                        placeholder="পণ্য হাতে পেয়ে দেখে ডেলিভারি ম্যানের কাছে পেমেন্ট করার ১০০% নিশ্চয়তা"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    {/* Step Titles */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900">অর্ডার স্টেপ টাইটেলসমূহ</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">স্টেপ ১ টাইটেল</label>
                          <input
                            type="text"
                            value={lpForm.step1Title || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, step1Title: e.target.value }))}
                            placeholder="১. প্রডাক্ট ও পরিমাণ নির্ধারণ করুন"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">স্টেপ ২ টাইটেল</label>
                          <input
                            type="text"
                            value={lpForm.step2Title || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, step2Title: e.target.value }))}
                            placeholder="২. আপনার ডেলিভারি এরিয়া সিলেক্ট করুন"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">স্টেপ ৩ টাইটেল</label>
                          <input
                            type="text"
                            value={lpForm.step3Title || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, step3Title: e.target.value }))}
                            placeholder="৩. আপনার নাম ও ঠিকানা লিখুন"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Inputs & Placeholders */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900">ইনপুট ফিল্ড লেবেল ও প্লেসহোল্ডার</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">নাম ফিল্ড লেবেল</label>
                          <input
                            type="text"
                            value={lpForm.nameInputLabel || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, nameInputLabel: e.target.value }))}
                            placeholder="যেমন: আপনার নাম *"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">নাম প্লেসহোল্ডার</label>
                          <input
                            type="text"
                            value={lpForm.nameInputPlaceholder || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, nameInputPlaceholder: e.target.value }))}
                            placeholder="যেমন: আপনার পুরো নাম লিখুন"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">মোবাইল ফিল্ড লেবেল</label>
                          <input
                            type="text"
                            value={lpForm.phoneInputLabel || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, phoneInputLabel: e.target.value }))}
                            placeholder="যেমন: মোবাইল নাম্বার *"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">মোবাইল প্লেসহোল্ডার</label>
                          <input
                            type="text"
                            value={lpForm.phoneInputPlaceholder || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, phoneInputPlaceholder: e.target.value }))}
                            placeholder="যেমন: ০১৭XXXXXXXX"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">ঠিকানা ফিল্ড লেবেল</label>
                          <input
                            type="text"
                            value={lpForm.addressInputLabel || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, addressInputLabel: e.target.value }))}
                            placeholder="যেমন: সম্পূর্ণ ডেলিভারি ঠিকানা *"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">ঠিকানা প্লেসহোল্ডার</label>
                          <input
                            type="text"
                            value={lpForm.addressInputPlaceholder || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, addressInputPlaceholder: e.target.value }))}
                            placeholder="যেমন: বাসা/রোড নাম্বার, থানা ও জেলা..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">নোট ফিল্ড লেবেল</label>
                          <input
                            type="text"
                            value={lpForm.noteInputLabel || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, noteInputLabel: e.target.value }))}
                            placeholder="যেমন: অতিরিক্ত নির্দেশনা (ঐচ্ছিক)"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">নোট প্লেসহোল্ডার</label>
                          <input
                            type="text"
                            value={lpForm.noteInputPlaceholder || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, noteInputPlaceholder: e.target.value }))}
                            placeholder="যেমন: ডেলিভারি সংক্রান্ত বিশেষ কথা..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800">
                        অর্ডার সিকিউরিটি নোটিশ (Security Notice)
                      </label>
                      <input
                        type="text"
                        value={lpForm.orderSecurityNotice || ''}
                        onChange={(e) => setLpForm((prev) => ({ ...prev, orderSecurityNotice: e.target.value }))}
                        placeholder="🔒 আপনার সকল তথ্য ১০০% সুরক্ষিত এবং পণ্য হাতে পাওয়ার পর মূল্য পরিশোধ করতে পারবেন।"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      />
                    </div>

                    {/* Mobile Sticky Bar Customization */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-slate-900">মোবাইল স্টিকি বার টেক্সট (Bottom Sticky Bar)</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">স্টিকি বার বাটন টেক্সট</label>
                          <input
                            type="text"
                            value={lpForm.stickyBarButtonText || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, stickyBarButtonText: e.target.value }))}
                            placeholder="যেমন: অর্ডার করুন"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-600">স্টিকি বার সাব-টেক্সট</label>
                          <input
                            type="text"
                            value={lpForm.stickyBarSubtext || ''}
                            onChange={(e) => setLpForm((prev) => ({ ...prev, stickyBarSubtext: e.target.value }))}
                            placeholder="যেমন: অফার মূল্য"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 8. SIMILAR PRODUCTS SECTION */}
                {editorTab === 'similar' && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-600" />
                        <span>৮. সিমিলার প্রোডাক্টস সেকশন (Similar Products)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        ল্যান্ডিং পেজের নিচে একই ক্যাটাগরির সম্পর্কিত অন্যান্য পণ্যগুলো শো করবে।
                      </p>
                    </div>

                    <div className="p-5 rounded-3xl bg-indigo-50/70 border border-indigo-200/80 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                            <Layers className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-indigo-950">
                              ল্যান্ডিং পেজের নিচে সিমিলার প্রোডাক্ট সেকশন
                            </h4>
                            <p className="text-[11px] text-indigo-800">
                              কাস্টমার যাতে একই অর্ডারে আরও প্রডাক্ট দেখতে ও কিনতে পারেন
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setLpForm((prev) => ({
                              ...prev,
                              showSimilarProducts: prev.showSimilarProducts === false ? true : false,
                            }))
                          }
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            lpForm.showSimilarProducts !== false ? 'bg-indigo-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              lpForm.showSimilarProducts !== false ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {lpForm.showSimilarProducts !== false && (
                        <div className="pt-3 space-y-3 border-t border-indigo-200/60">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">সেকশন টাইটেল:</label>
                              <input
                                type="text"
                                value={lpForm.similarSectionTitle || ''}
                                onChange={(e) =>
                                  setLpForm((prev) => ({ ...prev, similarSectionTitle: e.target.value }))
                                }
                                placeholder="সম্পর্কিত অন্যান্য আকর্ষণীয় পণ্যসমূহ"
                                className="w-full bg-white border border-indigo-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">সেকশন সাব-টাইটেল:</label>
                              <input
                                type="text"
                                value={lpForm.similarSectionSubtitle || ''}
                                onChange={(e) =>
                                  setLpForm((prev) => ({ ...prev, similarSectionSubtitle: e.target.value }))
                                }
                                placeholder="সম্পর্কিত পণ্যসমূহ"
                                className="w-full bg-white border border-indigo-300 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>

                          <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 text-xs text-slate-700 space-y-1">
                            <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                              <span>অটোমেটিক ক্যাটাগরি ম্যাপিং:</span>
                            </p>
                            <p className="text-[11px] text-slate-600">
                              এই প্রোডাক্টটি যে ক্যাটাগরির (
                              <strong className="text-indigo-700">{editingProduct.category}</strong>
                              ), সেই ক্যাটাগরির শীর্ষ জনপ্রিয় ও আকর্ষণীয় পণ্যগুলো ল্যান্ডিং পেজের নিচে
                              স্বয়ংক্রিয়ভাবে ডিসপ্লে হবে।
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 9. FACEBOOK AD TRACKING */}
                {editorTab === 'ad_tracking' && (
                  <div className="space-y-6 max-w-3xl">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-blue-600" />
                        <span>৯. Facebook Ads Direct Link & Pixel Events</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        ফেসবুক অ্যাড ক্যাম্পেইনে সরাসরি এই লিংকটি ব্যবহার করুন।
                      </p>
                    </div>

                    <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-4 shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg">
                          f
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            Facebook Ads Direct Destination Link
                          </h4>
                          <p className="text-[11px] text-slate-400">
                            এই লিংকটি কপি করে সরাসরি ফেসবুক অ্যাড ম্যানেজারে বসান
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-800 p-2.5 rounded-2xl border border-slate-700">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/?lp=${encodeURIComponent(
                            lpForm.slug || editingProduct.id
                          )}`}
                          className="w-full bg-transparent text-xs font-mono text-indigo-300 px-2 select-all focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/?lp=${encodeURIComponent(
                              lpForm.slug || editingProduct.id
                            )}`;
                            navigator.clipboard.writeText(url);
                            showToast('ফেসবুক অ্যাডের লিংক সফলভাবে কপি হয়েছে!');
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>কপি লিংক</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-center text-xs">
                        <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700">
                          <span className="text-emerald-400 font-bold block">PageView</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">অটো ট্র্যাকিং</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700">
                          <span className="text-emerald-400 font-bold block">ViewContent</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">প্রোডাক্ট ভিউ</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700">
                          <span className="text-emerald-400 font-bold block">InitiateCheckout</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">ফর্ম ফোকাস</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700">
                          <span className="text-emerald-400 font-bold block">Purchase</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">অর্ডার সম্পন্ন</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Bar */}
            <div className="p-3 sm:p-4 md:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer text-center"
              >
                বাতিল করুন
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const tempProduct: Product = {
                      ...editingProduct,
                      landingPage: lpForm,
                    };
                    setPreviewProduct(tempProduct);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>লাইভ প্রিভিউ দেখুন</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveLpConfig}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>ল্যান্ডিং পেজ সেভ করুন</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- LIVE RESPONSIVE PREVIEW MODAL ----------------- */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200">
          {/* Top Control Bar */}
          <div className="bg-slate-950 text-white px-4 py-3 flex items-center justify-between gap-3 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                Live Preview: {previewProduct.name}
              </h3>
            </div>

            {/* Device Switcher */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  previewDevice === 'desktop'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ডেস্কটপ / পিসি</span>
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">মোবাইল ভিউ</span>
              </button>
            </div>

            <button
              onClick={() => setPreviewProduct(null)}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview Viewport */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-6 flex items-start justify-center">
            <div
              className={`bg-white transition-all duration-300 overflow-y-auto ${
                previewDevice === 'mobile'
                  ? 'w-full max-w-[420px] rounded-[36px] border-[10px] border-slate-900 shadow-2xl min-h-[780px]'
                  : 'w-full max-w-[1280px] rounded-3xl border border-slate-200 shadow-2xl min-h-[850px]'
              }`}
            >
              <ProductLandingPageView
                product={previewProduct}
                allProducts={products}
                onSelectProduct={(p) => setPreviewProduct(p)}
                onAddToCart={() => showToast('প্রিভিউ মোড: কার্টে যোগ হয়েছে')}
                onBuyNow={() => showToast('প্রিভিউ মোড: অর্ডার ফর্মে স্ক্রল হয়েছে')}
                isPreviewMode={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
