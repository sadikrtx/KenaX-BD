import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Smartphone,
  Shirt,
  Armchair,
  Sparkles,
  Dumbbell,
  Baby,
  Car,
  HeartPulse,
  Headphones,
  Grid,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Category } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface CategoryNavProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (categoryName: string) => void;
  onNavigate: (view: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  onNavigate,
}) => {
  const { t } = useLanguage();

  const getCategoryDisplayName = (name: string) => {
    const map: Record<string, string> = {
      'Electronics & Gadgets': 'ইলেকট্রনিক্স ও গ্যাজেট',
      'Fashion & Clothing': 'ফ্যাশন ও ক্লথিং',
      'Fashion & Lifestyle': 'ফ্যাশন ও লাইফস্টাইল',
      'Home & Living': 'হোম ও লিভিং',
      'Beauty & Personal Care': 'বিউটি ও পার্সোনাল কেয়ার',
      'Sports & Fitness': 'স্পোর্টস ও ফিটনেস',
      'Toys & Kids': 'টয় ও বেবি কেয়ার',
      'Automotive': 'অটোমোটিভ',
      'Health & Wellness': 'হেলথ ও ওয়েলনেস',
      'Accessories': 'অ্যাক্সেসরিজ',
    };
    return t(map[name] || name, name);
  };
  const getIcon = (slug: string) => {
    switch (slug) {
      case 'electronics-gadgets':
        return <Smartphone className="w-6 h-6 text-sky-600" />;
      case 'fashion-clothing':
        return <Shirt className="w-6 h-6 text-rose-500" />;
      case 'home-living':
        return <Armchair className="w-6 h-6 text-emerald-600" />;
      case 'beauty-personal-care':
        return <Sparkles className="w-6 h-6 text-purple-500" />;
      case 'sports-fitness':
        return <Dumbbell className="w-6 h-6 text-blue-600" />;
      case 'toys-kids':
        return <Baby className="w-6 h-6 text-amber-500" />;
      case 'automotive':
        return <Car className="w-6 h-6 text-sky-700" />;
      case 'health-wellness':
        return <HeartPulse className="w-6 h-6 text-red-500" />;
      case 'accessories':
        return <Headphones className="w-6 h-6 text-indigo-600" />;
      default:
        return <Grid className="w-6 h-6 text-slate-600" />;
    }
  };

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  }, [categories]);

  const hasMoreThanNine = sortedCategories.length > 9;

  // Manual smooth scroll helpers
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleManualScroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const delta = direction === 'left' ? -280 : 280;
    container.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <section className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-5">
      {/* Header section with title, subtitle & View All */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">{t('ক্যাটাগরি অনুযায়ী শপ করুন', 'Shop by Category')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('সেরা কালেকশন থেকে আপনার পছন্দের ক্যাটাগরি বেছে নিন', 'Explore our wide collection of categories')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Manual arrow controls visible on desktop and tablet */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            <button
              type="button"
              onClick={() => handleManualScroll('left')}
              className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              title="Scroll Left"
              aria-label="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleManualScroll('right')}
              className="w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              title="Scroll Right"
              aria-label="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => {
              onSelectCategory('All');
              onNavigate('shop');
            }}
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center gap-1 cursor-pointer py-1"
          >
            <span>{t('সব দেখুন', 'View All')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* High performance native momentum touch scroll */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2.5 sm:gap-3.5 overflow-x-auto scrollbar-none py-1 px-0.5 overscroll-x-contain touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {sortedCategories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.id || cat.slug}
                type="button"
                onClick={() => {
                  onSelectCategory(cat.name);
                  onNavigate('shop');
                }}
                className={`flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border transition-all cursor-pointer text-center shrink-0 select-none group active:scale-95 ${
                  isSelected
                    ? 'bg-sky-50 dark:bg-sky-950/80 border-sky-500 dark:border-sky-500 shadow-xs ring-2 ring-sky-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-500 hover:shadow-xs'
                } w-[112px] sm:w-[136px] md:w-[150px]`}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 group-hover:bg-sky-50 dark:group-hover:bg-sky-950/50 flex items-center justify-center mb-1.5 sm:mb-2 transition-colors">
                  {getIcon(cat.slug)}
                </div>
                <span className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white line-clamp-1 leading-tight group-hover:text-sky-600 dark:group-hover:text-sky-400 w-full px-1">
                  {getCategoryDisplayName(cat.name)}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {cat.itemCount ?? 10}+ {t('টি পণ্য', 'items')}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

