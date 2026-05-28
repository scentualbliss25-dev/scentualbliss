// Genera public/og.png (1200x630) con el logo de ScentualBliss + tagline.
// Se usa como imagen OpenGraph/Twitter para previews al compartir links.
//
// Ejecutar: node scripts/generate-og-image.mjs
//
// Esta imagen ES ESTÁTICA por diseño: la versión dinámica (app/opengraph-image.jsx)
// causaba un bug crítico en SPA navigation. Si quieres actualizar el diseño,
// edita este script y vuelve a correrlo.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const W = 1200;
const H = 630;
const OUT_PATH = 'public/og.png';
const LOGO_PATH = 'public/img/logo-redes.jpeg';

// 1) Logo embebido como base64 dentro del SVG (sharp soporta href="data:...")
const logoBuffer = fs.readFileSync(LOGO_PATH);
const logoDataUrl = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;

// 2) SVG completo con todo el diseño
const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"  stop-color="#1F1A14"/>
      <stop offset="60%" stop-color="#2A2218"/>
      <stop offset="100%" stop-color="#1F1A14"/>
    </linearGradient>
    <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#C9A96E" stop-opacity="0.18"/>
      <stop offset="70%" stop-color="#C9A96E" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#D4B68A" stop-opacity="0.12"/>
      <stop offset="70%" stop-color="#D4B68A" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="logoClip">
      <rect x="60" y="60" width="510" height="510" rx="16" ry="16"/>
    </clipPath>
  </defs>

  <!-- Background base -->
  <rect width="100%" height="100%" fill="url(#bgGrad)"/>

  <!-- Glow dorado top-right -->
  <circle cx="1100" cy="50" r="400" fill="url(#glow1)"/>

  <!-- Glow dorado bottom-left -->
  <circle cx="100" cy="600" r="450" fill="url(#glow2)"/>

  <!-- Logo cuadrado con bordes redondeados -->
  <image href="${logoDataUrl}" x="60" y="60" width="510" height="510" clip-path="url(#logoClip)" preserveAspectRatio="xMidYMid slice"/>
  <rect x="60" y="60" width="510" height="510" rx="16" ry="16" fill="none" stroke="#C9A96E" stroke-opacity="0.4" stroke-width="1"/>

  <!-- Eyebrow: línea + PERFUMERÍA ORIGINAL -->
  <line x1="630" y1="105" x2="666" y2="105" stroke="#C9A96E" stroke-width="1.5"/>
  <text x="678" y="111" font-family="Arial, sans-serif" font-size="16" fill="#C9A96E" font-weight="600" letter-spacing="6.5">PERFUMERÍA ORIGINAL</text>

  <!-- Headline grande -->
  <text x="630" y="195" font-family="Georgia, 'Times New Roman', serif" font-size="64" fill="#FAF6EE" font-weight="400" letter-spacing="-0.5">El aroma que</text>
  <text x="630" y="265" font-family="Georgia, 'Times New Roman', serif" font-size="64" fill="#C9A96E" font-style="italic" font-weight="400" letter-spacing="-0.5">te define.</text>

  <!-- Stats / value props -->
  <g font-family="Arial, sans-serif" font-size="17" fill="#D4B68A" font-weight="600" letter-spacing="3">
    <circle cx="638" cy="350" r="3" fill="#C9A96E"/>
    <text x="654" y="356">ENVÍO GRATIS · TODA COLOMBIA</text>

    <circle cx="638" cy="385" r="3" fill="#C9A96E"/>
    <text x="654" y="391">100% AUTÉNTICOS</text>

    <circle cx="638" cy="420" r="3" fill="#C9A96E"/>
    <text x="654" y="426">DISEÑADOR · NICHO · ÁRABES</text>
  </g>

  <!-- URL footer con border-top -->
  <line x1="630" y1="500" x2="950" y2="500" stroke="#C9A96E" stroke-opacity="0.25" stroke-width="1"/>
  <text x="630" y="535" font-family="Arial, sans-serif" font-size="15" fill="#C9A96E" fill-opacity="0.7" font-weight="600" letter-spacing="4.5">SCENTUALBLISS.COM.CO</text>
</svg>`;

// 3) Renderizar con sharp
await sharp(Buffer.from(svg))
  .png({ quality: 92, compressionLevel: 9 })
  .toFile(OUT_PATH);

const stats = fs.statSync(OUT_PATH);
console.log(`✓ Generado ${OUT_PATH} (${(stats.size / 1024).toFixed(1)} KB, ${W}x${H})`);
