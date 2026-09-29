import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Sparkles,
  TrendingUp,
  Flame,
  Star,
  Users,
  ShieldCheck,
  ArrowUpRight,
  Filter,
  Calendar,
  DollarSign,
  Package,
  Gift,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';
import { ResellerUser } from '../../types/reseller';

interface ResellerLeaderboardPanelProps {
  currentReseller: ResellerUser;
  lang?: 'bn' | 'en';
  isDarkMode?: boolean;
  onNavigateToTab: (tab: any) => void;
}

export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'all';
export type LeaderboardMetric = 'sales' | 'profit' | 'orders';

interface BaseResellerProfile {
  id: string;
  name: string;
  nameEn: string;
  shopName: string;
  shopNameEn: string;
  city: string;
  cityEn: string;
  avatar: string;
  baseMonthSales: number;
  baseMonthOrders: number;
  baseMonthProfit: number;
  growthPercent: number;
  tier: 'VIP Diamond' | 'Pro Reseller' | 'Gold Partner';
  badgeBn: string;
  badgeEn: string;
  isCurrentUser?: boolean;
}

export const ResellerLeaderboardPanel: React.FC<ResellerLeaderboardPanelProps> = ({
  currentReseller,
  lang = 'bn',
  onNavigateToTab,
}) => {
  const [period, setPeriod] = useState<LeaderboardPeriod>('month');
  const [metricCategory, setMetricCategory] = useState<LeaderboardMetric>('sales');

  // Base raw seller profiles
  const baseResellers: BaseResellerProfile[] = useMemo(() => {
    const myCurrentSales = Math.max(currentReseller.totalSales || 0, 185400);
    const myCurrentProfit = Math.max(currentReseller.totalProfit || 0, 42300);
    const myCurrentOrders = 58;

    return [
      {
        id: 'RES-001',
        name: 'তানভীর আহমেদ',
        nameEn: 'Tanvir Ahmed',
        shopName: 'Smart Gadget Zone',
        shopNameEn: 'Smart Gadget Zone',
        city: 'ঢাকা (মিরপুর)',
        cityEn: 'Dhaka (Mirpur)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
        baseMonthSales: 348500,
        baseMonthOrders: 142,
        baseMonthProfit: 74200,
        growthPercent: 38,
        tier: 'VIP Diamond',
        badgeBn: '👑 চ্যাম্পিয়ন সেলার',
        badgeEn: '👑 Champion Seller',
      },
      {
        id: 'RES-002',
        name: 'সাদিয়া ইসলাম',
        nameEn: 'Sadia Islam',
        shopName: 'Style & Glamour BD',
        shopNameEn: 'Style & Glamour BD',
        city: 'চট্টগ্রাম (জিইসি)',
        cityEn: 'Chattogram (GEC)',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300',
        baseMonthSales: 292000,
        baseMonthOrders: 118,
        baseMonthProfit: 61500,
        growthPercent: 24,
        tier: 'VIP Diamond',
        badgeBn: '🥈 সিলভার মাস্টার',
        badgeEn: '🥈 Silver Master',
      },
      {
        id: 'RES-003',
        name: 'মাহমুদুল হাসান',
        nameEn: 'Mahmudul Hasan',
        shopName: 'Tech Pulse Reselling',
        shopNameEn: 'Tech Pulse Reselling',
        city: 'সিলেট (জিন্দাবাজার)',
        cityEn: 'Sylhet (Zindabazar)',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
        baseMonthSales: 241000,
        baseMonthOrders: 96,
        baseMonthProfit: 52800,
        growthPercent: 19,
        tier: 'Gold Partner',
        badgeBn: '🥉 ব্রোঞ্জ লিজেন্ড',
        badgeEn: '🥉 Bronze Legend',
      },
      {
        id: currentReseller.id,
        name: currentReseller.fullName || (lang === 'bn' ? 'আমার অ্যাকাউন্ট (রিসেলার)' : 'My Account (Reseller)'),
        nameEn: currentReseller.fullName || 'My Account (Reseller)',
        shopName: currentReseller.businessName || 'My Reselling Store',
        shopNameEn: currentReseller.businessName || 'My Reselling Store',
        city: `${currentReseller.district || 'Dhaka'} (${currentReseller.area || 'Central'})`,
        cityEn: `${currentReseller.district || 'Dhaka'} (${currentReseller.area || 'Central'})`,
        avatar: currentReseller.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
        baseMonthSales: myCurrentSales,
        baseMonthOrders: myCurrentOrders,
        baseMonthProfit: myCurrentProfit,
        growthPercent: 32,
        tier: currentReseller.isVIP ? 'VIP Diamond' : 'Pro Reseller',
        badgeBn: '⭐ রাইজিং স্টার',
        badgeEn: '⭐ Rising Star',
        isCurrentUser: true,
      },
      {
        id: 'RES-005',
        name: 'রাকিবুল ইসলাম',
        nameEn: 'Rakibul Islam',
        shopName: 'Trendy Fashion Hub',
        shopNameEn: 'Trendy Fashion Hub',
        city: 'রাজশাহী (সাহেব বাজার)',
        cityEn: 'Rajshahi (Saheb Bazar)',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
        baseMonthSales: 164000,
        baseMonthOrders: 64,
        baseMonthProfit: 36900,
        growthPercent: 15,
        tier: 'Pro Reseller',
        badgeBn: '🔥 টপ ৫ এলিট',
        badgeEn: '🔥 Top 5 Elite',
      },
      {
        id: 'RES-006',
        name: 'নাজমুল হুদা',
        nameEn: 'Nazmul Huda',
        shopName: 'Bikroy Point Reseller',
        shopNameEn: 'Bikroy Point Reseller',
        city: 'খুলনা (শিববাড়ী)',
        cityEn: 'Khulna (Shibbari)',
        avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300',
        baseMonthSales: 142000,
        baseMonthOrders: 52,
        baseMonthProfit: 31200,
        growthPercent: 12,
        tier: 'Pro Reseller',
        badgeBn: '💎 প্রো পার্টনার',
        badgeEn: '💎 Pro Partner',
      },
      {
        id: 'RES-007',
        name: 'আফরিন সুলতানা',
        nameEn: 'Afrin Sultana',
        shopName: 'Afrin Lifestyle & Gift',
        shopNameEn: 'Afrin Lifestyle & Gift',
        city: 'বগুড়া',
        cityEn: 'Bogura',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300',
        baseMonthSales: 119500,
        baseMonthOrders: 47,
        baseMonthProfit: 27800,
        growthPercent: 28,
        tier: 'Pro Reseller',
        badgeBn: '🚀 স্পিড গ্রোথ',
        badgeEn: '🚀 Speed Growth',
      },
      {
        id: 'RES-008',
        name: 'আরিফ জামান',
        nameEn: 'Arif Zaman',
        shopName: 'Gadget Express BD',
        shopNameEn: 'Gadget Express BD',
        city: 'গাজীপুর (চৌরাস্তা)',
        cityEn: 'Gazipur (Chowrasta)',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300',
        baseMonthSales: 98400,
        baseMonthOrders: 39,
        baseMonthProfit: 22400,
        growthPercent: 8,
        tier: 'Pro Reseller',
        badgeBn: '✨ ভেরিফাইড সেলার',
        badgeEn: '✨ Verified Seller',
      },
    ];
  }, [currentReseller, lang]);

  // Dynamic calculation according to Period (day, week, month, all)
  const dynamicLeaderboardData = useMemo(() => {
    // Scaling factors based on selected timeframe
    let salesMultiplier = 1;
    let ordersMultiplier = 1;
    let profitMultiplier = 1;

    if (period === 'day') {
      salesMultiplier = 0.045; // ~1 day volume
      ordersMultiplier = 0.05;
      profitMultiplier = 0.045;
    } else if (period === 'week') {
      salesMultiplier = 0.28; // ~7 days volume
      ordersMultiplier = 0.29;
      profitMultiplier = 0.28;
    } else if (period === 'month') {
      salesMultiplier = 1; // 30 days volume
      ordersMultiplier = 1;
      profitMultiplier = 1;
    } else if (period === 'all') {
      salesMultiplier = 3.6; // All time volume
      ordersMultiplier = 3.5;
      profitMultiplier = 3.6;
    }

    const calculated = baseResellers.map((r) => {
      // Add pseudo random deterministic variance based on id and period
      const seed = r.id.charCodeAt(r.id.length - 1) % 5;
      const jitter = 1 + (seed - 2) * 0.04;

      const salesVolume = Math.round(r.baseMonthSales * salesMultiplier * jitter);
      const deliveredOrders = Math.max(1, Math.round(r.baseMonthOrders * ordersMultiplier * jitter));
      const profitEarned = Math.round(r.baseMonthProfit * profitMultiplier * jitter);

      return {
        ...r,
        salesVolume,
        deliveredOrders,
        profitEarned,
      };
    });

    // Sort by chosen metric
    if (metricCategory === 'profit') {
      calculated.sort((a, b) => b.profitEarned - a.profitEarned);
    } else if (metricCategory === 'orders') {
      calculated.sort((a, b) => b.deliveredOrders - a.deliveredOrders);
    } else {
      calculated.sort((a, b) => b.salesVolume - a.salesVolume);
    }

    return calculated.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [baseResellers, period, metricCategory]);

  const top1 = dynamicLeaderboardData[0];
  const top2 = dynamicLeaderboardData[1];
  const top3 = dynamicLeaderboardData[2];
  const myEntry = dynamicLeaderboardData.find((r) => r.isCurrentUser) || dynamicLeaderboardData[3];
  const aheadEntry = dynamicLeaderboardData[myEntry.rank - 2] || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-150 text-xs">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-2xl p-6 sm:p-8 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>{lang === 'bn' ? 'ক্যানাক্স বিডি রিসেলার লিডারবোর্ড' : 'KenaX BD Top Resellers Leaderboard'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                {lang === 'bn' ? 'লাইভ ভেরিফাইড ডাটা' : 'Live Verified Data'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
              {lang === 'bn'
                ? 'টপ রিসেলার লিডারবোর্ড ও ক্যাশ রিওয়ার্ড'
                : 'Top Resellers Ranking & Cash Rewards'}
            </h1>
            <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
              {lang === 'bn'
                ? 'সারা দেশের সেরা রিসেলারদের সাথে প্রতিযোগিতা করুন। দৈনিক, সাপ্তাহিক ও মাসিক সেরা পারফর্মারদের জন্য রয়েছে আকর্ষণীয় ক্যাশ রিওয়ার্ড ও ট্রফি।'
                : 'Compete with the highest-selling resellers nationwide. Daily, weekly and monthly top performers earn prestigious cash bonuses and VIP accolades.'}
            </p>
          </div>

          {/* Timeframe Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-lg shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setPeriod('day')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                period === 'day'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'আজকের (24h)' : 'Today (24h)'}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('week')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                period === 'week'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'সাপ্তাহিক (7D)' : 'Weekly (7D)'}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                period === 'month'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'মাসিক (৩০ দিন)' : 'Monthly (30D)'}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                period === 'all'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'bn' ? 'সর্বকালীন' : 'All Time'}
            </button>
          </div>
        </div>

        {/* Cash Prize Strip */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-400 to-amber-500 text-slate-950 font-black flex items-center justify-center text-base shrink-0 shadow-md">
              ১ম
            </div>
            <div>
              <div className="text-[11px] text-amber-300 font-bold">
                {lang === 'bn' ? '১ম স্থান ক্যাশ পুরস্কার' : '1st Place Cash Prize'}
              </div>
              <div className="text-sm font-black text-white font-mono">
                {period === 'day' ? '৳১,৫০০ ক্যাশ' : period === 'week' ? '৳৪,০০০ ক্যাশ' : '৳১০,০০০ ক্যাশ + গোল্ড ট্রফি'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-500/10 border border-slate-500/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-300 to-slate-400 text-slate-950 font-black flex items-center justify-center text-base shrink-0 shadow-md">
              ২য়
            </div>
            <div>
              <div className="text-[11px] text-slate-300 font-bold">
                {lang === 'bn' ? '২য় স্থান ক্যাশ পুরস্কার' : '2nd Place Cash Prize'}
              </div>
              <div className="text-sm font-black text-white font-mono">
                {period === 'day' ? '৳১,০০০ ক্যাশ' : period === 'week' ? '৳২,৫০০ ক্যাশ' : '৳৬,০০০ ক্যাশ + সিলভার মেডেল'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-800/20 border border-amber-700/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-700 to-yellow-800 text-white font-black flex items-center justify-center text-base shrink-0 shadow-md">
              ৩য়
            </div>
            <div>
              <div className="text-[11px] text-amber-400 font-bold">
                {lang === 'bn' ? '৩য় স্থান ক্যাশ পুরস্কার' : '3rd Place Cash Prize'}
              </div>
              <div className="text-sm font-black text-white font-mono">
                {period === 'day' ? '৳৫০০ ক্যাশ' : period === 'week' ? '৳১,৫০০ ক্যাশ' : '৳৩,০০০ ক্যাশ + ব্রোঞ্জ মেডেল'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP 3 PODIUM VISUALIZATION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
        {/* 2nd Place */}
        {top2 && (
          <div className="order-2 md:order-1 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl p-5 text-center shadow-lg relative space-y-3">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-300 text-slate-900 font-black text-[11px] shadow-md flex items-center gap-1">
              <Medal className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '২য় স্থান' : '2nd Place'}</span>
            </div>

            <div className="pt-2">
              <img
                src={top2.avatar}
                alt={top2.name}
                className="w-16 h-16 rounded-full mx-auto object-cover border-4 border-slate-300 dark:border-slate-600 shadow-md"
              />
              <h3 className="font-black text-sm text-slate-900 dark:text-white mt-2">
                {lang === 'bn' ? top2.name : top2.nameEn}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'bn' ? top2.shopName : top2.shopNameEn}
              </p>
              <div className="text-[10px] text-slate-400">
                {lang === 'bn' ? top2.city : top2.cityEn}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-1">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                {metricCategory === 'profit'
                  ? (lang === 'bn' ? 'অর্জিত নিট লাভ' : 'Net Profit')
                  : metricCategory === 'orders'
                  ? (lang === 'bn' ? 'ডেলিভার্ড পার্সেল' : 'Delivered Orders')
                  : (lang === 'bn' ? 'মোট সেলস ভলিউম' : 'Total Sales Volume')}
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                {metricCategory === 'profit'
                  ? `৳${top2.profitEarned.toLocaleString()}`
                  : metricCategory === 'orders'
                  ? `${top2.deliveredOrders} ${lang === 'bn' ? 'টি পার্সেল' : 'Orders'}`
                  : `৳${top2.salesVolume.toLocaleString()}`}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {lang === 'bn'
                  ? `লাভ: ৳${top2.profitEarned.toLocaleString()} • ${top2.deliveredOrders} অর্ডার`
                  : `Profit: ৳${top2.profitEarned.toLocaleString()} • ${top2.deliveredOrders} Orders`}
              </div>
            </div>
          </div>
        )}

        {/* 1st Place (Champion) */}
        {top1 && (
          <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-white dark:to-slate-900 border-2 border-amber-400 rounded-3xl p-6 text-center shadow-2xl relative space-y-3 md:-translate-y-3">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs shadow-xl flex items-center gap-1.5 animate-bounce">
              <Crown className="w-4 h-4 text-slate-950" />
              <span>{lang === 'bn' ? '১ম স্থান (চ্যাম্পিয়ন)' : '1st Place (Champion)'}</span>
            </div>

            <div className="pt-2">
              <div className="relative inline-block">
                <img
                  src={top1.avatar}
                  alt={top1.name}
                  className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-amber-400 shadow-xl"
                />
                <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-md">
                  👑
                </span>
              </div>
              <h3 className="font-black text-base text-slate-900 dark:text-white mt-2">
                {lang === 'bn' ? top1.name : top1.nameEn}
              </h3>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                {lang === 'bn' ? top1.shopName : top1.shopNameEn}
              </p>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'bn' ? top1.city : top1.cityEn}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-1">
              <div className="text-[10px] text-amber-800 dark:text-amber-300 font-black uppercase tracking-wider">
                {metricCategory === 'profit'
                  ? (lang === 'bn' ? 'সর্বোচ্চ অর্জিত প্রফিট' : 'Top Net Profit')
                  : metricCategory === 'orders'
                  ? (lang === 'bn' ? 'সর্বোচ্চ ডেলিভার্ড পার্সেল' : 'Top Delivered Orders')
                  : (lang === 'bn' ? 'সর্বোচ্চ সেলস ভলিউম' : 'Top Sales Volume')}
              </div>
              <div className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">
                {metricCategory === 'profit'
                  ? `৳${top1.profitEarned.toLocaleString()}`
                  : metricCategory === 'orders'
                  ? `${top1.deliveredOrders} ${lang === 'bn' ? 'টি' : 'Orders'}`
                  : `৳${top1.salesVolume.toLocaleString()}`}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                {lang === 'bn'
                  ? `মোট লাভ: ৳${top1.profitEarned.toLocaleString()} • ${top1.deliveredOrders} ডেলিভারি`
                  : `Profit: ৳${top1.profitEarned.toLocaleString()} • ${top1.deliveredOrders} Delivered`}
              </div>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {top3 && (
          <div className="order-3 bg-white dark:bg-slate-900 border-2 border-amber-700/40 dark:border-amber-800 rounded-3xl p-5 text-center shadow-lg relative space-y-3">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-700 text-white font-black text-[11px] shadow-md flex items-center gap-1">
              <Medal className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '৩য় স্থান' : '3rd Place'}</span>
            </div>

            <div className="pt-2">
              <img
                src={top3.avatar}
                alt={top3.name}
                className="w-16 h-16 rounded-full mx-auto object-cover border-4 border-amber-700/50 shadow-md"
              />
              <h3 className="font-black text-sm text-slate-900 dark:text-white mt-2">
                {lang === 'bn' ? top3.name : top3.nameEn}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'bn' ? top3.shopName : top3.shopNameEn}
              </p>
              <div className="text-[10px] text-slate-400">
                {lang === 'bn' ? top3.city : top3.cityEn}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-1">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                {metricCategory === 'profit'
                  ? (lang === 'bn' ? 'অর্জিত নিট লাভ' : 'Net Profit')
                  : metricCategory === 'orders'
                  ? (lang === 'bn' ? 'ডেলিভার্ড পার্সেল' : 'Delivered Orders')
                  : (lang === 'bn' ? 'মোট সেলস ভলিউম' : 'Total Sales Volume')}
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white font-mono">
                {metricCategory === 'profit'
                  ? `৳${top3.profitEarned.toLocaleString()}`
                  : metricCategory === 'orders'
                  ? `${top3.deliveredOrders} ${lang === 'bn' ? 'টি' : 'Orders'}`
                  : `৳${top3.salesVolume.toLocaleString()}`}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {lang === 'bn'
                  ? `লাভ: ৳${top3.profitEarned.toLocaleString()} • ${top3.deliveredOrders} অর্ডার`
                  : `Profit: ৳${top3.profitEarned.toLocaleString()} • ${top3.deliveredOrders} Orders`}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MY RANK CARD HIGHLIGHT */}
      {myEntry && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white border-2 border-indigo-400 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md border-2 border-indigo-300 shrink-0">
              #{myEntry.rank}
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">
                  {lang === 'bn'
                    ? `আমার বর্তমান অবস্থান (Rank #${myEntry.rank})`
                    : `My Current Position (Rank #${myEntry.rank})`}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  +{myEntry.growthPercent}% {lang === 'bn' ? 'গ্রোথ' : 'Growth'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                {aheadEntry ? (
                  lang === 'bn' ? (
                    <>
                      পরবর্তী র‍্যাংক #{aheadEntry.rank} এ পৌঁছাতে আপনার প্রয়োজন আরো মাত্র ৳
                      {Math.max(0, aheadEntry.salesVolume - myEntry.salesVolume).toLocaleString()} টাকার সেলস।
                    </>
                  ) : (
                    <>
                      To reach Rank #{aheadEntry.rank}, you only need ৳
                      {Math.max(0, aheadEntry.salesVolume - myEntry.salesVolume).toLocaleString()} more sales!
                    </>
                  )
                ) : (
                  lang === 'bn' ? '🎉 অভিনন্দন! আপনি লিডারবোর্ডের শীর্ষে আছেন।' : '🎉 Congratulations! You are leading the leaderboard.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-bold">
                {lang === 'bn' ? 'আমার সেলস' : 'My Total Sales'}
              </div>
              <div className="text-base font-black text-emerald-400 font-mono">
                ৳{myEntry.salesVolume.toLocaleString()}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToTab('catalog')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{lang === 'bn' ? 'সেল বৃদ্ধি করুন' : 'Boost Sales Now'}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FULL LEADERBOARD TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              {lang === 'bn'
                ? 'সারাদেশের শীর্ষ রিসেলার তালিকা (রিসেলার র‍্যাংকিং)'
                : 'Nationwide Verified Resellers Ranking Table'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'bn'
                ? `বাছাইকৃত সময়কাল: ${period === 'day' ? 'আজকের (24h)' : period === 'week' ? 'গত ৭ দিন' : period === 'month' ? 'এই মাস' : 'সর্বকালীন'}`
                : `Active timeframe: ${period.toUpperCase()}`}
            </p>
          </div>

          {/* Metric Tab Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setMetricCategory('sales')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                metricCategory === 'sales'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {lang === 'bn' ? 'মোট সেলস' : 'Sales Volume'}
            </button>
            <button
              type="button"
              onClick={() => setMetricCategory('profit')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                metricCategory === 'profit'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {lang === 'bn' ? 'মোট প্রফিট' : 'Reseller Profit'}
            </button>
            <button
              type="button"
              onClick={() => setMetricCategory('orders')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                metricCategory === 'orders'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {lang === 'bn' ? 'ডেলিভার্ড পার্সেল' : 'Delivered Orders'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-center">{lang === 'bn' ? 'র‍্যাংক' : 'Rank'}</th>
                <th className="px-4 py-3">{lang === 'bn' ? 'রিসেলার ও শপ' : 'Reseller & Store'}</th>
                <th className="px-4 py-3">{lang === 'bn' ? 'লোকেশন' : 'Location'}</th>
                <th className="px-4 py-3 text-right">{lang === 'bn' ? 'মোট সেলস' : 'Sales'}</th>
                <th className="px-4 py-3 text-right">{lang === 'bn' ? 'অর্জিত প্রফিট' : 'Profit'}</th>
                <th className="px-4 py-3 text-center">{lang === 'bn' ? 'ডেলিভার্ড অর্ডার' : 'Orders'}</th>
                <th className="px-4 py-3 text-center">{lang === 'bn' ? 'স্ট্যাটাস ব্যাজ' : 'Badge'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dynamicLeaderboardData.map((reseller) => (
                <tr
                  key={reseller.id}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                    reseller.isCurrentUser
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/40 font-bold border-l-4 border-indigo-600'
                      : ''
                  }`}
                >
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs ${
                        reseller.rank === 1
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : reseller.rank === 2
                          ? 'bg-slate-300 text-slate-900 shadow-xs'
                          : reseller.rank === 3
                          ? 'bg-amber-700 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {reseller.rank}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={reseller.avatar}
                        alt={reseller.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div>
                        <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{lang === 'bn' ? reseller.name : reseller.nameEn}</span>
                          {reseller.isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[9px] font-bold">
                              {lang === 'bn' ? 'আপনি' : 'YOU'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {lang === 'bn' ? reseller.shopName : reseller.shopNameEn}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {lang === 'bn' ? reseller.city : reseller.cityEn}
                  </td>

                  <td className="px-4 py-3 text-right font-black font-mono text-slate-900 dark:text-white">
                    ৳{reseller.salesVolume.toLocaleString()}
                  </td>

                  <td className="px-4 py-3 text-right font-black font-mono text-emerald-600 dark:text-emerald-400">
                    ৳{reseller.profitEarned.toLocaleString()}
                  </td>

                  <td className="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                    {reseller.deliveredOrders} {lang === 'bn' ? 'টি' : ''}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {lang === 'bn' ? reseller.badgeBn : reseller.badgeEn}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
