// Exporta el catálogo completo de productos a un archivo Excel (.xlsx).
//
// Uso: node scripts/export-products-xlsx.mjs
// Salida: exports/perfumes-<YYYY-MM-DD>.xlsx
//
// Lee directamente de Supabase con el SERVICE_ROLE_KEY. Pone una columna
// "Familia olfativa" (category) y otra "Tipo" (nicho/diseñador/árabe).

import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import { config } from 'dotenv';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
config({ path: resolve(ROOT, '.env.local') });

// Sanitiza la URL igual que en lib/supabase.js (Vercel a veces guarda /rest/v1/ al final).
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// Labels para mostrar en vez de los IDs.
const CATEGORY_LABEL = {
  floral: 'Floral',
  frutal: 'Frutal',
  fresco: 'Fresco',
  citrico: 'Cítrico',
  dulce: 'Dulce',
  amaderado: 'Amaderado',
};
const TYPE_LABEL = {
  nicho: 'Nicho',
  disenador: 'Diseñador',
  arabe: 'Árabe',
};

console.log('→ Consultando productos desde Supabase…');
const { data: products, error } = await supabase
  .from('products')
  .select(`
    id, slug, name, brand, product_type, category, type, gender,
    base_price, stock,
    notes_top, notes_heart, notes_base,
    featured, bestseller,
    product_sizes ( ml, price, order_index ),
    product_images ( url )
  `)
  .order('name', { ascending: true });

if (error) {
  console.error('❌ Error consultando Supabase:', error.message);
  process.exit(1);
}

console.log(`✓ ${products.length} productos cargados.`);

// ─── Genera el workbook ────────────────────────────────────────────────
const wb = new ExcelJS.Workbook();
wb.creator = 'ScentualBliss Admin';
wb.created = new Date();
wb.title = 'Catálogo de perfumes';

const ws = wb.addWorksheet('Catálogo', {
  views: [{ state: 'frozen', ySplit: 1 }], // Header congelado
});

// Definición de columnas: key + header + width
ws.columns = [
  { header: 'ID',                key: 'id',        width: 6 },
  { header: 'Nombre',            key: 'name',      width: 38 },
  { header: 'Marca',             key: 'brand',     width: 18 },
  { header: 'Familia olfativa',  key: 'family',    width: 16 },
  { header: 'Tipo',              key: 'type',      width: 14 },
  { header: 'Concentración',     key: 'conc',      width: 14 },
  { header: 'Género',            key: 'gender',    width: 12 },
  { header: 'Precio base (COP)', key: 'price',     width: 18 },
  { header: 'Tamaños',           key: 'sizes',     width: 30 },
  { header: 'Stock',             key: 'stock',     width: 8 },
  { header: 'Bestseller',        key: 'bestsel',   width: 12 },
  { header: 'Destacado',         key: 'featured',  width: 12 },
  { header: 'Imágenes (#)',      key: 'imgcount',  width: 12 },
  { header: 'Notas salida',      key: 'ntop',      width: 36 },
  { header: 'Notas corazón',     key: 'nheart',    width: 36 },
  { header: 'Notas fondo',       key: 'nbase',     width: 36 },
  { header: 'Slug (URL)',        key: 'slug',      width: 30 },
];

// Filas
for (const p of products) {
  const sizes = (p.product_sizes || [])
    .slice()
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map(s => `${s.ml} — ${formatCop(s.price)}`)
    .join(' · ');

  ws.addRow({
    id: p.id,
    name: p.name,
    brand: p.brand || '',
    family: CATEGORY_LABEL[p.category] || p.category || '',
    type: TYPE_LABEL[p.product_type] || p.product_type || '',
    conc: p.type || '',
    gender: p.gender || '',
    price: p.base_price ? Number(p.base_price) : null,
    sizes: sizes,
    stock: p.stock ?? 0,
    bestsel: p.bestseller ? '✓' : '',
    featured: p.featured ? '✓' : '',
    imgcount: (p.product_images || []).length,
    ntop: p.notes_top || '',
    nheart: p.notes_heart || '',
    nbase: p.notes_base || '',
    slug: p.slug,
  });
}

// ─── Estilo del header ─────────────────────────────────────────────────
const headerRow = ws.getRow(1);
headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
headerRow.fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1C1611' }, // ink (marca)
};
headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
headerRow.height = 22;

// Bordes y zebra striping
const total = ws.rowCount;
for (let r = 2; r <= total; r++) {
  const row = ws.getRow(r);
  if (r % 2 === 0) {
    row.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFAF6EE' },
    };
  }
  row.alignment = { vertical: 'top', wrapText: false };
  row.height = 20;
}

// Formato de precio (columna H)
ws.getColumn('price').numFmt = '"$"#,##0';

// Filtro automático sobre todo el rango
ws.autoFilter = {
  from: { row: 1, column: 1 },
  to: { row: total, column: ws.columns.length },
};

// ─── Hoja resumen por familia olfativa ─────────────────────────────────
const wsSummary = wb.addWorksheet('Resumen', {
  views: [{ state: 'frozen', ySplit: 1 }],
});
wsSummary.columns = [
  { header: 'Familia olfativa', key: 'family', width: 22 },
  { header: 'Total productos',  key: 'count',  width: 18 },
  { header: 'Marcas distintas', key: 'brands', width: 18 },
];
const byFamily = {};
for (const p of products) {
  const f = CATEGORY_LABEL[p.category] || p.category || '(sin clasificar)';
  if (!byFamily[f]) byFamily[f] = { count: 0, brands: new Set() };
  byFamily[f].count++;
  if (p.brand) byFamily[f].brands.add(p.brand);
}
const families = Object.entries(byFamily).sort((a, b) => b[1].count - a[1].count);
for (const [family, info] of families) {
  wsSummary.addRow({ family, count: info.count, brands: info.brands.size });
}
const sumHeader = wsSummary.getRow(1);
sumHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
sumHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1611' } };
sumHeader.height = 22;

// ─── Guarda ────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const outDir = resolve(ROOT, 'exports');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, `perfumes-${today}.xlsx`);
await wb.xlsx.writeFile(outPath);

console.log();
console.log(`✓ Excel generado: ${outPath}`);
console.log(`  - Hoja "Catálogo": ${products.length} filas, ${ws.columns.length} columnas`);
console.log(`  - Hoja "Resumen": agrupación por familia olfativa`);

function formatCop(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}