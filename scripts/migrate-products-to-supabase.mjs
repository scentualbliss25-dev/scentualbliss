// Migración del catálogo de lib/products.js a Supabase.
//
// IDEMPOTENTE: se puede correr múltiples veces sin duplicar datos.
// Usa upsert sobre products (por id), y para sizes/images borra los
// existentes del producto antes de re-insertar.
//
// Uso: node scripts/migrate-products-to-supabase.mjs
//
// Requiere variables de entorno (en .env.local):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { products } from '../lib/products.js';
import { readFileSync } from 'node:fs';

// === Cargar .env.local manualmente (este script no es un Next route) ===
try {
  const env = readFileSync('.env.local', 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
} catch {
  console.warn('No se pudo leer .env.local. Asumiendo variables de entorno presentes.');
}

// Saneo la URL: el SDK espera solo dominio (https://xxx.supabase.co) sin
// el path /rest/v1/ que algunas configuraciones traen al final.
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log(`Conectando a: ${url}`);

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

console.log(`\n▶  Migrando ${products.length} productos a Supabase...\n`);

let ok = 0;
let failed = 0;
const errors = [];

for (const p of products) {
  // === 1) Upsert del producto ===
  const productRow = {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    type: p.type || null,
    product_type: p.productType || null,
    category: p.category || null,
    description: p.description || null,
    notes_top: p.notes?.top || null,
    notes_heart: p.notes?.heart || null,
    notes_base: p.notes?.base || null,
    longevity: p.longevity || null,
    sillage: p.sillage || null,
    season: p.season || null,
    gender: p.gender || null,
    // Defensivo: por si quedó algún Infinity por error
    base_price: Number.isFinite(p.price) ? p.price : 0,
    original_price: Number.isFinite(p.originalPrice) ? p.originalPrice : null,
    stock: p.stock ?? 0,
    badge: p.badge || null,
    badge_color: p.badgeColor || null,
    rating: p.rating ?? 0,
    reviews_count: p.reviews ?? 0,
    featured: !!p.featured,
    bestseller: !!p.bestseller,
    occasion: Array.isArray(p.occasion) ? p.occasion : [],
    momento: p.momento || null,
    clima: p.clima || null,
  };

  const { error: prodErr } = await supabase
    .from('products')
    .upsert(productRow, { onConflict: 'id' });

  if (prodErr) {
    failed++;
    errors.push({ id: p.id, slug: p.slug, error: prodErr.message });
    console.log(`   ❌ ${String(p.id).padStart(3, ' ')} · ${p.slug}  →  ${prodErr.message}`);
    continue;
  }

  // === 2) Tallas (borrar y re-insertar para evitar duplicados) ===
  await supabase.from('product_sizes').delete().eq('product_id', p.id);
  const sizes = Array.isArray(p.sizes) ? p.sizes : [];
  if (sizes.length > 0) {
    const sizeRows = sizes.map((s, idx) => ({
      product_id: p.id,
      ml: s.ml || '',
      price: Number.isFinite(s.price) ? s.price : 0,
      order_index: idx,
    }));
    const { error: sizeErr } = await supabase.from('product_sizes').insert(sizeRows);
    if (sizeErr) {
      console.log(`   ⚠  ${p.slug} → sizes: ${sizeErr.message}`);
    }
  }

  // === 3) Imágenes (borrar y re-insertar) ===
  await supabase.from('product_images').delete().eq('product_id', p.id);
  const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  if (images.length > 0) {
    const imgRows = images.map((url, idx) => ({
      product_id: p.id,
      url,
      order_index: idx,
    }));
    const { error: imgErr } = await supabase.from('product_images').insert(imgRows);
    if (imgErr) {
      console.log(`   ⚠  ${p.slug} → images: ${imgErr.message}`);
    }
  }

  ok++;
  if (ok % 25 === 0) console.log(`   ✓ ${ok} productos migrados...`);
}

console.log(`\n══════════════════════════════════════════`);
console.log(`✅ Migración completa`);
console.log(`   Productos migrados: ${ok}`);
console.log(`   Fallos:             ${failed}`);
console.log(`══════════════════════════════════════════\n`);

if (errors.length > 0) {
  console.log('Errores detallados:');
  errors.forEach(e => console.log(`  - id=${e.id} (${e.slug}): ${e.error}`));
}

// === Verificación final: contar en DB ===
const { count: productCount } = await supabase
  .from('products').select('*', { count: 'exact', head: true });
const { count: sizesCount } = await supabase
  .from('product_sizes').select('*', { count: 'exact', head: true });
const { count: imagesCount } = await supabase
  .from('product_images').select('*', { count: 'exact', head: true });

console.log('Verificación en Supabase:');
console.log(`   products:       ${productCount}`);
console.log(`   product_sizes:  ${sizesCount}`);
console.log(`   product_images: ${imagesCount}\n`);
