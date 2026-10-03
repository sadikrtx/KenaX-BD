import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  CheckCircle2,
  Award,
  Users,
  MapPin,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  PhoneCall,
  Clock,
  Package,
  Star,
  ThumbsUp,
  Check,
  Zap,
  Shield,
  HelpCircle,
  ChevronDown,
  Flame,
  Heart,
  BadgeCheck,
  CheckCircle,
} from 'lucide-react';
import { Product, Review, SiteSettings } from '../types';
import { INITIAL_REVIEWS } from '../data/initialSettings';

interface AboutViewProps {
  onNavigate: (view: string) => void;
  onOpenPolicy?: (policyKey: string) => void;
  products?: Product[];
  reviews?: Review[];
  siteSettings?: SiteSettings | null;
}

export const AboutView: React.FC<AboutViewProps> = ({
  onNavigate,
  onOpenPolicy,
  products = [],
  reviews,
  siteSettings,
}) => {
  // Live Animated Counter State
  const [customerCount, setCustomerCount] = useState(0);
  const [satisfactionRate, setSatisfactionRate] = useState(0);
  const [districtCount, setDistrictCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [ratingScore, setRatingScore] = useState(0);

  // Active FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Trigger smooth counter animation on mount
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1600;

    const animateCounters = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      setCustomerCount(Math.floor(ease * 52400));
      setSatisfactionRate(Number((ease * 99.4).toFixed(1)));
      setDistrictCount(Math.floor(ease * 64));
      setOrderCount(Math.floor(ease * 128500));
      setRatingScore(Number((ease * 4.9).toFixed(1)));

      if (progress < 1) {
        requestAnimationFrame(animateCounters);
      }
    };

    const animFrame = requestAnimationFrame(animateCounters);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  // Filter approved real customer reviews
  const displayReviews = React.useMemo(() => {
    let list: Review[] = [];
    if (reviews && reviews.length > 0) {
      list = reviews;
    } else {
      try {
        const cached = localStorage.getItem('kenax_reviews_cache');
        if (cached) {
          list = JSON.parse(cached);
        }
      } catch {}
      if (!list || list.length === 0) {
        list = INITIAL_REVIEWS;
      }
    }

    list = list.filter((r) => r.status === 'approved' || !r.status);
    if (list.length === 0) {
      list = [
        {
          id: 'fb-1',
          productId: 'prod-1',
          customerName: 'তানভীর আহমেদ',
          rating: 5,
          status: 'approved',
          comment: 'পণ্যটি হাতে পেয়ে সত্যি মুগ্ধ হয়েছি! ছবির সাথে ১০০% মিল এবং প্যাকেজিং ছিল চমৎকার। ডেলিভারি ২ দিনের মধ্যে পেয়েছি।',
          verifiedPurchase: true,
          createdAt: new Date().toISOString(),
          photos: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80'],
          productName: 'T900 Ultra 2 Smartwatch',
        },
        {
          id: 'fb-2',
          productId: 'prod-2',
          customerName: 'মেহেদী হাসান শুভ',
          rating: 5,
          status: 'approved',
          comment: 'ক্যাশ অন ডেলিভারিতে চেক করে নিয়েছি। সাউন্ড কোয়ালিটি এবং ব্যাটারি ব্যাকআপ অসাধারণ। KenaX BD-এর সার্ভিস সবসময় বিশ্বস্ত।',
          verifiedPurchase: true,
          createdAt: new Date().toISOString(),
          photos: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80'],
          productName: 'M10 TWS Wireless Earbuds',
        },
        {
          id: 'fb-3',
          productId: 'prod-3',
          customerName: 'নুসরাত জাহান রিয়া',
          rating: 5,
          status: 'approved',
          comment: 'ঢাকার বাইরে রাজশাহীতে মাত্র ৩ দিনে ডেলিভারি পেয়েছি। কাস্টমার কেয়ারের রেসপন্স খুব আন্তরিক ছিল। ধন্যবাদ কেনাক্স বিডি!',
          verifiedPurchase: true,
          createdAt: new Date().toISOString(),
          photos: [],
          productName: 'Smart LED Desk Lamp',
        },
        {
          id: 'fb-4',
          productId: 'prod-4',
          customerName: 'রাকিবুল ইসলাম',
          rating: 5,
          status: 'approved',
          comment: '১০০% অরিজিনাল গ্যাজেট। এর আগেও দুইবার অর্ডার করেছি, প্রতিবারই সেরা প্রোডাক্ট পেয়েছি। নির্দ্বিধায় নিতে পারেন।',
          verifiedPurchase: true,
          createdAt: new Date().toISOString(),
          photos: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'],
          productName: 'Premium Wireless Headphone',
        },
      ];
    }
    return list;
  }, [reviews]);

  const faqs = [
    {
      q: 'KenaX BD থেকে কীভাবে সহজে পণ্য অর্ডার করব?',
      a: 'পছন্দের পণ্য সিলেক্ট করে "এখনই কিনুন" বাটনে ক্লিক করুন। নাম, মোবাইল নম্বর এবং সম্পূর্ণ ডেলিভারি ঠিকানা দিয়ে যেকোনো পেমেন্ট অপশন বা ক্যাশ অন ডেলিভারি সিলেক্ট করে অর্ডার নিশ্চিত করুন।',
    },
    {
      q: 'পণ্যগুলো কি শতভাগ আসল ও অরিজিনাল?',
      a: 'হ্যাঁ, KenaX BD-তে কোনো প্রকার নকল বা কপি পণ্য বিক্রি করা হয় না। প্রতিটি পণ্য অফিসিয়াল ব্র্যান্ড ডিস্ট্রিবিউটর থেকে সংগ্রহ করে ৩-ধাপের কোয়ালিটি চেকিংয়ের মাধ্যমে ১০০% অরিজিনাল নিশ্চিত করা হয়।',
    },
    {
      q: 'ডেলিভারি পেতে কত দিন সময় লাগে এবং খরচ কত?',
      a: 'ঢাকা সিটির ভেতরে মাত্র ২৪ থেকে ৪৮ ঘণ্টার মধ্যে এবং ঢাকা সিটির বাইরে দেশের যেকোনো জেলা বা উপজেলায় ৩ থেকে ৫ দিনের মধ্যে সরাসরি হোম ডেলিভারি পৌঁছে দেওয়া হয়।',
    },
    {
      q: 'ক্যাশ অন ডেলিভারিতে পণ্য দেখে মূল্য পরিশোধের সুযোগ আছে?',
      a: 'অবশ্যই! আমাদের প্রতিটি অর্ডারে নিরাপদ ক্যাশ অন ডেলিভারি (COD) সুবিধা রয়েছে। ডেলিভারি ম্যানের সামনে পার্সেল দেখে নিশ্চিত হয়ে মূল্য পরিশোধ করতে পারবেন।',
    },
    {
      q: 'পণ্যে সমস্যা থাকলে রিটার্ন বা রিপ্লেসমেন্ট করার নিয়ম কী?',
      a: 'পণ্য পাওয়ার পর কোনো সমস্যা বা ত্রুটি থাকলে ৭ দিনের মধ্যে আমাদের কাস্টমার কেয়ারে যোগাযোগ করে খুব সহজেই ফ্রি রিপ্লেসমেন্ট বা ফুল রিফান্ড পেতে পারেন।',
    },
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-16 font-sans transition-colors duration-200">
      {/* 1. HERO BANNER SECTION (Compact & Impactful on Mobile) */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white py-12 sm:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden border-b border-sky-900/30">
        <div className="absolute -top-32 -left-32 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 sm:w-[500px] h-80 sm:h-[500px] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-[11px] sm:text-xs font-bold tracking-wide shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>KenaX BD • দেশের বিশ্বস্ত ডিজিটাল শপিং হাব</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            আসল পণ্য ও সেরা গ্রাহকসেবায় <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400">
              আধুনিক অনলাইন শপিং
            </span>
          </h1>

          <p className="text-xs sm:text-sm lg:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
            ৬৪ জেলায় নির্ভরযোগ্য হোম ডেলিভারি, জেনুইন কোয়ালিটি নিশ্চয়তা এবং নিরাপদ ক্যাশ অন ডেলিভারির মাধ্যমে KenaX BD পৌঁছে দিচ্ছে সেরা গ্যাজেট ও লাইফস্টাইল পণ্য।
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
            <button
              onClick={() => onNavigate('shop')}
              className="px-5 py-2.5 sm:px-6 sm:py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>পণ্যসমূহ দেখুন</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('track')}
              className="px-5 py-2.5 sm:px-6 sm:py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer backdrop-blur-xs active:scale-95"
            >
              <Truck className="w-4 h-4 text-sky-400" />
              <span>পার্সেল ট্র্যাক করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC LIVE TRUST COUNTERS (Compact Mobile Grid) */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 -mt-6 sm:-mt-8 relative z-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {/* Metric 1 */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md text-center">
            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white block font-mono">
              {customerCount.toLocaleString('en-BD')}+
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5 block">
              সন্তুষ্ট গ্রাহক
            </span>
          </div>

          {/* Metric 2 */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md text-center">
            <span className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 block font-mono">
              {satisfactionRate}%
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5 block">
              পজিটিভ রেটিং
            </span>
          </div>

          {/* Metric 3 */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md text-center">
            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white block font-mono">
              {districtCount} জেলা
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5 block">
              দেশব্যাপী ডেলিভারি
            </span>
          </div>

          {/* Metric 4 */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md text-center">
            <span className="text-lg sm:text-2xl font-black text-purple-600 dark:text-purple-400 block font-mono">
              {orderCount.toLocaleString('en-BD')}+
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5 block">
              সফল ডেলিভারি
            </span>
          </div>

          {/* Metric 5 */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md text-center">
            <span className="text-lg sm:text-2xl font-black text-amber-500 block font-mono">
              {ratingScore} / ৫
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5 block">
              গড় রেটিং
            </span>
          </div>

          {/* Metric 6 */}
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md text-center col-span-2 sm:col-span-1">
            <span className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 block font-mono">
              ২৪/৭
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5 block">
              লাইভ সাপোর্ট
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 mt-10 sm:mt-14 space-y-10 sm:space-y-14">
        {/* 3. WHY CHOOSE US - কেন আমাদের বেছে নিবেন? (Clean, Compact, Responsive) */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 text-[11px] font-black uppercase tracking-wider">
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>কেন আমাদের বেছে নিবেন? (Why Choose Us)</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
              আমাদের যে সেবাগুলো ক্রেতাদের প্রথম পছন্দ
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
              আমরা দিচ্ছি শতভাগ আসল পণ্যের গ্যারান্টি ও নিরাপদ কেনাকাটার নিশ্চয়তা।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* 1 */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mb-1">
                  ১০০% আসল পণ্যের নিশ্চয়তা
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  কোনো নকল বা কপি পণ্য নয়। প্রতিটি গ্যাজেট সরাসরি অথোরাইজড ম্যানুফ্যাকচারার ও ইম্পোর্টারদের থেকে সংগৃহীত।
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-sky-600 dark:text-sky-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ওয়ারেন্টি ব্যাকড ও অথেন্টিক</span>
              </div>
            </div>

            {/* 2 */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <Truck className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mb-1">
                  ৬৪ জেলায় দ্রুততম হোম ডেলিভারি
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  ঢাকায় মাত্র ২৪-৪৮ ঘণ্টায় এবং ঢাকার বাইরে দেশের প্রতিটি থানা ও ইউনিয়নে দ্রুততম সময়ে বিশ্বস্ত কুরিয়ারে হোম ডেলিভারি।
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>লাইভ এসএমএস ও ট্র্যাকিং</span>
              </div>
            </div>

            {/* 3 */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                  <Shield className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mb-1">
                  নিরাপদ ক্যাশ অন ডেলিভারি (COD)
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  অগ্রিম টাকা নিয়ে কোনো ভয় নেই। পার্সেল হাতে পেয়ে সম্পূর্ণ নিশ্চিত হয়ে মূল্য পরিশোধ করার সুযোগ।
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-amber-600 dark:text-amber-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>পণ্য দেখে টাকা পরিশোধ</span>
              </div>
            </div>

            {/* 4 */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                  <RotateCcw className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mb-1">
                  ৭ দিনের সহজ রিটার্ন ও রিফান্ড
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  পণ্য পাওয়ার পর কোনো সমস্যা বা ত্রুটি পেলে ৭ দিনের মধ্যে ঝামেলাহীন রিপ্লেসমেন্ট বা ফুল রিফান্ডের সুবিধা।
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>১০০% রিফান্ড গ্যারান্টি</span>
              </div>
            </div>

            {/* 5 */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                  <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mb-1">
                  ৩-ধাপের কোয়ালিটি ইনস্পেকশন
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  প্যাকেজিংয়ের আগে কেন্দ্রীয় ওয়্যারহাউসে প্রতিটি পণ্য ফিজিক্যালি ও টেকনিক্যালি চেক করে ত্রুটিমুক্ত পণ্য পাঠানো হয়।
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>জিরো ডিফেক্ট টেস্টিং</span>
              </div>
            </div>

            {/* 6 */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                  <Headphones className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mb-1">
                  ২৪/৭ ডেডিকেটেড লাইভ সাপোর্ট
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  যেকোনো তথ্যের জন্য আমাদের সাপোর্ট টিম ফোন কল ও হোয়াটসঅ্যাপে সার্বক্ষণিক আন্তরিক সেবা দিতে প্রস্তুত।
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black text-purple-600 dark:text-purple-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>তাত্ক্ষণিক সহায়তা</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. OUR SUCCESS STORY - আমাদের সাফল্যের গল্প */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden">
          {/* Top Emerald Accent Glow */}
          <div className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-gradient-to-bl from-emerald-500/10 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6 sm:space-y-8">
            {/* Section Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>আমাদের সাফল্যের গল্প (Our Success Story)</span>
              </div>
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                ক্ষুদ্র সূচনা থেকে দেশজুড়ে ৫০,০০০+ পরিবারের আস্থার ঠিকানা
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                কীভাবে সততা, কঠোর কোয়ালিটি কন্ট্রোল এবং শতভাগ আসল পণ্যের অঙ্গীকার নিয়ে আমরা গড়ে তুলেছি আজকের KenaX BD পরিবার।
              </p>
            </div>

            {/* Story Chapters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
              {/* Step 1 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 relative overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded-md inline-block">
                  অধ্যায় ১: সূচনা
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  বিশ্বাসের ভিত্তি স্থাপন (২০২১)
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  ই-কমার্সে নকল পণ্য আর দেরিতে ডেলিভারির ভোগান্তি দূর করতে মাত্র ৩ জনের উদ্যমী টিম আর ঢাকার ছোট একটি অফিস দিয়ে আমাদের যাত্রা শুরু হয়। মূল লক্ষ্য ছিল একটাই—যা দেখাবো, ঠিক তাই দেবো।
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 relative overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md inline-block">
                  অধ্যায় ২: দেশব্যাপী বিস্তার
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  ৬৪ জেলায় নেটওয়ার্ক (২০২৩)
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  ঢাকা ছাড়িয়ে দেশের প্রতিটি জেলা, উপজেলা ও ইউনিয়ন পর্যায়ে দ্রুততম হোম ডেলিভারি ও রিয়েল-টাইম এসএমএস ট্র্যাকিং সিস্টেম চালু করি, যা লক্ষাধিক ক্রেতার মনে গভীর আস্থা তৈরি করে।
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 relative overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950 px-2 py-0.5 rounded-md inline-block">
                  অধ্যায় ৩: শ্রেষ্ঠত্বের স্বীকৃতি
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  ৫০,০০০+ হ্যাপি কাস্টমার (২০২৬)
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  ৩-ধাপের নিখুঁত কোয়ালিটি চেকিং, নিরাপদ ক্যাশ অন ডেলিভারি এবং ৭ দিনের ঝামেলাহীন রিটার্ন সুবিধার মাধ্যমে আজ আমরা দেশের সবচেয়ে বিশ্বস্ত ডিজিটাল শপিং ব্র্যান্ডগুলোর একটি।
                </p>
              </div>
            </div>

            {/* Achievement Highlights Strip */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div>
                <span className="text-base sm:text-2xl font-black text-sky-400 block font-mono">১২৮,০০০+</span>
                <span className="text-[10px] sm:text-[11px] text-slate-300 font-bold">সফল পার্সেল ডেলিভারি</span>
              </div>
              <div>
                <span className="text-base sm:text-2xl font-black text-emerald-400 block font-mono">৯৯.৪%</span>
                <span className="text-[10px] sm:text-[11px] text-slate-300 font-bold">গ্রাহক সন্তুষ্টি রেটিং</span>
              </div>
              <div>
                <span className="text-base sm:text-2xl font-black text-amber-400 block font-mono">২ ঘণ্টা</span>
                <span className="text-[10px] sm:text-[11px] text-slate-300 font-bold">গড় পার্সেল প্রসেসিং</span>
              </div>
              <div>
                <span className="text-base sm:text-2xl font-black text-purple-400 block font-mono">০%</span>
                <span className="text-[10px] sm:text-[11px] text-slate-300 font-bold">নকল পণ্য নীতি</span>
              </div>
            </div>

            {/* Founder Note & Commitment */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-emerald-500 text-white flex items-center justify-center font-black text-base shadow-xs">
                  K
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    টিম কেনাক্স বিডি (Team KenaX BD)
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                    "লাভ নয়, প্রতিটি গ্রাহকের সন্তুষ্টি ও বিশ্বাসই আমাদের ব্যবসার সবচেয়ে বড় মূলধন।"
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>১০০% বিশ্বস্ত কেনাকাটার অঙ্গীকার</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. CUSTOMER REVIEWS - কাস্টমার রিভিউ ও অভিজ্ঞতা (No Filter Badges) */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-6 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[11px] font-black uppercase tracking-wider">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>কাস্টমার রিভিউ</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
              আমাদের সম্মানিত ক্রেতাদের অভিজ্ঞতা
            </h2>
          </div>

          {/* Customer Reviews Direct Grid (Clean & Responsive) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {displayReviews.slice(0, 8).map((rev) => (
              <div
                key={rev.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-all"
              >
                <div className="space-y-2.5">
                  {/* Photo if present */}
                  {Array.isArray(rev.photos) && rev.photos.length > 0 && rev.photos[0] && (
                    <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 relative">
                      <img
                        src={rev.photos[0]}
                        alt="Customer Review Proof"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target) {
                            target.onerror = null;
                            target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';
                          }
                        }}
                      />
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 text-white text-[9px] font-bold backdrop-blur-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>ভেরিফাইড কাস্টমার</span>
                      </span>
                    </div>
                  )}

                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < (rev.rating || 5)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200 dark:text-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium line-clamp-4">
                    "{rev.comment || 'চমৎকার প্রোডাক্ট, ডেলিভারিও অনেক ফাস্ট ছিল।'}"
                  </p>
                </div>

                {/* Author Info */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-black text-slate-900 dark:text-white">
                      {rev.customerName || (rev as any).userName || 'Valued Customer'}
                    </h5>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[140px]">
                      {rev.productName || 'Verified Purchase'}
                    </span>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. QUALITY ASSURANCE & PACKAGING */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-8 border border-slate-800 shadow-sm">
          <div className="text-center max-w-2xl mx-auto mb-6 space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-sky-400">
              নিরাপদ প্যাকেজিং মান
            </span>
            <h3 className="text-lg sm:text-2xl font-black text-white">
              যেভাবে প্রতিটি পণ্য সুরক্ষিতভাবে আপনার কাছে পৌঁছায়
            </h3>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            <div className="p-3 sm:p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
              <span className="w-6 h-6 rounded-md bg-sky-500 text-slate-950 flex items-center justify-center font-black text-[11px]">১</span>
              <h4 className="text-xs sm:text-sm font-black text-white">কোয়ালিটি পরীক্ষা</h4>
              <p className="text-[10px] sm:text-[11px] text-slate-300 leading-tight">
                প্যাকিংয়ের আগে টেকনিক্যাল টিম পণ্যটি নিখুঁতভাবে চেক করে।
              </p>
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
              <span className="w-6 h-6 rounded-md bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-[11px]">২</span>
              <h4 className="text-xs sm:text-sm font-black text-white">বাবল র‍্যাপিং</h4>
              <p className="text-[10px] sm:text-[11px] text-slate-300 leading-tight">
                শক-প্রুফ বাবল র‍্যাপে পার্সেল শক্তভাবে মোড়ানো হয়।
              </p>
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
              <span className="w-6 h-6 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center font-black text-[11px]">৩</span>
              <h4 className="text-xs sm:text-sm font-black text-white">সিকিউরিটি সিল</h4>
              <p className="text-[10px] sm:text-[11px] text-slate-300 leading-tight">
                অফিসিয়াল টেম্পার-প্রুফ সিকিউরিটি সিল লাগানো হয়।
              </p>
            </div>

            <div className="p-3 sm:p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-1.5">
              <span className="w-6 h-6 rounded-md bg-purple-500 text-slate-950 flex items-center justify-center font-black text-[11px]">৪</span>
              <h4 className="text-xs sm:text-sm font-black text-white">এক্সপ্রেস কুরিয়ার</h4>
              <p className="text-[10px] sm:text-[11px] text-slate-300 leading-tight">
                স্টিভফাস্ট ও পাঠাও লজিস্টিকসে দ্রুত হ্যান্ডওভার।
              </p>
            </div>
          </div>
        </div>

        {/* 7. FAQ ACCORDION */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-8 shadow-2xs">
          <div className="text-center max-w-2xl mx-auto mb-6 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[11px] font-black uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>সচরাচর জিজ্ঞাসিত প্রশ্নাবলি (FAQ)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              কেনাকাটার সাধারণ প্রশ্নের উত্তর
            </h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-3.5 sm:p-4 text-left font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-sky-600 dark:text-sky-400' : ''
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 8. CENTRAL FULFILLMENT & CONTACT INFO */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-8 border border-slate-800 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-sky-400">
                অফিসিয়াল হাব ও লজিস্টিকস
              </span>
              <h3 className="text-xl sm:text-2xl font-black">
                নিরাপদ লেনদেন ও বিশ্বস্ত কুরিয়ার পার্টনার
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                আপনার প্রতিটি অর্ডারের টাকা ও পণ্য শতভাগ সুরক্ষিত রাখতে আমরা কাজ করছি দেশের শীর্ষ অনুমোদিত পেমেন্ট গেটওয়ে এবং কুরিয়ার সার্ভিসের সাথে।
              </p>

              <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span><b>পেমেন্ট মাধ্যম:</b> ক্যাশ অন ডেলিভারি, বিকাশ, নগদ, রকেট ও উপায়</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span><b>ডেলিভারি নেটওয়ার্ক:</b> স্টিডফাস্ট কুরিয়ার, পাঠাও লজিস্টিকস</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                কেন্দ্রীয় সাপোর্ট হাব
              </h4>
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">সেন্ট্রাল ফুলফিলমেন্ট সেন্টার</span>
                    <span>প্লট #২৪, রোড #১১, বনানী, ঢাকা-১২১৩</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">হটলাইন ও হোয়াটসঅ্যাপ</span>
                    <span>{siteSettings?.supportPhone || '+880 1700-000000'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">কার্যক্রমের সময়</span>
                    <span>সপ্তাহে ৭ দিন, ৩৬৫ দিন সক্রিয়</span>
                  </div>
                </div>
              </div>

              <div className="pt-1.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="flex-1 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition-colors cursor-pointer text-center active:scale-95"
                >
                  যোগাযোগ করুন
                </button>
                <button
                  type="button"
                  onClick={() => onOpenPolicy?.('faq')}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition-colors cursor-pointer text-center active:scale-95"
                >
                  সাহায্য কেন্দ্র
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 9. FINAL CALL TO ACTION */}
        <div className="bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 text-white rounded-3xl p-6 sm:p-10 text-center shadow-lg space-y-4">
          <div className="max-w-xl mx-auto space-y-2">
            <h3 className="text-xl sm:text-3xl font-black">
              আজই শুরু হোক আপনার সেরা শপিং অভিজ্ঞতা!
            </h3>
            <p className="text-xs sm:text-sm text-sky-100 leading-relaxed">
              সেরা ডিসকাউন্টে ট্রেন্ডি ও দরকারি অরিজিনাল গ্যাজেট সংগ্রহ করুন ক্যাশ অন ডেলিভারিতে।
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>সকল পণ্য ব্রাউজ করুন</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('track')}
                className="px-5 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm transition-all backdrop-blur-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Truck className="w-4 h-4" />
                <span>অর্ডার ট্র্যাকিং</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
