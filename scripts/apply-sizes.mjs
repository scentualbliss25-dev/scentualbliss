// Aplica las nuevas sizes a lib/products.js. Cambia cada producto:
//   ANTES: price: N, ... size: ["100ml", "200ml"], ...
//   DESPUÉS: price: <min>, ... sizes: [{ ml: "100ml", price: N1 }, { ml: "200ml", price: N2 }], ...
//
// Para productos en el Excel: usa sizes/precios del Excel (posicional 1:1).
// Para productos NO en el Excel: convierte su `size` actual a sizes con price: 0.
import xlsx from 'xlsx';
import { products } from '../lib/products.js';
import { readFileSync, writeFileSync } from 'fs';

// ── Helpers ────────────────────────────────────────────────────────────────
const norm = s => s.toLowerCase()
  .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
  .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const normBrand = b => b.toLowerCase().replace(/[^a-z0-9]/g, '');

function parseOne(str) {
  if (!str) return 0;
  const s = str.trim();
  if (!s || s === '$') return 0;
  const clean = s.replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '').trim();
  const n = parseInt(clean, 10);
  return isNaN(n) ? 0 : n;
}

function parseSizes(str) {
  if (str == null) return [];
  return String(str).split('/').map(s => s.trim()).filter(Boolean).map(s => {
    if (/^\d+(\.\d+)?$/.test(s)) return s + 'ml';
    return s.replace(/\s+/g, '');
  });
}

function parsePrices(str) {
  if (!str) return [];
  return String(str).split('/').map(s => parseOne(s)).filter(n => n > 0);
}

// ── Leer Excel ─────────────────────────────────────────────────────────────
const wb = xlsx.readFile('Inventario de perfumes (1).xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

const excelMap = new Map();
const seen = new Set();
for (let i = 1; i < data.length; i++) {
  const r = data[i];
  const marca = (r[1] || '').trim();
  const nombre = (r[2] || '').trim();
  const sizes = parseSizes(r[3]);
  const prices = parsePrices((r[5] || '').toString());
  if (!marca || !nombre) continue;
  const key = `${marca}|${nombre}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (sizes.length === 0 || prices.length === 0) continue;
  const n = Math.min(sizes.length, prices.length);
  const pairs = [];
  for (let j = 0; j < n; j++) pairs.push({ ml: sizes[j], price: prices[j] });
  if (pairs.length) excelMap.set(key, { marca, nombre, sizes: pairs });
}

// ── Mapear a slugs ─────────────────────────────────────────────────────────
const slugSizes = {};
for (const [, item] of excelMap) {
  const itBrand = normBrand(item.marca);
  const itName = norm(item.nombre);
  const exact = products.find(p => normBrand(p.brand) === itBrand && norm(p.name) === itName);
  if (exact) slugSizes[exact.slug] = item.sizes;
}

const partialBySlug = {
  'armaf-club-de-nuit-intense-extrait': 'Armaf|Club De Nuit Intense Extrait de Parfum',
  'afnan-9pm':                          'Afnan|9 PM (Alternativa JPG Ultra Male)',
  'versace-eros-edt':                   'Versace|Eros EDT',
  'hugo-boss-bottled':                  'Hugo Boss|Hugo Boss Bottled',
};
for (const [slug, key] of Object.entries(partialBySlug)) {
  const item = excelMap.get(key);
  if (item && !slugSizes[slug] && products.find(p => p.slug === slug)) {
    slugSizes[slug] = item.sizes;
  }
}

// ── Construir mapa final: TODOS los slugs ──────────────────────────────────
// Los que están en Excel: sizes del Excel.
// Los que NO: sus tallas actuales con price 0.
const finalMap = {};
for (const p of products) {
  if (slugSizes[p.slug]) {
    finalMap[p.slug] = slugSizes[p.slug];
  } else {
    finalMap[p.slug] = (p.size || []).map(ml => ({ ml, price: 0 }));
    if (finalMap[p.slug].length === 0) finalMap[p.slug] = [{ ml: '100ml', price: 0 }];
  }
}

// ── Aplicar cambios al archivo ─────────────────────────────────────────────
let content = readFileSync('./lib/products.js', 'utf8');
const escapeSlug = s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

let applied = 0, skipped = 0;
for (const [slug, sizes] of Object.entries(finalMap)) {
  const minPrice = Math.min(...sizes.map(s => s.price).filter(p => p > 0)) || 0;
  // Formatear sizes como JS literal compacto
  const sizesLit = '[' + sizes.map(s => `{ ml: "${s.ml}", price: ${s.price} }`).join(', ') + ']';

  // Pattern: slug:'X' ... price: N, ... size: [...]
  const re = new RegExp(
    `(slug:\\s*'${escapeSlug(slug)}'[\\s\\S]*?)price:\\s*\\d+([\\s\\S]*?)size:\\s*\\[[^\\]]*\\]`,
    ''
  );
  const before = content;
  content = content.replace(re, (m, pre, mid) => `${pre}price: ${minPrice}${mid}sizes: ${sizesLit}`);
  if (content !== before) applied++;
  else { skipped++; console.log('⚠ No se pudo aplicar:', slug); }
}

writeFileSync('./lib/products.js', content, 'utf8');
console.log(`\n✅ Aplicados: ${applied} | Sin cambio: ${skipped}`);

// Verificar
const stillSize = (content.match(/\bsize:\s*\[/g) || []).length;
const newSizes = (content.match(/\bsizes:\s*\[/g) || []).length;
console.log(`   Quedan ${stillSize} entradas con \`size:\` (debería ser 0)`);
console.log(`   Nuevas \`sizes:\`: ${newSizes}`);
