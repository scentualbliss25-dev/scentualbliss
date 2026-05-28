// Genera un placeholder elegante para productos sin imagen
// 800x1000 webp, fondo oscuro con frasco silueta + texto
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, '..', 'public', 'img', 'placeholder-perfume.webp');

const W = 800, H = 1000;

// SVG con gradiente oscuro + frasco silueta dorado + texto
const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#1a1a1a"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#D4B888" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#8B6914" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Frasco silueta -->
  <g transform="translate(${W/2}, ${H/2 - 80})" opacity="0.6">
    <!-- Tapa -->
    <rect x="-40" y="-180" width="80" height="50" rx="4" fill="url(#gold)" stroke="#C9A96E" stroke-width="1.5"/>
    <!-- Cuello -->
    <rect x="-25" y="-130" width="50" height="20" fill="url(#gold)" stroke="#C9A96E" stroke-width="1.5"/>
    <!-- Cuerpo del frasco -->
    <rect x="-90" y="-110" width="180" height="240" rx="14" fill="url(#gold)" stroke="#C9A96E" stroke-width="2"/>
    <!-- Etiqueta -->
    <rect x="-60" y="0" width="120" height="80" rx="2" fill="none" stroke="#C9A96E" stroke-width="1" opacity="0.5"/>
    <line x1="-50" y1="20" x2="50" y2="20" stroke="#C9A96E" stroke-width="0.8" opacity="0.4"/>
    <line x1="-40" y1="40" x2="40" y2="40" stroke="#C9A96E" stroke-width="0.6" opacity="0.3"/>
    <line x1="-45" y1="60" x2="45" y2="60" stroke="#C9A96E" stroke-width="0.6" opacity="0.3"/>
  </g>

  <!-- Texto ScentualBliss -->
  <text x="${W/2}" y="${H - 100}" font-family="Georgia, serif" font-size="32" font-style="italic" fill="#C9A96E" text-anchor="middle" opacity="0.85">ScentualBliss</text>
  <text x="${W/2}" y="${H - 60}" font-family="Arial, sans-serif" font-size="13" font-weight="300" fill="#777" text-anchor="middle" letter-spacing="3">PERFUMERÍA ORIGINAL</text>
</svg>
`;

await sharp(Buffer.from(svg))
  .webp({ quality: 90, effort: 6 })
  .toFile(out);

console.log(`✅ Placeholder generado: ${out}`);
