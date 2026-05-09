// Script: lee el Excel de inventario y actualiza precios + tamaños en lib/products.js
// Uso: node scripts/apply-prices.js

import pkg from 'xlsx';
const { readFile, utils } = pkg;
import { readFileSync, writeFileSync } from 'fs';
import { products } from '../lib/products.js';

// ─── 1. Leer Excel ────────────────────────────────────────────────────────────
const wb = readFile('Inventario de perfumes (1).xlsx');
const ws = wb.Sheets['Inventario Perfumes'];
const rows = utils.sheet_to_json(ws, { header: 1 }).slice(1); // omitir cabecera

// ─── 2. Normalizar strings para matching ─────────────────────────────────────
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── 3. Parsear precio COP ────────────────────────────────────────────────────
// Toma la primera cifra de un string como "$205.000 / $320.000" → 205000
function parseCOP(raw) {
  if (!raw) return 0;
  const str = String(raw).replace(/\s/g, '');
  const match = str.match(/\$?([\d.]+)/);
  if (!match) return 0;
  return parseInt(match[1].replace(/\./g, ''), 10);
}

// ─── 4. Parsear tamaño ────────────────────────────────────────────────────────
// "100/200" → ["100ml","200ml"]
function parseSize(raw) {
  if (!raw) return null;
  const str = String(raw).replace(/\s/g, '');
  const nums = str.match(/\d+/g);
  if (!nums) return null;
  return [...new Set(nums)].map(n => `${n}ml`);
}

// ─── 5. Construir tabla de inventario ─────────────────────────────────────────
const inventory = rows
  .filter(r => r[1] && r[2] && r[5])
  .map(r => ({
    brand: norm(r[1]),
    name: norm(r[2]),
    rawName: String(r[2]).trim(),
    rawBrand: String(r[1]).trim(),
    size: parseSize(r[3]),
    price: parseCOP(r[5]),
    rawPrice: String(r[5]).trim(),
    rawSize: String(r[3] || '').trim(),
  }));

// ─── 6. Matching productos ────────────────────────────────────────────────────
const matched = [];
const unmatched = [];

for (const inv of inventory) {
  // Buscar producto por brand + name (normalizado)
  let found = products.find(p => {
    const pb = norm(p.brand);
    const pn = norm(p.name);
    const fullName = `${pb} ${pn}`;
    const invFull = `${inv.brand} ${inv.name}`;

    // Match exacto
    if (pb === inv.brand && pn === inv.name) return true;
    // El nombre del inventario contiene el nombre del producto
    if (pb === inv.brand && inv.name.includes(pn) && pn.length > 5) return true;
    // El nombre del producto contiene el del inventario
    if (pb === inv.brand && pn.includes(inv.name) && inv.name.length > 5) return true;
    return false;
  });

  if (found) {
    matched.push({ product: found, inv });
  } else {
    unmatched.push(inv);
  }
}

// ─── 7. Reporte ───────────────────────────────────────────────────────────────
console.log(`\n✅ Productos emparejados: ${matched.length}`);
console.log(`⚠️  Sin emparejar en Excel: ${unmatched.length}`);

console.log('\n─── EMPAREJADOS ───────────────────────────────────────');
matched.forEach(({ product, inv }) => {
  console.log(`  ✅ "${product.brand} ${product.name}"`);
  console.log(`     Precio: ${inv.rawPrice} → COP ${inv.price.toLocaleString('es-CO')}`);
  console.log(`     Tamaño: ${inv.rawSize} → ${inv.size?.join(', ')}`);
});

console.log('\n─── SIN EMPAREJAR (en Excel pero no en catálogo) ──────');
unmatched.forEach(inv => {
  console.log(`  ❌ "${inv.rawBrand} - ${inv.rawName}" | ${inv.rawPrice}`);
});

// ─── 8. Aplicar cambios a lib/products.js ─────────────────────────────────────
let content = readFileSync('lib/products.js', 'utf-8');
let updated = 0;

for (const { product, inv } of matched) {
  if (!inv.price || inv.price === 0) continue;

  // Reemplazar price: 0
  const pricePattern = new RegExp(
    `(slug: '${product.slug}'[\\s\\S]*?price: )0`,
    'm'
  );
  if (pricePattern.test(content)) {
    content = content.replace(pricePattern, `$1${inv.price}`);
    updated++;
  }

  // Actualizar tamaño si tenemos info más precisa del Excel
  if (inv.size && inv.size.length > 0) {
    const sizeStr = inv.size.map(s => `"${s}"`).join(', ');
    const sizePattern = new RegExp(
      `(slug: '${product.slug}'[\\s\\S]*?size: )\\[[^\\]]*\\]`,
      'm'
    );
    if (sizePattern.test(content)) {
      content = content.replace(sizePattern, `$1[${sizeStr}]`);
    }
  }
}

writeFileSync('lib/products.js', content, 'utf-8');
console.log(`\n💾 lib/products.js actualizado: ${updated} productos con precio asignado`);
