import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  CreditCard,
  HelpCircle,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Check,
  AlertCircle,
  Sparkles,
  ArrowUp,
  ArrowDown,
  RotateCw,
  Truck,
  Lock,
  Info,
  X,
} from 'lucide-react';
import { SiteSettings, StorePolicy } from '../../types';
import { DEFAULT_STORE_POLICIES } from '../../data/defaultPolicies';

interface AdminPoliciesSettingsProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: Partial<SiteSettings>) => Promise<void> | void;
  onRecordAudit?: (action: string, category: string, target: string, details: string) => void;
}

export const AdminPoliciesSettings: React.FC<AdminPoliciesSettingsProps> = ({
  settings,
  onUpdateSettings,
  onRecordAudit,
}) => {
  const initialPolicies =
    settings.storePolicies && settings.storePolicies.length > 0
      ? settings.storePolicies
      : DEFAULT_STORE_POLICIES;

  const [policies, setPolicies] = useState<StorePolicy[]>(initialPolicies);
  const [editingPolicy, setEditingPolicy] = useState<StorePolicy | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State for Adding / Editing Policy
  const [formSlug, setFormSlug] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formTitleBn, setFormTitleBn] = useState('');
  const [formBadgeText, setFormBadgeText] = useState('');
  const [formIconName, setFormIconName] = useState('FileText');
  const [formActive, setFormActive] = useState(true);
  const [formContent, setFormContent] = useState('');

  const handleOpenEdit = (policy: StorePolicy) => {
    setEditingPolicy(policy);
    setFormSlug(policy.slug);
    setFormTitle(policy.title);
    setFormTitleBn(policy.titleBn || '');
    setFormBadgeText(policy.badgeText || '');
    setFormIconName(policy.iconName || 'FileText');
    setFormActive(policy.active);
    setFormContent(policy.content);
    setIsNewModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingPolicy(null);
    setFormSlug(`custom-${Date.now().toString().slice(-4)}`);
    setFormTitle('');
    setFormTitleBn('');
    setFormBadgeText('');
    setFormIconName('FileText');
    setFormActive(true);
    setFormContent('## 1. Policy Section Heading\nEnter detailed policy guidelines, rules, and conditions in clear English format.\n\n- Condition 1\n- Condition 2');
    setIsNewModalOpen(true);
  };

  const handleToggleActive = (id: string) => {
    setPolicies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  const handleDeletePolicy = (id: string) => {
    const target = policies.find((p) => p.id === id);
    if (!target) return;
    if (confirm(`Are you sure you want to delete the "${target.title}" policy?`)) {
      setPolicies((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= policies.length) return;

    const copy = [...policies];
    const temp = copy[index];
    copy[index] = copy[newIdx];
    copy[newIdx] = temp;

    // re-assign order numbers
    const reordered = copy.map((p, i) => ({ ...p, order: i + 1 }));
    setPolicies(reordered);
  };

  const handleSavePolicyModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Please enter a policy title');
      return;
    }

    const cleanSlug = formSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    if (editingPolicy) {
      // Update existing
      setPolicies((prev) =>
        prev.map((p) =>
          p.id === editingPolicy.id
            ? {
                ...p,
                slug: cleanSlug || p.slug,
                title: formTitle,
                titleBn: formTitleBn,
                badgeText: formBadgeText,
                iconName: formIconName,
                active: formActive,
                content: formContent,
                updatedAt: new Date().toISOString(),
              }
            : p
        )
      );
    } else {
      // Create new
      const newPolicyItem: StorePolicy = {
        id: `pol-${Date.now()}`,
        slug: cleanSlug || `custom-${Date.now()}`,
        title: formTitle,
        titleBn: formTitleBn,
        badgeText: formBadgeText,
        iconName: formIconName,
        active: formActive,
        content: formContent,
        order: policies.length + 1,
        updatedAt: new Date().toISOString(),
      };
      setPolicies((prev) => [...prev, newPolicyItem]);
    }

    setIsNewModalOpen(false);
  };

  const handleResetDefaults = () => {
    if (confirm('Are you sure you want to reload all default store policies?')) {
      setPolicies(DEFAULT_STORE_POLICIES);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Find individual policy texts to sync backward compatibility fields
      const returnPol = policies.find((p) => p.slug === 'return')?.content || '';
      const exchangePol = policies.find((p) => p.slug === 'exchange')?.content || '';
      const privacyPol = policies.find((p) => p.slug === 'privacy')?.content || '';
      const termsPol = policies.find((p) => p.slug === 'terms')?.content || '';
      const refundPol = policies.find((p) => p.slug === 'refund')?.content || '';

      await onUpdateSettings({
        storePolicies: policies,
        returnPolicy: returnPol,
        exchangePolicy: exchangePol,
        privacyPolicy: privacyPol,
        termsOfService: termsPol,
        refundPolicy: refundPol,
      });

      if (onRecordAudit) {
        onRecordAudit(
          'Store Policies Updated',
          'settings',
          'site-policies',
          `Updated ${policies.length} store policies (Return, Exchange, Privacy, Terms, etc.)`
        );
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save store policies:', err);
      alert('Failed to save policies. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getIconComponent = (iconName?: string) => {
    switch (iconName) {
      case 'RotateCcw':
        return RotateCcw;
      case 'RefreshCw':
        return RefreshCw;
      case 'ShieldCheck':
        return ShieldCheck;
      case 'FileText':
        return FileText;
      case 'CreditCard':
        return CreditCard;
      case 'HelpCircle':
        return HelpCircle;
      case 'Truck':
        return Truck;
      case 'Lock':
        return Lock;
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Admin Control Panel • Privacy Policy & System Policies</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Privacy Policy & Store Policy Management
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Manage Privacy Policy, Terms of Service, Return Policy, Exchange Policy, and Refund Policy in 100% English. Create, edit, hide, or reorder store policies seamlessly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Policy</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Reset to default English policy templates"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2 ${
              saveSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isSaving ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saveSuccess ? 'Policies Saved!' : 'Save All Policies'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>All store policies saved successfully and updated on the live website!</span>
        </div>
      )}

      {/* Main Table / List of Policies */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Active Store Policies ({policies.length})</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Active policies are live on the storefront and customer help center
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {policies.map((policy, idx) => {
            const IconComp = getIconComponent(policy.iconName);

            return (
              <div
                key={policy.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                  policy.active
                    ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                    : 'bg-slate-50/50 dark:bg-slate-800/20 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      policy.active
                        ? 'bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {policy.title}
                      </span>
                      {policy.titleBn && (
                        <span className="text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/80 px-2 py-0.5 rounded-md border border-sky-100 dark:border-sky-800">
                          {policy.titleBn}
                        </span>
                      )}
                      {policy.badgeText && (
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {policy.badgeText}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          policy.active
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {policy.active ? '● Active' : '○ Hidden'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Slug Key: <code className="text-slate-800 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{policy.slug}</code>
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 max-w-3xl leading-relaxed">
                      {policy.content.replace(/[#*`]/g, '').slice(0, 150)}...
                    </p>
                  </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Reorder Buttons */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === policies.length - 1}
                      className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle Active Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(policy.id)}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                      policy.active
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {policy.active ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Hidden</span>
                      </>
                    )}
                  </button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(policy)}
                    className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeletePolicy(policy.id)}
                    className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs transition-colors cursor-pointer"
                    title="Delete Policy"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button Footer */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl transition-all cursor-pointer flex items-center gap-2"
        >
          {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save All Policies</span>
        </button>
      </div>

      {/* Add / Edit Policy Modal Popup */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/20 rounded-xl text-sky-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {editingPolicy ? 'Edit Policy' : 'Add New Policy'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure store policy details and legal disclosures for customers
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSavePolicyModal} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Policy Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Privacy Policy"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Badge Subtitle / Short Tag
                  </label>
                  <input
                    type="text"
                    value={formBadgeText}
                    onChange={(e) => setFormBadgeText(e.target.value)}
                    placeholder="e.g. 100% Data Confidentiality"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Slug Key (URL & Internal Key)
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g. privacy or terms"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Icon Selection
                  </label>
                  <select
                    value={formIconName}
                    onChange={(e) => setFormIconName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-white"
                  >
                    <option value="ShieldCheck">ShieldCheck (Privacy / Security)</option>
                    <option value="FileText">FileText (Terms / Document)</option>
                    <option value="RotateCcw">RotateCcw (Return / 7-Day)</option>
                    <option value="RefreshCw">RefreshCw (Exchange / Swap)</option>
                    <option value="CreditCard">CreditCard (Refund / Payment)</option>
                    <option value="Truck">Truck (Delivery / Shipping)</option>
                    <option value="HelpCircle">HelpCircle (FAQ / Support)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Active (Visible on Storefront)
                    </span>
                  </label>
                </div>
              </div>

              {/* Policy Content Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Policy Content (Markdown Format)
                  </label>

                  {/* Helper Buttons */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setFormContent((prev) => prev + '\n## 1. New Section Heading')}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    >
                      + Heading
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormContent((prev) => prev + '\n- Bullet point information')}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    >
                      + Bullet
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormContent((prev) => prev + '\n1. First step')}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                    >
                      + Step
                    </button>
                  </div>
                </div>

                <textarea
                  rows={12}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="## 1. Section Heading..."
                  className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs font-mono text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500 leading-relaxed"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Tips: Use <code className="bg-slate-200 px-1 rounded">## Heading</code>, <code className="bg-slate-200 px-1 rounded">- Bullet</code>, and <code className="bg-slate-200 px-1 rounded">**Bold Text**</code> for rich formatting.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Policy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
