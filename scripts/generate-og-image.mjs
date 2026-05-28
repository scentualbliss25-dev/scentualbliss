// Genera public/og.png (1200x630) — versión minimalista: solo logo
// centrado sobre fondo oscuro de la marca. Pensada para que en móvil
// (donde el preview de OG sale chiquito) el logo sea reconocible al
// instante sin texto que se vuelva ilegible.
//
// Ejecutar: node scripts/generate-og-image.mjs

import sharp from 'sharp';
import fs from 'node:fs';

const W = 1200;
const H = 630;
const OUT_PATH = 'public/og.png';
const LOGO_PATH = 'public/img/logo-redes.jpeg';

// Logo embebido como base64 dentro del SVG
const logoBuffer = fs.readFileSync(LOGO_PATH);
const logoDataUrl = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;

// Tamaño del logo cuadrado en el OG (centrado verticalmente)
const LOGO_SIZE = 480;
const LOGO_X = (W - LOGO_SIZE) / 2;
const LOGO_Y = (H - LOGO_SIZE) / 2;

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"  stop-color="#1F1A14"/>
      <stop offset="60%" stop-color="#2A2218"/>
      <stop offset="100%" stop-color="#1F1A14"/>
    </linearGradient>
    <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#C9A96E" stop-opacity="0.15"/>
      <stop offset="70%" stop-color="#C9A96E" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#D4B68A" stop-opacity="0.1"/>
      <stop offset="70%" stop-color="#D4B68A" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="logoClip">
      <rect x="${LOGO_X}" y="${LOGO_Y}" width="${LOGO_SIZE}" height="${LOGO_SIZE}" rx="20" ry="20"/>
    </clipPath>
  </defs>

  <!-- Background con gradiente -->
  <rect width="100%" height="100%" fill="url(#bgGrad)"/>

  <!-- Glows dorados sutiles en las esquinas para dar profundidad -->
  <circle cx="100" cy="100" r="400" fill="url(#glow1)"/>
  <circle cx="1100" cy="530" r="400" fill="url(#glow2)"/>

  <!-- Logo cuadrado centrado con bordes redondeados -->
  <image href="${logoDataUrl}" x="${LOGO_X}" y="${LOGO_Y}" width="${LOGO_SIZE}" height="${LOGO_SIZE}" clip-path="url(#logoClip)" preserveAspectRatio="xMidYMid slice"/>
  <rect x="${LOGO_X}" y="${LOGO_Y}" width="${LOGO_SIZE}" height="${LOGO_SIZE}" rx="20" ry="20" fill="none" stroke="#C9A96E" stroke-opacity="0.35" stroke-width="1.5"/>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ quality: 92, compressionLevel: 9 })
  .toFile(OUT_PATH);

const stats = fs.statSync(OUT_PATH);
console.log(`✓ Generado ${OUT_PATH} (${(stats.size / 1024).toFixed(1)} KB, ${W}x${H})`);
