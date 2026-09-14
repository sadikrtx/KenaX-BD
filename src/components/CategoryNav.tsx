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

  // Auto-scrolling carousel state & refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const firstSetRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll loop using requestAnimationFrame
  useEffect(() => {
    let animationFrameId: number;
    const container = scrollContainerRef.current;
    if (!container) return;

    // Center initial position to firstSetWidth to allow bidirectional infinite scrolling
    const initTimer = setTimeout(() => {
      if (container && firstSetRef.current) {
        const setWidth = firstSetRef.current.offsetWidth;
        if (setWidth > 0 && container.scrollLeft === 0) {
          container.scrollLeft = setWidth;
        }
      }
    }, 100);

    let lastTimestamp: number | null = null;
    const pixelsPerSecond = 14; // Calm, very slow, and gentle pace moving right-to-left

    const step = (timestamp: number) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }
      const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;

      if (container && !isPausedRef.current && !isDraggingRef.current) {
        const setWidth = firstSetRef.current?.offsetWidth || container.scrollWidth / 4;
        if (setWidth > 0) {
          container.scrollLeft += pixelsPerSecond * delta;
          // Seamless wrap when reaching boundary
          if (container.scrollLeft >= setWidth * 2.5) {
            container.scrollLeft -= setWidth;
          } else if (container.scrollLeft <= setWidth * 0.2) {
            container.scrollLeft += setWidth;
          }
        }
      } else {
        lastTimestamp = null;
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      clearTimeout(initTimer);
      cancelAnimationFrame(animationFrameId);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [sortedCategories]);

  // Touch and mouse drag handlers
  const handleTouchStart = () => {
    isPausedRef.current = true;
    hasMovedRef.current = false;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  };

  const handleTouchMove = () => {
    hasMovedRef.current = true;
  };

  const handleTouchEnd = () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      isPausedRef.current = false;
      hasMovedRef.current = false;
    }, 1200);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    isDraggingRef.current = true;
    isPausedRef.current = true;
    hasMovedRef.current = false;
    dragStartXRef.current = e.pageX;
    dragStartScrollLeftRef.current = container.scrollLeft;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const dx = e.pageX - dragStartXRef.current;
    if (Math.abs(dx) > 5) {
      hasMovedRef.current = true;
    }
    container.scrollLeft = dragStartScrollLeftRef.current - dx;
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      isPausedRef.current = false;
      hasMovedRef.current = false;
    }, 1200);
  };

  const handleManualScroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;
    isPausedRef.current = true;
    const delta = direction === 'left' ? -260 : 260;
    container.scrollBy({ left: delta, behavior: 'smooth' });
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      isPausedRef.current = false;
    }, 2000);
  };

  const handleContainerScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const setWidth = firstSetRef.current?.offsetWidth || container.scrollWidth / 4;
    if (setWidth > 0) {
      if (container.scrollLeft >= setWidth * 2.8) {
        container.scrollLeft -= setWidth;
      } else if (container.scrollLeft <= setWidth * 0.1) {
        container.scrollLeft += setWidth;
      }
    }
  };

  // Reusable Category Card component
  const renderCard = (cat: Category, uniqueKey: string) => {
    const isSelected = selectedCategory === cat.name;
    return (
      <button
        key={uniqueKey}
        type="button"
        onClick={() => {
          if (hasMovedRef.current) return;
          onSelectCategory(cat.name);
          onNavigate('shop');
        }}
        onMouseEnter={() => {
          isPausedRef.current = true;
        }}
        onMouseLeave={() => {
          if (!isDraggingRef.current) {
            isPausedRef.current = false;
          }
        }}
        className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer text-center shrink-0 select-none group ${
          isSelected
            ? 'bg-sky-50 border-sky-500 shadow-xs ring-2 ring-sky-500/20'
            : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-xs'
        } w-[134px] sm:w-[145px] md:w-[155px]`}
      >
        <div className="w-12 h-12 rounded-xl bg-slate-50 group-hover:bg-sky-100 flex items-center justify-center mb-2 transition-colors">
          {getIcon(cat.slug)}
        </div>
        <span className="text-xs font-bold text-slate-800 line-clamp-1 leading-tight group-hover:text-sky-600 w-full px-1">
          {cat.name}
        </span>
        <span className="text-[10px] text-slate-400 mt-0.5">
          {cat.itemCount}+ items
        </span>
      </button>
    );
  };

  return (
    <section className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 py-5">
      {/* Header section with title, subtitle & View All */}
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Shop by Category</h2>
          <p className="text-xs text-slate-500 mt-0.5">Explore our wide collection of categories</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Manual arrow controls visible on desktop and tablet */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            <button
              type="button"
              onClick={() => handleManualScroll('left')}
              className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleManualScroll('right')}
              className="w-7 h-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => {
              onSelectCategory('All');
              onNavigate('shop');
            }}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer py-1"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 
        Single line continuous auto-scrolling marquee moving right-to-left at a calm slower pace
      */}
      <div className="relative block">
        {/* Subtle Edge Fade Gradients */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollContainerRef}
          onScroll={handleContainerScroll}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1 cursor-grab active:cursor-grabbing touch-pan-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Set 1: Used for width measurement */}
          <div ref={firstSetRef} className="flex items-center gap-3 shrink-0">
            {sortedCategories.map((cat, idx) => renderCard(cat, `s1-${cat.id}-${idx}`))}
          </div>

          {/* Set 2 */}
          <div className="flex items-center gap-3 shrink-0">
            {sortedCategories.map((cat, idx) => renderCard(cat, `s2-${cat.id}-${idx}`))}
          </div>

          {/* Set 3 */}
          <div className="flex items-center gap-3 shrink-0">
            {sortedCategories.map((cat, idx) => renderCard(cat, `s3-${cat.id}-${idx}`))}
          </div>

          {/* Set 4 */}
          <div className="flex items-center gap-3 shrink-0">
            {sortedCategories.map((cat, idx) => renderCard(cat, `s4-${cat.id}-${idx}`))}
          </div>
        </div>
      </div>
    </section>
  );
};

