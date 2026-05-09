// Lee el Excel y construye el mapa slug → sizes [{ml, price}, ...]
// Las sizes y precios vienen LITERALMENTE del Excel (posicional 1:1).
import xlsx from 'xlsx';
import { products } from '../lib/products.js';
import { writeFileSync } from 'fs';

const norm = s => s.toLowerCase()
  .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
  .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const normBrand = b => b.toLowerCase().replace(/[^a-z0-9]/g, '');

// Parsea precio individual: "$220.000" → 220000, "$" → 0, "" → 0
function parseOne(str) {
  if (!str) return 0;
  const s = str.trim();
  if (!s || s === '$') return 0;
  const clean = s.replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '').trim();
  const n = parseInt(clean, 10);
  return isNaN(n) ? 0 : n;
}

// Parsea celda de tamaños: "100/200" o "100 / 200" o "125" → ["100ml", "200ml"]
function parseSizes(str) {
  if (str == null) return [];
  return String(str).split('/').map(s => s.trim()).filter(Boolean).map(s => {
    // Si es solo número, agregar "ml"
    if (/^\d+(\.\d+)?$/.test(s)) return s + 'ml';
    // Si ya viene con "ml" (ej "100ml"), dejar
    return s.replace(/\s+/g, '');
  });
}

// Parsea celda de precios: "$200.000/ $320.000" → [200000, 320000]
function parsePrices(str) {
  if (!str) return [];
  return String(str).split('/').map(s => parseOne(s)).filter(n => n > 0);
}

const wb = xlsx.readFile('Inventario de perfumes (1).xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

const excelMap = new Map();
const seen = new Set();
for (let i = 1; i < data.length; i++) {
  const r = data[i];
  const marca = (r[1] || '').trim();
  const nombre = (r[2] || '').trim();
  const tamanoRaw = r[3];
  const precioRaw = (r[5] || '').toString().trim();
  if (!marca || !nombre) continue;
  const key = `${marca}|${nombre}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const sizes = parseSizes(tamanoRaw);
  const prices = parsePrices(precioRaw);
  if (sizes.length === 0 || prices.length === 0) continue;

  // Combinar posicional: tomar el mínimo entre sizes.length y prices.length
  const pairs = [];
  const n = Math.min(sizes.length, prices.length);
  for (let j = 0; j < n; j++) {
    pairs.push({ ml: sizes[j], price: prices[j] });
  }
  if (pairs.length === 0) continue;

  excelMap.set(key, { marca, nombre, sizes: pairs });
}

// Mapear a slugs del catálogo
const slugMap = {};

// Parciales confirmados manualmente (igual que antes)
const partialBySlug = {
  'armaf-club-de-nuit-intense-extrait': 'Armaf|Club De Nuit Intense Extrait de Parfum',
  'afnan-9pm':                          'Afnan|9 PM (Alternativa JPG Ultra Male)',
  'versace-eros-edt':                   'Versace|Eros EDT',
  'hugo-boss-bottled':                  'Hugo Boss|Hugo Boss Bottled',
};

for (const [, item] of excelMap) {
  const itBrand = normBrand(item.marca);
  const itName = norm(item.nombre);
  const byBrand = products.filter(p => normBrand(p.brand) === itBrand);
  const exact = byBrand.find(p => norm(p.name) === itName);
  if (exact) slugMap[exact.slug] = item.sizes;
}
// Aplicar parciales (solo si no hay match exacto y el slug existe)
for (const [slug, key] of Object.entries(partialBySlug)) {
  const item = excelMap.get(key);
  if (item && !slugMap[slug] && products.find(p => p.slug === slug)) {
    slugMap[slug] = item.sizes;
  }
}

// Reporte
console.log('Total productos del Excel:', excelMap.size);
console.log('Total slugs mapeados:', Object.keys(slugMap).length);

// Mostrar productos con múltiples tamaños
const multi = Object.entries(slugMap).filter(([_, sizes]) => sizes.length > 1);
console.log('\n=== Productos con MÚLTIPLES tallas (' + multi.length + ') ===');
multi.forEach(([slug, sizes]) => {
  const cat = products.find(p => p.slug === slug);
  console.log(`  ${slug}  (${cat.name})`);
  sizes.forEach(s => console.log(`    ${s.ml} → $${s.price.toLocaleString('es-CO')}`));
});

writeFileSync('./scripts/sizes-map.json', JSON.stringify(slugMap, null, 2), 'utf8');
console.log('\n✅ Mapa escrito a scripts/sizes-map.json');
