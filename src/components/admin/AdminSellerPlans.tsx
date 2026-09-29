import React, { useState } from 'react';
import {
  Sparkles,
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
  HelpCircle,
  Sliders,
  Store,
  ArrowRight,
  Shield,
  Eye,
} from 'lucide-react';
import { SellerPlan, SellerPlanId } from '../../types/seller';
import { getSellerPlans, saveSellerPlans, DEFAULT_SELLER_PLANS, getSellers } from '../../lib/sellerStorage';
import { PlanRuleMatrixManager } from './PlanRuleMatrixManager';

interface AdminSellerPlansProps {
  onPlanUpdated?: () => void;
  defaultSubTab?: 'plans' | 'matrix';
}

export const AdminSellerPlans: React.FC<AdminSellerPlansProps> = ({ onPlanUpdated, defaultSubTab = 'matrix' }) => {
  const [activePlanView, setActivePlanView] = useState<'matrix' | 'plans'>(defaultSubTab);
  const [plans, setPlans] = useState<SellerPlan[]>(() => getSellerPlans());
  const [sellers] = useState(() => getSellers());
  const [editingPlan, setEditingPlan] = useState<SellerPlan | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Simulation test amount for Commission Calculator
  const [simulationAmount, setSimulationAmount] = useState<number>(2500);

  // New plan form state
  const [newFeatureInput, setNewFeatureInput] = useState('');
  const [editFeatures, setEditFeatures] = useState<string[]>([]);

  const handleOpenEdit = (plan: SellerPlan) => {
    setEditingPlan({ ...plan, features: [...plan.features] });
    setEditFeatures([...plan.features]);
    setNewFeatureInput('');
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const updatedPlan: SellerPlan = {
      ...editingPlan,
      features: editFeatures.filter((f) => f.trim() !== ''),
    };

    const nextPlans = plans.map((p) => (p.id === updatedPlan.id ? updatedPlan : p));
    setPlans(nextPlans);
    saveSellerPlans(nextPlans);
    setEditingPlan(null);
    if (onPlanUpdated) onPlanUpdated();

    setSaveSuccessMsg(`Plan "${updatedPlan.name}" updated successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleCreateNewPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const nextPlans = [...plans, { ...editingPlan, features: editFeatures.filter((f) => f.trim() !== '') }];
    setPlans(nextPlans);
    saveSellerPlans(nextPlans);
    setEditingPlan(null);
    setIsCreateModalOpen(false);
    if (onPlanUpdated) onPlanUpdated();

    setSaveSuccessMsg(`New plan "${editingPlan.name}" created successfully!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleTogglePlanStatus = (planId: SellerPlanId) => {
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
    saveSellerPlans(nextPlans);
    if (onPlanUpdated) onPlanUpdated();
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all Seller Subscription Plans to standard marketplace defaults?')) {
      setPlans(DEFAULT_SELLER_PLANS);
      saveSellerPlans(DEFAULT_SELLER_PLANS);
      if (onPlanUpdated) onPlanUpdated();
      setSaveSuccessMsg('Seller Plans have been reset to factory defaults.');
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

  // Get active seller count per plan
  const getSellerCountForPlan = (planId: string) => {
    return sellers.filter((s) => s.planId === planId).length;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150 text-xs">
      {/* Toast alert */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 px-4 py-3 rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-xs">{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Seller Subscription Plans</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  Basic • Standard • Premium
                </span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                Configure marketplace tiers, commission percentages, product upload limits, and premium SaaS seller features.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Reset to default marketplace tiers"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={() => {
              const newPlanId = `custom_${Date.now().toString().slice(-4)}` as SellerPlanId;
              const newBlankPlan: SellerPlan = {
                id: newPlanId,
                name: 'Custom VIP Plan',
                monthlyPrice: 1490,
                yearlyPrice: 14900,
                productLimit: 300,
                commissionRate: 8,
                imageLimitPerProduct: 10,
                features: ['Custom High-Volume Seller Tier', '8% Marketplace Commission', 'Priority Support'],
                featuredProductSlots: 5,
                analyticsLevel: 'advanced',
                supportLevel: 'priority',
                customDomainSupport: false,
                couponToolsEnabled: true,
                promotionalToolsEnabled: true,
                status: 'active',
              };
              setEditingPlan(newBlankPlan);
              setEditFeatures(newBlankPlan.features);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Tier</span>
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
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Feature & Tab Rule Matrix (চেকবক্স রুল ম্যাট্রিক্স)</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-black bg-white/20 text-white">
            Live
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActivePlanView('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activePlanView === 'plans'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Plans Pricing & Commission Tiers (প্ল্যান কনফিগারেশন)</span>
        </button>
      </div>

      {activePlanView === 'matrix' ? (
        <PlanRuleMatrixManager initialType="seller" onMatrixChanged={onPlanUpdated} />
      ) : (
        <>
          {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Active Plans</p>
            <p className="text-base font-black text-slate-900 dark:text-white">
              {plans.filter((p) => p.status === 'active').length} of {plans.length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Commission Range</p>
            <p className="text-base font-black text-slate-900 dark:text-white">
              {Math.min(...plans.map((p) => p.commissionRate))}% – {Math.max(...plans.map((p) => p.commissionRate))}%
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Total Sellers</p>
            <p className="text-base font-black text-slate-900 dark:text-white">{sellers.length} registered</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">Top Monthly Price</p>
            <p className="text-base font-black text-slate-900 dark:text-white">
              ৳{Math.max(...plans.map((p) => p.monthlyPrice)).toLocaleString('en-BD')}/mo
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Commission Simulator Tool */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-900/10 via-slate-900/5 to-indigo-900/10 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="font-black text-slate-900 dark:text-white text-xs">
              Live Commission Simulator (কমিশন ক্যালকুলেটর)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">Test Order Amount:</span>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
              <input
                type="number"
                min="100"
                step="100"
                value={simulationAmount}
                onChange={(e) => setSimulationAmount(Math.max(10, parseFloat(e.target.value) || 0))}
                className="w-28 pl-6 pr-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {plans.map((p) => {
            const commission = (simulationAmount * p.commissionRate) / 100;
            const sellerNet = simulationAmount - commission;
            return (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                  <p className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">{p.commissionRate}% Commission</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Seller: ৳{sellerNet.toLocaleString('en-BD')}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    KenaX Cut: ৳{commission.toLocaleString('en-BD')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Plans Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isBasic = plan.id === 'basic';
          const isStandard = plan.id === 'standard';
          const isPremium = plan.id === 'premium';
          const sellerCount = getSellerCountForPlan(plan.id);

          return (
            <div
              key={plan.id}
              className={`rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative shadow-sm ${
                plan.status === 'inactive'
                  ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                  : isPremium
                  ? 'bg-gradient-to-b from-purple-500/5 to-white dark:from-purple-950/20 dark:to-slate-900 border-purple-300 dark:border-purple-800/80 ring-1 ring-purple-500/20'
                  : isStandard
                  ? 'bg-gradient-to-b from-sky-500/5 to-white dark:from-sky-950/20 dark:to-slate-900 border-sky-300 dark:border-sky-800/80 ring-1 ring-sky-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Top Banner & Badges */}
              <div className="p-5 pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isPremium
                          ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                          : isStandard
                          ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isPremium ? 'Enterprise Tier' : isStandard ? 'Growing Sellers' : 'Starter Tier'}
                    </span>
                    {plan.status === 'inactive' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
                        Inactive
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {sellerCount} {sellerCount === 1 ? 'Seller' : 'Sellers'}
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{plan.name}</h3>

                {/* Price Display */}
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

                {/* Core Parameters Cards */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-semibold uppercase text-slate-400">Product Limit</p>
                    <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                      {plan.productLimit === -1 ? 'Unlimited' : `${plan.productLimit} Products`}
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-semibold uppercase text-slate-400">Commission</p>
                    <p className="font-bold text-sky-600 dark:text-sky-400 text-xs mt-0.5">
                      {plan.commissionRate}% per sale
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-semibold uppercase text-slate-400">Images / Item</p>
                    <p className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                      Up to {plan.imageLimitPerProduct} images
                    </p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-semibold uppercase text-slate-400">Featured Slots</p>
                    <p className="font-bold text-purple-600 dark:text-purple-400 text-xs mt-0.5">
                      {plan.featuredProductSlots > 0 ? `${plan.featuredProductSlots} Spotlight Slots` : 'None'}
                    </p>
                  </div>
                </div>

                {/* Feature Bullet Points */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Included Features</p>
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

              {/* Bottom Action Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePlanStatus(plan.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                    plan.status === 'active'
                      ? 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {plan.status === 'active' ? 'Deactivate' : 'Activate Plan'}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(plan)}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
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

      {/* Edit / Create Plan Modal */}
      {(editingPlan !== null || isCreateModalOpen) && editingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isCreateModalOpen ? 'Create New Subscription Plan' : `Configure Plan: ${editingPlan.name}`}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Define limits, commission rate, pricing, and features.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingPlan(null);
                  setIsCreateModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form
              onSubmit={isCreateModalOpen ? handleCreateNewPlan : handleSavePlan}
              className="p-5 overflow-y-auto space-y-4 flex-1 text-xs"
            >
              {/* Row 1: Plan Name & ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Plan Display Name *</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="e.g. Standard Pro"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Plan Identifier (Key)</label>
                  <input
                    type="text"
                    disabled={!isCreateModalOpen}
                    value={editingPlan.id}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') as SellerPlanId })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 font-mono"
                  />
                </div>
              </div>

              {/* Row 2: Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Monthly Price (৳ BDT) <span className="text-slate-400 font-normal">(0 = Free)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editingPlan.monthlyPrice}
                      onChange={(e) => setEditingPlan({ ...editingPlan, monthlyPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Yearly Price (৳ BDT) <span className="text-slate-400 font-normal">(Discounted)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editingPlan.yearlyPrice}
                      onChange={(e) => setEditingPlan({ ...editingPlan, yearlyPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Commission & Product Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-sky-50/70 dark:bg-sky-950/40 p-3.5 rounded-2xl border border-sky-200 dark:border-sky-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sky-900 dark:text-sky-200 font-black">Marketplace Commission (%) *</label>
                    <span className="text-sm font-black text-sky-600 dark:text-sky-400">{editingPlan.commissionRate}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="0.5"
                    value={editingPlan.commissionRate}
                    onChange={(e) => setEditingPlan({ ...editingPlan, commissionRate: parseFloat(e.target.value) || 1 })}
                    className="w-full accent-sky-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Platform retains {editingPlan.commissionRate}% from each delivered seller order.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Product Upload Limit <span className="text-slate-400 font-normal">(-1 for Unlimited)</span>
                  </label>
                  <input
                    type="number"
                    min="-1"
                    required
                    value={editingPlan.productLimit}
                    onChange={(e) => setEditingPlan({ ...editingPlan, productLimit: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    {editingPlan.productLimit === -1
                      ? 'Sellers can upload infinite products.'
                      : `Max ${editingPlan.productLimit} products can be published.`}
                  </p>
                </div>
              </div>

              {/* Row 4: Image & Featured Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Images Limit Per Product
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={editingPlan.imageLimitPerProduct}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, imageLimitPerProduct: parseInt(e.target.value) || 4 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Featured Product Slots (Spotlight)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={editingPlan.featuredProductSlots}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, featuredProductSlots: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Row 5: Support & Analytics Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Support Level</label>
                  <select
                    value={editingPlan.supportLevel}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, supportLevel: e.target.value as SellerPlan['supportLevel'] })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="standard">Standard Support (Email / Ticket)</option>
                    <option value="priority">Priority Hotline Support</option>
                    <option value="dedicated_24_7">24/7 Dedicated Account Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Analytics Access</label>
                  <select
                    value={editingPlan.analyticsLevel}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, analyticsLevel: e.target.value as SellerPlan['analyticsLevel'] })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="basic">Basic Analytics (Orders & Sales)</option>
                    <option value="advanced">Advanced (Product conversion & Trends)</option>
                    <option value="enterprise">Enterprise (Live visitor telemetry & Heatmaps)</option>
                  </select>
                </div>
              </div>

              {/* Row 6: Tool Toggles */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="font-bold text-slate-900 dark:text-white mb-2">Seller Tool Permissions</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.couponToolsEnabled}
                      onChange={(e) => setEditingPlan({ ...editingPlan, couponToolsEnabled: e.target.checked })}
                      className="rounded text-sky-600 w-4 h-4"
                    />
                    <span>Coupon Tools</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.promotionalToolsEnabled}
                      onChange={(e) => setEditingPlan({ ...editingPlan, promotionalToolsEnabled: e.target.checked })}
                      className="rounded text-sky-600 w-4 h-4"
                    />
                    <span>Promotional Tools</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.customDomainSupport}
                      onChange={(e) => setEditingPlan({ ...editingPlan, customDomainSupport: e.target.checked })}
                      className="rounded text-sky-600 w-4 h-4"
                    />
                    <span>Custom Domain / Brand</span>
                  </label>
                </div>
              </div>

              {/* Row 7: Feature Bullet Points Manager */}
              <div className="space-y-2">
                <label className="block text-slate-700 dark:text-slate-300 font-bold">
                  Plan Bullet Points (বৈশিষ্ট্যসমূহ)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeatureInput}
                    onChange={(e) => setNewFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    placeholder="Type a feature and click Add (e.g. 24/7 Priority Support Hotline)..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  {editFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <span className="text-slate-800 dark:text-slate-200 flex-1">{feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editFeatures.length === 0 && (
                    <p className="text-slate-400 text-center py-2">No features listed yet.</p>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlan(null);
                    setIsCreateModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isCreateModalOpen ? 'Create Plan' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
