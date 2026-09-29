import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Sliders,
  Search,
  RotateCcw,
  Sparkles,
  Zap,
  Tag,
  Check,
  X,
  AlertCircle,
  Copy,
  Send,
  HelpCircle,
  ExternalLink,
  Bot,
  SlidersHorizontal,
  ChevronDown,
  Info,
  ShoppingBag,
  MessageSquare,
} from 'lucide-react';
import { SiWhatsapp, SiTelegram } from 'react-icons/si';
import { ChatBotRule, ChatBotRuleActionData, SiteSettings } from '../../types';
import { DEFAULT_CHATBOT_RULES } from '../../data/defaultChatBotRules';
import { evaluateChatBotRules, formatRuleTemplate } from '../../lib/chatBotRuleMatcher';

interface AdminChatBotRuleMatrixProps {
  rules: ChatBotRule[];
  onChangeRules: (newRules: ChatBotRule[]) => void;
  siteSettings: SiteSettings;
  onSaveAll: () => Promise<void>;
  isSaving: boolean;
  canManageRules: boolean;
}

export const AdminChatBotRuleMatrix: React.FC<AdminChatBotRuleMatrixProps> = ({
  rules,
  onChangeRules,
  siteSettings,
  onSaveAll,
  isSaving,
  canManageRules,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingRule, setEditingRule] = useState<ChatBotRule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewLang, setPreviewLang] = useState<'bn' | 'en'>('bn');

  // Interactive Live Rule Simulator
  const [simulatorInput, setSimulatorInput] = useState('ডেলিভারি চার্জ কত');
  const [simulatorResult, setSimulatorResult] = useState<{
    tested: boolean;
    matchedRule: ChatBotRule | null;
    matchedKeyword: string | null;
    replyText: string;
    actionData?: any;
  } | null>(null);

  const categories = ['All', 'Delivery', 'Payment', 'Orders', 'Support', 'Discount', 'General'];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered and Sorted Rules
  const filteredRules = useMemo(() => {
    return rules
      .filter((r) => {
        const matchesCategory =
          selectedCategory === 'All' || (r.category || 'General').toLowerCase() === selectedCategory.toLowerCase();
        const matchesSearch =
          !searchQuery.trim() ||
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.nameBn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.keywords || []).some((kw) => kw.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (r.replyMessage || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.replyMessageBn || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  }, [rules, selectedCategory, searchQuery]);

  const activeRulesCount = useMemo(() => rules.filter((r) => r.enabled).length, [rules]);

  // Toggle Rule Status
  const handleToggleRule = (ruleId: string) => {
    if (!canManageRules) return;
    const updated = rules.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
    onChangeRules(updated);
    const target = updated.find((r) => r.id === ruleId);
    showToast(target?.enabled ? `✅ রুল সক্রিয় করা হয়েছে: ${target.name}` : `⏸️ রুল নিষ্ক্রিয় করা হয়েছে: ${target?.name}`);
  };

  // Delete Rule
  const handleDeleteRule = (ruleId: string) => {
    if (!canManageRules) return;
    const target = rules.find((r) => r.id === ruleId);
    const updated = rules.filter((r) => r.id !== ruleId);
    onChangeRules(updated);
    setDeleteConfirmId(null);
    showToast(`🗑️ রুল মুছে ফেলা হয়েছে: ${target?.name || ''}`);
  };

  // Duplicate Rule
  const handleDuplicateRule = (rule: ChatBotRule) => {
    if (!canManageRules) return;
    const newRule: ChatBotRule = {
      ...rule,
      id: `rule-custom-${Date.now()}`,
      name: `${rule.name} (Copy)`,
      nameBn: rule.nameBn ? `${rule.nameBn} (কপি)` : undefined,
      priority: (rule.priority || 1) + 1,
      enabled: true,
    };
    onChangeRules([...rules, newRule]);
    showToast(`📋 রুল ডুপ্লিকেট করা হয়েছে: ${newRule.name}`);
  };

  // Restore Default Rules
  const handleResetToDefaults = () => {
    if (!canManageRules) return;
    if (window.confirm('আপনি কি নিশ্চিত যে সমস্ত রুল ডিফল্ট অবস্থায় ফিরিয়ে নিতে চান? এতে কাস্টম রুল রিসেট হতে পারে।')) {
      onChangeRules(DEFAULT_CHATBOT_RULES);
      showToast('🔄 ডিফল্ট রুল ম্যাট্রিক্স সফলভাবে লোড হয়েছে!');
    }
  };

  // Run Interactive Simulator
  const handleTestSimulator = (customText?: string) => {
    const textToTest = (customText || simulatorInput).trim();
    if (!textToTest) return;

    const res = evaluateChatBotRules(textToTest, rules, siteSettings, previewLang);
    if (res) {
      setSimulatorResult({
        tested: true,
        matchedRule: res.matchedRule,
        matchedKeyword: res.matchedKeyword,
        replyText: res.replyText,
        actionData: res.actionData,
      });
    } else {
      setSimulatorResult({
        tested: true,
        matchedRule: null,
        matchedKeyword: null,
        replyText:
          '❌ কোনো নির্ধারিত রুল ম্যাচ করেনি। সাধারণ কাস্টমার কুয়েরি হিসেবে Gemini 3.8 Flash AI Bot দ্বারা স্বয়ংক্রিয়ভাবে হ্যান্ডেল করা হবে।',
      });
    }
  };

  // Save Modal (Create / Edit)
  const handleSaveModalRule = (ruleData: ChatBotRule) => {
    if (editingRule && rules.some((r) => r.id === editingRule.id)) {
      const updated = rules.map((r) => (r.id === editingRule.id ? ruleData : r));
      onChangeRules(updated);
      showToast(`✅ রুল আপডেট হয়েছে: ${ruleData.name}`);
    } else {
      onChangeRules([...rules, ruleData]);
      showToast(`🎉 নতুন রুল যুক্ত হয়েছে: ${ruleData.name}`);
    }
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const getCategoryBadgeColor = (cat?: string) => {
    switch ((cat || '').toLowerCase()) {
      case 'delivery':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'payment':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'orders':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'support':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'discount':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-bold flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-2 border border-emerald-500/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner & Stats */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-200 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>ChatBot Rule Matrix (রুল ম্যাট্রিক্স)</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Active: {activeRulesCount} / {rules.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                গ্রাহকের মেসেজের ওপর ভিত্তি করে নির্দিষ্ট উত্তর, কুইক অ্যাকশন বাটন এবং অটোমেশন রুল সেট করুন।
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {canManageRules && (
            <>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
                title="ডিফল্ট রুলস রিস্টোর করুন"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingRule(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-900/20 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Rule</span>
              </button>

              <button
                type="button"
                onClick={onSaveAll}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{isSaving ? 'Saving...' : 'Save Matrix'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Interactive Rule Simulator Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm text-white">রুল টেস্ট ও ম্যাচ সিমুলেটর (Live Rule Tester)</h3>
          </div>
          <span className="text-[11px] text-slate-400">
            রুলগুলো কীভাবে ট্র্রিগার হচ্ছে তা এখনই সরাসরি টেস্ট করুন
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={simulatorInput}
              onChange={(e) => setSimulatorInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTestSimulator()}
              placeholder="যেকোনো কাস্টমার মেসেজ লিখুন (যেমন: ডেলিভারি চার্জ কত, COD হবে?, ইত্যাদি)..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={() => handleTestSimulator()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Test Match</span>
          </button>
        </div>

        {/* Quick Test Prompt Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          <span className="text-[10px] text-slate-400 shrink-0 font-bold">Quick Prompts:</span>
          {[
            'ডেলিভারি চার্জ কত?',
            'ক্যাশ অন ডেলিভারি আছে?',
            'অর্ডার করতে চাই',
            'এজেন্ট নম্বর দাও',
            'রিটার্ন পলিসি কী?',
            'কোনো ডিসকাউন্ট কুপন আছে?',
          ].map((promptText, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSimulatorInput(promptText);
                handleTestSimulator(promptText);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-950/80 hover:border-emerald-500/40 border border-slate-700 text-slate-300 hover:text-emerald-200 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              {promptText}
            </button>
          ))}
        </div>

        {/* Simulator Output Box */}
        {simulatorResult?.tested && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                {simulatorResult.matchedRule ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Matched Rule: #{simulatorResult.matchedRule.priority} - {simulatorResult.matchedRule.name}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>No Rule Matched (Falls back to Gemini AI)</span>
                  </span>
                )}

                {simulatorResult.matchedKeyword && (
                  <span className="text-[11px] text-slate-300">
                    Keyword: <strong className="text-white underline">"{simulatorResult.matchedKeyword}"</strong>
                  </span>
                )}
              </div>

              {simulatorResult.matchedRule?.category && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  Category: {simulatorResult.matchedRule.category}
                </span>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs text-slate-200 whitespace-pre-line leading-relaxed">
              {simulatorResult.replyText}
            </div>

            {/* Quick Action Preview */}
            {simulatorResult.actionData?.quickButtons && simulatorResult.actionData.quickButtons.length > 0 && (
              <div className="flex items-center flex-wrap gap-2 pt-1">
                <span className="text-[10px] text-slate-400 font-bold">Interactive Action Buttons:</span>
                {simulatorResult.actionData.quickButtons.map((btn: any, i: number) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1"
                  >
                    <span>{btn.label}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {categories.map((cat) => {
              const count =
                cat === 'All'
                  ? rules.length
                  : rules.filter((r) => (r.category || 'General').toLowerCase() === cat.toLowerCase()).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules, keywords..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Rules List Cards */}
      <div className="space-y-3.5">
        {filteredRules.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">কোনো রুল খুঁজে পাওয়া যায়নি</p>
            <p className="text-xs text-slate-400 mt-1">
              অন্য কোনো ক্যাটাগরি বা কীওয়ার্ড দিয়ে সার্চ করুন অথবা নতুন রুল অ্যাড করুন।
            </p>
          </div>
        ) : (
          filteredRules.map((rule) => {
            const isDeleting = deleteConfirmId === rule.id;
            return (
              <div
                key={rule.id}
                className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-xs ${
                  rule.enabled ? 'border-slate-200 hover:border-emerald-300' : 'border-slate-200/60 bg-slate-50/70 opacity-75'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left info */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-black text-[11px]">
                        #{rule.priority}
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] border ${getCategoryBadgeColor(
                          rule.category
                        )}`}
                      >
                        {rule.category || 'General'}
                      </span>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {rule.matchType === 'contains_any'
                          ? 'Contains Any'
                          : rule.matchType === 'contains_all'
                          ? 'Contains All'
                          : rule.matchType === 'exact'
                          ? 'Exact Match'
                          : 'Intent'}
                      </span>

                      {rule.actionType && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                          <span>{rule.actionType.replace('_', ' ')}</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                        <span>{rule.name}</span>
                        {rule.nameBn && <span className="text-slate-500 font-medium text-xs">({rule.nameBn})</span>}
                      </h4>
                      {rule.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{rule.description}</p>
                      )}
                    </div>

                    {/* Keywords Tag Pills */}
                    <div className="flex items-center flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold shrink-0">Keywords:</span>
                      {(rule.keywords || []).map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>

                    {/* Reply Text Preview */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 whitespace-pre-line leading-relaxed mt-2">
                      {formatRuleTemplate(rule.replyMessageBn || rule.replyMessage, siteSettings)}
                    </div>

                    {/* Action Buttons if defined */}
                    {rule.actionData?.quickButtons && rule.actionData.quickButtons.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">Quick Buttons:</span>
                        {rule.actionData.quickButtons.map((qb, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold"
                          >
                            {qb.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Actions & Toggle */}
                  <div className="flex items-center lg:flex-col items-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* Enable/Disable Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleRule(rule.id)}
                      disabled={!canManageRules}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        rule.enabled
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-200 text-slate-600 border border-slate-300'
                      }`}
                      title="Toggle Rule Status"
                    >
                      <span className={`w-2 h-2 rounded-full ${rule.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{rule.enabled ? 'Enabled' : 'Disabled'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {/* Test Rule in Simulator */}
                      <button
                        type="button"
                        onClick={() => {
                          const firstKw = rule.keywords[0] || rule.name;
                          setSimulatorInput(firstKw);
                          handleTestSimulator(firstKw);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                        title="রুলটি সিমুলেটরে টেস্ট করুন"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate Rule */}
                      {canManageRules && (
                        <button
                          type="button"
                          onClick={() => handleDuplicateRule(rule)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                          title="ডুপ্লিকেট রুল"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Edit Rule */}
                      {canManageRules && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRule(rule);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                          title="রুল এডিট করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete Rule with confirm */}
                      {canManageRules && (
                        <>
                          {isDeleting ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteRule(rule.id)}
                                className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] hover:bg-slate-300 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(rule.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Rule Modal */}
      {isModalOpen && (
        <RuleEditorModal
          rule={editingRule}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRule(null);
          }}
          onSave={handleSaveModalRule}
          siteSettings={siteSettings}
        />
      )}
    </div>
  );
};

interface RuleEditorModalProps {
  rule: ChatBotRule | null;
  onClose: () => void;
  onSave: (rule: ChatBotRule) => void;
  siteSettings: SiteSettings;
}

const RuleEditorModal: React.FC<RuleEditorModalProps> = ({ rule, onClose, onSave, siteSettings }) => {
  const [name, setName] = useState(rule?.name || '');
  const [nameBn, setNameBn] = useState(rule?.nameBn || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [category, setCategory] = useState<'Orders' | 'Delivery' | 'Payment' | 'Support' | 'Discount' | 'General'>(
    rule?.category || 'General'
  );
  const [priority, setPriority] = useState<number>(rule?.priority || 10);
  const [matchType, setMatchType] = useState<'contains_any' | 'contains_all' | 'exact' | 'regex' | 'intent'>(
    rule?.matchType || 'contains_any'
  );
  const [keywordsText, setKeywordsText] = useState((rule?.keywords || []).join(', '));
  const [replyMessageBn, setReplyMessageBn] = useState(rule?.replyMessageBn || rule?.replyMessage || '');
  const [replyMessageEn, setReplyMessageEn] = useState(rule?.replyMessage || '');
  const [actionType, setActionType] = useState(rule?.actionType || 'auto_reply');
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);

  const handleInsertToken = (token: string, target: 'bn' | 'en') => {
    if (target === 'bn') {
      setReplyMessageBn((prev) => `${prev} ${token}`);
    } else {
      setReplyMessageEn((prev) => `${prev} ${token}`);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please enter a rule name.');
    const parsedKeywords = keywordsText
      .split(/[,|\n]/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (parsedKeywords.length === 0) {
      return alert('Please enter at least one trigger keyword.');
    }

    const newRule: ChatBotRule = {
      id: rule?.id || `rule-custom-${Date.now()}`,
      name: name.trim(),
      nameBn: nameBn.trim() || undefined,
      description: description.trim() || undefined,
      category,
      priority: Number(priority) || 10,
      matchType,
      keywords: parsedKeywords,
      actionType: actionType as any,
      replyMessage: replyMessageEn.trim() || replyMessageBn.trim(),
      replyMessageBn: replyMessageBn.trim() || undefined,
      enabled,
      actionData: rule?.actionData || {
        quickButtons:
          actionType === 'quick_buttons'
            ? [
                { label: '🛍️ পণ্য অর্ডার করতে চাই', action: 'open_order' },
                { label: '💬 WhatsApp এজেন্ট', action: 'connect_whatsapp' },
              ]
            : undefined,
      },
    };

    onSave(newRule);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {rule ? 'Edit ChatBot Rule' : 'Add New ChatBot Rule'}
              </h3>
              <p className="text-xs text-slate-500">স্বয়ংক্রিয় উত্তর ও কীওয়ার্ড ট্রিগার কনফিগার করুন</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rule Name (English) *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Delivery Charges & Times"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">রুলের নাম (বাংলা)</label>
              <input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="যেমন: ডেলিভারি চার্জ ও সময়"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Delivery">Delivery (শিপিং)</option>
                <option value="Payment">Payment (পেমেন্ট)</option>
                <option value="Orders">Orders (অর্ডার)</option>
                <option value="Support">Support (সাপোর্ট)</option>
                <option value="Discount">Discount (অফার)</option>
                <option value="General">General (সাধারণ)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Priority (1 = Highest)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Match Type</label>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="contains_any">Contains Any Keyword</option>
                <option value="contains_all">Contains All Keywords</option>
                <option value="exact">Exact Phrase Match</option>
                <option value="intent">Intent Match</option>
              </select>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Trigger Keywords (কমা দিয়ে আলাদা করুন) *
            </label>
            <textarea
              required
              rows={2}
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="delivery charge, চার্জ কত, ডেলিভারি খরচ, shipping fee..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Bengali Reply */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">স্বয়ংক্রিয় উত্তর (বাংলা) *</label>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-slate-400">Insert Variable:</span>
                <button
                  type="button"
                  onClick={() => handleInsertToken('{{deliveryChargeDhaka}}', 'bn')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Dhaka Fee
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToken('{{deliveryChargeOutside}}', 'bn')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Outside Fee
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToken('{{officialAgentNumber}}', 'bn')}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  WhatsApp No
                </button>
              </div>
            </div>
            <textarea
              required
              rows={3}
              value={replyMessageBn}
              onChange={(e) => setReplyMessageBn(e.target.value)}
              placeholder="কাস্টমার এই কীওয়ার্ড লিখলে বট কী উত্তর দেবে তা এখানে লিখুন..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
            />
          </div>

          {/* English Reply */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Auto Reply (English)</label>
            <textarea
              rows={2}
              value={replyMessageEn}
              onChange={(e) => setReplyMessageEn(e.target.value)}
              placeholder="English reply fallback..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 leading-relaxed font-sans"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span className="font-bold text-slate-800">Rule Enabled</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md shadow-emerald-900/20"
              >
                Save Rule
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
