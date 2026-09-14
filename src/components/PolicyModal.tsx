import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  RotateCcw,
  HelpCircle,
  ChevronDown,
  Search,
  ExternalLink,
} from 'lucide-react';
import { FAQItem } from '../types';
import {
  DEFAULT_PRIVACY_POLICY,
  DEFAULT_TERMS_OF_SERVICE,
  DEFAULT_REFUND_POLICY,
  DEFAULT_FAQS,
} from '../data/defaultPolicies';

export type PolicyTab = 'privacy' | 'terms' | 'refund' | 'faq';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: PolicyTab;
  privacyPolicyText?: string;
  termsOfServiceText?: string;
  refundPolicyText?: string;
  faqs?: FAQItem[];
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
  privacyPolicyText,
  termsOfServiceText,
  refundPolicyText,
  faqs,
}) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const effectivePrivacyText = (privacyPolicyText && privacyPolicyText.trim()) ? privacyPolicyText : DEFAULT_PRIVACY_POLICY;
  const effectiveTermsText = (termsOfServiceText && termsOfServiceText.trim()) ? termsOfServiceText : DEFAULT_TERMS_OF_SERVICE;
  const effectiveRefundText = (refundPolicyText && refundPolicyText.trim()) ? refundPolicyText : DEFAULT_REFUND_POLICY;
  const effectiveFaqs = (faqs && faqs.length > 0) ? faqs : DEFAULT_FAQS;

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const filteredFaqs = effectiveFaqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (faq.category && faq.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderContentWithFormatting = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2" />;

          if (trimmed.startsWith('## ')) {
            return (
              <h3
                key={idx}
                className="text-base sm:text-lg font-black text-slate-900 pt-4 pb-1 border-b border-slate-100 flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                {trimmed.replace('## ', '')}
              </h3>
            );
          }

          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="text-sm sm:text-base font-bold text-slate-900 pt-2">
                {trimmed.replace('### ', '')}
              </h4>
            );
          }

          if (trimmed.startsWith('- ')) {
            const bulletText = trimmed.replace('- ', '');
            // Highlight bold items
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-sky-500 font-bold mt-0.5">•</span>
                <span
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

          if (/^\d+\.\s/.test(trimmed)) {
            const number = trimmed.match(/^\d+\./)?.[0] || '';
            const stepText = trimmed.replace(/^\d+\.\s*/, '');
            return (
              <div key={idx} className="flex items-start gap-2.5 pl-2">
                <span className="text-sky-600 font-black text-xs px-1.5 py-0.5 bg-sky-50 rounded-md border border-sky-200 shrink-0 mt-0.5">
                  {number}
                </span>
                <span
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

          return (
            <p
              key={idx}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              {activeTab === 'privacy' && <ShieldCheck className="w-5 h-5" />}
              {activeTab === 'terms' && <FileText className="w-5 h-5" />}
              {activeTab === 'refund' && <RotateCcw className="w-5 h-5" />}
              {activeTab === 'faq' && <HelpCircle className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                {activeTab === 'privacy' && 'Privacy Policy'}
                {activeTab === 'terms' && 'Terms of Service'}
                {activeTab === 'refund' && 'Refund & Return Policy'}
                {activeTab === 'faq' && 'Frequently Asked Questions (FAQ)'}
              </h2>
              <p className="text-xs text-slate-400">
                Official Policies & Customer Support Guidelines • KenaX BD
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </button>

          <button
            onClick={() => setActiveTab('refund')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'refund'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refund & Returns</span>
          </button>

          <button
            onClick={() => setActiveTab('faq')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'faq'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQ Help Center</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'privacy' && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-4 pb-3 border-b border-slate-100">
                <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">
                  Customer Privacy & Data Protection
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  KenaX BD Privacy Policy
                </h3>
                <p className="text-xs text-slate-500">
                  Last updated: 2026 • Applies to all visits, orders, and interactions on kenaxbd.com
                </p>
              </div>
              {renderContentWithFormatting(effectivePrivacyText)}
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-4 pb-3 border-b border-slate-100">
                <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">
                  User Agreement & E-Commerce Regulations
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  Terms & Conditions of Service
                </h3>
                <p className="text-xs text-slate-500">
                  Last updated: 2026 • Please read carefully prior to ordering or account creation
                </p>
              </div>
              {renderContentWithFormatting(effectiveTermsText)}
            </div>
          )}

          {activeTab === 'refund' && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-4 pb-3 border-b border-slate-100">
                <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">
                  7-Day Replacement & Return Assurance
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  Refund, Return & Replacement Policy
                </h3>
                <p className="text-xs text-slate-500">
                  Guaranteed hassle-free returns on defective, damaged, or mismatched items
                </p>
              </div>
              {renderContentWithFormatting(effectiveRefundText)}
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-xs text-slate-500">
                    Instant answers about delivery, Cash on Delivery, ordering, and warranty
                  </p>
                </div>

                {/* FAQ Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search questions..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* FAQs Accordion */}
              <div className="space-y-2.5">
                {filteredFaqs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No FAQs match your search query "{searchQuery}".
                  </div>
                ) : (
                  filteredFaqs.map((faq) => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all shadow-2xs hover:border-slate-300"
                      >
                        <button
                          onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                          className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {faq.category && (
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100 shrink-0">
                                {faq.category}
                              </span>
                            )}
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {faq.question}
                            </span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-sky-600' : ''
                            }`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Need Extra Help Box */}
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-sky-950">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">Have an urgent question or need support?</p>
                    <p className="text-slate-500 text-[11px]">
                      Our team is active daily from 9:00 AM to 11:00 PM via WhatsApp & phone.
                    </p>
                  </div>
                </div>

                <a
                  href="https://wa.me/8801700123456"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shrink-0 shadow-xs"
                >
                  <span>Chat on WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            © 2026 KenaX BD. All Rights Reserved.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
