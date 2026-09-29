import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

interface KenaXLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'emblem' | 'horizontal' | 'stacked';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  customLogoUrl?: string;
  customDarkLogoUrl?: string;
  siteName?: string;
}

export const KenaXLogo: React.FC<KenaXLogoProps> = ({
  size = 'md',
  theme = 'auto',
  className = '',
  customLogoUrl,
  customDarkLogoUrl,
  siteName,
}) => {
  const { isDark: contextIsDark } = useTheme();
  // If theme is explicitly 'dark' or 'light', prioritize it; otherwise adapt automatically to night mode
  const isDark = theme === 'dark' ? true : theme === 'light' ? false : contextIsDark;
  const themeKey = isDark ? 'dark' : 'light';

  // In Night Mode: prioritize explicit customDarkLogoUrl; if none provided, use the official pure-white KenaX logo
  const [activeLogo, setActiveLogo] = useState<string | null>(() => {
    if (isDark) {
      return customDarkLogoUrl || null;
    }
    if (customLogoUrl) return customLogoUrl;
    try {
      return typeof window !== 'undefined' ? localStorage.getItem('kenax_custom_logo') : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (isDark) {
      // In night mode, if user has configured customDarkLogoUrl use it, otherwise use the crisp pure white KenaX logo
      setActiveLogo(customDarkLogoUrl || null);
    } else if (customLogoUrl) {
      setActiveLogo(customLogoUrl);
    } else {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('kenax_custom_logo') : null;
      setActiveLogo(stored || null);
    }
  }, [customLogoUrl, customDarkLogoUrl, isDark]);

  // If a custom siteName is provided (e.g. Bengali name like "কেনাএক্সবিডি"), render it with elite styling!
  if (siteName && siteName !== 'KenaX BD' && !activeLogo) {
    return (
      <div className={`inline-flex items-center select-none gap-2 ${className}`} title={siteName}>
        <div className="flex flex-col">
          <span
            className={`text-xl sm:text-2xl font-black tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            } bg-clip-text text-transparent bg-gradient-to-r ${
              isDark ? 'from-white via-sky-200 to-sky-400' : 'from-sky-600 via-blue-700 to-indigo-800'
            }`}
          >
            {siteName}
          </span>
          <span className={`text-[10px] font-extrabold tracking-widest ${isDark ? 'text-sky-400' : 'text-sky-600'} uppercase`}>
            Official Store
          </span>
        </div>
      </div>
    );
  }

  // Height sizing for responsive embedding
  const heightClasses = {
    xs: 'h-5 sm:h-6',
    sm: 'h-7 sm:h-8',
    md: 'h-10 sm:h-12',
    lg: 'h-12 sm:h-14',
    xl: 'h-16 sm:h-20',
  }[size];

  // If a custom logo image was uploaded by admin from device, render it directly with night mode contrast protection
  if (activeLogo) {
    return (
      <div className={`inline-flex items-center select-none ${className}`} title="KenaX BD">
        <img
          src={activeLogo}
          alt="KenaX BD"
          className={`${heightClasses} w-auto object-contain max-w-[180px] sm:max-w-[240px] ${
            isDark ? 'brightness-125 contrast-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''
          }`}
        />
      </div>
    );
  }

  // In Night Mode: "Kena" and Cart Frame are rendered in crisp, pure white (#FFFFFF)!
  const navyTextColor = isDark ? '#FFFFFF' : '#0B192C';
  const cartFrameColor = isDark ? '#FFFFFF' : '#0B192C';
  const accentCyanColor = isDark ? '#38BDF8' : '#00A8FF';

  return (
    <div className={`inline-flex items-center select-none ${className}`} title="KenaX BD - Smart Shopping">
      <svg
        viewBox="0 0 250 105"
        className={`${heightClasses} w-auto max-w-full drop-shadow-xs transition-transform duration-200 hover:scale-[1.02]`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
      >
        <defs>
          {/* Vibrant Blue-to-Cyan electric gradient for X */}
          <linearGradient id={`kenaxXGrad-${themeKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0066FF" />
            <stop offset="50%" stopColor="#00A8FF" />
            <stop offset="100%" stopColor="#00E5FF" />
          </linearGradient>

          {/* Glowing Cyan swoosh for X */}
          <linearGradient id={`swooshGrad-${themeKey}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="60%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>

          <filter id={`subtleGlow-${themeKey}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation={isDark ? "2.5" : "1.5"} floodColor={isDark ? "#38BDF8" : "#00A8FF"} floodOpacity={isDark ? "0.6" : "0.35"} />
          </filter>
        </defs>

        {/* 1. SPEED SHOPPING CART (Top Centered) */}
        <g transform="translate(0, 0)">
          {/* 3 Cyan Speed lines on the left */}
          <line x1="86" y1="12" x2="104" y2="12" stroke={accentCyanColor} strokeWidth="2.8" strokeLinecap="round" />
          <line x1="78" y1="18.5" x2="101" y2="18.5" stroke={accentCyanColor} strokeWidth="3.2" strokeLinecap="round" />
          <line x1="84" y1="25" x2="104" y2="25" stroke={accentCyanColor} strokeWidth="2.8" strokeLinecap="round" />

          {/* Basket Frame (Pure White in Night Mode, Deep Navy in Light Mode) */}
          <path
            d="M106 8 L114 8 L121 25 L150 25 L155 12 L117 12"
            stroke={cartFrameColor}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Middle horizontal grid line */}
          <line x1="119" y1="18.5" x2="152" y2="18.5" stroke={cartFrameColor} strokeWidth="2.2" strokeLinecap="round" />

          {/* 2 Cyan Wheels */}
          <circle cx="126" cy="31" r="3.6" fill={accentCyanColor} stroke={cartFrameColor} strokeWidth="1.6" />
          <circle cx="145" cy="31" r="3.6" fill={accentCyanColor} stroke={cartFrameColor} strokeWidth="1.6" />
        </g>

        {/* 2. BRAND WORDMARK: KenaX (Center) */}
        <g transform="translate(24, 73)">
          {/* "Kena" text in bold crisp white (Night Mode) or deep navy (Light Mode) */}
          <text
            x="0"
            y="0"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', 'Helvetica Neue', Arial, sans-serif"
            fontSize="48"
            fontWeight="900"
            letterSpacing="-1.8"
            fill={navyTextColor}
          >
            Kena
          </text>

          {/* Stylized "X" with dynamic electric blue/cyan gradient and aerodynamic swoosh */}
          <g transform="translate(124, -39)">
            {/* Main X body */}
            <path
              d="M6 3 L19 3 L32 24 L45 3 L58 3 L39 29 L60 48 L47 48 L32 34 L17 48 L4 48 L25 27 Z"
              fill={`url(#kenaxXGrad-${themeKey})`}
              filter={`url(#subtleGlow-${themeKey})`}
            />
            {/* Dynamic cyan & white aerodynamic wave swoosh passing across the X */}
            <path
              d="M-5 28 C12 28, 22 23, 40 12 C48 7, 56 3, 63 1 C55 7, 36 21, 24 27 C16 31, 6 32, -5 30 Z"
              fill={`url(#swooshGrad-${themeKey})`}
            />
            <path
              d="M0 27.5 C16 27.5, 30 20, 52 7 C40 15, 22 26, 0 27.5 Z"
              fill="#FFFFFF"
              opacity="0.95"
            />
          </g>
        </g>

        {/* 3. BOTTOM ACCENT: — BD — (All in bright cyan/sky blue) */}
        <g transform="translate(0, 95)">
          {/* Left horizontal cyan bar */}
          <line x1="72" y1="0" x2="105" y2="0" stroke={accentCyanColor} strokeWidth="2.8" strokeLinecap="round" />

          {/* "BD" text in matching bright cyan */}
          <text
            x="125"
            y="3.5"
            textAnchor="middle"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', 'Helvetica Neue', Arial, sans-serif"
            fontSize="16"
            fontWeight="900"
            letterSpacing="2.5"
            fill={accentCyanColor}
          >
            BD
          </text>

          {/* Right horizontal cyan bar */}
          <line x1="145" y1="0" x2="178" y2="0" stroke={accentCyanColor} strokeWidth="2.8" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};
