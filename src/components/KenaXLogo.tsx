import React, { useState, useEffect } from 'react';

interface KenaXLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'emblem' | 'horizontal' | 'stacked';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  customLogoUrl?: string;
  siteName?: string;
}

export const KenaXLogo: React.FC<KenaXLogoProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
  customLogoUrl,
  siteName,
}) => {
  const [activeLogo, setActiveLogo] = useState<string | null>(customLogoUrl || null);

  useEffect(() => {
    if (customLogoUrl) {
      setActiveLogo(customLogoUrl);
    } else {
      const stored = localStorage.getItem('kenax_custom_logo');
      if (stored) {
        setActiveLogo(stored);
      }
    }
  }, [customLogoUrl]);

  // If a custom siteName is provided (e.g. Bengali name like "কেনাএক্সবিডি"), render it with elite styling!
  if (siteName && siteName !== 'KenaX BD' && !activeLogo) {
    return (
      <div className={`inline-flex items-center select-none gap-2 ${className}`} title={siteName}>
        <div className="flex flex-col">
          <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-800">
            {siteName}
          </span>
          <span className="text-[10px] font-extrabold tracking-widest text-sky-600 uppercase">
            Official Store
          </span>
        </div>
      </div>
    );
  }

  // Height sizing for responsive embedding
  const heightClasses = {
    sm: 'h-7 sm:h-8',
    md: 'h-10 sm:h-12',
    lg: 'h-12 sm:h-14',
    xl: 'h-16 sm:h-20',
  }[size];

  // If a custom logo image was uploaded by admin from device, render it directly
  if (activeLogo) {
    return (
      <div className={`inline-flex items-center select-none ${className}`} title="KenaX BD">
        <img
          src={activeLogo}
          alt="KenaX BD"
          className={`${heightClasses} w-auto object-contain max-w-[180px] sm:max-w-[240px]`}
        />
      </div>
    );
  }

  const isDark = theme === 'dark';
  const navyTextColor = isDark ? '#FFFFFF' : '#0B192C';
  const cartFrameColor = isDark ? '#FFFFFF' : '#0B192C';

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
          <linearGradient id={`kenaxXGrad-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0066FF" />
            <stop offset="50%" stopColor="#00A8FF" />
            <stop offset="100%" stopColor="#00E5FF" />
          </linearGradient>

          {/* Glowing Cyan swoosh for X */}
          <linearGradient id={`swooshGrad-${theme}`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="60%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>

          <filter id={`subtleGlow-${theme}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#00A8FF" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* 1. SPEED SHOPPING CART (Top Centered) */}
        <g transform="translate(0, 0)">
          {/* 3 Cyan Speed lines on the left */}
          <line x1="86" y1="12" x2="104" y2="12" stroke="#00A8FF" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="78" y1="18.5" x2="101" y2="18.5" stroke="#00A8FF" strokeWidth="3.2" strokeLinecap="round" />
          <line x1="84" y1="25" x2="104" y2="25" stroke="#00A8FF" strokeWidth="2.8" strokeLinecap="round" />

          {/* Navy Blue Basket Frame */}
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
          <circle cx="126" cy="31" r="3.6" fill="#00A8FF" stroke={cartFrameColor} strokeWidth="1.6" />
          <circle cx="145" cy="31" r="3.6" fill="#00A8FF" stroke={cartFrameColor} strokeWidth="1.6" />
        </g>

        {/* 2. BRAND WORDMARK: KenaX (Center) */}
        <g transform="translate(24, 73)">
          {/* "Kena" text in bold deep navy */}
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
              fill={`url(#kenaxXGrad-${theme})`}
              filter={`url(#subtleGlow-${theme})`}
            />
            {/* Dynamic cyan & white aerodynamic wave swoosh passing across the X */}
            <path
              d="M-5 28 C12 28, 22 23, 40 12 C48 7, 56 3, 63 1 C55 7, 36 21, 24 27 C16 31, 6 32, -5 30 Z"
              fill={`url(#swooshGrad-${theme})`}
            />
            <path
              d="M0 27.5 C16 27.5, 30 20, 52 7 C40 15, 22 26, 0 27.5 Z"
              fill="#FFFFFF"
              opacity="0.85"
            />
          </g>
        </g>

        {/* 3. BOTTOM ACCENT: — BD — (All in bright cyan/sky blue like user logo.png) */}
        <g transform="translate(0, 95)">
          {/* Left horizontal cyan bar */}
          <line x1="72" y1="0" x2="105" y2="0" stroke="#00A8FF" strokeWidth="2.8" strokeLinecap="round" />

          {/* "BD" text in matching bright cyan */}
          <text
            x="125"
            y="3.5"
            textAnchor="middle"
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', 'Helvetica Neue', Arial, sans-serif"
            fontSize="16"
            fontWeight="900"
            letterSpacing="2.5"
            fill="#00A8FF"
          >
            BD
          </text>

          {/* Right horizontal cyan bar */}
          <line x1="145" y1="0" x2="178" y2="0" stroke="#00A8FF" strokeWidth="2.8" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};
