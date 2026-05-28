'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import { PRODUCTS_CACHE_TAG } from '@/lib/products';

/**
 * Server Action: actualiza un producto en Supabase.
 *
 * Recibe FormData del <form> de edición. Reconstruye:
 * - campos planos de products (name, brand, price, notas, etc.)
 * - sizes: array de {ml, price} (delete-then-insert para mantener simple)
 * - images: array de URLs (delete-then-insert)
 *
 * Tras el commit llama revalidateTag('products') → la próxima petición a
 * cualquier página de la tienda ve los cambios sin esperar al TTL del cache.
 */
export async function updateProduct(formData) {
  if (!supabaseAdmin) {
    return { ok: false, error: 'Supabase no configurado en el servidor' };
  }

  const id = Number(formData.get('id'));
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: 'ID de producto inválido' };
  }

  // ─── Campos planos del producto ────────────────────────────────────────
  const str = (k) => {
    const v = formData.get(k);
    return v == null ? null : String(v).trim() || null;
  };
  const num = (k) => {
    const v = formData.get(k);
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const bool = (k) => formData.get(k) === 'on' || formData.get(k) === 'true';

  const name = str('name');
  const slug = str('slug');
  if (!name || !slug) {
    return { ok: false, error: 'Nombre y slug son obligatorios' };
  }

  const update = {
    name,
    slug,
    brand: str('brand'),
    product_type: str('product_type'),
    category: str('category'),
    type: str('type'), // concentración (EDP, EDT, etc.)
    gender: str('gender'),
    description: str('description'),
    base_price: num('base_price'),
    original_price: num('original_price'),
    stock: num('stock') ?? 0,
    longevity: str('longevity'),
    sillage: str('sillage'),
    season: str('season'),
    notes_top: str('notes_top'),
    notes_heart: str('notes_heart'),
    notes_base: str('notes_base'),
    badge: str('badge'),
    badge_color: str('badge_color'),
    featured: bool('featured'),
    bestseller: bool('bestseller'),
  };

  // occasion viene como string CSV → array
  const occasionRaw = str('occasion');
  if (occasionRaw != null) {
    update.occasion = occasionRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ─── Sizes: campos paralelos sizes_ml[] + sizes_price[] ────────────────
  const mls = formData.getAll('sizes_ml');
  const prices = formData.getAll('sizes_price');
  const sizes = [];
  for (let i = 0; i < Math.max(mls.length, prices.length); i++) {
    const ml = String(mls[i] ?? '').trim();
    const price = Number(prices[i]);
    if (!ml || !Number.isFinite(price) || price <= 0) continue;
    sizes.push({ product_id: id, ml, price, order_index: i });
  }

  // ─── Images: array de URLs ─────────────────────────────────────────────
  const imgUrls = formData.getAll('image_url')
    .map((u) => String(u || '').trim())
    .filter(Boolean);
  const images = imgUrls.map((url, i) => ({ product_id: id, url, order_index: i }));

  // ─── Ejecuta las 3 operaciones ─────────────────────────────────────────
  // (Supabase no expone transacciones desde el SDK JS — hacemos secuencial.
  // Si una falla, intentamos no dejar el producto en estado inconsistente
  // devolviendo el error sin tocar lo siguiente.)
  const { error: updErr } = await supabaseAdmin
    .from('products')
    .update(update)
    .eq('id', id);

  if (updErr) {
    return { ok: false, error: `Actualizando producto: ${updErr.message}` };
  }

  // Sizes: borrar y reinsertar (más simple que diff/upsert).
  {
    const { error: delErr } = await supabaseAdmin
      .from('product_sizes')
      .delete()
      .eq('product_id', id);
    if (delErr) return { ok: false, error: `Borrando sizes: ${delErr.message}` };

    if (sizes.length) {
      const { error: insErr } = await supabaseAdmin.from('product_sizes').insert(sizes);
      if (insErr) return { ok: false, error: `Insertando sizes: ${insErr.message}` };
    }
  }

  // Images: idem.
  {
    const { error: delErr } = await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('product_id', id);
    if (delErr) return { ok: false, error: `Borrando imágenes: ${delErr.message}` };

    if (images.length) {
      const { error: insErr } = await supabaseAdmin.from('product_images').insert(images);
      if (insErr) return { ok: false, error: `Insertando imágenes: ${insErr.message}` };
    }
  }

  // 🎯 Invalida el caché de productos.
  //
  // revalidateTag invalida el data cache de unstable_cache en products-db.js,
  // PERO las páginas Static (home, /perfume/[slug], etc.) tienen además un
  // Full Route Cache que sigue sirviendo el HTML pre-renderizado por hasta
  // 5min. Por eso revalidamos también las rutas específicas que dependen
  // de products → invalida ambos niveles de caché.
  revalidateTag(PRODUCTS_CACHE_TAG);
  revalidatePath('/');                                // Home (bestsellers/destacados)
  revalidatePath('/tienda');                          // Listado público
  revalidatePath('/perfume/[slug]', 'page');          // Todas las PDPs
  // Si el slug cambió, también la PDP nueva debe regenerarse — pero como
  // usamos 'page' (no exact match) ya estamos cubiertos.

  // El redirect debe ir fuera del try/catch implícito de Server Actions.
  // Usamos un searchParam para que el listado muestre un toast de éxito.
  redirect(`/admin/products?updated=${id}`);
}
