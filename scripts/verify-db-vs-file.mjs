// Verifica que los datos en Supabase coinciden con lib/products.js.
// Detecta diferencias en cantidad, slugs, precios, imágenes, etc.
// Si hay coincidencia total, podemos refactorizar con confianza.
//
// Uso: node scripts/verify-db-vs-file.mjs

import { createClient } from '@supabase/supabase-js';
import { products as fileProducts } from '../lib/products.js';
import { readFileSync } from 'node:fs';

try {
  const env = readFileSync('.env.local', 'utf-8');
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
} catch {}

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  .replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: dbRows } = await supabase
  .from('products')
  .select('*, product_sizes(*), product_images(*)')
  .order('id', { ascending: true });

console.log(`File:     ${fileProducts.length} productos`);
console.log(`Supabase: ${dbRows.length} productos`);
console.log('');

const fileById = new Map(fileProducts.map(p => [p.id, p]));
const diffs = [];

for (const dbRow of dbRows) {
  const fileProd = fileById.get(dbRow.id);
  if (!fileProd) {
    diffs.push(`✗ DB tiene id=${dbRow.id} (${dbRow.slug}) pero file no`);
    continue;
  }

  // Comparar campos críticos
  if (dbRow.slug !== fileProd.slug) {
    diffs.push(`✗ id=${dbRow.id} slug: file="${fileProd.slug}" db="${dbRow.slug}"`);
  }
  if (dbRow.name !== fileProd.name) {
    diffs.push(`✗ id=${dbRow.id} name: file="${fileProd.name}" db="${dbRow.name}"`);
  }
  if (Number(dbRow.base_price) !== (Number.isFinite(fileProd.price) ? fileProd.price : 0)) {
    diffs.push(`✗ id=${dbRow.id} price: file=${fileProd.price} db=${dbRow.base_price}`);
  }
  const fileSizesCount = (fileProd.sizes || []).length;
  const dbSizesCount = (dbRow.product_sizes || []).length;
  if (fileSizesCount !== dbSizesCount) {
    diffs.push(`✗ id=${dbRow.id} sizes count: file=${fileSizesCount} db=${dbSizesCount}`);
  }
  const fileImagesCount = (fileProd.images || []).filter(Boolean).length;
  const dbImagesCount = (dbRow.product_images || []).length;
  if (fileImagesCount !== dbImagesCount) {
    diffs.push(`✗ id=${dbRow.id} images count: file=${fileImagesCount} db=${dbImagesCount}`);
  }
}

const missingInDb = fileProducts.filter(p => !dbRows.find(r => r.id === p.id));
for (const p of missingInDb) {
  diffs.push(`✗ File tiene id=${p.id} (${p.slug}) pero DB no`);
}

if (diffs.length === 0) {
  console.log('✅ Coincidencia perfecta entre archivo y Supabase. Migración OK.');
} else {
  console.log(`⚠  ${diffs.length} diferencias encontradas:`);
  diffs.slice(0, 25).forEach(d => console.log('  ', d));
  if (diffs.length > 25) console.log(`   ... y ${diffs.length - 25} más`);
}
