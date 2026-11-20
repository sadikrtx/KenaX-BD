import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  RotateCcw,
  Sparkles,
  Package,
  Truck,
  Megaphone,
  Percent,
  SearchCheck,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  ArrowRight,
  HelpCircle,
  TrendingUp,
  Copy,
  Check,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface AppliedPricePayload {
  sellingPrice: number;
  costPrice: number;
  landedCost: number;
  totalTrueCost: number;
  netProfit: number;
  netMarginPercent: number;
  costBasis: 'total' | 'landed';
}

interface SellingPriceCalculatorProps {
  mode?: 'standalone' | 'embedded';
  initialPurchasePrice?: number;
  initialSellingPrice?: number;
  onApplyPrice?: (payload: AppliedPricePayload) => void;
}

interface CalculatorInputs {
  basePurchasePrice: string;
  transportImportCost: string;
  packagingCost: string;
  deliverySubsidy: string;
  codFee: string;
  otherOpsCost: string;
  adCostMode: 'direct' | 'helper';
  directAdCost: string;
  adsManagerCpo: string;
  deliverySuccessRate: string;
  returnReserve: string;
  targetMarginPercent: number;
  competitorPrice: string;
}

const SAMPLE_INPUTS: CalculatorInputs = {
  basePurchasePrice: '560',
  transportImportCost: '20',
  packagingCost: '20',
  deliverySubsidy: '25',
  codFee: '10',
  otherOpsCost: '15',
  adCostMode: 'direct',
  directAdCost: '90',
  adsManagerCpo: '70',
  deliverySuccessRate: '78',
  returnReserve: '10',
  targetMarginPercent: 25,
  competitorPrice: '',
};

const EMPTY_INPUTS: CalculatorInputs = {
  basePurchasePrice: '',
  transportImportCost: '',
  packagingCost: '',
  deliverySubsidy: '',
  codFee: '',
  otherOpsCost: '',
  adCostMode: 'direct',
  directAdCost: '',
  adsManagerCpo: '',
  deliverySuccessRate: '',
  returnReserve: '',
  targetMarginPercent: 25,
  competitorPrice: '',
};

const parseNum = (val: string): number => {
  const parsed = parseFloat(val);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const formatBDT = (val: number, decimals = 0): string => {
  const safe = Number.isFinite(val) ? val : 0;
  return `৳${safe.toLocaleString('en-BD', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

const MARGIN_PRESETS = [15, 20, 25, 30, 35];

export const SellingPriceCalculator: React.FC<SellingPriceCalculatorProps> = ({
  mode = 'standalone',
  initialPurchasePrice,
  onApplyPrice,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const isEmbedded = mode === 'embedded';

  const [isSampleMode, setIsSampleMode] = useState<boolean>(() => !isEmbedded);

  const [inputs, setInputs] = useState<CalculatorInputs>(() => {
    if (isEmbedded) {
      if (initialPurchasePrice && initialPurchasePrice > 0) {
        return {
          ...EMPTY_INPUTS,
          basePurchasePrice: String(Math.round(initialPurchasePrice)),
        };
      }
      return { ...EMPTY_INPUTS };
    }
    return { ...SAMPLE_INPUTS };
  });

  const [manualFinalPrice, setManualFinalPrice] = useState<string>('');
  const [isFinalPriceManual, setIsFinalPriceManual] = useState<boolean>(false);
  const [costBasisToApply, setCostBasisToApply] = useState<'total' | 'landed'>('total');
  const [showFormulaTip, setShowFormulaTip] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Sync product cost when embedded calculator opens on an existing product
  useEffect(() => {
    if (!isEmbedded) return;
    if (initialPurchasePrice && initialPurchasePrice > 0) {
      setInputs((prev) =>
        prev.basePurchasePrice === ''
          ? { ...prev, basePurchasePrice: String(Math.round(initialPurchasePrice)) }
          : prev
      );
    }
  }, [isEmbedded, initialPurchasePrice]);

  // Focusing any cost input while in Sample Mode clears ALL sample values cleanly
  // so only the user's new calculation is computed and displayed.
  const clearSampleIfActive = () => {
    if (!isSampleMode) return;
    setIsSampleMode(false);
    setIsFinalPriceManual(false);
    setManualFinalPrice('');
    setInputs((prev) => ({
      ...EMPTY_INPUTS,
      targetMarginPercent: prev.targetMarginPercent,
      adCostMode: prev.adCostMode,
    }));
  };

  // Updating any cost input clears sample mode AND resets any stale manual final price
  const updateCostField = <K extends keyof CalculatorInputs>(
    field: K,
    value: CalculatorInputs[K]
  ) => {
    setIsFinalPriceManual(false);
    setManualFinalPrice('');
    if (isSampleMode) {
      setIsSampleMode(false);
      setInputs((prev) => ({
        ...EMPTY_INPUTS,
        targetMarginPercent: prev.targetMarginPercent,
        adCostMode: prev.adCostMode,
        [field]: value,
      }));
      return;
    }
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const updateMargin = (nextMargin: number) => {
    const safe = Math.min(90, Math.max(0, Number.isFinite(nextMargin) ? nextMargin : 0));
    setIsFinalPriceManual(false);
    setManualFinalPrice('');
    setInputs((prev) => ({ ...prev, targetMarginPercent: safe }));
  };

  const updateAdCostMode = (nextMode: 'direct' | 'helper') => {
    setIsFinalPriceManual(false);
    setManualFinalPrice('');
    setInputs((prev) => ({ ...prev, adCostMode: nextMode }));
  };

  const updateCompetitorPrice = (val: string) => {
    setInputs((prev) => ({ ...prev, competitorPrice: val }));
  };

  // Core 5-step real-time calculations
  const calc = useMemo(() => {
    // Step 1: Landed Cost
    const basePurchase = parseNum(inputs.basePurchasePrice);
    const transportImport = parseNum(inputs.transportImportCost);
    const actualProductCost = basePurchase + transportImport;

    // Step 2: Operational Cost
    const packaging = parseNum(inputs.packagingCost);
    const deliverySubsidy = parseNum(inputs.deliverySubsidy);
    const codFee = parseNum(inputs.codFee);
    const otherOps = parseNum(inputs.otherOpsCost);
    const totalOperationalCost = packaging + deliverySubsidy + codFee + otherOps;

    // Step 3: Marketing & Return Reserve
    const rawSuccessRate = parseNum(inputs.deliverySuccessRate);
    const clampedSuccessRate = rawSuccessRate > 0 ? Math.min(100, Math.max(1, rawSuccessRate)) : 0;
    const adsManagerCpo = parseNum(inputs.adsManagerCpo);
    const helperAdCost =
      clampedSuccessRate > 0 ? adsManagerCpo / (clampedSuccessRate / 100) : 0;
    const directAdCost = parseNum(inputs.directAdCost);
    const effectiveAdCost =
      inputs.adCostMode === 'helper' ? helperAdCost : directAdCost;

    const returnReserve = parseNum(inputs.returnReserve);
    const totalMarketingReturnCost = effectiveAdCost + returnReserve;

    const totalTrueCost =
      actualProductCost + totalOperationalCost + totalMarketingReturnCost;

    // Step 4: Target Net Profit Margin (Margin on Selling Price)
    const safeMargin = Math.min(90, Math.max(0, Number(inputs.targetMarginPercent) || 0));
    const marginDecimal = safeMargin / 100;
    const recommendedSellingPrice =
      totalTrueCost > 0 && marginDecimal < 1
        ? totalTrueCost / (1 - marginDecimal)
        : 0;
    const recommendedRounded = Math.round(recommendedSellingPrice);
    const recommendedNetProfit = recommendedSellingPrice - totalTrueCost;

    // Educational contrast: cost-plus markup
    const naiveMarkupPrice = totalTrueCost * (1 + marginDecimal);
    const naiveActualMargin =
      naiveMarkupPrice > 0
        ? ((naiveMarkupPrice - totalTrueCost) / naiveMarkupPrice) * 100
        : 0;

    // Step 5: Market Check & Final Selling Price
    const competitorPrice = parseNum(inputs.competitorPrice);
    const hasCalculation = totalTrueCost > 0 || (isFinalPriceManual && parseNum(manualFinalPrice) > 0);
    const finalSellingPrice = isFinalPriceManual
      ? parseNum(manualFinalPrice)
      : recommendedRounded;

    const actualNetProfit = hasCalculation ? finalSellingPrice - totalTrueCost : 0;
    const actualNetMargin =
      hasCalculation && finalSellingPrice > 0
        ? (actualNetProfit / finalSellingPrice) * 100
        : 0;

    const denominator = Math.max(finalSellingPrice, totalTrueCost, 1);
    const landedShare = hasCalculation ? (actualProductCost / denominator) * 100 : 0;
    const opsShare = hasCalculation ? (totalOperationalCost / denominator) * 100 : 0;
    const marketingShare = hasCalculation ? (totalMarketingReturnCost / denominator) * 100 : 0;
    const profitShare =
      hasCalculation && actualNetProfit > 0 ? (actualNetProfit / denominator) * 100 : 0;

    return {
      hasCalculation,
      actualProductCost,
      totalOperationalCost,
      effectiveAdCost,
      helperAdCost,
      clampedSuccessRate,
      returnReserve,
      totalMarketingReturnCost,
      totalTrueCost,
      safeMargin,
      recommendedSellingPrice,
      recommendedRounded,
      recommendedNetProfit,
      naiveMarkupPrice,
      naiveActualMargin,
      competitorPrice,
      finalSellingPrice,
      actualNetProfit,
      actualNetMargin,
      landedShare,
      opsShare,
      marketingShare,
      profitShare,
    };
  }, [inputs, isFinalPriceManual, manualFinalPrice]);

  const healthStatus = useMemo(() => {
    if (!calc.hasCalculation) {
      return {
        tone: 'neutral' as const,
        icon: Info,
        title: isBn ? 'আপনার হিসাব লিখুন' : 'Enter Your Numbers',
        message: isBn
          ? 'যেকোনো ঘরে খরচ লিখলেই তাৎক্ষণিক ফলাফল দেখাবে।'
          : 'Type your costs in any field for instant pricing results.',
      };
    }
    if (calc.actualNetProfit <= 0) {
      return {
        tone: 'loss' as const,
        icon: AlertOctagon,
        title: isBn ? 'লস (ক্ষতি)' : 'Loss',
        message: isBn
          ? 'বিক্রয়মূল্য মোট খরচ কভার করছে না।'
          : 'Selling price does not cover total cost.',
      };
    }
    if (calc.actualNetMargin < 15) {
      return {
        tone: 'low' as const,
        icon: AlertTriangle,
        title: isBn ? 'লো মার্জিন (<১৫%)' : 'Low Margin (<15%)',
        message: isBn
          ? 'সোর্সিং খরচ কমানো, বান্ডেল অফার বা ভ্যালু যোগ করুন।'
          : 'Reduce sourcing cost, bundle items, or add value.',
      };
    }
    if (calc.actualNetMargin < 20) {
      return {
        tone: 'moderate' as const,
        icon: Info,
        title: isBn ? 'মোটামুটি মার্জিন' : 'Moderate Margin',
        message: isBn
          ? '২০%–৩০% রেঞ্জের কাছাকাছি, আরেকটু বাড়ালে নিরাপদ।'
          : 'Close to the recommended 20%–30% range.',
      };
    }
    return {
      tone: 'healthy' as const,
      icon: CheckCircle2,
      title: isBn ? 'হেলদি মার্জিন (২০%+)' : 'Healthy Margin (20%+)',
      message: isBn
        ? 'ই-কমার্সের আদর্শ ২০%–৩০% প্রফিট রেঞ্জে আছে।'
        : 'Meets recommended 20%–30% e-commerce profitability.',
    };
  }, [calc.hasCalculation, calc.actualNetProfit, calc.actualNetMargin, isBn]);

  const handleLoadSample = () => {
    setInputs({ ...SAMPLE_INPUTS });
    setIsSampleMode(true);
    setIsFinalPriceManual(false);
    setManualFinalPrice('');
  };

  const handleReset = () => {
    setInputs({ ...EMPTY_INPUTS });
    setIsSampleMode(false);
    setIsFinalPriceManual(false);
    setManualFinalPrice('');
  };

  const handleManualFinalPriceChange = (val: string) => {
    if (isSampleMode) {
      setIsSampleMode(false);
    }
    setManualFinalPrice(val);
    setIsFinalPriceManual(true);
  };

  const handleSyncToRecommended = () => {
    setIsFinalPriceManual(false);
    setManualFinalPrice('');
  };

  const handleCopySummary = async () => {
    if (!calc.hasCalculation) return;
    const summaryText = [
      `Selling Price Summary (BDT)`,
      `1. Landed Cost: ${formatBDT(Math.round(calc.actualProductCost))}`,
      `2. Operational Cost: ${formatBDT(Math.round(calc.totalOperationalCost))}`,
      `3. Marketing & Return: ${formatBDT(Math.round(calc.totalMarketingReturnCost))}`,
      `Total True Cost: ${formatBDT(Math.round(calc.totalTrueCost))}`,
      `Recommended Price (${calc.safeMargin}%): ${formatBDT(calc.recommendedRounded)}`,
      `Final Selling Price: ${formatBDT(Math.round(calc.finalSellingPrice))}`,
      `Actual Net Profit: ${formatBDT(Math.round(calc.actualNetProfit))} (${calc.actualNetMargin.toFixed(1)}%)`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      // Clipboard unavailable in restricted context
    }
  };

  const handleApplyClick = () => {
    if (!onApplyPrice || !calc.hasCalculation) return;
    const chosenCost =
      costBasisToApply === 'total' ? calc.totalTrueCost : calc.actualProductCost;
    onApplyPrice({
      sellingPrice: Math.round(calc.finalSellingPrice),
      costPrice: Math.round(chosenCost),
      landedCost: Math.round(calc.actualProductCost),
      totalTrueCost: Math.round(calc.totalTrueCost),
      netProfit: Math.round(calc.actualNetProfit),
      netMarginPercent: Number(calc.actualNetMargin.toFixed(1)),
      costBasis: costBasisToApply,
    });
  };

  const toneStyles = {
    neutral:
      'bg-[#F7F3EC] dark:bg-[#26211B] border-[#E7DFD3] dark:border-[#3A3229] text-[#5C5349] dark:text-[#CFC5B8]',
    loss: 'bg-[#FDF2F0] dark:bg-[#311A18] border-[#F2C7C0] dark:border-[#632C25] text-[#9E2A20] dark:text-[#F6B4AB]',
    low: 'bg-[#FEF7EC] dark:bg-[#2F2414] border-[#F3D8A8] dark:border-[#614720] text-[#92540B] dark:text-[#F4CE8C]',
    moderate:
      'bg-[#F5F2EB] dark:bg-[#27231C] border-[#DFD5C5] dark:border-[#433A2E] text-[#5A4B37] dark:text-[#E2D6C5]',
    healthy:
      'bg-[#EFF7F3] dark:bg-[#162922] border-[#C5E3D5] dark:border-[#245240] text-[#1A5E46] dark:text-[#9CE0C5]',
  };

  const iconToneStyles = {
    neutral: 'text-[#8A7E70] dark:text-[#A99E8E]',
    loss: 'text-[#C23B2B] dark:text-[#F28B7E]',
    low: 'text-[#C47612] dark:text-[#F0B454]',
    moderate: 'text-[#9C6635] dark:text-[#D9A773]',
    healthy: 'text-[#1F7A5B] dark:text-[#5FD1A5]',
  };

  const StatusIcon = healthStatus.icon;

  return (
    <div
      className={`${
        isEmbedded
          ? 'space-y-4'
          : 'space-y-5 sm:space-y-6 max-w-6xl mx-auto'
      }`}
    >
      {/* Clean Top Bar (No Subtitle Clutter) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#C25E28] text-[#FFFDF9] flex items-center justify-center shrink-0 shadow-xs">
            <Calculator className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex items-center gap-2.5 flex-wrap">
            <h2
              className={`${
                isEmbedded ? 'text-base' : 'text-lg sm:text-2xl'
              } font-bold tracking-tight text-[#1F1B16] dark:text-[#F7F3EC]`}
            >
              {isBn ? 'সেলিং প্রাইস ক্যালকুলেটর' : 'Selling Price Calculator'}
            </h2>
            {isSampleMode && (
              <span className="text-[11px] font-semibold text-[#A05224] dark:text-[#E59C6D] bg-[#FBF0E6] dark:bg-[#332218] border border-[#EED3BE] dark:border-[#543624] px-2 py-0.5 rounded-md">
                {isBn ? 'নমুনা' : 'Sample'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleLoadSample}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border border-[#E4DBD0] dark:border-[#3A332B] bg-[#FFFDF9] dark:bg-[#231F1A] text-[#4A4137] dark:text-[#E2D9CE] hover:bg-[#F5EFE6] dark:hover:bg-[#2D2720] transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C25E28] dark:text-[#E8915E]" />
            <span>{isBn ? 'নমুনা হিসাব' : 'Sample'}</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border border-[#E4DBD0] dark:border-[#3A332B] bg-[#FFFDF9] dark:bg-[#231F1A] text-[#6E6357] dark:text-[#C5BBAE] hover:bg-[#F5EFE6] dark:hover:bg-[#2D2720] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isBn ? 'রিসেট' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Sticky Quick Result Bar (Visible only on Mobile/Tablet < lg) */}
      <div
        className={`${
          isEmbedded ? 'lg:hidden' : 'xl:hidden'
        } sticky top-16 z-20 -mx-1 px-3.5 py-2.5 rounded-xl bg-[#241F1A] text-[#FAF6F0] border border-[#3B332A] shadow-md flex items-center justify-between gap-2`}
      >
        <div className="min-w-0">
          <span className="block text-[10px] uppercase tracking-wider text-[#B8ABA0]">
            {isBn ? 'বিক্রয়মূল্য' : 'Selling Price'}
          </span>
          <span className="text-lg font-extrabold tabular-nums">
            {calc.hasCalculation ? formatBDT(Math.round(calc.finalSellingPrice)) : '৳0'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-[#B8ABA0]">
              {isBn ? 'মোট খরচ' : 'True Cost'}
            </span>
            <span className="text-sm font-bold tabular-nums text-[#F0E6D8]">
              {calc.hasCalculation ? formatBDT(Math.round(calc.totalTrueCost)) : '৳0'}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-[#B8ABA0]">
              {isBn ? 'নেট প্রফিট' : 'Net Profit'}
            </span>
            <span
              className={`text-sm font-bold tabular-nums ${
                !calc.hasCalculation
                  ? 'text-[#B8ABA0]'
                  : calc.actualNetProfit <= 0
                  ? 'text-[#F28B7E]'
                  : calc.actualNetMargin < 15
                  ? 'text-[#F0B454]'
                  : 'text-[#6CD9AE]'
              }`}
            >
              {calc.hasCalculation
                ? `${calc.actualNetProfit < 0 ? '-' : ''}${formatBDT(
                    Math.abs(Math.round(calc.actualNetProfit))
                  )} (${calc.actualNetMargin.toFixed(0)}%)`
                : '৳0'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Responsive Workspace */}
      <div
        className={`grid grid-cols-1 ${
          isEmbedded ? 'lg:grid-cols-12 gap-4' : 'xl:grid-cols-12 gap-6'
        } items-start`}
      >
        {/* LEFT COLUMN: Clean 5-Step Warm Ledger */}
        <div
          className={`${
            isEmbedded ? 'lg:col-span-7' : 'xl:col-span-7'
          } bg-[#FFFDF9] dark:bg-[#1C1814] rounded-2xl border border-[#E7DFD3] dark:border-[#322C24] divide-y divide-[#EFE8DD] dark:divide-[#2C261F] shadow-xs`}
        >
          {/* STEP 1 */}
          <section className={isEmbedded ? 'p-4' : 'p-4 sm:p-6'}>
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-[#F4ECE1] dark:bg-[#2C251E] text-[#A05224] dark:text-[#E8915E] font-bold text-xs flex items-center justify-center tabular-nums shrink-0">
                  1
                </span>
                <h3 className="text-sm font-bold text-[#1F1B16] dark:text-[#F7F3EC] flex items-center gap-1.5 truncate">
                  <Package className="w-4 h-4 text-[#A05224] dark:text-[#E8915E] shrink-0" />
                  <span className="truncate">
                    {isBn ? 'প্রকৃত ক্রয়মূল্য' : 'Actual Purchase Cost'}
                  </span>
                </h3>
              </div>
              <span className="text-sm font-bold text-[#1F1B16] dark:text-[#F7F3EC] tabular-nums shrink-0">
                {formatBDT(calc.actualProductCost)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <WarmCurrencyInput
                label={isBn ? 'বেস ক্রয়মূল্য (৳)' : 'Base Purchase Price (৳)'}
                placeholder="560"
                value={inputs.basePurchasePrice}
                isSample={isSampleMode}
                onFocus={clearSampleIfActive}
                onChange={(v) => updateCostField('basePurchasePrice', v)}
              />
              <WarmCurrencyInput
                label={isBn ? 'পরিবহন / শিপিং / কাস্টমস (৳)' : 'Transport / Shipping / Import (৳)'}
                placeholder="20"
                value={inputs.transportImportCost}
                isSample={isSampleMode}
                onFocus={clearSampleIfActive}
                onChange={(v) => updateCostField('transportImportCost', v)}
              />
            </div>
          </section>

          {/* STEP 2 */}
          <section className={isEmbedded ? 'p-4' : 'p-4 sm:p-6'}>
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-[#F4ECE1] dark:bg-[#2C251E] text-[#A05224] dark:text-[#E8915E] font-bold text-xs flex items-center justify-center tabular-nums shrink-0">
                  2
                </span>
                <h3 className="text-sm font-bold text-[#1F1B16] dark:text-[#F7F3EC] flex items-center gap-1.5 truncate">
                  <Truck className="w-4 h-4 text-[#B46B2E] dark:text-[#E6A364] shrink-0" />
                  <span className="truncate">
                    {isBn ? 'প্যাকেজিং ও অপারেশনাল খরচ' : 'Packaging & Operational Cost'}
                  </span>
                </h3>
              </div>
              <span className="text-sm font-bold text-[#8E5625] dark:text-[#E6A364] tabular-nums shrink-0">
                {formatBDT(calc.totalOperationalCost)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <WarmCurrencyInput
                label={isBn ? 'প্যাকেজিং খরচ (৳)' : 'Packaging Cost (৳)'}
                placeholder="20"
                value={inputs.packagingCost}
                isSample={isSampleMode}
                onFocus={clearSampleIfActive}
                onChange={(v) => updateCostField('packagingCost', v)}
              />
              <WarmCurrencyInput
                label={isBn ? 'ডেলিভারি ভর্তুকি (৳)' : 'Delivery Subsidy (৳)'}
                placeholder="25"
                value={inputs.deliverySubsidy}
                isSample={isSampleMode}
                onFocus={clearSampleIfActive}
                onChange={(v) => updateCostField('deliverySubsidy', v)}
              />
              <WarmCurrencyInput
                label={isBn ? 'COD / পেমেন্ট ফি (৳)' : 'COD / Payment Fee (৳)'}
                placeholder="10"
                value={inputs.codFee}
                isSample={isSampleMode}
                onFocus={clearSampleIfActive}
                onChange={(v) => updateCostField('codFee', v)}
              />
              <WarmCurrencyInput
                label={isBn ? 'অন্যান্য অপারেশনাল (৳)' : 'Other Operational (৳)'}
                placeholder="15"
                value={inputs.otherOpsCost}
                isSample={isSampleMode}
                onFocus={clearSampleIfActive}
                onChange={(v) => updateCostField('otherOpsCost', v)}
              />
            </div>
          </section>

          {/* STEP 3 */}
          <section className={isEmbedded ? 'p-4' : 'p-4 sm:p-6'}>
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-[#F4ECE1] dark:bg-[#2C251E] text-[#A05224] dark:text-[#E8915E] font-bold text-xs flex items-center justify-center tabular-nums shrink-0">
                  3
                </span>
                <h3 className="text-sm font-bold text-[#1F1B16] dark:text-[#F7F3EC] flex items-center gap-1.5 truncate">
                  <Megaphone className="w-4 h-4 text-[#C25E28] dark:text-[#EE9460] shrink-0" />
                  <span className="truncate">
                    {isBn ? 'মার্কেটিং ও রিটার্ন রিজার্ভ' : 'Marketing & Return Reserve'}
                  </span>
                </h3>
              </div>
              <span className="text-sm font-bold text-[#B45309] dark:text-[#F0A45C] tabular-nums shrink-0">
                {formatBDT(
                  calc.totalMarketingReturnCost,
                  calc.effectiveAdCost % 1 !== 0 ? 2 : 0
                )}
              </span>
            </div>

            {/* Ad Cost Mode Switcher */}
            <div className="mb-3">
              <div className="inline-flex w-full sm:w-auto rounded-lg bg-[#F5EFE6] dark:bg-[#26211B] p-1 border border-[#E7DFD3] dark:border-[#383027]">
                <button
                  type="button"
                  onClick={() => updateAdCostMode('direct')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    inputs.adCostMode === 'direct'
                      ? 'bg-[#FFFDF9] dark:bg-[#3A3229] text-[#1F1B16] dark:text-[#FAF6F0] shadow-2xs'
                      : 'text-[#6E6357] dark:text-[#A99E8E] hover:text-[#1F1B16] dark:hover:text-[#FAF6F0]'
                  }`}
                >
                  {isBn ? 'সরাসরি অ্যাড খরচ' : 'Direct Ad Cost'}
                </button>
                <button
                  type="button"
                  onClick={() => updateAdCostMode('helper')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    inputs.adCostMode === 'helper'
                      ? 'bg-[#FFFDF9] dark:bg-[#3A3229] text-[#1F1B16] dark:text-[#FAF6F0] shadow-2xs'
                      : 'text-[#6E6357] dark:text-[#A99E8E] hover:text-[#1F1B16] dark:hover:text-[#FAF6F0]'
                  }`}
                >
                  {isBn ? 'ডেলিভারি রেট দিয়ে হিসাব' : 'By Delivery Rate'}
                </button>
              </div>
            </div>

            {inputs.adCostMode === 'direct' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <WarmCurrencyInput
                  label={isBn ? 'সফল ডেলিভারি প্রতি অ্যাড খরচ (৳)' : 'Ad Cost / Delivered Order (৳)'}
                  placeholder="90"
                  value={inputs.directAdCost}
                  isSample={isSampleMode}
                  onFocus={clearSampleIfActive}
                  onChange={(v) => updateCostField('directAdCost', v)}
                />
                <WarmCurrencyInput
                  label={isBn ? 'রিটার্ন রিজার্ভ (৳)' : 'Return Reserve (৳)'}
                  placeholder="10"
                  value={inputs.returnReserve}
                  isSample={isSampleMode}
                  onFocus={clearSampleIfActive}
                  onChange={(v) => updateCostField('returnReserve', v)}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <WarmCurrencyInput
                    label={isBn ? 'অ্যাডস ম্যানেজার CPO (৳)' : 'Ads Manager CPO (৳)'}
                    placeholder="70"
                    value={inputs.adsManagerCpo}
                    isSample={isSampleMode}
                    onFocus={clearSampleIfActive}
                    onChange={(v) => updateCostField('adsManagerCpo', v)}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-[#4A4137] dark:text-[#D5CCC0] mb-1">
                      {isBn ? 'ডেলিভারি রেট (%)' : 'Delivery Rate (%)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="1"
                        max="100"
                        step="1"
                        value={inputs.deliverySuccessRate}
                        onFocus={clearSampleIfActive}
                        onChange={(e) => updateCostField('deliverySuccessRate', e.target.value)}
                        placeholder="78"
                        className={`w-full min-h-[42px] pl-3 pr-7 py-2 rounded-xl border border-[#DFD6C9] dark:border-[#3A3229] bg-[#FAF7F2] dark:bg-[#241F1A] text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C25E28]/40 focus:border-[#C25E28] transition-colors ${
                          isSampleMode
                            ? 'text-[#8C8072] dark:text-[#9E9283]'
                            : 'text-[#1F1B16] dark:text-[#FAF6F0]'
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9A8E80]">
                        %
                      </span>
                    </div>
                  </div>
                  <WarmCurrencyInput
                    label={isBn ? 'রিটার্ন রিজার্ভ (৳)' : 'Return Reserve (৳)'}
                    placeholder="10"
                    value={inputs.returnReserve}
                    isSample={isSampleMode}
                    onFocus={clearSampleIfActive}
                    onChange={(v) => updateCostField('returnReserve', v)}
                  />
                </div>
                {calc.clampedSuccessRate > 0 && parseNum(inputs.adsManagerCpo) > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#F7F2EA] dark:bg-[#26211B] text-xs text-[#5C5247] dark:text-[#CFC5B8]">
                    <span>
                      {formatBDT(parseNum(inputs.adsManagerCpo))} ÷ {calc.clampedSuccessRate}%
                    </span>
                    <span className="font-bold text-[#1F1B16] dark:text-[#FAF6F0] tabular-nums">
                      {formatBDT(calc.helperAdCost, 2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-[#EFE8DD] dark:border-[#2C261F] flex items-center justify-between">
              <span className="text-xs font-bold text-[#6E6357] dark:text-[#B5AA9C]">
                {isBn ? 'মোট প্রকৃত খরচ' : 'Total True Cost'}
              </span>
              <span className="text-base font-extrabold text-[#1F1B16] dark:text-[#FAF6F0] tabular-nums">
                {formatBDT(calc.totalTrueCost, calc.totalTrueCost % 1 !== 0 ? 2 : 0)}
              </span>
            </div>
          </section>

          {/* STEP 4 */}
          <section className={isEmbedded ? 'p-4' : 'p-4 sm:p-6'}>
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-[#F4ECE1] dark:bg-[#2C251E] text-[#A05224] dark:text-[#E8915E] font-bold text-xs flex items-center justify-center tabular-nums shrink-0">
                  4
                </span>
                <h3 className="text-sm font-bold text-[#1F1B16] dark:text-[#F7F3EC] flex items-center gap-1.5 truncate">
                  <Percent className="w-4 h-4 text-[#1F7A5B] dark:text-[#5FD1A5] shrink-0" />
                  <span className="truncate">
                    {isBn ? 'টার্গেট নেট মার্জিন' : 'Target Net Margin'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowFormulaTip((v) => !v)}
                  aria-label="Formula info"
                  className="text-[#9A8E80] hover:text-[#C25E28] transition-colors cursor-pointer shrink-0"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm font-bold text-[#1F7A5B] dark:text-[#5FD1A5] tabular-nums shrink-0">
                {calc.hasCalculation ? formatBDT(calc.recommendedRounded) : '৳0'}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="range"
                    min={5}
                    max={70}
                    step={1}
                    value={Math.min(70, Math.max(5, calc.safeMargin))}
                    onChange={(e) => updateMargin(Number(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#C25E28] bg-[#E8DFD3] dark:bg-[#352E26]"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#9A8E80] tabular-nums mt-1">
                    <span>5%</span>
                    <span className="text-[#1F7A5B] dark:text-[#5FD1A5] font-semibold">
                      20%–30%
                    </span>
                    <span>50%</span>
                    <span>70%</span>
                  </div>
                </div>

                <div className="w-24 shrink-0">
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={90}
                      step={1}
                      value={inputs.targetMarginPercent}
                      onChange={(e) => {
                        const raw = e.target.value === '' ? 0 : Number(e.target.value);
                        updateMargin(raw);
                      }}
                      className="w-full min-h-[42px] pl-3 pr-7 py-2 rounded-xl border border-[#DFD6C9] dark:border-[#3A3229] bg-[#FAF7F2] dark:bg-[#241F1A] text-sm font-bold text-[#1F1B16] dark:text-[#FAF6F0] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C25E28]/40 focus:border-[#C25E28]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9A8E80]">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {MARGIN_PRESETS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => updateMargin(pct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums transition-colors cursor-pointer border ${
                        calc.safeMargin === pct
                          ? 'bg-[#C25E28] text-[#FFFDF9] border-[#C25E28]'
                          : 'bg-[#FAF7F2] dark:bg-[#241F1A] text-[#5C5247] dark:text-[#CFC5B8] border-[#E4DBD0] dark:border-[#3A3229] hover:border-[#C25E28]'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                {calc.hasCalculation && (
                  <span className="text-xs font-semibold text-[#1F7A5B] dark:text-[#5FD1A5] tabular-nums">
                    +{formatBDT(Math.round(calc.recommendedNetProfit))}
                  </span>
                )}
              </div>

              {showFormulaTip && (
                <div className="rounded-xl bg-[#F7F2EA] dark:bg-[#25201A] border border-[#E7DFD3] dark:border-[#383027] p-3 text-xs text-[#5C5247] dark:text-[#CFC5B8] space-y-1.5">
                  <div className="font-mono text-[11px] text-[#1F1B16] dark:text-[#FAF6F0] tabular-nums">
                    Price = Total Cost ÷ (1 − Margin%) ={' '}
                    {formatBDT(Math.round(calc.totalTrueCost))} ÷{' '}
                    {(1 - calc.safeMargin / 100).toFixed(2)} ={' '}
                    <strong>{formatBDT(calc.recommendedRounded)}</strong>
                  </div>
                  {calc.totalTrueCost > 0 && calc.safeMargin > 0 && (
                    <p className="leading-relaxed">
                      {isBn
                        ? `খরচের ওপর সরাসরি ${calc.safeMargin}% যোগ করলে দাম হতো ${formatBDT(Math.round(calc.naiveMarkupPrice))} (মার্জিন মাত্র ${calc.naiveActualMargin.toFixed(1)}%)।`
                        : `Cost-plus ${calc.safeMargin}% gives ${formatBDT(Math.round(calc.naiveMarkupPrice))} (only ${calc.naiveActualMargin.toFixed(1)}% actual margin).`}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* STEP 5 */}
          <section className={isEmbedded ? 'p-4' : 'p-4 sm:p-6'}>
            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-[#F4ECE1] dark:bg-[#2C251E] text-[#A05224] dark:text-[#E8915E] font-bold text-xs flex items-center justify-center tabular-nums shrink-0">
                  5
                </span>
                <h3 className="text-sm font-bold text-[#1F1B16] dark:text-[#F7F3EC] flex items-center gap-1.5 truncate">
                  <SearchCheck className="w-4 h-4 text-[#6E6357] dark:text-[#B5AA9C] shrink-0" />
                  <span className="truncate">
                    {isBn ? 'ফাইনাল প্রাইস ও মার্কেট চেক' : 'Final Price & Market Check'}
                  </span>
                </h3>
              </div>
              {isFinalPriceManual && calc.recommendedRounded > 0 && (
                <button
                  type="button"
                  onClick={handleSyncToRecommended}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#C25E28] dark:text-[#E8915E] hover:underline shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{formatBDT(calc.recommendedRounded)}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <WarmCurrencyInput
                label={isBn ? 'প্রতিযোগীর দাম (ঐচ্ছিক)' : 'Competitor Price (Optional)'}
                placeholder="850"
                value={inputs.competitorPrice}
                isSample={false}
                onChange={updateCompetitorPrice}
              />
              <div>
                <label className="block text-xs font-semibold text-[#4A4137] dark:text-[#D5CCC0] mb-1">
                  {isBn ? 'ফাইনাল বিক্রয়মূল্য (৳)' : 'Final Selling Price (৳)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#1F7A5B] dark:text-[#5FD1A5]">
                    ৳
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={
                      isFinalPriceManual
                        ? manualFinalPrice
                        : calc.recommendedRounded > 0
                        ? String(calc.recommendedRounded)
                        : ''
                    }
                    onChange={(e) => handleManualFinalPriceChange(e.target.value)}
                    placeholder="0"
                    className={`w-full min-h-[42px] pl-7 pr-3 py-2 rounded-xl border border-[#BBDAC9] dark:border-[#2C5B48] bg-[#F4FBF7] dark:bg-[#172821] text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1F7A5B]/40 focus:border-[#1F7A5B] transition-colors ${
                      isSampleMode && !isFinalPriceManual
                        ? 'text-[#558A74] dark:text-[#7EC4A6]'
                        : 'text-[#155740] dark:text-[#7BE0B8]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {calc.competitorPrice > 0 && calc.finalSellingPrice > 0 && (
              <div className="mt-3 px-3 py-2 rounded-xl border border-[#E7DFD3] dark:border-[#352E26] bg-[#F8F4ED] dark:bg-[#241F1A] text-xs text-[#5C5247] dark:text-[#D5CCC0] flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-[#C25E28] dark:text-[#E8915E] shrink-0" />
                {calc.finalSellingPrice > calc.competitorPrice ? (
                  <span>
                    <strong className="text-[#1F1B16] dark:text-[#FAF6F0] tabular-nums">
                      +{formatBDT(Math.round(calc.finalSellingPrice - calc.competitorPrice))}
                    </strong>{' '}
                    {isBn
                      ? 'বেশি — কোয়ালিটি, ওয়ারেন্টি বা বান্ডেল ভ্যালু দেখান।'
                      : 'above competitor — highlight quality, warranty, or bundle value.'}
                  </span>
                ) : (
                  <span>
                    <strong className="text-[#1F7A5B] dark:text-[#5FD1A5] tabular-nums">
                      {calc.finalSellingPrice === calc.competitorPrice
                        ? isBn
                          ? 'সমান দাম'
                          : 'Same price'
                        : `-${formatBDT(Math.round(calc.competitorPrice - calc.finalSellingPrice))}`}
                    </strong>{' '}
                    · {calc.actualNetMargin.toFixed(1)}% {isBn ? 'নেট মার্জিন' : 'net margin'}
                  </span>
                )}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Warm Editorial Summary Card */}
        <aside
          className={`${
            isEmbedded ? 'lg:col-span-5' : 'xl:col-span-5 xl:sticky xl:top-24'
          } bg-[#FFFDF9] dark:bg-[#1C1814] rounded-2xl border border-[#E7DFD3] dark:border-[#322C24] overflow-hidden shadow-xs`}
        >
          {/* Warm Espresso Hero Header */}
          <div className="p-5 sm:p-6 bg-[#241F1A] dark:bg-[#14110E] text-[#FAF6F0]">
            <div className="flex items-center justify-between gap-2 text-xs text-[#B8ABA0] mb-1.5">
              <span>
                {isSampleMode
                  ? isBn
                    ? 'নমুনা বিক্রয়মূল্য'
                    : 'Sample Selling Price'
                  : isBn
                  ? 'চূড়ান্ত বিক্রয়মূল্য'
                  : 'Final Selling Price'}
              </span>
              {calc.hasCalculation && (
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D6C9BB] hover:text-white transition-colors cursor-pointer"
                >
                  {copiedSummary ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#6CD9AE]" />
                      <span>{isBn ? 'কপি হয়েছে' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isBn ? 'কপি' : 'Copy'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
              {calc.hasCalculation ? formatBDT(Math.round(calc.finalSellingPrice)) : '৳0'}
            </div>

            <div className="mt-4 pt-4 border-t border-[#383028] grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[11px] text-[#A99C90]">
                  {isBn ? 'নেট প্রফিট' : 'Net Profit'}
                </span>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    !calc.hasCalculation
                      ? 'text-[#8C8073]'
                      : calc.actualNetProfit <= 0
                      ? 'text-[#F28B7E]'
                      : 'text-[#6CD9AE]'
                  }`}
                >
                  {calc.hasCalculation
                    ? `${calc.actualNetProfit < 0 ? '-' : ''}${formatBDT(
                        Math.abs(Math.round(calc.actualNetProfit))
                      )}`
                    : '৳0'}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-[#A99C90]">
                  {isBn ? 'নেট মার্জিন' : 'Net Margin'}
                </span>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    !calc.hasCalculation
                      ? 'text-[#8C8073]'
                      : calc.actualNetProfit <= 0
                      ? 'text-[#F28B7E]'
                      : calc.actualNetMargin < 15
                      ? 'text-[#F0B454]'
                      : 'text-[#6CD9AE]'
                  }`}
                >
                  {calc.hasCalculation && calc.finalSellingPrice > 0
                    ? `${calc.actualNetMargin.toFixed(1)}%`
                    : '0.0%'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Profitability Status */}
            <div
              className={`rounded-xl border p-3.5 flex items-start gap-2.5 ${
                toneStyles[healthStatus.tone]
              }`}
            >
              <StatusIcon
                className={`w-4 h-4 shrink-0 mt-0.5 ${iconToneStyles[healthStatus.tone]}`}
              />
              <div className="min-w-0">
                <p className="text-xs font-bold leading-snug">{healthStatus.title}</p>
                <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                  {healthStatus.message}
                </p>
              </div>
            </div>

            {/* Warm Segmented Cost vs Profit Bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#4A4137] dark:text-[#D5CCC0] mb-2">
                <span>{isBn ? 'খরচ বনাম প্রফিট' : 'Cost vs. Profit'}</span>
                <span className="text-[11px] text-[#8C8072] tabular-nums">
                  {calc.hasCalculation && calc.finalSellingPrice > 0
                    ? `${((calc.totalTrueCost / calc.finalSellingPrice) * 100).toFixed(0)}% ${
                        isBn ? 'খরচ' : 'cost'
                      }`
                    : '—'}
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-[#EFE8DD] dark:bg-[#2C261F] overflow-hidden flex">
                {calc.hasCalculation && (
                  <>
                    {calc.landedShare > 0 && (
                      <div
                        style={{ width: `${Math.min(100, calc.landedShare)}%` }}
                        className="bg-[#5C5146] dark:bg-[#A6998A] transition-all duration-300"
                      />
                    )}
                    {calc.opsShare > 0 && (
                      <div
                        style={{ width: `${Math.min(100, calc.opsShare)}%` }}
                        className="bg-[#D48C46] transition-all duration-300"
                      />
                    )}
                    {calc.marketingShare > 0 && (
                      <div
                        style={{ width: `${Math.min(100, calc.marketingShare)}%` }}
                        className="bg-[#C25E28] transition-all duration-300"
                      />
                    )}
                    {calc.profitShare > 0 && (
                      <div
                        style={{ width: `${Math.min(100, calc.profitShare)}%` }}
                        className="bg-[#1F7A5B] transition-all duration-300"
                      />
                    )}
                  </>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <WarmLegendItem
                  colorClass="bg-[#5C5146] dark:bg-[#A6998A]"
                  label={isBn ? 'ক্রয়মূল্য' : 'Landed'}
                  amount={formatBDT(Math.round(calc.actualProductCost))}
                  pct={calc.landedShare}
                />
                <WarmLegendItem
                  colorClass="bg-[#D48C46]"
                  label={isBn ? 'অপারেশনাল' : 'Ops'}
                  amount={formatBDT(Math.round(calc.totalOperationalCost))}
                  pct={calc.opsShare}
                />
                <WarmLegendItem
                  colorClass="bg-[#C25E28]"
                  label={isBn ? 'অ্যাড ও রিটার্ন' : 'Ads & Ret.'}
                  amount={formatBDT(Math.round(calc.totalMarketingReturnCost))}
                  pct={calc.marketingShare}
                />
                <WarmLegendItem
                  colorClass={calc.actualNetProfit < 0 ? 'bg-[#C23B2B]' : 'bg-[#1F7A5B]'}
                  label={
                    calc.actualNetProfit < 0
                      ? isBn
                        ? 'লস'
                        : 'Loss'
                      : isBn
                      ? 'প্রফিট'
                      : 'Profit'
                  }
                  amount={`${calc.actualNetProfit < 0 ? '-' : ''}${formatBDT(
                    Math.abs(Math.round(calc.actualNetProfit))
                  )}`}
                  pct={calc.actualNetMargin}
                />
              </div>
            </div>

            {/* Clean Itemized Ledger */}
            <div className="border-t border-[#EFE8DD] dark:border-[#2C261F] pt-4 space-y-2 text-xs">
              <WarmLedgerRow
                label={isBn ? '১. প্রকৃত পণ্য খরচ' : '1. Actual Product Cost'}
                value={formatBDT(calc.actualProductCost)}
              />
              <WarmLedgerRow
                label={isBn ? '২. প্যাকেজিং ও অপারেশনাল' : '2. Operational Cost'}
                value={formatBDT(calc.totalOperationalCost)}
              />
              <WarmLedgerRow
                label={isBn ? '৩. মার্কেটিং ও রিটার্ন' : '3. Marketing & Return'}
                value={formatBDT(
                  calc.totalMarketingReturnCost,
                  calc.totalMarketingReturnCost % 1 !== 0 ? 2 : 0
                )}
              />
              <div className="pt-2 border-t border-[#EFE8DD] dark:border-[#2C261F]">
                <WarmLedgerRow
                  label={isBn ? 'মোট প্রকৃত খরচ' : 'Total True Cost'}
                  value={formatBDT(
                    calc.totalTrueCost,
                    calc.totalTrueCost % 1 !== 0 ? 2 : 0
                  )}
                  bold
                />
              </div>
              <WarmLedgerRow
                label={
                  isBn
                    ? `প্রস্তাবিত মূল্য (${calc.safeMargin}%)`
                    : `Recommended (${calc.safeMargin}%)`
                }
                value={calc.hasCalculation ? formatBDT(calc.recommendedRounded) : '৳0'}
              />
              <WarmLedgerRow
                label={isBn ? 'চূড়ান্ত বিক্রয়মূল্য' : 'Final Selling Price'}
                value={calc.hasCalculation ? formatBDT(Math.round(calc.finalSellingPrice)) : '৳0'}
                bold
                highlight="profit"
              />
            </div>

            {/* Embedded Mode: Apply Price to Product */}
            {isEmbedded && onApplyPrice && (
              <div className="pt-4 border-t border-[#EFE8DD] dark:border-[#2C261F] space-y-3">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCostBasisToApply('total')}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border text-left transition-colors cursor-pointer ${
                      costBasisToApply === 'total'
                        ? 'border-[#C25E28] bg-[#FBF2EB] dark:bg-[#312117] text-[#1F1B16] dark:text-[#FAF6F0]'
                        : 'border-[#E7DFD3] dark:border-[#352E26] text-[#6E6357] dark:text-[#A99E8E] hover:bg-[#F7F2EA] dark:hover:bg-[#26211B]'
                    }`}
                  >
                    <span className="block">{isBn ? 'মোট খরচ' : 'Total Cost'}</span>
                    <span className="font-bold tabular-nums">
                      {formatBDT(Math.round(calc.totalTrueCost))}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCostBasisToApply('landed')}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border text-left transition-colors cursor-pointer ${
                      costBasisToApply === 'landed'
                        ? 'border-[#C25E28] bg-[#FBF2EB] dark:bg-[#312117] text-[#1F1B16] dark:text-[#FAF6F0]'
                        : 'border-[#E7DFD3] dark:border-[#352E26] text-[#6E6357] dark:text-[#A99E8E] hover:bg-[#F7F2EA] dark:hover:bg-[#26211B]'
                    }`}
                  >
                    <span className="block">{isBn ? 'ক্রয়মূল্য' : 'Landed Cost'}</span>
                    <span className="font-bold tabular-nums">
                      {formatBDT(Math.round(calc.actualProductCost))}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!calc.hasCalculation || calc.finalSellingPrice <= 0}
                  onClick={handleApplyClick}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#C25E28] hover:bg-[#A94E1E] disabled:opacity-45 disabled:cursor-not-allowed text-[#FFFDF9] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <span>
                    {isBn ? 'প্রোডাক্টে অ্যাপ্লাই করুন' : 'Apply Price to Product'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

/* --- Clean Warm Sub-Components --- */

const WarmCurrencyInput: React.FC<{
  label: string;
  value: string;
  isSample?: boolean;
  onFocus?: () => void;
  onChange: (val: string) => void;
  placeholder?: string;
}> = ({ label, value, isSample, onFocus, onChange, placeholder }) => (
  <div>
    <label className="block text-xs font-semibold text-[#4A4137] dark:text-[#D5CCC0] mb-1">
      {label}
    </label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9A8E80]">
        ৳
      </span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={value}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full min-h-[42px] pl-7 pr-3 py-2 rounded-xl border border-[#DFD6C9] dark:border-[#3A3229] bg-[#FAF7F2] dark:bg-[#241F1A] text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C25E28]/40 focus:border-[#C25E28] transition-colors ${
          isSample
            ? 'text-[#8C8072] dark:text-[#9E9283]'
            : 'text-[#1F1B16] dark:text-[#FAF6F0]'
        }`}
      />
    </div>
  </div>
);

const WarmLegendItem: React.FC<{
  colorClass: string;
  label: string;
  amount: string;
  pct: number;
}> = ({ colorClass, label, amount, pct }) => (
  <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F7F3EC] dark:bg-[#241F1A]">
    <span className="flex items-center gap-1.5 text-[#5C5247] dark:text-[#CFC5B8] truncate">
      <span className={`w-2.5 h-2.5 rounded-xs shrink-0 ${colorClass}`} />
      <span className="truncate">{label}</span>
    </span>
    <span className="font-bold text-[#1F1B16] dark:text-[#FAF6F0] tabular-nums shrink-0">
      {amount}{' '}
      <span className="text-[10px] font-medium text-[#8C8072]">
        ({Number.isFinite(pct) ? pct.toFixed(0) : 0}%)
      </span>
    </span>
  </div>
);

const WarmLedgerRow: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  highlight?: 'profit';
}> = ({ label, value, bold, highlight }) => (
  <div className="flex items-center justify-between gap-2">
    <span
      className={
        bold
          ? 'font-bold text-[#1F1B16] dark:text-[#FAF6F0]'
          : 'text-[#6E6357] dark:text-[#B5AA9C]'
      }
    >
      {label}
    </span>
    <span
      className={`tabular-nums ${
        highlight === 'profit'
          ? 'font-extrabold text-[#1F7A5B] dark:text-[#5FD1A5]'
          : bold
          ? 'font-bold text-[#1F1B16] dark:text-[#FAF6F0]'
          : 'font-semibold text-[#3A3229] dark:text-[#E5DDD2]'
      }`}
    >
      {value}
    </span>
  </div>
);
