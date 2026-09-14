import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background radial gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#050B14" />
      <stop offset="70%" stop-color="#02050A" />
      <stop offset="100%" stop-color="#000000" />
    </radialGradient>

    <!-- Outer neon ring gradient -->
    <linearGradient id="neonRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0052FF" />
      <stop offset="30%" stop-color="#00BFFF" />
      <stop offset="70%" stop-color="#0070FF" />
      <stop offset="100%" stop-color="#00E5FF" />
    </linearGradient>

    <!-- Metallic chrome gradient for KENA & BD -->
    <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="25%" stop-color="#F0F6FC" />
      <stop offset="50%" stop-color="#C5D9E8" />
      <stop offset="75%" stop-color="#9CB8CF" />
      <stop offset="100%" stop-color="#E2EEF8" />
    </linearGradient>

    <!-- Electric Cyan-Blue gradient for X -->
    <linearGradient id="xBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0088FF" />
      <stop offset="45%" stop-color="#00B4FF" />
      <stop offset="100%" stop-color="#00F0FF" />
    </linearGradient>

    <!-- Swoosh gradient -->
    <linearGradient id="swooshGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00E5FF" />
      <stop offset="50%" stop-color="#80EAFF" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>

    <!-- Cart cyan gradient -->
    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0066FF" />
      <stop offset="100%" stop-color="#00F0FF" />
    </linearGradient>

    <!-- Wheel glow gradient -->
    <radialGradient id="wheelGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#80EAFF" />
      <stop offset="60%" stop-color="#00B4FF" />
      <stop offset="100%" stop-color="#0055D4" />
    </radialGradient>

    <!-- Soft glow filters -->
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="subtleTextShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.8" />
    </filter>

    <filter id="cartShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#00d2ff" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- 1. BASE DARK BACKGROUND CIRCLE -->
  <circle cx="256" cy="256" r="248" fill="url(#bgGrad)" />

  <!-- 2. OUTER GLOWING NEON BLUE RING -->
  <circle cx="256" cy="256" r="230" fill="none" stroke="#00A3FF" stroke-width="14" opacity="0.35" filter="url(#neonGlow)" />
  <circle cx="256" cy="256" r="230" fill="none" stroke="url(#neonRingGrad)" stroke-width="8.5" />
  <circle cx="256" cy="256" r="225" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.4" />

  <!-- 3. TOP SHOPPING CART WITH SPEED LINES -->
  <g id="cart-group" transform="translate(15, -12)" filter="url(#cartShadow)">
    <!-- Speed motion trails (Cyan gradient) -->
    <path d="M106 135 L200 135 Q205 135 200 141 L106 141 Q100 138 106 135 Z" fill="url(#cyanGrad)" />
    <path d="M125 155 L210 155 Q215 155 210 162 L125 162 Q120 158 125 155 Z" fill="url(#cyanGrad)" />
    <path d="M150 176 L218 176 Q222 176 218 183 L150 183 Q145 179 150 176 Z" fill="url(#cyanGrad)" />

    <!-- Main White Basket Frame -->
    <path d="M172 110 L212 110 L234 180 L320 180 L342 125 L215 125" 
          fill="none" 
          stroke="#FFFFFF" 
          stroke-width="12" 
          stroke-linecap="round" 
          stroke-linejoin="round" />
    
    <!-- Basket middle bar -->
    <line x1="228" y1="150" x2="330" y2="150" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" />

    <!-- 2 Neon Blue Glowing Wheels -->
    <circle cx="240" cy="198" r="14" fill="url(#wheelGrad)" stroke="#FFFFFF" stroke-width="2.5" />
    <circle cx="290" cy="198" r="14" fill="url(#wheelGrad)" stroke="#FFFFFF" stroke-width="2.5" />
  </g>

  <!-- 4. CENTER BRAND WORDMARK: "Kena" (Metallic Chrome) + "X" (Electric Blue) -->
  <g id="wordmark" filter="url(#subtleTextShadow)">
    <!-- "Kena" text in 3D metallic chrome -->
    <text x="44" y="325" 
          font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Montserrat', 'Helvetica Neue', Arial, sans-serif" 
          font-size="118" 
          font-weight="900" 
          font-style="italic" 
          letter-spacing="-3" 
          fill="url(#chromeGrad)">
      Kena
    </text>

    <!-- Stylized "X" letter with dynamic swoosh -->
    <g transform="translate(305, 218)">
      <!-- Main body of X -->
      <path d="M16 12 L46 12 L76 60 L106 12 L136 12 L92 68 L142 108 L112 108 L76 76 L40 108 L10 108 L60 62 Z" 
            fill="url(#xBlueGrad)" />
      
      <!-- Top chrome bevel highlight on X -->
      <path d="M16 12 L46 12 L76 60 L60 62 L10 108 L10 100 L48 58 Z" 
            fill="#FFFFFF" 
            opacity="0.25" />

      <!-- Sharp aerodynamic cyan-to-white swoosh cutting across X -->
      <path d="M-20 74 C15 74 38 62 82 35 C118 13 148 -2 165 -12 C142 5 95 38 65 54 C40 67 15 72 -20 74 Z" 
            fill="url(#swooshGrad)" 
            filter="url(#neonGlow)" />
      <path d="M-10 73 C25 73 55 58 100 28 C135 7 155 -5 162 -10 C145 1 108 28 80 46 C50 63 20 71 -10 73 Z" 
            fill="#FFFFFF" 
            opacity="0.9" />
    </g>
  </g>

  <!-- 5. BOTTOM ACCENT: "— BD —" -->
  <g id="bd-section" transform="translate(0, 360)">
    <!-- Left Neon Line -->
    <line x1="125" y1="-10" x2="208" y2="-10" stroke="#0099FF" stroke-width="5.5" stroke-linecap="round" />

    <!-- "BD" Letters in bold Chrome -->
    <text x="256" y="2" 
          text-anchor="middle" 
          font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Montserrat', 'Helvetica Neue', Arial, sans-serif" 
          font-size="44" 
          font-weight="900" 
          letter-spacing="4" 
          fill="url(#chromeGrad)">
      BD
    </text>

    <!-- Right Neon Line -->
    <line x1="304" y1="-10" x2="387" y2="-10" stroke="#0099FF" stroke-width="5.5" stroke-linecap="round" />
  </g>
</svg>`;

async function buildLogos() {
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Save master SVG
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), svgContent);
  fs.writeFileSync(path.join(publicDir, 'kenax-logo.svg'), svgContent);

  const svgBuffer = Buffer.from(svgContent);

  // 2. Render sizes
  const sizes = [
    { name: 'logo.png', size: 512 },
    { name: 'kenax-logo.png', size: 512 },
    { name: 'favicon-512.png', size: 512 },
    { name: 'favicon-192.png', size: 192 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-16x16.png', size: 16 },
  ];

  for (const item of sizes) {
    await sharp(svgBuffer)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(publicDir, item.name));
    console.log(`Generated ${item.name} (${item.size}x${item.size})`);
  }

  // Generate favicon.ico from 32x32 png buffer
  const ico32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico32);
  console.log('Generated favicon.ico');
}

buildLogos().catch(console.error);
