// Aplica precios exactos del inventario Excel al catálogo de productos.
// Solo se aplican matches 100% confirmados (exactos o parciales revisados manualmente).
import xlsx from 'xlsx';
import { products } from '../lib/products.js';
import { readFileSync, writeFileSync } from 'fs';

// ── Helpers ─────────────────────────────────────────────────────────────────
function parsePrice(str) {
  if (!str) return 0;
  const s = str.toString().trim();
  if (s === '$' || s === '') return 0;
  const first = s.split('/')[0].trim();
  const clean = first.replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '').trim();
  const n = parseInt(clean, 10);
  return isNaN(n) ? 0 : n;
}

const norm = s => s.toLowerCase()
  .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
  .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const normBrand = b => b.toLowerCase().replace(/[^a-z0-9]/g, '');

// ── Leer Excel ───────────────────────────────────────────────────────────────
const wb = xlsx.readFile('Inventario de perfumes (1).xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

const excelMap = new Map();
const seen = new Set();
for (let i = 1; i < data.length; i++) {
  const r = data[i];
  const marca = (r[1] || '').trim();
  const nombre = (r[2] || '').trim();
  const precioRaw = (r[5] || '').toString().trim();
  if (!marca || !nombre) continue;
  const key = `${marca}|${nombre}`;
  if (!seen.has(key)) {
    seen.add(key);
    excelMap.set(key, { marca, nombre, precio: parsePrice(precioRaw) });
  }
}

// ── Matches exactos (nombre normalizado igual) ────────────────────────────────
const priceMap = {};

for (const [, item] of excelMap) {
  const itemBrandNorm = normBrand(item.marca);
  const itemNombreNorm = norm(item.nombre);
  const byBrand = products.filter(p => normBrand(p.brand) === itemBrandNorm);
  const exactMatch = byBrand.find(p => norm(p.name) === itemNombreNorm);
  if (exactMatch && item.precio > 0) {
    priceMap[exactMatch.slug] = item.precio;
  }
}

// ── Parciales revisados manualmente (100% confirmados) ────────────────────────
const manualMatches = [
  // Excel "Club De Nuit Intense Extrait de Parfum" = catálogo "Club de Nuit Intense Extrait"
  { slug: 'armaf-club-de-nuit-intense-extrait', precio: 240000 },
  // Excel "9 PM (Alternativa JPG Ultra Male)" = catálogo "9 PM"
  { slug: 'afnan-9pm', precio: 220000 },
  // Excel "Eros EDT" = catálogo "Eros EDT For Men"
  { slug: 'versace-eros-edt', precio: 290000 },
  // Excel "Hugo Boss Bottled" = catálogo "BOSS Bottled"
  { slug: 'hugo-boss-bottled', precio: 290000 },
];
for (const m of manualMatches) {
  if (!priceMap[m.slug]) priceMap[m.slug] = m.precio;
}

// ── Aplicar precios al archivo lib/products.js ─────────────────────────────
let content = readFileSync('./lib/products.js', 'utf8');
let applied = 0, skipped = 0;

for (const [slug, price] of Object.entries(priceMap)) {
  const before = content;
  // Buscar: slug: 'SLUG' seguido (en las próximas líneas) de price: 0
  const pattern = new RegExp(
    `(slug: '${slug.replace(/-/g, '\\-')}'[^\\{]*?price:\\s*)0`,
    's'
  );
  content = content.replace(pattern, `$1${price}`);
  if (content !== before) {
    applied++;
    const cat = products.find(p => p.slug === slug);
    console.log(`✓  ${slug}  →  $${price.toLocaleString('es-CO')}  (${cat?.name})`);
  } else {
    skipped++;
    console.log(`⚠  No se pudo aplicar: ${slug}`);
  }
}

writeFileSync('./lib/products.js', content, 'utf8');
console.log(`\n✅ Aplicados: ${applied} | Sin cambio: ${skipped}`);
