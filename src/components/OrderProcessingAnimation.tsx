import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  ShieldCheck,
  Truck,
  Sparkles,
  Check,
  Clock,
  Loader2,
} from 'lucide-react';
import { Order } from '../types';

interface OrderProcessingAnimationProps {
  isOpen: boolean;
  order: Order | null;
  onComplete: (order?: Order | null) => void;
}

interface StepItem {
  id: number;
  shortTitle: string;
  detail: string;
  threshold: number; // percentage when this step completes
}

const STEPS: StepItem[] = [
  {
    id: 1,
    shortTitle: 'Order & ID Verified',
    detail: 'Tracking ID generated & logged',
    threshold: 25,
  },
  {
    id: 2,
    shortTitle: 'Quality Check & Pack',
    detail: '100% genuine item secured',
    threshold: 55,
  },
  {
    id: 3,
    shortTitle: 'Loaded to Express Van',
    detail: 'Assigned to KenaX fleet',
    threshold: 85,
  },
  {
    id: 4,
    shortTitle: 'Dispatched & Confirmed',
    detail: 'En route for doorstep delivery',
    threshold: 98,
  },
];

export const OrderProcessingAnimation: React.FC<OrderProcessingAnimationProps> = ({
  isOpen,
  order,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCurrentStepIdx(0);
      hasCompletedRef.current = false;
      return;
    }

    hasCompletedRef.current = false;

    // Total duration: 3.8 seconds for smooth, engaging, unskippable animation
    const intervalTime = 25; // ms
    const totalDuration = 3800; // ms
    const increment = (intervalTime / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            if (!hasCompletedRef.current) {
              hasCompletedRef.current = true;
              onComplete(order);
            }
          }, 350);
          return 100;
        }

        const activeIdx = STEPS.findIndex((s, idx) => {
          const nextStep = STEPS[idx + 1];
          return next <= (nextStep ? nextStep.threshold : 100);
        });
        if (activeIdx !== -1) {
          setCurrentStepIdx(activeIdx);
        }

        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, onComplete, order]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 select-none cursor-default animate-in fade-in duration-200"
      aria-modal="true"
      role="dialog"
    >
      <div className="relative bg-slate-900/98 border border-slate-700/80 rounded-2xl sm:rounded-3xl max-w-sm sm:max-w-md md:max-w-lg w-full shadow-2xl overflow-hidden p-3 sm:p-4 text-white animate-in zoom-in-95 duration-200">
        {/* Top Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-16 bg-sky-500/20 blur-2xl pointer-events-none rounded-full" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between relative z-10 mb-2 sm:mb-2.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/35 text-sky-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-sky-400 animate-pulse shrink-0" />
              <span className="truncate">KenaX BD Official Express Fleet</span>
            </span>
            {order && (
              <span className="font-mono text-[10px] sm:text-xs text-amber-300 font-black bg-slate-800/90 px-2 py-0.5 rounded-full border border-slate-700 shadow-2xs shrink-0">
                #{order.id}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs sm:text-sm font-black text-sky-400 shrink-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
            <span>{Math.min(Math.round(progress), 100)}%</span>
          </div>
        </div>

        {/* 1. Delivery Van Stage with Official KenaX BD Logo (Compact & Responsive) */}
        <div className="relative h-28 sm:h-34 md:h-36 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-xl sm:rounded-2xl border border-slate-800 overflow-hidden mb-2 sm:mb-2.5 flex flex-col justify-end shadow-inner">
          {/* Subtle Cyber Grid */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px]" />

          {/* Skyline Silhouettes in Background */}
          <div className="absolute bottom-6 left-0 right-0 h-14 flex items-end justify-around opacity-25 pointer-events-none">
            <div className="w-7 h-10 bg-sky-500/40 rounded-t-xs" />
            <div className="w-9 h-14 bg-sky-400/40 rounded-t-xs" />
            <div className="w-6 h-8 bg-sky-600/40 rounded-t-xs" />
            <div className="w-12 h-16 bg-sky-500/40 rounded-t-xs" />
            <div className="w-8 h-11 bg-sky-400/40 rounded-t-xs" />
            <div className="w-11 h-13 bg-sky-500/40 rounded-t-xs" />
            <div className="w-9 h-9 bg-sky-600/40 rounded-t-xs" />
          </div>

          {/* Speed Wind Lines */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-4 right-0 w-32 h-0.5 bg-gradient-to-l from-sky-400 to-transparent animate-[ping_1.2s_linear_infinite]" />
            <div className="absolute top-10 right-12 w-40 h-0.5 bg-gradient-to-l from-cyan-300 to-transparent animate-[ping_1.5s_linear_infinite_0.2s]" />
            <div className="absolute top-16 right-4 w-28 h-0.5 bg-gradient-to-l from-sky-300 to-transparent animate-[ping_1s_linear_infinite_0.4s]" />
          </div>

          {/* Delivery Van Graphic (Features Official KenaX BD Logo) */}
          <div className="relative z-10 flex items-center justify-center pb-1 sm:pb-2">
            <div className="relative flex flex-col items-center">
              <svg
                className="w-48 sm:w-64 md:w-72 h-auto drop-shadow-[0_12px_24px_rgba(14,165,233,0.4)] animate-[vanBounce_1.1s_ease-in-out_infinite]"
                viewBox="0 0 320 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Van Main Cargo Body */}
                <path
                  d="M18 30 C18 22 24 16 32 16 L202 16 C208 16 214 20 217 26 L237 60 C240 65 246 68 252 68 L282 68 C290 68 297 75 297 83 L297 125 C297 130 292 135 287 135 L262 135 C262 120 248 108 232 108 C216 108 202 120 202 135 L98 135 C98 120 84 108 68 108 C52 108 38 120 38 135 L23 135 C16 135 10 129 10 122 L10 38 C10 33 14 30 18 30 Z"
                  fill="url(#vanBodyGrad)"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                />

                {/* Van Cabin Windshield */}
                <path
                  d="M216 30 L234 58 C236 61 239 62 242 62 L277 62 C279 62 280 60 279 58 L267 34 C265 31 262 30 258 30 Z"
                  fill="#38bdf8"
                  opacity="0.85"
                />

                {/* Driver Silhouette */}
                <circle cx="247" cy="46" r="6" fill="#0b192c" />
                <path d="M238 58 C238 52 243 48 249 48 C255 48 260 52 260 58 Z" fill="#0b192c" />

                {/* Cargo Side Panel Container */}
                <rect x="26" y="26" width="166" height="78" rx="8" fill="#0b192c" stroke="#38bdf8" strokeWidth="1.5" />

                {/* --- OFFICIAL KENAX BD LOGO ON THE VAN BODY --- */}
                <g transform="translate(36, 30)">
                  {/* Speed Shopping Cart */}
                  <g transform="translate(18, 0)">
                    <line x1="36" y1="6" x2="48" y2="6" stroke="#00E5FF" strokeWidth="1.8" strokeLinecap="round" />
                    <line x1="30" y1="10" x2="46" y2="10" stroke="#00E5FF" strokeWidth="2.0" strokeLinecap="round" />
                    <line x1="34" y1="14" x2="48" y2="14" stroke="#00E5FF" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M50 4 L55 4 L60 15 L78 15 L81 7 L57 7" stroke="#FFFFFF" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="58" y1="11" x2="79" y2="11" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
                    <circle cx="63" cy="19" r="2.2" fill="#00E5FF" stroke="#FFFFFF" strokeWidth="1" />
                    <circle cx="75" cy="19" r="2.2" fill="#00E5FF" stroke="#FFFFFF" strokeWidth="1" />
                  </g>

                  {/* Brand Wordmark "Kena" */}
                  <g transform="translate(0, 48)">
                    <text
                      x="0"
                      y="0"
                      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif"
                      fontSize="31"
                      fontWeight="900"
                      letterSpacing="-1.2"
                      fill="#FFFFFF"
                    >
                      Kena
                    </text>

                    {/* Stylized Electric X with Swoosh */}
                    <g transform="translate(80, -25)">
                      <path
                        d="M4 2 L13 2 L22 17 L30 2 L39 2 L26 20 L41 33 L32 33 L22 23 L11 33 L2 33 L17 18 Z"
                        fill="url(#kenaxXGradVan)"
                      />
                      <path
                        d="M-4 19 C7 19, 14 15, 27 8 C32 5, 37 2, 42 1 C37 5, 24 14, 16 18 C11 21, 4 21, -4 20 Z"
                        fill="url(#swooshGradVan)"
                      />
                      <path
                        d="M0 18.5 C11 18.5, 20 13.5, 35 5 C27 10, 15 17.5, 0 18.5 Z"
                        fill="#FFFFFF"
                        opacity="0.9"
                      />
                    </g>
                  </g>

                  {/* "— BD —" Bottom Accent */}
                  <g transform="translate(0, 64)">
                    <line x1="38" y1="0" x2="56" y2="0" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
                    <text
                      x="73"
                      y="2.5"
                      textAnchor="middle"
                      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif"
                      fontSize="11"
                      fontWeight="900"
                      letterSpacing="2"
                      fill="#00E5FF"
                    >
                      BD
                    </text>
                    <line x1="90" y1="0" x2="108" y2="0" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
                  </g>
                </g>
                {/* --- END OFFICIAL LOGO --- */}

                {/* Headlight & Beam */}
                <path d="M292 85 L298 85 C300 85 302 87 302 90 L302 98 C302 101 300 103 298 103 L292 103 Z" fill="#facc15" />
                <polygon points="298,88 320,82 320,108 298,100" fill="url(#lightBeamVan)" opacity="0.6" />

                {/* Rear Tail Light */}
                <rect x="10" y="45" width="4" height="20" rx="2" fill="#ef4444" />

                {/* Front Bumper */}
                <rect x="284" y="115" width="16" height="15" rx="4" fill="#334155" />

                {/* Wheel 1 (Rear) */}
                <g className="animate-[spin_0.8s_linear_infinite]" style={{ transformOrigin: '68px 135px' }}>
                  <circle cx="68" cy="135" r="21" fill="#1e293b" stroke="#475569" strokeWidth="3.5" />
                  <circle cx="68" cy="135" r="12" fill="#94a3b8" />
                  <circle cx="68" cy="135" r="5" fill="#0b192c" />
                  <line x1="68" y1="116" x2="68" y2="154" stroke="#0b192c" strokeWidth="2" />
                  <line x1="49" y1="135" x2="87" y2="135" stroke="#0b192c" strokeWidth="2" />
                </g>

                {/* Wheel 2 (Front) */}
                <g className="animate-[spin_0.8s_linear_infinite]" style={{ transformOrigin: '232px 135px' }}>
                  <circle cx="232" cy="135" r="21" fill="#1e293b" stroke="#475569" strokeWidth="3.5" />
                  <circle cx="232" cy="135" r="12" fill="#94a3b8" />
                  <circle cx="232" cy="135" r="5" fill="#0b192c" />
                  <line x1="232" y1="116" x2="232" y2="154" stroke="#0b192c" strokeWidth="2" />
                  <line x1="213" y1="135" x2="251" y2="135" stroke="#0b192c" strokeWidth="2" />
                </g>

                {/* Exhaust Puffs */}
                <circle cx="6" cy="125" r="3" fill="#94a3b8" opacity="0.6" className="animate-ping" />
                <circle cx="0" cy="120" r="4" fill="#64748b" opacity="0.4" className="animate-ping" style={{ animationDelay: '0.2s' }} />

                {/* Gradients */}
                <defs>
                  <linearGradient id="vanBodyGrad" x1="0" y1="0" x2="300" y2="150" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0B192C" />
                    <stop offset="0.6" stopColor="#0369a1" />
                    <stop offset="1" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="kenaxXGradVan" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0066FF" />
                    <stop offset="50%" stopColor="#00A8FF" />
                    <stop offset="100%" stopColor="#00E5FF" />
                  </linearGradient>
                  <linearGradient id="swooshGradVan" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00E5FF" />
                    <stop offset="60%" stopColor="#38BDF8" />
                    <stop offset="100%" stopColor="#FFFFFF" />
                  </linearGradient>
                  <linearGradient id="lightBeamVan" x1="298" y1="94" x2="320" y2="94" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fef08a" />
                    <stop offset="1" stopColor="#fef08a" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Road Surface with moving dashed stripes */}
          <div className="relative h-3 bg-slate-950 border-t border-slate-700 flex items-center overflow-hidden">
            <div className="w-[200%] h-0.5 bg-[repeating-linear-gradient(90deg,#38bdf8_0px,#38bdf8_20px,transparent_20px,transparent_40px)] animate-[moveRoad_0.4s_linear_infinite]" />
          </div>
        </div>

        {/* 2. Compact Smooth Progress Bar */}
        <div className="mb-2">
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-100 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 3. Step-by-Step Animated Process Statuses - Compact 2x2 Grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {STEPS.map((step, idx) => {
            const isCompleted = progress >= step.threshold;
            const isCurrent = currentStepIdx === idx && !isCompleted;

            return (
              <div
                key={step.id}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all duration-200 flex items-center gap-1.5 sm:gap-2 ${
                  isCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                    : isCurrent
                    ? 'bg-sky-950/50 border-sky-500/70 text-sky-100 ring-1 ring-sky-500/40'
                    : 'bg-slate-900/40 border-slate-800/60 text-slate-500 opacity-40'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-950 scale-105'
                      : isCurrent
                      ? 'bg-sky-500 text-slate-950 animate-pulse'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.id}
                </div>

                <div className="min-w-0 flex-1">
                  <h4
                    className={`text-[10px] sm:text-[11px] font-bold truncate ${
                      isCompleted ? 'text-emerald-300' : isCurrent ? 'text-sky-300' : 'text-slate-400'
                    }`}
                  >
                    {step.shortTitle}
                  </h4>
                  <p className="text-[9px] text-slate-400 truncate leading-tight">
                    {step.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Unskippable Security Assurance Footer - Ultra Compact */}
        <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1 truncate">
            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="truncate">Encrypted Order Registration</span>
          </div>
          <div className="flex items-center gap-1 font-medium shrink-0">
            <Clock className="w-3 h-3 text-sky-400 animate-spin" />
            <span>Processing Dispatch...</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes moveRoad {
          0% { transform: translateX(0); }
          100% { transform: translateX(-40px); }
        }
        @keyframes vanBounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
};
