import React from 'react';

interface KenaXOfficialSealProps {
  className?: string;
  size?: number;
}

export const KenaXOfficialSeal: React.FC<KenaXOfficialSealProps> = ({
  className = '',
  size = 140,
}) => {
  return (
    <div
      className={`inline-block select-none ${className}`}
      title="KenaX BD Official Verified Seal (Authentic Document)"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 500 500"
        width={size}
        height={size}
        className="w-auto h-auto max-w-full drop-shadow-xs"
      >
        <defs>
          {/* Blue-to-Cyan Gradient for X inside Seal */}
          <linearGradient id="sealNoSigXGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Cyan Swoosh for X */}
          <linearGradient id="sealNoSigSwooshGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="60%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Style definitions for crisp seal stamping */}
          <style>{`
            .seal-ink-navy { fill: #0f2744; }
            .seal-stroke-navy { stroke: #0f2744; fill: none; }
            .seal-top-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 'Montserrat', Arial, sans-serif; font-weight: 900; font-size: 24px; letter-spacing: 8.5px; fill: #0f2744; }
            .seal-bottom-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 'Montserrat', Arial, sans-serif; font-weight: 800; font-size: 19px; letter-spacing: 5px; fill: #0f2744; }
            .seal-badge-sub { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-weight: 800; font-size: 11px; fill: #0f2744; letter-spacing: 2.2px; }
            .seal-badge-auth { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-weight: 700; font-size: 10px; fill: #0284c7; letter-spacing: 1.8px; }
          `}</style>

          {/* Top Arc Path for ★ KENAX BD OFFICIAL SEAL ★ */}
          <path id="sealTopArcNoSig" d="M 68,250 A 182,182 0 0,1 432,250" />

          {/* Bottom Arc Path for ★ AUTHORIZED & VERIFIED INVOICE ★ */}
          <path id="sealBottomArcNoSig" d="M 432,250 A 182,182 0 0,1 68,250" />
        </defs>

        {/* 1. Outer Concentric Circles */}
        <circle cx="250" cy="250" r="238" className="seal-stroke-navy" strokeWidth="6.5" opacity="0.95" />
        <circle cx="250" cy="250" r="226" className="seal-stroke-navy" strokeWidth="2.2" opacity="0.9" />
        <circle cx="250" cy="250" r="172" className="seal-stroke-navy" strokeWidth="2" opacity="0.85" />
        <circle cx="250" cy="250" r="165" className="seal-stroke-navy" strokeWidth="1.2" strokeDasharray="4,4" opacity="0.7" />

        {/* 2. Top Arc Text */}
        <text className="seal-top-text" textAnchor="middle">
          <textPath href="#sealTopArcNoSig" startOffset="50%">
            ★ KENAX BD OFFICIAL SEAL ★
          </textPath>
        </text>

        {/* 3. Bottom Arc Text */}
        <text className="seal-bottom-text" textAnchor="middle">
          <textPath href="#sealBottomArcNoSig" startOffset="50%">
            ★ AUTHORIZED &amp; VERIFIED INVOICE ★
          </textPath>
        </text>

        {/* 4. Center Official KenaX BD Logo (Pure Logo, No Signature) */}
        <g transform="translate(250, 230) scale(0.95)">
          {/* Shopping Cart Header */}
          <g transform="translate(-125, -62)">
            {/* Speed Lines */}
            <line x1="86" y1="12" x2="104" y2="12" stroke="#0ea5e9" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="78" y1="18.5" x2="101" y2="18.5" stroke="#0ea5e9" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="84" y1="25" x2="104" y2="25" stroke="#0ea5e9" strokeWidth="2.8" strokeLinecap="round" />

            {/* Cart Frame */}
            <path
              d="M106 8 L114 8 L121 25 L150 25 L155 12 L117 12"
              stroke="#0f2744"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <line x1="119" y1="18.5" x2="152" y2="18.5" stroke="#0f2744" strokeWidth="2.2" strokeLinecap="round" />

            {/* Wheels */}
            <circle cx="126" cy="31" r="3.6" fill="#0ea5e9" stroke="#0f2744" strokeWidth="1.5" />
            <circle cx="145" cy="31" r="3.6" fill="#0ea5e9" stroke="#0f2744" strokeWidth="1.5" />
          </g>

          {/* Wordmark: KenaX */}
          <g transform="translate(-102, 10)">
            {/* "Kena" */}
            <text
              x="0"
              y="0"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif"
              fontSize="45"
              fontWeight="900"
              letterSpacing="-1.5"
              fill="#0f2744"
            >
              Kena
            </text>

            {/* "X" */}
            <g transform="translate(116, -37)">
              <path
                d="M6 3 L19 3 L32 24 L45 3 L58 3 L39 29 L60 48 L47 48 L32 34 L17 48 L4 48 L25 27 Z"
                fill="url(#sealNoSigXGrad)"
              />
              <path
                d="M-5 28 C12 28, 22 23, 40 12 C48 7, 56 3, 63 1 C55 7, 36 21, 24 27 C16 31, 6 32, -5 30 Z"
                fill="url(#sealNoSigSwooshGrad)"
              />
              <path
                d="M0 27.5 C16 27.5, 30 20, 52 7 C40 15, 22 26, 0 27.5 Z"
                fill="#FFFFFF"
                opacity="0.9"
              />
            </g>
          </g>

          {/* Bottom Accent: — BD — */}
          <g transform="translate(-125, 33)">
            <line x1="72" y1="0" x2="105" y2="0" stroke="#0ea5e9" strokeWidth="2.8" strokeLinecap="round" />
            <text
              x="125"
              y="3.5"
              textAnchor="middle"
              fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Montserrat', sans-serif"
              fontSize="16"
              fontWeight="900"
              letterSpacing="2.5"
              fill="#0f2744"
            >
              BD
            </text>
            <line x1="145" y1="0" x2="178" y2="0" stroke="#0ea5e9" strokeWidth="2.8" strokeLinecap="round" />
          </g>
        </g>

        {/* 5. Official Verification Stamp Subtext (NO Signature) */}
        <g transform="translate(250, 320)">
          <line x1="-95" y1="-6" x2="95" y2="-6" stroke="#0f2744" strokeWidth="1.2" strokeDasharray="3,3" opacity="0.6" />
          <text textAnchor="middle" className="seal-badge-sub">
            ORIGINAL &amp; VERIFIED DOCUMENT
          </text>
          <text y="14" textAnchor="middle" className="seal-badge-auth">
            KENAX BD OFFICIAL VERIFICATION
          </text>
          <text y="28" textAnchor="middle" fontSize="9" fill="#0f2744" letterSpacing="4">
            ★ ★ ★ ★ ★
          </text>
        </g>
      </svg>
    </div>
  );
};
