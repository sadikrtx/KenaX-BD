import React from 'react';
import { Flame, ArrowRight, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { FlashSaleBannerSettings } from '../types';

interface FlashSaleBannerProps {
  settings?: FlashSaleBannerSettings;
  onNavigateToShop: () => void;
}

export const FlashSaleBanner: React.FC<FlashSaleBannerProps> = ({
  settings,
  onNavigateToShop,
}) => {
  if (settings && settings.enabled === false) {
    return null;
  }

  const badge = settings?.badge || 'MEGA GADGET FEST';
  const discount = settings?.discount || 'UP TO 40% OFF';
  const title =
    settings?.title || 'Mega Gadget Fest: Up to 40% Off on Premium Gadgets!';
  const subtitle =
    settings?.subtitle ||
    'Grab authentic smartwatches, wireless earbuds, smart accessories, and lifestyle essentials with verified Cash on Delivery nationwide.';
  const buttonText = settings?.buttonText || 'Shop Flash Sale Deals';
  const bannerImage =
    settings?.image && settings.image.trim() !== ''
      ? settings.image
      : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1400&auto=format&fit=crop&q=85';

  return (
    <section className="max-w-[1536px] mx-auto px-3 sm:px-6 lg:px-8 py-8">
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 min-h-[320px] sm:min-h-[380px] md:min-h-[440px] flex items-center">
        {/* Large High-Res Background Image with Dual Layer Gradients */}
        {bannerImage && (
          <div className="absolute inset-0 z-0">
            <img
              src={bannerImage}
              alt={title}
              className="w-full h-full object-cover object-center opacity-40 scale-105 transition-transform duration-700 hover:scale-100"
              referrerPolicy="no-referrer"
            />
            {/* Deep Dark Overlay for Pristine Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40" />
          </div>
        )}

        {/* Content Container */}
        <div className="relative z-10 w-full p-6 sm:p-10 md:p-14 lg:p-16 flex flex-col justify-between">
          <div className="max-w-2xl space-y-4">
            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black uppercase tracking-wider shadow-xs">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>{badge}</span>
              </span>

              {discount && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-extrabold uppercase">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{discount}</span>
                </span>
              )}
            </div>

            {/* Main Headline */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              {title}
            </h2>

            {/* Subtitle / Description */}
            <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed max-w-xl">
              {subtitle}
            </p>

            {/* Features Row */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-700/60">
                <Truck className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold">Nationwide Cash on Delivery</span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-700/60">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold">100% Genuine with Warranty</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <button
                onClick={onNavigateToShop}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs sm:text-sm transition-all duration-200 shadow-lg shadow-sky-500/25 hover:shadow-sky-400/40 hover:-translate-y-0.5 cursor-pointer"
              >
                <span>{buttonText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
