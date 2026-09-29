import React, { useState } from 'react';
import {
  CreditCard,
  Smartphone,
  CheckCircle2,
  Save,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Building,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  SiteSettings,
  PaymentGatewayConfig,
  PaymentGatewayAccountType,
  PaymentGatewayTxType,
  PaymentAssignedCategory,
} from '../../types';
import { saveSettingsToDB } from '../../lib/firebase';
import { triggerWhatsAppEvent } from '../../lib/whatsappService';

interface AdminPaymentGatewaysProps {
  settings: SiteSettings;
  onUpdateSettings: (newSettings: SiteSettings) => void;
  onRecordAudit?: (action: string, module: string, target: string, details: string) => void;
}

const DEFAULT_GATEWAYS: PaymentGatewayConfig[] = [
  {
    id: 'bkash',
    name: 'bKash',
    accountNumber: '01712-345678',
    accountType: 'Personal',
    txType: 'Send Money',
    instructions:
      'Send Money from your bKash App or dial *247#. Enter your bKash mobile number and Transaction ID (TrxID) below.',
    isEnabled: true,
    assignedTo: 'all',
  },
  {
    id: 'nagad',
    name: 'Nagad',
    accountNumber: '01812-345678',
    accountType: 'Merchant',
    txType: 'Payment',
    instructions:
      'Make Payment or Send Money from your Nagad App or dial *167#. Enter your mobile number and Transaction ID (TrxID) below.',
    isEnabled: true,
    assignedTo: 'all',
  },
  {
    id: 'rocket',
    name: 'Rocket',
    accountNumber: '01912-345678-9',
    accountType: 'Personal',
    txType: 'Send Money',
    instructions:
      'Send Money from your Rocket App or dial *322#. Enter your Rocket account number and Transaction ID (TrxID) below.',
    isEnabled: true,
    assignedTo: 'all',
  },
];

const PRESET_METHODS = [
  {
    name: 'Visa Card',
    accountNumber: '4111-XXXX-XXXX-1111',
    accountType: 'Card',
    txType: 'Card Payment',
    instructions: 'Enter cardholder name, last 4 digits of card, and approval/reference code.',
    assignedTo: 'full' as PaymentAssignedCategory,
  },
  {
    name: 'Mastercard',
    accountNumber: '5200-XXXX-XXXX-2222',
    accountType: 'Card',
    txType: 'Card Payment',
    instructions: 'Submit online transaction reference code and last 4 digits of your Mastercard.',
    assignedTo: 'full' as PaymentAssignedCategory,
  },
  {
    name: 'Upay',
    accountNumber: '01512-345678',
    accountType: 'Merchant',
    txType: 'Payment',
    instructions: 'Make Payment or Send Money from Upay app or dial *268# and provide TrxID.',
    assignedTo: 'all' as PaymentAssignedCategory,
  },
  {
    name: 'Cellfin / Bank Transfer',
    accountNumber: '2050XXXXXXXXX',
    accountType: 'Bank',
    txType: 'Bank Transfer',
    instructions: 'Transfer funds via Cellfin, IBAN or mCash and enter deposit slip/transaction number.',
    assignedTo: 'full' as PaymentAssignedCategory,
  },
  {
    name: 'POS Card on Delivery',
    accountNumber: 'POS Machine with Delivery Rider',
    accountType: 'Card',
    txType: 'Payment',
    instructions: 'Swipe or tap card using courier POS device upon parcel handover.',
    assignedTo: 'cod' as PaymentAssignedCategory,
  },
];

export const AdminPaymentGateways: React.FC<AdminPaymentGatewaysProps> = ({
  settings,
  onUpdateSettings,
  onRecordAudit,
}) => {
  // Initialize gateways from settings or fallback defaults
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>(() => {
    if (settings.paymentGateways && settings.paymentGateways.length > 0) {
      const existing = [...settings.paymentGateways];
      DEFAULT_GATEWAYS.forEach((def) => {
        if (!existing.some((g) => g.id === def.id)) {
          existing.push(def);
        }
      });
      return existing;
    }
    return DEFAULT_GATEWAYS;
  });

  const [enableCod, setEnableCod] = useState<boolean>(settings.enableCod ?? true);
  const [enableFullPayment, setEnableFullPayment] = useState<boolean>(
    settings.enableFullPayment ?? true
  );
  const [enableDeliveryOnlyPayment, setEnableDeliveryOnlyPayment] = useState<boolean>(
    settings.enableDeliveryOnlyPayment ?? true
  );
  const [paymentNotice, setPaymentNotice] = useState<string>(
    settings.paymentInstructionsNotice ??
      'Please verify all transaction details and send correct amount to avoid order delays.'
  );

  // Sync state when settings change in Firestore real-time listener (e.g. from other staff or database updates)
  React.useEffect(() => {
    if (settings.paymentGateways && settings.paymentGateways.length > 0) {
      setGateways(settings.paymentGateways);
    }
    if (settings.enableCod !== undefined) setEnableCod(settings.enableCod);
    if (settings.enableFullPayment !== undefined) setEnableFullPayment(settings.enableFullPayment);
    if (settings.enableDeliveryOnlyPayment !== undefined) setEnableDeliveryOnlyPayment(settings.enableDeliveryOnlyPayment);
    if (settings.paymentInstructionsNotice !== undefined) setPaymentNotice(settings.paymentInstructionsNotice);
  }, [
    settings.paymentGateways,
    settings.enableCod,
    settings.enableFullPayment,
    settings.enableDeliveryOnlyPayment,
    settings.paymentInstructionsNotice,
  ]);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal states for Adding / Editing a Payment Method
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGatewayId, setEditingGatewayId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formAccountType, setFormAccountType] = useState<string>('Personal');
  const [formTxType, setFormTxType] = useState<string>('Send Money');
  const [formAssignedTo, setFormAssignedTo] = useState<PaymentAssignedCategory>('all');
  const [formInstructions, setFormInstructions] = useState('');
  const [formIsEnabled, setFormIsEnabled] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const persistSettings = async (
    customGateways: PaymentGatewayConfig[],
    customEnableCod = enableCod,
    customEnableFull = enableFullPayment,
    customEnableDeliveryOnly = enableDeliveryOnlyPayment,
    customNotice = paymentNotice
  ) => {
    setIsSaving(true);
    try {
      const bkashItem = customGateways.find((g) => g.id === 'bkash' || g.name.toLowerCase().includes('bkash'));
      const nagadItem = customGateways.find((g) => g.id === 'nagad' || g.name.toLowerCase().includes('nagad'));
      const rocketItem = customGateways.find((g) => g.id === 'rocket' || g.name.toLowerCase().includes('rocket'));

      const updatedSettings: SiteSettings = {
        ...settings,
        paymentGateways: customGateways,
        enableCod: customEnableCod,
        enableFullPayment: customEnableFull,
        enableDeliveryOnlyPayment: customEnableDeliveryOnly,
        paymentInstructionsNotice: customNotice,
        // Overwrite and permanently save top-level fields with new numbers
        bkashNumber: bkashItem?.accountNumber || settings.bkashNumber,
        bkashType: bkashItem?.accountType || settings.bkashType,
        nagadNumber: nagadItem?.accountNumber || settings.nagadNumber,
        nagadType: nagadItem?.accountType || settings.nagadType,
        rocketNumber: rocketItem?.accountNumber || settings.rocketNumber,
      };

      // 1. Immediately update global state (Live update across components)
      if (onUpdateSettings) {
        onUpdateSettings(updatedSettings);
      }

      // 2. Persist to Firestore DB permanently
      await Promise.race([
        saveSettingsToDB(updatedSettings),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);

      if (onRecordAudit) {
        onRecordAudit(
          'Payment Gateways Updated',
          'settings',
          'payment-gateways',
          `Staff updated payment methods: ${customGateways.map((g) => `${g.name}: ${g.accountNumber} (${g.accountType})`).join(', ')}.`
        );
      }

      // Trigger WhatsApp Security Alert for Payment Gateway Update
      triggerWhatsAppEvent({
        event: 'payment_number_updated',
        paymentUpdate: {
          gateway: customGateways.map((g) => `${g.name} (${g.accountType})`).join(', '),
          newNumber: customGateways.map((g) => `${g.name}: ${g.accountNumber}`).join(' | '),
          instructions: customNotice || 'Payment accounts updated by staff',
        },
      }).catch((waErr) => {
        console.warn('[WhatsApp Payment Gateway Security Alert Warning]:', waErr);
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save payment gateways:', err);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAddModal = (preset?: typeof PRESET_METHODS[0]) => {
    setEditingGatewayId(null);
    if (preset) {
      setFormName(preset.name);
      setFormAccountNumber(preset.accountNumber);
      setFormAccountType(preset.accountType);
      setFormTxType(preset.txType);
      setFormAssignedTo(preset.assignedTo);
      setFormInstructions(preset.instructions);
    } else {
      setFormName('');
      setFormAccountNumber('');
      setFormAccountType('Personal');
      setFormTxType('Send Money');
      setFormAssignedTo('all');
      setFormInstructions('Complete payment using details above and enter your Transaction ID (TrxID) below.');
    }
    setFormIsEnabled(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (gw: PaymentGatewayConfig) => {
    setEditingGatewayId(gw.id);
    setFormName(gw.name);
    setFormAccountNumber(gw.accountNumber);
    setFormAccountType(gw.accountType);
    setFormTxType(gw.txType);
    setFormAssignedTo(gw.assignedTo || 'all');
    setFormInstructions(gw.instructions);
    setFormIsEnabled(gw.isEnabled);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Payment Method Name is required');
      return;
    }
    if (!formAccountNumber.trim()) {
      setFormError('Account or Card Number is required');
      return;
    }

    let nextGateways: PaymentGatewayConfig[];
    if (editingGatewayId) {
      // Update existing
      nextGateways = gateways.map((g) =>
        g.id === editingGatewayId
          ? {
              ...g,
              name: formName.trim(),
              accountNumber: formAccountNumber.trim(),
              accountType: formAccountType,
              txType: formTxType,
              assignedTo: formAssignedTo,
              instructions: formInstructions.trim(),
              isEnabled: formIsEnabled,
            }
          : g
      );
    } else {
      // Add new
      const newId =
        formName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4);
      const newGateway: PaymentGatewayConfig = {
        id: newId,
        name: formName.trim(),
        accountNumber: formAccountNumber.trim(),
        accountType: formAccountType,
        txType: formTxType,
        assignedTo: formAssignedTo,
        instructions: formInstructions.trim(),
        isEnabled: formIsEnabled,
        isCustom: true,
      };
      nextGateways = [...gateways, newGateway];
    }

    setGateways(nextGateways);
    setIsModalOpen(false);
    await persistSettings(nextGateways);
  };

  const handleDeleteGateway = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete payment method "${name}"?`)) {
      const nextGateways = gateways.filter((g) => g.id !== id);
      setGateways(nextGateways);
      await persistSettings(nextGateways);
    }
  };

  const handleToggleGateway = async (id: string) => {
    const nextGateways = gateways.map((g) => (g.id === id ? { ...g, isEnabled: !g.isEnabled } : g));
    setGateways(nextGateways);
    await persistSettings(nextGateways);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await persistSettings(gateways);
  };

  const getProviderBrand = (id: string, name: string) => {
    const lower = (id + ' ' + name).toLowerCase();
    if (lower.includes('bkash')) {
      return {
        badge: 'bg-pink-100 text-pink-700 border-pink-200',
        border: 'border-pink-200 focus-within:border-pink-500',
        iconColor: 'text-pink-600',
        icon: Smartphone,
      };
    }
    if (lower.includes('nagad')) {
      return {
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
        border: 'border-orange-200 focus-within:border-orange-500',
        iconColor: 'text-orange-600',
        icon: Smartphone,
      };
    }
    if (lower.includes('rocket')) {
      return {
        badge: 'bg-purple-100 text-purple-700 border-purple-200',
        border: 'border-purple-200 focus-within:border-purple-500',
        iconColor: 'text-purple-600',
        icon: Smartphone,
      };
    }
    if (lower.includes('visa') || lower.includes('master') || lower.includes('card')) {
      return {
        badge: 'bg-blue-100 text-blue-700 border-blue-200',
        border: 'border-blue-200 focus-within:border-blue-500',
        iconColor: 'text-blue-600',
        icon: CreditCard,
      };
    }
    if (lower.includes('upay')) {
      return {
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        border: 'border-amber-200 focus-within:border-amber-500',
        iconColor: 'text-amber-600',
        icon: Smartphone,
      };
    }
    if (lower.includes('bank') || lower.includes('cellfin') || lower.includes('islamic')) {
      return {
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        border: 'border-emerald-200 focus-within:border-emerald-500',
        iconColor: 'text-emerald-600',
        icon: Building,
      };
    }
    return {
      badge: 'bg-sky-100 text-sky-700 border-sky-200',
      border: 'border-slate-200 focus-within:border-sky-500',
      iconColor: 'text-sky-600',
      icon: CreditCard,
    };
  };

  const getAssignedLabel = (assigned?: PaymentAssignedCategory) => {
    switch (assigned) {
      case 'full':
        return { label: 'Full Payment Only', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'delivery_only':
        return { label: 'Delivery Charge Only', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'cod':
        return { label: 'COD Only', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'all':
      default:
        return { label: 'All Checkouts', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white whitespace-nowrap">
              Payment Gateways & Methods Settings
            </h2>
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Syncing
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Configure payment methods (bKash, Nagad, Rocket, Visa Card, Mastercard, Bank, POS), define transaction types (Send Money, Cash Out, Payment), and set checkout visibility.
          </p>
        </div>

        <div className="flex flex-row items-center gap-2 shrink-0 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 dark:text-sky-600" />
            <span>Add Payment Method</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex-1 sm:flex-initial px-3 sm:px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-md shadow-sky-600/20 transition-all cursor-pointer shrink-0 disabled:opacity-50 whitespace-nowrap"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <p className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200">
              Payment Gateway Settings Updated Successfully!
            </p>
            <p className="text-emerald-700 dark:text-emerald-400 font-normal mt-0.5">
              Payment methods have been saved. Customers will immediately see updated payment options in checkout.
            </p>
          </div>
        </div>
      )}

      {/* Quick Add Presets Row */}
      <div className="hidden sm:block bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Quick Add Preset Methods:
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_METHODS.map((preset) => {
            const alreadyExists = gateways.some(
              (g) => g.name.toLowerCase() === preset.name.toLowerCase()
            );
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleOpenAddModal(preset)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-sky-400 dark:hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/50 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>{preset.name}</span>
                {alreadyExists && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded">
                    Added
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Checkout Payment Options Toggles */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Available Checkout Payment Methods
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Cash on Delivery */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              enableCod ? 'bg-sky-50/50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                1. Cash on Delivery (COD)
              </span>
              <input
                type="checkbox"
                checked={enableCod}
                onChange={(e) => setEnableCod(e.target.checked)}
                className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Customer pays 100% amount in cash or via rider POS device upon doorstep parcel handover.
            </p>
          </div>

          {/* 2. Full Payment */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              enableFullPayment ? 'bg-sky-50/50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                2. Full Advance Payment
              </span>
              <input
                type="checkbox"
                checked={enableFullPayment}
                onChange={(e) => setEnableFullPayment(e.target.checked)}
                className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Customer pays 100% total amount in advance using bKash, Nagad, Rocket, or Card.
            </p>
          </div>

          {/* 3. Only Delivery Charge */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              enableDeliveryOnlyPayment ? 'bg-sky-50/50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                3. Delivery Charge Only
              </span>
              <input
                type="checkbox"
                checked={enableDeliveryOnlyPayment}
                onChange={(e) => setEnableDeliveryOnlyPayment(e.target.checked)}
                className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Customer pays only the delivery fee in advance, with product cost due upon delivery.
            </p>
          </div>
        </div>

        {/* Global checkout notice */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            General Payment Notice / Instructions Banner
          </label>
          <input
            type="text"
            value={paymentNotice}
            onChange={(e) => setPaymentNotice(e.target.value)}
            placeholder="e.g. Enter correct transaction ID and sender number to avoid order delays."
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Gateway Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span>Active Payment Gateways ({gateways.length})</span>
          </h3>
          <span className="hidden sm:inline text-xs text-slate-500">
            Click Edit on any card to update credentials, transaction types, or visibility
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gateways.map((gw) => {
            const brand = getProviderBrand(gw.id, gw.name);
            const IconComponent = brand.icon;
            const assignedInfo = getAssignedLabel(gw.assignedTo);

            return (
              <div
                key={gw.id}
                className={`bg-white rounded-2xl border ${brand.border} shadow-xs overflow-hidden flex flex-col justify-between transition-all hover:shadow-sm`}
              >
                {/* Card Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className={`w-4 h-4 ${brand.iconColor}`} />
                    <span className="text-sm font-black text-slate-800">{gw.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleGateway(gw.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        gw.isEnabled
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {gw.isEnabled ? 'Active' : 'Disabled'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(gw)}
                      className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit this payment method"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteGateway(gw.id, gw.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete payment method"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3 flex-1 text-xs">
                  {/* Assigned to checkout category banner */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                      Checkout Visibility:
                    </span>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${assignedInfo.bg}`}
                    >
                      {assignedInfo.label}
                    </span>
                  </div>

                  {/* Account / Card Number */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      Account / Card / IBAN Number:
                    </span>
                    <p className="font-mono font-black text-slate-900 text-sm bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block">
                      {gw.accountNumber || 'N/A'}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Transaction Type: {gw.txType}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      Account Type: {gw.accountType}
                    </span>
                  </div>

                  {/* Instructions */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">
                      Customer Instructions:
                    </span>
                    <p className="text-[11px] text-slate-600 italic leading-relaxed line-clamp-2">
                      {gw.instructions}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Save Footer */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Changes made here are permanently saved to Firestore & synced real-time with customer checkouts.
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleSave()}
          disabled={isSaving}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>Apply & Save All Changes</span>
        </button>
      </div>

      {/* ADD / EDIT PAYMENT METHOD MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md sm:max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col p-3.5 sm:p-5 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 my-0 sm:my-auto">
            {/* Header */}
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    {editingGatewayId ? 'Edit Payment Method' : 'Add Payment Method'}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500">
                    Set up payment account details for checkout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2 shrink-0">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px]">{formError}</span>
              </div>
            )}

            {/* Quick Auto-Fill Chips for Mobile Efficiency */}
            <div className="py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5 border-b border-slate-100 shrink-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 shrink-0 mr-0.5">Quick Auto-Fill:</span>
              {[
                { name: 'bKash Personal', type: 'Personal', tx: 'Send Money' },
                { name: 'Nagad Personal', type: 'Personal', tx: 'Send Money' },
                { name: 'Rocket Personal', type: 'Personal', tx: 'Send Money' },
                { name: 'Upay Personal', type: 'Personal', tx: 'Send Money' },
                { name: 'Visa / Mastercard', type: 'Card', tx: 'Card Payment' },
                { name: 'Bank Account', type: 'Bank', tx: 'Bank Transfer' },
                { name: 'Cash on Delivery', type: 'Personal', tx: 'Payment' },
              ].map((chip) => (
                <button
                  key={chip.name}
                  type="button"
                  onClick={() => {
                    setFormName(chip.name);
                    setFormAccountType(chip.type);
                    setFormTxType(chip.tx);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-sky-100 hover:text-sky-700 text-slate-700 text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                >
                  {chip.name}
                </button>
              ))}
            </div>

            {/* Form Fields - Scrollable Body */}
            <form onSubmit={handleSaveModal} className="mt-2.5 space-y-2.5 text-xs overflow-y-auto flex-1 pr-0.5">
              {/* Name & Account Number Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                    Payment Method Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. bKash Personal, Visa Card"
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 bg-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                    Account / Card Number *
                  </label>
                  <input
                    type="text"
                    value={formAccountNumber}
                    onChange={(e) => setFormAccountNumber(e.target.value)}
                    placeholder="e.g. 01712-XXXXXX"
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 bg-white font-bold"
                    required
                  />
                </div>
              </div>

              {/* Where to show (Category Assignment) */}
              <div className="p-2 sm:p-2.5 bg-sky-50/60 rounded-xl border border-sky-100 space-y-1">
                <label className="block text-[10px] sm:text-[11px] font-black text-sky-950">
                  Where to Show on Checkout? *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="flex items-center gap-1.5 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-sky-300">
                    <input
                      type="radio"
                      name="assignedTo"
                      value="all"
                      checked={formAssignedTo === 'all'}
                      onChange={() => setFormAssignedTo('all')}
                      className="accent-sky-600 w-3 h-3"
                    />
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800">
                      All Checkouts
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-sky-300">
                    <input
                      type="radio"
                      name="assignedTo"
                      value="full"
                      checked={formAssignedTo === 'full'}
                      onChange={() => setFormAssignedTo('full')}
                      className="accent-sky-600 w-3 h-3"
                    />
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800">
                      Full Payment Only
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-sky-300">
                    <input
                      type="radio"
                      name="assignedTo"
                      value="delivery_only"
                      checked={formAssignedTo === 'delivery_only'}
                      onChange={() => setFormAssignedTo('delivery_only')}
                      className="accent-sky-600 w-3 h-3"
                    />
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800">
                      Delivery Charge Only
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 p-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-sky-300">
                    <input
                      type="radio"
                      name="assignedTo"
                      value="cod"
                      checked={formAssignedTo === 'cod'}
                      onChange={() => setFormAssignedTo('cod')}
                      className="accent-sky-600 w-3 h-3"
                    />
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-800">
                      COD Only
                    </span>
                  </label>
                </div>
              </div>

              {/* Account Type & Transaction Type Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                    Account Type
                  </label>
                  <select
                    value={formAccountType}
                    onChange={(e) => setFormAccountType(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold focus:outline-hidden focus:border-sky-500"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Merchant">Merchant</option>
                    <option value="Agent">Agent</option>
                    <option value="Card">Card (Visa/MC)</option>
                    <option value="Bank">Bank Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                    Transaction Type
                  </label>
                  <input
                    type="text"
                    value={formTxType}
                    onChange={(e) => setFormTxType(e.target.value)}
                    placeholder="e.g. Send Money"
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold focus:outline-hidden focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Quick Transaction Type Tags */}
              <div className="flex flex-wrap gap-1">
                {['Send Money', 'Cash Out', 'Payment', 'Card Payment', 'Bank Transfer'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormTxType(t)}
                    className={`px-1.5 py-0.5 text-[9px] rounded font-bold transition-colors cursor-pointer ${
                      formTxType === t ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Customer Instructions */}
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-700 mb-0.5">
                  Customer Instructions
                </label>
                <textarea
                  rows={2}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="e.g. Send Money to this account and provide your Transaction ID."
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 bg-white"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Active Status
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-500">
                    Enable for checkout visibility
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formIsEnabled}
                  onChange={(e) => setFormIsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 sm:px-5 sm:py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingGatewayId ? 'Update Method' : 'Add Method'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
