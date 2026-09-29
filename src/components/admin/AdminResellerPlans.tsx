import React, { useState } from 'react';
import {
  Boxes,
  ShieldCheck,
  DollarSign,
  Package,
  Layers,
  Percent,
  Check,
  Plus,
  Trash2,
  Edit,
  Save,
  RotateCcw,
  Zap,
  TrendingUp,
  Star,
  Users,
  CheckCircle2,
  XCircle,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { ResellerPlan, ResellerPlanId } from '../../types/reseller';
import { getResellerPlans, saveResellerPlans, DEFAULT_RESELLER_PLANS, getResellers } from '../../lib/resellerStorage';
import { PlanRuleMatrixManager } from './PlanRuleMatrixManager';
import { useLanguage } from '../../context/LanguageContext';

interface AdminResellerPlansProps {
  onPlanUpdated?: () => void;
  defaultSubTab?: 'plans' | 'matrix';
}

export const AdminResellerPlans: React.FC<AdminResellerPlansProps> = ({ onPlanUpdated, defaultSubTab = 'matrix' }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [activePlanView, setActivePlanView] = useState<'matrix' | 'plans'>(defaultSubTab);
  const [plans, setPlans] = useState<ResellerPlan[]>(() => getResellerPlans());
  const [resellers] = useState(() => getResellers());
  const [editingPlan, setEditingPlan] = useState<ResellerPlan | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [newFeatureInput, setNewFeatureInput] = useState('');
  const [editFeatures, setEditFeatures] = useState<string[]>([]);

  const handleOpenEdit = (plan: ResellerPlan) => {
    setEditingPlan({ ...plan, features: [...plan.features] });
    setEditFeatures([...plan.features]);
    setNewFeatureInput('');
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const updatedPlan: ResellerPlan = {
      ...editingPlan,
      features: editFeatures.filter((f) => f.trim() !== ''),
    };

    const nextPlans = plans.map((p) => (p.id === updatedPlan.id ? updatedPlan : p));
    setPlans(nextPlans);
    saveResellerPlans(nextPlans);
    setEditingPlan(null);
    if (onPlanUpdated) onPlanUpdated();

    setSaveSuccessMsg(`Reseller Plan "${updatedPlan.name}" updated successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleCreateNewPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const nextPlans = [...plans, { ...editingPlan, features: editFeatures.filter((f) => f.trim() !== '') }];
    setPlans(nextPlans);
    saveResellerPlans(nextPlans);
    setEditingPlan(null);
    setIsCreateModalOpen(false);
    if (onPlanUpdated) onPlanUpdated();

    setSaveSuccessMsg(`New Reseller Plan "${editingPlan.name}" created!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleTogglePlanStatus = (planId: ResellerPlanId) => {
    const nextPlans = plans.map((p) => {
      if (p.id === planId) {
        return {
          ...p,
          status: (p.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive',
        };
      }
      return p;
    });
    setPlans(nextPlans);
    saveResellerPlans(nextPlans);
    if (onPlanUpdated) onPlanUpdated();
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all Reseller Membership Plans to standard defaults?')) {
      setPlans(DEFAULT_RESELLER_PLANS);
      saveResellerPlans(DEFAULT_RESELLER_PLANS);
      if (onPlanUpdated) onPlanUpdated();
      setSaveSuccessMsg('Reseller Plans reset to factory defaults.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  const handleAddFeature = () => {
    if (newFeatureInput.trim()) {
      setEditFeatures([...editFeatures, newFeatureInput.trim()]);
      setNewFeatureInput('');
    }
  };

  const handleRemoveFeature = (idx: number) => {
    setEditFeatures(editFeatures.filter((_, i) => i !== idx));
  };

  const getResellerCountForPlan = (planId: string) => {
    return resellers.filter((r) => r.planId === planId).length;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 text-xs">
      {saveSuccessMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 px-4 py-3 rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-xs">{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-700 dark:text-emerald-300 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isBn ? 'রিসেলার মেম্বারশিপ প্ল্যান ও প্রাইজ কনফিগ' : 'Reseller Membership Plans & Pricing'}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {isBn ? 'বেসিক (ফ্রি) • স্ট্যান্ডার্ড • প্রিমিয়াম' : 'Basic (Free) • Standard • Premium'}
                </span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                {isBn
                  ? 'মেম্বারশিপ টায়ার, মাসিক অর্ডার লিমিট, কাস্টমার ডিরেক্টরি ক্যাপাসিটি এবং বোনাস মার্জিন কনফিগার করুন।'
                  : 'Configure membership tiers, monthly order limits, customer directory capacities, and bonus profit margins.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isBn ? 'ডিফল্ট রিসেট' : 'Reset Defaults'}</span>
          </button>
          <button
            onClick={() => {
              const newPlanId = `reseller_custom_${Date.now().toString().slice(-4)}` as ResellerPlanId;
              const newBlankPlan: ResellerPlan = {
                id: newPlanId,
                name: 'VIP Elite Reseller',
                monthlyPrice: 990,
                yearlyPrice: 9900,
                maxMonthlyOrders: 500,
                maxCustomers: 1000,
                productAccessLevel: 'all',
                bonusProfitPercentage: 3,
                analyticsLevel: 'advanced',
                marketingToolsEnabled: true,
                productSharingEnabled: true,
                bulkOrderingEnabled: true,
                referralRewardEnabled: true,
                vipEligible: true,
                supportLevel: 'priority',
                features: ['500 Orders / Month', '3% Bonus Profit', 'Priority Dispatch'],
                status: 'active',
              };
              setEditingPlan(newBlankPlan);
              setEditFeatures(newBlankPlan.features);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{isBn ? 'নতুন টিয়ার যোগ করুন' : 'Add Reseller Tier'}</span>
          </button>
        </div>
      </div>

      {/* Primary Sub-View Selector */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
        <button
          type="button"
          onClick={() => setActivePlanView('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activePlanView === 'matrix'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{isBn ? 'রিসেলার ফিচার ও ড্যাশবোর্ড ট্যাব রুল ম্যাট্রিক্স' : 'Reseller Feature & Dashboard Tab Rule Matrix'}</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-white/20 text-white">
            {isBn ? 'সক্রিয়' : 'Live'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActivePlanView('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activePlanView === 'plans'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>{isBn ? 'মেম্বারশিপ প্ল্যান ও প্রাইজ কনফিগারেশন' : 'Membership Tiers & Pricing'}</span>
        </button>
      </div>

      {activePlanView === 'matrix' ? (
        <PlanRuleMatrixManager initialType="reseller" hideTypeSwitcher={true} onMatrixChanged={onPlanUpdated} />
      ) : (
        <>
          {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isBasic = plan.id === 'basic';
          const isPremium = plan.id === 'premium';
          const isStandard = plan.id === 'standard';
          const count = getResellerCountForPlan(plan.id);

          return (
            <div
              key={plan.id}
              className={`rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative shadow-sm ${
                plan.status === 'inactive'
                  ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                  : isPremium
                  ? 'bg-gradient-to-b from-amber-500/5 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-300 dark:border-amber-800/80 ring-1 ring-amber-500/20'
                  : isStandard
                  ? 'bg-gradient-to-b from-emerald-500/5 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-300 dark:border-emerald-800/80 ring-1 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="p-5 pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      isPremium
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300'
                        : isStandard
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300'
                    }`}
                  >
                    {isPremium ? 'VIP High-Volume' : isStandard ? 'Active Resellers' : '100% Free Forever'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {count} {count === 1 ? 'Reseller' : 'Resellers'}
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{plan.name}</h3>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {plan.monthlyPrice === 0 ? 'Free' : `৳${plan.monthlyPrice.toLocaleString('en-BD')}`}
                  </span>
                  {plan.monthlyPrice > 0 && <span className="text-xs text-slate-500 font-semibold">/ month</span>}
                </div>

                {plan.yearlyPrice > 0 && (
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ৳{plan.yearlyPrice.toLocaleString('en-BD')} / year (Billed annually)
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-semibold uppercase text-slate-400">Order Limit</p>
                    <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                      {plan.maxMonthlyOrders === -1 ? 'Unlimited' : `${plan.maxMonthlyOrders} Orders / Mo`}
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-semibold uppercase text-slate-400">Bonus Profit</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                      +{plan.bonusProfitPercentage}% on orders
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Features</p>
                  <ul className="space-y-1.5">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePlanStatus(plan.id)}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  {plan.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(plan)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Plan</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Edit Modal */}
      {(editingPlan !== null || isCreateModalOpen) && editingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isCreateModalOpen ? 'Create New Reseller Tier' : `Edit Plan: ${editingPlan.name}`}
              </h3>
              <button onClick={() => setEditingPlan(null)} className="text-slate-500 font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={isCreateModalOpen ? handleCreateNewPlan : handleSavePlan} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Monthly Fee (৳) (0 = Free)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingPlan.monthlyPrice}
                    onChange={(e) => setEditingPlan({ ...editingPlan, monthlyPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Max Monthly Orders (-1 = Unlimited)</label>
                  <input
                    type="number"
                    min="-1"
                    value={editingPlan.maxMonthlyOrders}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxMonthlyOrders: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Bonus Profit Percentage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={editingPlan.bonusProfitPercentage}
                    onChange={(e) => setEditingPlan({ ...editingPlan, bonusProfitPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-emerald-600"
                  />
                </div>
              </div>

              {/* Bullet Features */}
              <div className="space-y-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold">Features Included</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeatureInput}
                    onChange={(e) => setNewFeatureInput(e.target.value)}
                    placeholder="Add feature..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button type="button" onClick={handleAddFeature} className="px-3 py-2 bg-slate-900 text-white rounded-xl font-bold">
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  {editFeatures.map((f, i) => (
                    <div key={i} className="flex justify-between items-center p-1.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-800 dark:text-slate-200">{f}</span>
                      <button type="button" onClick={() => handleRemoveFeature(i)} className="text-rose-500 hover:text-rose-700 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5">
                  <Save className="w-4 h-4" />
                  <span>Save Plan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
