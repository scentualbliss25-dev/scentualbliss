// Reemplazo automatizado de colores hardcoded a tema claro
// Solo reemplaza patrones SEGUROS (donde el contexto es claro)
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const FILES = [
  'components/cart/CartDrawer.jsx',
  'components/pages/HomePageClient.jsx',
  'components/pages/ProductPageClient.jsx',
  'components/pages/CheckoutPageClient.jsx',
  'components/pages/ContactPageClient.jsx',
  'components/ui/ProductCard.jsx',
  'components/ui/QuickView.jsx',
];

// Reemplazos: regex → reemplazo
// Solo strings de colores oscuros que se usaban como bg → light bg
const REPLACEMENTS = [
  // Hex colors comunes en gradientes/bgs
  [/['"]#0A0A0A['"]/g, "'#FAF8F3'"],
  [/['"]#0F0C00['"]/g, "'#F4EFE5'"],
  [/['"]#1A1200['"]/g, "'#F0EAD9'"],
  [/['"]#1A1400['"]/g, "'#F0EAD9'"],
  [/['"]#0F1015['"]/g, "'#F4EFE5'"],
  [/['"]#1F2937['"]/g, "'#FAFAFA'"],

  // rgba black con alpha alto → cream bg
  [/rgba\(10,\s*10,\s*10,\s*\.96\)/g, 'rgba(250,248,243,.96)'],
  [/rgba\(10,\s*10,\s*10,\s*\.98\)/g, 'rgba(250,248,243,.98)'],
  [/rgba\(10,\s*10,\s*10,\s*\.95\)/g, 'rgba(250,248,243,.95)'],
  [/rgba\(10,\s*10,\s*10,\s*\.9\)/g, 'rgba(250,248,243,.92)'],
  [/rgba\(10,\s*10,\s*10,\s*\.85\)/g, 'rgba(250,248,243,.88)'],
  [/rgba\(10,\s*10,\s*10,\s*\.8\)/g, 'rgba(250,248,243,.85)'],
  [/rgba\(10,\s*10,\s*10,\s*\.75\)/g, 'rgba(250,248,243,.80)'],
  [/rgba\(10,\s*10,\s*10,\s*\.7\)/g, 'rgba(250,248,243,.75)'],

  // rgba(0,0,0) con alpha alto → overlays cálidos oscuros (mantenemos opaco para overlays)
  [/rgba\(0,\s*0,\s*0,\s*\.85\)/g, 'rgba(31,26,18,.55)'],
  [/rgba\(0,\s*0,\s*0,\s*\.8\)/g, 'rgba(31,26,18,.50)'],
  [/rgba\(0,\s*0,\s*0,\s*\.75\)/g, 'rgba(31,26,18,.45)'],
  [/rgba\(0,\s*0,\s*0,\s*\.7\)/g, 'rgba(31,26,18,.40)'],
  [/rgba\(0,\s*0,\s*0,\s*\.65\)/g, 'rgba(31,26,18,.35)'],
  [/rgba\(0,\s*0,\s*0,\s*\.6\)/g, 'rgba(31,26,18,.30)'],
  [/rgba\(0,\s*0,\s*0,\s*\.5\)/g, 'rgba(31,26,18,.25)'],

  // rgba black con alpha bajo → sombras suaves
  [/rgba\(0,\s*0,\s*0,\s*\.4\)/g, 'rgba(31,26,18,.10)'],
  [/rgba\(0,\s*0,\s*0,\s*\.3\)/g, 'rgba(31,26,18,.08)'],
  [/rgba\(0,\s*0,\s*0,\s*\.2\)/g, 'rgba(31,26,18,.06)'],
  [/rgba\(0,\s*0,\s*0,\s*\.15\)/g, 'rgba(31,26,18,.05)'],

  // rgba(255,255,255) bordes/details para light theme
  [/rgba\(255,\s*255,\s*255,\s*\.15\)/g, 'rgba(31,26,18,.10)'],
  [/rgba\(255,\s*255,\s*255,\s*\.1\)/g, 'rgba(31,26,18,.08)'],
  [/rgba\(255,\s*255,\s*255,\s*\.08\)/g, 'rgba(31,26,18,.06)'],
  [/rgba\(255,\s*255,\s*255,\s*\.4\)/g, 'rgba(31,26,18,.30)'],
];

let totalChanges = 0;
for (const file of FILES) {
  const filePath = path.join(ROOT, file);
  let content = readFileSync(filePath, 'utf8');
  let fileChanges = 0;
  for (const [pattern, replacement] of REPLACEMENTS) {
    const before = content;
    content = content.replace(pattern, replacement);
    if (before !== content) {
      const matches = before.match(pattern);
      fileChanges += matches?.length || 0;
    }
  }
  if (fileChanges > 0) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${file}: ${fileChanges} cambios`);
    totalChanges += fileChanges;
  } else {
    console.log(`  ${file}: sin cambios`);
  }
}
console.log(`\nTotal: ${totalChanges} cambios aplicados`);
