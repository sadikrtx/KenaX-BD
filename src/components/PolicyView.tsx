import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  FileText,
  RotateCcw,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageSquare,
  ArrowRight,
  Truck,
  CheckCircle2,
  Lock,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Headphones,
  Info,
  Clock,
  Sparkles,
  MapPin,
  Smartphone,
} from 'lucide-react';
import { FAQItem, PolicyTab } from '../types';
import {
  DEFAULT_PRIVACY_POLICY,
  DEFAULT_TERMS_OF_SERVICE,
  DEFAULT_REFUND_POLICY,
  DEFAULT_FAQS,
} from '../data/defaultPolicies';

interface PolicyViewProps {
  initialTab?: PolicyTab;
  privacyPolicyText?: string;
  termsOfServiceText?: string;
  refundPolicyText?: string;
  faqs?: FAQItem[];
  onNavigate: (view: string) => void;
  onSelectCategory?: (category: string) => void;
}

export const PolicyView: React.FC<PolicyViewProps> = ({
  initialTab = 'privacy',
  privacyPolicyText,
  termsOfServiceText,
  refundPolicyText,
  faqs,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('All');
  const [expandedFaqIds, setExpandedFaqIds] = useState<Set<string>>(new Set());

  const effectivePrivacyText = (privacyPolicyText && privacyPolicyText.trim()) ? privacyPolicyText : DEFAULT_PRIVACY_POLICY;
  const effectiveTermsText = (termsOfServiceText && termsOfServiceText.trim()) ? termsOfServiceText : DEFAULT_TERMS_OF_SERVICE;
  const effectiveRefundText = (refundPolicyText && refundPolicyText.trim()) ? refundPolicyText : DEFAULT_REFUND_POLICY;
  const effectiveFaqs = (faqs && faqs.length > 0) ? faqs : DEFAULT_FAQS;

  // Keep active tab in sync if initialTab changes externally
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [initialTab]);

  // Tab configurations
  const tabConfig: Record<
    PolicyTab,
    {
      title: string;
      description: string;
      icon: React.ComponentType<{ className?: string }>;
      color: string;
      activeBg: string;
      badgeText: string;
    }
  > = {
    privacy: {
      title: 'Privacy Policy',
      description: 'How KenaX BD collects, safeguards, and respects your personal data and shopping information.',
      icon: ShieldCheck,
      color: 'text-sky-600',
      activeBg: 'bg-sky-50 text-sky-700 border-sky-300',
      badgeText: '100% Data Confidentiality',
    },
    terms: {
      title: 'Terms of Service',
      description: 'The standard terms, conditions, and rules governing order placement and services on KenaX BD.',
      icon: FileText,
      color: 'text-amber-600',
      activeBg: 'bg-amber-50 text-amber-700 border-amber-300',
      badgeText: 'Transparent E-Commerce',
    },
    refund: {
      title: 'Refund & Return Policy',
      description: 'Our hassle-free 7-day return, replacement, and verified refund guidelines across Bangladesh.',
      icon: RotateCcw,
      color: 'text-rose-600',
      activeBg: 'bg-rose-50 text-rose-700 border-rose-300',
      badgeText: '7-Day Return Guarantee',
    },
    faq: {
      title: 'FAQ & Help Center',
      description: 'Frequently asked questions, common shopping issues, delivery timelines, and quick help answers.',
      icon: HelpCircle,
      color: 'text-emerald-600',
      activeBg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      badgeText: 'Instant Answers',
    },
  };

  // FAQ Categories
  const faqCategories = useMemo(() => {
    const cats = new Set<string>();
    effectiveFaqs.forEach((f) => {
      if (f.category) cats.add(f.category);
    });
    return ['All', ...Array.from(cats)];
  }, [effectiveFaqs]);

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    return effectiveFaqs.filter((faq) => {
      const matchesSearch =
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (faq.category && faq.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedFaqCategory === 'All' || faq.category === selectedFaqCategory;

      return matchesSearch && matchesCat;
    });
  }, [effectiveFaqs, searchQuery, selectedFaqCategory]);

  const toggleFaq = (id: string) => {
    setExpandedFaqIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllFaqs = () => {
    setExpandedFaqIds(new Set(filteredFaqs.map((f) => f.id)));
  };

  const collapseAllFaqs = () => {
    setExpandedFaqIds(new Set());
  };

  const currentTabInfo = tabConfig[activeTab];

  // Helper to render markdown-like text formatted beautifully
  const renderFormattedPolicyContent = (text: string) => {
    if (!text) {
      return (
        <div className="py-12 text-center text-slate-500">
          <Info className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p>No policy content currently available. Please check back shortly.</p>
        </div>
      );
    }

    const lines = text.split('\n');

    return (
      <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2" />;

          // Main Section Header (## )
          if (trimmed.startsWith('## ')) {
            const headingText = trimmed.replace('## ', '');
            return (
              <div key={idx} className="pt-6 pb-2 border-b border-slate-200">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0"></span>
                  <span>{headingText}</span>
                </h3>
              </div>
            );
          }

          // Sub Heading (### )
          if (trimmed.startsWith('### ')) {
            const subHeadingText = trimmed.replace('### ', '');
            return (
              <h4 key={idx} className="text-base sm:text-lg font-bold text-slate-900 pt-3 flex items-center gap-2">
                <span className="text-sky-500">▸</span>
                <span>{subHeadingText}</span>
              </h4>
            );
          }

          // Bullet Points (- )
          if (trimmed.startsWith('- ')) {
            const bulletText = trimmed.replace('- ', '');
            return (
              <div key={idx} className="flex items-start gap-3 pl-2 sm:pl-4 py-0.5">
                <span className="text-sky-600 font-black text-lg leading-none mt-0.5">•</span>
                <span
                  className="text-slate-700"
                  dangerouslySetInnerHTML={{
                    __html: bulletText.replace(
                      /\*\*(.*?)\*\*/g,
                      '<strong class="text-slate-900 font-bold">$1</strong>'
                    ),
                  }}
                />
              </div>
            );
          }

          // Numbered Steps (1. 2. 3.)
          if (/^\d+\.\s/.test(trimmed)) {
            const number = trimmed.match(/^\d+\./)?.[0] || '';
            const stepText = trimmed.replace(/^\d+\.\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-3 pl-2 sm:pl-4 py-1">
                <span className="text-sky-700 font-black text-xs px-2 py-0.5 bg-sky-100/80 rounded-md border border-sky-200 shrink-0 mt-0.5 shadow-xs">
                  {number}
                </span>
                <span
                  className="text-slate-700"
                  dangerouslySetInnerHTML={{
                    __html: stepText.replace(
                      /\*\*(.*?)\*\*/g,
                      '<strong class="text-slate-900 font-bold">$1</strong>'
                    ),
                  }}
                />
              </div>
            );
          }

          // Regular Paragraph
          return (
            <p
              key={idx}
              className="text-slate-700"
              dangerouslySetInnerHTML={{
                __html: trimmed.replace(
                  /\*\*(.*?)\*\*/g,
                  '<strong class="text-slate-900 font-bold">$1</strong>'
                ),
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* 1. Page Header & Breadcrumbs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 flex-wrap">
            <button
              onClick={() => {
                onNavigate('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-sky-600 transition-colors cursor-pointer font-medium"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-700 font-medium">Customer Support & Policies</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-sky-600 font-bold">{currentTabInfo.title}</span>
          </nav>
        </div>
      </div>

      {/* 2. Hero Section */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white py-10 sm:py-14 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Decorative subtle background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs sm:text-sm font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>KenaX BD • Legal & Customer Assistance Center</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Policies, Terms & FAQ Assistance
          </h1>

          <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about our data security, authentic product guarantees, return timelines, and nationwide delivery support.
          </p>

          {/* Quick Search bar (Active especially when in FAQ tab, or allows jumping) */}
          <div className="pt-2 max-w-xl mx-auto">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'faq' && e.target.value.trim().length > 0) {
                    setActiveTab('faq');
                  }
                }}
                placeholder="Search questions, policies, returns, COD rules, delivery info..."
                className="w-full bg-slate-900/90 border border-slate-700 text-white placeholder-slate-400 text-xs sm:text-sm rounded-2xl pl-11 pr-10 py-3 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content Container */}
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Mobile Horizontal Tab Navigation (Sticky or prominent on mobile) */}
        <div className="lg:hidden mb-6 overflow-x-auto pb-2 scrollbar-none flex gap-2">
          {(['privacy', 'terms', 'refund', 'faq'] as PolicyTab[]).map((tabKey) => {
            const config = tabConfig[tabKey];
            const Icon = config.icon;
            const isActive = activeTab === tabKey;

            return (
              <button
                key={tabKey}
                onClick={() => {
                  setActiveTab(tabKey);
                  window.scrollTo({ top: 260, behavior: 'smooth' });
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : config.color}`} />
                <span>{config.title}</span>
              </button>
            );
          })}
        </div>

        {/* 2-Column Grid Layout: Left Sidebar + Right Policy Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Sidebar (Desktop Tab Navigation & Support Box) - 4 Cols on lg, 3 Cols on xl */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-6 sticky top-24">
            
            {/* Policy Navigation Tabs Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 space-y-1">
              <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                Select Policy / Help Section
              </div>

              {(['privacy', 'terms', 'refund', 'faq'] as PolicyTab[]).map((tabKey) => {
                const config = tabConfig[tabKey];
                const Icon = config.icon;
                const isActive = activeTab === tabKey;

                return (
                  <button
                    key={tabKey}
                    onClick={() => {
                      setActiveTab(tabKey);
                      window.scrollTo({ top: 220, behavior: 'smooth' });
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 cursor-pointer group ${
                      isActive
                        ? 'bg-sky-50 border border-sky-200 shadow-xs text-slate-900'
                        : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-sky-100 group-hover:text-sky-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xs sm:text-sm ${isActive ? 'text-sky-900 font-black' : 'text-slate-800'}`}>
                          {config.title}
                        </span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick 24/7 Support Assistance Box */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-5 border border-slate-800 space-y-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Need Personal Help?</h4>
                  <p className="text-xs text-slate-400">Customer Support 24/7</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Our support executives are available via phone, WhatsApp, and live email to solve any order, delivery, or warranty queries.
              </p>

              <div className="space-y-2 pt-1 text-xs">
                <a
                  href="https://wa.me/8801700123456"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp Support</span>
                </a>

                <button
                  onClick={() => {
                    onNavigate('contact');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all border border-slate-700 cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-sky-400" />
                  <span>Contact Form & Office</span>
                </button>
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 shadow-xs">
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Quick Actions
              </h5>
              <div className="space-y-1.5 text-xs">
                <button
                  onClick={() => {
                    onNavigate('track');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition-all font-medium text-left"
                >
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-sky-500" />
                    <span>Track Your Parcel</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    onNavigate('shop');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition-all font-medium text-left"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-500" />
                    <span>Browse All Products</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    onNavigate('about');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition-all font-medium text-left"
                >
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-500" />
                    <span>About KenaX BD</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

          </div>

          {/* Right Main Content Area (8 Cols on lg, 9 Cols on xl) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            <AnimatePresence mode="popLayout">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12, scale: 0.998 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.998 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                {/* Tab Header Card */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                    <currentTabInfo.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                        {currentTabInfo.title}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      {currentTabInfo.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{currentTabInfo.badgeText}</span>
                  </span>
                </div>
              </div>

              {/* TAB 1: Privacy Policy Content */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  {/* Highlights Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100">
                      <div className="flex items-center gap-2 text-sky-800 font-bold text-xs mb-1">
                        <Lock className="w-3.5 h-3.5 text-sky-600" />
                        <span>Encrypted & Safe</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        All contact details & passwords protected via SSL encryption protocols.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>No Data Selling</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        We never sell, rent, or trade your data with external third parties.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100">
                      <div className="flex items-center gap-2 text-purple-800 font-bold text-xs mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                        <span>Strict Verification</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Courier partners receive only essential recipient details for delivery.
                      </p>
                    </div>
                  </div>

                  {/* Render Markdown Text */}
                  <div className="pt-2">
                    {renderFormattedPolicyContent(effectivePrivacyText)}
                  </div>
                </div>
              )}

              {/* TAB 2: Terms of Service Content */}
              {activeTab === 'terms' && (
                <div className="space-y-6">
                  {/* Highlights Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>100% Genuine Items</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        All items are imported directly and backed by authentic warranties.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100">
                      <div className="flex items-center gap-2 text-sky-800 font-bold text-xs mb-1">
                        <Truck className="w-3.5 h-3.5 text-sky-600" />
                        <span>Nationwide COD</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Cash on Delivery available across all 64 districts in Bangladesh.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Fair Pricing</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Transparent pricing in Bangladeshi Taka (৳ BDT) with clear receipts.
                      </p>
                    </div>
                  </div>

                  {/* Render Markdown Text */}
                  <div className="pt-2">
                    {renderFormattedPolicyContent(effectiveTermsText)}
                  </div>
                </div>
              )}

              {/* TAB 3: Refund & Return Policy Content */}
              {activeTab === 'refund' && (
                <div className="space-y-6">
                  {/* Highlights Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100">
                      <div className="flex items-center gap-2 text-rose-800 font-bold text-xs mb-1">
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                        <span>7-Day Easy Return</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        Report any defect or mismatch within 7 days of package delivery.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                      <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Fast Refund Processing</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        bKash, Nagad, and Rocket refunds processed within 24–48 hours.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100">
                      <div className="flex items-center gap-2 text-sky-800 font-bold text-xs mb-1">
                        <Truck className="w-3.5 h-3.5 text-sky-600" />
                        <span>Free Return Pickup</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-normal">
                        No return courier fee if the product received was damaged or incorrect.
                      </p>
                    </div>
                  </div>

                  {/* Render Markdown Text */}
                  <div className="pt-2">
                    {renderFormattedPolicyContent(effectiveRefundText)}
                  </div>
                </div>
              )}

              {/* TAB 4: FAQ & Help Center Content */}
              {activeTab === 'faq' && (
                <div className="space-y-6">
                  
                  {/* FAQ Search & Category Filters */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Filter by Category:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={expandAllFaqs}
                          className="text-xs text-sky-600 hover:text-sky-700 font-bold hover:underline cursor-pointer"
                        >
                          Expand All
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          onClick={collapseAllFaqs}
                          className="text-xs text-slate-500 hover:text-slate-700 font-bold hover:underline cursor-pointer"
                        >
                          Collapse All
                        </button>
                      </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {faqCategories.map((cat) => {
                        const isSelected = selectedFaqCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedFaqCategory(cat)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* FAQ Accordion List */}
                  {filteredFaqs.length > 0 ? (
                    <div className="space-y-3">
                      {filteredFaqs.map((faq) => {
                        const isExpanded = expandedFaqIds.has(faq.id);

                        return (
                          <div
                            key={faq.id}
                            className={`rounded-2xl border transition-all overflow-hidden ${
                              isExpanded
                                ? 'bg-sky-50/40 border-sky-200 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <button
                              onClick={() => toggleFaq(faq.id)}
                              className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer select-none"
                            >
                              <div className="space-y-1">
                                {faq.category && (
                                  <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                                    {faq.category}
                                  </span>
                                )}
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                                  {faq.question}
                                </h3>
                              </div>

                              <div
                                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
                                  isExpanded
                                    ? 'bg-sky-600 text-white rotate-180'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-700 leading-relaxed border-t border-slate-100/80 animate-in fade-in duration-150">
                                <p className="whitespace-pre-line">{faq.answer}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                      <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700">No matching questions found</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        We couldn't find any questions matching "{searchQuery}". Please try another keyword or contact our support team.
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedFaqCategory('All');
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                      >
                        Reset Search Filters
                      </button>
                    </div>
                  )}

                </div>
              )}

            </div>
              </motion.div>
            </AnimatePresence>

            {/* Bottom Support Banner (Mobile & Desktop) */}
            <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md border border-slate-800">
              <div className="space-y-1.5 text-center sm:text-left">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400">
                  Still have questions?
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  We are here to assist you anytime
                </h3>
                <p className="text-xs text-slate-300 max-w-md">
                  Our friendly support team responds promptly to all questions, order tracking inquiries, and replacement requests.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    onNavigate('contact');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Mail className="w-4 h-4" />
                  <span>Contact Support</span>
                </button>

                <button
                  onClick={() => {
                    onNavigate('shop');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition-all border border-white/20 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Continue Shopping</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
